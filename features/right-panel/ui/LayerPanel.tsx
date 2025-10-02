'use client';

import React, { useEffect, useRef, useState } from 'react';
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

  const panelRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const scrollWrapperRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateHeight = () => {
      if (!panelRef.current || !headerRef.current || !scrollWrapperRef.current)
        return;

      const panelStyle = window.getComputedStyle(panelRef.current);
      const paddingTop = parseFloat(panelStyle.paddingTop);
      const paddingBottom = parseFloat(panelStyle.paddingBottom);
      const borderTop = parseFloat(panelStyle.borderTopWidth);
      const borderBottom = parseFloat(panelStyle.borderBottomWidth);

      const headerStyle = window.getComputedStyle(headerRef.current);
      const headerHeight = headerRef.current.getBoundingClientRect().height;
      const headerMarginBottom = parseFloat(headerStyle.marginBottom);

      let footerHeight = 0;
      let footerMarginTop = 0;
      let footerPaddingTop = 0;
      let footerBorderTop = 0;
      if (footerRef.current) {
        const footerStyle = window.getComputedStyle(footerRef.current);
        footerHeight = footerRef.current.getBoundingClientRect().height;
        footerMarginTop = parseFloat(footerStyle.marginTop);
        footerPaddingTop = parseFloat(footerStyle.paddingTop);
        footerBorderTop = parseFloat(footerStyle.borderTopWidth);
      }

      const nonScrollHeight =
        paddingTop +
        paddingBottom +
        borderTop +
        borderBottom +
        headerHeight +
        headerMarginBottom +
        footerHeight +
        footerMarginTop +
        footerPaddingTop +
        footerBorderTop;

      const panelHeight = panelRef.current.getBoundingClientRect().height;
      const scrollHeight = panelHeight - nonScrollHeight;

      scrollWrapperRef.current.style.height = `${scrollHeight}px`;
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);

    const observer = new ResizeObserver(updateHeight);
    if (panelRef.current) observer.observe(panelRef.current);

    return () => {
      window.removeEventListener('resize', updateHeight);
      observer.disconnect();
    };
  }, [currentFrame?.activeLayerId]);

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

  const { layers } = currentFrame;

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
    <div
      ref={panelRef}
      className="bg-background flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border p-4 shadow-sm"
    >
      <div
        ref={headerRef}
        className="mb-4 flex shrink-0 items-center justify-between"
      >
        <h3 className="text-foreground text-sm font-medium">Layers</h3>
      </div>
      <div ref={scrollWrapperRef} className="min-h-0">
        <ScrollArea className="h-full w-full pr-3">
          <div className="flex w-full flex-col gap-2">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToParentElement]}
            >
              <SortableContext
                items={currentFrame.layers.map((l) => l.id).reverse()}
                strategy={verticalListSortingStrategy}
              >
                {currentFrame.layers
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
                  ))}
              </SortableContext>
            </DndContext>
          </div>
        </ScrollArea>
      </div>
      {currentFrame.activeLayerId && (
        <div
          ref={footerRef}
          className="border-border mt-3 flex shrink-0 justify-center gap-2 border-t pt-2"
        >
          <Button onClick={() => addLayer()} size="icon" variant="ghost">
            <PlusIcon className="h-3 w-3" />
          </Button>
          <Button
            onClick={() => duplicateLayer(currentFrame.activeLayerId)}
            size="icon"
            variant="ghost"
          >
            <CopyIcon className="h-3 w-3" />
          </Button>
          <Button
            onClick={() => removeLayer(currentFrame.activeLayerId)}
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
