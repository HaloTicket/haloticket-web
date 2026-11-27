import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

export interface ChatAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
  horizontal: 'left' | 'right';
  vertical: 'above' | 'below';
}

export function ChatWindow({ label, isOpen, isExpanded, onExited, anchor, className = '', children }: {
  label: string;
  isOpen: boolean;
  isExpanded: boolean;
  onExited: () => void;
  anchor?: ChatAnchor;
  className?: string;
  children: ReactNode;
}) {
  const windowRef = useRef<HTMLDivElement>(null);
  const position = anchor ? {
    '--chat-anchor-right': anchor.horizontal === 'left'
      ? `calc(100% - ${anchor.x}px - var(--chat-width))`
      : `calc(100% - ${anchor.x + anchor.width}px)`,
    '--chat-anchor-bottom': anchor.vertical === 'above'
      ? `calc(100dvh - ${anchor.y}px + 10px)`
      : `calc(100dvh - ${anchor.y + anchor.height}px - var(--chat-height) - 10px)`,
    '--chat-anchor-space': anchor.vertical === 'above'
      ? `${anchor.y - 18}px`
      : `calc(100dvh - ${anchor.y + anchor.height + 18}px)`,
    '--chat-anchor-origin': `${anchor.vertical === 'above' ? 'bottom' : 'top'} ${anchor.horizontal}`,
  } as CSSProperties : undefined;

  useEffect(() => {
    const element = windowRef.current;
    if (isOpen || !element) return;
    const handleExit = (event: AnimationEvent) => {
      if (event.target === element) onExited();
    };
    element.addEventListener('animationend', handleExit);
    return () => element.removeEventListener('animationend', handleExit);
  }, [isOpen, onExited]);

  return (
    <div
      ref={windowRef}
      role="dialog"
      aria-label={label}
      aria-hidden={!isOpen || undefined}
      inert={!isOpen}
      data-state={isOpen ? 'open' : 'closing'}
      data-expanded={isExpanded}
      style={position}
      className={`ai-chat-window fixed z-100 flex flex-col overflow-hidden border border-gray-200 bg-white shadow-[0_12px_40px_rgb(0,0,0,0.18)] dark:border-gray-700/80 dark:bg-[#18181b] dark:shadow-[0_12px_40px_rgb(0,0,0,0.6)] ${className}`}
    >
      {children}
    </div>
  );
}
