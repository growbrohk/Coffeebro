import { cn } from '@/lib/utils';

export type PillarTab = {
  id: string;
  label: string;
};

type PillarTabsProps = {
  tabs: PillarTab[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
};

export function PillarTabs({ tabs, activeId, onChange, className }: PillarTabsProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm font-medium transition-colors',
            activeId === tab.id
              ? 'bg-foreground text-background'
              : 'border border-border bg-card text-foreground',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
