export interface WordAnalysis {
  word: string;
  phonetic?: string;
  translation: string;
  definition: string;
  examples: string[];
  synonyms: string[];
  etymology?: string;
  pattern?: string; // Grammar pattern or sentence structure
  mnemonicRhyme?: string; // A short rhythmic rhyme to help memorize
  timestamp: number;
  id: string;
}

export interface Flashcard {
  id: string;
  front: string; // The word or phrase in English
  back: string;  // The translation or definition
  details: WordAnalysis;
  viewCount?: number;
  lastReviewed?: number;
  nextReviewDate?: number;
  interval?: number; // In days
  easeFactor?: number; // Multiplier for interval
  tags?: string[];
  // Game/Quiz specific fields
  answer?: string;
  options?: string[];
  sentence?: string;
}

export interface CheckInItem {
  word: string;
  translation: string;
  pattern?: string;
}

export interface ActivitySession {
  timestamp: number; 
  duration: number; // minutes
}

export interface CheckIn {
  date: string; // YYYY-MM-DD
  count: number;
  items: CheckInItem[];
  sessions?: ActivitySession[];
  totalDuration?: number; // total minutes for that day
  words?: string[]; // Legacy field for compatibility
}

export interface SongItem {
  id: string;
  name: string;
  type: 'audio' | 'video';
  url: string;
  transcription: string;
  timestamp: number;
  file?: File; // Optional local file for transcription
}

export interface LiaisonPoint {
  words: string;
  type: string;
  explanation: string;
}

export interface LiaisonAnalysis {
  id: string;
  sentence: string;
  translation: string;
  liaisons: LiaisonPoint[];
  fullExplanation: string;
  timestamp: number;
}

export interface CustomAudio {
  id: string;
  title: string;
  url: string;
  timestamp: number;
  notes?: string;
  type?: 'audio' | 'video';
}

export interface LearningState {
  history: WordAnalysis[];
  favorites: string[]; // ids
  flashcards: Flashcard[];
  checkIns: CheckIn[];
}
