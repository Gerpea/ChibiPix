interface TimelineTickProps {
  pos: number;
  type: 'minor' | 'major';
  idx: number;
  time: number;
}

export const TimelineTick: React.FC<TimelineTickProps> = ({
  pos,
  type,
  idx,
  time,
}) => {
  return type == 'minor' ? (
    <div
      className="bg-muted-foreground absolute top-0 h-[6px] w-px"
      style={{ left: `${pos}px` }}
    />
  ) : (
    <>
      <div
        className="bg-foreground absolute top-0 h-3 w-px"
        style={{ left: `${pos}px` }}
      />
      <span
        className="text-foreground absolute top-[-3px] text-[10px]"
        style={{
          left: `${pos + (idx === 0 ? 4 : 22)}px`,
          transform: idx === 0 ? 'none' : 'translateX(-100%)',
        }}
      >
        {(time / 1000).toFixed(0)}s
      </span>
    </>
  );
};
