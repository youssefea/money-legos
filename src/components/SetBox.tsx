"use client";

import { forwardRef, useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { GLOSSARY, MAX_LEGOS, MIN_LEGOS, RES, type DocLink, type GenerateResult } from "@/lib";
import { setNumber } from "@/state/store";
import { BrickGlyph, ClosedBoxArt } from "./BrickArt";
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
            Ready to open. Press <strong>Generate idea + prompt</strong> to see your app idea, the docs and a prompt.
          </>
        ) : (
          "Snap 2 to 4 Legos onto the baseplate or pick a recipe."
        )}
      </p>
    </section>
  );
}

/** True while the element has more content below its visible area. Re-checks on scroll and resize. */
function useMoreBelow(ref: RefObject<HTMLElement | null>, deps: unknown) {
  const [more, setMore] = useState(false);
  const check = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setMore(el.scrollTop + el.clientHeight < el.scrollHeight - 2);
  }, [ref]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    el.addEventListener("scroll", check, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", check);
    };
  }, [ref, check, deps]);
  return more;
}

/** Wraps the first use of each glossary term in an <abbr> with a plain-English title. */
function Glossed({ text, seen }: { text: string; seen: Set<string> }) {
  const g = GLOSSARY.find((x) => !seen.has(x.term) && text.includes(x.term));
  if (!g) return <>{text}</>;
  seen.add(g.term);
  const i = text.indexOf(g.term);
  return (
    <>
      {text.slice(0, i)}
      <abbr title={g.gloss}>{g.term}</abbr>
      <span className="visually-hidden"> ({g.gloss})</span>
      <Glossed text={text.slice(i + g.term.length)} seen={seen} />
    </>
  );
}

/** First docs page per Lego, in flow order, without repeats: one inline row. */
function docRow(result: GenerateResult): (DocLink & { short: string })[] {
  const seen = new Set<string>();
  const out: (DocLink & { short: string })[] = [];
  for (const s of result.steps) {
    const d = s.docs.find((x) => !seen.has(x.url));
    if (d) {
      seen.add(d.url);
      out.push({ ...d, short: s.lego.title });
    }
  }
  return out;
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
  const bodyRef = useRef<HTMLDivElement>(null);
  const more = useMoreBelow(bodyRef, result);
  const docs = docRow(result);
  // Each jargon term gets its gloss once, where it first appears.
  const seen = new Set<string>();
  return (
    <section className={styles.card} aria-labelledby={headingId} data-testid="set-card">
      <header className={styles.band}>
        <div className={styles.bandText}>
          <p className={styles.bandLabel}>{n ? `Set #${pad2(n)}` : "Custom set"} · App idea</p>
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

      <div ref={bodyRef} className={styles.body} data-more={more || undefined} tabIndex={more ? 0 : undefined} aria-label={more ? "Set details, scrollable" : undefined}>
        <p className={styles.pitch}>{result.pitch}</p>

        <ol className={styles.flow} aria-label="Flow">
          {result.steps.map((s, i) => (
            <li key={s.lego.id} className={styles.flowItem}>
              {i > 0 && (
                <svg className={styles.arrow} viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
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

        <section className={styles.section} aria-labelledby={`${headingId}-why`}>
          <h3 id={`${headingId}-why`} className={styles.label}>
            Why each Lego matters
          </h3>
          <ul className={styles.why}>
            {result.steps.map((s) => (
              <li key={s.lego.id} title={s.why}>
                <BrickGlyph color={s.lego.brick.hex} studs={s.lego.size} className={styles.glyph} />
                <p>
                  <strong>{s.lego.kicker}:</strong> <Glossed text={s.lego.short} seen={seen} />
                  {s.lego.note && <span className={styles.note}> {s.lego.note}.</span>}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <p className={styles.docs}>
          <span className={styles.label}>Docs</span>
          {docs.map((d, i) => (
            <span key={d.url} className={styles.docItem}>
              {i > 0 && (
                <span className={styles.dot} aria-hidden="true">
                  ·
                </span>
              )}
              <a href={d.url} target="_blank" rel="noopener noreferrer" title={d.label} aria-label={`${d.label} (docs)`}>
                {d.short}
              </a>
            </span>
          ))}
        </p>

        <section className={styles.section} aria-labelledby={`${headingId}-steps`}>
          <h3 id={`${headingId}-steps`} className={styles.label}>
            Build steps
          </h3>
          <ol className={styles.steps} data-n={pieces}>
            {result.steps.map((s, i) => (
              <li key={s.lego.id}>
                <span className={styles.stepN} aria-hidden="true">
                  {i + 1}
                </span>
                <span className={styles.stepText}>{s.lego.step}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div className={styles.foot}>
        <PromptBlock prompt={result.prompt} copied={copied} onCopied={onCopied} headingId={headingId} />
        <p className={styles.links}>
          <a href={RES.vibenet} target="_blank" rel="noopener noreferrer">
            Test on Vibenet
          </a>
          <span className={styles.dot} aria-hidden="true">
            ·
          </span>
          <a href={RES.mcp} target="_blank" rel="noopener noreferrer">
            Docs MCP for your agent
          </a>
        </p>
      </div>
    </section>
  );
});

/** The prompt in a short mono block (fade + Show all toggle when it is longer), plus the big Copy prompt button. */
function PromptBlock({ prompt, copied, onCopied, headingId }: { prompt: string; copied: boolean; onCopied: () => void; headingId: string }) {
  const preRef = useRef<HTMLPreElement>(null);
  const [manual, setManual] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const more = useMoreBelow(preRef, expanded);
  const labelId = `${headingId}-prompt`;
  const preId = `${headingId}-pre`;

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
      <div className={styles.promptHead}>
        <h3 className={styles.label} id={labelId}>
          Prompt to copy
        </h3>
        <button type="button" className={styles.expand} aria-expanded={expanded} aria-controls={preId} onClick={() => setExpanded((e) => !e)}>
          {expanded ? "Show less" : "Show all"}
          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" data-up={expanded || undefined}>
            <path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div className={styles.preWrap} data-more={more || undefined}>
        <pre id={preId} ref={preRef} className={styles.pre} data-expanded={expanded || undefined} tabIndex={0} aria-labelledby={labelId} data-testid="prompt">
          {prompt}
        </pre>
        {more && (
          <span className={styles.scrollHint} aria-hidden="true">
            Scroll
            <svg viewBox="0 0 12 12" width="10" height="10">
              <path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        )}
      </div>
      <CopyButton copied={copied} onClick={copy} />
      <p className={styles.hint}>Paste it into your coding agent.</p>
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
