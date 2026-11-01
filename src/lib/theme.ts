/**
 * Light for everyone; dark only when the user picks it with the header toggle. The OS setting is ignored.
 * The choice lives in localStorage ("ml-theme") and shows as data-theme on <html>; THEME_SCRIPT in the
 * layout applies it before first paint.
 */
export type Theme = "light" | "dark";

export const THEME_KEY = "ml-theme";
export const THEME_EVENT = "ml-theme-change";
export const THEME_COLOR: Record<Theme, string> = { light: "#ffffff", dark: "#0a0b0d" };

/**
 * Runs in <head> before paint (static export safe): sets data-theme from the stored choice and adds the
 * theme-color meta. The meta is owned here and by setTheme, not by Next metadata, so hydration never
 * re-adds a light one over a dark choice.
 */
export const THEME_SCRIPT = `(function(){var t="light";try{if(localStorage.getItem("${THEME_KEY}")==="dark")t="dark"}catch(e){}document.documentElement.setAttribute("data-theme",t);var m=document.createElement("meta");m.name="theme-color";m.content=t==="dark"?"${THEME_COLOR.dark}":"${THEME_COLOR.light}";document.head.appendChild(m)})()`;
