import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { ROUTES } from "./routes";

// Import pages
import Dashboard from "@/pages/Dashboard";
import FlashcardDeck from "@/pages/FlashcardDeck";
import Flashcards from "@/pages/Flashcards";
import LandingPage from "@/pages/LandingPage";
import Login from "@/pages/Login";
import NoteDetail from "@/pages/NoteDetail";
import Notes from "@/pages/Notes";
import Profile from "@/pages/Profile";
import QuizDetail from "@/pages/QuizDetail";
import Quizzes from "@/pages/Quizzes";
import Signup from "@/pages/Signup";
import CompleteProfile from "@/pages/CompleteProfile";
import StudySetDetail from "@/pages/StudySetDetail";
import StudySets from "@/pages/StudySets";
import Upload from "@/pages/Upload";

export const router = createBrowserRouter([
  {
    path: ROUTES.HOME,
    element: <LandingPage />,
  },
  {
    path: ROUTES.LOGIN,
    element: <Login />,
  },
  {
    path: ROUTES.SIGNUP,
    element: <Signup />,
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
        path: ROUTES.COMPLETE_PROFILE,
        element: <CompleteProfile />,
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
    path: "*",
    element: <Navigate to={ROUTES.HOME} replace />,
  },
]);
