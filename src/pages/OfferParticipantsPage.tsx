import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useOfferParticipants } from '@/hooks/useOfferParticipants';
import { useUserRole } from '@/hooks/useUserRole';
import { ArrowLeft, Users, Coffee, CheckCircle, Clock } from 'lucide-react';
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
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Format owner ID helper (show first 8 chars)
  const formatOwnerId = (ownerId: string) => {
    return ownerId.substring(0, 8) + '...';
  };

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
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">Total:</span>
            <span>{total}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">Active:</span>
            <span>{active}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">Redeemed:</span>
            <span>{redeemed}</span>
          </div>
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
        <div className="space-y-2">
          {participants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No participants yet.
            </div>
          ) : (
            <div className="border rounded-lg divide-y">
              {participants.map((participant) => (
                <div
                  key={participant.voucher_id}
                  className="p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    {/* Owner info */}
                    <div className="flex-1">
                      <div className="font-semibold">
                        {participant.owner_name || formatOwnerId(participant.owner_id)}
                      </div>
                      {participant.owner_handle && (
                        <div className="text-sm text-muted-foreground">
                          @{participant.owner_handle}
                        </div>
                      )}
                    </div>

                    {/* Coffee type */}
                    <div className="flex items-center gap-2 text-sm">
                      <Coffee className="h-4 w-4 text-muted-foreground" />
                      <span>{participant.selected_coffee_type || '-'}</span>
                    </div>

                    {/* Status badge */}
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'px-2 py-1 rounded text-xs font-medium',
                          participant.status === 'redeemed'
                            ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                            : participant.status === 'active'
                            ? 'bg-blue-500/20 text-blue-700 dark:text-blue-400'
                            : 'bg-gray-500/20 text-gray-700 dark:text-gray-400'
                        )}
                      >
                        {participant.status}
                      </span>
                    </div>

                    {/* Timestamps */}
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Created: {formatDate(participant.created_at)}</div>
                      {participant.redeemed_at && (
                        <div>Redeemed: {formatDate(participant.redeemed_at)}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
