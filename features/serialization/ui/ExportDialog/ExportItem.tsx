import { Layer } from '@/features/animation/model/animationStore';
import { useCallback, useMemo } from 'react';
import { ExportPreview } from './ExportPreview';
import { SquareCheckIcon, SquareIcon } from 'lucide-react';
import { useExportContext } from '../../model/ExportContext';

interface FrameItemProps {
  frame: { id: string; name: string; layers: Layer[]; duration: number };
}

export const ExportItem: React.FC<FrameItemProps> = ({ frame }) => {
  const { padding, toggleFrame, isFrameSelected, selectedFrames } =
    useExportContext();
  const handleToggle = useCallback(() => {
    toggleFrame(frame.id);
  }, [frame]);

  const isSelected = useMemo(
    () => isFrameSelected(frame.id),
    [frame, selectedFrames, isFrameSelected]
  );

  return (
    <div
      onClick={handleToggle}
      className={`group bg-background hover:border-primary relative flex h-16 w-16 cursor-pointer overflow-hidden rounded-sm border transition-colors`}
    >
      <ExportPreview frame={frame} padding={padding} />
      {isSelected ? (
        <SquareCheckIcon className="fill-primary text-primary-foreground absolute top-1 right-1 h-4 w-4" />
      ) : (
        <SquareIcon className="text-muted-foreground group-hover:text-foreground absolute top-1 right-1 h-4 w-4" />
      )}
    </div>
  );
};
