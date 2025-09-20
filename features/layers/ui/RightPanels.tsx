'use client';

import React from 'react';
import { LayerPanel } from './LayerPanel';
import { ToolSettings } from './ToolSettings';
import { AIPromptInput } from '@/features/ai-generation/ui/AiPromptInput';

export const RightPanel: React.FC = () => {
  return (
    <div className="flex h-full flex-col gap-4">
      <LayerPanel />
      <ToolSettings />
      <AIPromptInput />
    </div>
  );
};
