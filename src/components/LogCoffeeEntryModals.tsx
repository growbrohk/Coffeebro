import { CoffeeModal } from '@/components/CoffeeModal';
import { CoffeeDetailsSheet, type CoffeeDetails } from '@/components/CoffeeDetailsSheet';

export type LogCoffeeEntryModalsProps = {
  detailsSheetOpen: boolean;
  onDetailsSheetOpenChange: (open: boolean) => void;
  celebrationOpen: boolean;
  onCelebrationOpenChange: (open: boolean) => void;
  onDetailsSave: (details: CoffeeDetails) => Promise<void>;
  addCoffeePending: boolean;
  percentBeat: number;
};

export function LogCoffeeEntryModals({
  detailsSheetOpen,
  onDetailsSheetOpenChange,
  celebrationOpen,
  onCelebrationOpenChange,
  onDetailsSave,
  addCoffeePending,
  percentBeat,
}: LogCoffeeEntryModalsProps) {
  return (
    <>
      <CoffeeDetailsSheet
        open={detailsSheetOpen}
        onOpenChange={onDetailsSheetOpenChange}
        onSave={onDetailsSave}
        isPending={addCoffeePending}
      />
      <CoffeeModal
        open={celebrationOpen}
        onOpenChange={onCelebrationOpenChange}
        percentBeat={percentBeat}
      />
    </>
  );
}
