"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

const KEY = "money-legos:sound";
const listeners = new Set<() => void>();
/** In-memory value, so the toggle still works when storage is blocked. */
let current: boolean | null = null;

function readOn(): boolean {
  if (current !== null) return current;
  try {
    return window.localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

/**
 * Optional snap sound, off by default. Synthesized with WebAudio (no audio files):
 * a short filtered noise click on top of a low sine thud.
 */
export function useSound() {
  const on = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    readOn,
    () => false,
  );
  const ctxRef = useRef<AudioContext | null>(null);

  const setOn = useCallback((value: boolean) => {
    current = value;
    try {
      window.localStorage.setItem(KEY, value ? "on" : "off");
    } catch {
      /* storage blocked: the in-memory value still applies */
    }
    listeners.forEach((l) => l());
  }, []);

  const play = useCallback(
    (kind: "snap" | "open" = "snap") => {
      if (!readOn()) return;
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = (ctxRef.current ??= new AC());
      if (ctx.state === "suspended") void ctx.resume();
      const t = ctx.currentTime;

      // Click: 25ms of band-passed noise.
      const len = Math.floor(ctx.sampleRate * 0.025);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = kind === "open" ? 2400 : 3200;
      band.Q.value = 1.2;
      const ng = ctx.createGain();
      ng.gain.value = 0.35;
      noise.connect(band).connect(ng).connect(ctx.destination);
      noise.start(t);

      // Thud: sine sweeping down.
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(kind === "open" ? 320 : 180, t);
      osc.frequency.exponentialRampToValueAtTime(kind === "open" ? 520 : 70, t + 0.09);
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(0.3, t + 0.005);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(og).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.14);
    },
    [],
  );

  return { on, setOn, play };
}

/** A tiny tap on phones that support it. */
export function buzz(): void {
  try {
    navigator.vibrate?.(8);
  } catch {
    /* not supported */
  }
}
