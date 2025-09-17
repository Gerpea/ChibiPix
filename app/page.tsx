import { LayerPanel } from '@/features/layers/ui/LayerPanel';
import { PixelBoard } from '@/features/pixel-board/ui/PixelBoard';
import { Toolbar } from '@/features/toolbar/ui/Toolbar';
import { Topbar } from '@/features/topbar/ui/Topbar';

export default function Home() {
  return (
    <div className="flex h-full w-full flex-col gap-4 bg-gray-100 p-4">
      <header className="col-span-3 w-full border border-gray-300 bg-white p-2">
        <Topbar />
      </header>

      <div className="flex h-full w-full gap-4">
        <aside className="flex h-full w-fit flex-col items-center gap-4 border border-gray-300 bg-white p-2">
          <Toolbar />
        </aside>

        <main className="flex h-full w-full items-center justify-center bg-gray-200">
          <PixelBoard />
        </main>

        <aside className="flex flex-col gap-4 border border-gray-300 bg-white p-2">
          <LayerPanel />
        </aside>
      </div>
    </div>
  );
}
