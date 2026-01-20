import { useRef, useState, useEffect, useMemo } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from './button';
import { ScrubBarContainer, ScrubBarTrack, ScrubBarProgress, ScrubBarThumb, ScrubBarTimeLabel } from './scrub-bar';
import { toast } from 'sonner';

export interface TranscriptionWord {
  text: string;
  start: number;  // Start time in seconds
  end: number;    // End time in seconds
  confidence: number;
}

interface AudioPlayerProps {
  src: string | null | undefined;
  filename?: string;
  fileType?: string;
  fileSizeBytes?: number;
  transcript?: string | null;
  transcriptWords?: TranscriptionWord[] | null;
  className?: string;
}

export function AudioPlayer({
  src,
  filename,
  fileType,
  fileSizeBytes,
  transcript,
  transcriptWords,
  className = '',
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState<number | null>(null);
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
    
    const words = transcript.split(/(\s+)/).filter(w => w.trim().length > 0);
    const wordCount = words.length;
    if (wordCount === 0) return [];
    
    // Estimate time per word (average speaking rate is ~150 words per minute = 2.5 words per second)
    // But we'll distribute time evenly based on duration
    const timePerWord = duration / wordCount;
    
    return words.map((word, index) => ({
      word,
      startTime: index * timePerWord,
      endTime: (index + 1) * timePerWord,
      index,
    }));
  }, [transcript, transcriptWords, duration]);
  
  // Helper function to check if element is visible in viewport
  const isElementVisible = (element: HTMLElement, container: HTMLElement): boolean => {
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
      (w) => currentTime >= w.startTime && currentTime < w.endTime
    );
    
    if (currentWord) {
      setHighlightedWordIndex(currentWord.index);
      
      // Auto-scroll only if user hasn't manually scrolled and word is not visible
      if (!userScrolledRef.current && transcriptRef.current) {
        const wordElement = transcriptRef.current.querySelector(
          `[data-word-index="${currentWord.index}"]`
        ) as HTMLElement;
        
        if (wordElement && !isElementVisible(wordElement, transcriptRef.current)) {
          wordElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
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
      
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Re-enable auto-scroll after 2 seconds of no scrolling
      scrollTimeoutRef.current = setTimeout(() => {
        userScrolledRef.current = false;
      }, 2000);
    };

    container.addEventListener('scroll', handleScroll);
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
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
        (w) => currentTime >= w.startTime && currentTime < w.endTime
      );
      setHighlightedWordIndex(currentWord?.index ?? null);
    }
  }, [isScrubbing, currentTime, wordsWithTiming]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;

    if (!audio || !src) return;

    const updateTime = () => {
      if (!isScrubbing) {
        setCurrentTime(audio.currentTime);
      }
    };

    const updateDuration = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    const handleError = (e: Event) => {
      console.error('Audio load error:', e);
      const error = audio.error;
      if (error) {
        console.error('Audio error code:', error.code);
        console.error('Audio error message:', error.message);
      }
      toast.error('Failed to load audio file. The file may not be accessible.');
    };

    const handleCanPlay = () => {
      updateDuration();
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // Try to load the media if already loaded
    if (audio.readyState >= 2) {
      updateDuration();
    }

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [isScrubbing, src]);

  const handlePlayPause = async () => {
    const audio = audioRef.current;

    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
      } else {
        await audio.play();
      }
    } catch (error) {
      console.error('Playback error:', error);
      toast.error('Failed to play audio. Please try again.');
    }
  };

  const handleScrub = (time: number) => {
    const audio = audioRef.current;

    if (!audio) return;

    audio.currentTime = time;
    setCurrentTime(time);
  };

  const handleScrubStart = () => {
    setIsScrubbing(true);
  };

  const handleScrubEnd = () => {
    setIsScrubbing(false);
  };

  const handleWordClick = (startTime: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    
    // Seek to the word's start time
    audio.currentTime = startTime;
    setCurrentTime(startTime);
    
    // Auto-play if paused
    if (!isPlaying) {
      audio.play().catch((error) => {
        console.error('Failed to play audio:', error);
      });
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className={className}>
      {src ? (
        <>
          {/* Hidden audio element for programmatic control */}
          <audio
            ref={audioRef}
            src={src}
            className="hidden"
            preload="metadata"
            crossOrigin="anonymous"
            onError={(e) => {
              console.error('Audio load error:', e);
              const error = audioRef.current?.error;
              if (error) {
                console.error('Audio error code:', error.code);
                console.error('Audio error message:', error.message);
              }
              toast.error('Failed to load audio file. The file may not be accessible.');
            }}
            onLoadedMetadata={() => {
              if (audioRef.current) {
                const dur = audioRef.current.duration;
                if (dur && isFinite(dur)) {
                  setDuration(dur);
                }
              }
            }}
            onCanPlay={() => {
              if (audioRef.current) {
                const dur = audioRef.current.duration;
                if (dur && isFinite(dur)) {
                  setDuration(dur);
                }
              }
            }}
          />
          <div className="flex items-center justify-center gap-2">
            {/* Play/Pause Button */}
            <Button
              onClick={handlePlayPause}
              size="lg"
              className="w-16 h-16 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={duration === 0}
            >
              {isPlaying ? (
                <Pause className="w-8 h-8" />
              ) : (
                <Play className="w-8 h-8 ml-1" />
              )}
            </Button>

            {/* Scrub Bar */}
            {duration > 0 ? (
              <div className="flex items-center gap-3 w-full">
                <ScrubBarTimeLabel time={currentTime} className="text-sm text-muted-foreground min-w-[3rem] text-right" />
                <ScrubBarContainer
                  duration={duration}
                  value={currentTime}
                  onScrub={handleScrub}
                  onScrubStart={handleScrubStart}
                  onScrubEnd={handleScrubEnd}
                  className="flex-1"
                >
                  <ScrubBarTrack className="bg-muted">
                    <ScrubBarProgress className="bg-muted/30 [&>div]:bg-primary" />
                    <ScrubBarThumb />
                  </ScrubBarTrack>
                </ScrubBarContainer>
                <ScrubBarTimeLabel time={duration} className="text-sm text-muted-foreground min-w-[3rem] text-left" />
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground py-4">
                Loading audio...
              </div>
            )}
          </div>

          {/* File Info */}
          {(filename || fileType || fileSizeBytes) && (
            <div className="text-center text-sm text-muted-foreground mt-4">
              {filename && <p className="font-medium">{filename}</p>}
              {(fileType || fileSizeBytes) && (
                <p>
                  {fileType && `${fileType}`}
                  {fileType && fileSizeBytes && ' • '}
                  {fileSizeBytes && formatFileSize(fileSizeBytes)}
                </p>
              )}
            </div>
          )}
          
          {/* Transcript with highlighting */}
          {transcript && duration > 0 && (
            <div className="mt-8 pt-8 border-t border-border">
              <h3 className="text-lg font-medium text-foreground mb-4">Transcript</h3>
              <div
                ref={transcriptRef}
                className="bg-card p-6 rounded-xl border border-border max-h-96 overflow-y-auto"
              >
                <div className="text-muted-foreground leading-relaxed break-words whitespace-normal space-y-2">
                  {wordsWithTiming.map(({ word, index, startTime }, i) => {
                    // Check if this word ends a sentence (ends with . ! ?)
                    const isSentenceEnd = /[.!?]$/.test(word.trim());
                    const isLastWord = i === wordsWithTiming.length - 1;
                    
                    return (
                      <span key={index}>
                        <span
                          data-word-index={index}
                          onClick={() => handleWordClick(startTime)}
                          className={`transition-colors duration-200 cursor-pointer hover:bg-muted/50 px-0.5 rounded ${
                            highlightedWordIndex === index
                              ? 'bg-primary/20 text-primary font-medium'
                              : ''
                          }`}
                        >
                          {word}
                        </span>
                        {!isLastWord && (
                          <>
                            {isSentenceEnd ? (
                              <>
                                {' '}
                                <br className="mb-1" />
                              </>
                            ) : (
                              ' '
                            )}
                          </>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center text-sm text-muted-foreground py-4">
          Loading file URL...
        </div>
      )}
    </div>
  );
}
