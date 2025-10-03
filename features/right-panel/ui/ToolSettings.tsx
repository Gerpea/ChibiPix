'use client';

import React, { useRef, useEffect } from 'react';
import { ChromePicker } from 'react-color';
import { useToolbarStore } from '@/features/toolbar/model/toolbarStore';
import { Slider } from '@/shared/ui/Slider';
import { rgbaToHex } from '@/shared/utils/colors';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/Tooltip';

export const ToolSettings: React.FC = () => {
  const {
    currentTool,
    toolSettings,
    setToolSettings,
    primaryColor,
    setPrimaryColor,
    secondaryColor,
    setSecondaryColor,
  } = useToolbarStore();

  const mouseButtonRef = useRef<number | null>(null);

  const handleSizeChange = (value: number[]) => {
    if (currentTool === 'pencil' || currentTool === 'eraser') {
      setToolSettings({ [currentTool]: { size: value[0] } });
    }
  };

  const handleOpacityChange = (value: number[]) => {
    if (
      currentTool === 'pencil' ||
      currentTool === 'eraser' ||
      currentTool === 'fill'
    ) {
      setToolSettings({ [currentTool]: { opacity: value[0] } });
    }
  };

  const showColorPicker = currentTool === 'pencil' || currentTool === 'fill';

  useEffect(() => {
    const handleMouseUp = () => {
      mouseButtonRef.current = null;
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div className="bg-background rounded-md border p-4 shadow-sm">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-foreground text-sm font-medium">Tool Settings</h3>
        </div>

        {/* --- Size Slider --- */}
        <div className="flex w-full flex-col gap-2">
          <div className="flex w-full justify-between">
            <span className="text-sm">Size</span>
            {(currentTool === 'pencil' || currentTool === 'eraser') && (
              <span className="text-muted-foreground text-sm">
                {toolSettings[currentTool].size}px
              </span>
            )}
          </div>
          <Slider
            id="brush-size"
            min={1}
            max={20}
            step={1}
            disabled={!(currentTool === 'pencil' || currentTool === 'eraser')}
            value={
              currentTool === 'pencil' || currentTool === 'eraser'
                ? [toolSettings[currentTool].size]
                : [1]
            }
            onValueChange={handleSizeChange}
            className="w-full"
          />
        </div>

        {/* --- Opacity Slider --- */}
        <div className="flex w-full flex-col gap-2">
          <div className="flex w-full justify-between">
            <span className="text-sm">Opacity</span>
            {(currentTool === 'pencil' ||
              currentTool === 'eraser' ||
              currentTool === 'fill') && (
              <span className="text-muted-foreground text-sm">
                {toolSettings[currentTool].opacity}
              </span>
            )}
          </div>
          <Slider
            id="opacity"
            min={0}
            max={100}
            step={1}
            disabled={
              !(
                currentTool === 'pencil' ||
                currentTool === 'eraser' ||
                currentTool === 'fill'
              )
            }
            value={
              currentTool === 'pencil' ||
              currentTool === 'eraser' ||
              currentTool === 'fill'
                ? [toolSettings[currentTool].opacity]
                : [100]
            }
            onValueChange={handleOpacityChange}
            className="w-full"
          />
        </div>

        {/* --- Chrome Color Picker --- */}
        <div className="flex w-full flex-col gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm">Color</span>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Left-click for primary, Right-click for secondary</p>
            </TooltipContent>
          </Tooltip>
          <div
            className={`transition-opacity ${!showColorPicker ? 'pointer-events-none opacity-50' : ''}`}
            onMouseDownCapture={(e) => {
              mouseButtonRef.current = e.button;
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <ChromePicker
              color={
                mouseButtonRef.current === 2 ? secondaryColor : primaryColor
              }
              onChange={(color) => {
                const newColor = rgbaToHex(
                  color.rgb.r,
                  color.rgb.g,
                  color.rgb.b,
                  color.rgb.a ?? 1
                );

                if (mouseButtonRef.current === 2) {
                  // Right mouse button
                  setSecondaryColor(newColor);
                } else {
                  setPrimaryColor(newColor);
                }
              }}
              disableAlpha={false}
              styles={{
                default: {
                  picker: {
                    width: '100%',
                    boxShadow: 'none',
                    borderRadius: 'var(--radius)',
                  },
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
