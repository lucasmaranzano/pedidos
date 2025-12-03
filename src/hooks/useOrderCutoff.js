import { useEffect, useMemo, useState } from "react";

const DEFAULT_CUTOFF = { hour: 11, minute: 30 };

function isBeforeCutoff(cutoff, date = new Date()) {
  const h = date.getHours();
  const m = date.getMinutes();
  const limitH = Number(cutoff?.hour ?? DEFAULT_CUTOFF.hour);
  const limitM = Number(cutoff?.minute ?? DEFAULT_CUTOFF.minute);

  if (h < limitH) return true;
  if (h > limitH) return false;
  return m < limitM;
}

export function useOrderCutoff(cutoffFromSettings) {
  const cutoff = useMemo(
    () => ({
      hour: cutoffFromSettings?.hour ?? DEFAULT_CUTOFF.hour,
      minute: cutoffFromSettings?.minute ?? DEFAULT_CUTOFF.minute,
    }),
    [cutoffFromSettings]
  );

  const [open, setOpen] = useState(() => isBeforeCutoff(cutoff));

  useEffect(() => {
    const update = () => setOpen(isBeforeCutoff(cutoff));
    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, [cutoff]);

  return { isOpen: open, cutoff };
}
