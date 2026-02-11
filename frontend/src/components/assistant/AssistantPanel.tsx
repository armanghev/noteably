import { Button } from "@/components/ui/button";
import { useAssistant } from "@/hooks/useAssistant";
import type { AssistantAction, AssistantMessage } from "@/types/models";
import { CheckCircle2, Loader2, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

const QUICK_ACTIONS: {
  label: string;
  action: AssistantAction;
  message: string;
}[] = [
  { label: "Quiz me", action: "quiz_me", message: "Quiz me on this material." },
  {
    label: "Explain this",
    action: null,
    message: "Give me a brief overview of the key concepts in this material.",
  },
  {
    label: "+ Flashcards",
    action: "generate_flashcards",
    message: "Generate new flashcards from this material.",
  },
  {
    label: "+ Quiz",
    action: "generate_quiz",
    message: "Generate a new quiz from this material.",
  },
];

function MessageBubble({ msg }: { msg: AssistantMessage }) {
  const isUser = msg.role === "user";
  const hasGenerated =
    msg.action === "generated_flashcards" || msg.action === "generated_quiz";
  const itemCount = msg.generatedItems?.length ?? 0;
  const noun =
    msg.action === "generated_flashcards" ? "flashcards" : "quiz questions";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        }`}
      >
        {isUser ? (
          <p>{msg.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
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

export const ASSISTANT_PANEL_WIDTH = 400;

export function AssistantPanel({
  jobId,
  isOpen,
  onClose,
}: AssistantPanelProps) {
  const { messages, isLoading, sendMessage } = useAssistant(jobId);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput("");
  };

  const handleQuickAction = (qa: (typeof QUICK_ACTIONS)[0]) => {
    if (isLoading) return;
    sendMessage(qa.message, qa.action);
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={`
          fixed z-50 bg-background border-border shadow-xl flex flex-col
          transition-transform duration-300 ease-in-out
          bottom-0 left-0 right-0 rounded-t-2xl border-t h-[70vh]
          md:h-auto md:top-0 md:right-0 md:bottom-0 md:left-auto md:rounded-none md:border-l md:border-t-0
          ${isOpen ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-y-0 md:translate-x-full md:pointer-events-none"}
        `}
        style={{ width: undefined }}
      >
        <style>{`
          @media (min-width: 768px) {
            .assistant-panel-desktop {
              width: ${ASSISTANT_PANEL_WIDTH}px;
            }
          }
        `}</style>
        <div className="md:w-[400px] h-full flex flex-col assistant-panel-desktop">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2">
              <img
                src="/nota.png"
                alt="Nota"
                className="w-6 h-6 rounded-full object-cover"
              />
              <span className="font-medium text-sm text-foreground">Nota</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-2 px-4 py-3 border-b border-border overflow-x-auto flex-shrink-0">
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

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <img
                  src="/nota.png"
                  alt="Nota"
                  className="w-24 h-24 rounded-full object-cover mb-4 opacity-80"
                />
                <p className="text-sm">
                  I'm here to help you think through this.
                  <br />
                  Ask anything or use a quick action.
                </p>
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
      </div>
    </>
  );
}

export function AssistantTriggerButton({
  onClick,
  isOpen,
}: {
  onClick: () => void;
  isOpen: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        fixed right-0 top-1/2 -translate-y-1/2 z-40 
        flex items-center gap-2 pl-4 pr-2 py-3 
        bg-accent text-primary-foreground 
        rounded-l-full shadow-lg 
        hover:bg-primary/90 hover:pr-8
        transition-all duration-300 ease-in-out
        font-medium group
        ${isOpen ? "translate-x-full opacity-0 pointer-events-none" : "translate-x-0 opacity-100"}
      `}
    >
      <img
        src="/nota.png"
        alt="Nota"
        className="w-6 h-6 rounded-full object-cover"
      />
      <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap opacity-0 group-hover:opacity-100">
        Ask Nota
      </span>
    </button>
  );
}
