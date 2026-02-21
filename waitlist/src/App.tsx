import { Analytics } from "@vercel/analytics/react";
import { useCallback, useState } from "react";
import { WaitlistModal } from "./components/WaitlistModal";
import { CookieBanner } from "./landing/CookieBanner";
import Landing from "./landing/Landing";
import { SpeedInsights } from "@vercel/speed-insights/react";

export default function App() {
  const [hasConsent, setHasConsent] = useState(false);

  const handleAcceptAnalytics = useCallback(() => {
    setHasConsent(true);
  }, []);

  return (
    <>
      <Landing />
      <WaitlistModal />
      <CookieBanner onAccept={handleAcceptAnalytics} />
      {hasConsent && (
        <>
          <Analytics />
          <SpeedInsights />
        </>
      )}
    </>
  );
}
