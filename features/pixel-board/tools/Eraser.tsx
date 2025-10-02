import Konva from 'konva';
import { PencilTool } from './Pencil';
import { useToolbarStore } from '@/features/toolbar/model/toolbarStore';

export class EraserTool extends PencilTool {
  onMouseDown(
    row: number,
    col: number,
    e: Konva.KonvaEventObject<MouseEvent>
  ): void {
    this.isDrawing = true;
    this.color = 0;
    const size = useToolbarStore.getState().toolSettings['eraser'].size;
    this.drawPixel(row, col, this.color, size);
  }

  onMouseMove(
    row: number,
    col: number,
    e: Konva.KonvaEventObject<MouseEvent>
  ): void {
    if (this.isDrawing) {
      const size = useToolbarStore.getState().toolSettings['eraser'].size;
      this.drawPixel(row, col, this.color, size);
    }
  }
}
