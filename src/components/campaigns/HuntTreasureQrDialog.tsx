import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HuntTreasureQrCard } from "@/components/campaigns/HuntTreasureQrCard";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrPayload: string;
  campaignId: string;
  disabled?: boolean;
};

export function HuntTreasureQrDialog({ open, onOpenChange, qrPayload, campaignId, disabled }: Props) {
  const ready = Boolean(qrPayload.trim() && campaignId.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Treasure QR</DialogTitle>
          <DialogDescription>
            Print or display at the treasure location. Customers use Hunt → Scan in the app.
          </DialogDescription>
        </DialogHeader>
        {ready ? (
          <HuntTreasureQrCard
            qrPayload={qrPayload.trim()}
            campaignId={campaignId.trim()}
            disabled={disabled}
            qrSize={256}
            className="border-0 bg-transparent p-0 shadow-none"
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
