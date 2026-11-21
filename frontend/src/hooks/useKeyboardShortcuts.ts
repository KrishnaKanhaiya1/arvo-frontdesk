import { useEffect } from 'react';

interface ShortcutHandlers {
  onJ?: () => void;
  onK?: () => void;
  onR?: () => void;
  onN?: () => void;
  onCmdEnter?: () => void;
  onQuestion?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
        target.isContentEditable;

      if (e.key === '?' && !isTyping) {
        e.preventDefault();
        handlers.onQuestion?.();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handlers.onCmdEnter?.();
        return;
      }

      if (isTyping) return;

      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        handlers.onJ?.();
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        handlers.onK?.();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handlers.onR?.();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        handlers.onN?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers, enabled]);
}
