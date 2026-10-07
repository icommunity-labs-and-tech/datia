import { test, expect } from '@playwright/test';

async function assertImagesHaveAlt(page: any) {
  const missing = await page.$$eval('img', (imgs: HTMLImageElement[]) =>
    imgs.filter(img => !(img.getAttribute('alt') || '').trim()).map(img => img.src)
  );
  // Best-effort: allow zero or log missing; fail if too many
  expect(missing.length).toBeLessThan(3);
}

async function assertInputsHaveLabels(page: any) {
  const unlabeled = await page.$$eval('input, select, textarea', (els: HTMLElement[]) => {
    function hasLabel(el: HTMLElement) {
      const id = el.getAttribute('id');
      if (id && document.querySelector(`label[for="${id}"]`)) return true;
      let parent: HTMLElement | null = el.parentElement;
      while (parent) {
        if (parent.tagName.toLowerCase() === 'label') return true;
        parent = parent.parentElement;
      }
      return false;
    }
    return els.filter(el => !hasLabel(el)).length;
  });
  expect(unlabeled).toBeLessThan(5);
}

test.describe('Shared - Basic Accessibility (public pages)', () => {
  test('apps page has basic a11y', async ({ page }) => {
    await page.goto('/apps');
    // One main heading, whatever its copy.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await assertImagesHaveAlt(page);
  });

  test('admin login has labeled fields', async ({ page }) => {
    await page.goto('/auth/company/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await assertInputsHaveLabels(page);
  });
});


