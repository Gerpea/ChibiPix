import { create } from 'zustand';

export type Tool = 'pencil' | 'fill' | 'eraser' | 'pan';

export interface ToolbarStore {
  primaryColor: string;
  secondaryColor: string;
  currentTool: Tool;
  setPrimaryColor: (color: string) => void;
  setSecondaryColor: (color: string) => void;
  swapColors: () => void;
  setCurrentTool: (tool: Tool) => void;
}

export const useToolbarStore = create<ToolbarStore>((set) => ({
  primaryColor: '#000000',
  secondaryColor: '#ffffff',
  currentTool: 'pencil',
  setPrimaryColor: (color) => set({ primaryColor: color }),
  setSecondaryColor: (color) => set({ secondaryColor: color }),
  swapColors: () =>
    set((state) => ({
      primaryColor: state.secondaryColor,
      secondaryColor: state.primaryColor,
    })),
  setCurrentTool: (tool) => set({ currentTool: tool }),
}));
