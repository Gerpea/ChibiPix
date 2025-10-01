'use client';

import React from 'react';
import { useToolbarStore } from '@/features/toolbar/model/toolbarStore';
import { Slider } from '@/shared/ui/Slider';

export const ToolSettings: React.FC = () => {
  const { currentTool, toolSettings, setToolSettings } = useToolbarStore();

  const handleSizeChange = (value: number[]) => {
    if (currentTool === 'pencil' || currentTool === 'eraser') {
      setToolSettings({ [currentTool]: { size: value[0] } });
    }
  };

  const handeOpacityChange = (value: number[]) => {
    if (
      currentTool === 'pencil' ||
      currentTool === 'eraser' ||
      currentTool === 'fill'
    ) {
      setToolSettings({ [currentTool]: { opacity: value[0] } });
    }
  };
  return (
    <div className="bg-background rounded-md border p-4 shadow-sm">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-foreground text-sm font-medium">Tool Settings</h3>
        </div>

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
                : [0]
            }
            onValueChange={handleSizeChange}
            className="w-full"
          />
        </div>

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
                : [0]
            }
            onValueChange={handeOpacityChange}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};
