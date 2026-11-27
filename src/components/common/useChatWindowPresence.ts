import { useCallback, useEffect, useState } from 'react';

export function useChatWindowPresence() {
  const [state, setState] = useState<'closed' | 'open' | 'closing'>('closed');
  const openWindow = useCallback(() => setState('open'), []);
  const closeWindow = useCallback(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    setState(current => current === 'open' ? (reduceMotion ? 'closed' : 'closing') : current);
  }, []);
  const finishClose = useCallback(() => setState(current => current === 'closing' ? 'closed' : current), []);

  useEffect(() => {
    if (state !== 'closing') return;
    // Also remove the window if the browser cancels its exit animation.
    const timer = window.setTimeout(finishClose, 240);
    return () => window.clearTimeout(timer);
  }, [state, finishClose]);

  return { isOpen: state === 'open', isPresent: state !== 'closed', openWindow, closeWindow, finishClose };
}
