"use client";

import type { ReactNode } from "react";
import type { LegoId } from "@/lib";
import type { ScreenModel, ScreenRow } from "@/lib/appScreens";
import { Icon } from "./Icons";
import { ActionRow, Avatar, Bolt, Chip, Greeting, List, Meter, Money, Notice, Pill, Region, SectionHead, Spark, T, TabBar, TitleBar, cx, type Action, type Tab } from "./Kit";
import s from "./Screen.module.css";

type P = { m: ScreenModel; brand: string };

const has = (m: ScreenModel, id: LegoId) => m.order.includes(id);

/** The scrolling area between the header and the tab bar (it never scrolls: density decides what fits). */
function Body({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx(s.body, className)} data-body>
      {children}
    </div>
  );
}

function Notices({ rows }: { rows: ScreenRow[] }) {
  if (!rows.length) return null;
  return (
    <div className={s.notices}>
      {rows.map((r) => (
        <Notice key={r.id} id={r.id} row={r.row} />
      ))}
    </div>
  );
}

const HOME_TABS: Tab[] = [
  { icon: "home", label: "Home" },
  { icon: "card", label: "Cards" },
  { icon: "percent", label: "Earn" },
  { icon: "person", label: "Profile" },
];

/* ------------------------------------------------------------------ shared regions */

/** Earn card: rate, amount saved, a sparkline and an Add pill (clipped clear of the line). */
function EarnCard({ id }: { id: LegoId }) {
  return (
    <Region id={id} className={cx(s.card, s.earnCard)}>
      <span className={s.cardText}>
        <T className={s.cardLabel}>Earn · Variable rate</T>
        <T className={s.stat}>4.12% APY</T>
        <T className={s.cardSub}>$300.00 saving</T>
      </span>
      <Spark seed={7} from={296.2} to={300} className={s.earnSpark} area />
      <Pill className={s.earnAdd}>Add</Pill>
    </Region>
  );
}

function CreditCard({ id }: { id: LegoId }) {
  return (
    <Region id={id} className={s.card}>
      <span className={s.cardHead}>
        <T className={s.cardLabel}>Credit line · Variable rate</T>
        <Chip>Safe</Chip>
      </span>
      <span className={s.cardRow}>
        <Money value="$400.00" className={s.statMoney} />
        <T className={s.cardSub}>of $1,000.00</T>
      </span>
      <Meter value={40} />
      <span className={s.cardRow}>
        <T className={s.cardSub}>Loan health · Safe</T>
        <Pill className={s.pillSm}>Borrow</Pill>
      </span>
    </Region>
  );
}

function SwapCard({ id }: { id: LegoId }) {
  return (
    <Region id={id} className={s.card}>
      <T className={s.cardLabel}>Swap</T>
      <span className={s.swap}>
        <span className={s.field}>
          <T className={s.fieldLabel}>From</T>
          <T className={s.fieldValue}>0.10 ETH</T>
        </span>
        <span className={cx(s.swapIcon, s.bone)} aria-hidden="true">
          <Icon name="swap" />
        </span>
        <span className={s.field}>
          <T className={s.fieldLabel}>To</T>
          <T className={s.fieldValue}>341.26 USDC</T>
        </span>
      </span>
    </Region>
  );
}

function OrderCard({ id }: { id: LegoId }) {
  return (
    <Region id={id} className={cx(s.card, s.orderCard)}>
      <span className={s.seg} aria-hidden="true" data-opt>
        <span className={s.t}>Market</span>
        <span className={s.t} data-on="true">
          Limit
        </span>
      </span>
      <span className={s.kv}>
        <T>Limit price</T>
        <T className={s.kvV}>$2.40</T>
      </span>
      <span className={s.kv}>
        <T>Amount</T>
        <T className={s.kvV}>500 BLOX</T>
      </span>
      <span className={cx(s.kv, s.kvTotal)}>
        <T>Total</T>
        <T className={s.kvV}>$1,200.00</T>
      </span>
    </Region>
  );
}

function SplitCard({ id }: { id: LegoId }) {
  return (
    <Region id={id} className={s.card}>
      <span className={s.cardHead}>
        <T className={s.cardLabel}>Revenue split</T>
        <T className={s.cardSub}>$1,200.00</T>
      </span>
      <span className={s.stack} aria-hidden="true">
        <i style={{ flexGrow: 90 }} />
        <i style={{ flexGrow: 10 }} />
      </span>
      <span className={s.legend}>
        <span>
          <T>
            <i className={s.key} /> Creators 90%
          </T>
          <T className={s.kvV}>$1,080.00</T>
        </span>
        <span>
          <T>
            <i className={s.key} data-quiet /> Platform 10%
          </T>
          <T className={s.kvV}>$120.00</T>
        </span>
      </span>
    </Region>
  );
}

function StatsCard({ id }: { id: LegoId }) {
  return (
    <Region id={id} className={s.card}>
      <T className={s.cardLabel}>Today</T>
      <span className={s.stats}>
        <span>
          <T className={s.statSm}>24</T>
          <T className={s.cardSub}>Paid</T>
        </span>
        <span>
          <T className={s.statSm}>1</T>
          <T className={s.cardSub}>Refunded</T>
        </span>
        <span>
          <T className={s.statSm}>$1,180.40</T>
          <T className={s.cardSub}>Matched</T>
        </span>
      </span>
    </Region>
  );
}

function MeterCard({ id, label, value, of, fill, foot }: { id: LegoId; label: string; value: string; of: string; fill: number; foot: string }) {
  return (
    <Region id={id} className={s.card}>
      <T className={s.cardLabel}>{label}</T>
      <span className={s.cardRow}>
        <Money value={value} className={s.statMoney} />
        <T className={s.cardSub}>{of}</T>
      </span>
      <Meter value={fill} />
      <span data-opt>
        <T className={s.cardSub}>{foot}</T>
      </span>
    </Region>
  );
}

function FeatureCard({ id }: { id?: LegoId }) {
  if (!id) return null;
  switch (id) {
    case "financing":
      return <EarnCard id={id} />;
    case "borrow":
      return <CreditCard id={id} />;
    case "swaps":
      return <SwapCard id={id} />;
    case "validity":
      return <OrderCard id={id} />;
    case "splits":
      return <SplitCard id={id} />;
    case "reconcile":
      return <StatsCard id={id} />;
    case "usage-billing":
      return <MeterCard id={id} label="Usage this session" value="$3.20" of="of $5.00 held" fill={64} foot="$1.80 goes back when the session ends" />;
    case "agent-spend":
      return <MeterCard id={id} label="Agent allowance · Shop Agent" value="$0.62" of="of $1.00 a session" fill={62} foot="Stops at the limit, no top-ups" />;
    default:
      return null;
  }
}

/** A thin line of chips under a hero ("USDC · B20", "Amounts private"). */
function HeroChip({ id }: { id?: LegoId }) {
  if (!id) return null;
  const text =
    id === "private-ledgers" ? (
      <>
        <Chip tone="dark">
          <Icon name="eyeoff" /> Private
        </Chip>
        <T className={s.chipNote}>Only you and each person see amounts</T>
      </>
    ) : (
      <>
        <Chip>USDC</Chip>
        <Chip tone="blue">B20</Chip>
        <T className={s.chipNote}>Held as a B20 token</T>
      </>
    );
  return (
    <Region id={id} className={s.chipRow}>
      {text}
    </Region>
  );
}

/* ------------------------------------------------------------------ neobank */

function Neobank({ m, brand }: P) {
  const hero = m.slot.hero;
  const earn = has(m, "financing");
  const pay: Action[] = [
    { icon: "send", label: "Send", primary: true },
    { icon: "request", label: "Request" },
    { icon: "contactless", label: "Pay" },
    ...(earn ? [{ icon: "sprout", label: "Earn" } as Action] : []),
  ];
  const shell: Action[] = [
    { icon: "plus", label: "Add", primary: true },
    { icon: "swap", label: "Move" },
    { icon: "card", label: "Cards" },
    { icon: "more", label: "More" },
  ];
  return (
    <>
      <Greeting initials="AK" top={brand} name="Alex" icons={["bell", "scan"]} />
      <Body>
        <Region id={hero} className={s.hero}>
          <T className={s.heroLabel}>Total balance</T>
          <Money value="$1,240.00" className={s.heroMoney} />
          <span className={s.heroMeta}>
            <Chip>USDC</Chip>
            {hero === "b20" && <Chip tone="blue">B20</Chip>}
            {hero === "private-ledgers" && (
              <Chip tone="dark">
                <Icon name="eyeoff" /> Private
              </Chip>
            )}
            {earn && <T className={s.delta}>+$0.03 today</T>}
          </span>
        </Region>
        <ActionRow id={m.slot.actions} items={m.slot.actions ? pay : shell} opt={!m.slot.actions} />
        <FeatureCard id={m.slot.card} />
        <Notices rows={m.notices} />
        <section className={s.grow} data-norows={!m.activity.length || undefined}>
          <i className={s.fillStart} aria-hidden="true" />
          <SectionHead title="Recent activity" />
          <List rows={m.activity} fillers={m.fillers} />
        </section>
      </Body>
      <TabBar tabs={HOME_TABS} active={0} />
    </>
  );
}

/* ------------------------------------------------------------------ earn */

function Earn({ m, brand }: P) {
  const pay: Action[] = [
    { icon: "plus", label: "Add", primary: true },
    { icon: "request", label: "Withdraw" },
    { icon: "send", label: "Send" },
    { icon: "contactless", label: "Pay" },
  ];
  const shell: Action[] = [
    { icon: "plus", label: "Add", primary: true },
    { icon: "request", label: "Withdraw" },
    { icon: "repeat", label: "Auto-save" },
  ];
  return (
    <>
      <Greeting initials="AK" top={brand} name="Alex" icons={["bell"]} />
      <Body>
        <Region id={m.slot.hero} className={s.hero}>
          <T className={s.heroLabel}>Savings</T>
          <Money value="$480.20" className={s.heroMoney} />
          <span className={s.heroMeta}>
            <Chip tone="blue">4.12% APY</Chip>
            <T className={s.chipNote}>Variable rate · +$0.38 this week</T>
          </span>
          <Spark seed={11} from={471.4} to={480.2} className={s.heroSpark} dot opt />
        </Region>
        <HeroChip id={m.slot.heroChip} />
        <ActionRow id={m.slot.actions} items={m.slot.actions ? pay : shell} opt={!m.slot.actions} />
        <FeatureCard id={m.slot.card} />
        <Notices rows={m.notices} />
        <section className={s.grow} data-norows={!m.activity.length || undefined}>
          <i className={s.fillStart} aria-hidden="true" />
          <SectionHead title="Activity" />
          <List rows={m.activity} fillers={m.fillers} />
        </section>
      </Body>
      <TabBar
        tabs={[
          { icon: "home", label: "Home" },
          { icon: "sprout", label: "Earn" },
          { icon: "chart", label: "Activity" },
          { icon: "person", label: "Profile" },
        ]}
        active={1}
      />
    </>
  );
}

/* ------------------------------------------------------------------ trade */

function Trade({ m, brand }: P) {
  const speed = m.slot.speedLine;
  const limit = has(m, "validity");
  return (
    <>
      <TitleBar left="back" right="star" title="BLOX / USDC" sub={brand} />
      <Body>
        <div className={s.hero}>
          <Money value="$2.4815" className={cx(s.heroMoney, s.price)} plain />
          <T className={s.delta}>+$0.1123 (+4.74%) today</T>
        </div>
        {speed && (
          <Region id={speed} className={s.speedLine}>
            <T>
              <Bolt>{speed === "flashblocks" ? "Pre-confirmed in 0.2s" : "Updates every 0.2s"}</Bolt>
            </T>
          </Region>
        )}
        <div className={s.chartBox}>
          <Spark seed={5} from={2.3692} to={2.4815} n={32} wobble={0.035} className={s.chart} dot limit={limit ? { value: 2.4, label: "Limit $2.40" } : undefined} />
        </div>
        <div className={s.ranges} aria-hidden="true" data-opt>
          {["1H", "1D", "1W", "1M", "1Y"].map((r) => (
            <span key={r} className={s.t} data-on={r === "1D" || undefined}>
              {r}
            </span>
          ))}
        </div>
        <FeatureCard id={m.slot.card} />
        <section className={s.positions} data-opt={!m.positions.length || undefined}>
          <SectionHead title="Positions" />
          <List rows={m.positions} fillers={m.fillers} fixed />
        </section>
        <Notices rows={m.notices} />
        <div className={s.duo} data-opt>
          <Pill quiet>Sell</Pill>
          <Pill>Buy</Pill>
        </div>
      </Body>
      <TabBar
        tabs={[
          { icon: "home", label: "Home" },
          { icon: "chart", label: "Markets" },
          { icon: "doc", label: "Orders" },
          { icon: "person", label: "Profile" },
        ]}
        active={1}
      />
    </>
  );
}

/* ------------------------------------------------------------------ checkout */

function Checkout({ m, brand }: P) {
  const name = m.slot.merchant;
  const lines = m.multi.summaryLine ?? [];
  const from = m.slot.payFrom;
  const foot = m.slot.footnote;
  return (
    <>
      <TitleBar left="back" right="close" title={brand} brandIsTitle />
      <Body className={s.sheetBody}>
        <Region id={name} className={s.merchant}>
          <Avatar letter={name ? "a" : "N"} tone={name ? "blue" : "dark"} size="xl" />
          <span className={s.merchantText}>
            <T className={s.merchantName}>{name ? "alice.base.eth" : "Northside Market"}</T>
            <T className={s.merchantSub}>{name ? "Paying by name · Order #1042" : "Order #1042 · 2 items"}</T>
          </span>
        </Region>
        <div className={s.amountBlock}>
          <T className={s.amountMoney}>$12.00</T>
          <Chip>USDC</Chip>
        </div>
        <div className={cx(s.card, s.summary)}>
          <Region id={m.slot.summary} className={s.items} opt={!m.slot.summary}>
            <span className={s.kv}>
              <T>Oat latte</T>
              <T className={s.kvV}>$4.50</T>
            </span>
            <span className={s.kv}>
              <T>Almond croissant</T>
              <T className={s.kvV}>$7.50</T>
            </span>
          </Region>
          {lines.map((id) => (
            <Region key={id} id={id} className={s.kv}>
              <T>{id === "memos" ? "Memo" : "Split"}</T>
              <T className={s.kvV}>{id === "memos" ? "INV-1042" : "Seller 90% · App 10%"}</T>
            </Region>
          ))}
          {m.slot.fee && (
            <Region id={m.slot.fee} className={s.kv}>
              <span className={s.kvK}>
                <T>Network fee</T>
                <Chip>Sponsored</Chip>
              </span>
              <T className={s.kvV}>$0.00</T>
            </Region>
          )}
          <span className={cx(s.kv, s.kvTotal)}>
            <T>Total</T>
            <T className={s.kvV}>$12.00</T>
          </span>
        </div>
        <Notices rows={m.notices} />
        {from && (
          <Region id={from} className={s.payFrom}>
            <span className={cx(s.square, s.bone)} aria-hidden="true">
              <Icon name={from === "private-ledgers" ? "eyeoff" : "card"} />
            </span>
            <span className={s.main}>
              <T className={s.rowTitle}>{from === "private-ledgers" ? "Private balance" : "USDC balance"}</T>
              <T className={s.rowSub}>{from === "private-ledgers" ? "$•••• · only you see it" : "$1,240.00 · B20"}</T>
            </span>
            <Icon name="chevron" className={s.chev} />
          </Region>
        )}
        <div className={s.payFoot}>
          {foot && (
            <Region id={foot} className={s.footnote}>
              <T>
                <Bolt>{foot === "flashblocks" ? "Pre-confirmed in 0.2s" : "Confirms in 0.2s"}</Bolt>
              </T>
            </Region>
          )}
          <Region id={m.slot.cta} className={s.ctaWrap}>
            <Pill icon="faceid" className={s.cta}>
              Pay $12.00
            </Pill>
            {m.slot.cta && <T className={s.ctaNote}>One tap with Base Pay</T>}
          </Region>
        </div>
      </Body>
      <div className={s.homeSpace} aria-hidden="true" />
    </>
  );
}

/* ------------------------------------------------------------------ payroll */

function Payroll({ m, brand }: P) {
  return (
    <>
      <Greeting initials="NS" tone="dark" top={brand} name="Northside Studio" icons={["bell", "plus"]} />
      <Body>
        <Region id={m.slot.hero} className={s.hero}>
          <T className={s.heroLabel}>Next payout · Fri, Jun 7</T>
          <Money value="$1,200.00" className={s.heroMoney} />
          <span className={s.heroMeta}>
            <T className={s.chipNote}>3 people · USDC</T>
            {m.slot.hero && <Pill className={cx(s.pillSm, s.heroPill)}>Send all</Pill>}
          </span>
        </Region>
        <HeroChip id={m.slot.heroChip} />
        <FeatureCard id={m.slot.card} />
        <Notices rows={m.notices} />
        <section className={s.grow} data-norows={!m.activity.length || undefined}>
          <i className={s.fillStart} aria-hidden="true" />
          <SectionHead title="This run" />
          <List rows={m.activity} fillers={m.fillers} />
        </section>
      </Body>
      <TabBar
        tabs={[
          { icon: "home", label: "Home" },
          { icon: "people", label: "People" },
          { icon: "chart", label: "Reports" },
          { icon: "grid", label: "Settings" },
        ]}
        active={0}
      />
    </>
  );
}

/* ------------------------------------------------------------------ agent / API */

const BARS = [22, 30, 26, 38, 34, 44, 40, 52, 48, 58, 54, 66, 62, 70, 64, 76, 72, 82, 78, 88, 84, 92, 90, 100];

function Agent({ m, brand }: P) {
  return (
    <>
      <Greeting initials="AK" top={brand} name="Overview" icons={["bell", "more"]} />
      <Body>
        <Region id={m.slot.hero} className={s.hero}>
          <T className={s.heroLabel}>Revenue today</T>
          <Money value="$412.80" className={s.heroMoney} />
          <span className={s.heroMeta}>
            <T className={s.delta}>+$38.20 vs yesterday</T>
          </span>
          <span className={s.bars} aria-hidden="true" data-opt>
            {BARS.map((h, i) => (
              <i key={i} style={{ height: `${h}%` }} />
            ))}
          </span>
          <T className={s.chipNote}>41,280 paid calls · $0.01 each</T>
        </Region>
        <HeroChip id={m.slot.heroChip} />
        <FeatureCard id={m.slot.card} />
        <Notices rows={m.notices} />
        <section className={s.grow} data-norows={!m.activity.length || undefined}>
          <i className={s.fillStart} aria-hidden="true" />
          <SectionHead title="Recent calls" />
          <List rows={m.activity} fillers={m.fillers} />
        </section>
      </Body>
      <TabBar
        tabs={[
          { icon: "home", label: "Overview" },
          { icon: "chart", label: "Calls" },
          { icon: "agent", label: "Agents" },
          { icon: "grid", label: "Settings" },
        ]}
        active={0}
      />
    </>
  );
}

/* ------------------------------------------------------------------ identity / onboarding */

function Identity({ m, brand }: P) {
  const name = m.slot.name;
  const cta = m.slot.cta;
  return (
    <>
      <header className={cx(s.header, s.titleBar)}>
        <span className={s.steps} aria-hidden="true">
          <i data-on />
          <i data-on />
          <i />
        </span>
      </header>
      <Body className={s.sheetBody}>
        <div className={s.welcome}>
          <span className={cx(s.mark, s.bone)} aria-hidden="true">
            <Icon name="person" />
          </span>
          <T className={s.welcomeTitle}>
            Welcome to <span data-testid="phone-brand">{brand}</span>
          </T>
          <T className={s.merchantSub}>Set up your account in a few steps</T>
        </div>
        {name && (
          <Region id={name} className={s.nameField}>
            <span className={s.main}>
              <T className={s.fieldLabel}>Your name</T>
              <T className={s.nameValue}>alex.base.eth</T>
            </span>
            <span className={cx(s.check, s.bone)} aria-hidden="true">
              <Icon name="check" />
            </span>
          </Region>
        )}
        <Notices rows={m.notices} />
        <div className={s.payFoot}>
          <Region id={cta} className={s.ctaWrap}>
            <Pill icon={cta ? "wallet" : "faceid"} className={s.cta}>
              {cta ? "Connect wallet" : "Continue"}
            </Pill>
            {cta && <T className={s.ctaNote}>Signs you in with your wallet</T>}
          </Region>
        </div>
      </Body>
      <div className={s.homeSpace} aria-hidden="true" />
    </>
  );
}

/** The whole app screen for a stack, laid out by its archetype. */
export function AppScreen({ m, brand }: P) {
  switch (m.archetype) {
    case "earn":
      return <Earn m={m} brand={brand} />;
    case "trade":
      return <Trade m={m} brand={brand} />;
    case "checkout":
      return <Checkout m={m} brand={brand} />;
    case "payroll":
      return <Payroll m={m} brand={brand} />;
    case "agent":
      return <Agent m={m} brand={brand} />;
    case "identity":
      return <Identity m={m} brand={brand} />;
    default:
      return <Neobank m={m} brand={brand} />;
  }
}
