import { DENIM_STATUS, RES } from "./legos";
import type { GenerateResult } from "./types";

/** The ready-to-paste prompt for a coding agent. Deterministic for a given result. */
export function buildPrompt(r: Omit<GenerateResult, "prompt">): string {
  const lines: string[] = [];
  lines.push(`Build an MVP of "${r.name}" on Base.`);
  lines.push(r.pitch);
  lines.push("");
  lines.push("Money Legos to use, in flow order:");
  r.steps.forEach((s, i) => {
    lines.push(`${i + 1}. ${s.lego.title} — ${s.lego.build}`);
    for (const d of s.docs) lines.push(`   Docs: ${d.url}`);
  });
  lines.push("");
  lines.push("Flow: " + r.steps.map((s) => s.lego.title).join(" → "));
  lines.push("");
  lines.push("How to work:");
  lines.push(
    `- Connect the Base docs MCP (${RES.mcp}) and read every docs page above before writing code. Do not rely on memory for APIs.`,
  );
  lines.push(`- More for coding agents: ${RES.ai} · Build guides: ${RES.guides}`);
  lines.push(
    `- Test on Base Sepolia only. Use the Vibenet hub (${RES.vibenet}) and faucet (${RES.faucet}) for test funds.`,
  );
  const ids = r.ids;
  if (ids.includes("speed")) lines.push(`- 200ms blocks arrive with the Denim upgrade. ${DENIM_STATUS}.`);
  if (ids.includes("financing")) lines.push("- Show in the UI that yield is variable, not guaranteed.");
  if (ids.includes("stocks"))
    lines.push(
      "- The Tokenized Stocks API is read-only, needs no key, and is for eligible jurisdictions outside the US only.",
    );
  lines.push("- Keep scope to one happy-path flow, with a simple web UI and clear error states.");
  lines.push("- Write a README with setup, environment variables, and how to run against Base Sepolia.");
  return lines.join("\n");
}
