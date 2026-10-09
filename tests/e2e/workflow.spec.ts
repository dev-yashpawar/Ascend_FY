import { test, expect, type Page } from '@playwright/test';
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
}
test('complete student onboarding, customization, publishing and public sharing', async ({
  page,
  isMobile,
}) => {
  await page.goto('/identity');
  await page.getByLabel('College ID').fill('KBTUG23999');
  await page.getByLabel('College Email').fill('test.student@kbtcoe.org');
  await page.getByRole('button', { name: 'Let’s build your portfolio' }).click();
  await expect(page.getByRole('heading', { name: 'First, introduce yourself.' })).toBeVisible();
  await page.getByLabel('Full name').fill('Test Student');
  await page.getByLabel('Branch').selectOption('Information Technology');
  await page.getByLabel('Year of study').selectOption('3rd Year');
  await page
    .getByLabel('Headline', { exact: true })
    .fill('Full Stack Developer | Information Technology Student');
  await page
    .getByLabel('About you')
    .fill('I build thoughtful applications that solve real campus problems.');
  await page.getByRole('button', { name: 'Save & Continue', exact: true }).click();
  await page.getByRole('button', { name: 'React', exact: true }).click();
  await page.getByLabel('Add a skill').fill('TypeScript');
  await page.getByLabel('Add a skill').press('Enter');
  await page.getByRole('button', { name: 'Move TypeScript up' }).click();
  await page.getByRole('button', { name: 'Save & Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Add project', exact: true }).click();
  await page.getByLabel('Project title').fill('Campus Study Hub');
  await page.getByLabel('Description').fill('A useful collaborative study platform.');
  await page.getByLabel('Technology stack').fill('React, TypeScript');
  await page.getByRole('button', { name: 'Save project', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Campus Study Hub', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save & Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Add experience', exact: true }).click();
  await page.getByLabel('Organization').fill('Campus Lab');
  await page.getByLabel('Role').fill('Student Developer');
  await page.getByLabel('I currently work here').check();
  await page.getByLabel('Start date').fill('2026-06');
  await page.getByLabel('Start date').press('Tab');
  await page.getByRole('button', { name: 'Save experience', exact: true }).click();
  await expect(page.getByText('Jun 2026 – Present')).toBeVisible();
  await page.getByRole('button', { name: 'Save & Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Add activity', exact: true }).click();
  await page.getByLabel('Title', { exact: false }).fill('Design Foundations');
  await page.getByLabel('Activity date').fill('2026-08-20');
  await page.getByLabel('Activity date').press('Tab');
  await page.getByRole('button', { name: 'Save activity', exact: true }).click();
  await expect(page.getByText('Certification · Aug 2026')).toBeVisible();
  await page.getByRole('button', { name: 'Save & Continue', exact: true }).click();
  await page.getByLabel('LinkedIn', { exact: true }).fill('https://linkedin.com/in/test-student');
  await page.getByRole('button', { name: 'Save & Continue', exact: true }).click();
  await page.getByRole('link', { name: 'Finish & Continue' }).click();
  await expect(page.getByText('90%', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Customize Portfolio', exact: true }).click();
  await page.getByRole('button', { name: 'Developer', exact: true }).click();
  await page.getByLabel('Typography').selectOption('DM Sans');
  await page.getByRole('button', { name: 'Use violet accent' }).click();
  await page.getByRole('checkbox', { name: 'Education', exact: true }).uncheck();
  await page.getByRole('button', { name: 'Move Projects up' }).click();
  await noOverflow(page);
  if (isMobile) {
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(page.locator('.mobile-preview-open')).toBeVisible();
    await noOverflow(page);
    await page.getByRole('button', { name: 'Close preview' }).click();
  }
  await page.getByRole('button', { name: 'Publish portfolio', exact: true }).click();
  await expect(
    page.getByText('Your portfolio is published. Your story is ready to share.'),
  ).toBeVisible();
  await page.getByRole('link', { name: 'View portfolio', exact: true }).click();
  await expect(page.locator('.pp[data-theme="Developer"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Education', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Test Student.', exact: true })).toBeVisible();
  await expect(page.getByText('Institution Verified', { exact: false })).toHaveCount(0);
  await expect(page.getByText('test.student@kbtcoe.org')).toHaveCount(0);
  await noOverflow(page);
  await page.getByRole('button', { name: 'Show portfolio QR code' }).click();
  await expect(page.locator('.qr-dialog > svg')).toBeVisible();
  await expect(page.getByLabel('Shareable portfolio URL')).toHaveValue(/\/u\/KBTUG23999$/);
  await page.getByRole('button', { name: 'Close QR code' }).click();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.portfolio-nav')).toBeHidden();
  await expect(page.locator('.share-wrapper')).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
  await page.reload();
  await expect(page.locator('.theme-developer')).toBeVisible();
  await page.goto('/dashboard/projects');
  await page.getByRole('button', { name: 'Edit Campus Study Hub' }).click();
  await page.getByLabel('Project title').fill('Campus Study Hub v2');
  await page.getByRole('button', { name: 'Save project', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Campus Study Hub v2', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Delete Campus Study Hub v2' }).click();
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Campus Study Hub v2', exact: true })).toHaveCount(
    0,
  );
});
test('public pages fit common viewports and show no false verification', async ({ page }) => {
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await noOverflow(page);
    await page.goto('/u/KBTUG23513');
    await expect(page.getByRole('heading', { name: 'Aarav Deshmukh.', exact: true })).toBeVisible();
    await noOverflow(page);
    await expect(page.getByText('Institution Verified', { exact: false })).toHaveCount(0);
  }
});
