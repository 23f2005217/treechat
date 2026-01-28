"""
Task Summary Routes - Chat-first API endpoints

Provides endpoints for conversational task summaries:
- GET /api/summary/today - "What do I have today?"
- GET /api/summary/week - "What's left this week?"
- GET /api/summary/energy - "What can I do in 10 minutes?"
- POST /api/summary/query - Natural language query endpoint
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from pydantic import BaseModel

from server.services.task_summary_service import task_summary_service, EnergyLevel
from server.services.reschedule_service import reschedule_service, RescheduleIntent
from server.services.undo_service import undo_service
from server.utils.route_logger import route_logger

router = APIRouter()


class SummaryQueryRequest(BaseModel):
    """Natural language summary query"""
    query: str
    time_minutes: Optional[int] = None


class SummaryResponse(BaseModel):
    """Structured summary response"""
    type: str
    summary_type: str
    count: int
    tasks: List[dict]
    suggestions: List[str]
    decay_alerts: List[str]


class RescheduleRequest(BaseModel):
    """Reschedule request"""
    task_id: Optional[str] = None
    intent: str = "tomorrow"  # later, tomorrow, next_week, not_today, soon, eventually
    custom_date: Optional[str] = None


class BulkRescheduleRequest(BaseModel):
    """Bulk reschedule request"""
    task_ids: Optional[List[str]] = None  # If None, reschedules today's tasks
    intent: str = "tomorrow"


class UndoRequest(BaseModel):
    """Undo request"""
    action_id: str


@router.get("/today", response_model=SummaryResponse)
@route_logger
async def get_today_summary():
    """
    Get today's tasks summary.
    Answers: "What do I have today?"
    """
    summary = await task_summary_service.get_today_summary()
    formatted = task_summary_service.format_for_chat(summary)
    return SummaryResponse(**formatted)


@router.get("/week", response_model=SummaryResponse)
@route_logger
async def get_week_summary():
    """
    Get this week's tasks summary.
    Answers: "What's left this week?"
    """
    summary = await task_summary_service.get_week_summary()
    formatted = task_summary_service.format_for_chat(summary)
    return SummaryResponse(**formatted)


@router.get("/energy", response_model=SummaryResponse)
@route_logger
async def get_energy_based_tasks(
    level: str = Query("low", description="Energy level: high, medium, low"),
    minutes: Optional[int] = Query(None, description="Time available in minutes")
):
    """
    Get tasks matching energy level and time constraint.
    Answers: "What can I do in 10 minutes?" or "Give me easy tasks"
    """
    try:
        energy = EnergyLevel(level.lower())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid energy level: {level}")
    
    summary = await task_summary_service.get_energy_based_tasks(energy, minutes)
    formatted = task_summary_service.format_for_chat(summary)
    return SummaryResponse(**formatted)


@router.get("/overdue", response_model=SummaryResponse)
@route_logger
async def get_overdue_tasks():
    """
    Get overdue tasks with decay warnings.
    """
    summary = await task_summary_service.get_overdue_tasks()
    formatted = task_summary_service.format_for_chat(summary)
    return SummaryResponse(**formatted)


@router.post("/query", response_model=SummaryResponse)
@route_logger
async def query_summary(request: SummaryQueryRequest):
    """
    Natural language query endpoint.
    Interprets queries like:
    - "What do I have today?"
    - "What's left this week?"
    - "What can I do in 10 minutes?"
    - "Give me easy tasks"
    """
    query_lower = request.query.lower()
    
    # Today queries
    if any(phrase in query_lower for phrase in ["today", "right now", "this morning"]):
        summary = await task_summary_service.get_today_summary()
    
    # Week queries
    elif any(phrase in query_lower for phrase in ["this week", "left", "remaining", "upcoming"]):
        summary = await task_summary_service.get_week_summary()
    
    # Energy/time-based queries
    elif any(phrase in query_lower for phrase in ["easy", "quick", "simple", "fast"]):
        summary = await task_summary_service.get_energy_based_tasks(EnergyLevel.LOW, request.time_minutes)
    
    elif any(phrase in query_lower for phrase in ["10 minutes", "5 minutes", "15 minutes", "quick task"]):
        # Extract minutes from query
        import re
        match = re.search(r'(\d+)\s*minutes?', query_lower)
        minutes = int(match.group(1)) if match else 10
        summary = await task_summary_service.get_energy_based_tasks(EnergyLevel.LOW, minutes)
    
    elif any(phrase in query_lower for phrase in ["hard", "complex", "focus", "deep work"]):
        summary = await task_summary_service.get_energy_based_tasks(EnergyLevel.HIGH)
    
    # Overdue queries
    elif any(phrase in query_lower for phrase in ["overdue", "missed", "late", "behind"]):
        summary = await task_summary_service.get_overdue_tasks()
    
    # Default to today
    else:
        summary = await task_summary_service.get_today_summary()
    
    formatted = task_summary_service.format_for_chat(summary)
    return SummaryResponse(**formatted)


@router.post("/reschedule")
@route_logger
async def reschedule_task(request: RescheduleRequest):
    """
    Reschedule a task via natural language intent.
    Supports: later, tomorrow, next_week, not_today, soon, eventually
    """
    if not request.task_id:
        raise HTTPException(status_code=400, detail="task_id is required")
    
    try:
        intent = RescheduleIntent(request.intent)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid intent: {request.intent}")
    
    result = await reschedule_service.reschedule_task(
        task_id=request.task_id,
        intent=intent
    )
    
    if not result.success:
        raise HTTPException(status_code=404, detail=result.message)
    
    # Record for undo
    await undo_service.record_action(
        action_type="task_reschedule",
        description=result.message,
        undo_data={
            "task_id": request.task_id,
            "old_due_date": result.old_due_date.isoformat() if result.old_due_date else None,
            "old_due_fuzzy": result.old_due_fuzzy
        },
        entity_id=request.task_id
    )
    
    return {
        "success": True,
        "message": result.message,
        "undo_token": result.undo_token,
        "new_due_fuzzy": result.new_due_fuzzy
    }


@router.post("/reschedule/bulk")
@route_logger
async def bulk_reschedule(request: BulkRescheduleRequest):
    """
    Bulk reschedule tasks.
    If task_ids is not provided, reschedules all of today's tasks.
    """
    try:
        intent = RescheduleIntent(request.intent)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid intent: {request.intent}")
    
    if request.task_ids:
        result = await reschedule_service.bulk_reschedule(request.task_ids, intent)
    else:
        # Reschedule today's tasks
        result = await reschedule_service.reschedule_today_tasks(intent)
    
    if not result.success:
        raise HTTPException(status_code=400, detail=result.message)
    
    # Record bulk action for undo
    await undo_service.record_action(
        action_type="bulk_reschedule",
        description=result.message,
        undo_data={
            "individual_tokens": [r.undo_token for r in result.results]
        }
    )
    
    return {
        "success": True,
        "message": result.message,
        "rescheduled_count": result.rescheduled_count,
        "undo_token": result.undo_token
    }


@router.post("/undo")
@route_logger
async def undo_action(request: UndoRequest):
    """
    Undo a previous action using its token.
    """
    success = await undo_service.undo(request.action_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Unable to undo action. It may have expired.")
    
    return {
        "success": True,
        "message": "Action undone successfully"
    }


@router.get("/undo/{action_id}/status")
@route_logger
async def get_undo_status(action_id: str):
    """
    Check if an action can still be undone.
    """
    can_undo = undo_service.can_undo(action_id)
    confirmation = undo_service.get_soft_confirmation(action_id)
    
    return {
        "can_undo": can_undo,
        "confirmation": confirmation.message if confirmation else None,
        "expires_in": confirmation.expires_in_seconds if confirmation else 0
    }
