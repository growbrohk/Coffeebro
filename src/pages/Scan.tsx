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
  const [activeTab, setActiveTab] = useState('qr');
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState<{ type: ResultType; message: ResultMessage }>({ type: null, message: null });
  const [loading, setLoading] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<string>('Point camera at QR code');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // QR scanning refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const lastCodeRef = useRef<string | null>(null);
  const lastCodeTimeRef = useRef<number>(0);
  const loadingRef = useRef(false);
  const activeTabRef = useRef(activeTab);

  // Host gate check
  if (!roleLoading && !canHostEvent) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container px-4 py-8">
          <div className="max-w-sm mx-auto">
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="p-2"
              >
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
    if (
      lastCodeRef.current === trimmedCode &&
      now - lastCodeTimeRef.current < 2000
    ) {
      return;
    }

    // Don't redeem while loading
    if (loadingRef.current) {
      return;
    }

    lastCodeRef.current = trimmedCode;
    lastCodeTimeRef.current = now;
    loadingRef.current = true;
    setLoading(true);
    setResult({ type: null, message: null });

    try {
      const { data, error } = await supabase.rpc('redeem_voucher_atomic' as any, {
        p_code: trimmedCode,
      });

      if (error) {
        // Map error messages to user-friendly text
        let userMessage = error.message || 'Failed to redeem voucher';
        
        if (error.message === 'NOT_AUTHORIZED') {
          userMessage = 'Host only';
        } else if (error.message === 'NOT_FOUND') {
          userMessage = 'Invalid code';
        } else if (error.message === 'ALREADY_REDEEMED') {
          userMessage = 'Already redeemed';
        } else if (error.message === 'NOT_IN_WINDOW') {
          userMessage = 'Not in redeem window';
        }

        setResult({ type: 'error', message: userMessage });
      } else {
        setResult({ type: 'success', message: 'Voucher redeemed successfully!' });
        
        // Reset lastCodeRef after a moment to allow re-scanning
        setTimeout(() => {
          lastCodeRef.current = null;
        }, 3000);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to redeem voucher';
      setResult({ type: 'error', message: errorMessage });
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  // Update activeTab ref
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // QR Scanning setup - runs when QR tab is active
  useEffect(() => {
    // Only run when QR tab is active
    if (activeTab !== 'qr') {
      // Cleanup when leaving QR tab
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      if (readerRef.current) {
        readerRef.current = null;
      }
      controlsRef.current = null;
      return;
    }

    // Reset status when switching back to QR tab
    setCameraStatus('Point camera at QR code');
    setHasPermission(null);

    const startScanning = async () => {
      // Clean up any existing reader first
      if (readerRef.current) {
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
          videoRef.current.srcObject = null;
        }
        readerRef.current = null;
      }
      
      // Small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Double-check we're still on QR tab after delay (use ref to avoid stale closure)
      if (activeTabRef.current !== 'qr' || !videoRef.current) {
        return;
      }

      try {
        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;

        // List available video devices (static method)
        let videoInputDevices;
        try {
          videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();
        } catch (listError) {
          console.error('Error listing video devices:', listError);
          setHasPermission(false);
          setCameraStatus('Unable to access camera. Please use manual entry.');
          return;
        }

        if (videoInputDevices.length === 0) {
          setHasPermission(false);
          setCameraStatus('No camera found. Please use manual entry.');
          return;
        }

        const selectedDeviceId = videoInputDevices[0].deviceId;
        setCameraStatus('Point camera at QR code');
        setHasPermission(true);

        // Ensure video element is still available
        if (!videoRef.current) {
          console.error('Video element not available');
          return;
        }

        // Start scanning - let the reader handle camera permissions
        try {
          await reader.decodeFromVideoDevice(
            selectedDeviceId,
            videoRef.current,
            (result, error) => {
              // Check if we're still on QR tab (use ref to avoid stale closure)
              if (activeTabRef.current !== 'qr') {
                return;
              }

              if (result) {
                const code = result.getText();
                if (code && code !== lastCodeRef.current) {
                  redeem(code);
                }
              }
              if (error) {
                if (error.name === 'NotFoundException') {
                  // NotFoundException is normal when no QR code is visible
                  return;
                }
                // Other errors might indicate permission issues
                if (error.name === 'NotAllowedError' || error.name === 'NotReadableError') {
                  setHasPermission(false);
                  setCameraStatus('Camera permission denied. Please use manual entry.');
                } else {
                  console.debug('QR scan error:', error);
                }
              }
            }
          );
        } catch (scanError: any) {
          console.error('Error starting QR scanner:', scanError);
          setHasPermission(false);
          if (scanError.name === 'NotAllowedError' || scanError.name === 'NotReadableError') {
            setCameraStatus('Camera permission denied. Please use manual entry.');
          } else {
            setCameraStatus('Failed to start camera. Please use manual entry.');
          }
        }
      } catch (error) {
        console.error('Error initializing QR scanner:', error);
        setHasPermission(false);
        setCameraStatus('Failed to start camera. Please use manual entry.');
      }
    };

    // Wait for video element to be available, then start scanning
    if (!videoRef.current) {
      // Use a small delay to ensure video element is mounted
      const timer = setTimeout(() => {
        if (videoRef.current && activeTab === 'qr') {
          startScanning();
        }
      }, 100);
      return () => clearTimeout(timer);
    }

    // Start scanning immediately if video element is available
    startScanning();

    // Cleanup function
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      readerRef.current = null;
      controlsRef.current = null;
    };
  }, [activeTab, redeem]);

  const handleManualRedeem = () => {
    redeem(manualCode);
  };

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
            <h1 className="text-2xl font-black uppercase tracking-tight">
              Scan Voucher
            </h1>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                <p className="text-sm text-center text-muted-foreground">
                  {cameraStatus}
                </p>
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
                    <Button
                      onClick={handleClear}
                      variant="outline"
                      disabled={loading}
                    >
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
