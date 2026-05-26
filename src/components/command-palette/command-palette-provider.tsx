"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CommandPaletteMode = "search" | "actions";

type CommandPaletteContextValue = {
  open: boolean;
  mode: CommandPaletteMode;
  openPalette: (mode?: CommandPaletteMode) => void;
  closePalette: () => void;
};

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(
  null,
);

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<CommandPaletteMode>("search");

  const openPalette = useCallback((nextMode: CommandPaletteMode = "search") => {
    setMode(nextMode);
    setOpen(true);
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
    setMode("search");
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (open) {
          closePalette();
        } else {
          openPalette("search");
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closePalette, open, openPalette]);

  const value = useMemo(
    () => ({ open, mode, openPalette, closePalette }),
    [closePalette, mode, open, openPalette],
  );

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette() {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error("useCommandPalette must be used within CommandPaletteProvider");
  }
  return context;
}
