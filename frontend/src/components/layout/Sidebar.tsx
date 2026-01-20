import { motion } from "motion/react";
import {
    LayoutDashboard,
    Upload,
    FileText,
    Brain,
    Zap,
    BookOpen,
} from "lucide-react"
import { SidebarBody, SidebarLink, useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils";

// Menu items.
const items = [
    {
        label: "Dashboard",
        href: "/dashboard",
        icon: <LayoutDashboard className="text-foreground h-5 w-5 shrink-0" />,
    },
    {
        label: "Upload",
        href: "/upload",
        icon: <Upload className="text-foreground h-5 w-5 shrink-0" />,
    },
    {
        label: "Study Sets",
        href: "/study-sets",
        icon: <BookOpen className="text-foreground h-5 w-5 shrink-0" />,
    },
    {
        label: "My Notes",
        href: "/notes",
        icon: <FileText className="text-foreground h-5 w-5 shrink-0" />,
    },
    {
        label: "Flashcards",
        href: "/flashcards",
        icon: <Brain className="text-foreground h-5 w-5 shrink-0" />,
    },
    {
        label: "Quizzes",
        href: "/quizzes",
        icon: <Zap className="text-foreground h-5 w-5 shrink-0" />,
    },
]


export function AppSidebar() {
    const { open, animate } = useSidebar();
    return (
        <SidebarBody className="justify-between gap-10 bg-sidebar sticky top-0 h-screen z-50">
            <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
                <div className={cn("flex items-end justify-start py-4 overflow-hidden pr-2")}>
                    {/* Logo Icon (N) */}
                    <h1 className="text-2xl font-bold font-serif text-primary shrink-0 transform transition duration-150">N</h1>
                    <motion.span
                        animate={{
                            display: animate ? (open ? "inline-block" : "none") : "inline-block",
                            opacity: animate ? (open ? 1 : 0) : 1,
                        }}
                        className="text-2xl font-semibold font-serif text-primary group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block p-0! m-0!"
                    >
                        oteably
                    </motion.span>
                </div>
                <div className="mt-8 flex flex-col gap-2">
                    {items.map((item, idx) => (
                        <SidebarLink key={idx} link={item} />
                    ))}
                </div>
            </div>
        </SidebarBody>
    )
}
