# Contrast — project rules

- Context: Contrast is a personal product prototype. Read the "Product context" section of SPEC.md before anything else; when in doubt, favor clarity of the 2-minute demo, correct numbers and honest labeling of what is simulated.
- Stack: Vite + React + TypeScript + Tailwind CSS. No backend. No real AI calls.
- All demo data lives in src/data/scenarios.ts as typed constants. Never invent values beyond SPEC.md.
- Scoring logic lives in src/lib/scoring.ts as pure functions, covered by Vitest tests in src/lib/scoring.test.ts.
- UI text in English. Clean, light, corporate style (white, one indigo accent, Inter).
- Accessibility: keyboard navigable, visible focus, color is never the only signal (always pair with a label or icon).
- Commands: npm run dev, npm run test, npm run build.
- Before saying a task is done, run npm run test and npm run build and fix any error.
- Do not add features that are not in SPEC.md.
