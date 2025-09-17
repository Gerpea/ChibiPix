import { create } from 'zustand';

export type Tool = 'pencil' | 'fill' | 'eraser' | 'pan';

interface ToolSettings {
  pencil: { size: number };
  eraser: { size: number };
}

export interface ToolbarStore {
  primaryColor: string;
  secondaryColor: string;
  currentTool: Tool;
  toolSettings: ToolSettings;
  setPrimaryColor: (color: string) => void;
  setSecondaryColor: (color: string) => void;
  swapColors: () => void;
  setCurrentTool: (tool: Tool) => void;
  setToolSettings: (settings: Partial<ToolSettings>) => void;
}

export const useToolbarStore = create<ToolbarStore>((set) => ({
  primaryColor: '#000000',
  secondaryColor: '#ffffff',
  currentTool: 'pencil',
  toolSettings: {
    pencil: { size: 1 },
    eraser: { size: 1 },
  },
  setPrimaryColor: (color) => set({ primaryColor: color }),
  setSecondaryColor: (color) => set({ secondaryColor: color }),
  swapColors: () =>
    set((state) => ({
      primaryColor: state.secondaryColor,
      secondaryColor: state.primaryColor,
    })),
  setCurrentTool: (tool) => set({ currentTool: tool }),
  setToolSettings: (settings) =>
    set((state) => ({
      toolSettings: { ...state.toolSettings, ...settings },
    })),
}));
