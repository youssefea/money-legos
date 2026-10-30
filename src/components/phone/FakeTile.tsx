import { useRef, type CSSProperties, type ReactNode } from "react";
import { BRICK_COLORS, BY_ID, wireLabel, type FakeTile as Tile, type LegoId, type TileRole } from "@/lib";
import styles from "./FakePhone.module.css";

/** Pale brick colours need a hairline under their strip and a darker line to show on a white card. */
const PALE = new Set(["white", "gray-light"]);

/** CSS variables for one tile: brick colour, its label ink and a visible line colour. */
export function accentVars(accent: Tile["accent"]): CSSProperties {
  const c = BRICK_COLORS[accent];
  return {
    "--accent": c.hex,
    "--accent-ink": c.label,
    "--accent-line-light": accent === "white" || accent === "gray-light" ? "#B1B7C3" : c.hex,
    "--accent-line-dark": accent === "gray-dark" ? "#B1B7C3" : c.hex,
  } as CSSProperties;
}

const Check = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M4 8.4l2.6 2.6L12 5.4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type IconKind = "shield" | "key" | "swap" | "clock" | "bolt" | "spark" | "qr" | "list" | "rows" | "meter" | "input";
const Icon = ({ kind }: { kind: IconKind }) => {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      {kind === "shield" && <path {...p} d="M8 1.8l5 2v3.6c0 3.2-2.2 5.6-5 6.8-2.8-1.2-5-3.6-5-6.8V3.8zM5.6 8l1.7 1.7 3.2-3.4" />}
      {kind === "key" && <path {...p} d="M10 2.5a3.5 3.5 0 1 1-2.6 5.8L3 12.7V14h2v-1.5h1.5V11l1.6-1.6" />}
      {kind === "swap" && <path {...p} d="M5 2.5v11M2.5 11L5 13.5 7.5 11M11 13.5v-11M8.5 5L11 2.5 13.5 5" />}
      {kind === "clock" && <path {...p} d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zM8 4.8V8l2.2 1.4" />}
      {kind === "bolt" && <path {...p} d="M9 1.8L3.8 9H8l-1 5.2L12.2 7H8z" />}
      {kind === "spark" && <path {...p} d="M8 2v3M8 11v3M2 8h3M11 8h3M4 4l2 2M10 10l2 2M12 4l-2 2M6 10l-2 2" />}
      {kind === "qr" && <path {...p} d="M2.5 2.5h4v4h-4zM9.5 2.5h4v4h-4zM2.5 9.5h4v4h-4zM9.5 9.5h1.5M13.5 9.5v1.5M9.5 13.5h4M11.5 11.5v2" />}
      {kind === "list" && <path {...p} d="M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01" />}
      {kind === "rows" && <path {...p} d="M2.5 3.5h11v9h-11zM2.5 7h11M6 7v5.5" />}
      {kind === "meter" && <path {...p} d="M2.5 11a5.5 5.5 0 0 1 11 0M8 11l2.5-3.5" />}
      {kind === "input" && <path {...p} d="M2.5 5h11v6h-11zM5 8h4" />}
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

const isMoney = (s?: string) => !!s && /^\$/.test(s);

/** Fake buttons look real but do nothing: they are plain text, not controls. */
function Cta({ children, quiet }: { children: ReactNode; quiet?: boolean }) {
  return <span className={quiet ? `${styles.cta} ${styles.ctaQuiet}` : styles.cta}>{children}</span>;
}

function Chip({ children }: { children: ReactNode }) {
  return <span className={styles.chip}>{children}</span>;
}

function Value({ v, big }: { v?: string; big?: boolean }) {
  if (!v) return null;
  return <span className={isMoney(v) ? (big ? styles.moneyBig : styles.money) : styles.strong}>{v}</span>;
}

/** The dominant module: the app's main task, 112-144px tall, with the one primary fake CTA. */
/** The hero card always ends on one primary action: the tile's own, else a plain one for its kind. */
const HERO_CTA: Partial<Record<Tile["template"], string>> = { list: "View all", rows: "Manage", qr: "Pay now", meter: "Adjust", input: "Continue" };

function HeroBody({ t }: { t: Tile }) {
  const rows = t.rows ?? [];
  const cta = t.cta ?? HERO_CTA[t.template];
  switch (t.template) {
    case "balance":
      return (
        <>
          <div className={styles.rowTop}>
            <span className={styles.stackText}>
              <span className={styles.label}>{t.title}</span>
              <span className={styles.moneyHuge}>{t.value}</span>
            </span>
            {t.chip && <Chip>{t.chip}</Chip>}
          </div>
          <span className={styles.actions} aria-hidden="true">
            <Cta>Send</Cta>
            <Cta quiet>Receive</Cta>
          </span>
        </>
      );
    case "checkout":
      return (
        <>
          <div className={styles.row}>
            <span className={styles.titleText}>{t.title}</span>
            {t.chip ? <Chip>{t.chip}</Chip> : <Value v={t.value} big />}
          </div>
          {t.cta && <Cta quiet={t.cta === "Refund"}>{t.cta}</Cta>}
        </>
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
              <i data-on="true">Buy</i>
              <i>Sell</i>
            </span>
          </div>
          <div className={styles.pair}>
            <span className={styles.field}>{t.value}</span>
            {t.cta && <Cta>{t.cta}</Cta>}
          </div>
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
          <Cta>Review swap</Cta>
        </>
      );
    case "toast":
    case "pill":
    case "badge":
      // A status or badge on top: one big card with a large mark, the title large and its chip.
      return (
        <>
          <div className={styles.heroMark}>
            {t.template === "toast" ? (
              <span className={styles.okBig} aria-hidden="true">
                <Check />
              </span>
            ) : (
              <span className={styles.iconBig} aria-hidden="true">
                <Icon kind={t.template === "badge" ? "shield" : "spark"} />
              </span>
            )}
            <span className={styles.heroTitle}>{t.title}</span>
            {t.chip && <Chip>{t.chip}</Chip>}
          </div>
          {t.cta && <Cta>{t.cta}</Cta>}
        </>
      );
    case "list":
    case "rows":
      return (
        <>
          <span className={styles.titleText}>{t.title}</span>
          <span className={styles.lines}>
            {rows.map(([k, v]) => (
              <span key={k} className={styles.line}>
                <span>{k}</span>
                <span className={isMoney(v) ? styles.lineMoney : styles.strong}>{v}</span>
              </span>
            ))}
          </span>
          {cta && <Cta>{cta}</Cta>}
        </>
      );
    case "qr":
      return (
        <>
          <div className={styles.hrow}>
            <span className={styles.qrBig}>
              <Qr />
            </span>
            <span className={styles.stackText}>
              <span className={styles.label}>{t.title}</span>
              <Value v={t.value} big />
            </span>
          </div>
          {cta && <Cta>{cta}</Cta>}
        </>
      );
    case "signin":
      return (
        <>
          <div className={styles.heroMark}>
            <span className={styles.iconBig} aria-hidden="true">
              <Icon kind="key" />
            </span>
            <span className={styles.heroTitle}>{t.title}</span>
          </div>
          {t.cta && <Cta>{t.cta}</Cta>}
        </>
      );
    default:
      // stat, meter, input: the label, the value large, then its bar or button.
      return (
        <>
          <div className={styles.row}>
            <span className={styles.label}>{t.title}</span>
            {t.chip && <Chip>{t.chip}</Chip>}
          </div>
          {!t.value ? null : t.template === "input" ? <span className={styles.field}>{t.value}</span> : isMoney(t.value) ? <Value v={t.value} big /> : <span className={styles.heroValue}>{t.value}</span>}
          {t.template === "meter" && (
            <span className={styles.bar} aria-hidden="true">
              {rows.length ? rows.map(([k, v]) => <i key={k} style={{ flexBasis: v }} />) : <i style={{ flexBasis: "64%" }} />}
            </span>
          )}
          {t.template === "meter" && rows.length > 0 && <span className={styles.sub}>{rows.map(([k, v]) => `${k} ${v}`).join(" · ")}</span>}
          {cta && <Cta>{cta}</Cta>}
        </>
      );
  }
}

function iconFor(t: Tile): IconKind {
  switch (t.template) {
    case "badge":
      return "shield";
    case "signin":
      return "key";
    case "swap":
      return "swap";
    case "qr":
      return "qr";
    case "list":
      return "list";
    case "rows":
      return "rows";
    case "meter":
      return "meter";
    case "input":
      return "input";
    case "stat":
      return /time/i.test(t.title) ? "clock" : /call/i.test(t.title) ? "bolt" : "spark";
    default:
      return "spark";
  }
}

/** A compact supporting module, 48-72px: icon, title and one secondary line, value or chip on the right. */
function RowBody({ t, hero }: { t: Tile; hero?: boolean }) {
  const rows = t.rows ?? [];
  const sub =
    t.template === "swap"
      ? rows.map((r) => r[1]).join(" → ")
      : t.template === "meter" && rows.length
        ? rows.map(([k, v]) => `${k} ${v}`).join(" · ")
        : t.template === "list" || t.template === "rows"
          ? rows.map(([k, v]) => `${k} ${v}`).join(" · ")
          : t.template === "input" || t.template === "order" || t.template === "earn" || t.template === "stat"
            ? t.value
            : undefined;
  const right = t.template === "input" || t.template === "order" || t.template === "earn" || t.template === "stat" || t.template === "swap" ? undefined : t.value;
  return (
    <>
      <div className={styles.hrow}>
        {t.template === "qr" ? (
          <Qr />
        ) : t.template === "balance" ? (
          <span className={styles.coin} aria-hidden="true">
            A
          </span>
        ) : (
          <span className={styles.badgeIcon} aria-hidden="true">
            <Icon kind={iconFor(t)} />
          </span>
        )}
        <span className={styles.stackText}>
          <span className={styles.titleText}>{t.title}</span>
          {sub && <span className={styles.sub}>{sub}</span>}
        </span>
        {/* One thing on the right: the amount, else the chip, else a quiet button. */}
        {right ? <Value v={right} /> : t.chip ? <Chip>{t.chip}</Chip> : t.cta && !hero ? <span className={styles.ctaSmall}>{t.cta}</span> : null}
      </div>
      {t.template === "meter" && (
        <span className={styles.bar} aria-hidden="true">
          {rows.length ? rows.map(([k, v]) => <i key={k} style={{ flexBasis: v }} />) : <i style={{ flexBasis: "64%" }} />}
        </span>
      )}
      {hero && t.cta && <Cta>{t.cta}</Cta>}
    </>
  );
}

/** A confirmation or notice: a slim status row, not a peer card. */
function StatusBody({ t }: { t: Tile }) {
  return (
    <div className={styles.hrow}>
      {t.template === "toast" ? (
        <span className={styles.ok} aria-hidden="true">
          <Check />
        </span>
      ) : (
        <span className={styles.dot} aria-hidden="true" />
      )}
      <span className={styles.titleText}>{t.title}</span>
      {t.chip && <Chip>{t.chip}</Chip>}
    </div>
  );
}

export type FakeTileProps = {
  tile: Tile;
  role: TileRole;
  /** Position from the top, for the boot stagger. */
  index: number;
  /** Before Build app: the brick's strip and studs, a short title and grey bars. */
  wire: boolean;
  inspected: boolean;
  onInspect?: (id: LegoId | null) => void;
  refCb?: (el: HTMLLIElement | null) => void;
};

/** One fake-app tile: a card with the brick's colour strip and round studs on top. */
export default function FakeTile({ tile, role, index, wire, inspected, onInspect, refCb }: FakeTileProps) {
  const lego = BY_ID[tile.legoId];
  const studs = Math.max(4, Math.min(8, lego.size[0] * 2));
  const style = { ...accentVars(tile.accent), "--i": index } as CSSProperties;
  const tap = useRef<{ was: boolean } | null>(null);
  return (
    <li
      ref={refCb}
      className={styles.tile}
      style={style}
      data-tile={tile.legoId}
      data-template={tile.template}
      data-role={role}
      data-wire={wire || undefined}
      data-pale={PALE.has(tile.accent) || undefined}
      data-inspect={inspected || undefined}
      onMouseEnter={onInspect ? () => onInspect(tile.legoId) : undefined}
      onMouseLeave={onInspect ? () => onInspect(null) : undefined}
    >
      <span className={styles.strip} aria-hidden="true">
        {Array.from({ length: studs }, (_, i) => (
          <i key={i} />
        ))}
      </span>
      <div className={styles.body}>
        {wire ? (
          <>
            <span className={styles.wireTitle}>{wireLabel(tile)}</span>
            <span className={styles.skelLine} />
            {role === "hero" && <span className={styles.skelLine} data-short />}
          </>
        ) : role === "hero" ? (
          <HeroBody t={tile} />
        ) : role === "status" ? (
          <StatusBody t={tile} />
        ) : (
          <RowBody t={tile} />
        )}
      </div>
      <span className={styles.madeWith} aria-hidden={!inspected || undefined} data-show={inspected || undefined}>
        Made with <b style={{ background: lego.brick.hex, color: lego.brick.label }}>{lego.verb}</b>
      </span>
      {onInspect && (
        <button
          type="button"
          className={styles.inspect}
          aria-label={`${wire ? wireLabel(tile) : tile.title}: made with the ${lego.verb} brick (${lego.name})`}
          onPointerDown={(e) => {
            // Read before the tap's focus inspects it: a second tap on the same tile turns it off.
            tap.current = e.pointerType === "touch" ? { was: inspected } : null;
          }}
          onFocus={() => onInspect(tile.legoId)}
          onBlur={() => onInspect(null)}
          onClick={(e) => {
            const t = tap.current;
            tap.current = null;
            const was = t ? t.was : e.detail === 0 && inspected;
            onInspect(was ? null : tile.legoId);
          }}
        />
      )}
    </li>
  );
}
