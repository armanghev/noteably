import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from './button';
import { Card } from './card';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download,
  Maximize2,
  Minimize2,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
// Import required CSS for react-pdf
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker - use local worker file from public folder
// The worker file must match the pdfjs-dist version used by react-pdf
if (typeof window !== 'undefined') {
  // Use local worker file (copied to public folder) - most reliable
  // This matches the version bundled with react-pdf (5.4.296)
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    '/pdf.worker.min.mjs',
    window.location.origin
  ).toString();
  console.log('PDF.js worker configured:', pdfjs.GlobalWorkerOptions.workerSrc);
  console.log('PDF.js version:', pdfjs.version);
}

export interface PDFViewerProps {
  file: string | File | ArrayBuffer | Uint8Array;
  filename?: string;
  className?: string;
  onLoadError?: (error: Error) => void;
  onLoadSuccess?: (numPages: number) => void;
}

export function PDFViewer({ 
  file, 
  filename,
  className,
  onLoadError,
  onLoadSuccess 
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [pdfFile, setPdfFile] = useState<string | File | ArrayBuffer | Uint8Array | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Memoize PDF.js options to prevent unnecessary re-renders
  const pdfOptions = useMemo(() => ({
    cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
    httpHeaders: typeof file === 'string' ? {} : undefined,
  }), [file]);

  // Prepare PDF file for rendering
  useEffect(() => {
    if (!file) {
      setPdfFile(null);
      setLoading(false);
      return;
    }

    // If it's already a File, ArrayBuffer, or Uint8Array, use it directly
    if (file instanceof File || file instanceof ArrayBuffer || file instanceof Uint8Array) {
      setPdfFile(file);
      setLoading(false);
      return;
    }

    // If it's a string URL, use it directly
    if (typeof file === 'string') {
      setPdfFile(file);
      setLoading(false);
    }
  }, [file]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    console.log('PDF loaded successfully, pages:', numPages);
    setNumPages(numPages);
    setLoading(false);
    setError(null);
    onLoadSuccess?.(numPages);
  }, [onLoadSuccess]);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('PDF load error:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      file: typeof file === 'string' ? file.substring(0, 100) : 'Not a string URL'
    });
    setLoading(false);
    
    // Provide more helpful error messages
    let errorMessage = 'Failed to load PDF. ';
    if (error.message?.includes('CORS')) {
      errorMessage += 'CORS error: The PDF file may not be accessible from this domain.';
    } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
      errorMessage += 'Network error: Please check your connection and try again.';
    } else if (error.message?.includes('Invalid PDF')) {
      errorMessage += 'Invalid PDF format.';
    } else {
      errorMessage += error.message || 'Please check if the file is accessible.';
    }
    
    setError(errorMessage);
    onLoadError?.(error);
  }, [onLoadError, file]);

  const goToPrevPage = useCallback(() => {
    // Save scroll position before changing page
    const scrollTop = containerRef.current?.scrollTop || 0;
    setPageNumber((prev) => {
      const newPage = Math.max(1, prev - 1);
      // Restore scroll position after state update
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = scrollTop;
        }
      }, 0);
      return newPage;
    });
  }, []);

  const goToNextPage = useCallback(() => {
    // Save scroll position before changing page
    const scrollTop = containerRef.current?.scrollTop || 0;
    setPageNumber((prev) => {
      const newPage = Math.min(numPages, prev + 1);
      // Restore scroll position after state update
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = scrollTop;
        }
      }, 0);
      return newPage;
    });
  }, [numPages]);

  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(3.0, prev + 0.25));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => Math.max(0.5, prev - 0.25));
  }, []);

  const rotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1.0);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        element.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  const downloadPDF = useCallback(() => {
    if (typeof file === 'string') {
      window.open(file, '_blank');
    } else if (file instanceof File) {
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }, [file, filename]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevPage();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNextPage();
          break;
        case '+':
        case '=':
          e.preventDefault();
          zoomIn();
          break;
        case '-':
          e.preventDefault();
          zoomOut();
          break;
        case '0':
          e.preventDefault();
          resetZoom();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          rotate();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [goToPrevPage, goToNextPage, zoomIn, zoomOut, resetZoom, rotate]);

  return (
    <Card className={cn("p-6 shadow-sm bg-background border border-border flex flex-col", className)}>
      {/* Toolbar - Sticky */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-border sticky top-0 bg-background z-10">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="rounded-md"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-md">
            <span className="text-sm text-muted-foreground">
              Page {pageNumber} of {numPages || '...'}
            </span>
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className="rounded-md"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="rounded-md"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-md min-w-[80px] justify-center">
            <span className="text-sm text-muted-foreground">
              {Math.round(scale * 100)}%
            </span>
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={zoomIn}
            disabled={scale >= 3.0}
            className="rounded-md"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={resetZoom}
            className="rounded-md"
            aria-label="Reset zoom"
          >
            <span className="text-xs font-medium">100%</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={rotate}
            className="rounded-md"
            aria-label="Rotate"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            className="rounded-md"
            aria-label="Toggle fullscreen"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={downloadPDF}
            className="rounded-md"
            aria-label="Download PDF"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div 
        ref={containerRef}
        className="flex justify-center items-start bg-muted/30 rounded-lg p-4 border border-border overflow-y-auto overflow-x-hidden pdf-viewer-container"
      >
        {!file || !pdfFile ? (
          <div className="flex flex-col items-center justify-center py-12">
            {loading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Preparing PDF...</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No PDF file provided</p>
            )}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 w-full">
            <p className="text-sm text-destructive mb-2 font-medium">Error loading PDF</p>
            <p className="text-xs text-muted-foreground mb-4 text-center max-w-md">{error}</p>
            {typeof file === 'string' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(file, '_blank')}
                className="mt-2"
              >
                Open in New Tab
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center w-full">
            {pdfFile && (
              <Document
                file={pdfFile as Parameters<typeof Document>[0]['file']}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                    <p className="text-sm text-muted-foreground">Loading PDF...</p>
                  </div>
                }
                error={
                  <div className="flex flex-col items-center justify-center py-12">
                    <p className="text-sm text-destructive mb-2">Error loading PDF</p>
                    {typeof file === 'string' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(file, '_blank')}
                        className="mt-2"
                      >
                        Open in New Tab
                      </Button>
                    )}
                  </div>
                }
                className="pdf-document"
                options={pdfOptions}
              >
              {numPages > 0 && (
                <>
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    rotate={rotation}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    className="shadow-lg rounded-md border border-border"
                    canvasBackground="white"
                    loading={
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    }
                  />
                </>
              )}
              </Document>
            )}
          </div>
        )}
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          Keyboard shortcuts: ← → (navigate), + - (zoom), 0 (reset zoom), R (rotate)
        </p>
      </div>
    </Card>
  );
}
