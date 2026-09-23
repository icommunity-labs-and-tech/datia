'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Button, Group, Stack, Text } from '@mantine/core';
import { IconQrcode, IconCopy, IconDownload } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

type AssetQrModalProps = {
  show: boolean;
  onHide: () => void;
  assetId: string;
  itemName?: string;
};

export default function AssetQrModal({ show, onHide, assetId, itemName }: AssetQrModalProps) {
  const t = useTranslations('itemDetail.qr');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const itemUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    try {
      const origin = window.location.origin;
      return `${origin}/customer/item/${encodeURIComponent(assetId)}`;
    } catch {
      return `/customer/item/${encodeURIComponent(assetId)}`;
    }
  }, [assetId]);

  useEffect(() => {
    let cancelled = false;
    const draw = async () => {
      if (!show) return;
      setError(null);
      try {
        const mod = await import('qrcode');
        if (cancelled) return;
        const QR = mod.default ?? mod;
        const canvas = canvasRef.current;
        if (!canvas) return;
        await QR.toCanvas(canvas, itemUrl, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 260,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
      } catch (e: any) {
        setError(e?.message || 'No se pudo generar el QR');
      }
    };

    draw();
    return () => { cancelled = true; };
  }, [show, itemUrl]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qr_item_${assetId}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(itemUrl);
    } catch {}
  };

  return (
    <Modal
      opened={show}
      onClose={onHide}
      centered
      title={<Group gap={6}><IconQrcode size={17} stroke={1.7} />{itemName ? t('titleNamed', { name: itemName }) : t('title')}</Group>}
    >
      <Stack align="center" gap="xs">
        <canvas ref={canvasRef} style={{ width: 260, height: 260 }} />
        <Text size="xs" c="dimmed" ta="center" style={{ wordBreak: 'break-all' }}>{itemUrl}</Text>
        {error && <Text size="sm" c="red">{error}</Text>}
      </Stack>
      <Group justify="flex-end" mt="lg">
        <Button variant="default" leftSection={<IconCopy size={15} stroke={1.7} />} onClick={handleCopyUrl}>
          {t('copyLink')}
        </Button>
        <Button leftSection={<IconDownload size={15} stroke={1.7} />} onClick={handleDownload}>
          {t('downloadPng')}
        </Button>
      </Group>
    </Modal>
  );
}
