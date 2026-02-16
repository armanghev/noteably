// Core types matching backend Django models

export type JobStatus =
  | "uploading"
  | "queued"
  | "transcribing"
  | "extracting_text"
  | "generating_summary"
  | "generating_notes"
  | "generating_flashcards"
  | "generating_quiz"
  | "generating"
  | "completed"
  | "failed"
  | "cancelled";
// Note: Backend uses 'quiz' but API may return 'quizzes' - support both for compatibility
export type MaterialType =
  | "summary"
  | "notes"
  | "flashcards"
  | "quiz"
  | "quizzes";

export interface JobOptions {
  focus?: "general" | "exam" | "deep_dive" | "simple";
  language?: string;
  notes_style?: "standard" | "cornell" | "outline" | "qa";
  summary_format?: "bullets" | "paragraphs";
  summary_length?: "short" | "medium" | "detailed";
  quiz_question_count?: number;
  quiz_difficulty?: "easy" | "medium" | "hard";
  difficulty?: "easy" | "medium" | "hard";
  [key: string]: unknown;
}

// Generated Content types matching GeneratedContent model
export interface GeneratedContent {
  id: string;
  type: MaterialType;
  content: SummaryContent | NotesContent | FlashcardsContent | QuizContent;
  created_at: string;
}

// Content structures for each material type
export interface SummaryContent {
  title: string;
  summary: string;
  key_points?: string[];
}

export interface NotesContent {
  content: string;
  sections?: NoteSection[];
}

export interface NoteSection {
  heading: string;
  content: string;
  subsections?: NoteSection[];
}

export interface Flashcard {
  id?: string | number;
  front: string;
  back: string;
  difficulty?: "easy" | "medium" | "hard";
  tags?: string[];
}

export interface FlashcardsContent {
  flashcards: Flashcard[];
}

export interface QuizQuestion {
  id?: string | number;
  question: string;
  text?: string; // Alternative field name
  options: string[];
  correct_answer?: number;
  correctAnswer?: number; // Alternative field name (camelCase)
  correct_option?: number; // Alternative field name (snake_case variant)
  explanation?: string;
}

export interface QuizContent {
  questions: QuizQuestion[];
}

// Lightweight job type for list views (excludes heavy content fields)
export interface JobListItem {
  id: string;
  filename: string;
  file_type: string;
  status: JobStatus;
  progress: number;
  current_step: string;
  error_message: string;
  created_at: string;
  completed_at: string | null;
  flashcard_count: number;
  quiz_count: number;
  content_types: MaterialType[];
  summary_title: string;
  summary_preview: string;
}

// Word-level timestamp from transcription
export interface TranscriptionWord {
  text: string;
  start: number; // Start time in seconds
  end: number; // End time in seconds
  confidence: number;
}

// Full job type matching Job model and JobSerializer (for detail views)
export interface Job {
  id: string;
  user_id: string;
  filename: string;
  file_size_bytes: number;
  file_type: string;
  storage_url: string;
  material_types: MaterialType[];
  options: JobOptions;
  status: JobStatus;
  progress: number;
  current_step: string;
  transcription_text: string | null;
  transcription_words?: TranscriptionWord[] | null;
  error_message: string;
  retry_count: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  generated_content: GeneratedContent[];
}

// AI Assistant
export type AssistantAction =
  | null
  | "generate_flashcards"
  | "generate_quiz"
  | "quiz_me"
  | "generated_flashcards"
  | "generated_quiz";

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
  action?: AssistantAction;
  generatedItems?: Flashcard[] | QuizQuestion[];
}

export interface AssistantRequest {
  message: string;
  conversation_history: { role: string; content: string }[];
  action: AssistantAction;
}

export interface AssistantResponse {
  message: string;
  action: AssistantAction;
  generated_items: Flashcard[] | QuizQuestion[] | null;
}
