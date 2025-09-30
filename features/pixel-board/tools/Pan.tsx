import Konva from 'konva';
import { Vector2d } from 'konva/lib/types';
import { Tool, ToolContext } from './Tool';
import { usePixelBoardStore } from '../model/pixelBoardStore';

export class PanTool implements Tool {
  private isPanning: boolean = false;
  private lastPanPos: Vector2d | null = null;

  constructor(private ctx: ToolContext) {}

  onMouseDown(
    row: number,
    col: number,
    e: Konva.KonvaEventObject<MouseEvent>
  ): void {
    this.isPanning = true;
    this.lastPanPos = e.target.getStage()?.getPointerPosition() || null;
  }
  onMouseMove(
    row: number,
    col: number,
    e: Konva.KonvaEventObject<MouseEvent>
  ): void {
    if (!(this.isPanning && this.lastPanPos)) return;

    const stageEl = e.target.getStage();
    if (!stageEl) return;
    const currentPos = stageEl.getPointerPosition();
    if (currentPos) {
      const stage = usePixelBoardStore.getState().stage;
      const pan = usePixelBoardStore.getState().pan;
      const dx = (currentPos.x - this.lastPanPos.x) / stage.scale;
      const dy = (currentPos.y - this.lastPanPos.y) / stage.scale;
      usePixelBoardStore.getState().setPan({ x: pan.x - dx, y: pan.y - dy });
      this.lastPanPos = currentPos;
    }
    return;
  }
  onMouseUp(
    row: number,
    col: number,
    e: Konva.KonvaEventObject<MouseEvent>
  ): void {
    this.isPanning = false;
    this.lastPanPos = null;
  }
  onWheel(
    row: number,
    col: number,
    e: Konva.KonvaEventObject<WheelEvent>
  ): void {}
  renderOverlay(): void {}
}
