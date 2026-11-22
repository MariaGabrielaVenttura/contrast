import { expect, test } from '@playwright/test';
import { expectNoA11yViolations } from './a11y';

// Runs the full Quick demo checklist (SPEC acceptance 1, 6, 10, 11, 13) on desktop.
test('Quick demo: all 4 checklist steps auto-check and Pacífico ends #1 with 96.6%', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __printed: number }).__printed = 0;
    window.print = () => {
      (window as unknown as { __printed: number }).__printed += 1;
    };
  });
  await page.goto('/');
  await expectNoA11yViolations(page, 'start');

  // 1. Dropping a file shows the demo-mode toast and does not accept it.
  const dataTransfer = await page.evaluateHandle(() => {
    const dt = new DataTransfer();
    dt.items.add(new File(['x'], 'proposal.pdf', { type: 'application/pdf' }));
    return dt;
  });
  await page.getByTestId('upload-dropzone').dispatchEvent('drop', { dataTransfer });
  await expect(page.getByRole('status')).toContainText("Demo mode: file analysis isn't available in this prototype. Try a sample scenario.");

  // Welcome modal: focus starts on the primary button and stays inside the dialog.
  await page.getByRole('button', { name: 'Quick demo (2 min)' }).click();
  const welcome = page.getByRole('dialog', { name: 'Big decisions live in documents nobody has time to compare.' });
  await expect(welcome).toBeVisible();
  const start = page.getByRole('button', { name: 'Start the 2-minute demo' });
  await expect(start).toBeFocused();
  for (let i = 0; i < 4; i++) await page.keyboard.press('Tab');
  expect(await welcome.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await start.click();

  // Step 1 is checked by Quick demo; default results match SPEC.
  await expect(page.getByTestId('checklist-step-1')).toHaveAttribute('data-done', 'true');
  await expect(page.getByTestId('report-badge')).toHaveText('2');
  await expect(page.getByTestId('total-norden')).toContainText('89.8%');
  await expect(page.getByTestId('total-helix')).toContainText('83.2%');
  await expect(page.getByTestId('total-pacifico')).toContainText('81.6%');
  await expectNoA11yViolations(page, 'compare');

  await page.getByRole('tab', { name: 'Insights' }).click();
  await expect(page.getByTestId('robustness').first()).toHaveText('Decision robustness: Medium');
  await expect(page.getByText("If Pacífico Labs' inspection history score is ≥ 2.8, Pacífico Labs would rank #1.").first()).toBeVisible();
  await expect(page.getByTestId('recommendation')).toHaveText('Provisional recommendation: Norden API — 89.8%');
  await expectNoA11yViolations(page, 'insights');

  // 6. The report is locked with 2 Needs review items.
  await page.getByRole('tab', { name: /^Report/ }).click();
  await expect(page.getByTestId('report-lock')).toHaveText('Review 2 pending items before exporting');
  await page.getByRole('button', { name: 'Go to items needing review' }).click();
  await expect(page.getByRole('button', { name: 'Needs review only' })).toHaveAttribute('aria-pressed', 'true');

  // Step 2: confirm both items. With "Needs review only" on, the confirmed row is filtered out,
  // so focus falls back to the matrix heading; with the filter off, focus returns to the cell.
  await page.getByRole('button', { name: /^Largest single impurity, Pacífico Labs/ }).click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Human-verified');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Side-by-side comparison' })).toBeFocused();

  await page.getByRole('button', { name: 'Needs review only' }).click();
  const leadTime = page.getByRole('button', { name: /^Lead time, Pacífico Labs/ });
  await leadTime.click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Human-verified');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(leadTime).toBeFocused();
  await expect(page.getByTestId('checklist-step-2')).toHaveAttribute('data-done', 'true');
  await expect(page.getByTestId('report-badge')).toHaveCount(0);

  // Step 3: decide what to do with Pacífico's missing inspection history → add score 5.
  await page.getByRole('button', { name: /^Regulatory inspection history, Pacífico Labs/ }).click();
  await expect(page.getByTestId('panel-title')).toHaveText('Missing from document');
  await expectNoA11yViolations(page, 'evidence panel');
  await page.getByRole('button', { name: /Add value \(I have it\)/ }).click();
  await page.getByLabel('Score (0–5)').fill('5');
  await page.getByLabel('Source note').fill('No observations in the last two inspections');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByTestId('panel-title')).toHaveText('No observations in the last two inspections');
  await page.getByRole('button', { name: 'Close details' }).click();

  // 10. Pacífico is #1 with 96.6%.
  await expect(page.getByTestId('total-pacifico')).toContainText('96.6%');
  await expect(page.getByTestId('total-pacifico')).toContainText('Rank #1');
  await expect(page.getByTestId('checklist-step-3')).toHaveAttribute('data-done', 'true');

  await page.getByRole('tab', { name: 'Insights' }).click();
  await expect(page.getByTestId('recommendation')).toHaveText('Recommended: Pacífico Labs — 96.6%');
  await expect(page.getByTestId('decision-status').first()).toContainText('Ready to decide');
  await expect(page.getByTestId('robustness').first()).toHaveText('Decision robustness: High');

  // Step 4: the report is unlocked; Export PDF opens the print dialog.
  await page.getByRole('tab', { name: /^Report/ }).click();
  await expect(page.getByTestId('report-lock')).toHaveCount(0);
  await expect(page.getByTestId('report-recommendation')).toHaveText('Recommended: Pacífico Labs — 96.6%');
  await expectNoA11yViolations(page, 'report');
  await page.getByRole('button', { name: 'Export PDF' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __printed: number }).__printed)).toBe(1);
  await expect(page.getByTestId('checklist-step-4')).toHaveAttribute('data-done', 'true');

  // Completion: bonus hint, closing message and the other three scenarios.
  const done = page.getByTestId('checklist-complete');
  await expect(done).toContainText('Bonus: drag a weight in What-if and watch the ranking and report update instantly.');
  await expect(done).toContainText("That's Contrast: from documents to a defensible decision in minutes.");
  for (const title of ['IT Vendor Selection', 'Contract Risk Review', 'Company Performance Comparison']) {
    await expect(done.getByRole('button', { name: new RegExp(title) })).toBeVisible();
  }
});
