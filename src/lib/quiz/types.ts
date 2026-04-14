export type FrogType = 'ESP' | 'LAT' | 'MOC' | 'MAT' | 'CLD' | 'DIR' | 'HDR';

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
  oneLiner: string;
  populationPercent: number;
}

export interface QuizResult {
  resultType: FrogType;
  answers: Record<number, string>;
  scores: Record<FrogType, number>;
}
