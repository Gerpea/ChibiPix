'use client';

import React from 'react';
import { HistoryControls } from '@/features/history/ui/HistoryControls';
import { ToolSettings } from './ToolSettings';
import { ImportExportButtons } from '@/features/serialization/ui/ImportExportButtons';

export const Topbar: React.FC = () => {
  return (
    <div className="flex w-full">
      <ImportExportButtons />
      <HistoryControls />
      <ToolSettings />
    </div>
  );
};
