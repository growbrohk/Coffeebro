import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useOfferParticipants } from '@/hooks/useOfferParticipants';
import { useUserRole } from '@/hooks/useUserRole';
import { ArrowLeft, ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

type FilterTab = 'all' | 'active' | 'redeemed';
type SortKey = 'name' | 'coffee' | 'status';
type SortDir = 'asc' | 'desc';

export default function OfferParticipantsPage() {
  const { offerId } = useParams<{ offerId: string }>();
  const navigate = useNavigate();
  const { canHostEvent, isLoading: roleLoading } = useUserRole();
  const { data: participants = [], isLoading, error } = useOfferParticipants(offerId || null);

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(nextKey);
      setSortDir('asc');
    }
  }

  const filteredParticipants = useMemo(() => {
    if (activeFilter === 'all') return participants;
    return participants.filter((p) => p.status === activeFilter);
  }, [participants, activeFilter]);

  const sortedParticipants = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filteredParticipants].sort((a, b) => {
      const aName = (a.owner_name || a.owner_id || '').toLowerCase();
      const bName = (b.owner_name || b.owner_id || '').toLowerCase();
      const aCoffee = (a.selected_coffee_type || '').toLowerCase();
      const bCoffee = (b.selected_coffee_type || '').toLowerCase();
      const aStatus = (a.status || '').toLowerCase();
      const bStatus = (b.status || '').toLowerCase();

      let av = '';
      let bv = '';
      if (sortKey === 'name') {
        av = aName;
        bv = bName;
      }
      if (sortKey === 'coffee') {
        av = aCoffee;
        bv = bCoffee;
      }
      if (sortKey === 'status') {
        av = aStatus;
        bv = bStatus;
      }

      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filteredParticipants, sortKey, sortDir]);

  // Host gate
  if (!roleLoading && !canHostEvent) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <h1 className="text-2xl font-bold mb-4">No Access</h1>
          <p className="text-muted-foreground mb-6">
            You don't have permission to view participants.
          </p>
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Calculate counts (from full participants list)
  const totalCount = participants.length;
  const activeCount = participants.filter((p) => p.status === 'active').length;
  const redeemedCount = participants.filter((p) => p.status === 'redeemed').length;

  // Format date helper
  function formatDateTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          size="sm"
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold mb-4">Participants</h1>

        {/* Pill tabs */}
        <div className="flex gap-2 flex-wrap mb-6">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium border transition-colors',
              activeFilter === 'all'
                ? 'bg-foreground/5 border-foreground/30'
                : 'bg-transparent border-foreground/10 hover:border-foreground/20'
            )}
          >
            Total <span className="text-muted-foreground">({totalCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('active')}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium border transition-colors',
              activeFilter === 'active'
                ? 'bg-foreground/5 border-foreground/30'
                : 'bg-transparent border-foreground/10 hover:border-foreground/20'
            )}
          >
            Active <span className="text-muted-foreground">({activeCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('redeemed')}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium border transition-colors',
              activeFilter === 'redeemed'
                ? 'bg-foreground/5 border-foreground/30'
                : 'bg-transparent border-foreground/10 hover:border-foreground/20'
            )}
          >
            Redeemed <span className="text-muted-foreground">({redeemedCount})</span>
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-8 text-muted-foreground">
          Loading participants...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-center py-8">
          <p className="text-destructive mb-4">
            {error instanceof Error && error.message === 'NOT_AUTHORIZED'
              ? 'You do not have permission to view participants.'
              : 'Failed to load participants.'}
          </p>
          <Button onClick={() => navigate(-1)} variant="outline">
            Go Back
          </Button>
        </div>
      )}

      {/* Participants list */}
      {!isLoading && !error && (
        <div>
          {sortedParticipants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No participants yet.
            </div>
          ) : (
            <div className="overflow-x-auto border border-foreground/10 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-3">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-semibold hover:opacity-80"
                        onClick={() => toggleSort('name')}
                      >
                        Name
                        {sortKey === 'name' ? (
                          sortDir === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-50" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-semibold hover:opacity-80"
                        onClick={() => toggleSort('coffee')}
                      >
                        Coffee
                        {sortKey === 'coffee' ? (
                          sortDir === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-50" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-semibold hover:opacity-80"
                        onClick={() => toggleSort('status')}
                      >
                        Status
                        {sortKey === 'status' ? (
                          sortDir === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-50" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 font-semibold">Created</th>
                    <th className="px-4 py-3 font-semibold">Redeemed</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedParticipants.map((p) => (
                    <tr
                      key={p.voucher_id}
                      className="border-t border-foreground/10 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">
                        {p.owner_name || p.owner_id.slice(0, 6)}
                      </td>

                      <td className="px-4 py-3">
                        {p.selected_coffee_type || '-'}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'px-2 py-1 rounded text-xs font-medium',
                            p.status === 'redeemed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          )}
                        >
                          {p.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDateTime(p.created_at)}
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {p.redeemed_at ? formatDateTime(p.redeemed_at) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
