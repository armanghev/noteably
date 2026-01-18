import Layout from '../components/layout/Layout';
import { Upload, FileText, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useJobs } from '@/hooks/useJobs';
import { useAuth } from '@/hooks/useAuth';
import type { Job, FlashcardsContent } from '@/types';

// Helper to get flashcard count from job
function getFlashcardCount(job: Job): number {
  const content = job.generated_content.find(c => c.type === 'flashcards');
  if (!content) return 0;
  const flashcardsContent = content.content as FlashcardsContent;
  return flashcardsContent.flashcards?.length || 0;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: jobs, isLoading } = useJobs();
  const { user } = useAuth();

  // Get recent activity (last 5 completed jobs, most recent first)
  const recentJobs = jobs
    ?.filter(job => job.status === 'completed')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5) || [];

  // Calculate stats
  const totalNotes = jobs?.filter(job => job.status === 'completed').length || 0;
  const totalFlashcards = jobs
    ?.filter(job => job.status === 'completed')
    .reduce((acc, job) => acc + getFlashcardCount(job), 0) || 0;

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

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
      <header className="mb-8">
        <h1 className="text-3xl font-serif text-foreground mb-2">Welcome back, {userName}</h1>
        <p className="text-muted-foreground">Here's what's happening with your study materials.</p>
      </header>

      {/* Quick Action - Upload */}
      <div
        onClick={() => navigate('/upload')}
        className="rounded-3xl p-8 mb-10 overflow-hidden relative group cursor-pointer transition-transform hover:scale-[1.01] shadow-[0_0_30px_var(--primary)] bg-transparent"
      >
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="w-12 h-12 bg-card/10 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm bg-background">
              <Upload className="w-6 h-6 text-card-foreground" />
            </div>
            <h2 className="text-2xl font-serif mb-2">Upload New Material</h2>
            <p className="text-muted-foreground max-w-md">Drag and drop your audio lectures or PDF notes here to instantly generate study aids.</p>
          </div>
          <Button className="px-6 py-5 bg-foreground text-background shadow-md shadow-primary rounded-full font-medium transition-colors">
            Start Upload
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-medium text-foreground">Recent Activity</h2>
            <Button variant="ghost" className="text-sm text-primary hover:text-primary hover:bg-transparent hover:underline px-0" onClick={() => navigate('/notes')}>View All</Button>
          </div>

          {recentJobs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No recent activity yet. Upload your first file to get started!</p>
              <Button onClick={() => navigate('/upload')}>Upload File</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentJobs.map((job) => {
                const flashcardCount = getFlashcardCount(job);
                return (
                  <Card 
                    key={job.id} 
                    className="p-4 flex items-center gap-4 hover:shadow-sm transition-shadow border-border bg-background cursor-pointer"
                    onClick={() => navigate(`/notes/${job.id}`)}
                  >
                    <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center text-primary">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">{job.filename}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(job.created_at).toLocaleDateString()}</span>
                        {flashcardCount > 0 && (
                          <>
                            <span>•</span>
                            <span>{flashcardCount} flashcards</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-muted">
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Stats / Quick Stats */}
        <div className="space-y-6">
          <Card className="p-6 bg-background border-border shadow-sm">
            <h3 className="font-medium text-muted-foreground text-sm mb-1 uppercase tracking-wider">Total Notes</h3>
            <p className="text-4xl font-serif text-foreground">{totalNotes}</p>
          </Card>
          <Card className="p-6 bg-background border-border shadow-sm">
            <h3 className="font-medium text-muted-foreground text-sm mb-1 uppercase tracking-wider">Flashcards</h3>
            <p className="text-4xl font-serif text-foreground">{totalFlashcards}</p>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
