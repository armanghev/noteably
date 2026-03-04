"use client";

import {
  ASSISTANT_PANEL_WIDTH,
  AssistantPanel,
  AssistantTriggerButton,
} from "@/components/assistant/AssistantPanel";
import { ExportButton } from "@/components/export/ExportButton";
import { CornellNotes } from "@/components/shared/CornellNotes";
import { DeleteConfirmationDialog } from "@/components/shared/DeleteConfirmationDialog";
import { OutlineNotes } from "@/components/shared/OutlineNotes";
import { QANotes } from "@/components/shared/QANotes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { JsonDisplay } from "@/components/ui/json-display";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { jobKeys, useJob, useSignedFileUrl } from "@/hooks/useJobs";
import { useCreateQuizAttempt, useQuizAttempts } from "@/hooks/useQuizAttempts";
import { jobsService } from "@/lib/api/services/jobs";
import { formatFileType } from "@/lib/utils";
import type {
  Flashcard,
  FlashcardsContent,
  Job,
  MaterialType,
  NotesContent,
  QuizContent,
  QuizQuestion,
  SummaryContent,
} from "@/types";
import { useQueryClient } from "@tanstack/react-query";

import {
  ArrowLeft,
  ArrowRight as ArrowRightIcon,
  Brain,
  CheckCircle2,
  Copy,
  Edit2,
  FileText,
  History,
  Loader2,
  MoreVertical,
  ArrowLeft as PrevIcon,
  RotateCw,
  ScrollText,
  StickyNote,
  Trash2,
  Trophy,
  XCircle,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

// Helper functions to extract and type content
function getSummaryContent(job: Job): SummaryContent | null {
  if (!job.generated_content) return null;
  const content = job.generated_content.find((c) => c.type === "summary");
  if (!content) return null;
  return content.content as SummaryContent;
}

function getNotesContent(job: Job): NotesContent | null {
  if (!job.generated_content) return null;
  const content = job.generated_content.find((c) => c.type === "notes");
  if (!content) return null;
  return content.content as NotesContent;
}

function getFlashcardsContent(job: Job): Flashcard[] {
  if (!job.generated_content) return [];
  const content = job.generated_content.find((c) => c.type === "flashcards");
  if (!content) return [];
  const flashcardsContent = content.content as FlashcardsContent;
  return flashcardsContent.flashcards || [];
}

function getQuizContent(job: Job): QuizQuestion[] {
  if (!job.generated_content) return [];
  const content = job.generated_content.find(
    (c) => c.type === "quiz" || c.type === "quizzes",
  );
  if (!content) return [];
  const quizContent = content.content as QuizContent;
  return quizContent.questions || [];
}

export default function StudySetDetail() {
  const { id } = useParams<{ id: string }>();
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: job, isLoading, error: jobError } = useJob(id);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { handleBack, backLabel } = useBackNavigation({
    defaultPath: "/study-sets",
    defaultLabel: "Back to Study Sets",
  });

  const [activeTab, setActiveTab] = useState("summary-notes");

  // Update active tab when job data loads
  // Determine available content
  const hasSummaryOrNotes =
    job?.material_types?.some(
      (t: MaterialType) => t === "summary" || t === "notes",
    ) ?? false;
  const hasFlashcards =
    job?.material_types?.includes("flashcards" as MaterialType) ?? false;
  const hasQuiz =
    job?.material_types?.some(
      (t: MaterialType) => t === "quiz" || t === "quizzes",
    ) ?? false;

  // Update active tab when job data loads
  useEffect(() => {
    if (!job) return;

    // Only change tab if current active tab is invalid for the new data
    // OR if we are on the default loading state
    const currentTabIsValid =
      (activeTab === "summary-notes" && hasSummaryOrNotes) ||
      (activeTab === "flashcards" && hasFlashcards) ||
      (activeTab === "quiz" && hasQuiz);

    if (!currentTabIsValid) {
      if (hasSummaryOrNotes) setActiveTab("summary-notes");
      else if (hasFlashcards) setActiveTab("flashcards");
      else if (hasQuiz) setActiveTab("quiz");
    }
  }, [job, activeTab, hasSummaryOrNotes, hasFlashcards, hasQuiz]);

  // Video player is now handled by VideoPlayer component

  // Flashcard study mode state (default to study mode)
  const [isFlashcardStudyMode, setIsFlashcardStudyMode] = useState(true);
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [direction, setDirection] = useState(0);
  const [isShuffled, setIsShuffled] = useState(false);
  const [originalFlashcards, setOriginalFlashcards] = useState<Flashcard[]>([]);
  const [shuffledFlashcards, setShuffledFlashcards] = useState<Flashcard[]>([]);

  // Quiz state (default to interactive quiz mode)
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [answers, setAnswers] = useState<
    Array<{
      question_index: number;
      selected_option: number;
      is_correct: boolean;
    }>
  >([]);
  const [attemptSaved, setAttemptSaved] = useState(false);

  // Quiz attempts
  const { data: attemptsData } = useQuizAttempts(id);
  const createAttemptMutation = useCreateQuizAttempt();

  // Get signed URL for file access (for private buckets)
  const { data: signedUrlData } = useSignedFileUrl(id);
  const fileUrl = signedUrlData?.signed_url || job?.storage_url;

  // File type detection (safe to call even if job is null)
  const isAudioFile =
    job?.file_type?.includes("audio") ||
    job?.filename?.match(/\.(mp3|wav|m4a|ogg|flac)$/i);
  const isVideoFile =
    job?.file_type?.includes("video") ||
    job?.filename?.match(/\.(mp4|webm|mov|avi|mkv)$/i);

  // Extract content (safe even if job is null — functions return empty/null)
  const summaryContent = job ? getSummaryContent(job) : null;
  const notesContent = job ? getNotesContent(job) : null;
  const rawFlashcards = job ? getFlashcardsContent(job) : [];
  const quizQuestions = job ? getQuizContent(job) : [];

  // Sync flashcards state when loaded (must be before early returns — Rules of Hooks)
  useEffect(() => {
    if (
      rawFlashcards &&
      rawFlashcards.length > 0 &&
      originalFlashcards.length === 0
    ) {
      setOriginalFlashcards(rawFlashcards);
      setShuffledFlashcards(rawFlashcards);
    }
  }, [rawFlashcards, originalFlashcards.length]);

  const flashcardsToUse = isShuffled ? shuffledFlashcards : originalFlashcards;
  // Use the synchronized list or fallback
  const flashcards =
    flashcardsToUse.length > 0 ? flashcardsToUse : rawFlashcards;

  // Now safe to do early returns after all hooks
  if (isLoading) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  const error = jobError ? "Failed to load study set." : null;
  if (error || !job) {
    return (
      <>
        <div className="text-center py-20">
          <h2 className="text-2xl font-serif text-foreground">
            Study set not found
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

  const handleShuffle = () => {
    if (isShuffled) {
      // Unshuffle
      setIsShuffled(false);
    } else {
      // Shuffle using Fisher-Yates
      const newFlashcards = [...originalFlashcards];
      for (let i = newFlashcards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newFlashcards[i], newFlashcards[j]] = [
          newFlashcards[j],
          newFlashcards[i],
        ];
      }
      setShuffledFlashcards(newFlashcards);
      setIsShuffled(true);
    }
    // Reset position when shuffling/unshuffling
    setCurrentCard(0);
    setIsFlipped(false);
    setDirection(0);
  };

  const summaryText = summaryContent?.summary || "No summary available.";
  const generatedTitle = summaryContent?.title || job.filename;
  const studyNotesMarkdown = notesContent?.content || "";

  // File type detection (re-evaluate now that we know job exists)
  const isPdfFile =
    job.file_type?.includes("pdf") || job.filename?.match(/\.pdf$/i);
  const isDocumentFile =
    job.file_type?.includes("text") ||
    job.file_type?.includes("document") ||
    job.filename?.match(/\.(doc|docx|txt)$/i);

  // Video player is now handled by VideoPlayer component

  // Helper function to check if a string is valid JSON
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

  // Helper to extract text content from React children
  const extractTextContent = (children: React.ReactNode): string => {
    if (typeof children === "string") return children;
    if (typeof children === "number") return String(children);
    if (Array.isArray(children)) {
      return children.map(extractTextContent).join("");
    }
    if (React.isValidElement(children)) {
      const props = children.props as { children?: React.ReactNode };
      return extractTextContent(props.children);
    }
    return "";
  };

  // Custom components for ReactMarkdown to render JSON code blocks with JsonDisplay
  // ReactMarkdown v10 requires destructuring 'node' from props
  const markdownComponents: Partial<Components> = {
    code: ({ node, className, children, ...props }: any) => {
      // In v10, code blocks have className like "language-json", inline code doesn't
      const match = /language-(\w+)/.exec(className || "");
      const isCodeBlock = !!match;

      // Only process code blocks (not inline code)
      if (!isCodeBlock) {
        return <code {...props}>{children}</code>;
      }

      const codeString = String(children).replace(/\n$/, "").trim();

      // Check if it's valid JSON
      if (codeString.length > 0 && isValidJson(codeString)) {
        try {
          const jsonData = JSON.parse(codeString);
          // Return JsonDisplay - ReactMarkdown will wrap it in pre, but we'll handle that in pre component
          return (
            <JsonDisplay
              data={jsonData}
              showCopyButton={true}
              className="my-4"
              maxHeight="400px"
              inline={true}
            />
          );
        } catch (e) {
          // Not valid JSON, fall through to default
        }
      }

      // Default code block rendering
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    pre: ({ node, children, ...props }: any) => {
      // Check if children is already JsonDisplay (from code component)
      if (React.isValidElement(children)) {
        const childType = children.type as any;
        if (
          childType?.displayName === "JsonDisplay" ||
          childType === JsonDisplay
        ) {
          return <>{children}</>;
        }

        // Check if the pre contains a code element with JSON
        const codeElement = children as React.ReactElement<{
          children?: React.ReactNode;
          className?: string;
        }>;
        const className = codeElement?.props?.className;
        const codeChildren = codeElement?.props?.children;

        // Code blocks have className (like "language-json"), inline code doesn't
        if (className && codeChildren) {
          const codeString = String(codeChildren).replace(/\n$/, "").trim();

          // Check if it's valid JSON
          if (codeString.length > 0 && isValidJson(codeString)) {
            try {
              const jsonData = JSON.parse(codeString);
              // Return JsonDisplay - this replaces the entire pre/code structure
              return (
                <JsonDisplay
                  data={jsonData}
                  showCopyButton={true}
                  className="my-4"
                  maxHeight="400px"
                  inline={true}
                />
              );
            } catch (e) {
              // Not valid JSON or parse error, fall through to default
            }
          }
        }
      }

      // Default pre rendering
      return (
        <pre className="overflow-x-auto max-w-full" {...props}>
          {children}
        </pre>
      );
    },
  };

  // Count available tabs
  const tabCount = [hasSummaryOrNotes, hasFlashcards, hasQuiz].filter(
    Boolean,
  ).length;

  // Flashcard handlers
  const flashcardVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  const handleFlashcardNext = () => {
    if (currentCard < flashcards.length - 1) {
      setDirection(1);
      setIsFlipped(false);
      setCurrentCard((c) => c + 1);
    }
  };

  const handleFlashcardPrev = () => {
    if (currentCard > 0) {
      setDirection(-1);
      setIsFlipped(false);
      setCurrentCard((c) => c - 1);
    }
  };

  // Quiz handlers
  const handleOptionSelect = (index: number) => {
    if (isAnswered || showResults) return;
    setSelectedOption(index);
  };

  const handleSubmit = () => {
    if (isAnswered) return;
    setIsAnswered(true);
    const currentQ = quizQuestions[currentQuestion];
    const correctAnswer =
      currentQ.correct_answer ??
      currentQ.correctAnswer ??
      currentQ.correct_option ??
      0;
    const isCorrect = selectedOption === correctAnswer;

    if (isCorrect) {
      setScore((s) => s + 1);
    }

    // Track the answer
    setAnswers((prev) => [
      ...prev,
      {
        question_index: currentQuestion,
        selected_option: selectedOption ?? -1,
        is_correct: isCorrect,
      },
    ]);
  };

  const handleNextQuestion = async () => {
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion((c) => c + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      // Quiz is complete - save the attempt
      setShowResults(true);

      if (!attemptSaved && id) {
        try {
          await createAttemptMutation.mutateAsync({
            jobId: id,
            data: {
              score,
              total_questions: quizQuestions.length,
              answers,
            },
          });
          setAttemptSaved(true);
          toast.success("Quiz score saved!");
        } catch (error) {
          console.error("Failed to save quiz attempt:", error);
          toast.error(
            "Failed to save quiz score. You can still retake the quiz.",
          );
        }
      }
    }
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setShowResults(false);
    setAnswers([]);
    setAttemptSaved(false);
  };

  const handleDelete = async () => {
    if (!id) return;

    setIsDeleting(true);
    try {
      const response = await jobsService.deleteJob(id);

      // Invalidate queries to update the cache
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
      queryClient.invalidateQueries({ queryKey: jobKeys.dashboard });

      toast.success(response.message);
      router.push("/study-sets");
    } catch (err: any) {
      console.error("Delete failed:", err);
      toast.error(err.response?.data?.error || "Failed to delete study set.");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

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
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            {/* Back button and tabs in a row */}
            <div className="flex items-center justify-between mb-8">
              <Button
                variant="ghost"
                onClick={handleBack}
                className="flex items-center text-muted-foreground hover:text-primary transition-colors pl-0 hover:bg-transparent"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {backLabel}
              </Button>

              {tabCount > 1 && (
                <TabsList
                  className={`grid ${tabCount === 2 ? "grid-cols-2" : tabCount === 3 ? "grid-cols-3" : "grid-cols-4"}`}
                >
                  {hasSummaryOrNotes && (
                    <TabsTrigger
                      value="summary-notes"
                      className="flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Summary & Notes
                    </TabsTrigger>
                  )}
                  {hasFlashcards && (
                    <TabsTrigger
                      value="flashcards"
                      className="flex items-center gap-2"
                    >
                      <Brain className="w-4 h-4" />
                      Flashcards
                    </TabsTrigger>
                  )}
                  {hasQuiz && (
                    <TabsTrigger
                      value="quiz"
                      className="flex items-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      Quiz
                    </TabsTrigger>
                  )}
                </TabsList>
              )}
            </div>

            <header className="mb-8">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-4xl font-serif text-foreground mb-2">
                    {generatedTitle}
                  </h1>
                  <div className="flex gap-2 mb-3">
                    <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded-md">
                      {formatFileType(job.file_type)}
                    </span>
                    <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-md">
                      {new Date(job.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <ExportButton
                    jobId={job.id}
                    materialTypes={job.material_types}
                    disabled={job.status !== "completed"}
                  />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="h-9 w-9">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-background border-border p-3"
                    >
                      <DropdownMenuItem
                        disabled
                        className="text-muted-foreground"
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => setIsDeleteDialogOpen(true)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </header>

            {/* Summary & Notes Tab */}
            {hasSummaryOrNotes && (
              <TabsContent value="summary-notes" className="space-y-8">
                {/* Summary */}
                {!notesContent?.cornell && (
                  <Card className="p-8 shadow-sm bg-background border border-border">
                    <div className="flex flex-row items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <ScrollText className="w-5 h-5 text-primary" />
                        <h2 className="text-xl font-medium text-foreground">
                          Summary
                        </h2>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          navigator.clipboard.writeText(summaryText);
                          toast.success("Copied to clipboard");
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {summaryText}
                    </div>
                  </Card>
                )}

                {/* Study Notes */}
                {(studyNotesMarkdown ||
                  notesContent?.cornell ||
                  notesContent?.qa ||
                  notesContent?.outline) && (
                  <Card className="p-8 shadow-sm bg-background border border-border">
                    <div className="flex flex-row items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <StickyNote className="w-5 h-5 text-primary" />
                        <h2 className="text-xl font-medium text-foreground">
                          Study Notes
                        </h2>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          let textToCopy = studyNotesMarkdown;
                          if (notesContent?.cornell) {
                            const { cues, notes, summary } =
                              notesContent.cornell;
                            const pairs = cues
                              .map(
                                (cue: string, index: number) =>
                                  `CUE: ${cue}\nNOTE: ${notes[index]}`,
                              )
                              .join("\n\n");
                            textToCopy = `${pairs}\n\nSUMMARY:\n${summary}`;
                          } else if (notesContent?.qa) {
                            textToCopy = notesContent.qa
                              .map(
                                (q: any) => `Q: ${q.question}\nA: ${q.answer}`,
                              )
                              .join("\n\n");
                          } else if (notesContent?.outline) {
                            // Simple text extraction for outline
                            const extractOutline = (
                              items: any[],
                              depth = 0,
                            ): string => {
                              return items
                                .map((item) => {
                                  let str = `${"  ".repeat(depth)}- ${item.title}\n`;
                                  if (
                                    item.children &&
                                    item.children.length > 0
                                  ) {
                                    str += extractOutline(
                                      item.children,
                                      depth + 1,
                                    );
                                  }
                                  return str;
                                })
                                .join("");
                            };
                            textToCopy = `${notesContent.outline.title}\n${extractOutline(notesContent.outline.children)}`;
                          }
                          navigator.clipboard.writeText(textToCopy);
                          toast.success("Copied to clipboard");
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground prose-ul:text-muted-foreground prose-ol:text-muted-foreground marker:text-primary wrap-break-word">
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
                        <ReactMarkdown components={markdownComponents}>
                          {studyNotesMarkdown}
                        </ReactMarkdown>
                      )}
                    </div>
                  </Card>
                )}
              </TabsContent>
            )}

            {/* Flashcards Tab */}
            {hasFlashcards && (
              <TabsContent value="flashcards" className="space-y-4">
                {flashcards.length > 0 ? (
                  <>
                    {isFlashcardStudyMode ? (
                      <div className="flex flex-col items-center justify-center min-h-[500px]">
                        <div className="mb-4 text-center">
                          <h2 className="text-2xl font-serif text-foreground mb-2">
                            Flashcards
                          </h2>
                          <p className="text-muted-foreground">
                            {currentCard + 1} of {flashcards.length}
                          </p>
                        </div>

                        {/* Flip Card Area */}
                        <div className="w-full max-w-3xl aspect-3/2 perspective-1000 relative mb-8">
                          <AnimatePresence initial={false} custom={direction}>
                            <motion.div
                              key={currentCard}
                              custom={direction}
                              variants={flashcardVariants}
                              initial="enter"
                              animate="center"
                              exit="exit"
                              transition={{
                                x: {
                                  type: "spring",
                                  stiffness: 500,
                                  damping: 35,
                                },
                                opacity: { duration: 0.15 },
                              }}
                              className="absolute inset-0 cursor-pointer"
                              onClick={() => setIsFlipped(!isFlipped)}
                            >
                              <motion.div
                                className="w-full h-full relative preserve-3d"
                                animate={{ rotateY: isFlipped ? 180 : 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                {/* Front */}
                                <div className="absolute inset-0 backface-hidden bg-background rounded-3xl shadow-xl flex items-center justify-center p-12 border border-border text-center">
                                  <h3 className="text-2xl font-medium text-foreground">
                                    {flashcards[currentCard].front}
                                  </h3>
                                  <p className="absolute bottom-6 text-muted-foreground text-sm">
                                    Click to flip
                                  </p>
                                </div>

                                {/* Back */}
                                <div
                                  className="absolute inset-0 backface-hidden bg-accent rounded-3xl shadow-xl flex items-center justify-center p-12 text-center"
                                  style={{ transform: "rotateY(180deg)" }}
                                >
                                  <h3 className="text-xl text-accent-foreground/90 leading-relaxed">
                                    {flashcards[currentCard].back}
                                  </h3>
                                </div>
                              </motion.div>
                            </motion.div>
                          </AnimatePresence>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-8">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={handleFlashcardPrev}
                            disabled={currentCard === 0}
                            className="w-14 h-14 rounded-full border-border text-muted-foreground hover:bg-muted disabled:opacity-50 shadow-sm"
                          >
                            <PrevIcon className="w-6 h-6" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsFlipped(!isFlipped)}
                            className="w-14 h-14 rounded-full bg-secondary text-accent hover:text-accent hover:bg-secondary/80 shadow-sm"
                          >
                            <RotateCw className="w-6 h-6" />
                          </Button>
                          <Button
                            size="icon"
                            onClick={handleFlashcardNext}
                            disabled={currentCard === flashcards.length - 1}
                            className="w-14 h-14 rounded-full bg-accent text-accent-foreground hover:hover:bg-accent/90 shadow-lg"
                          >
                            <ArrowRightIcon className="w-6 h-6" />
                          </Button>
                        </div>

                        {/* Toggle to list mode */}
                        <div className="flex items-center gap-2 mt-8">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleShuffle}
                            className={
                              isShuffled
                                ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                                : ""
                            }
                          >
                            Shuffle
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsFlashcardStudyMode(false)}
                          >
                            View All Cards
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Card className="shadow-sm bg-background border-none">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-2">
                            <Brain className="w-5 h-5 text-primary" />
                            <h2 className="text-xl font-medium text-foreground">
                              Flashcards
                            </h2>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleShuffle}
                              className={
                                isShuffled
                                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                  : ""
                              }
                            >
                              Shuffle
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setIsFlashcardStudyMode(true)}
                            >
                              Study Mode
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-4">
                          {flashcards.map((card, i) => (
                            <div
                              key={i}
                              className="p-4 bg-background rounded-xl border border-border grid grid-cols-1 md:grid-cols-3 gap-4"
                            >
                              <div className="font-medium text-foreground md:col-span-1 md:border-r border-border md:pr-4 flex items-center">
                                {card.front}
                              </div>
                              <div className="text-sm text-muted-foreground md:col-span-2 flex items-center">
                                {card.back}
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card className="shadow-sm bg-background border-none">
                    <p className="text-sm text-muted-foreground italic text-center py-8">
                      No flashcards available.
                    </p>
                  </Card>
                )}
              </TabsContent>
            )}

            {/* Quiz Tab */}
            {hasQuiz && (
              <TabsContent value="quiz" className="space-y-4">
                {quizQuestions.length > 0 ? (
                  <>
                    {showResults ? (
                      <div className="text-center py-12">
                        <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                          <Trophy className="w-12 h-12" />
                        </div>
                        <h2 className="text-3xl font-serif text-foreground mb-2">
                          Quiz Complete!
                        </h2>
                        <p className="text-muted-foreground mb-8">
                          You scored {score} out of {quizQuestions.length}
                        </p>

                        <div className="bg-background p-6 rounded-2xl border border-border mb-8 max-w-sm mx-auto">
                          <div className="text-4xl font-bold text-primary mb-1">
                            {Math.round((score / quizQuestions.length) * 100)}%
                          </div>
                          <p className="text-sm text-muted-foreground uppercase tracking-wide">
                            Accuracy
                          </p>
                        </div>

                        <div className="w-full flex items-center justify-center gap-4 mb-8">
                          <Button
                            onClick={resetQuiz}
                            className="px-8 py-6 bg-primary text-primary-foreground rounded-full hover:hover:bg-primary/90 transition-colors"
                          >
                            Retake Quiz
                          </Button>
                        </div>

                        {/* Attempt History */}
                        {attemptsData?.results &&
                          attemptsData.results.length > 0 && (
                            <Card className="rounded-2xl p-6 border-border bg-background max-w-2xl mx-auto">
                              <div className="flex items-center gap-2 mb-4">
                                <History className="w-5 h-5 text-primary" />
                                <h3 className="text-xl font-serif text-foreground">
                                  Attempt History
                                </h3>
                              </div>
                              <div className="space-y-3">
                                {attemptsData.results.map((attempt, index) => {
                                  const attemptDate = new Date(
                                    attempt.created_at,
                                  );
                                  const isLatest = index === 0;

                                  return (
                                    <div
                                      key={attempt.id}
                                      className={`flex items-center justify-between p-4 rounded-xl border ${
                                        isLatest
                                          ? "border-primary bg-secondary/50"
                                          : "border-border bg-card"
                                      }`}
                                    >
                                      <div className="flex items-center gap-4">
                                        <div
                                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                                            isLatest
                                              ? "bg-primary text-primary-foreground"
                                              : "bg-muted text-muted-foreground"
                                          }`}
                                        >
                                          {attemptsData.results.length - index}
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-foreground">
                                              {attempt.score}/
                                              {attempt.total_questions} correct
                                            </span>
                                            {isLatest && (
                                              <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full">
                                                Latest
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-sm text-muted-foreground">
                                            {attemptDate.toLocaleDateString()}{" "}
                                            at{" "}
                                            {attemptDate.toLocaleTimeString()}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-2xl font-bold text-primary">
                                          {Math.round(attempt.percentage)}%
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </Card>
                          )}
                      </div>
                    ) : (
                      <>
                        {/* Progress Bar */}
                        <div className="mb-8">
                          <div className="flex justify-between text-sm text-muted-foreground mb-2">
                            <span>
                              Question {currentQuestion + 1} of{" "}
                              {quizQuestions.length}
                            </span>
                            <span>
                              {Math.round(
                                (currentQuestion / quizQuestions.length) * 100,
                              )}
                              % completed
                            </span>
                          </div>
                          <div className="h-2 bg-background rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{
                                width: `${(currentQuestion / quizQuestions.length) * 100}%`,
                              }}
                            ></div>
                          </div>
                        </div>

                        {/* Question Card */}
                        <Card className="rounded-3xl p-8 shadow-sm bg-background border-border">
                          <h2 className="text-xl font-medium text-foreground mb-8 leading-relaxed">
                            {quizQuestions[currentQuestion].question ||
                              quizQuestions[currentQuestion].text}
                          </h2>

                          <div className="space-y-4 mb-8">
                            {quizQuestions[currentQuestion].options.map(
                              (option, i) => {
                                const correctAnswer =
                                  quizQuestions[currentQuestion]
                                    .correct_answer ??
                                  quizQuestions[currentQuestion]
                                    .correctAnswer ??
                                  quizQuestions[currentQuestion]
                                    .correct_option ??
                                  0;
                                return (
                                  <Button
                                    key={i}
                                    variant="outline"
                                    onClick={() => handleOptionSelect(i)}
                                    disabled={isAnswered}
                                    className={`w-full h-auto p-4 rounded-xl border-2 justify-between group ${
                                      selectedOption === i
                                        ? "border-primary bg-secondary text-primary"
                                        : "border-border hover:border-border text-muted-foreground"
                                    } ${
                                      isAnswered && i === correctAnswer
                                        ? "border-primary text-primary"
                                        : ""
                                    } ${
                                      isAnswered &&
                                      selectedOption === i &&
                                      i !== correctAnswer
                                        ? "border-destructive text-destructive"
                                        : ""
                                    }`}
                                  >
                                    <span className="flex-1 text-left">
                                      {option}
                                    </span>
                                    {selectedOption === i && !isAnswered && (
                                      <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
                                        <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
                                      </div>
                                    )}
                                    {isAnswered && i === correctAnswer && (
                                      <CheckCircle2 className="w-5 h-5 text-primary" />
                                    )}
                                    {isAnswered &&
                                      selectedOption === i &&
                                      i !== correctAnswer && (
                                        <XCircle className="w-5 h-5 text-destructive" />
                                      )}
                                  </Button>
                                );
                              },
                            )}
                          </div>

                          <div className="flex justify-end">
                            {!isAnswered ? (
                              <Button
                                onClick={handleSubmit}
                                disabled={selectedOption === null}
                                className="px-8 py-6 bg-primary text-foreground rounded-xl hover:bg-accent border-border transition-all font-medium"
                              >
                                Submit Answer
                              </Button>
                            ) : (
                              <Button
                                onClick={handleNextQuestion}
                                className="px-8 py-6 bg-background text-foreground rounded-xl hover:bg-accent border border-border transition-all font-medium flex items-center gap-2"
                              >
                                {currentQuestion < quizQuestions.length - 1
                                  ? "Next Question"
                                  : "Finish Quiz"}
                                <ArrowRightIcon className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </Card>
                      </>
                    )}
                  </>
                ) : (
                  <Card className="shadow-sm bg-background border-none">
                    <p className="text-sm text-muted-foreground italic text-center py-8">
                      No quiz questions available.
                    </p>
                  </Card>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        itemName={generatedTitle}
        isDeleting={isDeleting}
      />
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
