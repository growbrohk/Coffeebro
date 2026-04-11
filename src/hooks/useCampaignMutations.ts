import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { orgCampaignsQueryKey } from "./useOrgCampaigns";

export type CampaignVoucherSaveRow = Omit<TablesInsert<"campaign_vouchers">, "campaign_id"> & {
  id?: string;
};

export type SaveCampaignPayload = {
  orgId: string;
  campaign: TablesInsert<"campaigns"> | (TablesUpdate<"campaigns"> & { id: string });
  /** Full desired voucher rows after save (by id when updating). `campaign_id` is set in the mutation. */
  vouchers: CampaignVoucherSaveRow[];
};

function randomQrPayload(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function useCampaignMutations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orgId, campaign, vouchers }: SaveCampaignPayload) => {
      const isUpdate = "id" in campaign && Boolean(campaign.id);
      let campaignId: string;

      if (isUpdate) {
        const { id, ...rest } = campaign as TablesUpdate<"campaigns"> & { id: string };
        const patch = Object.fromEntries(
          Object.entries(rest).filter(([, v]) => v !== undefined),
        ) as TablesUpdate<"campaigns">;

        const { data: existingRow, error: loadExistingErr } = await supabase
          .from("campaigns")
          .select("campaign_type, qr_payload")
          .eq("id", id)
          .single();
        if (loadExistingErr) throw loadExistingErr;

        const effectiveType = patch.campaign_type ?? existingRow?.campaign_type;
        const effectiveQr =
          patch.qr_payload !== undefined ? patch.qr_payload : existingRow?.qr_payload ?? null;
        if (effectiveType === "hunt" && !effectiveQr?.trim()) {
          patch.qr_payload = `hunt_${randomQrPayload()}`;
        }

        const { data, error } = await supabase.from("campaigns").update(patch).eq("id", id).select("id").single();
        if (error) throw error;
        campaignId = data.id;
      } else {
        const insertRow = { ...campaign } as TablesInsert<"campaigns">;
        if (insertRow.campaign_type === "hunt" && !insertRow.qr_payload) {
          insertRow.qr_payload = `hunt_${randomQrPayload()}`;
        }
        const { data, error } = await supabase.from("campaigns").insert(insertRow).select("id").single();
        if (error) throw error;
        campaignId = data.id;
      }

      const { data: existingRows, error: exErr } = await supabase
        .from("campaign_vouchers")
        .select("id")
        .eq("campaign_id", campaignId);
      if (exErr) throw exErr;
      const existingIds = new Set((existingRows ?? []).map((r) => r.id));
      const nextIds = new Set(vouchers.map((v) => v.id).filter(Boolean) as string[]);

      for (const id of existingIds) {
        if (!nextIds.has(id)) {
          const { error } = await supabase.from("campaign_vouchers").delete().eq("id", id);
          if (error) throw error;
        }
      }

      for (let i = 0; i < vouchers.length; i++) {
        const v = vouchers[i];
        const row = {
          ...v,
          campaign_id: campaignId,
          sort_order: v.sort_order ?? i,
        };

        if (v.id && existingIds.has(v.id)) {
          const { id, ...patch } = row;
          const { error } = await supabase.from("campaign_vouchers").update(patch).eq("id", id);
          if (error) throw error;
        } else {
          const { id: _omit, ...insert } = row;
          const { error } = await supabase.from("campaign_vouchers").insert(insert);
          if (error) throw error;
        }
      }

      const { data: fresh, error: loadErr } = await supabase
        .from("campaigns")
        .select(
          `
          *,
          campaign_vouchers (
            *,
            menu_items (*)
          )
        `,
        )
        .eq("id", campaignId)
        .single();
      if (loadErr) throw loadErr;

      return fresh;
    },
    onSuccess: (data, vars) => {
      void queryClient.invalidateQueries({ queryKey: orgCampaignsQueryKey(vars.orgId) });
      const id = data && typeof data === "object" && "id" in data ? (data as { id: string }).id : undefined;
      if (id) {
        void queryClient.invalidateQueries({ queryKey: ["campaign", vars.orgId, id] });
      }
    },
  });
}
