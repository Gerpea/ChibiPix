'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAnimationStore } from '../model/animationStore';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { ScrollArea, ScrollBar } from '@/shared/ui/ScrollArea';
import {
  PlayIcon,
  PauseIcon,
  PlusIcon,
  TrashIcon,
  CopyIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  SquareIcon,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/Collapsible';
import { Frames } from './Frames';
import { Timeline } from './Timeline';

export const AnimationPanel: React.FC = () => {
  const {
    frames,
    currentFrameIndex,
    fps,
    isPlaying,
    addFrame,
    setFps,
    play,
    pause,
    stop,
    removeFrame,
    setFrameDuration,
    isImporting,
  } = useAnimationStore();
  const [isOpen, setIsOpen] = useState(true);
  const [containerWidth, setContainerWidth] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevFpsRef = useRef(fps);

  useEffect(() => {
    const oldFps = prevFpsRef.current;
    if (oldFps !== fps && !isImporting) {
      const oldTick = 1000 / oldFps;
      const newTick = 1000 / fps;
      frames.forEach((frame, index) => {
        let numTicks = Math.round(frame.duration / oldTick);
        numTicks = Math.max(1, numTicks);
        const newDuration = numTicks * newTick;
        setFrameDuration(index, newDuration);
      });
      if (isPlaying) {
        pause();
        play();
      }
      prevFpsRef.current = fps;
      if (isImporting) {
        useAnimationStore.setState({ isImporting: false });
      }
    }
  }, [fps, frames, setFrameDuration, isPlaying, isImporting, pause, play]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (panelRef.current) {
      setContainerWidth(panelRef.current.clientWidth);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!panelRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(panelRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  const handleDuplicate = () => {
    addFrame(true);
  };

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="bg-background rounded-md border p-4 shadow-sm"
    >
      <div className="flex flex-col">
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <div className="flex w-full cursor-pointer items-center">
              <h3 className="text-foreground text-sm font-medium">Animation</h3>
              {isOpen ? (
                <ChevronUpIcon className="ml-auto h-4 w-4" />
              ) : (
                <ChevronDownIcon className="ml-auto h-4 w-4" />
              )}
            </div>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent ref={panelRef}>
          <ScrollArea
            ref={scrollRef}
            className="relative mt-4"
            style={{ width: `${containerWidth - 0}px` }}
          >
            <Timeline scrollContainerRef={scrollRef} />
            <Frames scrollContainerRef={scrollRef} />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          <div className="border-border mt-3 flex justify-between gap-2 border-t pt-2">
            <div>
              <Input
                type="number"
                value={fps}
                onChange={(e) => setFps(Number(e.target.value))}
                className="w-24"
                min="1"
              />
            </div>
            <div className="flex justify-center gap-2">
              <Button
                onClick={isPlaying ? pause : play}
                size="icon"
                variant="ghost"
              >
                {isPlaying ? (
                  <PauseIcon className="h-3 w-3" />
                ) : (
                  <PlayIcon className="h-3 w-3" />
                )}
              </Button>
              <Button onClick={stop} size="icon" variant="ghost">
                <SquareIcon className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button onClick={() => addFrame()} size="icon" variant="ghost">
                  <PlusIcon className="h-3 w-3" />
                </Button>
                <Button onClick={handleDuplicate} size="icon" variant="ghost">
                  <CopyIcon className="h-3 w-3" />
                </Button>
                <Button
                  onClick={() => removeFrame(currentFrameIndex)}
                  size="icon"
                  variant="ghost"
                >
                  <TrashIcon className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
