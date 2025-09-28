import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { saveAs } from 'file-saver';
import { Loader2Icon } from 'lucide-react';
import { useAnimationStore } from '@/features/animation/model/animationStore';
import { useExportStore } from '@/features/serialization/model/exportStore';
import { Input } from '@/shared/ui/Input';
import { Label } from '@/shared/ui/Label';
import { ProgressButton } from '../ProgressButton';
import { exportFramesToGIF } from '@/features/serialization/lib/gif';
import { Slider } from '@/shared/ui/Slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/Popover';
import { SketchPicker } from 'react-color';
import { PIXEL_SIZE } from '@/features/pixel-board/const';

export const GifTab: React.FC = () => {
  const { frames } = useAnimationStore();
  const { padding, setPadding } = useExportStore();
  const [name, setName] = useState('name');
  const [quality, setQuality] = useState(10);
  const [backgroundColor, setBackgroundColor] = useState<string>('#000000');
  const [progress, setProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
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
      setQuality(Math.max(1, Math.min(30, value)));
    }
  }, []);

  const generateGIF = useCallback(
    async (forPreview: boolean = false) => {
      if (forPreview) {
        setIsGeneratingPreview(true);
      } else {
        setIsExporting(true);
      }
      try {
        const blob = await exportFramesToGIF({
          frames,
          padding,
          quality,
          backgroundColor,
          onProgress: setProgress,
          pixelSize: forPreview ? PIXEL_SIZE : undefined,
        });
        if (!blob) return null;
        if (forPreview) {
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
          return null;
        } else {
          saveAs(blob, `${name}.gif`);
          return blob;
        }
      } catch (error) {
        console.error('GIF generation error:', error);
        return null;
      } finally {
        if (forPreview) {
          setIsGeneratingPreview(false);
        } else {
          setIsExporting(false);
        }
      }
    },
    [frames, padding, quality, backgroundColor, name]
  );

  const handleGeneratePreview = useCallback(() => {
    generateGIF(true);
  }, [generateGIF]);

  const handleExport = useCallback(() => {
    generateGIF(false);
  }, [generateGIF]);

  useEffect(() => {
    handleGeneratePreview();
  }, [handleGeneratePreview, padding, backgroundColor]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex gap-2">
        <div>
          <Label htmlFor="name">File Name</Label>
          <Input
            id="name"
            value={name}
            onChange={handleNameChange}
            placeholder="Enter a file name"
          />
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
        <div>
          <Popover>
            <PopoverTrigger className="flex h-full flex-col gap-1.5">
              <Label className="mt-1">Background</Label>
              <div
                className="h-full w-full cursor-pointer rounded-sm border border-gray-300"
                style={{ backgroundColor: backgroundColor }}
              />
            </PopoverTrigger>
            <PopoverContent
              side="right"
              className="m-0 w-full bg-transparent p-0"
            >
              <SketchPicker
                color={backgroundColor}
                disableAlpha
                onChange={(color) => {
                  setBackgroundColor(color.hex);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Label htmlFor="quality">Quality</Label>
        <Slider
          id="quality"
          min={1}
          max={30}
          value={[quality]}
          onValueChange={handleQualityChange}
        />
      </div>
      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-sm border border-gray-300">
        {!previewUrl || isGeneratingPreview ? (
          <Loader2Icon className="h-5 w-5 animate-spin" />
        ) : (
          <img src={previewUrl} className="h-full w-full" />
        )}
      </div>
      <ProgressButton
        onClick={handleExport}
        disabled={isExporting || !name}
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
