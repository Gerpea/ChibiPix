import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Loader2Icon } from 'lucide-react';
import { CheckedState } from '@radix-ui/react-checkbox';
import {
  Frame,
  useAnimationStore,
} from '@/features/animation/model/animationStore';
import { useExportStore } from '@/features/serialization/model/exportStore';
import { Checkbox } from '@/shared/ui/Checkbox';
import { Input } from '@/shared/ui/Input';
import { Label } from '@/shared/ui/Label';
import { ExportPreviews } from '../ExportPreviews';
import { ProgressButton } from '../ProgressButton';
import { exportFramesToPNG } from '@/features/serialization/lib/png';

export const PngTab: React.FC = () => {
  const { frames } = useAnimationStore();
  const { padding, selectedFrames, setPadding, setSelectedFrames } =
    useExportStore();
  const [prefix, setPrefix] = useState('frame_');
  const [useZip, setUseZip] = useState(false);
  const [consistentSize, setConsistentSize] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setSelectedFrames(
      frames
        ? new Map<string, boolean>(frames.map((frame) => [frame.id, true]))
        : new Map<string, boolean>()
    );
  }, [frames, setSelectedFrames]);

  const handlePrefixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrefix(e.target.value);
  };

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const zip = useZip ? new JSZip() : null;
      const exportFrames = Array.from(selectedFrames.entries())
        .filter(([_, selected]) => selected)
        .map(([id]) => frames.find((frame) => frame.id === id))
        .filter((frame): frame is Frame => !!frame);

      const blobs = await exportFramesToPNG({
        frames: exportFrames,
        padding: padding,
        consistentSize: consistentSize,
        onProgress: setProgress,
      });

      for (let i = 0; i < blobs.length; i++) {
        const name = `${prefix}${i.toString().padStart(3, '0')}`;
        const blob = blobs[i];
        if (!blob) continue;
        if (zip) {
          zip.file(`${name}.png`, blob); // Use the existing zip instance
        } else {
          saveAs(blob, `${name}.png`);
        }
      }

      if (zip) {
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, `${prefix}.zip`);
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  }, [frames, selectedFrames, consistentSize, padding, prefix, useZip]);

  const handleZipToggle = useCallback((value: CheckedState) => {
    setUseZip(!!value);
  }, []);

  const handleConsistentSizeToggle = useCallback((value: CheckedState) => {
    setConsistentSize(!!value);
  }, []);

  const handlePaddingChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setPadding(parseInt(e.target.value));
    },
    [setPadding]
  );

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex gap-2">
        <div>
          <Label htmlFor="prefix">Prefix</Label>
          <Input id="prefix" value={prefix} onChange={handlePrefixChange} />
        </div>
        <div>
          <Label htmlFor="padding">Padding</Label>
          <Input
            id="padding"
            className="w-24"
            type="number"
            value={padding}
            onChange={handlePaddingChange}
          />
        </div>
      </div>
      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="zip-png"
            checked={useZip}
            onCheckedChange={handleZipToggle}
          />
          <Label htmlFor="zip-png">Pack into ZIP</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="consistent-size"
            checked={consistentSize}
            onCheckedChange={handleConsistentSizeToggle}
          />
          <Label htmlFor="consistent-size">Consistent Size</Label>
        </div>
      </div>
      <ExportPreviews />
      <ProgressButton
        onClick={handleExport}
        disabled={isExporting}
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
