"use client";

import { useState, type CSSProperties } from "react";
import type { SpriteId } from "@/lib/contract";
import { asset } from "@/lib/basePath";
import { SPRITE_DPR, SPRITE_META, SPRITE_VERSION } from "./spriteMeta";
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
  /** Tooltip (title attribute). */
  title?: string;
  /**
   * Display size in CSS px. Defaults to the baked size at 1x (see spriteMeta.ts: every hero 2x4 is a
   * 192 x 104 box with 16 px clear above the studs; a 2x2 is 104 px tall at the same scale). Give one side to scale; the other follows the baked aspect. A CSS width on
   * `className` works too: the box keeps the sprite's aspect ratio before the WebP loads.
   */
  width?: number;
  height?: number;
  className?: string;
};

/**
 * Pre-baked brick sprite (scripts/bake-sprites renders it with the board's own 3D studio and
 * materials, from the tray's more front-on hero angle), on a fixed canvas with clear space above. The box takes its aspect ratio from spriteMeta.ts, so it is
 * reserved before the WebP loads (no layout shift). A soft block in the brick colour stands in until
 * the WebP has loaded, and stays if the file is missing.
 */
export default function BrickSprite({ id, color, size = [4, 2], alt = "", title, width, height, className }: BrickSpriteProps) {
  // Track by id so a new id never inherits the previous sprite's state.
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const loaded = loadedId === id;
  const failed = failedId === id;
  const meta = SPRITE_META[id];
  const aspect = meta ? meta.aspect : (size[0] * 1.25) / (size[1] + 1.4);
  const [w, h] = sizeFor(meta ? [meta.width / SPRITE_DPR, meta.height / SPRITE_DPR] : undefined, aspect, width, height);
  const style = {
    "--sprite-color": color,
    "--sprite-aspect": String(aspect),
    "--sprite-w": w ? `${w}px` : undefined,
  } as CSSProperties;

  return (
    <span
      className={[styles.root, w ? styles.sized : "", className].filter(Boolean).join(" ")}
      style={style}
      title={title}
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
          className={[styles.img, loaded ? "" : styles.pending].join(" ")}
          src={asset(`/sprites/${id}.webp?v=${SPRITE_VERSION}`)}
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

function sizeFor(baked: [number, number] | undefined, aspect: number, width?: number, height?: number): [number | undefined, number | undefined] {
  if (width !== undefined && height !== undefined) return [width, height];
  if (width !== undefined) return [width, Math.round(width / aspect)];
  if (height !== undefined) return [Math.round(height * aspect), height];
  return baked ? [baked[0], baked[1]] : [undefined, undefined];
}
