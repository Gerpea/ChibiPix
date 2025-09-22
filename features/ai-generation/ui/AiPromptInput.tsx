'use client';

import React from 'react';
import { Button } from '@/shared/ui/Button';
import { Textarea } from '@/shared/ui/Textarea';
import { useAIStore } from '../models/aiStore';

export const AIPromptInput: React.FC = () => {
  const { currentPrompt, startGeneration, setCurrentPrompt } = useAIStore();

  return (
    <div className="flex h-full flex-col justify-between space-y-2 rounded-md border border-gray-200 bg-white p-4 shadow-sm">
      <Textarea
        placeholder="Enter prompt (e.g., 'pixel art of a cyberpunk cat')"
        value={currentPrompt}
        onChange={(e) => setCurrentPrompt(e.target.value)}
        className="h-full resize-none"
      />
      <Button onClick={startGeneration} disabled={!currentPrompt}>
        {'Generate'}
      </Button>
    </div>
  );
};
