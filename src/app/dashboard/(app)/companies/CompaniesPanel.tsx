'use client';

import { useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Center,
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
import { IconAlertTriangleFilled, IconBuilding, IconPlus, IconUserPlus } from '@tabler/icons-react';
import { useLocale, useTranslations } from 'next-intl';
import PageHeader from '@/components/layout/PageHeader';
import { listCompanies, type CompanySummary } from '@/actions/companies/list';
import { createCompany, type CompanyError } from '@/actions/companies/create';
import { inviteCompanyAccount } from '@/actions/companies/invite';

interface CompaniesPanelProps {
  initial: CompanySummary[];
}

type Dialog = { kind: 'create' } | { kind: 'invite'; company: CompanySummary } | null;

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

  const reload = async () => setCompanies(await listCompanies());

  const close = () => {
    setDialog(null);
    setName('');
    setAccountName('');
    setAccountEmail('');
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
      setNotice(
        result.inviteError
          ? t('notice.createdWithoutInvite', { name: result.company!.name })
          : accountEmail.trim()
            ? t('notice.createdAndInvited', { name: result.company!.name, email: accountEmail.trim() })
            : t('notice.created', { name: result.company!.name })
      );
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
      setNotice(t('notice.invited', { email: accountEmail.trim(), name: dialog.company.name }));
      close();
    } catch {
      setError(t('errors.failed'));
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
        <Alert color="teal" variant="light" mb="md" withCloseButton onClose={() => setNotice(null)}>
          {notice}
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
                    <Table.Td><Text size="sm" fw={550}>{company.name}</Text></Table.Td>
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
    </>
  );
}
