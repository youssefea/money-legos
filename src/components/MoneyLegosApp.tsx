"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore, type MouseEvent } from "react";
import {
  BY_ID,
  MAX_LEGOS,
  MIN_LEGOS,
  RECIPES,
  RISK_FOOTER,
  buildFakeApp,
  flowOrder,
  generate,
  parseHash,
  recipeHash,
  surprise,
  toHash,
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
  const setPresent = writePresent;
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

  const onRemoveBoard = (id: LegoId) => {
    dispatch({ type: "remove", id, toast: true });
    setInspect(null);
  };

  // Compact bar: Build app, then View app (the live app in the sheet).
  const onMobileAction = () => {
    if (live) setSheetOpen(true);
    else onBuild();
  };

  const onRecipe = (r: Recipe) => load(flowOrder(r.ids), r.recipe, "recipe");
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

  // Present mode: P toggles it and Escape leaves it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (document.querySelector("dialog[open]")) return;
      if (e.key === "p" || e.key === "P") {
        if (compactNow()) return;
        e.preventDefault();
        writePresent(!present);
      } else if (e.key === "Escape" && present) {
        writePresent(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [present]);

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
            inspect={inspected}
            onInspect={setInspect}
            onRemove={onRemoveBoard}
            onBuild={onBuild}
            onSurprise={onSurprise}
            onClear={onClear}
            onRecipe={onRecipe}
            onLayout={setLayout}
          />
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
        {!isMobile && <Connectors hostRef={mainRef} ids={state.ids} layout={layout} tiles={tiles} dark={dark} boot={state.generation} inspect={inspected} play={play} />}
      </main>

      {presenting && (
        <div className={styles.drawer} data-testid="present-drawer">
          {tray}
        </div>
      )}

      <footer className={styles.footer}>
        <p>{RISK_FOOTER}</p>
        <SoundToggle on={sound.on} onChange={sound.setOn} />
      </footer>

      <Toast toast={state.toast} onUndo={() => dispatch({ type: "undo" })} onDone={(n) => dispatch({ type: "toastDone", n })} />

      {isMobile && result && (
        <ResultSheet
          open={sheetOpen}
          app={app}
          name={result.name}
          typing={state.typing}
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
const RECIPE_BY_IDS = new Map(RECIPES.map((r) => [toHash(flowOrder(r.ids)), r.recipe]));
function recipeFromHash(hash: string): string | null {
  return /^#recipe=/.test(hash) ? (RECIPE_BY_IDS.get(toHash(parseHash(hash))) ?? null) : null;
}
