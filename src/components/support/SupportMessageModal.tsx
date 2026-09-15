'use client';

import { useState } from 'react';
import { Alert, Button, Group, Modal, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/routing';
import { createSupportMessage } from '@/actions/support-messages/create';
import { SUPPORT_MESSAGE_LIMITS } from '@/domain/support-messages/types';

interface SupportMessageModalProps {
  opened: boolean;
  onClose: () => void;
}

/** Lets a dashboard user write to support; the message reaches the superadmin panel. */
export default function SupportMessageModal({ opened, onClose }: SupportMessageModalProps) {
  const t = useTranslations('support');
  const pathname = usePathname();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    onClose();
    // Reset once the closing animation is over, so the content does not flash.
    setTimeout(() => {
      setSubject('');
      setMessage('');
      setSent(false);
      setError(null);
    }, 200);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setError(t('errors.required'));
      return;
    }
    setSending(true);
    setError(null);
    try {
      const result = await createSupportMessage({ subject, message, page: pathname });
      if (result.success) setSent(true);
      else setError(t(`errors.${result.error}`));
    } catch {
      setError(t('errors.unexpected'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal opened={opened} onClose={close} title={t('title')} centered size="lg">
      {sent ? (
        <Stack>
          <Alert color="green" icon={<IconCheck size={18} />} title={t('sentTitle')}>
            {t('sentDescription')}
          </Alert>
          <Group justify="flex-end">
            <Button onClick={close}>{t('close')}</Button>
          </Group>
        </Stack>
      ) : (
        <form onSubmit={submit} noValidate>
          <Stack>
            <Text size="sm" c="dimmed">
              {t('intro')}
            </Text>
            <TextInput
              label={t('subject')}
              placeholder={t('subjectPlaceholder')}
              value={subject}
              onChange={(event) => setSubject(event.currentTarget.value)}
              maxLength={SUPPORT_MESSAGE_LIMITS.subject}
              required
              data-autofocus
            />
            <Textarea
              label={t('message')}
              placeholder={t('messagePlaceholder')}
              value={message}
              onChange={(event) => setMessage(event.currentTarget.value)}
              maxLength={SUPPORT_MESSAGE_LIMITS.message}
              minRows={5}
              autosize
              required
            />
            {error && <Alert color="red">{error}</Alert>}
            <Group justify="flex-end">
              <Button variant="default" onClick={close} disabled={sending}>
                {t('cancel')}
              </Button>
              <Button type="submit" loading={sending}>
                {t('send')}
              </Button>
            </Group>
          </Stack>
        </form>
      )}
    </Modal>
  );
}
