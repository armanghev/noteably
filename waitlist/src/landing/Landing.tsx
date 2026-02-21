import { useEffect } from "react";
import { BigPicture } from "./BigPicture";
import { Comparison } from "./Comparison";
import { Features } from "./Features";
import { Footer } from "./Footer";
import { Hero } from "./Hero";
import { Navbar } from "./Navbar";

export default function Landing() {
  // Use a slight hack to apply dark mode directly if we prefer
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-primary/30 scroll-smooth">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <BigPicture />
        <Comparison />
      </main>
      <Footer />
    </div>
  );
}
