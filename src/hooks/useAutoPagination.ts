'use client';

import { RefObject, useEffect } from 'react';

interface AutoPaginationOptions {
  sentinelRef: RefObject<Element | null>;
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}

export function useAutoPagination({
  sentinelRef,
  hasMore,
  loading,
  onLoadMore,
}: AutoPaginationOptions) {
  useEffect(() => {
    const target = sentinelRef.current;
    if (!target || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: '300px 0px' }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [sentinelRef, hasMore, loading, onLoadMore]);
}
