'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  ThemeIcon,
  Title,
  Grid,
  Center,
} from '@mantine/core';
import {
  IconAlertTriangleFilled,
  IconArrowLeft,
  IconBuilding,
  IconCertificate,
  IconPackage,
  IconTrash,
  IconUsers,
} from '@tabler/icons-react';
import PageHeader from '@/components/layout/PageHeader';
import { getOrganizationById, deleteOrganization, type OrganizationDetail } from '@/actions/organizations';
import { updateOrgModules } from '@/actions/organizations/update-modules';
import { listCompaniesForOrganization } from '@/actions/companies/superadmin';
import type { CompanySummary } from '@/actions/companies/list';

interface OrganizationDetailPanelProps {
  organizationId: string;
}

export default function OrganizationDetailPanel({ organizationId }: OrganizationDetailPanelProps) {
  const t = useTranslations('superadminOrganizationDetail');
  const tCompanies = useTranslations('superadminOrganization.companies');
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organization, setOrganization] = useState<OrganizationDetail | null>(null);
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [savingModules, setSavingModules] = useState(false);

  useEffect(() => {
    loadOrganization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const loadOrganization = async () => {
    setLoading(true);
    setError(null);
    try {
      const [result, companyList] = await Promise.all([
        getOrganizationById(organizationId),
        listCompaniesForOrganization(organizationId),
      ]);
      if (result.success && result.organization) {
        setOrganization(result.organization);
        setCompanies(companyList);
      } else {
        setError(result.error || t('errors.load'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.unknown'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!organization) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const result = await deleteOrganization(organization.id);
      if (result.success) {
        router.push('/superadmin/organizations');
      } else {
        setDeleteError(result.error || t('errors.delete'));
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('errors.unknown'));
    } finally {
      setDeleting(false);
    }
  };

  const toggleModule = async (mod: 'passport' | 'energy', enabled: boolean) => {
    if (!organization) return;
    setSavingModules(true);
    await updateOrgModules(organization.id, { [mod]: enabled });
    await loadOrganization();
    setSavingModules(false);
  };

  const dateTime = (value: Date) =>
    new Date(value).toLocaleString(locale, { dateStyle: 'long', timeStyle: 'short' });

  const backLink = (
    <Anchor
      component={Link}
      href="/superadmin/organizations"
      size="sm"
      mb="xs"
      display="inline-flex"
      style={{ alignItems: 'center', gap: 6 }}
    >
      <IconArrowLeft size={14} />
      {t('back')}
    </Anchor>
  );

  if (loading) {
    return (
      <Center py="xl">
        <Stack align="center" gap="xs">
          <Loader />
          <Text size="sm" c="dimmed">{t('loading')}</Text>
        </Stack>
      </Center>
    );
  }

  if (error || !organization) {
    return (
      <>
        {backLink}
        <Alert color={error ? 'red' : 'yellow'} variant="light" title={error ? t('errors.title') : t('notFound.title')}>
          <Stack gap="sm">
            {error ?? t('notFound.description')}
            <Group>
              <Button variant="default" size="xs" onClick={() => router.push('/superadmin/organizations')}>
                {t('back')}
              </Button>
            </Group>
          </Stack>
        </Alert>
      </>
    );
  }

  const modules = organization.settings?.modules ?? {};
  const moduleEnabled = (mod: 'passport' | 'energy') =>
    modules[mod] !== undefined ? modules[mod] : mod === 'passport';

  const stats = [
    { icon: IconUsers, label: t('stats.accounts'), value: organization.userCount, detail: t('stats.accountsDetail', { active: organization.activeUsersCount, pending: organization.pendingUsersCount }) },
    { icon: IconPackage, label: t('stats.assets'), value: organization.itemCount },
    { icon: IconCertificate, label: t('stats.certifications'), value: organization.certificationCount },
  ];

  return (
    <>
      {backLink}

      <PageHeader
        title={organization.name}
        actions={
          <Button
            color="red"
            variant="light"
            size="xs"
            leftSection={<IconTrash size={15} />}
            onClick={() => setShowDeleteModal(true)}
          >
            {t('delete')}
          </Button>
        }
      />

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="md">
        {stats.map(({ icon: Icon, label, value, detail }) => (
          <Paper key={label} withBorder radius="md" p="md">
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <ThemeIcon color="datiaBlue" variant="light" size={36} radius="md">
                <Icon size={18} stroke={1.6} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{label}</Text>
                <Title order={3}>{value}</Title>
                {detail && <Text size="xs" c="dimmed">{detail}</Text>}
              </div>
            </Group>
          </Paper>
        ))}
      </SimpleGrid>

      <Grid gutter="md" mb="md">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper withBorder radius="md" p="md" h="100%">
            <Title order={5} mb="sm">{t('info.title')}</Title>
            <Stack gap={6}>
              <InfoRow label={t('info.name')} value={organization.name} />
              <InfoRow label={t('info.slug')} value={<Text component="code" size="sm">{organization.slug}</Text>} />
              <InfoRow
                label={t('info.status')}
                value={
                  <Badge variant="light" color={organization.active ? 'green' : 'gray'}>
                    {organization.active ? t('info.active') : t('info.inactive')}
                  </Badge>
                }
              />
              {organization.domain && (
                <InfoRow label={t('info.domain')} value={<Text component="code" size="sm">{organization.domain}</Text>} />
              )}
              <InfoRow label={t('info.created')} value={dateTime(organization.createdAt)} />
              <InfoRow label={t('info.updated')} value={dateTime(organization.updatedAt)} />
            </Stack>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper withBorder radius="md" p="md" h="100%">
            <Title order={5} mb="sm">{t('admin.title')}</Title>
            {organization.adminName ? (
              <Stack gap={6}>
                <InfoRow label={t('admin.name')} value={organization.adminName} />
                <InfoRow label={t('admin.email')} value={organization.adminEmail} />
                <InfoRow
                  label={t('admin.activation')}
                  value={
                    <Badge variant="light" color={organization.adminActivated ? 'green' : 'yellow'}>
                      {organization.adminActivated ? t('admin.activated') : t('admin.pending')}
                    </Badge>
                  }
                />
              </Stack>
            ) : (
              <Text size="sm" c="dimmed">{t('admin.none')}</Text>
            )}
          </Paper>
        </Grid.Col>
      </Grid>

      <Paper withBorder radius="md" p="md" mb="md">
        <Group gap="xs" mb="sm">
          <ThemeIcon color="datiaBlue" variant="light" size={24} radius="sm">
            <IconBuilding size={14} />
          </ThemeIcon>
          <Title order={5}>{tCompanies('title')}</Title>
        </Group>
        {companies.length === 0 ? (
          <Text size="sm" c="dimmed" py="md">{tCompanies('empty')}</Text>
        ) : (
          <ScrollArea>
            <Table striped verticalSpacing="xs" miw={640}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{tCompanies('name')}</Table.Th>
                  <Table.Th ta="right">{tCompanies('assets')}</Table.Th>
                  <Table.Th ta="right">{tCompanies('accounts')}</Table.Th>
                  <Table.Th>{tCompanies('created')}</Table.Th>
                  <Table.Th>{tCompanies('status')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {companies.map((company) => (
                  <Table.Tr key={company.id}>
                    <Table.Td>
                      <Anchor component={Link} href={`/superadmin/organizations/${organizationId}/companies/${company.id}`} size="sm" fw={550}>
                        {company.name}
                      </Anchor>
                    </Table.Td>
                    <Table.Td ta="right"><Text size="sm">{company.assets}</Text></Table.Td>
                    <Table.Td ta="right"><Text size="sm">{company.accounts}</Text></Table.Td>
                    <Table.Td><Text size="sm" c="dimmed">{new Date(company.createdAt).toLocaleDateString(locale)}</Text></Table.Td>
                    <Table.Td>
                      <Badge size="sm" variant="light" color={company.active ? 'green' : 'gray'}>
                        {company.active ? tCompanies('active') : tCompanies('inactive')}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Paper>

      <Paper withBorder radius="md" p="md">
        <Title order={5} mb="sm">{t('modules.title')}</Title>
        <Stack gap="sm">
          <Switch
            label={t('modules.passport')}
            checked={moduleEnabled('passport')}
            disabled={savingModules}
            onChange={(e) => toggleModule('passport', e.currentTarget.checked)}
          />
          <Switch
            label={t('modules.energy')}
            checked={moduleEnabled('energy')}
            disabled={savingModules}
            onChange={(e) => toggleModule('energy', e.currentTarget.checked)}
          />
        </Stack>
      </Paper>

      <Modal
        opened={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={t('deleteModal.title')}
        centered
      >
        <Stack gap="md">
          {deleteError && (
            <Alert color="red" variant="light" withCloseButton onClose={() => setDeleteError(null)}>
              {deleteError}
            </Alert>
          )}
          <Text size="sm">{t('deleteModal.question', { name: organization.name })}</Text>
          <Alert color="red" variant="light" icon={<IconAlertTriangleFilled size={16} />} title={t('deleteModal.warningTitle')}>
            <Text size="sm" mb="xs">{t('deleteModal.warningBody')}</Text>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li><Text size="sm">{t('deleteModal.items.companies')}</Text></li>
              <li><Text size="sm">{t('deleteModal.items.assets')}</Text></li>
              <li><Text size="sm">{t('deleteModal.items.energy')}</Text></li>
            </ul>
          </Alert>
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
              {t('deleteModal.cancel')}
            </Button>
            <Button color="red" onClick={handleDelete} loading={deleting}>
              {t('deleteModal.confirm')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="md">
      <Text size="sm" c="dimmed">{label}</Text>
      {typeof value === 'string' ? <Text size="sm" ta="right">{value}</Text> : value}
    </Group>
  );
}
