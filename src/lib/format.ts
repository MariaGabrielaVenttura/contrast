// Formatting and rounding helpers. Computation always uses unrounded numbers;
// rounding happens only here, for display.

import type { CellValue, CriterionDef } from '../data/types';

/** Round half-up to `decimals`, tolerant of binary floating-point noise. */
export function roundTo(x: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(Number((x * f).toFixed(6))) / f;
}

const numberFormatters = new Map<number, Intl.NumberFormat>();
export function formatNumber(x: number, decimals: number): string {
  let f = numberFormatters.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    numberFormatters.set(decimals, f);
  }
  return f.format(roundTo(x, decimals));
}

/** Formats a numeric amount with the criterion's prefix, suffix and precision. */
export function formatAmount(def: CriterionDef, x: number): string {
  if (def.kind === 'qualitative') return formatScore(x);
  const { prefix = '', suffix = '', decimals } = def.unit;
  return `${prefix}${formatNumber(x, decimals)}${suffix}`;
}

export function formatValue(def: CriterionDef, value: CellValue | null): string {
  if (!value) return '—';
  switch (value.kind) {
    case 'number':
      return formatAmount(def, value.value);
    case 'qualitative':
      return value.text;
    case 'boolean':
      return value.value ? 'Yes' : 'No';
  }
}

/** Cell score, one decimal: "4.1". */
export function formatScore(score: number): string {
  return formatNumber(score, 1);
}

/** Weighted total, two decimals: "4.35". */
export function formatTotal(total: number): string {
  return formatNumber(total, 2);
}

/** Adherence, one decimal with %: "86.9%". */
export function formatPercent(adherence: number): string {
  return `${formatNumber(adherence, 1)}%`;
}

/** Percentage points, one decimal: "6.6". */
export function formatPoints(points: number): string {
  return formatNumber(points, 1);
}

export function possessive(name: string): string {
  return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}

export function pluralize(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

export function formatDate(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(
    new Date(iso),
  );
}
