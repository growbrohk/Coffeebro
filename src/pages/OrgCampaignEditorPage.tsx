import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrg } from "@/hooks/useOrgs";
import { useOrgMenuItems } from "@/hooks/useOrgMenuItems";
import { useCampaign } from "@/hooks/useOrgCampaigns";
import type { CampaignWithVouchers } from "@/hooks/useOrgCampaigns";
import { useCampaignMutations } from "@/hooks/useCampaignMutations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CampaignBasicsSection } from "@/components/campaigns/sections/CampaignBasicsSection";
import {
  CampaignScheduleSection,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "@/components/campaigns/sections/CampaignScheduleSection";
import { TreasureLocationSection } from "@/components/campaigns/sections/TreasureLocationSection";
import { HuntTreasureQrPanel } from "@/components/campaigns/HuntTreasureQrPanel";
import { CampaignVouchersSection } from "@/components/campaigns/sections/CampaignVouchersSection";
import type { VoucherDraft } from "@/components/campaigns/vouchers/VoucherDefinitionCard";
import { buildCampaignDisplayTitle } from "@/lib/campaignDisplayTitle";
import { safeParseCampaignForm } from "@/lib/campaignFormSchema";
import { useToast } from "@/hooks/use-toast";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

function vouchersFromCampaign(c: CampaignWithVouchers): VoucherDraft[] {
  return (c.campaign_vouchers ?? []).map((cv, i) => ({
    clientKey: cv.id,
    id: cv.id,
    menu_item_id: cv.menu_item_id,
    offer_type: cv.offer_type as VoucherDraft["offer_type"],
    redeem_valid_days: cv.redeem_valid_days,
    quantity: cv.quantity,
    temperature_rule: cv.temperature_rule,
    fulfillment_rule: cv.fulfillment_rule,
    sort_order: cv.sort_order ?? i,
  }));
}

export default function OrgCampaignEditorPage() {
  const { orgId, campaignId } = useParams<{ orgId: string; campaignId: string }>();
  const navigate = useNavigate();
  const isNew = campaignId === "new";
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, isStaffUser, isLoading: roleLoading } = useUserRole();
  const { data: org, isLoading: orgLoading } = useOrg(orgId);
  const { data: menuItems = [] } = useOrgMenuItems(orgId);
  const { data: campaign, isLoading: campLoading, error: campError } = useCampaign(
    orgId,
    isNew ? undefined : campaignId,
  );
  const saveCampaign = useCampaignMutations();
  const { toast } = useToast();

  const [displayTitle, setDisplayTitle] = useState("");
  const [campaignType, setCampaignType] = useState<"grab" | "hunt">("grab");
  const [rewardMode, setRewardMode] = useState<"fixed" | "random">("fixed");
  const [rewardPerAction, setRewardPerAction] = useState(1);
  const [treasureLocationType, setTreasureLocationType] = useState<"shop" | "custom">("shop");
  const [treasureLat, setTreasureLat] = useState("");
  const [treasureLng, setTreasureLng] = useState("");
  const [treasureAddress, setTreasureAddress] = useState("");
  const [treasureAreaName, setTreasureAreaName] = useState("");
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "ended">("draft");
  const [hintText, setHintText] = useState("");
  const [hintImageUrl, setHintImageUrl] = useState("");
  const [vouchers, setVouchers] = useState<VoucherDraft[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const canAccess = Boolean(user && (isSuperAdmin || isStaffUser));

  useEffect(() => {
    if (!campaign || isNew) return;
    setDisplayTitle(campaign.display_title ?? "");
    setCampaignType(campaign.campaign_type as "grab" | "hunt");
    setRewardMode(campaign.reward_mode as "fixed" | "random");
    setRewardPerAction(campaign.reward_per_action ?? 1);
    setTreasureLocationType(campaign.treasure_location_type as "shop" | "custom");
    setTreasureLat(campaign.treasure_lat != null ? String(campaign.treasure_lat) : "");
    setTreasureLng(campaign.treasure_lng != null ? String(campaign.treasure_lng) : "");
    setTreasureAddress(campaign.treasure_address ?? "");
    setTreasureAreaName(campaign.treasure_area_name ?? "");
    setStartLocal(toDatetimeLocalValue(campaign.start_at));
    setEndLocal(toDatetimeLocalValue(campaign.end_at));
    setStatus(campaign.status as "draft" | "published" | "ended");
    setHintText(campaign.hint_text ?? "");
    setHintImageUrl(campaign.hint_image_url ?? "");
    setVouchers(vouchersFromCampaign(campaign));
    setHydrated(true);
  }, [campaign, isNew]);

  useEffect(() => {
    if (!isNew || hydrated || orgLoading) return;
    if (org) {
      setTreasureLat(org.lat != null ? String(org.lat) : "");
      setTreasureLng(org.lng != null ? String(org.lng) : "");
    }
    setHydrated(true);
  }, [isNew, org, orgLoading, hydrated]);

  useEffect(() => {
    if (campaignType === "grab") {
      setTreasureLocationType("shop");
      if (org?.lat != null) setTreasureLat(String(org.lat));
      if (org?.lng != null) setTreasureLng(String(org.lng));
    }
  }, [campaignType, org?.lat, org?.lng]);

  const previewVouchers = useMemo(
    () =>
      vouchers.map((v) => ({
        offer_type: v.offer_type,
        item_name: menuItems.find((m) => m.id === v.menu_item_id)?.item_name ?? null,
      })),
    [vouchers, menuItems],
  );

  const handleSave = async () => {
    if (!orgId) return;
    const latNum = treasureLat.trim() ? Number(treasureLat) : null;
    const lngNum = treasureLng.trim() ? Number(treasureLng) : null;

    const autoTitle = buildCampaignDisplayTitle({
      campaignType,
      rewardMode,
      vouchers: previewVouchers,
    });
    const finalTitle = displayTitle.trim() || autoTitle;

    const payload = {
      org_id: orgId,
      display_title: finalTitle || null,
      campaign_type: campaignType,
      start_at: fromDatetimeLocalValue(startLocal),
      end_at: fromDatetimeLocalValue(endLocal),
      reward_mode: rewardMode,
      reward_per_action: rewardPerAction,
      treasure_location_type: campaignType === "grab" ? "shop" : treasureLocationType,
      treasure_lat: campaignType === "grab" ? org?.lat ?? latNum : latNum,
      treasure_lng: campaignType === "grab" ? org?.lng ?? lngNum : lngNum,
      treasure_address: treasureAddress.trim() || null,
      treasure_area_name: treasureAreaName.trim() || null,
      hint_text: hintText.trim() || null,
      hint_image_url: hintImageUrl.trim() || null,
      status,
      vouchers: vouchers.map((v, i) => ({
        ...(v.id ? { id: v.id } : {}),
        menu_item_id: v.menu_item_id,
        offer_type: v.offer_type,
        redeem_valid_days: v.redeem_valid_days,
        quantity: v.quantity,
        temperature_rule: v.temperature_rule,
        fulfillment_rule: v.fulfillment_rule,
        sort_order: v.sort_order ?? i,
      })),
    };

    const parsed = safeParseCampaignForm(payload, (id) => menuItems.find((m) => m.id === id));
    if (!parsed.success) {
      const msg = parsed.error.errors.map((e) => e.message).join(" · ");
      toast({ title: "Fix form", description: msg, variant: "destructive" });
      return;
    }

    const d = parsed.data;
    const voucherRows = d.vouchers.map((v, i) => ({
      id: v.id,
      menu_item_id: v.menu_item_id,
      offer_type: v.offer_type,
      redeem_valid_days: v.redeem_valid_days,
      quantity: v.quantity,
      temperature_rule: v.temperature_rule,
      fulfillment_rule: v.fulfillment_rule,
      sort_order: v.sort_order ?? i,
    }));

    const baseCampaign: TablesInsert<"campaigns"> | (TablesUpdate<"campaigns"> & { id: string }) = isNew
      ? {
          org_id: orgId,
          display_title: d.display_title ?? finalTitle,
          campaign_type: d.campaign_type,
          start_at: d.start_at,
          end_at: d.end_at,
          reward_mode: d.reward_mode,
          reward_per_action: d.reward_per_action,
          treasure_location_type: d.treasure_location_type,
          treasure_lat: d.treasure_lat ?? null,
          treasure_lng: d.treasure_lng ?? null,
          treasure_address: d.treasure_address,
          treasure_area_name: d.treasure_area_name,
          hint_text: d.hint_text,
          hint_image_url: d.hint_image_url,
          status: d.status,
          qr_payload: null,
        }
      : {
          id: campaign!.id,
          display_title: d.display_title ?? finalTitle,
          campaign_type: d.campaign_type,
          start_at: d.start_at,
          end_at: d.end_at,
          reward_mode: d.reward_mode,
          reward_per_action: d.reward_per_action,
          treasure_location_type: d.treasure_location_type,
          treasure_lat: d.treasure_lat ?? null,
          treasure_lng: d.treasure_lng ?? null,
          treasure_address: d.treasure_address,
          treasure_area_name: d.treasure_area_name,
          hint_text: d.hint_text,
          hint_image_url: d.hint_image_url,
          status: d.status,
        };

    try {
      const fresh = await saveCampaign.mutateAsync({
        orgId,
        campaign: baseCampaign,
        vouchers: voucherRows.map((row) => {
          const { id, ...insert } = row;
          return id ? { ...insert, id } : insert;
        }),
      });
      toast({ title: "Saved" });
      if (isNew && fresh?.id) {
        navigate(`/org/${orgId}/campaigns/${fresh.id}`, { replace: true });
      }
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  if (authLoading || roleLoading || orgLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-lg font-semibold">Loading…</div>
      </div>
    );
  }

  if (!user || !canAccess) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-center text-muted-foreground">You don&apos;t have access to this page.</p>
        <Button className="mx-auto mt-4 block" variant="outline" onClick={() => navigate("/settings")}>
          Back
        </Button>
      </div>
    );
  }

  if (!orgId || !org) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-center text-muted-foreground">Organization not found.</p>
      </div>
    );
  }

  if (!isNew && (campLoading || !hydrated)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-lg font-semibold">Loading campaign…</div>
      </div>
    );
  }

  if (!isNew && campError) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-center text-destructive">Could not load campaign.</p>
        <Button className="mx-auto mt-4 block" variant="outline" onClick={() => navigate(`/org/${orgId}/campaigns`)}>
          Back to list
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 flex items-center justify-center border-b border-border bg-background px-4 py-4">
        <button
          type="button"
          onClick={() => navigate(`/org/${orgId}/campaigns`)}
          className="absolute left-0 p-2"
          aria-label="Back"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-black uppercase tracking-tight">{isNew ? "New campaign" : "Edit campaign"}</h1>
      </div>

      <div className="container max-w-2xl space-y-10 px-4 py-6">
        <p className="text-sm text-muted-foreground">{org.org_name}</p>

        <CampaignBasicsSection
          displayTitle={displayTitle}
          onDisplayTitle={setDisplayTitle}
          campaignType={campaignType}
          onCampaignType={setCampaignType}
          rewardMode={rewardMode}
          onRewardMode={(m) => {
            setRewardMode(m);
            if (m === "fixed") {
              setVouchers((vs) => vs.slice(0, 1));
            }
          }}
          rewardPerAction={rewardPerAction}
          onRewardPerAction={setRewardPerAction}
          previewVouchers={previewVouchers}
          disabled={saveCampaign.isPending}
        />

        <CampaignScheduleSection
          startAt={startLocal}
          endAt={endLocal}
          onStartAt={setStartLocal}
          onEndAt={setEndLocal}
          disabled={saveCampaign.isPending}
        />

        <TreasureLocationSection
          campaignType={campaignType}
          treasureLocationType={treasureLocationType}
          onTreasureLocationType={setTreasureLocationType}
          treasureLat={treasureLat}
          treasureLng={treasureLng}
          treasureAddress={treasureAddress}
          treasureAreaName={treasureAreaName}
          onTreasureLat={setTreasureLat}
          onTreasureLng={setTreasureLng}
          onTreasureAddress={setTreasureAddress}
          onTreasureAreaName={setTreasureAreaName}
          disabled={saveCampaign.isPending}
        />

        {campaignType === "hunt" ? (
          isNew ? (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold">Treasure QR</h2>
              <p className="text-sm text-muted-foreground">
                Save the campaign once to generate a printable QR code for the treasure location.
              </p>
            </section>
          ) : campaign?.qr_payload?.trim() ? (
            <HuntTreasureQrPanel
              qrPayload={campaign.qr_payload.trim()}
              campaignId={campaign.id}
              disabled={saveCampaign.isPending}
            />
          ) : (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold">Treasure QR</h2>
              <p className="text-sm text-muted-foreground">
                No treasure QR yet. Save the campaign to generate one (needed for customers to scan and claim).
              </p>
            </section>
          )
        ) : null}

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Hints (hunt)</h2>
          <div className="grid gap-2">
            <Label htmlFor="hint">Hint text</Label>
            <Input
              id="hint"
              value={hintText}
              onChange={(e) => setHintText(e.target.value)}
              disabled={saveCampaign.isPending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="hintimg">Hint image URL</Label>
            <Input
              id="hintimg"
              value={hintImageUrl}
              onChange={(e) => setHintImageUrl(e.target.value)}
              disabled={saveCampaign.isPending}
              placeholder="https://…"
            />
          </div>
        </section>

        <CampaignVouchersSection
          rewardMode={rewardMode}
          vouchers={vouchers}
          menuItems={menuItems}
          onChange={setVouchers}
          disabled={saveCampaign.isPending}
        />

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Publish</h2>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)} disabled={saveCampaign.isPending}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="ended">Ended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        <Button className="w-full" size="lg" onClick={handleSave} disabled={saveCampaign.isPending}>
          {saveCampaign.isPending ? "Saving…" : "Save campaign"}
        </Button>

        {!isNew && campaignId ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => navigate(`/org/${orgId}/campaigns/${campaignId}/participants`)}
          >
            View participants
          </Button>
        ) : null}
      </div>
    </div>
  );
}
