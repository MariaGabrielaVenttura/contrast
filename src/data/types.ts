// Domain types for Contrast. All demo data is typed against these.

export type ScenarioId = 'A' | 'B' | 'C' | 'D';
export type DocId = string;
export type CriterionId = string;
export type CellKey = `${CriterionId}|${DocId}`;

export function cellKey(criterionId: CriterionId, docId: DocId): CellKey {
  return `${criterionId}|${docId}`;
}

export function splitCellKey(key: CellKey): { criterionId: CriterionId; docId: DocId } {
  const [criterionId, docId] = key.split('|') as [string, string];
  return { criterionId, docId };
}

export interface DocumentInfo {
  id: DocId;
  /** Exactly as in SPEC.md. */
  name: string;
  /** Default nickname; this is the name SPEC microcopy uses. */
  defaultNickname: string;
  fileType: 'PDF' | 'DOCX' | 'XLSX' | 'CSV';
  /** Omitted for spreadsheets (SPEC gives no page count). */
  pages?: number;
}

export type CriterionKind = 'number' | 'qualitative' | 'boolean';
export type Direction = 'lower' | 'higher';

export interface UnitSpec {
  /** Short unit name used in input labels, e.g. "BRL", "months", "%". */
  label: string;
  /** Caps the tipping range and inputs at 100. */
  isPercent: boolean;
  prefix?: string;
  suffix?: string;
  /** Display precision and tipping-point precision. */
  decimals: number;
  /** Input validation bounds (inclusive). Lower-is-better values must also be > 0. */
  min?: number;
  max?: number;
}

interface CriterionBase {
  id: CriterionId;
  name: string;
  description: string;
  /** Lower-case phrase used inside sentences ("share of senior consultants"). */
  messageName: string;
  /** Phrase completing "We could not find … in the document." */
  infoRequestAsk: string;
  /** Default weight in %, or null for a "More suggestions" criterion (added with weight 0). */
  defaultWeight: number | null;
  unit: UnitSpec;
}

export type NumberCriterion = CriterionBase & { kind: 'number'; direction: Direction };
export type QualitativeCriterion = CriterionBase & { kind: 'qualitative' };
export type BooleanCriterion = CriterionBase & { kind: 'boolean' };
export type CriterionDef = NumberCriterion | QualitativeCriterion | BooleanCriterion;

export type CellValue =
  | { kind: 'number'; value: number }
  | { kind: 'qualitative'; score: number; text: string }
  | { kind: 'boolean'; value: boolean };

export interface SourceRef {
  /** "p.14", "CoA p.2", "clause 5.4", "cell B4", "row 3", "Annex C". */
  label: string;
  /** Extra context shown after the label, e.g. "read from a scanned table". */
  qualifier?: string;
}

export interface Evidence {
  snippet: string;
  /** Substring of `snippet` to highlight. Validated by data.test.ts. */
  highlight: string;
}

export interface FoundSeed {
  extraction: 'found';
  value: CellValue;
  /** 0–100 integer. Below 70 → Needs review. */
  confidence: number;
  source: SourceRef;
  evidence: Evidence;
  /** Qualitative criteria only. */
  aiRationale?: string;
  conversionNote?: string;
  caveat?: string;
}

export interface NotFoundSeed {
  extraction: 'not_found';
  searchNote: string;
}

export type CellSeed = FoundSeed | NotFoundSeed;

export interface ScenarioDemoConfig {
  /** The two cells below 70% confidence (checklist step 2). */
  reviewCells: [CellKey, CellKey];
  /** Checklist step 3 target. */
  gapCell: CellKey;
  /** Exact SPEC text for checklist step 3. */
  gapStepText: string;
  /** Used for the input placeholder hint. */
  suggestedValue: CellValue;
}

export interface Scenario {
  id: ScenarioId;
  title: string;
  industryTag: string;
  cardDescription: string;
  featured: boolean;
  disclaimerBanner?: string;
  question: string;
  documents: DocumentInfo[];
  /** Defaults first (SPEC order), then suggestions. */
  criteria: CriterionDef[];
  cells: Record<CellKey, CellSeed>;
  demo: ScenarioDemoConfig;
}

export const REVIEW_THRESHOLD = 70;
