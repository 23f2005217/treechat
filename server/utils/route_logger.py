"""
Route Logging Decorator

Provides a decorator to wrap route handlers with:
- Entry/exit logging
- Exception handling and logging
- Performance timing
- Request/response logging
"""

import functools
import time
import traceback
from typing import Callable, Any
from fastapi import Request, HTTPException
from server.logger import Logger


def route_logger(func: Callable) -> Callable:
    """
    Decorator that adds logging and error handling to route handlers.
    
    Logs:
    - Route entry with controller name and function name
    - Request details
    - Execution time
    - Success/failure status
    - Any exceptions with full traceback
    
    Usage:
        @router.get("/api/something")
        @route_logger
        async def get_something():
            ...
    """
    # Get the module name for the logger (e.g., "chat", "tasks", etc.)
    module_name = func.__module__.split(".")[-1]  # e.g., "routes.chat" -> "chat"
    logger = Logger.get(f"routes.{module_name}")
    
    @functools.wraps(func)
    async def async_wrapper(*args, **kwargs) -> Any:
        route_name = f"{module_name}.{func.__name__}"
        start_time = time.time()
        
        # Log entry
        logger.info(f"[ENTRY] {route_name}")
        
        # Extract request info if available
        request = None
        for arg in args:
            if isinstance(arg, Request):
                request = arg
                break
        
        if request:
            logger.info(f"[REQUEST] {request.method} {request.url.path}")
        
        try:
            # Execute the route handler
            result = await func(*args, **kwargs)
            
            # Calculate execution time
            execution_time = (time.time() - start_time) * 1000  # ms
            
            # Log success
            logger.info(f"[SUCCESS] {route_name} - {execution_time:.2f}ms")
            
            return result
            
        except HTTPException as e:
            # Log HTTP exceptions (expected errors like 404, 400, etc.)
            execution_time = (time.time() - start_time) * 1000
            logger.warning(
                f"[HTTP_ERROR] {route_name} - {execution_time:.2f}ms - "
                f"Status: {e.status_code} - Detail: {e.detail}"
            )
            raise  # Re-raise to let FastAPI handle it
            
        except Exception as e:
            # Log unexpected exceptions with full traceback
            execution_time = (time.time() - start_time) * 1000
            error_msg = str(e)
            tb = traceback.format_exc()
            
            logger.error(
                f"[EXCEPTION] {route_name} - {execution_time:.2f}ms\n"
                f"Error: {error_msg}\n"
                f"Traceback:\n{tb}"
            )
            
            # Re-raise as HTTP 500
            raise HTTPException(
                status_code=500,
                detail=f"Internal server error: {error_msg}"
            )
    
    @functools.wraps(func)
    def sync_wrapper(*args, **kwargs) -> Any:
        route_name = f"{module_name}.{func.__name__}"
        start_time = time.time()
        
        # Log entry
        logger.info(f"[ENTRY] {route_name}")
        
        # Extract request info if available
        request = None
        for arg in args:
            if isinstance(arg, Request):
                request = arg
                break
        
        if request:
            logger.info(f"[REQUEST] {request.method} {request.url.path}")
        
        try:
            # Execute the route handler
            result = func(*args, **kwargs)
            
            # Calculate execution time
            execution_time = (time.time() - start_time) * 1000  # ms
            
            # Log success
            logger.info(f"[SUCCESS] {route_name} - {execution_time:.2f}ms")
            
            return result
            
        except HTTPException as e:
            # Log HTTP exceptions
            execution_time = (time.time() - start_time) * 1000
            logger.warning(
                f"[HTTP_ERROR] {route_name} - {execution_time:.2f}ms - "
                f"Status: {e.status_code} - Detail: {e.detail}"
            )
            raise
            
        except Exception as e:
            # Log unexpected exceptions
            execution_time = (time.time() - start_time) * 1000
            error_msg = str(e)
            tb = traceback.format_exc()
            
            logger.error(
                f"[EXCEPTION] {route_name} - {execution_time:.2f}ms\n"
                f"Error: {error_msg}\n"
                f"Traceback:\n{tb}"
            )
            
            raise HTTPException(
                status_code=500,
                detail=f"Internal server error: {error_msg}"
            )
    
    # Return appropriate wrapper based on whether function is async
    if asyncio.iscoroutinefunction(func):
        return async_wrapper
    return sync_wrapper


# Import asyncio here to avoid circular import issues
import asyncio