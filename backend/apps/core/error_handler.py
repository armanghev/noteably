"""Error handling utilities and retry logic."""

import logging
import time
from functools import wraps
from typing import Any, Callable, Optional

from .exceptions import (
    AssemblyAIError,
    DownloadError,
    GeminiError,
    NoteablyException,
    RateLimitError,
    TranscriptionTimeoutError,
    UploadError,
)

logger = logging.getLogger(__name__)


def exponential_backoff(
    attempt: int, base_delay: float = 1.0, max_delay: float = 60.0
) -> float:
    """
    Calculate exponential backoff delay.

    Args:
        attempt: Current retry attempt (0-indexed)
        base_delay: Base delay in seconds
        max_delay: Maximum delay in seconds

    Returns:
        Delay in seconds
    """
    delay = base_delay * (2**attempt)
    return min(delay, max_delay)


def is_retryable_error(exception: Exception) -> bool:
    """
    Determine if an exception should trigger a retry.

    Args:
        exception: The exception to check

    Returns:
        True if error is retryable
    """
    if isinstance(exception, NoteablyException):
        return getattr(exception.__class__, "retryable", False)

    # Network/timeout errors are generally retryable
    if isinstance(exception, (TimeoutError, ConnectionError)):
        return True

    return False


def get_max_retries(exception: Exception) -> int:
    """
    Get maximum retry attempts for an exception type.

    Args:
        exception: The exception to check

    Returns:
        Maximum number of retries
    """
    if isinstance(exception, NoteablyException):
        return getattr(exception.__class__, "max_retries", 3)

    return 3


def retry_with_backoff(
    max_attempts: int = 3,
    base_delay: float = 1.0,
    exceptions: tuple = (Exception,),
    on_retry: Optional[Callable] = None,
):
    """
    Decorator to retry a function with exponential backoff.

    Args:
        max_attempts: Maximum number of attempts
        base_delay: Base delay between retries
        exceptions: Tuple of exception types to catch
        on_retry: Optional callback function called on each retry

    Usage:
        @retry_with_backoff(max_attempts=3)
        def upload_file(file):
            # ... upload logic
            pass
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            attempt = 0
            last_exception = None

            while attempt < max_attempts:
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e

                    # Check if error is retryable
                    if not is_retryable_error(e):
                        logger.error(
                            f"{func.__name__} failed with non-retryable error: {e}"
                        )
                        raise

                    attempt += 1

                    if attempt >= max_attempts:
                        logger.error(
                            f"{func.__name__} failed after {max_attempts} attempts: {e}",
                            extra={
                                "exception": e,
                                "func_args": args,
                                "func_kwargs": kwargs,
                            },
                        )
                        raise

                    delay = exponential_backoff(attempt - 1, base_delay)
                    logger.warning(
                        f"{func.__name__} attempt {attempt} failed: {e}. "
                        f"Retrying in {delay:.2f}s...",
                        extra={"attempt": attempt, "delay": delay},
                    )

                    # Call retry callback if provided
                    if on_retry:
                        on_retry(attempt, delay, e)

                    time.sleep(delay)

            # This should never be reached, but just in case
            raise last_exception

        return wrapper

    return decorator


class ErrorContext:
    """Context manager for capturing and enriching errors with additional context."""

    def __init__(self, operation: str, **context):
        """
        Initialize error context.

        Args:
            operation: Description of operation being performed
            **context: Additional context to attach to errors
        """
        self.operation = operation
        self.context = context

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            logger.error(
                f"Error during {self.operation}: {exc_val}",
                extra={"operation": self.operation, **self.context},
                exc_info=True,
            )
        return False  # Don't suppress the exception


def handle_error(error: Exception, context: dict = None) -> dict:
    """
    Classify error and determine appropriate action.

    Args:
        error: The exception that occurred
        context: Additional context about the error

    Returns:
        Dictionary with action, message, and retry information
    """
    context = context or {}

    # Rate limit errors
    if isinstance(error, RateLimitError):
        return {
            "action": "retry",
            "delay": getattr(error, "retry_after", 60),
            "message": "API rate limit exceeded",
            "retryable": True,
        }

    # Timeout errors
    if isinstance(error, (TranscriptionTimeoutError, TimeoutError)):
        return {
            "action": "retry",
            "delay": exponential_backoff(context.get("attempt", 0)),
            "message": "Operation timed out",
            "retryable": True,
        }

    # API errors (retryable)
    if isinstance(error, (AssemblyAIError, GeminiError)):
        return {
            "action": "retry",
            "delay": exponential_backoff(context.get("attempt", 0)),
            "message": str(error),
            "retryable": True,
            "max_attempts": get_max_retries(error),
        }

    # Storage errors (retryable)
    if isinstance(error, (UploadError, DownloadError)):
        return {
            "action": "retry",
            "delay": exponential_backoff(context.get("attempt", 0)),
            "message": str(error),
            "retryable": True,
            "max_attempts": 3,
        }

    # Non-retryable errors
    if isinstance(error, NoteablyException) and not is_retryable_error(error):
        return {
            "action": "fail",
            "message": str(error),
            "retryable": False,
            "status_code": getattr(error.__class__, "status_code", 500),
        }

    # Unknown errors - retry once
    logger.error(f"Unexpected error: {error}", extra=context, exc_info=True)
    return {
        "action": "retry",
        "delay": 5,
        "message": "An unexpected error occurred",
        "retryable": True,
        "max_attempts": 1,
    }
