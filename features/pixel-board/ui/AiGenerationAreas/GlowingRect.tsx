'use client';

import React, { useEffect, useRef } from 'react';
import Konva from 'konva';
import { Group, Rect } from 'react-konva';

interface GlowingRectProps {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const GlowingRect: React.FC<GlowingRectProps> = ({
  x,
  y,
  width,
  height,
}) => {
  const rectRef = useRef<Konva.Rect>(null);

  useEffect(() => {
    if (!rectRef.current) {
      return;
    }
    const rect = rectRef.current;
    const layer = rect.getLayer();
    if (!layer) return;
    const anim = new Konva.Animation((frame) => {
      if (!frame) return;
      const time = frame.time / 1000;

      if (!rect) return;

      const pulse = 0.6 + 0.4 * Math.sin(time * 2);
      const blur = 5 + 5 * Math.sin(time * 2);

      rect.setAttrs({
        opacity: pulse,
        shadowBlur: blur,
      });
    }, layer);

    anim.start();

    return () => {
      anim.stop;
    };
  }, []);

  return (
    <Group x={x} y={y}>
      <Rect
        ref={rectRef}
        x={0}
        y={0}
        width={width}
        height={height}
        stroke="#42A5F5"
        strokeWidth={2}
        strokeOpacity={0.8}
        cornerRadius={8}
        shadowColor="#42A5F5"
        shadowOpacity={0.7}
        shadowBlur={8}
        shadowOffset={{ x: 0, y: 0 }}
        fill="rgba(66, 165, 245, 0.15)"
      />
    </Group>
  );
};
