import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFileType(fileType: string | null | undefined): string {
  if (!fileType) return "Unknown"
  
  // Handle MIME types
  if (fileType.includes('/')) {
    const parts = fileType.split('/')
    const subtype = parts[1]?.split(';')[0] // Remove any parameters
    
    // Map common MIME types to friendly names
    const typeMap: Record<string, string> = {
      'pdf': 'PDF',
      'mpeg': 'MP3',
      'mp3': 'MP3',
      'wav': 'WAV',
      'ogg': 'OGG',
      'mp4': 'MP4',
      'webm': 'WebM',
      'plain': 'Text',
      'markdown': 'Markdown',
      'json': 'JSON',
      'html': 'HTML',
      'xml': 'XML',
    }
    
    return typeMap[subtype] || subtype.toUpperCase()
  }
  
  // Handle file extensions
  return fileType.toUpperCase()
}
