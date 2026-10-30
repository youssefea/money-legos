"use client";

import { useState, type CSSProperties } from "react";
import type { SpriteId } from "@/lib/contract";
import { asset } from "@/lib/basePath";
import { GLYPH_META } from "./spriteMeta";
import styles from "./BrickGlyph.module.css";

export type BrickGlyphProps = {
  /** Hero Lego id; the glyph is public/sprites/glyph-<id>.webp (an unprinted 2x4 in the Lego's colour). Only the five heroes are baked; other ids show the colour block. */
  id: SpriteId;
  /** Brick hex, for the stand-in before the WebP loads. */
  color: string;
  /** Width in CSS px (default 32; height follows, 32 x 20). Sharp up to 64 px wide. */
  width?: number;
  /** Decorative by default. */
  alt?: string;
  title?: string;
  className?: string;
};

/**
 * Small 3D brick for lists such as "Why each Lego matters": baked from the same rig as the board,
 * no print (too small to read). Fixed aspect box, so no layout shift.
 */
export default function BrickGlyph({ id, color, width = 32, alt = "", title, className }: BrickGlyphProps) {
  const [failedId, setFailedId] = useState<string | null>(null);
  const height = Math.round(width / GLYPH_META.aspect);
  const style = { "--glyph-color": color, width, height } as CSSProperties;
  return (
    <span
      className={[styles.root, className].filter(Boolean).join(" ")}
      style={style}
      title={title}
      data-glyph={id}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    >
      {failedId === id ? (
        <span className={styles.fallback} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- static export, pre-baked WebP
        <img className={styles.img} src={asset(`/sprites/glyph-${id}.webp`)} alt="" width={width} height={height} decoding="async" draggable={false} onError={() => setFailedId(id)} />
      )}
    </span>
  );
}
