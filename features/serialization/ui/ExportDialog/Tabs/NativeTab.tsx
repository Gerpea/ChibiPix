import { ChangeEvent, useCallback, useState } from 'react';
import { saveAs } from 'file-saver';
import { Loader2Icon } from 'lucide-react';
import { useAnimationStore } from '@/features/animation/model/animationStore';
import { Input } from '@/shared/ui/Input';
import { Label } from '@/shared/ui/Label';
import { ExportPreviews } from '../ExportPreviews';
import { ProgressButton } from '../ProgressButton';

export const NativeTab: React.FC = () => {
  const { exportAnimationData } = useAnimationStore();
  const [fileName, setFileName] = useState('project');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const text = await exportAnimationData((progress) => {
        setProgress(progress.progress * 100);
      });
      const blob = new Blob([text], { type: 'text/plain' });
      saveAs(blob, `${fileName}.chbpx`);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  }, [exportAnimationData, fileName]);

  const handleNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setFileName(e.target.value);
  }, []);

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <Label htmlFor="fileName">File Name</Label>
        <Input
          id="fileName"
          value={fileName}
          onChange={handleNameChange}
          placeholder="Enter a file name"
        />
      </div>
      <ExportPreviews />
      <ProgressButton
        onClick={handleExport}
        disabled={isExporting || !fileName}
        className="mt-auto w-full transition-all duration-200"
        progress={isExporting ? progress : undefined}
      >
        {isExporting ? (
          <Loader2Icon className="h-5 w-5 animate-spin" />
        ) : (
          'Export'
        )}
      </ProgressButton>
    </div>
  );
};
