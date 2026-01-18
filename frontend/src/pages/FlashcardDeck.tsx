import { useState } from 'react';
import { ArrowLeft, RotateCw, ArrowRight, ArrowLeft as PrevIcon, LayoutGrid, Layers, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { useJob } from '@/hooks/useJobs';
import type { FlashcardsContent, Flashcard } from '@/types';

// Helper to extract flashcards from job
function getFlashcardsContent(job: NonNullable<ReturnType<typeof useJob>['data']>): Flashcard[] {
  const content = job.generated_content.find(c => c.type === 'flashcards');
  if (!content) return [];
  const flashcardsContent = content.content as FlashcardsContent;
  return flashcardsContent.flashcards || [];
}

export default function FlashcardDeck() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: job, isLoading } = useJob(id);
  const [isStudyMode, setIsStudyMode] = useState(true);
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [direction, setDirection] = useState(0);

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
          <h2 className="text-2xl font-serif text-foreground">Deck not found</h2>
          <Button variant="link" onClick={() => navigate('/flashcards')} className="text-primary hover:underline mt-4">Back to Flashcards</Button>
        </div>
      </Layout>
    );
  }

  const cards = getFlashcardsContent(job);
  const deckTitle = job.filename || 'Flashcards';

  if (cards.length === 0) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h2 className="text-2xl font-serif text-foreground">No flashcards found</h2>
          <Button variant="link" onClick={() => navigate('/flashcards')} className="text-primary hover:underline mt-4">Back to Flashcards</Button>
        </div>
      </Layout>
    );
  }

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  };

  const handleNext = () => {
    if (currentCard < cards.length - 1) {
      setDirection(1);
      setIsFlipped(false);
      setCurrentCard(c => c + 1);
    }
  };

  const handlePrev = () => {
    if (currentCard > 0) {
      setDirection(-1);
      setIsFlipped(false);
      setCurrentCard(c => c - 1);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        <header className="flex justify-between items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/flashcards')}
            className="flex items-center text-muted-foreground hover:text-primary transition-colors pl-0 hover:bg-transparent"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Decks
          </Button>

          <div className="flex bg-card rounded-lg p-1 border border-border shadow-sm">
            <Button
              variant={isStudyMode ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setIsStudyMode(true)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${isStudyMode ? 'bg-accent text-accent-foreground hover:bg-[#4f5c44]' : 'text-muted-foreground hover:text-gray-900 hover:bg-transparent'}`}
            >
              <Layers className="w-4 h-4" /> Study
            </Button>
            <Button
              variant={!isStudyMode ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setIsStudyMode(false)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${!isStudyMode ? 'bg-accent text-accent-foreground hover:bg-[#4f5c44]' : 'text-muted-foreground hover:text-gray-900 hover:bg-transparent'}`}
            >
              <LayoutGrid className="w-4 h-4" /> List
            </Button>
          </div>
        </header>

        <h1 className="text-3xl font-serif text-foreground mb-2 text-center">{deckTitle}</h1>
        <p className="text-muted-foreground text-center mb-8">{currentCard + 1} of {cards.length}</p>

        {isStudyMode ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] overflow-hidden">
            {/* Flip Card Area */}
            <div className="w-full max-w-2xl aspect-[3/2] perspective-1000 relative">
              <AnimatePresence initial={false} custom={direction}>
                <motion.div
                  key={currentCard}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 500, damping: 35 },
                    opacity: { duration: 0.15 }
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
                    <div className="absolute inset-0 backface-hidden bg-secondary rounded-3xl shadow-xl flex items-center justify-center p-12 border border-border text-center">
                      <h3 className="text-2xl font-medium text-foreground">{cards[currentCard].front}</h3>
                      <p className="absolute bottom-6 text-muted-foreground text-sm">Click to flip</p>
                    </div>

                    {/* Back */}
                    <div className="absolute inset-0 backface-hidden bg-accent rounded-3xl shadow-xl flex items-center justify-center p-12 text-center" style={{ transform: 'rotateY(180deg)' }}>
                      <h3 className="text-xl text-accent-foreground/90 leading-relaxed">{cards[currentCard].back}</h3>
                    </div>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-8 mt-12">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrev}
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
                onClick={handleNext}
                disabled={currentCard === cards.length - 1}
                className="w-14 h-14 rounded-full bg-accent text-accent-foreground hover:hover:bg-accent/90 shadow-lg"
              >
                <ArrowRight className="w-6 h-6" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 max-w-3xl mx-auto w-full">
            {cards.map((card, i) => (
              <Card key={i} className="p-6 flex flex-col md:flex-row gap-4 hover:shadow-[0px_0px_10px_0px] hover:shadow-primary hover:border-primary transition-colors bg-background border-border">
                <div className="flex-1 font-medium text-foreground">{card.front}</div>
                <div className="hidden md:block w-px bg-muted"></div>
                <div className="flex-1 text-muted-foreground">{card.back}</div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
