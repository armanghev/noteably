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

        if (
          response.action === 'generated_flashcards' ||
          response.action === 'generated_quiz'
        ) {
          queryClient.invalidateQueries({ queryKey: contentKeys.detail(jobId) });
        }
      } catch {
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
