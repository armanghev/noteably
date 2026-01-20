import Layout from '../components/layout/Layout';
import { BookOpen, Search, Filter, Loader2, FileText, Brain, Zap, ScrollText, StickyNote } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useJobs } from '@/hooks/useJobs';
import { formatFileType } from '@/lib/utils';
import type { JobListItem, MaterialType } from '@/types';

// Icon mapping for content types
const contentTypeIcons: Record<MaterialType, React.ComponentType<{ className?: string }>> = {
  summary: ScrollText,
  notes: StickyNote,
  flashcards: Brain,
  quiz: Zap,
  quizzes: Zap,
};

const contentTypeLabels: Record<MaterialType, string> = {
  summary: 'Summary',
  notes: 'Notes',
  flashcards: 'Flashcards',
  quiz: 'Quiz',
  quizzes: 'Quiz',
};

export default function StudySets() {
  const navigate = useNavigate();
  const { data: jobs, isLoading } = useJobs();

  // Helper function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Filter for completed jobs only - show all study sets regardless of content type
  const completedJobs = jobs?.filter(job => job.status === 'completed') || [];

  // Navigate to study set detail page
  const getNavigationPath = (job: JobListItem) => {
    return `/study-sets/${job.id}`;
  };

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
        <h1 className="text-3xl font-serif text-foreground">Study Sets</h1>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search study sets..."
              className="pl-10 pr-4 py-2 rounded-full border border-border focus:outline-none focus:border-primary w-64 bg-background"
            />
          </div>
          <Button size="icon" variant="outline" className="rounded-full text-muted-foreground">
            <Filter className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {completedJobs.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-2">No study sets yet.</p>
          <p className="text-sm text-muted-foreground mb-6">Upload your first file to generate study materials!</p>
          <Button onClick={() => navigate('/upload')} className="gap-2">
            <FileText className="w-4 h-4" />
            Upload File
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {completedJobs.map(job => {
            const hasFlashcards = job.content_types.includes('flashcards');
            const hasQuiz = job.content_types.includes('quiz') || job.content_types.includes('quizzes');

            return (
              <Card
                key={job.id}
                onClick={() => navigate(getNavigationPath(job), { state: { from: '/study-sets' } })}
                className="grid grid-rows-[1fr_3fr_0.5fr] p-6 cursor-pointer hover:shadow-md transition-shadow group bg-background border-border"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-secondary rounded-lg text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(job.created_at)}</span>
                </div>
                <div className="flex flex-col justify-between items-start gap-2">
                  <div className="flex flex-col gap-0.5">
                    <h3 className="font-serif text-lg font-medium mb-2 text-foreground">{job.summary_title || job.filename}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {job.summary_preview || 'Study materials generated from your content.'}
                    </p>
                  </div>

                  {/* Content Type Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {job.content_types.map((type) => {
                      const Icon = contentTypeIcons[type];
                      const label = contentTypeLabels[type];
                      return (
                        <span
                          key={type}
                          className="text-xs px-2 py-1 bg-muted rounded-md text-muted-foreground flex items-center gap-1"
                        >
                          {Icon && <Icon className="w-3 h-3" />}
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
                  {hasFlashcards && (
                    <span className="flex items-center gap-1">
                      <Brain className="w-3 h-3" />
                      {job.flashcard_count} cards
                    </span>
                  )}
                  {hasQuiz && (
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {job.quiz_count} questions
                    </span>
                  )}
                  <span className="text-xs px-2 py-0.5 bg-muted rounded-md">
                    {formatFileType(job.file_type)}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
