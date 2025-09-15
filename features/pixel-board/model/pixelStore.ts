import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface PixelStore {
  BOARD_WIDTH: number;
  BOARD_HEIGHT: number;
  PIXEL_SIZE: number;
  pixels: string[][];
  setPixels: (pixels: string[][]) => void;
}

export const usePixelStore = create<PixelStore>()(
  devtools(
    (set) => ({
      BOARD_WIDTH: 16,
      BOARD_HEIGHT: 16,
      PIXEL_SIZE: 20,
      pixels: Array(16)
        .fill(null)
        .map(() => Array(16).fill('transparent')),
      setPixels: (pixels) => set({ pixels }),
    }),
    { name: 'PixelStore' }
  )
);
