import { useEffect, useMemo, useState } from 'react';
import { GripHorizontalIcon } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { Layer, useAnimationStore } from '../model/animationStore';
import { FramePreview } from './FramePreview';

interface FrameItemProps {
  id: string;
  frame: { id: string; name: string; layers: Layer[]; duration: number };
  index: number;
  active: boolean;
  isDragging?: boolean;
  scale: number;
  tickDuration: number;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

export const FrameItem: React.FC<FrameItemProps> = ({
  id,
  frame,
  index,
  active,
  isDragging,
  scale,
  tickDuration,
  scrollContainerRef,
}) => {
  const { listeners, setNodeRef, transform, transition } = useSortable({ id });
  const { setCurrentFrame, setFrameDuration, setCurrentTime, frames } =
    useAnimationStore();
  const [localDuration, setLocalDuration] = useState(frame.duration);

  useEffect(() => {
    const delta = 0;
    const candidateDuration = frame.duration + delta / scale;
    const numTicks = Math.max(1, Math.round(candidateDuration / tickDuration));
    const newDuration = numTicks * tickDuration;
    setLocalDuration(newDuration);
  }, [frame.duration]);

  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.pageX;
    const startDuration = localDuration;
    const scrollContainer = scrollContainerRef.current;

    const onPointerMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.pageX - startX;
      const candidateDuration = startDuration + delta / scale;
      const numTicks = Math.max(
        1,
        Math.round(candidateDuration / tickDuration)
      );
      const newDuration = numTicks * tickDuration;
      setLocalDuration(newDuration);
      setFrameDuration(index, newDuration);

      if (scrollContainer) {
        const rect = scrollContainer.getBoundingClientRect();
        const mouseX = moveEvent.clientX;
        const threshold = 50;
        const maxScrollSpeed = 20;

        if (mouseX > rect.right - threshold) {
          const distance = mouseX - (rect.right - threshold);
          const scrollAmount = Math.min(
            maxScrollSpeed,
            (distance / threshold) * maxScrollSpeed
          );
          scrollContainer.scrollLeft += scrollAmount;
        } else if (mouseX < rect.left + threshold && delta < 0) {
          const distance = rect.left + threshold - mouseX;
          const scrollAmount = Math.min(
            maxScrollSpeed,
            (distance / threshold) * maxScrollSpeed
          );
          scrollContainer.scrollLeft -= scrollAmount;
        }
      }
    };

    const onPointerUp = () => {
      document.removeEventListener('mousemove', onPointerMove);
      document.removeEventListener('mouseup', onPointerUp);
    };

    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('mouseup', onPointerUp);
  };

  const minWidth = useMemo(() => tickDuration * scale, [tickDuration, scale]);
  const width = useMemo(() => localDuration * scale, [localDuration, scale]);

  const style = useMemo(
    () => ({
      transform: transform
        ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
        : undefined,
      transition: isDragging ? undefined : transition,
      zIndex: isDragging ? 999 : 'auto',
      boxShadow: isDragging ? '0 4px 8px rgba(0, 0, 0, 0.2)' : 'none',
      width: `${width}px`,
      minWidth: `${minWidth}px`,
      flexShrink: 0,
    }),
    [width, minWidth, transform]
  );

  const handleSelect = () => {
    setCurrentFrame(index);
    setCurrentTime(
      frames.slice(0, index).reduce((acc, f) => acc + f.duration, 0)
    );
  };

  return (
    <div
      ref={setNodeRef}
      onClick={handleSelect}
      style={style}
      className={`relative flex items-start rounded-md rounded-t-none border bg-gray-100 p-2 ${active ? 'border-gray-500' : 'border-gray-200'} overflow-hidden`}
    >
      <div className="flex flex-col items-center gap-2">
        <GripHorizontalIcon {...listeners} className="h-4 w-4 cursor-grab" />
        <FramePreview frame={frame} />
      </div>
      <div
        className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize bg-gray-500/30 hover:bg-gray-500"
        onMouseDown={handleResizeStart}
      />
    </div>
  );
};
