'use client';

import { Card, Button, TextInput, Group, Text, Title } from '@mantine/core';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  slug: string;
}

export default function OrgLoginUrlsCard({ slug }: Props) {
  const t = useTranslations('profile');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const handleCopy = (url: string, key: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(key);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <Card mb="md">
        <Title order={6} mb={4}>{t('branding.loginUrls')}</Title>
        <Text size="sm" c="dimmed" mb="md">{t('branding.loginUrlsDescription')}</Text>

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
                leftSection={<i className={`bi bi-${copiedUrl === role ? 'check' : 'clipboard'}`} />}
              >
                {copiedUrl === role ? t('branding.loginUrlCopied') : 'Copiar'}
              </Button>
            </Group>
          );
        })}
    </Card>
  );
}
