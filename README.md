# Contrast

**Compare any documents. Decide with evidence.**

Contrast is a prototype that helps a person choose between 2–4 documents: supplier proposals, contracts, financial reports, supplier dossiers. It suggests criteria and weights, extracts each value with a cited source, scores everything transparently, asks for human review when the AI is unsure, shows whether missing information could change the decision, and produces a one-page decision brief with an audit trail.

> **Live demo:** [contrast-beta.vercel.app](https://contrast-beta.vercel.app) · Start with **Quick demo (2 min)**.

> ⚠️ This is a **prototype with simulated AI results and fictional data**. Nothing is uploaded or sent anywhere; there is no backend.

---

## Why I built it

Important decisions often depend on documents that are hard to compare. Each one has a different format, information is scattered or missing, the comparison is done by hand in spreadsheets, and the reasoning behind the final choice is rarely recorded.

I built Contrast as a personal project to practise the full product cycle on that problem, from spec to working prototype:

- turning a fuzzy problem into a written spec, business rules and acceptance criteria;
- designing a flow that makes the value obvious in about two minutes;
- making every rule visible and explainable to the user;
- being explicit about what is real and what is simulated;
- prototyping quickly with AI-assisted development while keeping the logic correct and tested.

## What it does

| Step | What happens |
|---|---|
| **1. Set up** | Pick a scenario, review the decision question, rename the documents. |
| **2. Confirm criteria** | Adjust the suggested criteria and weights (they must add up to 100%), reorder or remove them (minimum 3), or add more from a suggestions list. |
| **3. Compare** | Side-by-side matrix with a score bar for each value. Open any cell to see the highlighted evidence, the page/clause/cell it came from, the scoring rule and the calculation. |
| **4. Review** | Values extracted with AI confidence below 70% are flagged **Needs review**: confirm them or edit them. |
| **5. Handle gaps** | For missing information, choose: **add the value**, **request it from the supplier** (a ready-to-copy message), or **decide without it** (accept the risk, with a recorded reason). |
| **6. Decide** | Insights show the recommendation, what drives it, decision robustness, and the exact value that would flip the ranking for each gap. |
| **7. Report** | A one-page decision brief: verdict, score heatmap, gaps, open requests, audit trail and sign-off. Export to PDF or copy a summary. |

### Four sample scenarios, one engine

- **Pharma Supplier Qualification**: 3 API supplier dossiers (featured, used by the Quick demo)
- **IT Vendor Selection**: 3 CRM implementation proposals
- **Contract Risk Review**: 2 logistics contract drafts
- **Company Performance Comparison**: 2 companies' annual results

## Business rules

All scoring is transparent and shown to the user.

- **Numbers, lower is better:** best value = 5; others = 5 × best ÷ value.
- **Numbers, higher is better:** best value = 5; others = 5 × value ÷ best.
- **Qualitative:** a 0–5 score with its rationale always visible.
- **Yes/No:** Yes = 5, No = 0.
- **Missing information scores 0** and never counts as a "best" value. Unverified information should not earn points, and a missing answer is itself a risk signal.
- **Weighted total** = Σ(score × weight) ÷ 100, shown as X.XX / 5 and as an adherence %.
- **Technical tie:** #1 and #2 within 5.0 percentage points.
- **Tipping point:** for each gap, the engine searches a plausible range for the value that would make that document #1, and says so in plain language, e.g. *"If Pacífico Labs' inspection history score is ≥ 2.8, Pacífico Labs would rank #1."* Thresholds are rounded conservatively, so the stated value always flips the ranking.
- **Decision robustness:** Low (tie or decisive gap), Medium (a gap could change #1) or High.
- **Decision status:** Ready to decide · Needs a decision · Provisional (waiting for a supplier reply) · Decided with accepted risk · Too close to call.
- **Review lock:** the report can't be exported while any item still needs review. Gaps don't block it; they are listed in the report.

## What's real and what's simulated

| Real | Simulated |
|---|---|
| The flow, business rules, scoring engine, tipping points, human review, audit trail and report | Reading the documents and the AI extraction, including the confidence levels and evidence snippets |

A full version would add real AI extraction with citations, extraction-accuracy evals, custom criteria, industry templates, history and sharing.

## Tech stack

- **Vite + React + TypeScript** (strict)
- **Tailwind CSS v4**, with Inter and Fraunces self-hosted via Fontsource
- **Radix UI** primitives for accessible dialogs, menus, tabs and tooltips
- **Vitest** for unit tests; **Playwright** for end-to-end tests
- No backend: all demo data lives in typed TypeScript constants

## Quality

- **Pure scoring engine** (`src/lib/scoring.ts`), fully separated from the UI. Every number on screen comes from it.
- **128 unit tests** cover every expected result in the spec for all four scenarios: default rankings, after filling a gap, the neutral gap policy, tipping points, robustness and decision status. They also cover edge cases such as ties at exactly 5.0 points, single found values and conservative rounding.
- **Accessibility:**
  - keyboard navigable, with a visible focus ring for keyboard users;
  - focus trapped and returned in dialogs and the evidence panel;
  - color is never the only signal: every status has a label or an icon.
- **Print-ready report:** the PDF fits on one A4 page, without the browser's header and footer.

## Run it locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run test     # unit tests
npm run build    # type-check + production build
```

## Project structure

```
src/
  data/        typed scenarios and domain types
  lib/         scoring engine, decision status, formatting, messages (+ tests)
  state/       reducer, derived view and app context (+ tests)
  screens/     start, setup, criteria, and the Compare / Insights / Report tabs
  overlays/    welcome modal, demo checklist, confirmations
  components/  UI building blocks
```

## Roadmap

- [ ] What-if panel: change weights, exclude documents or criteria, switch the gap policy, compare before vs after
- [ ] Mobile layout (cards instead of the matrix below 768px)
- [ ] End-to-end test of the full Quick demo

## Author

Built by **Maria Gabriela Ventura** · [LinkedIn](https://www.linkedin.com/in/mariagabrielaventura)

Developed with AI-assisted coding (Claude Code), from a spec I wrote.
