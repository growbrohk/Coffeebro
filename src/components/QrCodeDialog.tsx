import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import QRCode from 'react-qr-code';

interface QrCodeDialogProps {
  code: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}

export function QrCodeDialog({
  code,
  open,
  onOpenChange,
  title = 'Scan to Redeem',
}: QrCodeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs rounded-2xl border-0 shadow-soft">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Show this code at the venue to redeem your voucher.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="rounded-xl bg-white p-3">
            <QRCode value={code} size={220} />
          </div>
          <p className="font-mono text-xs text-muted-foreground">{code}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
