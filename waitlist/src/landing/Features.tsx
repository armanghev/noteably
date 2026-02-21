import { motion } from "framer-motion";
import { Brain, FileText, Search, Sparkles, Zap } from "lucide-react";
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
      {/* Mobile Layout */}
      <div className="block lg:hidden">
        <div className="hidden md:block absolute top-1/2 right-0 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-[128px] pointer-events-none" />
        <div className="container mx-auto px-6 relative z-10 max-w-6xl">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-start">
            <div className="w-full lg:w-5/12 lg:sticky lg:top-32">
              <FadeIn>
                <div className="flex lg:hidden sm:flex-row items-center sm:items-end justify-between gap-8 mb-12 sm:px-0">
                  <h2 className="text-4xl md:text-5xl font-serif text-foreground leading-[1.1] sm:text-left">
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
            </div>

            <div className="w-full lg:w-7/12 lg:pt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:hidden">
                {features.map((f, i) => (
                  <FadeIn key={i} delay={i * 0.1}>
                    <div className="group h-full p-6 sm:p-8 rounded-3xl border border-border hover:border-primary/40 bg-card/40 hover:bg-card transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1">
                      <div className="flex flex-col h-full">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 mb-4 sm:mb-6 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300 shadow-inner">
                          {f.icon}
                        </div>
                        <h3 className="text-xl sm:text-2xl font-serif font-medium mb-2 sm:mb-3 text-foreground">
                          {f.title}
                        </h3>
                        <p className="text-muted-foreground text-sm sm:text-base flex-grow">
                          {f.desc}
                        </p>
                      </div>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block">
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-[128px] pointer-events-none" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row gap-16 items-start">
            <div className="w-full lg:w-5/12 sticky top-32">
              <FadeIn>
                <h2 className="text-4xl md:text-5xl font-serif mb-12 text-foreground leading-[1.1]">
                  Your personal <br />
                  <span className="text-primary italic">AI tutor.</span>
                </h2>

                <div className="relative w-full aspect-square max-w-md mx-auto lg:mx-0">
                  <div className="absolute inset-0 bg-primary/20 blur-[80px] rounded-full scale-90" />

                  <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-b from-primary/5 to-transparent flex items-center justify-center p-8 border border-primary/10">
                    <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-background shadow-lg">
                      <img
                        src="/nota.png"
                        alt="Nota AI Agent"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      whileInView={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 0.5, duration: 0.5 }}
                      className="absolute bottom-8 right-8 bg-background/90 backdrop-blur-md p-4 rounded-xl shadow-lg border border-primary/20 max-w-[220px]"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                          Nota
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">
                        "I've analyzed your lecture. Ready to quiz you on the
                        key concepts?"
                      </p>
                    </motion.div>
                  </div>
                </div>
              </FadeIn>
            </div>

            <div className="w-full lg:w-7/12 pt-8">
              <div className="grid grid-cols-1 gap-8">
                {features.map((f, i) => (
                  <FadeIn key={i} delay={i * 0.1}>
                    <div className="group p-4 rounded-2xl border border-border hover:border-primary/50 bg-card/30 hover:bg-card transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1">
                      <div className="flex items-start gap-4">
                        <div className="mb-4 inline-flex p-3 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300 shrink-0">
                          {f.icon}
                        </div>
                        <div>
                          <h3 className="text-xl font-serif font-medium mb-2 text-foreground">
                            {f.title}
                          </h3>
                          <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                            {f.desc}
                          </p>
                        </div>
                      </div>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
