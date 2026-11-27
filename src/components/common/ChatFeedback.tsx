import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { Lightbulb } from 'lucide-react';

interface ChatSuggestionBarProps {
  questions: string[];
  label: string;
  ariaLabel?: string;
  onSelect: (question: string) => void;
  disabled: boolean;
  testIdPrefix: string;
  columnClassName: string;
  wrap?: boolean;
}

export function ChatSuggestionBar({
  questions, label, ariaLabel, onSelect, disabled, testIdPrefix, columnClassName, wrap = false,
}: ChatSuggestionBarProps) {
  const questionKey = JSON.stringify(questions);
  const suggestionsScrollRef = useRef<HTMLDivElement>(null);
  const suggestionsDragRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startScrollLeft: number;
    moved: boolean;
  }>({ active: false, pointerId: null, startX: 0, startScrollLeft: 0, moved: false });
  const suppressSuggestionClickRef = useRef(false);
  const suppressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDraggingSuggestions, setIsDraggingSuggestions] = useState(false);

  useEffect(() => {
    if (suggestionsScrollRef.current) {
      suggestionsScrollRef.current.scrollLeft = 0;
    }
  }, [questionKey]);

  useEffect(() => {
    return () => {
      if (suppressTimerRef.current) {
        clearTimeout(suppressTimerRef.current);
      }
    };
  }, []);

  const handleSuggestionsPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (wrap || e.button !== 0 || e.pointerType === 'touch') return;
      suggestionsDragRef.current = {
        active: true,
        pointerId: e.pointerId,
        startX: e.clientX,
        startScrollLeft: e.currentTarget.scrollLeft,
        moved: false,
      };
    },
    [wrap],
  );

  const handleSuggestionsPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const drag = suggestionsDragRef.current;
    if (!drag.active) return;
    const deltaX = e.clientX - drag.startX;
    if (!drag.moved && Math.abs(deltaX) > 4) {
      drag.moved = true;
      suppressSuggestionClickRef.current = true;
      setIsDraggingSuggestions(true);
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } catch {
        // ignore if pointer capture is unavailable in synthetic tests
      }
    }
    if (drag.moved) {
      e.currentTarget.scrollLeft = drag.startScrollLeft - deltaX;
      e.preventDefault();
    }
  }, []);

  const handleSuggestionsPointerEnd = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const drag = suggestionsDragRef.current;
    if (!drag.active) return;
    if (drag.moved) {
      try {
        if (drag.pointerId !== null && e.currentTarget.hasPointerCapture?.(drag.pointerId)) {
          e.currentTarget.releasePointerCapture?.(drag.pointerId);
        }
      } catch {
        // ignore
      }
      if (suppressTimerRef.current) {
        clearTimeout(suppressTimerRef.current);
      }
      suppressTimerRef.current = setTimeout(() => {
        suppressSuggestionClickRef.current = false;
      }, 0);
    }
    suggestionsDragRef.current = {
      active: false,
      pointerId: null,
      startX: 0,
      startScrollLeft: 0,
      moved: false,
    };
    setIsDraggingSuggestions(false);
  }, []);

  const handleSuggestionsClickCapture = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (suppressSuggestionClickRef.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressSuggestionClickRef.current = false;
    }
  }, []);

  return (
    <div className="shrink-0 bg-gray-50/80 dark:bg-[#18181b]/90 border-t border-gray-100 dark:border-gray-800">
      <div
        data-testid={`${testIdPrefix}-suggested-questions`}
        role={ariaLabel ? 'group' : undefined}
        aria-label={ariaLabel}
        className={`${columnClassName} px-3 py-2 flex ${wrap ? 'items-start' : 'items-center'} gap-2`}
      >
        <div
          data-testid={`${testIdPrefix}-suggestions-label`}
          className={`inline-flex items-center gap-1 shrink-0 text-[11px] font-semibold text-brand-primary dark:text-blue-400 select-none ${wrap ? 'pt-1' : ''}`}
        >
          <Lightbulb
            size={14}
            className="text-brand-primary dark:text-blue-400 shrink-0"
            aria-hidden="true"
          />
          <span>{label}</span>
        </div>
        <div
          ref={suggestionsScrollRef}
          data-testid={`${testIdPrefix}-suggested-questions-scroll`}
          onPointerDown={handleSuggestionsPointerDown}
          onPointerMove={handleSuggestionsPointerMove}
          onPointerUp={handleSuggestionsPointerEnd}
          onPointerCancel={handleSuggestionsPointerEnd}
          onClickCapture={handleSuggestionsClickCapture}
          onDragStart={(e) => e.preventDefault()}
          className={`min-w-0 flex-1 flex items-center gap-1.5 ${
            wrap
              ? 'flex-wrap'
              : `flex-nowrap overflow-x-auto no-scrollbar select-none ${
                  isDraggingSuggestions ? 'cursor-grabbing' : 'cursor-grab'
                }`
          }`}
        >
          {questions.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => onSelect(question)}
              disabled={disabled}
              className={`${
                wrap ? 'max-w-full whitespace-normal' : 'whitespace-nowrap shrink-0'
              } rounded-xl border border-gray-200 bg-white px-2.5 py-1 text-left text-[11px] font-medium text-brand-primary transition-colors hover:bg-brand-primary/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-primary disabled:opacity-50 ${
                isDraggingSuggestions ? 'cursor-grabbing' : 'cursor-pointer'
              } dark:border-gray-700 dark:bg-[#27272a] dark:text-brand-accent`}
            >
              {question}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ChatTypingBubble({ status, testId }: {
  status: string;
  testId?: string;
}) {
  return (
    <div data-testid={testId} className="ai-chat-typing-bubble mb-3.5 flex items-start justify-start">
      <div className="mt-0.5 mr-2 flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-brand-primary/75">
        <img src="/assets/brand/logo-ai.png" alt="" className="size-full scale-[1.08] object-cover" />
      </div>
      <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-gray-100 bg-white px-3.5 py-2.5 shadow-xs dark:border-gray-800 dark:bg-[#1e1e22]">
        <div className="flex items-center gap-1.5 py-1" aria-hidden="true">
          <span className="ai-typing-dot" />
          <span className="ai-typing-dot" />
          <span className="ai-typing-dot" />
        </div>
        <span role="status" className="sr-only">{status}</span>
      </div>
    </div>
  );
}
