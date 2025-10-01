import Konva from 'konva';
import {
  Pixel,
  useAnimationStore,
} from '@/features/animation/model/animationStore';
import { intToHex } from '@/shared/utils/colors';
import { Tool, ToolContext } from './Tool';
import { PixelBoardStore, usePixelBoardStore } from '../model/pixelBoardStore';
import { PIXEL_SIZE } from '../const';

type RelPixel = { rx: number; ry: number; color: number };

export class SelectionRectangleTool implements Tool {
  private unsubscribeFromStore: () => void;
  private lastDx = 0;
  private lastDy = 0;

  private animation: Konva.Animation | null = null;
  private dashOffset = 0;

  private isSelecting = false;
  private isDragging = false;
  private startRow = 0;
  private startCol = 0;
  private endRow = 0;
  private endCol = 0;

  private selectedPixels: Pixel[] = [];

  private relPixels: RelPixel[] = [];

  private dragStartRow = 0;
  private dragStartCol = 0;
  private selectionOriginRow = 0;
  private selectionOriginCol = 0;

  private backupPixels: Pixel[] = [];

  private overlayCtx: CanvasRenderingContext2D;
  private overlayImage: Konva.Image;

  constructor(private ctx: ToolContext) {
    this.overlayCtx = ctx.overlayCtx;
    this.overlayImage = ctx.overlayImage;

    const listener = (state: PixelBoardStore, prevState: PixelBoardStore) => {
      const panChanged =
        state.pan.x !== prevState.pan.x || state.pan.y !== prevState.pan.y;
      const scaleChanged = state.stage.scale !== prevState.stage.scale;
      console.log(panChanged, scaleChanged);
      if (panChanged || scaleChanged) {
        this.redrawOverlay();
      }
    };

    this.unsubscribeFromStore = usePixelBoardStore.subscribe(listener);

    const layer = this.ctx.overlayImage.getLayer();
    if (layer) {
      this.animation = new Konva.Animation(() => {
        this.dashOffset = (this.dashOffset + 0.5) % 16;
        this.redrawOverlay();
      }, layer);
    }
  }

  destroy(): void {
    this.unsubscribeFromStore();
    this.animation?.stop();
    const stage = this.ctx.overlayImage.getStage();
    if (stage) {
      stage.container().style.cursor = 'default';
    }
  }

  private redrawOverlay(): void {
    if (this.isSelecting) {
      this.drawSelectionOutline();
    } else if (this.isDragging) {
      this.drawDragPreview(this.lastDx, this.lastDy);
    } else if (this.selectionActive()) {
      this.drawSelectionOverlay();
    }
  }

  private updateCursor(
    e: Konva.KonvaEventObject<MouseEvent>,
    row: number,
    col: number
  ): void {
    const stage = e.target.getStage();
    if (!stage) return;

    if (this.isDragging) {
      stage.container().style.cursor = 'move';
      return;
    }

    if (this.selectionActive() && this.pointInSelection(row, col)) {
      stage.container().style.cursor = 'move';
    } else {
      // Otherwise, use the default cursor
      stage.container().style.cursor = 'default';
    }
  }

  onMouseDown(
    row: number,
    col: number,
    e: Konva.KonvaEventObject<MouseEvent>
  ): void {
    if (e.evt.button !== 0) return;

    this.animation?.stop();

    if (this.selectionActive() && this.pointInSelection(row, col)) {
      this.isDragging = true;
      this.dragStartRow = row;
      this.dragStartCol = col;

      this.updateCursor(e, row, col);

      this.selectionOriginRow = Math.min(this.startRow, this.endRow);
      this.selectionOriginCol = Math.min(this.startCol, this.endCol);

      this.relPixels = this.selectedPixels.map((p) => ({
        rx: p.x - this.selectionOriginCol,
        ry: p.y - this.selectionOriginRow,
        color: p.color,
      }));

      this.backupPixels = this.selectedPixels.map((p) => ({ ...p }));

      const clearList: Pixel[] = this.selectedPixels.map((p) => ({
        x: p.x,
        y: p.y,
        color: 0,
      }));
      const state = useAnimationStore.getState();
      const currentFrame = state.frames[state.currentFrameIndex];
      state.setLayerPixels(currentFrame.activeLayerId, clearList);

      this.drawDragPreview(0, 0);
      return;
    }

    this.isSelecting = true;
    this.startRow = row;
    this.startCol = col;
    this.endRow = row;
    this.endCol = col;
    this.selectedPixels = [];
    this.clearOverlay();
    this.drawSelectionOutline();
  }

  onMouseMove(
    row: number,
    col: number,
    e: Konva.KonvaEventObject<MouseEvent>
  ): void {
    this.updateCursor(e, row, col);

    if (this.isSelecting) {
      this.endRow = row;
      this.endCol = col;
      this.drawSelectionOutline();
    } else if (this.isDragging) {
      const dx = col - this.dragStartCol;
      const dy = row - this.dragStartRow;
      this.lastDx = dx;
      this.lastDy = dy;
      this.drawDragPreview(dx, dy);
    }
  }

  onMouseUp(
    row: number,
    col: number,
    e: Konva.KonvaEventObject<MouseEvent>
  ): void {
    const state = useAnimationStore.getState();
    const currentFrame = state.frames[state.currentFrameIndex];
    const layerId = currentFrame.activeLayerId;

    if (this.isSelecting) {
      this.isSelecting = false;
      this.captureSelectedPixels();
      this.drawSelectionOverlay();

      if (this.selectionActive()) {
        this.animation?.start();
      }
      return;
    }

    if (this.isDragging) {
      this.isDragging = false;

      const dx = col - this.dragStartCol;
      const dy = row - this.dragStartRow;

      const movedList: Pixel[] = this.relPixels.map((rp) => ({
        x: Math.floor(this.selectionOriginCol + dx + rp.rx),
        y: Math.floor(this.selectionOriginRow + dy + rp.ry),
        color: rp.color,
      }));

      state.setLayerPixels(layerId, movedList);

      this.selectedPixels = [];
      this.relPixels = [];
      this.startRow = 0;
      this.endRow = 0;
      this.startCol = 0;
      this.endCol = 0;
      this.lastDx = 0;
      this.lastDy = 0;

      this.animation?.stop();
      this.clearOverlay();
    }

    this.updateCursor(e, row, col);
  }

  onWheel(
    row: number,
    col: number,
    e: Konva.KonvaEventObject<WheelEvent>
  ): void {}
  onMouseLeave(e: Konva.KonvaEventObject<MouseEvent>): void {
    this.animation?.stop();
    const stage = e.target.getStage();
    if (stage) {
      stage.container().style.cursor = 'default';
    }

    if (this.isSelecting) {
      this.isSelecting = false;
      this.clearOverlay();
      return;
    }

    if (this.isDragging) {
      this.isDragging = false;
      if (this.backupPixels.length) {
        const state = useAnimationStore.getState();
        const currentFrame = state.frames[state.currentFrameIndex];
        state.setLayerPixels(currentFrame.activeLayerId, this.backupPixels);
      }
      this.clearOverlay();
      this.selectedPixels = [];
      this.startRow = 0;
      this.endRow = 0;
      this.startCol = 0;
      this.endCol = 0;
      this.lastDx = 0;
      this.lastDy = 0;
    }
  }

  // ----------------- helpers -----------------

  private selectionActive(): boolean {
    return (
      this.selectedPixels.length > 0 ||
      this.startCol !== this.endCol ||
      this.startRow !== this.endRow
    );
  }

  private pointInSelection(row: number, col: number): boolean {
    const minRow = Math.min(this.startRow, this.endRow);
    const maxRow = Math.max(this.startRow, this.endRow);
    const minCol = Math.min(this.startCol, this.endCol);
    const maxCol = Math.max(this.startCol, this.endCol);
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
  }

  private captureSelectedPixels() {
    const state = useAnimationStore.getState();
    const currentFrame = state.frames[state.currentFrameIndex];
    const layer = currentFrame.layers.find(
      (l) => l.id === currentFrame.activeLayerId
    );
    if (!layer) return;

    const minRow = Math.min(this.startRow, this.endRow);
    const maxRow = Math.max(this.startRow, this.endRow);
    const minCol = Math.min(this.startCol, this.endCol);
    const maxCol = Math.max(this.startCol, this.endCol);

    const sel: Pixel[] = [];
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const key = `${c},${r}`;
        const color = layer.pixels.get(key) ?? 0;
        if (color && color !== 0) {
          sel.push({ x: c, y: r, color });
        }
      }
    }
    this.selectedPixels = sel;
  }

  private clearOverlay() {
    const ctx = this.overlayCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(
      0,
      0,
      (ctx.canvas as HTMLCanvasElement).width,
      (ctx.canvas as HTMLCanvasElement).height
    );
    this.overlayImage.image(ctx.canvas);
    this.overlayImage.getStage()?.batchDraw();
  }

  private drawSelectionOutline() {
    const ctx = this.overlayCtx;
    const pan = usePixelBoardStore.getState().pan;
    const stage = usePixelBoardStore.getState().stage;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(
      0,
      0,
      (ctx.canvas as HTMLCanvasElement).width,
      (ctx.canvas as HTMLCanvasElement).height
    );

    const snappedPanX = Math.floor(-pan.x * stage.scale);
    const snappedPanY = Math.floor(-pan.y * stage.scale);

    ctx.save();
    ctx.translate(snappedPanX, snappedPanY);
    ctx.setLineDash([6, 3]);
    ctx.lineDashOffset = this.dashOffset;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';

    const minCol = Math.min(this.startCol, this.endCol);
    const minRow = Math.min(this.startRow, this.endRow);
    const width =
      (Math.abs(this.endCol - this.startCol) + 1) * PIXEL_SIZE * stage.scale;
    const height =
      (Math.abs(this.endRow - this.startRow) + 1) * PIXEL_SIZE * stage.scale;

    const rx = Math.floor(minCol * PIXEL_SIZE * stage.scale);
    const ry = Math.floor(minRow * PIXEL_SIZE * stage.scale);

    ctx.strokeRect(rx, ry, Math.ceil(width), Math.ceil(height));
    ctx.restore();

    this.overlayImage.image(ctx.canvas);
    this.overlayImage.getStage()?.batchDraw();
  }

  private drawSelectionOverlay() {
    const ctx = this.overlayCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(
      0,
      0,
      (ctx.canvas as HTMLCanvasElement).width,
      (ctx.canvas as HTMLCanvasElement).height
    );

    const pan = usePixelBoardStore.getState().pan;
    const stage = usePixelBoardStore.getState().stage;
    const snappedPanX = Math.floor(-pan.x * stage.scale);
    const snappedPanY = Math.floor(-pan.y * stage.scale);

    ctx.save();
    ctx.translate(snappedPanX, snappedPanY);
    ctx.imageSmoothingEnabled = false;
    ctx.imageSmoothingQuality = 'low';

    for (const p of this.selectedPixels) {
      if (!p.color) continue;
      const drawX = Math.floor(p.x * PIXEL_SIZE * stage.scale);
      const drawY = Math.floor(p.y * PIXEL_SIZE * stage.scale);
      const size = Math.ceil(PIXEL_SIZE * stage.scale);
      ctx.fillStyle = `#${intToHex(p.color).replace('#', '')}`;
      ctx.fillRect(drawX, drawY, size, size);
    }

    ctx.setLineDash([6, 3]);
    ctx.lineDashOffset = this.dashOffset;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    const minCol = Math.min(this.startCol, this.endCol);
    const minRow = Math.min(this.startRow, this.endRow);
    const width =
      (Math.abs(this.endCol - this.startCol) + 1) * PIXEL_SIZE * stage.scale;
    const height =
      (Math.abs(this.endRow - this.startRow) + 1) * PIXEL_SIZE * stage.scale;
    const rx = Math.floor(minCol * PIXEL_SIZE * stage.scale);
    const ry = Math.floor(minRow * PIXEL_SIZE * stage.scale);
    ctx.strokeRect(rx, ry, Math.ceil(width), Math.ceil(height));

    ctx.restore();
    this.overlayImage.image(ctx.canvas);
    this.overlayImage.getStage()?.batchDraw();
  }

  private drawDragPreview(dx: number, dy: number) {
    const ctx = this.overlayCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(
      0,
      0,
      (ctx.canvas as HTMLCanvasElement).width,
      (ctx.canvas as HTMLCanvasElement).height
    );

    const pan = usePixelBoardStore.getState().pan;
    const stage = usePixelBoardStore.getState().stage;
    const snappedPanX = Math.floor(-pan.x * stage.scale);
    const snappedPanY = Math.floor(-pan.y * stage.scale);

    ctx.save();
    ctx.translate(snappedPanX, snappedPanY);
    ctx.imageSmoothingEnabled = false;
    ctx.imageSmoothingQuality = 'low';

    for (const rp of this.relPixels) {
      if (!rp.color) continue;
      const drawX = Math.floor(
        (this.selectionOriginCol + dx + rp.rx) * PIXEL_SIZE * stage.scale
      );
      const drawY = Math.floor(
        (this.selectionOriginRow + dy + rp.ry) * PIXEL_SIZE * stage.scale
      );
      const size = Math.ceil(PIXEL_SIZE * stage.scale);
      ctx.clearRect(drawX, drawY, size, size);
      ctx.fillStyle = `#${intToHex(rp.color).replace('#', '')}`;
      ctx.fillRect(drawX, drawY, size, size);
    }

    ctx.setLineDash([6, 3]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    const minCol = this.selectionOriginCol + dx;
    const minRow = this.selectionOriginRow + dy;
    const width =
      (Math.abs(this.endCol - this.startCol) + 1) * PIXEL_SIZE * stage.scale;
    const height =
      (Math.abs(this.endRow - this.startRow) + 1) * PIXEL_SIZE * stage.scale;
    const rx = Math.floor(minCol * PIXEL_SIZE * stage.scale);
    const ry = Math.floor(minRow * PIXEL_SIZE * stage.scale);
    ctx.strokeRect(rx, ry, Math.ceil(width), Math.ceil(height));

    ctx.restore();
    this.overlayImage.image(ctx.canvas);
    this.overlayImage.getStage()?.batchDraw();
  }
}
