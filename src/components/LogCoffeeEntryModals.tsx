import { CoffeeModal } from '@/components/CoffeeModal';
import { CoffeeDetailsSheet } from '@/components/CoffeeDetailsSheet';
import type { CoffeeDetails } from '@/hooks/useCoffees';
import type { LogCoffeePrefill } from '@/contexts/LogCoffeeEntryContext';

export type LogCoffeeEntryModalsProps = {
  detailsSheetOpen: boolean;
  onDetailsSheetOpenChange: (open: boolean) => void;
  celebrationOpen: boolean;
  onCelebrationOpenChange: (open: boolean) => void;
  onDetailsSave: (details: CoffeeDetails) => Promise<void>;
  addCoffeePending: boolean;
  percentBeat: number;
  prefill: LogCoffeePrefill | null;
  lockCoffeeShop: boolean;
};

export function LogCoffeeEntryModals({
  detailsSheetOpen,
  onDetailsSheetOpenChange,
  celebrationOpen,
  onCelebrationOpenChange,
  onDetailsSave,
  addCoffeePending,
  percentBeat,
  prefill,
  lockCoffeeShop,
}: LogCoffeeEntryModalsProps) {
  return (
    <>
      <CoffeeDetailsSheet
        open={detailsSheetOpen}
        onOpenChange={onDetailsSheetOpenChange}
        onSave={onDetailsSave}
        isPending={addCoffeePending}
        prefill={prefill}
        lockCoffeeShop={lockCoffeeShop}
      />
      <CoffeeModal
        open={celebrationOpen}
        onOpenChange={onCelebrationOpenChange}
        percentBeat={percentBeat}
      />
    </>
  );
}
