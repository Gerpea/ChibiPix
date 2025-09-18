import { LayerPanel } from '@/features/layers/ui/LayerPanel';
import { RightPanel } from '@/features/layers/ui/RightPanels';
import { PixelBoard } from '@/features/pixel-board/ui/PixelBoard';
import { Toolbar } from '@/features/toolbar/ui/Toolbar';
import { Topbar } from '@/features/topbar/ui/Topbar';

export default function Home() {
  return (
    <div className="flex h-full w-full flex-col gap-2 bg-gray-100 p-4">
      <header className="col-span-3 w-full">
        <Topbar />
      </header>

      <div className="flex h-full w-full gap-2">
        <aside className="flex h-full w-fit flex-col items-center gap-4 rounded-md bg-white p-2">
          <Toolbar />
        </aside>

        <main className="flex h-full w-full items-center justify-center overflow-hidden rounded-md bg-white">
          <PixelBoard />
        </main>

        <aside className="flex w-80 max-w-80 min-w-80 flex-col gap-4">
          <RightPanel />
        </aside>
      </div>
    </div>
  );
}
