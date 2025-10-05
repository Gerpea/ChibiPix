import { Frame } from '@/features/animation/model/types';
import { useMemo } from 'react';

export const useSpritesheetData = (
  frames: Frame[],
  selectedFrames: Map<string, boolean>,
  consistentSize: boolean,
  padding: number
) => {
  const selectedFramesList = useMemo(
    () => frames.filter((f) => selectedFrames.get(f.id)),
    [frames, selectedFrames]
  );

  const boundsMap = useMemo(() => {
    const map: {
      [id: string]: {
        minX: number;
        minY: number;
        contentW: number;
        contentH: number;
      };
    } = {};
    frames.forEach((frame) => {
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
      frame.layers.forEach((layer) => {
        if (!layer.visible) return;
        for (const key of layer.pixels.keys()) {
          const [x, y] = key.split(',').map(Number);
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      });
      if (minX === Infinity) {
        minX = minY = 0;
        maxX = maxY = 7;
      }
      map[frame.id] = {
        minX,
        minY,
        contentW: maxX - minX + 1,
        contentH: maxY - minY + 1,
      };
    });
    return map;
  }, [frames]);

  const maxContentW = useMemo(
    () =>
      Math.max(1, ...selectedFramesList.map((f) => boundsMap[f.id].contentW)),
    [selectedFramesList, boundsMap]
  );

  const maxContentH = useMemo(
    () =>
      Math.max(1, ...selectedFramesList.map((f) => boundsMap[f.id].contentH)),
    [selectedFramesList, boundsMap]
  );

  const tileSizes = useMemo(() => {
    const map: { [id: string]: { w: number; h: number } } = {};
    selectedFramesList.forEach((f) => {
      const b = boundsMap[f.id];
      map[f.id] = {
        w: (consistentSize ? maxContentW : b.contentW) + 2 * padding,
        h: (consistentSize ? maxContentH : b.contentH) + 2 * padding,
      };
    });
    return map;
  }, [
    selectedFramesList,
    consistentSize,
    maxContentW,
    maxContentH,
    padding,
    boundsMap,
  ]);

  return {
    selectedFramesList,
    boundsMap,
    maxContentW,
    maxContentH,
    tileSizes,
  };
};
