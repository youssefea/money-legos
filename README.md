# Money Legos

A playground for the Base Devcon Mumbai workshop. Stack two to four Base building blocks (B20, Accept payments, Financing, Validity transactions, 200ms blocks and more) and see the app they make, the docs to read, and a prompt to build it with your own coding agent.

Live: https://youssefea.github.io/money-legos/

Educational content only. Crypto products and NFTs are unregulated and can be highly risky. There may be no regulatory recourse for any loss from such transactions.

Docs: https://docs.base.org/build-on-base/overview

## Develop

Requires Node 24.

```sh
npm install          # .npmrc sets legacy-peer-deps (postprocessing pins three <0.187)
npm run dev          # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server, no base path |
| `npm run build` | Static export to `out/`, no base path |
| `npm run build:pages` | Static export to `out/` with `NEXT_PUBLIC_BASE_PATH=/money-legos` (GitHub Pages) |
| `npm test` | Vitest logic tests (`src/lib/*.test.ts`) |
| `npm run lint` | ESLint with the Next.js config |
| `npm run typecheck` | Route types + `tsc --noEmit` |

Preview the Pages build locally:

```sh
npm run build:pages
mkdir -p /tmp/ml && rm -rf /tmp/ml/money-legos && cp -R out /tmp/ml/money-legos
python3 -m http.server 4173 -d /tmp/ml   # http://localhost:4173/money-legos/
```

## Tests and scripts

| Command | What it checks |
| --- | --- |
| `npm test` | Vitest: Lego registry and copy rules (every Lego has a one-line `short` <= 60 chars, a tray `tag` and a build `step`; the Denim/200ms wording), combos, prompts, URL hash, the store, and WCAG AA contrast for every text/background pair the UI uses (`src/lib/contrast.test.ts`). |
| `npm run typecheck` | Route types + `tsc --noEmit`. |
| `npm run lint` | ESLint. |
| `npx playwright test` | Builds the static export, serves a private copy (`e2e/serve.mjs`, port 4180) and runs `e2e/app.spec.ts`: placing by click, keyboard and drag; Generate / Regenerate; recipes; Surprise me; Clear; copy and the blocked-clipboard fallback; hash deep links; the phone sheet and first-screen fit; the tablet scroll-into-view; the result card fitting at 1440x900 and 1920x1080 with whole prompt lines; `prefers-reduced-motion`; keyboard focus order; the single polite live region. Set `E2E_SKIP_BUILD=1` to reuse `out/`. |
| `SHOTS=1 npx playwright test shots` | Design QA screenshots (not a test): 390x844, 768x1024, 1440x900, 1920x1080 x light/dark x empty/one/result into `../design/ui-shots-v2/` (override with `SHOTS_DIR`). |
| `npm run bake-sprites` | Re-renders the tray sprites in `public/sprites/` from the board's 3D rig. |

## Layout

- `src/lib/` content and deterministic generation: Legos, curated combos and recipes, the prompt builder, URL hash (`#b20,payments,speed`, `#recipe=neobroker`), and the shared UI/3D contract (`contract.ts`).
- `src/components/bricks/` the 3D board (`BrickStage`) and tray sprites (`BrickSprite`, files in `public/sprites/<legoId>.webp`).
- `src/styles/tokens.css` brand-locked tokens (Base brand palette only).
- `src/app/fonts/` self-hosted Base Sans and Base Sans Mono (variable WOFF2).
- `public/brand/` official Base logo SVGs.
- `legacy/` the previous static version.

Deploys run from `.github/workflows/pages.yml` on pushes to `main` (set Pages source to "GitHub Actions").
