"use client";

import DropboxIcon from "@/components/assets/DropboxIcon";
import GoogleDriveIcon from "@/components/assets/GoogleDriveIcon";
import YoutubeIcon from "@/components/assets/YoutubeIcon";
import { AdvancedSettings } from "@/components/shared/AdvancedSettings";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useAuth } from "@/hooks/useAuth";
import { useCloudImport } from "@/hooks/useCloudImport";
import {
  jobKeys,
  useCancelJob,
  useProcessUpload,
  useProcessYoutube,
  useRetryJob,
} from "@/hooks/useJobs";
import { cloudService } from "@/lib/api/services/cloud";
import { jobsService } from "@/lib/api/services/jobs";
import type {
  CloudFile,
  FileUploadProps,
  JobOptions,
  MaterialType,
  ProcessingProps,
  ProcessUploadResponse,
} from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardPaste,
  FileText,
  FileType,
  HelpCircle,
  Layers,
  Loader2,
  Music,
  RotateCw,
  ScrollText,
  StickyNote,
  Upload as UploadIcon,
  Video,
  Wand2,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";

const contentTypes: Array<{
  id: MaterialType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "summary",
    label: "Summary",
    description: "Concise overview of key points",
    icon: ScrollText,
  },
  {
    id: "notes",
    label: "Notes",
    description: "Detailed structured notes",
    icon: StickyNote,
  },
  {
    id: "flashcards",
    label: "Flashcards",
    description: "Q&A cards for memorization",
    icon: Layers,
  },
  {
    id: "quizzes",
    label: "Quizzes",
    description: "Test your understanding",
    icon: HelpCircle,
  },
];

interface VideoMeta {
  title: string;
  author: string;
  thumbnail: string;
  duration: number;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface YouTubeInputProps {
  url: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  isLoading: boolean;
  error: string | null;
  selectedTypes: MaterialType[];
  onTypeToggle: (type: MaterialType) => void;
  videoMeta: VideoMeta | null;
  onVideoMetaChange: (meta: VideoMeta | null) => void;
  options: JobOptions;
  onOptionsChange: (options: JobOptions) => void;
}

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
  } catch {
    /* not a valid url yet */
  }
  return null;
}

const YouTubeInput: React.FC<YouTubeInputProps> = ({
  url,
  onChange,
  onSubmit,
  isLoading,
  error,
  selectedTypes,
  onTypeToggle,
  videoMeta,
  onVideoMetaChange,
  options,
  onOptionsChange,
}) => {
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch metadata when URL changes and contains a valid video ID
  useEffect(() => {
    const videoId = extractVideoId(url);
    if (!videoId) {
      onVideoMetaChange(null);
      setFetchError(null);
      return;
    }

    // Skip fetch if we already have metadata (e.g. restored from parent on remount)
    if (videoMeta) return;

    let cancelled = false;
    const fetchMeta = async () => {
      setFetching(true);
      setFetchError(null);
      try {
        const data = await jobsService.getYoutubeMeta(url);
        if (!cancelled) {
          onVideoMetaChange({
            title: data.title,
            author: data.author,
            thumbnail:
              data.thumbnail ||
              `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
            duration: data.duration,
          });
        }
      } catch {
        if (!cancelled) {
          onVideoMetaChange(null);
          setFetchError("Could not find this video. Please check the URL.");
        }
      } finally {
        if (!cancelled) setFetching(false);
      }
    };

    const timer = setTimeout(fetchMeta, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [url]);

  const handleClear = () => {
    onChange({ target: { value: "" } } as React.ChangeEvent<HTMLInputElement>);
    onVideoMetaChange(null);
    setFetchError(null);
  };

  if (videoMeta) {
    // Preview State (Matches FileUpload style)
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 animate-fadeIn bg-background border border-primary rounded-3xl">
        {/* Video Preview Card */}
        {videoMeta && (
          <div className="flex items-start gap-4 p-3 rounded-xl border border-border mb-6">
            <div className="relative shrink-0">
              <img
                src={videoMeta.thumbnail}
                alt={videoMeta.title}
                className="w-50 h-28 object-cover rounded-xl"
              />
              {videoMeta.duration > 0 && (
                <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[11px] font-medium px-1.5 py-0.5 rounded">
                  {formatDuration(videoMeta.duration)}
                </span>
              )}
            </div>
            <div className="flex flex-col items-start justify-start pb-auto min-w-0 pt-1">
              <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
                {videoMeta.title}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {videoMeta.author}
              </p>
            </div>
          </div>
        )}

        {/* Content Type Selection */}
        <div className="w-full max-w-2xl mb-8">
          <h4 className="text-sm font-medium text-foreground mb-3 text-center">
            Select content to generate
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {contentTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedTypes.includes(type.id);
              return (
                <button
                  key={type.id}
                  onClick={() => onTypeToggle(type.id)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border hover:border-primary/50 hover:bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isSelected
                          ? "bg-primary text-background"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-muted-foreground"
                      }`}
                    >
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-background" />
                      )}
                    </div>
                  </div>
                  <p
                    className={`text-sm font-medium ${isSelected ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    {type.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {type.description}
                  </p>
                </button>
              );
            })}
          </div>
          {selectedTypes.length === 0 && (
            <p className="text-xs text-destructive mt-2 text-center">
              Please select at least one content type
            </p>
          )}
        </div>

        <AdvancedSettings
          options={options}
          onChange={onOptionsChange}
          disabled={isLoading}
          selectedTypes={selectedTypes}
        />

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={handleClear}
            className="px-6 py-6 rounded-xl border border-primary text-primary hover:text-background hover:bg-primary font-medium"
          >
            Remove
          </Button>
          <Button
            onClick={onSubmit}
            disabled={selectedTypes.length === 0 || isLoading}
            className="px-8 py-6 rounded-xl border bg-primary text-background hover:bg-background hover:text-primary hover:border-primary font-medium shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4" />
            )}
            Generate{" "}
            {selectedTypes.length > 0
              ? `(${selectedTypes.length})`
              : "Materials"}
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-4 py-2 rounded-lg mt-4">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>
    );
  }

  // Input State
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 transition-all bg-background rounded-3xl animate-fadeIn">
      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 shadow-sm">
        <Video className="w-10 h-10 text-red-600" />
      </div>

      <h3 className="text-xl font-medium text-foreground mb-6">
        Paste YouTube URL
      </h3>

      <div className="w-full max-w-md space-y-4 mb-8">
        <div className="relative">
          <input
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={onChange}
            className="w-full px-4 py-3 pr-24 rounded-xl border-2 border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-background"
          />
          {fetching ? (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 p-3">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <button
              type="button"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  onChange({
                    target: { value: text },
                  } as React.ChangeEvent<HTMLInputElement>);
                } catch {
                  /* clipboard access denied */
                }
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-3 text-xs font-medium text-muted-foreground hover:text-primary bg-muted hover:bg-muted rounded-xl transition-all flex items-center gap-1.5"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {fetchError && (
          <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-4 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            {fetchError}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-4 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      {/* Helper text or disabled button placeholder if desired, though FileUpload just shows dropzone */}
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        Paste a link to any public YouTube video to generate study materials
        automatically.
      </p>
    </div>
  );
};

const FileUpload: React.FC<FileUploadProps> = ({
  file,
  fileInputRef,
  handleRemoveFile,
  handleChange,
  handleDrag,
  dragActive,
  handleDrop,
  onSubmit,
  getFileIcon,
  error,
  selectedTypes,
  onTypeToggle,
  options,
  onOptionsChange,
  onImportFromCloud,
  isImporting,
  cloudFile,
}) => {
  const displayFile = file || cloudFile;
  const isCloud = !!cloudFile;

  return (
    <div className="flex-1 flex flex-col">
      {displayFile ? (
        // File Preview State
        <div className="flex-1 flex flex-col items-center justify-center p-12 animate-fadeIn bg-background border border-primary rounded-3xl">
          <div className="w-20 h-20 bg-card rounded-2xl flex items-center justify-center mb-4 shadow-sm">
            {getFileIcon(
              isCloud ? cloudFile?.type || "pdf" : (file as File).type,
            )}
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">
            {displayFile.name}
          </h3>
          <p className="text-muted-foreground text-sm mb-6">
            {isCloud
              ? cloudFile?.size
                ? `${(cloudFile.size / (1024 * 1024)).toFixed(2)} MB`
                : "Cloud File"
              : `${((file as File).size / (1024 * 1024)).toFixed(2)} MB`}
          </p>

          {/* Content Type Selection */}
          <div className="w-full max-w-2xl mb-8">
            <h4 className="text-sm font-medium text-foreground mb-3 text-center">
              Select content to generate
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {contentTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedTypes.includes(type.id);
                return (
                  <button
                    key={type.id}
                    onClick={() => onTypeToggle(type.id)}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border hover:border-primary/50 hover:bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isSelected
                            ? "bg-primary text-background"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        }`}
                      >
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-background" />
                        )}
                      </div>
                    </div>
                    <p
                      className={`text-sm font-medium ${isSelected ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {type.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {type.description}
                    </p>
                  </button>
                );
              })}
            </div>
            {selectedTypes.length === 0 && (
              <p className="text-xs text-destructive mt-2 text-center">
                Please select at least one content type
              </p>
            )}
          </div>

          <AdvancedSettings
            options={options}
            onChange={onOptionsChange}
            selectedTypes={selectedTypes}
          />

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={handleRemoveFile}
              className="px-6 py-6 rounded-xl border border-primary text-primary hover:text-background hover:bg-primary font-medium"
            >
              Remove
            </Button>
            <Button
              onClick={onSubmit}
              disabled={selectedTypes.length === 0}
              className="px-8 py-6 rounded-xl border bg-primary text-background hover:bg-background hover:text-primary hover:border-primary font-medium shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Wand2 className="w-4 h-4" />
              Generate
            </Button>
          </div>
        </div>
      ) : (
        // Drag & Drop State
        <form
          className="flex-1 flex flex-col"
          onDragEnter={handleDrag}
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            ref={fileInputRef}
            type="file"
            id="file-upload"
            multiple={false}
            onChange={handleChange}
            className="hidden"
            accept=".mp3,.wav,.pdf,.txt,.md,.mp4,.mov,.doc,.docx"
          />
          <label
            htmlFor="file-upload"
            className={`flex-1 flex flex-col items-center justify-center p-12 transition-all cursor-pointer border-2 border-dashed border-border rounded-3xl
                         ${
                           dragActive
                             ? "bg-background/80"
                             : "hover:bg-card bg-background"
                         } ${error ? "border-destructive/50 bg-destructive/10" : ""}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-transform duration-300 ${dragActive ? "scale-110 shadow-md shadow-primary" : "shadow-sm shadow-primary"}`}
            >
              <UploadIcon className="w-10 h-10" />
            </div>

            <div className="text-center max-w-sm">
              <h3 className="text-xl font-medium text-foreground mb-2">
                {dragActive
                  ? "Drop file here"
                  : "Click to upload or drag and drop"}
              </h3>
              <p className="text-muted-foreground text-sm mb-6">
                MP3, WAV, PDF, TXT, MD, MP4, MOV, DOC, DOCX
              </p>
              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-4 py-2 rounded-full mx-auto w-fit">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>

            {/* Import from cloud */}
            {(onImportFromCloud || isImporting) && (
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground mb-3">
                  Or import from
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => onImportFromCloud?.("google_drive")}
                    disabled={isImporting}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:border-primary/50 hover:bg-card transition-all disabled:opacity-50"
                  >
                    <GoogleDriveIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">Google Drive</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onImportFromCloud?.("dropbox")}
                    disabled={isImporting}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:border-primary/50 hover:bg-card transition-all disabled:opacity-50"
                  >
                    <DropboxIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">Dropbox</span>
                  </button>
                </div>
              </div>
            )}
          </label>
        </form>
      )}
    </div>
  );
};

const Processing: React.FC<ProcessingProps> = ({
  progress,
  steps,
  currentStep,
  onCancel,
  onRetry,
  isRetrying,
  status,
}) => {
  const isFailed = status === "failed";

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 bg-background border border-primary rounded-3xl">
      <div className="w-full max-w-md">
        {/* Progress Visual */}
        <div className="mb-10 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 relative shadow-[0_0_15px_var(--primary)]">
            {isFailed ? (
              <XCircle className="w-10 h-10 text-destructive animate-pulse" />
            ) : (
              <>
                <div className="absolute inset-0 rounded-full"></div>
                <svg
                  className="absolute inset-0 w-full h-full -rotate-90 text-primary"
                  viewBox="0 0 100 100"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="46"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeDasharray="289" // 2 * pi * 46
                    strokeDashoffset={289 - (289 * progress) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-300 ease-linear"
                  />
                </svg>
                <span className="text-lg font-bold text-primary">
                  {progress}%
                </span>
              </>
            )}
          </div>
          <h3
            className={`text-2xl font-serif mb-2 ${isFailed ? "text-destructive" : "text-foreground"}`}
          >
            {isFailed
              ? "Processing Failed"
              : steps[currentStep]?.title || "Processing..."}
          </h3>
          <p className={isFailed ? "text-destructive/80" : "text-foreground"}>
            {isFailed
              ? "Something went wrong while generating your study set."
              : steps[currentStep]?.desc ||
                "Please wait while we process your file."}
          </p>
        </div>

        {/* Steps List */}
        {!isFailed && (
          <div className="space-y-4 mb-8">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
                  idx === currentStep
                    ? "bg-secondary border border-primary/20"
                    : ""
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    idx < currentStep
                      ? "bg-primary text-primary-foreground"
                      : idx === currentStep
                        ? "bg-card text-primary border border-primary"
                        : "bg-muted text-muted-foreground/50"
                  }`}
                >
                  {idx < currentStep ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : idx === currentStep ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span className="text-sm font-medium">{idx + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${
                      idx <= currentStep
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {isFailed ? (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onCancel}
                className="flex-1 h-12 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={onRetry}
                disabled={isRetrying}
                className="flex-2 h-12 rounded-xl bg-primary text-background hover:bg-primary/90 gap-2"
              >
                {isRetrying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCw className="w-4 h-4" />
                )}
                Retry Generation
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={onCancel}
              className="w-full h-12 rounded-xl border border-primary/20 hover:bg-secondary text-muted-foreground hover:text-foreground"
            >
              Cancel Processing
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default function Upload() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { session } = useAuth();
  const processUploadMutation = useProcessUpload();
  const processYoutubeMutation = useProcessYoutube();
  const cancelJobMutation = useCancelJob();
  const retryJobMutation = useRetryJob();
  const queryClient = useQueryClient();
  const [inputMode, setInputMode] = useState<"file" | "youtube">("file");
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [cloudFile, setCloudFile] = useState<CloudFile | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState<string>("");
  const [videoMeta, setVideoMeta] = useState<VideoMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<MaterialType[]>([
    "summary",
    "notes",
  ]);
  const [jobOptions, setJobOptions] = useState<JobOptions>({
    focus: "general",
    language: "english",
    notes_style: "standard",
    quiz_difficulty: "medium",
    summary_length: "medium",
  });

  // Processing State
  const [jobId, setJobId] = useState<string | undefined>(undefined);
  const [currentStep, setCurrentStep] = useState<number>(0);

  const handleCloudFileSelected = (file: CloudFile) => {
    setCloudFile(file);
    setFile(null); // Clear local file if cloud file selected
    setYoutubeUrl(""); // Clear YouTube if cloud file selected
    setVideoMeta(null);
  };

  const { openPicker } = useCloudImport(handleCloudFileSelected);

  const { lastMessage } = useWebSocket();

  // Listen for WebSocket updates
  useEffect(() => {
    if (lastMessage?.type === "job.update" && lastMessage.data) {
      console.log("WebSocket message received:", lastMessage);
      const updatedJob = lastMessage.data;

      // Update the cache for this specific job
      if (jobId && updatedJob.id === jobId) {
        console.log("Updating job cache:", updatedJob);
      }

      // Update local job state directly from WS
      if (jobId && updatedJob.id === jobId) {
        setJob((prev: any) => ({ ...prev, ...updatedJob }));
      }

      // Also update the list cache if it exists
      queryClient.setQueryData(jobKeys.all, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          results: old.results?.map((job: any) =>
            job.id === updatedJob.id ? { ...job, ...updatedJob } : job,
          ),
        };
      });
    }
  }, [lastMessage, jobId, queryClient]);

  // We use local state updated by WebSocket to avoid redundant fetching
  const [job, setJob] = useState<any>(null);

  // Determine file type category
  const fileType = job?.file_type || cloudFile?.type || file?.type || "";
  const isAudioVideo =
    fileType.includes("audio") ||
    fileType.includes("video") ||
    inputMode === "youtube";
  const isPdf = fileType.includes("pdf");

  // Dynamic steps based on file type and selection
  const steps = useMemo(() => {
    const s = [];

    // Initial step depends on input mode
    if (inputMode === "youtube") {
      s.push({
        id: "checking_video",
        title: "Checking Video",
        desc: "Validating YouTube URL...",
      });
      s.push({
        id: "downloading",
        title: "Downloading Audio",
        desc: "Extracting audio track...",
      });
    } else {
      s.push({
        id: "uploading",
        title: "Uploading File",
        desc: "Securely transferring your data...",
      });
    }

    if (isAudioVideo) {
      s.push({
        id: "transcribing",
        title: "Transcribing Audio",
        desc: "Converting speech to text...",
      });
    } else if (isPdf) {
      s.push({
        id: "extracting_text",
        title: "Extracting Text",
        desc: "Parsing PDF content...",
      });
    }

    if (selectedTypes.length > 0) {
      s.push({
        id: "generating",
        title: "Generating Materials",
        desc: "Creating your study set simultaneously...",
      });
    }

    s.push({
      id: "finalizing",
      title: "Finalizing",
      desc: "Preparing your study guide...",
    });

    return s.map((step, index) => ({ ...step, index }));
  }, [isAudioVideo, isPdf, selectedTypes, job]);

  // Update UI based on job status
  useEffect(() => {
    if (!job) return;

    setCurrentStep((prev) => {
      // Find the step that matches the current job status
      const status = job.status;

      // Map backend status to step ID
      let stepId = status;

      // Handle "generating" fallback or specific mapping if needed
      if (status === "generating") {
        stepId = "generating_summary";
      }

      const match = steps.find((s) => s.id === stepId);
      if (match) return match.index;

      // Fallback logic for generic states
      if (status === "queued") {
        const firstProcessingStep = steps.find(
          (s) => s.id === "transcribing" || s.id === "extracting_text",
        );
        if (firstProcessingStep) {
          return firstProcessingStep.index;
        }
        return 1;
      }
      if (status === "completed") return steps.length - 1; // Finalizing/Done

      return prev;
    });

    if (job.status === "completed") {
      // Cancel any pending queries for this job to stop polling
      if (jobId) {
        queryClient.cancelQueries({ queryKey: jobKeys.detail(jobId) });
      }
      router.push(`/study-sets/${job.id}`);
    } else if (job.status === "failed") {
      // Cancel polling on failure
      if (jobId) {
        queryClient.cancelQueries({ queryKey: jobKeys.detail(jobId) });
      }
      // We don't set error here because we handle it in the Processing component
    }
  }, [job, jobId, router, queryClient, steps]);

  const handleDrag = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (file: File): boolean => {
    const validTypes = [
      "audio/mpeg",
      "audio/wav",
      "audio/mp3",
      "application/pdf",
      "text/plain",
      "video/mp4",
      "video/quicktime",
      "video/x-msvideo",
    ];
    if (!validTypes.includes(file.type)) {
      setError(
        "Unsupported file format. Please upload MP3, WAV, PDF, TXT, MP4, or MOV.",
      );
      return false;
    }
    return true;
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
      }
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setCloudFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleTypeToggle = (typeId: MaterialType) => {
    setSelectedTypes((prev) =>
      prev.includes(typeId)
        ? prev.filter((t) => t !== typeId)
        : [...prev, typeId],
    );
  };

  const handleUpload = async () => {
    if (inputMode === "file" && !file && !cloudFile) return;
    if (inputMode === "youtube" && !youtubeUrl) return;

    if (!session?.access_token) {
      setError("You must be logged in to upload files.");
      return;
    }

    try {
      setError(null);
      setCurrentStep(0);

      let response: ProcessUploadResponse | undefined;
      if (inputMode === "file" && file) {
        response = await processUploadMutation.mutateAsync({
          file,
          materialTypes: selectedTypes,
          options: jobOptions,
        });
      } else if (inputMode === "file" && cloudFile) {
        // Handle cloud import
        const { provider, fileId, fileLink } = cloudFile;
        response = await cloudService.importFromCloud({
          provider,
          fileId,
          fileLink,
          materialTypes: selectedTypes,
          options: jobOptions,
        });
      } else if (inputMode === "youtube" && youtubeUrl) {
        response = await processYoutubeMutation.mutateAsync({
          url: youtubeUrl,
          materialTypes: selectedTypes,
          options: jobOptions,
        });
      }

      if (response) {
        setJobId(response.job_id);
        setJob({ id: response.job_id, status: response.status, progress: 0 });
      }
    } catch (err) {
      console.error("Upload failed", err);
      setError((err as Error).message || "Upload failed. Please try again.");
    }
  };

  const handleCancel = async () => {
    if (!jobId) return;
    try {
      await cancelJobMutation.mutateAsync(jobId);
      // Reset state to allow new upload
      setJobId(undefined);
      setJob(null);
      setFile(null);
      setCloudFile(null);
      setCurrentStep(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Failed to cancel job", err);
    }
  };

  const handleRetry = async () => {
    if (!jobId) return;
    try {
      await retryJobMutation.mutateAsync(jobId);
      // Reset error if any, though it's handled in the UI
      setError(null);
    } catch (err) {
      console.error("Retry failed", err);
    }
  };

  const getFileIcon = (fileType: string): React.ReactNode => {
    if (fileType.includes("audio"))
      return <Music className="w-8 h-8 text-primary" />;
    if (fileType.includes("video"))
      return <Video className="w-8 h-8 text-primary" />;
    if (fileType.includes("pdf"))
      return <FileText className="w-8 h-8 text-primary" />;
    return <FileType className="w-8 h-8 text-primary" />;
  };

  const isProcessing =
    (!!jobId && job?.status !== "failed" && job?.status !== "cancelled") ||
    processUploadMutation.isPending ||
    retryJobMutation.isPending;

  // We show the processing screen even if it failed, so the user can retry
  const showProcessingScreen =
    !!jobId ||
    processUploadMutation.isPending ||
    processYoutubeMutation.isPending ||
    retryJobMutation.isPending;
  const progress = job?.progress || 0;

  return (
    <>
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-serif text-foreground mb-4">
            Upload Materials
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto mb-8">
            Upload your lecture recordings, PDFs, or notes. We'll automatically
            generate summaries, flashcards, and quizzes for you.
          </p>

          {/* Input Type Toggle */}
          {!showProcessingScreen && (
            <div className="inline-flex p-1 bg-muted/50 rounded-xl mb-6">
              <button
                onClick={() => setInputMode("file")}
                className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${
                  inputMode === "file"
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                File Upload
              </button>
              <button
                onClick={() => setInputMode("youtube")}
                className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${
                  inputMode === "youtube"
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                YouTube URL
              </button>
            </div>
          )}
        </header>

        {/* Main Content Area */}
        <Card className="rounded-3xl shadow-sm overflow-hidden mb-8 min-h-[400px] flex flex-col pt-0 pl-0 pr-0 pb-0 border-none">
          {!showProcessingScreen ? (
            inputMode === "youtube" ? (
              <YouTubeInput
                url={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onSubmit={handleUpload}
                isLoading={processYoutubeMutation.isPending}
                error={error}
                selectedTypes={selectedTypes}
                onTypeToggle={handleTypeToggle}
                videoMeta={videoMeta}
                onVideoMetaChange={setVideoMeta}
                options={jobOptions}
                onOptionsChange={setJobOptions}
              />
            ) : (
              <FileUpload
                file={file}
                fileInputRef={fileInputRef}
                handleRemoveFile={handleRemoveFile}
                handleChange={handleChange}
                handleDrag={handleDrag}
                dragActive={dragActive}
                handleDrop={handleDrop}
                onSubmit={handleUpload}
                getFileIcon={getFileIcon}
                error={error}
                selectedTypes={selectedTypes}
                onTypeToggle={handleTypeToggle}
                options={jobOptions}
                onOptionsChange={setJobOptions}
                onImportFromCloud={openPicker}
                isImporting={false} // Hook no longer handles mutation
                cloudFile={cloudFile}
              />
            )
          ) : (
            // Processing State
            <Processing
              progress={progress}
              steps={steps}
              currentStep={currentStep}
              onCancel={handleCancel}
              onRetry={handleRetry}
              isRetrying={retryJobMutation.isPending}
              status={job?.status}
            />
          )}
        </Card>

        {/* Recent Uploads Footer (Optional) */}
        {!isProcessing && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Supported Platforms
            </p>
            <div className="flex justify-center gap-8 opacity-60 hover:opacity-100 transition-opacity duration-500">
              {/* Google Drive */}
              <div className="flex items-center gap-2 group cursor-default">
                <GoogleDriveIcon className="w-5 h-5 filter grayscale group-hover:grayscale-0 transition-all" />
                <span className="font-semibold text-muted-foreground group-hover:text-muted-foreground transition-colors">
                  Google Drive
                </span>
              </div>

              {/* Dropbox */}
              <div className="flex items-center gap-2 group cursor-default">
                <DropboxIcon className="w-5 h-5 filter grayscale group-hover:grayscale-0 transition-all" />
                <span className="font-semibold text-muted-foreground group-hover:text-muted-foreground transition-colors">
                  Dropbox
                </span>
              </div>

              {/* YouTube */}
              <div className="flex items-center gap-2 group cursor-default">
                <YoutubeIcon className="w-5 h-5 filter grayscale group-hover:grayscale-0 transition-all" />
                <span className="font-semibold text-muted-foreground group-hover:text-muted-foreground transition-colors">
                  YouTube
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
