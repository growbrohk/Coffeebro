import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useReceiptScan } from "@/hooks/useReceiptScan";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Camera } from "lucide-react";

export function ReceiptScanPanel({
  orgId,
  orgName: _orgName,
  onSuccess,
}: {
  orgId: string;
  orgName: string;
  onSuccess: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const scan = useReceiptScan();
  const { toast } = useToast();

  return (
    <div className="space-y-4 rounded-2xl bg-white/10 p-4 text-primary-foreground">
      <p className="text-sm font-medium leading-snug">
        Scan your receipt to log points &amp; items!
      </p>
      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            if (preview) URL.revokeObjectURL(preview);
            setPreview(f ? URL.createObjectURL(f) : null);
          }}
        />
        <div className="space-y-2">
          <Button
            type="button"
            variant="secondary"
            className="w-full gap-2 rounded-full"
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="h-4 w-4" />
            {file ? "Change photo" : "Take / choose photo"}
          </Button>
          {file && !preview && (
            <span className="block truncate text-xs">{file.name}</span>
          )}
        </div>
        {preview && (
          <img
            src={preview}
            alt="Receipt preview"
            className="mt-2 max-h-40 w-full rounded-xl object-contain"
          />
        )}
      </div>
      <Button
        type="button"
        className="w-full bg-primary-foreground font-semibold text-primary hover:bg-primary-foreground/90"
        disabled={!file || scan.isPending}
        onClick={async () => {
          if (!file) return;
          try {
            const res = await scan.mutateAsync({ orgId, file });
            if (res.ok) {
              if (preview) URL.revokeObjectURL(preview);
              toast({
                title: "Receipt logged",
                description: `+${res.points_awarded} pts · balance: ${res.new_balance}`,
              });
              onSuccess();
            } else {
              toast({
                variant: "destructive",
                title: "Scan failed",
                description: res.code === "ALREADY_CLAIMED"
                  ? "This receipt has already been claimed."
                  : res.message,
              });
            }
          } catch (e) {
            toast({
              variant: "destructive",
              title: "Scan failed",
              description: e instanceof Error ? e.message : "Try again",
            });
          }
        }}
      >
        {scan.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Scanning…
          </>
        ) : (
          "Scan receipt"
        )}
      </Button>
    </div>
  );
}
