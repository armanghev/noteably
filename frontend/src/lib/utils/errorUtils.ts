import type { ApiError } from '@/types';

/**
 * Format API error for display
 */
export function formatApiError(error: ApiError | Error): string {
    if ('errors' in error && error.errors) {
        // Format field-specific errors
        return Object.entries(error.errors)
            .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
            .join('; ');
    }
    return error.message || 'An unexpected error occurred';
}

/**
 * Check if error is an API error
 */
export function isApiError(error: unknown): error is ApiError {
    return (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as ApiError).message === 'string'
    );
}
