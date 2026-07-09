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
  dogName: string;
  chipNumber: string;
}

export interface QuizResultRecord {
  id?: string | number;
  first_name: string;
  last_name: string;
  email: string;
  dog_name?: string;
  chip_number?: string;
  category: string;
  score_percentage: number;
  correct_count: number;
  wrong_count: number;
  passed: boolean;
  created_at?: string;
}

export type CertificateFontFamily = 'times' | 'helvetica' | 'courier';

export interface ElementPosition {
  x: number; // mm from left edge of the page
  y: number; // mm from top edge of the page
}

export type CertificateElementKey =
  | 'watermark'
  | 'title'
  | 'name'
  | 'intro'
  | 'heading1'
  | 'heading2'
  | 'legalOrParticipation'
  | 'result'
  | 'passed'
  | 'dogLine'
  | 'signatureDate'
  | 'signatureLabel'
  | 'veranstalterLabel'
  | 'footer';

export type CertificatePositions = Record<CertificateElementKey, ElementPosition>;

export interface CertificateSettings {
  // Farben (Hex)
  sidebarColor: string;
  titleColor: string;
  nameColor: string;
  bodyColor: string;
  footerColor: string;
  watermarkColor: string;

  // Schrift
  fontFamily: CertificateFontFamily;
  titleFontSize: number;
  nameFontSize: number;
  headingFontSize: number;
  bodyFontSize: number;
  footerFontSize: number;
  watermarkFontSize: number;

  // Layout
  sidebarWidthMm: number;
  sealSizeMm: number;
  showWatermarkText: boolean;

  // Freie Positionierung der Textfelder (mm, per Drag & Drop im Editor gesetzt)
  positions: CertificatePositions;

  // Texte (Platzhalter: {name} {datum} {ergebnis} {hundename} {chipnummer})
  watermarkText: string;
  titleText: string;
  introText: string;
  headingLine1: string;
  headingLine2Trainer: string;
  headingLine2Koala: string;
  legalLineTrainer: string;
  participationLineKoala: string;
  resultLine: string;
  passedLine: string;
  dogLineTemplate: string;
  locationDefault: string;
  signatureLabel: string;
  veranstalterLabel: string;
  footerText: string;
}

export interface CertificateSettingsRecord {
  id: number;
  settings: CertificateSettings;
  updated_at?: string;
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