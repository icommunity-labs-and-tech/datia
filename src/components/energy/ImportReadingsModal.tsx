'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  FileButton,
  Group,
  Loader,
  Modal,
  NumberInput,
  Paper,
  Progress,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { IconAlertCircle, IconCheck, IconDownload, IconFileUpload, IconPlus } from '@tabler/icons-react';
import { useLocale, useTranslations } from 'next-intl';
import {
  certifyImportedMonth,
  createImportSource,
  importReadings,
  listImportTargets,
  previewReadingsCsv,
  type ImportReadingsResult,
  type ImportTarget,
  type ImportTargetSource,
} from '@/actions/energy/importReadings';
import {
  MAX_READINGS_CSV_LENGTH,
  readingsCsvTemplate,
  type ReadingIssue,
  type ReadingsCsvResult,
  type ReadingsFileIssue,
} from '@/lib/import/readings-csv';
import type { EnergyCarrier } from '@/domain/energy/EnergyTypes';

const CARRIERS: EnergyCarrier[] = [
  'ELECTRICITY',
  'NATURAL_GAS',
  'HYDROGEN',
  'SOLAR_THERMAL',
  'DISTRICT_HEATING',
  'DISTRICT_COOLING',
  'BIOMASS',
  'OIL',
  'COAL',
  'OTHER',
];
const NEW_SOURCE = '__new__';

type Step = 'target' | 'reading' | 'review' | 'running' | 'done';

function downloadTemplate() {
  const blob = new Blob(['﻿' + readingsCsvTemplate()], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla-lecturas.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportReadingsModal({
  opened,
  onClose,
  onImported,
}: {
  opened: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const t = useTranslations('energyHub.import');
  const tCarrier = useTranslations('energyHub.carriers');
  const tScope = useTranslations('dashboard.scope');
  const locale = useLocale();

  const [step, setStep] = useState<Step>('target');
  const [targets, setTargets] = useState<ImportTarget[] | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: '', carrier: 'ELECTRICITY' as EnergyCarrier, renewable: '' as number | '', factor: '' as number | '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [fileName, setFileName] = useState('');
  const [text, setText] = useState('');
  const [result, setResult] = useState<ReadingsCsvResult | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [replace, setReplace] = useState(false);

  const [phase, setPhase] = useState<'writing' | 'certifying'>('writing');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [imported, setImported] = useState<ImportReadingsResult | null>(null);
  const [certified, setCertified] = useState(0);
  const [notVerified, setNotVerified] = useState(false);
  const [certifyErrors, setCertifyErrors] = useState<string[]>([]);
  const [writeError, setWriteError] = useState<string | null>(null);

  useEffect(() => {
    if (opened && !targets) listImportTargets().then(setTargets).catch(() => setTargets([]));
  }, [opened, targets]);

  const asset = targets?.find((a) => a.id === assetId) ?? null;
  const source: ImportTargetSource | null = asset?.sources.find((s) => s.id === sourceId) ?? null;

  const reset = () => {
    setStep('target');
    setFileName('');
    setText('');
    setResult(null);
    setReadError(null);
    setReplace(false);
    setImported(null);
    setCertified(0);
    setNotVerified(false);
    setCertifyErrors([]);
    setWriteError(null);
  };

  const close = () => {
    if (step === 'running') return;
    if (step === 'done') onImported();
    reset();
    setTargets(null);
    setAssetId(null);
    setSourceId(null);
    onClose();
  };

  const createSource = async () => {
    if (!assetId || !draft.name.trim()) return;
    setCreating(true);
    setCreateError(null);
    const res = await createImportSource({
      assetId,
      name: draft.name,
      energyCarrier: draft.carrier,
      renewableShare: draft.renewable === '' ? null : draft.renewable,
      gridEmissionFactor: draft.factor === '' ? null : draft.factor,
    }).catch(() => ({ ok: false as const, error: 'failed' }));
    setCreating(false);
    if (!res.ok) {
      setCreateError(t('source.createError'));
      return;
    }
    setTargets((ts) => ts?.map((a) => (a.id === assetId ? { ...a, sources: [...a.sources, res.source] } : a)) ?? ts);
    setSourceId(res.source.id);
    setDraft({ name: '', carrier: 'ELECTRICITY', renewable: '', factor: '' });
  };

  const onFile = async (file: File | null) => {
    if (!file || !sourceId) return;
    setFileName(file.name);
    setReadError(null);
    if (file.size > MAX_READINGS_CSV_LENGTH) {
      setResult({ fileIssues: [{ code: 'too_large' }], rows: [] });
      setStep('review');
      return;
    }
    setStep('reading');
    try {
      const content = await file.text();
      const preview = await previewReadingsCsv(sourceId, content);
      if (!preview) throw new Error('no source');
      setText(content);
      setResult(preview);
      setStep('review');
    } catch {
      setReadError(t('readError'));
      setStep('target');
    }
  };

  const rows = result?.rows ?? [];
  const valid = rows.filter((r) => r.issues.length === 0);
  const withIssues = rows.filter((r) => r.issues.length > 0);
  const fresh = valid.filter((r) => r.existing === null);
  const uncertified = valid.filter((r) => r.existing === 'uncertified');
  const certifiedAlready = valid.filter((r) => r.existing === 'certified');
  const toWrite = replace ? [...fresh, ...uncertified] : fresh;
  const totals = {
    kwh: toWrite.reduce((n, r) => n + r.kwh, 0),
    co2e: toWrite.reduce((n, r) => n + (r.co2eKg ?? 0), 0),
    withoutCo2e: toWrite.filter((r) => r.co2eKg == null).length,
  };

  const num = (v: number, digits = 1) => v.toLocaleString(locale, { maximumFractionDigits: digits });
  const day = (iso: string) => new Date(iso).toLocaleDateString(locale, { timeZone: 'UTC' });
  const period = (start: string, end: string) => (day(start) === day(end) ? day(start) : `${day(start)} – ${day(end)}`);
  const monthName = (yyyyMm: string) => {
    const [y, m] = yyyyMm.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  };

  const issueText = (issue: ReadingIssue) => {
    const field = t(`fields.${issue.field}`);
    switch (issue.code) {
      case 'required':
        return t('issues.required', { field });
      case 'invalid_date':
        return t('issues.invalid_date', { field, value: issue.value });
      case 'invalid_number':
        return t('issues.invalid_number', { field, value: issue.value });
      case 'not_positive':
        return t('issues.not_positive');
      case 'negative':
        return t('issues.negative', { field });
      case 'end_before_start':
        return t('issues.end_before_start');
      case 'duplicate_period':
        return t('issues.duplicate_period', { line: issue.firstLine });
      case 'unknown_stage':
        return t('issues.unknown_stage', { value: issue.value });
      case 'unknown_scope':
        return t('issues.unknown_scope', { value: issue.value });
    }
  };

  const fileIssueText = (issue: ReadingsFileIssue) => {
    switch (issue.code) {
      case 'empty':
        return t('fileIssues.empty');
      case 'too_large':
        return t('fileIssues.too_large');
      case 'missing_columns':
        return t('fileIssues.missing_columns', { columns: issue.columns.join(', ') });
      case 'too_many_rows':
        return t('fileIssues.too_many_rows', { rows: num(issue.rows, 0), max: num(issue.max, 0) });
    }
  };

  const run = async () => {
    if (!sourceId) return;
    setStep('running');
    setPhase('writing');
    try {
      const res = await importReadings(sourceId, text, { replaceUncertified: replace });
      if (!res) throw new Error('rejected');
      setImported(res);
      setPhase('certifying');
      setProgress({ done: 0, total: res.months.length });
      let ok = 0;
      const errors: string[] = [];
      for (let i = 0; i < res.months.length; i++) {
        const { month, emissionIds } = res.months[i];
        const c = await certifyImportedMonth(sourceId, month, emissionIds).catch(() => null);
        if (c?.ok) ok++;
        else if (c && c.reason === 'NOT_VERIFIED') {
          setNotVerified(true);
          break;
        } else errors.push(monthName(month));
        setCertified(ok);
        setProgress({ done: i + 1, total: res.months.length });
      }
      setCertified(ok);
      setCertifyErrors(errors);
    } catch {
      setWriteError(t('writeError'));
    }
    setStep('done');
  };

  const sourceOptions = [
    ...(asset?.sources.map((s) => ({ value: s.id, label: `${s.name} · ${tCarrier(s.energyCarrier as 'OTHER')}` })) ?? []),
    { value: NEW_SOURCE, label: t('source.new') },
  ];

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
      {(step === 'target' || step === 'reading') && (
        <Stack gap="md">
          <Text size="sm" c="dimmed">{t('intro')}</Text>
          {!targets ? (
            <Loader size="sm" />
          ) : targets.length === 0 ? (
            <Alert color="yellow" icon={<IconAlertCircle size={16} />}>{t('noAssets')}</Alert>
          ) : (
            <>
              <Select
                label={t('assetLabel')}
                placeholder={t('assetPlaceholder')}
                data={targets.map((a) => ({ value: a.id, label: a.name }))}
                value={assetId}
                onChange={(v) => {
                  setAssetId(v);
                  setSourceId(null);
                }}
                searchable
                nothingFoundMessage={t('nothingFound')}
              />
              {asset && (
                <Select
                  label={t('sourceLabel')}
                  placeholder={t('sourcePlaceholder')}
                  data={sourceOptions}
                  value={sourceId ?? (asset.sources.length === 0 ? NEW_SOURCE : null)}
                  onChange={setSourceId}
                  allowDeselect={false}
                />
              )}

              {asset && (sourceId === NEW_SOURCE || (!sourceId && asset.sources.length === 0)) && (
                <Paper withBorder radius="md" p="sm">
                  <Stack gap="xs">
                    <Text size="sm" fw={600}>{t('source.title')}</Text>
                    <TextInput
                      label={t('source.name')}
                      placeholder={t('source.namePlaceholder')}
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.currentTarget.value })}
                    />
                    <Group grow align="flex-start">
                      <Select
                        label={t('source.carrier')}
                        data={CARRIERS.map((c) => ({ value: c, label: tCarrier(c) }))}
                        value={draft.carrier}
                        onChange={(v) => v && setDraft({ ...draft, carrier: v as EnergyCarrier })}
                        allowDeselect={false}
                      />
                      <NumberInput
                        label={t('source.renewable')}
                        suffix=" %"
                        min={0}
                        max={100}
                        value={draft.renewable}
                        onChange={(v) => setDraft({ ...draft, renewable: typeof v === 'number' ? v : '' })}
                      />
                    </Group>
                    <NumberInput
                      label={t('source.factor')}
                      description={t('source.factorHelp')}
                      decimalScale={4}
                      min={0}
                      step={0.001}
                      value={draft.factor}
                      onChange={(v) => setDraft({ ...draft, factor: typeof v === 'number' ? v : '' })}
                    />
                    {createError && <Text size="xs" c="red">{createError}</Text>}
                    <Group justify="flex-end">
                      <Button size="xs" leftSection={<IconPlus size={14} />} loading={creating} disabled={!draft.name.trim()} onClick={createSource}>
                        {t('source.create')}
                      </Button>
                    </Group>
                  </Stack>
                </Paper>
              )}

              {source && (
                <Text size="xs" c="dimmed">
                  {[
                    tCarrier(source.energyCarrier as 'OTHER'),
                    source.gridEmissionFactor != null
                      ? t('source.factorSummary', { factor: num(source.gridEmissionFactor, 4) })
                      : t('source.noFactor'),
                    source.renewableShare != null ? t('source.renewableSummary', { share: num(source.renewableShare, 0) }) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              )}

              <Group gap="xs">
                <FileButton onChange={onFile} accept=".csv,text/csv" disabled={!source}>
                  {(props) => (
                    <Button {...props} leftSection={<IconFileUpload size={16} />} loading={step === 'reading'} disabled={!source}>
                      {t('choose')}
                    </Button>
                  )}
                </FileButton>
                <Button variant="default" leftSection={<IconDownload size={16} />} onClick={downloadTemplate}>
                  {t('template')}
                </Button>
              </Group>
              {readError && <Alert color="red" icon={<IconAlertCircle size={16} />}>{readError}</Alert>}
            </>
          )}
        </Stack>
      )}

      {step === 'review' && result && (
        <Stack gap="md">
          <Text size="sm" fw={500}>
            {fileName} → {asset?.name} · {source?.name}
          </Text>
          {result.fileIssues.length > 0 ? (
            <Alert color="red" icon={<IconAlertCircle size={16} />}>
              {result.fileIssues.map((issue) => (
                <Text key={issue.code} size="sm">{fileIssueText(issue)}</Text>
              ))}
            </Alert>
          ) : (
            <>
              <Group gap="xs">
                <Badge color="green" variant="light" size="lg">{t('fresh', { count: fresh.length })}</Badge>
                {uncertified.length + certifiedAlready.length > 0 && (
                  <Badge color="gray" variant="light" size="lg">
                    {t('existing', { count: uncertified.length + certifiedAlready.length })}
                  </Badge>
                )}
                {withIssues.length > 0 && (
                  <Badge color="red" variant="light" size="lg">{t('withIssues', { count: withIssues.length })}</Badge>
                )}
              </Group>

              {toWrite.length > 0 && (
                <Text size="sm">
                  {t('totals', { kwh: num(totals.kwh), co2e: num(totals.co2e, 2) })}
                </Text>
              )}
              {totals.withoutCo2e > 0 && (
                <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
                  {t('withoutCo2e', { count: totals.withoutCo2e })}
                </Alert>
              )}
              {uncertified.length > 0 && (
                <Checkbox
                  checked={replace}
                  onChange={(e) => setReplace(e.currentTarget.checked)}
                  label={t('replace', { count: uncertified.length })}
                  description={certifiedAlready.length ? t('certifiedKept', { count: certifiedAlready.length }) : undefined}
                />
              )}

              {withIssues.length > 0 && (
                <Stack gap={4}>
                  <Text size="sm" fw={600}>{t('issuesTitle')}</Text>
                  <ScrollArea.Autosize mah={160} type="auto">
                    <Table fz="xs" verticalSpacing={4}>
                      <Table.Tbody>
                        {withIssues.slice(0, 200).map((row) => (
                          <Table.Tr key={row.line}>
                            <Table.Td c="dimmed" w={80}>{t('line', { line: row.line })}</Table.Td>
                            <Table.Td>{row.issues.map(issueText).join(' · ')}</Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea.Autosize>
                </Stack>
              )}

              {toWrite.length > 0 && (
                <Stack gap={4}>
                  <Text size="sm" fw={600}>{t('previewTitle')}</Text>
                  <ScrollArea.Autosize mah={200} type="auto">
                    <Table fz="xs" verticalSpacing={4} striped>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>{t('columns.period')}</Table.Th>
                          <Table.Th ta="right">kWh</Table.Th>
                          <Table.Th ta="right">kg CO₂e</Table.Th>
                          <Table.Th>{t('columns.scope')}</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {toWrite.slice(0, 50).map((r) => (
                          <Table.Tr key={r.line}>
                            <Table.Td>{period(r.periodStart, r.periodEnd)}</Table.Td>
                            <Table.Td ta="right">{num(r.kwh)}</Table.Td>
                            <Table.Td ta="right">{r.co2eKg != null ? num(r.co2eKg, 2) : '—'}</Table.Td>
                            <Table.Td>{tScope(r.scope)}</Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea.Autosize>
                  {toWrite.length > 50 && <Text size="xs" c="dimmed">{t('morePreview', { count: toWrite.length - 50 })}</Text>}
                </Stack>
              )}
            </>
          )}

          <Group justify="space-between">
            <Button variant="subtle" color="gray" onClick={reset}>{t('back')}</Button>
            <Button onClick={run} disabled={toWrite.length === 0}>{t('import', { count: toWrite.length })}</Button>
          </Group>
        </Stack>
      )}

      {step === 'running' && (
        <Stack gap="sm">
          <Text size="sm">
            {phase === 'writing'
              ? t('writing', { count: toWrite.length })
              : t('certifying', { done: progress.done, total: progress.total })}
          </Text>
          <Progress
            value={phase === 'writing' ? 100 : progress.total ? (progress.done / progress.total) * 100 : 100}
            animated
          />
          <Text size="xs" c="dimmed">{t('keepOpen')}</Text>
        </Stack>
      )}

      {step === 'done' && (
        <Stack gap="md">
          {writeError ? (
            <Alert color="red" icon={<IconAlertCircle size={16} />}>{writeError}</Alert>
          ) : (
            imported && (
              <>
                <Alert color="green" icon={<IconCheck size={16} />} title={t('done', { count: imported.created + imported.replaced })}>
                  {[
                    imported.replaced ? t('doneReplaced', { count: imported.replaced }) : null,
                    imported.skipped ? t('doneSkipped', { count: imported.skipped }) : null,
                    imported.months.length ? t('doneCertified', { done: certified, total: imported.months.length }) : null,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                </Alert>
                {notVerified && (
                  <Alert color="yellow" icon={<IconAlertCircle size={16} />}>{t('notVerified')}</Alert>
                )}
                {certifyErrors.length > 0 && (
                  <Alert color="red" icon={<IconAlertCircle size={16} />}>
                    {t('certifyFailed', { months: certifyErrors.join(', ') })}
                  </Alert>
                )}
              </>
            )
          )}
          <Group justify="flex-end">
            <Button onClick={close}>{t('close')}</Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
