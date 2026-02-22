import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ProgressBar';
import { CoffeeModal } from '@/components/CoffeeModal';
import { CoffeeDetailsSheet, CoffeeDetails } from '@/components/CoffeeDetailsSheet';
import { useAuth } from '@/contexts/AuthContext';
import { useMonthCoffeeCount, useTodayCoffees, useAddCoffee, useTodayPercentage } from '@/hooks/useCoffees';
import { useNavigate } from 'react-router-dom';

// Temporary type until database types are regenerated
type CoffeeRow = {
  id: string;
  user_id: string;
  coffee_date: string;
  rating: number | null;
  coffee_type: string | null;
  coffee_type_other: string | null;
  place: string | null;
  diary: string | null;
  created_at: string;
  updated_at: string;
};

export default function CheckPage() {
  const { user, loading } = useAuth();
  const { data: monthCount = 0, isLoading: countLoading } = useMonthCoffeeCount();
  const { data: todayCoffees = [], isLoading: todayLoading } = useTodayCoffees();
  const { data: percentage } = useTodayPercentage();
  const addCoffee = useAddCoffee();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);

  const isLoading = loading || (user && (countLoading || todayLoading));

  const handleAddCoffee = () => {
    // If not logged in, redirect to profile with message
    if (!user) {
      navigate('/profile?msg=tracking');
      return;
    }
    
    // Open the details sheet
    setShowDetailsSheet(true);
  };

  const handleDetailsSave = async (details: CoffeeDetails) => {
    try {
      await addCoffee.mutateAsync({
        rating: details.rating,
        coffee_type: details.coffee_type,
        coffee_type_other: details.coffee_type_other,
        place: details.place,
        diary: details.diary,
      });
      setShowDetailsSheet(false);
      setShowModal(true);
    } catch (error) {
      console.error('Error adding coffee:', error);
    }
  };

  const percentBeat = 100 - (percentage || 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      <ProgressBar monthCount={monthCount} />

      <div className="container flex flex-col items-center justify-center px-4 pt-16">
        {isLoading ? (
          <div className="animate-pulse text-lg font-semibold">Loading...</div>
        ) : (
          <>
            <h1 className="text-3xl font-black uppercase tracking-tight text-center mb-12">
              Log a coffee ☕
            </h1>

            <div className="w-full max-w-sm space-y-6">
              <Button
                onClick={handleAddCoffee}
                className="btn-run btn-run-yes w-full"
                disabled={addCoffee.isPending}
                size="lg"
              >
                {addCoffee.isPending ? 'Saving...' : '+ Add Coffee'}
              </Button>

              {/* Today's coffees list */}
              {todayCoffees.length > 0 && (
                <div className="mt-8 space-y-3 animate-fade-in">
                  <p className="text-sm font-semibold text-muted-foreground text-center">
                    Today: {todayCoffees.length} {todayCoffees.length === 1 ? 'coffee' : 'coffees'}
                  </p>
                  <div className="space-y-2">
                    {todayCoffees.slice(0, 3).map((coffee: any) => (
                      <div
                        key={coffee.id}
                        className="bg-muted/50 rounded-lg p-3 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {coffee.coffee_type === 'Other' 
                              ? coffee.coffee_type_other || 'Coffee'
                              : coffee.coffee_type || 'Coffee'}
                          </span>
                          {coffee.rating && (
                            <span className="text-muted-foreground">
                              {coffee.rating}/10
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {todayCoffees.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{todayCoffees.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <CoffeeDetailsSheet
        open={showDetailsSheet}
        onOpenChange={setShowDetailsSheet}
        onSave={handleDetailsSave}
        isPending={addCoffee.isPending}
      />

      <CoffeeModal
        open={showModal}
        onOpenChange={setShowModal}
        percentBeat={percentBeat}
      />
    </div>
  );
}
