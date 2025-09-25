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
import { intToHex } from '@/shared/utils/colors';

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
    const padding = 4;
    const previewSize = 48;

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    if (layer.pixels.size > 0) {
      for (const key of layer.pixels.keys()) {
        const [x, y] = key.split(',').map(Number);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    } else {
      minX = 0;
      maxX = 0;
      minY = 0;
      maxY = 0;
    }

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

    for (const [key, color] of layer.pixels.entries()) {
      const [x, y] = key.split(',').map(Number);
      const adjustedX = (x - minX) * pixelSize;
      const adjustedY = (y - minY) * pixelSize;
      ctx.fillStyle = intToHex(color);
      ctx.fillRect(adjustedX, adjustedY, pixelSize, pixelSize);
    }

    ctx.restore();
  }, [layer.pixels]);

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

      <div className="relative">
        <canvas ref={canvasRef} className={`h-8 w-8 rounded-md`} />
      </div>

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
