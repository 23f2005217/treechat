from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime

from server.models import (
    Folder,
    FolderCreate,
    FolderUpdate,
    AddThreadToFolderRequest,
)
from server.utils.route_logger import route_logger

router = APIRouter()


@router.post("/", response_model=Folder, status_code=201)
@route_logger
async def create_folder(folder_data: FolderCreate):
    """Create a new folder"""
    folder = Folder(**folder_data.model_dump())
    await folder.insert()
    return folder


@router.get("/", response_model=List[Folder])
@route_logger
async def list_folders(limit: int = 100, skip: int = 0):
    """List all folders"""
    folders = await Folder.find().sort("order").skip(skip).limit(limit).to_list()
    return folders


@router.get("/{folder_id}", response_model=Folder)
@route_logger
async def get_folder(folder_id: str):
    """Get a specific folder"""
    if len(folder_id) != 24:
        raise HTTPException(status_code=404, detail="Folder not found")

    folder = await Folder.get(folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    return folder


@router.patch("/{folder_id}", response_model=Folder)
@route_logger
async def update_folder(folder_id: str, folder_data: FolderUpdate):
    """Update folder metadata"""
    if len(folder_id) != 24:
        raise HTTPException(status_code=404, detail="Folder not found")

    folder = await Folder.get(folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    if folder_data.name:
        folder.name = folder_data.name
    if folder_data.description is not None:
        folder.description = folder_data.description
    if folder_data.order is not None:
        folder.order = folder_data.order

    folder.updated_at = datetime.utcnow()
    await folder.save()

    return folder


@router.delete("/{folder_id}", status_code=204)
@route_logger
async def delete_folder(folder_id: str):
    """Delete a folder"""
    if len(folder_id) != 24:
        raise HTTPException(status_code=404, detail="Folder not found")

    folder = await Folder.get(folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    await folder.delete()
    return None


@router.post("/{folder_id}/threads", response_model=Folder)
@route_logger
async def add_thread_to_folder(folder_id: str, request: AddThreadToFolderRequest):
    """Add a thread/context to a folder"""
    if len(folder_id) != 24:
        raise HTTPException(status_code=404, detail="Folder not found")

    folder = await Folder.get(folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    if request.thread_id not in folder.thread_ids:
        folder.thread_ids.append(request.thread_id)
        folder.updated_at = datetime.utcnow()
        await folder.save()

    return folder


@router.delete("/{folder_id}/threads/{thread_id}", response_model=Folder)
@route_logger
async def remove_thread_from_folder(folder_id: str, thread_id: str):
    """Remove a thread from a folder"""
    if len(folder_id) != 24:
        raise HTTPException(status_code=404, detail="Folder not found")

    folder = await Folder.get(folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    if thread_id in folder.thread_ids:
        folder.thread_ids.remove(thread_id)
        folder.updated_at = datetime.utcnow()
        await folder.save()

    return folder
