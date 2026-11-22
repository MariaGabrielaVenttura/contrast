import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../data/scenarios';
import { copySummary, infoRequestMessage, reviewCounter, robustnessReason, tippingSentence } from './messages';

const senior = SCENARIOS.A.criteria.find((c) => c.id === 'a_senior')!;
const termination = SCENARIOS.C.criteria.find((c) => c.id === 'c_termination')!;
const inspection = SCENARIOS.D.criteria.find((c) => c.id === 'd_inspection')!;

describe('tipping sentences (SPEC wording)', () => {
  it('threshold', () => {
    expect(tippingSentence({ kind: 'threshold', operator: '≤', threshold: 62, rawBoundary: 62.77 }, 'FastFreight', termination)).toBe(
      "If FastFreight's termination notice is ≤ 62 days, FastFreight would rank #1.",
    );
  });
  it('decisive', () => {
    expect(tippingSentence({ kind: 'decisive' }, 'Company South', senior)).toBe(
      'Any plausible value would make Company South #1. This gap is decisive.',
    );
  });
  it('none', () => {
    expect(tippingSentence({ kind: 'none' }, 'Vendor Beta', senior)).toBe(
      'Even the best plausible value would not change the ranking.',
    );
  });
  it('boolean and already first', () => {
    const training = SCENARIOS.A.criteria.find((c) => c.id === 'a_training')!;
    expect(tippingSentence({ kind: 'boolean', value: true }, 'Vendor Gamma', training)).toBe(
      "If Vendor Gamma's training offer is Yes, Vendor Gamma would rank #1.",
    );
    expect(tippingSentence({ kind: 'already_first' }, 'RotaLog', termination)).toBe(
      'RotaLog is already #1. Filling this gap can only widen its lead.',
    );
  });
});

describe('robustness reasons', () => {
  it('covers every level', () => {
    expect(robustnessReason({ level: 'Low', reason: { kind: 'tie' } }, { leaderName: 'X', gapToSecondPoints: 1 })).toBe(
      'The top documents are within 5.0 points of each other.',
    );
    expect(
      robustnessReason(
        { level: 'Medium', reason: { kind: 'could_change', gapKey: 'd_inspection|pacifico' } },
        { leaderName: 'Norden API', gapToSecondPoints: 6.6, gapDocName: 'Pacífico Labs', gapCriterion: inspection },
      ),
    ).toBe("Norden API leads clearly, but Pacífico Labs' missing inspection history score could change #1.");
    expect(robustnessReason({ level: 'High', reason: { kind: 'safe' } }, { leaderName: 'Pacífico Labs', gapToSecondPoints: 6.8 })).toBe(
      'Pacífico Labs leads by 6.8 points and no open gap can change #1.',
    );
  });
});

describe('counter, info request and summary', () => {
  it('pluralizes the review counter', () => {
    expect(reviewCounter(2, 1)).toBe('2 items need review · 1 gap');
    expect(reviewCounter(1, 0)).toBe('1 item needs review · 0 gaps');
  });
  it('drafts a specific info request', () => {
    const m = infoRequestMessage({
      criterionName: 'Regulatory inspection history',
      nickname: 'Pacífico Labs',
      documentName: 'Supplier dossier — Pacífico Labs',
      question: 'Which API supplier should we qualify?',
      ask: inspection.infoRequestAsk,
    });
    expect(m).toContain('Subject: Information request — Regulatory inspection history');
    expect(m).toContain('Hello Pacífico Labs team,');
    expect(m).toContain(`We could not find ${inspection.infoRequestAsk} in the document.`);
  });
  it('builds the copy summary', () => {
    const s = copySummary({
      scenarioTitle: 'Pharma Supplier Qualification',
      question: 'Q?',
      isTie: false,
      tiedNames: [],
      leaderName: 'Pacífico Labs',
      leaderAdherence: 96.59,
      robustnessLevel: 'High',
      ranking: [
        { name: 'Pacífico Labs', adherence: 96.59 },
        { name: 'Norden API', adherence: 89.79 },
      ],
      openGaps: [],
      openRequests: 0,
    });
    expect(s).toContain('Recommended: Pacífico Labs — 96.6% (Decision robustness: High)');
    expect(s).toContain('Ranking: 1. Pacífico Labs 96.6% · 2. Norden API 89.8%');
    expect(s).toContain('Open gaps: none');
  });
});
