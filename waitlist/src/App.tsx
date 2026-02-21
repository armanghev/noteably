import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { useCallback, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "./components/theme-provider";
import { WaitlistModal } from "./components/WaitlistModal";
import { CookieBanner } from "./landing/CookieBanner";
import ContactUs from "./pages/ContactUs";
import Landing from "./pages/Landing";
import PrivacyPolicy from "./pages/PrivacyPolicy";

export default function App() {
  const [hasConsent, setHasConsent] = useState(false);

  const handleAcceptAnalytics = useCallback(() => {
    setHasConsent(true);
  }, []);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="noteably-waitlist-theme">
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Landing />
                <WaitlistModal />
                <CookieBanner onAccept={handleAcceptAnalytics} />
              </>
            }
          />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/contact-us" element={<ContactUs />} />
        </Routes>
      </BrowserRouter>
      {hasConsent && (
        <>
          <Analytics />
          <SpeedInsights />
        </>
      )}
    </ThemeProvider>
  );
}
