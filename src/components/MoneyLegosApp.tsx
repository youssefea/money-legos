"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  BY_ID,
  MAX_LEGOS,
  MIN_LEGOS,
  RECIPES,
  RISK_FOOTER,
  flowOrder,
  parseHash,
  recipeHash,
  surprise,
  toHash,
  type LegoId,
  type Recipe,
} from "@/lib";
import { useBrickDrag } from "@/hooks/useBrickDrag";
import { useDark, useIsMobile, useReducedMotion } from "@/hooks/useMediaQuery";
import { buzz, useSound } from "@/hooks/useSound";
import { initialState, reducer, stepStates } from "@/state/store";
import Board from "./Board";
import { BrickGlyph } from "./BrickArt";
import Header from "./Header";
import MobileBar from "./MobileBar";
import RecipeChips from "./RecipeChips";
import { SetBlueprint, SetCard, useCopiedReset } from "./SetBox";
import SetSheet from "./SetSheet";
import StepsRail from "./StepsRail";
import Tray from "./Tray";
import styles from "@/app/page.module.css";

/** The whole playground: pick Legos, snap them on, open the set, copy the prompt. */
export default function MoneyLegosApp() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const dark = useDark();
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const sound = useSound();
  const [sheetOpen, setSheetOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const generateRef = useRef<HTMLButtonElement>(null);
  const cardTitleRef = useRef<HTMLHeadingElement>(null);
  const revealRef = useRef(false);
  const isMobileRef = useRef(isMobile);
  useEffect(() => {
    isMobileRef.current = isMobile;
  });

  const count = state.ids.length;

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
    else revealRef.current = true;
  };

  // Tablet (768-1279): the set box sits below the stage, so bring it into view and focus its title.
  useEffect(() => {
    if (!revealRef.current) return;
    revealRef.current = false;
    const title = cardTitleRef.current;
    if (!title || window.innerWidth >= 1280) return;
    title.closest("section")?.scrollIntoView({ block: "start", behavior: reducedMotion ? "auto" : "smooth" });
    title.focus({ preventScroll: true });
  }, [state.generation, reducedMotion]);

  const load = (ids: readonly LegoId[], recipe: string | null, source: "recipe" | "surprise" | "link") => {
    dispatch({ type: "load", ids, recipe, generate: true, source });
    if (ids.length >= MIN_LEGOS && source !== "link") opened();
  };

  const onGenerate = () => {
    if (count < MIN_LEGOS) {
      dispatch({ type: "generate" }); // announces what is still needed
      return;
    }
    if (isMobile && state.result) {
      setSheetOpen(true);
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
  };

  useCopiedReset(state.copied, () => dispatch({ type: "copyReset" }));

  // Deep links: #b20,payments,speed or #recipe=neobroker restore the board and open the set.
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

  return (
    <div className={styles.page} data-dragging={drag ? "true" : undefined}>
      <Header soundOn={sound.on} onSound={sound.setOn} />

      <div className={styles.hero}>
        <h1 className={styles.h1}>Snap together a money app.</h1>
        <p className={styles.subline}>Pick 2 to 4 Base building blocks. Get an app idea and a prompt for your coding agent.</p>
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
          <RecipeChips
            active={state.recipe}
            onPick={onRecipe}
            idPrefix="mobile"
            lead={[
              <button key="surprise" type="button" className={styles.smallButton} onClick={onSurprise}>
                Surprise me
              </button>,
              ...(count > 0
                ? [
                    <button key="clear" type="button" className={styles.smallButton} onClick={onClear}>
                      Clear
                    </button>,
                  ]
                : []),
            ]}
          />
        </div>
      </div>

      <main className={styles.main}>
        <div className={`${styles.panel} ${styles.trayPanel}`}>
          <Tray
            ids={state.ids}
            fullHint={state.fullHint}
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
          />
        </div>
        <div className={styles.resultCol}>
          {state.result && !isMobile ? (
            <SetCard ref={cardTitleRef} key={state.generation} result={state.result} copied={state.copied} onCopied={() => dispatch({ type: "copied" })} />
          ) : (
            <SetBlueprint count={count} />
          )}
        </div>
      </main>

      <footer className={styles.footer}>
        <p>{RISK_FOOTER}</p>
      </footer>

      {isMobile && state.result && (
        <SetSheet
          key={state.generation}
          open={sheetOpen}
          result={state.result}
          copied={state.copied}
          onCopied={() => dispatch({ type: "copied" })}
          onClose={closeSheet}
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
