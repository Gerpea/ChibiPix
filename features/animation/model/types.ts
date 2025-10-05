import { ExportProgress, ImportProgress } from '@/features/serialization/utils';

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  pixels: Map<string, number>;
}

export interface Frame {
  id: string;
  name: string;
  layers: Layer[];
  activeLayerId: string;
  duration: number;
}

export interface Pixel {
  x: number;
  y: number;
  color: number;
}

export interface AnimationState {
  frames: Frame[];
  currentFrameIndex: number;
  fps: number;
  isPlaying: boolean;
  isImporting: boolean;
  timer: number | null;
  currentTime: number;

  addFrame: (duplicateCurrent?: boolean) => void;
  removeFrame: (index: number) => void;
  moveFrame: (fromIndex: number, toIndex: number) => void;
  setCurrentFrame: (index: number) => void;
  setFps: (fps: number) => void;
  setFrameDuration: (index: number, duration: number) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  setCurrentTime: (time: number) => void;

  addLayer: (name?: string) => void;
  removeLayer: (id: string) => void;
  duplicateLayer: (layerId: string) => void;
  setActiveLayer: (id: string) => void;
  setLayerPixels: (layerId: string, pixels: Pixel[], force?: boolean) => void;
  toggleLayerVisibility: (id: string) => void;
  toggleLayerLock: (id: string) => void;
  setLayerLock: (id: string, locked: boolean) => void;
  moveLayer: (fromIndex: number, toIndex: number) => void;
  setLayerName: (id: string, name: string) => void;

  exportAnimationData: (
    onProgress: (progress: ExportProgress) => void
  ) => Promise<string>;
  importAnimationData: (
    data: string,
    onProgress: (progress: ImportProgress) => void
  ) => Promise<void>;
}

export interface PersistedState {
  frames: Frame[];
  fps: number;
}
