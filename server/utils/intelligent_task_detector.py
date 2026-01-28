"""
Intelligent Task Detection System

This module provides a smart, context-aware system for detecting tasks and reminders
from natural language chat messages. It uses multiple signals to determine whether
a message contains an actionable item.

Key Features:
- Confidence scoring (0-1) to avoid false positives
- Context-aware detection using conversation history
- Semantic understanding of implicit tasks
- Smart reminder detection from casual conversation
- Task vs non-task classification
"""

import re
import sys
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass
from enum import Enum

# Handle imports for both module and direct execution contexts
try:
    from server.models import TaskDomain, TaskType, UrgencyLevel
except ImportError:
    # Fallback for when running as standalone script
    from enum import Enum as _Enum
    
    class TaskDomain(str, _Enum):
        HOUSEHOLD = "household"
        PERSONAL = "personal"
        COLLEGE = "college"
        PROJECT = "project"
        FINANCE = "finance"
        ERRANDS = "errands"
        OTHER = "other"
    
    class TaskType(str, _Enum):
        TASK = "task"
        REMINDER = "reminder"
        SOFT_TASK = "soft_task"
        OPEN_LOOP = "open_loop"
    
    class UrgencyLevel(str, _Enum):
        LOW = "low"
        MEDIUM = "medium"
        HIGH = "high"
        CRITICAL = "critical"


class IntentType(Enum):
    """Types of user intent detected in messages"""
    EXPLICIT_TASK = "explicit_task"          # "I need to...", "I have to..."
    IMPLICIT_TASK = "implicit_task"          # "My mom asked me..."
    REMINDER_REQUEST = "reminder_request"    # "Remind me to..."
    CASUAL_MENTION = "casual_mention"        # "I should probably..."
    INFORMATIONAL = "informational"          # "The meeting is at 3pm"
    COMPLETION_REPORT = "completion_report"  # "I finished the report"
    QUESTION = "question"                    # "When is the deadline?"
    NO_TASK = "no_task"                      # No actionable content


@dataclass
class DetectionResult:
    """Result of task detection analysis"""
    is_task: bool
    confidence: float  # 0.0 to 1.0
    intent_type: IntentType
    task_data: Dict[str, Any]
    reasoning: str  # Explanation of why this was/wasn't detected as a task


class IntelligentTaskDetector:
    """
    Smart task detection that 'smells' tasks from chat messages.
    
    Uses multiple signals:
    1. Explicit task indicators (high confidence)
    2. Implicit obligations (medium-high confidence)
    3. Temporal markers (medium confidence)
    4. Action verbs with objects (medium confidence)
    5. Context from conversation history
    """
    
    # High-confidence explicit task patterns
    EXPLICIT_PATTERNS = {
        r"\b(?:i need to|i have to|i must|i gotta|i should)\s+(?!decide|think|consider|wonder|ask|know|understand|believe|feel|remember|forget)(\w+)": 0.95,
        r"\b(?:remind me to|remind me about|set a reminder for|don't forget to|remember to|dont forget to)\b": 0.98,
        r"\b(?:add to my list|put on my list|create a task)\b": 0.95,
        r"\b(?:need to get|have to get|must get)\s+(\w+)": 0.92,
        r"\b(?:need to finish|have to finish|must finish)\b": 0.93,
        r"\b(?:working on|going to work on)\s+(\w+)": 0.85,
        r"\b(?:buy|get|pick up|drop off|deliver|purchase|shop for)\s+(?:the|some|a|an)?\s*\w+": 0.82,
        r"\b(?:call|email|contact|reach out to)\s+(?:\w+\s+)?(?:tomorrow|today|later|soon|next)": 0.88,
        r"\b(?:call|email|contact|reach out to|visit|meet with)\s+(?:the|a|an|my|this)?\s*\w+": 0.80,
    }
    
    # Implicit obligation patterns (someone asked/told me)
    IMPLICIT_OBLIGATION_PATTERNS = {
        r"\b(?:mother|mom|mum|ma|father|dad|papa|parents)\s+(?:asked|told|wants|needs)\s+(?:me\s+)?(?:to)?": 0.88,
        r"\b(?:boss|manager|supervisor)\s+(?:asked|told|wants|needs)\s+(?:me\s+)?(?:to)?": 0.90,
        r"\b(?:professor|teacher|instructor)\s+(?:asked|told|assigned|wants)\s+(?:me\s+)?(?:to)?": 0.88,
        r"\b(?:friend|colleague|team)\s+(?:asked|told|needs)\s+(?:me\s+)?(?:to)?": 0.82,
        r"\b(?:client|customer)\s+(?:asked|wants|needs)\s+(?:me\s+)?(?:to)?": 0.88,
        r"\bgot\s+(?:a|an)\s+(?:task|assignment|request)\s+(?:from|for)\b": 0.85,
        r"\bhave\s+(?:a|an)\s+(?:appointment|meeting|call|interview|session)\b": 0.85,
    }
    
    # Action verb patterns that suggest tasks
    ACTION_VERBS = {
        # High-commitment actions
        "submit": 0.85, "complete": 0.85, "finish": 0.85, "deliver": 0.85,
        "pay": 0.88, "buy": 0.82, "purchase": 0.82, "order": 0.80,
        "schedule": 0.80, "book": 0.80, "reserve": 0.80,
        "call": 0.75, "email": 0.75, "contact": 0.75, "reach out": 0.75,
        "visit": 0.72, "meet": 0.75, "attend": 0.78,
        "fix": 0.78, "repair": 0.78, "solve": 0.75,
        "prepare": 0.78, "write": 0.72, "create": 0.72, "make": 0.68,
        "clean": 0.70, "wash": 0.70, "organize": 0.72,
        "pick up": 0.75, "drop off": 0.75, "deliver": 0.78,
        "apply": 0.80, "register": 0.80, "enroll": 0.80,
        "renew": 0.82, "update": 0.70, "upgrade": 0.72,
        "forget": 0.90, "dont forget": 0.95, "remember": 0.85,
    }
    
    # Temporal urgency markers
    TEMPORAL_MARKERS = {
        r"\btoday\b": 0.15,
        r"\btomorrow\b": 0.15,
        r"\bthis week\b": 0.12,
        r"\bnext week\b": 0.12,
        r"\bby\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b": 0.20,
        r"\bby\s+(?:tomorrow|tonight|end of)\b": 0.25,
        r"\bin\s+\d+\s+(?:days?|hours?|minutes?)\b": 0.20,
        r"\bdeadline\b": 0.30,
        r"\bdue\b": 0.25,
        r"\b asap\b|\basap\b": 0.30,
        r"\burgent\b|\burgently\b": 0.35,
        r"\bsoon\b": 0.10,
    }
    
    # Non-task patterns (things that look like tasks but aren't)
    NON_TASK_PATTERNS = {
        r"\b(?:already|just)\s+(?:finished|completed|did|done)\b": "completion_report",
        r"\b(?:finished|completed)\s+(?:the|my|this|that)\b": "completion_report",
        r"\bdid\s+(?:you|he|she|they|it)\b": "question",
        r"\b(?:what|when|where|why|how)\s+(?:is|are|was|were|did|do|does|can|could|would|should)\b": "question",
        r"\b(?:can you|could you|would you)\s+(?:tell|explain|help|show)\b": "question",
        r"\b(?:thank|thanks|thx)\b": "no_task",
        r"\b(?:hello|hi|hey|good morning|good afternoon|good evening)\b": "no_task",
        r"\b(?:lol|haha|lmao|rofl)\b": "no_task",
        r"\b(?:nice|great|awesome|cool|good|perfect)\s+(?:job|work|idea)\b": "no_task",
        r"\bi\s+(?:love|like|hate|enjoy|prefer)\b": "no_task",
        r"\bthe\s+weather\s+(?:is|looks|seems)\b": "no_task",
    }
    
    # Domain detection keywords (expanded)
    DOMAIN_KEYWORDS = {
        TaskDomain.HOUSEHOLD: {
            "keywords": ["mother", "father", "mom", "dad", "home", "house", "kitchen", 
                        "clean", "wash", "cylinder", "gas", "electricity", "water", 
                        "repair", "family", "parents", "groceries", "cooking", "laundry",
                        "dishes", "room", "bed", "garden", "maintenance"],
            "weight": 1.0
        },
        TaskDomain.PERSONAL: {
            "keywords": ["hair", "doctor", "gym", "health", "appointment", "personal", 
                        "myself", "grooming", "exercise", "sleep", "dentist", "checkup",
                        "workout", "run", "jog", "meditation", "therapy", "hospital"],
            "weight": 1.0
        },
        TaskDomain.COLLEGE: {
            "keywords": ["assignment", "assn", "exam", "test", "lecture", "class", 
                        "study", "college", "university", "iitm", "course", "grade", 
                        "submit", "week", "quiz", "project report", "homework", "professor",
                        "teacher", "deadline", "semester", "credit", "gpa", "thesis"],
            "weight": 1.0
        },
        TaskDomain.FINANCE: {
            "keywords": ["pay", "bill", "rent", "money", "bank", "loan", "emi", 
                        "salary", "expense", "budget", "insurance", "tax", "investment",
                        "payment", "due", "fee", "charge", "transfer", "withdraw"],
            "weight": 1.0
        },
        TaskDomain.ERRANDS: {
            "keywords": ["buy", "shop", "purchase", "get", "pick up", "drop", 
                        "market", "store", "mall", "grocery", "pharmacy", "stationery",
                        "deliver", "collect", "fetch", "bring"],
            "weight": 1.0
        },
        TaskDomain.PROJECT: {
            "keywords": ["project", "deliverable", "milestone", "client", "stakeholder",
                        "presentation", "demo", "prototype", "deployment", "release",
                        "feature", "bug", "issue", "ticket", "sprint"],
            "weight": 1.0
        },
    }
    
    def __init__(self):
        self.conversation_context: List[Dict[str, Any]] = []
    
    def analyze(self, message: str, conversation_history: Optional[List[Dict]] = None) -> DetectionResult:
        """
        Analyze a message to determine if it contains a task.
        
        Returns a DetectionResult with confidence score and reasoning.
        """
        text_lower = message.lower().strip()
        
        # Step 1: Check for non-task patterns first (early exit)
        non_task_result = self._check_non_task_patterns(text_lower)
        if non_task_result:
            return DetectionResult(
                is_task=False,
                confidence=0.95,
                intent_type=IntentType(non_task_result),
                task_data={},
                reasoning=f"Detected as {non_task_result} - not an actionable task"
            )
        
        # Step 2: Check for explicit task patterns (high confidence)
        explicit_match, explicit_confidence = self._check_explicit_patterns(text_lower)
        if explicit_match:
            task_data = self._extract_task_data(message, text_lower)
            return DetectionResult(
                is_task=True,
                confidence=explicit_confidence,
                intent_type=IntentType.EXPLICIT_TASK,
                task_data=task_data,
                reasoning=f"Explicit task pattern detected: '{explicit_match}'"
            )
        
        # Step 3: Check for implicit obligations
        implicit_match, implicit_confidence = self._check_implicit_patterns(text_lower)
        if implicit_match:
            # Boost confidence if there's also a temporal marker
            temporal_boost = self._check_temporal_markers(text_lower)
            final_confidence = min(implicit_confidence + temporal_boost, 0.95)
            
            if final_confidence >= 0.75:  # Threshold for implicit tasks
                task_data = self._extract_task_data(message, text_lower)
                return DetectionResult(
                    is_task=True,
                    confidence=final_confidence,
                    intent_type=IntentType.IMPLICIT_TASK,
                    task_data=task_data,
                    reasoning=f"Implicit obligation detected: '{implicit_match}' with temporal markers"
                )
        
        # Step 4: Check for reminder requests
        reminder_match, reminder_confidence = self._check_reminder_patterns(text_lower)
        if reminder_match:
            task_data = self._extract_task_data(message, text_lower)
            task_data["task_type"] = TaskType.REMINDER
            return DetectionResult(
                is_task=True,
                confidence=reminder_confidence,
                intent_type=IntentType.REMINDER_REQUEST,
                task_data=task_data,
                reasoning=f"Reminder request detected: '{reminder_match}'"
            )
        
        # Step 5: Analyze action verbs with context
        action_confidence = self._analyze_action_verbs(text_lower)
        temporal_confidence = self._check_temporal_markers(text_lower)
        
        # Combine signals for implicit task detection
        combined_confidence = self._combine_confidence_signals(
            action_confidence, temporal_confidence, text_lower
        )
        
        if combined_confidence >= 0.70:
            task_data = self._extract_task_data(message, text_lower)
            return DetectionResult(
                is_task=True,
                confidence=combined_confidence,
                intent_type=IntentType.CASUAL_MENTION,
                task_data=task_data,
                reasoning="Combined signals: action verbs + temporal markers suggest a task"
            )
        
        # Step 6: Check conversation context for follow-up tasks
        if conversation_history:
            context_confidence = self._analyze_conversation_context(message, conversation_history)
            if context_confidence >= 0.65:
                task_data = self._extract_task_data(message, text_lower)
                return DetectionResult(
                    is_task=True,
                    confidence=context_confidence,
                    intent_type=IntentType.IMPLICIT_TASK,
                    task_data=task_data,
                    reasoning="Task inferred from conversation context"
                )
        
        # Not a task
        return DetectionResult(
            is_task=False,
            confidence=0.8,
            intent_type=IntentType.NO_TASK,
            task_data={},
            reasoning="No task patterns detected in message"
        )
    
    def _check_non_task_patterns(self, text: str) -> Optional[str]:
        """Check if message matches non-task patterns"""
        for pattern, intent_type in self.NON_TASK_PATTERNS.items():
            if re.search(pattern, text, re.IGNORECASE):
                return intent_type
        return None
    
    def _check_explicit_patterns(self, text: str) -> Tuple[Optional[str], float]:
        """Check for explicit task patterns"""
        for pattern, confidence in self.EXPLICIT_PATTERNS.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(0), confidence
        return None, 0.0
    
    def _check_implicit_patterns(self, text: str) -> Tuple[Optional[str], float]:
        """Check for implicit obligation patterns"""
        for pattern, confidence in self.IMPLICIT_OBLIGATION_PATTERNS.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(0), confidence
        return None, 0.0
    
    def _check_reminder_patterns(self, text: str) -> Tuple[Optional[str], float]:
        """Check for reminder request patterns"""
        reminder_patterns = {
            r"\bremind me\b": 0.98,
            r"\bset a reminder\b": 0.98,
            r"\bdon't let me forget\b": 0.95,
            r"\bping me\b": 0.90,
            r"\bnotify me\b": 0.88,
        }
        for pattern, confidence in reminder_patterns.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(0), confidence
        return None, 0.0
    
    def _analyze_action_verbs(self, text: str) -> float:
        """Analyze presence and strength of action verbs"""
        confidence = 0.0
        matched_verbs = []
        
        for verb, verb_confidence in self.ACTION_VERBS.items():
            # Check for whole word match
            pattern = r"\b" + re.escape(verb) + r"\b"
            if re.search(pattern, text, re.IGNORECASE):
                matched_verbs.append((verb, verb_confidence))
                confidence = max(confidence, verb_confidence)
        
        # Boost if multiple action verbs found
        if len(matched_verbs) >= 2:
            confidence = min(confidence + 0.1, 0.85)
        
        return confidence
    
    def _check_temporal_markers(self, text: str) -> float:
        """Check for temporal urgency markers"""
        total_boost = 0.0
        
        for pattern, boost in self.TEMPORAL_MARKERS.items():
            if re.search(pattern, text, re.IGNORECASE):
                total_boost += boost
        
        return min(total_boost, 0.50)  # Cap at 0.50
    
    def _combine_confidence_signals(
        self, 
        action_confidence: float, 
        temporal_confidence: float,
        text: str
    ) -> float:
        """Combine multiple signals to get final confidence"""
        # Base confidence from action verbs
        base = action_confidence * 0.6
        
        # Add temporal component
        temporal = temporal_confidence * 0.4
        
        combined = base + temporal
        
        # Penalize very short messages (likely not tasks)
        word_count = len(text.split())
        if word_count < 4:
            combined *= 0.5
        
        # Boost if message contains specific details (objects, times, people)
        if re.search(r"\b(?:the|a|an|my|this|that)\s+\w+", text):
            combined = min(combined + 0.05, 0.90)
        
        return combined
    
    def _analyze_conversation_context(
        self, 
        message: str, 
        history: List[Dict]
    ) -> float:
        """Analyze conversation history for task context"""
        if not history or len(history) < 2:
            return 0.0
        
        # Look for recent task-related context
        recent_messages = history[-3:]  # Last 3 messages
        task_context_score = 0.0
        
        for msg in recent_messages:
            content = msg.get("content", "").lower()
            
            # Check if previous message was about a task
            if any(pattern in content for pattern in ["task", "remind", "due", "deadline"]):
                task_context_score += 0.2
            
            # Check if user is responding to a task prompt
            if msg.get("role") == "assistant":
                if any(word in content for word in ["what do you need to do", "any tasks", "remind you"]):
                    task_context_score += 0.3
        
        # If there's strong task context, check if current message looks like a task response
        if task_context_score >= 0.3:
            # Check if message has task-like structure
            if re.search(r"\b(?:i|my|me)\b", message.lower()):
                return min(0.65 + task_context_score, 0.85)
        
        return 0.0
    
    def _extract_task_data(self, message: str, text_lower: str) -> Dict[str, Any]:
        """Extract structured task data from the message"""
        return {
            "title": self._extract_title(message, text_lower),
            "description": message,
            "domain": self._extract_domain(text_lower),
            "task_type": self._extract_task_type(text_lower),
            "due_date": self._extract_due_date(text_lower),
            "due_fuzzy": self._extract_fuzzy_time(text_lower),
            "requested_by": self._extract_requested_by(text_lower),
            "tags": self._extract_tags(text_lower),
        }
    
    def _extract_title(self, message: str, text_lower: str) -> str:
        """Extract a clean, concise title from the message"""
        # Remove task prefixes
        prefixes = [
            r"^(?:i need to|i have to|i must|i gotta|i should)\s+",
            r"^(?:remind me to|remember to|don't forget to)\s+",
            r"^(?:add to my list|put on my list|create a task)\s+(?:to)?\s*",
            r"^(?:my\s+)?(?:mother|mom|mum|father|dad|boss|professor)\s+(?:asked|told|wants)\s+(?:me\s+)?(?:to)?\s*",
        ]
        
        title = message
        for pattern in prefixes:
            title = re.sub(pattern, "", title, flags=re.IGNORECASE)
        
        # Truncate at time markers
        time_markers = [
            r"\s+by\s+(?:tomorrow|today|tonight|next|the end of)",
            r"\s+before\s+",
            r"\s+in\s+\d+\s+(?:days?|hours?|minutes?)",
            r"\s+this\s+(?:week|month|morning|afternoon|evening)",
        ]
        
        for marker in time_markers:
            match = re.search(marker, title, re.IGNORECASE)
            if match:
                title = title[:match.start()].strip()
        
        # Clean up and capitalize
        title = title.strip().rstrip(",.!?;")
        if title:
            title = title[0].upper() + title[1:]
        
        # Limit length
        if len(title) > 100:
            title = title[:97] + "..."
        
        return title or "Untitled Task"
    
    def _extract_domain(self, text: str) -> TaskDomain:
        """Extract the most likely domain for the task"""
        scores = {domain: 0 for domain in TaskDomain}
        
        for domain, data in self.DOMAIN_KEYWORDS.items():
            keywords = data["keywords"]
            weight = data["weight"]
            
            for keyword in keywords:
                # Count occurrences
                matches = len(re.findall(r"\b" + re.escape(keyword) + r"\b", text, re.IGNORECASE))
                scores[domain] += matches * weight
        
        # Get domain with highest score
        max_score = max(scores.values())
        if max_score > 0:
            return max(scores.items(), key=lambda x: x[1])[0]
        
        return TaskDomain.OTHER
    
    def _extract_task_type(self, text: str) -> TaskType:
        """Determine the type of task"""
        text_lower = text.lower()
        
        # Check for reminder patterns
        if any(word in text_lower for word in ["remind", "reminder", "ping me", "notify me"]):
            return TaskType.REMINDER
        
        # Check for soft/uncertain tasks
        if any(phrase in text_lower for phrase in ["maybe", "might", "possibly", "consider", "think about"]):
            return TaskType.SOFT_TASK
        
        # Check for open loops (waiting, undecided)
        if any(phrase in text_lower for phrase in ["waiting for", "need to decide", "not sure", "later", "eventually"]):
            return TaskType.OPEN_LOOP
        
        # Check for recurring tasks
        if any(word in text_lower for word in ["every", "daily", "weekly", "monthly", "each"]):
            return TaskType.REMINDER
        
        return TaskType.TASK
    
    def _extract_due_date(self, text: str) -> Optional[datetime]:
        """Extract specific due date from text"""
        now = datetime.now()
        
        # Today
        if re.search(r"\btoday\b", text, re.IGNORECASE):
            return now.replace(hour=23, minute=59, second=59)
        
        # Tomorrow
        if re.search(r"\btomorrow\b", text, re.IGNORECASE):
            return (now + timedelta(days=1)).replace(hour=23, minute=59, second=59)
        
        # Day after tomorrow
        if re.search(r"\bday after tomorrow\b", text, re.IGNORECASE):
            return (now + timedelta(days=2)).replace(hour=23, minute=59, second=59)
        
        # In X days
        match = re.search(r"\bin\s+(\d+)\s+days?\b", text, re.IGNORECASE)
        if match:
            days = int(match.group(1))
            return (now + timedelta(days=days)).replace(hour=23, minute=59, second=59)
        
        # Next week
        if re.search(r"\bnext week\b", text, re.IGNORECASE):
            return (now + timedelta(days=7)).replace(hour=23, minute=59, second=59)
        
        # This week
        if re.search(r"\bthis week\b", text, re.IGNORECASE):
            # End of current week (Sunday)
            days_until_sunday = 6 - now.weekday()
            return (now + timedelta(days=days_until_sunday)).replace(hour=23, minute=59, second=59)
        
        return None
    
    def _extract_fuzzy_time(self, text: str) -> Optional[str]:
        """Extract fuzzy time expressions"""
        fuzzy_patterns = [
            (r"\bsoon\b", "soon"),
            (r"\bsometime\b", "sometime"),
            (r"\beventually\b", "eventually"),
            (r"\blater\b", "later"),
            (r"\bthis month\b", "this month"),
            (r"\bnext month\b", "next month"),
            (r"\bwhenever\b", "whenever"),
            (r"\bwhen i get time\b", "when time permits"),
        ]
        
        for pattern, value in fuzzy_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return value
        
        return None
    
    def _extract_requested_by(self, text: str) -> Optional[str]:
        """Extract who requested the task"""
        # Check for explicit request patterns
        request_patterns = [
            (r"\b(?:mother|mom|mum|ma)\b", "mother"),
            (r"\b(?:father|dad|papa)\b", "father"),
            (r"\b(?:boss|manager|supervisor)\b", "boss"),
            (r"\b(?:professor|teacher|instructor)\b", "professor"),
            (r"\b(?:friend|colleague|peer)\b", "friend"),
            (r"\b(?:client|customer)\b", "client"),
        ]
        
        for pattern, person in request_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return person
        
        return None
    
    def _extract_tags(self, text: str) -> List[str]:
        """Extract relevant tags from text"""
        tags = []
        text_lower = text.lower()
        
        tag_keywords = {
            "urgent": ["urgent", "asap", "critical", "important", "priority"],
            "recurring": ["every", "daily", "weekly", "monthly", "regular"],
            "waiting": ["waiting", "pending", "blocked", "on hold"],
            "high-effort": ["big", "large", "complex", "difficult", "challenging"],
            "quick": ["quick", "small", "easy", "simple", "fast", "5 min", "10 min"],
        }
        
        for tag, keywords in tag_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                tags.append(tag)
        
        return tags


# Global instance
task_detector = IntelligentTaskDetector()


class TaskPatternsKnowledgeBase:
    """Wrapper class for accessing task patterns from task_patterns_knowledge_base module"""
    
    def __init__(self):
        from utils.task_patterns_knowledge_base import (
            TEMPORAL_EXPRESSIONS,
            ACTION_VERBS,
            OBLIGATION_PATTERNS,
            REMINDER_KEYWORDS,
            CONFIDENCE_THRESHOLDS,
            get_all_patterns,
        )
        self.temporal = TEMPORAL_EXPRESSIONS
        self.action_verbs = ACTION_VERBS
        self.obligations = OBLIGATION_PATTERNS
        self.reminders = REMINDER_KEYWORDS
        self.thresholds = CONFIDENCE_THRESHOLDS
        self._get_all_patterns = get_all_patterns
    
    def analyze(self, text: str) -> Dict[str, Any]:
        """Analyze text for task patterns"""
        text_lower = text.lower()
        matches = []
        
        # Check temporal patterns
        for category, patterns in self.temporal.items():
            if isinstance(patterns, list):
                for pattern in patterns:
                    if re.search(pattern, text_lower, re.IGNORECASE):
                        matches.append(("temporal", category, pattern))
        
        # Check action verbs
        for category, data in self.action_verbs.items():
            for verb in data.get("verbs", []):
                if re.search(r"\b" + re.escape(verb) + r"\b", text_lower, re.IGNORECASE):
                    matches.append(("action", category, verb))
        
        # Check obligation patterns
        for level, data in self.obligations.items():
            for pattern in data.get("patterns", []):
                if pattern in text_lower:
                    matches.append(("obligation", level, pattern))
        
        return {
            "matches": matches,
            "has_temporal": any(m[0] == "temporal" for m in matches),
            "has_action": any(m[0] == "action" for m in matches),
            "has_obligation": any(m[0] == "obligation" for m in matches),
            "has_deadline": any(m[1] in ["deadline", "due_date"] for m in matches if m[0] == "temporal"),
        }
