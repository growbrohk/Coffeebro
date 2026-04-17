import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

const PAGE = 5;

export type OrgCoffeeNoteRow = {
  id: string;
  tasting_notes: string;
  menu_item_label: string | null;
  created_at: string;
  reviewer_label: string;
};

type Cursor = { created_at: string; id: string } | null;

type Props = {
  orgId: string;
};

export function OrgPublicCoffeeNotes({ orgId }: Props) {
  const query = useInfiniteQuery({
    queryKey: ['public-org-notes', orgId],
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam as Cursor;
      const { data, error } = await supabase.rpc('get_public_org_coffee_notes', {
        p_org_id: orgId,
        p_cursor_created_at: cursor?.created_at ?? null,
        p_cursor_id: cursor?.id ?? null,
        p_limit: PAGE,
      });
      if (error) throw error;
      return (data ?? []) as OrgCoffeeNoteRow[];
    },
    initialPageParam: null as Cursor,
    getNextPageParam: (lastPage): Cursor => {
      if (lastPage.length < PAGE) return undefined as unknown as Cursor;
      const last = lastPage[lastPage.length - 1];
      return { created_at: last.created_at, id: last.id };
    },
    staleTime: 30_000,
  });

  const rows = query.data?.pages.flat() ?? [];

  if (query.isLoading) {
    return (
      <section>
        <h2 className="text-lg font-bold leading-snug tracking-normal text-[#2e1a14]">Guest notes</h2>
        <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
      </section>
    );
  }

  if (rows.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-lg font-bold leading-snug tracking-normal text-[#2e1a14]">Guest notes</h2>
      <ul className="mt-3 space-y-4">
        {rows.map((row) => {
          const dt = new Date(row.created_at);
          const when = Number.isNaN(dt.getTime())
            ? ''
            : dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
          return (
            <li key={row.id} className="rounded-xl border border-border/60 bg-white/60 px-3 py-3 shadow-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-[#2e1a14]">{row.reviewer_label}</p>
                <time className="text-xs tabular-nums text-muted-foreground" dateTime={row.created_at}>
                  {when}
                </time>
              </div>
              {row.menu_item_label ? (
                <p className="mt-1 text-xs text-muted-foreground">{row.menu_item_label}</p>
              ) : null}
              <p className="mt-2 text-sm leading-relaxed text-[#2e1a14]">{row.tasting_notes}</p>
            </li>
          );
        })}
      </ul>
      {query.hasNextPage ? (
        <Button
          type="button"
          variant="outline"
          className="mt-4 w-full rounded-full"
          onClick={() => void query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
        >
          {query.isFetchingNextPage ? 'Loading…' : 'Show more'}
        </Button>
      ) : null}
    </section>
  );
}
