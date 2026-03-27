import { CoffeeCupIcon } from '@/components/CoffeeCupMark';
import { cn } from '@/lib/utils';

export function QuizCoffeeBean({ className }: { className?: string }) {
  return (
    <svg
      className={cn('shrink-0 size-5 text-[var(--quiz-fg)]', className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <ellipse cx="11" cy="12" rx="7.5" ry="9" fill="currentColor" opacity={0.95} />
      <path
        d="M11 4.5c1.2 2.8 1.2 5.9 0 8.7M11 10.8c-1.8 1.4-3.8 2.4-6 2.8"
        stroke="var(--quiz-bg)"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity={0.35}
      />
    </svg>
  );
}

type QuizCupCtaProps = {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
  'aria-label'?: string;
};

export function QuizCupCta({
  children,
  onClick,
  disabled,
  type = 'button',
  className,
  'aria-label': ariaLabel,
}: QuizCupCtaProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'quiz-cup-cta relative touch-manipulation outline-none transition-opacity',
        'flex h-[7.75rem] w-[min(19.5rem,92vw)] items-center justify-center',
        'disabled:opacity-40 disabled:pointer-events-none',
        'focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--quiz-bg)]',
        className,
      )}
    >
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="relative flex size-[min(7.75rem,74vw)] max-h-[92%] max-w-[92%] items-center justify-center -rotate-[8deg]">
          <CoffeeCupIcon
            fill="var(--quiz-fg)"
            className="pointer-events-none absolute inset-0 h-full w-full"
          />
          <span
            className="relative z-[1] flex max-w-[min(11rem,68%)] items-center justify-center px-1 text-center text-[var(--quiz-bg)] [text-wrap:balance]"
            style={{
              fontSize: 'clamp(1.85rem, 11.5vw, 3.15rem)',
              fontWeight: 800,
              lineHeight: 1.05,
              textTransform: 'lowercase',
            }}
          >
            {children}
          </span>
        </span>
      </span>
    </button>
  );
}
