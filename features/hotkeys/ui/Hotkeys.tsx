'use client';

import { useAnimationStore } from '@/features/animation/model/animationStore';
import { useHistoryStore } from '@/features/history/model/historyStore';
import { useToolbarStore } from '@/features/toolbar/model/toolbarStore';
import { useEffect } from 'react';

export const Hotkeys = () => {
  const { undo, redo } = useHistoryStore();
  const { setCurrentTool, swapColors } = useToolbarStore();
  const {
    addFrame,
    duplicateLayer,
    addLayer,
    removeFrame,
    removeLayer,
    isPlaying,
    play,
    stop,
    pause,
    currentFrameIndex,
    toggleLayerLock,
    toggleLayerVisibility,
    frames,
    setCurrentFrame,
    setActiveLayer,
  } = useAnimationStore();

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
      const currentFrame = frames[currentFrameIndex];
      const activeLayerId = currentFrame?.activeLayerId;

      if (key.startsWith('arrow')) {
        e.preventDefault();

        if (key === 'arrowup' || key === 'arrowdown') {
          if (!currentFrame || currentFrame.layers.length <= 1) return;

          const currentLayerIndex = currentFrame.layers.findIndex(
            (layer) => layer.id === currentFrame.activeLayerId
          );
          if (currentLayerIndex === -1) return;

          let nextLayerIndex = currentLayerIndex;

          if (key === 'arrowup') {
            nextLayerIndex = Math.min(
              currentFrame.layers.length - 1,
              currentLayerIndex + 1
            );
          } else {
            nextLayerIndex = Math.max(0, currentLayerIndex - 1);
          }

          if (nextLayerIndex !== currentLayerIndex) {
            const nextLayerId = currentFrame.layers[nextLayerIndex].id;
            setActiveLayer(nextLayerId);
          }
        } else if (key === 'arrowleft' || key === 'arrowright') {
          let nextFrameIndex = currentFrameIndex;

          if (key === 'arrowleft') {
            nextFrameIndex = Math.max(0, currentFrameIndex - 1);
          } else {
            nextFrameIndex = Math.min(frames.length - 1, currentFrameIndex + 1);
          }

          if (nextFrameIndex !== currentFrameIndex) {
            setCurrentFrame(nextFrameIndex);
          }
        }
        return;
      }

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

      // Layer actions with modifiers
      if (cmdKey && e.shiftKey && key === 'l') {
        e.preventDefault();
        addLayer();
        return;
      }
      if (cmdKey && key === 'l') {
        e.preventDefault();
        duplicateLayer(frames[currentFrameIndex].activeLayerId);
        return;
      }

      // Animation actions with modifiers
      if (cmdKey && e.shiftKey && key === 'k') {
        e.preventDefault();
        addFrame();
        return;
      }
      if (cmdKey && key === 'k') {
        e.preventDefault();
        addFrame(true);
        return;
      }

      if (cmdKey && e.shiftKey && key === ' ') {
        e.preventDefault();
        stop();
        return;
      }

      if (cmdKey && key === ' ') {
        e.preventDefault();
        if (isPlaying) {
          pause();
        } else {
          play();
        }
        return;
      }

      if (key === 'delete' || key === 'backspace') {
        e.preventDefault();

        if (cmdKey) {
          removeFrame(currentFrameIndex);
        } else if (e.shiftKey) {
          removeLayer(frames[currentFrameIndex].activeLayerId);
        }
        return;
      }

      // Layout modifiers
      switch (key) {
        case 'l':
          if (activeLayerId) toggleLayerLock(activeLayerId);
          break;
        case 'v':
          if (activeLayerId) toggleLayerVisibility(activeLayerId);
          break;
      }

      // Toolbar tools
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
  }, [
    undo,
    redo,
    setCurrentTool,
    swapColors,
    frames,
    currentFrameIndex,
    isPlaying,
  ]);

  return null;
};
