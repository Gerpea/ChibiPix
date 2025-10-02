'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  EyeIcon,
  GripIcon,
  LockIcon,
  LockOpenIcon,
  EyeOffIcon,
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import {
  Layer,
  useAnimationStore,
} from '@/features/animation/model/animationStore';
import { LayerPreview } from './LayerPreview';

interface LayerItemProps {
  id: string;
  layer: Layer;
  active: boolean;
  isDragging?: boolean;
}

export const LayerItem: React.FC<LayerItemProps> = ({
  id,
  layer,
  active,
  isDragging,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const {
    setActiveLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    setLayerName,
  } = useAnimationStore();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(layer.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const handleRename = () => {
    setLayerName(layer.id, name.trim() || layer.name);
    setIsEditing(false);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`bg-muted relative flex items-center gap-2 overflow-hidden rounded border p-2 ${active ? 'border-primary' : 'border-border'}`}
      onClick={() => setActiveLayer(layer.id)}
    >
      <div className="flex">
        <Button
          size="small-icon"
          variant="ghost"
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            toggleLayerVisibility(layer.id);
          }}
        >
          {layer.visible ? (
            <EyeIcon className="h-4 w-4" />
          ) : (
            <EyeOffIcon className="h-4 w-4" />
          )}
        </Button>
      </div>

      <LayerPreview layer={layer} />

      <div className="mr-2 flex w-full">
        <div className="flex w-full items-center gap-2">
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
              className="h-4 w-full bg-transparent px-0.5 py-0.5 text-sm"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              title={layer.name}
              className="w-full cursor-pointer text-xs select-none"
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
            >
              {layer.name.length > 17
                ? layer.name.slice(0, 17) + '…'
                : layer.name}
            </span>
          )}
          <div className="flex">
            <Button
              size="small-icon"
              variant="ghost"
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                toggleLayerLock(layer.id);
              }}
            >
              {layer.locked ? (
                <LockIcon className="h-4 w-4" />
              ) : (
                <LockOpenIcon className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div
            {...listeners}
            className="ml-auto cursor-grab"
            onClick={(e) => e.stopPropagation()}
          >
            <GripIcon className="text-muted-foreground h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
