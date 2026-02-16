import type { JobOptions } from "@/types";
import {
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  Languages,
  LayoutList,
  Library,
  Settings2,
  Sparkles,
} from "lucide-react";
import React, { useState } from "react";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface AdvancedSettingsProps {
  options: JobOptions;
  onChange: (options: JobOptions) => void;
  disabled?: boolean;
}

export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  options,
  onChange,
  disabled,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const updateOption = (key: keyof JobOptions, value: any) => {
    onChange({ ...options, [key]: value });
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-8 border border-border rounded-2xl bg-card overflow-hidden transition-all duration-200 shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-background  transition-colors"
        disabled={disabled}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Settings2 className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h4 className="font-medium text-foreground">Advanced Settings</h4>
            <p className="text-xs text-muted-foreground">
              Customize focus, format, and language
            </p>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="p-6 border-t border-border bg-background grid gap-6 animate-fadeIn">
          {/* Study Focus */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-primary" />
              <label className="text-sm font-medium">Study Focus</label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  value: "general",
                  label: "General Overview",
                  desc: "Balanced mix",
                },
                {
                  value: "exam",
                  label: "Exam Prep",
                  desc: "Definitions & key dates",
                },
                {
                  value: "deep_dive",
                  label: "Deep Dive",
                  desc: "Complex mechanisms & why",
                },
                {
                  value: "simple",
                  label: "Simplification",
                  desc: "Explain like I'm 5",
                },
              ].map((focus) => (
                <button
                  key={focus.value}
                  onClick={() => updateOption("focus", focus.value)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    (options.focus || "general") === focus.value
                      ? "border-primary bg-background shadow-sm ring-1 ring-primary"
                      : "border-border hover:border-primary/50 bg-background/50"
                  }`}
                >
                  <div className="font-medium text-sm">{focus.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {focus.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Language */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Languages className="w-4 h-4 text-primary" />
                <label className="text-sm font-medium">Language</label>
              </div>
              <Select
                value={options.language || "english"}
                onValueChange={(val) => updateOption("language", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="spanish">Spanish</SelectItem>
                  <SelectItem value="french">French</SelectItem>
                  <SelectItem value="german">German</SelectItem>
                  <SelectItem value="italian">Italian</SelectItem>
                  <SelectItem value="portuguese">Portuguese</SelectItem>
                  <SelectItem value="mandarin">Mandarin</SelectItem>
                  <SelectItem value="japanese">Japanese</SelectItem>
                  <SelectItem value="korean">Korean</SelectItem>
                  <SelectItem value="hindi">Hindi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes Style */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <LayoutList className="w-4 h-4 text-primary" />
                <label className="text-sm font-medium">Notes Style</label>
              </div>
              <Select
                value={options.notes_style || "standard"}
                onValueChange={(val) => updateOption("notes_style", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard (Headings)</SelectItem>
                  <SelectItem value="cornell">Cornell Method</SelectItem>
                  <SelectItem value="outline">Hierarchical Outline</SelectItem>
                  <SelectItem value="qa">Q&A Format</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quiz Difficulty */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <label className="text-sm font-medium">Quiz Difficulty</label>
              </div>
              <div className="flex bg-background rounded-lg p-1 border border-border">
                {["easy", "medium", "hard"].map((level) => (
                  <button
                    key={level}
                    onClick={() => updateOption("quiz_difficulty", level)}
                    className={`flex-1 text-sm py-1.5 rounded-md transition-all capitalize ${
                      (options.quiz_difficulty || "medium") === level
                        ? "bg-accent shadow-sm text-accent-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Flashcard Count */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Library className="w-4 h-4 text-primary" />
                <label className="text-sm font-medium">Flashcards</label>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={5}
                  max={50}
                  step={1}
                  value={options.flashcard_count ?? ""}
                  onChange={(e) => {
                    const val =
                      e.target.value === ""
                        ? undefined
                        : parseInt(e.target.value);
                    updateOption("flashcard_count", val);
                  }}
                  onBlur={() => {
                    let val = options.flashcard_count;
                    if (val === undefined || isNaN(val)) val = 15;
                    else if (val < 5) val = 5;
                    else if (val > 50) val = 50;
                    updateOption("flashcard_count", val);
                  }}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="w-24"
                />
                <span className="text-xs text-muted-foreground">
                  cards (5-50)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
