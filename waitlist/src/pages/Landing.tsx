import { useEffect } from "react";
import { BigPicture } from "@/landing/BigPicture";
import { Comparison } from "@/landing/Comparison";
import { Features } from "@/landing/Features";
import { Footer } from "@/landing/Footer";
import { Hero } from "@/landing/Hero";
import { Navbar } from "@/landing/Navbar";

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
