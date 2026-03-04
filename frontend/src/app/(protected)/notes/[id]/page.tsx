"use client";

import {
  ASSISTANT_PANEL_WIDTH,
  AssistantPanel,
  AssistantTriggerButton,
} from "@/components/assistant/AssistantPanel";
import { ExportButton } from "@/components/export/ExportButton";
import { CornellNotes } from "@/components/shared/CornellNotes";
import { OutlineNotes } from "@/components/shared/OutlineNotes";
import { QANotes } from "@/components/shared/QANotes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { JsonDisplay } from "@/components/ui/json-display";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { useJob } from "@/hooks/useJobs";
import { formatFileType } from "@/lib/utils";
import type { Job, NotesContent, SummaryContent } from "@/types";
import { ArrowLeft, BookOpen, Loader2, Share2 } from "lucide-react";
import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

// Helper functions to extract and type content
function getSummaryContent(job: Job): SummaryContent | null {
  const content = job.generated_content.find((c) => c.type === "summary");
  if (!content) return null;
  return content.content as SummaryContent;
}

function getNotesContent(job: Job): NotesContent | null {
  const content = job.generated_content.find((c) => c.type === "notes");
  if (!content) return null;
  return content.content as NotesContent;
}

export default function NoteDetail() {
  const { id } = useParams<{ id: string }>();
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  // Disable polling for detail pages since jobs are already completed
  const {
    data: job,
    isLoading: loading,
    error: jobError,
  } = useJob(id, { stopPollingWhenComplete: false });
  const { handleBack, backLabel } = useBackNavigation({
    defaultPath: "/notes",
    defaultLabel: "Back to Notes",
  });

  // Helper function to check if a string is valid JSON (defined before hooks)
  const isValidJson = (str: string): boolean => {
    if (!str || str.trim().length === 0) return false;
    const trimmed = str.trim();
    // Check if it starts with { or [ which are JSON indicators
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return false;
    try {
      JSON.parse(trimmed);
      return true;
    } catch {
      return false;
    }
  };

  // Post-process markdown to replace JSON code blocks with JsonDisplay
  // This must be before early returns to maintain hooks order
  useEffect(() => {
    // Only run if we have a job
    if (!job) return;

    const replaceJsonCodeBlocks = (containerId: string) => {
      const container = document.getElementById(containerId);
      if (!container) {
        console.log(`Container ${containerId} not found`);
        return;
      }

      console.log(`Processing container ${containerId}`, container);
      const preElements = container.querySelectorAll("pre code");
      console.log(`Found ${preElements.length} pre code elements`);

      preElements.forEach((codeEl, index) => {
        const preEl = codeEl.parentElement;
        if (!preEl || (preEl as HTMLElement).dataset.jsonReplaced === "true") {
          console.log(
            `Skipping element ${index} - already replaced or no parent`,
          );
          return;
        }

        // Get text content and decode HTML entities
        let codeString = codeEl.textContent?.trim() || "";
        console.log(
          `Element ${index} code string length:`,
          codeString.length,
          codeString.substring(0, 50),
        );

        // Decode HTML entities (like &amp; -> &)
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = codeString;
        codeString = tempDiv.textContent || tempDiv.innerText || codeString;

        if (codeString && isValidJson(codeString)) {
          console.log(`Element ${index} is valid JSON, replacing...`);
          try {
            const jsonData = JSON.parse(codeString);
            // Mark as replaced
            (preEl as HTMLElement).dataset.jsonReplaced = "true";

            // Create a wrapper div
            const wrapper = document.createElement("div");
            wrapper.className = "json-display-wrapper my-4";

            // Use ReactDOM to render JsonDisplay
            import("react-dom/client").then(({ createRoot }) => {
              const root = createRoot(wrapper);
              root.render(
                React.createElement(JsonDisplay, {
                  data: jsonData,
                  showCopyButton: true,
                  className: "my-4",
                  maxHeight: "400px",
                  inline: true,
                }),
              );
              preEl.replaceWith(wrapper);
              console.log(`Element ${index} replaced successfully`);
            });
          } catch (e) {
            console.log("JSON parse error:", e, codeString.substring(0, 100));
            // Not valid JSON, skip
          }
        } else {
          console.log(`Element ${index} is not valid JSON`);
        }
      });
    };

    // Use MutationObserver to watch for when ReactMarkdown renders
    const observer = new MutationObserver(() => {
      replaceJsonCodeBlocks("study-notes-content");
    });

    // Start observing after a short delay
    const timeoutId = setTimeout(() => {
      // Observe the document body for changes
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // Also try immediately
      replaceJsonCodeBlocks("study-notes-content");

      // Stop observing after 5 seconds
      setTimeout(() => {
        observer.disconnect();
      }, 5000);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [job]);

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  const error = jobError ? "Failed to load note." : null;
  if (error || !job) {
    return (
      <>
        <div className="text-center py-20">
          <h2 className="text-2xl font-serif text-foreground">
            Note not found
          </h2>
          <Button
            variant="link"
            onClick={handleBack}
            className="text-primary hover:underline mt-4"
          >
            {backLabel}
          </Button>
        </div>
      </>
    );
  }

  // Extract and type content properly
  const summaryContent = getSummaryContent(job);
  const notesContent = getNotesContent(job);
  console.log("NoteDetail - Job ID:", id);
  console.log("NoteDetail - Notes Content:", notesContent);
  console.log("NoteDetail - Job Options:", job.options);

  // Parse content for display
  const summaryText = summaryContent?.summary || "No summary available.";
  const generatedTitle = summaryContent?.title || null;

  // Study Notes from markdown content
  const studyNotesMarkdown = notesContent?.content || "";

  return (
    <>
      <div
        className={`transition-all duration-300 ease-in-out ${isAssistantOpen ? "layout-squeeze" : ""}`}
      >
        <style>{`
          @media (min-width: 768px) {
            .layout-squeeze {
              margin-right: ${ASSISTANT_PANEL_WIDTH}px;
            }
          }
        `}</style>
        <div className="max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="flex items-center text-muted-foreground hover:text-primary transition-colors mb-6 pl-0 hover:bg-transparent"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {backLabel}
          </Button>

          <header className="mb-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex gap-2 mb-3">
                  <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded-md">
                    {formatFileType(job.file_type)}
                  </span>
                  <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-md">
                    {new Date(job.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h1 className="text-4xl font-serif text-foreground mb-2">
                  {generatedTitle || job.filename}
                </h1>
              </div>
              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  className="text-muted-foreground hover:text-primary rounded-full hover:bg-muted"
                >
                  <Share2 className="w-5 h-5" />
                </Button>
                <ExportButton
                  jobId={job.id}
                  materialTypes={job.material_types}
                  disabled={job.status !== "completed"}
                />
              </div>
            </div>

            {/* Audio Player Placeholder - Only show if audio? */}
            {/* <div className="p-4 rounded-xl border border-border flex items-end gap-4 bg-background"> ... </div> */}
          </header>

          <div className="space-y-8">
            {!notesContent?.cornell && (
              <Card
                id="summary"
                className="p-8 shadow-sm bg-background border border-border scroll-mt-24"
              >
                <div className="flex items-center gap-2 mb-6">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-medium text-foreground">
                    Summary
                  </h2>
                </div>
                <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {summaryText}
                </div>
              </Card>
            )}

            {/* Study Notes Markdown Display */}
            {/* Study Notes Display */}
            {(studyNotesMarkdown ||
              notesContent?.cornell ||
              notesContent?.qa ||
              notesContent?.outline) && (
              <Card
                id="notes"
                className="p-8 shadow-sm bg-background border border-border scroll-mt-24"
              >
                <div className="flex items-center gap-2 mb-6">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-medium text-foreground">
                    Study Notes
                  </h2>
                </div>
                <div
                  id="study-notes-content"
                  className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground prose-ul:text-muted-foreground prose-ol:text-muted-foreground marker:text-primary"
                >
                  {notesContent?.cornell ? (
                    <CornellNotes
                      data={notesContent.cornell}
                      summary={summaryText}
                    />
                  ) : notesContent?.qa ? (
                    <QANotes data={notesContent.qa} />
                  ) : notesContent?.outline ? (
                    <OutlineNotes data={notesContent.outline} />
                  ) : (
                    <ReactMarkdown>{studyNotesMarkdown}</ReactMarkdown>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
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
    </>
  );
}
