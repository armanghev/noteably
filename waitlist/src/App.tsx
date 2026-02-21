import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { useCallback, useState } from "react";
import { ThemeProvider } from "./components/theme-provider";
import { WaitlistModal } from "./components/WaitlistModal";
import { CookieBanner } from "./landing/CookieBanner";
import Landing from "./landing/Landing";

export default function App() {
  const [hasConsent, setHasConsent] = useState(false);

  const handleAcceptAnalytics = useCallback(() => {
    setHasConsent(true);
  }, []);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="noteably-waitlist-theme">
      <Landing />
      <WaitlistModal />
      <CookieBanner onAccept={handleAcceptAnalytics} />
      {hasConsent && (
        <>
          <Analytics />
          <SpeedInsights />
        </>
      )}
    </ThemeProvider>
  );
}
