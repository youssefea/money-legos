import { asset } from "@/lib/basePath";
import styles from "./BaseLockup.module.css";

/** Lockup aspect ratio from the brand SVG viewBox (1280 × 323.84). */
const RATIO = 1280 / 323.84;

export type BaseLockupProps = {
  /** Accessible name; the logo is decorative when the parent link already names it. */
  label?: string;
  className?: string;
};

/**
 * The official Base logotype lockup: 2-colour on light, all white on dark, swapped with CSS.
 * 28px tall (32px at 1920 wide), with the brand clear space around it.
 */
export default function BaseLockup({ label = "Base", className }: BaseLockupProps) {
  const h = 28;
  const w = Math.round(h * RATIO);
  return (
    <span className={[styles.root, className].filter(Boolean).join(" ")} role="img" aria-label={label}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG brand asset */}
      <img className={`${styles.logo} ${styles.light}`} src={asset("/brand/Base_lockup_2color.svg")} alt="" width={w} height={h} />
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG brand asset */}
      <img className={`${styles.logo} ${styles.dark}`} src={asset("/brand/Base_lockup_white.svg")} alt="" width={w} height={h} />
    </span>
  );
}
