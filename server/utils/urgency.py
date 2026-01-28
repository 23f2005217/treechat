"""Urgency computation engine for time-aware task prioritization"""
from datetime import datetime, timedelta
from typing import Optional

from server.models import Task, UrgencyLevel


class UrgencyEngine:
    """Compute task urgency based on multiple factors"""
    
    # Urgency scoring weights
    WEIGHTS = {
        'time_proximity': 0.4,    # How soon is it due?
        'effort': 0.2,            # How much time will it take?
        'ignored_penalty': 0.2,   # How many times postponed?
        'blocking': 0.2,          # Does it block other tasks?
    }
    
    def compute_urgency(self, task: Task) -> UrgencyLevel:
        """Compute urgency level for a task"""
        score = 0.0
        
        # 1. Time proximity score
        if task.due_date:
            time_score = self._compute_time_score(task.due_date)
            score += time_score * self.WEIGHTS['time_proximity']
        elif task.due_fuzzy:
            fuzzy_score = self._fuzzy_time_score(task.due_fuzzy)
            score += fuzzy_score * self.WEIGHTS['time_proximity']
        
        # 2. Effort score (longer tasks need earlier start)
        if task.estimated_effort:
            effort_score = self._compute_effort_score(
                task.estimated_effort,
                task.due_date
            )
            score += effort_score * self.WEIGHTS['effort']
        
        # 3. Ignored penalty (increases urgency if repeatedly postponed)
        if task.ignored_count > 0:
            ignored_score = min(task.ignored_count / 5, 1.0)
            score += ignored_score * self.WEIGHTS['ignored_penalty']
        
        # 4. Blocking score (urgent if other tasks depend on it)
        if task.blocking_tasks:
            blocking_score = min(len(task.blocking_tasks) / 3, 1.0)
            score += blocking_score * self.WEIGHTS['blocking']
        
        # Convert score to urgency level
        return self._score_to_level(score)
    
    def _compute_time_score(self, due_date: datetime) -> float:
        """Compute urgency score based on time until due date"""
        now = datetime.utcnow()
        
        # Ensure both datetimes are timezone-aware or both naive
        if due_date.tzinfo is not None and now.tzinfo is None:
            now = now.replace(tzinfo=due_date.tzinfo)
        elif due_date.tzinfo is None and now.tzinfo is not None:
            due_date = due_date.replace(tzinfo=now.tzinfo)
        
        time_diff = (due_date - now).total_seconds()
        
        if time_diff < 0:
            # Overdue
            return 1.0
        
        # Convert to hours
        hours = time_diff / 3600
        
        if hours <= 24:
            return 0.9  # Within 24 hours
        elif hours <= 48:
            return 0.7  # Within 2 days
        elif hours <= 168:  # 7 days
            return 0.5
        elif hours <= 336:  # 14 days
            return 0.3
        else:
            return 0.1
    
    def _fuzzy_time_score(self, fuzzy: str) -> float:
        """Estimate urgency from fuzzy time expressions"""
        fuzzy_scores = {
            'asap': 1.0,
            'urgent': 0.9,
            'today': 0.9,
            'tomorrow': 0.7,
            'this week': 0.5,
            'soon': 0.4,
            'next week': 0.3,
            'sometime': 0.2,
            'later': 0.1,
            'eventually': 0.05,
        }
        
        return fuzzy_scores.get(fuzzy.lower(), 0.3)
    
    def _compute_effort_score(self, effort_minutes: int, due_date: Optional[datetime]) -> float:
        """Score based on effort vs time available"""
        if not due_date:
            return 0.3  # Default moderate urgency
        
        now = datetime.utcnow()
        
        # Ensure both datetimes are timezone-aware or both naive
        if due_date.tzinfo is not None and now.tzinfo is None:
            now = now.replace(tzinfo=due_date.tzinfo)
        elif due_date.tzinfo is None and now.tzinfo is not None:
            due_date = due_date.replace(tzinfo=now.tzinfo)
        
        time_available_hours = (due_date - now).total_seconds() / 3600
        effort_hours = effort_minutes / 60
        
        # If effort > 80% of available time, very urgent
        ratio = effort_hours / max(time_available_hours, 1)
        
        if ratio >= 0.8:
            return 1.0
        elif ratio >= 0.5:
            return 0.7
        elif ratio >= 0.3:
            return 0.5
        else:
            return 0.2
    
    def _score_to_level(self, score: float) -> UrgencyLevel:
        """Convert numeric score to urgency level"""
        if score >= 0.8:
            return UrgencyLevel.CRITICAL
        elif score >= 0.6:
            return UrgencyLevel.HIGH
        elif score >= 0.3:
            return UrgencyLevel.MEDIUM
        else:
            return UrgencyLevel.LOW
    
    def get_next_action(self, tasks: list[Task], time_available_minutes: int = 60) -> Optional[Task]:
        """Recommend the best next task to work on"""
        if not tasks:
            return None
        
        # Filter out completed tasks
        pending = [t for t in tasks if not t.completed]
        
        if not pending:
            return None
        
        # Score each task
        scored_tasks = []
        for task in pending:
            urgency_score = self._urgency_to_score(task.urgency)
            
            # Boost score if task fits in available time
            time_fit_bonus = 0
            if task.estimated_effort and task.estimated_effort <= time_available_minutes:
                time_fit_bonus = 0.2
            
            total_score = urgency_score + time_fit_bonus
            scored_tasks.append((task, total_score))
        
        # Return highest scoring task
        return max(scored_tasks, key=lambda x: x[1])[0]
    
    def _urgency_to_score(self, urgency: UrgencyLevel) -> float:
        """Convert urgency level to numeric score"""
        scores = {
            UrgencyLevel.CRITICAL: 1.0,
            UrgencyLevel.HIGH: 0.75,
            UrgencyLevel.MEDIUM: 0.5,
            UrgencyLevel.LOW: 0.25,
        }
        return scores.get(urgency, 0.5)


# Singleton instance
urgency_engine = UrgencyEngine()


class UrgencyDetector:
    """Simple interface for detecting urgency from text"""
    
    def detect(self, text: str) -> dict:
        """Detect urgency level from text"""
        text_lower = text.lower()
        
        # Urgency keywords with scores
        urgent_keywords = [
            ("asap", 1.0),
            ("urgent", 0.9),
            ("critical", 0.9),
            ("immediately", 0.9),
            ("right now", 0.9),
            ("today", 0.85),
            ("tomorrow", 0.7),
            ("soon", 0.6),
            ("deadline", 0.8),
            ("due", 0.7),
        ]
        
        max_score = 0.0
        detected_urgency = "low"
        
        for keyword, score in urgent_keywords:
            if keyword in text_lower:
                if score > max_score:
                    max_score = score
        
        # Map score to urgency level
        if max_score >= 0.8:
            detected_urgency = "critical"
        elif max_score >= 0.6:
            detected_urgency = "high"
        elif max_score >= 0.4:
            detected_urgency = "medium"
        else:
            detected_urgency = "low"
        
        return {
            "urgency": detected_urgency,
            "score": max_score,
            "keywords_found": [kw for kw, _ in urgent_keywords if kw in text_lower]
        }
