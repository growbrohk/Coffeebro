import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { QrCode, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { QrCodeDialog } from '@/components/QrCodeDialog';

export interface RedeemCodeCardProps {
  title?: string;
  code: string;
  status?: 'active' | 'redeemed' | 'void' | 'expired' | 'refunded';
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
    expired: 'bg-muted text-muted-foreground',
    refunded: 'bg-muted text-muted-foreground',
  }[status];

  return (
    <>
      <div className="rounded-2xl bg-muted/50 p-4 text-center shadow-soft">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">{title}</p>
          <span
            className={cn(
              'rounded px-3 py-1 text-xs font-semibold capitalize tracking-normal',
              statusBadgeClass
            )}
          >
            {status}
          </span>
        </div>
        <div className="flex items-center justify-center gap-3">
          <span className="font-mono text-2xl font-bold tracking-normal">
            {code}
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

      <QrCodeDialog code={code} open={qrOpen} onOpenChange={setQrOpen} />
    </>
  );
}
