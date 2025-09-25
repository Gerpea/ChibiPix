'use client';

import React from 'react';
import { SketchPicker } from 'react-color';
import { Tool, useToolbarStore } from '../model/toolbarStore';
import {
  EraserIcon,
  PencilIcon,
  DropletIcon,
  Repeat2Icon,
  MoveIcon,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/Popover';
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/ToggleGroup';

const rgbaToHex = (r: number, g: number, b: number, a: number): string => {
  if (
    r < 0 ||
    r > 255 ||
    g < 0 ||
    g > 255 ||
    b < 0 ||
    b > 255 ||
    a < 0 ||
    a > 1
  ) {
    throw new Error('RGBA values out of range');
  }

  const rHex = r.toString(16).padStart(2, '0');
  const gHex = g.toString(16).padStart(2, '0');
  const bHex = b.toString(16).padStart(2, '0');
  const aHex = Math.round(a * 255)
    .toString(16)
    .padStart(2, '0');

  return `#${rHex}${gHex}${bHex}${aHex}`.toUpperCase();
};

export const Toolbar: React.FC = () => {
  const {
    primaryColor,
    secondaryColor,
    setPrimaryColor,
    setSecondaryColor,
    swapColors,
    currentTool,
    setCurrentTool,
  } = useToolbarStore();

  return (
    <div className="flex h-full flex-col items-center gap-4">
      <ToggleGroup
        type="single"
        value={currentTool}
        onValueChange={(value: Tool) => setCurrentTool(value)}
        className="flex flex-col gap-2"
      >
        <ToggleGroupItem value="pencil">
          <PencilIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="fill">
          <DropletIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="eraser">
          <EraserIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="pan">
          <MoveIcon />
        </ToggleGroupItem>
      </ToggleGroup>

      <div className="relative mt-auto flex flex-col items-center gap-2">
        <div className="relative flex gap-1">
          <Popover>
            <PopoverTrigger>
              <div
                className="relative h-4 w-4 cursor-pointer border border-gray-300"
                style={{ backgroundColor: primaryColor }}
              />
            </PopoverTrigger>
            <PopoverContent
              side="right"
              className="m-0 w-full bg-transparent p-0"
            >
              <SketchPicker
                color={primaryColor}
                onChange={(color) =>
                  setPrimaryColor(
                    rgbaToHex(
                      color.rgb.r,
                      color.rgb.g,
                      color.rgb.b,
                      color.rgb.a || 0
                    )
                  )
                }
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger>
              <div
                className="relative h-4 w-4 cursor-pointer border border-gray-300"
                style={{ backgroundColor: secondaryColor }}
              />
            </PopoverTrigger>
            <PopoverContent
              side="right"
              className="m-0 w-full bg-transparent p-0"
            >
              <SketchPicker
                color={secondaryColor}
                onChange={(color) =>
                  setSecondaryColor(
                    rgbaToHex(
                      color.rgb.r,
                      color.rgb.g,
                      color.rgb.b,
                      color.rgb.a || 0
                    )
                  )
                }
              />
            </PopoverContent>
          </Popover>

          <button
            onClick={swapColors}
            className="absolute -top-4 left-1/2 z-10 m-0 flex h-fit w-fit -translate-x-1/2 cursor-pointer items-center justify-center p-0"
            title="Swap colors"
          >
            <Repeat2Icon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
