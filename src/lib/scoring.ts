// Contrast scoring engine. Pure functions only — implements the "Scoring" section of SPEC.md.

import type { CellKey, CellValue, CriterionDef, CriterionId, DocId, Scenario } from '../data/types';
import { cellKey } from '../data/types';

export type GapPolicy = 'penalize' | 'neutral';

export interface WeightedCriterion {
  def: CriterionDef;
  /** Weight in % (any non-negative real; the included weights should sum to 100). */
  weight: number;
}

export interface ScoringInput {
  criteria: WeightedCriterion[];
  docIds: DocId[];
  /** Effective value per cell; null = open gap (Not found, Info requested, Accepted gap). */
  values: Record<CellKey, CellValue | null>;
  gapPolicy: GapPolicy;
}

export interface DocResult {
  docId: DocId;
  /** Weighted total, 0–5, unrounded. */
  total: number;
  /** total ÷ 5 × 100, unrounded. */
  adherence: number;
  /** Adherence in integer tenths of a point (86.9% → 869), as displayed. */
  adherenceTenths: number;
  rank: number;
}

export interface Results {
  cellScores: Record<CellKey, number>;
  /** Sorted by total (desc), then document order. */
  ranking: DocResult[];
  byDoc: Record<DocId, DocResult>;
  leaderId: DocId;
  isTie: boolean;
  /** Documents within the tie threshold of #1 (including #1) when isTie. */
  tiedDocIds: DocId[];
}

export const MAX_SCORE = 5;
/** Technical tie: #1 − #2 ≤ 5.0 percentage points (50 tenths). */
export const TIE_THRESHOLD_TENTHS = 50;
const EPS = 1e-9;

export function adherenceTenths(adherence: number): number {
  return Math.round(Number((adherence * 10).toFixed(6)));
}

// ---------- per-criterion scoring ----------

function numericValue(v: CellValue | null): number | null {
  return v && v.kind === 'number' ? v.value : null;
}

/** Scores for one criterion row, in the order of `values`. */
export function scoreCriterion(def: CriterionDef, values: (CellValue | null)[], gapPolicy: GapPolicy): number[] {
  let scores: number[];
  if (def.kind === 'qualitative') {
    scores = values.map((v) => (v && v.kind === 'qualitative' ? v.score : 0));
  } else if (def.kind === 'boolean') {
    scores = values.map((v) => (v && v.kind === 'boolean' && v.value ? MAX_SCORE : 0));
  } else {
    const found = values.map(numericValue).filter((x): x is number => x !== null);
    if (found.length === 0) {
      scores = values.map(() => 0);
    } else if (def.direction === 'lower') {
      const best = Math.min(...found);
      scores = values.map((v) => {
        const x = numericValue(v);
        if (x === null) return 0;
        return x === best ? MAX_SCORE : (MAX_SCORE * best) / x;
      });
    } else {
      const best = Math.max(...found);
      scores = values.map((v) => {
        const x = numericValue(v);
        if (x === null) return 0;
        return x === best ? MAX_SCORE : (MAX_SCORE * x) / best;
      });
    }
  }

  if (gapPolicy === 'neutral') {
    const others = scores.filter((_, i) => values[i] !== null);
    const mean = others.length > 0 ? others.reduce((a, b) => a + b, 0) / others.length : 0;
    scores = scores.map((s, i) => (values[i] === null ? mean : s));
  }
  return scores;
}

// ---------- totals & ranking ----------

export function computeResults(input: ScoringInput): Results {
  const { criteria, docIds, values, gapPolicy } = input;
  const cellScores: Record<CellKey, number> = {};
  const totals = new Map<DocId, number>(docIds.map((d) => [d, 0]));

  for (const { def, weight } of criteria) {
    const rowValues = docIds.map((d) => values[cellKey(def.id, d)] ?? null);
    const rowScores = scoreCriterion(def, rowValues, gapPolicy);
    docIds.forEach((d, i) => {
      cellScores[cellKey(def.id, d)] = rowScores[i];
      totals.set(d, (totals.get(d) ?? 0) + (rowScores[i] * weight) / 100);
    });
  }

  const ordered = docIds
    .map((docId, index) => {
      const total = totals.get(docId) ?? 0;
      const adherence = (total / MAX_SCORE) * 100;
      return { docId, index, total, adherence, adherenceTenths: adherenceTenths(adherence) };
    })
    .sort((a, b) => (Math.abs(b.total - a.total) > EPS ? b.total - a.total : a.index - b.index));

  const ranking: DocResult[] = [];
  ordered.forEach((r, i) => {
    const prev = ranking[i - 1];
    const rank = prev && Math.abs(prev.total - r.total) <= EPS ? prev.rank : i + 1;
    ranking.push({ docId: r.docId, total: r.total, adherence: r.adherence, adherenceTenths: r.adherenceTenths, rank });
  });

  const byDoc: Record<DocId, DocResult> = {};
  for (const r of ranking) byDoc[r.docId] = r;

  const first = ranking[0];
  const isTie = ranking.length > 1 && first.adherenceTenths - ranking[1].adherenceTenths <= TIE_THRESHOLD_TENTHS;
  const tiedDocIds = isTie
    ? ranking.filter((r) => first.adherenceTenths - r.adherenceTenths <= TIE_THRESHOLD_TENTHS).map((r) => r.docId)
    : [];

  return { cellScores, ranking, byDoc, leaderId: first.docId, isTie, tiedDocIds };
}

// ---------- weights ----------

/** Rescales the included weights proportionally so they sum to 100. Null if they sum to 0. */
export function normalizeWeights(
  weights: Record<CriterionId, number>,
  includedIds: CriterionId[],
): Record<CriterionId, number> | null {
  const sum = includedIds.reduce((s, id) => s + (weights[id] ?? 0), 0);
  if (sum <= 0) return null;
  const out: Record<CriterionId, number> = {};
  for (const id of includedIds) out[id] = ((weights[id] ?? 0) / sum) * 100;
  return out;
}

/**
 * Integer apportionment (largest-remainder / Hamilton). Results sum to `total`.
 * Ties in the remainder go to the earlier item.
 */
export function largestRemainder(values: number[], total = 100): number[] {
  if (values.length === 0) return [];
  const sum = values.reduce((a, b) => a + b, 0);
  const shares = sum > 0 ? values.map((v) => (v / sum) * total) : values.map(() => total / values.length);
  const floors = shares.map((s) => Math.floor(s + EPS));
  let remaining = total - floors.reduce((a, b) => a + b, 0);
  const order = shares
    .map((s, i) => ({ i, frac: s - floors[i] }))
    .sort((a, b) => (Math.abs(b.frac - a.frac) > EPS ? b.frac - a.frac : a.i - b.i));
  for (const { i } of order) {
    if (remaining <= 0) break;
    floors[i] += 1;
    remaining -= 1;
  }
  return floors;
}

/** "Distribute evenly": 6 criteria → [17, 17, 17, 17, 16, 16]. */
export function distributeEvenly(count: number): number[] {
  return largestRemainder(Array.from({ length: count }, () => 1));
}

// ---------- gaps ----------

export function openGaps(input: ScoringInput): CellKey[] {
  const keys: CellKey[] = [];
  for (const { def } of input.criteria) {
    for (const d of input.docIds) {
      const key = cellKey(def.id, d);
      if ((input.values[key] ?? null) === null) keys.push(key);
    }
  }
  return keys;
}

// ---------- tipping points ----------

export type TippingResult =
  | { kind: 'threshold'; operator: '≥' | '≤'; threshold: number; rawBoundary: number }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'decisive' }
  | { kind: 'none' }
  | { kind: 'already_first' };

export interface PlausibleRange {
  min: number;
  max: number;
}

/** Plausible range for a numeric or qualitative gap. Null when the row has no found numeric values. */
export function plausibleRange(def: CriterionDef, foundValues: number[]): PlausibleRange | null {
  if (def.kind === 'qualitative') return { min: 0, max: MAX_SCORE };
  if (def.kind === 'boolean' || foundValues.length === 0) return null;
  let max = 1.5 * Math.max(...foundValues);
  if (def.unit.isPercent) max = Math.min(max, 100);
  return { min: 0.5 * Math.min(...foundValues), max };
}

function makeCandidate(def: CriterionDef, x: number): CellValue {
  return def.kind === 'qualitative' ? { kind: 'qualitative', score: x, text: '' } : { kind: 'number', value: x };
}

/** True if, with `value` in `gapKey`, the gap's document is strictly ahead of every other document. */
function flipsWith(input: ScoringInput, gapKey: CellKey, docId: DocId, value: CellValue): boolean {
  const r = computeResults({ ...input, values: { ...input.values, [gapKey]: value } });
  const own = r.byDoc[docId].total;
  return r.ranking.every((o) => o.docId === docId || own - o.total > EPS);
}

export function findTippingPoint(input: ScoringInput, gapKey: CellKey): TippingResult {
  const [criterionId, docId] = gapKey.split('|') as [string, string];
  const wc = input.criteria.find((c) => c.def.id === criterionId);
  if (!wc) return { kind: 'none' };
  const { def } = wc;

  const base = computeResults(input);
  if (base.leaderId === docId) return { kind: 'already_first' };

  const flips = (v: CellValue) => flipsWith(input, gapKey, docId, v);

  if (def.kind === 'boolean') {
    const withYes = flips({ kind: 'boolean', value: true });
    const withNo = flips({ kind: 'boolean', value: false });
    if (withYes && withNo) return { kind: 'decisive' };
    if (withYes) return { kind: 'boolean', value: true };
    if (withNo) return { kind: 'boolean', value: false };
    return { kind: 'none' };
  }

  const found = input.docIds
    .map((d) => input.values[cellKey(def.id, d)] ?? null)
    .map(numericValue)
    .filter((x): x is number => x !== null);
  const range = plausibleRange(def, found);
  if (!range) {
    // No found values: any value would be the best (score 5), so one probe decides.
    return flips(makeCandidate(def, 1)) ? { kind: 'decisive' } : { kind: 'none' };
  }

  const higherIsBetter = def.kind === 'qualitative' || def.direction === 'higher';
  const goodEnd = higherIsBetter ? range.max : range.min;
  const badEnd = higherIsBetter ? range.min : range.max;
  const at = (x: number) => flips(makeCandidate(def, x));

  if (!at(goodEnd)) return { kind: 'none' };
  if (at(badEnd)) return { kind: 'decisive' };

  // Monotonic: bisect between a flipping value (g) and a non-flipping value (b).
  let g = goodEnd;
  let b = badEnd;
  for (let i = 0; i < 80; i++) {
    const m = (g + b) / 2;
    if (at(m)) g = m;
    else b = m;
  }
  const boundary = (g + b) / 2;

  // Conservative rounding toward the good side, then verify the stated value really flips.
  const decimals = def.kind === 'qualitative' ? 1 : def.unit.decimals;
  const f = 10 ** decimals;
  const step = 1 / f;
  const snap = (x: number) => Math.round(Number((x * f).toFixed(6))) / f;
  let threshold = higherIsBetter ? Math.ceil(boundary * f - 1e-7) / f : Math.floor(boundary * f + 1e-7) / f;
  threshold = snap(threshold);
  for (let guard = 0; guard < 1000 && !at(threshold); guard++) {
    threshold = snap(higherIsBetter ? threshold + step : threshold - step);
  }
  return { kind: 'threshold', operator: higherIsBetter ? '≥' : '≤', threshold, rawBoundary: boundary };
}

export function computeTippingPoints(input: ScoringInput): Record<CellKey, TippingResult> {
  const out: Record<CellKey, TippingResult> = {};
  for (const key of openGaps(input)) out[key] = findTippingPoint(input, key);
  return out;
}

export function canChangeLeader(t: TippingResult): boolean {
  return t.kind === 'threshold' || t.kind === 'boolean' || t.kind === 'decisive';
}

// ---------- robustness ----------

export type RobustnessLevel = 'Low' | 'Medium' | 'High';
export type RobustnessReason =
  | { kind: 'tie' }
  | { kind: 'decisive'; gapKey: CellKey }
  | { kind: 'could_change'; gapKey: CellKey }
  | { kind: 'safe' };

export interface Robustness {
  level: RobustnessLevel;
  reason: RobustnessReason;
}

export function robustness(results: Results, tipping: Record<CellKey, TippingResult>): Robustness {
  const entries = Object.entries(tipping) as [CellKey, TippingResult][];
  const decisive = entries.find(([, t]) => t.kind === 'decisive');
  if (results.isTie) return { level: 'Low', reason: { kind: 'tie' } };
  if (decisive) return { level: 'Low', reason: { kind: 'decisive', gapKey: decisive[0] } };
  const changer = entries.find(([, t]) => canChangeLeader(t));
  if (changer) return { level: 'Medium', reason: { kind: 'could_change', gapKey: changer[0] } };
  return { level: 'High', reason: { kind: 'safe' } };
}

// ---------- drivers ----------

export interface Drivers {
  firstId: DocId;
  secondId: DocId;
  /** Gap to #2 in percentage points, from the displayed (one-decimal) values. */
  gapToSecondPoints: number;
  top: null | {
    criterionId: CriterionId;
    /** Weighted advantage of #1 over #2, in percentage points. */
    points: number;
    firstScore: number;
    secondScore: number;
    secondIsGap: boolean;
  };
}

export function drivers(input: ScoringInput, results: Results): Drivers | null {
  if (results.ranking.length < 2) return null;
  const [first, second] = results.ranking;
  let top: Drivers['top'] = null;
  for (const { def, weight } of input.criteria) {
    const s1 = results.cellScores[cellKey(def.id, first.docId)];
    const s2 = results.cellScores[cellKey(def.id, second.docId)];
    const points = ((s1 - s2) * weight) / MAX_SCORE;
    if (points > EPS && (!top || points > top.points + EPS)) {
      top = {
        criterionId: def.id,
        points,
        firstScore: s1,
        secondScore: s2,
        secondIsGap: (input.values[cellKey(def.id, second.docId)] ?? null) === null,
      };
    }
  }
  return {
    firstId: first.docId,
    secondId: second.docId,
    gapToSecondPoints: (first.adherenceTenths - second.adherenceTenths) / 10,
    top,
  };
}

// ---------- analysis bundle ----------

export interface Analysis {
  input: ScoringInput;
  results: Results;
  gaps: CellKey[];
  tipping: Record<CellKey, TippingResult>;
  robustness: Robustness;
  drivers: Drivers | null;
}

export function analyze(input: ScoringInput): Analysis {
  const results = computeResults(input);
  const tipping = computeTippingPoints(input);
  return {
    input,
    results,
    gaps: openGaps(input),
    tipping,
    robustness: robustness(results, tipping),
    drivers: drivers(input, results),
  };
}

// ---------- input construction ----------

export interface InputOptions {
  /** Ordered criterion ids with weights. Defaults to the scenario's default criteria and weights. */
  weights?: Record<CriterionId, number>;
  criteriaIds?: CriterionId[];
  docIds?: DocId[];
  /** Effective values (after human review); missing keys fall back to the extracted seed. */
  overrides?: Record<CellKey, CellValue | null>;
  gapPolicy?: GapPolicy;
}

/** Seed value of a cell as extracted (null for Not found). */
export function seedValue(scenario: Scenario, key: CellKey): CellValue | null {
  const seed = scenario.cells[key];
  return seed && seed.extraction === 'found' ? seed.value : null;
}

export function buildInput(scenario: Scenario, opts: InputOptions = {}): ScoringInput {
  const criteriaIds = opts.criteriaIds ?? scenario.criteria.filter((c) => c.defaultWeight !== null).map((c) => c.id);
  const docIds = opts.docIds ?? scenario.documents.map((d) => d.id);
  const criteria = criteriaIds.map((id) => {
    const def = scenario.criteria.find((c) => c.id === id);
    if (!def) throw new Error(`Unknown criterion ${id}`);
    return { def, weight: opts.weights?.[id] ?? def.defaultWeight ?? 0 };
  });
  const values: Record<CellKey, CellValue | null> = {};
  for (const { def } of criteria) {
    for (const d of docIds) {
      const key = cellKey(def.id, d);
      values[key] = opts.overrides && key in opts.overrides ? opts.overrides[key] : seedValue(scenario, key);
    }
  }
  return { criteria, docIds, values, gapPolicy: opts.gapPolicy ?? 'penalize' };
}
