from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime
from bson import ObjectId

from server.models import Context, ContextCreate, Message
from server.models import MessageRole
from typing import Dict, Any

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
    contexts = (
        await Context.find().sort("-last_accessed").skip(skip).limit(limit).to_list()
    )
    return contexts


@router.get("/{context_id}", response_model=Context)
async def get_context(context_id: str):
    """Get a specific context"""
    if not ObjectId.is_valid(context_id):
        raise HTTPException(status_code=404, detail="Context not found")

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
    if not ObjectId.is_valid(context_id):
        raise HTTPException(status_code=404, detail="Context not found")

    context = await Context.get(context_id)
    if not context:
        raise HTTPException(status_code=404, detail="Context not found")

    messages = (
        await Message.find(Message.context_id == context_id)
        .sort("+created_at")
        .to_list()
    )
    return messages


@router.patch("/{context_id}", response_model=Context)
async def update_context(context_id: str, title: Optional[str] = None, summary: Optional[str] = None):
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


@router.post("/import", status_code=201)
async def import_context_with_messages(payload: Dict[str, Any]):
    """Create a new context and bulk import messages.

    Payload shape:
    {
      "title": "...",
      "messages": [
         {"old_id": "1", "content": "...", "role": "user|assistant|system", "parent_old_id": null},
         ...
      ]
    }
    """
    title = payload.get("title", "Imported Context")
    messages = payload.get("messages", [])

    # Create context
    context = Context(title=title)
    await context.insert()

    # Build depth map to ensure parents are created before children
    old_map = {m.get("old_id"): m for m in messages}

    def compute_depth(m):
        depth = 0
        cur = m.get("parent_old_id")
        visited = set()
        while cur:
            if cur in visited:
                # cycle -> break
                break
            visited.add(cur)
            parent = old_map.get(cur)
            if not parent:
                break
            depth += 1
            cur = parent.get("parent_old_id")
        return depth

    sorted_msgs = sorted(messages, key=compute_depth)

    id_map = {}
    for m in sorted_msgs:
        role_str = m.get("role", "user")
        try:
            role = MessageRole(role_str)
        except Exception:
            role = MessageRole.USER

        parent_old = m.get("parent_old_id")
        parent_id = id_map.get(parent_old) if parent_old else None

        msg = Message(
            content=m.get("content", ""),
            role=role,
            parent_id=parent_id,
            context_id=str(context.id),
        )
        await msg.insert()
        id_map[m.get("old_id")] = str(msg.id)

    return {
        "context_id": str(context.id),
        "total": len(messages),
        "created_count": len(id_map),
        "id_map": id_map,
    }
