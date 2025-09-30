import {
  Pixel,
  useAnimationStore,
} from '@/features/animation/model/animationStore';
import { useToolbarStore } from '@/features/toolbar/model/toolbarStore';
import { hexToInt } from '@/shared/utils/colors';
import { Tool, ToolContext } from './Tool';
import { usePixelBoardStore } from '../model/pixelBoardStore';
import { PIXEL_SIZE } from '../const';
import Konva from 'konva';

export class FillTool implements Tool {
  private pendingPixels: Pixel[] = [];
  private color: number = 0;
  constructor(private ctx: ToolContext) {}

  onMouseDown(
    row: number,
    col: number,
    e: Konva.KonvaEventObject<MouseEvent>
  ): void {
    if (!(e.evt.button === 0 || e.evt.button === 2)) return;

    this.color = hexToInt(
      e.evt.button === 2
        ? useToolbarStore.getState().secondaryColor
        : useToolbarStore.getState().primaryColor
    );
    this.fillPixels(row, col);
    const state = useAnimationStore.getState();
    const currentFrame = state.frames[state.currentFrameIndex];
    useAnimationStore
      .getState()
      .setLayerPixels(currentFrame.activeLayerId, this.pendingPixels);
    this.pendingPixels = [];
  }
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
  ): void {}
  onMouseLeave(e: Konva.KonvaEventObject<MouseEvent>): void {}

  fillPixels(startRow: number, startCol: number) {
    const color = this.color;
    const state = useAnimationStore.getState();
    const currentFrame = state.frames[state.currentFrameIndex];
    const layers = currentFrame?.layers ?? [];
    const layer = layers.find((l) => l.id === currentFrame.activeLayerId);

    const pixels = layer?.pixels || new Map();
    const targetColor = pixels.get(`${startCol},${startRow}`) ?? 0;
    if (targetColor === color) return;

    const pan = usePixelBoardStore.getState().pan;
    const stage = usePixelBoardStore.getState().stage;

    const minPixelX = Math.floor(pan.x / PIXEL_SIZE);
    const minPixelY = Math.floor(pan.y / PIXEL_SIZE);
    const maxPixelX = Math.ceil(
      (pan.x + stage.width / stage.scale) / PIXEL_SIZE
    );
    const maxPixelY = Math.ceil(
      (pan.y + stage.height / stage.scale) / PIXEL_SIZE
    );

    const newPixels: { x: number; y: number; color: number }[] = [];
    const stack = [[startRow, startCol]];
    const visited = new Set<string>();

    while (stack.length) {
      const [row, col] = stack.pop()!;
      const key = `${col},${row}`;
      if (visited.has(key)) continue;

      if (
        col < minPixelX ||
        col >= maxPixelX ||
        row < minPixelY ||
        row >= maxPixelY
      ) {
        continue;
      }

      const currentColor = pixels.get(key) ?? 0;
      if (currentColor !== targetColor) continue;

      visited.add(key);
      newPixels.push({ x: col, y: row, color });

      stack.push([row + 1, col]);
      stack.push([row - 1, col]);
      stack.push([row, col + 1]);
      stack.push([row, col - 1]);
    }

    this.pendingPixels = newPixels;
  }
}
