"use client";

import { createContext, useCallback, useContext, useRef, type CSSProperties, type ElementType, type ReactNode } from "react";
import { BY_ID, type LegoId } from "@/lib";
import { monotonePath, series, toPoints, type IconName, type RowSpec } from "@/lib/appScreens";
import { Icon } from "./Icons";
import s from "./Screen.module.css";

/** What every region needs from the phone: the inspected brick, the setter, the connector ref and the screen order. */
export type ScreenCtxValue = {
  inspect: LegoId | null;
  onInspect?: (id: LegoId | null) => void;
  regionRef?: (id: string, el: HTMLElement | null) => void;
  /** Placed bricks in screen order (the boot stagger index). */
  order: readonly LegoId[];
  /** Before Build app: the screen is a skeleton. */
  wire: boolean;
};

export const ScreenCtx = createContext<ScreenCtxValue>({ inspect: null, order: [], wire: false });

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/**
 * One brick's region on the screen: real text with `data-region`, a connector anchor, hover/focus
 * inspect, and "Made with <brick>" while inspected. Without an id it is plain shell (no brick).
 * The only control is a transparent inspect button over the region; the fake UI inside is inert.
 */
export function Region({ id, as: Tag = "div", className, children, opt, style }: { id?: LegoId; as?: ElementType; className?: string; children: ReactNode; opt?: boolean; style?: CSSProperties }) {
  const ctx = useContext(ScreenCtx);
  const { regionRef, onInspect } = ctx;
  const tap = useRef<{ was: boolean } | null>(null);
  const ref = useCallback((el: HTMLElement | null) => (id ? regionRef?.(id, el) : undefined), [id, regionRef]);
  if (!id) {
    return (
      <Tag className={className} data-opt={opt || undefined} style={style}>
        {children}
      </Tag>
    );
  }
  const lego = BY_ID[id];
  const inspected = ctx.inspect === id;
  const label = `${lego.verb} brick (${lego.name})`;
  return (
    <Tag
      ref={ref}
      className={cx(s.region, className)}
      data-region={id}
      data-inspect={inspected || undefined}
      style={{ ...style, "--i": ctx.order.indexOf(id) + 1, "--brick": lego.brick.hex } as CSSProperties}
      onMouseEnter={onInspect ? () => onInspect(id) : undefined}
      onMouseLeave={onInspect ? () => onInspect(null) : undefined}
    >
      {children}
      <span className={s.made} aria-hidden={!inspected || undefined} data-show={inspected || undefined}>
        Made with <b style={{ background: lego.brick.hex, color: lego.brick.label }}>{lego.verb}</b>
      </span>
      {onInspect && (
        <button
          type="button"
          className={s.inspect}
          aria-label={`Made with the ${label}`}
          onPointerDown={(e) => {
            // Read before the tap's focus inspects it: a second tap on the same region turns it off.
            tap.current = e.pointerType === "touch" ? { was: inspected } : null;
          }}
          onFocus={() => onInspect(id)}
          onBlur={() => onInspect(null)}
          onClick={(e) => {
            const t = tap.current;
            tap.current = null;
            const was = t ? t.was : e.detail === 0 && inspected;
            onInspect(was ? null : id);
          }}
        />
      )}
    </Tag>
  );
}

/** Text that turns into a skeleton bone before Build app. */
export function T({ children, className, as: Tag = "span" }: { children: ReactNode; className?: string; as?: ElementType }) {
  return <Tag className={cx(s.t, className)}>{children}</Tag>;
}

/** "$1,240.00" as the hero number: the cents smaller on the same baseline. */
export function Money({ value, className, plain }: { value: string; className?: string; plain?: boolean }) {
  const m = plain ? null : /^(.*?)(\.\d+)$/.exec(value);
  return (
    <T className={cx(s.money, className)}>
      {m ? (
        <>
          {m[1]}
          <small>{m[2]}</small>
        </>
      ) : (
        value
      )}
    </T>
  );
}

export function Chip({ children, tone }: { children: ReactNode; tone?: "blue" | "dark" }) {
  return (
    <span className={cx(s.chip, s.bone)} data-tone={tone}>
      {children}
    </span>
  );
}

/** A blue (or grey) pill that looks like a button and is not one. */
export function Pill({ children, quiet, icon, className }: { children: ReactNode; quiet?: boolean; icon?: IconName; className?: string }) {
  return (
    <span className={cx(s.pill, s.bone, className)} data-quiet={quiet || undefined} aria-hidden="true">
      {icon && <Icon name={icon} />}
      {children}
    </span>
  );
}

/** "⚡0.2s" in blue, after a subtitle. */
export function Bolt({ children }: { children: ReactNode }) {
  return (
    <span className={s.bolt}>
      <Icon name="bolt" />
      {children}
    </span>
  );
}

export function Avatar({ letter, icon, tone, size = "md" }: { letter?: string; icon?: IconName; tone?: RowSpec["tone"]; size?: "sm" | "md" | "lg" | "xl" }) {
  return (
    <span className={cx(s.avatar, s.bone)} data-tone={tone} data-size={size} aria-hidden="true">
      {icon ? <Icon name={icon} /> : letter}
    </span>
  );
}

export function IconBtn({ icon }: { icon: IconName }) {
  return (
    <span className={cx(s.iconBtn, s.bone)} aria-hidden="true">
      <Icon name={icon} />
    </span>
  );
}

export function Meter({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cx(s.meter, className)} aria-hidden="true">
      <i style={{ width: `${value}%` }} />
    </span>
  );
}

function Toggle() {
  return (
    <span className={cx(s.toggle, s.bone)} aria-hidden="true">
      <i />
    </span>
  );
}

function Trail({ row }: { row: RowSpec }) {
  const t = row.trail;
  if (row.amount) {
    const pos = row.kind === "activity" && row.positive;
    const delta = row.kind === "position" && row.time?.startsWith("+");
    return (
      <span className={s.end}>
        <T className={cx(s.amount, pos && s.pos)}>{pos ? `+${row.amount}` : row.amount}</T>
        {row.time && <T className={cx(s.time, delta && s.pos)}>{row.time}</T>}
      </span>
    );
  }
  if (!t) return null;
  return (
    <span className={s.end}>
      {t.chip && <Chip>{t.chip}</Chip>}
      {t.pill && <Pill className={s.pillSm}>{t.pill}</Pill>}
      {t.toggle && <Toggle />}
      {t.meter !== undefined && <Meter value={t.meter} className={s.meterSm} />}
      {t.check && (
        <span className={cx(s.check, s.bone)} aria-hidden="true">
          <Icon name="check" />
        </span>
      )}
      {t.chevron && <Icon name="chevron" className={s.chev} />}
    </span>
  );
}

/** One list row: avatar, title (+tag), subtitle (+bolt), amount and time or a trailing control. */
export function RowBody({ row }: { row: RowSpec }) {
  return (
    <>
      <Avatar letter={row.letter} icon={row.icon} tone={row.tone} />
      <span className={s.main}>
        <span className={s.titleLine}>
          <T className={s.rowTitle}>{row.title}</T>
          {row.tag && <Chip>{row.tag}</Chip>}
        </span>
        <T className={s.rowSub}>
          {row.sub}
          {row.bolt && (
            <>
              {" · "}
              <Bolt>{row.bolt}</Bolt>
            </>
          )}
        </T>
      </span>
      <Trail row={row} />
    </>
  );
}

/** A list row in a hairline list (activity, positions, payouts). */
export function ListRow({ id, row, opt }: { id?: LegoId; row: RowSpec; opt?: boolean }) {
  return (
    <Region id={id} as="li" className={s.row} opt={opt}>
      <RowBody row={row} />
    </Region>
  );
}

/** A bordered card row (Verified, Block and recover...). */
export function Notice({ id, row }: { id?: LegoId; row: RowSpec }) {
  return (
    <Region id={id} className={s.notice}>
      <RowBody row={row} />
    </Region>
  );
}

export function SectionHead({ title, link = "See all" }: { title: string; link?: string | null }) {
  return (
    <div className={s.section}>
      <T as="h3" className={s.sectionTitle}>
        {title}
      </T>
      {link && <T className={s.link}>{link}</T>}
    </div>
  );
}

/**
 * A list: brick rows always shown, then filler rows that hide whole rows when space runs out. `fixed`
 * lists (trade positions) show their fillers as plain rows that the tight density drops.
 */
export function List({ rows, fillers, fixed, className }: { rows: { id: LegoId; row: RowSpec }[]; fillers: readonly RowSpec[]; fixed?: boolean; className?: string }) {
  if (fixed) {
    return (
      <ul className={cx(s.list, className)}>
        {rows.map((r) => (
          <ListRow key={r.id} id={r.id} row={r.row} />
        ))}
        {fillers.map((f) => (
          <ListRow key={f.title + f.sub} row={f} opt={rows.length > 0} />
        ))}
      </ul>
    );
  }
  return (
    <div className={cx(s.listWrap, className)}>
      {rows.length > 0 && (
        <ul className={s.list}>
          {rows.map((r) => (
            <ListRow key={r.id} id={r.id} row={r.row} />
          ))}
        </ul>
      )}
      {fillers.length > 0 && (
        <ul className={s.fill} data-after={rows.length > 0 || undefined}>
          {/* A zero-height first item: a filler row that does not fit wraps out of view instead of showing cut. */}
          <li className={s.fillStart} aria-hidden="true" />
          {fillers.map((f) => (
            <ListRow key={f.title + f.sub} row={f} />
          ))}
        </ul>
      )}
    </div>
  );
}

export type Action = { icon: IconName; label: string; primary?: boolean };

/** Round icon buttons with labels, evenly spread. */
export function ActionRow({ id, items, opt }: { id?: LegoId; items: readonly Action[]; opt?: boolean }) {
  return (
    <Region id={id} className={s.actions} opt={opt}>
      {items.map((a) => (
        <span key={a.label} className={s.action}>
          <span className={cx(s.actionBtn, s.bone)} data-primary={a.primary || undefined} aria-hidden="true">
            <Icon name={a.icon} />
          </span>
          <T className={s.actionLabel}>{a.label}</T>
        </span>
      ))}
    </Region>
  );
}

/** A smooth line (and optional fill) through seeded data; stretches to its box. */
export function Spark({ seed, from, to, n = 28, wobble = 0.05, area = true, className, dot, limit }: { seed: number; from: number; to: number; n?: number; wobble?: number; area?: boolean; className?: string; dot?: boolean; limit?: { value: number; label: string } }) {
  const W = 300;
  const H = 100;
  const v = series(seed, n, from, to, wobble);
  const lo = Math.min(...v, limit?.value ?? Infinity);
  const hi = Math.max(...v, limit?.value ?? -Infinity);
  const pts = toPoints(v, W, H, 8, lo - (hi - lo) * 0.05, hi + (hi - lo) * 0.05);
  const d = monotonePath(pts);
  const last = pts[pts.length - 1]!;
  const gid = `g${seed}`;
  const ly = limit ? toPoints([limit.value, limit.value], W, H, 8, lo - (hi - lo) * 0.05, hi + (hi - lo) * 0.05)[0]![1] : 0;
  return (
    <span className={cx(s.spark, className)} aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" focusable="false">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.16" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {area && <path d={`${d} L${W} ${H} L0 ${H} Z`} fill={`url(#${gid})`} stroke="none" />}
        {limit && <path d={`M0 ${ly.toFixed(1)} H${W}`} className={s.limitLine} vectorEffect="non-scaling-stroke" />}
        <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {dot && <i className={s.dot} style={{ left: `${(last[0] / W) * 100}%`, top: `${(last[1] / H) * 100}%` }} />}
      {limit && (
        <span className={s.limitPill} style={{ top: `${(ly / H) * 100}%` }}>
          {limit.label}
        </span>
      )}
    </span>
  );
}

export type Tab = { icon: IconName; label: string };

export function TabBar({ tabs, active }: { tabs: readonly Tab[]; active: number }) {
  return (
    <div className={s.tabbar} aria-hidden="true">
      {tabs.map((t, i) => (
        <span key={t.label} className={s.tab} data-on={i === active || undefined}>
          <Icon name={t.icon} solid={i === active && (t.icon === "home" || t.icon === "chart")} />
          <span className={s.t}>{t.label}</span>
        </span>
      ))}
    </div>
  );
}

/** Greeting header: avatar, two lines (brand over name), round icon buttons. */
export function Greeting({ initials, top, name, icons, tone }: { initials: string; top: string; name: string; icons: readonly IconName[]; tone?: RowSpec["tone"] }) {
  return (
    <header className={s.header}>
      <Avatar letter={initials} tone={tone} size="lg" />
      <span className={s.hello}>
        <T className={s.helloTop}>
          <span data-testid="phone-brand">{top}</span>
        </T>
        <T className={s.helloName}>{name}</T>
      </span>
      <span className={s.headIcons}>
        {icons.map((i) => (
          <IconBtn key={i} icon={i} />
        ))}
      </span>
    </header>
  );
}

/** Title bar: a round button each side, a centred title (and subtitle). */
export function TitleBar({ left, right, title, sub, brandIsTitle }: { left: IconName; right: IconName; title: string; sub?: string; brandIsTitle?: boolean }) {
  return (
    <header className={cx(s.header, s.titleBar)}>
      <IconBtn icon={left} />
      <span className={s.titleMid}>
        <T className={s.barTitle}>{brandIsTitle ? <span data-testid="phone-brand">{title}</span> : title}</T>
        {sub && (
          <T className={s.barSub}>
            <span data-testid={brandIsTitle ? undefined : "phone-brand"}>{sub}</span>
          </T>
        )}
      </span>
      <IconBtn icon={right} />
    </header>
  );
}
