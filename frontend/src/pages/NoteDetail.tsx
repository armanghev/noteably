import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatFileType } from '@/lib/utils';
import { ArrowLeft, BookOpen, Download, FileText, Loader2, Quote, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { useJob } from '@/hooks/useJobs';
import type { Job, SummaryContent, NotesContent, FlashcardsContent, Flashcard } from '@/types';

// Helper functions to extract and type content
function getSummaryContent(job: Job): SummaryContent | null {
  const content = job.generated_content.find(c => c.type === 'summary');
  if (!content) return null;
  return content.content as SummaryContent;
}

function getNotesContent(job: Job): NotesContent | null {
  const content = job.generated_content.find(c => c.type === 'notes');
  if (!content) return null;
  return content.content as NotesContent;
}

function getFlashcardsContent(job: Job): Flashcard[] {
  const content = job.generated_content.find(c => c.type === 'flashcards');
  if (!content) return [];
  const flashcardsContent = content.content as FlashcardsContent;
  return flashcardsContent.flashcards || [];
}

export default function NoteDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: job, isLoading: loading, error: jobError } = useJob(id);
  const [activeSection, setActiveSection] = useState('summary');

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['summary', 'notes', 'flashcards', 'transcript'];
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= 300) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const error = jobError ? 'Failed to load note.' : null;
  if (error || !job) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h2 className="text-2xl font-serif text-foreground">Note not found</h2>
          <Button variant="link" onClick={() => navigate('/notes')} className="text-primary hover:underline mt-4">Back to Notes</Button>
        </div>
      </Layout>
    );
  }

  // Extract and type content properly
  const summaryContent = getSummaryContent(job);
  const notesContent = getNotesContent(job);
  const flashcards = getFlashcardsContent(job);

  // Parse content for display
  const summaryText = summaryContent?.summary || "No summary available.";
  const generatedTitle = summaryContent?.title || null;

  // Study Notes from markdown content
  const studyNotesMarkdown = notesContent?.content || "";

  // Transcript
  const transcriptText = job.transcription_text || "No transcript available.";

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/notes')}
          className="flex items-center text-muted-foreground hover:text-primary transition-colors mb-6 pl-0 hover:bg-transparent"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Notes
        </Button>

        <header className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex gap-2 mb-3">
                <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded-md">{formatFileType(job.file_type)}</span>
                <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-md">{new Date(job.created_at).toLocaleDateString()}</span>
              </div>
              <h1 className="text-4xl font-serif text-foreground mb-2">{generatedTitle || job.filename}</h1>
            </div>
            <div className="flex gap-2">
              <Button size="icon" variant="outline" className="text-muted-foreground hover:text-primary rounded-full hover:bg-muted">
                <Share2 className="w-5 h-5" />
              </Button>
              <Button size="icon" variant="outline" className="text-muted-foreground hover:text-primary rounded-full hover:bg-muted">
                <Download className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Audio Player Placeholder - Only show if audio? */}
          {/* <div className="p-4 rounded-xl border border-border flex items-end gap-4 bg-background"> ... </div> */}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content (Left 3 cols) */}
          <div className="lg:col-span-3 space-y-8">
            <Card id="summary" className="p-8 shadow-sm bg-background border border-border scroll-mt-24">
              <div className="flex items-center gap-2 mb-6">
                <BookOpen className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-medium text-foreground">Summary</h2>
              </div>
              <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {summaryText}
              </div>
            </Card>

            {/* Study Notes Markdown Display */}
            {studyNotesMarkdown && (
              <Card id="notes" className="p-8 shadow-sm bg-background border border-border scroll-mt-24">
                <div className="flex items-center gap-2 mb-6">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-medium text-foreground">Study Notes</h2>
                </div>
                <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground prose-ul:text-muted-foreground prose-ol:text-muted-foreground marker:text-primary">
                  <ReactMarkdown>{studyNotesMarkdown}</ReactMarkdown>
                </div>
              </Card>
            )}

            {flashcards.length > 0 && (
              <Card id="flashcards" className="p-8 shadow-sm bg-background border border-border scroll-mt-24">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Quote className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-medium text-foreground">Flashcards</h2>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/flashcards/${id}`)}>
                    Open Flashcards
                  </Button>
                </div>
                <div className="space-y-4">
                  {flashcards.map((card, i) => (
                    <div key={i} className="p-4 bg-background rounded-xl border border-border grid grid-cols-1 md:grid-cols-3 gap-4">
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

            {/* Transcript Display */}
            <Card id="transcript" className="p-8 shadow-sm bg-background border border-border scroll-mt-24">
              <div className="flex items-center gap-2 mb-6">
                <FileText className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-medium text-foreground">Transcript</h2>
              </div>
              <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {transcriptText ? (
                  <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground prose-ul:text-muted-foreground prose-ol:text-muted-foreground marker:text-primary leading-relaxed">
                    <ReactMarkdown>{transcriptText}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No transcript available.</p>
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar Navigation */}
          <div className="space-y-6">
            <div className="sticky top-24">
              <p className="font-medium text-foreground mb-4 pl-4">On this page</p>
              <nav className="flex flex-col space-y-1">
                {['Summary', 'Notes', 'Flashcards', 'Transcript'].map((item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase()}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(item.toLowerCase())?.scrollIntoView({ behavior: 'smooth' });
                      setActiveSection(item.toLowerCase());
                    }}
                    className={`px-4 py-2 text-sm rounded-md transition-colors text-left block ${activeSection === item.toLowerCase()
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-primary hover:bg-muted/50'
                      }`}
                  >
                    {item}
                  </a>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
