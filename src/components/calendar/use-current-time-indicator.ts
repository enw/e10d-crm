import { useEffect, useState, type RefObject } from "react";

function getCurrentTimeGridPercent(
  now: Temporal.ZonedDateTime = Temporal.Now.zonedDateTimeISO(),
) {
  const timePoints = now.hour * 100 + now.minute;
  return (timePoints / 2400) * 100;
}

export function syncCurrentTimeLines(root: HTMLElement) {
  const now = Temporal.Now.zonedDateTimeISO();
  const todayStr = now.toPlainDate().toString();
  const percent = getCurrentTimeGridPercent(now);

  for (const line of root.querySelectorAll(".crm-now-line")) {
    const parent = line.parentElement;
    if (
      !(parent instanceof HTMLElement) ||
      parent.dataset.timeGridDate !== todayStr
    ) {
      line.remove();
    }
  }

  for (const dayEl of root.querySelectorAll(
    `.sx__time-grid-day[data-time-grid-date="${todayStr}"]`,
  )) {
    if (!(dayEl instanceof HTMLElement)) {
      continue;
    }

    let line = dayEl.querySelector(".crm-now-line");
    if (!(line instanceof HTMLElement)) {
      line = document.createElement("div");
      line.className = "crm-now-line";
      line.setAttribute("aria-hidden", "true");
      dayEl.appendChild(line);
    }
    line.style.top = `${percent}%`;
  }
}

export function useCurrentTimeIndicator(
  rootRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const tick = () => setNowMs(Date.now());
    tick();
    const intervalId = window.setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [enabled]);

  useEffect(() => {
    const root = rootRef.current;
    if (!enabled || !root) {
      return;
    }

    syncCurrentTimeLines(root);
    const observer = new MutationObserver(() => syncCurrentTimeLines(root));
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      root.querySelectorAll(".crm-now-line").forEach((line) => line.remove());
    };
  }, [enabled, nowMs, rootRef]);
}
