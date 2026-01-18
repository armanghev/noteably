import Layout from '@/components/layout/Layout';
import { Plus, Clock, Trophy, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useJobs } from '@/hooks/useJobs';
import type { Job, QuizContent } from '@/types';

// Helper to check if job has quiz
function hasQuiz(job: Job): boolean {
  return job.generated_content.some(c => c.type === 'quiz');
}

// Helper to get question count from job
function getQuestionCount(job: Job): number {
  const content = job.generated_content.find(c => c.type === 'quiz');
  if (!content) return 0;
  const quizContent = content.content as QuizContent;
  return quizContent.questions?.length || 0;
}

export default function Quizzes() {
  const navigate = useNavigate();
  const { data: jobs, isLoading } = useJobs();

  // Filter for completed jobs with quizzes
  const jobsWithQuizzes = jobs?.filter(job => job.status === 'completed' && hasQuiz(job)) || [];

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
          {jobsWithQuizzes.map(job => {
            const questionCount = getQuestionCount(job);
            const title = job.filename || 'Quiz';

            return (
              <Card
                key={job.id}
                className="p-6 hover:shadow-md transition-shadow bg-background border-border"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-secondary rounded-lg text-primary">
                    <Trophy className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="font-serif text-lg font-medium mb-2 text-foreground">{title}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                  <span>{questionCount} Questions</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {Math.ceil(questionCount * 1.5)} min
                  </span>
                </div>

                <Button
                  onClick={() => navigate(`/quizzes/${job.id}`)}
                  variant="default"
                  className="w-full gap-2 transition-colors bg-primary text-primary-foreground hover:hover:bg-primary/90"
                >
                  Start Quiz
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
