"use client";

import { useId, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import BrickSprite from "@/components/bricks/BrickSprite";
import { SPRITE_META } from "@/components/bricks/spriteMeta";
import { HERO_LEGOS, MAX_LEGOS, MORE_LEGOS, type Lego, type LegoId } from "@/lib";
import LegoDetail from "./LegoDetail";
import styles from "./Tray.module.css";

export type TrayProps = {
  ids: readonly LegoId[];
  fullHint: boolean;
  onToggle: (id: LegoId) => void;
  onPointerDown: (e: ReactPointerEvent<HTMLElement>, id: LegoId) => void;
  wasDrag: () => boolean;
  dragging: LegoId | null;
};

type Open = { id: LegoId; pos: { top: number; left: number; width: number }; anchor: HTMLButtonElement } | null;

const Check = () => (
  <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
    <path d="M2.5 6.5l2.2 2.2 4.8-5.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * The Lego picker: 5 hero rows (sprite + verb · name + one-line tag + info), then 8 more behind a
 * disclosure. Every brick is a real button; a placed brick shows an ON BOARD pill and Remove in its
 * text column (never on the sprite) and removes on press.
 */
export default function Tray({ ids, fullHint, onToggle, onPointerDown, wasDrag, dragging }: TrayProps) {
  const [more, setMore] = useState(false);
  const [open, setOpen] = useState<Open>(null);
  const moreId = useId();
  const full = ids.length >= MAX_LEGOS;

  const openDetail = (lego: Lego, btn: HTMLButtonElement) => {
    if (open?.id === lego.id) {
      setOpen(null);
      return;
    }
    const r = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const mobile = vw < 768;
    const width = mobile ? vw - 32 : 340;
    const left = mobile ? 16 : Math.min(r.right + 12, vw - width - 16);
    const top = mobile ? Math.max(16, Math.min(r.bottom + 8, vh - 420)) : Math.max(16, Math.min(r.top - 24, vh - 440));
    setOpen({ id: lego.id, pos: { top, left, width }, anchor: btn });
  };

  const closeDetail = (returnFocus: boolean) => {
    const anchor = open?.anchor;
    setOpen(null);
    if (returnFocus) anchor?.focus();
  };

  const item = (lego: Lego, index: number) => {
    const placed = ids.includes(lego.id);
    const hero = lego.tier === "featured";
    const slot = ids.indexOf(lego.id) + 1;
    const tagId = `${moreId}-${lego.id}-tag`;
    const start = hero && index === 0 && ids.length === 0;
    const label = `${lego.kicker} ${lego.title}${placed ? `, on board, slot ${slot}. Press to remove.` : ""}`;
    return (
      <li key={lego.id} className={hero ? styles.item : `${styles.item} ${styles.small}`} data-placed={placed || undefined}>
        <button
          type="button"
          className={styles.brick}
          aria-pressed={placed}
          aria-label={label}
          aria-describedby={placed ? undefined : [tagId, full ? `${moreId}-full` : ""].filter(Boolean).join(" ")}
          data-lego={lego.id}
          data-dragging={dragging === lego.id || undefined}
          onPointerDown={(e) => onPointerDown(e, lego.id)}
          onClick={() => {
            if (wasDrag()) return;
            onToggle(lego.id);
          }}
          style={{ "--brick-label": lego.brick.label, "--sprite-aspect": String(SPRITE_META[lego.id]?.aspect ?? 1.54) } as CSSProperties}
        >
          <span className={styles.art}>
            <BrickSprite id={lego.id} color={lego.brick.hex} size={lego.size} className={styles.sprite} />
          </span>
          <span className={styles.text}>
            <span className={styles.title}>
              <span className={styles.verb}>{lego.kicker}</span>
              {lego.statusKind === "testnet" && <span className={styles.chip}>Sepolia</span>}
              <span className={styles.sep} aria-hidden="true">
                {" · "}
              </span>
              <span className={styles.name}>{lego.title}</span>
            </span>
            {placed ? (
              <span className={styles.placed}>
                <span className={styles.badge}>
                  <Check />
                  On board
                </span>
                <span className={styles.remove} aria-hidden="true">
                  <svg viewBox="0 0 12 12" width="10" height="10">
                    <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  Remove
                </span>
              </span>
            ) : (
              <span id={tagId} className={styles.tag} data-start={start || undefined}>
                {lego.tag}
              </span>
            )}
            {start && (
              <span className={styles.start} aria-hidden="true" data-testid="start-here">
                <svg viewBox="0 0 16 16" width="14" height="14">
                  <path d="M13 8H3M7 4L3 8l4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Start here
              </span>
            )}
          </span>
        </button>
        <button
          type="button"
          className={styles.info}
          aria-label={`About ${lego.kicker} (${lego.title})`}
          aria-expanded={open?.id === lego.id}
          aria-controls={open?.id === lego.id ? `detail-${lego.id}` : undefined}
          onClick={(e) => openDetail(lego, e.currentTarget)}
        >
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
            <circle cx="10" cy="10" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 9v5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="10" cy="6.2" r="1.05" fill="currentColor" />
          </svg>
        </button>
      </li>
    );
  };

  const openLego = open ? [...HERO_LEGOS, ...MORE_LEGOS].find((l) => l.id === open.id) : undefined;

  return (
    <section className={styles.tray} aria-labelledby={`${moreId}-h`}>
      <div className={styles.head}>
        <h2 id={`${moreId}-h`} className={styles.label}>
          Legos
        </h2>
        {full && (
          <p id={`${moreId}-full`} className={styles.full} data-flash={fullHint || undefined}>
            Max 4 Legos. Click a placed brick to swap.
          </p>
        )}
      </div>
      <div className={styles.scroll}>
        <ul className={styles.hero}>{HERO_LEGOS.map(item)}</ul>
        <div id={moreId} hidden={!more}>
          <ul className={styles.more}>{MORE_LEGOS.map(item)}</ul>
        </div>
      </div>
      <button type="button" className={styles.disclosure} aria-expanded={more} aria-controls={moreId} onClick={() => setMore((m) => !m)}>
        {more ? "Show fewer Legos" : `+ ${MORE_LEGOS.length} more Legos`}
      </button>
      {open && openLego && (
        <LegoDetail lego={openLego} pos={open.pos} onClose={closeDetail} anchor={open.anchor} />
      )}
    </section>
  );
}
