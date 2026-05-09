import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import { useTopCafes } from "@/hooks/useTopCafes";
import { Button } from "@/components/ui/button";

export default function AllMyCafesPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sort = params.get("sort") === "points" ? "points" : "visits";
  const { data: cafes = [], isLoading } = useTopCafes();

  const sorted = useMemo(() => {
    const copy = [...cafes];
    if (sort === "points") {
      copy.sort((a, b) => b.points - a.points || b.visit_count - a.visit_count);
    } else {
      copy.sort((a, b) => b.visit_count - a.visit_count || b.points - a.points);
    }
    return copy;
  }, [cafes, sort]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 flex items-center justify-center border-b border-border bg-background px-4 py-4">
        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="absolute left-0 p-2"
          aria-label="Back"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="font-heading text-xl font-bold tracking-normal">Your cafés</h1>
      </div>

      <div className="container max-w-lg space-y-4 px-4 py-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={sort === "visits" ? "default" : "outline"}
            onClick={() => navigate("/loyalty/cafes?sort=visits")}
          >
            By visits
          </Button>
          <Button
            type="button"
            size="sm"
            variant={sort === "points" ? "default" : "outline"}
            onClick={() => navigate("/loyalty/cafes?sort=points")}
          >
            By points
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Scan a receipt at a coffee shop to see cafés here.
          </p>
        ) : (
          <ul className="space-y-2">
            {sorted.map((c) => (
              <li key={c.org_id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left transition hover:bg-muted/50"
                  onClick={() => navigate(`/loyalty/orgs/${c.org_id}`)}
                >
                  <span className="font-semibold">{c.org_name}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {c.points} pts · {c.visit_count} visits
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
