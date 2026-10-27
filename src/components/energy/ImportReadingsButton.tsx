'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@mantine/core';
import { IconFileUpload } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import ImportReadingsModal from './ImportReadingsModal';

export default function ImportReadingsButton() {
  const t = useTranslations('energyHub.import');
  const router = useRouter();
  const [opened, setOpened] = useState(false);
  return (
    <>
      <Button variant="default" leftSection={<IconFileUpload size={15} stroke={1.9} />} onClick={() => setOpened(true)}>
        {t('button')}
      </Button>
      <ImportReadingsModal opened={opened} onClose={() => setOpened(false)} onImported={() => router.refresh()} />
    </>
  );
}
