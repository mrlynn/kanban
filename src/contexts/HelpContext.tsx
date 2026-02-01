'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { HelpModal } from '@/components/Help/HelpModal';

interface HelpContextValue {
  openHelp: () => void;
  closeHelp: () => void;
  isOpen: boolean;
}

const HelpContext = createContext<HelpContextValue | null>(null);

export function HelpProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openHelp = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeHelp = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Cmd+/ or Ctrl+/ to toggle help
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      // Cmd+Shift+? as alternative
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '?') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      // F1 for help (common convention)
      if (e.key === 'F1') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      // Single ? key when not in an input
      if (e.key === '?' && !isInput) {
        e.preventDefault();
        setIsOpen(true);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <HelpContext.Provider value={{ openHelp, closeHelp, isOpen }}>
      {children}
      <HelpModal open={isOpen} onClose={closeHelp} />
    </HelpContext.Provider>
  );
}

export function useHelp() {
  const context = useContext(HelpContext);
  if (!context) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return context;
}
