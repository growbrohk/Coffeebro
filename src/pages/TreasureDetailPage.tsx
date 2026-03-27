import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { TreasureDetailPanel } from '@/components/TreasureDetailPanel';

export default function TreasureDetailPage() {
  const { huntId, treasureId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const fromTab = (location.state as { fromTab?: 'map' | 'list' })?.fromTab ?? 'map';

  const hId = huntId ?? '';
  const tId = treasureId ?? '';

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() =>
              navigate(`/hunts/${hId}/map`, {
                state: { initialTab: fromTab },
              })
            }
            className="p-2 -ml-2 text-foreground/70 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-4 pt-4">
        <TreasureDetailPanel huntId={hId} treasureId={tId} />
      </div>
    </div>
  );
}
