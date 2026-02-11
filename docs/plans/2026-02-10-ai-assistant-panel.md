# AI Assistant Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a slide-in AI assistant panel to all study set detail pages that can answer questions, quiz the user, and generate + save new flashcards/quizzes using full transcript context.

**Architecture:** New `POST /api/content/<job_id>/assistant/` endpoint in the Django `generation` app fetches transcript + generated content from the DB and calls Gemini with the full context. The frontend `AssistantPanel` component uses a `useAssistant` hook and renders on `FlashcardDeck`, `QuizDetail`, `NoteDetail`, and `StudySetDetail` pages. Conversation history is kept in React state (not persisted).

**Tech Stack:** Django REST Framework, Google Gemini 2.0 Flash, React, TanStack Query, Tailwind CSS, Lucide icons, Framer Motion (already installed for FlashcardDeck)

---

## Task 1: Backend — Assistant Chat View (basic Q&A)

**Files:**
- Modify: `backend/apps/generation/views.py`
- Modify: `backend/apps/generation/urls.py`
- Modify: `backend/apps/generation/prompts.py`
- Test: `backend/apps/generation/tests.py`

### Step 1: Write the failing test

Open `backend/apps/generation/tests.py` and add:

```python
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.urls import reverse
from apps.ingestion.models import Job
from apps.transcription.models import Transcription
from apps.generation.models import GeneratedContent
import uuid


class AssistantChatViewTest(TestCase):
    def setUp(self):
        self.user_id = uuid.uuid4()
        self.job = Job.objects.create(
            user_id=self.user_id,
            filename="lecture.mp3",
            file_size_bytes=1000,
            file_type="audio/mpeg",
            storage_url="https://example.com/file.mp3",
            material_types=["flashcards"],
            status="completed",
        )
        self.transcription = Transcription.objects.create(
            job=self.job,
            external_id="test-123",
            text="Photosynthesis is the process by which plants convert light into food.",
        )
        GeneratedContent.objects.create(
            job=self.job,
            type="flashcards",
            content={"flashcards": [{"front": "What is photosynthesis?", "back": "Converting light to food"}]},
        )

    def _make_request(self, data, user_id=None):
        """Helper: POST to assistant endpoint with auth header."""
        from django.test import RequestFactory
        from apps.generation.views import assistant_chat
        from rest_framework.test import APIRequestFactory

        factory = APIRequestFactory()
        request = factory.post(
            f"/api/content/{self.job.id}/assistant/",
            data,
            format="json",
        )
        request.user_id = user_id or self.user_id
        return assistant_chat(request, job_id=self.job.id)

    @patch("apps.generation.views.GeminiService")
    def test_basic_chat_returns_message(self, mock_gemini):
        mock_client = MagicMock()
        mock_client.generate_content.return_value = {"message": "Photosynthesis converts light to energy."}
        mock_gemini.chat.return_value = mock_client

        # Patch at the right level - the assistant_chat view calls Gemini directly
        with patch("apps.generation.views.genai") as mock_genai:
            mock_response = MagicMock()
            mock_response.text = "Photosynthesis converts light to energy."
            mock_genai.Client.return_value.models.generate_content.return_value = mock_response

            response = self._make_request({
                "message": "Explain photosynthesis",
                "conversation_history": [],
                "action": None,
            })

        self.assertEqual(response.status_code, 200)
        self.assertIn("message", response.data)
        self.assertIsNone(response.data["action"])
        self.assertIsNone(response.data["generated_items"])

    def test_returns_404_for_wrong_user(self):
        wrong_user = uuid.uuid4()
        response = self._make_request(
            {"message": "hello", "conversation_history": [], "action": None},
            user_id=wrong_user,
        )
        self.assertEqual(response.status_code, 404)

    def test_returns_400_for_missing_message(self):
        response = self._make_request({"conversation_history": [], "action": None})
        self.assertEqual(response.status_code, 400)
```

### Step 2: Run test to verify it fails

```bash
cd backend && source venv/bin/activate
python manage.py test apps.generation.tests.AssistantChatViewTest -v 2
```
Expected: FAIL with `AttributeError: module 'apps.generation.views' has no attribute 'assistant_chat'`

### Step 3: Add the assistant prompt to prompts.py

Add this function at the bottom of `backend/apps/generation/prompts.py`:

```python
def get_assistant_system_prompt(transcript: str, generated_content: dict) -> str:
    """Build system prompt with full study set context for the AI assistant."""
    context_parts = [
        "You are a helpful study assistant. The user is studying the following material.",
        "",
        "=== SOURCE TRANSCRIPT ===",
        transcript[:400000],  # Guard: cap at ~400K chars
        "",
    ]

    if generated_content.get("summary"):
        summary = generated_content["summary"]
        context_parts += [
            "=== SUMMARY ===",
            f"Title: {summary.get('title', '')}",
            summary.get("summary", ""),
            "",
        ]

    if generated_content.get("notes"):
        notes = generated_content["notes"]
        context_parts += [
            "=== STUDY NOTES ===",
            notes.get("content", ""),
            "",
        ]

    if generated_content.get("flashcards"):
        cards = generated_content["flashcards"].get("flashcards", [])
        cards_text = "\n".join(f"Q: {c['front']}\nA: {c['back']}" for c in cards[:50])
        context_parts += [
            "=== EXISTING FLASHCARDS ===",
            cards_text,
            "",
        ]

    if generated_content.get("quiz"):
        questions = generated_content["quiz"].get("questions", [])
        q_text = "\n".join(f"Q: {q['question']}" for q in questions[:20])
        context_parts += [
            "=== EXISTING QUIZ QUESTIONS ===",
            q_text,
            "",
        ]

    context_parts += [
        "=== INSTRUCTIONS ===",
        "Answer the user's questions based on the material above.",
        "Be concise, accurate, and helpful.",
        "If asked to generate flashcards or a quiz, you will be called with a specific action instead.",
        "For 'quiz me' requests, pick 3-5 questions from the existing quiz/flashcards and ask them one at a time.",
    ]

    return "\n".join(context_parts)
```

### Step 4: Implement assistant_chat view in views.py

Add these imports at the top of `backend/apps/generation/views.py`:

```python
import logging
from django.conf import settings
from google import genai
from google.genai import types as genai_types
```

Then add the view function:

```python
logger = logging.getLogger(__name__)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def assistant_chat(request, job_id):
    """
    AI assistant chat endpoint. Accepts a message + conversation history,
    returns an assistant response. Optionally generates and saves content.
    """
    try:
        job = Job.objects.get(id=job_id, user_id=request.user_id)
    except Job.DoesNotExist:
        return Response({"error": "Job not found"}, status=status.HTTP_404_NOT_FOUND)

    message = request.data.get("message")
    if not message:
        return Response({"error": "message is required"}, status=status.HTTP_400_BAD_REQUEST)

    conversation_history = request.data.get("conversation_history", [])[-10:]  # Cap at 10 turns
    action = request.data.get("action")  # null | "generate_flashcards" | "generate_quiz" | "quiz_me"

    # --- Build context ---
    try:
        transcript = job.transcription.text
    except Exception:
        transcript = ""

    generated_content = {}
    for item in GeneratedContent.objects.filter(job=job):
        key = "quiz" if item.type == "quizzes" else item.type
        generated_content[key] = item.content

    # --- Handle generation actions ---
    if action in ("generate_flashcards", "generate_quiz"):
        return _handle_generation_action(job, action, transcript, generated_content)

    # --- Build Gemini conversation ---
    from .prompts import get_assistant_system_prompt

    system_prompt = get_assistant_system_prompt(transcript, generated_content)

    contents = []
    for turn in conversation_history:
        role = "user" if turn.get("role") == "user" else "model"
        contents.append({"role": role, "parts": [{"text": turn.get("content", "")}]})
    contents.append({"role": "user", "parts": [{"text": message}]})

    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=contents,
            config=genai_types.GenerateContentConfig(
                system_instruction=system_prompt,
            ),
        )
        reply = response.text
    except Exception as e:
        logger.error(f"Assistant Gemini call failed: {e}")
        return Response(
            {"error": "Assistant is unavailable. Please try again."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    return Response({
        "message": reply,
        "action": None,
        "generated_items": None,
    })


def _handle_generation_action(job, action, transcript, generated_content):
    """Generate and save new flashcards or quiz questions."""
    from .service import GeminiService

    content_type = "flashcards" if action == "generate_flashcards" else "quiz"

    try:
        new_content = GeminiService.generate_content(transcript, content_type)
    except Exception as e:
        logger.error(f"Assistant generation failed: {e}")
        return Response(
            {"error": "Generation failed. Please try again."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    # Append to existing content (unique_together constraint means one record per type)
    existing, _ = GeneratedContent.objects.get_or_create(
        job=job,
        type=content_type,
        defaults={"content": new_content},
    )
    if _.is_created if hasattr(_, 'is_created') else False:
        pass  # Already set by defaults
    else:
        # Merge new items into existing
        if content_type == "flashcards":
            existing_cards = existing.content.get("flashcards", [])
            new_cards = new_content.get("flashcards", [])
            existing.content = {"flashcards": existing_cards + new_cards}
        else:  # quiz
            existing_questions = existing.content.get("questions", [])
            new_questions = new_content.get("questions", [])
            existing.content = {"questions": existing_questions + new_questions}
        existing.save(update_fields=["content"])

    # Update job cache
    job.update_content_cache()

    generated_items = (
        new_content.get("flashcards", []) if content_type == "flashcards"
        else new_content.get("questions", [])
    )
    action_done = "generated_flashcards" if content_type == "flashcards" else "generated_quiz"
    count = len(generated_items)
    noun = "flashcards" if content_type == "flashcards" else "quiz questions"

    return Response({
        "message": f"I generated {count} new {noun} and saved them to your study set.",
        "action": action_done,
        "generated_items": generated_items,
    })
```

**Note:** The `get_or_create` pattern above has a bug — fix the defaults handling. Replace the `get_or_create` block with:

```python
    try:
        existing = GeneratedContent.objects.get(job=job, type=content_type)
        # Merge into existing record
        if content_type == "flashcards":
            existing_cards = existing.content.get("flashcards", [])
            new_cards = new_content.get("flashcards", [])
            existing.content = {"flashcards": existing_cards + new_cards}
        else:
            existing_questions = existing.content.get("questions", [])
            new_questions = new_content.get("questions", [])
            existing.content = {"questions": existing_questions + new_questions}
        existing.save(update_fields=["content"])
    except GeneratedContent.DoesNotExist:
        GeneratedContent.objects.create(job=job, type=content_type, content=new_content)
```

### Step 5: Register the URL

Add to `backend/apps/generation/urls.py`:

```python
urlpatterns = [
    path("content/<uuid:job_id>/", views.get_job_content, name="get_job_content"),
    path("content/<uuid:job_id>/assistant/", views.assistant_chat, name="assistant_chat"),
    path("quizzes/<uuid:job_id>/attempts/", views.quiz_attempts, name="quiz_attempts"),
]
```

### Step 6: Run tests to verify they pass

```bash
python manage.py test apps.generation.tests.AssistantChatViewTest -v 2
```
Expected: All 3 tests PASS

### Step 7: Commit

```bash
git add backend/apps/generation/views.py backend/apps/generation/urls.py backend/apps/generation/prompts.py backend/apps/generation/tests.py
git commit -m "feat: add AI assistant chat endpoint with full context retrieval"
```

---

## Task 2: Frontend — Types + API Service

**Files:**
- Modify: `frontend/src/types/models.ts`
- Modify: `frontend/src/lib/api/services/content.ts`
- Modify: `frontend/src/lib/api/services/index.ts`

### Step 1: Add assistant types to models.ts

Append to `frontend/src/types/models.ts`:

```typescript
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
```

### Step 2: Add assistantChat to content service

Replace `frontend/src/lib/api/services/content.ts` with:

```typescript
import apiClient from '../client';
import type { ContentResponse } from '@/types';
import type { AssistantRequest, AssistantResponse } from '@/types/models';

export const contentService = {
  getJobContent: async (jobId: string): Promise<ContentResponse> => {
    const response = await apiClient.get<ContentResponse>(`/content/${jobId}/`);
    return response.data;
  },

  assistantChat: async (jobId: string, data: AssistantRequest): Promise<AssistantResponse> => {
    const response = await apiClient.post<AssistantResponse>(
      `/content/${jobId}/assistant/`,
      data,
    );
    return response.data;
  },
};
```

### Step 3: Commit

```bash
git add frontend/src/types/models.ts frontend/src/lib/api/services/content.ts
git commit -m "feat: add assistant types and API service method"
```

---

## Task 3: Frontend — useAssistant Hook

**Files:**
- Create: `frontend/src/hooks/useAssistant.ts`

### Step 1: Create the hook

```typescript
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { contentService } from '@/lib/api/services/content';
import { contentKeys } from '@/hooks/useContent';
import type { AssistantMessage, AssistantAction } from '@/types/models';

export function useAssistant(jobId: string) {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(
    async (text: string, action: AssistantAction = null) => {
      if (!text.trim() && !action) return;

      const userMessage: AssistantMessage = { role: 'user', content: text };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      // Build history (last 10 turns, exclude current message)
      const history = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        const response = await contentService.assistantChat(jobId, {
          message: text,
          conversation_history: history,
          action,
        });

        const assistantMessage: AssistantMessage = {
          role: 'assistant',
          content: response.message,
          action: response.action,
          generatedItems: response.generated_items ?? undefined,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Invalidate content cache if new items were generated
        if (
          response.action === 'generated_flashcards' ||
          response.action === 'generated_quiz'
        ) {
          queryClient.invalidateQueries({ queryKey: contentKeys.detail(jobId) });
        }
      } catch (err) {
        const errorMessage: AssistantMessage = {
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [jobId, messages, queryClient],
  );

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, isLoading, sendMessage, clearMessages };
}
```

### Step 2: Commit

```bash
git add frontend/src/hooks/useAssistant.ts
git commit -m "feat: add useAssistant hook for managing assistant chat state"
```

---

## Task 4: Frontend — AssistantPanel Component

**Files:**
- Create: `frontend/src/components/assistant/AssistantPanel.tsx`

### Step 1: Create the component

```tsx
import { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAssistant } from '@/hooks/useAssistant';
import type { AssistantMessage } from '@/types/models';
import ReactMarkdown from 'react-markdown';

const QUICK_ACTIONS = [
  { label: 'Quiz me', action: 'quiz_me' as const, message: 'Quiz me on this material.' },
  { label: 'Explain this', action: null as const, message: 'Give me a brief overview of the key concepts in this material.' },
  { label: '+ Flashcards', action: 'generate_flashcards' as const, message: 'Generate new flashcards from this material.' },
  { label: '+ Quiz', action: 'generate_quiz' as const, message: 'Generate a new quiz from this material.' },
];

function MessageBubble({ msg }: { msg: AssistantMessage }) {
  const isUser = msg.role === 'user';
  const hasGenerated =
    msg.action === 'generated_flashcards' || msg.action === 'generated_quiz';
  const itemCount = msg.generatedItems?.length ?? 0;
  const noun = msg.action === 'generated_flashcards' ? 'flashcards' : 'quiz questions';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted text-foreground rounded-bl-sm'
        }`}
      >
        {isUser ? (
          <p>{msg.content}</p>
        ) : (
          <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none">
            {msg.content}
          </ReactMarkdown>
        )}
        {hasGenerated && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {itemCount} {noun} saved to study set
          </div>
        )}
      </div>
    </div>
  );
}

interface AssistantPanelProps {
  jobId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AssistantPanel({ jobId, isOpen, onClose }: AssistantPanelProps) {
  const { messages, isLoading, sendMessage } = useAssistant(jobId);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput('');
  };

  const handleQuickAction = (action: typeof QUICK_ACTIONS[0]) => {
    if (isLoading) return;
    sendMessage(action.message, action.action);
  };

  return (
    <>
      {/* Backdrop (mobile only) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`
          fixed z-50 bg-background border-border shadow-xl flex flex-col
          transition-transform duration-300 ease-in-out
          /* Mobile: bottom sheet */
          bottom-0 left-0 right-0 rounded-t-2xl border-t h-[70vh]
          md:h-auto
          /* Desktop: right slide-over */
          md:top-0 md:right-0 md:bottom-0 md:left-auto md:w-[400px] md:rounded-none md:border-l md:border-t-0
          ${isOpen ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm text-foreground">AI Assistant</span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 px-4 py-3 border-b border-border overflow-x-auto flex-shrink-0 scrollbar-hide">
          {QUICK_ACTIONS.map((qa) => (
            <button
              key={qa.label}
              onClick={() => handleQuickAction(qa)}
              disabled={isLoading}
              className="flex-shrink-0 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
            >
              {qa.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Sparkles className="w-8 h-8 mb-3 opacity-30" />
              <p className="text-sm">Ask anything about this study set,<br />or use a quick action above.</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}
          {isLoading && (
            <div className="flex justify-start mb-3">
              <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 px-4 py-3 border-t border-border flex-shrink-0"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={isLoading}
            className="flex-1 bg-muted rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground disabled:opacity-50"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="h-8 w-8 rounded-full flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </form>
      </div>
    </>
  );
}
```

### Step 2: Create the trigger button component

Add `AssistantTriggerButton` at the bottom of the same file:

```tsx
interface AssistantTriggerButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export function AssistantTriggerButton({ onClick, isOpen }: AssistantTriggerButtonProps) {
  if (isOpen) return null;
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors text-sm font-medium"
    >
      <Sparkles className="w-4 h-4" />
      <span className="hidden sm:inline">Ask AI</span>
    </button>
  );
}
```

### Step 3: Commit

```bash
git add frontend/src/components/assistant/
git commit -m "feat: add AssistantPanel and AssistantTriggerButton components"
```

---

## Task 5: Frontend — Integrate into Study Set Pages

**Files:**
- Modify: `frontend/src/pages/FlashcardDeck.tsx`
- Modify: `frontend/src/pages/QuizDetail.tsx`
- Modify: `frontend/src/pages/NoteDetail.tsx`
- Modify: `frontend/src/pages/StudySetDetail.tsx` (if it exists and has a job id)

For each page, the integration pattern is the same:

### Step 1: Add to FlashcardDeck.tsx

1. Add imports at the top:
```tsx
import { useState } from 'react'; // already exists
import { AssistantPanel, AssistantTriggerButton } from '@/components/assistant/AssistantPanel';
```

2. Inside the component (after `const { id } = useParams`), add:
```tsx
const [isAssistantOpen, setIsAssistantOpen] = useState(false);
```

3. At the bottom of the returned JSX, before the closing `</Layout>`, add:
```tsx
      {id && (
        <>
          <AssistantTriggerButton
            onClick={() => setIsAssistantOpen(true)}
            isOpen={isAssistantOpen}
          />
          <AssistantPanel
            jobId={id}
            isOpen={isAssistantOpen}
            onClose={() => setIsAssistantOpen(false)}
          />
        </>
      )}
```

### Step 2: Add to QuizDetail.tsx (same pattern)

Look at `QuizDetail.tsx` — find where `id` comes from `useParams` and apply the same 3-step integration pattern.

### Step 3: Add to NoteDetail.tsx (same pattern)

Same 3-step integration pattern using `id` from `useParams`.

### Step 4: Add to StudySetDetail.tsx (if it has a job detail view with id)

Check if `StudySetDetail.tsx` has a `useParams` with an `id`. If yes, apply the same pattern.

### Step 5: Commit

```bash
git add frontend/src/pages/FlashcardDeck.tsx frontend/src/pages/QuizDetail.tsx frontend/src/pages/NoteDetail.tsx frontend/src/pages/StudySetDetail.tsx
git commit -m "feat: integrate AI assistant panel into all study set detail pages"
```

---

## Task 6: Verify End-to-End

### Step 1: Start the backend

```bash
cd backend && source venv/bin/activate && python manage.py runserver
```

### Step 2: Start the frontend

```bash
cd frontend && npm run dev
```

### Step 3: Manual test checklist

- [ ] Navigate to a completed study set's flashcard deck
- [ ] "Ask AI" button appears bottom-right
- [ ] Clicking opens the panel; desktop slides from right, mobile appears as bottom sheet
- [ ] Typing a question and submitting returns a response
- [ ] "Quiz me" quick action works
- [ ] "Explain this" quick action works
- [ ] "+ Flashcards" generates and saves flashcards (check "Saved to study set ✓" badge)
- [ ] After generating flashcards, navigate to the Flashcards page — new cards are there
- [ ] Panel closes via ✕ button or backdrop tap (mobile)

### Step 4: Commit if any fixes needed

```bash
git add -p  # stage only relevant changes
git commit -m "fix: <describe issue>"
```

---

## Notes

- **`unique_together`**: `GeneratedContent` has `unique_together = ["job", "type"]` — the `_handle_generation_action` helper merges new items into the existing record instead of creating a new one.
- **Token guard**: `get_assistant_system_prompt` caps transcript at 400K chars (~100K tokens for Gemini). For most study sets this is never hit.
- **No DB migration needed**: This feature only adds a new view/URL and frontend components — no schema changes.
- **Conversation history**: Kept in React state, capped at last 10 turns before sending to backend.
