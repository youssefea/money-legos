"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { MAX_LEGOS, MIN_LEGOS, RES, type GenerateResult, type Lego } from "@/lib";
import { setNumber } from "@/state/store";
import { BrickGlyph, ClosedBoxArt, MiniStack } from "./BrickArt";
import styles from "./SetBox.module.css";

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Closed set box: what you will get, before Generate. */
export function SetBlueprint({ count }: { count: number }) {
  const ready = count >= MIN_LEGOS;
  return (
    <section className={styles.blueprint} aria-labelledby="set-h">
      <h2 id="set-h" className={styles.label}>
        Set #00 · {count} of {MAX_LEGOS} pieces
      </h2>
      <ClosedBoxArt className={styles.boxArt} />
      <p className={styles.blueprintText}>
        {ready ? (
          <>
            Ready to open. Press <strong>Generate app</strong> to see your app idea, the docs and a prompt.
          </>
        ) : (
          "Snap 2 to 4 Legos onto the baseplate or pick a recipe."
        )}
      </p>
    </section>
  );
}

/** Short build-step text: the Lego's build line up to its first clause. */
function shortBuild(lego: Lego): string {
  const s = lego.build.split(/;| \(|: /)[0]!.replace(/\.$/, "");
  return s;
}

export type SetCardProps = {
  result: GenerateResult;
  copied: boolean;
  onCopied: () => void;
  /** Phone sheet: the title gets focus and a close button sits in the band. */
  onClose?: () => void;
  headingId?: string;
};

/** The open set box: app idea, flow, why each Lego matters, docs, build steps and the prompt. */
export const SetCard = forwardRef<HTMLHeadingElement, SetCardProps>(function SetCard({ result, copied, onCopied, onClose, headingId = "set-h" }, titleRef) {
  const n = setNumber(result);
  const pieces = result.steps.length;
  return (
    <section className={styles.card} aria-labelledby={headingId} data-testid="set-card">
      <header className={styles.band}>
        <div className={styles.bandText}>
          <p className={styles.bandLabel}>{n ? `Set #${pad2(n)}` : "Custom set"}</p>
          <h2 id={headingId} ref={titleRef} tabIndex={-1} className={styles.name}>
            {result.name}
          </h2>
        </div>
        <p className={styles.pieces}>
          <span className={styles.piecesN}>{pieces}</span>
          <span className={styles.piecesL}>Pieces</span>
        </p>
        {onClose && (
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close set">
            <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </header>

      <div className={styles.body}>
        <p className={styles.pitch}>{result.pitch}</p>

        <ol className={styles.flow} aria-label="Flow">
          {result.steps.map((s, i) => (
            <li key={s.lego.id} className={styles.flowItem}>
              {i > 0 && (
                <svg className={styles.arrow} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                  <path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              <span
                className={styles.flowChip}
                data-light={s.lego.brick.hex === "#FFFFFF" || undefined}
                style={{ background: s.lego.brick.hex, color: s.lego.brick.label }}
              >
                {s.lego.kicker}
              </span>
            </li>
          ))}
        </ol>

        <h3 className={styles.label}>Why each Lego matters</h3>
        <ul className={styles.why}>
          {result.steps.map((s) => (
            <li key={s.lego.id}>
              <BrickGlyph color={s.lego.brick.hex} studs={s.lego.size} className={styles.glyph} />
              <p>
                <strong>{s.lego.kicker}:</strong> {s.why}
              </p>
            </li>
          ))}
        </ul>

        <h3 className={styles.label}>Docs</h3>
        <ul className={styles.docs}>
          {result.docs.map((d) => (
            <li key={d.url}>
              <a href={d.url} target="_blank" rel="noopener noreferrer">
                {d.label}
              </a>
            </li>
          ))}
        </ul>

        <h3 className={styles.label}>Build steps</h3>
        <ol className={styles.steps} data-n={pieces}>
          {result.steps.map((s, i) => (
            <li key={s.lego.id}>
              <span className={styles.stepHead} aria-hidden="true">
                <span className={styles.stepN}>{i + 1}</span>
                <MiniStack
                  className={styles.stepArt}
                  bricks={result.steps.slice(0, i + 1).map((t) => ({ color: t.lego.brick.hex, studs: t.lego.size }))}
                />
              </span>
              <span className={styles.stepText}>{shortBuild(s.lego)}</span>
            </li>
          ))}
        </ol>

      </div>

      <div className={styles.foot}>
        <PromptBlock prompt={result.prompt} copied={copied} onCopied={onCopied} />
        <p className={styles.links}>
          <span>Build it on Base Sepolia:</span>
          <a href={RES.vibenet} target="_blank" rel="noopener noreferrer">
            Vibenet
          </a>
          <a href={RES.mcp} target="_blank" rel="noopener noreferrer">
            Base docs MCP
          </a>
        </p>
      </div>
    </section>
  );
});

/** Full prompt in a scrollable mono block, plus the big Copy prompt button. */
function PromptBlock({ prompt, copied, onCopied }: { prompt: string; copied: boolean; onCopied: () => void }) {
  const preRef = useRef<HTMLPreElement>(null);
  const [manual, setManual] = useState(false);

  const selectAll = () => {
    const el = preRef.current;
    if (!el) return;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(prompt);
      setManual(false);
      onCopied();
    } catch {
      // Clipboard blocked (http, old browser, permissions): select the text so Cmd/Ctrl+C works.
      selectAll();
      setManual(true);
    }
  };

  return (
    <div className={styles.prompt}>
      <h3 className={styles.label} id="prompt-h">
        Prompt to copy
      </h3>
      <pre ref={preRef} className={styles.pre} tabIndex={0} aria-labelledby="prompt-h" data-testid="prompt">
        {prompt}
      </pre>
      <CopyButton copied={copied} onClick={copy} />
      <p className={styles.copyNote} role="status">
        {manual ? "Copy is blocked here. The prompt is selected: press Cmd+C or Ctrl+C." : ""}
      </p>
    </div>
  );
}

function CopyButton({ copied, onClick }: { copied: boolean; onClick: () => void }) {
  return (
    <button type="button" className={styles.copy} data-copied={copied || undefined} onClick={onClick}>
      {copied ? (
        <>
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
            <path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className={styles.copiedText}>Copied</span>
        </>
      ) : (
        <>
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
            <rect x="6.5" y="6.5" width="10" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M13.5 4.5v-.5a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 4v8A1.5 1.5 0 0 0 5 13.5h.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          Copy prompt
        </>
      )}
    </button>
  );
}

/** Resets the "COPIED" state after 2s. */
export function useCopiedReset(copied: boolean, reset: () => void) {
  const resetRef = useRef(reset);
  useEffect(() => {
    resetRef.current = reset;
  });
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => resetRef.current(), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);
}
