import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

export const CookieBanner = ({ onAccept }: { onAccept: () => void }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if the user has already consented
    const consent = localStorage.getItem("analytics-consent");
    if (!consent) {
      // Delay showing the banner slightly for better UX
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    } else if (consent === "true") {
      onAccept();
    }
  }, [onAccept]);

  const handleAccept = () => {
    localStorage.setItem("analytics-consent", "true");
    setIsVisible(false);
    onAccept();
  };

  const handleDecline = () => {
    localStorage.setItem("analytics-consent", "false");
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-6 pointer-events-none"
        >
          <div className="max-w-4xl mx-auto bg-card/95 backdrop-blur-md border border-border/50 shadow-2xl rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pointer-events-auto">
            <div className="flex-1 pr-8 sm:pr-0">
              <h3 className="text-foreground font-semibold mb-1">
                We respect your privacy
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We use minimal, cookieless analytics to understand how people
                use our site. This helps us improve Noteably while keeping your
                data anonymous.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-end">
              <Button
                variant="ghost"
                onClick={handleDecline}
                className="text-muted-foreground hover:text-foreground"
              >
                Decline
              </Button>
              <Button
                onClick={handleAccept}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              >
                Accept
              </Button>
            </div>

            <button
              onClick={handleDecline}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors sm:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
