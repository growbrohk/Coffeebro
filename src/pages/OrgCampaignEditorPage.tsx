import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrg } from "@/hooks/useOrgs";
import { useOrgMenuItems } from "@/hooks/useOrgMenuItems";
import { useOrgClaimSpots } from "@/hooks/useOrgClaimSpots";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
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
import { readCampaignDetailReturnTo } from "@/lib/campaignDetailReturnNav";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

const MAX_HINT_IMAGE_SIZE = 5 * 1024 * 1024;
const HINT_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

async function uploadCampaignHintImageToStorage(orgId: string, file: File): Promise<string> {
  const path = `campaign-hint/${orgId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const { error } = await supabase.storage.from("treasure-images").upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("treasure-images").getPublicUrl(path);
  return data.publicUrl;
}

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
  const location = useLocation();
  const returnToCampaignDetail = readCampaignDetailReturnTo(location.state);
  const isNew = campaignId === "new";
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, isStaffUser, isLoading: roleLoading } = useUserRole();
  const { data: org, isLoading: orgLoading } = useOrg(orgId);
  const { data: menuItems = [] } = useOrgMenuItems(orgId);
  const { data: claimSpots = [] } = useOrgClaimSpots(orgId);
  const { data: campaign, isLoading: campLoading, error: campError } = useCampaign(
    orgId,
    isNew ? undefined : campaignId,
  );
  const isOnlineOrg = org?.shop_type === "online";
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
  const [hintImageMode, setHintImageMode] = useState<"link" | "upload">("link");
  const [hintImageUploading, setHintImageUploading] = useState(false);
  const hintImageFileRef = useRef<HTMLInputElement>(null);
  const [vouchers, setVouchers] = useState<VoucherDraft[]>([]);
  const [claimSpotId, setClaimSpotId] = useState<string>("");
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
    setClaimSpotId(campaign.claim_spot_id ?? "");
    setHydrated(true);
  }, [campaign, isNew]);

  useEffect(() => {
    if (!isNew || hydrated || orgLoading) return;
    if (org && org.shop_type !== "online") {
      setTreasureLat(org.lat != null ? String(org.lat) : "");
      setTreasureLng(org.lng != null ? String(org.lng) : "");
    }
    setHydrated(true);
  }, [isNew, org, orgLoading, hydrated]);

  // Grab campaigns always mirror the "shop" as the treasure location. For physical
  // orgs that means copying org.lat/lng into the treasure state so the UI can
  // preview coordinates. For online orgs there is no org-level coord — the server
  // resolves pickup location from the selected claim spot at read time.
  useEffect(() => {
    if (campaignType !== "grab") return;
    setTreasureLocationType("shop");
    if (org?.shop_type === "online") {
      setTreasureLat("");
      setTreasureLng("");
      return;
    }
    if (org?.lat != null) setTreasureLat(String(org.lat));
    if (org?.lng != null) setTreasureLng(String(org.lng));
  }, [campaignType, org?.shop_type, org?.lat, org?.lng]);

  const selectedClaimSpot = useMemo(
    () => claimSpots.find((s) => s.id === claimSpotId) ?? null,
    [claimSpots, claimSpotId],
  );

  const previewVouchers = useMemo(
    () =>
      vouchers.map((v) => ({
        offer_type: v.offer_type,
        item_name: menuItems.find((m) => m.id === v.menu_item_id)?.item_name ?? null,
      })),
    [vouchers, menuItems],
  );

  const treasureQrFlyerTitle = useMemo(() => {
    const autoTitle = buildCampaignDisplayTitle({
      campaignType,
      rewardMode,
      vouchers: previewVouchers,
    });
    return displayTitle.trim() || autoTitle;
  }, [displayTitle, campaignType, rewardMode, previewVouchers]);

  const handleHintImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !orgId) return;
    if (!HINT_IMAGE_MIME.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Use JPEG, PNG, WebP, or GIF.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_HINT_IMAGE_SIZE) {
      toast({ title: "File too large", description: "Max size is 5 MB.", variant: "destructive" });
      return;
    }
    setHintImageUploading(true);
    try {
      const url = await uploadCampaignHintImageToStorage(orgId, file);
      setHintImageUrl(url);
      setHintImageMode("link");
      toast({ title: "Photo uploaded" });
    } catch (err: unknown) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Could not upload photo.",
        variant: "destructive",
      });
    } finally {
      setHintImageUploading(false);
    }
  };

  const clearHintImage = () => {
    setHintImageUrl("");
    if (hintImageFileRef.current) hintImageFileRef.current.value = "";
  };

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

    // shop_type-dependent rules: the zod schema has no org context so we validate here.
    if (isOnlineOrg) {
      if (!claimSpotId) {
        if (status === "published") {
          toast({
            title: "Claim spot required",
            description: "Pick a reward claim spot before publishing an online-shop campaign.",
            variant: "destructive",
          });
          return;
        }
      }
      if (claimSpotId) {
        const spot = claimSpots.find((s) => s.id === claimSpotId);
        if (status === "published" && (!spot || spot.lat == null || spot.lng == null)) {
          toast({
            title: "Claim spot needs coordinates",
            description: "Open Claim spots and set lat/lng for the selected pickup location.",
            variant: "destructive",
          });
          return;
        }
      }
    }

    // For online orgs, campaign rows do NOT carry treasure_lat/lng/address for the
    // shop-location path — consumers resolve those from the linked claim_spot at
    // read time. Only "custom" hunt pins continue to write coords directly.
    const writeTreasureFromShop = !isOnlineOrg;
    const treasureLatForRow =
      campaignType === "grab"
        ? writeTreasureFromShop
          ? org?.lat ?? latNum
          : null
        : treasureLocationType === "shop"
          ? writeTreasureFromShop
            ? org?.lat ?? latNum
            : null
          : latNum;
    const treasureLngForRow =
      campaignType === "grab"
        ? writeTreasureFromShop
          ? org?.lng ?? lngNum
          : null
        : treasureLocationType === "shop"
          ? writeTreasureFromShop
            ? org?.lng ?? lngNum
            : null
          : lngNum;

    const payload = {
      org_id: orgId,
      display_title: finalTitle || null,
      campaign_type: campaignType,
      start_at: fromDatetimeLocalValue(startLocal),
      end_at: fromDatetimeLocalValue(endLocal),
      reward_mode: rewardMode,
      reward_per_action: rewardPerAction,
      treasure_location_type: campaignType === "grab" ? "shop" : treasureLocationType,
      treasure_lat: treasureLatForRow,
      treasure_lng: treasureLngForRow,
      treasure_address: treasureAddress.trim() || null,
      treasure_area_name: treasureAreaName.trim() || null,
      hint_text: campaignType === "grab" ? null : hintText.trim() || null,
      hint_image_url: campaignType === "grab" ? null : hintImageUrl.trim() || null,
      status,
      claim_spot_id: claimSpotId || null,
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
          claim_spot_id: d.claim_spot_id ?? null,
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
          claim_spot_id: d.claim_spot_id ?? null,
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
          onClick={() =>
            returnToCampaignDetail
              ? navigate(returnToCampaignDetail, { replace: true })
              : navigate(`/org/${orgId}/campaigns`, { replace: true })
          }
          className="absolute left-0 p-2"
          aria-label="Back"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="font-heading text-2xl font-bold tracking-normal">{isNew ? "New campaign" : "Edit campaign"}</h1>
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

        {isOnlineOrg ? (
          <section className="space-y-3">
            <div className="grid gap-2">
              <Label htmlFor="claim-spot">Reward claim spot</Label>
              {claimSpots.length === 0 ? (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
                  <p>No claim spots defined for this org yet.</p>
                  <p className="mt-1 text-xs">
                    Add at least one pickup location on the organization page before publishing an online-shop
                    campaign.
                  </p>
                </div>
              ) : (
                <>
                  <Select
                    value={claimSpotId || "__none__"}
                    onValueChange={(v) => setClaimSpotId(v === "__none__" ? "" : v)}
                    disabled={saveCampaign.isPending}
                  >
                    <SelectTrigger id="claim-spot">
                      <SelectValue placeholder="Select a claim spot" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Not set</SelectItem>
                      {claimSpots.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.label}
                          {s.address ? ` — ${s.address}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Map pin, voucher directions, and hunt &quot;same as shop&quot; destinations use this pickup
                    location.
                  </p>
                </>
              )}
            </div>
          </section>
        ) : null}

        <CampaignScheduleSection
          startAt={startLocal}
          endAt={endLocal}
          onStartAt={setStartLocal}
          onEndAt={setEndLocal}
          disabled={saveCampaign.isPending}
        />

        {campaignType === "hunt" ? (
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
            shopType={org?.shop_type}
            claimSpotLabel={selectedClaimSpot?.label ?? null}
            disabled={saveCampaign.isPending}
          />
        ) : null}

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
              campaignTitle={treasureQrFlyerTitle}
              orgName={org.org_name}
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

        {campaignType === "hunt" ? (
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
              <Label>Hint image</Label>
              <Tabs
                value={hintImageMode}
                onValueChange={(v) => setHintImageMode(v as "link" | "upload")}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger
                    type="button"
                    value="link"
                    disabled={saveCampaign.isPending || hintImageUploading}
                  >
                    Image URL
                  </TabsTrigger>
                  <TabsTrigger
                    type="button"
                    value="upload"
                    disabled={saveCampaign.isPending || hintImageUploading}
                  >
                    Upload
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="link" className="mt-3 space-y-2">
                  <Input
                    id="hintimg"
                    value={hintImageUrl}
                    onChange={(e) => setHintImageUrl(e.target.value)}
                    disabled={saveCampaign.isPending}
                    placeholder="https://…"
                    type="url"
                  />
                </TabsContent>
                <TabsContent value="upload" className="mt-3 space-y-2">
                  <input
                    ref={hintImageFileRef}
                    type="file"
                    accept={HINT_IMAGE_MIME.join(",")}
                    className="hidden"
                    onChange={handleHintImageFile}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={saveCampaign.isPending || hintImageUploading}
                    onClick={() => hintImageFileRef.current?.click()}
                  >
                    {hintImageUploading ? "Uploading…" : "Choose photo"}
                  </Button>
                </TabsContent>
              </Tabs>
              {hintImageUrl.trim() ? (
                <div className="relative overflow-hidden rounded-lg border border-border">
                  <img src={hintImageUrl.trim()} alt="" className="aspect-video w-full object-cover" />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="absolute right-2 top-2 gap-1 shadow-sm"
                    disabled={saveCampaign.isPending || hintImageUploading}
                    onClick={clearHintImage}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

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
