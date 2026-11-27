import { useEffect, useRef, useState, type PointerEvent, type Ref } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import type { ChatAnchor } from './ChatWindow';

type Point = { x: number; y: number };
type Position = Point & { edge?: 'left' | 'right' };
type LauncherKind = 'customer' | 'organizer' | 'admin';
const defaultPosition: Record<LauncherKind, string> = {
  customer: 'bottom-24 right-4 sm:right-8',
  organizer: 'bottom-8 right-8',
  admin: 'bottom-8 right-8',
};
const launcherSize = () => window.innerWidth < 640 ? 52 : 56;
const viewportWidth = () => document.documentElement.clientWidth || window.innerWidth;

function clampPosition(point: Position, width: number, height: number): Position {
  const maxX = Math.max(0, viewportWidth() - width);
  const inset = Math.min(8, maxX / 2);
  return {
    ...point,
    x: point.edge === 'left' ? inset
      : point.edge === 'right' ? maxX - inset
        : Math.max(0, Math.min(point.x, maxX)),
    y: Math.max(0, Math.min(point.y, window.innerHeight - height)),
  };
}

function dockPosition(point: Position, width: number, height: number): Position {
  const edge = point.edge === 'left' || point.edge === 'right'
    ? point.edge
    : point.x + width / 2 < viewportWidth() / 2 ? 'left' : 'right';
  return clampPosition({ ...point, edge }, width, height);
}

function readPosition(key: string): Position | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) ?? 'null') as Position | null;
    const size = launcherSize();
    return saved && Number.isFinite(saved.x) && Number.isFinite(saved.y) ? dockPosition(saved, size, size) : null;
  } catch {
    return null;
  }
}

export function ChatLauncher({ kind, label, hidden, buttonRef, hintTestId, onOpen }: {
  kind: LauncherKind;
  label: string;
  hidden?: boolean;
  buttonRef?: Ref<HTMLButtonElement>;
  hintTestId?: string;
  onOpen: (anchor: ChatAnchor) => void;
}) {
  const { t } = useTranslation();
  const storageKey = `halo.chat.launcher.${kind}`;
  const [position, setPosition] = useState(() => readPosition(storageKey));
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const swallowClick = useRef(false);
  const drag = useRef<{ id: number; start: Point; origin: DOMRect; latest: Point | null } | null>(null);

  useEffect(() => {
    const onResize = () => {
      const size = wrapper.current?.getBoundingClientRect();
      setPosition(current => current && clampPosition(current, size?.width || launcherSize(), size?.height || launcherSize()));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || drag.current) return;
    const origin = wrapper.current?.getBoundingClientRect();
    if (!origin) return;
    swallowClick.current = false;
    drag.current = { id: event.pointerId, start: { x: event.clientX, y: event.clientY }, origin, latest: null };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active || active.id !== event.pointerId) return;
    const dx = event.clientX - active.start.x;
    const dy = event.clientY - active.start.y;
    if (!active.latest && Math.hypot(dx, dy) < 6) return;
    const next = clampPosition({ x: active.origin.left + dx, y: active.origin.top + dy }, active.origin.width, active.origin.height);
    active.latest = next;
    setDragging(true);
    setPosition(next);
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active || active.id !== event.pointerId) return;
    drag.current = null;
    if (!active.latest) return;
    const released = event.type === 'pointerup' ? {
      x: active.origin.left + event.clientX - active.start.x,
      y: active.origin.top + event.clientY - active.start.y,
    } : active.latest;
    const docked = dockPosition(released, active.origin.width, active.origin.height);
    swallowClick.current = true;
    setPosition(docked);
    setDragging(false);
    setHovered(false);
    try { sessionStorage.setItem(storageKey, JSON.stringify(docked)); } catch { /* The position is still kept in this widget. */ }
  }

  if (hidden) return null;

  return createPortal(
    <div ref={wrapper} className={`fixed z-50 size-max select-none ${dragging ? '' : 'motion-safe:transition-[left] motion-safe:duration-200 motion-safe:ease-out'} ${position ? '' : defaultPosition[kind]}`}
      style={position ? { left: position.x, top: position.y } : undefined}>
      {hovered && !dragging && (
        <div aria-hidden="true" data-testid={hintTestId}
          className={`pointer-events-none absolute top-1/2 hidden -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-slate-200/90 bg-white/95 px-4 py-2 text-[13px] font-bold text-slate-900 shadow-lg backdrop-blur-md motion-safe:animate-in motion-safe:fade-in-50 sm:flex dark:border-zinc-700/80 dark:bg-[#1e1e22]/95 dark:text-white ${position && position.x < window.innerWidth / 2 ? 'left-full ml-3' : 'right-full mr-3'}`}>
          <Sparkles size={16} className="shrink-0 text-brand-primary" />
          {t('ai.chat.hoverPrompt')}
        </div>
      )}
      <button ref={buttonRef} type="button" aria-label={label}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag}
        onPointerCancel={endDrag} onLostPointerCapture={endDrag}
        onClick={event => {
          if (swallowClick.current && event.detail !== 0) {
            swallowClick.current = false;
            return;
          }
          const rect = wrapper.current?.getBoundingClientRect();
          if (!rect) return;
          const x = position?.edge ? position.x : rect.left;
          const y = position?.edge ? position.y : rect.top;
          setHovered(false);
          onOpen({
            x, y, width: rect.width, height: rect.height,
            horizontal: position?.edge ?? (x + rect.width / 2 < viewportWidth() / 2 ? 'left' : 'right'),
            vertical: y + rect.height / 2 < window.innerHeight / 2 ? 'below' : 'above',
          });
        }}
        className={`group grid size-13 touch-none place-items-center rounded-full border-2 border-white/80 bg-brand-primary p-1 shadow-[0_8px_28px_rgb(37,99,235,0.28)] focus-visible:outline-2 focus-visible:outline-brand-primary sm:size-14 dark:border-white/20 ${dragging ? 'cursor-grabbing' : 'cursor-grab transition-transform hover:scale-105 active:scale-95 motion-reduce:transition-none'}`}>
        <span className="grid size-full place-items-center overflow-hidden rounded-full bg-white p-0.5">
          <img src="/assets/brand/logo-ai.png" alt="" draggable={false}
            className="size-full scale-125 object-contain transition-transform group-hover:scale-135 motion-reduce:transition-none" />
        </span>
      </button>
    </div>,
    document.body,
  );
}
