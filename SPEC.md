# Contrast — product specification

## Product context (read first)

- What it is: Contrast helps a person make a decision by comparing 2–4 documents of any kind (proposals, contracts, spreadsheets, reports, supplier dossiers). It suggests criteria and weights for the user to confirm, extracts values with cited evidence, builds a side-by-side comparison with transparent scores, asks for human review when the AI is unsure, flags missing information and whether it could change the decision, and produces an executive report with an audit trail.
- Problem: important business decisions depend on documents that are hard to compare. Each comes in a different format, information is scattered or missing, the work is done by hand in spreadsheets, and the reasoning behind the final choice is rarely recorded.
- Users: anyone choosing between options based on documents, in any industry (procurement, finance, legal, pharma quality, IT, operations).
- Origin: generalizes a procurement agent the author built to compare supplier proposals. No code, data or branding from that work is used.
- Why this prototype exists: it is a portfolio piece for a Product Owner application at a healthtech SaaS. Reviewers (recruiters and hiring managers) will spend 2–3 minutes on it and evaluate user flows, screens, wording, business rules and the ability to prototype with AI tools.
- What matters most, in order: (1) the guided demo makes the value obvious in 2 minutes; (2) every number is correct and consistent with this spec; (3) the UI is clear, polished and trustworthy; (4) business rules are visible and explainable; (5) honesty about what is simulated.
- Non-goals: real AI or file parsing, authentication, persistence across sessions, backend.

## Overview

Contrast is an industry-agnostic web app prototype that compares 2–4 documents and helps a person make a decision, with cited evidence, transparent scoring, human review and an exportable report. This is a DEMO with simulated AI results: no backend and no real AI calls. All data lives as typed TS constants.

## Global

- Footer on every screen: "Prototype by Maria Gabriela Ventura" (link to https://www.linkedin.com/in/mariagabrielaventura, new tab) and "Simulated AI results and fictional data."
- Design: clean and calm, white background, one indigo accent, Inter font, rounded cards, generous whitespace, subtle shadows. Status colors always paired with a text label: green = best in row, amber = below expectation, grey = Not found, orange = Needs review. All UI text in English.
- Navigation (hybrid): Start → guided setup with 2 steps (Setup → Criteria) → workspace with tabs Compare, Insights, Report. Sticky workspace header: decision question, document nicknames, "Demo guide", "Edit setup" (back to setup) and "Start over" (clears everything). The Report tab shows a badge with pending review items. Changes recalculate instantly. Review decisions persist per cell when going back.
- Mobile (<768px): matrix becomes one card per criterion with documents stacked; evidence panel full screen; checklist becomes a bottom sheet; no horizontal overflow.

## Start screen

- Headline "Compare any documents. Decide with evidence." Subline: "Upload your documents, tell Contrast what decision you need to make, and get a cited side-by-side comparison you can trust."
- Three steps with icons: Upload → Confirm criteria → Review and decide.
- No login and no required upload: the start screen itself is the scenario picker.
- Primary button "Quick demo (2 min)": loads Scenario D (pharma) with default criteria confirmed, runs the comparison, opens the welcome modal and then the Compare tab with the demo checklist (step 1 checked).
- Four scenario cards, in this order, each with an industry tag, a one-line description and a "Load sample scenario" button:
  1. "Pharma Supplier Qualification" (Healthcare & pharma) = Scenario D — shown first and marked "Featured"
  2. "IT Vendor Selection" (IT services procurement) = Scenario A
  3. "Contract Risk Review" (Procurement & legal) = Scenario C
  4. "Company Performance Comparison" (Finance & strategy) = Scenario B
- Upload area in demo mode: on drop or select, show toast "Demo mode: file analysis isn't available in this prototype. Try a sample scenario." and do not accept the file.
- Link "About this prototype" opens a modal with three short sections: What's real (flow, business rules, scoring, review, audit trail, report); What's simulated (reading the documents and the AI extraction, confidence and evidence); What a full version would add (real AI extraction with citations, extraction accuracy evals, custom criteria, industry templates, history and sharing).

## Welcome modal and scenario switching

- When Quick demo starts, open a welcome modal (founder-style pitch, clear and short):
  - Eyebrow: "Demo · fictional data, simulated AI"
  - Title: "Big decisions live in documents nobody has time to compare."
  - Body: "Proposals, contracts, financial reports, supplier dossiers. Teams line them up by hand, miss what's missing, and lose the reasoning behind the final call. Contrast turns any set of documents into a cited, side-by-side decision you can defend."
  - "In the next 2 minutes you will:" (1) "Compare 3 pharmaceutical ingredient suppliers and see who wins, and why." (2) "Check where every number came from, down to the page." (3) "Fix what the AI wasn't sure about, and see how one missing answer can change the decision."
  - Note: "Same engine, any industry. After this one, switch to IT vendor selection, contract risk review or company performance."
  - Buttons: "Start the 2-minute demo" (primary) and "Choose another scenario" (opens the scenario switcher).
- Workspace header shows a "Demo" pill (tooltip: "Fictional data and simulated AI. Switch scenarios anytime.") and a "Switch scenario" dropdown listing the 4 scenarios with industry tags. Progress is kept per scenario while the page is open.
- When the checklist is completed, show: "That's Contrast: from documents to a defensible decision in minutes. Same engine, any industry. Try another:" followed by buttons for the other 3 scenarios.

## Setup (step 1)

- Decision question read-only, note: "In demo mode, the question and criteria are pre-generated for each scenario."
- Documents (name, type, pages) with editable nicknames. Button "Continue to criteria".

## Criteria (step 2)

- Pre-selected criteria with name, description, rule label (e.g., "Lower is better") and integer weight slider (0–100).
- Running total must equal exactly 100%; "Run comparison" disabled otherwise, helper text "Weights must add up to 100%". "Distribute evenly" button.
- Remove (minimum 3; disabled at 3 with tooltip) and reorder criteria.
- "More suggestions" list; adding inserts the criterion with weight 0.
- Disabled "Add custom criterion" with tooltip "Custom criteria are available in the full version".

## Compare tab

- Matrix: rows = criteria, columns = documents; last row = weighted total (X.XX / 5 and adherence %) and rank.
- Cell: extracted value, score 0–5, badge: confidence % (≥70%), "Needs review" (<70%), "Not found", "Info requested", "Accepted gap", "Human-verified", "Human-edited", "Human-provided".
- Clicking a cell opens a side panel: highlighted evidence snippet, document nickname, page/clause/cell reference, confidence, scoring rule, AI rationale for qualitative criteria, unit conversion note when applicable.
- Needs review actions: "Confirm" → Human-verified; "Edit value" (input + note) → Human-edited, recalculate. Qualitative edit = 0–5 score + rationale.
- Not found actions: "Add value" (value + source note) → Human-provided, recalculate; "Draft info request" → shows a ready-to-copy message to the document owner asking for that specific information, with a Copy button; status becomes Info requested (score stays 0); "Keep as gap" → Accepted gap.
- Filters "Show only differences" and "Needs review only". Counter: "N items need review · N gaps".
- Every action is logged in the audit trail with a timestamp.

## Scoring (implement exactly)

- Number, lower is better: best found value = 5; others = 5 × best ÷ value.
- Number, higher is better: best found value = 5; others = 5 × value ÷ best.
- Qualitative: score 0–5 from data (editable), rationale always visible.
- Yes/No: Yes = 5, No = 0.
- Best is computed only among found values. Not found, Info requested and Accepted gap = score 0 (never treated as a real value).
- Weighted total = sum(score × weight) ÷ 100; adherence % = total ÷ 5 × 100, one decimal.
- Technical tie: if #1 − #2 ≤ 5.0 percentage points.
- Tipping point: for each open gap (Not found, Info requested or Accepted gap) of a document that is not #1, search within a plausible range for the value that would make that document #1 (strictly ahead of every other document). Plausible range: numbers = [0.5 × lowest found value, 1.5 × highest found value] for that criterion, capped at 100 for percentages; qualitative = 0 to 5; Yes/No = both. Messages:
  - Some values flip it: "If [document]'s [criterion] is [≥ or ≤] [threshold], [document] would rank #1." (round to a sensible precision: whole numbers for days and %, one decimal for scores)
  - Every plausible value flips it: "Any plausible value would make [document] #1. This gap is decisive."
  - No plausible value flips it: "Even the best plausible value would not change the ranking."
- Decision robustness badge (shown on Insights and in the Report):
  - Low: technical tie, or at least one gap is decisive.
  - Medium: clear winner, but at least one open gap could change #1.
  - High: clear winner and no open gap can change #1.
- Gap policy (default "Penalize"): every gap scores 0, because unverified information should not earn points and a missing answer is itself a risk signal. In what-if, the user can switch to "Neutral": each gap receives the average score of the other documents on that criterion, to show how sensitive the decision is to missing information.

## Insights tab

- Recommendation card "Recommended: [name] — [adherence]%", or a "Technical tie" banner naming the tied documents.
- "What drives this result": gap to #2 in points; criterion where #1 most outscores #2 (largest weighted difference); gaps that could change the result with their tipping points.
- "Gaps" list with status (Not found / Info requested / Accepted gap).
- Decision robustness badge (Low / Medium / High) with a one-line reason.
- What-if panel: weight sliders, exclude documents (min 2 remain) and criteria (min 3 remain; renormalize weights proportionally for the simulation only), and a "Treat gaps as: Penalize (0) / Neutral (average of others)" toggle; "Before vs After" ranking; "Reset to confirmed setup"; "Apply as new setup".

## Report tab

- One-page executive brief: title, decision question, date, documents, criteria and weights, recommendation (highlighted), compact matrix, what drives the result, gaps, open information requests, audit trail.
- Locked while any Needs review item is pending: overlay "Review N pending items before exporting" + button to Compare with "Needs review only" on. Gaps do not lock.
- "Export PDF" = browser print dialog with a clean print stylesheet (hide navigation, buttons, footer, checklist). "Copy summary" = short text to clipboard + toast.

## Demo checklist

Floating, collapsible card "Try this demo in 4 steps", auto-checking: (1) Run the comparison; (2) Confirm the 2 items that need review; (3) scenario-specific gap step; (4) Open the report and export it. After the 4 steps, show a bonus hint: "Bonus: drag a weight in What-if and watch the ranking and report update instantly." On completion, show the closing message and the other-scenario buttons described in "Welcome modal and scenario switching". Opens automatically in Quick demo (after the welcome modal) and via "Demo guide".
Step 3 per scenario: A "Add 80% to Vendor Gamma's Senior consultants and watch the ranking change"; B "Add 6% churn to Company South and watch the ranking change"; C "Add 30 days to FastFreight's termination notice and watch the ranking change"; D "Fill Pacífico Labs' missing inspection history (score 5: no observations in the last two inspections) and watch it jump from 3rd to 1st".

## Scenario A — Technical proposals (IT services procurement)

Question: "Which CRM implementation proposal best fits a 6-month rollout with a small internal IT team?"
Documents: Vendor Alpha (PDF, 24 pages), Vendor Beta (DOCX, 18 pages), Vendor Gamma (PDF, 31 pages).
Criteria [value · confidence · source]:

1. Total cost, BRL (25%, lower): Alpha 1,200,000 · 95% · p.14 | Beta 980,000 · 92% · p.9 | Gamma 1,600,000 · 90% · p.22
2. Time to go-live, months (20%, lower): Alpha 6 · 96% · p.6 | Beta 8 · 88% · p.5 | Gamma 6.0 (converted from 26 weeks) · 65% · p.11
3. Scope coverage, % of required modules (20%, higher): Alpha 90 · 85% · p.4 | Beta 70 · 80% · p.3 | Gamma 100 · 91% · p.7
4. Data migration approach (15%, qualitative): Alpha "Phased migration with 2 dry runs and a rollback plan" 4.5 · 82% · p.17 | Beta "Single cutover weekend" 2.5 · 60% · p.12 | Gamma "Phased migration with automated validation scripts" 5.0 · 88% · p.19
5. Support SLA, critical response hours (10%, lower): Alpha 4 · 90% · p.20 | Beta Not found | Gamma 2 · 93% · p.27
6. Senior consultants on the team, % (10%, higher): Alpha 60 · 75% · p.21 | Beta 40 · 70% · p.15 | Gamma Not found
   More suggestions: Industry references (higher): Alpha 3, Beta 5, Gamma 2 (90%). Training included (Yes/No): Alpha Yes, Beta Yes, Gamma No (88%).
   Expected: Alpha 86.9%, Gamma 80.3%, Beta 68.2%. Robustness: Medium. Tipping points: Gamma senior consultants ≥ 40%; Beta support SLA "Even the best plausible value would not change the ranking." With Gamma = 80%: Gamma 90.3%, Alpha 84.4%, Beta 66.5%; robustness High. Neutral gap policy (what-if): Gamma 88.6%, Alpha 86.9%, Beta 75.7% (technical tie).

## Scenario B — Company results (Finance & strategy)

Question: "Which company shows the healthier performance this year?"
Documents: Company North FY2025 (XLSX), Company South FY2025 (CSV).

1. Revenue growth YoY % (20%, higher): North 18 · 97% · cell B4 | South 11 · 96% · row 3
2. EBITDA margin % (20%, higher): North 12 · 94% · cell B9 | South 21 · 95% · row 8
3. Customer churn % (20%, lower): North 9 · 90% · cell D4 | South Not found
4. NPS (15%, higher): North 41 · 68% · found in a comment cell | South 52 · 93% · row 12
5. Revenue per employee, BRL thousand (15%, higher): North 610 · 91% · cell F2 | South 540 · 64% · calculated from two cells
6. Net debt / EBITDA (10%, lower): North Not found | South 0.9 · 92% · row 15
   More suggestions: Gross margin % (higher): North 48, South 55 (94%).
   Expected: North 78.3%, South 70.5%. Robustness: Low. Tipping point: South churn "Any plausible value would make Company South #1. This gap is decisive." With South churn = 6: South 90.5%, North 71.6%. Neutral gap policy: South 90.5%, North 88.3% (technical tie).

## Scenario C — Contract terms (Procurement & legal)

Question: "Which logistics contract offers the best terms and lowest risk for a 3-year renewal?"
Documents: Logistics contract draft — FastFreight (DOCX, 42 pages), Logistics contract draft — RotaLog (PDF, 38 pages).

1. Annual price, BRL million (30%, lower): FastFreight 4.6 · 94% · clause 5.1 | RotaLog 5.1 · 93% · clause 4.2
2. Payment terms, days (15%, higher): FastFreight 60 · 91% · clause 6.3 | RotaLog 90 · 89% · clause 7.1
3. Annual price adjustment cap, % (15%, lower): FastFreight 4.5 · 66% · clause 5.4, index reference is ambiguous | RotaLog 3.0 · 90% · clause 4.6
4. Late-delivery penalty, % of invoice (15%, higher): FastFreight 5 · 88% · clause 9.2 | RotaLog Not found
5. Liability cap, × annual contract value (15%, higher): FastFreight 1.0 · 85% · clause 12.1 | RotaLog 2.0 · 62% · stated only in Annex C
6. Termination notice, days (10%, lower): FastFreight Not found | RotaLog 60 · 90% · clause 14.2
   More suggestions: Data protection clause (Yes/No): FastFreight Yes, RotaLog Yes (92%).
   Expected: RotaLog 82.1%, FastFreight 72.5%. Robustness: Medium. Tipping point: FastFreight termination notice ≤ 62 days. With FastFreight termination = 30: FastFreight 82.5%, RotaLog 77.1%. Neutral gap policy: RotaLog 97.1%, FastFreight 82.5%.

## Scenario D — API supplier qualification (Pharma quality & sourcing)

Fixed banner: "Illustrative data. Not regulatory or quality advice."
Question: "Which active pharmaceutical ingredient (API) supplier should we qualify for our new generic product?"
Documents: Supplier dossier — Helix Chem (PDF, 56 pages), Supplier dossier — Norden API (PDF, 61 pages), Supplier dossier — Pacífico Labs (PDF, 48 pages).

1. Assay purity, % (25%, higher): Helix 99.6 · 95% · CoA p.2 | Norden 99.8 · 96% · CoA p.3 | Pacífico 99.5 · 93% · CoA p.2
2. Largest single impurity, % (20%, lower): Helix 0.08 · 90% · p.14 | Norden 0.05 · 91% · p.16 | Pacífico 0.06 · 64% · read from a scanned table, p.12
3. Valid GMP certificate (15%, Yes/No): Helix Yes · 97% · Annex 1 | Norden Yes · 98% · Annex 1 | Pacífico Yes · 95% · Annex 2
4. Price per kg, USD (15%, lower): Helix 1,850 · 94% · p.40 | Norden 2,900 · 95% · p.45 | Pacífico 1,700 · 92% · p.38
5. Lead time, weeks (10%, lower): Helix 12 · 90% · p.41 | Norden 10 · 88% · p.46 | Pacífico 6 · 67% · stated as "approx. 6–8 weeks", p.39
6. Regulatory inspection history (15%, qualitative): Helix "One minor observation in the last inspection, closed" 4.0 · 80% · p.22 | Norden "No observations in the last two inspections" 5.0 · 85% · p.25 | Pacífico Not found
   Expected: Norden 89.8%, Helix 83.2%, Pacífico 81.6%. Robustness: Medium. Tipping point: Pacífico inspection score ≥ 2.8. With Pacífico = 5: Pacífico 96.6%, Norden 89.8%, Helix 83.2%; robustness High. Neutral gap policy: Pacífico 95.1%, Norden 89.8%, Helix 83.2%.

Write a short, realistic evidence snippet for every found value in every scenario.

## Acceptance checklist (all must pass)

1. Dropping a file on Start shows the demo-mode toast and does not accept it.
2. "Run comparison" is disabled while weights do not add up to 100%; users cannot go below 3 criteria.
3. All four default results match the expected values above.
4. All four "after filling the gap" results match the expected values above.
5. Tipping points, robustness badges and neutral gap policy results match the expected values above for all four scenarios.
6. The report is locked with 2 Needs review items and unlocks after both are resolved.
7. Draft info request produces a copyable message, sets status Info requested and appears in the report's open requests.
8. What-if shows Before vs After; Reset restores the confirmed setup.
9. Export PDF opens the print dialog with a clean one-page layout.
10. Quick demo (Scenario D): all 4 checklist steps can be completed and auto-check; after confirming both review items and adding score 5 to Pacífico, Pacífico is #1 with 96.6%.
    10b. Live interactivity: moving any weight slider (Criteria or What-if), resolving a review item or filling a gap updates scores, ranking, robustness badge, tipping points and the report preview instantly, with no reload or extra click.
11. "About this prototype" and the welcome modal open and close with keyboard and mouse; "Switch scenario" works from the workspace header and keeps progress per scenario.
12. Mobile at 375px: cards layout, full-screen evidence panel, no horizontal overflow.
13. Keyboard-only: every action reachable, visible focus, focus trapped and returned correctly in panel and modal.
