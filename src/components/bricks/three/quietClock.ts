import { getConsoleFunction, setConsoleFunction } from "three";

/*
 * @react-three/fiber 9 still builds a THREE.Clock for its store, which three r183+ flags as deprecated
 * on every canvas. Import this module before any <Canvas> mounts to drop that one notice (R3F owns the
 * clock, not this code); everything else three logs goes through unchanged.
 */
function quietClock() {
  const passOn = getConsoleFunction() as ReturnType<typeof getConsoleFunction> | null;
  setConsoleFunction((type: "log" | "warn" | "error", message: string, ...params: unknown[]) => {
    if (type === "warn" && typeof message === "string" && message.startsWith("THREE.Clock:")) return;
    if (passOn) return passOn(type, message, ...params);
    const log = type === "error" ? console.error : type === "warn" ? console.warn : console.log;
    log(message, ...params);
  });
}
quietClock();
