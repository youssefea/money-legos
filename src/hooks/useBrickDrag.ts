"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import type { LegoId } from "@/lib";

export type DragState = { id: LegoId; x: number; y: number; over: boolean } | null;

const THRESHOLD = 6;

/**
 * Drag a tray brick onto the board with a mouse or pen (touch keeps tap-to-place so the
 * tray still scrolls). Clicks still work; a finished drag swallows the click that follows.
 */
export function useBrickDrag(dropRefs: RefObject<HTMLElement | null>[], onDrop: (id: LegoId) => void) {
  const [drag, setDrag] = useState<DragState>(null);
  const suppressClick = useRef(false);
  const cleanup = useRef<(() => void) | null>(null);
  const dropRefsRef = useRef(dropRefs);
  const onDropRef = useRef(onDrop);
  useEffect(() => {
    dropRefsRef.current = dropRefs;
    onDropRef.current = onDrop;
  });

  useEffect(() => () => cleanup.current?.(), []);

  const overDrop = (x: number, y: number) =>
    dropRefsRef.current.some((r) => {
      const el = r.current;
      if (!el || !el.offsetParent) return false;
      const b = el.getBoundingClientRect();
      return x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;
    });

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>, id: LegoId) => {
    if (e.button !== 0 || e.pointerType === "touch") return;
    cleanup.current?.();
    const sx = e.clientX;
    const sy = e.clientY;
    let active = false;

    const move = (ev: PointerEvent) => {
      if (!active && Math.hypot(ev.clientX - sx, ev.clientY - sy) < THRESHOLD) return;
      active = true;
      ev.preventDefault();
      setDrag({ id, x: ev.clientX, y: ev.clientY, over: overDrop(ev.clientX, ev.clientY) });
    };
    const up = (ev: PointerEvent) => {
      done();
      if (!active) return;
      suppressClick.current = true;
      // The click that follows pointerup lands within a frame or two; forget the drag after that.
      window.setTimeout(() => (suppressClick.current = false), 250);
      setDrag(null);
      if (overDrop(ev.clientX, ev.clientY)) onDropRef.current(id);
    };
    const cancel = () => {
      done();
      setDrag(null);
    };
    const key = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") cancel();
    };
    const done = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key);
      cleanup.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", key);
    cleanup.current = done;
  }, []);

  /** Call at the top of the brick's onClick; true means "this click ended a drag, ignore it". */
  const wasDrag = useCallback(() => {
    const v = suppressClick.current;
    suppressClick.current = false;
    return v;
  }, []);

  return { drag, onPointerDown, wasDrag };
}
