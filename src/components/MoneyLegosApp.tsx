"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  BY_ID,
  MAX_LEGOS,
  MIN_LEGOS,
  RECIPES,
  RISK_FOOTER,
  buildFakeApp,
  flowOrder,
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
import { initialState, reducer, stepStates } from "@/state/store";
import Board from "./Board";
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

/** The whole playground: pick Legos, snap them on, watch the app build, copy the prompt. */
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
  const dropRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const generateRef = useRef<HTMLButtonElement>(null);
  const detailsReturn = useRef<HTMLElement | null>(null);
  const tiles = useRef(new Map<string, HTMLElement>());
  const isMobileRef = useRef(isMobile);
  useEffect(() => {
    isMobileRef.current = isMobile;
  });

  const count = state.ids.length;
  const app = useMemo(() => buildFakeApp(state.ids), [state.ids]);
  const slots = Math.max(0, 3 - count);
  const tileRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) tiles.current.set(id, el);
    else tiles.current.delete(id);
  }, []);

  const place = useCallback(
    (id: LegoId, ids: readonly LegoId[]) => {
      const adding = !ids.includes(id) && ids.length < MAX_LEGOS;
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
    if (isMobileRef.current) setSheetOpen(true);
  };

  const load = (ids: readonly LegoId[], recipe: string | null, source: "recipe" | "surprise" | "link") => {
    dispatch({ type: "load", ids, recipe, generate: true, source });
    if (ids.length >= MIN_LEGOS && source !== "link") opened();
  };

  const onGenerate = () => {
    if (count < MIN_LEGOS) {
      dispatch({ type: "generate" }); // announces what is still needed
      return;
    }
    dispatch({ type: "generate" });
    opened();
  };

  const onRecipe = (r: Recipe) => load(flowOrder(r.ids), r.recipe, "recipe");
  const onSurprise = () => load(surprise(state.ids), null, "surprise");
  const onClear = () => {
    dispatch({ type: "clear" });
    setSheetOpen(false);
    setDetailsOpen(false);
  };

  const openDetails = () => {
    detailsReturn.current = document.activeElement as HTMLElement | null;
    setDetailsOpen(true);
  };
  const closeDetails = () => {
    setDetailsOpen(false);
    detailsReturn.current?.focus();
  };

  const onCopy = async () => {
    const prompt = state.result?.prompt;
    if (!prompt) return;
    if (await copyText(prompt)) {
      dispatch({ type: "copied" });
      return;
    }
    // Clipboard blocked: open Details with the prompt selected, so Cmd/Ctrl+C works.
    if (!detailsOpen) openDetails();
    setSelectSignal((n) => n + 1);
  };

  useCopiedReset(state.copied, () => dispatch({ type: "copyReset" }));

  // Deep links: #b20,payments,speed or #recipe=neobroker restore the board and generate.
  useEffect(() => {
    const read = () => {
      const h = window.location.hash;
      const ids = parseHash(h);
      if (!ids.length) return;
      dispatch({ type: "load", ids, recipe: recipeFromHash(h), generate: ids.length >= MIN_LEGOS, source: "link" });
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  // Keep the hash in step with the board (replaceState: no history spam, no hashchange).
  const firstWrite = useRef(true);
  useEffect(() => {
    if (firstWrite.current) {
      firstWrite.current = false;
      return;
    }
    const want = state.recipe ? recipeHash(state.recipe) : toHash(state.ids);
    if (window.location.hash === want || (!want && !window.location.hash)) return;
    const url = window.location.pathname + window.location.search + want;
    window.history.replaceState(window.history.state, "", url);
  }, [state.ids, state.recipe]);

  const closeSheet = () => {
    setSheetOpen(false);
    generateRef.current?.focus();
  };

  const steps = stepStates(state);
  const announce = state.announce.text + (state.announce.n % 2 ? "\u200b" : "");
  const dragLego = drag ? BY_ID[drag.id] : null;
  const name = state.result?.name ?? null;

  return (
    <div className={styles.page} data-dragging={drag ? "true" : undefined}>
      <Header soundOn={sound.on} onSound={sound.setOn} />

      <div className={styles.hero}>
        <h1 className={styles.h1}>Snap together a money app.</h1>
        <p className={styles.subline}>Pick Legos. Get an app and a prompt.</p>
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
          hasResult={!!state.result}
          lastAdded={state.lastAdded}
          live={isMobile}
          generateRef={generateRef}
          onGenerate={onGenerate}
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
          />
        </div>
        <div className={`${styles.panel} ${styles.boardPanel}`}>
          <Board
            ids={state.ids}
            recipe={state.recipe}
            dark={dark}
            reducedMotion={reducedMotion}
            generation={state.generation}
            hasResult={!!state.result}
            lastAdded={state.lastAdded}
            live={!isMobile}
            dropRef={dropRef}
            dragOver={!!drag?.over}
            dragging={!!drag}
            onGenerate={onGenerate}
            onSurprise={onSurprise}
            onClear={onClear}
            onRecipe={onRecipe}
            onLayout={setLayout}
          />
        </div>
        {!isMobile && (
          <div className={`${styles.panel} ${styles.phonePanel}`}>
            <ResultPanel app={app} slots={slots} tileRef={tileRef} name={name} copied={state.copied} onCopy={() => void onCopy()} onDetails={openDetails} />
          </div>
        )}
        {!isMobile && <Connectors hostRef={mainRef} ids={state.ids} layout={layout} tiles={tiles} dark={dark} />}
      </main>

      <footer className={styles.footer}>
        <p>{RISK_FOOTER}</p>
      </footer>

      {isMobile && state.result && (
        <ResultSheet
          key={state.generation}
          open={sheetOpen}
          app={app}
          name={state.result.name}
          copied={state.copied}
          onCopy={() => void onCopy()}
          onDetails={openDetails}
          onClose={closeSheet}
        />
      )}

      {state.result && (
        <DetailsDrawer
          key={`d-${state.generation}`}
          open={detailsOpen}
          result={state.result}
          copied={state.copied}
          onCopy={() => void onCopy()}
          onClose={closeDetails}
          selectSignal={selectSignal}
        />
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
