'use client';

import Box from '@/components/Box';
import GenericTable, { FormTemplate } from '@/components/GenericTable';
import LoadingOverlay from '@/components/Loading';
import { getStates } from '@/actions/states';
import { getItems } from '@/actions/items';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getListColumnPresets } from '@/components/GenericTable/useUnifiedColumns';
import { Divider } from '@/components/Divider';
import { useTranslations } from 'next-intl';

interface StatesTableProps {
  title?: string;
  showBox?: boolean;
  onStateSelect?: (state: any) => void;
  customActions?: Array<{ label: string; onClick: (row: any) => void }>;
  customColumns?: Array<{ key: string; label: string; render: (state: any) => React.ReactNode }>;
}

export default function StatesTable({ 
  title,
  showBox = true,
  onStateSelect,
  customActions = [],
  customColumns = []
}: StatesTableProps) {
  const t = useTranslations('states');
  const tTables = useTranslations('tables');
  const tCommon = useTranslations('common.actions');
  const defaultTitle = title || t('title');
  const [states, setStates] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Generar columnas usando el preset de states
  const listColumnPresets = useMemo(() => getListColumnPresets(tTables), [tTables]);
  const stateColumns = listColumnPresets.states.filter(col => col.key !== 'actions').map(col => ({
    key: col.key,
    label: col.label,
    render: (state: any) => {
      const value = state[col.key];
      switch (col.key) {
        case 'status':
          return (
            <span className={`badge ${state.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>
              {state.status}
            </span>
          );
        case 'itemId':
          const item = items.find(i => i.id === state.itemId);
          return item ? (
            <span className="badge bg-info">
              {item.name}
            </span>
          ) : '-';
        case 'description':
          return (
            <div>
              {state.description && state.description.length > 60
                ? state.description.substring(0, 60) + '...'
                : state.description
              }
            </div>
          );
        default:
          return value || '-';
      }
    }
  }));

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statesData, itemsData] = await Promise.all([
          getStates(),
          getItems()
        ]);
        setStates(statesData);
        setItems(itemsData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (isLoading) return <LoadingOverlay />;

  const tableContent = (
    <>
      {showBox && (
        <Box>
          <h6 className="mb-2">{t('whatAreStates')}</h6>
          <Divider />
          <p className="mb-0 text-muted">
            {t('statesDescription')}
          </p>
        </Box>
      )}

      <GenericTable
      initialData={states}
      title={defaultTitle}
      icon="bi-flag"
      allowTemplateEditing={false}
      customColumns={customColumns.length > 0 ? customColumns : stateColumns}
      actions={customActions}
      filterPlaceholder={t('filterPlaceholder')}
      addButtonLabel={t('addButton')}
      onRowDoubleClick={(row) => onStateSelect ? onStateSelect(row) : router.push(`/dashboard/states/${row.id}`)}
      rowActions={[
        { icon: 'bi-pencil', label: tCommon('edit'), onClick: (row) => router.push(`/dashboard/states/${row.id}/edit`), variant: 'outline-secondary' },
      ]}
    />
    </>
  );

  if (showBox) {
    return <>{tableContent}</>;
  }

  return tableContent;
}
