'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  Alert,
  Badge,
  Button,
  Center,
  Group,
  Loader,
  Modal,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
} from '@mantine/core';
import {
  IconAlertTriangleFilled,
  IconBuilding,
  IconBuildingPlus,
  IconCircleCheck,
  IconInbox,
  IconInfoCircle,
  IconQuestionMark,
} from '@tabler/icons-react';
import PageHeader from '@/components/layout/PageHeader';
import { createOrganizationWithAdmin, listOrganizations, type OrganizationListItem } from '@/actions/organizations';

export default function OrganizationsPanel() {
  const t = useTranslations('superadminOrganizationsList');
  const locale = useLocale();
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>([]);
  const [form, setForm] = useState({ organizationName: '', adminName: '', adminEmail: '', language: 'es' as 'es' | 'en' });

  useEffect(() => {
    loadOrganizations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOrganizations = async () => {
    setLoadingList(true);
    try {
      const result = await listOrganizations();
      if (result.success && result.organizations) {
        setOrganizations(result.organizations);
      } else {
        setError(result.error || t('errors.load'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.unknown'));
    } finally {
      setLoadingList(false);
    }
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await createOrganizationWithAdmin({
        name: form.organizationName,
        adminName: form.adminName,
        adminEmail: form.adminEmail,
        language: form.language,
      });
      if (result.success) {
        setSuccess(t('success.body', { name: result.organization?.name ?? '', email: result.admin?.email ?? '' }));
        setForm({ organizationName: '', adminName: '', adminEmail: '', language: 'es' });
        setShowCreateModal(false);
        await loadOrganizations();
      } else {
        setError(result.error || t('errors.create'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.unknown'));
    } finally {
      setSaving(false);
    }
  };

  const dateOnly = (value: Date) =>
    new Date(value).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <>
      <PageHeader
        title={t('title')}
        actions={
          <Group gap="xs">
            <Button variant="light" color="gray" leftSection={<IconQuestionMark size={16} />} onClick={() => setShowHelpModal(true)}>
              {t('help.button')}
            </Button>
            <Button leftSection={<IconBuildingPlus size={16} />} onClick={() => setShowCreateModal(true)}>
              {t('create.button')}
            </Button>
          </Group>
        }
      />

      {success && (
        <Alert color="teal" variant="light" mb="md" withCloseButton onClose={() => setSuccess(null)} icon={<IconCircleCheck size={18} />} title={t('success.title')}>
          <Text size="sm" style={{ whiteSpace: 'pre-line' }}>{success}</Text>
        </Alert>
      )}

      {error && !showCreateModal && (
        <Alert color="red" variant="light" mb="md" withCloseButton onClose={() => setError(null)} icon={<IconAlertTriangleFilled size={16} />}>
          {error}
        </Alert>
      )}

      <Paper withBorder radius="md" p="md" mb="md">
        {loadingList ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <Loader />
              <Text size="sm" c="dimmed">{t('list.loading')}</Text>
            </Stack>
          </Center>
        ) : organizations.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="sm">
              <ThemeIcon color="gray" variant="light" size={48} radius="xl">
                <IconInbox size={24} stroke={1.5} />
              </ThemeIcon>
              <Text size="sm" c="dimmed">{t('list.empty')}</Text>
              <Button variant="light" onClick={() => setShowCreateModal(true)}>{t('list.createFirst')}</Button>
            </Stack>
          </Center>
        ) : (
          <ScrollArea>
            <Table striped highlightOnHover verticalSpacing="xs" miw={960}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('table.name')}</Table.Th>
                  <Table.Th>{t('table.slug')}</Table.Th>
                  <Table.Th ta="center">{t('table.accounts')}</Table.Th>
                  <Table.Th ta="center">{t('table.assets')}</Table.Th>
                  <Table.Th ta="center">{t('table.certifications')}</Table.Th>
                  <Table.Th ta="center">{t('table.adminActivated')}</Table.Th>
                  <Table.Th ta="center">{t('table.activeAccounts')}</Table.Th>
                  <Table.Th>{t('table.created')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {organizations.map((org) => (
                  <Table.Tr
                    key={org.id}
                    style={{ cursor: 'pointer' }}
                    title={t('table.doubleClickHint')}
                    onDoubleClick={() => router.push(`/superadmin/organizations/${org.id}`)}
                  >
                    <Table.Td>
                      <Text size="sm" fw={600}>{org.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text component="code" size="xs" c="dimmed">{org.slug}</Text>
                    </Table.Td>
                    <Table.Td ta="center">
                      <Badge variant="light" color="datiaBlue">{org.userCount}</Badge>
                      {org.pendingUsersCount > 0 && (
                        <Text size="xs" c="dimmed">{t('table.pending', { count: org.pendingUsersCount })}</Text>
                      )}
                    </Table.Td>
                    <Table.Td ta="center">
                      <Badge variant="light" color="datiaBlue">{org.itemCount}</Badge>
                    </Table.Td>
                    <Table.Td ta="center">
                      <Badge variant="light" color="yellow">{org.certificationCount}</Badge>
                    </Table.Td>
                    <Table.Td ta="center">
                      <Badge variant="light" color={org.adminActivated ? 'green' : 'yellow'}>
                        {org.adminActivated ? t('table.yes') : t('table.pendingAdmin')}
                      </Badge>
                    </Table.Td>
                    <Table.Td ta="center">
                      <Badge variant="light" color="green">{org.activeUsersCount}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">{dateOnly(org.createdAt)}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Paper>

      <Paper withBorder radius="md" p="md" style={{ borderColor: 'var(--mantine-color-datiaBlue-3)' }}>
        <Group gap="sm" mb="xs" wrap="nowrap">
          <ThemeIcon color="datiaBlue" variant="light" size={32} radius="md">
            <IconInfoCircle size={18} />
          </ThemeIcon>
          <div>
            <Text fw={600}>{t('info.title')}</Text>
            <Text size="sm" c="dimmed">{t('info.subtitle')}</Text>
          </div>
        </Group>
        <Text size="sm" mb="xs">
          <Text component="span" fw={600}>{t('info.questionLabel')}</Text> {t('info.answer')}
        </Text>
        <Text size="sm">
          <Text component="span" fw={600}>{t('info.exampleLabel')}</Text> {t('info.example')}
        </Text>
      </Paper>

      <Modal opened={showHelpModal} onClose={() => setShowHelpModal(false)} title={t('help.title')} size="lg">
        <Stack gap="md">
          <Alert color="datiaBlue" variant="light">{t('help.intro')}</Alert>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            {(['step1', 'step2', 'step3'] as const).map((step, i) => (
              <Paper key={step} withBorder radius="md" p="md">
                <Text size="xs" c="datiaBlue" fw={700} tt="uppercase" mb={4}>{t('help.stepLabel', { number: i + 1 })}</Text>
                <Text fw={600} size="sm" mb={4}>{t(`help.${step}.title`)}</Text>
                <Text size="sm" c="dimmed">{t(`help.${step}.body`)}</Text>
              </Paper>
            ))}
          </SimpleGrid>
          <Alert color="green" variant="light" title={t('help.autoEmailTitle')}>{t('help.autoEmail')}</Alert>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setShowHelpModal(false)}>{t('help.close')}</Button>
            <Button onClick={() => { setShowHelpModal(false); setShowCreateModal(true); }}>{t('help.understood')}</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={showCreateModal} onClose={() => setShowCreateModal(false)} title={t('create.title')} size="lg">
        <form onSubmit={handleCreate}>
          <Stack gap="md">
            <Alert color="datiaBlue" variant="light" icon={<IconInfoCircle size={16} />}>{t('create.tip')}</Alert>

            <Text fw={600} size="sm">{t('create.orgSection')}</Text>
            <TextInput
              label={t('create.nameLabel')}
              placeholder={t('create.namePlaceholder')}
              description={t('create.nameHelp')}
              value={form.organizationName}
              onChange={(e) => setForm({ ...form, organizationName: e.currentTarget.value })}
              required
            />

            <Text fw={600} size="sm" mt="xs">{t('create.adminSection')}</Text>
            <Text size="xs" c="dimmed" mt={-8}>{t('create.adminHelp')}</Text>
            <TextInput
              label={t('create.adminNameLabel')}
              value={form.adminName}
              onChange={(e) => setForm({ ...form, adminName: e.currentTarget.value })}
              required
            />
            <TextInput
              label={t('create.adminEmailLabel')}
              type="email"
              description={t('create.adminEmailHelp')}
              value={form.adminEmail}
              onChange={(e) => setForm({ ...form, adminEmail: e.currentTarget.value })}
              required
            />
            <Select
              label={t('create.languageLabel')}
              data={[{ value: 'es', label: t('create.languageEs') }, { value: 'en', label: t('create.languageEn') }]}
              value={form.language}
              onChange={(value) => setForm({ ...form, language: (value as 'es' | 'en') ?? 'es' })}
              allowDeselect={false}
            />

            {error && showCreateModal && (
              <Alert color="red" variant="light" icon={<IconAlertTriangleFilled size={16} />}>{error}</Alert>
            )}

            <Group justify="flex-end" gap="xs">
              <Button variant="default" onClick={() => setShowCreateModal(false)} disabled={saving}>{t('create.cancel')}</Button>
              <Button type="submit" loading={saving} leftSection={<IconBuilding size={16} />}>
                {saving ? t('create.submitting') : t('create.submit')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
