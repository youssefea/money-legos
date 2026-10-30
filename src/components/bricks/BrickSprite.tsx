"use client";

import { useState, type CSSProperties } from "react";
import type { SpriteId } from "@/lib/contract";
import { asset } from "@/lib/basePath";
import styles from "./BrickSprite.module.css";

export type BrickSpriteProps = {
  /** Lego id; the sprite is public/sprites/<id>.webp. */
  id: SpriteId;
  /** Brick body hex, used for the fallback block. */
  color: string;
  /** Studs [x, z]; sets the fallback block's aspect ratio. */
  size?: [number, number];
  /** Decorative by default: the button around it carries the name. */
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
};

/**
 * Pre-baked brick sprite. Shows a flat block in the brick colour until the WebP has loaded,
 * and keeps showing it if the file is missing.
 */
export default function BrickSprite({ id, color, size = [4, 2], alt = "", width, height, className }: BrickSpriteProps) {
  // Track by id so a new id never inherits the previous sprite's state.
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const loaded = loadedId === id;
  const failed = failedId === id;
  const style = { "--sprite-color": color, "--sprite-aspect": `${size[0]} / ${size[1]}` } as CSSProperties;

  return (
    <span
      className={[styles.root, className].filter(Boolean).join(" ")}
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
          width={width}
          height={height}
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
