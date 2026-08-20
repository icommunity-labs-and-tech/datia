'use client';

import { Button, Card, Group, Stack, Text, TextInput } from '@mantine/core';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  slug: string;
}

export default function OrgLoginUrlsCard({ slug }: Props) {
  const t = useTranslations('profile');
  const tActions = useTranslations('common.actions');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const handleCopy = (url: string, key: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(key);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <Card p="lg" radius="md">
      <Stack gap={4} mb="md">
        <Text size="sm" fw={600}>{t('branding.loginUrls')}</Text>
        <Text size="sm" c="dimmed">{t('branding.loginUrlsDescription')}</Text>
      </Stack>

        {(['admin'] as const).map(role => {
          const url = `${origin}/org/${slug}/${role}`;
          return (
            <Group key={role} align="flex-end" gap="xs" mb="md" wrap="nowrap">
              <TextInput
                label={t('branding.loginUrlAdmin')}
                readOnly
                value={url}
                size="sm"
                styles={{ input: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
                onFocus={e => e.target.select()}
                style={{ flex: 1 }}
              />
              <Button
                variant={copiedUrl === role ? 'filled' : 'default'}
                color={copiedUrl === role ? 'green' : undefined}
                size="sm"
                style={{ whiteSpace: 'nowrap', minWidth: 90 }}
                onClick={() => handleCopy(url, role)}
                leftSection={copiedUrl === role ? <IconCheck size={15} stroke={1.7} /> : <IconCopy size={15} stroke={1.7} />}
              >
                {copiedUrl === role ? t('branding.loginUrlCopied') : tActions('copy')}
              </Button>
            </Group>
          );
        })}
    </Card>
  );
}
