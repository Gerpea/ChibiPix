import { useDraggable } from '@dnd-kit/core';
import { Frame } from '@/features/animation/model/animationStore';
import { ExportPreview } from './ExportPreview';

interface DraggableItemProps {
  id: string;
  frame: Frame;
  position: { x: number; y: number };
  tileSize: { w: number; h: number };
  scale: number;
  offsetX: number;
  offsetY: number;
  padding: number;
  consistentSize: boolean;
  maxWidth: number;
  maxHeight: number;
}

export const DraggableItem: React.FC<DraggableItemProps> = ({
  id,
  frame,
  position,
  tileSize,
  scale,
  offsetX,
  offsetY,
  padding,
  consistentSize,
  maxWidth,
  maxHeight,
}) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });

  const style = {
    position: 'absolute' as const,
    left: `${position.x * scale + offsetX}px`,
    top: `${position.y * scale + offsetY}px`,
    width: `${tileSize.w * scale}px`,
    height: `${tileSize.h * scale}px`,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    zIndex: transform ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <ExportPreview
        frame={frame}
        padding={padding}
        pixelSize={1}
        transparent={true}
        showBounds={true}
        consistentSize={consistentSize}
        maxWidth={maxWidth}
        maxHeight={maxHeight}
      />
    </div>
  );
};
