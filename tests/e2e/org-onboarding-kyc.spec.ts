import { test, expect } from '@playwright/test';
import { SUPERADMIN_STORAGE_STATE } from './utils/auth';

/**
 * Creating an organization really starts its company's KYC with iBS (#38) —
 * it is not just a database write. `createOrganizationWithAdmin` calls
 * `startCompanySignature`, which calls iBS, before the transaction that
 * creates the organisation and its default company; it also sends the first
 * admin's activation email and rolls everything back if that send fails. Both
 * calls go to the iBS/Mailgun double (tests/e2e/support/external-apis-stub.mjs),
 * so this is the real code path, not a stand-in for it.
 */

const STUB = 'http://127.0.0.1:4010';

test.describe('Organization onboarding starts a real KYC signature', () => {
  test.use({ storageState: SUPERADMIN_STORAGE_STATE });

  test('creating an organization calls iBS for its company signature and emails its admin', async ({ page, request }) => {
    const before = (await (await request.get(`${STUB}/__control/signatures`)).json()).signatures;

    const orgName = `E2E Onboarding ${Date.now()}`;
    const adminEmail = `onboarding-${Date.now()}@datia.icommunitylabs.com`;

    await page.goto('/superadmin/organizations', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /nueva organizaci[óo]n|new organization/i }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/nombre de la organizaci[óo]n|organi[sz]ation name/i).fill(orgName);
    await dialog.getByLabel(/nombre completo|full name/i).fill('Admin E2E Onboarding');
    await dialog.locator('input[type="email"]').fill(adminEmail);
    await dialog.getByRole('button', { name: /crear organizaci[óo]n|create organization/i }).click();

    // The success alert names the organization and the admin the activation
    // email went to — proof the whole transaction (org, company, admin, email)
    // completed, not just that the form submitted.
    await expect(page.getByText(new RegExp(`${orgName}.*(creada|created)`))).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(adminEmail)).toBeVisible();

    const after = (await (await request.get(`${STUB}/__control/signatures`)).json()).signatures;
    expect(after.length).toBe(before.length + 1);
    const created = after[after.length - 1];
    expect(created.status).toBe('created');

    const { emails } = await (await request.get(`${STUB}/__control/emails`)).json();
    const sentToAdmin = emails.find((e: { to: string }) => e.to === adminEmail);
    expect(sentToAdmin).toBeTruthy();
  });
});
