'use client';

import React, { useEffect, useRef } from 'react';

const TOTAL_FRAMES = 30;
const FRAME_HEIGHT = 256;
const FRAME_WIDTH = 256;
const SPRITESHEET_URL = '/pixel-art-strip.png';

const ANIMATION_SCROLL_DISTANCE = 2000;

type Position = 'left' | 'right' | 'center';

interface BackgroundDrawingProps {
  position?: Position;
}

const BackgroundDrawing: React.FC<BackgroundDrawingProps> = ({
  position = 'right',
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  let animationFrameId: number;

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const progress = Math.min(scrollY / ANIMATION_SCROLL_DISTANCE, 1);

      const currentFrame = Math.floor(progress * (TOTAL_FRAMES - 1));

      const backgroundPositionY = currentFrame * -FRAME_HEIGHT;

      if (elementRef.current) {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }

        animationFrameId = requestAnimationFrame(() => {
          elementRef.current!.style.backgroundPositionY = `${backgroundPositionY}px`;
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  const positionClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  };

  return (
    <div
      ref={elementRef}
      className={`fixed top-1/4 z-[-1] hidden opacity-20 md:block ${positionClasses[position]}`}
      style={{
        width: `${FRAME_WIDTH}px`,
        height: `${FRAME_HEIGHT}px`,
        backgroundImage: `url(${SPRITESHEET_URL})`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: '0 0',
      }}
    />
  );
};

export default BackgroundDrawing;
