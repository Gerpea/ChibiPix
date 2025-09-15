'use client';

import React from 'react';
import { SketchPicker } from 'react-color';
import { Tool, useToolbarStore } from '../model/toolbarStore';
import { EraserIcon, PencilIcon, DropletIcon, Repeat2Icon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/Popover';
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/ToggleGroup';

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
      {/* Tool selection */}
      <ToggleGroup
        type="single"
        value={currentTool}
        onValueChange={(value: Tool) => setCurrentTool(value)}
        className="flex flex-col gap-2"
      >
        <ToggleGroupItem value="pencil" className="rounded border p-2">
          <PencilIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="fill" className="rounded border p-2">
          <DropletIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="eraser" className="rounded border p-2">
          <EraserIcon />
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Colors */}
      <div className="relative mt-auto flex flex-col items-center gap-2">
        <div className="relative flex gap-1">
          {/* Primary color */}
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
                    `rgba(${color.rgb.r},${color.rgb.g},${color.rgb.b},${color.rgb.a})`
                  )
                }
              />
            </PopoverContent>
          </Popover>

          {/* Secondary color */}
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
                    `rgba(${color.rgb.r},${color.rgb.g},${color.rgb.b},${color.rgb.a})`
                  )
                }
              />
            </PopoverContent>
          </Popover>

          {/* Swap button as small overlay */}
          <button
            onClick={swapColors}
            className="absolute -top-11/12 left-1/2 z-10 m-0 flex h-fit w-fit -translate-x-1/2 cursor-pointer items-center justify-center p-0"
            title="Swap colors"
          >
            <Repeat2Icon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
