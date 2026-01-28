"""
Task Detection Knowledge Base

This module contains comprehensive patterns for task detection collected from
various sources including NLP research, task management apps, and common usage patterns.

Sources and references:
- Temporal expressions from TIMEX3 standard
- Action verbs from FrameNet and VerbNet
- Task patterns from Todoist, Things, OmniFocus user studies
- Reminder patterns from Siri, Google Assistant, Alexa command structures
"""

# =============================================================================
# TEMPORAL EXPRESSIONS
# =============================================================================

TEMPORAL_EXPRESSIONS = {
    # Absolute dates
    "absolute_dates": [
        r"\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?\b",
        r"\b\d{1,2}(?:st|nd|rd|th)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\b",
        r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b",
    ],
    
    # Relative days
    "relative_days": {
        "today": ["today", "tonight", "this evening", "this afternoon", "this morning"],
        "tomorrow": ["tomorrow", "tmrw", "tmr", "next day"],
        "day_after_tomorrow": ["day after tomorrow", "day after tmrw"],
        "yesterday": ["yesterday"],  # For completion detection
    },
    
    # Week-related
    "week_expressions": {        "this_week": ["this week", "in the next few days", "before the weekend"],
        "next_week": ["next week", "following week", "week after"],
        "weekend": ["this weekend", "next weekend", "over the weekend"],
        "weekdays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
        "weekend_days": ["saturday", "sunday"],
    },
    
    # Month/Year
    "month_expressions": {
        "this_month": ["this month", "end of month", "eom"],
        "next_month": ["next month", "following month"],
    },
    
    # Time expressions
    "time_expressions": [
        r"\b(?:at|by)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?\b",
        r"\b(?:morning|afternoon|evening|night|midnight|noon)\b",
        r"\b\d{1,2}\s*(?:am|pm|a\.m\.|p\.m\.)\b",
    ],
    
    # Relative time
    "relative_time": {
        "in_duration": ["in", "within", "over the next"],
        "by_time": ["by", "before", "prior to", "no later than"],
        "after_time": ["after", "following", "once"],
    },
    
    # Urgency indicators
    "urgency": {
        "high": ["asap", "urgent", "immediately", "right away", "at once", "now"],
        "medium": ["soon", "shortly", "in a bit", "later today"],
        "low": ["sometime", "eventually", "whenever", "when you can", "no rush"],
    },
}

# =============================================================================
# ACTION VERBS BY CATEGORY
# =============================================================================

ACTION_VERBS = {
    # Communication
    "communication": {
        "verbs": ["call", "phone", "ring", "dial", "skype", "zoom", "facetime",
                  "email", "mail", "write", "message", "text", "sms", "whatsapp",
                  "contact", "reach out", "get in touch", "follow up", "reply",
                  "respond", "answer", "chat", "talk", "speak", "conference",
                  "meet", "schedule", "book", "reserve", "arrange"],
        "weight": 0.75,
        "action_type": "reminder",
    },
    
    # Shopping/Errands
    "shopping": {
        "verbs": ["buy", "purchase", "get", "pick up", "grab", "shop for",
                  "order", "place order", "pre-order", "subscribe to",
                  "collect", "fetch", "bring", "deliver", "ship"],
        "weight": 0.85,
        "action_type": "task",
    },
    
    # Household
    "household": {
        "verbs": ["clean", "wash", "vacuum", "sweep", "mop", "dust", "polish",
                  "organize", "tidy", "declutter", "arrange", "fix", "repair",
                  "maintain", "service", "replace", "install", "assemble",
                  "cook", "prepare", "make", "bake", "fry", "boil",
                  "do laundry", "fold", "iron", "put away"],
        "weight": 0.80,
        "action_type": "task",
    },
    
    # Work/Professional
    "work": {
        "verbs": ["submit", "send", "deliver", "complete", "finish", "finalize",
                  "review", "approve", "sign", "file", "document", "report",
                  "present", "demo", "pitch", "propose", "apply", "register",
                  "enroll", "schedule", "book", "reserve", "cancel", "reschedule",
                  "follow up", "check in", "update", "sync", "backup"],
        "weight": 0.90,
        "action_type": "task",
    },
    
    # Financial
    "financial": {
        "verbs": ["pay", "repay", "settle", "clear", "transfer", "send money",
                  "deposit", "withdraw", "invest", "save", "budget", "bill",
                  "renew", "extend", "upgrade", "downgrade", "cancel subscription"],
        "weight": 0.88,
        "action_type": "task",
    },
    
    # Health/Wellness
    "health": {
        "verbs": ["exercise", "work out", "run", "jog", "walk", "hike", "swim",
                  "cycle", "bike", "lift", "stretch", "meditate", "yoga",
                  "take medicine", "take pills", "apply", "put on",
                  "schedule appointment", "book checkup", "visit doctor",
                  "get prescription", "refill"],
        "weight": 0.82,
        "action_type": "task",
    },
    
    # Learning/Education
    "education": {
        "verbs": ["study", "learn", "practice", "review", "revise", "memorize",
                  "read", "write", "complete", "finish", "submit", "turn in",
                  "take exam", "take test", "attend class", "watch lecture",
                  "do homework", "work on assignment", "research", "investigate"],
        "weight": 0.85,
        "action_type": "task",
    },
    
    # Travel/Transportation
    "travel": {
        "verbs": ["go", "drive", "ride", "fly", "take", "catch", "board",
                  "pick up", "drop off", "meet at", "arrive at", "depart from",
                  "check in", "check out", "book", "reserve", "confirm",
                  "pack", "prepare", "plan", "research", "look up"],
        "weight": 0.78,
        "action_type": "task",
    },
    
    # Social
    "social": {
        "verbs": ["visit", "see", "meet up", "hang out", "catch up",
                  "invite", "host", "throw", "plan", "organize",
                  "celebrate", "attend", "join", "participate", "volunteer",
                  "wish", "congratulate", "thank", "apologize to"],
        "weight": 0.72,
        "action_type": "reminder",
    },
    
    # Digital/Online
    "digital": {
        "verbs": ["download", "upload", "install", "update", "upgrade",
                  "backup", "sync", "transfer", "move", "copy", "delete",
                  "organize", "sort", "tag", "rename", "compress", "extract",
                  "subscribe", "unsubscribe", "follow", "unfollow", "post",
                  "share", "comment", "like", "review", "rate"],
        "weight": 0.70,
        "action_type": "task",
    },
}

# =============================================================================
# OBLIGATION INDICATORS
# =============================================================================

OBLIGATION_PATTERNS = {
    "strong": {
        "patterns": ["i must", "i have to", "i need to", "i gotta", "i got to",
                     "required to", "supposed to", "expected to", "obligated to"],
        "weight": 0.95,
    },
    "medium": {
        "patterns": ["i should", "i ought to", "i'd better", "i better",
                     "probably should", "might want to", "may want to"],
        "weight": 0.70,
    },
    "weak": {
        "patterns": ["i could", "i might", "i may", "thinking about",
                     "considering", "planning to", "hoping to", "wanting to"],
        "weight": 0.50,
    },
    "external": {
        "patterns": ["asked me to", "told me to", "wants me to", "needs me to",
                     "assigned me", "requested that i", "expecting me to"],
        "weight": 0.88,
    },
}

# =============================================================================
# REMINDER KEYWORDS
# =============================================================================

REMINDER_KEYWORDS = {
    "explicit": {
        "patterns": ["remind me", "set a reminder", "don't forget", "remember to",
                     "make sure to", "be sure to", "see that you", "see to it"],
        "weight": 1.0,
    },
    "notification": {
        "patterns": ["notify me", "alert me", "ping me", "let me know",
                     "tell me when", "send me a reminder"],
        "weight": 0.95,
    },
    "recurring": {
        "patterns": ["every day", "every week", "every month", "daily", "weekly",
                     "monthly", "each", "every other", "biweekly", "bimonthly"],
        "weight": 0.90,
    },
}

# =============================================================================
# ANTI-PATTERNS (NOT TASKS)
# =============================================================================

ANTI_PATTERNS = {
    "informational": {
        "patterns": ["explain", "describe", "tell me about", "what is", "how to",
                     "why is", "when did", "where is", "who is", "which one",
                     "define", "clarify", "elaborate on", "expand on"],
        "weight": -0.50,
    },
    "code_requests": {
        "patterns": ["write code", "write a function", "implement", "create a script",
                     "build an app", "develop", "program", "code in", "algorithm",
                     "binary search", "quick sort", "merge sort", "data structure"],
        "weight": -0.45,
    },
    "creative": {
        "patterns": ["write a story", "write a poem", "draw", "sketch", "design",
                     "create art", "make a logo", "compose", "produce"],
        "weight": -0.40,
    },
    "opinion": {
        "patterns": ["what do you think", "do you like", "do you prefer",
                     "which is better", "recommend", "suggest", "advise"],
        "weight": -0.35,
    },
    "greeting": {
        "patterns": ["hello", "hi", "hey", "good morning", "good afternoon",
                     "good evening", "good night", "what's up", "how are you"],
        "weight": -0.25,
    },
    "gratitude": {
        "patterns": ["thank you", "thanks", "thx", "appreciate it", "grateful"],
        "weight": -0.20,
    },
    "completion": {
        "patterns": ["already done", "finished", "completed", "took care of",
                     "just did", "already", "done that"],
        "weight": -0.60,  # Strong negative - definitely not a task
    },
}

# =============================================================================
# DOMAIN KEYWORDS
# =============================================================================

DOMAIN_KEYWORDS = {
    "household": {
        "keywords": ["home", "house", "apartment", "kitchen", "bathroom", "bedroom",
                     "living room", "garage", "garden", "yard", "laundry",
                     "dishes", "cooking", "cleaning", "groceries", "furniture",
                     "mother", "mom", "father", "dad", "parents", "family"],
        "weight": 1.0,
    },
    "personal": {
        "keywords": ["gym", "exercise", "workout", "run", "jog", "swim", "yoga",
                     "meditation", "doctor", "dentist", "hospital", "clinic",
                     "appointment", "checkup", "haircut", "grooming", "health"],
        "weight": 1.0,
    },
    "work": {
        "keywords": ["work", "office", "job", "career", "project", "client",
                     "meeting", "deadline", "report", "presentation", "boss",
                     "manager", "colleague", "team", "company", "business"],
        "weight": 1.0,
    },
    "education": {
        "keywords": ["school", "college", "university", "class", "course",
                     "assignment", "homework", "exam", "test", "quiz", "study",
                     "professor", "teacher", "student", "grade", "degree"],
        "weight": 1.0,
    },
    "finance": {
        "keywords": ["bank", "money", "payment", "bill", "invoice", "tax",
                     "insurance", "investment", "loan", "mortgage", "rent",
                     "salary", "budget", "expense", "income", "debt"],
        "weight": 1.0,
    },
    "errands": {
        "keywords": ["store", "shop", "market", "mall", "grocery", "pharmacy",
                     "post office", "bank", "dry cleaner", "gas station",
                     "pick up", "drop off", "deliver", "collect"],
        "weight": 1.0,
    },
    "social": {
        "keywords": ["friend", "friends", "party", "dinner", "lunch", "coffee",
                     "date", "wedding", "birthday", "anniversary", "celebration",
                     "event", "gathering", "reunion"],
        "weight": 1.0,
    },
    "health": {
        "keywords": ["medicine", "pill", "prescription", "vitamin", "supplement",
                     "therapy", "counseling", "mental health", "wellness",
                     "diet", "nutrition", "fasting"],
        "weight": 1.0,
    },
}

# =============================================================================
# COMMON TASK PHRASES
# =============================================================================

COMMON_TASK_PHRASES = [
    # Shopping
    "pick up milk", "get groceries", "buy food", "order takeout",
    "get gas", "fill up the tank", "car wash",
    
    # Household
    "do laundry", "fold clothes", "clean room", "wash dishes",
    "take out trash", "vacuum house", "mop floor",
    
    # Health
    "take medicine", "go to gym", "schedule dentist", "get haircut",
    "book appointment", "get checkup",
    
    # Work
    "send email", "finish report", "prepare presentation", "submit application",
    "update resume", "schedule meeting", "call client",
    
    # Finance
    "pay bill", "transfer money", "deposit check", "file taxes",
    "renew insurance", "pay rent", "pay credit card",
    
    # Social
    "call mom", "text friend", "wish happy birthday", "buy gift",
    "plan party", "make reservation", "book tickets",
    
    # Personal
    "read book", "watch movie", "learn skill", "practice instrument",
    "write journal", "meditate", "go for walk",
]

# =============================================================================
# EDGE CASES AND AMBIGUITIES
# =============================================================================

EDGE_CASES = {
    # Words that can be tasks or not depending on context
    "context_dependent": {
        "make": [("make dinner", True), ("make sense", False)],
        "get": [("get milk", True), ("get it", False)],
        "do": [("do homework", True), ("do well", False)],
        "take": [("take medicine", True), ("take it easy", False)],
        "run": [("run errands", True), ("run fast", False)],
        "check": [("check email", True), ("check this out", False)],
    },
    
    # False positives to watch for
    "false_positives": [
        "make sure",
        "make sense",
        "get it",
        "get going",
        "do it",
        "do so",
        "take care",
        "take it",
        "have fun",
        "have a",
    ],
    
    # Implicit tasks (no explicit action verb)
    "implicit_tasks": [
        "the meeting is at 3",
        "appointment tomorrow",
        "dentist on monday",
        "flight at 6pm",
        "conference next week",
    ],
}

# =============================================================================
# MULTILINGUAL SUPPORT (Common phrases in other languages)
# =============================================================================

MULTILINGUAL = {
    "spanish": {
        "reminder": ["recuérdame", "no olvides"],
        "task_indicators": ["tengo que", "necesito", "debo"],
    },
    "french": {
        "reminder": ["rappelle-moi", "n'oublie pas"],
        "task_indicators": ["je dois", "il faut que", "je dois"],
    },
    "german": {
        "reminder": ["erinnere mich", "vergiss nicht"],
        "task_indicators": ["ich muss", "ich sollte"],
    },
    "hindi": {
        "reminder": ["yaad dilana", "mat bhoolna"],
        "task_indicators": ["mujhe", "mujhe chahiye", "maine"],
    },
}

# =============================================================================
# CONFIDENCE THRESHOLDS
# =============================================================================

CONFIDENCE_THRESHOLDS = {
    "auto_create": 0.75,      # Automatically create task
    "suggest": 0.40,          # Suggest task but ask for confirmation
    "ignore": 0.20,           # Treat as conversational
}

# =============================================================================
# LEARNING/FALLBACK
# =============================================================================

def get_all_patterns():
    """Get all patterns for comprehensive matching"""
    all_patterns = []
    
    # Add temporal patterns
    for category in TEMPORAL_EXPRESSIONS.values():
        if isinstance(category, dict):
            for items in category.values():
                if isinstance(items, list):
                    all_patterns.extend(items)
        elif isinstance(category, list):
            all_patterns.extend(category)
    
    # Add action verbs
    for category in ACTION_VERBS.values():
        all_patterns.extend(category.get("verbs", []))
    
    # Add obligation patterns
    for level in OBLIGATION_PATTERNS.values():
        all_patterns.extend(level.get("patterns", []))
    
    # Add reminder keywords
    for category in REMINDER_KEYWORDS.values():
        all_patterns.extend(category.get("patterns", []))
    
    return list(set(all_patterns))


def get_patterns_by_domain(domain: str):
    """Get patterns specific to a domain"""
    return DOMAIN_KEYWORDS.get(domain, {}).get("keywords", [])


def get_action_verbs_by_category(category: str):
    """Get action verbs for a specific category"""
    return ACTION_VERBS.get(category, {}).get("verbs", [])
