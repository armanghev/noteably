// Re-export all types from specialized modules
export * from './models';
export * from './api';
export * from './components';

// Common API types
export interface ApiError {
    message: string;
    errors?: Record<string, string[]>;
    status?: number;
}

// Auth request types
export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    username?: string;
    password_confirm?: string;
}
