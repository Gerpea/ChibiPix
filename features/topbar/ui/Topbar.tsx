'use client';

import React from 'react';
import { HistoryControls } from '@/features/history/ui/HistoryControls';
import { ToolSettings } from './ToolSettings';

export const Topbar: React.FC = () => {
  return (
    <div className="flex w-full">
      <HistoryControls />
      <ToolSettings />
    </div>
  );
};
