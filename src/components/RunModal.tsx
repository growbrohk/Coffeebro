import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useEffect, useState } from 'react';

const COMPLIMENTS = [
  "YOU'RE A MACHINE!",
  "UNSTOPPABLE!",
  "LEGEND STATUS!",
  "PURE DEDICATION!",
  "BEAST MODE!",
  "ON FIRE!",
  "CRUSHING IT!",
  "ELITE RUNNER!",
];

interface RunModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  percentBeat: number;
}

export function RunModal({ open, onOpenChange, percentBeat }: RunModalProps) {
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
