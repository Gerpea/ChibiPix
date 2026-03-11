'use client';

import React from 'react';
import { LayerPanel } from './LayerPanel';
import { ToolSettings } from './ToolSettings';

export const RightPanel: React.FC = () => {
  return (
    <div className="flex h-full flex-col gap-4">
      <ToolSettings />
      <LayerPanel />
    </div>
  );
};
