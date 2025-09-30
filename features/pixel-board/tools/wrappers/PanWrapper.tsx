import Konva from 'konva';
import { Tool, ToolConstructor, ToolContext } from '../Tool';
import { PanTool } from '../Pan';

export class PanWrapper implements Tool {
  private panTool: PanTool;
  private isPanning = false;

  constructor(
    private baseTool: Tool,
    private ctx: ToolContext
  ) {
    this.panTool = new PanTool(ctx);
  }

  onMouseDown(
    row: number,
    col: number,
    e: Konva.KonvaEventObject<MouseEvent>
  ): void {
    if (e.evt.button === 1) {
      this.isPanning = true;
      this.panTool.onMouseDown(row, col, e);
    } else {
      this.baseTool.onMouseDown(row, col, e);
    }
  }

  onMouseMove(
    row: number,
    col: number,
    e: Konva.KonvaEventObject<MouseEvent>
  ): void {
    if (this.isPanning) {
      this.panTool.onMouseMove(row, col, e);
    } else {
      this.baseTool.onMouseMove(row, col, e);
    }
  }

  onMouseUp(
    row: number,
    col: number,
    e: Konva.KonvaEventObject<MouseEvent>
  ): void {
    if (this.isPanning && e.evt.button === 1) {
      this.isPanning = false;
      this.panTool.onMouseUp(row, col, e);
    } else {
      this.baseTool.onMouseUp(row, col, e);
    }
  }

  onWheel(
    row: number,
    col: number,
    e: Konva.KonvaEventObject<WheelEvent>
  ): void {
    this.baseTool.onWheel(row, col, e);
  }

  renderOverlay(): void {
    this.baseTool.renderOverlay();
  }
}

export function withPan<T extends ToolConstructor>(baseToolClass: T): T {
  return class extends PanWrapper {
    constructor(ctx: ToolContext) {
      const baseToolInstance = new baseToolClass(ctx);
      super(baseToolInstance, ctx);
    }
  } as unknown as T;
}
