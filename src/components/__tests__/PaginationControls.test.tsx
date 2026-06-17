import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock react-bootstrap components specifically for this test
vi.mock('react-bootstrap', () => ({
  Button: ({ children, onClick, disabled, variant, 'aria-label': ariaLabel }: any) => 
    React.createElement('button', { 
      onClick, 
      disabled, 
      'data-variant': variant,
      'aria-label': ariaLabel,
      'data-testid': 'button'
    }, children),
  Spinner: ({ animation, size, variant }: any) => 
    React.createElement('div', { 
      'data-testid': 'spinner', 
      'data-animation': animation,
      'data-size': size,
      'data-variant': variant,
      role: 'status'
    }),
}));

import { PaginationControls } from '../PaginationControls';

describe('PaginationControls', () => {
  const mockOnPageChange = vi.fn();
  const mockOnLoadMore = vi.fn();
  const mockLoadMoreRef = React.createRef<HTMLDivElement>();

  beforeEach(() => {
    mockOnPageChange.mockClear();
    mockOnLoadMore.mockClear();
  });

  describe('Mobile mode', () => {
    it('renders load more message when mobile and has more pages', () => {
      render(
        <PaginationControls
          page={1}
          totalPages={5}
          hasMore={true}
          isMobile={true}
          isLoadingMore={false}
          onPageChange={mockOnPageChange}
          onLoadMore={mockOnLoadMore}
          loadMoreRef={mockLoadMoreRef}
        />
      );

      expect(screen.getByText('Desliza para cargar más...')).toBeInTheDocument();
      expect(screen.getByText('Desliza para cargar más...')).toHaveClass('text-muted');
    });

    it('renders spinner when mobile, has more pages and loading', () => {
      render(
        <PaginationControls
          page={1}
          totalPages={5}
          hasMore={true}
          isMobile={true}
          isLoadingMore={true}
          onPageChange={mockOnPageChange}
          onLoadMore={mockOnLoadMore}
          loadMoreRef={mockLoadMoreRef}
        />
      );

      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('data-animation', 'border');
      expect(spinner).toHaveAttribute('data-size', 'sm');
      expect(spinner).toHaveAttribute('data-variant', 'primary');
    });

    it('does not render when mobile but no more pages', () => {
      render(
        <PaginationControls
          page={5}
          totalPages={5}
          hasMore={false}
          isMobile={true}
          isLoadingMore={false}
          onPageChange={mockOnPageChange}
          onLoadMore={mockOnLoadMore}
          loadMoreRef={mockLoadMoreRef}
        />
      );

      expect(screen.queryByText('Desliza para cargar más...')).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  describe('Desktop mode', () => {
    it('renders pagination controls when desktop and multiple pages', () => {
      render(
        <PaginationControls
          page={2}
          totalPages={5}
          hasMore={true}
          isMobile={false}
          isLoadingMore={false}
          onPageChange={mockOnPageChange}
          onLoadMore={mockOnLoadMore}
        />
      );

      expect(screen.getByText('Anterior')).toBeInTheDocument();
      expect(screen.getByText('Siguiente')).toBeInTheDocument();
      expect(screen.getByText('Página 2 de 5')).toBeInTheDocument();
    });

    it('has correct navigation attributes', () => {
      const { container } = render(
        <PaginationControls
          page={2}
          totalPages={5}
          hasMore={true}
          isMobile={false}
          isLoadingMore={false}
          onPageChange={mockOnPageChange}
          onLoadMore={mockOnLoadMore}
        />
      );

      const nav = container.querySelector('[role="navigation"]');
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveAttribute('aria-label', 'Paginación. Página 2 de 5');
      expect(nav).toHaveClass('pagination-controls');
    });

    it('disables previous button on first page', () => {
      render(
        <PaginationControls
          page={1}
          totalPages={5}
          hasMore={true}
          isMobile={false}
          isLoadingMore={false}
          onPageChange={mockOnPageChange}
          onLoadMore={mockOnLoadMore}
        />
      );

      const prevButton = screen.getByRole('button', { name: /página anterior/i });
      expect(prevButton).toBeDisabled();
    });

    it('disables next button on last page', () => {
      render(
        <PaginationControls
          page={5}
          totalPages={5}
          hasMore={true}
          isMobile={false}
          isLoadingMore={false}
          onPageChange={mockOnPageChange}
          onLoadMore={mockOnLoadMore}
        />
      );

      const nextButton = screen.getByRole('button', { name: /página siguiente/i });
      expect(nextButton).toBeDisabled();
    });

    it('enables both buttons on middle pages', () => {
      render(
        <PaginationControls
          page={3}
          totalPages={5}
          hasMore={true}
          isMobile={false}
          isLoadingMore={false}
          onPageChange={mockOnPageChange}
          onLoadMore={mockOnLoadMore}
        />
      );

      const prevButton = screen.getByRole('button', { name: /página anterior/i });
      const nextButton = screen.getByRole('button', { name: /página siguiente/i });
      
      expect(prevButton).not.toBeDisabled();
      expect(nextButton).not.toBeDisabled();
    });

    it('calls onPageChange with correct page when previous clicked', () => {
      render(
        <PaginationControls
          page={3}
          totalPages={5}
          hasMore={true}
          isMobile={false}
          isLoadingMore={false}
          onPageChange={mockOnPageChange}
          onLoadMore={mockOnLoadMore}
        />
      );

      const prevButton = screen.getByRole('button', { name: /página anterior/i });
      fireEvent.click(prevButton);
      
      expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });

    it('calls onPageChange with correct page when next clicked', () => {
      render(
        <PaginationControls
          page={3}
          totalPages={5}
          hasMore={true}
          isMobile={false}
          isLoadingMore={false}
          onPageChange={mockOnPageChange}
          onLoadMore={mockOnLoadMore}
        />
      );

      const nextButton = screen.getByRole('button', { name: /página siguiente/i });
      fireEvent.click(nextButton);
      
      expect(mockOnPageChange).toHaveBeenCalledWith(4);
    });

    it('does not render when desktop but only one page', () => {
      render(
        <PaginationControls
          page={1}
          totalPages={1}
          hasMore={false}
          isMobile={false}
          isLoadingMore={false}
          onPageChange={mockOnPageChange}
          onLoadMore={mockOnLoadMore}
        />
      );

      expect(screen.queryByText('Anterior')).not.toBeInTheDocument();
      expect(screen.queryByText('Siguiente')).not.toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('handles page boundaries correctly', () => {
      const { rerender } = render(
        <PaginationControls
          page={2}
          totalPages={5}
          hasMore={true}
          isMobile={false}
          isLoadingMore={false}
          onPageChange={mockOnPageChange}
          onLoadMore={mockOnLoadMore}
        />
      );

      // Test previous button on second page
      const prevButton = screen.getByRole('button', { name: /página anterior/i });
      fireEvent.click(prevButton);
      expect(mockOnPageChange).toHaveBeenCalledWith(1);

      // Clear mock for next test
      mockOnPageChange.mockClear();

      // Test next button on second to last page
      rerender(
        <PaginationControls
          page={4}
          totalPages={5}
          hasMore={true}
          isMobile={false}
          isLoadingMore={false}
          onPageChange={mockOnPageChange}
          onLoadMore={mockOnLoadMore}
        />
      );

      const nextButton = screen.getByRole('button', { name: /página siguiente/i });
      fireEvent.click(nextButton);
      expect(mockOnPageChange).toHaveBeenCalledWith(5);
    });

    it('applies loadMoreRef correctly', () => {
      const { container } = render(
        <PaginationControls
          page={1}
          totalPages={5}
          hasMore={true}
          isMobile={true}
          isLoadingMore={false}
          onPageChange={mockOnPageChange}
          onLoadMore={mockOnLoadMore}
          loadMoreRef={mockLoadMoreRef}
        />
      );

      const loadMoreDiv = container.querySelector('.text-center.py-3');
      expect(loadMoreDiv).toBeInTheDocument();
      expect(mockLoadMoreRef.current).toBe(loadMoreDiv);
    });

    it('has correct display name', () => {
      expect(PaginationControls.displayName).toBe('PaginationControls');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for buttons', () => {
      render(
        <PaginationControls
          page={2}
          totalPages={5}
          hasMore={true}
          isMobile={false}
          isLoadingMore={false}
          onPageChange={mockOnPageChange}
          onLoadMore={mockOnLoadMore}
        />
      );

      expect(screen.getByRole('button', { name: /página anterior/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /página siguiente/i })).toBeInTheDocument();
    });

    it('has proper navigation role and aria-label', () => {
      const { container } = render(
        <PaginationControls
          page={3}
          totalPages={7}
          hasMore={true}
          isMobile={false}
          isLoadingMore={false}
          onPageChange={mockOnPageChange}
          onLoadMore={mockOnLoadMore}
        />
      );

      const nav = container.querySelector('[role="navigation"]');
      expect(nav).toHaveAttribute('aria-label', 'Paginación. Página 3 de 7');
    });
  });
});
