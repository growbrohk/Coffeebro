import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Calendar, Check, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEventRegistration, useRegisterForEvent, useCancelRegistration } from '@/hooks/useEventRegistrations';
import { useToast } from '@/hooks/use-toast';
import { useCanViewParticipants } from '@/hooks/useCanViewParticipants';
import type { RunClubEvent } from '@/hooks/useEvents';

interface EventDetailModalProps {
  event: RunClubEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventDetailModal({ event, open, onOpenChange }: EventDetailModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showRegisterConfirm, setShowRegisterConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  
  const { data: registration, isLoading: isLoadingRegistration } = useEventRegistration(event?.id);
  const { data: canViewParticipants, isLoading: isLoadingCanView } = useCanViewParticipants(event?.id || null);
  const registerMutation = useRegisterForEvent();
  const cancelMutation = useCancelRegistration();
  
  if (!event) return null;

  const formatDate = (dateStr: string) => {
    // Parse date parts directly from YYYY-MM-DD to avoid timezone issues
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isRegistered = registration?.status === 'registered';
  const existingRegistrationId = registration?.id;

  const handleRegisterClick = () => {
    if (!user) {
      toast({
        title: 'Please log in to register',
        description: 'You need to be logged in to register for events.',
        variant: 'destructive',
      });
      return;
    }
    setShowRegisterConfirm(true);
  };

  const handleConfirmRegister = async () => {
    setShowRegisterConfirm(false);
    try {
      await registerMutation.mutateAsync({
        eventId: event.id,
        existingRegistrationId: existingRegistrationId,
      });
      toast({
        title: 'Registered!',
        description: `You're registered for ${event.name}.`,
      });
    } catch (error) {
      toast({
        title: 'Registration failed',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCancelClick = () => {
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = async () => {
    setShowCancelConfirm(false);
    if (!existingRegistrationId) return;
    
    try {
      await cancelMutation.mutateAsync({
        registrationId: existingRegistrationId,
        eventId: event.id,
      });
      toast({
        title: 'Cancelled',
        description: 'Your registration has been cancelled.',
      });
    } catch (error) {
      toast({
        title: 'Cancellation failed',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const isActionLoading = registerMutation.isPending || cancelMutation.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-background border border-foreground/20">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">
              {event.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            {/* Date */}
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDate(event.event_date)}</span>
            </div>
            
            {/* Time */}
            {event.event_time && (
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{event.event_time}</span>
              </div>
            )}
            
            {/* Location */}
            {event.location && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{event.location}</span>
              </div>
            )}
            
            {/* Description */}
            {event.description && (
              <div className="pt-2 border-t border-foreground/10">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {event.description}
                </p>
              </div>
            )}

            {/* Registration Controls */}
            <div className="pt-4 border-t border-foreground/10 space-y-3">
              {isLoadingRegistration ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : isRegistered ? (
                <div className="flex items-center gap-3">
                  <Button disabled className="flex items-center gap-2 bg-green-600 hover:bg-green-600 text-white">
                    <Check className="h-4 w-4" />
                    Registered
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancelClick}
                    disabled={isActionLoading}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleRegisterClick}
                  disabled={isActionLoading}
                  className="w-full sm:w-auto"
                >
                  Register
                </Button>
              )}
              
              {/* View Participants Button - Only show if user can view participants */}
              {!isLoadingCanView && canViewParticipants && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    navigate('/host/participants', { state: { eventId: event.id } });
                  }}
                  className="w-full flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  View Participants
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Register Confirmation Dialog */}
      <AlertDialog open={showRegisterConfirm} onOpenChange={setShowRegisterConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Register for this event?</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm your registration for {event.name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>no....</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRegister}>YES!</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel registration?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your registration for {event.name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel}>Yes, cancel</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
