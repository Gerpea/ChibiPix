import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface PixelStore {
  PIXEL_SIZE: number;
}

export const usePixelStore = create<PixelStore>()(
  devtools(
    (set) => ({
      PIXEL_SIZE: 20,
    }),
    { name: 'PixelStore' }
  )
);
