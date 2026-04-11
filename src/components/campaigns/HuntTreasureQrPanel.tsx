import { HuntTreasureQrCard } from "@/components/campaigns/HuntTreasureQrCard";

type Props = {
  qrPayload: string;
  campaignId: string;
  disabled?: boolean;
};

export function HuntTreasureQrPanel({ qrPayload, campaignId, disabled }: Props) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Treasure QR</h2>
      <p className="text-sm text-muted-foreground">
        Print or display this code at the treasure location. Customers claim the reward in the app via Hunt → Scan and
        point the camera at this QR (or paste the payload manually).
      </p>
      <HuntTreasureQrCard qrPayload={qrPayload} campaignId={campaignId} disabled={disabled} />
    </section>
  );
}
