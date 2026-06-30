import { useEffect, useRef, type ReactNode } from 'react';

type InfiniteScrollListProps = {
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isEmpty: boolean;
  emptyMessage: string;
  error: Error | null;
  children: ReactNode;
};

export function InfiniteScrollList({
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  isEmpty,
  emptyMessage,
  error,
  children,
}: InfiniteScrollListProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (error) {
    return <p className="text-sm text-destructive">{error.message}</p>;
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (isEmpty) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {children}
      {hasNextPage ? (
        <div ref={sentinelRef} className="py-2 text-center text-xs text-muted-foreground">
          {isFetchingNextPage ? 'Loading more…' : ''}
        </div>
      ) : null}
    </div>
  );
}
