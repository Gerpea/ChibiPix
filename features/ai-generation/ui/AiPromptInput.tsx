'use client';

import React, { useCallback, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Textarea } from '@/shared/ui/Textarea';
import { useAIStore } from '../model/aiStore';

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
    <div className="bg-background flex h-full max-h-40 flex-col justify-between space-y-2 rounded-md border p-4 shadow-sm">
      <Textarea
        placeholder="Enter prompt (e.g., 'pixel art of a cyberpunk cat')"
        value={prompt}
        onChange={handleChange}
        className="border-border h-full resize-none"
        autoComplete="off"
      />
      <Button onClick={handleGenerate} disabled={!prompt}>
        Generate
      </Button>
    </div>
  );
};
