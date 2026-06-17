import { useState, useEffect, useRef, useCallback } from 'react';

interface UsePaginationOptions {
  pageSize?: number;
  mobileBreakpoint?: number;
}

interface UsePaginationReturn {
  page: number;
  pageSize: number;
  hasMore: boolean;
  isMobile: boolean;
  isLoadingMore: boolean;
  paginatedItems: any[];
  totalPages: number;
  setPage: (page: number) => void;
  loadMore: () => void;
  resetPagination: () => void;
  loadMoreRef: React.RefObject<HTMLDivElement | null>;
}

export const usePagination = (
  items: any[],
  options: UsePaginationOptions = {}
): UsePaginationReturn => {
  const { pageSize = 12, mobileBreakpoint = 768 } = options;
  
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= mobileBreakpoint);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [mobileBreakpoint]);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (!isMobile || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, hasMore, isLoadingMore]);

  // Update hasMore when items change
  useEffect(() => {
    setHasMore(items.length >= pageSize);
  }, [items.length, pageSize]);

  const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    const nextSlice = items.slice(0, nextPage * pageSize);
    setHasMore(nextSlice.length < items.length);
    setIsLoadingMore(false);
  }, [hasMore, isLoadingMore, page, pageSize, items]);

  const resetPagination = useCallback(() => {
    setPage(1);
    setHasMore(items.length >= pageSize);
  }, [items.length, pageSize]);

  return {
    page,
    pageSize,
    hasMore,
    isMobile,
    isLoadingMore,
    paginatedItems,
    totalPages,
    setPage,
    loadMore,
    resetPagination,
    loadMoreRef,
  };
};
