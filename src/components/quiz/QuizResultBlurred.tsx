import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { FROG_NAMES } from '@/lib/quiz/constants';
import type { FrogType } from '@/lib/quiz/types';

interface QuizResultBlurredProps {
  resultType: FrogType;
  onSignUp: () => void;
}

export function QuizResultBlurred({ resultType, onSignUp }: QuizResultBlurredProps) {
  const name = FROG_NAMES[resultType];

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-black uppercase tracking-tight mb-2">
            Your Coffee Frog
          </h1>
          <p className="text-muted-foreground">
            Sign up to unlock your full result
          </p>
        </div>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 backdrop-blur-xl bg-background/80 z-10 flex items-center justify-center">
            <Button
              className="z-20"
              size="lg"
              onClick={onSignUp}
            >
              Sign up to unlock
            </Button>
          </div>
          <CardHeader>
            <p className="text-4xl text-center">🐸</p>
            <p className="text-xl font-bold text-center blur-sm select-none">
              {name}
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center blur-md select-none line-clamp-3">
              Your narrative and best match are hidden. Sign up to reveal your full Coffee Frog identity.
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Your Coffee Type is your café instinct.
          <br />
          Your real coffee pattern might tell a deeper story.
        </p>
      </div>
    </div>
  );
}
