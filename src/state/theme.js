import { useSyncExternalStore } from "react";

/*
 * Light/dark theme. The choice lives on <html data-theme> (set before first paint
 * by the inline script in index.html) and in localStorage. Dark is the default,
 * so a visitor who never switches sees the app as designed.
 */
const STORAGE_KEY = "barbican-theme";
const listeners = new Set();

const read = () => (document.documentElement.dataset.theme === "light" ? "light" : "dark");

export function setTheme(theme) {
  const root = document.documentElement;
  // Let colours ease across the switch, then drop the transition so it never
  // slows down ordinary hovers.
  root.classList.add("theme-switching");
  window.setTimeout(() => root.classList.remove("theme-switching"), 300);

  if (theme === "light") root.dataset.theme = "light";
  else delete root.dataset.theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage blocked (private mode): the switch still applies for this visit.
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, read);
  return { theme, toggleTheme: () => setTheme(theme === "light" ? "dark" : "light") };
}

/* Recharts draws SVG attributes, which cannot read CSS variables. */
export const chartColors = {
  dark: {
    tick: "#52525b",
    grid: "rgba(255,255,255,0.04)",
    cursor: "rgba(255,255,255,0.03)",
    entries: "#8b5cf6",
    exits: "#a3e635",
  },
  light: {
    tick: "#71717a",
    grid: "rgba(9,9,11,0.06)",
    cursor: "rgba(9,9,11,0.04)",
    entries: "#8b5cf6",
    exits: "#65a30d",
  },
};
