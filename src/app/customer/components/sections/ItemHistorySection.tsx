'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { StateData } from '../../types';
import { TimelineItem } from '../ui/TimelineItem';
import { timelineStyles } from '../../styles/passportStyles';
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
      <div style={timelineStyles.emptyState}>
        <div style={timelineStyles.emptyIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '2rem', height: '2rem' }}>
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p style={{ fontSize: '1rem', margin: '0', lineHeight: '1.5' }}>
          {t('noHistory')}
        </p>
      </div>
    );
  }

  return (
    <div style={timelineStyles.container}>
      <div style={timelineStyles.line} />
      {states.map((state) => (
        <TimelineItem
          key={state.id}
          state={state}
          loadStatus={getStateStatus(state.id)}
        />
      ))}
    </div>
  );
}
