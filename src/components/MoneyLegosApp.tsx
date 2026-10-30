"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  BY_ID,
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
import Board, { boardNote } from "./Board";
import { BrickGlyph } from "./BrickArt";
import Connectors from "./Connectors";
import DetailsDrawer from "./DetailsDrawer";
import Header from "./Header";
import MobileBar from "./MobileBar";
import RecipesMenu from "./RecipesMenu";
import ResultPanel from "./ResultPanel";
import ResultSheet from "./ResultSheet";
import type { StageLayout } from "./StageView";
import StepsRail from "./StepsRail";
import Tray from "./Tray";
import styles from "@/app/page.module.css";

const COMPACT_QUERY = "(max-width: 1023.98px)";

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

  const opened = () => {
    sound.play("open");
    if (compactNow()) setSheetOpen(true);
  };

  const load = (ids: readonly LegoId[], recipe: string | null, source: LoadSource) => {
    dispatch({ type: "load", ids, recipe, build: true, source });
    if (ids.length >= MIN_LEGOS) opened();
  };

  const onBuild = () => {
    dispatch({ type: "build" }); // with fewer than 2 bricks this only announces what is missing
    if (ready) opened();
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
  const note = boardNote(count, state.swap);

  return (
    <div className={styles.page} data-dragging={drag ? "true" : undefined}>
      <Header soundOn={sound.on} onSound={sound.setOn} />

      <div className={styles.hero}>
        <h1 className={styles.h1}>Snap together a money app.</h1>
        <p className={styles.subline}>Snap bricks. Preview an app. Copy the prompt.</p>
        <div className={styles.rail}>
          <StepsRail states={steps} />
        </div>
      </div>

      <div className={styles.mobileOnly}>
        <MobileBar
          ids={state.ids}
          dark={dark}
          reducedMotion={reducedMotion}
          generation={state.generation}
          built={live}
          lastAdded={state.lastAdded}
          live={isMobile}
          actionRef={actionRef}
          onAction={onMobileAction}
          note={note}
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
      </div>

      <main ref={mainRef} className={styles.main}>
        <div className={`${styles.panel} ${styles.trayPanel}`}>
          <Tray
            ids={state.ids}
            onToggle={(id) => place(id, state.ids)}
            onPointerDown={onPointerDown}
            wasDrag={wasDrag}
            dragging={drag?.id ?? null}
            inspect={inspected}
            onInspect={setInspect}
          />
        </div>
        <div className={`${styles.panel} ${styles.boardPanel}`}>
          <Board
            ids={state.ids}
            recipe={state.recipe}
            dark={dark}
            reducedMotion={reducedMotion}
            generation={state.generation}
            built={state.built}
            lastAdded={state.lastAdded}
            swap={state.swap}
            live={!isMobile}
            dropRef={dropRef}
            dragOver={!!drag?.over}
            dragging={!!drag}
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
        {!isMobile && <Connectors hostRef={mainRef} ids={state.ids} layout={layout} tiles={tiles} dark={dark} boot={state.generation} inspect={inspected} />}
      </main>

      <footer className={styles.footer}>
        <p>{RISK_FOOTER}</p>
      </footer>

      {isMobile && result && (
        <ResultSheet
          open={sheetOpen}
          app={app}
          name={result.name}
          boot={state.generation}
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
