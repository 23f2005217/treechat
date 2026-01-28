"""
Task Summary Service - Chat-first task summaries instead of dashboards

This service provides intelligent, conversational task summaries that replace
traditional dashboard views. Instead of boards, tables, and filters, users ask:
- "What do I have today?"
- "What's left this week?"
- "What can I do in 10 minutes?"
- "Give me easy tasks"

The system returns structured lists, not prose, enabling quick scanning and action.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from enum import Enum
from dataclasses import dataclass

from server.models import Task, TaskDomain, TaskType, UrgencyLevel
from server.logger import Logger

logger = Logger.get("task_summary_service")


class TimeWindow(str, Enum):
    TODAY = "today"
    TOMORROW = "tomorrow"
    THIS_WEEK = "this_week"
    NEXT_WEEK = "next_week"
    OVERDUE = "overdue"


class EnergyLevel(str, Enum):
    HIGH = "high"       # Complex, focus-intensive tasks
    MEDIUM = "medium"   # Standard tasks
    LOW = "low"         # Quick wins, easy tasks


@dataclass
class TaskSummary:
    """Structured task summary for chat responses"""
    id: str
    title: str
    domain: str
    time_context: str  # "today", "tomorrow", "this week", etc.
    estimated_minutes: Optional[int]
    is_important: bool  # Soft priority inference
    decay_warning: Optional[str]  # Task decay detection message


@dataclass
class SummaryResponse:
    """Complete summary response for chat"""
    summary_type: str
    total_count: int
    tasks: List[TaskSummary]
    suggestions: List[str]  # Soft priority suggestions
    decay_alerts: List[str]  # Tasks that may need attention


class TaskSummaryService:
    """
    Service for generating conversational task summaries.
    
    Key principles:
    1. No dashboards - chat summaries only
    2. Structured lists, not prose
    3. Soft priorities (no P0/P1/P2)
    4. Energy-aware filtering
    5. Task decay detection
    """
    
    # Domain emojis for visual scanning
    DOMAIN_ICONS = {
        TaskDomain.HOUSEHOLD: "🏠",
        TaskDomain.PERSONAL: "🧘",
        TaskDomain.COLLEGE: "📚",
        TaskDomain.PROJECT: "💼",
        TaskDomain.FINANCE: "💰",
        TaskDomain.ERRANDS: "🛒",
        TaskDomain.OTHER: "📌",
    }
    
    # Time context descriptions
    TIME_CONTEXTS = {
        TimeWindow.TODAY: "today",
        TimeWindow.TOMORROW: "tomorrow", 
        TimeWindow.THIS_WEEK: "this week",
        TimeWindow.NEXT_WEEK: "next week",
        TimeWindow.OVERDUE: "overdue",
    }
    
    # Energy inference patterns (task wording analysis)
    HIGH_ENERGY_PATTERNS = [
        "write", "create", "design", "plan", "analyze", "review", "prepare",
        "presentation", "report", "proposal", "strategy", "complex", "difficult",
        "important", "critical", "urgent", "deadline", "submit", "complete"
    ]
    
    LOW_ENERGY_PATTERNS = [
        "call", "email", "text", "remind", "check", "confirm", "quick",
        "brief", "simple", "easy", "fast", "5 min", "10 min", "small"
    ]
    
    async def get_today_summary(self) -> SummaryResponse:
        """
        Answer: "What do I have today?"
        Returns tasks for today, sorted by soft priority.
        """
        now = datetime.utcnow()
        end_of_day = now.replace(hour=23, minute=59, second=59)
        
        # Get today's tasks
        tasks = await Task.find(
            Task.due_date <= end_of_day,
            Task.completed == False
        ).sort("-urgency").to_list()
        
        # Also include tasks with "today" fuzzy due date
        fuzzy_today = await Task.find(
            Task.due_fuzzy == "today",
            Task.completed == False
        ).to_list()
        
        # Combine and deduplicate
        all_tasks = {str(t.id): t for t in tasks + fuzzy_today}
        task_list = list(all_tasks.values())
        
        # Sort by soft priority
        task_list.sort(key=lambda t: self._compute_soft_priority(t), reverse=True)
        
        summaries = [self._to_task_summary(t, TimeWindow.TODAY) for t in task_list]
        suggestions = self._generate_suggestions(task_list)
        decay_alerts = self._detect_decay(task_list)
        
        return SummaryResponse(
            summary_type="today",
            total_count=len(summaries),
            tasks=summaries,
            suggestions=suggestions,
            decay_alerts=decay_alerts
        )
    
    async def get_week_summary(self) -> SummaryResponse:
        """
        Answer: "What's left this week?"
        Returns tasks for the current week.
        """
        now = datetime.utcnow()
        # Find next Sunday
        days_until_sunday = (6 - now.weekday()) % 7
        if days_until_sunday == 0:
            days_until_sunday = 7  # If today is Sunday, show next Sunday
        end_of_week = now + timedelta(days=days_until_sunday)
        end_of_week = end_of_week.replace(hour=23, minute=59, second=59)
        
        tasks = await Task.find(
            Task.due_date <= end_of_week,
            Task.due_date >= now,
            Task.completed == False
        ).sort("+due_date").to_list()
        
        # Include fuzzy "this week" tasks
        fuzzy_this_week = await Task.find(
            Task.due_fuzzy == "this week",
            Task.completed == False
        ).to_list()
        
        all_tasks = {str(t.id): t for t in tasks + fuzzy_this_week}
        task_list = list(all_tasks.values())
        
        # Group by day for better scanning
        task_list.sort(key=lambda t: (t.due_date or datetime.max, self._compute_soft_priority(t)), reverse=True)
        
        summaries = [self._to_task_summary(t, TimeWindow.THIS_WEEK) for t in task_list]
        suggestions = self._generate_suggestions(task_list)
        decay_alerts = self._detect_decay(task_list)
        
        return SummaryResponse(
            summary_type="this_week",
            total_count=len(summaries),
            tasks=summaries,
            suggestions=suggestions,
            decay_alerts=decay_alerts
        )
    
    async def get_energy_based_tasks(self, energy: EnergyLevel, time_minutes: Optional[int] = None) -> SummaryResponse:
        """
        Answer: "What can I do in 10 minutes?" or "Give me easy tasks"
        Returns tasks matching energy level and optional time constraint.
        """
        # Get all incomplete tasks
        tasks = await Task.find(Task.completed == False).to_list()
        
        # Filter by energy level
        filtered_tasks = [t for t in tasks if self._infer_energy_level(t) == energy]
        
        # Filter by time if specified
        if time_minutes:
            filtered_tasks = [
                t for t in filtered_tasks 
                if t.estimated_effort is None or t.estimated_effort <= time_minutes
            ]
        
        # Sort by soft priority
        filtered_tasks.sort(key=lambda t: self._compute_soft_priority(t), reverse=True)
        
        # Limit to top results for quick decision
        filtered_tasks = filtered_tasks[:10]
        
        summaries = [self._to_task_summary(t, self._infer_time_window(t)) for t in filtered_tasks]
        
        return SummaryResponse(
            summary_type=f"energy_{energy.value}",
            total_count=len(summaries),
            tasks=summaries,
            suggestions=[],
            decay_alerts=[]
        )
    
    async def get_overdue_tasks(self) -> SummaryResponse:
        """
        Get overdue tasks with decay warnings.
        """
        now = datetime.utcnow()
        
        tasks = await Task.find(
            Task.due_date < now,
            Task.completed == False
        ).sort("+due_date").to_list()
        
        summaries = [self._to_task_summary(t, TimeWindow.OVERDUE) for t in tasks]
        decay_alerts = self._detect_decay(tasks)
        
        return SummaryResponse(
            summary_type="overdue",
            total_count=len(summaries),
            tasks=summaries,
            suggestions=["Consider rescheduling or removing overdue tasks"],
            decay_alerts=decay_alerts
        )
    
    def _to_task_summary(self, task: Task, time_window: TimeWindow) -> TaskSummary:
        """Convert Task to TaskSummary"""
        decay_warning = None
        
        # Check for task decay
        if task.ignored_count >= 3:
            decay_warning = f"Postponed {task.ignored_count} times"
        elif task.last_ignored_at:
            days_since_ignored = (datetime.utcnow() - task.last_ignored_at).days
            if days_since_ignored >= 7:
                decay_warning = f"Ignored for {days_since_ignored} days"
        
        return TaskSummary(
            id=str(task.id),
            title=task.title,
            domain=self.DOMAIN_ICONS.get(task.domain, "📌"),
            time_context=self.TIME_CONTEXTS.get(time_window, "sometime"),
            estimated_minutes=task.estimated_effort,
            is_important=self._is_important(task),
            decay_warning=decay_warning
        )
    
    def _compute_soft_priority(self, task: Task) -> float:
        """
        Compute soft priority score (0-1) without explicit priority numbers.
        Uses: urgency, decay, domain importance, time proximity
        """
        score = 0.0
        
        # Base urgency
        urgency_scores = {
            UrgencyLevel.CRITICAL: 1.0,
            UrgencyLevel.HIGH: 0.8,
            UrgencyLevel.MEDIUM: 0.5,
            UrgencyLevel.LOW: 0.2
        }
        score += urgency_scores.get(task.urgency, 0.5) * 0.4
        
        # Decay penalty (postponed tasks get higher priority to clear them)
        if task.ignored_count > 0:
            score += min(task.ignored_count * 0.1, 0.3)
        
        # Time proximity
        if task.due_date:
            now = datetime.utcnow()
            if task.due_date < now:
                score += 0.3  # Overdue
            elif (task.due_date - now).days <= 1:
                score += 0.2  # Due within 24h
        
        return score
    
    def _is_important(self, task: Task) -> bool:
        """Infer if task is important based on multiple signals"""
        # High urgency = important
        if task.urgency in [UrgencyLevel.HIGH, UrgencyLevel.CRITICAL]:
            return True
        
        # Repeatedly postponed = might be important but avoided
        if task.ignored_count >= 2:
            return True
        
        # Check title for importance markers
        title_lower = task.title.lower()
        importance_markers = ["deadline", "due", "submit", "meeting", "call", "appointment"]
        if any(marker in title_lower for marker in importance_markers):
            return True
        
        return False
    
    def _infer_energy_level(self, task: Task) -> EnergyLevel:
        """
        Infer energy level required for a task based on:
        - Task wording
        - Estimated effort
        - Domain
        """
        title_lower = task.title.lower()
        
        # Check for high energy patterns
        if any(pattern in title_lower for pattern in self.HIGH_ENERGY_PATTERNS):
            return EnergyLevel.HIGH
        
        # Check for low energy patterns
        if any(pattern in title_lower for pattern in self.LOW_ENERGY_PATTERNS):
            return EnergyLevel.LOW
        
        # Estimate from effort
        if task.estimated_effort:
            if task.estimated_effort <= 10:
                return EnergyLevel.LOW
            elif task.estimated_effort >= 60:
                return EnergyLevel.HIGH
        
        # Domain-based inference
        if task.domain in [TaskDomain.COLLEGE, TaskDomain.PROJECT]:
            return EnergyLevel.MEDIUM  # Default to medium for work tasks
        
        return EnergyLevel.MEDIUM
    
    def _infer_time_window(self, task: Task) -> TimeWindow:
        """Infer time window from task due date"""
        if not task.due_date:
            if task.due_fuzzy == "today":
                return TimeWindow.TODAY
            elif task.due_fuzzy == "tomorrow":
                return TimeWindow.TOMORROW
            elif task.due_fuzzy == "this week":
                return TimeWindow.THIS_WEEK
            return TimeWindow.THIS_WEEK
        
        now = datetime.utcnow()
        if task.due_date < now:
            return TimeWindow.OVERDUE
        elif task.due_date.date() == now.date():
            return TimeWindow.TODAY
        elif (task.due_date - now).days == 1:
            return TimeWindow.TOMORROW
        elif (task.due_date - now).days <= 7:
            return TimeWindow.THIS_WEEK
        else:
            return TimeWindow.NEXT_WEEK
    
    def _generate_suggestions(self, tasks: List[Task]) -> List[str]:
        """Generate soft priority suggestions"""
        suggestions = []
        
        # Find important tasks
        important_tasks = [t for t in tasks if self._is_important(t)]
        if important_tasks:
            suggestions.append(f"This seems important: '{important_tasks[0].title}'. Want to focus on it today?")
        
        # Find quick wins
        quick_tasks = [t for t in tasks if self._infer_energy_level(t) == EnergyLevel.LOW]
        if len(quick_tasks) >= 3:
            suggestions.append(f"You have {len(quick_tasks)} quick tasks. Knock them out first?")
        
        # Find decaying tasks
        decaying = [t for t in tasks if t.ignored_count >= 2]
        if decaying:
            suggestions.append(f"'{decaying[0].title}' keeps getting postponed. Still relevant?")
        
        return suggestions
    
    def _detect_decay(self, tasks: List[Task]) -> List[str]:
        """Detect and report task decay"""
        alerts = []
        
        for task in tasks:
            if task.ignored_count >= 3:
                alerts.append(f"'{task.title}' has been postponed {task.ignored_count} times. Do you still want to keep this?")
            elif task.last_ignored_at:
                days = (datetime.utcnow() - task.last_ignored_at).days
                if days >= 7:
                    alerts.append(f"'{task.title}' has been ignored for {days} days. Still relevant?")
        
        return alerts
    
    def format_for_chat(self, response: SummaryResponse) -> Dict[str, Any]:
        """
        Format SummaryResponse for chat display.
        Returns structured data that the frontend can render as a clean list.
        """
        formatted_tasks = []
        for task in response.tasks:
            task_display = {
                "id": task.id,
                "icon": task.domain,
                "title": task.title,
                "time": task.time_context,
                "minutes": task.estimated_minutes,
                "highlight": task.is_important,
                "warning": task.decay_warning
            }
            formatted_tasks.append(task_display)
        
        return {
            "type": "task_summary",
            "summary_type": response.summary_type,
            "count": response.total_count,
            "tasks": formatted_tasks,
            "suggestions": response.suggestions,
            "decay_alerts": response.decay_alerts
        }


task_summary_service = TaskSummaryService()
