import { useState, useCallback } from 'react';
import { saveAs } from 'file-saver';
import { Frame, Layer } from '@/features/animation/model/animationStore';
import { intToHex } from '@/shared/utils/colors';

interface UseSpritesheetExporterProps {
  selectedFramesList: Frame[];
  positions: { [id: string]: { x: number; y: number } };
  boundsMap: {
    [id: string]: {
      minX: number;
      minY: number;
      contentW: number;
      contentH: number;
    };
  };
  tileSizes: { [id: string]: { w: number; h: number } };
  consistentSize: boolean;
  maxContentW: number;
  maxContentH: number;
  padding: number;
  filename: string;
}

export const useSpritesheetExporter = ({
  selectedFramesList,
  positions,
  boundsMap,
  tileSizes,
  consistentSize,
  maxContentW,
  maxContentH,
  padding,
  filename,
}: UseSpritesheetExporterProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const pixelSize = 1;

      let maxExtentX = 0;
      let maxExtentY = 0;
      selectedFramesList.forEach((frame) => {
        const pos = positions[frame.id] || { x: 0, y: 0 };
        const ts = tileSizes[frame.id] || {
          w: maxContentW + 2 * padding,
          h: maxContentH + 2 * padding,
        };
        maxExtentX = Math.max(maxExtentX, pos.x + ts.w);
        maxExtentY = Math.max(maxExtentY, pos.y + ts.h);
      });

      const canvas = document.createElement('canvas');
      canvas.width = maxExtentX * pixelSize;
      canvas.height = maxExtentY * pixelSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      selectedFramesList.forEach((frame) => {
        const pos = positions[frame.id] || { x: 0, y: 0 };
        const b = boundsMap[frame.id];
        const contentOffsetX = consistentSize
          ? (maxContentW - b.contentW) / 2
          : 0;
        const contentOffsetY = consistentSize
          ? (maxContentH - b.contentH) / 2
          : 0;
        frame.layers.forEach((layer: Layer) => {
          if (!layer.visible) return;
          for (const [key, color] of layer.pixels.entries()) {
            const [x, y] = key.split(',').map(Number);
            const adjustedX =
              (pos.x + padding + contentOffsetX + (x - b.minX)) * pixelSize;
            const adjustedY =
              (pos.y + padding + contentOffsetY + (y - b.minY)) * pixelSize;
            ctx.fillStyle = intToHex(color);
            ctx.fillRect(adjustedX, adjustedY, pixelSize, pixelSize);
          }
        });
      });

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      );
      if (blob) {
        saveAs(blob, filename);
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  }, [
    selectedFramesList,
    positions,
    boundsMap,
    tileSizes,
    consistentSize,
    maxContentW,
    maxContentH,
    padding,
    filename,
  ]);

  return { isExporting, handleExport };
};
