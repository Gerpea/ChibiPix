import { PixelBoard } from '@/features/pixel-board/ui/PixelBoard';
import { Toolbar } from '@/features/toolbar/ui/Toolbar';

export default function Home() {
  return (
    <div className="flex h-full w-full gap-4 bg-gray-100 p-4">
      {/* Left Toolbar */}
      <aside className="flex h-full w-fit flex-col items-center gap-4 border border-gray-300 bg-white p-2">
        <Toolbar />
      </aside>

      {/* Main Canvas */}
      <main className="flex h-full w-full items-center justify-center bg-gray-200 p-4">
        <PixelBoard />
      </main>

      {/* Right Panel (placeholder for layers / properties) */}
      {/* <aside className="flex flex-col gap-4 border-l border-gray-300 bg-white p-2">
        <h2 className="text-gray-700 font-semibold text-center">Layers</h2>
      </aside> */}
    </div>
  );
}
