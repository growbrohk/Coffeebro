import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TreasureDetailPanel } from '@/components/TreasureDetailPanel';

interface TreasureDetailModalProps {
  huntId: string;
  treasureId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TreasureDetailModal({
  huntId,
  treasureId,
  open,
  onOpenChange,
}: TreasureDetailModalProps) {
  const show = open && !!huntId && !!treasureId;

  return (
    <Dialog open={show} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,720px)] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto border-border bg-background p-4 pt-10 sm:p-6 gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Treasure details</DialogTitle>
        </DialogHeader>
        {show && <TreasureDetailPanel huntId={huntId} treasureId={treasureId} />}
      </DialogContent>
    </Dialog>
  );
}
