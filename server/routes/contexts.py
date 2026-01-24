from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime

from server.models import Context, ContextCreate, Message

router = APIRouter()


@router.post("/", response_model=Context, status_code=201)
async def create_context(context_data: ContextCreate):
    """Create a new conversation context"""
    context = Context(**context_data.model_dump())
    await context.insert()
    return context


@router.get("/", response_model=List[Context])
async def list_contexts(limit: int = 20, skip: int = 0):
    """List all conversation contexts"""
    contexts = await Context.find().sort("-last_accessed").skip(skip).limit(limit).to_list()
    return contexts


@router.get("/{context_id}", response_model=Context)
async def get_context(context_id: str):
    """Get a specific context"""
    context = await Context.get(context_id)
    if not context:
        raise HTTPException(status_code=404, detail="Context not found")
    
    # Update last accessed
    context.last_accessed = datetime.utcnow()
    await context.save()
    
    return context


@router.get("/{context_id}/messages", response_model=List[Message])
async def get_context_messages(context_id: str):
    """Get all messages in a context"""
    context = await Context.get(context_id)
    if not context:
        raise HTTPException(status_code=404, detail="Context not found")
    
    messages = await Message.find(Message.context_id == context_id).sort("+created_at").to_list()
    return messages


@router.patch("/{context_id}", response_model=Context)
async def update_context(context_id: str, title: str = None, summary: str = None):
    """Update context metadata"""
    context = await Context.get(context_id)
    if not context:
        raise HTTPException(status_code=404, detail="Context not found")
    
    if title:
        context.title = title
    if summary:
        context.summary = summary
    
    context.updated_at = datetime.utcnow()
    await context.save()
    
    return context


@router.delete("/{context_id}", status_code=204)
async def delete_context(context_id: str):
    """Delete a context"""
    context = await Context.get(context_id)
    if not context:
        raise HTTPException(status_code=404, detail="Context not found")
    
    await context.delete()
    return None
