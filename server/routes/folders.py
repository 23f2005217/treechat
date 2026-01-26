from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime

from server.models import (
    Folder,
    FolderCreate,
    FolderUpdate,
    AddThreadToFolderRequest,
    RemoveThreadFromFolderRequest,
)
from server.logger import Logger

router = APIRouter()
logger = Logger.get("folders")


@router.post("/", response_model=Folder, status_code=201)
async def create_folder(folder_data: FolderCreate):
    """Create a new folder"""
    folder = Folder(**folder_data.model_dump())
    await folder.insert()
    logger.info(f"Created folder: {folder.id} - {folder.name}")
    return folder


@router.get("/", response_model=List[Folder])
async def list_folders(limit: int = 100, skip: int = 0):
    """List all folders"""
    folders = await Folder.find().sort("order").skip(skip).limit(limit).to_list()
    return folders


@router.get("/{folder_id}", response_model=Folder)
async def get_folder(folder_id: str):
    """Get a specific folder"""
    if not len(folder_id) == 24:
        raise HTTPException(status_code=404, detail="Folder not found")

    folder = await Folder.get(folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    return folder


@router.patch("/{folder_id}", response_model=Folder)
async def update_folder(folder_id: str, folder_data: FolderUpdate):
    """Update folder metadata"""
    if not len(folder_id) == 24:
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

    logger.info(f"Updated folder: {folder_id}")
    return folder


@router.delete("/{folder_id}", status_code=204)
async def delete_folder(folder_id: str):
    """Delete a folder"""
    if not len(folder_id) == 24:
        raise HTTPException(status_code=404, detail="Folder not found")

    folder = await Folder.get(folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    await folder.delete()
    logger.info(f"Deleted folder: {folder_id}")
    return None


@router.post("/{folder_id}/threads", response_model=Folder)
async def add_thread_to_folder(folder_id: str, request: AddThreadToFolderRequest):
    """Add a thread/context to a folder"""
    if not len(folder_id) == 24:
        raise HTTPException(status_code=404, detail="Folder not found")

    folder = await Folder.get(folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    if request.thread_id not in folder.thread_ids:
        folder.thread_ids.append(request.thread_id)
        folder.updated_at = datetime.utcnow()
        await folder.save()
        logger.info(f"Added thread {request.thread_id} to folder {folder_id}")

    return folder


@router.delete("/{folder_id}/threads/{thread_id}", response_model=Folder)
async def remove_thread_from_folder(folder_id: str, thread_id: str):
    """Remove a thread from a folder"""
    if not len(folder_id) == 24:
        raise HTTPException(status_code=404, detail="Folder not found")

    folder = await Folder.get(folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    if thread_id in folder.thread_ids:
        folder.thread_ids.remove(thread_id)
        folder.updated_at = datetime.utcnow()
        await folder.save()
        logger.info(f"Removed thread {thread_id} from folder {folder_id}")

    return folder
