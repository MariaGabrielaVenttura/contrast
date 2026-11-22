import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../data/scenarios';
import type { CriterionDef } from '../data/types';
import { formatAmount, formatDate, formatPercent, formatScore, formatTotal, formatValue, pluralize, possessive, roundTo } from './format';

const def = (scenario: keyof typeof SCENARIOS, id: string): CriterionDef => SCENARIOS[scenario].criteria.find((c) => c.id === id)!;

describe('format', () => {
  it('formats amounts with prefix, suffix and per-criterion precision', () => {
    expect(formatAmount(def('A', 'a_cost'), 1_200_000)).toBe('BRL 1,200,000');
    expect(formatAmount(def('A', 'a_golive'), 6)).toBe('6.0 months');
    expect(formatAmount(def('A', 'a_senior'), 40)).toBe('40%');
    expect(formatAmount(def('C', 'c_termination'), 62)).toBe('62 days');
    expect(formatAmount(def('C', 'c_price'), 4.6)).toBe('BRL 4.6M');
    expect(formatAmount(def('C', 'c_liability'), 1)).toBe('1.0×');
    expect(formatAmount(def('B', 'b_revemp'), 610)).toBe('BRL 610k');
    expect(formatAmount(def('D', 'd_impurity'), 0.08)).toBe('0.08%');
    expect(formatAmount(def('D', 'd_price'), 1850)).toBe('USD 1,850/kg');
    expect(formatAmount(def('D', 'd_inspection'), 2.8)).toBe('2.8');
  });
  it('formats cell values by kind', () => {
    expect(formatValue(def('D', 'd_gmp'), { kind: 'boolean', value: true })).toBe('Yes');
    expect(formatValue(def('D', 'd_inspection'), { kind: 'qualitative', score: 4, text: 'One minor observation' })).toBe(
      'One minor observation',
    );
    expect(formatValue(def('D', 'd_purity'), null)).toBe('—');
  });
  it('rounds for display only', () => {
    expect(roundTo(2.675, 2)).toBe(2.68);
    expect(formatScore(4.0833)).toBe('4.1');
    expect(formatTotal(4.345833)).toBe('4.35');
    expect(formatPercent(86.91667)).toBe('86.9%');
  });
  it('possessive and pluralization', () => {
    expect(possessive('Pacífico Labs')).toBe("Pacífico Labs'");
    expect(possessive('Vendor Gamma')).toBe("Vendor Gamma's");
    expect(pluralize(1, 'gap', 'gaps')).toBe('1 gap');
    expect(pluralize(0, 'gap', 'gaps')).toBe('0 gaps');
  });
  it('formats the report date from the given date', () => {
    expect(formatDate(new Date(2026, 10, 21))).toBe('21 November 2026');
  });
});
