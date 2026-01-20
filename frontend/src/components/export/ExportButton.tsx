import { Download, FileText, Code, File, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useExport } from '@/hooks/useExport';
import type { MaterialType } from '@/types';

interface ExportButtonProps {
  jobId: string;
  materialTypes: MaterialType[];
  disabled?: boolean;
}

export function ExportButton({ jobId, materialTypes, disabled = false }: ExportButtonProps) {
  const exportMutation = useExport();

  const handleExport = (format: 'markdown' | 'json' | 'pdf') => {
    // Determine which material types to export based on format
    let exportMaterialTypes: MaterialType[] = materialTypes;
    
    if (format === 'markdown') {
      // Only export summary and notes for markdown
      exportMaterialTypes = materialTypes.filter(t => t === 'summary' || t === 'notes');
    } else if (format === 'json') {
      // Only export flashcards and quizzes for JSON
      exportMaterialTypes = materialTypes.filter(t => t === 'flashcards' || t === 'quiz' || t === 'quizzes');
    }
    // PDF exports all material types

    exportMutation.mutate({
      job_id: jobId,
      format,
      material_types: exportMaterialTypes.length > 0 ? exportMaterialTypes : undefined,
    });
  };

  const isLoading = exportMutation.isPending;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled || isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-background border-border p-3">
        {materialTypes.includes('summary') || materialTypes.includes('notes') ? (
          <DropdownMenuItem onClick={() => handleExport('markdown')} disabled={isLoading}>
            <FileText className="w-4 h-4 mr-2" />
            Export as Markdown
          </DropdownMenuItem>
        ) : null}
        {materialTypes.includes('flashcards') || materialTypes.includes('quiz') || materialTypes.includes('quizzes') ? (
          <DropdownMenuItem onClick={() => handleExport('json')} disabled={isLoading}>
            <Code className="w-4 h-4 mr-2" />
            Export as JSON
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem 
          onClick={() => handleExport('pdf')} 
          disabled={isLoading}
        >
          <File className="w-4 h-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
