import { Group, Pagination, Select, Text } from '@mantine/core';
import { useTranslations } from 'next-intl';

type Props = {
  pageCount: number;
  pageIndex: number;
  setPageIndex: (index: number) => void;
  pageSize?: number;
  totalItems?: number;
  showPageSizeSelector?: boolean;
  onPageSizeChange?: (newPageSize: number) => void;
};

export default function TablePagination({
  pageCount,
  pageIndex,
  setPageIndex,
  pageSize = 5,
  totalItems = 0,
  showPageSizeSelector = false,
  onPageSizeChange
}: Props) {
  const t = useTranslations('tables.pagination');

  if (pageCount <= 1) return null;

  const startItem = pageIndex * pageSize + 1;
  const endItem = Math.min((pageIndex + 1) * pageSize, totalItems);
  const currentPage = pageIndex + 1;

  return (
    <Group justify="space-between" mt="md" wrap="wrap" gap="sm">
      <Text size="sm" c="dimmed">
        {totalItems > 0
          ? t('showing', { start: startItem, end: endItem, total: totalItems })
          : t('page', { currentPage, pageCount })}
      </Text>

      <Group gap="sm">
        {showPageSizeSelector && onPageSizeChange && (
          <Group gap={6}>
            <Text size="sm" c="dimmed">{t('show')}</Text>
            <Select
              size="xs"
              w={72}
              value={String(pageSize)}
              onChange={(v) => v && onPageSizeChange(parseInt(v))}
              data={['5', '10', '25', '50']}
              allowDeselect={false}
            />
          </Group>
        )}

        <Pagination
          total={pageCount}
          value={currentPage}
          onChange={(page) => setPageIndex(page - 1)}
          size="sm"
          withEdges
          siblings={2}
        />
      </Group>
    </Group>
  );
}
