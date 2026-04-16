import { useCallback, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { reverseGeocode } from "@/lib/reverseGeocode";

const TILE_LAYERS = {
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
} as const;

const HK_DEFAULT: [number, number] = [22.3193, 114.1694];

const treasurePickerIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function parseCoord(s: string): number | null {
  const n = Number(String(s).trim());
  return Number.isFinite(n) ? n : null;
}

function formatCoord(n: number): string {
  return String(Number(n.toFixed(6)));
}

function InvalidateSizeWhenOpen({ open }: { open: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => window.clearTimeout(id);
  }, [open, map]);
  return null;
}

function MapClickHandler({ onPosition }: { onPosition: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPosition(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function GeolocateOnMapButton({
  disabled,
  onLocated,
}: {
  disabled?: boolean;
  onLocated: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  const { toast } = useToast();

  const handleClick = useCallback(() => {
    if (!navigator.geolocation) {
      toast({ title: "Location unavailable", description: "Geolocation is not supported.", variant: "destructive" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        onLocated(lat, lng);
        map.flyTo([lat, lng], 17);
      },
      (err: GeolocationPositionError) => {
        const msg =
          err.code === 1
            ? "Location permission denied."
            : err.code === 2
              ? "Position unavailable."
              : err.code === 3
                ? "Location request timed out."
                : err.message || "Could not get location.";
        toast({ title: "Could not use your location", description: msg, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, [map, onLocated, toast]);

  return (
    <div className="pointer-events-auto absolute bottom-3 right-3 z-[1000]">
      <Button type="button" size="sm" variant="secondary" className="shadow-md" disabled={disabled} onClick={handleClick}>
        Pin here
      </Button>
    </div>
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialLat: string;
  initialLng: string;
  onApply: (values: { lat: string; lng: string; address: string; areaName: string }) => void;
  disabled?: boolean;
};

export function TreasureMapPickerDialog({ open, onOpenChange, initialLat, initialLng, onApply, disabled }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const tileUrl = isDark ? TILE_LAYERS.dark : TILE_LAYERS.light;
  const { toast } = useToast();

  /** Map view center — only updated when dialog opens, not when the pin moves (avoids resetting the view on each click). */
  const [mapCenter, setMapCenter] = useState<[number, number]>(HK_DEFAULT);
  const [position, setPosition] = useState<[number, number]>(HK_DEFAULT);
  const [mapReady, setMapReady] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    if (!open) {
      setMapReady(false);
      return;
    }
    const lat = parseCoord(initialLat) ?? HK_DEFAULT[0];
    const lng = parseCoord(initialLng) ?? HK_DEFAULT[1];
    const p: [number, number] = [lat, lng];
    setMapCenter(p);
    setPosition(p);
    setMapReady(true);
  }, [open, initialLat, initialLng]);

  const handleApply = async () => {
    const [lat, lng] = position;
    setGeocoding(true);
    try {
      const { address, areaName } = await reverseGeocode(lat, lng);
      if (address === null && areaName === null) {
        toast({
          title: "Address lookup unavailable",
          description: "Coordinates were saved; you can enter address and area manually.",
        });
      }
      onApply({
        lat: formatCoord(lat),
        lng: formatCoord(lng),
        address: address ?? "",
        areaName: areaName ?? "",
      });
      onOpenChange(false);
    } finally {
      setGeocoding(false);
    }
  };

  const busy = Boolean(disabled) || geocoding;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[min(100vw-2rem,430px)] gap-4 overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Pick treasure location</DialogTitle>
          <DialogDescription>
            Tap the map to place the pin, drag the pin to adjust, or use Pin here for your current location. Apply saves
            coordinates and looks up address when possible.
          </DialogDescription>
        </DialogHeader>

        <div className="relative hunt-map-wrapper h-[min(50vh,320px)] w-full overflow-hidden rounded-md border border-border">
          {!open ? null : mapReady ? (
          <MapContainer
            center={mapCenter}
            zoom={16}
            className="h-full w-full min-h-[280px]"
            scrollWheelZoom
            zoomControl
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
              url={tileUrl}
            />
            <InvalidateSizeWhenOpen open={open} />
            <MapClickHandler
              onPosition={(lat, lng) => {
                setPosition([lat, lng]);
              }}
            />
            <Marker
              position={position}
              icon={treasurePickerIcon}
              draggable={!busy}
              eventHandlers={{
                dragend: (e) => {
                  const ll = e.target.getLatLng();
                  setPosition([ll.lat, ll.lng]);
                },
              }}
            />
            <GeolocateOnMapButton
              disabled={busy}
              onLocated={(lat, lng) => {
                setPosition([lat, lng]);
              }}
            />
          </MapContainer>
          ) : (
            <div className="flex h-[min(50vh,320px)] min-h-[280px] w-full items-center justify-center bg-muted/30 text-sm text-muted-foreground">
              Loading map…
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Address and area come from OpenStreetMap when lookup succeeds. You can edit them after applying.
        </p>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={() => void handleApply()}>
            {geocoding ? "Looking up…" : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
