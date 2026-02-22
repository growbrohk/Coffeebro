import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useUserEvents } from '@/hooks/useUserEvents';
import { ArrowLeft } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function MyEventsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: events, isLoading: eventsLoading } = useUserEvents();

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-10 bg-background py-4 px-4 border-b border-border">
          <h1 className="text-2xl font-black uppercase tracking-tight text-center">
            View Event
          </h1>
        </div>
        <div className="container px-4 py-8">
          <div className="max-w-sm mx-auto p-6 bg-foreground text-background text-center">
            <p className="font-bold uppercase mb-4">Please log in to view your events.</p>
            <Button onClick={() => navigate('/profile')} variant="outline" className="btn-run">
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background py-4 px-4 border-b border-border">
        <div className="flex items-center justify-center relative">
          <button onClick={() => navigate(-1)} className="absolute left-0 p-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-black uppercase tracking-tight">
            View Event
          </h1>
        </div>
      </div>

      <div className="container px-4 py-8 max-w-2xl mx-auto">
        {eventsLoading ? (
          <div className="text-center p-6">
            <div className="animate-pulse text-muted-foreground">Loading events...</div>
          </div>
        ) : events && events.length > 0 ? (
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="p-6 bg-muted border border-border rounded-lg"
              >
                <div className="space-y-2">
                  <h2 className="text-xl font-black uppercase">{event.name}</h2>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center">
                      <span className="font-semibold uppercase text-muted-foreground mr-2">
                        Date:
                      </span>
                      <span>{format(parseISO(event.event_date), 'MMM d, yyyy')}</span>
                    </div>
                    {event.event_time && (
                      <div className="flex items-center">
                        <span className="font-semibold uppercase text-muted-foreground mr-2">
                          Time:
                        </span>
                        <span>{event.event_time}</span>
                      </div>
                    )}
                    {event.org_name && (
                      <div className="flex items-center">
                        <span className="font-semibold uppercase text-muted-foreground mr-2">
                          Organization:
                        </span>
                        <span>{event.org_name}</span>
                      </div>
                    )}
                    {event.location && (
                      <div className="flex items-center">
                        <span className="font-semibold uppercase text-muted-foreground mr-2">
                          Location:
                        </span>
                        <span>{event.location}</span>
                      </div>
                    )}
                    {event.description && (
                      <div className="pt-2">
                        <p className="text-muted-foreground">{event.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-6 bg-muted">
            <p className="font-medium text-muted-foreground mb-2">No events found.</p>
            <p className="text-sm text-muted-foreground">
              You haven't joined any events yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
