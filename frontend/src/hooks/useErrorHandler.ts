import { useCallback } from 'react';
import { toast } from 'sonner';
import type { ApiError } from '@/types';

export function useErrorHandler() {
    const handleError = useCallback((error: ApiError | Error) => {
        if ('errors' in error && error.errors) {
            // Display field-specific errors
            Object.entries(error.errors).forEach(([field, messages]) => {
                toast.error(`${field}: ${messages.join(', ')}`);
            });
        } else {
            toast.error(error.message || 'An unexpected error occurred');
        }
    }, []);

    return { handleError };
}
