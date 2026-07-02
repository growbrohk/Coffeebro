import { useMutation } from "@tanstack/react-query";
import { createTastingPackageCheckoutRequest } from "@/lib/createTastingPackageCheckout";
import { supabase } from "@/integrations/supabase/client";
import type { TastingPackageTier } from "@/types/tastingPackage";

export function useTastingPackagePurchase() {
  return useMutation({
    mutationFn: async ({
      packageId,
      tier,
      redeemDate,
      ref,
    }: {
      packageId: string;
      tier: TastingPackageTier;
      redeemDate: string;
      ref?: string;
    }) => {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sign in to purchase");

      return createTastingPackageCheckoutRequest(token, { packageId, tier, redeemDate, ref });
    },
  });
}
