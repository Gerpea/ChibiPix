import { create } from 'zustand';

interface ExportState {
  padding: number;
  setPadding: (padding: number) => void;
  selectedFrames: Map<string, boolean>;
  setSelectedFrames: (frames: Map<string, boolean>) => void;
  toggleFrame: (id: string) => void;
  isFrameSelected: (id: string) => boolean;
}

export const useExportStore = create<ExportState>((set, get) => ({
  padding: 0,
  setPadding: (padding) => set({ padding }),
  selectedFrames: new Map<string, boolean>(),
  setSelectedFrames: (frames) => {
    set({ selectedFrames: frames });
  },
  toggleFrame: (id) => {
    const currentMap = get().selectedFrames;
    const newMap = new Map(currentMap);
    if (newMap.has(id)) {
      newMap.delete(id);
    } else {
      newMap.set(id, true);
    }
    set({ selectedFrames: newMap });
  },
  isFrameSelected: (id) => get().selectedFrames.has(id),
}));
