import { useEffect, useState } from "react";

const LIMIT_HOUR = 11;
const LIMIT_MIN = 30;

function isBeforeCutoff(date = new Date()) {
  const h = date.getHours();
  const m = date.getMinutes();

  if (h < LIMIT_HOUR) return true;
  if (h > LIMIT_HOUR) return false;

  return m < LIMIT_MIN;
}

export function useOrderCutoff() {
  const [open, setOpen] = useState(isBeforeCutoff());

  useEffect(() => {
    const timer = setInterval(() => {
      setOpen(isBeforeCutoff());
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  return true;
}
