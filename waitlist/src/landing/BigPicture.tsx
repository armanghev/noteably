import { Button } from "@/components/ui/button";
import { FadeIn } from "./FadeIn";
import { KnowledgePipeline } from "./KnowledgePipeline";

export const BigPicture = () => (
  <section
    className="py-24 bg-background overflow-hidden relative"
    id="how-it-works"
  >
    <div className="container mx-auto px-6 relative z-10">
      <div className="flex flex-col md:flex-row items-center gap-16">
        <div className="w-full md:w-1/2">
          <FadeIn>
            <h2 className="text-4xl md:text-5xl font-serif mb-8 text-foreground">
              From Chaos to Clarity
            </h2>
            <div className="space-y-6">
              {[
                "Upload messy lecture recordings or 50-page PDFs.",
                "Let AI extract the structure, definitions, and key dates.",
                "Review clear, formatted notes and summaries.",
                "Export to Notion, PDF, or Markdown in one click.",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="mt-1 w-6 h-6 shrink-0 rounded-full border border-primary flex items-center justify-center text-primary text-xs font-medium">
                    {i + 1}
                  </div>
                  <p className="text-muted-foreground font-medium">{item}</p>
                </div>
              ))}

              <div className="pt-8">
                <Button
                  onClick={() =>
                    window.dispatchEvent(new Event("open-waitlist"))
                  }
                  className="px-8 py-6 rounded-full hover:bg-foreground text-primary-foreground shadow-lg shadow-primary/20"
                >
                  Start Organizing
                </Button>
              </div>
            </div>
          </FadeIn>
        </div>

        <div className="w-full md:w-1/2 relative">
          <FadeIn
            delay={0.2}
            className="relative rounded-3xl overflow-hidden shadow-2xl bg-accent/50 border border-border"
          >
            <KnowledgePipeline />
          </FadeIn>
        </div>
      </div>
    </div>
  </section>
);
