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
  ZoomInIcon,
  SquareDashedIcon,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/Popover';
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/ToggleGroup';
import { rgbaToHex } from '@/shared/utils/colors';

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
        unselectable="off"
      >
        <ToggleGroupItem value="pencil" title="Pencil (P)">
          <PencilIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="fill" title="Fill (F)">
          <DropletIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="eraser" title="Eraser (E)">
          <EraserIcon />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="selection-rectangle"
          title="Selection Rectangle (S)"
        >
          <SquareDashedIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="pan" title="Pan (H)">
          <MoveIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="zoom" title="Zoom (Z)">
          <ZoomInIcon />
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
            title="Swap colors (X)"
          >
            <Repeat2Icon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
