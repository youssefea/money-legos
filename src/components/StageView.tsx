"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { BY_ID, nextLevel, toPlacedBricks, type LegoId } from "@/lib";
import { BoardPoster } from "./BrickArt";
import styles from "./StageView.module.css";

// The live 3D board. Client only; the SVG poster below stands in while it loads.
const BrickStage = dynamic(() => import("@/components/bricks/BrickStage"), { ssr: false, loading: () => null });

export type StageViewProps = {
  ids: readonly LegoId[];
  dark: boolean;
  reducedMotion: boolean;
  /** Bumps on Generate (settle bounce). */
  generation: number;
  lastAdded: LegoId | null;
  /** Mount the live 3D board here (only one instance on the page at a time). */
  live: boolean;
  compact?: boolean;
  className?: string;
};

/**
 * The baseplate. Always draws the SVG poster; once the live board renders something visible
 * (a canvas, or its own SVG fallback) the poster fades out. The box size never changes.
 */
export default function StageView({ ids, dark, reducedMotion, generation, lastAdded, live, compact, className }: StageViewProps) {
  const liveRef = useRef<HTMLDivElement>(null);
  const [liveVisible, setLiveVisible] = useState(false);

  useEffect(() => {
    const el = liveRef.current;
    if (!live || !el) return;
    const check = () => setLiveVisible(!!el.querySelector("canvas, svg, img"));
    const mo = new MutationObserver(check);
    mo.observe(el, { childList: true, subtree: true });
    const raf = requestAnimationFrame(check);
    return () => {
      mo.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [live]);

  const bricks = toPlacedBricks(ids);
  const next = nextLevel(ids.length);
  const poster = ids.map((id) => {
    const l = BY_ID[id];
    return { id, color: l.brick.hex, labelColor: l.brick.label, studs: l.size, verb: l.kicker, name: l.title };
  });

  return (
    <div className={[styles.stage, compact ? styles.compact : undefined, className].filter(Boolean).join(" ")} data-live={live && liveVisible ? "true" : "false"}>
      <BoardPoster
        className={styles.poster}
        bricks={poster}
        next={next === null ? null : ids.length}
        dark={dark}
        dropId={lastAdded}
        settle={generation}
        dropClassName={styles.drop}
        settleClassName={generation % 2 ? styles.settleA : styles.settleB}
        compact={compact}
      />
      {live && (
        <div ref={liveRef} className={styles.live}>
          <BrickStage
            bricks={bricks}
            nextLevel={next}
            dark={dark}
            reducedMotion={reducedMotion}
            settledSignal={generation}
            className={styles.canvas}
          />
        </div>
      )}
    </div>
  );
}
