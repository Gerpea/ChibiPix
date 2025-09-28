import { Layer } from '@/features/animation/model/animationStore';
import { useCallback, useMemo } from 'react';
import { ExportPreview } from './ExportPreview';
import { useExportStore } from '../../model/exportStore';
import { Checkbox } from '@/shared/ui/Checkbox';
import {
  CheckCircle,
  CheckIcon,
  SquareCheck,
  SquareCheckIcon,
  SquareIcon,
} from 'lucide-react';

interface FrameItemProps {
  frame: { id: string; name: string; layers: Layer[]; duration: number };
}

export const ExportItem: React.FC<FrameItemProps> = ({ frame }) => {
  const { padding, toggleFrame, isFrameSelected, selectedFrames } =
    useExportStore();
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
      className={`relative flex h-16 w-16 cursor-pointer overflow-hidden rounded-sm border bg-transparent`}
    >
      <ExportPreview frame={frame} padding={padding} />
      {isSelected ? (
        <SquareCheckIcon className="absolute top-0 right-0 h-4 w-4" />
      ) : (
        <SquareIcon className="absolute top-0 right-0 h-4 w-4" />
      )}
    </div>
  );
};
