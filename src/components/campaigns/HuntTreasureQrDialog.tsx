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
  campaignTitle?: string;
  orgName?: string;
};

export function HuntTreasureQrDialog({
  open,
  onOpenChange,
  qrPayload,
  campaignId,
  disabled,
  campaignTitle,
  orgName,
}: Props) {
  const ready = Boolean(qrPayload.trim() && campaignId.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90dvh,720px)] max-w-[min(100vw-1.5rem,20rem)] gap-2 overflow-y-auto rounded-2xl p-4 sm:max-w-[22rem]">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base">Treasure QR</DialogTitle>
          <DialogDescription className="text-xs leading-snug">
            Print or display at the treasure location. Customers use Hunt → Scan in the app.
          </DialogDescription>
        </DialogHeader>
        {ready ? (
          <HuntTreasureQrCard
            qrPayload={qrPayload.trim()}
            campaignId={campaignId.trim()}
            disabled={disabled}
            qrSize={168}
            compact
            className="border-0 bg-transparent p-0 shadow-none"
            campaignTitle={campaignTitle}
            orgName={orgName}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
