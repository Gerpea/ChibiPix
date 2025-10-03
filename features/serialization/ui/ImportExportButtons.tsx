import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { useAnimationStore } from '@/features/animation/model/animationStore';
import { Button } from '@/shared/ui/Button';
import { ExportDialog } from './ExportDialog/ExportDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/Tooltip';

export function ImportExportButtons() {
  const { importAnimationData } = useAnimationStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      await importAnimationData(text, () => {});
    } catch (error) {
      console.error('Import error:', error);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() => setDialogOpen(true)}
            disabled={isImporting}
            size="icon"
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Export Animation</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger>
          <>
            <Button
              onClick={handleImport}
              disabled={isImporting}
              size="icon"
              variant="outline"
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".chbpx"
              onChange={handleFileChange}
              className="hidden"
            />
          </>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Import Animation</p>
        </TooltipContent>
      </Tooltip>
      <ExportDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
