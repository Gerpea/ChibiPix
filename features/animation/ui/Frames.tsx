import { useCallback, useState } from 'react';
import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  horizontalListSortingStrategy,
  SortableContext,
} from '@dnd-kit/sortable';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { FrameItem } from './FrameItem';
import { useAnimationStore } from '../model/animationStore';
import { PIXELS_PER_FRAME } from './const';

interface FramesProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

export const Frames: React.FC<FramesProps> = ({ scrollContainerRef }) => {
  const { frames, currentFrameIndex, fps, moveFrame } = useAnimationStore();

  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const tickDuration = 1000 / fps;
  const scale = PIXELS_PER_FRAME / tickDuration;

  const totalWidth = frames.reduce(
    (acc, frame) => acc + Math.max(PIXELS_PER_FRAME, frame.duration * scale),
    0
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setActiveDragId(event.active.id as string);
    },
    [setActiveDragId]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDragId(null);

      if (over && active.id !== over.id) {
        const oldIndex = frames.findIndex((f) => f.id === active.id);
        const newIndex = frames.findIndex((f) => f.id === over.id);
        moveFrame(oldIndex, newIndex);
      }
    },
    [setActiveDragId, moveFrame, frames]
  );

  return (
    <div
      className="flex flex-row whitespace-nowrap"
      style={{ width: `${totalWidth}px` }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToParentElement]}
      >
        <SortableContext
          items={frames.map((f) => ({
            id: f.id,
            width: Math.max(PIXELS_PER_FRAME, f.duration * scale),
          }))}
          strategy={horizontalListSortingStrategy}
        >
          {frames.map((frame, index) => (
            <FrameItem
              key={frame.id}
              id={frame.id}
              frame={frame}
              index={index}
              active={index === currentFrameIndex}
              isDragging={frame.id === activeDragId}
              scale={scale}
              tickDuration={tickDuration}
              scrollContainerRef={scrollContainerRef}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
};
