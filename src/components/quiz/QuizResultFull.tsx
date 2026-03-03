import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { FROG_NAMES, FROG_DESCRIPTIONS } from '@/lib/quiz/constants';
import type { FrogType } from '@/lib/quiz/types';
import { useNavigate } from 'react-router-dom';

interface QuizResultFullProps {
  resultType: FrogType;
  onShare?: () => void;
}

export function QuizResultFull({ resultType, onShare }: QuizResultFullProps) {
  const navigate = useNavigate();
  const desc = FROG_DESCRIPTIONS[resultType];
  const bestMatchName = FROG_NAMES[desc.bestMatch];
  const wildcardName = FROG_NAMES[desc.wildcard];

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-black uppercase tracking-tight mb-2">
            Your Coffee Frog
          </h1>
          <p className="text-4xl">🐸</p>
          <p className="text-xl font-bold mt-2">{desc.name}</p>
        </div>

        <Card>
          <CardHeader>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed">
              {desc.narrative}
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">
              <span className="font-semibold">Best Match:</span> {bestMatchName}
            </p>
            <p className="text-sm">
              <span className="font-semibold">Wildcard:</span> {wildcardName}
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          This is your café instinct.
          <br />
          Your real coffee pattern might tell a deeper story.
        </p>

        <div className="space-y-3">
          <p className="text-center text-sm font-medium">
            Start logging your coffee and let us map your actual behavior.
          </p>
          <Button
            className="w-full h-12"
            onClick={() => navigate('/')}
          >
            Start Logging My Coffee
          </Button>

          {onShare && (
            <Button
              variant="outline"
              className="w-full"
              onClick={onShare}
            >
              Share My Coffee Frog
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
