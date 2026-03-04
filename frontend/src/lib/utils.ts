import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileType(fileType: string | null | undefined): string {
  if (!fileType) return "Unknown";

  // Handle MIME types
  if (fileType.includes("/")) {
    const parts = fileType.split("/");
    const subtype = parts[1]?.split(";")[0]; // Remove any parameters

    // Map common MIME types to friendly names
    const typeMap: Record<string, string> = {
      pdf: "PDF",
      mpeg: "MP3",
      mp3: "MP3",
      wav: "WAV",
      ogg: "OGG",
      mp4: "MP4",
      webm: "WebM",
      plain: "Text",
      markdown: "Markdown",
      json: "JSON",
      html: "HTML",
      xml: "XML",
      msword: "DOC",
      "vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
      "vnd.google-apps.document": "Google Doc",
    };

    return typeMap[subtype] || subtype.toUpperCase();
  }

  // Handle file extensions
  return fileType.toUpperCase();
}

// Filter helper utilities
import type { JobListItem, SortOption } from "@/types";

/**
 * Extracts unique file types from jobs array
 */
export function getAvailableFileTypes(jobs: JobListItem[]): string[] {
  const fileTypes = new Set<string>();
  if (!Array.isArray(jobs)) return [];
  jobs.forEach((job) => {
    if (job.file_type) {
      fileTypes.add(job.file_type);
    }
  });
  return Array.from(fileTypes).sort();
}

/**
 * Checks if a date falls within the specified range
 */
export function filterByDateRange(dateString: string, range: string): boolean {
  if (range === "all") return true;

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  switch (range) {
    case "7days":
      return diffDays <= 7;
    case "30days":
      return diffDays <= 30;
    case "90days":
      return diffDays <= 90;
    default:
      return true;
  }
}

/**
 * Sorts jobs based on the sort option
 */
export function sortJobs(
  jobs: JobListItem[],
  sortBy: SortOption,
): JobListItem[] {
  const sorted = [...jobs];

  switch (sortBy) {
    case "newest":
      return sorted.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    case "oldest":
      return sorted.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    case "title-asc":
      return sorted.sort((a, b) => {
        const titleA = a.summary_title || a.filename || "";
        const titleB = b.summary_title || b.filename || "";
        return titleA.localeCompare(titleB);
      });
    case "title-desc":
      return sorted.sort((a, b) => {
        const titleA = a.summary_title || a.filename || "";
        const titleB = b.summary_title || b.filename || "";
        return titleB.localeCompare(titleA);
      });
    default:
      return sorted;
  }
}
