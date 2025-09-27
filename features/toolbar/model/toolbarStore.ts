import { create } from 'zustand';

export type Tool = 'pencil' | 'fill' | 'eraser' | 'pan';

export interface ToolSettings {
  pencil: { size: number; opacity: number };
  eraser: { size: number; opacity: number };
  fill: { opacity: number };
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
    pencil: { size: 1, opacity: 100 },
    eraser: { size: 1, opacity: 100 },
    fill: { opacity: 100 },
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
      toolSettings: {
        pencil: {
          ...state.toolSettings.pencil,
          ...(settings.pencil || {}),
        },
        eraser: {
          ...state.toolSettings.eraser,
          ...(settings.eraser || {}),
        },
        fill: {
          ...state.toolSettings.fill,
          ...(settings.fill || {}),
        },
      },
    })),
}));
