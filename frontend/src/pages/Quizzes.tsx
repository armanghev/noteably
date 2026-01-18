import Layout from '@/components/layout/Layout';
import { Plus, Clock, Trophy, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import mockData from '@/data/mockData.json';

export default function Quizzes() {
   const navigate = useNavigate();

   return (
      <Layout>
         <header className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-serif text-foreground">Practice Quizzes</h1>
            <Button className="gap-2">
               <Plus className="w-4 h-4" /> New Quiz
            </Button>
         </header>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockData.quizzes.map(quiz => (
               <Card
                  key={quiz.id}
                  className="p-6 hover:shadow-md transition-shadow bg-background border-border"
               >
                  <div className="flex justify-between items-start mb-4">
                     <div className="p-2 bg-secondary rounded-lg text-primary">
                        <Trophy className="w-5 h-5" />
                     </div>
                     {quiz.lastScore && (
                        <span className="text-xs font-medium px-2 py-1 bg-green-50 text-green-700 rounded-md">Score: {quiz.lastScore}%</span>
                     )}
                  </div>
                  <h3 className="font-serif text-lg font-medium mb-2 text-foreground">{quiz.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                     <span>{quiz.questions.length} Questions</span>
                     <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {quiz.timeEstimate}</span>
                  </div>

                  <Button
                     onClick={() => navigate(`/quizzes/${quiz.id}`)}
                     variant={quiz.lastScore ? 'outline' : 'default'}
                     className={`w-full gap-2 transition-colors ${quiz.lastScore
                        ? 'border-2 border-primary text-primary hover:bg-secondary'
                        : 'bg-primary text-primary-foreground hover:hover:bg-primary/90'
                        }`}
                  >
                     {quiz.lastScore ? 'Retake Quiz' : 'Start Quiz'}
                     <ArrowRight className="w-4 h-4" />
                  </Button>
               </Card>
            ))
            }
         </div>
      </Layout>
   );
}
