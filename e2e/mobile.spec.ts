import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations } from './a11y';

test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

async function noHorizontalOverflow(page: Page) {
  const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
  expect(sw, 'page must not scroll horizontally').toBeLessThanOrEqual(w);
}

// SPEC acceptance 12: cards layout, full-screen evidence panel, no horizontal overflow at 375px.
test('mobile 375px: cards, full-screen panel, bottom-sheet guide, no horizontal overflow', async ({ page }) => {
  await page.goto('/');
  await noHorizontalOverflow(page);
  await page.getByRole('button', { name: 'Quick demo (2 min)' }).click();
  await page.getByRole('button', { name: 'Start the 2-minute demo' }).click();

  // The guide opens as a bottom sheet and collapses to a docked bar.
  await expect(page.getByRole('dialog', { name: 'Try this demo in 4 steps' })).toBeVisible();
  await page.getByRole('button', { name: 'Collapse demo guide' }).click();
  await expect(page.getByTestId('demo-checklist')).toContainText('Demo guide');

  // Cards instead of a table.
  await expect(page.getByRole('table')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Assay purity' })).toBeVisible();
  await noHorizontalOverflow(page);
  await expectNoA11yViolations(page, 'mobile compare');

  // Full-screen evidence panel.
  await page.getByRole('button', { name: /^Largest single impurity, Pacífico Labs/ }).click();
  const panel = page.getByRole('dialog');
  const box = await panel.boundingBox();
  expect(box?.width).toBe(375);
  await page.getByRole('button', { name: 'Close details' }).click();

  for (const tab of ['Insights', /^Report/]) {
    await page.getByRole('tab', { name: tab }).click();
    await noHorizontalOverflow(page);
    await expectNoA11yViolations(page, `mobile ${String(tab)}`);
  }

  // Header actions live in the Menu.
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByRole('menuitem', { name: /Edit setup/ })).toBeVisible();
});
