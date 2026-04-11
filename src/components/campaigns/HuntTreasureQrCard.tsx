import { useCallback, useRef } from "react";
import QRCode from "react-qr-code";
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

/**
 * Treasure hunt QR: scannable code, payload text, copy + SVG/PNG export.
 * Reusable inside panels, dialogs, or compact previews (set `qrSize`).
 */
export function HuntTreasureQrCard({
  qrPayload,
  campaignId,
  disabled,
  qrSize = 256,
  className,
}: HuntTreasureQrCardProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const suffix = huntTreasureQrFileSuffix(campaignId);

  const getSvgEl = useCallback((): SVGSVGElement | null => {
    return wrapRef.current?.querySelector("svg") ?? null;
  }, []);

  const downloadSvg = useCallback(() => {
    const svg = getSvgEl();
    if (!svg) {
      toast({ title: "Could not export", description: "QR not ready.", variant: "destructive" });
      return;
    }
    const clone = svg.cloneNode(true) as SVGSVGElement;
    if (!clone.getAttribute("xmlns")) {
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    }
    const serialized = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
    downloadBlob(blob, `hunt-qr-${suffix}.svg`);
  }, [getSvgEl, suffix, toast]);

  const downloadPng = useCallback(() => {
    const svg = getSvgEl();
    if (!svg) {
      toast({ title: "Could not export", description: "QR not ready.", variant: "destructive" });
      return;
    }
    const clone = svg.cloneNode(true) as SVGSVGElement;
    if (!clone.getAttribute("xmlns")) {
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    }
    const serialized = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    const scale = 2;

    img.onload = () => {
      try {
        const baseW = img.naturalWidth || qrSize;
        const baseH = img.naturalHeight || qrSize;
        const w = Math.round(baseW * scale);
        const h = Math.round(baseH * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          toast({ title: "PNG export failed", description: "Try SVG download.", variant: "destructive" });
          URL.revokeObjectURL(url);
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (!blob) {
              toast({ title: "PNG export failed", description: "Try SVG download.", variant: "destructive" });
              return;
            }
            downloadBlob(blob, `hunt-qr-${suffix}.png`);
          },
          "image/png",
          1,
        );
      } catch {
        URL.revokeObjectURL(url);
        toast({ title: "PNG export failed", description: "Try SVG download.", variant: "destructive" });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast({ title: "PNG export failed", description: "Try SVG download.", variant: "destructive" });
    };

    img.src = url;
  }, [getSvgEl, qrSize, suffix, toast]);

  const copyPayload = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(qrPayload);
      toast({ title: "Copied", description: "Hunt QR payload copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Select and copy the payload manually.", variant: "destructive" });
    }
  }, [qrPayload, toast]);

  return (
    <div
      className={cn("flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-6", className)}
    >
      <div ref={wrapRef} className="rounded-xl bg-white p-4 shadow-sm">
        <QRCode value={qrPayload} size={qrSize} />
      </div>
      <p className="max-w-full break-all text-center font-mono text-xs text-muted-foreground">{qrPayload}</p>
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => void copyPayload()}>
          <Copy className="mr-2 h-4 w-4" />
          Copy payload
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={downloadSvg}>
          <Download className="mr-2 h-4 w-4" />
          Download SVG
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={downloadPng}>
          <Download className="mr-2 h-4 w-4" />
          Download PNG
        </Button>
      </div>
    </div>
  );
}
