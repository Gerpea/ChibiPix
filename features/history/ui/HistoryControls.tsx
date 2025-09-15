'use client';

import { Button } from '@/shared/ui/Button';
import { useHistoryStore } from '../model/historyStore';
import { RotateCcwIcon, RotateCwIcon } from 'lucide-react';

export const HistoryControls = () => {
  const { undo, redo } = useHistoryStore();

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" onClick={undo} title="Undo">
        <RotateCcwIcon className="h-4 w-4" />
      </Button>

      <Button variant="ghost" size="icon" onClick={redo} title="Redo">
        <RotateCwIcon className="h-4 w-4" />
      </Button>
    </div>
  );
};
