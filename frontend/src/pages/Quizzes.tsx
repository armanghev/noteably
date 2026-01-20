import Layout from '@/components/layout/Layout';
import { Plus, Clock, Trophy, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useJobs } from '@/hooks/useJobs';
import { useQuizAttemptsForJobs } from '@/hooks/useQuizAttempts';
import { useQueries } from '@tanstack/react-query';
import { contentService } from '@/lib/api/services/content';
import type { JobListItem, QuizQuestion, QuizContent } from '@/types';

// Helper to check if job has quiz
function hasQuiz(job: JobListItem): boolean {
  return job.content_types.some(t => t === 'quiz' || t === 'quizzes');
}

// Helper to calculate reading time based on text length (words per minute)
function calculateReadingTime(text: string, wordsPerMinute: number = 200): number {
  const words = text.trim().split(/\s+/).length;
  return words / wordsPerMinute;
}

// Helper to infer difficulty from question characteristics
function inferDifficulty(questions: QuizQuestion[]): 'easy' | 'medium' | 'hard' {
  if (questions.length === 0) return 'medium';

  let totalQuestionLength = 0;
  let totalOptionsLength = 0;
  let totalOptionsCount = 0;

  questions.forEach((question) => {
    const questionText = question.question || question.text || '';
    const options = question.options || [];
    
    totalQuestionLength += questionText.length;
    totalOptionsCount += options.length;
    options.forEach(opt => {
      totalOptionsLength += opt.length;
    });
  });

  const avgQuestionLength = totalQuestionLength / questions.length;
  const avgOptionsLength = totalOptionsLength / totalOptionsCount;
  const avgOptionsCount = totalOptionsCount / questions.length;

  // Infer difficulty based on complexity metrics
  // Longer questions, longer options, and more options indicate harder questions
  const complexityScore = 
    (avgQuestionLength / 100) + // Question length factor
    (avgOptionsLength / 50) +  // Option length factor
    (avgOptionsCount / 4);      // Number of options factor

  if (complexityScore < 2) return 'easy';
  if (complexityScore < 4) return 'medium';
  return 'hard';
}

// Helper to estimate quiz time based on questions
function calculateQuizTime(questions: QuizQuestion[], difficulty?: 'easy' | 'medium' | 'hard'): number {
  if (questions.length === 0) return 0;

  // Infer difficulty if not provided
  const inferredDifficulty = difficulty || inferDifficulty(questions);

  // Base time multipliers by difficulty
  const difficultyMultipliers = {
    easy: 0.8,
    medium: 1.0,
    hard: 1.3,
  };

  const multiplier = difficultyMultipliers[inferredDifficulty];

  let totalMinutes = 0;

  questions.forEach((question) => {
    const questionText = question.question || question.text || '';
    const options = question.options || [];
    const optionsText = options.join(' ');
    const totalText = `${questionText} ${optionsText}`;

    // Base time for reading question and options (slower reading for longer/complex text)
    const readingSpeed = questionText.length > 200 ? 150 : 200; // Slower for longer questions
    const readingTime = calculateReadingTime(totalText, readingSpeed);
    
    // Time to think and answer (varies by question complexity)
    const questionLength = questionText.length;
    const optionsCount = options.length;
    const avgOptionLength = options.reduce((sum, opt) => sum + opt.length, 0) / Math.max(1, optionsCount);
    
    // Estimate thinking time based on:
    // - Question length (longer = more complex)
    // - Number of options (more options = more time to evaluate)
    // - Average option length (longer options = more reading/thinking)
    const thinkingTime = Math.max(
      0.5, 
      Math.min(
        3.0, 
        questionLength / 150 +           // Base on question length
        optionsCount * 0.15 +            // More options = more time
        (avgOptionLength / 100) * 0.5   // Longer options = more reading
      )
    );
    
    totalMinutes += (readingTime + thinkingTime) * multiplier;
  });

  // Add buffer time (minimum 1 minute, scales with question count)
  const bufferTime = Math.max(1, questions.length * 0.1);
  return Math.ceil(totalMinutes + bufferTime);
}

// Helper to get difficulty badge styling
function getDifficultyBadge(difficulty: 'easy' | 'medium' | 'hard') {
  const styles = {
    easy: {
      bg: 'bg-green-500/20',
      text: 'text-green-600 dark:text-green-400',
      border: 'border-green-500/30',
      label: 'Easy',
    },
    medium: {
      bg: 'bg-yellow-500/20',
      text: 'text-yellow-600 dark:text-yellow-400',
      border: 'border-yellow-500/30',
      label: 'Medium',
    },
    hard: {
      bg: 'bg-red-500/20',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-500/30',
      label: 'Hard',
    },
  };
  return styles[difficulty];
}

// Helper to get latest and highest scores from attempts
function getQuizScores(attempts: { data?: { results: Array<{ score: number; total_questions: number; percentage: number }> } } | undefined) {
  if (!attempts?.data?.results || attempts.data.results.length === 0) {
    return { latest: null, highest: null };
  }

  const results = attempts.data.results;
  const latest = results[0]; // Results are ordered by -created_at, so first is latest
  const highest = results.reduce((max, attempt) =>
    attempt.percentage > max.percentage ? attempt : max
  );

  return {
    latest: {
      score: latest.score,
      total: latest.total_questions,
      percentage: latest.percentage,
    },
    highest: {
      score: highest.score,
      total: highest.total_questions,
      percentage: highest.percentage,
    },
  };
}

export default function Quizzes() {
  const navigate = useNavigate();
  const { data: jobs, isLoading } = useJobs();

  // Filter for completed jobs with quizzes
  const jobsWithQuizzes = jobs?.filter(job => job.status === 'completed' && hasQuiz(job)) || [];

  // Fetch attempts for all quizzes
  const jobIds = jobsWithQuizzes.map(job => job.id);
  const attemptsQueries = useQuizAttemptsForJobs(jobIds);

  // Fetch quiz content for all quizzes to calculate time
  const contentQueries = useQueries({
    queries: jobIds.map((jobId) => ({
      queryKey: ['quiz-content', jobId],
      queryFn: async () => {
        const content = await contentService.getJobContent(jobId);
        const quizContent = content.content?.quiz || content.content?.quizzes;
        return quizContent as QuizContent | undefined;
      },
      enabled: !!jobId,
    })),
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-serif text-foreground">Practice Quizzes</h1>
        <Button className="gap-2" onClick={() => navigate('/upload')}>
          <Plus className="w-4 h-4" /> New Quiz
        </Button>
      </header>

      {jobsWithQuizzes.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground">No quizzes yet. Upload a file to generate quizzes!</p>
          <Button onClick={() => navigate('/upload')} className="mt-4">Upload File</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobsWithQuizzes.map((job, index) => {
            const questionCount = job.quiz_count;
            const title = job.filename || 'Quiz';
            const attempts = attemptsQueries[index];
            const scores = getQuizScores(attempts);
            const quizContent = contentQueries[index]?.data;
            const questions = quizContent?.questions || [];
            
            // Calculate time based on actual questions if available, otherwise use estimate
            const estimatedTime = questions.length > 0
              ? calculateQuizTime(questions)
              : Math.ceil(questionCount * 1.5); // Fallback to simple estimate
            
            // Determine difficulty
            const difficulty = questions.length > 0
              ? inferDifficulty(questions)
              : 'medium'; // Default to medium if questions aren't loaded yet
            
            const difficultyBadge = getDifficultyBadge(difficulty);

            return (
              <Card
                key={job.id}
                className="p-6 hover:shadow-md transition-shadow bg-background border-border grid grid-rows-[1fr_1fr_0.5fr"
              >
                <div className="flex justify-between items-start mb-4 gap-2">
                  <div className="flex items-start gap-2 flex-1">
                    <div className="p-2 bg-secondary rounded-lg text-primary">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <h3 className="font-serif text-lg font-medium mb-2 text-foreground">{title}</h3>
                  </div>
                  {/* Difficulty Badge */}
                  <div className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${difficultyBadge.bg} ${difficultyBadge.text} ${difficultyBadge.border}`}>
                    {difficultyBadge.label}
                  </div>
                </div>
                <div className="flex flex-col items-start gap-2">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span>{questionCount} Questions</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {estimatedTime} min
                    </span>
                  </div>

                  {/* Score Display */}
                  {scores.latest ? (
                    <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        Latest: <span className="font-semibold text-foreground">{scores.latest.score}/{scores.latest.total} ({Math.round(scores.latest.percentage)}%)</span>
                      </span>
                      {scores.highest && scores.highest.percentage > scores.latest.percentage && (
                        <span>
                          Best: <span className="font-semibold text-foreground">{scores.highest.score}/{scores.highest.total} ({Math.round(scores.highest.percentage)}%)</span>
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
                      <span>No attempts yet</span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => navigate(`/quizzes/${job.id}`, { state: { from: '/quizzes' } })}
                  variant="default"
                  className="w-full gap-2 transition-colors bg-primary text-primary-foreground hover:hover:bg-primary/90"
                >
                  {scores.latest ? 'Retake Quiz' : 'Start Quiz'}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
