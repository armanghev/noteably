import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export const Navbar = () => {
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
