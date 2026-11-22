// Cell status derivation: extracted seed + human review → effective status and value.

import type { CellKey, CellSeed, CellValue } from '../data/types';
import { REVIEW_THRESHOLD } from '../data/types';

export type CellStatus =
  | 'auto'
  | 'needs_review'
  | 'human_verified'
  | 'human_edited'
  | 'not_found'
  | 'info_requested'
  | 'accepted_gap'
  | 'human_provided';

export type ReviewAction =
  | { type: 'confirm'; at: string }
  | { type: 'edit'; value: CellValue; note: string; at: string }
  | { type: 'provide'; value: CellValue; sourceNote: string; at: string; via?: 'supplier_reply' }
  | { type: 'request_info'; message: string; at: string }
  | { type: 'accept_gap'; reason: string; at: string };

export interface ResolvedCell {
  key: CellKey;
  status: CellStatus;
  /** Effective value; null for any open gap. */
  value: CellValue | null;
  isGap: boolean;
  isPendingReview: boolean;
  seed: CellSeed;
  review?: ReviewAction;
}

const FOUND_ACTIONS: ReviewAction['type'][] = ['confirm', 'edit'];
const NOT_FOUND_ACTIONS: ReviewAction['type'][] = ['provide', 'request_info', 'accept_gap'];

/** Whether a review action applies to this seed (found cells are reviewed; missing cells are filled or tracked). */
export function isValidReview(seed: CellSeed, review: ReviewAction): boolean {
  return seed.extraction === 'found' ? FOUND_ACTIONS.includes(review.type) : NOT_FOUND_ACTIONS.includes(review.type);
}

export function resolveCell(key: CellKey, seed: CellSeed, review?: ReviewAction): ResolvedCell {
  const r = review && isValidReview(seed, review) ? review : undefined;
  const base = { key, seed, review: r };

  if (seed.extraction === 'found') {
    if (r?.type === 'confirm') return { ...base, status: 'human_verified', value: seed.value, isGap: false, isPendingReview: false };
    if (r?.type === 'edit') return { ...base, status: 'human_edited', value: r.value, isGap: false, isPendingReview: false };
    const needsReview = seed.confidence < REVIEW_THRESHOLD;
    return {
      ...base,
      status: needsReview ? 'needs_review' : 'auto',
      value: seed.value,
      isGap: false,
      isPendingReview: needsReview,
    };
  }

  if (r?.type === 'provide') return { ...base, status: 'human_provided', value: r.value, isGap: false, isPendingReview: false };
  if (r?.type === 'request_info') return { ...base, status: 'info_requested', value: null, isGap: true, isPendingReview: false };
  if (r?.type === 'accept_gap') return { ...base, status: 'accepted_gap', value: null, isGap: true, isPendingReview: false };
  return { ...base, status: 'not_found', value: null, isGap: true, isPendingReview: false };
}

export type CellActionName = 'confirm' | 'edit' | 'add_value' | 'request_info' | 'accept_gap';

/** Actions offered in the evidence panel for each status. */
export function availableActions(status: CellStatus): CellActionName[] {
  switch (status) {
    case 'needs_review':
      return ['confirm', 'edit'];
    case 'human_verified':
    case 'human_edited':
      return ['edit'];
    case 'human_provided':
      return ['add_value'];
    case 'not_found':
      return ['add_value', 'request_info', 'accept_gap'];
    case 'info_requested':
      return ['add_value', 'accept_gap'];
    case 'accepted_gap':
      return ['add_value', 'request_info'];
    case 'auto':
      return [];
  }
}

export const STATUS_LABEL: Record<CellStatus, string> = {
  auto: 'Extracted',
  needs_review: 'Needs review',
  human_verified: 'Human-verified',
  human_edited: 'Human-edited',
  not_found: 'Not found',
  info_requested: 'Info requested',
  accepted_gap: 'Accepted gap',
  human_provided: 'Human-provided',
};
