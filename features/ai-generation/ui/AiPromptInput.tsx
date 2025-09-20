'use client';

import React from 'react';
import { Button } from '@/shared/ui/Button';
import { Textarea } from '@/shared/ui/Textarea';
import { useAIStore } from '../models/aiStore';

export const AIPromptInput: React.FC = () => {
  const { prompt, isGenerating, setPrompt, generateImage, stopGeneration } =
    useAIStore();

  return (
    <div className="flex h-full flex-col justify-between space-y-2 rounded-md border border-gray-200 bg-white p-4 shadow-sm">
      <Textarea
        type="text"
        placeholder="Enter prompt (e.g., 'pixel art of a cyberpunk cat')"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={isGenerating}
        className="h-full resize-none"
      />
      <Button
        onClick={isGenerating ? stopGeneration : generateImage}
        disabled={!prompt && !isGenerating}
      >
        {isGenerating ? 'Stop' : 'Generate'}
      </Button>
    </div>
  );
};
