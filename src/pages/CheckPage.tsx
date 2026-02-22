import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ProgressBar';
import { RunModal } from '@/components/RunModal';
import { RunDetailsSheet, RunDetails } from '@/components/RunDetailsSheet';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentMonthProgress, useTodayRun, useCheckIn, useTodayPercentage } from '@/hooks/useRuns';
import { useNavigate } from 'react-router-dom';

export default function CheckPage() {
  const { user, loading } = useAuth();
  const { data: progress, isLoading: progressLoading } = useCurrentMonthProgress();
  const { data: todayRun, isLoading: todayLoading } = useTodayRun();
  const { data: percentage } = useTodayPercentage();
  const checkIn = useCheckIn();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [showNo, setShowNo] = useState(false);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);

  const hasCheckedToday = user ? !!todayRun : false;
  const isLoading = loading || (user && (progressLoading || todayLoading));

  const handleYes = () => {
    // If not logged in, redirect to profile with message
    if (!user) {
      navigate('/profile?msg=tracking');
      return;
    }

    if (hasCheckedToday) return;
    
    // Open the details sheet instead of immediately checking in
    setShowDetailsSheet(true);
  };

  const handleDetailsSave = async (details: RunDetails) => {
    try {
      await checkIn.mutateAsync({
        duration_minutes: details.duration_minutes,
        run_type: details.run_type,
        tiredness_score: details.tiredness_score,
      });
      setShowDetailsSheet(false);
      setShowNo(false);
      setShowModal(true);
    } catch (error) {
      console.error('Error checking in:', error);
    }
  };

  const handleNo = () => {
    setShowNo(true);
  };

  const percentBeat = 100 - (percentage || 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      <ProgressBar 
        current={user ? (progress?.completed || 0) : 0} 
        total={progress?.total || 30} 
      />

      <div className="container flex flex-col items-center justify-center px-4 pt-16">
        {isLoading ? (
          <div className="animate-pulse text-lg font-semibold">Loading...</div>
        ) : hasCheckedToday ? (
          <div className="text-center animate-fade-in">
            <div className="text-6xl mb-6">✓</div>
            <h1 className="text-2xl font-black uppercase tracking-tight mb-2">
              You checked already today
            </h1>
            <p className="text-lg font-semibold text-muted-foreground">
              Nice work!
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-black uppercase tracking-tight text-center mb-12">
              Have you run today?
            </h1>

            <div className="w-full max-w-sm space-y-4">
              <Button
                onClick={handleYes}
                className="btn-run btn-run-yes"
                disabled={checkIn.isPending}
              >
                {checkIn.isPending ? 'Checking...' : 'Yes'}
              </Button>

              <Button
                onClick={handleNo}
                className="btn-run btn-run-no"
                variant="outline"
              >
                No
              </Button>
            </div>

            {showNo && (
              <div className="mt-8 text-center animate-fade-in">
                <p className="text-xl font-bold mb-2">You got this.</p>
                <p className="text-muted-foreground">
                  {percentage || 0}% of users have already run today
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <RunDetailsSheet
        open={showDetailsSheet}
        onOpenChange={setShowDetailsSheet}
        onSave={handleDetailsSave}
        isPending={checkIn.isPending}
      />

      <RunModal
        open={showModal}
        onOpenChange={setShowModal}
        percentBeat={percentBeat}
      />
    </div>
  );
}
