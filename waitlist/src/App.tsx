import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Brain,
  Check,
  FileText,
  GraduationCap,
  Menu,
  Mic,
  Search,
  Sparkles,
  Video,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const useWaitlist = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from("waitlist")
        .insert([{ email }]);
      if (insertError && insertError.code !== "23505") {
        throw insertError;
      }
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Failed to join waitlist");
    } finally {
      setIsSubmitting(false);
    }
  };

  return { email, setEmail, isSubmitting, isSubmitted, error, subscribe };
};

// FadeIn Component for scroll animations
const FadeIn = ({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.6, delay, ease: "easeOut" }}
    className={className}
  >
    {children}
  </motion.div>
);

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/20">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <span className="text-2xl font-serif font-semibold tracking-tight text-primary">
            Noteably
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a
            href="#features"
            className="hover:text-foreground transition-colors"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="hover:text-foreground transition-colors"
          >
            How it works
          </a>
          <Button
            onClick={() => {
              document.getElementById("join-waitlist")?.focus();
            }}
            className="px-6 rounded-full"
          >
            Join Waitlist
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-foreground"
        >
          <Menu className="w-6 h-6" />
        </Button>
      </div>
    </nav>
  );
};

const Hero = () => {
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
        <Card className="relative rounded-xl overflow-hidden shadow-2xl border-border pt-0 pl-0 pr-0 pb-0 bg-background/50 backdrop-blur-3xl">
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

const Features = () => {
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
      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row gap-16 items-start">
          {/* Left Side: Visual & Headline */}
          <div className="w-full lg:w-5/12 sticky top-32">
            <FadeIn>
              <h2 className="text-4xl md:text-5xl font-serif mb-12 text-foreground leading-[1.1]">
                Your personal <br />
                <span className="text-primary italic">AI tutor.</span>
              </h2>

              <div className="relative w-full aspect-square max-w-md mx-auto lg:mx-0">
                {/* Glowing background effect */}
                <div className="absolute inset-0 bg-primary/20 blur-[80px] rounded-full scale-90" />

                <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-b from-primary/5 to-transparent flex items-center justify-center p-8 border border-primary/10">
                  <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-background shadow-lg">
                    <img
                      src="/nota.png"
                      alt="Nota AI Agent"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Chat bubble */}
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
                      "I've analyzed your lecture. Ready to quiz you on the key
                      concepts?"
                    </p>
                  </motion.div>
                </div>
              </div>
            </FadeIn>
          </div>

          {/* Right Side: Features Grid */}
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
    </section>
  );
};

const KnowledgePipeline = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateAngle = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      const dx = width * 0.5;
      const dy = height * 0.3;
      const rad = Math.atan2(dy, dx);
      const deg = rad * (180 / Math.PI);
      setAngle(deg);
    };

    updateAngle(); // Initial calc
    const observer = new ResizeObserver(updateAngle);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[400px] flex items-center justify-center overflow-hidden"
    >
      {/* Background Connection Lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
        {[
          { x1: "0%", y1: "20%", x2: "50%", y2: "50%" },
          { x1: "0%", y1: "50%", x2: "50%", y2: "50%" },
          { x1: "0%", y1: "80%", x2: "50%", y2: "50%" },
          { x1: "50%", y1: "50%", x2: "100%", y2: "20%" },
          { x1: "50%", y1: "50%", x2: "100%", y2: "50%" },
          { x1: "50%", y1: "50%", x2: "100%", y2: "80%" },
        ].map((line, i) => (
          <motion.line
            key={i}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="currentColor"
            strokeWidth="1"
            className="text-primary"
            strokeDasharray="4 4"
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: -20 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        ))}
      </svg>

      {/* Central Processor */}
      <div className="relative z-20">
        {/* Outer Rotating Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="w-40 h-40 rounded-full border border-dashed border-primary/20 flex items-center justify-center relative"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_12px_rgba(59,130,246,0.5)]" />
        </motion.div>

        {/* Middle Rotating Ring */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="w-32 h-32 rounded-full border border-primary/10 flex items-center justify-center relative bg-background/40 backdrop-blur-md shadow-2xl"
          >
            <div className="absolute inset-2 rounded-full border-2 border-primary/5" />
          </motion.div>
        </div>

        {/* Core Agent Image */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-20 h-20 rounded-full bg-background border-4 border-background overflow-hidden relative z-10 shadow-2xl"
          >
            <img
              src="/nota.png"
              alt="Nota AI Core"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent pointer-events-none" />
          </motion.div>
        </div>
      </div>

      {/* Input Streams */}
      <div className="absolute inset-0 pointer-events-none">
        {[
          {
            icon: FileText,
            color: "text-blue-500",
            vals: {
              x: ["-10%", "-4%", "44%", "50%"],
              y: ["18%", "17.6%", "46.4%", "50%"],
            },
            delay: 0,
            rotate: angle,
          },
          {
            icon: Mic,
            color: "text-purple-500",
            vals: {
              x: ["-10%", "-4%", "44%", "50%"],
              y: ["50%", "50%", "50%", "50%"],
            },
            delay: 1,
            rotate: 0,
          },
          {
            icon: Video,
            color: "text-red-500",
            vals: {
              x: ["-10%", "-4%", "44%", "50%"],
              y: ["86%", "82.4%", "53.6%", "50%"],
            },
            delay: 2,
            rotate: -angle,
          },
        ].map((item, i) => (
          <motion.div
            key={i}
            className={`absolute p-3 rounded-xl bg-background shadow-lg border border-border ${item.color} z-30`}
            style={{
              left: 0,
              top: 0,
              x: "-50%",
              y: "-50%",
              rotate: item.rotate,
            }}
            initial={{
              left: item.vals.x[0],
              top: item.vals.y[0],
              opacity: 0,
              scale: 0.5,
            }}
            animate={{
              left: item.vals.x,
              top: item.vals.y,
              opacity: [0, 1, 1, 0],
              scale: [0.5, 1, 1, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: item.delay,
              ease: "linear",
              times: [0, 0.1, 0.9, 1],
            }}
          >
            <item.icon className="w-5 h-5" />
          </motion.div>
        ))}
      </div>

      {/* Output Streams */}
      <div className="absolute inset-0 pointer-events-none">
        {[
          {
            icon: FileText,
            vals: {
              x: ["50%", "56%", "104%", "110%"],
              y: ["50%", "46.4%", "17.6%", "14%"],
            },
            delay: 0,
            rotate: -angle,
          },
          {
            icon: Zap,
            vals: {
              x: ["50%", "56%", "104%", "110%"],
              y: ["50%", "50%", "50%", "50%"],
            },
            delay: 1,
            rotate: 0,
          },
          {
            icon: GraduationCap,
            vals: {
              x: ["50%", "56%", "104%", "110%"],
              y: ["50%", "53.6%", "82.4%", "86%"],
            },
            delay: 2,
            rotate: angle,
          },
        ].map((item, i) => (
          <motion.div
            key={i + 3}
            className="absolute flex items-center gap-3 p-2 pl-3 pr-4 rounded-xl bg-background shadow-lg border border-border z-10"
            style={{
              left: "50%",
              top: "50%",
              x: -24,
              y: "-50%",
              rotate: item.rotate,
              transformOrigin: "24px 50%",
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              left: item.vals.x,
              top: item.vals.y,
              opacity: [0, 1, 1, 0],
              scale: [0, 1, 1, 0.8],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: item.delay,
              ease: "linear",
              times: [0, 0.1, 0.9, 1],
            }}
          >
            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-primary/10 text-primary">
              <item.icon className="w-3 h-3" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="h-1.5 w-12 bg-foreground/10 rounded-full" />
              <div className="h-1.5 w-8 bg-foreground/5 rounded-full" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const BigPicture = () => (
  <section
    className="py-24 bg-background overflow-hidden relative"
    id="how-it-works"
  >
    <div className="container mx-auto px-6 relative z-10">
      <div className="flex flex-col md:flex-row items-center gap-16">
        <div className="w-full md:w-1/2">
          <FadeIn>
            <h2 className="text-4xl md:text-5xl font-serif mb-8 text-foreground">
              From Chaos to Clarity
            </h2>
            <div className="space-y-6">
              {[
                "Upload messy lecture recordings or 50-page PDFs.",
                "Let AI extract the structure, definitions, and key dates.",
                "Review clear, formatted notes and summaries.",
                "Export to Notion, Obsidian, or Anki in one click.",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="mt-1 w-6 h-6 shrink-0 rounded-full border border-primary flex items-center justify-center text-primary text-xs font-medium">
                    {i + 1}
                  </div>
                  <p className="text-muted-foreground font-medium">{item}</p>
                </div>
              ))}

              <div className="pt-8">
                <Button
                  onClick={() =>
                    document.getElementById("join-waitlist")?.focus()
                  }
                  className="px-8 py-6 rounded-full hover:bg-foreground text-primary-foreground shadow-lg shadow-primary/20"
                >
                  Start Organizing
                </Button>
              </div>
            </div>
          </FadeIn>
        </div>

        <div className="w-full md:w-1/2 relative">
          <FadeIn
            delay={0.2}
            className="relative rounded-3xl overflow-hidden shadow-2xl bg-accent/50 border border-border"
          >
            <KnowledgePipeline />
          </FadeIn>
        </div>
      </div>
    </div>
  </section>
);

const Comparison = () => {
  const { email, setEmail, isSubmitting, isSubmitted, error, subscribe } =
    useWaitlist();

  return (
    <section className="py-32 bg-background relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[128px] pointer-events-none" />

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
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 blur-[64px] rounded-full pointer-events-none" />

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

const Footer = () => (
  <footer className="bg-primary/90 text-primary-foreground/90 py-20 relative overflow-hidden">
    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none"></div>
    <div className="container mx-auto px-6 relative z-10">
      <div className="flex flex-col md:flex-row justify-between items-start gap-12 border-b border-primary-foreground/10 pb-12">
        <div className="max-w-md">
          <h2 className="text-3xl font-serif mb-6 text-primary-foreground">
            Connect with intelligence.
          </h2>
          <p className="text-primary-foreground/80 mb-8 leading-relaxed font-medium">
            Stop wasting time on prep work. Let AI handle the structure so you
            can focus on learning. Join the waitlist today.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-12 sm:gap-24">
          <div>
            <h4 className="font-semibold text-primary-foreground mb-6 uppercase tracking-wider text-sm">
              Product
            </h4>
            <ul className="space-y-4">
              {["Features", "Pricing", "FAQ"].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-primary-foreground/70 hover:text-primary-foreground transition-colors font-medium"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-primary-foreground mb-6 uppercase tracking-wider text-sm">
              Company
            </h4>
            <ul className="space-y-4">
              {["About", "Blog", "Contact"].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-primary-foreground/70 hover:text-primary-foreground transition-colors font-medium"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-primary-foreground/60 font-medium">
        <p>© 2026 Noteably Inc. All rights reserved.</p>
        <div className="flex gap-6">
          <a
            href="#"
            className="hover:text-primary-foreground transition-colors"
          >
            Privacy Policy
          </a>
          <a
            href="#"
            className="hover:text-primary-foreground transition-colors"
          >
            Terms of Service
          </a>
        </div>
      </div>
    </div>
  </footer>
);

export default function App() {
  // Use a slight hack to apply dark mode directly if we prefer
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-primary/30 scroll-smooth">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <BigPicture />
        <Comparison />
      </main>
      <Footer />
    </div>
  );
}
