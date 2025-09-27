import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { useAnimationStore } from '@/features/animation/model/animationStore';
import { Button } from '@/shared/ui/Button';

export function ImportExportButtons() {
  const { exportAnimationData, importAnimationData } = useAnimationStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const text = await exportAnimationData((progress) => {
        console.log('Export progress:', progress);
      });
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'animation_export.anim';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

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
        onClick={handleExport}
        disabled={isExporting}
        size={'icon'}
        variant={'secondary'}
        className="flex items-center gap-2"
        title="Export Animation"
      >
        {isExporting ? '...' : <Download className="h-4 w-4" />}
      </Button>
      <Button
        onClick={handleImport}
        disabled={isImporting}
        size={'icon'}
        variant={'secondary'}
        className="flex items-center gap-2"
        title="Import Animation"
      >
        {isImporting ? '...' : <Upload className="h-4 w-4" />}
      </Button>
      <input
        type="file"
        ref={fileInputRef}
        accept=".anim"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
