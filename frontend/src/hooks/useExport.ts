import { useMutation } from '@tanstack/react-query';
import { exportService, type ExportRequest } from '@/lib/api/services/export';
import { toast } from 'sonner';

export function useExport() {
  return useMutation({
    mutationFn: (params: ExportRequest) => exportService.exportJob(params),
    onSuccess: (data) => {
      // Trigger download
      const link = document.createElement('a');
      link.href = data.download_url;
      link.download = data.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Export downloaded successfully!');
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Export failed. Please try again.';
      toast.error(errorMessage);
    },
  });
}
