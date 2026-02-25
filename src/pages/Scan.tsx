import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';

type ResultType = 'success' | 'error' | null;
type ResultMessage = string | null;

export default function ScanPage() {
  const navigate = useNavigate();
  const { canHostEvent, isLoading: roleLoading } = useUserRole();

  const [activeTab, setActiveTab] = useState<'qr' | 'manual'>('qr');
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState<{ type: ResultType; message: ResultMessage }>({
    type: null,
    message: null,
  });
  const [loading, setLoading] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<string>('Point camera at QR code');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // QR scanning refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  // Anti-spam + lock refs
  const lastCodeRef = useRef<string | null>(null);
  const lastCodeTimeRef = useRef<number>(0);
  const loadingRef = useRef(false);

  // Keep latest tab in a ref (avoid stale closure in callback)
  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const stopVideoStream = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const resetReader = useCallback(() => {
    if (readerRef.current) {
      try {
        // ZXing cleanup
        (readerRef.current as any).reset?.();
      } catch {
        // ignore
      }
      readerRef.current = null;
    }
  }, []);

  // Host gate check (UX only; backend still enforces)
  if (!roleLoading && !canHostEvent) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container px-4 py-8">
          <div className="max-w-sm mx-auto">
            <div className="mb-6">
              <Button variant="ghost" onClick={() => navigate(-1)} className="p-2">
                <ArrowLeft className="w-6 h-6" />
              </Button>
            </div>
            <div className="p-6 bg-muted rounded-lg text-center">
              <h2 className="text-xl font-bold mb-2">No Access</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Host access required to scan vouchers.
              </p>
              <Button onClick={() => navigate(-1)} variant="outline">
                Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Redeem function (shared for QR and manual)
  const redeem = useCallback(async (code: string) => {
    const trimmedCode = code.trim();

    if (!trimmedCode) {
      setResult({ type: 'error', message: 'Please enter a code' });
      return;
    }

    // Anti-spam: ignore same code within 2 seconds
    const now = Date.now();
    if (lastCodeRef.current === trimmedCode && now - lastCodeTimeRef.current < 2000) {
      return;
    }

    // Don't redeem while loading
    if (loadingRef.current) return;

    lastCodeRef.current = trimmedCode;
    lastCodeTimeRef.current = now;

    loadingRef.current = true;
    setLoading(true);
    setResult({ type: null, message: null });

    try {
      const { error } = await supabase.rpc('redeem_voucher_atomic' as any, {
        p_code: trimmedCode,
      });

      if (error) {
        let userMessage = error.message || 'Failed to redeem voucher';

        if (error.message === 'NOT_AUTHORIZED') userMessage = 'Host only';
        else if (error.message === 'NOT_FOUND') userMessage = 'Invalid code';
        else if (error.message === 'ALREADY_REDEEMED') userMessage = 'Already redeemed';
        else if (error.message === 'NOT_IN_WINDOW') userMessage = 'Not in redeem window';

        setResult({ type: 'error', message: userMessage });
      } else {
        setResult({ type: 'success', message: 'Voucher redeemed successfully!' });

        // Allow re-scan of same code after a moment (useful if user insists)
        setTimeout(() => {
          lastCodeRef.current = null;
        }, 3000);
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to redeem voucher';
      setResult({ type: 'error', message: errorMessage });
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  // QR Scanner setup (this is the important fixed part)
  useEffect(() => {
    // Always cleanup first when tab changes
    // (prevents stale streams/reader from blocking restart)
    stopVideoStream();
    resetReader();

    if (activeTab !== 'qr') {
      return;
    }

    setCameraStatus('Point camera at QR code');
    setHasPermission(null);

    let cancelled = false;

    const startScanner = async () => {
      // Small delay helps when rapidly switching tabs on mobile
      await new Promise((r) => setTimeout(r, 50));
      if (cancelled) return;

      if (!videoRef.current) {
        setHasPermission(false);
        setCameraStatus('Camera not ready. Please try again.');
        return;
      }

      try {
        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;

        await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: 'environment' }, // back camera
            },
          },
          videoRef.current,
          (scanResult, scanError) => {
            // Don’t do anything if user left QR tab
            if (activeTabRef.current !== 'qr') return;

            if (scanResult) {
              const scannedCode = scanResult.getText();
              if (scannedCode && scannedCode !== lastCodeRef.current) {
                redeem(scannedCode);
              }
            }

            if (scanError) {
              const name = (scanError as any).name;

              // NotFoundException is normal (no QR in frame)
              if (name === 'NotFoundException') return;

              if (name === 'NotAllowedError' || name === 'NotReadableError') {
                setHasPermission(false);
                setCameraStatus('Camera permission denied. Please use manual entry.');
              } else {
                console.debug('QR scan error:', scanError);
              }
            }
          }
        );

        if (cancelled) return;
        setHasPermission(true);
        setCameraStatus('Point camera at QR code');
      } catch (err: any) {
        console.error('Error starting QR scanner:', err);
        if (cancelled) return;

        setHasPermission(false);
        const name = err?.name;
        if (name === 'NotAllowedError' || name === 'NotReadableError') {
          setCameraStatus('Camera permission denied. Please use manual entry.');
        } else {
          setCameraStatus('Failed to start camera. Please use manual entry.');
        }
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      stopVideoStream();
      resetReader();
    };
  }, [activeTab, redeem, resetReader, stopVideoStream]);

  const handleManualRedeem = () => redeem(manualCode);

  const handleClear = () => {
    setManualCode('');
    setResult({ type: null, message: null });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center justify-center relative mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="absolute left-0 p-2"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-2xl font-black uppercase tracking-tight">Scan Voucher</h1>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="qr">QR Scan</TabsTrigger>
              <TabsTrigger value="manual">Enter Code</TabsTrigger>
            </TabsList>

            {/* QR Scan Tab */}
            <TabsContent value="qr" className="mt-6">
              <div className="space-y-4">
                <div className="relative w-full aspect-square bg-muted rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />
                  {hasPermission === false && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/90 p-4">
                      <p className="text-sm text-center text-muted-foreground">
                        {cameraStatus}
                      </p>
                    </div>
                  )}
                </div>
                <p className="text-sm text-center text-muted-foreground">{cameraStatus}</p>
              </div>
            </TabsContent>

            {/* Manual Entry Tab */}
            <TabsContent value="manual" className="mt-6">
              <div className="space-y-4 min-h-[200px]">
                <div className="flex flex-col gap-3">
                  <Input
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Enter voucher code"
                    className="w-full"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !loading && manualCode.trim()) {
                        handleManualRedeem();
                      }
                    }}
                    disabled={loading}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleManualRedeem}
                      disabled={loading || !manualCode.trim()}
                      className="flex-1"
                    >
                      {loading ? 'Redeeming...' : 'Redeem'}
                    </Button>
                    <Button onClick={handleClear} variant="outline" disabled={loading}>
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Result Panel */}
          {result.type && (
            <Alert
              variant={result.type === 'error' ? 'destructive' : 'default'}
              className="mt-6"
            >
              <div className="flex items-center gap-2">
                {result.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertDescription>{result.message}</AlertDescription>
              </div>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}