import { z } from "zod";
import {
  allowedFulfillmentRules,
  allowedTemperatureRules,
  type MenuItemRuleSource,
} from "./campaignVoucherRules";

export const CAMPAIGN_TYPES = ["grab", "hunt"] as const;
export const REWARD_MODES = ["fixed", "random"] as const;
export const CAMPAIGN_STATUSES = ["draft", "published", "ended"] as const;
export const TREASURE_LOCATION_TYPES = ["shop", "custom"] as const;
export const OFFER_TYPES = ["free", "b1g1", "fixed_price_17"] as const;

export const campaignVoucherLineSchema = z.object({
  id: z.string().uuid().optional(),
  menu_item_id: z.string().uuid("Pick a menu item"),
  offer_type: z.enum(OFFER_TYPES),
  redeem_valid_days: z.coerce.number().int().min(1).max(90),
  quantity: z.coerce.number().int().min(1),
  temperature_rule: z.string().min(1),
  fulfillment_rule: z.string().min(1),
  sort_order: z.coerce.number().int().min(0).default(0),
});

export const campaignFormSchema = z
  .object({
    org_id: z.string().uuid(),
    display_title: z.string().max(200).nullable().optional(),
    campaign_type: z.enum(CAMPAIGN_TYPES),
    /** ISO string from `<input type="datetime-local">` or full ISO with offset */
    start_at: z.string().nullable().optional(),
    end_at: z.string().nullable().optional(),
    reward_mode: z.enum(REWARD_MODES),
    reward_per_action: z.coerce.number().int().min(1).max(10).default(1),
    treasure_location_type: z.enum(TREASURE_LOCATION_TYPES).default("shop"),
    treasure_lat: z.number().nullable().optional(),
    treasure_lng: z.number().nullable().optional(),
    treasure_address: z.string().max(500).nullable().optional(),
    treasure_area_name: z.string().max(200).nullable().optional(),
    hint_text: z.string().max(2000).nullable().optional(),
    hint_image_url: z
      .union([z.string().url(), z.literal(""), z.null()])
      .optional()
      .transform((v) => (v === "" || v === undefined ? null : v)),
    status: z.enum(CAMPAIGN_STATUSES).default("draft"),
    qr_payload: z.string().max(500).nullable().optional(),
    vouchers: z.array(campaignVoucherLineSchema).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.campaign_type === "grab" && data.treasure_location_type !== "shop") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Grab campaigns must use shop treasure location.",
        path: ["treasure_location_type"],
      });
    }

    if (data.campaign_type === "hunt" && data.treasure_location_type === "custom") {
      const hasCoords =
        data.treasure_lat != null &&
        data.treasure_lng != null &&
        Number.isFinite(data.treasure_lat) &&
        Number.isFinite(data.treasure_lng);
      const hasAddress = Boolean(data.treasure_address?.trim()) || Boolean(data.treasure_area_name?.trim());
      if (!hasCoords && !hasAddress) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Add coordinates or an address/area for a custom treasure location.",
          path: ["treasure_address"],
        });
      }
    }

    if (data.reward_mode === "fixed" && data.vouchers.length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Fixed reward mode allows only one voucher definition.",
        path: ["vouchers"],
      });
    }

    if (data.reward_mode === "fixed" && data.vouchers.length === 0 && data.status === "published") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add a voucher before publishing (fixed mode).",
        path: ["vouchers"],
      });
    }

    if (data.reward_mode === "random" && data.vouchers.length === 0 && data.status === "published") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add at least one voucher row before publishing.",
        path: ["vouchers"],
      });
    }

    if (data.status === "published") {
      if (!data.start_at || !data.end_at) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Start and end time are required to publish.",
          path: !data.start_at ? ["start_at"] : ["end_at"],
        });
      } else {
        const start = Date.parse(data.start_at);
        const end = Date.parse(data.end_at);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "End must be after start.",
            path: ["end_at"],
          });
        }
      }
    }
  });

export type CampaignFormValues = z.infer<typeof campaignFormSchema>;

/** Extra checks that need menu item rows (category + temp/fulfillment options). */
export function refineCampaignVouchersWithMenuItems(
  data: CampaignFormValues,
  getMenuItem: (menuItemId: string) => MenuItemRuleSource | undefined,
  ctx: z.RefinementCtx,
): void {
  data.vouchers.forEach((v, index) => {
    const menu = getMenuItem(v.menu_item_id);
    if (!menu) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Unknown menu item.",
        path: ["vouchers", index, "menu_item_id"],
      });
      return;
    }

    if (v.offer_type === "fixed_price_17" && menu.category !== "coffee") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "$17 coffee offer is only valid for coffee menu items.",
        path: ["vouchers", index, "offer_type"],
      });
    }

    const tempAllowed = allowedTemperatureRules(menu) as readonly string[];
    if (!tempAllowed.includes(v.temperature_rule)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Temperature rule is not compatible with this menu item.",
        path: ["vouchers", index, "temperature_rule"],
      });
    }

    const fulfillAllowed = allowedFulfillmentRules(menu) as readonly string[];
    if (!fulfillAllowed.includes(v.fulfillment_rule)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Fulfillment rule is not compatible with this menu item.",
        path: ["vouchers", index, "fulfillment_rule"],
      });
    }
  });
}

/** Full parse: base schema + menu-aware voucher rules. */
export function safeParseCampaignForm(
  values: unknown,
  getMenuItem: (menuItemId: string) => MenuItemRuleSource | undefined,
): z.SafeParseReturnType<CampaignFormValues, CampaignFormValues> {
  const base = campaignFormSchema.safeParse(values);
  if (!base.success) return base;

  const issues: z.ZodIssue[] = [];
  const fakeCtx: z.RefinementCtx = {
    addIssue: (i) => issues.push(i),
    path: [],
  };
  refineCampaignVouchersWithMenuItems(base.data, getMenuItem, fakeCtx);

  if (issues.length) {
    return {
      success: false,
      error: new z.ZodError(issues),
    };
  }

  return base;
}
