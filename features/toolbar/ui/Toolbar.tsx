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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/Tooltip';

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
    <div className="bg-background flex h-full flex-col items-center gap-4 rounded-md border p-2 shadow-sm">
      <ToggleGroup
        type="single"
        value={currentTool}
        onValueChange={(value: Tool) => value && setCurrentTool(value)}
        className="flex flex-col gap-2"
      >
        <Tooltip>
          <TooltipTrigger>
            <ToggleGroupItem value="pencil">
              <PencilIcon className="h-4 w-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Pencil (P)</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger>
            <ToggleGroupItem value="fill">
              <DropletIcon className="h-4 w-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Fill (F)</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger>
            <ToggleGroupItem value="eraser" data-testid="eraser-tool">
              <EraserIcon className="h-4 w-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Eraser (E)</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger>
            <ToggleGroupItem value="selection-rectangle">
              <SquareDashedIcon className="h-4 w-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Selection Rectangle (S)</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger>
            <ToggleGroupItem value="pan">
              <MoveIcon className="h-4 w-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Pan (H)</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger>
            <ToggleGroupItem value="zoom">
              <ZoomInIcon className="h-4 w-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Zoom (Z)</p>
          </TooltipContent>
        </Tooltip>
      </ToggleGroup>

      <div className="relative mt-auto flex flex-col items-center gap-2">
        <div className="relative flex flex-col items-center justify-center gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <div
                className="border-border relative h-6 w-6 cursor-pointer rounded-sm border-2"
                data-testid="primary-color-trigger"
                style={{ backgroundColor: primaryColor }}
              />
            </PopoverTrigger>
            <PopoverContent side="right" className="w-auto border-none p-0">
              <SketchPicker
                color={primaryColor}
                onChange={(color) =>
                  setPrimaryColor(
                    rgbaToHex(
                      color.rgb.r,
                      color.rgb.g,
                      color.rgb.b,
                      color.rgb.a ?? 1
                    )
                  )
                }
              />
            </PopoverContent>
          </Popover>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={swapColors}
                className="text-foreground flex h-fit w-fit cursor-pointer items-center justify-center p-0"
              >
                <Repeat2Icon className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Swap colors (X)</p>
            </TooltipContent>
          </Tooltip>

          <Popover>
            <PopoverTrigger asChild>
              <div
                className="border-border relative h-6 w-6 cursor-pointer rounded-sm border-2"
                style={{ backgroundColor: secondaryColor }}
              />
            </PopoverTrigger>
            <PopoverContent side="right" className="w-auto border-none p-0">
              <SketchPicker
                color={secondaryColor}
                onChange={(color) =>
                  setSecondaryColor(
                    rgbaToHex(
                      color.rgb.r,
                      color.rgb.g,
                      color.rgb.b,
                      color.rgb.a ?? 1
                    )
                  )
                }
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};
