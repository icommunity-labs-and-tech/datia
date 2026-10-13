'use client';

import { useState } from 'react';
import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Button,
  Center,
  Code,
  CopyButton,
  Group,
  Modal,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangleFilled,
  IconBuilding,
  IconCheck,
  IconCopy,
  IconLock,
  IconLockOpen,
  IconPlus,
  IconTrash,
  IconUserPlus,
} from '@tabler/icons-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import { listCompanies, type CompanySummary } from '@/actions/companies/list';
import { createCompany, type CompanyError } from '@/actions/companies/create';
import { inviteCompanyAccount } from '@/actions/companies/invite';
import { setCompanyBlocked } from '@/actions/companies/block';
import { deleteCompany } from '@/actions/companies/delete';

interface CompaniesPanelProps {
  initial: CompanySummary[];
}

type Dialog = { kind: 'create' } | { kind: 'invite'; company: CompanySummary } | { kind: 'delete'; company: CompanySummary } | null;

export default function CompaniesPanel({ initial }: CompaniesPanelProps) {
  const t = useTranslations('companiesPage');
  const tCommon = useTranslations('common.actions');
  const locale = useLocale();
  const language = locale === 'en' ? 'en' : 'es';

  const [companies, setCompanies] = useState(initial);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [name, setName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activationLink, setActivationLink] = useState<string | null>(null);
  const [blockingId, setBlockingId] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const reload = async () => setCompanies(await listCompanies());

  const close = () => {
    setDialog(null);
    setName('');
    setAccountName('');
    setAccountEmail('');
    setDeleteConfirmText('');
    setError(null);
  };

  const message = (code: CompanyError | undefined, detail?: string) => {
    const known: Record<CompanyError, string> = {
      name_required: t('errors.nameRequired'),
      name_taken: t('errors.nameTaken'),
      email_invalid: t('errors.emailInvalid'),
      invite_failed: detail ? t('errors.inviteFailedDetail', { detail }) : t('errors.inviteFailed'),
      forbidden: t('errors.forbidden'),
      failed: t('errors.failed'),
    };
    return known[code ?? 'failed'];
  };

  const submitCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setActivationLink(null);
    try {
      const result = await createCompany({
        name,
        admin: { name: accountName, email: accountEmail, language },
      });
      if (!result.success) {
        setError(message(result.error));
        return;
      }
      await reload();
      if (result.activationUrl) {
        setNotice(t('notice.createdNoEmail', { name: result.company!.name, email: accountEmail.trim() }));
        setActivationLink(result.activationUrl);
      } else {
        setNotice(
          result.inviteError
            ? t('notice.createdWithoutInviteDetail', { name: result.company!.name, detail: result.inviteError })
            : accountEmail.trim()
              ? t('notice.createdAndInvited', { name: result.company!.name, email: accountEmail.trim() })
              : t('notice.created', { name: result.company!.name })
        );
      }
      close();
    } catch {
      setError(t('errors.failed'));
    } finally {
      setSaving(false);
    }
  };

  const submitInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (dialog?.kind !== 'invite') return;
    setSaving(true);
    setError(null);
    setActivationLink(null);
    try {
      const result = await inviteCompanyAccount({
        companyId: dialog.company.id,
        name: accountName,
        email: accountEmail,
        language,
      });
      if (!result.success) {
        setError(message(result.error, result.detail));
        return;
      }
      await reload();
      if (result.activationUrl) {
        setNotice(t('notice.invitedNoEmail', { email: accountEmail.trim(), name: dialog.company.name }));
        setActivationLink(result.activationUrl);
      } else {
        setNotice(t('notice.invited', { email: accountEmail.trim(), name: dialog.company.name }));
      }
      close();
    } catch {
      setError(t('errors.failed'));
    } finally {
      setSaving(false);
    }
  };

  const toggleBlocked = async (company: CompanySummary) => {
    setBlockingId(company.id);
    setError(null);
    try {
      const result = await setCompanyBlocked(company.id, company.active);
      if (!result.success) {
        setError(result.error ?? t('block.failed'));
        return;
      }
      await reload();
      setActivationLink(null);
      setNotice(company.active ? t('block.blockedNotice', { name: company.name }) : t('block.unblockedNotice', { name: company.name }));
    } catch {
      setError(t('block.failed'));
    } finally {
      setBlockingId(null);
    }
  };

  const submitDelete = async (event: React.FormEvent) => {
    event.preventDefault();
    if (dialog?.kind !== 'delete') return;
    setSaving(true);
    setError(null);
    try {
      const result = await deleteCompany(dialog.company.id);
      if (!result.success) {
        setError(result.error ?? t('delete.failed'));
        return;
      }
      const name = dialog.company.name;
      await reload();
      setActivationLink(null);
      setNotice(t('delete.deletedNotice', { name }));
      close();
    } catch {
      setError(t('delete.failed'));
    } finally {
      setSaving(false);
    }
  };

  const errorAlert = error && (
    <Alert color="red" variant="light" icon={<IconAlertTriangleFilled size={16} />}>
      {error}
    </Alert>
  );

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => setDialog({ kind: 'create' })}>
            {t('newCompany')}
          </Button>
        }
      />

      {notice && (
        <Alert
          color={activationLink ? 'yellow' : 'teal'}
          variant="light"
          mb="md"
          withCloseButton
          onClose={() => { setNotice(null); setActivationLink(null); }}
        >
          <Text size="sm" mb={activationLink ? 'xs' : 0}>{notice}</Text>
          {activationLink && (
            <Group gap="xs" wrap="nowrap" align="flex-start">
              <Code block style={{ flex: 1, wordBreak: 'break-all' }}>{activationLink}</Code>
              <CopyButton value={activationLink} timeout={2000}>
                {({ copied, copy }) => (
                  <Button
                    variant={copied ? 'light' : 'default'}
                    color={copied ? 'green' : undefined}
                    size="xs"
                    onClick={copy}
                    leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                    style={{ flexShrink: 0 }}
                  >
                    {tCommon('copy')}
                  </Button>
                )}
              </CopyButton>
            </Group>
          )}
        </Alert>
      )}

      <Paper withBorder radius="md" p="md">
        {companies.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="sm">
              <ThemeIcon color="gray" variant="light" size={48} radius="xl">
                <IconBuilding size={24} stroke={1.5} />
              </ThemeIcon>
              <Text size="sm" c="dimmed">{t('empty')}</Text>
            </Stack>
          </Center>
        ) : (
          <ScrollArea>
            <Table striped highlightOnHover verticalSpacing="xs" miw={640}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('table.name')}</Table.Th>
                  <Table.Th ta="right">{t('table.assets')}</Table.Th>
                  <Table.Th ta="right">{t('table.accounts')}</Table.Th>
                  <Table.Th>{t('table.created')}</Table.Th>
                  <Table.Th>{t('table.status')}</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {companies.map((company) => (
                  <Table.Tr key={company.id}>
                    <Table.Td>
                      <Anchor component={Link} href={`/organization/companies/${company.id}`} size="sm" fw={550}>
                        {company.name}
                      </Anchor>
                    </Table.Td>
                    <Table.Td ta="right"><Text size="sm">{company.assets}</Text></Table.Td>
                    <Table.Td ta="right"><Text size="sm">{company.accounts}</Text></Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">{new Date(company.createdAt).toLocaleDateString(locale)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="sm" variant="light" color={company.active ? 'green' : 'gray'}>
                        {company.active ? t('active') : t('inactive')}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} wrap="nowrap" justify="flex-end">
                        <Tooltip label={t('inviteAccount')}>
                          <ActionIcon
                            variant="subtle"
                            size="sm"
                            aria-label={t('inviteAccountFor', { name: company.name })}
                            onClick={() => setDialog({ kind: 'invite', company })}
                          >
                            <IconUserPlus size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label={company.active ? t('block.blockTooltip') : t('block.unblockTooltip')}>
                          <ActionIcon
                            variant="subtle"
                            color={company.active ? undefined : 'yellow'}
                            size="sm"
                            loading={blockingId === company.id}
                            aria-label={company.active ? t('block.blockTooltip') : t('block.unblockTooltip')}
                            onClick={() => toggleBlocked(company)}
                          >
                            {company.active ? <IconLock size={16} /> : <IconLockOpen size={16} />}
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label={t('delete.tooltip')}>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            aria-label={t('delete.tooltip')}
                            onClick={() => setDialog({ kind: 'delete', company })}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Paper>

      <Modal opened={dialog?.kind === 'create'} onClose={close} title={t('create.title')} centered>
        <form onSubmit={submitCreate}>
          <Stack gap="md">
            {errorAlert}
            <TextInput
              label={t('create.nameLabel')}
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              data-autofocus
            />
            <Text size="sm" fw={600} mt="xs">{t('create.accountTitle')}</Text>
            <Text size="xs" c="dimmed" mt={-8}>{t('create.accountHelp')}</Text>
            <TextInput
              label={t('accountNameLabel')}
              value={accountName}
              onChange={(e) => setAccountName(e.currentTarget.value)}
            />
            <TextInput
              label={t('accountEmailLabel')}
              type="email"
              value={accountEmail}
              onChange={(e) => setAccountEmail(e.currentTarget.value)}
            />
            <Group justify="flex-end" gap="xs">
              <Button variant="default" onClick={close} disabled={saving}>{tCommon('cancel')}</Button>
              <Button type="submit" loading={saving}>{t('create.submit')}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={dialog?.kind === 'invite'}
        onClose={close}
        title={dialog?.kind === 'invite' ? t('invite.title', { name: dialog.company.name }) : ''}
        centered
      >
        <form onSubmit={submitInvite}>
          <Stack gap="md">
            {errorAlert}
            <TextInput
              label={t('accountNameLabel')}
              value={accountName}
              onChange={(e) => setAccountName(e.currentTarget.value)}
              data-autofocus
            />
            <TextInput
              label={t('accountEmailLabel')}
              type="email"
              value={accountEmail}
              onChange={(e) => setAccountEmail(e.currentTarget.value)}
            />
            <Group justify="flex-end" gap="xs">
              <Button variant="default" onClick={close} disabled={saving}>{tCommon('cancel')}</Button>
              <Button type="submit" loading={saving}>{t('invite.submit')}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={dialog?.kind === 'delete'}
        onClose={close}
        title={dialog?.kind === 'delete' ? t('delete.title', { name: dialog.company.name }) : ''}
        centered
      >
        <form onSubmit={submitDelete}>
          <Stack gap="md">
            {errorAlert}
            <Alert color="red" variant="light" icon={<IconAlertTriangleFilled size={16} />}>
              {t('delete.warning')}
            </Alert>
            <TextInput
              label={dialog?.kind === 'delete' ? t('delete.confirmLabel', { name: dialog.company.name }) : ''}
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.currentTarget.value)}
              data-autofocus
            />
            <Group justify="flex-end" gap="xs">
              <Button variant="default" onClick={close} disabled={saving}>{tCommon('cancel')}</Button>
              <Button
                type="submit"
                color="red"
                loading={saving}
                disabled={dialog?.kind === 'delete' && deleteConfirmText.trim() !== dialog.company.name}
              >
                {t('delete.submit')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
