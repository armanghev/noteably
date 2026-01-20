import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, FileText, FileType, HelpCircle, Layers, Loader2, Music, ScrollText, StickyNote, Upload as UploadIcon, Wand2, Video } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProcessUpload, useJob, jobKeys } from '@/hooks/useJobs';
import { useQueryClient } from '@tanstack/react-query';
import type { FileUploadProps, ProcessingProps, MaterialType } from '@/types';
import React from 'react';

const contentTypes: Array<{ id: MaterialType; label: string; description: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'summary', label: 'Summary', description: 'Concise overview of key points', icon: ScrollText },
  { id: 'notes', label: 'Notes', description: 'Detailed structured notes', icon: StickyNote },
  { id: 'flashcards', label: 'Flashcards', description: 'Q&A cards for memorization', icon: Layers },
  { id: 'quizzes', label: 'Quizzes', description: 'Test your understanding', icon: HelpCircle },
];

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
  onTypeToggle 
}) => {
  return (
    <div className="flex-1 flex flex-col">
      {file ? (
        // File Preview State
        <div className="flex-1 flex flex-col items-center justify-center p-12 animate-fadeIn bg-background border border-primary rounded-3xl">
          <div className="w-20 h-20 bg-card rounded-2xl flex items-center justify-center mb-4 shadow-sm">
            {getFileIcon(file.type)}
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">{file.name}</h3>
          <p className="text-muted-foreground text-sm mb-6">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>

          {/* Content Type Selection */}
          <div className="w-full max-w-2xl mb-8">
            <h4 className="text-sm font-medium text-foreground mb-3 text-center">Select content to generate</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {contentTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedTypes.includes(type.id);
                return (
                  <button
                    key={type.id}
                    onClick={() => onTypeToggle(type.id)}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${isSelected
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border hover:border-primary/50 hover:bg-card'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-primary text-background' : 'bg-muted text-muted-foreground'
                        }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                        }`}>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-background" />}
                      </div>
                    </div>
                    <p className={`text-sm font-medium ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {type.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                  </button>
                );
              })}
            </div>
            {selectedTypes.length === 0 && (
              <p className="text-xs text-destructive mt-2 text-center">Please select at least one content type</p>
            )}
          </div>

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
              Generate {selectedTypes.length > 0 ? `(${selectedTypes.length})` : 'Materials'}
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
            accept=".mp3,.wav,.pdf,.txt,.mp4,.mov"
          />
          <label
            htmlFor="file-upload"
            className={`flex-1 flex flex-col items-center justify-center p-12 transition-all cursor-pointer border-2 border-dashed border-border rounded-3xl
                         ${dragActive
                ? 'bg-background/80'
                : 'hover:bg-card bg-background'
              } ${error ? 'border-destructive/50 bg-destructive/10' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-transform duration-300 ${dragActive ? 'scale-110 shadow-md shadow-primary' : 'shadow-sm shadow-primary'}`}>
              <UploadIcon className="w-10 h-10" />
            </div>

            <div className="text-center max-w-sm">
              <h3 className="text-xl font-medium text-foreground mb-2">
                {dragActive ? "Drop file here" : "Click to upload or drag and drop"}
              </h3>
              <p className="text-muted-foreground text-sm mb-6">
                MP3, WAV, PDF, TXT, MP4, MOV up to 50MB
              </p>
              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-4 py-2 rounded-full mx-auto w-fit">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>
          </label>
        </form>
      )}
    </div>
  );
};

const Processing: React.FC<ProcessingProps> = ({ progress, steps, currentStep }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 bg-background border border-primary rounded-3xl">
      <div className="w-full max-w-md">
        {/* Progress Visual */}
        <div className="mb-10 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 relative shadow-[0_0_15px_var(--primary)]">
            <div className="absolute inset-0 rounded-full"></div>
            <svg className="absolute inset-0 w-full h-full rotate-[-90deg] text-primary" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r="46"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeDasharray="289" // 2 * pi * 46
                strokeDashoffset={289 - (289 * progress) / 100}
                strokeLinecap="round"
                className="transition-all duration-300 ease-linear"
              />
            </svg>
            <span className="text-lg font-bold text-primary">{progress}%</span>
          </div>
          <h3 className="text-2xl font-serif text-foreground mb-2">{steps[currentStep]?.title || "Processing..."}</h3>
          <p className="text-foreground">{steps[currentStep]?.desc || "Please wait while we process your file."}</p>
        </div>

        {/* Steps List */}
        <div className="space-y-4">
          {steps.map((step, idx) => (
            <div
              key={step.id}
              className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${idx === currentStep ? 'bg-secondary border border-primary/20' : ''
                }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${idx < currentStep ? 'bg-primary text-primary-foreground' :
                idx === currentStep ? 'bg-card text-primary border border-primary' :
                  'bg-muted text-muted-foreground/50'
                }`}>
                {idx < currentStep ? <CheckCircle2 className="w-5 h-5" /> :
                  idx === currentStep ? <Loader2 className="w-4 h-4 animate-spin" /> :
                    <span className="text-sm font-medium">{idx + 1}</span>}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${idx <= currentStep ? 'text-foreground' : 'text-muted-foreground'
                  }`}>{step.title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function Upload() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { session } = useAuth();
  const processUploadMutation = useProcessUpload();
  const queryClient = useQueryClient();

  const [dragActive, setDragActive] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<MaterialType[]>(['summary', 'notes']);

  // Processing State
  const [jobId, setJobId] = useState<string | undefined>(undefined);
  const [currentStep, setCurrentStep] = useState<number>(0);

  const { data: job } = useJob(jobId);

  const steps = [
    { id: 0, title: "Uploading File", desc: "Securely transferring your data..." },
    { id: 1, title: "Transcribing Audio", desc: "Converting speech to text..." },
    { id: 2, title: "Generating Summary", desc: "Analyzing key concepts..." },
    { id: 3, title: "Creating Flashcards", desc: "Building study materials..." },
    { id: 4, title: "Finalizing", desc: "Preparing your study guide..." }
  ];

  // Update UI based on job status
  useEffect(() => {
    if (!job) return;

    setCurrentStep((prev) => {
      // Map backend status to UI steps
      // backend: queued, transcribing, generating, completed, failed
      // steps: 0=Uploading, 1=Transcribing, 2=Generating Summary, 3=Flashcards, 4=Finalizing
      if (job.status === 'transcribing') return 1;
      if (job.status === 'generating') {
        // Rough mapping based on progress
        if (job.progress < 60) return 2;
        if (job.progress < 90) return 3;
        return 4;
      }
      if (job.status === 'completed') return 4;
      if (job.status === 'failed') return prev; // Keep current step on failure
      return prev;
    });

    if (job.status === 'completed') {
      // Cancel any pending queries for this job to stop polling
      if (jobId) {
        queryClient.cancelQueries({ queryKey: jobKeys.detail(jobId) });
      }
      setTimeout(() => {
        navigate(`/study-sets/${job.id}`, { state: { from: '/upload' } });
      }, 1000);
    } else if (job.status === 'failed') {
      // Cancel polling on failure
      if (jobId) {
        queryClient.cancelQueries({ queryKey: jobKeys.detail(jobId) });
      }
      setError(job.error_message || "Processing failed. Please try again.");
    }
  }, [job, jobId, navigate, queryClient]);

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
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'application/pdf', 'text/plain', 'video/mp4', 'video/quicktime', 'video/x-msvideo'];
    if (!validTypes.includes(file.type)) {
      setError("Unsupported file format. Please upload MP3, WAV, PDF, TXT, MP4, or MOV.");
      return false;
    }
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      setError("File size too large. Maximum size is 50MB.");
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
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTypeToggle = (typeId: MaterialType) => {
    setSelectedTypes(prev =>
      prev.includes(typeId)
        ? prev.filter(t => t !== typeId)
        : [...prev, typeId]
    );
  };

  const handleUpload = async () => {
    if (!file) return;

    if (!session?.access_token) {
      setError("You must be logged in to upload files.");
      return;
    }

    try {
      setError(null);
      setCurrentStep(0);

      const response = await processUploadMutation.mutateAsync({
        file,
        materialTypes: selectedTypes,
      });

      setJobId(response.job_id);
    } catch (err) {
      console.error("Upload failed", err);
      setError((err as Error).message || "Upload failed. Please try again.");
    }
  };

  const getFileIcon = (fileType: string): React.ReactNode => {
    if (fileType.includes('audio')) return <Music className="w-8 h-8 text-primary" />;
    if (fileType.includes('video')) return <Video className="w-8 h-8 text-primary" />;
    if (fileType.includes('pdf')) return <FileText className="w-8 h-8 text-primary" />;
    return <FileType className="w-8 h-8 text-primary" />;
  };

  const isProcessing = !!jobId && job?.status !== 'completed' && job?.status !== 'failed';
  const progress = job?.progress || 0;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-serif text-foreground mb-4">Upload Materials</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Upload your lecture recordings, PDFs, or notes. We'll automatically generate summaries, flashcards, and quizzes for you.
          </p>
        </header>

        {/* Main Content Area */}
        <Card className="rounded-3xl shadow-sm overflow-hidden mb-8 min-h-[400px] flex flex-col pt-0 pl-0 pr-0 pb-0 border-none">

          {!isProcessing ? (
            // Upload State
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
            />
          ) : (
            // Processing State
            <Processing progress={progress} steps={steps} currentStep={currentStep} />
          )}
        </Card>

        {/* Recent Uploads Footer (Optional) */}
        {
          !isProcessing && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">Supported Platforms</p>
              <div className="flex justify-center gap-8 opacity-60 hover:opacity-100 transition-opacity duration-500">
                {/* Google Drive */}
                <div className="flex items-center gap-2 group cursor-default">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="Google Drive" className="w-5 h-5 filter grayscale group-hover:grayscale-0 transition-all" />
                  <span className="font-semibold text-muted-foreground group-hover:text-muted-foreground transition-colors">Google Drive</span>
                </div>

                {/* OneDrive */}
                <div className="flex items-center gap-2 group cursor-default">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/e/e7/Microsoft_OneDrive_Icon_%282025_-_present%29.svg" alt="OneDrive" className="w-5 h-5 filter grayscale group-hover:grayscale-0 transition-all" />
                  <span className="font-semibold text-muted-foreground group-hover:text-muted-foreground transition-colors">OneDrive</span>
                </div>

                {/* Dropbox */}
                <div className="flex items-center gap-2 group cursor-default">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Dropbox_Icon.svg" alt="Dropbox" className="w-5 h-5 filter grayscale group-hover:grayscale-0 transition-all" />
                  <span className="font-semibold text-muted-foreground group-hover:text-muted-foreground transition-colors">Dropbox</span>
                </div>
              </div>
            </div>
          )
        }
      </div>
    </Layout>
  );
}
