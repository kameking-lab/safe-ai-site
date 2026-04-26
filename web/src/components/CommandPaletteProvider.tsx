'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { CommandPalette } from './CommandPalette';

interface CommandPaletteContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue>({
  isOpen: false,
  open: () => {},
  close: () => {},
});

export function useCommandPalette() {
  return useContext(CommandPaletteContext);
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <CommandPaletteContext.Provider value={{ isOpen, open, close }}>
      {children}
      {isOpen && <CommandPalette onClose={close} />}
    </CommandPaletteContext.Provider>
  );
}
