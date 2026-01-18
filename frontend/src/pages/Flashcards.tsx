import Layout from '../components/layout/Layout';
import { useState } from 'react';
import { Plus, Brain, MoreVertical, Edit2, Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import mockData from '../data/mockData.json';

export default function Flashcards() {

   return (
      <Layout>
         <header className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-serif text-foreground">Flashcards</h1>
            <Button className="gap-2">
               <Plus className="w-4 h-4" /> Create Deck
            </Button>
         </header>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockData.flashcardDecks.map(deck => (
               <FlashcardDeck key={deck.id} deck={deck} />
            ))}
         </div>
      </Layout>
   );
}

function FlashcardDeck({ deck }: { deck: typeof mockData.flashcardDecks[0] }) {
   const navigate = useNavigate();
   const [isMenuOpen, setIsMenuOpen] = useState(false);

   return (
      <Card
         onClick={() => navigate(`/flashcards/${deck.id}`)}
         className="p-6 cursor-pointer hover:shadow-md transition-shadow group bg-background border-border"
      >
         <div className="flex justify-between items-start mb-4">
            <div className={`p-2 rounded-lg transition-colors ${isMenuOpen
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-primary group-hover:bg-primary group-hover:text-primary-foreground"
               }`}>
               <Brain className="w-5 h-5" />
            </div>
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
               <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                     <MoreVertical className="w-4 h-4" />
                  </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} className="border-border bg-background p-0">
                  <DropdownMenuItem className="w-full h-full rounded-t-md rounded-b-none p-2">
                     <Edit2 className="mr-2 h-4 w-4" />
                     Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-none p-2">
                     <Pencil className="mr-2 h-4 w-4" />
                     Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-t-none rounded-b-md text-destructive focus:text-destructive p-2">
                     <Trash2 className="mr-2 h-4 w-4" />
                     Delete
                  </DropdownMenuItem>
               </DropdownMenuContent>
            </DropdownMenu>
         </div>
         <h3 className="font-serif text-lg font-medium mb-2 text-foreground">{deck.title}</h3>
         <p className="text-sm text-muted-foreground mb-6">{deck.cards.length} cards</p>
      </Card>
   );
}
