from fastapi import APIRouter, HTTPException
from typing import List, Optional

from server.models import Message, MessageCreate, MessageRole
from server.utils.route_logger import route_logger

router = APIRouter()


@router.post("/", response_model=Message, status_code=201)
@route_logger
async def create_message(message_data: MessageCreate):
    """Create a new message in the tree"""
    message = Message(**message_data.model_dump())
    await message.insert()

    if message.parent_id:
        parent = await Message.get(message.parent_id)
        if parent:
            parent.children_ids.append(str(message.id))
            await parent.save()

    return message


@router.delete("/{message_id}", status_code=204)
@route_logger
async def delete_message(message_id: str):
    """Delete a message (and optionally its subtree)"""
    message = await Message.get(message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message.parent_id:
        parent = await Message.get(message.parent_id)
        if parent and str(message.id) in parent.children_ids:
            parent.children_ids.remove(str(message.id))
            await parent.save()

    await message.delete()
    return None


@router.get("/", response_model=List[Message])
@route_logger
async def list_messages(
    context_id: Optional[str] = None, parent_id: Optional[str] = None, limit: int = 50
):
    """List messages with optional filters"""
    query = {}

    if context_id:
        query["context_id"] = context_id
    if parent_id:
        query["parent_id"] = parent_id

    messages = await Message.find(query).limit(limit).sort("-created_at").to_list()
    return messages


@router.get("/tree/{root_id}", response_model=dict)
@route_logger
async def get_message_tree(root_id: str, max_depth: int = 10):
    """Get the full message tree starting from a root message"""

    async def build_tree(message_id: str, depth: int = 0):
        if depth > max_depth:
            return None

        message = await Message.get(message_id)
        if not message:
            return None

        tree = {
            "id": str(message.id),
            "content": message.content,
            "role": message.role,
            "created_at": message.created_at,
            "children": [],
        }

        for child_id in message.children_ids:
            child_tree = await build_tree(child_id, depth + 1)
            if child_tree:
                tree["children"].append(child_tree)

        return tree

    tree = await build_tree(root_id)
    if not tree:
        raise HTTPException(status_code=404, detail="Message not found")

    return tree


@router.get("/{message_id}", response_model=Message)
@route_logger
async def get_message(message_id: str):
    """Get a specific message"""
    message = await Message.get(message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    return message
