import { expect, test } from '@playwright/test';

const demoUser = {
  email: 'user@example.com',
  password: 'secret',
};

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('redirects unauthenticated users to the login page', async ({ page }) => {
    await page.goto('/home');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId('login-card')).toBeVisible();
  });

  test('signs in with the default demo credentials', async ({ page }) => {
    await page.getByLabel('Email').fill(demoUser.email);
    await page.getByLabel('Password').fill(demoUser.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/home$/);
    await expect(
      page.getByRole('heading', { name: 'Task Management Dashboard' })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    await expect(page.locator('aside code')).toContainText('.');
  });

  test('shows a helpful error when credentials are invalid', async ({ page }) => {
    await page.getByLabel('Email').fill('invalid@example.com');
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByTestId('login-card')).toBeVisible();
    await expect(
      page.getByText('Invalid email or password.', { exact: true })
    ).toBeVisible();
  });
});
