'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@mantine/core';
import PageHeader from '@/components/layout/PageHeader';
import ChangePasswordForm from '@/components/ChangePasswordForm';

export default function OrganizationSettings() {
  const t = useTranslations('sidebar');
  const tProfile = useTranslations('profile');

  return (
    <>
      <PageHeader title={t('settings')} description={tProfile('changePasswordDescription')} />
      <Card withBorder radius="md" p="lg" maw={480}>
        <ChangePasswordForm />
      </Card>
    </>
  );
}
