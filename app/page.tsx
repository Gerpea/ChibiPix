'use client';

import { AnimationPanel } from '@/features/animation/ui/AnimationPanel';
import { RightPanel } from '@/features/right-panel/ui/RightPanels';
import { PixelBoard } from '@/features/pixel-board/ui/PixelBoard';
import { Toolbar } from '@/features/toolbar/ui/Toolbar';
import { Topbar } from '@/features/topbar/ui/Topbar';

export default function Home() {
  return (
    <div className="bg-background text-foreground flex h-full w-full flex-col gap-2 p-4">
      <header className="col-span-3 w-full">
        <Topbar />
      </header>

      <div className="flex h-full w-full gap-2">
        <aside className="flex h-full w-fit flex-col items-center gap-4">
          <Toolbar />
        </aside>

        <div className="flex h-full w-full flex-col gap-2">
          <main className="bg-background flex h-full w-full items-center justify-center overflow-hidden rounded-md border shadow-sm">
            <PixelBoard />
          </main>
          <AnimationPanel />
        </div>

        <aside className="flex w-72 max-w-72 min-w-72 flex-col gap-4">
          <RightPanel />
        </aside>
      </div>
    </div>
  );
}
