from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
from datetime import datetime
from difflib import SequenceMatcher

try:
    from server.models import Task, Message, Context
    from server.utils.route_logger import route_logger
except ImportError:
    from models import Task, Message, Context
    from utils.route_logger import route_logger

router = APIRouter()


def fuzzy_match_score(query: str, text: str) -> float:
    """Calculate fuzzy match score between query and text"""
    if not query or not text:
        return 0.0
    
    query_lower = query.lower()
    text_lower = text.lower()
    
    # Exact match gets highest score
    if query_lower == text_lower:
        return 1.0
    
    # Contains match gets high score
    if query_lower in text_lower:
        return 0.9
    
    # Word-by-word matching
    query_words = set(query_lower.split())
    text_words = set(text_lower.split())
    
    if query_words and text_words:
        common_words = query_words & text_words
        word_match_ratio = len(common_words) / len(query_words)
        if word_match_ratio > 0:
            return 0.7 * word_match_ratio
    
    # Sequence matching for typos and partial matches
    sequence_ratio = SequenceMatcher(None, query_lower, text_lower).ratio()
    
    return sequence_ratio * 0.6


class SearchResult:
    def __init__(self, item: Any, score: float, match_type: str):
        self.item = item
        self.score = score
        self.match_type = match_type


@router.get("/", response_model=Dict[str, Any])
@route_logger
async def search(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(20, le=100),
    include_tasks: bool = True,
    include_messages: bool = True,
    include_contexts: bool = True,
):
    """
    Fuzzy search across tasks, messages, and contexts.
    Returns results sorted by relevance score.
    """
    if not q.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty")
    
    query = q.strip()
    results = {
        "tasks": [],
        "messages": [],
        "contexts": [],
        "total": 0,
        "query": query,
    }
    
    # Search tasks
    if include_tasks:
        task_results = await search_tasks(query, limit)
        results["tasks"] = task_results
        results["total"] += len(task_results)
    
    # Search messages
    if include_messages:
        message_results = await search_messages(query, limit)
        results["messages"] = message_results
        results["total"] += len(message_results)
    
    # Search contexts (threads)
    if include_contexts:
        context_results = await search_contexts(query, limit)
        results["contexts"] = context_results
        results["total"] += len(context_results)
    
    return results


async def search_tasks(query: str, limit: int) -> List[Dict[str, Any]]:
    """Search tasks with fuzzy matching"""
    # Get all tasks (in production, you might want to add pagination)
    tasks = await Task.find().to_list()
    
    scored_tasks = []
    for task in tasks:
        # Calculate scores for different fields
        title_score = fuzzy_match_score(query, task.title) * 1.0  # Highest weight
        desc_score = fuzzy_match_score(query, task.description or "") * 0.8
        domain_score = fuzzy_match_score(query, task.domain.value) * 0.6
        tags_score = max(
            [fuzzy_match_score(query, tag) for tag in task.tags] or [0]
        ) * 0.7
        
        # Use the highest score
        max_score = max(title_score, desc_score, domain_score, tags_score)
        
        if max_score > 0.3:  # Threshold for relevance
            scored_tasks.append(SearchResult(task, max_score, "task"))
    
    # Sort by score descending
    scored_tasks.sort(key=lambda x: x.score, reverse=True)
    
    # Format results
    return [
        {
            "id": str(t.item.id),
            "title": t.item.title,
            "description": t.item.description,
            "domain": t.item.domain.value,
            "urgency": t.item.urgency.value,
            "completed": t.item.completed,
            "due_date": t.item.due_date.isoformat() if t.item.due_date else None,
            "due_fuzzy": t.item.due_fuzzy,
            "tags": t.item.tags,
            "score": round(t.score, 3),
            "match_type": t.match_type,
            "created_at": t.item.created_at.isoformat() if t.item.created_at else None,
        }
        for t in scored_tasks[:limit]
    ]


async def search_messages(query: str, limit: int) -> List[Dict[str, Any]]:
    """Search messages with fuzzy matching"""
    messages = await Message.find().to_list()
    
    scored_messages = []
    for msg in messages:
        content_score = fuzzy_match_score(query, msg.content)
        
        if content_score > 0.3:  # Threshold for relevance
            scored_messages.append(SearchResult(msg, content_score, "message"))
    
    # Sort by score descending
    scored_messages.sort(key=lambda x: x.score, reverse=True)
    
    # Format results
    return [
        {
            "id": str(m.item.id),
            "content": m.item.content,
            "role": m.item.role.value,
            "context_id": m.item.context_id,
            "parent_id": m.item.parent_id,
            "score": round(m.score, 3),
            "match_type": m.match_type,
            "created_at": m.item.created_at.isoformat() if m.item.created_at else None,
        }
        for m in scored_messages[:limit]
    ]


async def search_contexts(query: str, limit: int) -> List[Dict[str, Any]]:
    """Search contexts (threads) with fuzzy matching"""
    contexts = await Context.find().to_list()
    
    scored_contexts = []
    for ctx in contexts:
        # Calculate scores for different fields
        title_score = fuzzy_match_score(query, ctx.title) * 1.0
        desc_score = fuzzy_match_score(query, ctx.description or "") * 0.8
        summary_score = fuzzy_match_score(query, ctx.summary or "") * 0.7
        
        # Use the highest score
        max_score = max(title_score, desc_score, summary_score)
        
        if max_score > 0.3:  # Threshold for relevance
            scored_contexts.append(SearchResult(ctx, max_score, "context"))
    
    # Sort by score descending
    scored_contexts.sort(key=lambda x: x.score, reverse=True)
    
    # Format results
    return [
        {
            "id": str(c.item.id),
            "title": c.item.title,
            "description": c.item.description,
            "summary": c.item.summary,
            "parent_context_id": c.item.parent_context_id,
            "fork_type": c.item.fork_type.value if c.item.fork_type else None,
            "score": round(c.score, 3),
            "match_type": c.match_type,
            "created_at": c.item.created_at.isoformat() if c.item.created_at else None,
            "updated_at": c.item.updated_at.isoformat() if c.item.updated_at else None,
        }
        for c in scored_contexts[:limit]
    ]


@router.get("/suggestions", response_model=List[str])
@route_logger
async def get_search_suggestions(
    q: str = Query(..., min_length=1, description="Partial search query"),
    limit: int = Query(5, le=10),
):
    """Get search suggestions based on partial query"""
    query = q.strip().lower()
    suggestions = set()
    
    # Get task titles
    tasks = await Task.find().to_list()
    for task in tasks:
        if query in task.title.lower():
            suggestions.add(task.title)
    
    # Get context titles
    contexts = await Context.find().to_list()
    for ctx in contexts:
        if query in ctx.title.lower():
            suggestions.add(ctx.title)
    
    # Get unique tags
    for task in tasks:
        for tag in task.tags:
            if query in tag.lower():
                suggestions.add(f"tag:{tag}")
    
    return list(suggestions)[:limit]
