import Konva from 'konva';
import { PencilTool } from './Pencil';

export class EraserTool extends PencilTool {
  onMouseDown(
    row: number,
    col: number,
    e: Konva.KonvaEventObject<MouseEvent>
  ): void {
    this.isDrawing = true;
    this.color = 0;
    this.drawPixel(row, col);
  }
}
