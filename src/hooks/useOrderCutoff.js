import { useEffect, useMemo, useState } from "react";

const DEFAULT_WINDOW = {
  start: { hour: 9, minute: 0 },
  cutoff: { hour: 11, minute: 30 },
};

function toMinutes({ hour, minute }) {
  const h = Number(hour ?? 0);
  const m = Number(minute ?? 0);
  return h * 60 + m;
}

function getState(windowRange, date = new Date()) {
  const now = date.getHours() * 60 + date.getMinutes();
  const startMin = toMinutes(windowRange.start);
  const endMin = toMinutes(windowRange.cutoff);

  if (now < startMin) return "before";
  if (now >= endMin) return "after";
  return "open";
}

export function useOrderCutoff(windowFromSettings) {
  const windowRange = useMemo(() => {
    return {
      start: {
        hour: windowFromSettings?.start?.hour ?? DEFAULT_WINDOW.start.hour,
        minute: windowFromSettings?.start?.minute ?? DEFAULT_WINDOW.start.minute,
      },
      cutoff: {
        hour: windowFromSettings?.cutoff?.hour ?? DEFAULT_WINDOW.cutoff.hour,
        minute:
          windowFromSettings?.cutoff?.minute ?? DEFAULT_WINDOW.cutoff.minute,
      },
    };
  }, [windowFromSettings]);

  const [state, setState] = useState(() => getState(windowRange));

  useEffect(() => {
    const update = () => setState(getState(windowRange));
    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, [windowRange]);

  return {
    isOpen: state === "open",
    state, // "before" | "open" | "after"
    start: windowRange.start,
    cutoff: windowRange.cutoff,
  };
}
