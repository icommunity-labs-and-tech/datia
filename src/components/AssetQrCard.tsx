'use client';

import { useEffect, useRef, useState } from 'react';
import { Anchor, Button, Card, Center, CopyButton, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconCheck, IconCopy, IconDownload, IconExternalLink, IconQrcode } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

const QR_OPTIONS = {
  errorCorrectionLevel: 'M' as const,
  margin: 1,
  color: { dark: '#000000', light: '#FFFFFF' },
};

export function passportPath(assetId: string) {
  return `/p/${encodeURIComponent(assetId)}`;
}

export default function AssetQrCard({ assetId }: { assetId: string }) {
  const t = useTranslations('itemDetail.qr');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  // The origin is only known in the browser; the QR must carry the absolute URL.
  useEffect(() => {
    setUrl(`${window.location.origin}${passportPath(assetId)}`);
  }, [assetId]);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    (async () => {
      try {
        const mod = await import('qrcode');
        const QR = mod.default ?? mod;
        if (cancelled || !canvasRef.current) return;
        await QR.toCanvas(canvasRef.current, url, { ...QR_OPTIONS, width: 180 });
        setError(null);
      } catch {
        if (!cancelled) setError(t('error'));
      }
    })();
    return () => { cancelled = true; };
  }, [url, t]);

  // Downloaded at print resolution: these end up on labels stuck to the asset.
  const handleDownload = async () => {
    const mod = await import('qrcode');
    const QR = mod.default ?? mod;
    const a = document.createElement('a');
    a.href = await QR.toDataURL(url, { ...QR_OPTIONS, width: 1024 });
    a.download = `qr_asset_${assetId}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <Card>
      <Group gap="xs" mb="xs">
        <ThemeIcon color="datiaGreen" variant="light" size={28} radius="sm">
          <IconQrcode size={16} />
        </ThemeIcon>
        <Title order={5}>{t('title')}</Title>
      </Group>
      <Text size="xs" c="dimmed" mb="sm">{t('hint')}</Text>

      <Center>
        <canvas
          ref={canvasRef}
          aria-label={t('title')}
          style={{ width: 180, height: 180 }}
        />
      </Center>
      {error && <Text size="sm" c="red" ta="center">{error}</Text>}

      <Stack gap="xs" mt="sm">
        <Anchor
          href={passportPath(assetId)}
          target="_blank"
          rel="noopener noreferrer"
          size="sm"
          ta="center"
        >
          <Group gap={4} justify="center" component="span">
            {t('openPublic')}
            <IconExternalLink size={13} />
          </Group>
        </Anchor>
        <Group grow gap="xs">
          <CopyButton value={url}>
            {({ copied, copy }) => (
              <Button
                variant="default"
                size="xs"
                disabled={!url}
                leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                onClick={copy}
              >
                {copied ? t('copied') : t('copyLink')}
              </Button>
            )}
          </CopyButton>
          <Button
            variant="default"
            size="xs"
            disabled={!url || !!error}
            leftSection={<IconDownload size={14} />}
            onClick={handleDownload}
          >
            {t('downloadPng')}
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
