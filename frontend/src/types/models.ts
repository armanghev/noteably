// Core types matching backend Django models

export type JobStatus = 'queued' | 'transcribing' | 'generating' | 'completed' | 'failed';
export type MaterialType = 'summary' | 'notes' | 'flashcards' | 'quiz';

export interface JobOptions {
  summary_length?: 'short' | 'medium' | 'long';
  flashcard_count?: number;
  quiz_question_count?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
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
  difficulty?: 'easy' | 'medium' | 'hard';
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
  correctAnswer?: number; // Alternative field name
  explanation?: string;
}

export interface QuizContent {
  questions: QuizQuestion[];
}

// Job type matching Job model and JobSerializer
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
  error_message: string;
  retry_count: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  generated_content: GeneratedContent[];
}
