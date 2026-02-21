import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { ArrowRight, Check, Sparkles, X, Zap } from "lucide-react";
import { FadeIn } from "./FadeIn";
import { useWaitlist } from "./useWaitlist";

export const Comparison = () => {
  const { email, setEmail, isSubmitting, isSubmitted, error, subscribe } =
    useWaitlist();

  return (
    <section className="py-32 bg-card relative overflow-hidden" id="comparison">
      {/* Background Gradients */}
      <div className="hidden md:block absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-[128px] pointer-events-none" />
      <div className="hidden md:block absolute bottom-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[128px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-20">
          <FadeIn>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4 border border-primary/20 shadow-inner">
              <Sparkles className="w-3 h-3" />
              <span>THE UPGRADE</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-serif text-foreground mb-6">
              Stop learning the{" "}
              <span className="italic text-muted-foreground line-through decoration-destructive/50 decoration-2">
                hard way.
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-medium">
              Traditional studying burns you out. Noteably gives you
              superpowers.
            </p>
          </FadeIn>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* The Old Way */}
          <FadeIn delay={0.1}>
            <div className="h-full p-8 rounded-3xl bg-muted/30 border border-border/50 relative overflow-hidden group">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-destructive/20 to-transparent opacity-50" />

              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center shadow-sm">
                  <X className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-serif text-muted-foreground">
                  Manual Study
                </h3>
              </div>

              <ul className="space-y-6">
                {[
                  "Rewinding the video every 10 seconds",
                  "Messy, unorganized scribbles",
                  "Spending hours verifying facts",
                  "Losing track of important sources",
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-4 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors font-medium"
                  >
                    <X className="w-5 h-5 text-destructive/50 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>

          {/* Noteably Way */}
          <FadeIn delay={0.2}>
            <div className="h-full p-8 rounded-3xl bg-card border-2 border-primary/20 relative overflow-hidden shadow-2xl shadow-primary/5 group hover:border-primary/40 transition-colors">
              {/* Glowing background */}
              <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
              <div className="hidden md:block absolute -top-24 -right-24 w-48 h-48 bg-primary/20 blur-[64px] rounded-full pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                      <Zap className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-serif text-foreground">
                      With Noteably
                    </h3>
                  </div>
                  <div className="bg-primary/10 text-primary text-sm font-bold px-3 py-1 rounded-full border border-primary/20 shadow-sm">
                    10x FASTER
                  </div>
                </div>

                <ul className="space-y-6">
                  {[
                    "Instant, accurate video transcripts",
                    "Perfectly structured AI summaries",
                    "One-click flashcards & quizzes",
                    "Source-backed citations",
                    "On demand AI Assistant",
                  ].map((item, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="flex items-center gap-4 text-foreground font-medium"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
                        <Check className="w-3.5 h-3.5 text-primary-foreground stroke-[3]" />
                      </div>
                      <span>{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* CTA */}
        <FadeIn delay={0.4}>
          <div className="mt-20 max-w-md mx-auto relative z-20" id="pricing">
            <div className="bg-card p-8 rounded-3xl shadow-2xl border border-primary/20">
              <h3 className="text-2xl font-serif text-center mb-6 text-foreground font-medium">
                Ready for early access?
              </h3>
              <form
                onSubmit={subscribe}
                className="flex flex-col gap-4 relative"
              >
                {isSubmitted ? (
                  <div className="flex items-center gap-2 text-primary font-medium bg-primary/10 px-6 py-4 rounded-xl w-full justify-center shadow-inner border border-primary/20">
                    <Check className="w-5 h-5" />
                    <span>You're on the list! We'll be in touch soon.</span>
                  </div>
                ) : (
                  <>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      disabled={isSubmitting}
                      className="h-14 rounded-xl px-6 text-base bg-background shadow-sm border-border w-full focus-visible:ring-primary"
                    />
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="h-14 rounded-xl text-base shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all w-full"
                    >
                      {isSubmitting ? "Joining..." : "Join the waitlist now"}
                      {!isSubmitting && <ArrowRight className="ml-2 w-5 h-5" />}
                    </Button>
                    {error && (
                      <p className="text-destructive text-sm text-center">
                        {error}
                      </p>
                    )}
                  </>
                )}
              </form>
              <p className="mt-6 text-sm text-center text-muted-foreground font-medium">
                Be the first to know when we launch. No spam, ever.
              </p>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
};
