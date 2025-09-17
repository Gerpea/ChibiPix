'use client';

import React from 'react';
import { useToolbarStore, Tool } from '@/features/toolbar/model/toolbarStore';
import { Slider } from '@/shared/ui/Slider';

export const ToolSettings: React.FC = () => {
  const { currentTool, toolSettings, setToolSettings } = useToolbarStore();

  const handleSizeChange = (value: number[]) => {
    if (currentTool === 'pencil' || currentTool === 'eraser') {
      setToolSettings({ [currentTool]: { size: value[0] } });
    }
  };

  return (
    (currentTool === 'pencil' || currentTool === 'eraser') && (
      <div className="w-full space-y-2">
        <Slider
          id="brush-size"
          min={1}
          max={20}
          step={1}
          value={[toolSettings[currentTool].size]}
          onValueChange={handleSizeChange}
          className="w-full"
        />
        <span className="text-sm text-gray-500">
          {toolSettings[currentTool].size}px
        </span>
      </div>
    )
  );
};
