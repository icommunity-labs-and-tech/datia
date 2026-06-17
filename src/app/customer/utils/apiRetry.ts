/**
 * API Retry utility with Circuit Breaker pattern
 * Handles rate limiting (429) and temporary failures from iCommunity API
 */

type RetryOptions = {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  timeout?: number;
};

type CircuitState = 'closed' | 'open' | 'half-open';

class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold = 5;
  private readonly successThreshold = 2;
  private readonly openDuration = 30000; // 30 seconds

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.openDuration) {
        this.state = 'half-open';
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;

    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'closed';
      }
    }
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

// Global circuit breaker instance for iCommunity API
const circuitBreaker = new CircuitBreaker();

/**
 * Retry a fetch request with exponential backoff
 */
export async function retryFetch<T = unknown>(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    timeout = 30000,
  } = retryOptions;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await circuitBreaker.execute(async () => {
        const res = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return res;
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));

        // Check if it's a rate limit or server error (retry-able)
        if (response.status === 429 || response.status === 500 || response.status === 503) {
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        // For other errors (4xx), don't retry
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      // Don't retry if circuit is open
      if (lastError.message === 'Circuit breaker is open') {
        throw lastError;
      }

      // Don't retry on abort
      if (lastError.name === 'AbortError') {
        throw lastError;
      }

      // Don't retry on 4xx errors (except 429)
      if (lastError.message.includes('HTTP 4') && !lastError.message.includes('429')) {
        throw lastError;
      }

      // If we've exhausted retries, throw
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, attempt),
        maxDelay
      );

      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.3 * delay;
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Get current circuit breaker state (for monitoring/debugging)
 */
export function getCircuitBreakerState(): CircuitState {
  return circuitBreaker.getState();
}

/**
 * Sequential executor with rate limiting
 */
export class SequentialExecutor<T> {
  private queue: Array<() => Promise<T>> = [];
  private executing = false;
  private delayBetweenCalls = 500; // 500ms between calls

  async add(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
          return result;
        } catch (error) {
          reject(error);
          throw error;
        }
      });

      if (!this.executing) {
        this.execute();
      }
    });
  }

  private async execute() {
    this.executing = true;

    while (this.queue.length > 0) {
      const fn = this.queue.shift();
      if (fn) {
        try {
          await fn();
        } catch {
          // Error already handled in the promise
        }

        // Delay between calls to avoid rate limiting
        if (this.queue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, this.delayBetweenCalls));
        }
      }
    }

    this.executing = false;
  }
}
