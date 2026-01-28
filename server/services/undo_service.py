"""
Undo-First Safety Model Service

Every inferred action:
1. Can be undone
2. Is confirmed softly (not blocking)

This service provides the infrastructure for the undo-first safety model,
enabling users to trust automation without fear.
"""

from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Callable, Awaitable
from enum import Enum
from dataclasses import dataclass, field
import asyncio

from server.logger import Logger

logger = Logger.get("undo_service")


class ActionType(str, Enum):
    TASK_CREATE = "task_create"
    TASK_UPDATE = "task_update"
    TASK_DELETE = "task_delete"
    TASK_RESCHEDULE = "task_reschedule"
    TASK_COMPLETE = "task_complete"
    BULK_RESCHEDULE = "bulk_reschedule"
    BULK_COMPLETE = "bulk_complete"


class ActionStatus(str, Enum):
    PENDING = "pending"       # Action proposed, waiting for soft confirmation
    CONFIRMED = "confirmed"   # Action executed
    UNDONE = "undone"         # Action was undone
    EXPIRED = "expired"       # Undo window expired


@dataclass
class ActionRecord:
    """Record of an action that can be undone"""
    action_id: str
    action_type: ActionType
    status: ActionStatus
    description: str  # Human-readable description
    undo_data: Dict[str, Any]  # Data needed to undo
    created_at: datetime
    expires_at: datetime  # Undo window expiration
    user_id: Optional[str] = None
    entity_id: Optional[str] = None  # Task ID, etc.
    
    # Soft confirmation
    soft_confirmed: bool = False
    confirmation_message: Optional[str] = None


@dataclass
class SoftConfirmation:
    """Soft confirmation for an action"""
    action_id: str
    message: str
    undo_available: bool
    expires_in_seconds: int


class UndoService:
    """
    Undo-First Safety Model
    
    Principles:
    1. Every action gets an undo token
    2. Actions are softly confirmed ("Added. Undo?")
    3. Undo window expires after a period (default: 30 seconds)
    4. No blocking confirmations - flow continues
    
    This creates trust through reversibility, not prevention.
    """
    
    DEFAULT_UNDO_WINDOW_SECONDS = 30
    CLEANUP_INTERVAL_SECONDS = 60
    
    def __init__(self):
        self._actions: Dict[str, ActionRecord] = {}
        self._undo_handlers: Dict[ActionType, Callable[[Dict[str, Any]], Awaitable[bool]]] = {}
        self._cleanup_task: Optional[asyncio.Task] = None
    
    def start_cleanup_task(self):
        """Start the background cleanup task"""
        if self._cleanup_task is None or self._cleanup_task.done():
            self._cleanup_task = asyncio.create_task(self._cleanup_loop())
    
    def stop_cleanup_task(self):
        """Stop the background cleanup task"""
        if self._cleanup_task and not self._cleanup_task.done():
            self._cleanup_task.cancel()
    
    async def _cleanup_loop(self):
        """Periodically clean up expired actions"""
        while True:
            try:
                await asyncio.sleep(self.CLEANUP_INTERVAL_SECONDS)
                self._cleanup_expired()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Cleanup error: {e}")
    
    def _cleanup_expired(self):
        """Remove expired action records"""
        now = datetime.utcnow()
        expired = [
            action_id for action_id, record in self._actions.items()
            if record.expires_at < now and record.status == ActionStatus.CONFIRMED
        ]
        for action_id in expired:
            self._actions[action_id].status = ActionStatus.EXPIRED
            logger.debug(f"Action {action_id} expired")
    
    def register_undo_handler(
        self, 
        action_type: ActionType, 
        handler: Callable[[Dict[str, Any]], Awaitable[bool]]
    ):
        """Register a handler for undoing a specific action type"""
        self._undo_handlers[action_type] = handler
    
    async def record_action(
        self,
        action_type: ActionType,
        description: str,
        undo_data: Dict[str, Any],
        entity_id: Optional[str] = None,
        user_id: Optional[str] = None,
        undo_window_seconds: int = None
    ) -> ActionRecord:
        """
        Record an action for potential undo.
        Returns the action record with undo token.
        """
        action_id = f"{action_type.value}_{datetime.utcnow().timestamp()}_{entity_id or 'anon'}"
        now = datetime.utcnow()
        window = undo_window_seconds or self.DEFAULT_UNDO_WINDOW_SECONDS
        
        record = ActionRecord(
            action_id=action_id,
            action_type=action_type,
            status=ActionStatus.CONFIRMED,
            description=description,
            undo_data=undo_data,
            created_at=now,
            expires_at=now + timedelta(seconds=window),
            user_id=user_id,
            entity_id=entity_id,
            soft_confirmed=True,
            confirmation_message=f"{description}. Undo?"
        )
        
        self._actions[action_id] = record
        
        logger.info(f"Recorded action {action_id}: {description}")
        
        return record
    
    async def undo(self, action_id: str) -> bool:
        """
        Undo an action by its ID.
        Returns True if successful.
        """
        if action_id not in self._actions:
            logger.warning(f"Undo requested for unknown action: {action_id}")
            return False
        
        record = self._actions[action_id]
        
        # Check if undo is still available
        if record.status != ActionStatus.CONFIRMED:
            logger.warning(f"Cannot undo action {action_id}: status is {record.status}")
            return False
        
        if datetime.utcnow() > record.expires_at:
            record.status = ActionStatus.EXPIRED
            logger.warning(f"Undo window expired for action {action_id}")
            return False
        
        # Execute undo handler
        handler = self._undo_handlers.get(record.action_type)
        if not handler:
            logger.error(f"No undo handler registered for {record.action_type}")
            return False
        
        try:
            success = await handler(record.undo_data)
            if success:
                record.status = ActionStatus.UNDONE
                logger.info(f"Successfully undid action {action_id}")
                return True
            else:
                logger.error(f"Undo handler failed for action {action_id}")
                return False
        except Exception as e:
            logger.error(f"Undo handler exception for {action_id}: {e}")
            return False
    
    def get_soft_confirmation(self, action_id: str) -> Optional[SoftConfirmation]:
        """Get soft confirmation for an action"""
        if action_id not in self._actions:
            return None
        
        record = self._actions[action_id]
        
        if record.status != ActionStatus.CONFIRMED:
            return None
        
        remaining = (record.expires_at - datetime.utcnow()).total_seconds()
        
        if remaining <= 0:
            return None
        
        return SoftConfirmation(
            action_id=action_id,
            message=record.confirmation_message,
            undo_available=True,
            expires_in_seconds=int(remaining)
        )
    
    def can_undo(self, action_id: str) -> bool:
        """Check if an action can still be undone"""
        if action_id not in self._actions:
            return False
        
        record = self._actions[action_id]
        
        if record.status != ActionStatus.CONFIRMED:
            return False
        
        if datetime.utcnow() > record.expires_at:
            return False
        
        return True
    
    def get_recent_actions(
        self, 
        user_id: Optional[str] = None, 
        limit: int = 10
    ) -> List[ActionRecord]:
        """Get recent actions, optionally filtered by user"""
        actions = list(self._actions.values())
        
        if user_id:
            actions = [a for a in actions if a.user_id == user_id]
        
        # Sort by created_at descending
        actions.sort(key=lambda a: a.created_at, reverse=True)
        
        return actions[:limit]
    
    def format_undo_message(self, action_id: str) -> str:
        """Format a user-friendly undo message"""
        confirmation = self.get_soft_confirmation(action_id)
        
        if not confirmation:
            return "Action completed."
        
        return confirmation.message


# Global instance
undo_service = UndoService()


# Convenience functions for common undo patterns
async def record_task_creation(task_id: str, task_title: str) -> str:
    """Record a task creation for undo"""
    record = await undo_service.record_action(
        action_type=ActionType.TASK_CREATE,
        description=f"Created task '{task_title}'",
        undo_data={"task_id": task_id},
        entity_id=task_id
    )
    return record.action_id

async def record_task_completion(task_id: str, task_title: str) -> str:
    """Record a task completion for undo"""
    record = await undo_service.record_action(
        action_type=ActionType.TASK_COMPLETE,
        description=f"Completed '{task_title}'",
        undo_data={"task_id": task_id},
        entity_id=task_id
    )
    return record.action_id

async def record_task_reschedule(
    task_id: str, 
    task_title: str, 
    old_due_date: Optional[datetime],
    old_due_fuzzy: Optional[str]
) -> str:
    """Record a task reschedule for undo"""
    record = await undo_service.record_action(
        action_type=ActionType.TASK_RESCHEDULE,
        description=f"Rescheduled '{task_title}'",
        undo_data={
            "task_id": task_id,
            "old_due_date": old_due_date.isoformat() if old_due_date else None,
            "old_due_fuzzy": old_due_fuzzy
        },
        entity_id=task_id
    )
    return record.action_id
