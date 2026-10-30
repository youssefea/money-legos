"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore, type MouseEvent } from "react";
import {
  BY_ID,
  MAX_LEGOS,
  MIN_LEGOS,
  RECIPES,
  RISK_FOOTER,
  buildFakeApp,
  generate,
  parseHash,
  recipeHash,
  stackOrder,
  surprise,
  toHash,
  type Category,
  type LegoId,
  type Recipe,
} from "@/lib";
import { useBrickDrag } from "@/hooks/useBrickDrag";
import { copyText, useCopiedReset } from "@/hooks/useCopy";
import { useDark, useIsMobile, useReducedMotion } from "@/hooks/useMediaQuery";
import { buzz, useSound } from "@/hooks/useSound";
import { initialState, reducer, resultOf, stepStates, type LoadSource } from "@/state/store";
import Board from "./Board";
import { BrickGlyph } from "./BrickArt";
import Connectors from "./Connectors";
import DetailsDrawer from "./DetailsDrawer";
import Header, { SoundToggle } from "./Header";
import MobileBar from "./MobileBar";
import RecipesMenu from "./RecipesMenu";
import ResultPanel from "./ResultPanel";
import ResultSheet from "./ResultSheet";
import type { StageLayout } from "./StageView";
import StepsRail from "./StepsRail";
import Toast from "./Toast";
import Tray from "./Tray";
import styles from "@/app/page.module.css";

const COMPACT_QUERY = "(max-width: 1023.98px)";
const PRESENT_KEY = "money-legos:present";
/** How long the app name may take to type in before it is shown plainly (live edits then crossfade). */
const TYPE_MS = 1800;

// Present mode lives in sessionStorage (this tab only, never the URL); a tiny external store over it.
const presentListeners = new Set<() => void>();
let presentMemory = false;
function readPresent(): boolean {
  try {
    return window.sessionStorage.getItem(PRESENT_KEY) === "1";
  } catch {
    return presentMemory;
  }
}
function writePresent(on: boolean) {
  presentMemory = on;
  try {
    window.sessionStorage.setItem(PRESENT_KEY, on ? "1" : "0");
  } catch {
    // private mode: kept in memory only
  }
  presentListeners.forEach((l) => l());
}
function subscribePresent(l: () => void) {
  presentListeners.add(l);
  return () => {
    presentListeners.delete(l);
  };
}

/** A board brick's button (the live board's hit targets), or Build app when there is no such brick. */
function boardBrick(id: LegoId | undefined): string {
  return id ? `button[data-board-brick="${id}"]` : '[data-testid="build"]';
}

/** Shown and focusable: laid out, not inside a hidden or inert subtree. */
function focusable(el: HTMLElement | null): el is HTMLElement {
  if (!el || !el.isConnected || el.closest("[inert], [hidden], [aria-hidden='true']")) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
}

/**
 * Focus the first of `selectors` that is visible and takes the focus (board hit targets appear after
 * the stage measures the new stack), checking that it really did. Gives up after ~0.5s, then falls back
 * to Build app (desktop) or the compact bar's action, never leaving focus on <body>.
 */
function focusSoon(...selectors: string[]) {
  let tries = 0;
  const attempt = (list: string[]) => {
    for (const sel of list) {
      const el = document.querySelector<HTMLElement>(sel);
      if (!focusable(el)) continue;
      el.focus({ preventScroll: true });
      if (document.activeElement === el) return true;
    }
    return false;
  };
  const step = () => {
    if (attempt(selectors)) return;
    if (++tries < 30) {
      requestAnimationFrame(step);
      return;
    }
    attempt(['[data-testid="build"]', '[data-testid="mobile-action"]', '[data-testid="present-toggle"]']);
  };
  requestAnimationFrame(step);
}

/** A global single-key shortcut (P) only fires when nothing that takes typing or a menu has focus. */
function shortcutBlocked(t: EventTarget | null): boolean {
  if (document.querySelector("dialog[open], [popover]:popover-open")) return true;
  if (!(t instanceof HTMLElement)) return false;
  if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return true;
  return !!t.closest(
    '[role="textbox"], [role="searchbox"], [role="combobox"], [role="menu"], [role="menubar"], [role="listbox"], [role="dialog"], [role="tooltip"], [data-typeahead]',
  );
}

/**
 * The whole playground: pick bricks (the phone shows them as wireframes), Build app (the phone boots
 * into a fake app), then every change updates it live; copy the prompt.
 */
export default function MoneyLegosApp() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const dark = useDark();
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const sound = useSound();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectSignal, setSelectSignal] = useState(0);
  const [layout, setLayout] = useState<StageLayout | null>(null);
  const [inspect, setInspect] = useState<LegoId | null>(null);
  const [hoverId, setHoverId] = useState<LegoId | null>(null);
  // Present mode (P or the header toggle): board + phone fill the screen, bricks in a bottom drawer.
  // Remembered for the tab (sessionStorage), never in the URL.
  const present = useSyncExternalStore(subscribePresent, readPresent, () => false);
  // Entering or leaving Present moves the tray (bin <-> drawer): the focused brick, or else the
  // Present toggle, keeps the focus across the move (never <body>).
  const presentFocus = useRef<{ lego: LegoId | null } | null>(null);
  // The drawer opens on the category of the brick that had focus, so that brick is there to focus.
  const [stripCategory, setStripCategory] = useState<Category | null>(null);
  const setPresent = useCallback((on: boolean) => {
    const el = document.activeElement as HTMLElement | null;
    const lego = (el?.dataset.lego as LegoId | undefined) ?? null;
    setStripCategory(lego && BY_ID[lego] && BY_ID[lego].tier !== "hero" ? BY_ID[lego].category : null);
    // (Safari does not focus a clicked button: then the toggle gets the focus, never <body>.)
    presentFocus.current = { lego };
    writePresent(on);
  }, []);
  const copyRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const detailsReturn = useRef<HTMLElement | null>(null);
  const tiles = useRef(new Map<string, HTMLElement>());

  const count = state.ids.length;
  const ready = count >= MIN_LEGOS;
  const app = useMemo(() => buildFakeApp(state.ids), [state.ids]);
  const result = useMemo(() => resultOf({ built: state.built, ids: state.ids }), [state.built, state.ids]);
  const live = !!result;
  const slots = Math.max(0, 3 - count);
  const play = !!state.typing && state.typing.n === state.generation;
  const inspected = inspect && state.ids.includes(inspect) ? inspect : null;
  const tileRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) tiles.current.set(id, el);
    else tiles.current.delete(id);
  }, []);

  const compactNow = () => window.matchMedia(COMPACT_QUERY).matches;

  const place = useCallback(
    (id: LegoId, ids: readonly LegoId[]) => {
      const adding = !ids.includes(id);
      dispatch({ type: "toggle", id });
      if (adding) {
        sound.play("snap");
        buzz();
      }
    },
    [sound],
  );

  const { drag, onPointerDown, wasDrag } = useBrickDrag([dropRef], (id) => {
    if (!state.ids.includes(id)) place(id, state.ids);
  });
  const nextId = drag?.id ?? hoverId;
  const ghostSize = nextId && !state.ids.includes(nextId) && count < MAX_LEGOS ? BY_ID[nextId].size : undefined;

  const opened = () => {
    sound.play("open");
    if (compactNow()) setSheetOpen(true);
  };

  const load = (ids: readonly LegoId[], recipe: string | null, source: LoadSource) => {
    dispatch({ type: "load", ids, recipe, build: true, source });
    if (ids.length >= MIN_LEGOS) opened();
  };

  // Build app, then (same button, same place) Replay: plays the boot again. A keyboard Build hands
  // focus to Copy prompt (the next step); a click leaves focus where it is.
  const onBuild = (e?: MouseEvent<HTMLButtonElement>) => {
    dispatch({ type: "build" }); // with fewer than 2 bricks this only announces what is missing
    if (!ready) return;
    opened();
    const keyboard = !!e && e.detail === 0 && !live;
    if (keyboard && !compactNow()) requestAnimationFrame(() => copyRef.current?.focus({ preventScroll: true }));
  };

  // After a board brick goes (or Undo brings one back), focus stays on the board: the brick now in
  // that place, the one below it, or Build app when the board is empty. Never <body>.
  // A pointer removal focuses the board region instead (no inspect highlight under a resting mouse).
  const onRemoveBoard = (id: LegoId, keyboard: boolean) => {
    const i = state.ids.indexOf(id);
    const rest = state.ids.filter((x) => x !== id);
    dispatch({ type: "remove", id, toast: true });
    setInspect(null);
    focusSoon(keyboard ? boardBrick(rest[i] ?? rest[i - 1]) : '[data-testid="board"]', '[data-testid="board"]');
  };

  // Undo from the toast unmounts its button: focus moves to the brick that came back. Ctrl/Cmd+Z leaves
  // focus where it is, unless it was nowhere (<body>) or inside the toast.
  const onUndo = (fromToast: boolean) => {
    const t = state.toast;
    if (!t) return;
    const back = t.prev.ids.find((x) => !state.ids.includes(x));
    const a = document.activeElement;
    const move = fromToast || !a || a === document.body || !!a.closest("[data-testid='toast']");
    dispatch({ type: "undo" });
    if (!move) return;
    // Compact: the restored brick's tray button (the board is not on screen), else the bar's action.
    if (compactNow()) focusSoon(...(back ? [`button[data-lego="${back}"]`] : []), '[data-testid="mobile-action"]');
    else focusSoon(boardBrick(back), '[data-testid="board"]');
  };

  // Compact bar: Build app, then View app (the live app in the sheet).
  const onMobileAction = () => {
    if (live) setSheetOpen(true);
    else onBuild();
  };

  const onRecipe = (r: Recipe) => load(stackOrder(r.ids), r.recipe, "recipe");
  const onSurprise = () => load(surprise(state.ids), null, "surprise");
  const onClear = () => {
    dispatch({ type: "clear" });
    setSheetOpen(false);
    setDetailsOpen(false);
  };

  const openDetails = () => {
    if (!ready) return;
    if (!live) dispatch({ type: "build" });
    detailsReturn.current = document.activeElement as HTMLElement | null;
    setDetailsOpen(true);
  };
  const closeDetails = () => {
    setDetailsOpen(false);
    detailsReturn.current?.focus();
  };

  // Copy prompt works from 2 bricks: it builds the app first if needed, then copies.
  const onCopy = async () => {
    if (!ready) return;
    const prompt = result?.prompt ?? generate(state.ids)?.prompt;
    if (!prompt) return;
    if (!live) dispatch({ type: "build" });
    if (await copyText(prompt)) {
      dispatch({ type: "copied" });
      return;
    }
    // Clipboard blocked: open Details with the prompt selected, so Cmd/Ctrl+C works.
    if (!detailsOpen) openDetails();
    setSelectSignal((n) => n + 1);
  };

  useCopiedReset(state.copied, () => dispatch({ type: "copyReset" }));

  // The name types in once per Build; after that it is plain text (so reopening never retypes it).
  useEffect(() => {
    if (!state.typing) return;
    const t = window.setTimeout(() => dispatch({ type: "typed" }), TYPE_MS);
    return () => window.clearTimeout(t);
  }, [state.typing]);

  // Present mode: P toggles it and Escape leaves it. Ctrl/Cmd+Z is the toast's Undo (only while it shows).
  const undoRef = useRef(onUndo);
  useEffect(() => {
    undoRef.current = onUndo;
  });
  const hasToast = !!state.toast;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey) return;
      if (shortcutBlocked(e.target)) return;
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
        if (!hasToast) return;
        e.preventDefault();
        undoRef.current(false);
        return;
      }
      if (e.metaKey || e.ctrlKey) return;
      if (e.key === "p" || e.key === "P") {
        if (compactNow() || e.shiftKey || e.repeat) return;
        e.preventDefault();
        setPresent(!present);
      } else if (e.key === "Escape" && present) {
        setPresent(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [present, setPresent, hasToast]);

  // Deep links: #b20,payments,speed or #recipe=neobroker load the stack and build it. An empty hash
  // (Back to the start) or a link with no known bricks clears the board, so URL and screen agree.
  // The link itself is normalised here (unknown ids dropped); the board's own write below skips
  // link loads, so it can never overwrite a newer hash.
  const firstRead = useRef(true);
  const skipWrite = useRef(false);
  useEffect(() => {
    const setHash = (want: string) => {
      if (window.location.hash === want || (!want && !window.location.hash)) return;
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search + want);
    };
    const read = () => {
      const initial = firstRead.current;
      firstRead.current = false;
      const h = window.location.hash;
      const ids = parseHash(h);
      if (!ids.length) {
        setHash("");
        if (!initial || h) {
          skipWrite.current = true;
          dispatch({ type: "load", ids: [], build: false, source: "link" });
          setSheetOpen(false);
          setDetailsOpen(false);
        }
        return;
      }
      const recipe = recipeFromHash(h);
      setHash(recipe ? recipeHash(recipe) : toHash(ids));
      skipWrite.current = true;
      dispatch({ type: "load", ids, recipe, build: true, source: "link" });
      // A shared app on a phone opens straight on the app.
      if (ids.length >= MIN_LEGOS && compactNow()) setSheetOpen(true);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  // Keep the hash in step with the board (replaceState: no history spam, no hashchange).
  const firstWrite = useRef(true);
  useEffect(() => {
    if (firstWrite.current || skipWrite.current) {
      firstWrite.current = false;
      skipWrite.current = false;
      return;
    }
    const want = state.recipe ? recipeHash(state.recipe) : toHash(state.ids);
    if (window.location.hash === want || (!want && !window.location.hash)) return;
    const url = window.location.pathname + window.location.search + want;
    window.history.replaceState(window.history.state, "", url);
  }, [state.ids, state.recipe]);

  const closeSheet = () => {
    setSheetOpen(false);
    actionRef.current?.focus();
  };

  const steps = stepStates(state);
  const announce = state.announce.text + (state.announce.n % 2 ? "\u200b" : "");
  const dragLego = drag ? BY_ID[drag.id] : null;
  const presenting = present && !isMobile;
  useLayoutEffect(() => {
    const want = presentFocus.current;
    presentFocus.current = null;
    if (!want) return;
    const target =
      (want.lego && document.querySelector<HTMLElement>(`button[data-lego="${want.lego}"]`)) || document.querySelector<HTMLElement>('[data-testid="present-toggle"]');
    target?.focus({ preventScroll: true });
  }, [presenting]);
  // Crossing the compact breakpoint unmounts what had focus (the sheet, the board, the bar): when focus
  // fell to <body>, it goes to the layout's next step (desktop Copy prompt or the first brick; compact:
  // the bar's action). Never <body>.
  const prevMobile = useRef(isMobile);
  const lastFocus = useRef<Element | null>(null);
  useEffect(() => {
    const on = (e: FocusEvent) => {
      lastFocus.current = e.target instanceof Element ? e.target : null;
    };
    document.addEventListener("focusin", on);
    return () => document.removeEventListener("focusin", on);
  }, []);
  useEffect(() => {
    if (prevMobile.current === isMobile) return;
    prevMobile.current = isMobile;
    // Only when something had focus and the switch took it away (never on page load).
    if (!lastFocus.current) return;
    let raf = 0;
    let tries = 0;
    const step = () => {
      const a = document.activeElement;
      if (a instanceof HTMLElement && a !== document.body && focusable(a)) return;
      const list = isMobile
        ? ['[data-testid="mobile-action"]']
        : ['[data-testid="copy"]:not([aria-disabled="true"])', 'button[data-lego][tabindex="0"]', '[data-testid="build"]'];
      for (const sel of list) {
        const el = document.querySelector<HTMLElement>(sel);
        if (!focusable(el)) continue;
        el.focus({ preventScroll: true });
        if (document.activeElement === el) return;
      }
      if (++tries < 30) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [isMobile]);
  const tray = (
    <Tray
      ids={state.ids}
      onToggle={(id) => place(id, state.ids)}
      onPointerDown={onPointerDown}
      wasDrag={wasDrag}
      dragging={drag?.id ?? null}
      inspect={inspected}
      onInspect={setInspect}
      onHover={setHoverId}
      layout={presenting ? "strip" : "bin"}
      initialCategory={stripCategory}
    />
  );

  return (
    <div className={styles.page} data-dragging={drag ? "true" : undefined} data-present={presenting || undefined}>
      <div className={styles.top}>
        <Header present={presenting} onPresent={isMobile ? undefined : setPresent} />

        <div className={styles.hero}>
          <h1 className={styles.h1}>Snap together a money app.</h1>
          <p className={styles.subline}>Snap bricks. Preview an app. Copy the prompt.</p>
          <div className={styles.rail}>
            <StepsRail states={steps} />
          </div>
        </div>
      </div>

      {isMobile && (
        <>
          <MobileBar
            ids={state.ids}
            app={app}
            dark={dark}
            reducedMotion={reducedMotion}
            generation={state.generation}
            built={live}
            lastAdded={state.lastAdded}
            live={isMobile}
            actionRef={actionRef}
            onAction={onMobileAction}
          />
          <div className={styles.mobileTools}>
            <RecipesMenu active={state.recipe} onPick={onRecipe} placement="down" />
            <button type="button" className={styles.smallButton} onClick={onSurprise}>
              Surprise me
            </button>
            <button type="button" className={styles.smallButton} onClick={onClear} disabled={count === 0}>
              Clear
            </button>
          </div>
        </>
      )}

      <main ref={mainRef} className={styles.main}>
        {!presenting && <div className={`${styles.panel} ${styles.trayPanel}`}>{tray}</div>}
        <div className={`${styles.panel} ${styles.boardPanel}`}>
          <Board
            ids={state.ids}
            recipe={state.recipe}
            dark={dark}
            reducedMotion={reducedMotion}
            generation={state.generation}
            appLive={live}
            lastAdded={state.lastAdded}
            live={!isMobile}
            dropRef={dropRef}
            dragOver={!!drag?.over}
            dragging={!!drag}
            ghostSize={ghostSize}
            ghostHidden={live && count >= 3 && !ghostSize}
            inspect={inspected}
            onInspect={setInspect}
            onRemove={onRemoveBoard}
            onBuild={onBuild}
            onSurprise={onSurprise}
            onClear={onClear}
            onRecipe={onRecipe}
            onLayout={setLayout}
          />
          {!isMobile && <Toast toast={state.toast} onUndo={() => onUndo(true)} onDone={(n) => dispatch({ type: "toastDone", n })} placement="board" />}
        </div>
        {!isMobile && (
          <div className={`${styles.panel} ${styles.phonePanel}`}>
            <ResultPanel
              app={app}
              phase={live ? "live" : "wire"}
              boot={state.generation}
              play={play}
              typing={state.typing}
              copyRef={copyRef}
              slots={slots}
              tileRef={tileRef}
              name={result?.name ?? null}
              ready={ready}
              copied={state.copied}
              onCopy={() => void onCopy()}
              onDetails={openDetails}
              inspect={inspected}
              onInspect={setInspect}
            />
          </div>
        )}
        {presenting && (
          <div className={styles.drawer} data-testid="present-drawer">
            {tray}
          </div>
        )}
        {!isMobile && <Connectors hostRef={mainRef} ids={state.ids} layout={layout} tiles={tiles} dark={dark} boot={state.generation} inspect={inspected} play={play} />}
      </main>

      <footer className={styles.footer}>
        <p>{RISK_FOOTER}</p>
        <SoundToggle on={sound.on} onChange={sound.setOn} />
      </footer>

      {isMobile && <Toast toast={state.toast} onUndo={() => onUndo(true)} onDone={(n) => dispatch({ type: "toastDone", n })} />}

      {isMobile && result && (
        <ResultSheet
          open={sheetOpen}
          app={app}
          name={result.name}
          copied={state.copied}
          onCopy={() => void onCopy()}
          onDetails={openDetails}
          onClose={closeSheet}
        />
      )}

      {result && (
        <DetailsDrawer open={detailsOpen} result={result} copied={state.copied} onCopy={() => void onCopy()} onClose={closeDetails} selectSignal={selectSignal} />
      )}

      {drag && dragLego && (
        <div className={styles.dragGhost} style={{ transform: `translate(${drag.x}px, ${drag.y}px)` }} aria-hidden="true">
          <BrickGlyph color={dragLego.brick.hex} studs={dragLego.size} className={styles.dragGlyph} />
        </div>
      )}

      <p className="visually-hidden" role="status" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}

/** Recipe name for a #recipe= hash (parseHash resolves the slug to the recipe's ids). */
const RECIPE_BY_IDS = new Map(RECIPES.map((r) => [toHash(stackOrder(r.ids)), r.recipe]));
function recipeFromHash(hash: string): string | null {
  return /^#recipe=/.test(hash) ? (RECIPE_BY_IDS.get(toHash(parseHash(hash))) ?? null) : null;
}
