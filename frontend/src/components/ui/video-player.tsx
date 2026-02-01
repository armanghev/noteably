import {
  Maximize,
  Minimize,
  Pause,
  Play,
  Settings,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import {
  ScrubBarContainer,
  ScrubBarProgress,
  ScrubBarThumb,
  ScrubBarTimeLabel,
  ScrubBarTrack,
} from "./scrub-bar";

export interface TranscriptionWord {
  text: string;
  start: number; // Start time in seconds
  end: number; // End time in seconds
  confidence: number;
}

interface VideoPlayerProps {
  src: string | null | undefined;
  filename?: string;
  fileType?: string;
  fileSizeBytes?: number;
  transcript?: string | null;
  transcriptWords?: TranscriptionWord[] | null;
  className?: string;
  poster?: string; // Video poster/thumbnail image
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
}

export function VideoPlayer({
  src,
  filename,
  fileType,
  fileSizeBytes,
  transcript,
  transcriptWords,
  className = "",
  poster,
  autoPlay = false,
  loop = false,
  muted = false,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(muted);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState<
    number | null
  >(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userScrolledRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use actual word timestamps if available, otherwise estimate
  const wordsWithTiming = useMemo(() => {
    // If we have word-level timestamps from AssemblyAI, use those
    if (transcriptWords && transcriptWords.length > 0) {
      return transcriptWords.map((word, index) => ({
        word: word.text,
        startTime: word.start,
        endTime: word.end,
        index,
        confidence: word.confidence,
      }));
    }

    // Fallback: estimate timings from transcript text
    if (!transcript || !duration) return [];

    const words = transcript.split(/(\s+)/).filter((w) => w.trim().length > 0);
    const wordCount = words.length;
    if (wordCount === 0) return [];

    // Estimate time per word (average speaking rate is ~150 words per minute = 2.5 words per second)
    const timePerWord = duration / wordCount;

    return words.map((word, index) => ({
      word,
      startTime: index * timePerWord,
      endTime: (index + 1) * timePerWord,
      index,
    }));
  }, [transcript, transcriptWords, duration]);

  // Helper function to check if element is visible in viewport
  const isElementVisible = (
    element: HTMLElement,
    container: HTMLElement,
  ): boolean => {
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    return (
      elementRect.top >= containerRect.top &&
      elementRect.bottom <= containerRect.bottom &&
      elementRect.left >= containerRect.left &&
      elementRect.right <= containerRect.right
    );
  };

  // Update highlighted word based on current time
  useEffect(() => {
    if (!isPlaying || isScrubbing || wordsWithTiming.length === 0) return;

    const currentWord = wordsWithTiming.find(
      (w) => currentTime >= w.startTime && currentTime < w.endTime,
    );

    if (currentWord) {
      setHighlightedWordIndex(currentWord.index);

      // Auto-scroll only if user hasn't manually scrolled and word is not visible
      if (!userScrolledRef.current && transcriptRef.current) {
        const wordElement = transcriptRef.current.querySelector(
          `[data-word-index="${currentWord.index}"]`,
        ) as HTMLElement;

        if (
          wordElement &&
          !isElementVisible(wordElement, transcriptRef.current)
        ) {
          wordElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }
    }
  }, [currentTime, isPlaying, isScrubbing, wordsWithTiming]);

  // Handle manual scrolling - disable auto-scroll temporarily
  useEffect(() => {
    const container = transcriptRef.current;
    if (!container) return;

    const handleScroll = () => {
      userScrolledRef.current = true;

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        userScrolledRef.current = false;
      }, 2000);
    };

    container.addEventListener("scroll", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Reset user scroll flag when playback stops
  useEffect(() => {
    if (!isPlaying) {
      userScrolledRef.current = false;
    }
  }, [isPlaying]);

  // Reset highlight when scrubbing
  useEffect(() => {
    if (isScrubbing && wordsWithTiming.length > 0) {
      const currentWord = wordsWithTiming.find(
        (w) => currentTime >= w.startTime && currentTime < w.endTime,
      );
      setHighlightedWordIndex(currentWord?.index ?? null);
    }
  }, [isScrubbing, currentTime, wordsWithTiming]);

  // Auto-hide controls when playing
  useEffect(() => {
    if (!isPlaying) return;

    const resetControlsTimeout = () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      setShowControls(true);
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    resetControlsTimeout();

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, currentTime]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;

    if (!video || !src) return;

    const updateTime = () => {
      if (!isScrubbing) {
        setCurrentTime(video.currentTime);
      }
    };

    const updateDuration = () => {
      if (video.duration && isFinite(video.duration)) {
        setDuration(video.duration);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    const handleError = (e: Event) => {
      console.error("Video load error:", e);
      const error = video.error;
      if (error) {
        console.error("Video error code:", error.code);
        console.error("Video error message:", error.message);
      }
      toast.error("Failed to load video file. The file may not be accessible.");
    };

    const handleCanPlay = () => {
      updateDuration();
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("loadedmetadata", updateDuration);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("volumechange", handleVolumeChange);
    video.addEventListener("error", handleError);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    // Set initial volume and muted state
    video.volume = volume;
    video.muted = isMuted;
    video.playbackRate = playbackRate;

    // Try to load the media if already loaded
    if (video.readyState >= 2) {
      updateDuration();
    }

    return () => {
      video.removeEventListener("timeupdate", updateTime);
      video.removeEventListener("loadedmetadata", updateDuration);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("volumechange", handleVolumeChange);
      video.removeEventListener("error", handleError);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [isScrubbing, src, volume, isMuted, playbackRate]);

  const handlePlayPause = async () => {
    const video = videoRef.current;

    if (!video) return;

    try {
      if (isPlaying) {
        video.pause();
      } else {
        await video.play();
      }
    } catch (error) {
      console.error("Playback error:", error);
      toast.error("Failed to play video. Please try again.");
    }
  };

  const handleScrub = (time: number) => {
    const video = videoRef.current;

    if (!video) return;

    video.currentTime = time;
    setCurrentTime(time);
  };

  const handleScrubStart = () => {
    setIsScrubbing(true);
    setShowControls(true);
  };

  const handleScrubEnd = () => {
    setIsScrubbing(false);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleMuteToggle = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handlePlaybackRateChange = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const handleFullscreenToggle = async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
      toast.error("Failed to toggle fullscreen mode.");
    }
  };

  const handleWordClick = (startTime: number) => {
    const video = videoRef.current;
    if (!video || !duration) return;

    video.currentTime = startTime;
    setCurrentTime(startTime);

    if (!isPlaying) {
      video.play().catch((error) => {
        console.error("Failed to play video:", error);
      });
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "";
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  return (
    <div className={className}>
      {src ? (
        <div
          ref={containerRef}
          className="relative bg-card rounded-xl border border-border overflow-hidden group"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => {
            if (isPlaying) {
              setShowControls(false);
            }
          }}
        >
          {/* Video Element */}
          <video
            ref={videoRef}
            src={src}
            poster={poster}
            className="w-full h-auto max-h-[80vh] object-contain"
            preload="metadata"
            crossOrigin="anonymous"
            autoPlay={autoPlay}
            loop={loop}
            muted={isMuted}
            playsInline
            onError={(e) => {
              console.error("Video load error:", e);
              const error = videoRef.current?.error;
              if (error) {
                console.error("Video error code:", error.code);
                console.error("Video error message:", error.message);
              }
              toast.error(
                "Failed to load video file. The file may not be accessible.",
              );
            }}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                const dur = videoRef.current.duration;
                if (dur && isFinite(dur)) {
                  setDuration(dur);
                }
              }
            }}
            onClick={handlePlayPause}
          />

          {/* Controls Overlay */}
          <div
            className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300 ${
              showControls ? "opacity-100" : "opacity-0"
            } pointer-events-none`}
          >
            {/* Center Play/Pause Button */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlayPause();
                }}
                size="lg"
                className="w-20 h-20 rounded-full bg-primary/90 text-primary-foreground hover:bg-primary pointer-events-auto backdrop-blur-sm"
                disabled={duration === 0}
              >
                {isPlaying ? (
                  <Pause className="w-10 h-10" />
                ) : (
                  <Play className="w-10 h-10 ml-1" />
                )}
              </Button>
            </div>

            {/* Bottom Controls Bar */}
            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3 pointer-events-auto">
              {/* Scrub Bar */}
              {duration > 0 ? (
                <div className="flex items-center gap-3">
                  <ScrubBarTimeLabel
                    time={currentTime}
                    className="text-sm text-white min-w-[3rem] text-right tabular-nums"
                  />
                  <ScrubBarContainer
                    duration={duration}
                    value={currentTime}
                    onScrub={handleScrub}
                    onScrubStart={handleScrubStart}
                    onScrubEnd={handleScrubEnd}
                    className="flex-1"
                  >
                    <ScrubBarTrack className="bg-white/30 hover:bg-white/40">
                      <ScrubBarProgress className="bg-white/20 [&>div]:bg-primary" />
                      <ScrubBarThumb className="bg-primary border-2 border-white" />
                    </ScrubBarTrack>
                  </ScrubBarContainer>
                  <ScrubBarTimeLabel
                    time={duration}
                    className="text-sm text-white min-w-[3rem] text-left tabular-nums"
                  />
                </div>
              ) : (
                <div className="text-center text-sm text-white/80 py-2">
                  Loading video...
                </div>
              )}

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Play/Pause Button */}
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayPause();
                    }}
                    size="icon"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                    disabled={duration === 0}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                  </Button>

                  {/* Volume Control */}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMuteToggle();
                      }}
                      size="icon"
                      variant="ghost"
                      className="text-white hover:bg-white/20"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-5 h-5" />
                      ) : (
                        <Volume2 className="w-5 h-5" />
                      )}
                    </Button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      onClick={(e) => e.stopPropagation()}
                      className="w-20 h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                    />
                  </div>

                  {/* Playback Speed */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-white hover:bg-white/20"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Settings className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="bg-card border-border"
                    >
                      {playbackRates.map((rate) => (
                        <DropdownMenuItem
                          key={rate}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlaybackRateChange(rate);
                          }}
                          className={
                            playbackRate === rate ? "bg-primary/10" : ""
                          }
                        >
                          {rate}x
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Fullscreen Button */}
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFullscreenToggle();
                  }}
                  size="icon"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                >
                  {isFullscreen ? (
                    <Minimize className="w-5 h-5" />
                  ) : (
                    <Maximize className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-sm text-muted-foreground py-4">
          Loading file URL...
        </div>
      )}

      {/* File Info */}
      {(filename || fileType || fileSizeBytes) && (
        <div className="text-center text-sm text-muted-foreground mt-4">
          {filename && <p className="font-medium">{filename}</p>}
          {(fileType || fileSizeBytes) && (
            <p>
              {fileType && `${fileType}`}
              {fileType && fileSizeBytes && " • "}
              {fileSizeBytes && formatFileSize(fileSizeBytes)}
            </p>
          )}
        </div>
      )}

      {/* Transcript with highlighting */}
      {transcript && duration > 0 && (
        <div className="mt-8 pt-8 border-t border-border">
          <h3 className="text-lg font-medium text-foreground mb-4">
            Transcript
          </h3>
          <div
            ref={transcriptRef}
            className="bg-card p-6 rounded-xl border border-border max-h-96 overflow-y-auto"
          >
            <div className="space-y-1">
              {(() => {
                // Group words into sentences
                const sentences: {
                  start: number;
                  words: typeof wordsWithTiming;
                }[] = [];
                let currentSentence: typeof wordsWithTiming = [];

                wordsWithTiming.forEach((word) => {
                  currentSentence.push(word);
                  if (/[.!?]$/.test(word.word.trim())) {
                    sentences.push({
                      start: currentSentence[0].startTime,
                      words: [...currentSentence],
                    });
                    currentSentence = [];
                  }
                });

                // Add remaining words
                if (currentSentence.length > 0) {
                  sentences.push({
                    start: currentSentence[0].startTime,
                    words: currentSentence,
                  });
                }

                // Format seconds to MM:SS
                const formatTime = (seconds: number) => {
                  const m = Math.floor(seconds / 60);
                  const s = Math.floor(seconds % 60);
                  return `${m}:${s.toString().padStart(2, "0")}`;
                };

                return sentences.map((sentence, sIdx) => (
                  <div
                    key={sIdx}
                    className="flex gap-4 group hover:bg-muted/50 px-2 py-1 rounded-lg transition-colors"
                  >
                    <span className="text-xs font-mono text-muted-foreground pt-1 min-w-[50px] select-none">
                      {formatTime(sentence.start)}
                    </span>
                    <p className="text-sm text-foreground leading-relaxed">
                      {sentence.words.map((w) => (
                        <span
                          key={w.index}
                          data-word-index={w.index}
                          onClick={() => handleWordClick(w.startTime)}
                          className={`cursor-pointer rounded px-0.5 transition-colors ${
                            highlightedWordIndex === w.index
                              ? "bg-primary/20 text-primary font-medium"
                              : "hover:text-primary"
                          }`}
                        >
                          {w.word}{" "}
                        </span>
                      ))}
                    </p>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
