import { DENIM_STATUS, RES } from "./legos";
import type { GenerateResult, LegoId } from "./types";

/** Legos whose status the prompt must spell out (not live or generally available on mainnet). */
const DENIM_IDS: readonly LegoId[] = ["speed", "basetime"];

/** The ready-to-paste prompt for a coding agent. Deterministic for a given result. */
export function buildPrompt(r: Omit<GenerateResult, "prompt">): string {
  const ids = r.ids;
  const has = (id: LegoId) => ids.includes(id);
  const lines: string[] = [];
  lines.push(`Build a first working version of "${r.name}" on Base.`);
  lines.push(r.pitch);
  lines.push("");
  lines.push("Money Legos to use, in flow order:");
  r.steps.forEach((s, i) => {
    lines.push(`${i + 1}. ${s.lego.name}: ${s.lego.build}`);
    for (const d of s.docs) lines.push(`   Docs: ${d.url}`);
  });
  lines.push("");
  lines.push("Flow: " + r.steps.map((s) => s.lego.name).join(" → "));
  lines.push("");
  lines.push("Where each Lego stands today:");
  for (const s of r.steps) {
    if (DENIM_IDS.includes(s.lego.id)) continue;
    lines.push(`- ${s.lego.name}: ${s.lego.status.label}.`);
  }
  const denim = r.steps.filter((s) => DENIM_IDS.includes(s.lego.id)).map((s) => s.lego.name);
  if (denim.length) {
    const what = denim.length > 1 ? `${denim.join(" and ")} come` : `${denim[0]} comes`;
    lines.push(`- ${what} with the Denim upgrade: ${DENIM_STATUS}. Build and test on Base Sepolia.`);
  }
  lines.push("");
  lines.push("How to work:");
  lines.push(
    `- Connect the Base docs MCP (${RES.mcp}) and read every docs page above before writing code. Do not rely on memory for APIs.`,
  );
  lines.push(`- More for coding agents: ${RES.ai} · Build guides: ${RES.guides}`);
  lines.push(
    `- Test on Base Sepolia only. Use the Vibenet hub (${RES.vibenet}) and faucet (${RES.faucet}) for test funds.`,
  );
  if (r.steps.some((s) => s.lego.status.kind === "announced")) {
    lines.push("- Some Legos here are announced but not released. Build a fallback that works today and keep the new path behind a flag.");
  }
  if (has("financing")) lines.push("- Show in the UI that yield is variable, not guaranteed.");
  if (has("borrow")) lines.push("- Show that borrow rates are variable, and show the loan’s health and liquidation risk before the user confirms.");
  if (has("stocks"))
    lines.push(
      "- Tokenized stocks are for eligible jurisdictions outside the US only. The Tokenized Stocks API is read-only and needs no key.",
    );
  if (has("private-ledgers")) lines.push("- Base Ledgers is early access: request access before you build on it.");
  if (has("vibenet")) lines.push("- Vibenet is a preview network: not for production, and it may reset.");
  lines.push("- Keep scope to one happy-path flow, with a simple web UI and clear error states.");
  lines.push("- Write a README with setup, environment variables, and how to run against Base Sepolia.");
  return lines.join("\n");
}
