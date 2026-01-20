import { useNavigate, useLocation } from 'react-router-dom';

interface UseBackNavigationOptions {
  defaultPath: string;
  defaultLabel?: string;
}

export function useBackNavigation({ defaultPath, defaultLabel }: UseBackNavigationOptions) {
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we have a 'from' state in location (set when navigating programmatically)
  const from = (location.state as { from?: string })?.from;

  const handleBack = () => {
    // If we have a 'from' state, use it (most reliable)
    if (from) {
      navigate(from);
      return;
    }
    
    // Try to go back in browser history
    // React Router will handle this gracefully
    try {
      navigate(-1);
    } catch {
      // If going back fails, fall back to default path
      navigate(defaultPath);
    }
  };

  // Determine the label based on where we're going back to
  const getBackLabel = () => {
    if (from) {
      // Extract a friendly label from the path
      const pathParts = from.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1];
        // Handle special cases
        if (lastPart === 'dashboard') {
          return 'Back to Dashboard';
        }
        if (lastPart === 'study-sets') {
          return 'Back to Study Sets';
        }
        if (lastPart === 'notes') {
          return 'Back to Notes';
        }
        if (lastPart === 'flashcards') {
          return 'Back to Decks';
        }
        if (lastPart === 'quizzes') {
          return 'Back to Quizzes';
        }
        if (lastPart === 'upload') {
          return 'Back to Upload';
        }
        // Generic formatting for other paths
        return `Back to ${lastPart.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ')}`;
      }
    }
    return defaultLabel || 'Back';
  };

  return {
    handleBack,
    backLabel: getBackLabel(),
  };
}
