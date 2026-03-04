import { contentKeys } from "@/hooks/useContent";
import { jobKeys } from "@/hooks/useJobs";
import { contentService } from "@/lib/api/services/content";
import type { AssistantAction, AssistantMessage } from "@/types/models";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

export function useAssistant(jobId: string) {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(
    async (text: string, action: AssistantAction = null) => {
      if (!text.trim() && !action) return;

      const userMessage: AssistantMessage = { role: "user", content: text };
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
          role: "assistant",
          content: response.message,
          action: response.action,
          generatedItems: response.generated_items ?? undefined,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        if (
          response.action === "generated_flashcards" ||
          response.action === "generated_quiz"
        ) {
          queryClient.invalidateQueries({
            queryKey: contentKeys.detail(jobId),
          });
          // Also invalidate job details to update flashcard/quiz counts
          queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) });
          queryClient.invalidateQueries({ queryKey: jobKeys.list() });
        }
      } catch {
        const errorMessage: AssistantMessage = {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [jobId, messages, queryClient],
  );

  const clearMessages = useCallback(() => setMessages([]), []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!jobId) return;
      try {
        const history = await contentService.getChatHistory(jobId);
        if (isMounted && history.messages) {
          setMessages(history.messages);
        }
      } catch (error) {
        console.error("Failed to load chat history:", error);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [jobId]);

  return { messages, isLoading, sendMessage, clearMessages };
}
