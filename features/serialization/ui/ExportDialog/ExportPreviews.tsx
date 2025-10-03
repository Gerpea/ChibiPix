import { useEffect, useRef, useState } from 'react';
import { useAnimationStore } from '@/features/animation/model/animationStore';
import { ExportItem } from './ExportItem';
import { ScrollArea, ScrollBar } from '@/shared/ui/ScrollArea';

export const ExportPreviews: React.FC = () => {
  const { frames } = useAnimationStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const { height } = entries[0].contentRect;
      setContainerHeight(height);
    });

    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="h-full w-full">
      <ScrollArea className="w-full" style={{ height: containerHeight }}>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(64px,1fr))] gap-1 p-2">
          {frames.map((frame) => (
            <ExportItem key={frame.id} frame={frame} />
          ))}
        </div>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  );
};
