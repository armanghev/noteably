import { Brain, FileText, Search, Zap } from "lucide-react";
import { FadeIn } from "./FadeIn";

export const Features = () => {
  const features = [
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Auto-Transcription",
      desc: "Instant, accurate transcripts from lectures, meetings, or YouTube videos. Never miss a word again.",
    },
    {
      icon: <Brain className="w-6 h-6" />,
      title: "Smart Flashcards",
      desc: "AI identifies key concepts and definitions to create spaced-repetition decks automatically.",
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Practice Quizzes",
      desc: "Test yourself with generated multiple-choice and short-answer questions before the real exam.",
    },
    {
      icon: <Search className="w-6 h-6" />,
      title: "Semantic Search",
      desc: "Ask questions like 'What did the professor say about mitocondria?' and get the exact timestamp.",
    },
  ];

  return (
    <section className="py-24 bg-background relative" id="features">
      {/* Background gradients */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-[128px] pointer-events-none" />
      <div className="container mx-auto px-6 relative z-10 max-w-5xl">
        <FadeIn>
          <div className="flex flex-col-reverse sm:flex-row items-center sm:items-end justify-between gap-8 mb-16 px-4 sm:px-0">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif text-foreground leading-[1.1] text-center sm:text-left">
              Your personal <br />
              <span className="text-primary italic">AI tutor.</span>
            </h2>
            <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full overflow-hidden border-[6px] border-background shadow-2xl shrink-0 -mt-8 sm:mt-0">
              <img
                src="/nota.png"
                alt="Nota AI Agent"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {features.map((f, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div className="group h-full p-8 rounded-3xl border border-border hover:border-primary/40 bg-card/40 hover:bg-card transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1">
                <div className="flex flex-col h-full">
                  <div className="w-14 h-14 mb-6 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300 shadow-inner">
                    {f.icon}
                  </div>
                  <h3 className="text-2xl font-serif font-medium mb-3 text-foreground">
                    {f.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed flex-grow">
                    {f.desc}
                  </p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
};
