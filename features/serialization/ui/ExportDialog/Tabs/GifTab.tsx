'use client';

import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { saveAs } from 'file-saver';
import { Loader2Icon } from 'lucide-react';
import { useAnimationStore } from '@/features/animation/model/animationStore';
import { Input } from '@/shared/ui/Input';
import { Label } from '@/shared/ui/Label';
import { ProgressButton } from '../ProgressButton';
import { exportFramesToGIF } from '@/features/serialization/lib/gif';
import { Slider } from '@/shared/ui/Slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/Popover';
import { SketchPicker } from 'react-color';
import { debounce } from 'lodash';
import { PIXEL_SIZE } from '@/features/pixel-board/const';
import { useExportContext } from '@/features/serialization/model/ExportContext';

export const GifTab: React.FC = () => {
  const { frames } = useAnimationStore();
  const { padding, setPadding } = useExportContext();
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
      const val = parseInt(e.target.value);
      if (!isNaN(val)) {
        setPadding(val);
      }
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
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          setPreviewUrl((previewUrl) => {
            const url = URL.createObjectURL(blob);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            return url;
          });
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

  const handleExport = useCallback(() => {
    generateGIF(false);
  }, [generateGIF]);

  useEffect(() => {
    const debouncedPreview = debounce(() => {
      generateGIF(true);
    }, 300);

    debouncedPreview();

    console.log('what');
    return () => {
      debouncedPreview.cancel();
    };
  }, [generateGIF]);

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
          <Label>Background</Label>
          <Popover>
            <PopoverTrigger asChild>
              <div
                className="border-border h-9 w-full cursor-pointer rounded-md border"
                style={{ backgroundColor: backgroundColor }}
              />
            </PopoverTrigger>
            <PopoverContent side="bottom" className="w-auto border-none p-0">
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
        <Label htmlFor="quality" className="mb-1">
          Quality ({quality})
        </Label>
        <Slider
          id="quality"
          min={1}
          max={30}
          value={[quality]}
          onValueChange={handleQualityChange}
        />
      </div>
      <div className="border-border bg-muted/50 flex h-full w-full items-center justify-center overflow-hidden rounded-sm border">
        {!previewUrl || isGeneratingPreview ? (
          <Loader2Icon className="text-muted-foreground h-5 w-5 animate-spin" />
        ) : (
          <img
            src={previewUrl}
            alt="GIF Preview"
            className="h-full w-full object-contain"
          />
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
