import type { CSSProperties, ReactNode } from "react";
import { BRICK_COLORS, type FakeTile as Tile } from "@/lib";
import styles from "./FakePhone.module.css";

/** Light brick colours need a darker line to show on a white card. */
const PALE = new Set(["white", "gray-light"]);

/** CSS variables for one tile: brick colour, its label ink and a visible line colour. */
export function accentVars(accent: Tile["accent"]): CSSProperties {
  const c = BRICK_COLORS[accent];
  return {
    "--accent": c.hex,
    "--accent-ink": c.label,
    "--accent-line-light": PALE.has(accent) ? "#B1B7C3" : c.hex,
    "--accent-line-dark": accent === "gray-dark" ? "#B1B7C3" : c.hex,
  } as CSSProperties;
}

const Check = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M4 8.4l2.6 2.6L12 5.4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Icon = ({ kind }: { kind: "shield" | "key" | "swap" | "clock" | "bolt" | "spark" }) => {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      {kind === "shield" && <path {...p} d="M8 1.8l5 2v3.6c0 3.2-2.2 5.6-5 6.8-2.8-1.2-5-3.6-5-6.8V3.8zM5.6 8l1.7 1.7 3.2-3.4" />}
      {kind === "key" && <path {...p} d="M10 2.5a3.5 3.5 0 1 1-2.6 5.8L3 12.7V14h2v-1.5h1.5V11l1.6-1.6" />}
      {kind === "swap" && <path {...p} d="M5 2.5v11M2.5 11L5 13.5 7.5 11M11 13.5v-11M8.5 5L11 2.5 13.5 5" />}
      {kind === "clock" && <path {...p} d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zM8 4.8V8l2.2 1.4" />}
      {kind === "bolt" && <path {...p} d="M9 1.8L3.8 9H8l-1 5.2L12.2 7H8z" />}
      {kind === "spark" && <path {...p} d="M8 2v3M8 11v3M2 8h3M11 8h3M4 4l2 2M10 10l2 2M12 4l-2 2M6 10l-2 2" />}
    </svg>
  );
};

/** A fake 9x9 QR code (decorative, not scannable). */
function Qr() {
  const n = 9;
  const cells: ReactNode[] = [];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const finder = (x < 3 && y < 3) || (x > 5 && y < 3) || (x < 3 && y > 5);
      const on = finder || (x * 7 + y * 3 + x * y) % 3 === 0;
      if (on) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
    }
  return (
    <svg className={styles.qr} viewBox={`-0.5 -0.5 ${n + 1} ${n + 1}`} aria-hidden="true" shapeRendering="crispEdges">
      {cells}
    </svg>
  );
}

function Cta({ children, quiet }: { children: ReactNode; quiet?: boolean }) {
  return <span className={quiet ? `${styles.cta} ${styles.ctaQuiet}` : styles.cta}>{children}</span>;
}

function Chip({ children }: { children: ReactNode }) {
  return <span className={styles.chip}>{children}</span>;
}

/** Inner layout per template kind (src/lib/fakeApp.ts). Text comes from data only. */
function Body({ t }: { t: Tile }) {
  const rows = t.rows ?? [];
  switch (t.template) {
    case "balance":
      return (
        <div className={styles.hrow}>
          <span className={styles.coin} aria-hidden="true">
            A
          </span>
          <span className={styles.stackText}>
            <span className={styles.label}>{t.title}</span>
            <span className={styles.big}>{t.value}</span>
          </span>
          {t.chip && <Chip>{t.chip}</Chip>}
        </div>
      );
    case "checkout":
      return (
        <>
          <div className={styles.row}>
            <span className={styles.titleText}>{t.title}</span>
            {t.chip ? <Chip>{t.chip}</Chip> : t.value ? <span className={styles.num}>{t.value}</span> : null}
          </div>
          {t.cta && <Cta quiet={t.cta === "Refund"}>{t.cta}</Cta>}
        </>
      );
    case "toast":
      return (
        <div className={styles.hrow}>
          <span className={styles.ok} aria-hidden="true">
            <Check />
          </span>
          <span className={styles.titleText}>{t.title}</span>
          {t.chip && <Chip>{t.chip}</Chip>}
        </div>
      );
    case "earn":
      return (
        <>
          <div className={styles.row}>
            <span className={styles.titleText}>{t.title}</span>
            <span className={styles.label}>{t.value}</span>
          </div>
          <span className={styles.spark} aria-hidden="true">
            <svg viewBox="0 0 100 20" preserveAspectRatio="none">
              <path d="M0 16 C12 14 18 9 30 11 S50 4 62 7 S84 2 100 3" fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </svg>
          </span>
          {t.cta && <Cta>{t.cta}</Cta>}
        </>
      );
    case "order":
      return (
        <>
          <div className={styles.row}>
            <span className={styles.titleText}>{t.title}</span>
            <span className={styles.seg} aria-hidden="true">
              <i data-on="true" />
              <i />
            </span>
          </div>
          <span className={styles.field}>{t.value}</span>
          {t.cta && <Cta>{t.cta}</Cta>}
        </>
      );
    case "swap":
      return (
        <>
          <span className={styles.titleText}>{t.title}</span>
          <div className={styles.swap}>
            {rows.map(([k, v], i) => (
              <span key={k} className={styles.field}>
                <span className={styles.label}>{k}</span>
                <span className={styles.strong}>{v}</span>
                {i === 0 && (
                  <span className={styles.swapIcon} aria-hidden="true">
                    <Icon kind="swap" />
                  </span>
                )}
              </span>
            ))}
          </div>
        </>
      );
    case "badge":
      return (
        <div className={styles.hrow}>
          <span className={styles.badgeIcon} aria-hidden="true">
            <Icon kind="shield" />
          </span>
          <span className={styles.stackText}>
            <span className={styles.titleText}>{t.title}</span>
            {t.value && <span className={styles.num}>{t.value}</span>}
          </span>
          {t.chip && <Chip>{t.chip}</Chip>}
          {t.cta && (
            <span className={styles.ctaSmall}>
              {t.cta}
            </span>
          )}
        </div>
      );
    case "signin":
      return (
        <>
          <span className={styles.titleText}>{t.title}</span>
          <Cta>
            <span className={styles.ctaIcon} aria-hidden="true">
              <Icon kind="key" />
            </span>
            {t.cta}
          </Cta>
        </>
      );
    case "pill":
      return (
        <div className={styles.hrow}>
          <span className={styles.dot} aria-hidden="true" />
          <span className={styles.titleText}>{t.title}</span>
          {t.chip && <Chip>{t.chip}</Chip>}
        </div>
      );
    case "rows":
      return (
        <>
          <span className={styles.titleText}>{t.title}</span>
          <dl className={styles.kv}>
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </>
      );
    case "input":
      return (
        <>
          <span className={styles.label}>{t.title}</span>
          <span className={styles.field}>
            <span className={styles.strong}>{t.value}</span>
            <span className={styles.caret} aria-hidden="true" />
          </span>
          {t.cta && <Cta>{t.cta}</Cta>}
        </>
      );
    case "list":
      return (
        <>
          <div className={styles.row}>
            <span className={styles.titleText}>{t.title}</span>
            {t.cta && <span className={styles.ctaSmall}>{t.cta}</span>}
          </div>
          <ul className={styles.list}>
            {rows.map(([k, v]) => (
              <li key={k}>
                <span className={styles.avatar} aria-hidden="true" />
                <span>{k}</span>
                <span className={styles.num}>{v}</span>
              </li>
            ))}
          </ul>
        </>
      );
    case "qr":
      return (
        <div className={styles.hrow}>
          <Qr />
          <span className={styles.stackText}>
            <span className={styles.label}>{t.title}</span>
            <span className={styles.big}>{t.value}</span>
          </span>
        </div>
      );
    case "meter": {
      const split = rows.length > 0 && !t.value;
      return (
        <>
          <div className={styles.row}>
            <span className={styles.titleText}>{t.title}</span>
            {t.value && <span className={styles.label}>{t.value}</span>}
          </div>
          {split ? (
            <>
              <span className={styles.bar} aria-hidden="true">
                {rows.map(([k, v]) => (
                  <i key={k} style={{ flexBasis: v }} />
                ))}
              </span>
              <span className={styles.legend}>
                {rows.map(([k, v]) => (
                  <span key={k}>
                    {k} <b>{v}</b>
                  </span>
                ))}
              </span>
            </>
          ) : (
            <span className={styles.bar} aria-hidden="true">
              <i style={{ flexBasis: "64%" }} />
            </span>
          )}
          {t.cta && <Cta>{t.cta}</Cta>}
        </>
      );
    }
    case "stat":
      return (
        <div className={styles.hrow}>
          <span className={styles.badgeIcon} aria-hidden="true">
            <Icon kind={/time/i.test(t.title) ? "clock" : /call/i.test(t.title) ? "bolt" : "spark"} />
          </span>
          <span className={styles.stackText}>
            <span className={styles.label}>{t.title}</span>
            <span className={styles.big}>{t.value}</span>
          </span>
        </div>
      );
  }
}

/** One fake-app tile: a white card with the brick's studs on top and its colour on the left edge. */
export default function FakeTile({ tile, studs, refCb }: { tile: Tile; studs: number; refCb?: (el: HTMLLIElement | null) => void }) {
  return (
    <li ref={refCb} className={styles.tile} style={accentVars(tile.accent)} data-tile={tile.legoId} data-template={tile.template}>
      <span className={styles.studs} aria-hidden="true">
        {Array.from({ length: studs }, (_, i) => (
          <i key={i} />
        ))}
      </span>
      <div className={styles.body}>
        <Body t={tile} />
      </div>
    </li>
  );
}
