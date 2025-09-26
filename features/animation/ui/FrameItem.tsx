import { useEffect, useMemo, useRef, useState } from 'react';
import { GripHorizontalIcon } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { intToHex } from '@/shared/utils/colors';
import { Layer, useAnimationStore } from '../model/animationStore';

interface FrameItemProps {
  id: string;
  frame: { id: string; name: string; layers: Layer[]; duration: number };
  index: number;
  active: boolean;
  isDragging?: boolean;
  scale: number;
  tickDuration: number;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [localDuration, setLocalDuration] = useState(frame.duration);

  useEffect(() => {
    const delta = 0;
    const candidateDuration = frame.duration + delta / scale;
    const numTicks = Math.max(1, Math.round(candidateDuration / tickDuration));
    const newDuration = numTicks * tickDuration;
    setLocalDuration(newDuration);
  }, [frame.duration]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const previewSize = 48;
    const pixelSize = 2;
    const padding = 4;

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    frame.layers.forEach((layer) => {
      if (!layer.visible) return;
      if (layer.pixels.size > 0) {
        for (const key of layer.pixels.keys()) {
          const [x, y] = key.split(',').map(Number);
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    });

    const effectiveWidth = Math.max(1, maxX - minX + 1);
    const effectiveHeight = Math.max(1, maxY - minY + 1);
    canvas.width = previewSize;
    canvas.height = previewSize;

    const contentWidth = effectiveWidth * pixelSize;
    const contentHeight = effectiveHeight * pixelSize;
    const scaleFactor = Math.min(
      (previewSize - 2 * padding) / contentWidth,
      (previewSize - 2 * padding) / contentHeight
    );
    const scaledWidth = contentWidth * scaleFactor;
    const scaledHeight = contentHeight * scaleFactor;
    const offsetX = (previewSize - scaledWidth) / 2;
    const offsetY = (previewSize - scaledHeight) / 2;

    const checkerSize = pixelSize * 4;
    for (let y = 0; y < canvas.height; y += checkerSize) {
      for (let x = 0; x < canvas.width; x += checkerSize) {
        ctx.fillStyle =
          (Math.floor(x / checkerSize) + Math.floor(y / checkerSize)) % 2 === 0
            ? '#fff'
            : '#ccc';
        ctx.fillRect(x, y, checkerSize, checkerSize);
      }
    }

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scaleFactor, scaleFactor);

    frame.layers.forEach((layer) => {
      if (!layer.visible) return;
      for (const [key, color] of layer.pixels.entries()) {
        const [x, y] = key.split(',').map(Number);
        const adjustedX = (x - minX) * pixelSize;
        const adjustedY = (y - minY) * pixelSize;
        ctx.fillStyle = intToHex(color);
        ctx.fillRect(adjustedX, adjustedY, pixelSize + 0.1, pixelSize + 0.1);
      }
    });

    ctx.restore();
  }, [frame.layers]);

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
      className={`relative flex items-start rounded-md rounded-t-none border bg-gray-100 p-2 ${active ? 'border-gray-500 bg-blue-100' : 'border-gray-200'} overflow-hidden`}
    >
      <div className="flex flex-col items-center gap-2">
        <GripHorizontalIcon {...listeners} className="h-4 w-4 cursor-grab" />
        <div className="flex flex-col items-center gap-1">
          <canvas ref={canvasRef} className="h-6 w-6 rounded-md" />
        </div>
      </div>
      <div
        className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize bg-gray-500/30 hover:bg-gray-500"
        onMouseDown={handleResizeStart}
      />
    </div>
  );
};
