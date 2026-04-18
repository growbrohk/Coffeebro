import { useState } from "react";
import { MapPin } from "lucide-react";
import { TreasureMapPickerDialog } from "@/components/campaigns/TreasureMapPickerDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type Props = {
  campaignType: "grab" | "hunt";
  treasureLocationType: "shop" | "custom";
  onTreasureLocationType: (v: "shop" | "custom") => void;
  treasureLat: string;
  treasureLng: string;
  treasureAddress: string;
  treasureAreaName: string;
  onTreasureLat: (v: string) => void;
  onTreasureLng: (v: string) => void;
  onTreasureAddress: (v: string) => void;
  onTreasureAreaName: (v: string) => void;
  shopType?: "physical" | "online";
  claimSpotLabel?: string | null;
  disabled?: boolean;
};

export function TreasureLocationSection({
  campaignType,
  treasureLocationType,
  onTreasureLocationType,
  treasureLat,
  treasureLng,
  treasureAddress,
  treasureAreaName,
  onTreasureLat,
  onTreasureLng,
  onTreasureAddress,
  onTreasureAreaName,
  shopType,
  claimSpotLabel,
  disabled,
}: Props) {
  const isGrab = campaignType === "grab";
  const isOnline = shopType === "online";
  const [mapPickerOpen, setMapPickerOpen] = useState(false);

  const sameAsShopHelp = isOnline
    ? claimSpotLabel
      ? `Directions use the selected reward claim spot: ${claimSpotLabel}.`
      : "Select a reward claim spot above so directions and the map pin have a destination."
    : null;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Treasure location</h2>
      {isGrab && (
        <p className="text-sm text-muted-foreground">
          {isOnline
            ? "Grab campaigns for online shops use the selected reward claim spot for the map pin and directions."
            : "Grab campaigns always use your shop coordinates."}
        </p>
      )}
      {!isGrab && (
        <>
          <RadioGroup
            value={treasureLocationType}
            onValueChange={(v) => onTreasureLocationType(v as "shop" | "custom")}
            className="flex flex-col gap-2"
            disabled={disabled}
          >
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="shop" id="tl-shop" />
              Same as shop
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="custom" id="tl-custom" />
              Custom pin / address
            </label>
          </RadioGroup>
          {treasureLocationType === "shop" && sameAsShopHelp ? (
            <p className="text-sm text-muted-foreground">{sameAsShopHelp}</p>
          ) : null}
          {treasureLocationType === "custom" && (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 sm:w-auto"
                disabled={disabled}
                onClick={() => setMapPickerOpen(true)}
              >
                <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                Pick on map
              </Button>
              <TreasureMapPickerDialog
                open={mapPickerOpen}
                onOpenChange={setMapPickerOpen}
                initialLat={treasureLat}
                initialLng={treasureLng}
                disabled={disabled}
                onApply={({ lat, lng, address, areaName }) => {
                  onTreasureLat(lat);
                  onTreasureLng(lng);
                  onTreasureAddress(address);
                  onTreasureAreaName(areaName);
                }}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="tlat">Latitude</Label>
                  <Input
                    id="tlat"
                    value={treasureLat}
                    onChange={(e) => onTreasureLat(e.target.value)}
                    disabled={disabled}
                    placeholder="22.3"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tlng">Longitude</Label>
                  <Input
                    id="tlng"
                    value={treasureLng}
                    onChange={(e) => onTreasureLng(e.target.value)}
                    disabled={disabled}
                    placeholder="114.17"
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="taddr">Address</Label>
                  <Input
                    id="taddr"
                    value={treasureAddress}
                    onChange={(e) => onTreasureAddress(e.target.value)}
                    disabled={disabled}
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="tarea">Area name</Label>
                  <Input
                    id="tarea"
                    value={treasureAreaName}
                    onChange={(e) => onTreasureAreaName(e.target.value)}
                    disabled={disabled}
                    placeholder="e.g. Central"
                  />
                </div>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
