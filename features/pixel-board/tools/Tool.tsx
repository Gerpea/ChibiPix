import Konva from 'konva';

export type ToolConstructor = new (ctx: ToolContext) => Tool;

export interface ToolContext {
  ctx: CanvasRenderingContext2D;
  image: Konva.Image;
}

export interface Tool {
  onMouseDown(
    row: number,
    col: number,
    e: Konva.KonvaEventObject<MouseEvent>
  ): void;
  onMouseMove(
    row: number,
    col: number,
    e: Konva.KonvaEventObject<MouseEvent>
  ): void;
  onMouseUp(
    row: number,
    col: number,
    e: Konva.KonvaEventObject<MouseEvent>
  ): void;
  onWheel(
    row: number,
    col: number,
    e: Konva.KonvaEventObject<WheelEvent>
  ): void;
  onMouseLeave(e: Konva.KonvaEventObject<MouseEvent>): void;
}
