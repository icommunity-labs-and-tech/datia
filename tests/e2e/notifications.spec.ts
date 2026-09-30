import { test, expect } from '@playwright/test';
import { ADMIN_STORAGE_STATE } from './utils/auth';

/**
 * The dashboard's notification bell (#28): a persisted notification center,
 * not just the toasts it already had. Seeded by scripts/bootstrap-e2e-users.mjs
 * with two unread notifications and one already-read one for the admin account.
 */

test.use({ storageState: ADMIN_STORAGE_STATE });

test.describe('Notification bell', () => {
  test('shows the unread count, reads one by clicking it, then clears the rest at once', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    const bell = page.getByRole('button', { name: /notificaciones|notifications/i });
    const badge = page.getByTestId('notification-unread-badge');
    await expect(bell).toBeVisible();
    await expect(badge.getByText('2', { exact: true })).toBeVisible();

    await bell.click();
    await expect(page.getByText('Verificación KYC completada')).toBeVisible();
    await expect(page.getByText('Un webhook ha dejado de responder')).toBeVisible();
    await expect(page.getByText('Tu mensaje de soporte ha sido leído')).toBeVisible();

    // Reading one drops the count from two to one.
    await page.getByText('Verificación KYC completada').click();
    await expect(badge.getByText('1', { exact: true })).toBeVisible();

    // Clearing the rest drops it to zero, and both the button and the badge disappear.
    await page.getByRole('button', { name: /marcar todas como leídas|mark all as read/i }).click();
    await expect(page.getByRole('button', { name: /marcar todas como leídas|mark all as read/i })).toBeHidden();
    await expect(badge).toBeHidden();
  });
});
