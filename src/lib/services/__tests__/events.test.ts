import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventRepository } from '@/infrastructure/prisma/repositories/EventRepositoryPrisma';
import { webhookRepository } from '@/infrastructure/prisma/repositories/WebhookRepositoryPrisma';
import { webhookTriggerService } from '../webhook';
import { recordEvent, deliverEvent } from '../events';

vi.mock('@/infrastructure/prisma/repositories/EventRepositoryPrisma', () => ({
  eventRepository: {
    create: vi.fn(async (organizationId: string, input: any) => ({
      id: 'evt-1',
      organizationId,
      ...input,
      createdAt: new Date('2026-09-15T10:00:00Z'),
    })),
  },
}));

vi.mock('@/infrastructure/prisma/repositories/WebhookRepositoryPrisma', () => ({
  webhookRepository: {
    findByEvent: vi.fn(async () => []),
    updateTriggered: vi.fn(async () => {}),
  },
}));

vi.mock('../webhook', () => ({
  webhookTriggerService: { triggerWebhook: vi.fn(async () => ({ success: true, attempts: 1 })) },
}));

const findByEvent = webhookRepository.findByEvent as ReturnType<typeof vi.fn>;
const updateTriggered = webhookRepository.updateTriggered as ReturnType<typeof vi.fn>;
const triggerWebhook = webhookTriggerService.triggerWebhook as ReturnType<typeof vi.fn>;

const input = { eventType: 'asset.created', entityType: 'asset', entityId: 'i-1', data: { id: 'i-1' } };
const webhook = (id: string) => ({ id, url: `https://${id}.test`, secret: 's3cret', headers: null });
const event = {
  id: 'evt-1',
  organizationId: 'org-1',
  ...input,
  createdAt: new Date('2026-09-15T10:00:00Z'),
};

describe('recordEvent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stores the event and sends it to the webhooks subscribed to its type', async () => {
    findByEvent.mockResolvedValueOnce([webhook('wh-1')]);

    const recorded = await recordEvent('org-1', input);

    expect(recorded.id).toBe('evt-1');
    expect(eventRepository.create).toHaveBeenCalledWith('org-1', input);
    await vi.waitFor(() => expect(updateTriggered).toHaveBeenCalledWith('wh-1', true));
    expect(findByEvent).toHaveBeenCalledWith('org-1', 'asset.created');
    expect(triggerWebhook).toHaveBeenCalledWith(
      'https://wh-1.test',
      {
        id: 'evt-1',
        event: 'asset.created',
        entityType: 'asset',
        entityId: 'i-1',
        data: { id: 'i-1' },
        timestamp: '2026-09-15T10:00:00.000Z',
        organizationId: 'org-1',
      },
      's3cret',
      null
    );
  });

  it('answers without waiting for the deliveries', async () => {
    findByEvent.mockResolvedValueOnce([webhook('wh-slow')]);
    triggerWebhook.mockImplementationOnce(() => new Promise(() => {}));

    await expect(recordEvent('org-1', input)).resolves.toMatchObject({ id: 'evt-1' });
  });

  it('never fails the caller when delivery breaks', async () => {
    findByEvent.mockRejectedValueOnce(new Error('database down'));
    await expect(recordEvent('org-1', input)).resolves.toMatchObject({ id: 'evt-1' });
  });
});

describe('deliverEvent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends to at most five webhooks at a time', async () => {
    findByEvent.mockResolvedValueOnce(Array.from({ length: 12 }, (_, i) => webhook(`wh-${i}`)));
    let inFlight = 0;
    let peak = 0;
    triggerWebhook.mockImplementation(async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight--;
      return { success: true, attempts: 1 };
    });

    await deliverEvent(event);

    expect(triggerWebhook).toHaveBeenCalledTimes(12);
    expect(peak).toBeLessThanOrEqual(5);
    expect(peak).toBeGreaterThan(1);
  });

  it('counts a failed delivery against the webhook', async () => {
    findByEvent.mockResolvedValueOnce([webhook('wh-1')]);
    triggerWebhook.mockResolvedValueOnce({ success: false, attempts: 3, error: 'HTTP 500' });

    await deliverEvent(event);

    expect(updateTriggered).toHaveBeenCalledWith('wh-1', false);
  });

  it('does nothing without subscribed webhooks', async () => {
    await deliverEvent(event);
    expect(triggerWebhook).not.toHaveBeenCalled();
  });
});
