import { Locator, Page, expect } from '@playwright/test';

export async function findRowByText(table: Locator, text: string): Promise<Locator | null> {
  const rows = table.locator('tr');
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const row = rows.nth(i);
    const content = await row.textContent();
    if (content && content.toLowerCase().includes(text.toLowerCase())) {
      return row;
    }
  }
  return null;
}

export async function clickActionInRow(row: Locator, actionTextPattern: RegExp) {
  const action = row.getByRole('button', { name: actionTextPattern }).first();
  if (await action.isVisible()) {
    await action.click();
    return;
  }
  const link = row.getByRole('link', { name: actionTextPattern }).first();
  if (await link.isVisible()) {
    await link.click();
    return;
  }
  // Fallback: try any element containing the action text
  const any = row.locator(`:text-matches("${actionTextPattern.source}", "i")`).first();
  await any.click();
}

export async function saveForm(page: Page) {
  // Try common save/submit buttons in Spanish
  const buttons = [
    page.getByRole('button', { name: /guardar/i }),
    page.getByRole('button', { name: /crear/i }),
    page.getByRole('button', { name: /añadir/i }),
    page.getByRole('button', { name: /aceptar/i }),
    page.getByRole('button', { name: /confirmar/i }),
  ];
  for (const btn of buttons) {
    if (await btn.isVisible()) {
      await btn.click();
      return;
    }
  }
  // Fallback submit
  await page.keyboard.press('Enter');
}




