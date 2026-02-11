import {
  ASSISTANT_PANEL_WIDTH,
  AssistantPanel,
  AssistantTriggerButton,
} from "@/components/assistant/AssistantPanel";
import { ExportButton } from "@/components/export/ExportButton";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { useJob } from "@/hooks/useJobs";
import { useCreateQuizAttempt, useQuizAttempts } from "@/hooks/useQuizAttempts";
import type { QuizContent, QuizQuestion } from "@/types";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  History,
  Loader2,
  Timer,
  Trophy,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

// Helper to extract quiz content from job
function getQuizContent(
  job: NonNullable<ReturnType<typeof useJob>["data"]>,
): QuizQuestion[] {
  const content = job.generated_content.find(
    (c) => c.type === "quiz" || c.type === "quizzes",
  );
  if (!content) return [];
  const quizContent = content.content as QuizContent;
  return quizContent.questions || [];
}

export default function QuizDetail() {
  const { id } = useParams<{ id: string }>();
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  // Disable polling for detail pages since jobs are already completed
  const { data: job, isLoading } = useJob(id, {
    stopPollingWhenComplete: false,
  });
  const { data: attemptsData } = useQuizAttempts(id);
  const createAttemptMutation = useCreateQuizAttempt();
  const { handleBack, backLabel } = useBackNavigation({
    defaultPath: "/quizzes",
    defaultLabel: "Quit Quiz",
  });
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

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!job) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h2 className="text-2xl font-serif text-foreground">
            Quiz not found
          </h2>
          <Button
            variant="link"
            onClick={handleBack}
            className="text-primary hover:underline mt-4"
          >
            {backLabel}
          </Button>
        </div>
      </Layout>
    );
  }

  const questions = getQuizContent(job);

  if (questions.length === 0) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h2 className="text-2xl font-serif text-foreground">
            No quiz questions found
          </h2>
          <Button
            variant="link"
            onClick={handleBack}
            className="text-primary hover:underline mt-4"
          >
            {backLabel}
          </Button>
        </div>
      </Layout>
    );
  }

  const handleOptionSelect = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
  };

  const handleSubmit = () => {
    setIsAnswered(true);
    const currentQ = questions[currentQuestion];
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

  const handleNext = async () => {
    if (currentQuestion < questions.length - 1) {
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
              total_questions: questions.length,
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

  if (showResults) {
    const attempts = attemptsData?.results || [];
    const percentage = Math.round((score / questions.length) * 100);

    return (
      <Layout>
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
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
              <Trophy className="w-12 h-12" />
            </div>
            <h2 className="text-3xl font-serif text-foreground mb-2">
              Quiz Complete!
            </h2>
            <p className="text-muted-foreground mb-8">
              You scored {score} out of {questions.length}
            </p>

            <div className="bg-background p-6 rounded-2xl border border-border mb-8 max-w-sm mx-auto">
              <div className="text-4xl font-bold text-primary mb-1">
                {percentage}%
              </div>
              <p className="text-sm text-muted-foreground uppercase tracking-wide">
                Accuracy
              </p>
            </div>

            <div className="w-full flex items-center justify-center gap-9 mb-8">
              <Button
                onClick={resetQuiz}
                className="w-[175px] py-6 bg-primary text-primary-foreground rounded-full hover:hover:bg-primary/90 transition-colors"
              >
                Retake Quiz
              </Button>
              <Button
                onClick={handleBack}
                className="w-[175px] py-6 bg-primary text-primary-foreground rounded-full hover:hover:bg-primary/90 transition-colors"
              >
                {backLabel}
              </Button>
            </div>
          </div>

          {/* Attempt History */}
          {attempts.length > 0 && (
            <Card className="rounded-2xl p-6 border-border bg-background">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-serif text-foreground">
                  Attempt History
                </h3>
              </div>
              <div className="space-y-3">
                {attempts.map((attempt, index) => {
                  const attemptDate = new Date(attempt.created_at);
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
                          {attempts.length - index}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">
                              {attempt.score}/{attempt.total_questions} correct
                            </span>
                            {isLatest && (
                              <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full">
                                Latest
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {attemptDate.toLocaleDateString()} at{" "}
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
      </Layout>
    );
  }

  const currentQ = questions[currentQuestion];
  const questionText = currentQ.text || currentQ.question || "";
  const correctAnswer =
    currentQ.correct_answer ??
    currentQ.correctAnswer ??
    currentQ.correct_option ??
    0;

  return (
    <Layout>
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
          <header className="flex justify-between items-center mb-8">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="flex items-center text-muted-foreground hover:text-primary transition-colors pl-0 hover:bg-transparent"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {backLabel}
            </Button>
            <div className="flex items-center gap-2">
              <ExportButton
                jobId={job.id}
                materialTypes={job.material_types}
                disabled={job.status !== "completed"}
              />
              <div className="flex items-center gap-2 text-muted-foreground bg-card px-3 py-1 rounded-full border border-border shadow-sm">
                <Timer className="w-4 h-4" />
                <span className="text-sm font-mono">14:20</span>
              </div>
            </div>
          </header>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>
                Question {currentQuestion + 1} of {questions.length}
              </span>
              <span>
                {Math.round((currentQuestion / questions.length) * 100)}%
                completed
              </span>
            </div>
            <div className="h-2 bg-background rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{
                  width: `${(currentQuestion / questions.length) * 100}%`,
                }}
              ></div>
            </div>
          </div>

          {/* Question Card */}
          <Card className="rounded-3xl p-8 shadow-sm bg-background border-border">
            <h2 className="text-xl font-medium text-foreground mb-8 leading-relaxed">
              {questionText}
            </h2>

            <div className="space-y-4 mb-8">
              {currentQ.options.map((option, i) => (
                <Button
                  key={i}
                  variant="outline"
                  onClick={() => handleOptionSelect(i)}
                  className={`w-full h-auto p-4 rounded-xl border-2 justify-between group ${
                    selectedOption === i
                      ? "border-primary bg-secondary text-primary"
                      : "border-border hover:border-border text-muted-foreground"
                  } ${
                    isAnswered && i === correctAnswer
                      ? "border-primary text-primary"
                      : ""
                  } ${
                    isAnswered && selectedOption === i && i !== correctAnswer
                      ? "border-destructive text-destructive"
                      : ""
                  }`}
                >
                  <span className="flex-1 text-left">{option}</span>
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
              ))}
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
                  onClick={handleNext}
                  className="px-8 py-6 bg-background text-foreground rounded-xl hover:bg-accent border border-border transition-all font-medium flex items-center gap-2"
                >
                  {currentQuestion < questions.length - 1
                    ? "Next Question"
                    : "Finish Quiz"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </Card>
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
    </Layout>
  );
}
