"use client";

import { FilterDropdown } from "@/components/filters/FilterDropdown";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useJobs } from "@/hooks/useJobs";
import {
  filterByDateRange,
  formatFileType,
  getAvailableFileTypes,
  sortJobs,
} from "@/lib/utils";
import type { DateRangeFilter, SortOption } from "@/types";
import { FileText, Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function Notes() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: jobs, isLoading } = useJobs();

  // Filter state
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // Track initialization
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
    let filtered =
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

        // Date range filter
        if (!filterByDateRange(job.created_at, dateRange)) {
          return false;
        }

        return true;
      }) || [];

    // Apply sorting
    return sortJobs(filtered, sortBy);
  })();

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
        <h1 className="text-3xl font-serif text-foreground">My Notes</h1>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-full border border-border focus:outline-none focus:border-primary w-64 bg-background"
            />
          </div>
          <FilterDropdown
            selectedFileTypes={selectedFileTypes}
            onFileTypeChange={setSelectedFileTypes}
            availableFileTypes={availableFileTypes}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            sortBy={sortBy}
            onSortChange={setSortBy}
            onReset={() => {
              setSelectedFileTypes(availableFileTypes);
              setDateRange("all");
              setSortBy("newest");
            }}
          />
        </div>
      </header>

      {completedJobs.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground">
            No notes yet. Upload your first file to get started!
          </p>
          <Button onClick={() => router.push("/upload")} className="mt-4">
            Upload File
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {completedJobs.map((job) => (
            <Card
              key={job.id}
              onClick={() =>
                router.push(`/notes/${job.id}`)
              }
              className="p-6 cursor-pointer hover:shadow-md transition-shadow group bg-background border-border flex flex-col justify-between"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-secondary rounded-lg text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDate(job.created_at)}
                </span>
              </div>
              <h3 className="font-serif text-lg font-medium mb-2 text-foreground">
                {job.summary_title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                {job.summary_preview || "No summary available."}
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs px-2 py-1 bg-muted rounded-md text-muted-foreground">
                  {formatFileType(job.file_type)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
</>
);
}
