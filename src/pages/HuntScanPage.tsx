import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useHunt, useIsParticipant } from '@/hooks/useHunts';
import { useClaimTreasure } from '@/hooks/useHuntClaim';
import { ScanSuccessModal } from '@/components/ScanSuccessModal';

export default function HuntScanPage() {
  const { huntId } = useParams<{ huntId: string }>();
  const navigate = useNavigate();
  const { data: hunt } = useHunt(huntId ?? null);
  const { data: isParticipant } = useIsParticipant(huntId ?? null);
  const claimTreasure = useClaimTreasure();

  const [activeTab, setActiveTab] = useState<'qr' | 'manual'>('qr');
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: null,
  });
  const [successVouchers, setSuccessVouchers] = useState<Array<{ id: string; code: string }> | null>(null);
  const [loading, setLoading] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<string>('Initializing camera...');
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
    async (qrCodeId: string) => {
      const trimmed = qrCodeId.trim();
      if (!trimmed || loading) return;

      const now = Date.now();
      if (lastCodeRef.current === trimmed && now - lastCodeTimeRef.current < 3000) return;

      lastCodeRef.current = trimmed;
      lastCodeTimeRef.current = now;
      setLoading(true);
      setResult({ type: null, message: null });
      setSuccessVouchers(null);

      try {
        const res = await claimTreasure.mutateAsync(trimmed);

        if (res.status === 'OK') {
          setResult({ type: 'success', message: res.message });
          setSuccessVouchers(res.voucher_data || []);
          setTimeout(() => {
            lastCodeRef.current = null;
          }, 5000);
        } else {
          let msg = res.message || res.status;
          if (res.status === 'NOT_FOUND') msg = 'Invalid or unknown treasure';
          if (res.status === 'ALREADY_CLAIMED') msg = 'You already claimed this treasure';
          if (res.status === 'NOT_JOINED') msg = 'Join the hunt first';
          if (res.status === 'HUNT_INACTIVE') msg = 'This hunt is not active';
          if (res.status === 'HUNT_ENDED') msg = 'This hunt has ended';
          setResult({ type: 'error', message: msg });
        }
      } catch (err: unknown) {
        setResult({ type: 'error', message: (err as Error).message || 'Something went wrong' });
      } finally {
        setLoading(false);
      }
    },
    [loading, claimTreasure]
  );

  useEffect(() => {
    let isMounted = true;

    if (activeTab !== 'qr') {
      cleanupScanner();
      return;
    }

    const startScanner = async () => {
      cleanupScanner();
      await new Promise((r) => setTimeout(r, 250));
      if (!isMounted || activeTabRef.current !== 'qr') return;

      try {
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } } },
          videoRef.current!,
          (scanResult) => {
            if (!isMounted || activeTabRef.current !== 'qr') return;
            if (scanResult) {
              const text = scanResult.getText();
              if (text.startsWith('hunt:')) {
                handleClaim(text.slice(5));
              } else {
                handleClaim(text);
              }
            }
          }
        );

        if (!isMounted || activeTabRef.current !== 'qr') {
          controls.stop();
        } else {
          controlsRef.current = controls;
          setHasPermission(true);
          setCameraStatus('Scan a treasure QR code');
        }
      } catch {
        if (isMounted) {
          setHasPermission(false);
          setCameraStatus('Camera access denied');
        }
      }
    };

    startScanner();
    return () => {
      isMounted = false;
      cleanupScanner();
    };
  }, [activeTab, handleClaim, cleanupScanner]);

  if (!hunt || !isParticipant) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="container px-4 py-8 text-center">
          <p className="text-muted-foreground">Join the hunt first to scan treasures.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(`/hunts/${huntId}`)}>
            Back to Hunt
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft />
          </Button>
          <h1 className="text-xl font-bold uppercase">Scan Treasure</h1>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'qr' | 'manual')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="qr">Camera</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
          </TabsList>

          <TabsContent value="qr" className="relative aspect-square bg-black rounded-xl overflow-hidden mt-4">
            <video ref={videoRef} className="w-full h-full object-cover" />

            {!hasPermission && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center p-6 text-center">
                <p>{cameraStatus}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-4 mt-4">
            <Input
              placeholder="Enter QR code ID..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
            />
            <Button
              className="w-full"
              onClick={() => handleClaim(manualCode)}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Claim
            </Button>
          </TabsContent>
        </Tabs>

        {result.type && (
          <Alert variant={result.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        )}
      </div>

      <ScanSuccessModal
        open={!!successVouchers && successVouchers.length > 0}
        onOpenChange={(open) => !open && setSuccessVouchers(null)}
        vouchers={successVouchers || []}
        onViewVouchers={() => navigate('/vouchers')}
      />
    </div>
  );
}
