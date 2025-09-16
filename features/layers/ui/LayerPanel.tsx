'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Layer, useLayerStore } from '../model/layerStore';
import { Button } from '@/shared/ui/Button';
import {
  EyeIcon,
  EyeOffIcon,
  TrashIcon,
  CopyIcon,
  PlusIcon,
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
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { Input } from '@/shared/ui/Input';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { usePixelStore } from '@/features/pixel-board/model/pixelStore';

// Utility function to convert 32-bit integer color to hex string
const intToHex = (color: number): string => {
  if (color === 0) return 'transparent';
  return `#${(color >>> 0).toString(16).padStart(8, '0')}`;
};

interface LayerItemProps {
  id: string;
  layer: Layer;
  active: boolean;
  isDragging?: boolean;
}

const LayerItem: React.FC<LayerItemProps> = ({
  id,
  layer,
  active,
  isDragging,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  const { setActiveLayer, toggleVisibility, removeLayer, setLayerName } =
    useLayerStore();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(layer.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const handleRename = () => {
    setLayerName(layer.id, name.trim() || layer.name);
    setIsEditing(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pixelSize = 2;
    canvas.width = layer.width * pixelSize;
    canvas.height = layer.height * pixelSize;

    const checkerSize = pixelSize * 4;
    for (let y = 0; y < canvas.height; y += checkerSize) {
      for (let x = 0; x < canvas.width; x += checkerSize) {
        ctx.fillStyle =
          (x / checkerSize + y / checkerSize) % 2 === 0 ? '#fff' : '#ccc';
        ctx.fillRect(x, y, checkerSize, checkerSize);
      }
    }

    // Draw non-transparent pixels from Map
    for (const [key, color] of layer.pixels.entries()) {
      const [x, y] = key.split(',').map(Number);
      if (x >= 0 && x < layer.width && y >= 0 && y < layer.height) {
        ctx.fillStyle = intToHex(color);
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }
  }, [layer.pixels, layer.width, layer.height]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : 'auto',
  };

  const handleDuplicate = () => {
    useLayerStore
      .getState()
      .addLayer(layer.width, layer.height, `${layer.name} copy`);
    const newLayerId =
      useLayerStore.getState().layers[
        useLayerStore.getState().layers.length - 1
      ].id;
    useLayerStore.getState().setLayerPixels(
      newLayerId,
      Array.from(layer.pixels.entries()).map(([key, color]) => {
        const [x, y] = key.split(',').map(Number);
        return { x, y, color };
      })
    );
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`relative flex items-center overflow-hidden rounded border bg-gray-100 p-2 ${active ? 'border-blue-500 bg-blue-100' : 'border-gray-200'}`}
      onClick={() => setActiveLayer(layer.id)}
    >
      {/* Left: Preview */}
      <canvas
        ref={canvasRef}
        className="mr-2 h-12 w-12 border border-gray-300"
      />

      {/* Center: Name and buttons */}
      <div className="mr-2 flex flex-1 flex-col gap-1">
        {isEditing ? (
          <Input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') {
                setName(layer.name);
                setIsEditing(false);
              }
            }}
            className="h-6 w-full px-0.5 py-0.5"
          />
        ) : (
          <span
            className="w-full cursor-pointer select-none"
            onDoubleClick={() => setIsEditing(true)}
          >
            {layer.name}
          </span>
        )}

        <div className="mt-1 flex gap-2">
          {layer.visible ? (
            <EyeIcon
              className="h-4 w-4 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                toggleVisibility(layer.id);
              }}
            />
          ) : (
            <EyeOffIcon
              className="h-4 w-4 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                toggleVisibility(layer.id);
              }}
            />
          )}
          <CopyIcon
            className="h-4 w-4 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleDuplicate();
            }}
          />
          <TrashIcon
            className="h-4 w-4 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              removeLayer(layer.id);
            }}
          />
        </div>
      </div>

      <div
        {...listeners}
        className="absolute top-0 right-0 bottom-0 ml-auto w-2 cursor-grab"
        style={{
          backgroundImage: `radial-gradient(rgba(0,0,0,0.5) 1px, transparent 1px)`,
          backgroundSize: '3px 3px',
        }}
        title="Drag to reorder"
      />
    </div>
  );
};

export const LayerPanel: React.FC = () => {
  const { layers, activeLayerId, addLayer, moveLayer, removeLayer } =
    useLayerStore();
  const { BOARD_WIDTH, BOARD_HEIGHT } = usePixelStore();
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const layer = useMemo(
    () => layers.find((l) => l.id === activeLayerId),
    [layers, activeLayerId]
  );
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (over && active.id !== over.id) {
      const oldIndex = layers.findIndex((l) => l.id === active.id);
      const newIndex = layers.findIndex((l) => l.id === over.id);
      moveLayer(oldIndex, newIndex);
    }
  };

  const handleDuplicate = () => {
    if (!layer) return;
    useLayerStore
      .getState()
      .addLayer(layer.width, layer.height, `${layer.name} copy`);
    const newLayerId =
      useLayerStore.getState().layers[
        useLayerStore.getState().layers.length - 1
      ].id;
    useLayerStore.getState().setLayerPixels(
      newLayerId,
      Array.from(layer.pixels.entries()).map(([key, color]) => {
        const [x, y] = key.split(',').map(Number);
        return { x, y, color };
      })
    );
  };

  return (
    <div className="flex h-80 w-48 flex-col gap-4 border border-gray-300 bg-gray-50 p-2">
      <ScrollArea className="h-full">
        <div className="flex w-full flex-col gap-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToParentElement]}
          >
            <SortableContext
              items={layers.map((l) => l.id)}
              strategy={verticalListSortingStrategy}
            >
              {layers
                .slice()
                .reverse()
                .map((layer) => (
                  <LayerItem
                    key={layer.id}
                    id={layer.id}
                    layer={layer}
                    active={layer.id === activeLayerId}
                    isDragging={layer.id === activeDragId}
                  />
                ))}
            </SortableContext>
          </DndContext>
        </div>
      </ScrollArea>

      <div className="mt-auto flex justify-center gap-2">
        <Button
          onClick={() => addLayer(BOARD_WIDTH, BOARD_HEIGHT)}
          size="icon"
          variant="outline"
        >
          <PlusIcon />
        </Button>
        <Button onClick={() => handleDuplicate()} size="icon" variant="outline">
          <CopyIcon />
        </Button>
        <Button
          onClick={() => layer && removeLayer(layer.id)}
          size="icon"
          variant="outline"
          disabled={!layer}
        >
          <TrashIcon />
        </Button>
      </div>
    </div>
  );
};
