import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/theme/theme-provider"
import { cn } from "@/lib/utils"
import { motion } from "motion/react"
import { useSidebar } from "@/components/ui/sidebar"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { open, animate } = useSidebar();

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className={cn(
        "flex items-center justify-start gap-2 group/sidebar py-2"
      )}
    >
      <div className="h-5 w-5 shrink-0">
        {theme === "dark" ? (
          <Moon className="h-5 w-5 text-foreground" />
        ) : (
          <Sun className="h-5 w-5 text-foreground" />
        )}
      </div>

      <motion.span
        animate={{
          width: animate ? (open ? "auto" : 0) : "auto",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        transition={{
          duration: 0.3,
          ease: "easeInOut",
        }}
        className="text-sidebar-foreground text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre overflow-hidden inline-block p-0! m-0!"
      >
        Theme
      </motion.span>
    </button>
  )
}