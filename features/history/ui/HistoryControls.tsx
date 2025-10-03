'use client';

import { RotateCcwIcon, RotateCwIcon } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { useHistoryStore } from '../model/historyStore';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/Tooltip';

export const HistoryControls = () => {
  const { undo, redo } = useHistoryStore();

  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant="outline" onClick={undo}>
            <RotateCcwIcon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Undo (Ctrl + Z)</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant="outline" onClick={redo}>
            <RotateCwIcon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Redo (Ctrl + Shift + Z)</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
