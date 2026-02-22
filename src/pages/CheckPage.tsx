import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ProgressBar';
import { CoffeeModal } from '@/components/CoffeeModal';
import { CoffeeDetailsSheet, CoffeeDetails } from '@/components/CoffeeDetailsSheet';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentMonthProgress, useTodayCoffee, useCoffeeCheckIn, useTodayPercentage } from '@/hooks/useCoffees';
import { useNavigate } from 'react-router-dom';

export default function CheckPage() {
  const { user, loading } = useAuth();
  const { data: progress, isLoading: progressLoading } = useCurrentMonthProgress();
  const { data: todayCoffee, isLoading: todayLoading } = useTodayCoffee();
  const { data: percentage } = useTodayPercentage();
  const coffeeCheckIn = useCoffeeCheckIn();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [showNo, setShowNo] = useState(false);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);

  const hasCheckedToday = user ? !!todayCoffee : false;
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

  const handleDetailsSave = async (details: CoffeeDetails) => {
    try {
      await coffeeCheckIn.mutateAsync({
        rating: details.rating,
        coffee_type: details.coffee_type,
        coffee_type_other: details.coffee_type_other,
        place: details.place,
        diary: details.diary,
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
              You checked in already today
            </h1>
            <p className="text-lg font-semibold text-muted-foreground">
              Nice sip!
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-black uppercase tracking-tight text-center mb-12">
              Have you coffee today?
            </h1>

            <div className="w-full max-w-sm space-y-4">
              <Button
                onClick={handleYes}
                className="btn-run btn-run-yes"
                disabled={coffeeCheckIn.isPending}
              >
                {coffeeCheckIn.isPending ? 'Checking...' : 'Yes'}
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
                  {percentage || 0}% of users have already had coffee today
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <CoffeeDetailsSheet
        open={showDetailsSheet}
        onOpenChange={setShowDetailsSheet}
        onSave={handleDetailsSave}
        isPending={coffeeCheckIn.isPending}
      />

      <CoffeeModal
        open={showModal}
        onOpenChange={setShowModal}
        percentBeat={percentBeat}
      />
    </div>
  );
}
