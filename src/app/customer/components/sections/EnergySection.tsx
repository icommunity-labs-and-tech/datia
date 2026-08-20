'use client';

import { Badge, Group, Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import { useTranslations } from 'next-intl';
import { EnergyCertification } from '../../types';
import { formatDate } from '../../utils/dateFormatters';

interface EnergySectionProps {
  certifications: EnergyCertification[];
}

function Total({ value, unit, label, color }: { value: string; unit: string; label: string; color: string }) {
  return (
    <Paper p="md" radius="md">
      <Group gap={4} align="baseline">
        <Text fw={700} fz={26} lh={1.1} c={color} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </Text>
        <Text size="sm" fw={600} c={color}>{unit}</Text>
      </Group>
      <Text size="xs" c="dimmed" mt={2}>{label}</Text>
    </Paper>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack gap={0}>
      <Text size="xs" c="dimmed">{label}</Text>
      <Text size="sm" fw={550}>{value}</Text>
    </Stack>
  );
}

export function EnergySection({ certifications }: EnergySectionProps) {
  const t = useTranslations('customer');
  const tEnergy = useTranslations('customer.passport.energy');

  const totalCo2 = certifications.reduce((sum, c) => sum + c.co2eKg, 0);
  const totalKwh = certifications.reduce((sum, c) => sum + c.consumptionKwh, 0);

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
        <Total
          value={totalCo2.toFixed(2)}
          unit="kg"
          label={tEnergy('co2Certified')}
          color="green.7"
        />
        <Total
          value={totalKwh.toFixed(2)}
          unit="kWh"
          label={tEnergy('kwhConsumed')}
          color="datiaAmber.7"
        />
      </SimpleGrid>

      <Stack gap="sm">
        {certifications.map((cert) => (
          <Paper key={cert.id} p="md" radius="md">
            <Group justify="space-between" wrap="nowrap" mb="sm">
              <Text fw={600} size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {cert.co2eKg.toFixed(3)} kg CO₂e
              </Text>
              <Badge size="xs" variant="light" color="green" style={{ flexShrink: 0 }}>
                {cert.scope?.replace('_', ' ')}
              </Badge>
            </Group>

            <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs">
              <Detail
                label={tEnergy('period')}
                value={`${formatDate(cert.periodStart)} – ${formatDate(cert.periodEnd)}`}
              />
              <Detail
                label={tEnergy('consumption')}
                value={`${cert.consumptionKwh} kWh · ${cert.energyCarrier}`}
              />
              {cert.calculationMethodology && (
                <Detail label={tEnergy('method')} value={cert.calculationMethodology} />
              )}
              {cert.verifierBody && (
                <Detail label={tEnergy('verifier')} value={cert.verifierBody} />
              )}
              {cert.verificationStandard && (
                <Detail label={tEnergy('standard')} value={cert.verificationStandard} />
              )}
            </SimpleGrid>
          </Paper>
        ))}
      </Stack>

      {certifications.length === 0 && (
        <Text size="sm" c="dimmed">{t('noHistory')}</Text>
      )}
    </Stack>
  );
}
