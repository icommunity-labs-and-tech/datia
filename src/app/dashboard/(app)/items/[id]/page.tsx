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
  IconPlus,
  IconFlag,
  IconMapPin,
  IconInfoCircle,
  IconShieldCheck,
  IconClock,
  IconArrowLeft,
} from '@tabler/icons-react';
import { getItem, deleteItem, getItemDetails } from '@/actions/items';
import { getStatesByItem } from '@/actions/states';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import { useDeleteEntity } from '@/hooks/useDeleteEntity';
import { getCascadeInfo } from '@/config/entityConfig';
import ItemQrModal from '@/components/ItemQrModal';
import ImageDisplay from '@/components/ImageDisplay';
import ItemSpecificFields from '@/components/ItemSpecificFields';
import ItemStatesMap from '@/components/ItemStatesMapClient';
import CategoryInputField from '@/components/CategoryInputField';
import AddStateForm from '@/components/AddStateForm';
import PageHeader from '@/components/layout/PageHeader';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface StateRow {
  id: string;
  title?: string | null;
  description?: string | null;
  createdAt: string | Date;
  backed?: boolean | null;
  templateConfig?: unknown;
  statusType?: { id?: string; name?: string; description?: string | null } | null;
}

function stateHasGeolocation(state: StateRow): boolean {
  let config = state.templateConfig;
  if (!config) return false;
  if (typeof config === 'string') {
    try {
      config = JSON.parse(config);
    } catch {
      return false;
    }
  }
  return Object.values(config as Record<string, unknown>).some(
    (value) =>
      value != null &&
      typeof value === 'object' &&
      'lat' in value &&
      'lng' in value &&
      typeof (value as { lat: unknown }).lat === 'number' &&
      typeof (value as { lng: unknown }).lng === 'number'
  );
}

export default function ItemDetailPage() {
  const t = useTranslations('itemDetail');
  const tSidebar = useTranslations('sidebar');
  const { id } = useParams();
  const router = useRouter();
  const itemId = id as string;
  const [item, setItem] = useState<any>(null);
  const [states, setStates] = useState<StateRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showQr, setShowQr] = useState(false);
  const [showAddStateModal, setShowAddStateModal] = useState(false);

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
        const [itemData, statesData] = await Promise.all([
          getItem(itemId).catch(() => null),
          getStatesByItem(itemId).catch(() => []),
        ]);
        if (itemData) setItem(itemData);
        if (statesData) setStates(statesData as StateRow[]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [itemId]);

  const reloadStates = async () => {
    setShowAddStateModal(false);
    try {
      const statesData = await getStatesByItem(itemId);
      setStates(statesData as StateRow[]);
    } catch {
      /* keep previous states on reload failure */
    }
  };

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
  const hasGeolocation = states.some(stateHasGeolocation);
  const backedCount = states.filter((s) => s.backed).length;

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
          {/* ── Left column: info + states ── */}
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

              {/* ── States timeline ── */}
              <Card>
                <Group justify="space-between" mb="md">
                  <Group gap="xs">
                    <ThemeIcon color="datiaBlue" variant="light" size={28} radius="sm">
                      <IconFlag size={16} />
                    </ThemeIcon>
                    <Title order={5}>{t('productStates')}</Title>
                  </Group>
                  <Button
                    size="xs"
                    leftSection={<IconPlus size={15} />}
                    onClick={() => setShowAddStateModal(true)}
                  >
                    {t('addState')}
                  </Button>
                </Group>

                {states.length === 0 ? (
                  <Text size="sm" c="dimmed" ta="center" py="lg">{t('noStates')}</Text>
                ) : (
                  <Timeline
                    active={states.length}
                    bulletSize={26}
                    lineWidth={2}
                    color="datiaBlue"
                  >
                    {states.map((state) => (
                      <Timeline.Item
                        key={state.id}
                        bullet={
                          state.backed
                            ? <IconShieldCheck size={14} />
                            : <IconClock size={14} />
                        }
                        color={state.backed ? 'green' : 'datiaBlue'}
                        title={
                          <Group gap={6} wrap="wrap">
                            <Text
                              fw={600}
                              size="sm"
                              style={{ cursor: 'pointer' }}
                              onClick={() => router.push(`/dashboard/states/${state.id}`)}
                            >
                              {state.title || state.statusType?.name || '—'}
                            </Text>
                            {state.statusType?.name && (
                              <Badge size="xs" color="datiaBlue" variant="light">
                                {state.statusType.name}
                              </Badge>
                            )}
                            <Badge
                              size="xs"
                              color={state.backed ? 'green' : 'yellow'}
                              variant="dot"
                            >
                              {state.backed ? t('certified') : t('pendingBackup')}
                            </Badge>
                          </Group>
                        }
                      >
                        {state.description && (
                          <Text size="sm" c="dimmed" lineClamp={2}>{state.description}</Text>
                        )}
                        <Text size="xs" c="dimmed" mt={4}>
                          {new Date(state.createdAt).toLocaleString()}
                        </Text>
                      </Timeline.Item>
                    ))}
                  </Timeline>
                )}
              </Card>

              {/* ── Geotracking map ── */}
              {hasGeolocation && (
                <Card>
                  <Group gap="xs" mb="md">
                    <ThemeIcon color="datiaBlue" variant="light" size={28} radius="sm">
                      <IconMapPin size={16} />
                    </ThemeIcon>
                    <Title order={5}>{t('geotracking')}</Title>
                  </Group>
                  <ItemStatesMap states={states as any} />
                </Card>
              )}
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
                    <Text size="sm" c="dimmed">{t('totalStates')}</Text>
                    <Text size="sm" fw={600}>{states.length}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">{t('certifiedStates')}</Text>
                    <Text size="sm" fw={600} c={backedCount > 0 ? 'green' : undefined}>
                      {backedCount}
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

      {item && (
        <AddStateForm
          item={item}
          itemId={itemId}
          show={showAddStateModal}
          onHide={() => setShowAddStateModal(false)}
          onSuccess={reloadStates}
          onStateCreated={reloadStates}
        />
      )}
    </>
  );
}
