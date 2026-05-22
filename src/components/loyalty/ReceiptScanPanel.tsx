import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useReceiptScan } from "@/hooks/useReceiptScan";
import { useToast } from "@/hooks/use-toast";
import { compressReceiptImage } from "@/lib/compressReceiptImage";
import { Loader2, Camera } from "lucide-react";

export function ReceiptScanPanel({
  orgId,
  orgName,
  onSuccess,
}: {
  orgId: string;
  orgName: string;
  onSuccess: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const scan = useReceiptScan();
  const { toast } = useToast();

  const handleFileChange = async (raw: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    if (!raw) {
      setFile(null);
      setPreview(null);
      return;
    }

    setPreparing(true);
    setFile(null);
    setPreview(null);
    try {
      const compressed = await compressReceiptImage(raw);
      setFile(compressed);
      setPreview(URL.createObjectURL(compressed));
    } finally {
      setPreparing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

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
          disabled={preparing}
          onChange={(e) => {
            void handleFileChange(e.target.files?.[0] ?? null);
          }}
        />
        <div className="space-y-2">
          <Button
            type="button"
            variant="secondary"
            className="w-full gap-2 rounded-full"
            disabled={preparing}
            onClick={() => inputRef.current?.click()}
          >
            {preparing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparing photo…
              </>
            ) : (
              <>
                <Camera className="h-4 w-4" />
                {file ? "Change photo" : "Take / choose photo"}
              </>
            )}
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
        disabled={!file || preparing || scan.isPending}
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
              const description =
                res.code === "ALREADY_CLAIMED"
                  ? "This receipt has already been claimed."
                  : res.code === "WRONG_SHOP"
                    ? `This receipt doesn't look like it's from ${orgName || "this café"}. Scan a receipt from this café.`
                    : res.message;
              toast({
                variant: "destructive",
                title: "Scan failed",
                description,
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
