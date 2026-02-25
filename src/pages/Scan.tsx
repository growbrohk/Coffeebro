import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { ArrowLeft, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
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
  const [cameraStatus, setCameraStatus] = useState<string>('Initializing camera...');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null); // CRITICAL: Controls the hardware stream
  
  const lastCodeRef = useRef<string | null>(null);
  const lastCodeTimeRef = useRef<number>(0);
  const activeTabRef = useRef(activeTab);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Reliable Cleanup Function
  const cleanupScanner = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.stop(); // This turns off the green light/camera
      controlsRef.current = null;
    }
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const redeem = useCallback(async (code: string) => {
    const trimmedCode = code.trim();
    if (!trimmedCode || loading) return;

    // Anti-spam
    const now = Date.now();
    if (lastCodeRef.current === trimmedCode && now - lastCodeTimeRef.current < 3000) return;

    lastCodeRef.current = trimmedCode;
    lastCodeTimeRef.current = now;
    setLoading(true);
    setResult({ type: null, message: null });

    try {
      const { error } = await supabase.rpc('redeem_voucher_atomic', { p_code: trimmedCode });
      if (error) {
        let msg = error.message;
        if (msg === 'NOT_FOUND') msg = 'Invalid code';
        if (msg === 'ALREADY_REDEEMED') msg = 'Already used';
        setResult({ type: 'error', message: msg });
      } else {
        setResult({ type: 'success', message: 'Success!' });
        setTimeout(() => { lastCodeRef.current = null; }, 5000);
      }
    } catch (err) {
      setResult({ type: 'error', message: 'System error' });
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Main Scanner Effect
  useEffect(() => {
    let isMounted = true;

    if (activeTab !== 'qr') {
      cleanupScanner();
      return;
    }

    const startScanner = async () => {
      // 1. Clear any existing instances before starting a new one
      cleanupScanner();
      
      // 2. Small delay to let hardware release from previous session
      await new Promise(r => setTimeout(r, 250));
      if (!isMounted || activeTabRef.current !== 'qr') return;

      try {
        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;

        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } } },
          videoRef.current!,
          (scanResult, scanError) => {
            if (!isMounted || activeTabRef.current !== 'qr') return;
            if (scanResult) {
              redeem(scanResult.getText());
            }
          }
        );

        // 3. Check again if user switched tabs while camera was starting
        if (!isMounted || activeTabRef.current !== 'qr') {
          controls.stop();
        } else {
          controlsRef.current = controls;
          setHasPermission(true);
          setCameraStatus('Scan a QR code');
        }
      } catch (err: any) {
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
  }, [activeTab, redeem, cleanupScanner]);

  if (!roleLoading && !canHostEvent) {
    return <div className="p-8 text-center">Host access required.</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft /></Button>
          <h1 className="text-xl font-bold uppercase">Scanner</h1>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
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
              placeholder="Enter code..." 
              value={manualCode} 
              onChange={e => setManualCode(e.target.value)} 
            />
            <Button className="w-full" onClick={() => redeem(manualCode)} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Redeem
            </Button>
          </TabsContent>
        </Tabs>

        {result.type && (
          <Alert variant={result.type === 'error' ? 'destructive' : 'default'}>
            {result.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}