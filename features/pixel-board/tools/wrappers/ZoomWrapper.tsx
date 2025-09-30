import Konva from 'konva';
import { Tool, ToolConstructor, ToolContext } from '../Tool';
import { ZoomTool } from '../Zoom';

export class ZoomWrapper implements Tool {
  private zoomTool: ZoomTool;

  constructor(
    private baseTool: Tool,
    private ctx: ToolContext
  ) {
    this.zoomTool = new ZoomTool(ctx);
  }

  onMouseDown(
    row: number,
    col: number,
    e: Konva.KonvaEventObject<MouseEvent>
  ): void {
    this.baseTool.onMouseDown(row, col, e);
  }
  onMouseMove(
    row: number,
    col: number,
    e: Konva.KonvaEventObject<MouseEvent>
  ): void {
    this.baseTool.onMouseMove(row, col, e);
  }
  onMouseUp(
    row: number,
    col: number,
    e: Konva.KonvaEventObject<MouseEvent>
  ): void {
    this.baseTool.onMouseUp(row, col, e);
  }

  onWheel(
    row: number,
    col: number,
    e: Konva.KonvaEventObject<WheelEvent>
  ): void {
    this.zoomTool.onWheel(row, col, e);
  }

  onMouseLeave(e: Konva.KonvaEventObject<MouseEvent>): void {
    this.baseTool.onMouseLeave(e);
  }
}

export function withZoom<T extends ToolConstructor>(baseToolClass: T): T {
  return class extends ZoomWrapper {
    constructor(ctx: ToolContext) {
      const baseToolInstance = new baseToolClass(ctx);
      super(baseToolInstance, ctx);
    }
  } as unknown as T;
}
