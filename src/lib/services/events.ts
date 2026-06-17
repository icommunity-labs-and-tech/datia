import { webhookRepository } from '@/infrastructure/prisma/repositories/WebhookRepositoryPrisma';
import { webhookTriggerService } from './webhook';

/**
 * Trigger webhooks for a given event type
 * This function is fire-and-forget - it doesn't block the calling code
 */
export function triggerWebhooksForEvent(
  eventType: string,
  eventData: Record<string, any>,
  organizationId: string
) {
  // Fire and forget
  (async () => {
    try {
      // Find all active webhooks subscribed to this event
      const webhooks = await webhookRepository.findByEvent(organizationId, eventType);

      // Trigger each webhook in parallel
      if (webhooks.length > 0) {
        const triggerPromises = webhooks.map(async (webhook) => {
          try {
            const result = await webhookTriggerService.triggerWebhook(
              webhook.url,
              {
                event: eventType,
                data: eventData,
                timestamp: new Date().toISOString(),
                organizationId,
              },
              webhook.secret,
              webhook.headers as Record<string, string> | null
            );

            // Update webhook stats
            await webhookRepository.updateTriggered(webhook.id, result.success);

            return result;
          } catch {
            // On error, mark as failure
            await webhookRepository.updateTriggered(webhook.id, false);
          }
        });

        // Limit concurrency to 5
        const chunks = [];
        for (let i = 0; i < triggerPromises.length; i += 5) {
          chunks.push(triggerPromises.slice(i, i + 5));
        }
        for (const chunk of chunks) {
          await Promise.all(chunk);
        }
      }
    } catch (err) {
      console.error('Error triggering webhooks:', err);
    }
  })();
}
