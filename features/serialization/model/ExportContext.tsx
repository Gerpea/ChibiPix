import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
} from 'react';

interface Frame {
  id: string;
}

interface ExportState {
  padding: number;
  setPadding: (padding: number) => void;
  selectedFrames: Map<string, boolean>;
  setSelectedFrames: (frames: Map<string, boolean>) => void;
  toggleFrame: (id: string) => void;
  isFrameSelected: (id: string) => boolean;
}

const ExportContext = createContext<ExportState | undefined>(undefined);

interface ExportProviderProps {
  frames?: Frame[];
  children: React.ReactNode;
}

export const ExportProvider: React.FC<ExportProviderProps> = ({
  frames = [],
  children,
}) => {
  const [padding, setPadding] = useState(0);

  const [selectedFrames, setSelectedFrames] = useState<Map<string, boolean>>(
    () => new Map(frames.map((frame) => [frame.id, true]))
  );

  const toggleFrame = useCallback((id: string) => {
    setSelectedFrames((prev) => {
      const newMap = new Map(prev);
      if (newMap.has(id)) {
        newMap.delete(id);
      } else {
        newMap.set(id, true);
      }
      return newMap;
    });
  }, []);

  const isFrameSelected = useCallback(
    (id: string) => selectedFrames.has(id),
    [selectedFrames]
  );

  const value = useMemo<ExportState>(
    () => ({
      padding,
      setPadding,
      selectedFrames,
      setSelectedFrames,
      toggleFrame,
      isFrameSelected,
    }),
    [padding, selectedFrames, toggleFrame, isFrameSelected]
  );

  return (
    <ExportContext.Provider value={value}>{children}</ExportContext.Provider>
  );
};

export const useExportContext = () => {
  const ctx = useContext(ExportContext);
  if (!ctx)
    throw new Error('useExportContext must be used inside ExportProvider');
  return ctx;
};
