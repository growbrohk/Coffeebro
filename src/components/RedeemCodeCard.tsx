import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, Copy } from 'lucide-react';
import QRCode from 'react-qr-code';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export interface RedeemCodeCardProps {
  title?: string;
  code: string;
  status?: 'active' | 'redeemed' | 'void';
  metaLines?: string[];
  onCopy?: () => void;
  variant?: 'voucher' | 'ticket';
}

export function RedeemCodeCard({
  title = 'Code',
  code,
  status = 'active',
  metaLines = [],
  onCopy,
  variant = 'ticket',
}: RedeemCodeCardProps) {
  const [qrOpen, setQrOpen] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      toast({ title: 'Copied', description: 'Code copied to clipboard.' });
    }
    onCopy?.();
  };

  const statusBadgeClass = {
    active: 'bg-primary text-primary-foreground',
    redeemed: 'bg-muted text-muted-foreground',
    void: 'bg-destructive/20 text-destructive',
  }[status];

  return (
    <>
      <div className="bg-muted/50 rounded-lg p-4 text-center border border-border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">{title}</p>
          <span
            className={cn(
              'px-2 py-0.5 text-xs font-semibold uppercase rounded',
              statusBadgeClass
            )}
          >
            {status}
          </span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="font-mono font-bold text-2xl tracking-widest">
            {code.toUpperCase()}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleCopy}
            aria-label="Copy code"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setQrOpen(true)}
            aria-label="Show QR code"
          >
            <QrCode className="h-4 w-4" />
          </Button>
        </div>
        {metaLines.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {metaLines.map((line, i) => (
              <p key={i} className="text-xs text-muted-foreground">
                {line}
              </p>
            ))}
          </div>
        )}
      </div>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base">Scan to Redeem</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="bg-white p-3 rounded-md">
              <QRCode value={code} size={220} />
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              {code.toUpperCase()}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
