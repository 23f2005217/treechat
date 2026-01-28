"""Chat routes - Controller layer for chat endpoints."""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List

from server.models import Task, Message, MessageRole
from server.services.chat_service import chat_service
from server.utils.urgency import urgency_engine
from server.utils.route_logger import route_logger

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    context_id: Optional[str] = None
    parent_message_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    message_id: str
    extracted_entities: List[dict]
    created_tasks: List[str]
    intent_classification: Optional[dict] = None
    suggested_action: Optional[dict] = None
    response_type: Optional[str] = None  # "text", "structured_list", "undoable_action"
    structured_data: Optional[dict] = None  # For structured list responses
    undo_token: Optional[str] = None  # For undoable actions


@router.post("/", response_model=ChatResponse)
@route_logger
async def chat(request: ChatRequest):
    """Process chat message with intent classification and task creation."""
    clean_message, explicit_tags = chat_service.extract_explicit_tags(request.message)

    user_message = Message(
        content=request.message,
        role=MessageRole.USER,
        parent_id=request.parent_message_id,
        context_id=request.context_id,
    )
    await user_message.insert()

    if explicit_tags:
        tag = explicit_tags[0]
        result = await chat_service.process_explicit_tag(
            tag, clean_message, user_message, request.context_id
        )

        if result:
            return ChatResponse(
                response=result["response"],
                message_id=result["message_id"],
                extracted_entities=[result["entity"]],
                created_tasks=[result["task_id"]],
                intent_classification={
                    "bucket": "explicit_tag",
                    "tag": tag,
                    "confidence": 1.0,
                },
                response_type=result.get("response_type", "text"),
                undo_token=result.get("undo_token"),
            )
        else:
            return ChatResponse(
                response="I see you tagged this as a task, but couldn't create it. Could you provide more details?",
                message_id=str(user_message.id),
                extracted_entities=[],
                created_tasks=[],
                intent_classification={
                    "bucket": "explicit_tag_failed",
                    "tag": tag,
                    "confidence": 0.0,
                },
            )

    result = await chat_service.process_intent_classification(
        clean_message, user_message, request.context_id
    )

    response_text = result.get("response")
    
    # If it's a structured list response, the assistant message was already created
    if result.get("response_type") == "structured_list":
        return ChatResponse(
            response=response_text,
            message_id=result["message_id"],
            extracted_entities=result.get("extracted_entities", []),
            created_tasks=[],
            intent_classification={"bucket": "summary_query"},
            response_type="structured_list",
            structured_data=result.get("structured_data"),
        )
    
    # If it's an undoable action, the assistant message was already created
    if result.get("response_type") == "undoable_action":
        return ChatResponse(
            response=response_text,
            message_id=result["message_id"],
            extracted_entities=[],
            created_tasks=[],
            intent_classification={"bucket": "reschedule"},
            response_type="undoable_action",
            undo_token=result.get("undo_token"),
        )
    
    if response_text is None:
        response_text = await chat_service.generate_chat_response(
            request.message, request.context_id, str(user_message.id)
        )

    assistant_message = Message(
        content=response_text,
        role=MessageRole.ASSISTANT,
        parent_id=str(user_message.id),
        context_id=request.context_id,
        extracted_entities=result.get("entities", []),
    )
    await assistant_message.insert()

    user_message.children_ids.append(str(assistant_message.id))
    user_message.extracted_entities = result.get("entities", [])
    await user_message.save()

    return ChatResponse(
        response=response_text,
        message_id=str(assistant_message.id),
        extracted_entities=result.get("entities", []),
        created_tasks=result.get("created_tasks", []),
        intent_classification=result.get("intent_info"),
        suggested_action=result.get("suggested_action"),
        response_type=result.get("response_type", "text"),
        structured_data=result.get("structured_data"),
        undo_token=result.get("undo_token"),
    )


@router.get("/next-action")
@route_logger
async def get_next_action(time_available: int = 60):
    """Get the best next task to work on."""
    tasks = await Task.find(Task.completed == False).to_list()

    if not tasks:
        return {"message": "No pending tasks! You're all caught up 🎉", "task": None}

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
    }


@router.post("/confirm-suggestion")
@route_logger
async def confirm_suggestion(suggestion_id: str, confirm: bool = True):
    """Confirm or reject a suggested task."""
    return {"status": "acknowledged", "confirmed": confirm}
