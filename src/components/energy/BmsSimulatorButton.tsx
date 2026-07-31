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
  IconCpu,
  IconCheck,
  IconAlertCircle,
  IconBolt,
  IconChartBar,
  IconCloudFog,
  IconDatabaseImport,
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
import { getItems } from '@/actions/items';
import {
  createBmsSource,
  createBmsMonthConsumption,
  createBmsMonthEmission,
  certifyBmsEmission,
  type BmsCertificationResult,
} from '@/actions/energy/simulate-bms';
import { BMS_MONTH_NAMES } from '@/lib/energy/bmsMonthNames';

const DATIA_BLUE = '#1752CC';
const DATIA_AMBER = '#F0930A';

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [currentYear - 1, currentYear - 2, currentYear - 3].map((y) => ({
  value: String(y),
  label: String(y),
}));

// Deliberate pacing so each phase is clearly perceivable, not just a network-speed flicker.
const PACE = {
  betweenMonths: 200,
  betweenPhases: 550,
  eventRow: 55,
};

interface MonthRow {
  month: string;
  monthIndex: number;
  kwh?: number;
  co2eKg?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function BmsSimulatorButton() {
  const t = useTranslations('energyHub.bmsSimulator');
  const router = useRouter();
  const [opened, { open, close }] = useDisclosure(false);

  const [items, setItems] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemId, setItemId] = useState<string | null>(null);
  const [year, setYear] = useState<string | null>(String(currentYear - 1));

  const [phase, setPhase] = useState<'form' | 'running' | 'done'>('form');
  const [activeStep, setActiveStep] = useState(0);
  const [sourceName, setSourceName] = useState<string | null>(null);
  const [months, setMonths] = useState<MonthRow[]>([]);
  const [eventRows, setEventRows] = useState<string[]>([]);
  const [certification, setCertification] = useState<BmsCertificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async () => {
    resetRun();
    open();
    if (items.length === 0) {
      setLoadingItems(true);
      try {
        const data = await getItems();
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
    setError(null);
  };

  const handleClose = () => {
    close();
    setItemId(null);
    resetRun();
  };

  const handleRun = async () => {
    if (!itemId || !year) return;
    const targetYear = parseInt(year, 10);
    setError(null);
    setPhase('running');
    setMonths(BMS_MONTH_NAMES.map((m, i) => ({ month: m, monthIndex: i })));

    try {
      // ── Step 1: energy source ──
      setActiveStep(0);
      const source = await createBmsSource(itemId, targetYear);
      setSourceName(source.sourceName);
      await sleep(PACE.betweenPhases);

      // ── Step 2: monthly consumption, one real call per month ──
      setActiveStep(1);
      const consumptionByMonth: { consumptionId: string; kwh: number }[] = [];
      for (let m = 0; m < 12; m++) {
        const result = await createBmsMonthConsumption(source.sourceId, targetYear, m);
        consumptionByMonth[m] = { consumptionId: result.consumptionId, kwh: result.kwh };
        setMonths((prev) => prev.map((row) => (row.monthIndex === m ? { ...row, kwh: result.kwh } : row)));
        await sleep(PACE.betweenMonths);
      }
      await sleep(PACE.betweenPhases);

      // ── Step 3: monthly emissions, one real call per month ──
      setActiveStep(2);
      let lastEmissionId = '';
      for (let m = 0; m < 12; m++) {
        const { consumptionId, kwh } = consumptionByMonth[m];
        const result = await createBmsMonthEmission(consumptionId, m, kwh);
        lastEmissionId = result.emissionId;
        setMonths((prev) => prev.map((row) => (row.monthIndex === m ? { ...row, co2eKg: result.co2eKg } : row)));
        await sleep(PACE.betweenMonths);
      }
      await sleep(PACE.betweenPhases);

      // ── Step 4: event registry — reveals what was already logged above ──
      setActiveStep(3);
      const summary = [
        t('eventRow.source'),
        ...BMS_MONTH_NAMES.map((m) => t('eventRow.consumption', { month: m })),
        ...BMS_MONTH_NAMES.map((m) => t('eventRow.emission', { month: m })),
      ];
      for (const row of summary) {
        setEventRows((prev) => [...prev, row]);
        await sleep(PACE.eventRow);
      }
      await sleep(PACE.betweenPhases);

      // ── Step 5: certify a representative month on blockchain ──
      setActiveStep(4);
      const certResult = await certifyBmsEmission(lastEmissionId);
      setCertification(certResult);
      await sleep(PACE.betweenPhases);

      setPhase('done');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('runError'));
      setPhase('form');
    }
  };

  const totalKwh = months.reduce((s, m) => s + (m.kwh ?? 0), 0);
  const totalCo2eKg = months.reduce((s, m) => s + (m.co2eKg ?? 0), 0);

  const STEPS = [
    { label: t('step.source'), icon: <IconBolt size={16} /> },
    { label: t('step.consumption'), icon: <IconChartBar size={16} /> },
    { label: t('step.emissions'), icon: <IconCloudFog size={16} /> },
    { label: t('step.registry'), icon: <IconDatabaseImport size={16} /> },
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
                <Select
                  label={t('itemLabel')}
                  placeholder={loadingItems ? t('loadingItems') : t('itemPlaceholder')}
                  data={items.map((i) => ({ value: i.id, label: i.name }))}
                  value={itemId}
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

                {error && (
                  <Alert color="red" icon={<IconAlertCircle size={16} />}>{error}</Alert>
                )}

                <Group justify="flex-end">
                  <Button variant="default" onClick={handleClose}>{t('cancel')}</Button>
                  <Button onClick={handleRun} disabled={!itemId || !year} leftSection={<IconCpu size={16} />}>
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

              <Transition mounted={activeStep >= 3} transition="fade" duration={200}>
                {(styles) => (
                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" style={styles}>
                    {/* ── Event registry checklist ── */}
                    <Paper withBorder p="sm" radius="md">
                      <Text size="xs" fw={600} c="dimmed" mb={6}>{t('step.registry')}</Text>
                      <Box style={{ maxHeight: 160, overflowY: 'auto' }}>
                        {eventRows.map((row) => (
                          <Transition key={row} mounted transition="slide-right" duration={150} timingFunction="ease">
                            {(rowStyles) => (
                              <Group gap={6} py={2} style={rowStyles}>
                                <IconCheck size={13} color="var(--mantine-color-green-6)" />
                                <Text size="xs" c="dimmed">{row}</Text>
                              </Group>
                            )}
                          </Transition>
                        ))}
                      </Box>
                    </Paper>

                    {/* ── Blockchain certification panel ── */}
                    <Paper withBorder p="sm" radius="md">
                      <Text size="xs" fw={600} c="dimmed" mb={6}>{t('certification.title')}</Text>

                      {activeStep === 3 && !certification && (
                        <Group gap={8}>
                          <IconShieldLock size={16} color="var(--mantine-color-dimmed)" />
                          <Text size="xs" c="dimmed">{t('certification.pending')}</Text>
                        </Group>
                      )}

                      {activeStep === 4 && !certification && (
                        <Group gap={8}>
                          <Loader size="xs" />
                          <Text size="xs" c="dimmed">{t('certification.running')}</Text>
                        </Group>
                      )}

                      {certification?.ok === true && (
                        <Stack gap={6}>
                          <Group gap={6}>
                            <IconShieldCheck size={16} color="var(--mantine-color-green-6)" />
                            <Text size="xs" fw={600} c="green.7">{t('certification.successTitle')}</Text>
                          </Group>
                          <Text size="xs" c="dimmed">
                            {t('certification.successBody', { verifier: certification.verifierBody })}
                          </Text>
                          <Anchor
                            href={certification.checkerUrl}
                            target="_blank"
                            rel="noreferrer"
                            size="xs"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            {t('certification.viewOnChecker')} <IconExternalLink size={12} />
                          </Anchor>
                          <Badge size="xs" variant="light" color="datiaBlue" style={{ alignSelf: 'flex-start' }}>
                            {certification.evidenceID}
                          </Badge>
                        </Stack>
                      )}

                      {certification?.ok === false && certification.reason === 'NOT_VERIFIED' && (
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
                  <Alert color="green" icon={<IconCheck size={16} />} title={t('successTitle')}>
                    {t('successMessage', { source: sourceName ?? '' })}
                  </Alert>
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
