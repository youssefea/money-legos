"use client";

import { BY_ID, describeFakeApp, type FakeApp } from "@/lib";
import FakeTile from "./FakeTile";
import styles from "./FakePhone.module.css";

export type FakePhoneProps = {
  app: FakeApp;
  /** Dashed slots shown above the tiles, waiting for the next bricks. */
  slots: number;
  /** Tile elements by Lego id, for the connector lines. */
  tileRef?: (id: string, el: HTMLLIElement | null) => void;
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

/**
 * A CSS phone showing the fake app the stack builds: one tile per brick, top brick first. With no
 * bricks it shows a faint wireframe and dashed slots. The phone is a labelled region; the tiles are
 * real text, the frame and studs are decorative.
 */
export default function FakePhone({ app, slots, tileRef, className }: FakePhoneProps) {
  const empty = app.tiles.length === 0;
  return (
    <div className={[styles.slot, className].filter(Boolean).join(" ")}>
      <section className={styles.device} role="region" aria-label={empty ? "Your app preview, empty" : describeFakeApp(app)} data-testid="phone">
        <div className={styles.screen}>
          <div className={styles.island} aria-hidden="true" />
          <div className={styles.status} aria-hidden="true">
            <span>9:41</span>
            <StatusIcons />
          </div>
          <div className={styles.appbar} data-empty={empty || undefined}>
            {empty ? (
              <>
                <span className={styles.skelCoin} aria-hidden="true" />
                <span className={styles.skelBar} aria-hidden="true" />
              </>
            ) : (
              <>
                <span className={styles.logo} aria-hidden="true">
                  A
                </span>
                <span className={styles.brand} data-testid="phone-brand">
                  {app.brand}
                </span>
              </>
            )}
            <span className={styles.menu} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </div>
          <ol className={styles.tiles} aria-label="Screens">
            {Array.from({ length: slots }, (_, i) => (
              <li key={`slot-${i}`} className={styles.placeholder} aria-hidden="true" data-slot>
                <span className={styles.studs}>
                  {Array.from({ length: 8 }, (_, j) => (
                    <i key={j} />
                  ))}
                </span>
                <span className={styles.skelLine} />
                <span className={styles.skelLine} data-short />
              </li>
            ))}
            {app.tiles.map((t) => (
              <FakeTile key={t.legoId} tile={t} studs={BY_ID[t.legoId].size[0] * 2} refCb={tileRef ? (el) => tileRef(t.legoId, el) : undefined} />
            ))}
          </ol>
          <div className={styles.home} aria-hidden="true" />
        </div>
      </section>
    </div>
  );
}
