import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/20">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between relative z-50">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            closeMenu();
          }}
        >
          <span className="text-2xl font-serif font-semibold tracking-tight text-primary">
            Noteably
          </span>
        </div>

        {/* Desktop Menu */}
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

        {/* Mobile Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-foreground"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 bg-card border-b border-border/20 shadow-xl py-4 px-6 flex flex-col gap-4 md:hidden"
          >
            <a
              href="#features"
              onClick={closeMenu}
              className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors py-2 border-b border-border/10"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={closeMenu}
              className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors py-2 border-b border-border/10"
            >
              How it works
            </a>
            <Button
              onClick={() => {
                closeMenu();
                setTimeout(() => {
                  document.getElementById("join-waitlist")?.focus();
                }, 100);
              }}
              className="mt-2 rounded-full w-full py-6 text-lg"
            >
              Join Waitlist
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
