import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { useAnimationStore } from '@/features/animation/model/animationStore';
import { Button } from '@/shared/ui/Button';
import { ExportDialog } from './ExportDialog/ExportDialog';

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
      await importAnimationData(text, (progress) => {
        console.log('Import progress:', progress);
      });
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
      <Button
        onClick={() => setDialogOpen(true)}
        disabled={isImporting}
        size="icon"
        variant="secondary"
        className="flex items-center gap-2"
        title="Export Animation"
      >
        <Download className="h-4 w-4" />
      </Button>
      <Button
        onClick={handleImport}
        disabled={isImporting}
        size="icon"
        variant="secondary"
        className="flex items-center gap-2"
        title="Import Animation"
      >
        <Upload className="h-4 w-4" />
      </Button>
      <input
        type="file"
        ref={fileInputRef}
        accept=".anim"
        onChange={handleFileChange}
        className="hidden"
      />
      <ExportDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
