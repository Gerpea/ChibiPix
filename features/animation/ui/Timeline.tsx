import { JSX, useCallback, useMemo, useRef, useState } from 'react';
import { useAnimationStore } from '../model/animationStore';
import { MAJOR_INTERVAL, PIXELS_PER_FRAME } from './const';
import { TimelineTick } from './TimelineTick';

interface TimelineProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

export const Timeline: React.FC<TimelineProps> = ({ scrollContainerRef }) => {
  const { frames, fps, isPlaying, pause, currentTime, setCurrentTime } =
    useAnimationStore();

  const [isScrubbing, setIsScrubbing] = useState(false);

  const timelineRef = useRef<HTMLDivElement>(null);

  const tickDuration = 1000 / fps;
  const scale = PIXELS_PER_FRAME / tickDuration;
  const totalDuration = frames.reduce((acc, frame) => acc + frame.duration, 0);
  const totalWidth = frames.reduce(
    (acc, frame) => acc + Math.max(PIXELS_PER_FRAME, frame.duration * scale),
    0
  );
  const currentTimePosition = currentTime * scale;
  const totalNumTicks = frames.reduce(
    (acc, frame) => acc + Math.round(frame.duration / tickDuration),
    0
  );
  const ticks = useMemo(() => {
    const ticks: JSX.Element[] = [];
    for (let i = 0; i <= totalNumTicks; i++) {
      const pos = i * PIXELS_PER_FRAME;
      const t = i * tickDuration;
      ticks.push(
        <TimelineTick
          key={`minor-${i}`}
          pos={pos}
          idx={i}
          time={t}
          type="minor"
        />
      );

      const mt = i * MAJOR_INTERVAL;
      if (mt > totalDuration + 1e-6) continue;
      const mpos = Math.round(mt * scale);
      ticks.push(
        <TimelineTick
          key={`major-${i}`}
          pos={mpos}
          idx={i}
          time={mt}
          type="major"
        />
      );
    }

    return ticks;
  }, [totalNumTicks]);

  const handleTimelineMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (isPlaying) {
        pause();
      }
      setIsScrubbing(true);
      if (!timelineRef.current || !scrollContainerRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const clickX =
        e.clientX - rect.left + scrollContainerRef.current.scrollLeft;
      const clickedTime = Math.max(0, Math.min(totalDuration, clickX / scale));
      setCurrentTime(clickedTime);
    },
    [isPlaying, totalDuration, scale, setIsScrubbing, setCurrentTime]
  );

  const handleTimelineMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isScrubbing || !timelineRef.current || !scrollContainerRef.current)
        return;
      const rect = timelineRef.current.getBoundingClientRect();
      const moveX =
        e.clientX - rect.left + scrollContainerRef.current.scrollLeft;
      const movedTime = Math.max(0, Math.min(totalDuration, moveX / scale));
      setCurrentTime(movedTime);
    },
    [isScrubbing, totalDuration, setCurrentTime]
  );

  const handleTimelineMouseUp = useCallback(() => {
    setIsScrubbing(false);
  }, [setIsScrubbing]);

  return (
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
  );
};
