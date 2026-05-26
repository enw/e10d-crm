import { useEffect, useRef, type RefObject } from "react";

import { handleCalendarKeyboardEvent } from "@/lib/calendar/keyboard-nav";

type CalendarControlsPlugin = {
  setDate: (date: Temporal.PlainDate) => void;
};

type UseCalendarKeyboardNavOptions = {
  enabled: boolean;
  currentView: string;
  panelOpen: boolean;
  controlsPlugin: CalendarControlsPlugin;
  selectedDateRef: RefObject<Temporal.PlainDate>;
};

export function useCalendarKeyboardNav({
  enabled,
  currentView,
  panelOpen,
  controlsPlugin,
  selectedDateRef,
}: UseCalendarKeyboardNavOptions) {
  const currentViewRef = useRef(currentView);
  const panelOpenRef = useRef(panelOpen);

  currentViewRef.current = currentView;
  panelOpenRef.current = panelOpen;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const selectedDate = selectedDateRef.current;
      if (!selectedDate) {
        return;
      }

      handleCalendarKeyboardEvent(event, {
        panelOpen: panelOpenRef.current,
        currentView: currentViewRef.current,
        selectedDate,
        onDateChange: (date) => {
          selectedDateRef.current = date;
          controlsPlugin.setDate(date);
        },
      });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, controlsPlugin, selectedDateRef]);
}
