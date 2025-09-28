import { useEffect, useRef, useState } from 'react';
import { useAnimationStore } from '@/features/animation/model/animationStore';
import { ExportItem } from './ExportItem';
import { ScrollArea, ScrollBar } from '@/shared/ui/ScrollArea';

export const ExportPreviews: React.FC = () => {
  const { frames } = useAnimationStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setContainerWidth(width);
    });

    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="h-fit w-full">
      <ScrollArea className="h-fit" style={{ width: containerWidth }}>
        <div className="mb-3 flex flex-row gap-2 whitespace-nowrap">
          {frames.map((frame) => (
            <ExportItem key={frame.id} frame={frame} />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
