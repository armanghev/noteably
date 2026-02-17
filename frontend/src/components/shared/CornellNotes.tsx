import { CornellData } from "@/types/models";
import React from "react";

interface CornellNotesProps {
  data: CornellData;
  summary?: string;
}

export const CornellNotes: React.FC<CornellNotesProps> = ({
  data,
  summary,
}) => {
  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4 mb-4 grid grid-cols-1 md:grid-cols-12 text-center md:text-left">
        <h3 className="md:col-span-4 text-lg font-semibold text-primary md:border-r border-border md:pr-4">
          Cues / Questions
        </h3>
        <h3 className="md:col-span-8 text-lg font-semibold text-primary hidden md:flex items-end md:pl-4">
          Notes
        </h3>
      </div>

      <div className="space-y-4">
        {data.cues.map((cue, idx) => {
          const note = data.notes[idx] || "";
          return (
            <div
              key={idx}
              className="grid grid-cols-1 md:grid-cols-12 gap-y-2 border-b border-border/50 pb-4 last:border-0 last:pb-0"
            >
              {/* Cue */}
              <div className="md:col-span-4 md:border-r border-border/50 md:pr-4">
                <span className="md:hidden text-xs text-muted-foreground uppercase font-semibold mb-1 block">
                  Cue
                </span>
                <div className="font-medium text-sm text-foreground md:bg-background bg-muted/30 p-3 rounded-lg">
                  {cue}
                </div>
              </div>

              {/* Note */}
              <div className="md:col-span-8 md:pl-4">
                <span className="md:hidden text-xs text-muted-foreground uppercase font-semibold mb-1 block">
                  Note
                </span>
                <div className="text-sm text-foreground/90 leading-relaxed p-3">
                  {note}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Section */}
      <div
        id="summary"
        className="border-t-2 border-primary/20 pt-6 mt-8 scroll-mt-24"
      >
        <h3 className="text-xl font-semibold text-primary mb-3 pb-3 border-b border-border">Summary</h3>
        <div className="text-foreground leading-relaxed rounded-lg text-sm">
          {summary || data.summary}
        </div>
      </div>
    </div>
  );
};
