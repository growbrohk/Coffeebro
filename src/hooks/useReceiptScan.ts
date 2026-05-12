import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ReceiptScanResult =
  | { ok: true; points_awarded: number; new_balance: number }
  | { ok: false; code: string; message: string };

export function useReceiptScan() {
  const { user, session } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ orgId, file }: { orgId: string; file: File }) => {
      if (!user || !session) throw new Error("Not signed in");

      const form = new FormData();
      form.append("org_id", orgId);
      form.append("image", file);

      const { data, error } = await supabase.functions.invoke<Record<string, unknown>>("scan-receipt", {
        body: form,
      });

      if (error) {
        return {
          ok: false as const,
          code: "INVOKE_ERROR",
          message: error.message ?? "Scan failed",
        };
      }

      if (data && typeof data === "object" && "error" in data) {
        const err = data as { error?: string; message?: string };
        return {
          ok: false as const,
          code: err.error ?? "ERROR",
          message: err.message ?? "Scan failed",
        };
      }

      if (data && typeof data === "object" && "points_awarded" in data) {
        return {
          ok: true as const,
          points_awarded: Number((data as { points_awarded?: number }).points_awarded ?? 0),
          new_balance: Number((data as { new_balance?: number }).new_balance ?? 0),
        };
      }

      return { ok: false as const, code: "UNKNOWN", message: "Unexpected response" };
    },
    onSuccess: async (result) => {
      if (!result.ok) return;
      await qc.invalidateQueries({ queryKey: ["coffees"] });
      await qc.invalidateQueries({ queryKey: ["top-cafes"] });
      await qc.invalidateQueries({ queryKey: ["coffee-profile-stats"] });
      await qc.invalidateQueries({ queryKey: ["loyalty-balance"] });
      await qc.invalidateQueries({ queryKey: ["lifetime-coffee-count"] });
      await qc.invalidateQueries({ queryKey: ["shop-receipt-logs"] });
    },
  });
}
