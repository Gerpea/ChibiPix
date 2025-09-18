'use client';

import React from 'react';
import { LayerPanel } from './LayerPanel';
import { ToolSettings } from './ToolSettings';

export const RightPanel: React.FC = () => {
  return (
    <div>
      <LayerPanel />
      <ToolSettings />
    </div>
  );
};
