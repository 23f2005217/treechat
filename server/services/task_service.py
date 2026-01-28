"""Task service layer for business logic related to tasks."""

import re
from datetime import datetime, timedelta
from typing import Optional, List

from server.models import Task, TaskDomain, TaskType
from server.utils.intent_classifier import ActionType
from server.utils.urgency import urgency_engine
from server.logger import Logger

logger = Logger.get("task_service")


class TaskService:
    """Service layer for task-related business logic."""

    DOMAIN_KEYWORDS = {
        TaskDomain.HOUSEHOLD: [
            "home", "house", "kitchen", "clean", "wash", "groceries",
            "family", "mom", "mother", "dad", "father",
        ],
        TaskDomain.PERSONAL: [
            "doctor", "gym", "health", "hair", "dentist", "workout", "exercise",
        ],
        TaskDomain.COLLEGE: [
            "assignment", "exam", "test", "class", "study", "professor",
            "homework", "submit",
        ],
        TaskDomain.FINANCE: [
            "pay", "bill", "rent", "bank", "money", "emi", "salary",
        ],
        TaskDomain.ERRANDS: [
            "buy", "shop", "pick up", "drop", "store", "market",
        ],
        TaskDomain.PROJECT: [
            "project", "client", "meeting", "presentation", "report",
        ],
    }

    def infer_domain(self, title: str) -> TaskDomain:
        """Infer task domain from title keywords."""
        title_lower = title.lower()

        for domain, keywords in self.DOMAIN_KEYWORDS.items():
            if any(kw in title_lower for kw in keywords):
                return domain

        return TaskDomain.OTHER

    def extract_due_date(self, text: str) -> Optional[datetime]:
        """Extract specific due date from text."""
        text_lower = text.lower()
        now = datetime.now()

        patterns = [
            (r"\btoday\b", 0),
            (r"\btomorrow\b", 1),
            (r"\bday after tomorrow\b", 2),
        ]

        for pattern, days in patterns:
            if re.search(pattern, text_lower):
                return (now + timedelta(days=days)).replace(
                    hour=23, minute=59, second=59
                )

        match = re.search(r"\bin\s+(\d+)\s+days?\b", text_lower)
        if match:
            days = int(match.group(1))
            return (now + timedelta(days=days)).replace(
                hour=23, minute=59, second=59
            )

        if re.search(r"\bnext week\b", text_lower):
            return (now + timedelta(days=7)).replace(hour=23, minute=59, second=59)

        return None

    def extract_fuzzy_time(self, text: str) -> Optional[str]:
        """Extract fuzzy time expressions from text."""
        text_lower = text.lower()

        fuzzy_patterns = [
            (r"\bsoon\b", "soon"),
            (r"\bsometime\b", "sometime"),
            (r"\beventually\b", "eventually"),
            (r"\blater\b", "later"),
            (r"\bthis week\b", "this week"),
            (r"\bnext week\b", "next week"),
            (r"\bthis month\b", "this month"),
        ]

        for pattern, value in fuzzy_patterns:
            if re.search(pattern, text_lower):
                return value

        return None

    def task_to_entity(self, task: Task, confidence: float) -> dict:
        """Convert task to entity dict for response."""
        return {
            "type": "task",
            "id": str(task.id),
            "title": task.title,
            "domain": task.domain.value,
            "urgency": task.urgency.value,
            "task_type": task.task_type.value,
            "confidence": confidence,
        }

    async def create_from_text(
        self, text: str, message_id: str, action_type: ActionType
    ) -> Optional[Task]:
        """Create a task from text and action type."""
        if not text or len(text.strip()) < 3:
            logger.warning(f"Task text too short: '{text}'")
            return None

        domain = self.infer_domain(text)

        if action_type == ActionType.REMINDER:
            task_type = TaskType.REMINDER
        elif action_type == ActionType.EVENT:
            task_type = TaskType.REMINDER
        else:
            task_type = TaskType.TASK

        due_date = self.extract_due_date(text)
        due_fuzzy = self.extract_fuzzy_time(text)

        clean_title = text.strip()
        if len(clean_title) > 100:
            clean_title = clean_title[:97] + "..."

        task = Task(
            title=clean_title,
            description=text,
            task_type=task_type,
            domain=domain,
            due_date=due_date,
            due_fuzzy=due_fuzzy,
            source_message_id=str(message_id),
        )

        task.urgency = urgency_engine.compute_urgency(task)
        await task.insert()

        logger.info(f"Created task: {task.id} - {task.title}")
        return task

    async def create_from_intent(self, intent_result, message_id: str) -> Optional[Task]:
        """Create a task from intent classification result."""
        data = intent_result.extracted_data

        if intent_result.action_type == ActionType.REMINDER:
            task_type = TaskType.REMINDER
        elif intent_result.action_type == ActionType.EVENT:
            task_type = TaskType.REMINDER
        else:
            task_type = TaskType.TASK

        domain = self.infer_domain(data.get("title", ""))

        task = Task(
            title=data.get("title", "Untitled Task"),
            description=data.get("title", ""),
            task_type=task_type,
            domain=domain,
            due_date=data.get("due_date"),
            due_fuzzy=data.get("due_fuzzy"),
            source_message_id=str(message_id),
        )

        task.urgency = urgency_engine.compute_urgency(task)
        await task.insert()

        logger.info(f"Created task from intent: {task.id} - {task.title}")
        return task


task_service = TaskService()
