import {
  Pixel,
  useAnimationStore,
} from '@/features/animation/model/animationStore';
import { useToolbarStore } from '@/features/toolbar/model/toolbarStore';
import { adjustColorOpacity, hexToInt, intToHex } from '@/shared/utils/colors';
import { Tool, ToolContext } from './Tool';
import { usePixelBoardStore } from '../model/pixelBoardStore';
import { PIXEL_SIZE } from '../const';
import Konva from 'konva';

export class PencilTool implements Tool {
  private pendingPixels: Pixel[] = [];
  protected isDrawing: boolean = false;
  protected color: number = 0;

  constructor(private ctx: ToolContext) {}

  onMouseDown(
    row: number,
    col: number,
    e: Konva.KonvaEventObject<MouseEvent>
  ): void {
    this.isDrawing = true;
    this.color = hexToInt(
      e.evt.button === 2
        ? useToolbarStore.getState().secondaryColor
        : useToolbarStore.getState().primaryColor
    );
    this.drawPixel(row, col);
  }
  onMouseMove(
    row: number,
    col: number,
    e: Konva.KonvaEventObject<MouseEvent>
  ): void {
    if (this.isDrawing) {
      this.drawPixel(row, col);
    }
  }
  onMouseUp(
    row: number,
    col: number,
    e: Konva.KonvaEventObject<MouseEvent>
  ): void {
    this.isDrawing = false;
    const state = useAnimationStore.getState();
    const currentFrame = state.frames[state.currentFrameIndex];
    useAnimationStore
      .getState()
      .setLayerPixels(currentFrame.activeLayerId, this.pendingPixels);
    this.pendingPixels = [];
  }
  onWheel(
    row: number,
    col: number,
    e: Konva.KonvaEventObject<WheelEvent>
  ): void {}
  onMouseLeave(e: Konva.KonvaEventObject<MouseEvent>): void {}

  protected drawPixel(row: number, col: number) {
    const ctx = this.ctx.ctx;
    const color = this.color;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.imageSmoothingQuality = 'low';
    const pan = usePixelBoardStore.getState().pan;
    const stage = usePixelBoardStore.getState().stage;

    const snappedPanX = Math.floor(-pan.x * stage.scale);
    const snappedPanY = Math.floor(-pan.y * stage.scale);
    ctx.translate(snappedPanX, snappedPanY);

    const adjustedColor = adjustColorOpacity(
      color,
      useToolbarStore.getState().toolSettings['pencil'].opacity
    );
    const size = useToolbarStore.getState().toolSettings['pencil'].size;

    const offset = Math.floor(size / 2);

    for (let dy = -offset; dy < size - offset; dy++) {
      for (let dx = -offset; dx < size - offset; dx++) {
        const px = col + dx;
        const py = row + dy;

        this.pendingPixels.push({
          x: px,
          y: py,
          color: adjustedColor,
        });

        const hexColor = intToHex(adjustedColor);

        ctx.clearRect(
          Math.floor(px * PIXEL_SIZE * stage.scale),
          Math.floor(py * PIXEL_SIZE * stage.scale),
          Math.ceil(PIXEL_SIZE * stage.scale),
          Math.ceil(PIXEL_SIZE * stage.scale)
        );

        ctx.fillStyle = hexColor;
        ctx.fillRect(
          Math.floor(px * PIXEL_SIZE * stage.scale),
          Math.floor(py * PIXEL_SIZE * stage.scale),
          Math.ceil(PIXEL_SIZE * stage.scale),
          Math.ceil(PIXEL_SIZE * stage.scale)
        );
        this.ctx.image.image(ctx.canvas);
      }
    }
    ctx.restore();
  }
}
