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
        <div className="flex h-[720px]">
          <Tabs
            value={selectedFormat}
            onValueChange={setSelectedFormat}
            className="flex w-full"
            orientation="vertical"
          >
            <TabsList className="flex h-full w-1/4 flex-col justify-start border-r">
              <TabsTrigger
                value="anim"
                className="flex w-full justify-center p-2"
              >
                .anim
              </TabsTrigger>
              <TabsTrigger
                value="png"
                className="flex w-full justify-center p-2"
              >
                .png
              </TabsTrigger>
              <TabsTrigger
                value="jpg"
                className="flex w-full justify-center p-2"
              >
                .jpg
              </TabsTrigger>
              <TabsTrigger
                value="gif"
                className="flex w-full justify-center p-2"
              >
                .gif
              </TabsTrigger>
              <TabsTrigger
                value="sheet"
                className="flex w-full justify-center p-2"
              >
                sheet
              </TabsTrigger>
            </TabsList>
            <TabsContent
              value="anim"
              className="mt-0 w-full overflow-auto px-4"
            >
              <NativeTab />
            </TabsContent>
            <TabsContent value="png" className="mt-0 w-full overflow-auto px-4">
              <PngTab />
            </TabsContent>
            <TabsContent value="jpg" className="mt-0 w-full overflow-auto px-4">
              <JpgTab />
            </TabsContent>
            <TabsContent value="gif" className="mt-0 w-full overflow-auto px-4">
              <GifTab />
            </TabsContent>
            <TabsContent
              value="sheet"
              className="mt-0 w-full overflow-auto px-4"
            >
              <SpritesheetTab />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
