import { useState } from 'react';
import { ArrowLeft, CheckCircle2, XCircle, ArrowRight, Timer, Trophy, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useJob } from '@/hooks/useJobs';
import type { QuizContent, QuizQuestion } from '@/types';

// Helper to extract quiz content from job
function getQuizContent(job: NonNullable<ReturnType<typeof useJob>['data']>): QuizQuestion[] {
  const content = job.generated_content.find(c => c.type === 'quiz');
  if (!content) return [];
  const quizContent = content.content as QuizContent;
  return quizContent.questions || [];
}

export default function QuizDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: job, isLoading } = useJob(id);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);

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
          <h2 className="text-2xl font-serif text-foreground">Quiz not found</h2>
          <Button variant="link" onClick={() => navigate('/quizzes')} className="text-primary hover:underline mt-4">Back to Quizzes</Button>
        </div>
      </Layout>
    );
  }

  const questions = getQuizContent(job);

  if (questions.length === 0) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h2 className="text-2xl font-serif text-foreground">No quiz questions found</h2>
          <Button variant="link" onClick={() => navigate('/quizzes')} className="text-primary hover:underline mt-4">Back to Quizzes</Button>
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
    const correctAnswer = questions[currentQuestion].correct_answer ?? questions[currentQuestion].correctAnswer ?? 0;
    if (selectedOption === correctAnswer) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(c => c + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setShowResults(true);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setShowResults(false);
  };

  if (showResults) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
            <Trophy className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-serif text-foreground mb-2">Quiz Complete!</h2>
          <p className="text-muted-foreground mb-8">You scored {score} out of {questions.length}</p>

          <div className="bg-background p-6 rounded-2xl border border-border mb-8 max-w-sm mx-auto">
            <div className="text-4xl font-bold text-primary mb-1">{Math.round((score / questions.length) * 100)}%</div>
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Accuracy</p>
          </div>

          <div className="w-full flex items-center justify-center gap-9">
            <Button
              onClick={resetQuiz}
              className="w-[175px] py-6 bg-primary text-primary-foreground rounded-full hover:hover:bg-primary/90 transition-colors"
            >
              Retake Quiz
            </Button>
            <Button
              onClick={() => navigate('/quizzes')}
              className="w-[175px] py-6 bg-primary text-primary-foreground rounded-full hover:hover:bg-primary/90 transition-colors"
            >
              Back to Quizzes
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const currentQ = questions[currentQuestion];
  const questionText = currentQ.text || currentQ.question || '';
  const correctAnswer = currentQ.correct_answer ?? currentQ.correctAnswer ?? 0;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/quizzes')}
            className="flex items-center text-muted-foreground hover:text-primary transition-colors pl-0 hover:bg-transparent"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quit Quiz
          </Button>
          <div className="flex items-center gap-2 text-muted-foreground bg-card px-3 py-1 rounded-full border border-border shadow-sm">
            <Timer className="w-4 h-4" />
            <span className="text-sm font-mono">14:20</span>
          </div>
        </header>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Question {currentQuestion + 1} of {questions.length}</span>
            <span>{Math.round(((currentQuestion) / questions.length) * 100)}% completed</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${((currentQuestion) / questions.length) * 100}%` }}
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
                className={`w-full h-auto p-4 rounded-xl border-2 justify-between group ${selectedOption === i
                  ? 'border-primary bg-secondary text-primary'
                  : 'border-border hover:border-border text-muted-foreground'
                  } ${isAnswered && i === correctAnswer
                    ? 'border-green-500 text-green-700'
                    : ''
                  } ${isAnswered && selectedOption === i && i !== correctAnswer
                    ? 'border-red-500 text-red-700'
                    : ''
                  }`}
              >
                <span className="flex-1 text-left">{option}</span>
                {selectedOption === i && !isAnswered && (
                  <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
                  </div>
                )}
                {isAnswered && i === correctAnswer && (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                )}
                {isAnswered && selectedOption === i && i !== correctAnswer && (
                  <XCircle className="w-5 h-5 text-red-500" />
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
                {currentQuestion < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
}
