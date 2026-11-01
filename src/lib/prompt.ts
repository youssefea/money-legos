import { RES } from "./legos";
import type { GenerateResult, LegoId } from "./types";

/** The ready-to-paste prompt for a coding agent. Deterministic for a given result. */
export function buildPrompt(r: Omit<GenerateResult, "prompt">): string {
  const ids = r.ids;
  const has = (id: LegoId) => ids.includes(id);
  const lines: string[] = [];
  lines.push(`Build a first working version of "${r.name}" on Base.`);
  lines.push(r.pitch);
  lines.push("");
  lines.push("Bricks to use, in flow order:");
  r.steps.forEach((s, i) => {
    lines.push(`${i + 1}. ${s.lego.name}: ${s.lego.build}`);
    for (const d of s.docs) lines.push(`   Docs: ${d.url}`);
  });
  lines.push("");
  lines.push("Flow: " + r.steps.map((s) => s.lego.name).join(" → "));
  lines.push("");
  lines.push("How to work:");
  lines.push(
    `- Connect the Base docs MCP (${RES.mcp}) and read every docs page above before writing code. Do not rely on memory for APIs.`,
  );
  lines.push(`- More for coding agents: ${RES.ai} · Build guides: ${RES.guides}`);
  lines.push("- Target Base mainnet.");
  if (has("financing")) lines.push("- Show in the UI that yield is variable, not guaranteed.");
  if (has("borrow")) lines.push("- Show that borrow rates are variable, and show the loan’s health and liquidation risk before the user confirms.");
  if (has("stocks"))
    lines.push(
      "- Tokenized stocks are for eligible jurisdictions outside the US only. The Tokenized Stocks API is read-only and needs no key.",
    );
  lines.push("- Keep scope to one happy-path flow, with a simple web UI and clear error states.");
  lines.push("- Write a README with setup, environment variables, and how to run it.");
  return lines.join("\n");
}
