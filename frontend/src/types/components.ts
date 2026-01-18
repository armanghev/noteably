// Component prop types

import type { MaterialType } from './models';

export interface FileUploadProps {
  file: File | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  selectedTypes: MaterialType[];
  dragActive: boolean;
  error: string | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrag: (e: React.DragEvent<HTMLElement>) => void;
  onDrop: (e: React.DragEvent<HTMLElement>) => void;
  onRemoveFile: () => void;
  onTypeToggle: (type: MaterialType) => void;
  onSubmit: () => void;
  getFileIcon: (fileType: string) => React.ReactNode;
}

export interface ProcessingProps {
  progress: number;
  steps: ProcessingStep[];
  currentStep: number;
}

export interface ProcessingStep {
  id: number;
  title: string;
  desc: string;
}
