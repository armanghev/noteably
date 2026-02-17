import { QAData } from "@/types/models";
import { ChevronDown, ChevronRight } from "lucide-react";
import React, { useState } from "react";

export const QANotes: React.FC<{ data: QAData[] }> = ({ data }) => {
  return (
    <div className="space-y-4">
      {data.map((item, idx) => (
        <QAItem key={idx} item={item} />
      ))}
    </div>
  );
};

const QAItem: React.FC<{ item: QAData }> = ({ item }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
      >
        <span className="font-medium text-foreground pr-4 leading-relaxed">
          {item.question}
        </span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground ml-2 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground ml-2 flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="p-4 bg-background border-t border-border animate-in fade-in slide-in-from-top-1 duration-200">
          <p className="text-muted-foreground leading-relaxed text-sm">
            {item.answer}
          </p>
        </div>
      )}
    </div>
  );
};
