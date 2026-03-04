import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatFileType } from "@/lib/utils";
import type { DateRangeFilter, MaterialType, SortOption } from "@/types";
import { Filter, X } from "lucide-react";

interface FilterDropdownProps {
  // File type filters
  selectedFileTypes: string[];
  onFileTypeChange: (fileTypes: string[]) => void;
  availableFileTypes: string[];

  // Content type filters (optional, only for Study Sets)
  selectedContentTypes?: MaterialType[];
  onContentTypeChange?: (contentTypes: MaterialType[]) => void;
  showContentTypeFilters?: boolean;

  // Date range filter
  dateRange: DateRangeFilter;
  onDateRangeChange: (range: DateRangeFilter) => void;

  // Sort option
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;

  // Reset all filters
  onReset: () => void;
}

const contentTypeOptions: { value: MaterialType; label: string }[] = [
  { value: "flashcards", label: "Flashcards" },
  { value: "quiz", label: "Quiz" },
  { value: "notes", label: "Notes" },
  { value: "summary", label: "Summary" },
];

const dateRangeOptions = [
  { value: "7days", label: "Last 7 days" },
  { value: "30days", label: "Last 30 days" },
  { value: "90days", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

const sortOptions = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title-asc", label: "Title (A-Z)" },
  { value: "title-desc", label: "Title (Z-A)" },
];

export function FilterDropdown({
  selectedFileTypes,
  onFileTypeChange,
  availableFileTypes,
  selectedContentTypes = [],
  onContentTypeChange,
  showContentTypeFilters = false,
  dateRange,
  onDateRangeChange,
  sortBy,
  onSortChange,
  onReset,
}: FilterDropdownProps) {
  // Calculate active filter count
  const getActiveFilterCount = () => {
    let count = 0;

    // Count file type filters (only if not all selected)
    if (
      selectedFileTypes.length > 0 &&
      selectedFileTypes.length < availableFileTypes.length
    ) {
      count++;
    }

    // Count content type filters (only if not all selected)
    if (
      showContentTypeFilters &&
      selectedContentTypes.length > 0 &&
      selectedContentTypes.length < contentTypeOptions.length
    ) {
      count++;
    }

    // Count date range filter (only if not "all")
    if (dateRange !== "all") {
      count++;
    }

    // Count sort option (only if not default "newest")
    if (sortBy !== "newest") {
      count++;
    }

    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  const handleFileTypeToggle = (fileType: string) => {
    if (selectedFileTypes.includes(fileType)) {
      onFileTypeChange(selectedFileTypes.filter((ft) => ft !== fileType));
    } else {
      onFileTypeChange([...selectedFileTypes, fileType]);
    }
  };

  const handleContentTypeToggle = (contentType: MaterialType) => {
    if (!onContentTypeChange) return;

    if (selectedContentTypes.includes(contentType)) {
      onContentTypeChange(
        selectedContentTypes.filter((ct) => ct !== contentType),
      );
    } else {
      onContentTypeChange([...selectedContentTypes, contentType]);
    }
  };

  const handleDateRangeChange = (value: string) => {
    onDateRangeChange(value as DateRangeFilter);
  };

  const handleSortChange = (value: string) => {
    onSortChange(value as SortOption);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="rounded-full text-muted-foreground relative"
        >
          <Filter className="w-5 h-5" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* File Type Filter */}
        {availableFileTypes.length > 0 && (
          <>
            <DropdownMenuLabel>File Type</DropdownMenuLabel>
            <DropdownMenuGroup>
              {availableFileTypes.map((fileType) => (
                <DropdownMenuCheckboxItem
                  key={fileType}
                  checked={selectedFileTypes.includes(fileType)}
                  onCheckedChange={() => handleFileTypeToggle(fileType)}
                >
                  {formatFileType(fileType)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Content Type Filter (Study Sets only) */}
        {showContentTypeFilters && (
          <>
            <DropdownMenuLabel>Content Type</DropdownMenuLabel>
            <DropdownMenuGroup>
              {contentTypeOptions.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={selectedContentTypes.includes(option.value)}
                  onCheckedChange={() => handleContentTypeToggle(option.value)}
                >
                  {option.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Date Range Filter */}
        <DropdownMenuLabel>Date Range</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={dateRange}
          onValueChange={handleDateRangeChange}
        >
          {dateRangeOptions.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />

        {/* Sort By */}
        <DropdownMenuLabel>Sort By</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={sortBy} onValueChange={handleSortChange}>
          {sortOptions.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        {/* Reset Filters */}
        {activeFilterCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={onReset}
            >
              <X className="w-4 h-4 mr-2" />
              Reset Filters
            </Button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
