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
export type CertificateElementVisibility = 'all' | 'trainer' | 'koala';
export type CertificateTextAlign = 'left' | 'center' | 'right';

export interface CertificateTextElement {
  id: string;
  label: string; // internal name shown in the editor, e.g. "Titel"
  text: string; // supports placeholders: {name} {datum} {ergebnis} {hundename} {chipnummer} {ort}
  x: number; // mm from left
  y: number; // mm from top
  fontSize: number;
  color: string; // hex
  fontFamily: CertificateFontFamily;
  bold?: boolean;
  italic?: boolean;
  align: CertificateTextAlign;
  vertical?: boolean; // rotated 90°, for sidebar watermark-style text
  maxWidthMm?: number; // if set, text wraps to this width
  visibility: CertificateElementVisibility;
}

export type CertificateImageAsset =
  | 'shield'
  | 'signature'
  | 'hundeschuleLogo'
  | 'businessCardStamp'
  | 'euBadge'
  | 'eurozertSeal'
  | 'koalaSeal';

export interface CertificateImageElement {
  id: string;
  label: string;
  asset: CertificateImageAsset;
  x: number; // mm, top-left of bounding box
  y: number;
  width: number; // mm
  height: number; // mm
  visibility: CertificateElementVisibility;
}

export interface CertificateSettings {
  sidebarColor: string;
  sidebarWidthMm: number;
  locationDefault: string;
  gridSizeMm: number;
  snapToGrid: boolean;
  showGrid: boolean;
  textElements: CertificateTextElement[];
  imageElements: CertificateImageElement[];
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