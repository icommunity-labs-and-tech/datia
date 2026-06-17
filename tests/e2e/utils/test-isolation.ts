import { Page } from '@playwright/test';

/**
 * Adds a small delay between tests to prevent server overload
 */
export async function addTestDelay() {
  await new Promise(resolve => setTimeout(resolve, 1000));
}

/**
 * Clears browser state between tests to ensure isolation
 */
export async function clearBrowserState(page: Page) {
  // Clear cookies
  await page.context().clearCookies();
  
  // Try to clear local storage if page is ready, but don't fail if it's not accessible
  try {
    await page.evaluate(() => {
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }
    });
  } catch (error) {
    // Ignore localStorage access errors - they happen when page isn't ready
    console.log('Could not clear localStorage (page not ready):', error.message);
  }
  
  // Wait a bit for cleanup to complete
  await addTestDelay();
}

/**
 * Ensures page is in a clean state before test
 */
export async function prepareCleanPage(page: Page) {
  await clearBrowserState(page);
  // Just clear state, don't navigate to about:blank as it can cause security issues
  await addTestDelay();
}
