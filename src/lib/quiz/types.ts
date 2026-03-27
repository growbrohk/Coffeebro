export type FrogType = 'ESP' | 'LAT' | 'AME' | 'MOC' | 'CLD' | 'MAT' | 'DIR';

export interface QuizQuestion {
  id: number;
  text: string;
  options: { value: string; label: string }[];
}

export interface FrogDescription {
  name: string;
  narrative: string;
  bestMatch: FrogType;
  wildcard: FrogType;
}

export interface FrogProfileCard {
  archetype: string;
  populationPercent: number;
}

export interface QuizResult {
  resultType: FrogType;
  answers: Record<number, string>;
  scores: Record<FrogType, number>;
}
