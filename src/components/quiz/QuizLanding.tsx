import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface QuizLandingProps {
  onStart: () => void;
  isLoading?: boolean;
}

export function QuizLanding({ onStart, isLoading }: QuizLandingProps) {
  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-black uppercase tracking-tight mb-2">
            7 Frogs
          </h1>
          <p className="text-muted-foreground text-lg">
            Your Coffee Type is your café instinct.
          </p>
        </div>

        <Card>
          <CardHeader>
            <p className="text-center text-sm text-muted-foreground">
              Answer 7 quick questions to discover your Coffee Frog — and see who matches you best.
            </p>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full h-12 text-lg font-bold"
              onClick={onStart}
              disabled={isLoading}
            >
              {isLoading ? 'Starting…' : 'Start Quiz'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
