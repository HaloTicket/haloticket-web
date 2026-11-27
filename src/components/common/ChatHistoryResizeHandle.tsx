import { useRef } from 'react';

const HISTORY_MIN_WIDTH = 192;
const HISTORY_MAX_WIDTH = 340;
const clampHistoryWidth = (width: number) => Math.min(HISTORY_MAX_WIDTH, Math.max(HISTORY_MIN_WIDTH, width));

export function ChatHistoryResizeHandle({ label, width, setHistoryWidth }: {
  label: string;
  width: number;
  setHistoryWidth: (width: number) => void;
}) {
  const historyDragRef = useRef<{ x: number; width: number } | null>(null);
  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-controls="organizer-session-drawer"
      aria-label={label}
      aria-valuemin={HISTORY_MIN_WIDTH}
      aria-valuemax={HISTORY_MAX_WIDTH}
      aria-valuenow={width}
      title={label}
      className="group relative z-10 -mx-1 grid w-2 shrink-0 cursor-col-resize touch-none select-none place-items-center transition-colors hover:bg-brand-primary/20 active:bg-brand-primary/30 focus-visible:bg-brand-primary/20 focus-visible:outline-2 focus-visible:outline-brand-primary"
      onPointerDown={(event) => {
        if (event.button !== 0 || !event.isPrimary) return;
        event.currentTarget.focus({ preventScroll: true });
        event.currentTarget.setPointerCapture(event.pointerId);
        historyDragRef.current = { x: event.clientX, width: width };
      }}
      onPointerMove={(event) => {
        const start = historyDragRef.current;
        if (start && event.currentTarget.hasPointerCapture(event.pointerId)) {
          setHistoryWidth(clampHistoryWidth(start.width + event.clientX - start.x));
        }
      }}
      onLostPointerCapture={() => { historyDragRef.current = null; }}
      onKeyDown={(event) => {
        const widths: Record<string, number> = {
          ArrowLeft: width - 16,
          ArrowRight: width + 16,
          Home: HISTORY_MIN_WIDTH,
          End: HISTORY_MAX_WIDTH,
        };
        const nextWidth = widths[event.key];
        if (typeof nextWidth !== 'number') return;
        event.preventDefault();
        setHistoryWidth(clampHistoryWidth(nextWidth));
      }}
    >
      <span aria-hidden="true" className="h-8 w-1 rounded-full bg-gray-300 dark:bg-gray-600 transition-colors group-hover:bg-brand-primary group-active:bg-brand-primary group-focus-visible:bg-brand-primary" />
    </div>
  );
}
