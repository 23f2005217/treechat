from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timedelta

from server.models import Task, TaskCreate, TaskUpdate, TaskDomain, UrgencyLevel
from server.logger import Logger

router = APIRouter()
logger = Logger.get("tasks")


@router.post("/", response_model=Task, status_code=201)
async def create_task(task_data: TaskCreate):
    """Create a new task"""
    task = Task(**task_data.model_dump())
    await task.insert()
    logger.info(f"Created task: {task.id}")
    return task


@router.get("/", response_model=List[Task])
async def list_tasks(
    domain: Optional[TaskDomain] = None,
    completed: Optional[bool] = None,
    urgency: Optional[UrgencyLevel] = None,
    limit: int = Query(50, le=100),
    skip: int = 0,
):
    """List tasks with optional filters"""
    query = {}

    if domain is not None:
        query["domain"] = domain
    if completed is not None:
        query["completed"] = completed
    if urgency is not None:
        query["urgency"] = urgency

    tasks = await Task.find(query).skip(skip).limit(limit).to_list()
    return tasks


@router.get("/upcoming", response_model=List[Task])
async def get_upcoming_tasks(days: int = 7):
    """Get tasks due in the next N days"""
    now = datetime.utcnow()
    future = now + timedelta(days=days)

    tasks = (
        await Task.find(
            Task.due_date >= now, Task.due_date <= future, Task.completed == False
        )
        .sort("+due_date")
        .to_list()
    )

    return tasks


@router.get("/today", response_model=List[Task])
async def get_today_tasks():
    """Get tasks for today (high priority items)"""
    now = datetime.utcnow()
    end_of_day = now.replace(hour=23, minute=59, second=59)

    tasks = (
        await Task.find(Task.due_date <= end_of_day, Task.completed == False)
        .sort("-urgency")
        .limit(5)
        .to_list()
    )

    return tasks


@router.get("/by-domain", response_model=dict)
async def get_tasks_by_domain():
    """Get tasks grouped by domain"""
    all_tasks = await Task.find(Task.completed == False).to_list()

    grouped = {}
    for task in all_tasks:
        domain = task.domain.value
        if domain not in grouped:
            grouped[domain] = []
        grouped[domain].append(task)

    return grouped


@router.get("/{task_id}", response_model=Task)
async def get_task(task_id: str):
    """Get a specific task by ID"""
    task = await Task.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.patch("/{task_id}", response_model=Task)
async def update_task(task_id: str, task_update: TaskUpdate):
    """Update a task"""
    task = await Task.get(task_id)
    if not task:
        logger.warning(f"Task not found: {task_id}")
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = task_update.model_dump(exclude_unset=True)

    if "completed" in update_data and update_data["completed"]:
        update_data["completed_at"] = datetime.utcnow()
        logger.info(f"Marked task as completed: {task_id}")

    update_data["updated_at"] = datetime.utcnow()

    for field, value in update_data.items():
        setattr(task, field, value)

    await task.save()
    logger.debug(f"Updated task: {task_id}")
    return task


@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: str):
    """Delete a task"""
    task = await Task.get(task_id)
    if not task:
        logger.warning(f"Task not found: {task_id}")
        raise HTTPException(status_code=404, detail="Task not found")

    await task.delete()
    logger.info(f"Deleted task: {task_id}")
    return None
