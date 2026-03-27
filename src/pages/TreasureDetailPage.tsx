import { useParams } from 'react-router-dom';
import { TreasureDetailPanel } from '@/components/TreasureDetailPanel';

export default function TreasureDetailPage() {
  const { huntId, treasureId } = useParams();

  const hId = huntId ?? '';
  const tId = treasureId ?? '';

  return (
    <div className="min-h-screen bg-background pb-24">
      <TreasureDetailPanel huntId={hId} treasureId={tId} />
    </div>
  );
}
