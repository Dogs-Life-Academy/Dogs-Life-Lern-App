export type QuestionType = 'single_choice' | 'multiple_choice';

export interface Question {
  id: number;
  question_text: string;
  question_type: QuestionType;
  all_answers: string[];
  correct_answers: string[];
  category: string;
  image_url?: string;
}

export interface UserDetails {
  firstName: string;
  lastName: string;
  email: string;
}

export interface QuizResultRecord {
  id?: string | number;
  first_name: string;
  last_name: string;
  email: string;
  category: string;
  score_percentage: number;
  correct_count: number;
  wrong_count: number;
  passed: boolean;
  created_at?: string;
}

export type View = 'START' | 'SELECTION' | 'GAME' | 'RESULT' | 'ADMIN_LOGIN' | 'ADMIN_DASHBOARD';

export type UserRole = 'PARTICIPANT' | 'ADMIN' | null;

export interface QuizConfig {
  category: string;
  count: number;
}

export type UserAnswers = Record<number, string[]>;

export interface CsvRow {
  question: string;
  question_type: string;
  answers: string;
  correct_answers: string;
  category: string;
  image_url?: string;
}