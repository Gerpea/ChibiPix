'use client';

import { useHistoryStore } from '@/features/history/model/historyStore';
import { useToolbarStore } from '@/features/toolbar/model/toolbarStore';
import { useEffect } from 'react';

export const Hotkeys = () => {
  const { undo, redo } = useHistoryStore();
  const { setCurrentTool, swapColors } = useToolbarStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;
      const key = e.key.toLowerCase();

      // History actions
      if (cmdKey && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      switch (key) {
        case 'p':
          setCurrentTool('pencil');
          break;
        case 'f':
          setCurrentTool('fill');
          break;
        case 'e':
          setCurrentTool('eraser');
          break;
        case 's':
          setCurrentTool('selection-rectangle');
          break;
        case 'h':
          setCurrentTool('pan');
          break;
        case 'z':
          setCurrentTool('zoom');
          break;
        case 'x':
          swapColors();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo, setCurrentTool, swapColors]);

  return null;
};
