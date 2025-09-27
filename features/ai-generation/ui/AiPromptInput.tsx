'use client';

import React, { useCallback, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Textarea } from '@/shared/ui/Textarea';
import { useAIStore } from '../models/aiStore';

export const AIPromptInput: React.FC = () => {
  const { startGeneration } = useAIStore();
  const [prompt, setPrompt] = useState('');

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setPrompt(e.target.value);
    },
    []
  );

  const handleGenerate = useCallback(() => {
    startGeneration(prompt);
    setPrompt('');
  }, [prompt]);

  return (
    <div className="flex h-full flex-col justify-between space-y-2 rounded-md border border-gray-200 bg-white p-4 shadow-sm">
      <Textarea
        placeholder="Enter prompt (e.g., 'pixel art of a cyberpunk cat')"
        value={prompt}
        onChange={handleChange}
        className="h-full resize-none"
      />
      <Button onClick={handleGenerate} disabled={!prompt}>
        Generate
      </Button>
    </div>
  );
};
