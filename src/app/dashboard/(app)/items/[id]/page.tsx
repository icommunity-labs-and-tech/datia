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
  IconQrcode,
  IconExternalLink,
  IconTrash,
  IconCertificate,
  IconExternalLink as IconLink,
  IconInfoCircle,
  IconShieldCheck,
  IconClock,
  IconArrowLeft,
} from '@tabler/icons-react';
import { getItem, deleteItem, getItemDetails } from '@/actions/items';
import { getItemCertifications } from '@/actions/certifications/listByItem';
import type { ItemCertification } from '@/lib/certification/queries';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import { useDeleteEntity } from '@/hooks/useDeleteEntity';
import { getCascadeInfo } from '@/config/entityConfig';
import ItemQrModal from '@/components/ItemQrModal';
import ImageDisplay from '@/components/ImageDisplay';
import ItemSpecificFields from '@/components/ItemSpecificFields';
import CategoryInputField from '@/components/CategoryInputField';
import PageHeader from '@/components/layout/PageHeader';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function ItemDetailPage() {
  const t = useTranslations('itemDetail');
  const tSidebar = useTranslations('sidebar');
  const { id } = useParams();
  const router = useRouter();
  const itemId = id as string;
  const [item, setItem] = useState<any>(null);
  const [certifications, setCertifications] = useState<ItemCertification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showQr, setShowQr] = useState(false);

  const {
    showDeleteModal,
    entityToDelete,
    isDeleting,
    openDeleteModal,
    closeDeleteModal,
    handleDelete,
  } = useDeleteEntity(deleteItem, {
    entityName: t('deleteEntityName'),
    redirectPath: '/dashboard/items',
    onSuccess: () => {
      router.push('/dashboard/items');
    },
    onError: () => {
      alert(t('deleteError'));
    },
  });

  useEffect(() => {
    const load = async () => {
      if (!itemId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const [itemData, certificationData] = await Promise.all([
          getItem(itemId).catch(() => null),
          getItemCertifications(itemId).catch(() => []),
        ]);
        if (itemData) setItem(itemData);
        setCertifications(certificationData);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [itemId]);

  const openDeleteModalWithDetails = async () => {
    try {
      const detailedItem = await getItemDetails(itemId);
      setItem(detailedItem);
      openDeleteModal(detailedItem);
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
          href="/dashboard/items"
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
            <>
              <Button
                variant="default"
                size="xs"
                leftSection={<IconQrcode size={15} />}
                onClick={() => setShowQr(true)}
              >
                QR
              </Button>
              <Button
                variant="default"
                size="xs"
                leftSection={<IconExternalLink size={15} />}
                component="a"
                href={`/customer/item/${encodeURIComponent(itemId)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('passport')}
              </Button>
              <Button
                variant="light"
                color="red"
                size="xs"
                leftSection={<IconTrash size={15} />}
                onClick={openDeleteModalWithDetails}
              >
                {t('delete')}
              </Button>
            </>
          }
        >
          <Group gap="xs" mt="xs">
            <Badge
              variant="light"
              color={item.evidenceID ? 'green' : 'yellow'}
              leftSection={
                item.evidenceID ? <IconShieldCheck size={12} /> : <IconClock size={12} />
              }
            >
              {item.evidenceID ? t('certified') : t('pendingBackup')}
            </Badge>
            {item.categories?.map((c: { id: string; name: string }) => (
              <Badge key={c.id} size="sm" variant="light" color="gray">
                {c.name}
              </Badge>
            ))}
          </Group>
        </PageHeader>

        <Grid gutter="md">
          {/* ── Left column: info + certifications ── */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Stack gap="md">
              <Card>
                {item.itemTemplate && item.templateFields && (
                  <>
                    <ItemSpecificFields
                      itemTemplate={Array.isArray(item.itemTemplate) ? item.itemTemplate : []}
                      templateFields={item.templateFields || {}}
                    />
                    <Divider my="md" />
                  </>
                )}

                <CategoryInputField
                  itemId={itemId}
                  categories={item.categories || []}
                  onUpdate={(updatedCategories) => {
                    setItem((prev: any) => ({ ...prev, categories: updatedCategories }));
                  }}
                />
              </Card>

              {/* ── Certifications ── */}
              <Card>
                <Group gap="xs" mb="md">
                  <ThemeIcon color="datiaBlue" variant="light" size={28} radius="sm">
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
            </Stack>
          </Grid.Col>

          {/* ── Right column: image + summary ── */}
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

      <ItemQrModal
        show={showQr}
        onHide={() => setShowQr(false)}
        itemId={itemId}
        itemName={item?.name}
      />

    </>
  );
}
