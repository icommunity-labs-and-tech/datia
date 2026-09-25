'use client';

import { useEffect, useState } from 'react';
import { Select } from '@mantine/core';
import { useTranslations } from 'next-intl';
import { getCompanySwitcher, setCompanyScope, type CompanySwitcherState } from '@/actions/companies/scope';

const ALL = 'all';

/**
 * Narrows the dashboard to one company, for the organization's own account (#20).
 * It renders nothing for anyone else: the action answers null.
 *
 * The page reloads after a change because most views fetch their data on the
 * client, and a soft refresh would leave them showing the previous company.
 */
export default function CompanySwitcher() {
  const t = useTranslations('companiesPage.switcher');
  const [state, setState] = useState<CompanySwitcherState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    getCompanySwitcher().then((next) => alive && setState(next));
    return () => {
      alive = false;
    };
  }, []);

  if (!state || state.companies.length === 0) return null;

  const change = async (value: string | null) => {
    if (!value) return;
    setSaving(true);
    const result = await setCompanyScope(value === ALL ? null : value);
    if (result.success) window.location.reload();
    else setSaving(false);
  };

  return (
    <Select
      size="xs"
      w={{ base: 130, sm: 190 }}
      aria-label={t('label')}
      data={[{ value: ALL, label: t('all') }, ...state.companies.map((c) => ({ value: c.id, label: c.name }))]}
      value={state.current ?? ALL}
      onChange={change}
      allowDeselect={false}
      disabled={saving}
      comboboxProps={{ withinPortal: true }}
    />
  );
}
