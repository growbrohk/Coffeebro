import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAddCoffee, useTodayPercentage, type CoffeeDetails } from '@/hooks/useCoffees';
import { LogCoffeeEntryModals } from '@/components/LogCoffeeEntryModals';
import {
  VoucherRedeemedPromptModal,
  type VoucherRedeemedPromptDetail,
} from '@/components/VoucherRedeemedPromptModal';
import { useVoucherRedemptionNotifier } from '@/hooks/useVoucherRedemptionNotifier';
import { fetchVoucherLogPrefill } from '@/lib/fetchVoucherLogPrefill';
import { toast } from '@/hooks/use-toast';
export type LogCoffeePrefill = {
  voucherId: string;
  orgId: string;
  orgName: string | null;
  menuItemId: string | null;
  menuItemName: string | null;
  redeemedAt: string;
  /** When present, the sheet is in edit mode (UPDATE instead of insert RPC). */
  existing?: {
    id: string;
    log_item: string | null;
    log_item_other: string | null;
    tasting_notes: string | null;
    share_publicly: boolean;
  } | null;
};

type LogCoffeeEntryContextValue = {
  startLogCoffee: () => void;
  startLogCoffeeFromVoucher: (p: LogCoffeePrefill) => void;
  addCoffeePending: boolean;
  detailsSheetOpen: boolean;
  setDetailsSheetOpen: (open: boolean) => void;
  celebrationOpen: boolean;
  setCelebrationOpen: (open: boolean) => void;
  handleDetailsSave: (details: CoffeeDetails) => Promise<void>;
  percentBeat: number;
  prefill: LogCoffeePrefill | null;
};

const LogCoffeeEntryContext = createContext<LogCoffeeEntryContextValue | null>(null);

export function LogCoffeeEntryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const addCoffee = useAddCoffee();
  const { data: percentage } = useTodayPercentage();

  const [prefill, setPrefill] = useState<LogCoffeePrefill | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [redeemPromptVoucherId, setRedeemPromptVoucherId] = useState<string | null>(null);
  const [redeemPromptDetail, setRedeemPromptDetail] =
    useState<VoucherRedeemedPromptDetail | null>(null);
  const [redeemPromptReviewLoading, setRedeemPromptReviewLoading] = useState(false);
  const queueRef = useRef<LogCoffeePrefill[]>([]);
  const detailsOpenRef = useRef(false);
  detailsOpenRef.current = detailsOpen;

  useEffect(() => {
    if (!redeemPromptVoucherId) {
      setRedeemPromptDetail(null);
      return;
    }

    let cancelled = false;
    void fetchVoucherLogPrefill(redeemPromptVoucherId).then((prefill) => {
      if (cancelled) return;
      setRedeemPromptDetail({
        title: null,
        orgName: prefill?.orgName ?? null,
        menuItemName: prefill?.menuItemName ?? null,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [redeemPromptVoucherId]);

  const flushQueue = useCallback(() => {
    const next = queueRef.current.shift();
    if (next) {
      setPrefill(next);
      setDetailsOpen(true);
    }
  }, []);

  const startLogCoffee = useCallback(() => {
    if (!user) {
      navigate('/profile?msg=tracking');
      return;
    }
    setPrefill(null);
    setDetailsOpen(true);
  }, [user, navigate]);

  const startLogCoffeeFromVoucher = useCallback((p: LogCoffeePrefill) => {
    if (!user) return;
    if (detailsOpenRef.current) {
      queueRef.current.push(p);
      return;
    }
    setPrefill(p);
    setDetailsOpen(true);
  }, [user]);

  const showRedeemPrompt = useCallback((voucherId: string) => {
    setRedeemPromptVoucherId(voucherId);
  }, []);

  useVoucherRedemptionNotifier({ onVoucherRedeemedDetected: showRedeemPrompt });

  const handleRedeemPromptOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setRedeemPromptVoucherId(null);
      setRedeemPromptReviewLoading(false);
    }
  }, []);

  const handleRedeemPromptReview = useCallback(async () => {
    if (!redeemPromptVoucherId || redeemPromptReviewLoading) return;
    setRedeemPromptReviewLoading(true);
    const voucherId = redeemPromptVoucherId;

    let prefill = await fetchVoucherLogPrefill(voucherId);
    if (!prefill) {
      await new Promise((r) => setTimeout(r, 400));
      prefill = await fetchVoucherLogPrefill(voucherId);
    }

    setRedeemPromptReviewLoading(false);

    if (!prefill) {
      toast({
        title: 'Could not open review',
        description: 'Please try again from your wallet.',
        variant: 'destructive',
      });
      return;
    }

    setRedeemPromptVoucherId(null);
    startLogCoffeeFromVoucher(prefill);
  }, [redeemPromptVoucherId, redeemPromptReviewLoading, startLogCoffeeFromVoucher]);

  const handleDetailsSave = useCallback(
    async (details: CoffeeDetails) => {
      try {
        await addCoffee.mutateAsync(details);
        setPrefill(null);
        setDetailsOpen(false);
        setCelebrationOpen(true);
      } catch (error) {
        console.error('Error adding coffee:', error);
      }
    },
    [addCoffee],
  );

  const handleDetailsOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setDetailsOpen(true);
        return;
      }
      setPrefill(null);
      setDetailsOpen(false);
      queueMicrotask(() => flushQueue());
    },
    [flushQueue],
  );

  const handleCelebrationOpenChange = useCallback(
    (open: boolean) => {
      setCelebrationOpen(open);
      if (!open) {
        queueMicrotask(() => flushQueue());
      }
    },
    [flushQueue],
  );

  const percentBeat = 100 - (percentage || 0);

  const value: LogCoffeeEntryContextValue = {
    startLogCoffee,
    startLogCoffeeFromVoucher,
    addCoffeePending: addCoffee.isPending,
    detailsSheetOpen: detailsOpen,
    setDetailsSheetOpen: (open) => {
      if (open) {
        setDetailsOpen(true);
      } else {
        handleDetailsOpenChange(false);
      }
    },
    celebrationOpen,
    setCelebrationOpen: handleCelebrationOpenChange,
    handleDetailsSave,
    percentBeat,
    prefill,
  };

  return (
    <LogCoffeeEntryContext.Provider value={value}>
      {children}
      <VoucherRedeemedPromptModal
        open={redeemPromptVoucherId !== null}
        onOpenChange={handleRedeemPromptOpenChange}
        detail={redeemPromptDetail}
        onReview={() => void handleRedeemPromptReview()}
        reviewLoading={redeemPromptReviewLoading}
      />
      <LogCoffeeEntryModals
        detailsSheetOpen={detailsOpen}
        onDetailsSheetOpenChange={handleDetailsOpenChange}
        celebrationOpen={celebrationOpen}
        onCelebrationOpenChange={handleCelebrationOpenChange}
        onDetailsSave={handleDetailsSave}
        addCoffeePending={addCoffee.isPending}
        percentBeat={percentBeat}
        prefill={prefill}
        lockCoffeeShop={Boolean(prefill)}
      />
    </LogCoffeeEntryContext.Provider>
  );
}

export function useLogCoffeeEntry(): LogCoffeeEntryContextValue {
  const ctx = useContext(LogCoffeeEntryContext);
  if (!ctx) {
    throw new Error('useLogCoffeeEntry must be used within LogCoffeeEntryProvider');
  }
  return ctx;
}
