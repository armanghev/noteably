import { Analytics } from "@vercel/analytics/react";
import { useCallback, useState } from "react";
import { CookieBanner } from "./landing/CookieBanner";
import Landing from "./landing/Landing";

export default function App() {
  const [hasConsent, setHasConsent] = useState(false);

  const handleAcceptAnalytics = useCallback(() => {
    setHasConsent(true);
  }, []);

  return (
    <>
      <Landing />
      <CookieBanner onAccept={handleAcceptAnalytics} />
      {hasConsent && <Analytics />}
    </>
  );
}
