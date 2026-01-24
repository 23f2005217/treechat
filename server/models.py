from beanie import Document
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum


class TaskDomain(str, Enum):
    HOUSEHOLD = "household"
    PERSONAL = "personal"
    COLLEGE = "college"
    PROJECT = "project"
    FINANCE = "finance"
    ERRANDS = "errands"
    OTHER = "other"


class TaskType(str, Enum):
    TASK = "task"
    REMINDER = "reminder"
    SOFT_TASK = "soft_task"
    OPEN_LOOP = "open_loop"


class UrgencyLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Task(Document):
    """Main task model with auto-grouping and time-awareness"""
    title: str
    description: Optional[str] = None
    task_type: TaskType = TaskType.TASK
    domain: TaskDomain = TaskDomain.OTHER
    
    # Time-based fields
    due_date: Optional[datetime] = None
    due_fuzzy: Optional[str] = None  # "soon", "this week", etc.
    estimated_effort: Optional[int] = None  # in minutes
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    
    # Computed urgency
    urgency: UrgencyLevel = UrgencyLevel.MEDIUM
    
    # Relations
    requested_by: Optional[str] = None  # person/entity
    project_id: Optional[str] = None
    parent_task_id: Optional[str] = None
    blocking_tasks: List[str] = []  # IDs of tasks this blocks
    
    # Status
    completed: bool = False
    ignored_count: int = 0
    last_ignored_at: Optional[datetime] = None
    
    # Metadata
    tags: List[str] = []
    source_message_id: Optional[str] = None  # ID of chat message that created this
    
    class Settings:
        name = "tasks"
        indexes = [
            "domain",
            "due_date",
            "completed",
            "urgency",
            "project_id",
        ]


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class Message(Document):
    """Tree-based chat message model"""
    content: str
    role: MessageRole
    
    # Tree structure
    parent_id: Optional[str] = None  # Parent message ID for branching
    children_ids: List[str] = []  # Child message IDs
    branch_name: Optional[str] = None  # Optional branch label
    
    # Context and entities
    context_id: Optional[str] = None  # Link to conversation context
    extracted_entities: List[dict] = []  # Tasks, projects, people extracted
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    edited_at: Optional[datetime] = None
    
    class Settings:
        name = "messages"
        indexes = [
            "parent_id",
            "context_id",
            "created_at",
        ]


class Context(Document):
    """Conversation context / session"""
    title: str = "New Conversation"
    description: Optional[str] = None
    
    # Tree root
    root_message_id: Optional[str] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_accessed: datetime = Field(default_factory=datetime.utcnow)
    
    # Summary and knowledge graph
    summary: Optional[str] = None
    key_decisions: List[str] = []
    open_loops: List[str] = []  # Task IDs or unresolved items
    
    class Settings:
        name = "contexts"
        indexes = [
            "created_at",
            "last_accessed",
        ]


class Project(Document):
    """Project/domain grouping"""
    name: str
    domain: TaskDomain
    description: Optional[str] = None
    
    # Relations
    task_ids: List[str] = []
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Status
    active: bool = True
    archived: bool = False
    
    class Settings:
        name = "projects"
        indexes = [
            "domain",
            "active",
        ]


# Pydantic schemas for API requests/responses
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    task_type: TaskType = TaskType.TASK
    domain: TaskDomain = TaskDomain.OTHER
    due_date: Optional[datetime] = None
    due_fuzzy: Optional[str] = None
    estimated_effort: Optional[int] = None
    requested_by: Optional[str] = None
    project_id: Optional[str] = None
    tags: List[str] = []


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    domain: Optional[TaskDomain] = None
    due_date: Optional[datetime] = None
    completed: Optional[bool] = None
    urgency: Optional[UrgencyLevel] = None


class MessageCreate(BaseModel):
    content: str
    role: MessageRole = MessageRole.USER
    parent_id: Optional[str] = None
    context_id: Optional[str] = None


class ContextCreate(BaseModel):
    title: str = "New Conversation"
    description: Optional[str] = None
