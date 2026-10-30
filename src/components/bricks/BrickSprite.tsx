"use client";

import { useState, type CSSProperties } from "react";
import type { SpriteId } from "@/lib/contract";
import { asset } from "@/lib/basePath";
import { SPRITE_DPR, SPRITE_SIZES } from "./sprites";
import styles from "./BrickSprite.module.css";

export type BrickSpriteProps = {
  /** Lego id; the sprite is public/sprites/<id>.webp. */
  id: SpriteId;
  /** Brick body hex, used for the fallback block. */
  color: string;
  /** Studs [x, z]; sets the fallback block's aspect ratio when no baked sprite is known. */
  size?: [number, number];
  /** Decorative by default: the button around it carries the name. */
  alt?: string;
  /** Display size in CSS px. Defaults to the baked size at 1x (hero 240x180, secondary 150x142); give one to scale. */
  width?: number;
  height?: number;
  className?: string;
};

/**
 * Pre-baked brick sprite (scripts/bake-sprites renders it from the board's own 3D rig). The img gets
 * width/height from the baked size, so the box is reserved before the WebP loads (no layout shift).
 * Shows a flat block in the brick colour until the WebP has loaded, and keeps showing it if the file
 * is missing.
 */
export default function BrickSprite({ id, color, size = [4, 2], alt = "", width, height, className }: BrickSpriteProps) {
  // Track by id so a new id never inherits the previous sprite's state.
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const loaded = loadedId === id;
  const failed = failedId === id;
  const baked = SPRITE_SIZES[id];
  const [w, h] = sizeFor(baked, width, height);
  const aspect = baked ? `${baked[0]} / ${baked[1]}` : `${size[0]} / ${size[1]}`;
  const style = { "--sprite-color": color, "--sprite-aspect": aspect, "--sprite-w": w ? `${w}px` : undefined } as CSSProperties;

  return (
    <span
      className={[styles.root, w ? styles.sized : "", className].filter(Boolean).join(" ")}
      style={style}
      data-sprite={id}
      data-state={failed ? "fallback" : loaded ? "loaded" : "loading"}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    >
      {!loaded && <span className={styles.fallback} />}
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element -- static export, pre-baked WebP
        <img
          className={loaded ? styles.img : styles.imgPending}
          src={asset(`/sprites/${id}.webp`)}
          alt=""
          width={w}
          height={h}
          decoding="async"
          draggable={false}
          ref={(img) => {
            // The image can settle before hydration attaches onLoad/onError.
            if (!img || !img.complete) return;
            if (img.naturalWidth > 0) setLoadedId(id);
            else setFailedId(id);
          }}
          onLoad={() => setLoadedId(id)}
          onError={() => setFailedId(id)}
        />
      )}
    </span>
  );
}

function sizeFor(baked: readonly [number, number] | undefined, width?: number, height?: number): [number | undefined, number | undefined] {
  if (!baked) return [width, height];
  const ratio = baked[0] / baked[1];
  if (width !== undefined && height !== undefined) return [width, height];
  if (width !== undefined) return [width, Math.round(width / ratio)];
  if (height !== undefined) return [Math.round(height * ratio), height];
  return [baked[0] / SPRITE_DPR, baked[1] / SPRITE_DPR];
}
