'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Center,
  Divider,
  Grid,
  Group,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Timeline,
  Title,
} from '@mantine/core';
import {
  IconTrash,
  IconCertificate,
  IconBolt,
  IconExternalLink as IconLink,
  IconInfoCircle,
  IconShieldCheck,
  IconClock,
  IconArrowLeft,
} from '@tabler/icons-react';
import { getAsset, deleteAsset, getAssetDetails } from '@/actions/assets';
import { getAssetCertifications } from '@/actions/certifications/listByAsset';
import type { AssetCertification } from '@/lib/certification/queries';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import { useDeleteEntity } from '@/hooks/useDeleteEntity';
import { getCascadeInfo } from '@/config/entityConfig';
import AssetQrCard from '@/components/AssetQrCard';
import { EvidenceVerification } from '@/components/passport/EvidenceVerification';
import { EnergyReportSection } from '@/components/passport/sections';
import ImageDisplay from '@/components/ImageDisplay';
import PageHeader from '@/components/layout/PageHeader';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function AssetDetailPage() {
  const t = useTranslations('itemDetail');
  const tSidebar = useTranslations('sidebar');
  const { id } = useParams();
  const router = useRouter();
  const assetId = id as string;
  const [item, setItem] = useState<any>(null);
  const [certifications, setCertifications] = useState<AssetCertification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const {
    showDeleteModal,
    entityToDelete,
    isDeleting,
    openDeleteModal,
    closeDeleteModal,
    handleDelete,
  } = useDeleteEntity(deleteAsset, {
    entityName: t('deleteEntityName'),
    redirectPath: '/company/assets',
    onSuccess: () => {
      router.push('/company/assets');
    },
    onError: () => {
      alert(t('deleteError'));
    },
  });

  useEffect(() => {
    const load = async () => {
      if (!assetId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const [itemData, certificationData] = await Promise.all([
          getAsset(assetId).catch(() => null),
          getAssetCertifications(assetId).catch(() => []),
        ]);
        if (itemData) setItem(itemData);
        setCertifications(certificationData);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [assetId]);

  const openDeleteModalWithDetails = async () => {
    try {
      openDeleteModal(await getAssetDetails(assetId));
    } catch {
      openDeleteModal(item);
    }
  };

  if (isLoading) {
    return (
      <Stack gap="md">
        <Skeleton height={30} width={280} radius="sm" />
        <Grid gutter="md">
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Skeleton height={180} radius="md" mb="md" />
            <Skeleton height={260} radius="md" />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Skeleton height={200} radius="md" />
          </Grid.Col>
        </Grid>
      </Stack>
    );
  }

  if (!item) {
    return (
      <Alert icon={<IconInfoCircle size={16} />} color="datiaBlue" variant="light" title={t('notFound')}>
        {t('notFoundDescription')}
      </Alert>
    );
  }

  const cascadeInfo = entityToDelete ? getCascadeInfo(entityToDelete, 'items') : undefined;
  const certifiedCount = certifications.filter((c) => c.status === 'CERTIFIED').length;

  return (
    <>
      <Stack gap="md">
        <Anchor
          component={Link}
          href="/company/assets"
          size="sm"
          c="dimmed"
          underline="never"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <IconArrowLeft size={14} stroke={1.7} />
          {tSidebar('assets')}
        </Anchor>

        <PageHeader
          title={item.name}
          description={item.description || undefined}
          actions={
            <Button
              variant="outline"
              color="red"
              size="xs"
              leftSection={<IconTrash size={15} />}
              onClick={openDeleteModalWithDetails}
            >
              {t('delete')}
            </Button>
          }
        >
          <Group gap="xs" mt="xs">
            <Badge
              variant="light"
              color={item.evidenceId ? 'green' : 'yellow'}
              leftSection={
                item.evidenceId ? <IconShieldCheck size={12} /> : <IconClock size={12} />
              }
            >
              {item.evidenceId ? t('certified') : t('pendingBackup')}
            </Badge>
          </Group>
        </PageHeader>

        <Grid gutter="md">
          {/* ── Left column: info + certifications ── */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Stack gap="md">
              {/* ── Certifications ── */}
              <Card>
                <Group gap="xs" mb="md">
                  <ThemeIcon color="datiaGreen" variant="light" size={28} radius="sm">
                    <IconCertificate size={16} />
                  </ThemeIcon>
                  <Title order={5}>{t('certifications')}</Title>
                </Group>

                {certifications.length === 0 ? (
                  <Text size="sm" c="dimmed" ta="center" py="lg">{t('noCertifications')}</Text>
                ) : (
                  <Timeline active={certifications.length} bulletSize={26} lineWidth={2} color="datiaBlue">
                    {certifications.map((certification) => {
                      const certified = certification.status === 'CERTIFIED';
                      return (
                        <Timeline.Item
                          key={certification.id}
                          bullet={certified ? <IconShieldCheck size={14} /> : <IconClock size={14} />}
                          color={certified ? 'green' : 'datiaBlue'}
                          title={
                            <Group gap={6} wrap="wrap">
                              <Text fw={600} size="sm">
                                {certification.period ?? t('certificationWithoutPeriod')}
                              </Text>
                              {certification.co2eKg != null && (
                                <Badge size="xs" color="datiaBlue" variant="light">
                                  {certification.co2eKg} kg CO₂e
                                </Badge>
                              )}
                              <Badge size="xs" color={certified ? 'green' : 'yellow'} variant="dot">
                                {certified ? t('certified') : t('pendingBackup')}
                              </Badge>
                            </Group>
                          }
                        >
                          {certification.readings != null && (
                            <Text size="sm" c="dimmed">{t('readingsCovered', { count: certification.readings })}</Text>
                          )}
                          <Group gap={8} mt={4}>
                            <Text size="xs" c="dimmed">
                              {new Date(certification.certifiedAt ?? certification.createdAt).toLocaleString()}
                            </Text>
                            {certification.checkerUrl && (
                              <Anchor href={certification.checkerUrl} target="_blank" rel="noreferrer" size="xs">
                                <Group gap={4}>
                                  {t('viewProof')}
                                  <IconLink size={12} />
                                </Group>
                              </Anchor>
                            )}
                          </Group>
                        </Timeline.Item>
                      );
                    })}
                  </Timeline>
                )}
              </Card>

              <Card>
                <Group gap="xs" mb="md">
                  <ThemeIcon color="datiaGreen" variant="light" size={28} radius="sm">
                    <IconBolt size={16} />
                  </ThemeIcon>
                  <Title order={5}>{t('energyReport')}</Title>
                </Group>
                <EnergyReportSection assetId={assetId} />
              </Card>
            </Stack>
          </Grid.Col>

          {/* ── Right column: image, QR, blockchain proof, summary ── */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="md">
              {item.imageUrl && (
                <Card>
                  <Center>
                    <ImageDisplay
                      imageUrl={item.imageUrl}
                      alt={t('imageAlt', { name: item.name })}
                      clickable={true}
                      modalTitle={t('imageAlt', { name: item.name })}
                      style={{ maxWidth: '100%', maxHeight: 220, objectFit: 'contain' }}
                    />
                  </Center>
                </Card>
              )}

              <AssetQrCard assetId={assetId} />

              {item.evidenceId && (
                <Card>
                  <Group gap="xs" mb={4}>
                    <ThemeIcon color="datiaGreen" variant="light" size={28} radius="sm">
                      <IconShieldCheck size={16} />
                    </ThemeIcon>
                    <Title order={5}>{t('blockchainProof')}</Title>
                  </Group>
                  <EvidenceVerification evidenceId={item.evidenceId} entityId={item.id} />
                </Card>
              )}

              <Card>
                <Title order={6} mb="sm">{t('summary')}</Title>
                <Stack gap={8}>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">{t('totalCertifications')}</Text>
                    <Text size="sm" fw={600}>{certifications.length}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">{t('certifiedCertifications')}</Text>
                    <Text size="sm" fw={600} c={certifiedCount > 0 ? 'green' : undefined}>
                      {certifiedCount}
                    </Text>
                  </Group>
                  <Divider />
                  <Group justify="space-between" wrap="nowrap">
                    <Text size="sm" c="dimmed">{t('position')}</Text>
                    <Text size="sm" fw={600} ta="right">
                      {item.latitude != null && item.longitude != null
                        ? `${item.latitude}, ${item.longitude}`
                        : '—'}
                    </Text>
                  </Group>
                  <Group justify="space-between" wrap="nowrap">
                    <Text size="sm" c="dimmed">{t('assetId')}</Text>
                    <Text size="xs" ff="monospace" ta="right" style={{ wordBreak: 'break-all' }}>
                      {item.id}
                    </Text>
                  </Group>
                </Stack>
              </Card>
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>

      <DeleteConfirmationModal
        show={showDeleteModal}
        onHide={closeDeleteModal}
        onConfirm={handleDelete}
        title={t('deleteTitle')}
        message={t('deleteMessage', { name: entityToDelete?.name ?? '' })}
        cascadeInfo={cascadeInfo}
        isLoading={isDeleting}
      />

    </>
  );
}
