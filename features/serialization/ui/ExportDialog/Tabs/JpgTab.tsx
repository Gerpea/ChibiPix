import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Loader2Icon } from 'lucide-react';
import { CheckedState } from '@radix-ui/react-checkbox';
import {
  Frame,
  useAnimationStore,
} from '@/features/animation/model/animationStore';
import { Checkbox } from '@/shared/ui/Checkbox';
import { Input } from '@/shared/ui/Input';
import { Label } from '@/shared/ui/Label';
import { ExportPreviews } from '../ExportPreviews';
import { ProgressButton } from '../ProgressButton';
import { exportFramesToJPG } from '@/features/serialization/lib/jpg';
import { Slider } from '@/shared/ui/Slider';
import { useExportContext } from '@/features/serialization/model/ExportContext';

export const JpgTab: React.FC = () => {
  const { frames } = useAnimationStore();
  const { padding, selectedFrames, setPadding, setSelectedFrames } =
    useExportContext();
  const [prefix, setPrefix] = useState('frame_');
  const [useZip, setUseZip] = useState(false);
  const [consistentSize, setConsistentSize] = useState(false);
  const [quality, setQuality] = useState(80);
  const [progress, setProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const handlePrefixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrefix(e.target.value);
  };

  const handlePaddingChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setPadding(parseInt(e.target.value));
    },
    [setPadding]
  );

  const handleQualityChange = useCallback((values: number[]) => {
    const value = values[0];
    if (!isNaN(value)) {
      setQuality(Math.max(1, Math.min(100, value)));
    }
  }, []);

  const handleZipToggle = useCallback((value: CheckedState) => {
    setUseZip(!!value);
  }, []);

  const handleConsistentSizeToggle = useCallback((value: CheckedState) => {
    setConsistentSize(!!value);
  }, []);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const zip = useZip ? new JSZip() : null;
      const exportFrames = Array.from(selectedFrames.entries())
        .filter(([_, selected]) => selected)
        .map(([id]) => frames.find((frame) => frame.id === id))
        .filter((frame): frame is Frame => !!frame);

      const blobs = await exportFramesToJPG({
        frames: exportFrames,
        padding: padding,
        consistentSize: consistentSize,
        quality: quality / 100,
        onProgress: setProgress,
      });

      for (let i = 0; i < blobs.length; i++) {
        const name = `${prefix}${i.toString().padStart(3, '0')}`;
        const blob = blobs[i];
        if (!blob) continue;
        if (zip) {
          zip.file(`${name}.jpg`, blob);
        } else {
          saveAs(blob, `${name}.jpg`);
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
  }, [
    frames,
    selectedFrames,
    consistentSize,
    padding,
    prefix,
    useZip,
    quality,
  ]);

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
            id="zip-jpg"
            checked={useZip}
            onCheckedChange={handleZipToggle}
          />
          <Label htmlFor="zip-jpg">Pack into ZIP</Label>
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
      <div className="flex flex-col gap-3">
        <Label htmlFor="quality">{`Quality (${quality})`}</Label>
        <Slider
          id="quality"
          min={1}
          max={100}
          value={[quality]}
          onValueChange={handleQualityChange}
        />
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
