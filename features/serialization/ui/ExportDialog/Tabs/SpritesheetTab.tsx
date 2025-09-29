import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { saveAs } from 'file-saver';
import { Loader2Icon } from 'lucide-react';
import { CheckedState } from '@radix-ui/react-checkbox';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import {
  Frame,
  Layer,
  useAnimationStore,
} from '@/features/animation/model/animationStore';
import { useExportStore } from '@/features/serialization/model/exportStore';
import { Checkbox } from '@/shared/ui/Checkbox';
import { Input } from '@/shared/ui/Input';
import { Label } from '@/shared/ui/Label';
import { Button } from '@/shared/ui/Button';
import { ProgressButton } from '../ProgressButton';
import { ExportPreviews } from '../ExportPreviews';
import { intToHex } from '@/shared/utils/colors';
import { PIXEL_SIZE } from '@/features/pixel-board/const';

export const SpritesheetTab: React.FC = () => {
  const { frames } = useAnimationStore();
  const { padding, selectedFrames, setPadding, toggleFrame, isFrameSelected } =
    useExportStore();
  const [filename, setFilename] = useState('spritesheet.png');
  const [columns, setColumns] = useState(4);
  const [consistentSize, setConsistentSize] = useState(true);
  const [positions, setPositions] = useState<{
    [id: string]: { x: number; y: number };
  }>({});
  const [isExporting, setIsExporting] = useState(false);

  const selectedFramesList = useMemo(
    () => frames.filter((f) => selectedFrames.get(f.id)),
    [frames, selectedFrames]
  );

  const boundsMap = useMemo(() => {
    const map: {
      [id: string]: {
        minX: number;
        minY: number;
        contentW: number;
        contentH: number;
      };
    } = {};
    frames.forEach((frame) => {
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
      frame.layers.forEach((layer) => {
        if (!layer.visible) return;
        for (const key of layer.pixels.keys()) {
          const [x, y] = key.split(',').map(Number);
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      });
      if (minX === Infinity) {
        minX = minY = 0;
        maxX = maxY = 7;
      }
      map[frame.id] = {
        minX,
        minY,
        contentW: maxX - minX + 1,
        contentH: maxY - minY + 1,
      };
    });
    return map;
  }, [frames]);

  const maxContentW = useMemo(
    () =>
      Math.max(1, ...selectedFramesList.map((f) => boundsMap[f.id].contentW)),
    [selectedFramesList, boundsMap]
  );
  const maxContentH = useMemo(
    () =>
      Math.max(1, ...selectedFramesList.map((f) => boundsMap[f.id].contentH)),
    [selectedFramesList, boundsMap]
  );

  const tileSizes = useMemo(() => {
    const map: { [id: string]: { w: number; h: number } } = {};
    selectedFramesList.forEach((f) => {
      const b = boundsMap[f.id];
      map[f.id] = {
        w: (consistentSize ? maxContentW : b.contentW) + 2 * padding,
        h: (consistentSize ? maxContentH : b.contentH) + 2 * padding,
      };
    });
    return map;
  }, [
    selectedFramesList,
    consistentSize,
    maxContentW,
    maxContentH,
    padding,
    boundsMap,
  ]);

  const gridCellSize = useMemo(() => {
    if (selectedFramesList.length === 0) return 32; // Default size for empty state
    const maxTileSize = Math.max(
      ...selectedFramesList.map((f) =>
        Math.max(tileSizes[f.id].w, tileSizes[f.id].h)
      )
    );
    return maxTileSize;
  }, [selectedFramesList, tileSizes]);

  useEffect(() => {
    setPositions((prev) => {
      const newPos: { [id: string]: { x: number; y: number } } = {};
      const currentIds = selectedFramesList.map((f) => f.id);
      const prevIds = Object.keys(prev).filter((id) => currentIds.includes(id));
      const sortedIds = prevIds.sort((a, b) => {
        const pa = prev[a];
        const pb = prev[b];
        if (pa.y !== pb.y) return pa.y - pb.y;
        return pa.x - pb.x;
      });
      const newAdded = currentIds.filter((id) => !prevIds.includes(id));
      const allSorted = [...sortedIds, ...newAdded];
      allSorted.forEach((id, i) => {
        const col = i % columns;
        const row = Math.floor(i / columns);
        const tileW = tileSizes[id]?.w || gridCellSize;
        const tileH = tileSizes[id]?.h || gridCellSize;
        newPos[id] = {
          x: col * gridCellSize + (gridCellSize - tileW) / 2,
          y: row * gridCellSize + (gridCellSize - tileH) / 2,
        };
      });
      return newPos;
    });
  }, [selectedFramesList, tileSizes, columns, gridCellSize]);

  const handleFilenameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFilename(e.target.value);
  };

  const handleColumnsChange = (e: ChangeEvent<HTMLInputElement>) => {
    setColumns(Math.max(1, parseInt(e.target.value) || 1));
  };

  const handlePaddingChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPadding(parseInt(e.target.value) || 0);
  };

  const handleConsistentSizeToggle = (value: CheckedState) => {
    setConsistentSize(!!value);
  };

  const autoArrange = useCallback(() => {
    const newPos: { [id: string]: { x: number; y: number } } = {};
    selectedFramesList.forEach((frame, i) => {
      const col = i % columns;
      const row = Math.floor(i / columns);
      const tileW = tileSizes[frame.id].w;
      const tileH = tileSizes[frame.id].h;
      newPos[frame.id] = {
        x: col * gridCellSize + (gridCellSize - tileW) / 2,
        y: row * gridCellSize + (gridCellSize - tileH) / 2,
      };
    });
    setPositions(newPos);
  }, [selectedFramesList, tileSizes, columns, gridCellSize]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const pixelSize = 1;

      let maxExtentX = 0;
      let maxExtentY = 0;
      selectedFramesList.forEach((frame) => {
        const pos = positions[frame.id] || { x: 0, y: 0 };
        const ts = tileSizes[frame.id] || {
          w: maxContentW + 2 * padding,
          h: maxContentH + 2 * padding,
        };
        maxExtentX = Math.max(maxExtentX, pos.x + ts.w);
        maxExtentY = Math.max(maxExtentY, pos.y + ts.h);
      });

      const canvas = document.createElement('canvas');
      canvas.width = maxExtentX * pixelSize;
      canvas.height = maxExtentY * pixelSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      selectedFramesList.forEach((frame) => {
        const pos = positions[frame.id] || { x: 0, y: 0 };
        const b = boundsMap[frame.id];
        const contentOffsetX = consistentSize
          ? (maxContentW - b.contentW) / 2
          : 0;
        const contentOffsetY = consistentSize
          ? (maxContentH - b.contentH) / 2
          : 0;
        frame.layers.forEach((layer: Layer) => {
          if (!layer.visible) return;
          for (const [key, color] of layer.pixels.entries()) {
            const [x, y] = key.split(',').map(Number);
            const adjustedX =
              (pos.x + padding + contentOffsetX + (x - b.minX)) * pixelSize;
            const adjustedY =
              (pos.y + padding + contentOffsetY + (y - b.minY)) * pixelSize;
            ctx.fillStyle = intToHex(color);
            ctx.fillRect(adjustedX, adjustedY, pixelSize, pixelSize);
          }
        });
      });

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      );
      if (blob) {
        saveAs(blob, filename);
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  }, [
    selectedFramesList,
    positions,
    boundsMap,
    tileSizes,
    consistentSize,
    maxContentW,
    maxContentH,
    padding,
    filename,
  ]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="filename">Filename</Label>
          <Input
            id="filename"
            value={filename}
            onChange={handleFilenameChange}
          />
        </div>
        <div>
          <Label htmlFor="padding">Padding</Label>
          <Input
            id="padding"
            className="w-24"
            type="number"
            value={padding}
            onChange={handlePaddingChange}
            min="0"
          />
        </div>
        <div>
          <Label htmlFor="columns">Columns</Label>
          <Input
            id="columns"
            className="w-24"
            type="number"
            value={columns}
            onChange={handleColumnsChange}
            min="1"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="consistent-size"
            checked={consistentSize}
            onCheckedChange={handleConsistentSizeToggle}
          />
          <Label htmlFor="consistent-size">Consistent Size</Label>
        </div>
        <Button onClick={autoArrange} variant="outline">
          Auto Arrange
        </Button>
      </div>
      <SpritesheetPreview
        selectedFramesList={selectedFramesList}
        positions={positions}
        tileSizes={tileSizes}
        boundsMap={boundsMap}
        padding={padding}
        columns={columns}
        gridCellSize={gridCellSize}
        consistentSize={consistentSize}
        maxContentW={maxContentW}
        maxContentH={maxContentH}
        setPositions={setPositions}
      />
      <ExportPreviews />
      <ProgressButton
        onClick={handleExport}
        disabled={isExporting || selectedFramesList.length === 0}
        className="mt-auto w-full transition-all duration-200"
      >
        {isExporting ? (
          <Loader2Icon className="h-5 w-5 animate-spin" />
        ) : (
          'Export'
        )}
      </ProgressButton>
    </div>
  );
};

interface SpritesheetPreviewProps {
  selectedFramesList: Frame[];
  positions: { [id: string]: { x: number; y: number } };
  tileSizes: { [id: string]: { w: number; h: number } };
  boundsMap: {
    [id: string]: {
      minX: number;
      minY: number;
      contentW: number;
      contentH: number;
    };
  };
  padding: number;
  columns: number;
  gridCellSize: number;
  consistentSize: boolean;
  maxContentW: number;
  maxContentH: number;
  setPositions: React.Dispatch<
    React.SetStateAction<{ [id: string]: { x: number; y: number } }>
  >;
}

export const SpritesheetPreview: React.FC<SpritesheetPreviewProps> = ({
  selectedFramesList,
  positions,
  tileSizes,
  boundsMap,
  padding,
  columns,
  gridCellSize,
  consistentSize,
  maxContentW,
  maxContentH,
  setPositions,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLCanvasElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  const { scale, offsetX, offsetY, totalWidth, totalHeight } = useMemo(() => {
    // Calculate actual bounds of the grid based on sprite positions and sizes
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    if (selectedFramesList.length === 0) {
      // Default bounds for empty state
      return {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        totalWidth: gridCellSize * columns,
        totalHeight: gridCellSize,
      };
    }

    selectedFramesList.forEach((frame) => {
      const pos = positions[frame.id] || { x: 0, y: 0 };
      const ts = tileSizes[frame.id] || { w: gridCellSize, h: gridCellSize };
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x + ts.w);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y + ts.h);
    });

    const totalWidth = maxX - minX;
    const totalHeight = maxY - minY;

    // Calculate scale to fit the entire grid within the container
    const scale = Math.min(
      containerSize.width / totalWidth,
      containerSize.height / totalHeight
    );

    // Center the grid
    const offsetX = (containerSize.width - totalWidth * scale) / 2;
    const offsetY = (containerSize.height - totalHeight * scale) / 2;

    return { scale, offsetX, offsetY, totalWidth, totalHeight };
  }, [
    selectedFramesList,
    positions,
    tileSizes,
    containerSize,
    gridCellSize,
    columns,
  ]);

  useEffect(() => {
    const canvas = bgRef.current;
    if (!canvas || containerSize.width === 0 || containerSize.height === 0)
      return;
    canvas.width = containerSize.width;
    canvas.height = containerSize.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    if (selectedFramesList.length > 0) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1 / scale;
      ctx.fillStyle = 'rgba(200, 200, 200, 0.2)';

      const numX = Math.ceil(totalWidth / gridCellSize);
      const numY = Math.ceil(totalHeight / gridCellSize);

      for (let i = 0; i < numX; i++) {
        for (let j = 0; j < numY; j++) {
          ctx.beginPath();
          ctx.rect(
            i * gridCellSize,
            j * gridCellSize,
            gridCellSize,
            gridCellSize
          );
          ctx.fill();
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }, [
    gridCellSize,
    scale,
    offsetX,
    offsetY,
    totalWidth,
    totalHeight,
    containerSize,
    columns,
  ]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const id = active.id as string;
    const prev = positions[id] || { x: 0, y: 0 };
    const ts = tileSizes[id] || {
      w: maxContentW + 2 * padding,
      h: maxContentH + 2 * padding,
    };

    const newX = prev.x + delta.x / scale;
    const newY = prev.y + delta.y / scale;

    // Snap to the center of the nearest grid cell
    let col = Math.round((newX - (gridCellSize - ts.w) / 2) / gridCellSize);
    let row = Math.round((newY - (gridCellSize - ts.h) / 2) / gridCellSize);

    // Enforce boundaries: limit to the fixed number of rows
    const maxRows =
      selectedFramesList.length === 0
        ? 1
        : Math.ceil(selectedFramesList.length / columns);
    col = Math.max(0, Math.min(col, columns - 1));
    row = Math.max(0, Math.min(row, maxRows - 1));

    // Check for another sprite in the target grid cell
    const targetCell = `${col},${row}`;
    const occupiedFrame = selectedFramesList.find((frame) => {
      if (frame.id === id) return false;
      const pos = positions[frame.id];
      if (!pos) return false;
      const frameCol = Math.round(
        (pos.x - (gridCellSize - tileSizes[frame.id].w) / 2) / gridCellSize
      );
      const frameRow = Math.round(
        (pos.y - (gridCellSize - tileSizes[frame.id].h) / 2) / gridCellSize
      );
      return frameCol === col && frameRow === row;
    });

    setPositions((prev) => {
      const newPos = { ...prev };
      if (occupiedFrame) {
        // Swap positions with the occupied frame
        const occupiedId = occupiedFrame.id;
        const occupiedPos = prev[occupiedId];
        const draggedPos = {
          x: col * gridCellSize + (gridCellSize - ts.w) / 2,
          y: row * gridCellSize + (gridCellSize - ts.h) / 2,
        };
        newPos[id] = draggedPos;
        newPos[occupiedId] = {
          x: prev[id].x,
          y: prev[id].y,
        };
      } else {
        // Place in the target cell if empty
        newPos[id] = {
          x: col * gridCellSize + (gridCellSize - ts.w) / 2,
          y: row * gridCellSize + (gridCellSize - ts.h) / 2,
        };
      }
      return newPos;
    });
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-visible"
      style={{
        backgroundColor: '#fff',
        backgroundImage:
          'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
      }}
    >
      <canvas
        ref={bgRef}
        className="pointer-events-none absolute top-0 left-0 h-full w-full"
      />
      <DndContext
        sensors={sensors}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToParentElement]}
      >
        {selectedFramesList.map((frame) => (
          <DraggableItem
            key={frame.id}
            id={frame.id}
            frame={frame}
            position={positions[frame.id] || { x: 0, y: 0 }}
            tileSize={
              tileSizes[frame.id] || {
                w: maxContentW + 2 * padding,
                h: maxContentH + 2 * padding,
              }
            }
            scale={scale}
            offsetX={offsetX}
            offsetY={offsetY}
            padding={padding}
            transparent={true}
            showBounds={true}
            consistentSize={consistentSize}
            maxWidth={maxContentW}
            maxHeight={maxContentH}
          />
        ))}
      </DndContext>
    </div>
  );
};

interface DraggableItemProps {
  id: string;
  frame: Frame;
  position: { x: number; y: number };
  tileSize: { w: number; h: number };
  scale: number;
  offsetX: number;
  offsetY: number;
  padding: number;
  transparent: boolean;
  showBounds: boolean;
  consistentSize: boolean;
  maxWidth: number;
  maxHeight: number;
}

const DraggableItem: React.FC<DraggableItemProps> = ({
  id,
  frame,
  position,
  tileSize,
  scale,
  offsetX,
  offsetY,
  padding,
  transparent,
  showBounds,
  consistentSize,
  maxWidth,
  maxHeight,
}) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });

  const style = {
    position: 'absolute' as const,
    left: `${position.x * scale + offsetX}px`,
    top: `${position.y * scale + offsetY}px`,
    width: `${tileSize.w * scale}px`,
    height: `${tileSize.h * scale}px`,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    zIndex: transform ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <ExportPreview
        frame={frame}
        padding={padding}
        pixelSize={1}
        transparent={transparent}
        showBounds={showBounds}
        consistentSize={consistentSize}
        maxWidth={maxWidth}
        maxHeight={maxHeight}
      />
    </div>
  );
};

interface ExportPreviewProps {
  frame: { id: string; name: string; layers: Layer[]; duration: number };
  padding?: number;
  pixelSize?: number;
  transparent?: boolean;
  showBounds?: boolean;
  consistentSize?: boolean;
  maxWidth?: number;
  maxHeight?: number;
}

export const ExportPreview: React.FC<ExportPreviewProps> = ({
  frame,
  padding = 20,
  pixelSize = PIXEL_SIZE,
  transparent = false,
  showBounds = false,
  consistentSize = false,
  maxWidth,
  maxHeight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || containerSize.width === 0 || containerSize.height === 0)
      return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    frame.layers.forEach((layer) => {
      if (!layer.visible || layer.pixels.size === 0) return;
      for (const key of layer.pixels.keys()) {
        const [x, y] = key.split(',').map(Number);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    });

    if (minX === Infinity || minY === Infinity) {
      minX = minY = 0;
      maxX = maxY = 7;
    }

    const effectiveWidth = Math.max(1, maxX - minX + 1);
    const effectiveHeight = Math.max(1, maxY - minY + 1);

    const innerW = consistentSize && maxWidth ? maxWidth : effectiveWidth;
    const innerH = consistentSize && maxHeight ? maxHeight : effectiveHeight;

    const contentWidth = effectiveWidth * pixelSize;
    const contentHeight = effectiveHeight * pixelSize;
    const innerWidth = innerW * pixelSize;
    const innerHeight = innerH * pixelSize;

    const paddedContentWidth = innerWidth + padding * 2;
    const paddedContentHeight = innerHeight + padding * 2;

    const canvasWidth = containerSize.width;
    const canvasHeight = containerSize.height;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const scale = Math.min(
      canvasWidth / paddedContentWidth,
      canvasHeight / paddedContentHeight
    );

    const scaledWidth = paddedContentWidth * scale;
    const scaledHeight = paddedContentHeight * scale;

    const offsetX = (canvasWidth - scaledWidth) / 2;
    const offsetY = (canvasHeight - scaledHeight) / 2;

    if (transparent) {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    } else {
      const checkerSize = pixelSize * scale;
      const cols = Math.ceil(canvasWidth / checkerSize);
      const rows = Math.ceil(canvasHeight / checkerSize);

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          ctx.fillStyle = (row + col) % 2 === 0 ? '#fff' : '#ccc';
          ctx.fillRect(
            col * checkerSize,
            row * checkerSize,
            checkerSize,
            checkerSize
          );
        }
      }
    }

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    const contentOffsetX = consistentSize ? (innerWidth - contentWidth) / 2 : 0;
    const contentOffsetY = consistentSize
      ? (innerHeight - contentHeight) / 2
      : 0;

    frame.layers.forEach((layer) => {
      if (!layer.visible) return;
      for (const [key, color] of layer.pixels.entries()) {
        const [x, y] = key.split(',').map(Number);

        const adjustedX = (x - minX) * pixelSize + padding + contentOffsetX;
        const adjustedY = (y - minY) * pixelSize + padding + contentOffsetY;

        ctx.fillStyle = intToHex(color);
        ctx.fillRect(adjustedX, adjustedY, pixelSize, pixelSize);
      }
    });

    ctx.restore();
  }, [
    frame.layers,
    containerSize,
    padding,
    pixelSize,
    transparent,
    consistentSize,
    maxWidth,
    maxHeight,
  ]);

  return (
    <div
      ref={containerRef}
      className={`flex h-full w-full flex-col items-center ${showBounds ? 'border border-dashed border-black' : ''}`}
    >
      <canvas ref={canvasRef} className="block" />
    </div>
  );
};
