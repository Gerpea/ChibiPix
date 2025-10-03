import { useState } from 'react';
import { NativeTab } from './Tabs/NativeTab';
import { PngTab } from './Tabs/PngTab';
import { JpgTab } from './Tabs/JpgTab';
import { GifTab } from './Tabs/GifTab';
import { SpritesheetTab } from './Tabs/SpritesheetTab/SpritesheetTab';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/Dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/Tabs';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState('anim');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Export Animation</DialogTitle>
        </DialogHeader>
        <div className="flex h-[720px] flex-col">
          <Tabs
            value={selectedFormat}
            onValueChange={setSelectedFormat}
            className="flex h-full w-full flex-col"
            orientation="horizontal"
          >
            <TabsList className="flex h-fit w-full justify-start border-r">
              <TabsTrigger
                value="anim"
                className="flex w-full justify-center p-2"
              >
                ChibiPix
              </TabsTrigger>
              <TabsTrigger
                value="png"
                className="flex w-full justify-center p-2"
              >
                PNG
              </TabsTrigger>
              <TabsTrigger
                value="jpg"
                className="flex w-full justify-center p-2"
              >
                JPG
              </TabsTrigger>
              <TabsTrigger
                value="gif"
                className="flex w-full justify-center p-2"
              >
                GIF
              </TabsTrigger>
              <TabsTrigger
                value="sheet"
                className="flex w-full justify-center p-2"
              >
                Sheet
              </TabsTrigger>
            </TabsList>
            <TabsContent
              value="anim"
              className="h-full w-full overflow-auto px-4"
            >
              <NativeTab />
            </TabsContent>
            <TabsContent
              value="png"
              className="h-full w-full overflow-auto px-4"
            >
              <PngTab />
            </TabsContent>
            <TabsContent
              value="jpg"
              className="h-full w-full overflow-auto px-4"
            >
              <JpgTab />
            </TabsContent>
            <TabsContent
              value="gif"
              className="h-full w-full overflow-auto px-4"
            >
              <GifTab />
            </TabsContent>
            <TabsContent
              value="sheet"
              className="h-full w-full overflow-auto px-4"
            >
              <SpritesheetTab />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
