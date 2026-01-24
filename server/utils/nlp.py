"""Natural language processing utilities for task extraction"""
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from server.models import TaskDomain, TaskType


class TaskExtractor:
    """Extract structured task data from natural language"""
    
    # Domain keyword mappings
    DOMAIN_KEYWORDS = {
        TaskDomain.HOUSEHOLD: [
            'mother', 'father', 'home', 'house', 'kitchen', 'clean', 'wash',
            'cylinder', 'gas', 'electricity', 'water', 'repair', 'family'
        ],
        TaskDomain.PERSONAL: [
            'hair', 'doctor', 'gym', 'health', 'appointment', 'personal',
            'myself', 'grooming', 'exercise', 'sleep'
        ],
        TaskDomain.COLLEGE: [
            'assignment', 'assn', 'exam', 'test', 'lecture', 'class', 'study',
            'college', 'university', 'iitm', 'course', 'grade', 'submit',
            'week', 'quiz', 'project report'
        ],
        TaskDomain.FINANCE: [
            'pay', 'bill', 'rent', 'money', 'bank', 'loan', 'emi',
            'salary', 'expense', 'budget'
        ],
        TaskDomain.ERRANDS: [
            'buy', 'shop', 'purchase', 'get', 'pick up', 'drop',
            'market', 'store'
        ],
    }
    
    # Time pattern mappings
    TIME_PATTERNS = {
        r'today': {'days': 0},
        r'tomorrow': {'days': 1},
        r'day after tomorrow': {'days': 2},
        r'next (\d+) days?': lambda m: {'days': int(m.group(1))},
        r'in (\d+) days?': lambda m: {'days': int(m.group(1))},
        r'by (.+?)(?:$|\.|,)': lambda m: {'fuzzy': m.group(1).strip()},
        r'this week': {'days': 7},
        r'next week': {'days': 14},
        r'this month': {'days': 30},
        r'soon': {'fuzzy': 'soon'},
        r'urgent': {'days': 1},
        r'asap': {'days': 0},
    }
    
    # Person/entity patterns
    PERSON_PATTERNS = [
        r'(?:mother|mom|mum|ma) (?:asked|said|told)',
        r'(?:father|dad|papa) (?:asked|said|told)',
        r'(?:friend|colleague) (?:asked|said|told)',
        r'(?:professor|teacher) (?:asked|said|told)',
    ]
    
    def extract(self, text: str) -> Dict[str, Any]:
        """Extract structured task data from natural language text"""
        text_lower = text.lower()
        
        return {
            'title': self._extract_title(text),
            'description': text,
            'domain': self._extract_domain(text_lower),
            'task_type': self._extract_task_type(text_lower),
            'due_date': self._extract_due_date(text_lower),
            'due_fuzzy': self._extract_fuzzy_time(text_lower),
            'requested_by': self._extract_person(text_lower),
            'tags': self._extract_tags(text_lower),
        }
    
    def _extract_title(self, text: str) -> str:
        """Extract a concise title from the text"""
        # Remove common prefixes
        prefixes = [
            r'^(?:i need to|i have to|i must|i should|need to|have to|must|should)\s+',
            r'^(?:remind me to|remember to)\s+',
            r'^(?:mother|father|friend|professor) (?:asked|said|told) (?:me )?(?:to)?\s+',
        ]
        
        title = text
        for pattern in prefixes:
            title = re.sub(pattern, '', title, flags=re.IGNORECASE)
        
        # Truncate at time expressions
        time_markers = ['by next', 'by this', 'in the next', 'before', 'until']
        for marker in time_markers:
            if marker in title.lower():
                title = title[:title.lower().index(marker)].strip()
        
        # Capitalize first letter
        return title.strip().capitalize()
    
    def _extract_domain(self, text: str) -> TaskDomain:
        """Identify the task domain from keywords"""
        scores = {domain: 0 for domain in TaskDomain}
        
        for domain, keywords in self.DOMAIN_KEYWORDS.items():
            for keyword in keywords:
                if keyword in text:
                    scores[domain] += 1
        
        # Return domain with highest score, default to OTHER
        max_score = max(scores.values())
        if max_score > 0:
            return max(scores.items(), key=lambda x: x[1])[0]
        
        return TaskDomain.OTHER
    
    def _extract_task_type(self, text: str) -> TaskType:
        """Determine task type based on keywords"""
        if any(word in text for word in ['remind', 'reminder', 'every', 'recurring']):
            return TaskType.REMINDER
        elif any(word in text for word in ['soon', 'sometime', 'eventually', 'maybe']):
            return TaskType.SOFT_TASK
        elif any(word in text for word in ['later', 'waiting for', 'need to decide']):
            return TaskType.OPEN_LOOP
        else:
            return TaskType.TASK
    
    def _extract_due_date(self, text: str) -> Optional[datetime]:
        """Extract specific due date from time expressions"""
        now = datetime.utcnow()
        
        for pattern, result in self.TIME_PATTERNS.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                if callable(result):
                    time_info = result(match)
                else:
                    time_info = result
                
                if 'days' in time_info:
                    return now + timedelta(days=time_info['days'])
        
        return None
    
    def _extract_fuzzy_time(self, text: str) -> Optional[str]:
        """Extract fuzzy time expressions"""
        fuzzy_patterns = [
            'soon', 'sometime', 'eventually', 'this week', 'next week',
            'this month', 'next month', 'later'
        ]
        
        for pattern in fuzzy_patterns:
            if pattern in text:
                return pattern
        
        return None
    
    def _extract_person(self, text: str) -> Optional[str]:
        """Extract who requested the task"""
        person_map = {
            'mother': 'mother', 'mom': 'mother', 'mum': 'mother', 'ma': 'mother',
            'father': 'father', 'dad': 'father', 'papa': 'father',
            'friend': 'friend',
            'professor': 'professor', 'teacher': 'professor',
        }
        
        for key, value in person_map.items():
            if key in text:
                return value
        
        return None
    
    def _extract_tags(self, text: str) -> list[str]:
        """Extract relevant tags from text"""
        tags = []
        
        # Common task tags
        tag_keywords = {
            'urgent': ['urgent', 'asap', 'important', 'critical'],
            'recurring': ['every', 'recurring', 'weekly', 'daily'],
            'waiting': ['waiting', 'pending', 'blocked'],
        }
        
        for tag, keywords in tag_keywords.items():
            if any(keyword in text for keyword in keywords):
                tags.append(tag)
        
        return tags


# Singleton instance
task_extractor = TaskExtractor()
