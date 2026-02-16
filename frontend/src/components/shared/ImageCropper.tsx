import { Minus, Plus, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";

interface ImageCropperProps {
  imageSrc: string;
  onCrop: (blob: Blob) => void;
  onCancel: () => void;
  cropSize?: number;
  outputSize?: number;
}

export function ImageCropper({
  imageSrc,
  onCrop,
  onCancel,
  cropSize = 280,
  outputSize = 400,
}: ImageCropperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const lastTouchDist = useRef<number | null>(null);
  const currentState = useRef({ scale: 1, offset: { x: 0, y: 0 } });

  // Keep ref in sync for event handlers that close over stale state
  useEffect(() => {
    currentState.current = { scale, offset };
  }, [scale, offset]);

  const getImageDrawSize = useCallback(
    (viewW: number, viewH: number, s: number) => {
      const img = imgRef.current;
      if (!img) return { drawW: 0, drawH: 0 };
      const aspect = img.naturalWidth / img.naturalHeight;
      const containerAspect = viewW / viewH;
      let baseW: number, baseH: number;
      if (aspect >= containerAspect) {
        baseW = viewW;
        baseH = viewW / aspect;
      } else {
        baseH = viewH;
        baseW = viewH * aspect;
      }
      return { drawW: baseW * s, drawH: baseH * s };
    },
    [],
  );

  const constrain = useCallback(
    (ox: number, oy: number, s: number): { x: number; y: number } => {
      const container = containerRef.current;
      const img = imgRef.current;
      if (!container || !img) return { x: ox, y: oy };
      const { offsetWidth: viewW, offsetHeight: viewH } = container;
      const { drawW, drawH } = getImageDrawSize(viewW, viewH, s);
      const maxX = Math.max(0, (drawW - cropSize) / 2);
      const maxY = Math.max(0, (drawH - cropSize) / 2);
      return {
        x: Math.max(-maxX, Math.min(maxX, ox)),
        y: Math.max(-maxY, Math.min(maxY, oy)),
      };
    },
    [cropSize, getImageDrawSize],
  );

  // Set initial scale so image fills the crop circle
  const initScale = useCallback(() => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return;
    const { offsetWidth: viewW, offsetHeight: viewH } = container;
    const aspect = img.naturalWidth / img.naturalHeight;
    const containerAspect = viewW / viewH;
    const baseW = aspect >= containerAspect ? viewW : viewH * aspect;
    const baseH = aspect >= containerAspect ? viewW / aspect : viewH;
    const min = Math.max(cropSize / baseW, cropSize / baseH);
    setMinScale(min);
    setScale(min);
    setOffset({ x: 0, y: 0 });
  }, [cropSize]);

  useEffect(() => {
    if (imageLoaded) initScale();
  }, [imageLoaded, initScale]);

  // Mouse drag
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    lastPointer.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      setOffset((prev) => {
        const { scale: s } = currentState.current;
        return constrain(prev.x + dx, prev.y + dy, s);
      });
    },
    [isDragging, constrain],
  );

  const onMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  // Touch drag + pinch zoom
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      lastPointer.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      setIsDragging(true);
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.hypot(dx, dy);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - lastPointer.current.x;
      const dy = e.touches[0].clientY - lastPointer.current.y;
      lastPointer.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      setOffset((prev) => {
        const { scale: s } = currentState.current;
        return constrain(prev.x + dx, prev.y + dy, s);
      });
    } else if (e.touches.length === 2 && lastTouchDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const delta = dist / lastTouchDist.current;
      lastTouchDist.current = dist;
      adjustScale((prev) => prev * delta);
    }
  };

  const onTouchEnd = () => {
    setIsDragging(false);
    lastTouchDist.current = null;
  };

  // Scroll to zoom
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    adjustScale((prev) => prev + delta);
  };

  // Zoom controls
  const adjustScale = (fn: (prev: number) => number) => {
    setScale((prev) => {
      const next = Math.max(minScale, Math.min(4, fn(prev)));
      setOffset((o) => constrain(o.x, o.y, next));
      return next;
    });
  };

  const zoomIn = () => adjustScale((prev) => prev + 0.15);
  const zoomOut = () => adjustScale((prev) => prev - 0.15);
  const resetZoom = () => {
    setScale(minScale);
    setOffset({ x: 0, y: 0 });
  };

  // Crop
  const handleCrop = () => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return;

    const { offsetWidth: viewW, offsetHeight: viewH } = container;
    const { drawW, drawH } = getImageDrawSize(viewW, viewH, scale);

    const imgLeft = (viewW - drawW) / 2 + offset.x;
    const imgTop = (viewH - drawH) / 2 + offset.y;

    const circleLeft = (viewW - cropSize) / 2;
    const circleTop = (viewH - cropSize) / 2;

    const pixelsPerPt = img.naturalWidth / drawW;

    const srcX = (circleLeft - imgLeft) * pixelsPerPt;
    const srcY = (circleTop - imgTop) * pixelsPerPt;
    const srcSize = cropSize * pixelsPerPt;

    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d")!;

    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(
      img,
      srcX,
      srcY,
      srcSize,
      srcSize,
      0,
      0,
      outputSize,
      outputSize,
    );

    canvas.toBlob(
      (blob) => {
        if (blob) onCrop(blob);
      },
      "image/jpeg",
      0.9,
    );
  };

  // Calculate zoom percentage for display
  const zoomPercent = Math.round((scale / minScale) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Crop Photo</h2>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Crop area */}
        <div
          ref={containerRef}
          className="relative h-80 sm:h-96 bg-black overflow-hidden select-none"
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onWheel={onWheel}
        >
          {/* Image */}
          <img
            ref={imgRef}
            src={imageSrc}
            alt=""
            draggable={false}
            onLoad={() => setImageLoaded(true)}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: "center",
            }}
          />

          {/* SVG overlay — dark area with circular cutout */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <mask id="noteably-crop-mask">
                <rect width="100%" height="100%" fill="white" />
                <circle cx="50%" cy="50%" r={cropSize / 2} fill="black" />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0,0,0,0.6)"
              mask="url(#noteably-crop-mask)"
            />
            <circle
              cx="50%"
              cy="50%"
              r={cropSize / 2}
              fill="none"
              stroke="white"
              strokeWidth="2"
            />
          </svg>
        </div>

        {/* Controls */}
        <div className="px-5 py-4 bg-muted/30 border-t border-border">
          {/* Zoom controls */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <button
              onClick={zoomOut}
              disabled={scale <= minScale}
              className="p-2 rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Minus className="w-5 h-5 text-foreground" />
            </button>

            <div className="flex items-center gap-2 min-w-[100px] justify-center">
              <span className="text-sm font-medium text-foreground tabular-nums">
                {zoomPercent}%
              </span>
            </div>

            <button
              onClick={zoomIn}
              disabled={scale >= 4}
              className="p-2 rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-5 h-5 text-foreground" />
            </button>

            <div className="w-px h-6 bg-border mx-1" />

            <button
              onClick={resetZoom}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1 py-5 rounded-xl"
            >
              Cancel
            </Button>
            <Button onClick={handleCrop} className="flex-1 py-5 rounded-xl">
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
