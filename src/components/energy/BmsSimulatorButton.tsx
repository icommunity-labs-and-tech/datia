'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Group,
  Loader,
  Modal,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Stepper,
  Text,
  Title,
  Transition,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconInfoCircle,
  IconCpu,
  IconCheck,
  IconAlertCircle,
  IconBolt,
  IconChartBar,
  IconShieldCheck,
  IconShieldLock,
  IconExternalLink,
} from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getAssets } from '@/actions/assets';
import {
  createBmsSource,

} from '@/actions/energy/simulate-bms';
import {
  createBmsMonthReadings,
  certifyBmsMonth,
  type BmsMonthCertification,
} from '@/actions/energy/simulate-bms-month';
import { confirmBmsEvidences } from '@/actions/energy/confirm-bms-evidence';
import { BMS_MONTH_NAMES } from '@/lib/energy/bmsMonthNames';
import { BMS_PROFILES, DEFAULT_BMS_PROFILE, type BmsProfileId } from '@/lib/energy/bmsProfiles';

const DATIA_BLUE = '#1752CC';
const DATIA_AMBER = '#F0930A';

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [currentYear - 1, currentYear - 2, currentYear - 3].map((y) => ({
  value: String(y),
  label: String(y),
}));

// Deliberate pacing so each phase is clearly perceivable, not just a network-speed flicker.
// iBS anchors a few seconds after issuing, so give it a generous window
// without hammering: ~45 s at one read every 1.5 s.
const ANCHOR_POLL = {
  everyMs: 1500,
  attempts: 30,
};

/**
 * The run is paced to cover a year in about half a minute. Months are spread
 * wide enough for each anchoring to be visible: every month issues its evidence
 * as soon as its readings exist, and iBS confirms it some 11 s later, so
 * confirmations land while later months are still being metered.
 *
 * The floor is iBS, not us: nothing can finish sooner than the anchoring of the
 * last month. Writing each month's readings in two batches rather than day by
 * day is what freed the rest of the budget.
 */
const YEAR_WINDOW_MS = 30_000;
const ANCHOR_LATENCY_MS = 11_000; // measured against iBS
const MONTH_INTERVAL_MS = Math.round((YEAR_WINDOW_MS - ANCHOR_LATENCY_MS) / 12);

/** Source, readings, certification. */
const TOTAL_STEPS = 3;

const PACE = {
  betweenPhases: 550,
  eventRow: 55,
};

interface MonthRow {
  month: string;
  monthIndex: number;
  kwh?: number;
  co2eKg?: number;
  /** Daily readings aggregated into this month. */
  readings?: number;
  /** Evidence id once iBS issues it, before the chain anchors it. */
  evidenceId?: string;
  /** iBS status: `waiting` until the transaction lands, then `certified`. */
  anchorStatus?: string;
  checkerUrl?: string;
  network?: string;
  mirrors?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function BmsSimulatorButton() {
  const t = useTranslations('energyHub.bmsSimulator');
  const router = useRouter();
  const [opened, { open, close }] = useDisclosure(false);

  const [items, setItems] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [assetId, setItemId] = useState<string | null>(null);
  const [year, setYear] = useState<string | null>(String(currentYear - 1));
  const [profile, setProfile] = useState<BmsProfileId>(DEFAULT_BMS_PROFILE);
  // Set when a run lands on data an earlier run had already produced.
  const [reused, setReused] = useState(false);

  const [phase, setPhase] = useState<'form' | 'running' | 'done'>('form');
  const [activeStep, setActiveStep] = useState(0);
  const [sourceName, setSourceName] = useState<string | null>(null);
  const [months, setMonths] = useState<MonthRow[]>([]);
  const [eventRows, setEventRows] = useState<string[]>([]);
  // One certification per month, plus whichever the panel is showing.
  const [certifications, setCertifications] = useState<BmsMonthCertification[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [certification, setCertification] = useState<BmsMonthCertification | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async () => {
    resetRun();
    open();
    if (items.length === 0) {
      setLoadingItems(true);
      try {
        const data = await getAssets();
        setItems(data.map((i: any) => ({ id: i.id, name: i.name })));
      } catch {
        setError(t('loadItemsError'));
      } finally {
        setLoadingItems(false);
      }
    }
  };

  const resetRun = () => {
    setPhase('form');
    setActiveStep(0);
    setSourceName(null);
    setMonths([]);
    setEventRows([]);
    setCertification(null);
    setCertifications([]);
    setSelectedMonth(null);
    setError(null);
  };

  const handleClose = () => {
    close();
    setItemId(null);
    resetRun();
  };

  const handleRun = async () => {
    if (!assetId || !year) return;
    const targetYear = parseInt(year, 10);
    setError(null);
    setPhase('running');
    setReused(false);
    setMonths(BMS_MONTH_NAMES.map((m, i) => ({ month: m, monthIndex: i })));

    try {
      // ── Step 1: energy source ──
      setActiveStep(0);
      const source = await createBmsSource(assetId, targetYear, profile);
      setSourceName(source.sourceName);
      let anyReused = source.reused;
      await sleep(PACE.betweenPhases);

      // ── Steps 2–4: one pass per month ──
      //
      // Each month is metered day by day and anchored as a single evidence
      // carrying its aggregate: sensors report far finer than anything worth
      // putting on chain, so the readings stay in the database at full detail
      // and one transaction per month is what an auditor signs.
      setActiveStep(1);
      const pending = new Set<string>();

      for (let m = 0; m < 12; m++) {
        const startedAt = Date.now();

        const month = await createBmsMonthReadings(source.sourceId, targetYear, m, profile);
        if (month.reused) anyReused = true;
        setMonths((prev) =>
          prev.map((row) =>
            row.monthIndex === m
              ? { ...row, kwh: month.totalKwh, co2eKg: month.totalCo2eKg, readings: month.days }
              : row
          )
        );
        setEventRows((prev) => [
          ...prev,
          t('eventRow.readings', { month: month.month, count: month.days }),
        ]);


        // Issue the month's evidence without waiting for the chain.
        void certifyBmsMonth(source.sourceId, targetYear, m, month.emissionIds).then((cert) => {
          if (!cert.ok) {
            setCertification((prev) => prev ?? cert);
            return;
          }
          pending.add(cert.evidenceId);
          setCertifications((prev) => [...prev, cert]);
          setSelectedMonth((prev) => (prev === null ? cert.monthIndex : prev));
          setMonths((prev) =>
            prev.map((row) =>
              row.monthIndex === m
                ? { ...row, evidenceId: cert.evidenceId, anchorStatus: 'waiting' }
                : row
            )
          );
        });

        const elapsed = Date.now() - startedAt;
        await sleep(Math.max(0, MONTH_INTERVAL_MS - elapsed));
      }

      setReused(anyReused);
      setActiveStep(2);

      // ── Step 5: wait for the chain ──
      for (let attempt = 0; attempt < ANCHOR_POLL.attempts; attempt++) {
        const outstanding = [...pending];
        if (!outstanding.length && attempt > 2) break;

        if (outstanding.length) {
          const statuses = await confirmBmsEvidences(outstanding);
          setMonths((prev) =>
            prev.map((row) => {
              const hit = statuses.find((st) => st.evidenceId === row.evidenceId);
              return hit
                ? {
                    ...row,
                    anchorStatus: hit.confirmed ? 'certified' : hit.status,
                    checkerUrl: hit.checkerUrl,
                    network: hit.network,
                    mirrors: hit.mirrors?.length,
                  }
                : row;
            })
          );
          for (const st of statuses) if (st.confirmed) pending.delete(st.evidenceId);
          if (!pending.size) break;
        }
        await sleep(ANCHOR_POLL.everyMs);
      }

      setActiveStep(TOTAL_STEPS);
      setPhase('done');

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('runError'));
      setPhase('form');
    }
  };

  // The panel follows the month picked in the anchoring grid; until one is
  // picked it shows the first evidence issued.
  const shown =
    certifications.find((c) => c.ok && c.monthIndex === selectedMonth) ??
    certifications.find((c) => c.ok) ??
    certification;
  const shownRow = shown?.ok ? months.find((m) => m.monthIndex === shown.monthIndex) : undefined;
  const shownConfirmed = shownRow?.anchorStatus === 'certified';

  const totalKwh = months.reduce((s, m) => s + (m.kwh ?? 0), 0);
  const totalCo2eKg = months.reduce((s, m) => s + (m.co2eKg ?? 0), 0);

  const STEPS = [
    { label: t('step.source'), icon: <IconBolt size={16} /> },
    { label: t('step.readings'), icon: <IconChartBar size={16} /> },
    { label: t('step.certification'), icon: <IconShieldCheck size={16} /> },
  ];

  return (
    <>
      <Button variant="default" size="xs" leftSection={<IconCpu size={15} />} onClick={handleOpen}>
        {t('trigger')}
      </Button>

      <Modal opened={opened} onClose={handleClose} title={t('title')} centered size="xl">
        <Stack gap="md">
          {phase === 'form' && (
            <Box maw={480}>
              <Stack gap="md">
                <Text size="sm" c="dimmed">{t('description')}</Text>
                <Alert variant="light" color="gray" icon={<IconInfoCircle size={16} />}>
                  <Text size="xs">{t('demoNote')}</Text>
                </Alert>
                <Select
                  label={t('itemLabel')}
                  placeholder={loadingItems ? t('loadingItems') : t('itemPlaceholder')}
                  data={items.map((i) => ({ value: i.id, label: i.name }))}
                  value={assetId}
                  onChange={setItemId}
                  disabled={loadingItems}
                  searchable
                  nothingFoundMessage={t('noItems')}
                />
                <Select
                  label={t('yearLabel')}
                  data={YEAR_OPTIONS}
                  value={year}
                  onChange={setYear}
                  allowDeselect={false}
                />
                <Select
                  label={t('profileLabel')}
                  description={t(`profile.${profile}.hint`)}
                  data={Object.values(BMS_PROFILES).map((p) => ({
                    value: p.id,
                    label: t(`profile.${p.id}.label`),
                  }))}
                  value={profile}
                  onChange={(v) => setProfile((v as BmsProfileId) ?? DEFAULT_BMS_PROFILE)}
                  allowDeselect={false}
                />

                {error && (
                  <Alert color="red" icon={<IconAlertCircle size={16} />}>{error}</Alert>
                )}

                <Group justify="flex-end">
                  <Button variant="default" onClick={handleClose}>{t('cancel')}</Button>
                  <Button onClick={handleRun} disabled={!assetId || !year} leftSection={<IconCpu size={16} />}>
                    {t('run')}
                  </Button>
                </Group>
              </Stack>
            </Box>
          )}

          {(phase === 'running' || phase === 'done') && (
            <Stack gap="md">
              <Stepper active={activeStep} size="xs" iconSize={28}>
                {STEPS.map((step, i) => (
                  <Stepper.Step
                    key={step.label}
                    label={step.label}
                    icon={step.icon}
                    completedIcon={<IconCheck size={16} />}
                    loading={phase === 'running' && activeStep === i}
                  />
                ))}
              </Stepper>

              {sourceName && (
                <Text size="xs" c="dimmed">
                  <IconBolt size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
                  {sourceName}
                </Text>
              )}

              <Paper withBorder p="sm" radius="md">
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={months} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-default-border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(0, 3)} />
                    <YAxis yAxisId="kwh" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="co2" orientation="right" tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(value: number, name: string) =>
                        name === 'kwh' ? [`${value.toFixed(0)} kWh`, t('chart.kwh')] : [`${value.toFixed(1)} kg`, t('chart.co2e')]
                      }
                    />
                    <Bar yAxisId="kwh" dataKey="kwh" fill={DATIA_BLUE} radius={[3, 3, 0, 0]} maxBarSize={26} isAnimationActive />
                    <Line
                      yAxisId="co2"
                      type="monotone"
                      dataKey="co2eKg"
                      stroke={DATIA_AMBER}
                      strokeWidth={2}
                      dot={{ r: 3, fill: DATIA_AMBER }}
                      connectNulls={false}
                      isAnimationActive
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </Paper>

              <Transition mounted={activeStep >= 1} transition="fade" duration={200}>
                {(styles) => (
                  <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md" style={styles}>
                    {/* ── Event registry checklist ── */}
                    <Paper withBorder p="sm" radius="md">
                      <Text size="xs" fw={600} c="dimmed" mb={6}>{t('step.registry')}</Text>
                      <Box style={{ maxHeight: 160, overflowY: 'auto' }}>
                        {eventRows.map((row) => (
                          <Transition key={row} mounted transition="slide-right" duration={150} timingFunction="ease">
                            {(rowStyles) => (
                              <Group gap={6} py={2} wrap="nowrap" align="flex-start" style={rowStyles}>
                                <IconCheck
                                  size={13}
                                  color="var(--mantine-color-green-6)"
                                  style={{ flexShrink: 0, marginTop: 2 }}
                                />
                                <Text size="xs" c="dimmed">{row}</Text>
                              </Group>
                            )}
                          </Transition>
                        ))}
                      </Box>
                    </Paper>

                    {/* ── Per-month anchoring: the records landing on chain ── */}
                    <Paper withBorder p="sm" radius="md">
                      <Group justify="space-between" mb={6}>
                        <Text size="xs" fw={600} c="dimmed">{t('anchors.title')}</Text>
                        <Text size="xs" c="dimmed">
                          {t('anchors.progress', {
                            done: months.filter((m) => m.anchorStatus === 'certified').length,
                            total: months.filter((m) => m.evidenceId).length || 12,
                          })}
                        </Text>
                      </Group>
                      <SimpleGrid cols={4} spacing={6}>
                        {months.map((m) => {
                          const certified = m.anchorStatus === 'certified';
                          const issued = Boolean(m.evidenceId);
                          const chip = (
                            <Badge
                              key={m.monthIndex}
                              size="sm"
                              fullWidth
                              variant={certified ? 'filled' : issued ? 'light' : 'outline'}
                              color={certified ? 'green' : issued ? 'datiaBlue' : 'gray'}
                              style={{
                                cursor: issued ? 'pointer' : 'default',
                                outline:
                                  selectedMonth === m.monthIndex
                                    ? '2px solid var(--mantine-color-datiaBlue-4)'
                                    : undefined,
                                outlineOffset: 1,
                              }}
                              onClick={() => issued && setSelectedMonth(m.monthIndex)}
                            >
                              {m.month.slice(0, 3)}
                            </Badge>
                          );
                          // Once anchored, the chip is the way into the public proof.
                          return chip;
                        })}
                      </SimpleGrid>
                      <Text size="xs" c="dimmed" mt={8}>
                        {t('anchors.legendSelectable')}
                      </Text>
                    </Paper>

                    {/* ── Blockchain certification panel ── */}
                    <Paper withBorder p="sm" radius="md">
                      <Text size="xs" fw={600} c="dimmed" mb={6}>{t('certification.title')}</Text>

                      {activeStep >= 1 && !shown && (
                        <Group gap={8}>
                          <IconShieldLock size={16} color="var(--mantine-color-dimmed)" />
                          <Text size="xs" c="dimmed">{t('certification.pending')}</Text>
                        </Group>
                      )}

                      {shown?.ok === true && (
                        <Stack gap={6}>
                          {/* Issued but not yet on chain: say so plainly. */}
                          {!shownConfirmed && (
                            <>
                              <Group gap={6}>
                                <Loader size="xs" />
                                <Text size="xs" fw={600} c="dimmed">
                                  {t('certification.pendingTitle')}
                                </Text>
                              </Group>
                              <Text size="xs" fw={600}>
                                {t('certification.subject', {
                                  period: shown.period,
                                  co2e: shown.totalCo2eKg.toFixed(1),
                                })}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {t('certification.aggregate', {
                                  readings: shown.readings || shownRow?.readings || 0,
                                  kwh: shown.totalKwh.toFixed(0),
                                })}
                              </Text>
                              <Text size="xs" c="dimmed">{t('certification.pendingBody')}</Text>
                            </>
                          )}

                          {shownConfirmed && (
                            <>
                              <Group gap={6}>
                                <IconShieldCheck size={16} color="var(--mantine-color-green-6)" />
                                <Text size="xs" fw={600} c="green.7">
                                  {t('certification.successTitle')}
                                </Text>
                              </Group>
                              <Text size="xs" fw={600}>
                                {t('certification.subject', {
                                  period: shown.period,
                                  co2e: shown.totalCo2eKg.toFixed(1),
                                })}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {t('certification.successBody', { verifier: shown.verifierBody })}
                              </Text>
                              {shownRow?.network && (
                                <Text size="xs" c="dimmed">
                                  {t('certification.anchoredOn', { network: shownRow.network })}
                                  {shownRow.mirrors
                                    ? ` · ${t('certification.mirrors', { count: shownRow.mirrors })}`
                                    : ''}
                                </Text>
                              )}
                              {shownRow?.checkerUrl && (
                                <Anchor
                                  href={shownRow.checkerUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  size="xs"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                >
                                  {t('certification.viewOnChecker')} <IconExternalLink size={12} />
                                </Anchor>
                              )}
                            </>
                          )}

                          <Badge size="xs" variant="light" color="datiaBlue" style={{ alignSelf: 'flex-start' }}>
                            {shown.evidenceId}
                          </Badge>
                        </Stack>
                      )}

                      {shown?.ok === false && shown.reason === 'NOT_VERIFIED' && (
                        <Stack gap={4}>
                          <Group gap={6}>
                            <IconShieldLock size={16} color="var(--mantine-color-yellow-7)" />
                            <Text size="xs" fw={600} c="yellow.8">{t('certification.notVerifiedTitle')}</Text>
                          </Group>
                          <Text size="xs" c="dimmed">{t('certification.notVerifiedBody')}</Text>
                        </Stack>
                      )}

                      {certification?.ok === false && certification.reason === 'ERROR' && (
                        <Stack gap={4}>
                          <Group gap={6}>
                            <IconAlertCircle size={16} color="var(--mantine-color-red-6)" />
                            <Text size="xs" fw={600} c="red.7">{t('certification.errorTitle')}</Text>
                          </Group>
                          <Text size="xs" c="dimmed">{certification.message}</Text>
                        </Stack>
                      )}
                    </Paper>
                  </SimpleGrid>
                )}
              </Transition>

              {phase === 'running' && (
                <Group gap="xs" justify="center">
                  <Loader size="xs" />
                  <Text size="xs" c="dimmed">{STEPS[activeStep]?.label}…</Text>
                </Group>
              )}

              {phase === 'done' && (
                <Stack gap="sm">
                  {reused && (
                    <Alert color="blue" icon={<IconCheck size={16} />} title={t('reusedTitle')}>
                      {t('reusedMessage', { source: sourceName ?? '' })}
                    </Alert>
                  )}
                  <SimpleGrid cols={2}>
                    <Stack gap={2}>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>{t('totalConsumption')}</Text>
                      <Title order={4}>{(totalKwh / 1000).toFixed(2)} MWh</Title>
                    </Stack>
                    <Stack gap={2}>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>{t('totalEmissions')}</Text>
                      <Title order={4}>{(totalCo2eKg / 1000).toFixed(3)} tCO₂e</Title>
                    </Stack>
                  </SimpleGrid>
                  <Group justify="flex-end">
                    <Button variant="default" onClick={handleClose}>{t('close')}</Button>
                  </Group>
                </Stack>
              )}

              {error && (
                <Alert color="red" icon={<IconAlertCircle size={16} />}>{error}</Alert>
              )}
            </Stack>
          )}
        </Stack>
      </Modal>
    </>
  );
}
