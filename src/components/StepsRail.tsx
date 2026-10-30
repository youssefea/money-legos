import type { StepState } from "@/state/store";
import styles from "./StepsRail.module.css";

const STEPS = ["Pick Legos", "Snap them on", "Copy your prompt"] as const;

/** Live three-step rail: steps check off as the builder goes. */
export default function StepsRail({ states }: { states: readonly StepState[] }) {
  return (
    <ol className={styles.rail} aria-label="Steps">
      {STEPS.map((label, i) => {
        const s = states[i] ?? "todo";
        return (
          <li key={label} className={styles.step} data-state={s} aria-current={s === "current" ? "step" : undefined}>
            <span className={styles.dot} aria-hidden="true">
              {s === "done" ? (
                <svg viewBox="0 0 16 16" width="16" height="16">
                  <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            <span className={styles.text}>
              {label}
              {s === "done" && <span className="visually-hidden"> (done)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
