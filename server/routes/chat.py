from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from server.llm import generate_response
from server.models import Task, Message, Context, MessageRole, MessageCreate
from server.utils.nlp import task_extractor
from server.utils.urgency import urgency_engine
from server.logger import Logger

router = APIRouter()
logger = Logger.get("chat")


class ChatRequest(BaseModel):
    message: str
    context_id: Optional[str] = None
    parent_message_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    message_id: str
    extracted_entities: List[dict]
    created_tasks: List[str]  # Task IDs


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Process natural language input and extract tasks"""
    logger.info(f"Received message: {request.message[:50]}...")

    user_message = Message(
        content=request.message,
        role=MessageRole.USER,
        parent_id=request.parent_message_id,
        context_id=request.context_id,
    )
    await user_message.insert()
    logger.debug(f"Created user message: {user_message.id}")

    task_data = task_extractor.extract(request.message)

    created_tasks = []
    entities = []

    if task_data["domain"] or task_data["due_date"] or task_data["due_fuzzy"]:
        logger.info(f"Extracted task: {task_data['title']}")
        # Create task
        task = Task(
            title=task_data["title"],
            description=task_data["description"],
            domain=task_data["domain"],
            task_type=task_data["task_type"],
            due_date=task_data["due_date"],
            due_fuzzy=task_data["due_fuzzy"],
            requested_by=task_data["requested_by"],
            tags=task_data["tags"],
            source_message_id=str(user_message.id),
        )

        # Compute urgency
        task.urgency = urgency_engine.compute_urgency(task)

        await task.insert()
        created_tasks.append(str(task.id))

        entities.append(
            {
                "type": "task",
                "id": str(task.id),
                "title": task.title,
                "domain": task.domain.value,
                "urgency": task.urgency.value,
            }
        )

    # 4. Gather context messages if this is a forked thread
    context_messages = []
    if request.context_id:
        try:
            context = await Context.get(request.context_id)
            if context:
                logger.info(f"Context {context.id} has fork_type: {context.fork_type}")
                # Check if this context was created from a fork
                if context.fork_type:
                    if context.fork_type.value == "summary":
                        # Add summary as system message (summary was copied to this context during fork)
                        if context.summary:
                            context_messages.append(
                                {
                                    "role": "system",
                                    "content": f"Previous conversation context: {context.summary}",
                                }
                            )
                            logger.info(
                                f"Added summary from context: {context.summary[:100]}..."
                            )
                    elif context.fork_type.value == "full":
                        # Add all messages from parent context
                        if context.parent_context_id:
                            parent_messages = (
                                await Message.find(
                                    Message.context_id == context.parent_context_id
                                )
                                .sort("+created_at")
                                .to_list()
                            )
                            logger.info(
                                f"Adding {len(parent_messages)} messages from parent context"
                            )
                            for msg in parent_messages:
                                context_messages.append(
                                    {"role": msg.role.value, "content": msg.content}
                                )
                # Also include messages from this context (non-forked threads)
                current_context_messages = (
                    await Message.find(Message.context_id == request.context_id)
                    .sort("+created_at")
                    .to_list()
                )
                for msg in current_context_messages:
                    # Only include messages that were created before this new user message
                    if msg.id != user_message.id:
                        context_messages.append(
                            {"role": msg.role.value, "content": msg.content}
                        )
                logger.info(
                    f"Total context messages to send to LLM: {len(context_messages)}"
                )
        except Exception as e:
            logger.warning(f"Failed to fetch context: {str(e)}")

    # 5. Generate response using LLM if possible, otherwise fallback
    try:
        messages = context_messages + [{"role": "user", "content": request.message}]
        response_text = await generate_response(messages)
    except Exception:
        response_text = _generate_response(task_data, created_tasks)

    # 5. Create assistant message
    assistant_message = Message(
        content=response_text,
        role=MessageRole.ASSISTANT,
        parent_id=str(user_message.id),
        context_id=request.context_id,
        extracted_entities=entities,
    )
    await assistant_message.insert()

    # Update user message with child
    user_message.children_ids.append(str(assistant_message.id))
    user_message.extracted_entities = entities
    await user_message.save()

    return ChatResponse(
        response=response_text,
        message_id=str(assistant_message.id),
        extracted_entities=entities,
        created_tasks=created_tasks,
    )


def _generate_response(task_data: dict, created_tasks: List[str]) -> str:
    """Generate natural language response"""
    if not created_tasks:
        return (
            "Got it! I'm tracking that for you. Let me know if you need anything else."
        )

    title = task_data["title"]
    domain = task_data["domain"].value

    response = f"✓ Added to {domain}: **{title}**"

    if task_data["due_date"]:
        due_str = task_data["due_date"].strftime("%B %d, %Y")
        response += f" (due: {due_str})"
    elif task_data["due_fuzzy"]:
        response += f" (due: {task_data['due_fuzzy']})"

    if task_data["requested_by"]:
        response += f" — requested by {task_data['requested_by']}"

    return response


@router.get("/next-action")
async def get_next_action(time_available: int = 60):
    """Get the best next task to work on"""
    # Get all pending tasks
    tasks = await Task.find(Task.completed == False).to_list()

    if not tasks:
        return {"message": "No pending tasks! You're all caught up 🎉", "task": None}

    # Get recommended task
    next_task = urgency_engine.get_next_action(tasks, time_available)

    if not next_task:
        return {"message": "No suitable tasks for the available time", "task": None}

    return {
        "message": f"Best next action: {next_task.title}",
        "task": {
            "id": str(next_task.id),
            "title": next_task.title,
            "domain": next_task.domain.value,
            "urgency": next_task.urgency.value,
            "estimated_effort": next_task.estimated_effort,
        },
        "alternatives": [],  # TODO: Get 2-3 alternative tasks
    }


@router.post("/query")
async def natural_query(query: str):
    """Answer natural language queries about tasks"""
    query_lower = query.lower()

    # Parse query intent
    if "college" in query_lower or "assignment" in query_lower:
        tasks = await Task.find(
            Task.domain == "college", Task.completed == False
        ).to_list()
        return {"tasks": tasks, "count": len(tasks)}

    elif "household" in query_lower or "home" in query_lower:
        tasks = await Task.find(
            Task.domain == "household", Task.completed == False
        ).to_list()
        return {"tasks": tasks, "count": len(tasks)}

    elif "urgent" in query_lower or "important" in query_lower:
        tasks = await Task.find(
            Task.urgency.in_(["high", "critical"]), Task.completed == False
        ).to_list()
        return {"tasks": tasks, "count": len(tasks)}

    elif "mother" in query_lower or "mom" in query_lower:
        tasks = await Task.find(
            Task.requested_by == "mother", Task.completed == False
        ).to_list()
        return {"tasks": tasks, "count": len(tasks)}

    elif any(word in query_lower for word in ["pending", "todo", "all"]):
        tasks = await Task.find(Task.completed == False).to_list()
        return {"tasks": tasks, "count": len(tasks)}

    else:
        return {
            "message": "I can help you query tasks by: domain (college/household), urgency, person, or show all pending tasks.",
            "tasks": [],
            "count": 0,
        }
