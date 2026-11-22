import { describe, expect, it } from 'vitest';
import { SCENARIOS, SCENARIO_ORDER, defaultCriteria } from '../data/scenarios';
import { REVIEW_THRESHOLD, cellKey, type CellKey } from '../data/types';

const scenarios = Object.values(SCENARIOS);

describe('scenario data integrity', () => {
  it('lists the four scenarios in SPEC order (D, A, C, B) with D featured', () => {
    expect(SCENARIO_ORDER).toEqual(['D', 'A', 'C', 'B']);
    expect(scenarios.filter((s) => s.featured).map((s) => s.id)).toEqual(['D']);
  });

  it.each(scenarios)('scenario $id: default weights sum to 100 and there are 6 default criteria', (s) => {
    const defaults = defaultCriteria(s);
    expect(defaults).toHaveLength(6);
    expect(defaults.reduce((sum, c) => sum + (c.defaultWeight ?? 0), 0)).toBe(100);
  });

  it.each(scenarios)('scenario $id: every criterion × document has a cell', (s) => {
    for (const c of s.criteria) {
      for (const d of s.documents) {
        expect(s.cells[cellKey(c.id, d.id)], `${c.id}|${d.id}`).toBeDefined();
      }
    }
    expect(Object.keys(s.cells)).toHaveLength(s.criteria.length * s.documents.length);
  });

  it.each(scenarios)('scenario $id: found cells have valid confidence and a highlight inside the snippet', (s) => {
    for (const [key, seed] of Object.entries(s.cells)) {
      if (seed.extraction !== 'found') continue;
      expect(seed.confidence, key).toBeGreaterThanOrEqual(0);
      expect(seed.confidence, key).toBeLessThanOrEqual(100);
      expect(Number.isInteger(seed.confidence), key).toBe(true);
      expect(seed.evidence.snippet.includes(seed.evidence.highlight), key).toBe(true);
      expect(seed.source.label.length, key).toBeGreaterThan(0);
    }
  });

  it.each(scenarios)('scenario $id: exactly the 2 demo review cells are below 70% confidence', (s) => {
    const low = Object.entries(s.cells)
      .filter(([, seed]) => seed.extraction === 'found' && seed.confidence < REVIEW_THRESHOLD)
      .map(([key]) => key as CellKey)
      .sort();
    expect(low).toEqual([...s.demo.reviewCells].sort());
  });

  it.each(scenarios)('scenario $id: the checklist gap cell is a Not found cell', (s) => {
    expect(s.cells[s.demo.gapCell]?.extraction).toBe('not_found');
  });

  it.each(scenarios)('scenario $id: cell value kinds match criterion kinds; qualitative cells carry a rationale', (s) => {
    for (const c of s.criteria) {
      for (const d of s.documents) {
        const seed = s.cells[cellKey(c.id, d.id)];
        if (seed.extraction !== 'found') continue;
        expect(seed.value.kind).toBe(c.kind);
        if (c.kind === 'qualitative') expect(seed.aiRationale).toBeTruthy();
      }
    }
  });

  it('suggestion source references stay within each document page count', () => {
    for (const s of scenarios) {
      for (const d of s.documents) {
        if (!d.pages) continue;
        for (const c of s.criteria) {
          const seed = s.cells[cellKey(c.id, d.id)];
          if (seed.extraction !== 'found') continue;
          const m = seed.source.label.match(/p\.(\d+)/);
          if (m) expect(Number(m[1]), `${c.id}|${d.id}`).toBeLessThanOrEqual(d.pages);
        }
      }
    }
  });
});
