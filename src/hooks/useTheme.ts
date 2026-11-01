"use client";

import { useSyncExternalStore } from "react";
import { THEME_COLOR, THEME_EVENT, THEME_KEY, type Theme } from "@/lib/theme";

export type { Theme };

function readTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  // Another tab changed the choice: follow it.
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_KEY) applyTheme(e.newValue === "dark" ? "dark" : "light", false);
  };
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function applyTheme(theme: Theme, persist: boolean) {
  document.documentElement.setAttribute("data-theme", theme);
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = THEME_COLOR[theme];
  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Storage blocked: the choice lasts for this page only.
    }
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

/** Switch the theme now (CSS, the board, connectors and phone all follow) and remember it. */
export function setTheme(theme: Theme) {
  applyTheme(theme, true);
}

/** The current theme, live. "light" during prerender and hydration. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, readTheme, () => "light");
}

export const useDark = () => useTheme() === "dark";
