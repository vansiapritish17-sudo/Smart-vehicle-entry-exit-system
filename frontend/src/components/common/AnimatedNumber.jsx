import { useEffect, useRef, useState } from "react";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Counts to a new value instead of jumping, so a live change is noticed.
 * The first value renders as-is; only later changes animate.
 */
export default function AnimatedNumber({ value, duration = 700, className = "" }) {
  const target = Number(value) || 0;
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);

  useEffect(() => {
    const from = shownRef.current;
    if (from === target) return;
    if (reducedMotion()) {
      shownRef.current = target;
      setShown(target);
      return;
    }
    const start = performance.now();
    let frame;
    const step = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = Math.round(from + (target - from) * eased);
      shownRef.current = next;
      setShown(next);
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return <span className={`tabular-nums ${className}`}>{shown}</span>;
}
