"use client";

import { describeFakeApp, tileRoles, type FakeApp, type LegoId } from "@/lib";
import FakeTile from "./FakeTile";
import styles from "./FakePhone.module.css";

/** wire = bricks placed but the app is not built yet (wireframe tiles); live = built. */
export type PhonePhase = "wire" | "live";

export type FakePhoneProps = {
  app: FakeApp;
  phase: PhonePhase;
  /** Bumps on every Build: the screen boots again (dark flash, app bar, tiles top to bottom). */
  boot: number;
  /** Faint empty wireframe slots under the tiles, waiting for more bricks. */
  slots: number;
  /** Tile elements by brick id, for the connector lines. */
  tileRef?: (id: string, el: HTMLLIElement | null) => void;
  /** The brick being inspected (hover/focus on a tile or its brick), highlighted everywhere. */
  inspect?: LegoId | null;
  onInspect?: (id: LegoId | null) => void;
  /** No device frame: the sheet on phones is the screen. */
  frameless?: boolean;
  className?: string;
};

const StatusIcons = () => (
  <svg className={styles.sbIcons} viewBox="0 0 54 12" aria-hidden="true">
    <rect x="0" y="7" width="3" height="5" rx="1" />
    <rect x="5" y="5" width="3" height="7" rx="1" />
    <rect x="10" y="2.5" width="3" height="9.5" rx="1" />
    <rect x="15" y="0" width="3" height="12" rx="1" />
    <path d="M28 3.2a9 9 0 0 1 12 0l-1.6 1.7a6.6 6.6 0 0 0-8.8 0zM30.8 6.2a5 5 0 0 1 6.4 0L34 9.8z" />
    <rect x="44" y="1" width="9" height="10" rx="2.6" fill="none" stroke="currentColor" strokeWidth="1.2" />
    <rect x="45.8" y="2.8" width="5.4" height="6.4" rx="1.2" />
  </svg>
);

const TAB_ICONS = [
  "M3 9.5L10 4l7 5.5V16a1 1 0 0 1-1 1h-3.5v-4.5h-5V17H4a1 1 0 0 1-1-1z",
  "M3 6.5h14v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM3 6.5l1.6-3h10.8l1.6 3M7 10.5h6",
  "M4 15.5l3.5-4 3 2.5 5.5-7",
  "M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4.5 17c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5",
];

/**
 * The fake phone: one tile per brick, top brick first. Before Build app the tiles are wireframes
 * (brick strip and studs, a short title, grey bars); after it the screen boots into the real fake app.
 * The phone is a labelled region; tiles are real text; the frame, studs and fake buttons are inert.
 */
export default function FakePhone({ app, phase, boot, slots, tileRef, inspect = null, onInspect, frameless, className }: FakePhoneProps) {
  const empty = app.tiles.length === 0;
  const live = phase === "live" && !empty;
  const roles = tileRoles(app.tiles);
  const label = empty ? "Your app preview, empty" : live ? describeFakeApp(app) : `Your app preview, ${app.tiles.length} ${app.tiles.length === 1 ? "brick" : "bricks"}, not built yet`;
  return (
    <div className={[styles.slot, frameless ? styles.frameless : undefined, className].filter(Boolean).join(" ")}>
      <section className={styles.device} role="region" aria-label={label} data-testid="phone" data-phase={live ? "live" : empty ? "empty" : "wire"}>
        {/* A new key per build restarts the boot animation. */}
        <div key={live ? `live-${boot}` : "wire"} className={styles.screen} data-boot={live && boot > 0 ? "true" : undefined}>
          {!frameless && (
            <>
              <div className={styles.island} aria-hidden="true" />
              <div className={styles.status} aria-hidden="true">
                <span>9:41</span>
                <StatusIcons />
              </div>
            </>
          )}
          <div className={styles.appbar} data-live={live || undefined}>
            {live ? (
              <>
                <span className={styles.logo} aria-hidden="true">
                  A
                </span>
                <span className={styles.brand} data-testid="phone-brand">
                  {app.brand}
                </span>
              </>
            ) : (
              <>
                <span className={styles.skelCoin} aria-hidden="true" />
                <span className={styles.skelBar} aria-hidden="true" />
              </>
            )}
            <span className={styles.avatar} aria-hidden="true" />
          </div>
          <ol className={styles.tiles} aria-label="Screens">
            {app.tiles.map((t, i) => (
              <FakeTile
                key={t.legoId}
                tile={t}
                role={roles[i]!}
                index={i}
                wire={!live}
                inspected={inspect === t.legoId}
                onInspect={onInspect}
                refCb={tileRef ? (el) => tileRef(t.legoId, el) : undefined}
              />
            ))}
            {Array.from({ length: slots }, (_, i) => (
              <li key={`slot-${i}`} className={styles.placeholder} aria-hidden="true" data-slot data-big={(empty && i === 0) || undefined}>
                <span className={styles.skelLine} />
                <span className={styles.skelLine} data-short />
              </li>
            ))}
          </ol>
          <div className={styles.tabbar} aria-hidden="true" data-live={live || undefined}>
            {TAB_ICONS.map((d, i) => (
              <svg key={d} viewBox="0 0 20 20" data-on={i === 0 || undefined}>
                <path d={d} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ))}
          </div>
          {!frameless && <div className={styles.home} aria-hidden="true" />}
        </div>
      </section>
    </div>
  );
}
