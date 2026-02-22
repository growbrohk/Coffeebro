interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="sticky top-0 z-10 bg-background py-4 px-4 border-b border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold uppercase tracking-wide">
          Progress
        </span>
        <span className="text-sm font-bold">
          {current} / {total} days
        </span>
      </div>
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
