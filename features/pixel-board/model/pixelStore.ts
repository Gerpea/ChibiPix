import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface PixelStore {
  BOARD_WIDTH: number;
  BOARD_HEIGHT: number;
  PIXEL_SIZE: number;
}

export const usePixelStore = create<PixelStore>()(
  devtools(
    (set) => ({
      BOARD_WIDTH: 16,
      BOARD_HEIGHT: 16,
      PIXEL_SIZE: 20,
    }),
    { name: 'PixelStore' }
  )
);
