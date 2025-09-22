'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAnimationStore } from '../model/animationStore';
import { intToHex } from '@/shared/utils/colors';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import {
  PlayIcon,
  PauseIcon,
  PlusIcon,
  TrashIcon,
  CopyIcon,
  GripIcon,
  SquareIcon,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type Layer } from '@/features/layers/model/layerStore';

interface FrameItemProps {
  id: string;
  frame: { id: string; name: string; layers: Layer[]; duration: number };
  index: number;
  active: boolean;
  isDragging?: boolean;
}

const FrameItem: React.FC<FrameItemProps> = ({
  id,
  frame,
  index,
  active,
  isDragging,
}) => {
  const { listeners, setNodeRef, transform, transition } = useSortable({ id });
  const { setCurrentFrame, setFrameDuration, removeFrame } =
    useAnimationStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [duration, setDuration] = useState(frame.duration.toString());

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
    const scale = Math.min(
      (previewSize - 2 * padding) / contentWidth,
      (previewSize - 2 * padding) / contentHeight
    );
    const scaledWidth = contentWidth * scale;
    const scaledHeight = contentHeight * scale;
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
    ctx.scale(scale, scale);

    frame.layers.forEach((layer) => {
      if (!layer.visible) return;
      for (const [key, color] of layer.pixels.entries()) {
        const [x, y] = key.split(',').map(Number);
        const adjustedX = (x - minX) * pixelSize;
        const adjustedY = (y - minY) * pixelSize;
        ctx.fillStyle = intToHex(color);
        ctx.fillRect(adjustedX, adjustedY, pixelSize, pixelSize);
      }
    });

    ctx.restore();
  }, [frame.layers]);

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDuration(value);
    const numValue = Number(value);
    if (!isNaN(numValue) && numValue >= 1) {
      setFrameDuration(index, numValue);
    }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : 'auto',
    boxShadow: isDragging ? '0 4px 8px rgba(0, 0, 0, 0.2)' : 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative inline-flex flex-col items-center gap-2 rounded border bg-gray-100 p-2 ${active ? 'border-gray-500 bg-blue-100' : 'border-gray-200'}`}
    >
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="h-8 w-8 rounded-md"
          onClick={() => setCurrentFrame(index)}
        />
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-xs select-none">
          {frame.name.length > 10 ? frame.name.slice(0, 10) + '…' : frame.name}
        </span>
        <Input
          value={duration}
          onChange={handleDurationChange}
          className="h-4 w-12 px-0.5 py-0.5 text-sm"
          type="number"
          min="1"
        />
        <div className="flex gap-2">
          <Button
            onClick={() => removeFrame(index)}
            size="small-icon"
            variant="ghost"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
          <GripIcon {...listeners} className="h-4 w-4 cursor-grab" />
        </div>
      </div>
    </div>
  );
};

export const AnimationPanel: React.FC = () => {
  const {
    frames,
    currentFrameIndex,
    fps,
    isPlaying,
    addFrame,
    setFps,
    play,
    pause,
    stop,
    moveFrame,
  } = useAnimationStore();
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (over && active.id !== over.id) {
      const oldIndex = frames.findIndex((f) => f.id === active.id);
      const newIndex = frames.findIndex((f) => f.id === over.id);
      moveFrame(oldIndex, newIndex);
    }
  };

  const handleDuplicate = () => {
    addFrame(true);
  };

  return (
    <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">
          Animation Timeline
        </h3>
        <div className="flex gap-2">
          <Button onClick={() => addFrame(true)} size="icon" variant="ghost">
            <PlusIcon className="h-3 w-3" />
          </Button>
          <Button onClick={handleDuplicate} size="icon" variant="ghost">
            <CopyIcon className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <ScrollArea
        className="w-full"
        style={{ maxWidth: '100%', overflowX: 'auto' }}
      >
        <div className="flex flex-row gap-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToParentElement]}
          >
            <SortableContext
              items={frames.map((f) => f.id)}
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
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </ScrollArea>
      <div className="mt-3 flex justify-center gap-2 border-t border-gray-200 pt-2">
        <Button onClick={play} disabled={isPlaying} size="icon" variant="ghost">
          <PlayIcon className="h-3 w-3" />
        </Button>
        <Button
          onClick={pause}
          disabled={!isPlaying}
          size="icon"
          variant="ghost"
        >
          <PauseIcon className="h-3 w-3" />
        </Button>
        <Button onClick={stop} size="icon" variant="ghost">
          <SquareIcon className="h-3 w-3" />
        </Button>
        <Input
          type="number"
          value={fps}
          onChange={(e) => setFps(Number(e.target.value))}
          className="h-4 w-12 px-0.5 py-0.5 text-sm"
          min="1"
        />
      </div>
    </div>
  );
};
