import { ChangeEvent, useState } from 'react';
import { Loader2Icon } from 'lucide-react';
import { CheckedState } from '@radix-ui/react-checkbox';
import { useAnimationStore } from '@/features/animation/model/animationStore';
import { useExportStore } from '@/features/serialization/model/exportStore';
import { Checkbox } from '@/shared/ui/Checkbox';
import { Input } from '@/shared/ui/Input';
import { Label } from '@/shared/ui/Label';
import { Button } from '@/shared/ui/Button';
import { SpritesheetPreview } from './SpritesheetPreview';
import { useSpritesheetData } from './hooks/useSpritesheetData';
import { useSpritesheetLayout } from './hooks/useSpritesheetLayout';
import { useSpritesheetExporter } from './hooks/useSpritesheetExporter';
import { ExportPreviews } from '../../ExportPreviews';
import { ProgressButton } from '../../ProgressButton';

export const SpritesheetTab: React.FC = () => {
  const { frames } = useAnimationStore();
  const { padding, selectedFrames, setPadding } = useExportStore();
  const [filename, setFilename] = useState('spritesheet');
  const [columns, setColumns] = useState(4);
  const [consistentSize, setConsistentSize] = useState(true);

  const { selectedFramesList, boundsMap, maxContentW, maxContentH, tileSizes } =
    useSpritesheetData(frames, selectedFrames, consistentSize, padding);

  const { positions, setPositions, gridCellSize, autoArrange } =
    useSpritesheetLayout(selectedFramesList, tileSizes, columns);

  const { isExporting, handleExport } = useSpritesheetExporter({
    selectedFramesList,
    positions,
    boundsMap,
    tileSizes,
    consistentSize,
    maxContentW,
    maxContentH,
    padding,
    filename,
  });

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

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="filename">File Name</Label>
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
        setPositions={setPositions}
        tileSizes={tileSizes}
        padding={padding}
        columns={columns}
        gridCellSize={gridCellSize}
        consistentSize={consistentSize}
        maxContentW={maxContentW}
        maxContentH={maxContentH}
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
