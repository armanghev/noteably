import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, loading, profileCompleted } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen p-6">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Redirect to profile completion if profile is not completed
    // (but don't redirect if we're already on the complete-profile page)
    if (!profileCompleted && location.pathname !== '/complete-profile') {
        return <Navigate to="/complete-profile" replace />;
    }

    return <>{children}</>;
}
