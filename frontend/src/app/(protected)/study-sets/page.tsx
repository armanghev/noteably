"use client";

import { FilterDropdown } from "@/components/filters/FilterDropdown";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useInfiniteJobs } from "@/hooks/useJobs";
import {
  filterByDateRange,
  formatFileType,
  getAvailableFileTypes,
  sortJobs,
} from "@/lib/utils";
import type {
  DateRangeFilter,
  JobListItem,
  MaterialType,
  SortOption,
} from "@/types";
import {
  BookOpen,
  Brain,
  FileText,
  Loader2,
  ScrollText,
  Search,
  StickyNote,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

// Icon mapping for content types
const contentTypeIcons: Record<
  MaterialType,
  React.ComponentType<{ className?: string }>
> = {
  summary: ScrollText,
  notes: StickyNote,
  flashcards: Brain,
  quiz: Zap,
  quizzes: Zap,
};

const contentTypeLabels: Record<MaterialType, string> = {
  summary: "Summary",
  notes: "Notes",
  flashcards: "Flashcards",
  quiz: "Quiz",
  quizzes: "Quiz",
};

export default function StudySets() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const {
    data: infiniteData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteJobs();

  // Handle intersection observer for infinite scroll
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 1.0 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten paginated results
  const jobs = useMemo(() => {
    if (!infiniteData || !infiniteData.pages) return [];
    return infiniteData.pages.flatMap((page) => {
      if (!page || !page.results) return [];
      return page.results;
    });
  }, [infiniteData]);

  // Filter state - initialize with all options selected
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>([]);
  const [selectedContentTypes, setSelectedContentTypes] = useState<
    MaterialType[]
  >(["flashcards", "quiz", "quizzes", "notes", "summary"]);
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // Track if file types have been initialized (using ref to avoid re-renders)
  const fileTypesInitialized = useRef(false);

  // Get available file types from jobs
  const availableFileTypes = useMemo(
    () => getAvailableFileTypes(jobs || []),
    [jobs],
  );

  // Initialize file types filter when available types change
  useEffect(() => {
    if (availableFileTypes.length > 0 && !fileTypesInitialized.current) {
      setSelectedFileTypes(availableFileTypes);
      fileTypesInitialized.current = true;
    }
  }, [availableFileTypes]);

  // Helper function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Filter and sort completed jobs
  const completedJobs = (() => {
    const filtered =
      jobs?.filter((job) => {
        // Only show completed jobs
        if (job.status !== "completed") return false;

        // Search query filter
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchesSearch =
            job.filename?.toLowerCase().includes(query) ||
            job.summary_title?.toLowerCase().includes(query) ||
            job.summary_preview?.toLowerCase().includes(query);
          if (!matchesSearch) return false;
        }

        // File type filter
        if (
          selectedFileTypes.length > 0 &&
          !selectedFileTypes.includes(job.file_type)
        ) {
          return false;
        }

        // Content type filter - hide jobs with any unselected content types
        // This means if you unselect "flashcards", any job with flashcards is hidden
        if (selectedContentTypes.length > 0) {
          const allTypesSelected = job.content_types.every(
            (type: MaterialType) => selectedContentTypes.includes(type),
          );
          if (!allTypesSelected) return false;
        }

        // Date range filter
        if (!filterByDateRange(job.created_at, dateRange)) {
          return false;
        }

        return true;
      }) || [];

    // Apply sorting
    return sortJobs(filtered, sortBy);
  })();

  // Navigate to study set detail page
  const getNavigationPath = (job: JobListItem) => {
    return `/study-sets/${job.id}`;
  };

  if (isLoading) {
    return (
<>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
</>
);
  }

  return (
<>
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-serif text-foreground">Study Sets</h1>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search study sets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-full border border-border focus:outline-none focus:border-primary w-64 bg-background"
            />
          </div>
          <FilterDropdown
            selectedFileTypes={selectedFileTypes}
            onFileTypeChange={setSelectedFileTypes}
            availableFileTypes={availableFileTypes}
            selectedContentTypes={selectedContentTypes}
            onContentTypeChange={setSelectedContentTypes}
            showContentTypeFilters={true}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            sortBy={sortBy}
            onSortChange={setSortBy}
            onReset={() => {
              setSelectedFileTypes(availableFileTypes);
              setSelectedContentTypes([
                "flashcards",
                "quiz",
                "quizzes",
                "notes",
                "summary",
              ]);
              setDateRange("all");
              setSortBy("newest");
            }}
          />
        </div>
      </header>

      {completedJobs.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-2">No study sets yet.</p>
          <p className="text-sm text-muted-foreground mb-6">
            Upload your first file to generate study materials!
          </p>
          <Button onClick={() => router.push("/upload")} className="gap-2">
            <FileText className="w-4 h-4" />
            Upload File
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {completedJobs.map((job) => {
            const hasFlashcards = job.content_types.includes("flashcards");
            const hasQuiz =
              job.content_types.includes("quiz") ||
              job.content_types.includes("quizzes");

            return (
              <Card
                key={job.id}
                onClick={() => router.push(getNavigationPath(job))}
                className="grid grid-rows-[1fr_3fr_0.5fr] p-6 cursor-pointer hover:shadow-md transition-shadow group bg-background border-border"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-secondary rounded-lg text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(job.created_at)}
                  </span>
                </div>
                <div className="flex flex-col justify-between items-start gap-2">
                  <div className="flex flex-col gap-0.5">
                    <h3 className="font-serif text-lg font-medium mb-2 text-foreground">
                      {job.summary_title || job.filename}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {job.summary_preview ||
                        "Study materials generated from your content."}
                    </p>
                  </div>

                  {/* Content Type Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {job.content_types.map((type: MaterialType) => {
                      const Icon = contentTypeIcons[type];
                      const label = contentTypeLabels[type];
                      return (
                        <span
                          key={type}
                          className="text-xs px-2 py-1 bg-muted rounded-md text-muted-foreground flex items-center gap-1"
                        >
                          {Icon && <Icon className="w-3 h-3" />}
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
                  {hasFlashcards && (
                    <span className="flex items-center gap-1">
                      <Brain className="w-3 h-3" />
                      {job.flashcard_count} cards
                    </span>
                  )}
                  {hasQuiz && (
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {job.quiz_count} questions
                    </span>
                  )}
                  <span className="text-xs px-2 py-0.5 bg-muted rounded-md">
                    {formatFileType(job.file_type)}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Infinite Scroll Trigger */}
      <div
        ref={observerTarget}
        className="mt-12 mb-8 flex flex-col items-center justify-center min-h-[50px]"
      >
        {isFetchingNextPage && (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Loading more study sets...
            </p>
          </div>
        )}
        {!hasNextPage && completedJobs.length > 0 && (
          <p className="text-sm text-muted-foreground">
            You've reached the end of your study sets.
          </p>
        )}
      </div>
</>
);
}
