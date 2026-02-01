// Component prop types

import type { MaterialType } from "./models";

export interface FileUploadProps {
  file: File | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  selectedTypes: MaterialType[];
  dragActive: boolean;
  error: string | null;
  handleRemoveFile: () => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDrag: (e: React.DragEvent<HTMLElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLElement>) => void;
  onTypeToggle: (type: MaterialType) => void;
  onSubmit: () => void;
  getFileIcon: (fileType: string) => React.ReactNode;
}

export interface ProcessingProps {
  progress: number;
  steps: ProcessingStep[];
  currentStep: number;
  onCancel?: () => void;
  onRetry?: () => void;
  isRetrying?: boolean;
  status?: string;
}

export interface ProcessingStep {
  id: string | number;
  title: string;
  desc: string;
}
