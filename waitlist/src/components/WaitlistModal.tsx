import { useWaitlist } from "@/landing/useWaitlist";
import { ArrowRight, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";

export function WaitlistModal() {
  const [open, setOpen] = useState(false);
  const { email, setEmail, isSubmitting, isSubmitted, error, subscribe } =
    useWaitlist();

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener("open-waitlist", handleOpen);
    return () => window.removeEventListener("open-waitlist", handleOpen);
  }, []);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md w-[90vw] rounded-3xl p-6 sm:p-8 border-primary/20 backdrop-blur-xl bg-background/95">
        <DialogHeader className="text-left space-y-3 pb-4">
          <DialogTitle className="text-3xl font-serif leading-tight">
            Join the Waitlist
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Sign up to get early access to Noteably. We'll notify you when you
            can start transforming content into knowledge.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={subscribe} className="flex flex-col w-full relative">
          {isSubmitted ? (
            <div className="flex items-center gap-3 text-primary font-medium bg-primary/10 px-6 py-5 rounded-2xl w-full shadow-inner border border-primary/20 animate-in fade-in zoom-in duration-300">
              <Check className="w-5 h-5 shrink-0" />
              <span>You're on the list! We'll be in touch soon.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4 w-full">
              <Input
                id="modal-join-waitlist"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={isSubmitting}
                className="h-14 rounded-full px-6 text-base bg-card shadow-sm border-border w-full focus-visible:ring-primary transition-all"
              />
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-14 px-8 rounded-full text-base shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all w-full"
              >
                {isSubmitting ? "Joining..." : "Join Waitlist"}
                {!isSubmitting && <ArrowRight className="ml-2 w-5 h-5" />}
              </Button>
              {error && (
                <p className="text-destructive text-sm mt-1 w-full text-center font-medium animate-in slide-in-from-top-1">
                  {error}
                </p>
              )}
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
