import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Brain,
  File,
  FileText,
  Mic,
  Sparkles,
  Youtube,
  Zap,
} from "lucide-react";
import { FadeIn } from "./FadeIn";

export const Hero = () => {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 150]);

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
          <div className="flex justify-center w-full mt-8">
            <Button
              onClick={() => window.dispatchEvent(new Event("open-waitlist"))}
              className="h-14 px-8 rounded-full text-base shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all w-full sm:w-auto"
            >
              Join Waitlist
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </FadeIn>
      </div>

      <motion.div
        className="container mx-auto px-4 mt-20 relative"
        style={{ y }}
      >
        <div className="relative w-full max-w-5xl mx-auto rounded-3xl overflow-hidden shadow-2xl bg-background/40 backdrop-blur-xl border border-primary/10 p-8 md:p-16 flex flex-col md:flex-row items-center justify-between gap-12">
          {/* Left Side: Inputs */}
          <div className="flex flex-row md:flex-col gap-6 md:gap-8 justify-center relative z-10 w-full md:w-1/4">
            <motion.div
              animate={{ y: [0, -8, 0], x: [0, 4, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-16 h-16 rounded-2xl bg-card border border-border shadow-lg flex items-center justify-center shrink-0"
            >
              <Youtube className="w-8 h-8 text-red-500 opacity-80" />
            </motion.div>

            <motion.div
              animate={{ y: [0, 10, 0], x: [0, -5, 0] }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
              className="w-16 h-16 rounded-2xl bg-card border border-border shadow-lg flex items-center justify-center -ml-4 md:ml-8 shrink-0"
            >
              <Mic className="w-8 h-8 text-blue-500 opacity-80" />
            </motion.div>

            <motion.div
              animate={{ y: [0, -5, 0], x: [0, 5, 0] }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 2,
              }}
              className="w-16 h-16 rounded-2xl bg-card border border-border shadow-lg flex items-center justify-center shrink-0"
            >
              <File className="w-8 h-8 text-emerald-500 opacity-80" />
            </motion.div>
          </div>

          {/* Center: AI Engine */}
          <div className="relative flex items-center justify-center z-10 w-full md:w-2/4 aspect-square md:aspect-auto md:h-64">
            <div className="absolute inset-0 bg-primary/20 blur-[64px] rounded-full scale-150 animate-pulse pointer-events-none" />

            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[-40px] md:inset-[-60px] rounded-full border border-dashed border-primary/20 pointer-events-none"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[-20px] md:inset-[-30px] rounded-full border border-dashed border-primary/30 pointer-events-none"
            />

            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-xl shadow-primary/30 flex items-center justify-center relative z-20 border-4 border-background">
              <Brain className="w-12 h-12 md:w-16 md:h-16 text-primary-foreground" />
              <div className="absolute top-0 right-0 -mt-2 -mr-2 w-8 h-8 rounded-full bg-background flex items-center justify-center shadow-lg border border-border">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
            </div>
          </div>

          {/* Right Side: Outputs */}
          <div className="flex flex-col gap-4 relative z-10 w-full md:w-1/4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="w-full bg-card border border-border rounded-xl p-4 shadow-lg flex items-start gap-3 transform md:translate-x-4"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <div className="space-y-2 w-full pt-1">
                <div className="h-2 w-16 bg-muted-foreground/30 rounded" />
                <div className="h-2 w-full bg-muted rounded" />
                <div className="h-2 w-4/5 bg-muted rounded" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="w-full bg-card border border-border rounded-xl p-4 shadow-lg flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4 text-primary" />
              </div>
              <div className="w-full pt-1 pb-1">
                <div className="h-3 w-24 bg-foreground/80 rounded mb-2" />
                <div className="h-2 w-20 bg-muted-foreground/50 rounded" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="w-full bg-card border border-border rounded-xl p-4 shadow-lg flex items-start gap-3 transform md:-translate-x-4"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div className="space-y-2 w-full pt-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border border-border" />
                  <div className="h-2 w-full bg-muted rounded" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <div className="h-2 w-4/5 bg-primary/20 rounded" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};
