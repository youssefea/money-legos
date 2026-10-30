"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { GLOSSARY, type GenerateResult } from "@/lib";
import { selectContents } from "@/hooks/useCopy";
import { BrickGlyph } from "./BrickArt";
import { CopyButton } from "./ResultPanel";
import { statusChip } from "./statusChip";
import styles from "./DetailsDrawer.module.css";

export type DetailsDrawerProps = {
  open: boolean;
  result: GenerateResult;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
  /** Bumps when Copy failed: the drawer selects the prompt so Cmd/Ctrl+C works. */
  selectSignal: number;
};

/**
 * Where the words live: pitch, why each Lego, build steps, the full prompt, docs, statuses and a tiny
 * glossary. A modal <dialog> (focus trapped, Escape closes): a right drawer on desktop, a bottom
 * sheet on phones. The caller returns focus on close.
 */
export default function DetailsDrawer({ open, result, copied, onCopy, onClose, selectSignal }: DetailsDrawerProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // Focus the dialog itself (no ring on the heading); Tab then moves into it.
      d.focus();
    } else if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (open && selectSignal) selectContents(preRef.current);
  }, [open, selectSignal]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const closed = () => onCloseRef.current();
    const backdrop = (e: MouseEvent) => {
      if (e.target !== d) return;
      const r = d.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
    };
    d.addEventListener("close", closed);
    d.addEventListener("click", backdrop);
    return () => {
      d.removeEventListener("close", closed);
      d.removeEventListener("click", backdrop);
    };
  }, []);

  const text = result.prompt + " " + result.steps.map((s) => s.why).join(" ");
  const terms = GLOSSARY.filter((g) => new RegExp(`\\b${g.term}\\b`).test(text));

  return (
    <dialog ref={ref} className={styles.drawer} aria-labelledby="details-h" tabIndex={-1} data-testid="details">
      <div className={styles.grip} aria-hidden="true" />
      <header className={styles.head}>
        <h2 id="details-h" className={styles.title}>
          {result.name}
        </h2>
        <button type="button" className={styles.close} onClick={() => ref.current?.close()} aria-label="Close details">
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <div className={styles.body}>
        <p className={styles.pitch}>{result.pitch}</p>

        <section aria-labelledby="d-why">
          <h3 id="d-why" className={styles.h3}>
            Why each brick
          </h3>
          <ul className={styles.why}>
            {result.steps.map((s) => (
              <li key={s.lego.id} style={{ "--brick": s.lego.brick.hex } as CSSProperties}>
                <BrickGlyph color={s.lego.brick.hex} studs={s.lego.size} className={styles.glyph} />
                <span>
                  <b>{s.lego.verb}</b> {s.why}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="d-steps">
          <h3 id="d-steps" className={styles.h3}>
            Build steps
          </h3>
          <ol className={styles.steps}>
            {result.steps.map((s) => (
              <li key={s.lego.id}>{s.lego.step}</li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="d-prompt">
          <div className={styles.promptHead}>
            <h3 id="d-prompt" className={styles.h3}>
              Prompt
            </h3>
          </div>
          <pre ref={preRef} className={styles.prompt} tabIndex={0} data-testid="prompt">
            {result.prompt}
          </pre>
          <CopyButton className={styles.copy} copied={copied} disabled={false} onCopy={onCopy} testId="details-copy" />
        </section>

        <section aria-labelledby="d-docs">
          <h3 id="d-docs" className={styles.h3}>
            Docs
          </h3>
          <ul className={styles.docs}>
            {result.steps.map((s) => (
              <li key={s.lego.id}>
                <span className={styles.docVerb}>{s.lego.verb}</span>
                <span className={styles.links}>
                  {s.docs.map((d) => (
                    <a key={d.url} href={d.url} target="_blank" rel="noopener noreferrer">
                      {d.label}
                    </a>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="d-status">
          <h3 id="d-status" className={styles.h3}>
            Status
          </h3>
          <ul className={styles.status}>
            {result.steps.map((s) => (
              <li key={s.lego.id}>
                <span className={styles.chip} data-kind={s.lego.statusKind}>
                  {statusChip(s.lego)}
                </span>
                <span>
                  <b>{s.lego.name}</b> {s.lego.status.label}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {terms.length > 0 && (
          <section aria-labelledby="d-terms">
            <h3 id="d-terms" className={styles.h3}>
              Terms
            </h3>
            <dl className={styles.terms}>
              {terms.map((t) => (
                <div key={t.term}>
                  <dt>{t.term}</dt>
                  <dd>{t.gloss}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>
    </dialog>
  );
}
