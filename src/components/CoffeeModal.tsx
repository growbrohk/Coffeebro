import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useEffect, useState } from 'react';

const COMPLIMENTS = [
  "PERFECT BREW!",
  "CAFFEINE LEGEND!",
  "COFFEE MASTER!",
  "BREW-TASTIC!",
  "ESPRESSO EXCELLENCE!",
  "LATTE ARTIST!",
  "COFFEE CONNOISSEUR!",
  "CAFFEINE CHAMPION!",
];

interface CoffeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  percentBeat: number;
}

export function CoffeeModal({ open, onOpenChange, percentBeat }: CoffeeModalProps) {
  const [compliment, setCompliment] = useState('');

  useEffect(() => {
    if (open) {
      const randomCompliment = COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)];
      setCompliment(randomCompliment);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-foreground text-background border-none p-8 text-center max-w-sm">
        <div className="animate-scale-in">
          <div className="text-6xl mb-6">✓</div>
          <h2 className="text-2xl font-black mb-4">{compliment}</h2>
          <p className="text-lg font-medium opacity-80">
            You beat {percentBeat}% of users today
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
