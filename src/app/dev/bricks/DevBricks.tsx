"use client";

import { useMemo, useState } from "react";
import BrickStage from "@/components/bricks/BrickStage";
import BrickGlyph from "@/components/bricks/BrickGlyph";
import BrickSprite from "@/components/bricks/BrickSprite";
import SvgBrickStage from "@/components/bricks/svg/SvgBrickStage";
import { nextLevel, toPlacedBricks } from "@/lib/bricks";
import { HERO_LEGOS, LEGOS, MORE_LEGOS, isLegoId } from "@/lib/legos";
import type { LegoId } from "@/lib/types";
import type { BrickLayoutItem } from "@/lib/contract";
import styles from "./DevBricks.module.css";

/** Default add order: Issue, Pay, Trade, Speed (the screenshot stack), then the rest. */
const ORDER: LegoId[] = ["b20", "payments", "validity", "speed", ...LEGOS.map((l) => l.id).filter((id) => !["b20", "payments", "validity", "speed"].includes(id))];
/** ?mix=1: a mixed-footprint stack, bottom to top 2x4, 2x3, 1x4, 2x1. */
const MIX: LegoId[] = ["b20", "escrow", "payouts", "refunds"];

function fromUrl() {
  const q = new URLSearchParams(window.location.search);
  const listed = (q.get("ids") ?? "").split(",").filter(isLegoId);
  const n = Math.max(0, Math.min(4, Number(q.get("n") ?? 3)));
  const order = q.get("mix") === "1" ? MIX : ORDER;
  return {
    ids: listed.length > 0 ? listed.slice(0, 4) : order.slice(0, n),
    /** ?layoutbox=1: outline the onLayout boxes in red. */
    layoutBox: q.get("layoutbox") === "1",
    dark: q.get("dark") === "1",
    reduced: q.get("rm") === "1" || window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    only: q.get("only"),
    /** ?box=567x520: draw the stage in a fixed-size panel (the UI's board panel size). */
    box: (/^(\d+)x(\d+)$/.exec(q.get("box") ?? "") ?? []).slice(1).map(Number) as number[],
  };
}

/**
 * Dev test page: the live board with add/remove controls, the SVG fallback beside it, and the 13
 * baked tray sprites. URL: ?n=0..4 | ?ids=b20,payments  &dark=1  &rm=1  &only=stage|svg|sprites
 * &mix=1 (mixed footprints)  &layoutbox=1 (onLayout boxes in red)
 * &bricks=svg|webgl (force a renderer)  &box=567x520 (stage/svg in a fixed-size panel; the ghost box is outlined in red with &ghostbox=1).
 */
export default function DevBricks() {
  const [init] = useState(fromUrl);
  const [ids, setIds] = useState<LegoId[]>(init.ids);
  const [dark, setDark] = useState(init.dark);
  const [reduced, setReduced] = useState(init.reduced);
  const [signal, setSignal] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [layout, setLayout] = useState<BrickLayoutItem[]>([]);
  const bricks = useMemo(() => toPlacedBricks(ids), [ids]);
  const next = nextLevel(ids.length);
  const onSettled = (id: string) => setLog((l) => [`settled ${id}`, ...l].slice(0, 4));
  const stageProps = { bricks, nextLevel: next, dark, reducedMotion: reduced, settledSignal: signal, onSettled, onLayout: setLayout };
  const add = () => {
    const id = ORDER.find((x) => !ids.includes(x));
    if (id && ids.length < 4) setIds([...ids, id]);
  };
  const page = [styles.page, dark ? styles.dark : ""].join(" ");

  if ((init.only === "stage" || init.only === "svg") && init.box.length === 2) {
    const [bw, bh] = init.box as [number, number];
    return (
      <div className={[page, styles.boxPage].join(" ")}>
        <div className={styles.boxPanel} style={{ width: bw, height: bh }} data-testid="box-panel">
          {init.only === "stage" ? <BrickStage {...stageProps} className={styles.fullStage} /> : <SvgBrickStage {...stageProps} className={styles.fullStage} />}
          {init.layoutBox &&
            layout.map((b) => (
              <span
                key={b.id}
                data-layout-box={b.id}
                style={{ position: "absolute", left: `${(b.cx - b.w / 2) * 100}%`, top: `${(b.cy - b.h / 2) * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%`, outline: "1px solid red", pointerEvents: "none" }}
              />
            ))}
        </div>
      </div>
    );
  }

  if (init.only === "stage" || init.only === "svg") {
    return (
      <div className={[page, styles.full].join(" ")}>
        {init.only === "stage" ? (
          <BrickStage {...stageProps} className={styles.fullStage} />
        ) : (
          <SvgBrickStage {...stageProps} className={styles.fullStage} />
        )}
      </div>
    );
  }

  const sprites = (
    <>
      <div className={styles.sprites}>
        {[...HERO_LEGOS, ...MORE_LEGOS].map((l) => (
          <div key={l.id} className={styles.sprite}>
            <BrickSprite id={l.id} color={l.brick.hex} size={l.size} title={l.title} />
            <span className={styles.mono}>{l.id}</span>
          </div>
        ))}
      </div>
      <div className={styles.glyphs}>
        {HERO_LEGOS.map((l) => (
          <span key={l.id} className={styles.glyphRow}>
            <BrickGlyph id={l.id} color={l.brick.hex} />
            <span>
              <b>{l.kicker}:</b> {l.title}
            </span>
          </span>
        ))}
      </div>
    </>
  );
  if (init.only === "sprites") return <div className={[page, styles.fullSprites].join(" ")}>{sprites}</div>;

  return (
    <div className={page}>
      <div className={styles.bar}>
        <button type="button" onClick={add} disabled={ids.length >= 4}>
          Add brick
        </button>
        <button type="button" onClick={() => setIds(ids.slice(0, -1))} disabled={ids.length === 0}>
          Remove top
        </button>
        <button type="button" onClick={() => setIds(ids.slice(1))} disabled={ids.length === 0}>
          Remove bottom
        </button>
        <button type="button" onClick={() => setIds([])} disabled={ids.length === 0}>
          Clear
        </button>
        <button type="button" onClick={() => setSignal((s) => s + 1)} disabled={ids.length === 0}>
          Generate hop
        </button>
        <label>
          <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} /> Dark
        </label>
        <label>
          <input type="checkbox" checked={reduced} onChange={(e) => setReduced(e.target.checked)} /> Reduced motion
        </label>
        <span className={styles.mono}>
          {ids.length} of 4 · {log[0] ?? "no landings yet"}
        </span>
      </div>
      <div className={styles.pair}>
        <div className={styles.panel}>
          <span className={styles.mono}>BrickStage (live 3D, auto fallback)</span>
          <BrickStage {...stageProps} className={styles.stage} />
        </div>
        <div className={styles.panel}>
          <span className={styles.mono}>SvgBrickStage (no-WebGL fallback)</span>
          <SvgBrickStage {...stageProps} className={styles.stage} />
        </div>
      </div>
      {sprites}
    </div>
  );
}
