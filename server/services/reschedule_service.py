"""
Natural Language Rescheduling Service

Handles rescheduling via natural language without drag-and-drop or calendar UI:
- "Do this later"
- "Push everything to tomorrow"
- "Not today"
- "Move to next week"

All actions support undo-first safety model.
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
from enum import Enum
from dataclasses import dataclass

from server.models import Task
from server.logger import Logger

logger = Logger.get("reschedule_service")


class RescheduleIntent(str, Enum):
    LATER = "later"           # "Do this later" - vague postponement
    TOMORROW = "tomorrow"     # "Push to tomorrow"
    NEXT_WEEK = "next_week"   # "Move to next week"
    NOT_TODAY = "not_today"   # "Not today" - bump to tomorrow
    SOON = "soon"             # "Do this soon" - this week
    EVENTUALLY = "eventually" # "Eventually" - no specific date
    CUSTOM = "custom"         # Specific date mentioned


@dataclass
class RescheduleResult:
    """Result of a reschedule operation"""
    success: bool
    task_id: str
    task_title: str
    old_due_date: Optional[datetime]
    old_due_fuzzy: Optional[str]
    new_due_date: Optional[datetime]
    new_due_fuzzy: Optional[str]
    undo_token: str  # Token for undo operation
    message: str  # Human-friendly message


@dataclass
class BulkRescheduleResult:
    """Result of bulk reschedule operation"""
    success: bool
    rescheduled_count: int
    results: List[RescheduleResult]
    undo_token: str
    message: str


class RescheduleService:
    """
    Natural language rescheduling with undo-first safety.
    
    Key features:
    - Parse natural language reschedule requests
    - Bulk operations ("push everything to tomorrow")
    - Undo tokens for all operations
    - Soft confirmations instead of blocking dialogs
    """
    
    # Natural language patterns for rescheduling
    RESCHEDULE_PATTERNS = {
        r"\b(?:do|move|push|reschedule)\s+(?:this|that|it)\s+later\b": RescheduleIntent.LATER,
        r"\b(?:not today|skip today|tomorrow instead)\b": RescheduleIntent.NOT_TODAY,
        r"\b(?:push|move)\s+(?:everything|all|these)\s+to\s+tomorrow\b": RescheduleIntent.TOMORROW,
        r"\b(?:do|move|push)\s+(?:this|that|it)\s+tomorrow\b": RescheduleIntent.TOMORROW,
        r"\b(?:move|push)\s+to\s+next\s+week\b": RescheduleIntent.NEXT_WEEK,
        r"\b(?:do|move)\s+(?:this|that)\s+next\s+week\b": RescheduleIntent.NEXT_WEEK,
        r"\b(?:do|schedule)\s+(?:this|that)\s+soon\b": RescheduleIntent.SOON,
        r"\b(?:do|move)\s+(?:this|that)\s+eventually\b": RescheduleIntent.EVENTUALLY,
    }
    
    # Task reference patterns (to identify which task user is referring to)
    TASK_REFERENCE_PATTERNS = [
        r"(?:the\s+)?(.+?)(?:\s+task|\s+reminder|\s+item)?\s+(?:to|for)",
        r"(?:reschedule|move|push)\s+(?:the\s+)?(.+?)(?:\s+to|\s+until|$)",
        r"\bd[o']\s+(?:the\s+)?(.+?)\s+later",
        r"\bnot\s+(?:the\s+)?(.+?)\s+today",
    ]
    
    def __init__(self):
        self._undo_registry: Dict[str, Dict[str, Any]] = {}
    
    async def reschedule_task(
        self, 
        task_id: str, 
        intent: RescheduleIntent,
        custom_date: Optional[datetime] = None
    ) -> RescheduleResult:
        """
        Reschedule a single task based on natural language intent.
        """
        task = await Task.get(task_id)
        if not task:
            return RescheduleResult(
                success=False,
                task_id=task_id,
                task_title="Unknown",
                old_due_date=None,
                old_due_fuzzy=None,
                new_due_date=None,
                new_due_fuzzy=None,
                undo_token="",
                message="Task not found"
            )
        
        # Store old values for undo
        old_due_date = task.due_date
        old_due_fuzzy = task.due_fuzzy
        
        # Compute new due date based on intent
        new_due_date, new_due_fuzzy = self._compute_new_due_date(intent, custom_date)
        
        # Update task
        task.due_date = new_due_date
        task.due_fuzzy = new_due_fuzzy
        task.ignored_count += 1
        task.last_ignored_at = datetime.utcnow()
        task.updated_at = datetime.utcnow()
        
        await task.save()
        
        # Generate undo token
        undo_token = f"undo_{task_id}_{datetime.utcnow().timestamp()}"
        self._undo_registry[undo_token] = {
            "task_id": task_id,
            "old_due_date": old_due_date,
            "old_due_fuzzy": old_due_fuzzy,
            "ignored_count": task.ignored_count - 1
        }
        
        # Generate human-friendly message
        message = self._generate_reschedule_message(task.title, intent, new_due_fuzzy or "later")
        
        logger.info(f"Rescheduled task {task_id}: {intent.value}")
        
        return RescheduleResult(
            success=True,
            task_id=task_id,
            task_title=task.title,
            old_due_date=old_due_date,
            old_due_fuzzy=old_due_fuzzy,
            new_due_date=new_due_date,
            new_due_fuzzy=new_due_fuzzy,
            undo_token=undo_token,
            message=message
        )
    
    async def bulk_reschedule(
        self,
        task_ids: List[str],
        intent: RescheduleIntent,
        custom_date: Optional[datetime] = None
    ) -> BulkRescheduleResult:
        """
        Reschedule multiple tasks (e.g., "push everything to tomorrow").
        """
        results = []
        undo_tokens = []
        
        for task_id in task_ids:
            result = await self.reschedule_task(task_id, intent, custom_date)
            if result.success:
                results.append(result)
                undo_tokens.append(result.undo_token)
        
        # Create bulk undo token
        bulk_undo_token = f"bulk_{datetime.utcnow().timestamp()}"
        self._undo_registry[bulk_undo_token] = {
            "type": "bulk",
            "individual_tokens": undo_tokens
        }
        
        message = f"Moved {len(results)} tasks to {intent.value}. Undo?"
        
        return BulkRescheduleResult(
            success=len(results) > 0,
            rescheduled_count=len(results),
            results=results,
            undo_token=bulk_undo_token,
            message=message
        )
    
    async def reschedule_today_tasks(self, intent: RescheduleIntent = RescheduleIntent.TOMORROW) -> BulkRescheduleResult:
        """
        Reschedule all of today's tasks ("push everything to tomorrow").
        """
        now = datetime.utcnow()
        end_of_day = now.replace(hour=23, minute=59, second=59)
        
        # Find today's tasks
        tasks = await Task.find(
            Task.due_date <= end_of_day,
            Task.completed == False
        ).to_list()
        
        # Also include fuzzy "today" tasks
        fuzzy_today = await Task.find(
            Task.due_fuzzy == "today",
            Task.completed == False
        ).to_list()
        
        all_tasks = {str(t.id): t for t in tasks + fuzzy_today}
        task_ids = list(all_tasks.keys())
        
        if not task_ids:
            return BulkRescheduleResult(
                success=False,
                rescheduled_count=0,
                results=[],
                undo_token="",
                message="No tasks to reschedule for today"
            )
        
        return await self.bulk_reschedule(task_ids, intent)
    
    async def undo_reschedule(self, undo_token: str) -> bool:
        """
        Undo a reschedule operation using the undo token.
        Returns True if successful.
        """
        if undo_token not in self._undo_registry:
            logger.warning(f"Invalid undo token: {undo_token}")
            return False
        
        undo_data = self._undo_registry[undo_token]
        
        if undo_data.get("type") == "bulk":
            # Undo bulk operation
            success = True
            for individual_token in undo_data.get("individual_tokens", []):
                if not await self.undo_reschedule(individual_token):
                    success = False
            
            if success:
                del self._undo_registry[undo_token]
            return success
        
        # Undo single task
        task_id = undo_data.get("task_id")
        task = await Task.get(task_id)
        
        if not task:
            return False
        
        # Restore old values
        task.due_date = undo_data.get("old_due_date")
        task.due_fuzzy = undo_data.get("old_due_fuzzy")
        task.ignored_count = undo_data.get("ignored_count", 0)
        task.updated_at = datetime.utcnow()
        
        await task.save()
        
        del self._undo_registry[undo_token]
        
        logger.info(f"Undid reschedule for task {task_id}")
        return True
    
    def _compute_new_due_date(
        self, 
        intent: RescheduleIntent, 
        custom_date: Optional[datetime] = None
    ) -> Tuple[Optional[datetime], Optional[str]]:
        """Compute new due date based on reschedule intent"""
        now = datetime.utcnow()
        
        if intent == RescheduleIntent.TOMORROW or intent == RescheduleIntent.NOT_TODAY:
            tomorrow = now + timedelta(days=1)
            return (
                tomorrow.replace(hour=23, minute=59, second=59),
                "tomorrow"
            )
        
        elif intent == RescheduleIntent.NEXT_WEEK:
            next_week = now + timedelta(days=7)
            return (
                next_week.replace(hour=23, minute=59, second=59),
                "next week"
            )
        
        elif intent == RescheduleIntent.SOON:
            soon = now + timedelta(days=2)
            return (
                soon.replace(hour=23, minute=59, second=59),
                "soon"
            )
        
        elif intent == RescheduleIntent.LATER:
            # Vague - just bump a few days
            later = now + timedelta(days=3)
            return (
                later.replace(hour=23, minute=59, second=59),
                "later"
            )
        
        elif intent == RescheduleIntent.EVENTUALLY:
            # No specific date
            return (None, "eventually")
        
        elif intent == RescheduleIntent.CUSTOM and custom_date:
            return (custom_date, None)
        
        # Default: bump to tomorrow
        tomorrow = now + timedelta(days=1)
        return (
            tomorrow.replace(hour=23, minute=59, second=59),
            "tomorrow"
        )
    
    def _generate_reschedule_message(self, task_title: str, intent: RescheduleIntent, time_desc: str) -> str:
        """Generate human-friendly reschedule confirmation"""
        messages = {
            RescheduleIntent.LATER: f"Moved '{task_title}' to later",
            RescheduleIntent.TOMORROW: f"Added '{task_title}' to tomorrow",
            RescheduleIntent.NOT_TODAY: f"'{task_title}' moved to tomorrow",
            RescheduleIntent.NEXT_WEEK: f"'{task_title}' scheduled for next week",
            RescheduleIntent.SOON: f"'{task_title}' marked for soon",
            RescheduleIntent.EVENTUALLY: f"'{task_title}' saved for eventually",
        }
        return messages.get(intent, f"Rescheduled '{task_title}' to {time_desc}")
    
    def parse_reschedule_intent(self, message: str) -> Optional[Tuple[RescheduleIntent, Optional[str]]]:
        """
        Parse natural language to determine reschedule intent.
        Returns (intent, task_id_or_reference) or None if not a reschedule request.
        """
        import re
        
        message_lower = message.lower()
        
        # Check for bulk patterns first
        bulk_patterns = [
            r"\b(?:push|move)\s+(?:everything|all|these)\s+(?:to\s+)?tomorrow\b",
            r"\b(?:not today|skip everything today)\b",
        ]
        
        for pattern in bulk_patterns:
            if re.search(pattern, message_lower):
                return (RescheduleIntent.TOMORROW, "__bulk_today__")
        
        # Check for specific reschedule patterns
        for pattern, intent in self.RESCHEDULE_PATTERNS.items():
            if re.search(pattern, message_lower):
                # Try to extract task reference
                task_ref = self._extract_task_reference(message_lower)
                return (intent, task_ref)
        
        return None
    
    def _extract_task_reference(self, message: str) -> Optional[str]:
        """Extract task reference from message"""
        import re
        
        for pattern in self.TASK_REFERENCE_PATTERNS:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        
        return None
    
    async def find_task_by_reference(self, reference: str, context_task_ids: List[str] = None) -> Optional[Task]:
        """
        Find a task by natural language reference.
        Searches in context first, then globally.
        """
        reference_lower = reference.lower()
        
        # Search in context first if provided
        if context_task_ids:
            for task_id in context_task_ids:
                task = await Task.get(task_id)
                if task and reference_lower in task.title.lower():
                    return task
        
        # Global search
        all_tasks = await Task.find(Task.completed == False).to_list()
        
        # Exact match first
        for task in all_tasks:
            if reference_lower == task.title.lower():
                return task
        
        # Partial match
        for task in all_tasks:
            if reference_lower in task.title.lower():
                return task
        
        # Word match
        ref_words = set(reference_lower.split())
        for task in all_tasks:
            task_words = set(task.title.lower().split())
            if ref_words & task_words:  # Intersection
                return task
        
        return None


reschedule_service = RescheduleService()
