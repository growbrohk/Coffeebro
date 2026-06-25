import { cn } from '@/lib/utils';

type StatCardProps = {
  label: string;
  value: string;
  className?: string;
};

export function StatCard({ label, value, className }: StatCardProps) {
  return (
    <div className={cn('rounded-xl border border-border bg-muted/40 p-4', className)}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

export function StatCardGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3', className)}>
      {children}
    </div>
  );
}
