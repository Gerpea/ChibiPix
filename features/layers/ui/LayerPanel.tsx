'use client';

import React, { useMemo, useState } from 'react';
import { useLayerStore } from '../model/layerStore';
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

export const LayerPanel: React.FC = () => {
  const { layers, activeLayerId, addLayer, moveLayer, removeLayer } =
    useLayerStore();
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
    useLayerStore.getState().addLayer(`${layer.name} copy`);
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
    <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Layers</h3>
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
      {layer && (
        <div className="mt-3 flex justify-center gap-2 border-t border-gray-200 pt-2">
          <Button onClick={() => addLayer()} size="icon" variant="ghost">
            <PlusIcon className="h-3 w-3" />
          </Button>
          <Button onClick={() => handleDuplicate()} size="icon" variant="ghost">
            <CopyIcon className="h-3 w-3" />
          </Button>
          <Button
            onClick={() => removeLayer(layer.id)}
            size="icon"
            variant="ghost"
          >
            <TrashIcon className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
};
