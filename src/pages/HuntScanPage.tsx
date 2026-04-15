import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useClaimHuntCampaign } from "@/hooks/useClaimHuntCampaign";
import { ScanSuccessModal } from "@/components/ScanSuccessModal";
import { useAuth } from "@/contexts/AuthContext";

function normalizeQrPayload(raw: string): string {
  const t = raw.trim();
  if (t.startsWith("hunt:")) return t.slice(5).trim();
  return t;
}

export default function HuntScanPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const claimHunt = useClaimHuntCampaign();

  const [activeTab, setActiveTab] = useState<"qr" | "manual">("qr");
  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: null,
  });
  const [successVouchers, setSuccessVouchers] = useState<Array<{ id: string; code: string }> | null>(null);
  const [loading, setLoading] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<string>("Initializing camera...");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastCodeRef = useRef<string | null>(null);
  const lastCodeTimeRef = useRef<number>(0);
  const activeTabRef = useRef(activeTab);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const cleanupScanner = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleClaim = useCallback(
    async (qrRaw: string) => {
      const payload = normalizeQrPayload(qrRaw);
      if (!payload || loading) return;

      const now = Date.now();
      if (lastCodeRef.current === payload && now - lastCodeTimeRef.current < 5000) return;

      lastCodeRef.current = payload;
      lastCodeTimeRef.current = now;
      setLoading(true);
      setResult({ type: null, message: null });
      setSuccessVouchers(null);

      try {
        const rows = await claimHunt.mutateAsync(payload);
        if (rows.length === 0) {
          setResult({ type: "error", message: "Nothing was claimed." });
          return;
        }
        setResult({ type: "success", message: "Treasure claimed!" });
        setSuccessVouchers(rows.map((r) => ({ id: r.id, code: r.code })));
        setTimeout(() => {
          lastCodeRef.current = null;
        }, 5000);
      } catch (err: unknown) {
        setResult({ type: "error", message: (err as Error).message || "Something went wrong" });
      } finally {
        setLoading(false);
      }
    },
    [loading, claimHunt],
  );

  useEffect(() => {
    let isMounted = true;

    if (activeTab !== "qr") {
      cleanupScanner();
      return;
    }

    const startScanner = async () => {
      cleanupScanner();
      await new Promise((r) => setTimeout(r, 250));
      if (!isMounted || activeTabRef.current !== "qr") return;

      try {
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          videoRef.current!,
          (scanResult) => {
            if (!isMounted || activeTabRef.current !== "qr") return;
            if (scanResult) {
              void handleClaim(scanResult.getText());
            }
          },
        );

        if (!isMounted || activeTabRef.current !== "qr") {
          controls.stop();
        } else {
          controlsRef.current = controls;
          setHasPermission(true);
          setCameraStatus("Scan a hunt QR code");
        }
      } catch {
        if (isMounted) {
          setHasPermission(false);
          setCameraStatus("Camera access denied");
        }
      }
    };

    void startScanner();
    return () => {
      isMounted = false;
      cleanupScanner();
    };
  }, [activeTab, handleClaim, cleanupScanner]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="container px-4 py-8 text-center">
          <p className="text-muted-foreground">Sign in to scan hunt QR codes.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/profile")}>
            Profile
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-md space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/hunts")}>
            <ArrowLeft />
          </Button>
          <h1 className="font-heading text-2xl font-bold tracking-normal">Scan hunt</h1>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "qr" | "manual")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="qr">Camera</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
          </TabsList>

          <TabsContent value="qr" className="relative mt-4 aspect-square overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} className="h-full w-full object-cover" />

            {!hasPermission && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 p-6 text-center">
                <p>{cameraStatus}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="mt-4 space-y-4">
            <Input
              placeholder="Paste hunt QR payload…"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
            />
            <Button className="w-full" onClick={() => void handleClaim(manualCode)} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Claim
            </Button>
          </TabsContent>
        </Tabs>

        {result.type ? (
          <Alert variant={result.type === "error" ? "destructive" : "default"}>
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      <ScanSuccessModal
        open={!!successVouchers && successVouchers.length > 0}
        onOpenChange={(open) => !open && setSuccessVouchers(null)}
        vouchers={successVouchers || []}
        onViewVouchers={() => navigate("/vouchers")}
      />
    </div>
  );
}
