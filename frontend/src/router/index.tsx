import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { ROUTES } from './routes';

// Import pages
import LandingPage from '@/pages/LandingPage';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import StudySets from '@/pages/StudySets';
import StudySetDetail from '@/pages/StudySetDetail';
import Notes from '@/pages/Notes';
import NoteDetail from '@/pages/NoteDetail';
import Flashcards from '@/pages/Flashcards';
import FlashcardDeck from '@/pages/FlashcardDeck';
import Quizzes from '@/pages/Quizzes';
import QuizDetail from '@/pages/QuizDetail';
import Upload from '@/pages/Upload';
import Profile from '@/pages/Profile';

export const router = createBrowserRouter([
    {
        path: ROUTES.HOME,
        element: <LandingPage />,
    },
    {
        path: ROUTES.LOGIN,
        element: <Login />,
    },
    // Protected routes
    {
        element: (
            <ProtectedRoute>
                <Outlet />
            </ProtectedRoute>
        ),
        children: [
            {
                path: ROUTES.DASHBOARD,
                element: <Dashboard />,
            },
            {
                path: ROUTES.STUDY_SETS,
                element: <StudySets />,
            },
            {
                path: ROUTES.STUDY_SETS_DETAIL,
                element: <StudySetDetail />,
            },
            {
                path: ROUTES.UPLOAD,
                element: <Upload />,
            },
            {
                path: ROUTES.PROFILE,
                element: <Profile />,
            },
            {
                path: ROUTES.NOTES,
                element: <Notes />,
            },
            {
                path: ROUTES.NOTES_DETAIL,
                element: <NoteDetail />,
            },
            {
                path: ROUTES.FLASHCARDS,
                element: <Flashcards />,
            },
            {
                path: ROUTES.FLASHCARDS_DECK,
                element: <FlashcardDeck />,
            },
            {
                path: ROUTES.QUIZZES,
                element: <Quizzes />,
            },
            {
                path: ROUTES.QUIZZES_DETAIL,
                element: <QuizDetail />,
            },
        ],
    },
    {
        path: '*',
        element: <Navigate to={ROUTES.HOME} replace />,
    },
]);
