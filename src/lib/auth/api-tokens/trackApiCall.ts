import { apiCallRepository } from '@/infrastructure/prisma/repositories/ApiCallRepositoryPrisma';
import { apiTokenRepository } from '@/infrastructure/prisma/repositories/ApiTokenRepositoryPrisma';

export interface ApiCallTrackingInfo {
  apiTokenId: string;
  organizationId: string;
  method: string;
  path: string;
  statusCode: number;
}

/**
 * Track an API call asynchronously (fire and forget)
 * This function doesn't block the response and handles errors silently
 */
export async function trackApiCall(info: ApiCallTrackingInfo): Promise<void> {
  // Run in background without blocking
  (async () => {
    try {
      // Create API call record
      await apiCallRepository.create({
        apiTokenId: info.apiTokenId,
        organizationId: info.organizationId,
        method: info.method,
        path: info.path,
        statusCode: info.statusCode,
      });

      // Update lastUsedAt for the token
      await apiTokenRepository.updateLastUsed(info.apiTokenId);
    } catch (error) {
      // Silently ignore errors in tracking
      // We don't want tracking failures to affect API responses
      console.error('Error tracking API call:', error);
    }
  })();
}

