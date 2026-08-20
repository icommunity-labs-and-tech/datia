'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { StateData } from '../../types';
import { Center, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconHistory } from '@tabler/icons-react';
import { TimelineItem } from '../ui/TimelineItem';
import { SequentialExecutor } from '../../utils/apiRetry';

interface ItemHistorySectionProps {
  states: StateData[] | undefined;
}

export type StateLoadStatus = 'pending' | 'loading' | 'loaded' | 'error';

export function ItemHistorySection({ states }: ItemHistorySectionProps) {
  const t = useTranslations('customer');
  const [loadedStates, setLoadedStates] = useState<Set<string>>(new Set());
  const [loadingStates, setLoadingStates] = useState<Set<string>>(new Set());
  const executorRef = useRef<SequentialExecutor<void> | null>(null);
  const hasHistory = states && states.length > 0;

  useEffect(() => {
    if (!hasHistory) return;

    // Initialize executor once
    if (!executorRef.current) {
      executorRef.current = new SequentialExecutor<void>();
    }

    // Sort states by creation date (newest first) to prioritize recent ones
    const sortedStates = [...states].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Queue states for progressive loading
    sortedStates.forEach((state) => {
      // If no evidence, mark as loaded immediately
      if (!state.evidenceID) {
        setLoadedStates(prev => new Set(prev).add(state.id));
        return;
      }

      // Skip if already processed
      if (loadedStates.has(state.id) || loadingStates.has(state.id)) {
        return;
      }

      // Mark as loading and add to queue
      setLoadingStates(prev => new Set(prev).add(state.id));

      executorRef.current!.add(async () => {
        // Small delay to allow TimelineItem to mount and start loading
        await new Promise(resolve => setTimeout(resolve, 150));

        // Mark as loaded (actual loading happens in TimelineItem)
        setLoadingStates(prev => {
          const next = new Set(prev);
          next.delete(state.id);
          return next;
        });
        setLoadedStates(prev => new Set(prev).add(state.id));
      }).catch(() => {
        // Silently handle errors - they're shown in TimelineItem
        setLoadingStates(prev => {
          const next = new Set(prev);
          next.delete(state.id);
          return next;
        });
        setLoadedStates(prev => new Set(prev).add(state.id));
      });
    });
  }, [hasHistory, states, loadedStates, loadingStates]);

  const getStateStatus = (stateId: string): StateLoadStatus => {
    if (loadedStates.has(stateId)) return 'loaded';
    if (loadingStates.has(stateId)) return 'loading';
    return 'pending';
  };

  if (!hasHistory) {
    return (
      <Center py={48}>
        <Stack align="center" gap="sm">
          <ThemeIcon color="gray" variant="light" size={48} radius="xl">
            <IconHistory size={24} stroke={1.5} />
          </ThemeIcon>
          <Text size="sm" c="dimmed" ta="center">{t('noHistory')}</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack gap="sm">
      {states.map((state) => (
        <TimelineItem
          key={state.id}
          state={state}
          loadStatus={getStateStatus(state.id)}
        />
      ))}
    </Stack>
  );
}
