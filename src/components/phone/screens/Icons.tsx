import type { IconName } from "@/lib/appScreens";

/** 24pt line icons, 1.6pt stroke, SF Symbols style. Decorative: always aria-hidden. */
const PATHS: Record<IconName, string> = {
  send: "M7 17L17 7M9 7h8v8",
  request: "M17 7L7 17M15 17H7V9",
  contactless: "M7.5 9.5a3.5 3.5 0 0 1 0 5M11 7a7 7 0 0 1 0 10M14.5 4.5a10.5 10.5 0 0 1 0 15",
  sprout: "M12 20.5V12M12 12c0-4.2 2.8-6.5 7-6.5 0 4.2-2.8 6.5-7 6.5zM12 14.5c0-3.3-2.3-5.5-6-5.5 0 3.3 2.3 5.5 6 5.5z",
  bell: "M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15zM10 20.5a2 2 0 0 0 4 0",
  scan: "M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M8 12h8",
  back: "M15 5l-7 7 7 7",
  chevron: "M9.5 6l6 6-6 6",
  close: "M6.5 6.5l11 11M17.5 6.5l-11 11",
  star: "M12 3.8l2.5 5.1 5.6.8-4 4 .9 5.6-5-2.6-5 2.6.9-5.6-4-4 5.6-.8z",
  shield: "M12 3l7 3v5c0 4.6-3 8.1-7 10-4-1.9-7-5.4-7-10V6zM9 12l2.2 2.2L15.2 10",
  bolt: "M13.2 2.8L5.5 13.4h5.8l-1 7.8 7.7-10.6h-5.8z",
  home: "M4 10.4L12 4l8 6.4V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z",
  card: "M4.5 5h15A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-11A1.5 1.5 0 0 1 4.5 5zM3 9.5h18M7 15h4",
  percent: "M18 6L6 18M7.5 9.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16.5 18.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c.8-3.8 3.8-6 7.5-6s6.7 2.2 7.5 6",
  chart: "M5 20v-6M10 20V9M15 20v-4M20 20V5",
  doc: "M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v4h4M9 12h6M9 16h6",
  faceid: "M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M9 9v1.5M15 9v1.5M12 9v4h-1M9.5 16a3.6 3.6 0 0 0 5 0",
  swap: "M7 4v15M4 16l3 3 3-3M17 20V5M14 8l3-3 3 3",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5V12l3 2",
  lock: "M7 10.5h10a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19v-7A1.5 1.5 0 0 1 7 10.5zM8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5",
  pause: "M9 6.5v11M15 6.5v11",
  eyeoff: "M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM4.5 4.5l15 15",
  key: "M15 4a5 5 0 1 1-4.5 7.2L4 17.7V20h3v-2h2v-2h2l.8-.8M16 8h.01",
  wallet: "M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3M4 7.5v10A2.5 2.5 0 0 0 6.5 20H20V8H6.5A2.5 2.5 0 0 1 4 5.5M16 14h.01",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM18 14h2M14 18v2",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4",
  check: "M5.5 12.5l4 4L18.5 7.5",
  plus: "M12 5v14M5 12h14",
  people: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.8c1.9.8 3.1 2.6 3.5 5.2",
  split: "M12 21v-7L6 8M12 14l6-6M5 4h4M5 4v4M19 4h-4M19 4v4",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6",
  refund: "M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3",
  tag: "M3.5 12.5v-8a1 1 0 0 1 1-1h8l8 8-9 9zM8 8h.01",
  bridge: "M3 17h18M5 17v-6.5M19 17v-6.5M3 10c3.5 0 5.5-3 9-3s5.5 3 9 3M12 7v10",
  code: "M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4.5l-3 15",
  agent: "M7 8h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM12 8V5M12 4.5h.01M9.5 12.5h.01M14.5 12.5h.01M9.5 15.5h5",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z",
  gauge: "M4 17a8 8 0 1 1 16 0M12 17l4-5",
  layers: "M12 3.5l9 5-9 5-9-5zM3 12.5l9 5 9-5M3 16.5l9 5 9-5",
  book: "M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5zM5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3",
  flask: "M9.5 3h5M10 3v6l-5.5 9.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3M7.5 15h9",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  more: "M6 12h.01M12 12h.01M18 12h.01",
  repeat: "M17 2.5l3 3-3 3M4 11.5v-1a5 5 0 0 1 5-5h11M7 21.5l-3-3 3-3M20 12.5v1a5 5 0 0 1-5 5H4",
  hold: "M7 3h10M7 21h10M8 3c0 4.5 8 4.5 8 9s-8 4.5-8 9M16 3c0 4.5-8 4.5-8 9s8 4.5 8 9",
  badge:
    "M12 2.5l2.4 1.8 3-.1.9 2.8 2.5 1.7-1 2.8 1 2.8-2.5 1.7-.9 2.8-3-.1L12 21.5l-2.4-1.8-3 .1-.9-2.8-2.5-1.7 1-2.8-1-2.8L5.7 8l.9-2.8 3 .1zM8.5 12l2.5 2.5 4.5-5",
  drop: "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z",
  scale: "M12 4v16M5 20h14M5 5h14M4 10l3-5 3 5a3 3 0 0 1-6 0zM14 10l3-5 3 5a3 3 0 0 1-6 0z",
};

/** Icons that read better filled (the active tab, the bolt). */
const SOLID: ReadonlySet<IconName> = new Set(["bolt"]);

export function Icon({ name, className, solid }: { name: IconName; className?: string; solid?: boolean }) {
  const fill = solid || SOLID.has(name);
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d={PATHS[name]}
        fill={fill ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={name === "more" ? 2.6 : fill ? 1 : 1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** iOS status bar glyphs: signal, wifi, battery. */
export function StatusGlyphs({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 66 12" aria-hidden="true" focusable="false">
      <rect x="0" y="7.5" width="3" height="4.5" rx="0.9" fill="currentColor" />
      <rect x="4.6" y="5.2" width="3" height="6.8" rx="0.9" fill="currentColor" />
      <rect x="9.2" y="2.8" width="3" height="9.2" rx="0.9" fill="currentColor" />
      <rect x="13.8" y="0.3" width="3" height="11.7" rx="0.9" fill="currentColor" />
      <path d="M29.5 3.4a9.6 9.6 0 0 1 13 0l-1.5 1.6a7.4 7.4 0 0 0-10 0zM32.3 6.3a5.4 5.4 0 0 1 7.4 0L36 10.1z" fill="currentColor" />
      <rect x="47.5" y="0.8" width="16" height="10.4" rx="3" fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" />
      <rect x="49" y="2.3" width="13" height="7.4" rx="1.7" fill="currentColor" />
      <path d="M64.6 4.3v3.4a1.8 1.8 0 0 0 0-3.4z" fill="currentColor" fillOpacity="0.4" />
    </svg>
  );
}
