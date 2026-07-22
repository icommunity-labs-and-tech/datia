'use client';

import React from 'react';
import { Modal, Button, Alert, Group, SimpleGrid, TextInput, ActionIcon, Title } from '@mantine/core';
import { useTranslations } from 'next-intl';

interface PasswordModalProps {
  show: boolean;
  onHide: () => void;
  user: {
    name: string;
    email: string;
    temporaryPassword: string;
  } | null;
}

export default function PasswordModal({ show, onHide, user }: PasswordModalProps) {
  const t = useTranslations('modals.password');
  const [copied, setCopied] = React.useState(false);

  const copy = async (value?: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
    }
  };

  if (!user) return null;

  return (
    <Modal
      opened={show}
      onClose={onHide}
      centered
      size="lg"
      title={<Group gap={6}><i className="bi bi-person-check" />{t('title')}</Group>}
    >
      <Alert color="green" mb="lg" title={t('successMessage')} icon={<i className="bi bi-check-circle" />}>
        {t('userCreated', { name: user.name, email: user.email })}
      </Alert>

      <Title order={6} mb="sm">
        <i className="bi bi-key" style={{ marginRight: 8 }} />
        {t('credentialsTitle')}
      </Title>

      <SimpleGrid cols={{ base: 1, md: 2 }} mb="lg">
        <TextInput
          label={t('email')}
          value={user.email}
          readOnly
          rightSection={
            <ActionIcon variant="subtle" onClick={() => copy(user.email)} title={t('copyEmail')}>
              <i className="bi bi-clipboard" />
            </ActionIcon>
          }
        />
        <TextInput
          label={t('temporaryPassword')}
          value={user.temporaryPassword}
          readOnly
          styles={{ input: { fontFamily: 'monospace' } }}
          rightSection={
            <ActionIcon variant="subtle" onClick={() => copy(user.temporaryPassword)} title={t('copyPassword')}>
              <i className="bi bi-clipboard" />
            </ActionIcon>
          }
        />
      </SimpleGrid>

      <Alert color="yellow" title={t('important')} icon={<i className="bi bi-exclamation-triangle" />}>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>{t('temporaryWarning')}</li>
          <li>{t('shareSecurely')}</li>
          <li>{t('canChangePassword')}</li>
        </ul>
      </Alert>

      {copied && (
        <Alert color="datiaBlue" mt="md" icon={<i className="bi bi-check-circle" />}>
          {t('copied')}
        </Alert>
      )}

      <Group justify="flex-end" mt="lg">
        <Button onClick={onHide} leftSection={<i className="bi bi-check" />}>
          {t('understood')}
        </Button>
      </Group>
    </Modal>
  );
}
