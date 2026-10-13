import { test, expect } from '@playwright/test';

for (const path of ['/feedback', '/dashboard/feedback']) {
  test(`feedback login returns a new student to ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/identity\?next=/);
    await page.getByLabel('College ID').fill('STKBTCOE23888');
    await page.getByLabel('Email address').fill('feedback.student@gmail.com');
    await page.getByRole('button', { name: 'Sign in to share feedback' }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await page.getByLabel('Your feedback').fill('Please make it easier to discover new projects.');
    await page.getByRole('button', { name: 'Send feedback' }).click();
    await expect(
      page.getByRole('heading', { name: 'Thanks for helping Ascend improve.' }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });
}

test('missing student session redirects to login and returns an existing student to Feedback', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'ascend:session:v1',
      JSON.stringify({ collegeId: 'STKBTCOE23000', token: 'stale-session' }),
    );
  });
  await page.goto('/feedback');
  await expect(page).toHaveURL(/\/identity\?next=/);
  await expect(page.getByText('Portfolio not found.')).toHaveCount(0);
  await page.getByLabel('College ID').fill('KBTUG23513');
  await page.getByLabel('Email address').fill('kbtug23513@kbtcoe.org');
  await page.getByRole('button', { name: 'Sign in to share feedback' }).click();
  await expect(page).toHaveURL(/\/feedback$/);
  await expect(page.getByLabel('Your feedback')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toHaveCount(0);
});
