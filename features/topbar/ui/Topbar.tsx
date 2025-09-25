'use client';

import React from 'react';
import { HistoryControls } from '@/features/history/ui/HistoryControls';
import { ImportExportButtons } from '@/features/serialization/ui/ImportExportButtons';

export const Topbar: React.FC = () => {
  return (
    <div className="flex w-full gap-4 pl-2">
      <ImportExportButtons />
      <HistoryControls />
    </div>
  );
};
