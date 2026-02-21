import { motion } from "framer-motion";
import { FileText, GraduationCap, Mic, Video, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const KnowledgePipeline = () => {
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
