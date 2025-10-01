'use client';

import React, { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { TrashIcon, CopyIcon, PlusIcon } from 'lucide-react';
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
} from '@dnd-kit/sortable';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { LayerItem } from './LayerItem';
import { useAnimationStore } from '@/features/animation/model/animationStore';

export const LayerPanel: React.FC = () => {
  const currentFrame = useAnimationStore(
    (state) => state.frames[state.currentFrameIndex]
  );
  const { addLayer, moveLayer, removeLayer, duplicateLayer } =
    useAnimationStore();

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor));

  if (!currentFrame) {
    return (
      <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-900">Layers</h3>
        <div className="mt-4 text-center text-xs text-gray-500">
          No frame selected.
        </div>
      </div>
    );
  }

  const { layers, activeLayerId } = currentFrame;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (over && active.id !== over.id) {
      const reversedLayers = [...layers].reverse();
      const oldIndex = reversedLayers.findIndex((l) => l.id === active.id);
      const newIndex = reversedLayers.findIndex((l) => l.id === over.id);

      const originalOldIndex = layers.length - 1 - oldIndex;
      const originalNewIndex = layers.length - 1 - newIndex;
      moveLayer(originalOldIndex, originalNewIndex);
    }
  };

  return (
    <div className="bg-background rounded-md border p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-foreground text-sm font-medium">Layers</h3>
      </div>
      <ScrollArea className="h-80 w-full pr-3">
        <div className="flex w-full flex-col gap-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToParentElement]}
          >
            <SortableContext
              items={
                currentFrame
                  ? currentFrame.layers.map((l) => l.id).reverse()
                  : []
              }
              strategy={verticalListSortingStrategy}
            >
              {currentFrame ? (
                currentFrame.layers
                  .slice()
                  .reverse()
                  .map((layer) => (
                    <LayerItem
                      key={layer.id}
                      id={layer.id}
                      layer={layer}
                      active={layer.id === currentFrame.activeLayerId}
                      isDragging={layer.id === activeDragId}
                    />
                  ))
              ) : (
                <div className="text-muted-foreground mt-4 text-center text-xs">
                  No frame selected.
                </div>
              )}
            </SortableContext>
          </DndContext>
        </div>
      </ScrollArea>
      {currentFrame && currentFrame.activeLayerId && (
        <div className="border-border mt-3 flex justify-center gap-2 border-t pt-2">
          <Button onClick={() => addLayer()} size="icon" variant="ghost">
            <PlusIcon className="h-3 w-3" />
          </Button>
          <Button
            onClick={() => {
              if (currentFrame.activeLayerId) {
                duplicateLayer(currentFrame.activeLayerId);
              }
            }}
            size="icon"
            variant="ghost"
          >
            <CopyIcon className="h-3 w-3" />
          </Button>
          <Button
            onClick={() => {
              if (currentFrame.activeLayerId) {
                removeLayer(currentFrame.activeLayerId);
              }
            }}
            size="icon"
            variant="ghost"
            disabled={currentFrame.layers.length <= 1}
          >
            <TrashIcon className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
};
