interface ProgressBarProps {
  monthCount: number;
}

export function ProgressBar({ monthCount }: ProgressBarProps) {
  return (
    <div className="sticky top-0 z-10 bg-background py-4 px-4 border-b border-border">
      <div className="flex items-center justify-center">
        <span className="text-lg font-bold uppercase tracking-wide">
          {monthCount} {monthCount === 1 ? 'coffee' : 'coffees'} this month
        </span>
      </div>
    </div>
  );
}
