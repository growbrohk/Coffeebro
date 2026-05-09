import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type TopCafeRow = {
  org_id: string;
  org_name: string;
  visit_count: number;
  points: number;
};

export function useTopCafes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["top-cafes", user?.id],
    queryFn: async (): Promise<TopCafeRow[]> => {
      if (!user) return [];

      const [logsRes, balancesRes] = await Promise.all([
        supabase
          .from("daily_coffees")
          .select("org_id, orgs ( id, org_name )")
          .eq("user_id", user.id)
          .eq("log_type", "receipt")
          .not("org_id", "is", null),
        supabase
          .from("loyalty_balances")
          .select("org_id, balance")
          .eq("user_id", user.id),
      ]);

      if (logsRes.error) throw logsRes.error;
      if (balancesRes.error) throw balancesRes.error;

      const logs = logsRes.data;
      const balances = balancesRes.data;

      const balMap = new Map((balances ?? []).map((b) => [b.org_id, b.balance]));

      const byOrg = new Map<string, { org_id: string; org_name: string; visit_count: number }>();

      for (const row of logs ?? []) {
        const oid = row.org_id as string;
        const orgRow = row.orgs as { id?: string; org_name?: string | null } | null;
        const name =
          (orgRow && typeof orgRow === "object" && "org_name" in orgRow
            ? orgRow.org_name
            : null) ?? "Café";
        const cur = byOrg.get(oid) ?? { org_id: oid, org_name: String(name), visit_count: 0 };
        cur.visit_count += 1;
        byOrg.set(oid, cur);
      }

      return [...byOrg.values()]
        .map((o) => ({
          ...o,
          points: balMap.get(o.org_id) ?? 0,
        }))
        .sort((a, b) => b.visit_count - a.visit_count);
    },
    enabled: !!user,
  });
}
