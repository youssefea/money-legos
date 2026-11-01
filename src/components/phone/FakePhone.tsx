"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import type { FakeApp, LegoId } from "@/lib";
import { describeScreen, screenModel } from "@/lib/appScreens";
import { StatusGlyphs } from "./screens/Icons";
import { ScreenCtx, type ScreenCtxValue } from "./screens/Kit";
import { AppScreen } from "./screens/Screens";
import sc from "./screens/Screen.module.css";
import styles from "./FakePhone.module.css";

/** wire = bricks placed but the app is not built yet (a skeleton of the screen); live = built. */
export type PhonePhase = "wire" | "live";

export type FakePhoneProps = {
  app: FakeApp;
  phase: PhonePhase;
  /** Bumps on every Build: the screen boots again (dark hold, shell, regions top to bottom). */
  boot: number;
  /** Play the boot. False: show the built app at once (a shared link). */
  play?: boolean;
  /** Region elements by brick id, for the connector lines. */
  tileRef?: (id: string, el: HTMLElement | null) => void;
  /** The brick being inspected (hover/focus on a region or its brick), highlighted everywhere. */
  inspect?: LegoId | null;
  onInspect?: (id: LegoId | null) => void;
  /** No device frame: the sheet on phones is the screen. */
  frameless?: boolean;
  className?: string;
};

/**
 * Densities, loosest first: 1 tightens the gaps, 2 the rows and cards, 3 drops optional shell (range
 * picker, sample items, the revenue bars), 4 shrinks the hero and rows, 5 is the tightest rhythm.
 */
const DENSITIES = ["0", "1", "2", "3", "4", "5"] as const;

/**
 * The fake phone: ONE coherent app screen picked from the stack (neobank, checkout, trade, earn,
 * payroll, agent dashboard or onboarding), where each brick fills one region. Before Build app the
 * same screen is a skeleton; an empty board shows a neobank skeleton. The screen never scrolls: it
 * picks the loosest density at which every region fits. The phone is a labelled region; regions are
 * real text; the frame, icons and fake buttons are inert.
 */
export default function FakePhone({ app, phase, boot, play = true, tileRef, inspect = null, onInspect, frameless, className }: FakePhoneProps) {
  const ids = useMemo(() => app.tiles.map((t) => t.legoId), [app.tiles]);
  const model = useMemo(() => screenModel(ids), [ids]);
  const empty = ids.length === 0;
  const live = phase === "live" && !empty;
  const label = empty ? "Your app preview, empty" : live ? describeScreen(app.brand, model) : `Your app preview, ${ids.length} ${ids.length === 1 ? "brick" : "bricks"}, not built yet`;
  const ctx = useMemo<ScreenCtxValue>(() => ({ inspect, onInspect, regionRef: tileRef, order: model.order, wire: !live }), [inspect, onInspect, tileRef, model.order, live]);
  const rootRef = useRef<HTMLDivElement>(null);

  // Fit: the loosest density at which nothing overflows the screen body (whole filler rows hide on their own).
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const fit = () => {
      const body = root.querySelector<HTMLElement>("[data-body]");
      if (!body) return;
      for (const d of DENSITIES) {
        root.dataset.density = d;
        if (body.scrollHeight <= body.clientHeight + 1) break;
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(root);
    return () => ro.disconnect();
  });

  return (
    <div className={[styles.slot, frameless ? styles.frameless : undefined, className].filter(Boolean).join(" ")}>
      <section className={styles.device} role="region" aria-label={label} data-testid="phone" data-phase={live ? "live" : empty ? "empty" : "wire"} data-archetype={model.archetype}>
        <span className={styles.buttons} aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
        {/* A new key per build restarts the boot animation. */}
        <div key={live ? `live-${boot}` : "wire"} className={styles.screen} data-boot={live && boot > 0 && play ? "true" : undefined}>
          {!frameless && (
            <>
              <div className={styles.island} aria-hidden="true" />
              <div className={styles.status} aria-hidden="true">
                <span>9:41</span>
                <StatusGlyphs className={styles.sbIcons} />
              </div>
            </>
          )}
          <ScreenCtx.Provider value={ctx}>
            <div ref={rootRef} className={frameless ? `${sc.root} frameless-screen` : sc.root} data-skel={!live || undefined} data-screen={model.archetype}>
              <div className={sc.app}>
                <AppScreen m={model} brand={app.brand} />
              </div>
            </div>
          </ScreenCtx.Provider>
          {!frameless && <div className={styles.home} aria-hidden="true" />}
        </div>
      </section>
    </div>
  );
}
