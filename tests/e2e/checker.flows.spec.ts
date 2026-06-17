import { test, expect } from '@playwright/test';

test.describe('Checker Flows', () => {
  test('check status by statusId returns data or not found', async ({ page }) => {
    const statusId = process.env.CHECKER_E2E_STATUS_ID || 'invalid-status-id';
    const res = await page.request.get(`/api/checker/${statusId}`);
    expect([200, 404]).toContain(res.status());
  });

  test('check item by itemId route returns data or not found', async ({ page }) => {
    const itemId = process.env.CHECKER_E2E_ITEM_ID || 'invalid-item-id';
    const res = await page.request.get(`/api/checker/item/${itemId}`);
    expect([200, 404]).toContain(res.status());
  });
});




