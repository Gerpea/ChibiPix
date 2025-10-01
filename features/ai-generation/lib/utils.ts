import { Pixel } from '@/features/animation/model/animationStore';

interface Generation {
  isGenerating: boolean;
  layerId: string;
  area: {
    startX: number;
    startY: number;
  } | null;
}

export const isPixelInActiveAIArea = (
  pixel: Omit<Pixel, 'color'>,
  generations: Record<string, Generation>,
  activeLayerId: string | undefined
): boolean => {
  if (!activeLayerId) {
    return false;
  }

  return Object.values(generations).some((generation) => {
    if (
      !generation.isGenerating ||
      !generation.area ||
      generation.layerId !== activeLayerId
    ) {
      return false;
    }

    const isWithinX =
      pixel.x >= generation.area.startX &&
      pixel.x < generation.area.startX + 16;
    const isWithinY =
      pixel.y >= generation.area.startY &&
      pixel.y < generation.area.startY + 16;

    return isWithinX && isWithinY;
  });
};
