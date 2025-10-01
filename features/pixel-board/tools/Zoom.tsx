import Konva from 'konva';
import { Tool, ToolContext } from './Tool';
import { usePixelBoardStore } from '../model/pixelBoardStore';

export class ZoomTool implements Tool {
  constructor(private ctx: ToolContext) {}

  onMouseDown(
    row: number,
    col: number,
    e: Konva.KonvaEventObject<MouseEvent>
  ): void {}
  onMouseMove(
    row: number,
    col: number,
    e: Konva.KonvaEventObject<MouseEvent>
  ): void {}
  onMouseUp(
    row: number,
    col: number,
    e: Konva.KonvaEventObject<MouseEvent>
  ): void {}
  onWheel(
    row: number,
    col: number,
    e: Konva.KonvaEventObject<WheelEvent>
  ): void {
    const stageEl = e.target.getStage();
    if (!stageEl) return;

    const scaleBy = 1.1;
    const stage = usePixelBoardStore.getState().stage;
    const pan = usePixelBoardStore.getState().pan;
    const oldScale = stage.scale;
    const pointer = stageEl.getPointerPosition();
    if (!pointer) return;

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const boundedScale = Math.max(0.5, Math.min(newScale, 32));
    const snappedScale = Math.round(boundedScale * 10) / 10;

    const newPanWorldX =
      pan.x + pointer.x / oldScale - pointer.x / boundedScale;
    const newPanWorldY =
      pan.y + pointer.y / oldScale - pointer.y / boundedScale;

    usePixelBoardStore.getState().setStage({ scale: snappedScale });
    usePixelBoardStore.getState().setPan({ x: newPanWorldX, y: newPanWorldY });
  }
  onMouseLeave(e: Konva.KonvaEventObject<MouseEvent>): void {}
}
