import { create } from 'zustand';

interface Pixel {
  row: number;
  col: number;
}
interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface Stage {
  width: number;
  height: number;
  scale: number;
}

interface Pan {
  x: number;
  y: number;
}

export interface PixelBoardStore {
  hoverPixel?: Pixel;
  bounds: Bounds;
  stage: Stage;
  pan: Pan;
  setHoverPixel: (value?: Pixel) => void;
  setBounds: (value: Bounds) => void;
  setStage: (value: Partial<Stage>) => void;
  setPan: (value: Pan) => void;
}

export const usePixelBoardStore = create<PixelBoardStore>((set) => ({
  hoverPixel: undefined,
  bounds: { minX: 0, minY: 0, maxX: 32, maxY: 32 },
  stage: { width: 32, height: 32, scale: 1 },
  pan: { x: 0, y: 0 },
  setHoverPixel: (value) => set({ hoverPixel: value }),
  setBounds: (value) => set({ bounds: value }),
  setStage: (value) =>
    set((state) => ({
      stage: {
        scale: value.scale || state.stage.scale,
        width: value.width || state.stage.width,
        height: value.height || state.stage.height,
      },
    })),
  setPan: (value) => set({ pan: value }),
}));
