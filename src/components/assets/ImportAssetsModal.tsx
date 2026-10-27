'use client';

import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  FileButton,
  Group,
  Loader,
  Modal,
  Progress,
  ScrollArea,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import { IconAlertCircle, IconCheck, IconDownload, IconFileUpload } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { previewAssetsCsv, importAssetsBatch, type ImportAssetOutcome } from '@/actions/assets/importCsv';
import {
  assetCsvTemplate,
  IMPORT_BATCH_SIZE,
  MAX_ASSET_CSV_LENGTH,
  type AssetCsvResult,
  type AssetIssue,
  type FileIssue,
} from '@/lib/import/assets-csv';

type Step = 'pick' | 'reading' | 'review' | 'running' | 'done';

function downloadTemplate() {
  // The BOM makes Excel read the accents as UTF-8.
  const blob = new Blob(['﻿' + assetCsvTemplate()], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla-activos.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportAssetsModal({
  opened,
  onClose,
  onImported,
}: {
  opened: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const t = useTranslations('itemsPage.import');
  const [step, setStep] = useState<Step>('pick');
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<AssetCsvResult | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [outcomes, setOutcomes] = useState<ImportAssetOutcome[]>([]);
  const [stopReason, setStopReason] = useState<string | null>(null);

  const reset = () => {
    setStep('pick');
    setFileName('');
    setResult(null);
    setReadError(null);
    setOutcomes([]);
    setStopReason(null);
  };

  const close = () => {
    if (step === 'running') return;
    if (step === 'done') onImported();
    reset();
    onClose();
  };

  const issueText = (issue: AssetIssue) => {
    const field = t(`fields.${issue.field}`);
    switch (issue.code) {
      case 'required':
        return t('issues.required', { field });
      case 'duplicate_id':
        return t('issues.duplicate_id', { line: issue.firstLine });
      case 'id_taken':
        return t('issues.id_taken');
      case 'invalid_number':
        return t('issues.invalid_number', { field, value: issue.value });
      case 'out_of_range':
        return t('issues.out_of_range', { field, value: issue.value });
      case 'partial_coordinates':
        return t('issues.partial_coordinates');
      case 'unknown_municipality':
        return t('issues.unknown_municipality', { value: issue.value });
      case 'ambiguous_municipality':
        return t('issues.ambiguous_municipality', { value: issue.value, provinces: issue.provinces.join(', ') });
    }
  };

  const fileIssueText = (issue: FileIssue) => {
    switch (issue.code) {
      case 'empty':
        return t('fileIssues.empty');
      case 'too_large':
        return t('fileIssues.too_large');
      case 'missing_columns':
        return t('fileIssues.missing_columns', { columns: issue.columns.join(', ') });
      case 'too_many_rows':
        return t('fileIssues.too_many_rows', { rows: issue.rows, max: issue.max });
    }
  };

  const onFile = async (file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    setReadError(null);
    if (file.size > MAX_ASSET_CSV_LENGTH) {
      setResult({ fileIssues: [{ code: 'too_large' }], rows: [] });
      setStep('review');
      return;
    }
    setStep('reading');
    try {
      setResult(await previewAssetsCsv(await file.text()));
      setStep('review');
    } catch {
      setReadError(t('readError'));
      setStep('pick');
    }
  };

  const valid = result?.rows.filter((r) => r.issues.length === 0) ?? [];
  const withIssues = result?.rows.filter((r) => r.issues.length > 0) ?? [];

  const run = async () => {
    setStep('running');
    setProgress({ done: 0, total: valid.length });
    const all: ImportAssetOutcome[] = [];
    for (let i = 0; i < valid.length; i += IMPORT_BATCH_SIZE) {
      const batch = valid.slice(i, i + IMPORT_BATCH_SIZE).map(({ id, name, description, latitude, longitude }) => ({
        id,
        name,
        description,
        latitude,
        longitude,
      }));
      try {
        const res = await importAssetsBatch(batch);
        all.push(...res.outcomes);
        setOutcomes([...all]);
        setProgress({ done: Math.min(i + batch.length, valid.length), total: valid.length });
        if (res.stop) {
          setStopReason(res.stop);
          break;
        }
      } catch {
        setStopReason(t('networkError'));
        break;
      }
    }
    setStep('done');
  };

  const created = outcomes.filter((o) => o.ok).length;
  // The row that stopped the import is explained by the stop message itself.
  const failed = outcomes.filter((o) => !o.ok && o.error !== stopReason);
  const notImported = progress.total - created - failed.length;

  return (
    <Modal
      opened={opened}
      onClose={close}
      title={t('title')}
      size="lg"
      centered
      closeOnClickOutside={step !== 'running'}
      closeOnEscape={step !== 'running'}
      withCloseButton={step !== 'running'}
    >
      {(step === 'pick' || step === 'reading') && (
        <Stack gap="md">
          <Text size="sm" c="dimmed">{t('intro')}</Text>
          <Group gap="xs">
            <FileButton onChange={onFile} accept=".csv,text/csv">
              {(props) => (
                <Button {...props} leftSection={<IconFileUpload size={16} />} loading={step === 'reading'}>
                  {t('choose')}
                </Button>
              )}
            </FileButton>
            <Button variant="default" leftSection={<IconDownload size={16} />} onClick={downloadTemplate}>
              {t('template')}
            </Button>
          </Group>
          {step === 'reading' && (
            <Group gap="xs">
              <Loader size="xs" />
              <Text size="sm" c="dimmed">{t('reading', { file: fileName })}</Text>
            </Group>
          )}
          {readError && <Alert color="red" icon={<IconAlertCircle size={16} />}>{readError}</Alert>}
        </Stack>
      )}

      {step === 'review' && result && (
        <Stack gap="md">
          <Text size="sm" fw={500}>{fileName}</Text>
          {result.fileIssues.length > 0 ? (
            <Alert color="red" icon={<IconAlertCircle size={16} />}>
              {result.fileIssues.map((issue) => (
                <Text key={issue.code} size="sm">{fileIssueText(issue)}</Text>
              ))}
            </Alert>
          ) : (
            <>
              <Group gap="xs">
                <Badge color="green" variant="light" size="lg">{t('ready', { count: valid.length })}</Badge>
                {withIssues.length > 0 && (
                  <Badge color="red" variant="light" size="lg">{t('withIssues', { count: withIssues.length })}</Badge>
                )}
              </Group>

              {withIssues.length > 0 && (
                <Stack gap={4}>
                  <Text size="sm" fw={600}>{t('issuesTitle')}</Text>
                  <ScrollArea.Autosize mah={180} type="auto">
                    <Table fz="xs" verticalSpacing={4}>
                      <Table.Tbody>
                        {withIssues.map((row) => (
                          <Table.Tr key={row.line}>
                            <Table.Td c="dimmed" w={80}>{t('line', { line: row.line })}</Table.Td>
                            <Table.Td w={120} ff="monospace">{row.id || '—'}</Table.Td>
                            <Table.Td>{row.issues.map(issueText).join(' · ')}</Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea.Autosize>
                </Stack>
              )}

              {valid.length > 0 && (
                <Stack gap={4}>
                  <Text size="sm" fw={600}>{t('previewTitle')}</Text>
                  <ScrollArea.Autosize mah={220} type="auto">
                    <Table fz="xs" verticalSpacing={4} striped>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>{t('columns.id')}</Table.Th>
                          <Table.Th>{t('columns.name')}</Table.Th>
                          <Table.Th>{t('columns.place')}</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {valid.map((row) => (
                          <Table.Tr key={row.line}>
                            <Table.Td ff="monospace">{row.id}</Table.Td>
                            <Table.Td>{row.name}</Table.Td>
                            <Table.Td>
                              {row.locatedBy ? (
                                <>
                                  {row.municipality ?? t('outsideSpain')}
                                  <Text span c="dimmed" fz="xs"> · {t(`located.${row.locatedBy}`)}</Text>
                                </>
                              ) : (
                                <Text span c="dimmed" fz="xs">{t('located.none')}</Text>
                              )}
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea.Autosize>
                </Stack>
              )}
            </>
          )}

          <Group justify="space-between">
            <Button variant="subtle" color="gray" onClick={reset}>{t('back')}</Button>
            <Button onClick={run} disabled={valid.length === 0}>{t('import', { count: valid.length })}</Button>
          </Group>
        </Stack>
      )}

      {step === 'running' && (
        <Stack gap="sm">
          <Text size="sm">{t('importing', { done: progress.done, total: progress.total })}</Text>
          <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} animated />
          <Text size="xs" c="dimmed">{t('keepOpen')}</Text>
        </Stack>
      )}

      {step === 'done' && (
        <Stack gap="md">
          {created > 0 && (
            <Alert color="green" icon={<IconCheck size={16} />}>{t('created', { count: created })}</Alert>
          )}
          {stopReason && (
            <Alert color="red" icon={<IconAlertCircle size={16} />} title={t('notImported', { count: notImported })}>
              {t('stopped', { reason: stopReason })}
            </Alert>
          )}
          {failed.length > 0 && (
            <Stack gap={4}>
              <Text size="sm" fw={600}>{t('failed', { count: failed.length })}</Text>
              <ScrollArea.Autosize mah={180} type="auto">
                <Table fz="xs" verticalSpacing={4}>
                  <Table.Tbody>
                    {failed.map((o) => (
                      <Table.Tr key={o.id}>
                        <Table.Td w={120} ff="monospace">{o.id || '—'}</Table.Td>
                        <Table.Td>{o.error === 'missing_fields' ? t('issues.missing_fields') : o.error}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea.Autosize>
            </Stack>
          )}
          <Group justify="flex-end">
            <Button onClick={close}>{t('close')}</Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
