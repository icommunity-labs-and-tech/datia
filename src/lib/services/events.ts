import { eventRepository } from '@/infrastructure/prisma/repositories/EventRepositoryPrisma';
import { webhookRepository } from '@/infrastructure/prisma/repositories/WebhookRepositoryPrisma';
import type { CreateEventLogInput, EventLogRecord } from '@/domain/events/EventRepository';
import { webhookTriggerService, type WebhookPayload } from './webhook';

const MAX_CONCURRENT_DELIVERIES = 5;

/**
 * Records an event and sends it to the organisation's active webhooks subscribed
 * to its type. Every place that emits an event goes through here, so a webhook
 * fires for whatever the events page lists (#35).
 *
 * Delivery is not awaited: it runs after the caller has answered. That holds up
 * only because the Cloud Run service keeps CPU allocated outside requests
 * (--no-cpu-throttling); with throttling the sends and their retries would stall.
 */
export async function recordEvent(
  organizationId: string,
  input: CreateEventLogInput
): Promise<EventLogRecord> {
  const event = await eventRepository.create(organizationId, input);
  void deliverEvent(event);
  return event;
}

/**
 * Sends one event to every subscribed webhook, at most five at a time. Failures
 * are logged and counted on the webhook; they never reach the code that emitted
 * the event.
 */
export async function deliverEvent(event: EventLogRecord): Promise<void> {
  try {
    const webhooks = await webhookRepository.findByEvent(event.organizationId, event.eventType);
    if (webhooks.length === 0) return;

    const payload: WebhookPayload = {
      id: event.id,
      event: event.eventType,
      entityType: event.entityType,
      entityId: event.entityId,
      data: event.data,
      timestamp: event.createdAt.toISOString(),
      organizationId: event.organizationId,
    };

    for (let i = 0; i < webhooks.length; i += MAX_CONCURRENT_DELIVERIES) {
      const batch = webhooks.slice(i, i + MAX_CONCURRENT_DELIVERIES);
      await Promise.all(
        batch.map(async (webhook) => {
          let success = false;
          try {
            const result = await webhookTriggerService.triggerWebhook(
              webhook.url,
              payload,
              webhook.secret,
              webhook.headers as Record<string, string> | null
            );
            success = result.success;
            if (!success) {
              console.error(
                `[webhooks] delivery failed webhook=${webhook.id} event=${event.eventType} id=${event.id} attempts=${result.attempts}: ${result.error}`
              );
            }
          } catch (error) {
            console.error(`[webhooks] delivery failed webhook=${webhook.id} id=${event.id}:`, error);
          }
          await webhookRepository
            .updateTriggered(webhook.id, success)
            .catch((error) => console.error(`[webhooks] could not record result for ${webhook.id}:`, error));
        })
      );
    }
  } catch (error) {
    console.error(`[webhooks] could not deliver event ${event.id}:`, error);
  }
}
