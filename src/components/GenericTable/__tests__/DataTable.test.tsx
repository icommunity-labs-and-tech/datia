import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock TanStack Table
vi.mock('@tanstack/react-table', () => ({
  flexRender: vi.fn((component) => component)
}));

import DataTable from '../DataTable';

describe('DataTable', () => {
  const mockSetSelectedRow = vi.fn();

  const mockTable = {
    getHeaderGroups: vi.fn(() => [
      {
        id: 'header-group-1',
        headers: [
          {
            id: 'header-1',
            column: {
              getCanSort: vi.fn(() => true),
              getIsSorted: vi.fn(() => false),
              getToggleSortingHandler: vi.fn(() => vi.fn()),
              columnDef: { header: 'Name' }
            },
            getContext: vi.fn(() => ({}))
          },
          {
            id: 'header-2',
            column: {
              getCanSort: vi.fn(() => false),
              getIsSorted: vi.fn(() => false),
              columnDef: { header: 'Actions' }
            },
            getContext: vi.fn(() => ({}))
          }
        ]
      }
    ]),
    getRowModel: vi.fn(() => ({
      rows: [
        {
          id: 'row-1',
          original: { id: 'item-1', name: 'Test Item 1' },
          getVisibleCells: vi.fn(() => [
            {
              id: 'cell-1',
              column: { columnDef: { cell: 'Test Item 1' } },
              getContext: vi.fn(() => ({}))
            },
            {
              id: 'cell-2',
              column: { columnDef: { cell: 'Actions' } },
              getContext: vi.fn(() => ({}))
            }
          ])
        },
        {
          id: 'row-2',
          original: { id: 'item-2', name: 'Test Item 2' },
          getVisibleCells: vi.fn(() => [
            {
              id: 'cell-3',
              column: { columnDef: { cell: 'Test Item 2' } },
              getContext: vi.fn(() => ({}))
            },
            {
              id: 'cell-4',
              column: { columnDef: { cell: 'Actions' } },
              getContext: vi.fn(() => ({}))
            }
          ])
        }
      ]
    }))
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('renders table with headers and rows', () => {
      render(
        <DataTable
          table={mockTable}
          selectedRow={null}
          setSelectedRow={mockSetSelectedRow}
          lastAddedId={null}
        />
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getAllByText('Actions')).toHaveLength(3); // 1 header + 2 cells
      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      expect(screen.getByText('Test Item 2')).toBeInTheDocument();
    });

    it('renders sortable columns with indicators', () => {
      render(
        <DataTable
          table={mockTable}
          selectedRow={null}
          setSelectedRow={mockSetSelectedRow}
          lastAddedId={null}
        />
      );

      const nameHeader = screen.getByText('Name').closest('th');
      expect(nameHeader).toHaveClass('sortable-column');
      expect(nameHeader).toHaveStyle({ cursor: 'pointer' });
      
      // Check for sort indicator
      const sortIcon = nameHeader?.querySelector('.bi-arrow-up-down');
      expect(sortIcon).toBeInTheDocument();
    });

    it('renders non-sortable columns without indicators', () => {
      render(
        <DataTable
          table={mockTable}
          selectedRow={null}
          setSelectedRow={mockSetSelectedRow}
          lastAddedId={null}
        />
      );

      const actionsHeaders = screen.getAllByText('Actions');
      const actionsHeader = actionsHeaders.find(el => el.tagName === 'TH');
      expect(actionsHeader).not.toHaveClass('sortable-column');
      expect(actionsHeader).toHaveStyle({ cursor: 'default' });
    });
  });

  describe('Sorting functionality', () => {
    it('shows ascending sort indicator', () => {
      const tableWithAscSort = {
        ...mockTable,
        getHeaderGroups: vi.fn(() => [
          {
            id: 'header-group-1',
            headers: [
              {
                id: 'header-1',
                column: {
                  getCanSort: vi.fn(() => true),
                  getIsSorted: vi.fn(() => 'asc'),
                  getToggleSortingHandler: vi.fn(() => vi.fn()),
                  columnDef: { header: 'Name' }
                },
                getContext: vi.fn(() => ({}))
              }
            ]
          }
        ])
      };

      render(
        <DataTable
          table={tableWithAscSort}
          selectedRow={null}
          setSelectedRow={mockSetSelectedRow}
          lastAddedId={null}
        />
      );

      const nameHeader = screen.getByText('Name').closest('th');
      const sortIcon = nameHeader?.querySelector('.bi-arrow-up');
      expect(sortIcon).toBeInTheDocument();
    });

    it('shows descending sort indicator', () => {
      const tableWithDescSort = {
        ...mockTable,
        getHeaderGroups: vi.fn(() => [
          {
            id: 'header-group-1',
            headers: [
              {
                id: 'header-1',
                column: {
                  getCanSort: vi.fn(() => true),
                  getIsSorted: vi.fn(() => 'desc'),
                  getToggleSortingHandler: vi.fn(() => vi.fn()),
                  columnDef: { header: 'Name' }
                },
                getContext: vi.fn(() => ({}))
              }
            ]
          }
        ])
      };

      render(
        <DataTable
          table={tableWithDescSort}
          selectedRow={null}
          setSelectedRow={mockSetSelectedRow}
          lastAddedId={null}
        />
      );

      const nameHeader = screen.getByText('Name').closest('th');
      const sortIcon = nameHeader?.querySelector('.bi-arrow-down');
      expect(sortIcon).toBeInTheDocument();
    });

    it('calls toggle sorting handler when sortable header is clicked', () => {
      const mockToggleHandler = vi.fn();
      const tableWithToggle = {
        ...mockTable,
        getHeaderGroups: vi.fn(() => [
          {
            id: 'header-group-1',
            headers: [
              {
                id: 'header-1',
                column: {
                  getCanSort: vi.fn(() => true),
                  getIsSorted: vi.fn(() => false),
                  getToggleSortingHandler: vi.fn(() => mockToggleHandler),
                  columnDef: { header: 'Name' }
                },
                getContext: vi.fn(() => ({}))
              }
            ]
          }
        ])
      };

      render(
        <DataTable
          table={tableWithToggle}
          selectedRow={null}
          setSelectedRow={mockSetSelectedRow}
          lastAddedId={null}
        />
      );

      const nameHeader = screen.getByText('Name').closest('th');
      fireEvent.click(nameHeader!);
      expect(mockToggleHandler).toHaveBeenCalled();
    });
  });

  describe('Row selection', () => {
    it('highlights selected row', () => {
      render(
        <DataTable
          table={mockTable}
          selectedRow={{ id: 'item-1', name: 'Test Item 1' }}
          setSelectedRow={mockSetSelectedRow}
          lastAddedId={null}
        />
      );

      const firstRow = screen.getByText('Test Item 1').closest('tr');
      expect(firstRow).toHaveClass('table-active');
    });

    it('highlights newly added row', () => {
      render(
        <DataTable
          table={mockTable}
          selectedRow={null}
          setSelectedRow={mockSetSelectedRow}
          lastAddedId="item-1"
        />
      );

      const firstRow = screen.getByText('Test Item 1').closest('tr');
      expect(firstRow).toHaveClass('table-success');
    });

    it('calls setSelectedRow when row is clicked', () => {
      render(
        <DataTable
          table={mockTable}
          selectedRow={null}
          setSelectedRow={mockSetSelectedRow}
          lastAddedId={null}
        />
      );

      const firstRow = screen.getByText('Test Item 1').closest('tr');
      fireEvent.click(firstRow!);
      expect(mockSetSelectedRow).toHaveBeenCalledWith({ id: 'item-1', name: 'Test Item 1' });
    });

    it('deselects row when selected row is clicked again', () => {
      render(
        <DataTable
          table={mockTable}
          selectedRow={{ id: 'item-1', name: 'Test Item 1' }}
          setSelectedRow={mockSetSelectedRow}
          lastAddedId={null}
        />
      );

      const firstRow = screen.getByText('Test Item 1').closest('tr');
      fireEvent.click(firstRow!);
      expect(mockSetSelectedRow).toHaveBeenCalledWith(null);
    });

    it('does not select row when clicking on image with data-image-clickable', () => {
      const tableWithImage = {
        ...mockTable,
        getRowModel: vi.fn(() => ({
          rows: [
            {
              id: 'row-1',
              original: { id: 'item-1', name: 'Test Item 1' },
              getVisibleCells: vi.fn(() => [
                {
                  id: 'cell-1',
                  column: { columnDef: { cell: 'Test Item 1' } },
                  getContext: vi.fn(() => ({}))
                },
                {
                  id: 'cell-2',
                  column: { 
                    columnDef: { 
                      cell: React.createElement('img', { 
                        'data-image-clickable': true,
                        src: 'test.jpg',
                        alt: 'test'
                      })
                    } 
                  },
                  getContext: vi.fn(() => ({}))
                }
              ])
            }
          ]
        }))
      };

      render(
        <DataTable
          table={tableWithImage}
          selectedRow={null}
          setSelectedRow={mockSetSelectedRow}
          lastAddedId={null}
        />
      );

      const image = screen.getByRole('img');
      fireEvent.click(image);
      expect(mockSetSelectedRow).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('handles empty table', () => {
      const emptyTable = {
        getHeaderGroups: vi.fn(() => [
          {
            id: 'header-group-1',
            headers: [
              {
                id: 'header-1',
                column: {
                  getCanSort: vi.fn(() => true),
                  getIsSorted: vi.fn(() => false),
                  getToggleSortingHandler: vi.fn(() => vi.fn()),
                  columnDef: { header: 'Name' }
                },
                getContext: vi.fn(() => ({}))
              }
            ]
          }
        ]),
        getRowModel: vi.fn(() => ({ rows: [] }))
      };

      render(
        <DataTable
          table={emptyTable}
          selectedRow={null}
          setSelectedRow={mockSetSelectedRow}
          lastAddedId={null}
        />
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.queryByText('Test Item 1')).not.toBeInTheDocument();
    });

    it('handles table with no headers', () => {
      const noHeadersTable = {
        getHeaderGroups: vi.fn(() => []),
        getRowModel: vi.fn(() => ({ rows: [] }))
      };

      render(
        <DataTable
          table={noHeadersTable}
          selectedRow={null}
          setSelectedRow={mockSetSelectedRow}
          lastAddedId={null}
        />
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('handles missing toggle sorting handler', () => {
      const tableWithoutToggle = {
        ...mockTable,
        getHeaderGroups: vi.fn(() => [
          {
            id: 'header-group-1',
            headers: [
              {
                id: 'header-1',
                column: {
                  getCanSort: vi.fn(() => true),
                  getIsSorted: vi.fn(() => false),
                  getToggleSortingHandler: vi.fn(() => undefined),
                  columnDef: { header: 'Name' }
                },
                getContext: vi.fn(() => ({}))
              }
            ]
          }
        ])
      };

      render(
        <DataTable
          table={tableWithoutToggle}
          selectedRow={null}
          setSelectedRow={mockSetSelectedRow}
          lastAddedId={null}
        />
      );

      const nameHeader = screen.getByText('Name').closest('th');
      expect(nameHeader).toHaveStyle({ cursor: 'pointer' });
      // Should not throw error when clicked
      fireEvent.click(nameHeader!);
    });
  });

  describe('Accessibility', () => {
    it('has proper table structure', () => {
      render(
        <DataTable
          table={mockTable}
          selectedRow={null}
          setSelectedRow={mockSetSelectedRow}
          lastAddedId={null}
        />
      );

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      expect(table).toHaveClass('custom-table', 'mb-0', 'table-hover');
    });

    it('has proper cursor styles', () => {
      render(
        <DataTable
          table={mockTable}
          selectedRow={null}
          setSelectedRow={mockSetSelectedRow}
          lastAddedId={null}
        />
      );

      const rows = screen.getAllByRole('row');
      rows.forEach(row => {
        if (row.tagName === 'TR' && !row.closest('thead')) {
          expect(row).toHaveStyle({ cursor: 'default' });
        }
      });
    });
  });
});
