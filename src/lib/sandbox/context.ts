/**
 * Sandbox request context.
 *
 * When a request is authenticated with a sandbox token (stored in the
 * filesystem, not the DB), the entire handler is wrapped in this context.
 * Any code deeper in the call stack can call `isSandboxRequest()` to
 * detect the sandbox mode and choose the appropriate adapter (filesystem
 * vs. Prisma repositories).
 *
 * Usage in route handlers / services:
 *   import { isSandboxRequest } from '@/lib/sandbox/context';
 *   const repo = isSandboxRequest() ? filesystemRepo : prismaRepo;
 */

import { AsyncLocalStorage } from 'async_hooks';

const sandboxStorage = new AsyncLocalStorage<true>();

/** Returns true when the current async call chain is handling a sandbox request. */
export function isSandboxRequest(): boolean {
  return sandboxStorage.getStore() === true;
}

/** Runs `fn` inside a sandbox context. All code called within fn will see isSandboxRequest() === true. */
export function runInSandbox<T>(fn: () => Promise<T>): Promise<T> {
  return sandboxStorage.run(true, fn);
}
