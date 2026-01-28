"""Chat service layer for business logic."""

import re
from typing import Optional, List, Tuple, Dict, Any

from server.models import Message, Context, MessageRole
from server.services.task_service import task_service
from server.services.task_summary_service import task_summary_service, EnergyLevel
from server.services.reschedule_service import reschedule_service, RescheduleIntent
from server.services.undo_service import undo_service
from server.utils.intent_classifier import intent_classifier, IntentBucket, ActionType
from server.llm import generate_response
from server.logger import Logger

logger = Logger.get("chat_service")


class ChatService:
    """Service layer for chat-related business logic."""
    
    # Summary query patterns
    SUMMARY_PATTERNS = {
        r"\bwhat\s+(?:do\s+i\s+have|is\s+(?:on\s+)?my\s+(?:schedule|list))\s+today\b": "today",
        r"\bwhat'?s\s+(?:left|remaining|upcoming)\s+(?:this\s+)?week\b": "week",
        r"\bwhat\s+can\s+i\s+do\s+in\s+(\d+)\s+minutes\b": "energy_time",
        r"\bgive\s+me\s+(?:easy|quick|simple)\s+tasks\b": "energy_low",
        r"\bwhat\s+(?:tasks|things)\s+are\s+(?:overdue|late|missed)\b": "overdue",
        r"\bshow\s+(?:me\s+)?(?:my\s+)?tasks\b": "today",
        r"\bwhat\s+is\s+left\s+this\s+week\b": "week",
        r"\bwhat'?s\s+left\s+this\s+week\b": "week",
    }
    
    # Reschedule patterns
    RESCHEDULE_PATTERNS = {
        r"\b(?:do|move|push)\s+(?:this|that|it)\s+later\b": RescheduleIntent.LATER,
        r"\bnot\s+today\b": RescheduleIntent.NOT_TODAY,
        r"\bpush\s+(?:everything|all)\s+to\s+tomorrow\b": "bulk_tomorrow",
        r"\b(?:do|move)\s+(?:this|that)\s+tomorrow\b": RescheduleIntent.TOMORROW,
        r"\bmove\s+(?:this|that)\s+to\s+next\s+week\b": RescheduleIntent.NEXT_WEEK,
    }

    def extract_explicit_tags(self, message: str) -> Tuple[str, List[str]]:
        """Extract explicit @tags from message."""
        tags = re.findall(r"@(\w+)", message.lower())
        clean_message = re.sub(r"@\w+", "", message).strip()
        clean_message = re.sub(r"\s+", " ", clean_message).strip()
        return clean_message, tags
    
    def detect_summary_query(self, message: str) -> Optional[Tuple[str, Optional[int]]]:
        """
        Detect if message is asking for a task summary.
        Returns (summary_type, time_minutes) or None.
        """
        message_lower = message.lower()
        
        for pattern, summary_type in self.SUMMARY_PATTERNS.items():
            match = re.search(pattern, message_lower)
            if match:
                if summary_type == "energy_time":
                    minutes = int(match.group(1))
                    return ("energy_time", minutes)
                return (summary_type, None)
        
        return None
    
    def detect_reschedule_intent(self, message: str) -> Optional[Tuple[str, Optional[str]]]:
        """
        Detect if message is a reschedule request.
        Returns (intent_type, task_reference) or None.
        """
        message_lower = message.lower()
        
        # Check for bulk reschedule
        if re.search(r"\bpush\s+(?:everything|all)\s+to\s+tomorrow\b", message_lower):
            return ("bulk_tomorrow", None)
        
        # Check for specific task reschedule
        for pattern, intent in self.RESCHEDULE_PATTERNS.items():
            if re.search(pattern, message_lower):
                # Try to extract task reference
                task_ref = self._extract_task_reference(message_lower)
                return (intent.value if isinstance(intent, RescheduleIntent) else intent, task_ref)
        
        return None
    
    def _extract_task_reference(self, message: str) -> Optional[str]:
        """Extract task reference from reschedule message"""
        patterns = [
            r"(?:the\s+)?(.+?)(?:\s+task|\s+reminder)?\s+(?:to|for|until|$)",
            r"(?:reschedule|move|push)\s+(?:the\s+)?(.+?)(?:\s+to|\s+until|$)",
            r"\bdo\s+(?:the\s+)?(.+?)\s+later",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, message)
            if match:
                return match.group(1).strip()
        
        return None

    async def process_explicit_tag(
        self, tag: str, clean_message: str, user_message: Message, context_id: Optional[str]
    ) -> Optional[dict]:
        """Process message with explicit tag."""
        if tag not in ["task", "reminder", "event"]:
            return None

        action_type = (
            ActionType.TASK if tag == "task"
            else ActionType.REMINDER if tag == "reminder"
            else ActionType.EVENT
        )

        task = await task_service.create_from_text(
            clean_message, str(user_message.id), action_type
        )

        if not task:
            return None

        entity = task_service.task_to_entity(task, 1.0)
        
        # Record for undo
        action_id = await undo_service.record_action(
            action_type="task_create",
            description=f"Created {tag}: {task.title}",
            undo_data={"task_id": str(task.id)},
            entity_id=str(task.id)
        )

        assistant_message = Message(
            content=f"✓ Created {tag}: **{task.title}**",
            role=MessageRole.ASSISTANT,
            parent_id=str(user_message.id),
            context_id=context_id,
            extracted_entities=[entity],
        )
        await assistant_message.insert()

        user_message.children_ids.append(str(assistant_message.id))
        user_message.extracted_entities = [entity]
        await user_message.save()

        return {
            "response": f"✓ Created {tag}: **{task.title}**",
            "message_id": str(assistant_message.id),
            "entity": entity,
            "task_id": str(task.id),
            "undo_token": action_id,
            "response_type": "structured_list",
        }
    
    async def process_summary_query(
        self, 
        summary_type: str, 
        time_minutes: Optional[int],
        user_message: Message,
        context_id: Optional[str]
    ) -> Optional[dict]:
        """
        Process a summary query and return structured list response.
        """
        if summary_type == "today":
            summary = await task_summary_service.get_today_summary()
        elif summary_type == "week":
            summary = await task_summary_service.get_week_summary()
        elif summary_type == "overdue":
            summary = await task_summary_service.get_overdue_tasks()
        elif summary_type == "energy_low":
            summary = await task_summary_service.get_energy_based_tasks(EnergyLevel.LOW)
        elif summary_type == "energy_time":
            summary = await task_summary_service.get_energy_based_tasks(EnergyLevel.LOW, time_minutes)
        else:
            return None
        
        formatted = task_summary_service.format_for_chat(summary)
        
        # Build response text (concise, structured)
        response_lines = []
        
        if summary.total_count == 0:
            response_lines.append("No tasks found. You're all clear! 🎉")
        else:
            response_lines.append(f"**{summary.total_count} tasks**")
            response_lines.append("")
            
            for task in summary.tasks[:10]:  # Limit to 10 for readability
                icon = task.domain
                title = task.title
                time_info = f" • {task.time_context}" if task.time_context != "today" else ""
                warning = f" ⚠️ {task.decay_warning}" if task.decay_warning else ""
                
                highlight = "**" if task.is_important else ""
                response_lines.append(f"{icon} {highlight}{title}{highlight}{time_info}{warning}")
            
            if summary.total_count > 10:
                response_lines.append(f"\n...and {summary.total_count - 10} more")
        
        # Add suggestions
        if summary.suggestions:
            response_lines.append("")
            response_lines.append(f"💡 {summary.suggestions[0]}")
        
        # Add decay alerts
        if summary.decay_alerts:
            response_lines.append("")
            response_lines.append(f"🗑️ {summary.decay_alerts[0]}")
        
        response_text = "\n".join(response_lines)
        
        assistant_message = Message(
            content=response_text,
            role=MessageRole.ASSISTANT,
            parent_id=str(user_message.id),
            context_id=context_id,
            extracted_entities=[],  # No entities extracted from summary queries
        )
        await assistant_message.insert()

        user_message.children_ids.append(str(assistant_message.id))
        await user_message.save()
        
        return {
            "response": response_text,
            "message_id": str(assistant_message.id),
            "response_type": "structured_list",
            "structured_data": formatted,
            "extracted_entities": [],
        }
    
    async def process_reschedule_request(
        self,
        intent_type: str,
        task_reference: Optional[str],
        user_message: Message,
        context_id: Optional[str]
    ) -> Optional[dict]:
        """
        Process a reschedule request.
        """
        if intent_type == "bulk_tomorrow":
            # Bulk reschedule today's tasks
            result = await reschedule_service.reschedule_today_tasks(RescheduleIntent.TOMORROW)
            
            if not result.success:
                return {
                    "response": result.message,
                    "message_id": str(user_message.id),
                    "response_type": "text",
                }
            
            # Record for undo
            action_id = await undo_service.record_action(
                action_type="bulk_reschedule",
                description=result.message,
                undo_data={"individual_tokens": [r.undo_token for r in result.results]}
            )
            
            response_text = f"📅 {result.message}\n\nUndo? (expires in 30s)"
            
            assistant_message = Message(
                content=response_text,
                role=MessageRole.ASSISTANT,
                parent_id=str(user_message.id),
                context_id=context_id,
            )
            await assistant_message.insert()
            
            user_message.children_ids.append(str(assistant_message.id))
            await user_message.save()
            
            return {
                "response": response_text,
                "message_id": str(assistant_message.id),
                "response_type": "undoable_action",
                "undo_token": action_id,
            }
        
        # Single task reschedule
        if task_reference:
            # Find the task
            task = await reschedule_service.find_task_by_reference(task_reference)
            if task:
                intent = RescheduleIntent(intent_type)
                result = await reschedule_service.reschedule_task(str(task.id), intent)
                
                if result.success:
                    # Record for undo
                    action_id = await undo_service.record_action(
                        action_type="task_reschedule",
                        description=result.message,
                        undo_data={
                            "task_id": str(task.id),
                            "old_due_date": result.old_due_date.isoformat() if result.old_due_date else None,
                            "old_due_fuzzy": result.old_due_fuzzy
                        },
                        entity_id=str(task.id)
                    )
                    
                    response_text = f"📅 {result.message}. Undo?"
                    
                    assistant_message = Message(
                        content=response_text,
                        role=MessageRole.ASSISTANT,
                        parent_id=str(user_message.id),
                        context_id=context_id,
                    )
                    await assistant_message.insert()
                    
                    user_message.children_ids.append(str(assistant_message.id))
                    await user_message.save()
                    
                    return {
                        "response": response_text,
                        "message_id": str(assistant_message.id),
                        "response_type": "undoable_action",
                        "undo_token": action_id,
                    }
        
        return None

    async def process_intent_classification(
        self, clean_message: str, user_message: Message, context_id: Optional[str]
    ) -> dict:
        """Process message through intent classification."""
        
        # First, check for summary queries
        summary_query = self.detect_summary_query(clean_message)
        if summary_query:
            summary_type, time_minutes = summary_query
            result = await self.process_summary_query(summary_type, time_minutes, user_message, context_id)
            if result:
                return result
        
        # Check for reschedule requests
        reschedule_intent = self.detect_reschedule_intent(clean_message)
        if reschedule_intent:
            intent_type, task_reference = reschedule_intent
            result = await self.process_reschedule_request(intent_type, task_reference, user_message, context_id)
            if result:
                return result
        
        # Standard intent classification
        intent_result = intent_classifier.classify(clean_message)

        logger.info(
            f"Intent: bucket={intent_result.bucket.value}, "
            f"confidence={intent_result.confidence:.2f}"
        )

        created_tasks = []
        entities = []
        suggested_action = None

        intent_info = {
            "bucket": intent_result.bucket.value,
            "confidence": intent_result.confidence,
            "action_type": intent_result.action_type.value,
            "reasoning": intent_result.reasoning,
        }

        if intent_result.bucket == IntentBucket.EXPLICIT_COMMAND:
            response_text = await self._handle_explicit_command(
                intent_result, user_message, context_id, created_tasks, entities
            )

        elif intent_result.bucket == IntentBucket.ACTIONABLE:
            response_text = await self._handle_actionable(
                intent_result, user_message, context_id, created_tasks, entities
            )

        elif intent_result.bucket == IntentBucket.AMBIGUOUS:
            response_text, suggested_action = self._handle_ambiguous(intent_result)

        else:
            response_text = None

        return {
            "response": response_text,
            "created_tasks": created_tasks,
            "entities": entities,
            "intent_info": intent_info,
            "suggested_action": suggested_action,
            "response_type": "text",
        }

    async def _handle_explicit_command(
        self, intent_result, user_message: Message, context_id: Optional[str],
        created_tasks: List, entities: List
    ) -> str:
        """Handle explicit command bucket."""
        task = await task_service.create_from_intent(intent_result, str(user_message.id))

        if task:
            created_tasks.append(str(task.id))
            entities.append(task_service.task_to_entity(task, intent_result.confidence))
            
            # Record for undo
            await undo_service.record_action(
                action_type="task_create",
                description=f"Created task: {task.title}",
                undo_data={"task_id": str(task.id)},
                entity_id=str(task.id)
            )
            
            return f"✓ Created {intent_result.action_type.value}: **{task.title}**"

        return "I understood you want to create something, but couldn't parse it."

    async def _handle_actionable(
        self, intent_result, user_message: Message, context_id: Optional[str],
        created_tasks: List, entities: List
    ) -> str:
        """Handle actionable bucket."""
        task = await task_service.create_from_intent(intent_result, str(user_message.id))

        if not task:
            return "Got it! I'll keep that in mind."

        created_tasks.append(str(task.id))
        entities.append(task_service.task_to_entity(task, intent_result.confidence))

        due_info = ""
        if task.due_date:
            due_info = f" (due: {task.due_date.strftime('%B %d, %Y')})"
        elif task.due_fuzzy:
            due_info = f" (due: {task.due_fuzzy})"
        
        # Record for undo
        await undo_service.record_action(
            action_type="task_create",
            description=f"Added to {task.domain.value}: {task.title}",
            undo_data={"task_id": str(task.id)},
            entity_id=str(task.id)
        )

        return f"✓ Added to {task.domain.value}: **{task.title}**{due_info}"

    def _handle_ambiguous(self, intent_result) -> Tuple[str, dict]:
        """Handle ambiguous bucket."""
        suggested_action = {
            "type": intent_result.action_type.value,
            "title": intent_result.extracted_data.get("title", "Untitled"),
            "due_date": intent_result.extracted_data.get("due_date"),
            "due_fuzzy": intent_result.extracted_data.get("due_fuzzy"),
            "confidence": intent_result.confidence,
        }

        response_text = (
            f"That sounds like something to track. "
            f"Should I add '**{suggested_action['title']}**' as a {suggested_action['type']}?\n\n"
            f"Reply with 'yes' to confirm."
        )

        return response_text, suggested_action

    async def generate_chat_response(
        self, message: str, context_id: Optional[str], user_message_id: str
    ) -> str:
        """Generate response using LLM or fallback."""
        context_messages = []

        if context_id:
            try:
                context = await Context.get(context_id)
                if context and context.fork_type and context.fork_type.value == "summary":
                    if context.summary:
                        context_messages.append({
                            "role": "system",
                            "content": f"Previous context: {context.summary}",
                        })

                messages = await Message.find(Message.context_id == context_id).sort("+created_at").to_list()
                for msg in messages:
                    if str(msg.id) != user_message_id:
                        context_messages.append({"role": msg.role.value, "content": msg.content})
            except Exception as e:
                logger.warning(f"Failed to fetch context: {e}")

        try:
            messages = context_messages + [{"role": "user", "content": message}]
            return await generate_response(messages)
        except Exception as e:
            logger.warning(f"LLM failed: {e}")
            return "Got it! Let me know if you need anything else."


chat_service = ChatService()
