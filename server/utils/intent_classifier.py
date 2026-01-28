"""
Intent Classification Pipeline

A fast, deterministic intent classifier that uses cheap signals (regex + rules)
to categorize user messages into buckets and compute confidence scores.

Four buckets:
1. Clearly conversational (e.g. "write binary search code")
2. Clearly actionable (task/reminder)
3. Ambiguous but possibly actionable ("I need to go to market tomorrow")
4. Explicit command ("create a reminder", "add a task")

The classifier computes a confidence score (0-1) using:
- Temporal expressions (+0.4)
- Obligation verbs (+0.3)
- Action verbs (+0.2)
- Anti-signals like "explain", "write code" (-0.5)
"""

import re
from dataclasses import dataclass
from enum import Enum
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta


class IntentBucket(Enum):
    """Four buckets for user message classification"""
    CONVERSATIONAL = "conversational"  # Clearly chat, no action needed
    ACTIONABLE = "actionable"          # Clear task/reminder
    AMBIGUOUS = "ambiguous"            # Might be actionable, needs clarification
    EXPLICIT_COMMAND = "explicit_command"  # User explicitly asked for action


class ActionType(Enum):
    """Type of action detected"""
    NONE = "none"
    TASK = "task"                      # Something user must do
    REMINDER = "reminder"              # Something to be notified about
    EVENT = "event"                    # Meeting, appointment
    DEADLINE = "deadline"              # Due date, submission


@dataclass
class IntentResult:
    """Result of intent classification"""
    bucket: IntentBucket
    confidence: float  # 0.0 to 1.0
    action_type: ActionType
    scores: Dict[str, float]  # Breakdown of individual scores
    extracted_data: Dict[str, Any]
    reasoning: str


class IntentClassifier:
    """
    Fast deterministic intent classifier using regex and rules.
    No LLM calls - pure pattern matching for speed.
    """
    
    # Scoring weights
    SCORES = {
        # Positive signals
        "future_time": 0.40,
        "obligation_verb": 0.30,
        "market_pattern": 0.35,  # High weight for market/shopping patterns
        "action_verb": 0.20,
        "reminder_keyword": 0.15,
        "first_person": 0.10,
        
        # Negative signals (anti-patterns)
        "informational_verb": -0.50,
        "code_request": -0.40,
        "question_pattern": -0.30,
        "greeting": -0.20,
        
        # Explicit command bonus
        "explicit_command": 0.25,
    }
    
    # Temporal patterns (future time references)
    TEMPORAL_PATTERNS = {
        r"\btoday\b": 0.8,
        r"\btomorrow\b": 0.9,
        r"\bday after tomorrow\b": 0.9,
        r"\bnext (?:week|month|year)\b": 0.8,
        r"\bthis (?:week|month|evening|afternoon|morning)\b": 0.7,
        r"\bin \d+ (?:days?|hours?|minutes?|weeks?)\b": 0.9,
        r"\bby (?:tomorrow|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b": 0.9,
        r"\bat \d{1,2}(?::\d{2})?\s*(?:am|pm)?\b": 0.8,
        r"\bon (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b": 0.8,
        r"\bdue\b": 0.9,
        r"\bdeadline\b": 0.9,
        r"\bsoon\b": 0.5,
        r"\blater\b": 0.4,
    }
    
    # Obligation verbs (indicate user commitment)
    OBLIGATION_PATTERNS = {
        r"\bi need to\b": 0.9,
        r"\bi have to\b": 0.9,
        r"\bi must\b": 0.95,
        r"\bi gotta\b": 0.85,
        r"\bi should\b": 0.7,
        r"\bi ought to\b": 0.7,
    }
    
    # Action verbs (concrete actions)
    ACTION_VERBS = {
        # High-commitment actions (tasks)
        "submit": (0.9, ActionType.TASK),
        "complete": (0.9, ActionType.TASK),
        "finish": (0.9, ActionType.TASK),
        "deliver": (0.9, ActionType.TASK),
        "pay": (0.85, ActionType.TASK),
        "buy": (0.85, ActionType.TASK),
        "purchase": (0.85, ActionType.TASK),
        "order": (0.8, ActionType.TASK),
        "apply": (0.85, ActionType.TASK),
        "register": (0.8, ActionType.TASK),
        "renew": (0.8, ActionType.TASK),
        "fix": (0.85, ActionType.TASK),
        "repair": (0.85, ActionType.TASK),
        "prepare": (0.8, ActionType.TASK),
        "write": (0.7, ActionType.TASK),
        "create": (0.75, ActionType.TASK),
        "make": (0.7, ActionType.TASK),
        "clean": (0.75, ActionType.TASK),
        "wash": (0.75, ActionType.TASK),
        "organize": (0.75, ActionType.TASK),
        "pick up": (0.8, ActionType.TASK),
        "drop off": (0.8, ActionType.TASK),
        "schedule": (0.8, ActionType.TASK),
        "book": (0.8, ActionType.TASK),
        
        # Communication actions (can be task or reminder)
        "call": (0.75, ActionType.REMINDER),
        "email": (0.75, ActionType.REMINDER),
        "contact": (0.7, ActionType.REMINDER),
        "reach out": (0.7, ActionType.REMINDER),
        "visit": (0.7, ActionType.REMINDER),
        "meet": (0.8, ActionType.EVENT),
        "attend": (0.8, ActionType.EVENT),
        "join": (0.75, ActionType.EVENT),
        
        # Movement actions
        "go": (0.75, ActionType.TASK),
        "come": (0.6, ActionType.TASK),
        "drive": (0.65, ActionType.TASK),
        "walk": (0.5, ActionType.TASK),
    }
    
    # Market/shopping specific patterns (high confidence task indicators)
    MARKET_PATTERNS = {
        r"\bgo\s+(?:to|at)\s+(?:the\s+)?(?:market|store|shop|mall|grocery|supermarket)\b": 0.85,
        r"\bgo\s+(?:to|at)\s+(?:the\s+)?(?:market|store|shop)\s+(?:to|and)\s+(?:buy|get|purchase)\b": 0.95,
        r"\bbuy\s+(?:some\s+)?\w+\s+(?:from|at)\s+(?:the\s+)?(?:market|store|shop)\b": 0.90,
        r"\bget\s+(?:some\s+)?\w+\s+(?:from|at)\s+(?:the\s+)?(?:market|store|shop)\b": 0.85,
        r"\bneed\s+(?:to\s+)?(?:buy|get|purchase)\s+\w+\s+(?:from|at)\b": 0.90,
    }
    
    # Reminder keywords
    REMINDER_PATTERNS = {
        r"\bremind me\b": 1.0,
        r"\bremind me to\b": 1.0,
        r"\bremind me about\b": 1.0,
        r"\bset a reminder\b": 1.0,
        r"\bdon'?t forget\b": 0.9,
        r"\bremember to\b": 0.9,
        r"\bping me\b": 0.85,
        r"\bnotify me\b": 0.85,
    }
    
    # Explicit command patterns
    EXPLICIT_COMMANDS = {
        r"\bcreate a (?:task|reminder)\b": (1.0, ActionType.TASK),
        r"\badd a (?:task|reminder|todo)\b": (1.0, ActionType.TASK),
        r"\bmake a (?:task|reminder)\b": (1.0, ActionType.TASK),
        r"\bset (?:up )?a reminder\b": (1.0, ActionType.REMINDER),
        r"\badd (?:this|it) to my (?:tasks|list|reminders)\b": (1.0, ActionType.TASK),
    }
    
    # Anti-patterns (informational/chat)
    INFORMATIONAL_PATTERNS = {
        r"\bexplain\b": 0.9,
        r"\bhow (?:do|can|to|does)\b": 0.9,
        r"\bwhat (?:is|are|does|means?)\b": 0.85,
        r"\bwhy (?:is|are|does|do)\b": 0.85,
        r"\btell me about\b": 0.8,
        r"\bdescribe\b": 0.8,
        r"\bdefine\b": 0.8,
    }
    
    CODE_PATTERNS = {
        r"\bwrite\s+(?:me\s+)?(?:some\s+)?(?:code|a\s+(?:function|script|program))\b": 0.9,
        r"\bgenerate\s+(?:code|a\s+script)\b": 0.9,
        r"\bcode\s+(?:in|using)\s+(?:python|javascript|js|java|c\+\+|go|ruby)\b": 0.9,
        r"\bimplement\s+(?:binary\s+search|a\s+function|an\s+algorithm)\b": 0.85,
        r"\b(?:binary\s+search|quick\s+sort|merge\s+sort|algorithm)\b": 0.7,
    }
    
    QUESTION_PATTERNS = {
        r"^[\w\s]+\?\s*$": 0.8,  # Ends with question mark
        r"\b(?:can you|could you|would you)\s+(?:help|tell|explain|show)\b": 0.8,
        r"\bdo you\s+(?:know|think|believe)\b": 0.7,
        r"\bis it\s+(?:possible|true|correct)\b": 0.7,
    }
    
    GREETING_PATTERNS = {
        r"^(?:hello|hi|hey|good morning|good afternoon|good evening)[\s!]*$": 0.9,
        r"\b(?:thanks|thank you|thx)\b": 0.7,
        r"\b(?:bye|goodbye|see you)\b": 0.7,
    }
    
    # First person indicators
    FIRST_PERSON_PATTERNS = {
        r"\bi\s+(?:need|have|must|should|want|will|am going to)\b": 0.8,
        r"\bmy\s+(?:task|reminder|appointment|meeting)\b": 0.7,
    }
    
    def classify(self, message: str) -> IntentResult:
        """
        Classify a message into one of four buckets with confidence score.
        """
        text_lower = message.lower().strip()
        scores = {}
        
        # 1. Check for explicit commands first (highest priority)
        explicit_match, explicit_action = self._check_explicit_commands(text_lower)
        if explicit_match:
            return IntentResult(
                bucket=IntentBucket.EXPLICIT_COMMAND,
                confidence=1.0,
                action_type=explicit_action,
                scores={"explicit_command": 1.0},
                extracted_data=self._extract_data(message, text_lower, explicit_action),
                reasoning=f"Explicit command detected: '{explicit_match}'"
            )
        
        # 2. Compute individual signal scores
        scores["future_time"] = self._score_temporal(text_lower)
        scores["obligation_verb"] = self._score_obligation(text_lower)
        action_score, detected_action = self._score_action_verbs(text_lower)
        scores["action_verb"] = action_score
        scores["reminder_keyword"] = self._score_reminder_keywords(text_lower)
        scores["first_person"] = self._score_first_person(text_lower)
        
        # Check for market/shopping patterns (high confidence indicators)
        market_score = self._score_market_patterns(text_lower)
        if market_score > 0:
            scores["market_pattern"] = market_score
        
        # 3. Compute anti-signal scores
        scores["informational_verb"] = self._score_informational(text_lower)
        scores["code_request"] = self._score_code_request(text_lower)
        scores["question_pattern"] = self._score_question(text_lower)
        scores["greeting"] = self._score_greeting(text_lower)
        
        # 4. Calculate total confidence
        total_score = sum(
            self.SCORES.get(key, 0) * value 
            for key, value in scores.items()
        )
        
        # Normalize to 0-1 range
        confidence = self._normalize_score(total_score)
        
        # 5. Determine bucket based on confidence
        bucket = self._determine_bucket(confidence, scores)
        
        # 6. Determine action type
        action_type = self._determine_action_type(
            detected_action, scores, text_lower
        )
        
        # 7. Extract structured data
        extracted_data = self._extract_data(message, text_lower, action_type)
        
        # 8. Generate reasoning
        reasoning = self._generate_reasoning(bucket, confidence, scores)
        
        return IntentResult(
            bucket=bucket,
            confidence=confidence,
            action_type=action_type,
            scores=scores,
            extracted_data=extracted_data,
            reasoning=reasoning
        )
    
    def _check_explicit_commands(self, text: str) -> tuple[Optional[str], ActionType]:
        """Check for explicit command patterns"""
        for pattern, (score, action_type) in self.EXPLICIT_COMMANDS.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(0), action_type
        return None, ActionType.NONE
    
    def _score_temporal(self, text: str) -> float:
        """Score based on temporal expressions"""
        max_score = 0.0
        for pattern, score in self.TEMPORAL_PATTERNS.items():
            if re.search(pattern, text, re.IGNORECASE):
                max_score = max(max_score, score)
        return max_score
    
    def _score_obligation(self, text: str) -> float:
        """Score based on obligation verbs"""
        max_score = 0.0
        for pattern, score in self.OBLIGATION_PATTERNS.items():
            if re.search(pattern, text, re.IGNORECASE):
                max_score = max(max_score, score)
        return max_score
    
    def _score_action_verbs(self, text: str) -> tuple[float, ActionType]:
        """Score based on action verbs and return detected action type"""
        max_score = 0.0
        detected_action = ActionType.NONE
        
        for verb, (score, action_type) in self.ACTION_VERBS.items():
            pattern = r"\b" + re.escape(verb) + r"\b"
            if re.search(pattern, text, re.IGNORECASE):
                if score > max_score:
                    max_score = score
                    detected_action = action_type
        
        return max_score, detected_action
    
    def _score_market_patterns(self, text: str) -> float:
        """Score market/shopping specific patterns"""
        max_score = 0.0
        for pattern, score in self.MARKET_PATTERNS.items():
            if re.search(pattern, text, re.IGNORECASE):
                max_score = max(max_score, score)
        return max_score
    
    def _score_reminder_keywords(self, text: str) -> float:
        """Score based on reminder keywords"""
        max_score = 0.0
        for pattern, score in self.REMINDER_PATTERNS.items():
            if re.search(pattern, text, re.IGNORECASE):
                max_score = max(max_score, score)
        return max_score
    
    def _score_first_person(self, text: str) -> float:
        """Score based on first-person indicators"""
        max_score = 0.0
        for pattern, score in self.FIRST_PERSON_PATTERNS.items():
            if re.search(pattern, text, re.IGNORECASE):
                max_score = max(max_score, score)
        return max_score
    
    def _score_informational(self, text: str) -> float:
        """Score informational anti-patterns"""
        max_score = 0.0
        for pattern, score in self.INFORMATIONAL_PATTERNS.items():
            if re.search(pattern, text, re.IGNORECASE):
                max_score = max(max_score, score)
        return max_score
    
    def _score_code_request(self, text: str) -> float:
        """Score code request anti-patterns"""
        max_score = 0.0
        for pattern, score in self.CODE_PATTERNS.items():
            if re.search(pattern, text, re.IGNORECASE):
                max_score = max(max_score, score)
        return max_score
    
    def _score_question(self, text: str) -> float:
        """Score question anti-patterns"""
        max_score = 0.0
        for pattern, score in self.QUESTION_PATTERNS.items():
            if re.search(pattern, text, re.IGNORECASE):
                max_score = max(max_score, score)
        return max_score
    
    def _score_greeting(self, text: str) -> float:
        """Score greeting anti-patterns"""
        max_score = 0.0
        for pattern, score in self.GREETING_PATTERNS.items():
            if re.search(pattern, text, re.IGNORECASE):
                max_score = max(max_score, score)
        return max_score
    
    def _normalize_score(self, score: float) -> float:
        """Normalize score to 0-1 range with sigmoid transformation"""
        import math
        
        # Apply sigmoid for better separation between classes
        # This creates a steeper curve around the decision boundary
        try:
            normalized = 1 / (1 + math.exp(-score * 3))
        except OverflowError:
            normalized = 1.0 if score > 0 else 0.0
        
        return max(0.0, min(1.0, normalized))
    
    def _determine_bucket(self, confidence: float, scores: Dict[str, float]) -> IntentBucket:
        """Determine which bucket based on confidence and signals"""
        # Calculate anti-signal strength
        anti_score = (
            scores.get("informational_verb", 0) * 0.5 +
            scores.get("code_request", 0) * 0.4 +
            scores.get("question_pattern", 0) * 0.3 +
            scores.get("greeting", 0) * 0.2
        )
        
        # Calculate positive signal strength
        positive_score = (
            scores.get("future_time", 0) * 0.4 +
            scores.get("obligation_verb", 0) * 0.3 +
            scores.get("action_verb", 0) * 0.2 +
            scores.get("reminder_keyword", 0) * 0.15
        )
        
        # Strong anti-signals = conversational, regardless of confidence
        if anti_score > 0.4:
            return IntentBucket.CONVERSATIONAL
        
        # Very low confidence = conversational
        if confidence <= 0.35:
            return IntentBucket.CONVERSATIONAL
        
        # High confidence with positive signals = actionable
        if confidence >= 0.75 and positive_score > 0.5:
            return IntentBucket.ACTIONABLE
        
        # Medium-high confidence with reminder keywords = actionable
        if confidence >= 0.70 and scores.get("reminder_keyword", 0) > 0.5:
            return IntentBucket.ACTIONABLE
        
        # High confidence with market pattern = actionable (shopping/errands are clear tasks)
        if confidence >= 0.80 and scores.get("market_pattern", 0) >= 0.9:
            return IntentBucket.ACTIONABLE
        
        # Low-medium confidence with no positive signals = conversational
        # This catches greetings and short messages
        if confidence < 0.60 and positive_score < 0.3:
            return IntentBucket.CONVERSATIONAL
        
        # Medium confidence = ambiguous
        return IntentBucket.AMBIGUOUS
    
    def _determine_action_type(
        self, 
        detected_action: ActionType, 
        scores: Dict[str, float],
        text: str
    ) -> ActionType:
        """Determine the type of action"""
        # Check for explicit reminder keywords
        if scores.get("reminder_keyword", 0) > 0.5:
            return ActionType.REMINDER
        
        # Check for meeting/appointment patterns
        if re.search(r"\b(?:meeting|appointment|call|interview|session)\b", text, re.IGNORECASE):
            if scores.get("future_time", 0) > 0.5:
                return ActionType.EVENT
        
        # Check for deadline patterns
        if re.search(r"\b(?:due|deadline|submit|assignment)\b", text, re.IGNORECASE):
            return ActionType.DEADLINE
        
        # Default to detected action or task
        if detected_action != ActionType.NONE:
            return detected_action
        
        return ActionType.TASK
    
    def _extract_data(self, message: str, text_lower: str, action_type: ActionType) -> Dict[str, Any]:
        """Extract structured data from message"""
        return {
            "title": self._extract_title(message, text_lower),
            "due_date": self._extract_due_date(text_lower),
            "due_fuzzy": self._extract_fuzzy_time(text_lower),
            "action_type": action_type.value,
        }
    
    def _extract_title(self, message: str, text_lower: str) -> str:
        """Extract a clean title from the message"""
        # Remove prefixes
        prefixes = [
            r"^(?:i need to|i have to|i must|i should|i gotta)\s+",
            r"^(?:remind me to|remember to|don't forget to)\s+",
            r"^(?:create a|add a|make a)\s+(?:task|reminder)\s+(?:to|for)?\s*",
            r"^(?:set a reminder to|set up a reminder for)\s*",
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
            r"\s+on\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)",
        ]
        
        for marker in time_markers:
            match = re.search(marker, title, re.IGNORECASE)
            if match:
                title = title[:match.start()].strip()
        
        # Clean up
        title = title.strip().rstrip(",.!?;")
        if title:
            title = title[0].upper() + title[1:]
        
        # Limit length
        if len(title) > 100:
            title = title[:97] + "..."
        
        return title or "Untitled"
    
    def _extract_due_date(self, text: str) -> Optional[datetime]:
        """Extract specific due date"""
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
        
        return None
    
    def _extract_fuzzy_time(self, text: str) -> Optional[str]:
        """Extract fuzzy time expressions"""
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
            if re.search(pattern, text, re.IGNORECASE):
                return value
        
        return None
    
    def _generate_reasoning(self, bucket: IntentBucket, confidence: float, scores: Dict[str, float]) -> str:
        """Generate human-readable reasoning"""
        reasons = []
        
        # Positive signals
        if scores.get("future_time", 0) > 0.5:
            reasons.append("future time reference")
        if scores.get("obligation_verb", 0) > 0.5:
            reasons.append("obligation verb")
        if scores.get("action_verb", 0) > 0.5:
            reasons.append("action verb")
        if scores.get("reminder_keyword", 0) > 0.5:
            reasons.append("reminder keyword")
        
        # Negative signals
        if scores.get("informational_verb", 0) > 0.5:
            reasons.append("informational request")
        if scores.get("code_request", 0) > 0.5:
            reasons.append("code request")
        if scores.get("question_pattern", 0) > 0.5:
            reasons.append("question pattern")
        
        if reasons:
            return f"Detected: {', '.join(reasons)} (confidence: {confidence:.2f})"
        return f"No strong signals detected (confidence: {confidence:.2f})"


# Global instance
intent_classifier = IntentClassifier()
