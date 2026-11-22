// All demo data. Values, confidences and source references come from SPEC.md.
// Evidence snippets, descriptions, search notes and rationales are illustrative text written
// for the prototype. Source references for "More suggestions" values are not in SPEC.md: they are
// fictional and kept consistent with each document's page count.

import type {
  CellKey,
  CellSeed,
  CellValue,
  CriterionDef,
  FoundSeed,
  NotFoundSeed,
  Scenario,
  ScenarioId,
  SourceRef,
  UnitSpec,
} from './types';

// ---------- helpers ----------

const num = (value: number): CellValue => ({ kind: 'number', value });
const qual = (score: number, text: string): CellValue => ({ kind: 'qualitative', score, text });
const yes: CellValue = { kind: 'boolean', value: true };
const no: CellValue = { kind: 'boolean', value: false };

function found(
  value: CellValue,
  confidence: number,
  source: string | SourceRef,
  snippet: string,
  highlight: string,
  extra: Partial<Pick<FoundSeed, 'aiRationale' | 'conversionNote' | 'caveat'>> = {},
): FoundSeed {
  return {
    extraction: 'found',
    value,
    confidence,
    source: typeof source === 'string' ? { label: source } : source,
    evidence: { snippet, highlight },
    ...extra,
  };
}

function missing(searchNote: string): NotFoundSeed {
  return { extraction: 'not_found', searchNote };
}

const pct = (decimals = 0): UnitSpec => ({ label: '%', isPercent: true, suffix: '%', decimals, min: 0, max: 100 });
const plain = (label: string, decimals: number, affix: Partial<UnitSpec> = {}): UnitSpec => ({
  label,
  isPercent: false,
  decimals,
  min: 0,
  ...affix,
});
const scoreUnit: UnitSpec = { label: 'score', isPercent: false, decimals: 1, min: 0, max: 5 };
const yesNoUnit: UnitSpec = { label: 'Yes/No', isPercent: false, decimals: 0 };

type CellMap = Record<string, Record<string, CellSeed>>;
function flatten(map: CellMap): Record<CellKey, CellSeed> {
  const out: Record<CellKey, CellSeed> = {};
  for (const [criterionId, byDoc] of Object.entries(map)) {
    for (const [docId, seed] of Object.entries(byDoc)) {
      out[`${criterionId}|${docId}`] = seed;
    }
  }
  return out;
}

// ---------- Scenario A — IT services procurement ----------

const scenarioA: Scenario = {
  id: 'A',
  title: 'IT Vendor Selection',
  industryTag: 'IT services procurement',
  cardDescription: 'Compare 3 CRM implementation proposals on cost, timeline, scope, migration and team.',
  featured: false,
  question: 'Which CRM implementation proposal best fits a 6-month rollout with a small internal IT team?',
  documents: [
    { id: 'alpha', name: 'Vendor Alpha', defaultNickname: 'Vendor Alpha', fileType: 'PDF', pages: 24 },
    { id: 'beta', name: 'Vendor Beta', defaultNickname: 'Vendor Beta', fileType: 'DOCX', pages: 18 },
    { id: 'gamma', name: 'Vendor Gamma', defaultNickname: 'Vendor Gamma', fileType: 'PDF', pages: 31 },
  ],
  criteria: [
    {
      id: 'a_cost',
      name: 'Total cost',
      description: 'Total price of the proposal in BRL, implementation and first-year licenses included.',
      messageName: 'total cost',
      infoRequestAsk: 'the total cost of the proposal in BRL',
      defaultWeight: 25,
      kind: 'number',
      direction: 'lower',
      unit: plain('BRL', 0, { prefix: 'BRL ' }),
    },
    {
      id: 'a_golive',
      name: 'Time to go-live',
      description: 'Months from project kickoff to production go-live.',
      messageName: 'time to go-live',
      infoRequestAsk: 'the planned time from kickoff to production go-live, in months',
      defaultWeight: 20,
      kind: 'number',
      direction: 'lower',
      unit: plain('months', 1, { suffix: ' months' }),
    },
    {
      id: 'a_scope',
      name: 'Scope coverage',
      description: 'Share of the required CRM modules included in the proposal.',
      messageName: 'scope coverage',
      infoRequestAsk: 'the percentage of the required modules included in the scope',
      defaultWeight: 20,
      kind: 'number',
      direction: 'higher',
      unit: pct(0),
    },
    {
      id: 'a_migration',
      name: 'Data migration approach',
      description: 'How data moves from the legacy system, and how much risk that carries.',
      messageName: 'data migration score',
      infoRequestAsk: 'a description of the data migration approach, including rehearsals and rollback',
      defaultWeight: 15,
      kind: 'qualitative',
      unit: scoreUnit,
    },
    {
      id: 'a_sla',
      name: 'Support SLA, critical response',
      description: 'Hours to respond to a critical incident.',
      messageName: 'critical-response SLA',
      infoRequestAsk: 'the guaranteed response time for critical incidents, in hours',
      defaultWeight: 10,
      kind: 'number',
      direction: 'lower',
      unit: plain('hours', 0, { suffix: ' h' }),
    },
    {
      id: 'a_senior',
      name: 'Senior consultants on the team',
      description: 'Share of senior consultants on the proposed delivery team.',
      messageName: 'share of senior consultants',
      infoRequestAsk: 'the percentage of senior consultants on the proposed delivery team',
      defaultWeight: 10,
      kind: 'number',
      direction: 'higher',
      unit: pct(0),
    },
    {
      id: 'a_refs',
      name: 'Industry references',
      description: 'Client references from comparable CRM projects.',
      messageName: 'number of industry references',
      infoRequestAsk: 'the number of client references from comparable projects',
      defaultWeight: null,
      kind: 'number',
      direction: 'higher',
      unit: plain('references', 0),
    },
    {
      id: 'a_training',
      name: 'Training included',
      description: 'Whether user training is part of the price.',
      messageName: 'training offer',
      infoRequestAsk: 'whether user training is included in the price',
      defaultWeight: null,
      kind: 'boolean',
      unit: yesNoUnit,
    },
  ],
  cells: flatten({
    a_cost: {
      alpha: found(num(1_200_000), 95, 'p.14', 'The total investment for the implementation, first-year licenses included, is BRL 1,200,000, payable in milestones.', 'BRL 1,200,000'),
      beta: found(num(980_000), 92, 'p.9', 'Our fixed-price offer for the complete scope is BRL 980,000, with no additional travel fees.', 'BRL 980,000'),
      gamma: found(num(1_600_000), 90, 'p.22', 'Total project price, implementation and first-year licenses included: BRL 1,600,000.', 'BRL 1,600,000'),
    },
    a_golive: {
      alpha: found(num(6), 96, 'p.6', 'We will go live 6 months after kickoff, following the phased plan described below.', '6 months after kickoff'),
      beta: found(num(8), 88, 'p.5', 'Go-live is planned for month 8, once user acceptance testing is complete.', 'month 8'),
      gamma: found(num(6), 65, 'p.11', 'The production go-live is scheduled for week 26 of the engagement.', 'week 26', {
        conversionNote: 'Converted from 26 weeks: 26 × 12 ÷ 52 = 6.0 months.',
        caveat: 'The timeline is stated in weeks, so it was converted to months for comparison.',
      }),
    },
    a_scope: {
      alpha: found(num(90), 85, 'p.4', 'The proposal covers 90% of the required modules; the partner portal is out of scope.', '90% of the required modules'),
      beta: found(num(70), 80, 'p.3', 'Our scope includes 70% of the listed modules. Marketing automation and field service can be quoted separately.', '70% of the listed modules'),
      gamma: found(num(100), 91, 'p.7', 'All required modules (100%) are included in the fixed scope.', 'All required modules (100%)'),
    },
    a_migration: {
      alpha: found(qual(4.5, 'Phased migration with 2 dry runs and a rollback plan'), 82, 'p.17', 'Data will be migrated in phases. We run two full dry runs before cutover and keep a documented rollback plan for each phase.', 'two full dry runs before cutover and keep a documented rollback plan', {
        aiRationale: 'A phased approach with rehearsals and a rollback plan lowers cutover risk. Validation is manual, so it scores just below the top.',
      }),
      beta: found(qual(2.5, 'Single cutover weekend'), 60, 'p.12', 'All data will be moved during a single cutover weekend, and the legacy system will be switched off on Monday.', 'single cutover weekend', {
        aiRationale: 'A single big-bang cutover with no stated rehearsal or rollback is risky for a small internal IT team. The section is brief, so confidence is low.',
      }),
      gamma: found(qual(5, 'Phased migration with automated validation scripts'), 88, 'p.19', 'Migration runs in phases, and every load is checked by automated validation scripts that reconcile record counts and key fields.', 'automated validation scripts', {
        aiRationale: 'Phased loads with automated reconciliation are the strongest practice described in any of the proposals.',
      }),
    },
    a_sla: {
      alpha: found(num(4), 90, 'p.20', 'Critical incidents: response within 4 hours, 24/7.', 'within 4 hours'),
      beta: missing('The support section (pp. 13–14) describes business-hours support but states no response time for critical incidents.'),
      gamma: found(num(2), 93, 'p.27', 'Severity 1 (critical) tickets receive a response within 2 hours, around the clock.', 'within 2 hours'),
    },
    a_senior: {
      alpha: found(num(60), 75, 'p.21', '60% of the proposed team are senior consultants with prior CRM rollouts.', '60% of the proposed team are senior consultants'),
      beta: found(num(40), 70, 'p.15', 'Senior consultants will make up 40% of the delivery team.', '40% of the delivery team'),
      gamma: missing('The team section (pp. 24–26) lists roles but not how many of them are senior consultants.'),
    },
    a_refs: {
      alpha: found(num(3), 90, 'p.22', 'We include 3 client references from CRM projects of similar size.', '3 client references'),
      beta: found(num(5), 90, 'p.16', 'Five client references are available; contact details are listed in the appendix.', 'Five client references'),
      gamma: found(num(2), 90, 'p.29', 'Two reference clients have agreed to speak with your team.', 'Two reference clients'),
    },
    a_training: {
      alpha: found(yes, 88, 'p.18', 'End-user and administrator training is included in the fixed price.', 'training is included in the fixed price'),
      beta: found(yes, 88, 'p.14', 'The offer includes train-the-trainer sessions for key users.', 'includes train-the-trainer sessions'),
      gamma: found(no, 88, 'p.24', 'Training is not part of this proposal and can be contracted separately.', 'Training is not part of this proposal'),
    },
  }),
  demo: {
    reviewCells: ['a_golive|gamma', 'a_migration|beta'],
    gapCell: 'a_senior|gamma',
    gapStepText: "Add 80% to Vendor Gamma's Senior consultants and watch the ranking change",
    suggestedValue: num(80),
  },
};

// ---------- Scenario B — Finance & strategy ----------

const scenarioB: Scenario = {
  id: 'B',
  title: 'Company Performance Comparison',
  industryTag: 'Finance & strategy',
  cardDescription: "Compare 2 companies' FY2025 results on growth, margin, churn, NPS and leverage.",
  featured: false,
  question: 'Which company shows the healthier performance this year?',
  documents: [
    { id: 'north', name: 'Company North FY2025', defaultNickname: 'Company North', fileType: 'XLSX' },
    { id: 'south', name: 'Company South FY2025', defaultNickname: 'Company South', fileType: 'CSV' },
  ],
  criteria: [
    {
      id: 'b_growth',
      name: 'Revenue growth YoY',
      description: 'Year-over-year revenue growth.',
      messageName: 'revenue growth',
      infoRequestAsk: 'the year-over-year revenue growth, in %',
      defaultWeight: 20,
      kind: 'number',
      direction: 'higher',
      unit: pct(0),
    },
    {
      id: 'b_ebitda',
      name: 'EBITDA margin',
      description: 'EBITDA as a share of revenue.',
      messageName: 'EBITDA margin',
      infoRequestAsk: 'the EBITDA margin for the year, in %',
      defaultWeight: 20,
      kind: 'number',
      direction: 'higher',
      unit: pct(0),
    },
    {
      id: 'b_churn',
      name: 'Customer churn',
      description: 'Share of customers lost during the year.',
      messageName: 'customer churn',
      infoRequestAsk: 'the annual customer churn rate, in %',
      defaultWeight: 20,
      kind: 'number',
      direction: 'lower',
      unit: pct(0),
    },
    {
      id: 'b_nps',
      name: 'NPS',
      description: 'Net Promoter Score from the annual customer survey.',
      messageName: 'NPS',
      infoRequestAsk: 'the Net Promoter Score for the year',
      defaultWeight: 15,
      kind: 'number',
      direction: 'higher',
      unit: plain('points', 0, { max: 100 }),
    },
    {
      id: 'b_revemp',
      name: 'Revenue per employee',
      description: 'Annual revenue divided by headcount, in BRL thousand.',
      messageName: 'revenue per employee',
      infoRequestAsk: 'the revenue per employee, in BRL thousand',
      defaultWeight: 15,
      kind: 'number',
      direction: 'higher',
      unit: plain('BRL thousand', 0, { prefix: 'BRL ', suffix: 'k' }),
    },
    {
      id: 'b_netdebt',
      name: 'Net debt / EBITDA',
      description: 'Leverage: net debt divided by EBITDA.',
      messageName: 'net debt / EBITDA',
      infoRequestAsk: 'the net debt / EBITDA ratio at year end',
      defaultWeight: 10,
      kind: 'number',
      direction: 'lower',
      unit: plain('×', 1, { suffix: '×' }),
    },
    {
      id: 'b_gross',
      name: 'Gross margin',
      description: 'Gross profit as a share of revenue.',
      messageName: 'gross margin',
      infoRequestAsk: 'the gross margin for the year, in %',
      defaultWeight: null,
      kind: 'number',
      direction: 'higher',
      unit: pct(0),
    },
  ],
  cells: flatten({
    b_growth: {
      north: found(num(18), 97, 'cell B4', "Sheet 'Summary', B4 · Revenue growth YoY: 18%", '18%'),
      south: found(num(11), 96, 'row 3', 'row 3 · revenue_growth_yoy_pct, 11', '11'),
    },
    b_ebitda: {
      north: found(num(12), 94, 'cell B9', "Sheet 'Summary', B9 · EBITDA margin: 12%", '12%'),
      south: found(num(21), 95, 'row 8', 'row 8 · ebitda_margin_pct, 21', '21'),
    },
    b_churn: {
      north: found(num(9), 90, 'cell D4', "Sheet 'Customers', D4 · Annual customer churn: 9%", '9%'),
      south: missing('The CSV has no churn or customer-retention column in any row.'),
    },
    b_nps: {
      north: found(num(41), 68, { label: 'comment, cell C12', qualifier: 'found in a comment cell' }, "Comment on C12 (Finance): 'NPS for the year came in at 41.'", '41', {
        caveat: 'The value is in a cell comment, not in the data itself.',
      }),
      south: found(num(52), 93, 'row 12', 'row 12 · nps, 52', '52'),
    },
    b_revemp: {
      north: found(num(610), 91, 'cell F2', "Sheet 'People', F2 · Revenue per employee (BRL thousand): 610", '610'),
      south: found(num(540), 64, { label: 'rows 2 and 20', qualifier: 'calculated from two cells' }, 'Not stated directly. Derived as revenue (row 2) ÷ headcount (row 20) = 540 BRL thousand per employee.', '540', {
        caveat: 'Calculated from two cells. The file states no revenue-per-employee figure.',
      }),
    },
    b_netdebt: {
      north: missing('The workbook has an EBITDA line but no net debt figure or leverage ratio.'),
      south: found(num(0.9), 92, 'row 15', 'row 15 · net_debt_to_ebitda, 0.9', '0.9'),
    },
    b_gross: {
      north: found(num(48), 94, 'cell B7', "Sheet 'Summary', B7 · Gross margin: 48%", '48%'),
      south: found(num(55), 94, 'row 6', 'row 6 · gross_margin_pct, 55', '55'),
    },
  }),
  demo: {
    reviewCells: ['b_nps|north', 'b_revemp|south'],
    gapCell: 'b_churn|south',
    gapStepText: 'Add 6% churn to Company South and watch the ranking change',
    suggestedValue: num(6),
  },
};

// ---------- Scenario C — Procurement & legal ----------

const scenarioC: Scenario = {
  id: 'C',
  title: 'Contract Risk Review',
  industryTag: 'Procurement & legal',
  cardDescription: 'Compare 2 logistics contract drafts on price, payment terms, penalties, liability and exit terms.',
  featured: false,
  question: 'Which logistics contract offers the best terms and lowest risk for a 3-year renewal?',
  documents: [
    { id: 'fastfreight', name: 'Logistics contract draft — FastFreight', defaultNickname: 'FastFreight', fileType: 'DOCX', pages: 42 },
    { id: 'rotalog', name: 'Logistics contract draft — RotaLog', defaultNickname: 'RotaLog', fileType: 'PDF', pages: 38 },
  ],
  criteria: [
    {
      id: 'c_price',
      name: 'Annual price',
      description: 'Yearly contract price, in BRL million.',
      messageName: 'annual price',
      infoRequestAsk: 'the annual contract price, in BRL million',
      defaultWeight: 30,
      kind: 'number',
      direction: 'lower',
      unit: plain('BRL million', 1, { prefix: 'BRL ', suffix: 'M' }),
    },
    {
      id: 'c_payment',
      name: 'Payment terms',
      description: 'Days the buyer has to pay each invoice.',
      messageName: 'payment terms',
      infoRequestAsk: 'the payment terms for invoices, in days',
      defaultWeight: 15,
      kind: 'number',
      direction: 'higher',
      unit: plain('days', 0, { suffix: ' days' }),
    },
    {
      id: 'c_cap',
      name: 'Annual price adjustment cap',
      description: 'Maximum yearly price increase allowed by the contract.',
      messageName: 'price adjustment cap',
      infoRequestAsk: 'the maximum annual price adjustment and the index it follows',
      defaultWeight: 15,
      kind: 'number',
      direction: 'lower',
      unit: pct(1),
    },
    {
      id: 'c_penalty',
      name: 'Late-delivery penalty',
      description: 'Credit owed for each late delivery, as % of the invoice.',
      messageName: 'late-delivery penalty',
      infoRequestAsk: 'the penalty for late deliveries, as a percentage of the invoice',
      defaultWeight: 15,
      kind: 'number',
      direction: 'higher',
      unit: pct(0),
    },
    {
      id: 'c_liability',
      name: 'Liability cap',
      description: "Supplier's liability limit, in multiples of the annual contract value.",
      messageName: 'liability cap',
      infoRequestAsk: "the supplier's liability cap, as a multiple of the annual contract value",
      defaultWeight: 15,
      kind: 'number',
      direction: 'higher',
      unit: plain('× annual value', 1, { suffix: '×' }),
    },
    {
      id: 'c_termination',
      name: 'Termination notice',
      description: 'Notice needed to end the contract for convenience.',
      messageName: 'termination notice',
      infoRequestAsk: 'the notice period required to terminate for convenience, in days',
      defaultWeight: 10,
      kind: 'number',
      direction: 'lower',
      unit: plain('days', 0, { suffix: ' days' }),
    },
    {
      id: 'c_dataprot',
      name: 'Data protection clause',
      description: 'Whether the contract includes a data protection clause.',
      messageName: 'data protection clause',
      infoRequestAsk: 'whether the contract includes a data protection clause',
      defaultWeight: null,
      kind: 'boolean',
      unit: yesNoUnit,
    },
  ],
  cells: flatten({
    c_price: {
      fastfreight: found(num(4.6), 94, 'clause 5.1', '5.1 The annual service fee is BRL 4.6 million, invoiced monthly.', 'BRL 4.6 million'),
      rotalog: found(num(5.1), 93, 'clause 4.2', '4.2 The Customer shall pay an annual price of BRL 5.1 million.', 'BRL 5.1 million'),
    },
    c_payment: {
      fastfreight: found(num(60), 91, 'clause 6.3', '6.3 Invoices are payable within 60 days of receipt.', 'within 60 days'),
      rotalog: found(num(90), 89, 'clause 7.1', '7.1 Payment is due 90 days after the invoice date.', '90 days after the invoice date'),
    },
    c_cap: {
      fastfreight: found(num(4.5), 66, { label: 'clause 5.4', qualifier: 'index reference is ambiguous' }, '5.4 Prices may be adjusted annually by the applicable index, limited to 4.5%.', 'limited to 4.5%', {
        caveat: "The index reference is ambiguous: 'the applicable index' is not defined anywhere in the draft.",
      }),
      rotalog: found(num(3), 90, 'clause 4.6', '4.6 The annual adjustment follows the IPCA index and shall not exceed 3.0% per year.', 'shall not exceed 3.0% per year'),
    },
    c_penalty: {
      fastfreight: found(num(5), 88, 'clause 9.2', '9.2 For each late delivery, the Supplier shall credit 5% of the corresponding invoice.', '5% of the corresponding invoice'),
      rotalog: missing('No late-delivery penalty found. The service-level clause defines delivery windows only.'),
    },
    c_liability: {
      fastfreight: found(num(1), 85, 'clause 12.1', "12.1 The Supplier's total liability is limited to 1.0 times the annual contract value.", '1.0 times the annual contract value'),
      rotalog: found(num(2), 62, { label: 'Annex C', qualifier: 'stated only in Annex C' }, 'Annex C · Liability ceiling: two times (2×) the annual contract value.', 'two times (2×) the annual contract value', {
        caveat: 'Stated only in Annex C. The main body of the contract does not mention a liability cap.',
      }),
    },
    c_termination: {
      fastfreight: missing('Clause 14 covers termination for cause, but no notice period for termination for convenience is stated.'),
      rotalog: found(num(60), 90, 'clause 14.2', "14.2 Either party may terminate for convenience with 60 days' written notice.", "60 days' written notice"),
    },
    c_dataprot: {
      fastfreight: found(yes, 92, 'clause 16.1', '16.1 The Supplier shall process personal data in accordance with the LGPD.', 'in accordance with the LGPD'),
      rotalog: found(yes, 92, 'clause 15.3', '15.3 Both parties shall comply with applicable data protection law, including the LGPD.', 'comply with applicable data protection law'),
    },
  }),
  demo: {
    reviewCells: ['c_cap|fastfreight', 'c_liability|rotalog'],
    gapCell: 'c_termination|fastfreight',
    gapStepText: "Add 30 days to FastFreight's termination notice and watch the ranking change",
    suggestedValue: num(30),
  },
};

// ---------- Scenario D — Pharma quality & sourcing ----------

const scenarioD: Scenario = {
  id: 'D',
  title: 'Pharma Supplier Qualification',
  industryTag: 'Healthcare & pharma',
  cardDescription: 'Compare 3 API supplier dossiers on purity, impurities, GMP status, price and inspection history.',
  featured: true,
  disclaimerBanner: 'Illustrative data. Not regulatory or quality advice.',
  question: 'Which active pharmaceutical ingredient (API) supplier should we qualify for our new generic product?',
  documents: [
    { id: 'helix', name: 'Supplier dossier — Helix Chem', defaultNickname: 'Helix Chem', fileType: 'PDF', pages: 56 },
    { id: 'norden', name: 'Supplier dossier — Norden API', defaultNickname: 'Norden API', fileType: 'PDF', pages: 61 },
    { id: 'pacifico', name: 'Supplier dossier — Pacífico Labs', defaultNickname: 'Pacífico Labs', fileType: 'PDF', pages: 48 },
  ],
  criteria: [
    {
      id: 'd_purity',
      name: 'Assay purity',
      description: 'Purity of the API by assay, from the certificate of analysis.',
      messageName: 'assay purity',
      infoRequestAsk: 'the assay purity from the certificate of analysis, in %',
      defaultWeight: 25,
      kind: 'number',
      direction: 'higher',
      unit: pct(1),
    },
    {
      id: 'd_impurity',
      name: 'Largest single impurity',
      description: 'Highest individual impurity in the impurity profile.',
      messageName: 'largest single impurity',
      infoRequestAsk: 'the largest single impurity in the impurity profile, in %',
      defaultWeight: 20,
      kind: 'number',
      direction: 'lower',
      unit: pct(2),
    },
    {
      id: 'd_gmp',
      name: 'Valid GMP certificate',
      description: 'Whether the manufacturing site holds a valid GMP certificate.',
      messageName: 'GMP certificate',
      infoRequestAsk: 'a valid GMP certificate for the manufacturing site',
      defaultWeight: 15,
      kind: 'boolean',
      unit: yesNoUnit,
    },
    {
      id: 'd_price',
      name: 'Price per kg',
      description: 'Unit price in USD per kilogram.',
      messageName: 'price per kg',
      infoRequestAsk: 'the unit price in USD per kilogram',
      defaultWeight: 15,
      kind: 'number',
      direction: 'lower',
      unit: plain('USD/kg', 0, { prefix: 'USD ', suffix: '/kg' }),
    },
    {
      id: 'd_leadtime',
      name: 'Lead time',
      description: 'Weeks from purchase order to delivery.',
      messageName: 'lead time',
      infoRequestAsk: 'the lead time from purchase order to delivery, in weeks',
      defaultWeight: 10,
      kind: 'number',
      direction: 'lower',
      unit: plain('weeks', 0, { suffix: ' weeks' }),
    },
    {
      id: 'd_inspection',
      name: 'Regulatory inspection history',
      description: 'Outcome of the most recent regulatory inspections of the site.',
      messageName: 'inspection history score',
      infoRequestAsk: 'the outcome of the last two regulatory inspections, including any observations',
      defaultWeight: 15,
      kind: 'qualitative',
      unit: scoreUnit,
    },
  ],
  cells: flatten({
    d_purity: {
      helix: found(num(99.6), 95, 'CoA p.2', 'Assay (HPLC, on dried basis): 99.6%. Complies.', '99.6%'),
      norden: found(num(99.8), 96, 'CoA p.3', 'Assay by HPLC: 99.8%. Result complies with specification.', '99.8%'),
      pacifico: found(num(99.5), 93, 'CoA p.2', 'Assay (HPLC): 99.5%.', '99.5%'),
    },
    d_impurity: {
      helix: found(num(0.08), 90, 'p.14', 'Largest single unspecified impurity: 0.08%.', '0.08%'),
      norden: found(num(0.05), 91, 'p.16', 'Highest individual impurity observed across batches: 0.05%.', '0.05%'),
      pacifico: found(num(0.06), 64, { label: 'p.12', qualifier: 'read from a scanned table' }, 'Impurity profile (scanned table) · Largest single impurity: 0.06 %', '0.06 %', {
        caveat: 'Read from a scanned table, so digits may have been misread.',
      }),
    },
    d_gmp: {
      helix: found(yes, 97, 'Annex 1', 'Annex 1 · GMP certificate for the API manufacturing site, valid at the date of submission.', 'GMP certificate'),
      norden: found(yes, 98, 'Annex 1', 'Annex 1 · Current GMP certificate issued for the manufacturing site.', 'Current GMP certificate'),
      pacifico: found(yes, 95, 'Annex 2', 'Annex 2 · Valid GMP certificate for the manufacturing site.', 'Valid GMP certificate'),
    },
    d_price: {
      helix: found(num(1850), 94, 'p.40', 'Price: USD 1,850 per kg, FCA.', 'USD 1,850 per kg'),
      norden: found(num(2900), 95, 'p.45', 'Unit price: USD 2,900/kg.', 'USD 2,900/kg'),
      pacifico: found(num(1700), 92, 'p.38', 'Commercial offer: USD 1,700 per kilogram.', 'USD 1,700 per kilogram'),
    },
    d_leadtime: {
      helix: found(num(12), 90, 'p.41', 'Lead time: 12 weeks from purchase order.', '12 weeks'),
      norden: found(num(10), 88, 'p.46', 'Standard delivery 10 weeks after order confirmation.', '10 weeks'),
      pacifico: found(num(6), 67, 'p.39', 'Lead time: approx. 6–8 weeks, depending on batch scheduling.', 'approx. 6–8 weeks', {
        caveat: "Stated as a range ('approx. 6–8 weeks'). The lower bound is used.",
      }),
    },
    d_inspection: {
      helix: found(qual(4, 'One minor observation in the last inspection, closed'), 80, 'p.22', 'The last regulatory inspection resulted in one minor observation, which has since been closed with a verified corrective action.', 'one minor observation, which has since been closed', {
        aiRationale: 'One minor, closed observation shows a working quality system. It is not a clean record, so it scores 4.0.',
      }),
      norden: found(qual(5, 'No observations in the last two inspections'), 85, 'p.25', 'No observations were raised in the last two regulatory inspections of the site.', 'No observations were raised in the last two regulatory inspections', {
        aiRationale: 'Two consecutive inspections without observations is the strongest record in this set.',
      }),
      pacifico: missing('The dossier mentions a recent regulatory inspection (p.20) but includes no outcome or observations.'),
    },
  }),
  demo: {
    reviewCells: ['d_impurity|pacifico', 'd_leadtime|pacifico'],
    gapCell: 'd_inspection|pacifico',
    gapStepText: "Fill Pacífico Labs' missing inspection history (score 5: no observations in the last two inspections) and watch it jump from 3rd to 1st",
    suggestedValue: qual(5, 'No observations in the last two inspections'),
  },
};

// ---------- exports ----------

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  A: scenarioA,
  B: scenarioB,
  C: scenarioC,
  D: scenarioD,
};

/** Display order on the Start screen and in the switcher. */
export const SCENARIO_ORDER: ScenarioId[] = ['D', 'A', 'C', 'B'];

export const QUICK_DEMO_SCENARIO: ScenarioId = 'D';

export function defaultCriteria(scenario: Scenario): CriterionDef[] {
  return scenario.criteria.filter((c) => c.defaultWeight !== null);
}

export function suggestionCriteria(scenario: Scenario): CriterionDef[] {
  return scenario.criteria.filter((c) => c.defaultWeight === null);
}

export function getCriterion(scenario: Scenario, id: string): CriterionDef {
  const def = scenario.criteria.find((c) => c.id === id);
  if (!def) throw new Error(`Unknown criterion ${id} in scenario ${scenario.id}`);
  return def;
}
