import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import type { QuizQuestion } from '@/lib/quiz/types';

interface QuizQuestionsProps {
  question: QuizQuestion;
  totalQuestions: number;
  currentIndex: number;
  value: string | null;
  onValueChange: (value: string) => void;
  onNext: () => void;
  canProceed: boolean;
}

export function QuizQuestions({
  question,
  totalQuestions,
  currentIndex,
  value,
  onValueChange,
  onNext,
  canProceed,
}: QuizQuestionsProps) {
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <div className="min-h-screen bg-background p-4 pb-24 flex flex-col">
      <div className="max-w-md w-full mx-auto flex-1 flex flex-col">
        <div className="mb-4">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {currentIndex + 1} / {totalQuestions}
          </p>
        </div>

        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              {question.text}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
            <RadioGroup
              value={value ?? ''}
              onValueChange={onValueChange}
              className="grid gap-3"
            >
              {question.options.map((opt) => (
                <div
                  key={opt.value}
                  className="flex items-center space-x-3 rounded-lg border p-4 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                >
                  <RadioGroupItem value={opt.value} id={`q${question.id}-${opt.value}`} />
                  <Label
                    htmlFor={`q${question.id}-${opt.value}`}
                    className="flex-1 cursor-pointer text-base"
                  >
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <Button
              className="w-full mt-auto"
              onClick={onNext}
              disabled={!canProceed}
            >
              {currentIndex < totalQuestions - 1 ? 'Next' : 'See my result'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

