import { useCallback, useRef } from "react";
import QRCode from "react-qr-code";
import { toBlob, toSvg } from "html-to-image";
import { Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export type HuntTreasureQrCardProps = {
  qrPayload: string;
  /** Used for download filenames (short prefix of campaign id). */
  campaignId: string;
  disabled?: boolean;
  /** Pixel size of the QR module (default 256). */
  qrSize?: number;
  className?: string;
  /** Line below the wordmark, e.g. "Hunt · buy1get1free · Americano". */
  campaignTitle?: string;
  /** Shown above the scan payload in the footer. */
  orgName?: string;
  /** Tighter layout for dialogs / small viewports (smaller QR and type). */
  compact?: boolean;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function huntTreasureQrFileSuffix(campaignId: string): string {
  const clean = campaignId.replace(/-/g, "");
  return clean.slice(0, 8) || "treasure";
}

const captureOptions = {
  cacheBust: true,
  backgroundColor: "#ffffff",
} as const;

/**
 * Treasure hunt QR: printable card (wordmark, QR, footer) with copy image + SVG/PNG export of the whole card.
 * Reusable inside panels, dialogs, or compact previews (set `qrSize`).
 */
export function HuntTreasureQrCard({
  qrPayload,
  campaignId,
  disabled,
  qrSize = 256,
  className,
  campaignTitle,
  orgName,
  compact = false,
}: HuntTreasureQrCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const suffix = huntTreasureQrFileSuffix(campaignId);

  const getCardEl = useCallback((): HTMLElement | null => cardRef.current, []);

  const downloadSvg = useCallback(async () => {
    const el = getCardEl();
    if (!el) {
      toast({ title: "Could not export", description: "Card not ready.", variant: "destructive" });
      return;
    }
    try {
      const dataUrl = await toSvg(el, { ...captureOptions, pixelRatio: 1 });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      downloadBlob(blob, `hunt-qr-card-${suffix}.svg`);
    } catch {
      toast({ title: "SVG export failed", description: "Try PNG download.", variant: "destructive" });
    }
  }, [getCardEl, suffix, toast]);

  const downloadPng = useCallback(async () => {
    const el = getCardEl();
    if (!el) {
      toast({ title: "Could not export", description: "Card not ready.", variant: "destructive" });
      return;
    }
    try {
      const blob = await toBlob(el, { ...captureOptions, pixelRatio: 2 });
      if (!blob) {
        toast({ title: "PNG export failed", description: "Try again in a moment.", variant: "destructive" });
        return;
      }
      downloadBlob(blob, `hunt-qr-card-${suffix}.png`);
    } catch {
      toast({ title: "PNG export failed", description: "Try SVG download.", variant: "destructive" });
    }
  }, [getCardEl, suffix, toast]);

  const copyCardImage = useCallback(async () => {
    const el = getCardEl();
    if (!el) {
      toast({ title: "Copy failed", description: "Card not ready.", variant: "destructive" });
      return;
    }
    if (!navigator.clipboard?.write) {
      toast({
        title: "Copy failed",
        description: "Your browser does not support copying images.",
        variant: "destructive",
      });
      return;
    }
    try {
      const blob = await toBlob(el, { ...captureOptions, pixelRatio: 2 });
      if (!blob) {
        toast({ title: "Copy failed", description: "Could not render the card.", variant: "destructive" });
        return;
      }
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast({ title: "Copied", description: "Treasure QR card image copied to clipboard." });
    } catch {
      toast({
        title: "Copy failed",
        description: "Try downloading PNG instead, or copy the payload text manually.",
        variant: "destructive",
      });
    }
  }, [getCardEl, toast]);

  const showCampaignLine = Boolean(campaignTitle?.trim());
  const showOrgLine = Boolean(orgName?.trim());

  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border border-border bg-card",
        compact ? "gap-2 p-0" : "gap-4 p-6",
        className,
      )}
    >
      <div
        ref={cardRef}
        className={cn(
          "w-full rounded-xl bg-white shadow-sm",
          compact ? "max-w-[260px] p-3 pb-2.5" : "max-w-[320px] p-6 pb-5 sm:max-w-[340px]",
        )}
      >
        <div className={cn("flex flex-col items-center", compact ? "gap-1.5" : "gap-3")}>
          <p
            className={cn(
              "font-heading text-center text-2xl font-bold tracking-normal text-foreground",
              compact ? "text-2xl leading-none" : "text-3xl sm:text-4xl",
            )}
          >
            coffeebro
          </p>
          {showCampaignLine ? (
            <p
              className={cn(
                "w-full max-w-full whitespace-nowrap px-0.5 text-center font-normal leading-snug text-foreground/90",
                compact ? "text-[11px] leading-tight" : "text-sm",
              )}
            >
              {campaignTitle!.trim()}
            </p>
          ) : null}
          <div
            className={cn(
              "rounded-lg bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]",
              compact ? "mt-0 p-1.5" : "mt-1 p-3",
            )}
          >
            <QRCode value={qrPayload} size={qrSize} />
          </div>
          <div
            className={cn(
              "flex w-full flex-row items-center justify-center",
              compact ? "mt-0 gap-2" : "mt-1 gap-3",
            )}
          >
            <img
              src="/quiz-frogs/americano-bw.svg"
              alt=""
              width={compact ? 64 : 96}
              height={compact ? 64 : 96}
              className={cn(
                "shrink-0 object-contain object-bottom select-none",
                compact ? "h-16 w-16" : "h-24 w-24",
              )}
              draggable={false}
            />
            <div className={cn("flex min-w-0 flex-1 flex-col items-center justify-center text-center", compact ? "gap-1 pb-0" : "gap-1.5 pb-0.5")}>
              {showOrgLine ? (
                <p
                  className={cn(
                    "w-full text-pretty font-bold leading-tight text-foreground",
                    compact ? "text-[13px] leading-snug" : "text-lg leading-snug",
                  )}
                >
                  {orgName!.trim()}
                </p>
              ) : null}
              <p
                className={cn(
                  "w-full max-w-full break-all font-mono font-bold leading-snug text-foreground/90",
                  compact ? "text-[9px] leading-tight" : "text-xs sm:text-sm",
                )}
              >
                {qrPayload}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div
        className={cn(
          "w-full justify-center",
          compact ? "grid max-w-[260px] grid-cols-3 gap-1" : "flex flex-col gap-2 sm:flex-row sm:flex-wrap",
        )}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(compact && "h-8 gap-0.5 px-1.5 text-[10px] [&_svg]:h-3 [&_svg]:w-3 [&_svg]:mr-0")}
          onClick={() => void copyCardImage()}
        >
          <Copy className="mr-2 h-4 w-4" />
          {compact ? "Copy" : "Copy image"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(compact && "h-8 gap-0.5 px-1.5 text-[10px] [&_svg]:h-3 [&_svg]:w-3 [&_svg]:mr-0")}
          onClick={() => void downloadSvg()}
        >
          <Download className="mr-2 h-4 w-4" />
          {compact ? "SVG" : "Download SVG"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(compact && "h-8 gap-0.5 px-1.5 text-[10px] [&_svg]:h-3 [&_svg]:w-3 [&_svg]:mr-0")}
          onClick={() => void downloadPng()}
        >
          <Download className="mr-2 h-4 w-4" />
          {compact ? "PNG" : "Download PNG"}
        </Button>
      </div>
    </div>
  );
}
