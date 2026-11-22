# Contrast — Implementation Plan

## 0. Context

Contrast is a portfolio prototype for a Product Owner application at a healthtech SaaS. Reviewers will spend 2–3 minutes on it. In order of priority: (1) the guided demo makes the value obvious in 2 minutes, (2) every number matches SPEC.md, (3) the UI is clear and polished, (4) business rules are visible, (5) the app is honest about what is simulated. The repo currently holds only `CLAUDE.md` and `SPEC.md`, so this is a greenfield build: Vite + React + TypeScript + Tailwind, no backend, no real AI, all data in `src/data/scenarios.ts`, scoring in `src/lib/scoring.ts` with Vitest tests.

**Pre-verification already done.** I ran the scoring rules from SPEC.md against all four scenarios in a throwaway script. Every expected default, after-fill, neutral-policy and tipping-point value in the spec comes out of the formulas exactly. Two implementation rules come out of that check (details in §4):
- **Tipping thresholds must be rounded conservatively** (round toward the "good" side). Rounding to nearest gives wrong answers: FastFreight's raw threshold is 62.77 days, so nearest gives 63, which does not flip the ranking. The spec says ≤ 62. Pacífico's raw threshold is 2.734, so nearest gives 2.7, which does not flip. The spec says ≥ 2.8.
- **Derived values the spec doesn't state:** Scenario C after the fill has robustness **Low**, because RotaLog's missing late-delivery penalty becomes decisive. Scenario B after the fill has robustness **High**. Both follow from the rules, and the tests will lock them in.

### Approved working rules (from review)
1. **Build order and stop points:** see §10. I stop after phase 3 to show the Vitest output. I stop again after phases 1–6, the core of phase 7, and phases 8–9, so you can deploy to Vercel. What-if, mobile/a11y and E2E/polish come after that.
2. **Never change an expected value from SPEC.md to make a test pass.** If a test fails, I fix the code or stop and report.
3. **Commit after each phase** with a clear message. The folder isn't a git repo yet, so phase 1 starts with `git init` and a `.gitignore`.
4. **The report date is the current date at render time** (`new Date()`, formatted as `21 November 2026`). It is never a fixed date.
5. **All open-question recommendations are accepted** (§12). For 13a, every source reference is fictional and consistent with the document page counts.
6. **Cut order if time gets tight:**
   1. live ranking strip (OQ-2)
   2. second Playwright test (OQ-16)
   3. What-if "Apply" (Reset stays)
   4. audit-trail diff text

   **Never cut:** the Quick demo flow, correct numbers, the review lock, the tipping sentences, the footer and the disclaimers.

---

## 1. Architecture and folder structure

**Stack (versions pinned at scaffold time):** Vite, React, TypeScript (strict), Tailwind CSS v4 (`@tailwindcss/vite`), Vitest, Playwright, `lucide-react` (icons), Radix primitives (`@radix-ui/react-dialog`, `-dropdown-menu`, `-tooltip`, `-tabs`) for accessible dialogs, menus, tooltips and tabs, and `@fontsource-variable/inter` (self-hosted Inter, so there are no external font requests and print works offline). No router, no state library, no backend.

**Rendering model:** a single-page app. A pure reducer holds the state, and every number shown on screen is derived from it with pure functions (`useMemo`). Nothing derived is stored, so "changes recalculate instantly" holds by construction.

```
contrast/
  index.html
  package.json            # scripts: dev, build (tsc -b && vite build), test (vitest run), test:e2e (playwright test)
  vite.config.ts          # react + tailwind plugins; vitest config: include src/**/*.test.ts(x) only
  playwright.config.ts    # webServer: npm run dev (or preview), desktop Chromium 1280×800
  tsconfig.json / tsconfig.app.json / tsconfig.node.json
  e2e/
    quick-demo.spec.ts
  src/
    main.tsx
    App.tsx                     # screen switch: Start | Setup | Criteria | Workspace; global overlays
    index.css                   # Tailwind, theme tokens (indigo accent), focus ring, print stylesheet
    data/
      types.ts                  # all domain types (§2)
      scenarios.ts              # 4 typed scenario constants + SCENARIO_ORDER
    lib/
      scoring.ts                # pure scoring, totals, ranking, tie, neutral policy, renormalize,
                                #   tipping points, robustness, drivers, weight utilities
      scoring.test.ts
      cells.ts                  # resolveCell(): seed + review → effective status/value
      cells.test.ts
      format.ts                 # value/score/percent/date formatting, possessive helper
      format.test.ts
      messages.ts               # tipping sentences, robustness reasons, info-request text, copy summary
      messages.test.ts
      checklist.ts              # per-scenario checklist step derivation
      data.test.ts              # data integrity checks on scenarios.ts
    state/
      types.ts                  # AppState, ScenarioSession, Action
      reducer.ts                # pure reducer; timestamps arrive in action payloads
      reducer.test.ts
      AppContext.tsx            # Provider + useApp() (state, dispatch)
      selectors.ts              # useScenarioView(): resolved cells, results, gaps, tipping, robustness, counts
    hooks/
      useMediaQuery.ts          # (min-width: 768px)
      useClipboard.ts           # navigator.clipboard + textarea fallback
      useToast.ts
    components/
      ui/                       # Button, IconButton, Badge, StatusBadge, Tooltip, Modal, SidePanel,
                                #   Toast region, Toggle (aria-pressed), SegmentedControl, WeightSlider,
                                #   DisabledWithTooltip (aria-disabled pattern), LiveRegion
      layout/                   # Footer, WorkspaceHeader, DemoPill, ScenarioSwitcher, PharmaBanner, MobileMenu
    screens/
      start/                    # StartScreen, ScenarioCard, UploadDropzone, AboutModal
      setup/                    # SetupLayout (stepper), SetupStep, CriteriaStep, CriterionRow,
                                #   WeightTotal, SuggestionsList, LiveRankingStrip
      workspace/
        Workspace.tsx           # header + tabs + active tab
        compare/                # CompareTab, CompareToolbar, Legend, MatrixTable, MatrixCell, TotalsRow,
                                #   CriterionCards (mobile), EvidencePanel, EditValueForm, AddValueForm,
                                #   InfoRequestDraft
        insights/               # InsightsTab, RecommendationCard, TieBanner, RobustnessBadge, DriversCard,
                                #   GapsList, WhatIfPanel, BeforeAfter
        report/                 # ReportTab, ReportDocument, LockOverlay, ReportActions
    overlays/                   # WelcomeModal, DemoChecklist (card + mobile bottom sheet),
                                #   ChecklistCompletion, ConfirmStartOver
```

---

## 2. Data model (`src/data/types.ts`)

```ts
export type ScenarioId = 'A' | 'B' | 'C' | 'D';
export type DocId = string;          // e.g. 'alpha', 'helix'
export type CriterionId = string;    // e.g. 'a_cost', 'd_inspection'
export type CellKey = `${CriterionId}|${DocId}`;

export interface DocumentInfo {
  id: DocId;
  name: string;               // exactly as in SPEC ("Supplier dossier — Helix Chem")
  defaultNickname: string;    // "Helix Chem" (names used by SPEC microcopy)
  fileType: 'PDF' | 'DOCX' | 'XLSX' | 'CSV';
  pages?: number;             // omitted for Scenario B spreadsheets (SPEC gives none)
}

export type CriterionKind = 'number' | 'qualitative' | 'boolean';
export type Direction = 'lower' | 'higher';

export interface UnitSpec {
  label: string;              // 'BRL', 'months', '%', 'h', 'days', '×', 'USD/kg', 'weeks', ''
  isPercent: boolean;         // caps tipping range and inputs at 100
  prefix?: string;            // 'BRL ', 'USD '
  suffix?: string;            // ' months', '%', ' h', 'M', 'k', '×', '/kg'
  decimals: number;           // display + tipping precision (see §4.6 table)
  min?: number; max?: number; // input validation
}

interface CriterionBase {
  id: CriterionId;
  name: string;               // "Total cost"
  description: string;        // one line for the Criteria step
  messageName: string;        // lower-case phrase used in sentences: "share of senior consultants"
  infoRequestAsk: string;     // "the percentage of senior consultants allocated to the project team"
  defaultWeight: number | null; // null = suggestion (added with weight 0)
  unit: UnitSpec;
}
export type CriterionDef =
  | (CriterionBase & { kind: 'number'; direction: Direction })
  | (CriterionBase & { kind: 'qualitative' })
  | (CriterionBase & { kind: 'boolean' });

export type CellValue =
  | { kind: 'number'; value: number }
  | { kind: 'qualitative'; score: number; text: string }
  | { kind: 'boolean'; value: boolean };

export interface SourceRef {
  label: string;              // "p.14", "CoA p.2", "clause 5.4", "cell B4", "row 3", "Annex C"
  qualifier?: string;         // "read from a scanned table", "found in a comment cell"
}

export interface Evidence {
  snippet: string;            // short realistic excerpt
  highlight: string;          // substring of snippet to <mark>; validated by data.test.ts
}

export type CellSeed =
  | {
      extraction: 'found';
      value: CellValue;
      confidence: number;       // 0–100 integer
      source: SourceRef;
      evidence: Evidence;
      aiRationale?: string;     // qualitative only
      conversionNote?: string;  // "Converted from 26 weeks (26 × 12 ÷ 52 = 6.0 months)"
      caveat?: string;          // "Stated as 'approx. 6–8 weeks'; lower bound used"
    }
  | { extraction: 'not_found'; searchNote: string }; // "No critical-incident response time stated in the SLA section (pp. 14–16)."

export interface ScenarioDemoConfig {
  reviewCells: [CellKey, CellKey];  // the two < 70% cells (checklist step 2)
  gapCell: CellKey;                 // checklist step 3 target
  gapStepText: string;              // exact SPEC text
  suggestedValue: CellValue;        // used for the input placeholder hint ("e.g., 80")
}

export interface Scenario {
  id: ScenarioId;
  title: string;                  // "Pharma Supplier Qualification"
  industryTag: string;            // "Healthcare & pharma"
  cardDescription: string;
  featured: boolean;              // D only
  disclaimerBanner?: string;      // D: "Illustrative data. Not regulatory or quality advice."
  question: string;
  documents: DocumentInfo[];
  criteria: CriterionDef[];       // defaults first (SPEC order), then suggestions
  cells: Record<CellKey, CellSeed>;
  demo: ScenarioDemoConfig;
}

// ---- Review & audit (in src/state/types.ts) ----
export type CellStatus =
  | 'auto'            // found, confidence ≥ 70 → badge shows "95%"
  | 'needs_review'    // found, confidence < 70
  | 'human_verified' | 'human_edited'
  | 'not_found' | 'info_requested' | 'accepted_gap'
  | 'human_provided';

export type ReviewAction =
  | { type: 'confirm'; at: string }
  | { type: 'edit'; value: CellValue; note: string; at: string }
  | { type: 'provide'; value: CellValue; sourceNote: string; at: string }
  | { type: 'request_info'; message: string; at: string }
  | { type: 'accept_gap'; at: string };

export interface ResolvedCell {
  key: CellKey;
  status: CellStatus;
  value: CellValue | null;        // null for any gap
  isGap: boolean;                 // not_found | info_requested | accepted_gap
  isPendingReview: boolean;       // status === 'needs_review'
  seed: CellSeed;
  review?: ReviewAction;
}

export interface InfoRequest { cellKey: CellKey; message: string; at: string }  // derived from reviews

export type AuditActor = 'You' | 'Contrast (simulated AI)';
export interface AuditEntry {
  id: string;
  at: string;                     // ISO timestamp
  actor: AuditActor;
  action: 'comparison_run' | 'setup_updated' | 'confirmed' | 'edited' | 'value_added'
        | 'info_requested' | 'gap_accepted' | 'whatif_applied';
  summary: string;                // frozen text, using nicknames at the time of the action
  cellKey?: CellKey;
  before?: string; after?: string; note?: string;
}
```

**Data authoring rules for `scenarios.ts`:** values, confidences and sources come verbatim from SPEC.md. The new text I write is snippets, AI rationales, descriptions, search notes and info-request phrasing, and it never contains numbers that contradict the spec. Gamma's go-live is stored as `6.0` months, with the 26-week origin in `conversionNote`. Pacífico's lead time is stored as `6`, with the "approx. 6–8 weeks" caveat.

---

## 3. State management

**Global state (`useReducer` + Context):**

```ts
interface AppState {
  activeScenarioId: ScenarioId | null;           // null = Start screen
  sessions: Partial<Record<ScenarioId, ScenarioSession>>;
  ui: {
    welcomeOpen: boolean; aboutOpen: boolean; switcherOpen: boolean;
    checklistOpen: boolean; checklistCollapsed: boolean;
    confirmStartOverOpen: boolean;
  };
  toasts: Toast[];
}

interface ScenarioSession {
  stage: 'setup' | 'criteria' | 'workspace';
  hasRun: boolean;
  activeTab: 'compare' | 'insights' | 'report';
  nicknames: Record<DocId, string>;
  setup: { criteria: CriterionId[]; weights: Record<CriterionId, number> }; // the confirmed setup (ordered)
  lastRunSetup: Setup | null;                    // snapshot, used to diff for the audit "Setup updated"
  reviews: Partial<Record<CellKey, ReviewAction>>;
  audit: AuditEntry[];
  whatIf: WhatIfState | null;                    // null = mirrors the confirmed setup
  filters: { onlyDifferences: boolean; needsReviewOnly: boolean };
  openCell: CellKey | null;
  exported: boolean;                             // checklist step 4
}

interface WhatIfState {
  weights: Record<CriterionId, number>;          // raw integers 0–100 (not required to sum to 100)
  excludedDocs: DocId[];                         // max (n − 2)
  excludedCriteria: CriterionId[];               // keeps ≥ 3 included
  gapPolicy: 'penalize' | 'neutral';
}
```

**Key behaviours**
- **Per-cell review persistence:** `reviews` is keyed by `CellKey` and does not depend on the setup. Removing a criterion hides its cells but keeps their reviews, and re-adding the criterion brings them back. "Edit setup" → Run keeps every review.
- **Setup edits are live, with no draft copy.** Setup and Criteria change `session.setup` directly. The workspace can only be reached through "Run comparison", which requires weights summing to 100 and at least 3 criteria, so no view ever renders an invalid setup. Leaving mid-edit (switching scenario) keeps `stage: 'criteria'`, and coming back resumes there.
- **"Run comparison"** sets `hasRun`, `stage: 'workspace'`, `activeTab: 'compare'` and `whatIf: null`. The first run logs `comparison_run` ("Contrast (simulated AI) extracted 18 values from 3 documents: 2 need review, 1 not found."). A later run logs `setup_updated` with a diff against `lastRunSetup` (for example "Lead time 10% → 15%; removed Total cost"). Then it stores the snapshot.
- **What-if is separate:** it is an override layer (`whatIf`). Compare, the Insights top cards and the Report body always use the confirmed `setup` with the Penalize policy. The What-if panel computes "After" from `whatIf`. "Reset to confirmed setup" sets `whatIf: null`. "Apply as new setup" writes the weights (renormalized to integers summing to 100 with the largest-remainder method) and the criterion exclusions into `setup`, logs `whatif_applied` and sets `whatIf: null`. Document exclusions and the Neutral policy are simulation-only and are not applied (the UI says so; see OQ-6). Any change to the confirmed setup also resets `whatIf`.
- **Switch scenario:** sets `activeScenarioId`. The other sessions stay untouched ("progress is kept per scenario while the page is open"). There is no localStorage, so a refresh resets everything, which matches the non-goal "no persistence".
- **Start over:** a confirmation dialog, then `RESET_ALL`: sessions emptied, `activeScenarioId: null`, UI flags reset, and the toast "Everything cleared."
- **Edit setup:** `stage: 'setup'` for the active scenario. Everything is prefilled from `session.setup` and `nicknames`.
- **Quick demo:** `QUICK_START(D)` creates the session with defaults, `hasRun: true`, `stage: 'workspace'`, a `comparison_run` audit entry and `welcomeOpen: true`. Closing the welcome modal with "Start the 2-minute demo" sets `checklistOpen: true`.
- **Reducer purity:** timestamps and IDs are created in action creators (`at: new Date().toISOString()`), so reducer tests are deterministic.

**Derived view (`useScenarioView`)**, memoized on `[session, scenario]`: resolved cells → `computeResults(confirmed)` → gaps → tipping points → robustness → drivers → counts (pending reviews, open gaps) → checklist steps → what-if "After" results.

---

## 4. Scoring engine (`src/lib/scoring.ts`, all pure)

### 4.1 Inputs and outputs
```ts
interface ScoringInput {
  criteria: { def: CriterionDef; weight: number }[];  // weights may be any non-negative reals
  docIds: DocId[];
  cells: Record<CellKey, CellValue | null>;           // null = gap
  gapPolicy: 'penalize' | 'neutral';
}
interface DocResult { docId; total: number; adherence: number; adherenceTenths: number; rank: number }
interface Results {
  cellScores: Record<CellKey, number>;
  ranking: DocResult[];          // sorted by total desc, then document order
  leaderId: DocId;
  isTie: boolean; tiedDocIds: DocId[];
}
```

### 4.2 Functions
- `scoreCriterion(def, values: (CellValue|null)[], gapPolicy): number[]`
  - **Number, lower is better:** `best = min(found)`. If `v === best` the score is 5, otherwise `5 × best ÷ v`.
  - **Number, higher is better:** `best = max(found)`. If `v === best` the score is 5, otherwise `5 × v ÷ best`. (The equality check comes first, so `best = 0` gives 5 rather than NaN.)
  - **Qualitative:** score = the stored 0–5 score.
  - **Yes/No:** Yes = 5, No = 0.
  - **Gaps:** Penalize gives 0. Neutral gives the mean score of the *non-gap* documents in that row, or 0 if there are none.
  - **Best is computed only among found or human-provided values of the included documents.** Excluding a document in what-if can therefore change "best".
- `normalizeWeights(weights, includedIds)`: proportional rescale so the included weights sum to 100 (real numbers). Returns `null` if the sum is 0, and the UI then shows an error.
- `computeResults(input)`: `total = Σ(score × weight) ÷ 100`, `adherence = total ÷ 5 × 100`, `adherenceTenths = roundHalfUp(adherence × 10)`.
- `isTechnicalTie(ranking)`: `(r[0].adherenceTenths − r[1].adherenceTenths) ≤ 50`. The check uses **integer tenths of the displayed values**, so 85.0 vs 80.0 is a tie and there are no floating-point surprises. `tiedDocIds` = every document within 50 tenths of #1.
- `largestRemainder(weights, total = 100)`: integer rounding with ties broken by criterion order. It is used by "Distribute evenly" (100/6 → 17,17,17,17,16,16) and by "Apply as new setup".
- `plausibleRange(def, foundValues)`: numbers use `[0.5 × min, 1.5 × max]`, with max capped at 100 when `unit.isPercent`. Qualitative uses `[0, 5]`. Yes/No uses `{No, Yes}`. "Found values" are the non-gap values of the *other included documents* in that row. A single found value works naturally (for example South churn gives [4.5, 13.5]). If there are no found values, any number would score 5, so the gap is evaluated with a single representative value.
- `findTippingPoint(input, gapKey): TippingResult`
  ```ts
  type TippingResult =
    | { kind: 'threshold'; operator: '≥' | '≤'; threshold: number; display: string }
    | { kind: 'boolean'; value: boolean }    // only one of Yes/No flips it
    | { kind: 'decisive' } | { kind: 'none' } | { kind: 'already_first' };
  ```
  - `flips(v)` substitutes `v` into the gap cell, recomputes everything (best values included), and returns true if the document's total is **strictly greater** than every other document's (raw totals).
  - **Monotonicity:** a better value raises this document's score and can only lower the others' (it may become the new best). So `flips` is monotonic over the range, and the flipping set is an interval at the "good" end.
  - Evaluate the good end and the bad end of the range. If the good end doesn't flip, return `none`. If the bad end flips, return `decisive`. Otherwise bisect 60 iterations to the raw boundary.
  - **Conservative rounding** to `unit.decimals` (qualitative: 1): use `ceil` for `≥` (higher is better, qualitative) and `floor` for `≤` (lower is better). Then assert `flips(rounded)`. If floating-point error makes it fail, step one unit further toward the good end.
  - Only computed for open gaps of documents that are not #1. Gaps of #1 return `already_first`, which is safe: under Penalize, filling #1's gap can only widen its lead.
- `computeTippingPoints(input)`: maps every open gap to a TippingResult.
- `robustness(results, tipping)`:
  - **Low** if there is a technical tie or any result is `decisive`.
  - **Medium** if any result is `threshold` or `boolean`.
  - **High** otherwise.

  It returns `{ level, reasonKind, refs }`, and `messages.ts` turns that into the one-line reason.
- `drivers(results, input)`:
  - `gapToSecond = (t1 − t2 tenths) / 10` points, from the displayed values.
  - `topCriterion` = argmax over criteria of `(s#1 − s#2) × weight ÷ 5` in percentage points. If that is ≤ 0 for every criterion, return null.
  - `secondIsGap` flag so the copy can say "Vendor Gamma's value is missing".

### 4.3 Rounding rules (single source in `format.ts`)
- All computation uses unrounded numbers. Rounding happens only for display, plus the tie check in tenths.
- Adherence: 1 decimal, round half-up (`Math.round(x*10 + 1e-9)/10`).
- Weighted total: `X.XX / 5` (2 decimals). A tooltip on the totals row says "Calculated from unrounded scores", because 4.35 / 5 can display next to 86.9%.
- Cell score: 1 decimal in the matrix ("4.1"). The evidence panel shows the 2-decimal calculation ("5 × 980,000 ÷ 1,200,000 = 4.08").
- Points (gap to #2, driver advantage): 1 decimal.
- Effective weights in what-if: 1 decimal.
- Tipping thresholds: per-criterion `unit.decimals`, rounded conservatively.

### 4.4 Edge-case rules
| Case | Rule |
|---|---|
| Not found / Info requested / Accepted gap | Score 0 (Penalize). Never counted when finding "best". |
| Single found value in row | That value is best → 5. The range is [0.5v, 1.5v]. |
| All found equal (e.g., GMP all Yes) | All score 5. No "Best" highlight (row isn't differentiating). Hidden by "Show only differences". |
| Lower-is-better input of 0 or negative | Rejected by validation ("Enter a value greater than 0") to avoid division by zero. |
| Higher-is-better `best = 0` | Equality check → 5. No NaN. |
| Weight 0 criterion | Shown with 0%, contributes nothing, tipping → `none`. |
| What-if weights sum 0 | "After" shows "Set at least one weight above 0 to simulate." Apply is disabled. |
| Neutral with no other found value | Gap gets 0. |
| Tie exactly 5.0 points | Tie (≤). |
| Equal raw totals | Same order as documents. Both shown as tie (difference 0). |

### 4.5 Expected results (all encoded in tests)
| Scenario | Default | Robustness | Tipping | After fill | After robustness | Neutral |
|---|---|---|---|---|---|---|
| A | Alpha 86.9, Gamma 80.3, Beta 68.2 | Medium | Gamma senior ≥ 40% · Beta SLA none | Gamma=80: Gamma 90.3, Alpha 84.4, Beta 66.5 | High | Gamma 88.6, Alpha 86.9, Beta 75.7 (tie) |
| B | North 78.3, South 70.5 | Low | South churn decisive | South churn=6: South 90.5, North 71.6 | High (derived) | South 90.5, North 88.3 (tie) |
| C | RotaLog 82.1, FastFreight 72.5 | Medium | FF termination ≤ 62 days | FF=30: FF 82.5, RotaLog 77.1 | Low (derived: RotaLog penalty decisive) | RotaLog 97.1, FF 82.5 |
| D | Norden 89.8, Helix 83.2, Pacífico 81.6 | Medium | Pacífico inspection ≥ 2.8 | Pacífico=5: Pacífico 96.6, Norden 89.8, Helix 83.2 | High | Pacífico 95.1, Norden 89.8, Helix 83.2 |

Raw tipping boundaries, as a sanity check: Gamma 39.625 → 40, FastFreight 62.77 → 62, Pacífico 2.734 → 2.8.

### 4.6 Criterion catalog (display format = tipping precision)
| Scenario · criterion | id | kind / dir | display | decimals |
|---|---|---|---|---|
| A Total cost (25) | a_cost | number lower | BRL 1,200,000 | 0 |
| A Time to go-live (20) | a_golive | number lower | 6.0 months | 1 |
| A Scope coverage (20) | a_scope | number higher, % | 90% | 0 |
| A Data migration approach (15) | a_migration | qualitative | text + 4.5 | 1 |
| A Support SLA, critical response (10) | a_sla | number lower | 4 h | 0 |
| A Senior consultants on the team (10) | a_senior | number higher, % | 60% | 0 |
| A + Industry references | a_refs | number higher | 3 | 0 |
| A + Training included | a_training | boolean | Yes | — |
| B Revenue growth YoY (20) | b_growth | higher, % | 18% | 0 |
| B EBITDA margin (20) | b_ebitda | higher, % | 12% | 0 |
| B Customer churn (20) | b_churn | lower, % | 9% | 0 |
| B NPS (15) | b_nps | higher | 41 | 0 |
| B Revenue per employee (15) | b_revemp | higher | BRL 610k | 0 |
| B Net debt / EBITDA (10) | b_netdebt | lower | 0.9× | 1 |
| B + Gross margin | b_gross | higher, % | 48% | 0 |
| C Annual price (30) | c_price | lower | BRL 4.6M | 1 |
| C Payment terms (15) | c_payment | higher | 60 days | 0 |
| C Annual price adjustment cap (15) | c_cap | lower, % | 4.5% | 1 |
| C Late-delivery penalty (15) | c_penalty | higher, % | 5% | 0 |
| C Liability cap (15) | c_liability | higher | 1.0× | 1 |
| C Termination notice (10) | c_termination | lower | 60 days | 0 |
| C + Data protection clause | c_dataprot | boolean | Yes | — |
| D Assay purity (25) | d_purity | higher, % | 99.6% | 1 |
| D Largest single impurity (20) | d_impurity | lower, % | 0.08% | 2 |
| D Valid GMP certificate (15) | d_gmp | boolean | Yes | — |
| D Price per kg (15) | d_price | lower | USD 1,850/kg | 0 |
| D Lead time (10) | d_leadtime | lower | 12 weeks | 0 |
| D Regulatory inspection history (15) | d_inspection | qualitative | text + 4.0 | 1 |

"Whole numbers for %" would make D's purity and impurity meaningless, so precision is set per criterion (see OQ-9).

---

## 5. Screen-by-screen UX and microcopy

### 5.0 Global
- **Footer (every screen):** "Prototype by [Maria Gabriela Ventura](https://www.linkedin.com/in/mariagabrielaventura)" (`target="_blank" rel="noopener noreferrer"`, sr-only "(opens in a new tab)") · "Simulated AI results and fictional data."
- **Style:** white background, `indigo-600` accent, slate neutrals, Inter, `rounded-xl` cards, `shadow-sm`, generous spacing. Status colors always come with text and an icon:
  - Best: green + Trophy icon + "Best"
  - Below expectation: amber + ArrowDown icon + sr/tooltip "Below expectation (score under 3.0)"
  - Not found: grey + CircleSlash
  - Needs review: orange + AlertTriangle
- **Toasts** (bottom-center, `aria-live="polite"`, 4 s, dismiss button). The full list:
  - "Demo mode: file analysis isn't available in this prototype. Try a sample scenario."
  - "Value confirmed. Marked as Human-verified."
  - "Value updated. Scores recalculated."
  - "Value added. Scores recalculated."
  - "Info request drafted. Status set to Info requested."
  - "Message copied to clipboard."
  - "Kept as gap. It still scores 0."
  - "Summary copied to clipboard."
  - "Couldn't copy. Select the text and copy it manually."
  - "What-if applied as your new setup."
  - "Simulation reset to your confirmed setup."
  - "Everything cleared."
  - "Ranking changed: {doc} is now #1 with {x}%." (fires when a review action changes the leader)
- **Global drop guard:** `dragover`/`drop` on `window` call `preventDefault`, so a file dropped anywhere never navigates the browser away.

### 5.1 Start screen
- Top bar: wordmark "Contrast" · link button "About this prototype".
- H1 "Compare any documents. Decide with evidence." with the subline exactly as in the spec.
- Three steps with icons (Upload / ListChecks / Scale): "Upload", "Confirm criteria", "Review and decide", each joined by a chevron and labeled as an ordered list.
- Primary button **"Quick demo (2 min)"**, caption under it: "Pharma supplier qualification · 3 documents". Runs `QUICK_START(D)`.
- **Scenario cards** (order D, A, C, B). Each has the industry tag chip, title, one-line description and a "Load sample scenario" button, which goes to Setup step 1 for that scenario (or resumes its session).
  - D has a "Featured" chip (Star icon). Description: "Compare 3 API supplier dossiers on purity, impurities, GMP status, price and inspection history."
  - A: "Compare 3 CRM implementation proposals on cost, timeline, scope, migration and team."
  - C: "Compare 2 logistics contract drafts on price, payment terms, penalties, liability and exit terms."
  - B: "Compare 2 companies' FY2025 results on growth, margin, churn, NPS and leverage."
  - A card with progress shows a "In progress" chip and the button reads "Resume scenario".
- **Upload area:** dashed card "Drop 2–4 documents here" / "PDF, DOCX, XLSX or CSV" and a button "Select files" (hidden `<input type=file multiple>`). Drag-over state: indigo border + "Drop to try". On drop or change: show the demo toast, reset the input value, accept nothing.
- **About modal** (Radix Dialog), title "About this prototype":
  - What's real: "The flow, business rules, scoring, human review, audit trail and report."
  - What's simulated: "Reading the documents and the AI extraction, including confidence levels and evidence snippets."
  - What a full version would add: "Real AI extraction with citations, extraction accuracy evals, custom criteria, industry templates, history and sharing."
  - Button "Close". Esc and the X also close it, and focus returns to the trigger.

### 5.2 Welcome modal (Quick demo only)
- Eyebrow, title, body, the "In the next 2 minutes you will:" ordered list (3 items), and the note, all verbatim from the spec.
- Buttons: **"Start the 2-minute demo"** (primary, initial focus) closes the modal and opens the checklist. **"Choose another scenario"** closes the modal and opens the header Switch-scenario menu with focus on its first item.
- Esc or X = same as "Start the 2-minute demo" (closes and opens the checklist).

### 5.3 Setup — step 1
- Slim header: wordmark, "Demo" pill, stepper "1 Setup — 2 Criteria" (`aria-current="step"`), link "← All scenarios" (back to Start, progress kept). D shows the pharma banner.
- Read-only "Decision question" with a Lock icon, and the note "In demo mode, the question and criteria are pre-generated for each scenario."
- Documents table: Name · Type · Pages ("—" for spreadsheets) · Nickname input (label "Nickname for {name}", max 24 characters).
  - Errors (inline, `aria-describedby`): "Nickname can't be empty." / "Each document needs a different nickname."
- **"Continue to criteria"** (aria-disabled with the inline error focused when invalid).

### 5.4 Criteria — step 2
- Intro: "Contrast suggested these criteria for your question. Adjust weights so they add up to 100%."
- **Criterion row:** name, description, rule chip ("Lower is better" / "Higher is better" / "Qualitative score (0–5)" / "Yes = 5, No = 0"), and the weight control (native range 0–100 step 1 plus a linked number input, label "Weight for {name}", `aria-valuetext="25%"`). Icon buttons "Move {name} up" / "Move {name} down" (disabled at the ends). "Remove {name}" is aria-disabled at 3 criteria, with tooltip "At least 3 criteria are needed for a comparison."
- **Total bar** (sticky at the bottom of the list): "Total: 95%".
  - Valid: CheckCircle + "Weights add up to 100%".
  - Invalid: AlertCircle + "Weights must add up to 100%" + "(5% left to assign)" or "(5% over)".
  - The total is announced via a polite live region, debounced.
- **"Distribute evenly"** button (largest remainder).
- **"More suggestions"** section: each suggestion has name, rule chip and "Add". Adding inserts it at the end with weight 0 and moves focus to its weight input. Removed default criteria also go back to this list. Empty state: "No more suggestions for this scenario."
- **"Add custom criterion"** is aria-disabled, with tooltip "Custom criteria are available in the full version".
- **Live ranking strip** (only after the first run and only while the total is 100%): "Current ranking with these weights: 1. Norden API 89.8% · 2. Helix Chem 83.2% · 3. Pacífico Labs 81.6%" (see OQ-2).
- Footer buttons: "Back to setup" · **"Run comparison"** (aria-disabled unless total = 100 and count ≥ 3; clicking while disabled focuses the helper text).

### 5.5 Workspace header (sticky)
- Row 1:
  - wordmark
  - "Demo" pill (tooltip "Fictional data and simulated AI. Switch scenarios anytime.")
  - "Switch scenario" dropdown (4 items: title + industry tag, current one checked, "In progress" marker)
  - "Demo guide" (opens or expands the checklist)
  - "Edit setup"
  - "Start over"
- Row 2: decision question (clamped to 2 lines, full text in a `title`/expand), nickname chips.
- Tabs (Radix): **Compare · Insights · Report**. Report has a badge "2" (orange + AlertTriangle, aria-label "Report, 2 items pending review"). The badge is hidden when 0.
- D: pharma banner under the header: Info icon + "Illustrative data. Not regulatory or quality advice."
- **Start over dialog:** "Start over?" / "This clears every scenario's setup, review decisions, gaps and what-if changes. You'll return to the start screen." Buttons "Cancel" (initial focus) and "Start over" (destructive).

### 5.6 Compare tab
- **Toolbar:**
  - counter "2 items need review · 1 gap" (with singular/plural forms: "1 item needs review", "0 items need review", "1 gap", "0 gaps")
  - toggles "Show only differences" and "Needs review only" (`aria-pressed`, combinable with AND)
  - a Legend popover/inline legend: Best, Below expectation (score < 3.0), Needs review, Not found, the human statuses, and "Confidence ≥ 70% shown as %".
- **Matrix (≥768px):** a semantic `<table>`.
  - Header: criterion column + one column per document (nickname, type).
  - Each row header shows criterion name, weight %, rule chip.
  - Each cell is a full-size `<button>` containing:
    - value (qualitative shows its text, clamped to 2 lines; gaps show "—")
    - "Score 4.2" (gaps "Score 0")
    - status badge: confidence "95%" / "Needs review" / "Not found" / "Info requested" / "Accepted gap" / "Human-verified" / "Human-edited" / "Human-provided"
    - optional Best / Below-expectation marker
    - "Converted" mini-label for converted units.
  - Accessible name: "{criterion}, {doc}: {value}. Score {x} of 5. {status}. Open details."
- **Totals row:** "Weighted total" with "4.49 / 5", "89.8%", rank chip "#1" (Trophy) / "#2", and "Technical tie" chip when applicable. A polite live region announces "Ranking updated: …" when the order changes.
- **Empty filter state:** "No rows match these filters." + "Clear filters". With Needs review only and nothing pending: "Nothing needs review. Every extracted value has been checked." + "Show all rows".
- **Evidence panel** (Radix Dialog styled as a right drawer, 440px, full screen on mobile):
  - Header: criterion name · doc nickname · close (X, "Close details").
  - **Found:**
    - status badge and confidence line ("Confidence 64% — below the 70% review threshold" / "Confidence 95%")
    - large value
    - "Score 4.17 / 5"
    - **Evidence:** blockquote snippet with `<mark>` highlight
    - "Source: Pacífico Labs · p.12 (read from a scanned table)"
    - **Scoring rule:** "Lower is better: the best found value scores 5; others score 5 × best ÷ value." plus the calculation line
    - **AI rationale** (qualitative)
    - **Unit conversion** note when present, and the caveat when present
    - small "Simulated AI extraction" label
  - **Not found:** "Not found in {doc}." + searchNote, and "How gaps are scored: a missing value scores 0. Unverified information shouldn't earn points, and a missing answer is itself a risk signal." Then **"Could this change the decision?"** with the tipping sentence for this gap.
  - **Actions by status:**
    - Needs review: **"Confirm"** and **"Edit value"**.
    - Human-verified / edited / provided: "Edit value" (see OQ-4).
    - Auto (≥70%): no actions, only the line "No review needed."
    - Not found: **"Add value"**, **"Draft info request"**, **"Keep as gap"**.
    - Info requested: "Add value", "Keep as gap", and the drafted message shown again with "Copy message".
    - Accepted gap: "Add value", "Draft info request".
  - **Edit value form:**
    - number: label "{criterion} ({unit})" with a unit suffix; errors "Enter a number.", "Enter a value from 0 to 100.", "Enter a value greater than 0."
    - qualitative: "Score (0–5)" step 0.1 ("Enter a score from 0 to 5.") + "Rationale" (required)
    - Yes/No: radios
    - "Note (optional)"
    - "Save" / "Cancel"
  - **Add value form:** the same value inputs + "Source note" (required, placeholder "Where did this come from? e.g., Email from supplier QA, 21 Nov"). For qualitative, the source note is also used as the rationale. The placeholder of the value input hints the demo value ("e.g., 5") when the cell is the scenario's `gapCell`.
  - **Draft info request:** status becomes Info requested immediately (audit-logged). The panel shows a read-only textarea with the message and **"Copy message"**. Template:
    ```
    Subject: Information request — {criterion name}

    Hello {nickname} team,

    We are reviewing "{document name}" to answer: "{decision question}"
    We could not find {infoRequestAsk} in the document. Could you share it,
    together with where it is stated (page, clause or cell)?

    Thank you.
    ```
  - After a resolving action the panel stays open showing the new status. If more items are pending, a "Next item needing review →" link appears (see OQ-3).
  - Focus returns to the originating cell button on close.

### 5.7 Insights tab
- **Recommendation card:** "Recommended: Norden API — 89.8%" with the robustness badge. Or, on a tie, the **Technical tie banner**: "Technical tie: {A} ({x}%) and {B} ({y}%) are within 5.0 points. Review what drives the result before deciding."
- **Robustness badge** (icon + text) "Decision robustness: Low / Medium / High" with a one-line reason:
  - Low (tie): "The top documents are within 5.0 points of each other."
  - Low (decisive): "{doc}'s missing {messageName} is decisive: any plausible value would make it #1."
  - Medium: "{leader} leads clearly, but {doc}'s missing {messageName} could change #1."
  - High: "{leader} leads by {n} points and no open gap can change #1."
- **What drives this result:**
  - "Lead over #2: 6.6 points ({#1} {x}% vs {#2} {y}%)."
  - "Biggest advantage: {criterion}. {#1} scores {a} vs {b}, worth {n} points." Adds " ({#2}'s value is missing.)" when it applies.
  - "Gaps that could change the result:" lists the tipping sentences. If there are none: "No open gap could change the result."
- **Tipping sentences:**
  - "If {doc}'s {messageName} is {≥|≤} {threshold}, {doc} would rank #1."
  - "Any plausible value would make {doc} #1. This gap is decisive."
  - "Even the best plausible value would not change the ranking."
  - Boolean: "If {doc}'s {messageName} is Yes, {doc} would rank #1."
  - #1's own gaps: "{doc} is already #1. Filling this gap can only widen its lead."
  - Possessive helper: "Pacífico Labs'".
- **Gaps list:** rows of doc · criterion · status badge (Not found / Info requested / Accepted gap) · tipping sentence · "Open in Compare" (switches tab and opens the panel). Empty: "No open gaps. Every criterion has a value for every document."
- **What-if panel** ("What-if simulation", helper "Try changes without touching your confirmed setup. Nothing changes until you apply it."):
  - **Weights:** one slider per included criterion, with "Effective weight: 23.8%".
  - **Include documents:** checkboxes. The last 2 are aria-disabled with tooltip "Keep at least 2 documents."
  - **Include criteria:** checkboxes. Aria-disabled at 3, tooltip "Keep at least 3 criteria." Helper: "Weights of the remaining criteria are rescaled proportionally for this simulation only."
  - **"Treat gaps as:"** segmented radio group "Penalize (0)" / "Neutral (average of others)". Neutral helper: "Each gap gets the average score of the other documents on that criterion, to show how sensitive the decision is to missing information."
  - **Before vs After:** two ranked lists (Before = confirmed, After = simulation), each line "1. Gamma 88.6%", Δ with arrow icon and text ("+8.3 pts"). Each side has its tie/winner label and robustness badge, and the After side lists its tipping sentences (see OQ-1).
  - Buttons: **"Reset to confirmed setup"** and **"Apply as new setup"**, both disabled when the simulation equals the confirmed setup. When document exclusions or Neutral are active, Apply carries the note "Document exclusions and the gap policy are simulation-only and won't be applied."

### 5.8 Report tab
- Toolbar (screen only): **"Export PDF"** (`window.print()`, sets `exported`) and **"Copy summary"** (clipboard + toast, also sets `exported`; see OQ-5).
- **Report document** (A4-friendly):
  1. Title "Decision brief: {scenario title}"
  2. Decision question
  3. Date: the current date at render time (`new Date()`, shown as e.g. `21 November 2026`), never fixed
  4. Documents (nickname — full name, type, pages)
  5. Criteria and weights (compact table with rules)
  6. **Recommendation box** (indigo border): "Recommended: {doc} — {x}%" + robustness + reason, or the tie banner
  7. Compact matrix (scores + status abbreviations, totals + rank)
  8. What drives the result
  9. Gaps (status + tipping sentence)
  10. Open information requests (doc · criterion · requested at), or "None"
  11. Audit trail (time · actor · summary · note)
  12. "What-if simulation (not applied)" box, only while a simulation differs (see OQ-1)
  13. Footer lines "Simulated AI results and fictional data." and, for D, the disclaimer
- **Lock:** while pending > 0, the report renders blurred with `inert` and an overlay card: AlertTriangle, "Review 2 pending items before exporting", the subtext "Gaps don't block export. They're listed in the report.", and the button **"Go to items needing review"**. The button switches to Compare with "Needs review only" on and focuses the first pending cell. Export and Copy are aria-disabled while locked.
- **Copy summary text:**
  ```
  Contrast decision brief — {scenario title}
  Question: {question}
  Recommended: {doc} — {x}% (Decision robustness: {level})
  Ranking: 1. {a} {x}% · 2. {b} {y}% · 3. {c} {z}%
  Open gaps: {n} ({list}) | none
  Open information requests: {n} | none
  Simulated AI results and fictional data.
  ```
- **Print stylesheet:**
  - A4 portrait, 12 mm margins, 10pt base.
  - Hide header, tabs, footer, checklist, toasts, buttons and banner chrome (the disclaimer stays inside the report).
  - Audit trail prints the latest 10 entries + "and {n} earlier entries".
  - `break-inside: avoid` on sections.
  - If printed while locked, the output shows only "Report locked: review pending items before exporting."

### 5.9 Demo checklist
- Floating card bottom-right (desktop), title "Try this demo in 4 steps", progress "{n} of 4", collapse toggle (`aria-expanded`), close (X). "Demo guide" reopens it.
- Steps (checkbox-style, read-only, auto-checked, "Done" sr text):
  1. "Run the comparison"
  2. "Confirm the 2 items that need review"
  3. The scenario's text from the spec
  4. "Open the report and export it"

  Each unchecked step has a "Show me" link (see OQ-3):
  - Step 2 opens Compare with Needs review only.
  - Step 3 opens the gap cell's panel.
  - Step 4 opens Report.
- **On completion:** the bonus line "Bonus: drag a weight in What-if and watch the ranking and report update instantly.", then the closing message from the spec, then 3 buttons for the other scenarios (quick-start or resume, see OQ-7).
- The checklist shows the active scenario's progress. Open or collapsed state is global.

---

## 6. Demo checklist — exact actions per scenario

The step auto-check conditions are in `lib/checklist.ts`:
- Step 1: `hasRun`.
- Step 2: both `demo.reviewCells` have a `confirm` or `edit` review.
- Step 3: `demo.gapCell` has a `provide` review (any valid value).
- Step 4: `exported === true` (Export PDF or Copy summary while unlocked).

| Step | A — IT Vendor Selection | B — Company Performance | C — Contract Risk | D — Pharma (Quick demo) |
|---|---|---|---|---|
| 1 | Criteria → "Run comparison" (or quick-start) | same | same | Auto-checked by "Quick demo (2 min)" |
| 2 | Confirm **Gamma · Time to go-live** (65%) and **Beta · Data migration** (60%) | Confirm **North · NPS** (68%) and **South · Revenue per employee** (64%) | Confirm **FastFreight · Price adjustment cap** (66%) and **RotaLog · Liability cap** (62%) | Confirm **Pacífico · Largest single impurity** (64%) and **Pacífico · Lead time** (67%) |
| 3 | Gamma · Senior consultants → Add value **80** + source note → Gamma #1 90.3% | South · Customer churn → Add value **6** → South #1 90.5% | FastFreight · Termination notice → Add value **30** → FastFreight #1 82.5% | Pacífico · Inspection history → Add value score **5** + note → Pacífico #1 96.6% (3rd → 1st) |
| 4 | Report tab (now unlocked) → "Export PDF" | same | same | same |
| Robustness after | High | High | Low (RotaLog penalty decisive) | High |

---

## 7. Mobile (<768px)

`useMediaQuery('(min-width: 768px)')` renders exactly one layout, so there is no duplicate accessible content.
- **Header:** wordmark + Demo pill + "Menu" button (Radix dropdown: Switch scenario, Demo guide, Edit setup, Start over). The question is clamped to 2 lines with a "Show full question" toggle. Tabs are full-width and sticky.
- **Compare:** one card per criterion (name, weight, rule chip), with documents stacked inside as full-width buttons (nickname, value, score, badge, Best/Below marker). The last card is "Weighted total" with rank chips. The toolbar wraps, and the counter sits on its own line.
- **Evidence panel:** full-screen dialog, sticky header with "Back" and close, sticky bottom action bar.
- **Checklist:** bottom sheet. Collapsed, it's a docked bar "Demo guide · 2 of 4" (button, `aria-expanded`). Expanded, it's a sheet up to 70vh with a scrim and focus trap. The page gets `padding-bottom` so the bar never covers content.
- **Setup/Criteria:** documents table → stacked cards. Criteria rows stack the slider under the text. The total bar is sticky at the bottom.
- **Insights/What-if:** single column. Before/After stacks vertically.
- **Report (screen):** the compact matrix becomes per-criterion lists. Print always uses the table.
- **No horizontal overflow:** `min-w-0` on flex children, `break-words` on long names/snippets, `overflow-wrap:anywhere` for BRL numbers. Checked at 375px (see §9).

---

## 8. Accessibility

- **Keyboard flow:**
  - Start: Skip link → About → Quick demo → cards → upload.
  - Workspace: header actions → tabs (arrow keys via Radix) → toolbar → matrix cells in DOM order (row by row) → totals → checklist.
  - All controls are native buttons, inputs or Radix primitives. There are no click-only divs.
- **Visible focus:** global `:focus-visible` ring (`2px indigo-600`, 2px offset, also visible on indigo buttons via a white inner ring). The focus ring is never removed.
- **Side panel and modals:** Radix Dialog gives `role="dialog"`, `aria-modal`, `aria-labelledby`/`describedby`, a focus trap, Esc to close and focus return. Initial focus:
  - panel: the heading (tabIndex −1) so screen readers read context
  - welcome: the primary button
  - Start-over: "Cancel"
  - The panel reopened through "Next item" keeps focus inside and moves it to the new heading.
  - On close, focus goes back to the triggering cell (stored ref). If that cell is hidden by a filter, it goes to the matrix heading.
- **Disabled-with-tooltip pattern:** buttons that need a tooltip use `aria-disabled="true"` (still focusable), so the tooltip works on keyboard focus. Clicks are no-ops, and the reason is also in `aria-describedby`.
- **Color-coded states:** every badge has visible text, or an icon + sr-only text and a tooltip, and the Legend explains each one.
  - The rank uses "#1" text plus a Trophy icon.
  - Before/After deltas use an arrow icon plus "+8.3 pts".
  - Robustness uses an icon (ShieldCheck / Shield / ShieldAlert) plus the word.
- **Live regions:** toasts (polite), weight total (polite, debounced), ranking change (polite) "Ranking updated: Pacífico Labs is now #1 with 96.6%."
- **Forms:** every input is labeled; errors are linked with `aria-describedby` and `aria-invalid`, and the first invalid field gets focus on submit.
- **Motion:** rank-change animations are disabled under `prefers-reduced-motion`.
- **Contrast:** text meets WCAG AA. Amber and orange badges use dark text on a light tint.
- **Semantics:** the matrix is a `<table>` with `<caption class="sr-only">`, `scope="col"`/`scope="row"`. The checklist is an `<ol>` with `aria-checked`-style text ("Done"/"To do").

---

## 9. Test plan

**Vitest (`npm run test`)**

- `scoring.test.ts`. Fixtures are built from `scenarios.ts`, and the expected numbers are written as literals copied from SPEC.md:
  - For each scenario: default adherence (1 decimal) and rank order, robustness level, tipping results (operator + threshold display + kind), after-fill adherence and robustness, neutral-policy adherence and tie flag. That's every cell of the §4.5 table, including the derived B-after High and C-after Low.
  - Formulas: lower and higher better (including value = best → 5), qualitative passthrough, Yes = 5/No = 0, gap = 0, best ignores gaps, best recomputes when a document is excluded.
  - Weighted total and adherence; round half-up at .x5.
  - Tie: synthetic 85.0 vs 80.0 → tie; 85.1 vs 80.0 → not a tie; 0 difference → tie.
  - `normalizeWeights`: excluding a criterion rescales proportionally (e.g. 25/20/20/15/10 → sum 100); sum 0 → null.
  - `largestRemainder`: 6 → [17,17,17,17,16,16], always sums to 100, rounding an Apply case.
  - Neutral: average of non-gap others; no others → 0; A, B, C, D values.
  - Tipping:
    - single found value range
    - percent cap at 100
    - conservative rounding (the rounded threshold flips; one precision step worse does not) for Gamma 40, FastFreight 62, Pacífico 2.8
    - `already_first` for #1's gaps
    - weight-0 criterion → none
    - boolean gap
  - Drivers: D gap to #2 = 6.6 points, top criterion = Largest single impurity (7.5 points). A top criterion = Senior consultants with the `secondIsGap` flag.
  - Unit conversion: Gamma go-live is stored as 6.0, scores 5, and carries a `conversionNote`.
- `cells.test.ts`: status derivation for each seed/review combination (≥70 → auto, <70 → needs_review, confirm/edit/provide/request/accept), and the allowed transitions.
- `messages.test.ts`: the exact spec sentences for the four tipping results, the possessive ("Pacífico Labs'"), robustness reasons, the info-request template, copy-summary, and the counter pluralization.
- `format.test.ts`: BRL/USD/percent/× formatting, decimals, dates.
- `data.test.ts`:
  - default weights sum to 100 in every scenario
  - every cell exists for every criterion × document
  - exactly 2 cells < 70% per scenario, and they equal `demo.reviewCells`
  - `demo.gapCell` is a not_found cell
  - every found cell has a snippet containing its highlight
  - confidences are 0–100
- `reducer.test.ts`:
  - reviews persist across Edit setup → Run, and across criterion remove/re-add
  - switching scenario keeps the other sessions
  - Start over clears everything
  - What-if Reset → null; Apply writes integer weights summing to 100 and logs the audit entry
  - Run with a changed setup logs a diff
  - `exported` set on export
  - checklist derivation

**Playwright (`npm run test:e2e`), one test: `e2e/quick-demo.spec.ts`** (desktop 1280×800, `addInitScript` stubs `window.print` to set a flag):
1. Go to `/`. Drop a fake file on the upload area (`dispatchEvent('drop')` with a DataTransfer) → expect the demo toast. *(Acceptance 1.)*
2. Click "Quick demo (2 min)" → the welcome dialog is visible. Press Tab and check that focus stays in the dialog. Click "Start the 2-minute demo".
3. The checklist shows step 1 "Done". The Report tab badge shows "2". The totals row shows Norden API #1 89.8%, Helix Chem 83.2%, Pacífico Labs 81.6%. Robustness on Insights shows Medium and the "≥ 2.8" sentence.
4. Report tab → expect "Review 2 pending items before exporting" → click "Go to items needing review" → Compare with Needs review only pressed.
5. Open "Largest single impurity, Pacífico Labs" → "Confirm" → badge "Human-verified". Press Escape → focus is back on the cell. Repeat for Lead time. Step 2 is Done and the badge is gone.
6. Clear filters, open "Regulatory inspection history, Pacífico Labs" (Not found) → "Add value" → score 5, source note "No observations in the last two inspections" → Save → "Human-provided".
7. The totals row shows Pacífico Labs #1 96.6%, Norden 89.8%, Helix 83.2%. Step 3 is Done. *(Acceptance 10.)*
8. Insights: "Recommended: Pacífico Labs — 96.6%", robustness High.
9. Report: unlocked, recommendation visible → "Export PDF" → print stub called. Step 4 is Done.
10. The completion message is visible with buttons "IT Vendor Selection", "Contract Risk Review", "Company Performance Comparison".

**Manual verification checklist** (run before calling it done): acceptance items 2, 5 (A/B/C via the UI), 7, 8, 9 (print preview fits one page for D and A), 11, 12 (375px in the in-app browser: `scrollWidth === 375` on every tab), and 13 (keyboard-only pass through the whole Quick demo).

---

## 10. Build phases

Every phase ends with `npm run test` and `npm run build` green, then a git commit. The app stays runnable after each phase.

**Block 1: core app (deployable)**
1. **Scaffold:** `git init` + `.gitignore`, Vite React TS, Tailwind v4, Inter, Vitest config (include `src/**`), Playwright config, base `index.css` with tokens and focus ring, `App` shell with Footer. Smoke test. Commit `chore: scaffold Vite + React + TS + Tailwind + Vitest`.
2. **Domain + data:** `types.ts`, `scenarios.ts` (all 4 scenarios, all cells, snippets, suggestions, fictional references consistent with page counts), `data.test.ts`. Commit `feat(data): typed scenario constants for A–D`.
3. **Scoring engine:** `scoring.ts`, `cells.ts`, `format.ts`, `messages.ts`, with all of §9's unit tests passing. Commit `feat(scoring): scoring, tipping points, robustness + tests`.
   **STOP 1:** show the Vitest output for every value in the §4.5 table, then wait before building any UI.
4. **State:** `state/*`, reducer tests, `useScenarioView`, checklist derivation. Commit.
5. **Start + Setup + Criteria screens:** dropzone toast, About modal, scenario cards, nickname validation, weights/total/distribute/remove/reorder/suggestions, disabled custom criterion, live ranking strip (first to cut), Run. Commit.
6. **Workspace + Compare:** header (Demo pill, switcher, Edit setup, Start over dialog), tabs + badge, matrix, cells, totals, filters, counter, legend, evidence panel, all review forms, info request + copy, audit logging, ranking toasts/live region, pharma banner. Commit.
7. **Insights, core only:** recommendation/tie, robustness, drivers, gaps list (the What-if panel area is left out for now). Commit.
8. **Report:** document (date = current date at render), lock overlay, Export PDF + print stylesheet, Copy summary. The "simulation (not applied)" box is wired in later with What-if. Commit.
9. **Demo layer:** welcome modal, checklist card, completion state, quick-start of other scenarios, "Show me" links, "Next item needing review". Commit.
   **STOP 2:** report that the app is ready for the Vercel deploy (`npm run build` output in `dist/`), then wait.

**Block 2: after the deploy**

7b. **What-if:** sliders, document/criteria exclusions + renormalization, gap policy toggle, Before/After with robustness + tipping, Reset, Apply (third to cut), and the Report's simulation box. Commit.

10. **Mobile + a11y pass:** card layouts, bottom sheet, full-screen panel, overflow fixes, focus audits. Commit.
11. **E2E + polish:** Playwright Quick demo spec, second mobile overflow spec (second to cut), manual checklist (§9), copy review against SPEC wording, final `npm run test && npm run build && npm run test:e2e`. Commit.

**Test rule:** an expected value that comes from SPEC.md is never edited to make a test pass. If one fails, I fix the code or stop and report.

---

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Numbers drift from the spec | Engine-first (phase 3) with every spec value as a literal test. The UI only renders `useScenarioView` output. No number is computed inside components. |
| Wrong tipping rounding | Conservative ceil/floor + an `assert flips(rounded)` step, with tests for 40 / 62 / 2.8. |
| Floating-point tie at exactly 5.0 | Integer tenths comparison. |
| Displayed "4.35 / 5" vs "86.9%" looks inconsistent | Both come from the unrounded total. Tooltip "Calculated from unrounded scores". |
| What-if leaks into the confirmed result | Separate `whatIf` layer, confirmed views never read it, reducer tests for Reset/Apply. |
| Review decisions lost on Edit setup | Reviews keyed by cell, independent of the setup. Reducer test. |
| Dropped file opens in the browser | Global `dragover`/`drop` preventDefault. E2E step 1. |
| Tooltips on disabled buttons unreachable by keyboard | `aria-disabled` pattern component, used everywhere. |
| Focus lost after panel close when the filter hides the cell | Fallback focus target (matrix heading). |
| Mobile overflow from long BRL numbers or names | `min-w-0`, wrapping utilities, 375px check on every tab. |
| Print spills past one page | Compact print styles, audit trail truncated to 10, print-preview check for the largest scenario (A, 3 docs × 6–8 criteria). |
| Playwright can't drive the print dialog | `window.print` stubbed via `addInitScript`. |
| Vitest picks up the Playwright spec | `test.include: ['src/**/*.test.{ts,tsx}']`. |
| Clipboard blocked (non-secure context, permissions) | Textarea + `execCommand` fallback, error toast, message stays selectable. |
| "Pacífico" accent breaks selectors or possessives | UTF-8, accessible-name selectors, possessive helper tested. |
| Scope creep beyond SPEC | Additions are limited to the ones approved in §12. |
| Browser Back leaves the app (no router) | Accepted for a prototype. Noted in §12 OQ-10. |
| Over-long 2-minute demo | Quick demo lands directly in Compare, "Show me" links, "Next item needing review", no fake loading by default (OQ-8). |

---

## 12. Open questions (recommendation in **bold**)

**Status: every recommendation was accepted** (1b, 2b, 3b, 4b, 5b, 6b, 7b, 8a, 9a, 10a, 11b, 12b, 13a, 14a, 15a, 16b, 17a). For 13a, references are fictional and consistent with the page counts.

1. **What does a What-if slider update?** (Spec 10b and the bonus hint say "ranking and report update instantly", but What-if must also stay separate and have Reset/Apply.)
   - a) Only the What-if panel's After ranking.
   - **b) The After side shows ranking, tie label, robustness and tipping sentences, and the Report gains a clearly labeled "What-if simulation (not applied)" box while a simulation is active. Confirmed views stay unchanged until Apply.**
   - c) The whole Insights tab and Report switch to the simulated state under a "Simulation active" banner.
2. **10b says Criteria sliders update scores and ranking "instantly"**, but results aren't visible on the Criteria step.
   - a) Nothing extra; results recompute when you get to Compare.
   - **b) A one-line live ranking strip on the Criteria step, after the first run, while the total is 100%.**
   - c) A full live matrix preview.
3. **Demo accelerators** (not in the spec, but they serve priority #1):
   - a) None.
   - **b) "Show me" links on checklist steps + "Next item needing review" in the panel.**
   - c) b plus auto-advancing the panel after Confirm.
4. **Which cells can be edited?**
   - a) Only Needs review cells.
   - **b) Needs review cells plus cells already touched by a human (verified, edited, provided), to fix mistakes. Auto (≥70%) cells are read-only.**
   - c) Any cell.
5. **What auto-checks step 4 ("export it")?**
   - a) Export PDF only.
   - **b) Export PDF or Copy summary, while the report is unlocked.**
   - c) Just opening the Report tab.
6. **"Apply as new setup" with document exclusions or the Neutral policy:**
   - a) Disable Apply when either is active.
   - **b) Apply only weights and criterion exclusions, with a visible note that document exclusions and the gap policy are simulation-only.**
   - c) Also persist document exclusions in the setup (needs new Setup UI to restore them).
7. **Where do Switch scenario and the completion buttons land for a scenario not started yet?**
   - a) Setup step 1.
   - **b) Quick-start: defaults confirmed, comparison run, Compare tab, checklist step 1 checked (no welcome modal). Resume if the scenario has progress. Start-screen cards keep going through Setup.**
   - c) Always reset that scenario.
8. **Simulated "analysis" loading on Run comparison:**
   - **a) None (instant). Fastest demo, and nothing pretends to work.**
   - b) A ≈700 ms "Running simulated extraction…" state.
   - c) A multi-step animated progress.
9. **Tipping and display precision** (the spec's "whole numbers for %" doesn't fit 0.08% impurity or 99.6% purity):
   - **a) Per-criterion decimals (§4.6): whole numbers for days, weeks, hours, NPS and most %; 1 decimal for scores, months, ×, BRL M, purity, cap %; 2 for impurity %.**
   - b) Literal spec: whole numbers for all %.
   - c) A single global precision.
10. **Browser Back button:**
    - **a) Ignore (no router, prototype).**
    - b) Hash routes for screen/tab.
    - c) `beforeunload` warning.
11. **"Below expectation" (amber) definition:**
    - a) Lowest score in the row.
    - **b) Found value with score < 3.0 (documented in the Legend).**
    - c) Score < 2.5 (would mark almost nothing in the defaults).
12. **Notes on human actions:**
    - a) All optional.
    - **b) Source note required for "Add value" (human-provided data must cite a source); note optional for "Edit value"; rationale required for qualitative edits.**
    - c) All required.
13. **Source references for "More suggestions" values** (the spec gives values and confidence, but no page, clause or cell):
    - **a) Add plausible references consistent with the document page counts, marked in a code comment as illustrative.**
    - b) Show "Source: not specified".
    - c) Drop the evidence panel for suggestion cells.
14. **Start over confirmation:**
    - **a) A confirm dialog (it clears all four scenarios).**
    - b) Immediate, with an undo toast.
    - c) Immediate, no confirmation.
15. **Audit-trail text when a nickname changes later:**
    - **a) Freeze the summary at action time (audit-like).**
    - b) Re-render with current nicknames.
16. **Second Playwright test** for 375px overflow and the mobile card layout:
    - a) Manual check only.
    - **b) Add a small second spec (cheap, guards acceptance 12).**
    - c) Run the Quick demo spec in a mobile project too.
17. **Scenario C after the fill shows robustness Low** (RotaLog's missing penalty becomes decisive). That is correct per the rules but not stated in the spec:
    - **a) Keep it, since the rules produce it and it makes a good talking point. Lock it in tests.**
    - b) Change the rules to avoid it (would break consistency).

---

## Verification (end to end)

1. `npm run test`: all Vitest suites green, including every §4.5 value.
2. `npm run build`: type-check plus production build with no errors.
3. `npm run test:e2e`: the Quick demo spec green.
4. Open the dev server in the in-app browser:
   - Run the Quick demo by mouse and then by keyboard only.
   - Run steps 1–4 for scenarios A, B and C and compare the results with §6.
   - Try What-if Reset/Apply and the Neutral values.
   - Check the print preview fits one page.
   - Check 375px on every tab with no horizontal scroll.

This plan is saved as `PLAN.md` in the project root. Implementation follows the §10 order and stop points.
