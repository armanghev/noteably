import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Brain,
  Check,
  FileText,
  Sparkles,
  Zap,
} from "lucide-react";
import { FadeIn } from "./FadeIn";
import { useWaitlist } from "./useWaitlist";

export const Hero = () => {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 150]);
  const { email, setEmail, isSubmitting, isSubmitted, error, subscribe } =
    useWaitlist();

  return (
    <section className="relative pt-32 pb-20 overflow-hidden bg-background">
      <div className="container mx-auto px-6 text-center z-10 relative">
        <FadeIn>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border mb-8 shadow-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs uppercase tracking-wider font-semibold text-primary">
              AI-Powered Study Assistant
            </span>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h1 className="text-6xl md:text-8xl font-serif mb-6 text-foreground leading-[0.95]">
            Turn content into <br />{" "}
            <span className="italic text-primary">knowledge.</span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload any video, audio, or PDF. Noteably automatically generates
            structured notes, flashcards, and quizzes so you can focus on
            mastering the material.
          </p>
        </FadeIn>

        <FadeIn delay={0.3}>
          <form
            onSubmit={subscribe}
            className="flex flex-col items-center justify-center w-full max-w-md mx-auto relative"
          >
            {isSubmitted ? (
              <div className="flex items-center gap-2 text-primary font-medium bg-primary/10 px-6 py-4 rounded-full w-full justify-center shadow-inner border border-primary/20">
                <Check className="w-5 h-5" />
                <span>You're on the list! We'll be in touch soon.</span>
              </div>
            ) : (
              <div className="w-full">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
                  <Input
                    id="join-waitlist"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    disabled={isSubmitting}
                    className="h-14 rounded-full px-6 text-base bg-card shadow-sm border-border w-full focus-visible:ring-primary"
                  />
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-14 px-8 rounded-full text-base shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all w-full sm:w-auto shrink-0"
                  >
                    {isSubmitting ? "Joining..." : "Join Waitlist"}
                    {!isSubmitting && <ArrowRight className="ml-2 w-4 h-4" />}
                  </Button>
                </div>
                {error && (
                  <p className="text-destructive text-sm mt-2 w-full text-center">
                    {error}
                  </p>
                )}
              </div>
            )}
          </form>
        </FadeIn>
      </div>

      <motion.div
        className="container mx-auto px-4 mt-16 relative"
        style={{ y }}
      >
        <Card className="relative rounded-xl overflow-hidden shadow-2xl border-border pt-0 pl-0 pr-0 pb-0 bg-background/80 md:bg-background/50 backdrop-blur-md md:backdrop-blur-3xl">
          {/* macOS Window Header */}
          <div className="h-8 bg-muted/80 backdrop-blur border-b border-border flex items-center px-4 gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FF5F57] border border-[#E0443E]"></div>
            <div className="w-3 h-3 rounded-full bg-[#FEBC2E] border border-[#D89E24]"></div>
            <div className="w-3 h-3 rounded-full bg-[#28C840] border border-[#1AAB29]"></div>
            <div className="flex-1 text-center text-xs font-medium text-muted-foreground font-sans">
              Noteably - New Study Set
            </div>
          </div>

          {/* App UI Content */}
          <div className="aspect-[16/10] bg-background flex overflow-hidden relative">
            {/* Sidebar */}
            <div className="w-48 bg-muted/50 border-r border-border hidden sm:flex flex-col p-4 gap-4">
              <div className="flex items-center gap-2 mb-4 opacity-50">
                <div className="w-8 h-8 rounded-lg bg-border"></div>
                <div className="w-20 h-4 rounded-md bg-border"></div>
              </div>
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-2 w-full bg-border rounded-full opacity-60"
                  ></div>
                ))}
              </div>
              <div className="mt-auto space-y-2">
                <div className="h-8 w-full bg-card border border-border rounded-lg shadow-sm"></div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 md:p-8 flex flex-col gap-8">
              {/* Header */}
              <div className="flex justify-between items-center">
                <div>
                  <div className="h-5 w-32 bg-foreground/10 rounded-md mb-2"></div>
                  <div className="h-3 w-48 bg-foreground/5 rounded-md"></div>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>

              {/* Upload Zone */}
              <div className="flex-1 border-2 border-dashed border-primary/30 rounded-2xl bg-card/50 flex flex-col items-center justify-center gap-4 group hover:bg-card/80 transition-colors cursor-pointer">
                <motion.div className="w-16 h-16 rounded-full bg-background flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                  <div className="w-8 h-8 text-primary opacity-80">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" x2="12" y1="3" y2="15" />
                    </svg>
                  </div>
                </motion.div>
                <div className="text-center">
                  <p className="text-primary font-medium mb-1">
                    Drop your lectures here
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF, MP3, MP4 supported
                  </p>
                </div>
              </div>

              {/* Output Cards */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Notes", color: "bg-muted" },
                  { label: "Cards", color: "bg-muted" },
                  { label: "Quiz", color: "bg-muted" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`${item.color} h-24 rounded-xl p-4 flex flex-col justify-between hover:-translate-y-1 transition-transform shadow-sm`}
                  >
                    <div className="w-8 h-8 rounded-full bg-card/50 flex items-center justify-center">
                      {i === 0 && (
                        <FileText className="w-4 h-4 text-primary opacity-75" />
                      )}
                      {i === 1 && (
                        <Brain className="w-4 h-4 text-primary opacity-75" />
                      )}
                      {i === 2 && (
                        <Zap className="w-4 h-4 text-primary opacity-75" />
                      )}
                    </div>
                    <div className="h-2 w-12 bg-primary/10 rounded-full"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </section>
  );
};
