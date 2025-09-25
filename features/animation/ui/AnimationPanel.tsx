'use client';

import React, { JSX, useEffect, useRef, useState } from 'react';
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
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/Collapsible';
import { FrameItem } from './FrameItem';

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
    moveFrame,
    removeFrame,
    currentTime,
    setCurrentTime,
    setFrameDuration,
  } = useAnimationStore();
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.1);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isContentVisible, setIsContentVisible] = useState(false);
  const prevFpsRef = useRef(fps);

  const pixelsPerFrame = 50;
  const tickDuration = 1000 / fps;
  const minorInterval = tickDuration;
  const majorInterval = 1000;

  useEffect(() => {
    const oldFps = prevFpsRef.current;
    if (oldFps !== fps) {
      const oldTick = 1000 / oldFps;
      const newTick = 1000 / fps;
      frames.forEach((frame, index) => {
        let numTicks = Math.round(frame.duration / oldTick);
        numTicks = Math.max(1, numTicks);
        const newDuration = numTicks * newTick;
        setFrameDuration(index, newDuration);
      });
      if (isPlaying) {
        // Restart playback with new FPS
        pause();
        play();
      }
      prevFpsRef.current = fps;
    }
  }, [fps, frames, setFrameDuration, isPlaying, pause, play]);

  useEffect(() => {
    setScale(pixelsPerFrame / tickDuration);
  }, [fps]);

  useEffect(() => {
    if (!isOpen) {
      setIsContentVisible(false);
      return;
    }

    if (panelRef.current && !isContentVisible) {
      setContainerWidth(panelRef.current.clientWidth);
      setIsContentVisible(true);
    }
  }, [isOpen, isContentVisible]);

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

  const ticks: JSX.Element[] = [];
  const totalDuration = frames.reduce((acc, frame) => acc + frame.duration, 0);
  const totalWidth = frames.reduce(
    (acc, frame) => acc + Math.max(pixelsPerFrame, frame.duration * scale),
    0
  );

  // Calculate totalNumTicks to avoid floating point issues
  let totalNumTicks = 0;
  for (const frame of frames) {
    totalNumTicks += Math.round(frame.duration / tickDuration);
  }

  // Minor ticks
  for (let i = 0; i <= totalNumTicks; i++) {
    const pos = i * pixelsPerFrame;
    ticks.push(
      <div
        key={`minor-${i}`}
        style={{
          position: 'absolute',
          left: `${pos}px`,
          top: '0',
          width: '1px',
          height: '6px',
          backgroundColor: '#666',
        }}
      />
    );
  }

  // Major ticks with epsilon for floating point precision
  for (let j = 0; ; j++) {
    const mt = j * majorInterval;
    if (mt > totalDuration + 1e-6) break;
    const mpos = Math.round(mt * scale);
    ticks.push(
      <div
        key={`major-${j}`}
        style={{
          position: 'absolute',
          left: `${mpos}px`,
          top: '0',
          width: '1px',
          height: '12px',
          backgroundColor: '#333',
        }}
      />
    );
    const labelStyle = {
      position: 'absolute' as const,
      left: `${mpos + (j === 0 ? 4 : 22)}px`,
      top: '-3px',
      fontSize: '10px',
      color: '#333',
      transform: j === 0 ? 'none' : 'translateX(-100%)',
    };
    ticks.push(
      <span key={`label-${j}`} style={labelStyle}>
        {(mt / 1000).toFixed(0)}s
      </span>
    );
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (over && active.id !== over.id) {
      const oldIndex = frames.findIndex((f) => f.id === active.id);
      const newIndex = frames.findIndex((f) => f.id === over.id);
      moveFrame(oldIndex, newIndex);
    }
  };

  const handleDuplicate = () => {
    addFrame(true);
  };

  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isPlaying) {
      pause();
    }
    setIsScrubbing(true);
    if (!timelineRef.current || !scrollRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + scrollRef.current.scrollLeft;
    const clickedTime = Math.max(0, Math.min(totalDuration, clickX / scale));
    setCurrentTime(clickedTime);
  };

  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isScrubbing || !timelineRef.current || !scrollRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const moveX = e.clientX - rect.left + scrollRef.current.scrollLeft;
    const movedTime = Math.max(0, Math.min(totalDuration, moveX / scale));
    setCurrentTime(movedTime);
  };

  const handleTimelineMouseUp = () => {
    setIsScrubbing(false);
  };

  useEffect(() => {
    if (isScrubbing) {
      document.addEventListener('mousemove', handleDocumentMouseMove);
      document.addEventListener('mouseup', handleDocumentMouseUp);
    } else {
      document.removeEventListener('mousemove', handleDocumentMouseMove);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };

    function handleDocumentMouseMove(e: MouseEvent) {
      if (!isScrubbing || !timelineRef.current || !scrollRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const moveX = e.clientX - rect.left + scrollRef.current.scrollLeft;
      const movedTime = Math.max(0, Math.min(totalDuration, moveX / scale));
      setCurrentTime(movedTime);
    }

    function handleDocumentMouseUp() {
      setIsScrubbing(false);
    }
  }, [isScrubbing, totalDuration, scale]);

  const currentTimePosition = currentTime * scale;

  return (
    <Collapsible
      ref={panelRef}
      open={isOpen}
      onOpenChange={setIsOpen}
      className="rounded-md border border-gray-200 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-col">
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <div className="flex w-full items-center">
              <h3 className="text-sm font-medium text-gray-900">Animation</h3>
              <Button size="icon" variant="ghost" className="ml-auto">
                {isOpen ? (
                  <ChevronUpIcon className="h-4 w-4" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <ScrollArea
            ref={scrollRef}
            style={{ width: `${containerWidth - 32}px`, position: 'relative' }}
          >
            {isContentVisible && (
              <>
                <div
                  ref={timelineRef}
                  style={{
                    height: '12px',
                    position: 'relative',
                    cursor: 'pointer',
                    zIndex: 10,
                    width: `${totalWidth}px`,
                    marginBottom: '8px',
                  }}
                  onMouseDown={handleTimelineMouseDown}
                  onMouseMove={handleTimelineMouseMove}
                  onMouseUp={handleTimelineMouseUp}
                >
                  {ticks}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${currentTimePosition}px`,
                      top: '0',
                      bottom: '0',
                      width: '2px',
                      backgroundColor: 'red',
                    }}
                  />
                </div>
                <div
                  className="flex flex-row whitespace-nowrap"
                  style={{ width: `${totalWidth}px` }}
                >
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    modifiers={[restrictToParentElement]}
                  >
                    <SortableContext
                      items={frames.map((f) => ({
                        id: f.id,
                        width: Math.max(pixelsPerFrame, f.duration * scale),
                      }))}
                      strategy={horizontalListSortingStrategy}
                    >
                      {frames.map((frame, index) => (
                        <FrameItem
                          key={frame.id}
                          id={frame.id}
                          frame={frame}
                          index={index}
                          active={index === currentFrameIndex}
                          isDragging={frame.id === activeDragId}
                          scale={scale}
                          tickDuration={tickDuration}
                          scrollContainerRef={scrollRef}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              </>
            )}
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          <div className="mt-3 flex justify-between gap-2 border-t border-gray-200 pt-2">
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
