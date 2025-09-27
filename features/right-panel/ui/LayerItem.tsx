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
      className={`relative flex items-center gap-2 overflow-hidden rounded border bg-gray-100 p-2 ${active ? 'border-gray-500 bg-blue-100' : 'border-gray-200'}`}
      onClick={() => setActiveLayer(layer.id)}
    >
      <div className="flex">
        {layer.visible ? (
          <Button
            size="small-icon"
            variant="ghost"
            className="cursor-pointer"
            onClick={() => toggleLayerVisibility(layer.id)}
          >
            <EyeIcon className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="small-icon"
            variant="ghost"
            className="cursor-pointer"
            onClick={() => toggleLayerVisibility(layer.id)}
          >
            <EyeOffIcon className="h-4 w-4" />
          </Button>
        )}
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
              className="h-4 w-full px-0.5 py-0.5 text-sm"
            />
          ) : (
            <span
              className="w-full cursor-pointer text-xs select-none"
              onDoubleClick={() => setIsEditing(true)}
            >
              {layer.name.length > 21
                ? layer.name.slice(0, 21) + '…'
                : layer.name}
            </span>
          )}
          <div className="flex">
            {layer.locked ? (
              <Button
                size="small-icon"
                variant="ghost"
                className="cursor-pointer"
                onClick={() => toggleLayerLock(layer.id)}
              >
                <LockIcon className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="small-icon"
                variant="ghost"
                className="cursor-pointer"
                onClick={() => toggleLayerLock(layer.id)}
              >
                <LockOpenIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
          <GripIcon {...listeners} className="ml-auto h-4 w-4 cursor-grab" />
        </div>
      </div>
    </div>
  );
};
