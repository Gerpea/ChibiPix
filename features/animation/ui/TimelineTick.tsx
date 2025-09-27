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
      style={{
        position: 'absolute',
        left: `${pos}px`,
        top: '0',
        width: '1px',
        height: '6px',
        backgroundColor: '#666',
      }}
    />
  ) : (
    <>
      <div
        style={{
          position: 'absolute',
          left: `${pos}px`,
          top: '0',
          width: '1px',
          height: '12px',
          backgroundColor: '#333',
        }}
      />
      <span
        style={{
          position: 'absolute' as const,
          left: `${pos + (idx === 0 ? 4 : 22)}px`,
          top: '-3px',
          fontSize: '10px',
          color: '#333',
          transform: idx === 0 ? 'none' : 'translateX(-100%)',
        }}
      >
        {(time / 1000).toFixed(0)}s
      </span>
    </>
  );
};
