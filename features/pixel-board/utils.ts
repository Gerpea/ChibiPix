import Konva from 'konva';
import { Pan, Stage } from './model/pixelBoardStore';
import { PIXEL_SIZE } from './const';

export function getPointerPos(
  e: Konva.KonvaEventObject<MouseEvent>,
  stage: Stage,
  pan: Pan
) {
  const pos = e.target.getStage()?.getPointerPosition();
  if (!pos) return null;
  const worldX = pos.x / stage.scale + pan.x;
  const worldY = pos.y / stage.scale + pan.y;
  const col = Math.floor(worldX / PIXEL_SIZE);
  const row = Math.floor(worldY / PIXEL_SIZE);
  return { row, col };
}
