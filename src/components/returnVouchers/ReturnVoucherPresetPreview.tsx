import { useQuery } from "@tanstack/react-query";
import type { ReturnVoucherPresetWithMenu } from "@/hooks/useReturnVoucherPresets";
import { fetchMenuItemNames } from "@/lib/fetchMenuItemNames";
import { voucherOfferLabel, voucherItemLabel } from "@/lib/voucherOfferLabels";

type Props = {
  preset: ReturnVoucherPresetWithMenu;
  menuNamesById?: Record<string, string>;
};

export function ReturnVoucherPresetPreview({ preset, menuNamesById }: Props) {
  const ids = preset.menu_item_ids ?? [];
  const { data: fetchedNames } = useQuery({
    queryKey: ["menu_item_names", ids],
    enabled: ids.length > 0 && !menuNamesById,
    queryFn: () => fetchMenuItemNames(ids),
  });
  const menuName = voucherItemLabel(
    {
      item_name: preset.menu_items?.item_name,
      menu_item_ids: preset.menu_item_ids,
      custom_item_text: preset.custom_item_text,
    },
    menuNamesById ?? fetchedNames,
  );
  const offerLabel = voucherOfferLabel(preset.offer_type);

  return (
    <div className="rounded-lg border bg-muted/20 p-4 space-y-2 text-sm">
      <p className="font-medium">{preset.title}</p>
      <dl className="grid gap-1 text-muted-foreground">
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-medium text-foreground">Offer</dt>
          <dd>{offerLabel}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-medium text-foreground">Menu item</dt>
          <dd>{menuName}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-medium text-foreground">Pool quantity</dt>
          <dd>{preset.quantity}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-medium text-foreground">Valid days after claim</dt>
          <dd>{preset.redeem_valid_days}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-medium text-foreground">Temperature rule</dt>
          <dd>{preset.temperature_rule}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-medium text-foreground">Fulfillment rule</dt>
          <dd>{preset.fulfillment_rule}</dd>
        </div>
      </dl>
    </div>
  );
}
