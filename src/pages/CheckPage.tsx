import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ProgressBar';
import { LogCoffeeEntryModals } from '@/components/LogCoffeeEntryModals';
import { useAuth } from '@/contexts/AuthContext';
import { useMonthCoffeeCount, useTodayCoffees } from '@/hooks/useCoffees';
import { useLogCoffeeEntry } from '@/hooks/useLogCoffeeEntry';

export default function CheckPage() {
  const { user, loading } = useAuth();
  const { data: monthCount = 0, isLoading: countLoading } = useMonthCoffeeCount();
  const { data: todayCoffees = [], isLoading: todayLoading } = useTodayCoffees();
  const logCoffee = useLogCoffeeEntry();

  const isLoading = loading || (user && (countLoading || todayLoading));

  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col">
      <div className="container flex flex-col flex-1 items-center justify-center px-4 pt-16">
        {isLoading ? (
          <div className="animate-pulse text-lg font-semibold">Loading...</div>
        ) : (
          <>
            <h1 className="text-3xl font-black uppercase tracking-tight text-center mb-12">
              Log a coffee
            </h1>

            <div className="w-full max-w-sm space-y-6">
              <Button
                onClick={logCoffee.startLogCoffee}
                className="btn-run btn-run-yes w-full"
                disabled={logCoffee.addCoffeePending}
                size="lg"
              >
                {logCoffee.addCoffeePending ? 'Saving...' : '+ Add Coffee'}
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

      <ProgressBar placement="bottom" monthCount={monthCount} />

      <LogCoffeeEntryModals
        detailsSheetOpen={logCoffee.detailsSheetOpen}
        onDetailsSheetOpenChange={logCoffee.setDetailsSheetOpen}
        celebrationOpen={logCoffee.celebrationOpen}
        onCelebrationOpenChange={logCoffee.setCelebrationOpen}
        onDetailsSave={logCoffee.handleDetailsSave}
        addCoffeePending={logCoffee.addCoffeePending}
        percentBeat={logCoffee.percentBeat}
      />
    </div>
  );
}
