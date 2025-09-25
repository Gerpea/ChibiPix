'use client';

import { RotateCcwIcon, RotateCwIcon } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { useHistoryStore } from '../model/historyStore';

export const HistoryControls = () => {
  const { undo, redo } = useHistoryStore();

  return (
    <div className="flex items-center gap-2">
      <Button size={'icon'} variant={'secondary'} onClick={undo} title="Undo">
        <RotateCcwIcon className="h-4 w-4" />
      </Button>

      <Button size={'icon'} variant={'secondary'} onClick={redo} title="Redo">
        <RotateCwIcon className="h-4 w-4" />
      </Button>
    </div>
  );
};
