# AGENTS.md

## Commands
- `npm run dev`, `npm run build`, `npm run preview`, `npm test`.
- `npm run build` is also the only typecheck (`tsc --noEmit`); there is no lint script or CI. Verify with `npm run build && npm test`.
- `tsconfig.json` excludes `src/**/*.test.ts` from typechecking; tests run via `tsx` with plain `node:assert/strict` (no test runner).

## Architecture
- Pure calculation: `src/lib/calculo.ts` + `src/lib/constants.ts`; types in `src/types.ts`.
- Rounding invariant: each `desglose` item is rounded first, then `totalLPersonaDia` is their sum; keep chart and tests consistent. Household divisions clamp `personas` to >= 1.
- `src/App.tsx` only toggles `base`/`alta` presets; `src/components/Resultado.tsx` owns simulator sliders and Recharts. Part A form is not implemented yet.
- Update paper-calculation assertions in `src/lib/calculo.test.ts` when constants or formulas change; base case is 237 L/person/day.
- UI is Spanish/`es-AR` (`Intl.NumberFormat`, `localeCompare('es')`). Tailwind `font-display`/`font-sans` are Fraunces/Outfit loaded in `index.html`.
- Recharts makes Vite emit a >500 kB chunk warning on build; it is not a failure.
