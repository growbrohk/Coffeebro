import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useOfferParticipants } from '@/hooks/useOfferParticipants';
import { useUserRole } from '@/hooks/useUserRole';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function OfferParticipantsPage() {
  const { offerId } = useParams<{ offerId: string }>();
  const navigate = useNavigate();
  const { canHostEvent, isLoading: roleLoading } = useUserRole();
  const { data: participants = [], isLoading, error } = useOfferParticipants(offerId || null);

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

  // Calculate counts
  const total = participants.length;
  const active = participants.filter((p) => p.status === 'active').length;
  const redeemed = participants.filter((p) => p.status === 'redeemed').length;

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

        {/* Counts */}
        <div className="flex gap-4 mb-6 text-sm">
          <span><span className="font-semibold">Total:</span> {total}</span>
          <span><span className="font-semibold">Active:</span> {active}</span>
          <span><span className="font-semibold">Redeemed:</span> {redeemed}</span>
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
          {participants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No participants yet.
            </div>
          ) : (
            <div className="overflow-x-auto border border-foreground/10 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Coffee</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Created</th>
                    <th className="px-4 py-3 font-semibold">Redeemed</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p) => (
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
