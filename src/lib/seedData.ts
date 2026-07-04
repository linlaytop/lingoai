// Seed data module - pre-populates flashcards for new users
// This ensures games and quizzes work immediately after registration

import type { Flashcard, WordAnalysis } from '../types';
import { localDictionary } from './dictionary';

// Generate a WordAnalysis from a dictionary entry
function createAnalysis(word: string): WordAnalysis {
  return localDictionary.analyze(word);
}

// Create a flashcard from a word
function createFlashcard(word: string): Flashcard {
  const details = createAnalysis(word);
  return {
    id: crypto.randomUUID(),
    front: details.word,
    back: details.translation,
    details,
    viewCount: 0,
    tags: [localDictionary.getEntry(word)?.category || '基础'],
  };
}

// Default words to seed for new users - covers multiple categories
const SEED_WORDS = [
  // 基础问候
  'hello', 'how are you', 'thank you', 'good morning', 'nice to meet you',
  // 日常
  'world', 'time', 'water', 'food', 'money', 'apple', 'city',
  // 教育
  'learn', 'book', 'school', 'language', 'pronunciation',
  // 旅行
  'airport', 'travel', 'ticket', 'hotel',
  // 餐饮
  'restaurant', 'coffee', 'breakfast', 'delicious',
  // 工作
  'job', 'meeting', 'email', 'office', 'develop',
  // 情感
  'happy', 'excited', 'tired', 'angry', 'beautiful', 'dream',
  // 社交
  'friend', 'family', 'conversation',
  // 自然
  'weather', 'rain', 'sun', 'flower', 'environment',
  // 动物
  'cat', 'dog', 'bird',
  // 健康
  'health', 'doctor', 'exercise',
  // 科技
  'computer', 'phone', 'technology',
  // 娱乐
  'music', 'movie',
  // 实用句子
  'what is your name', 'where is the bathroom', 'how much is it',
  'can you help me', 'i would like', 'i love you',
];

// Create all seed flashcards
export function createSeedFlashcards(): Flashcard[] {
  return SEED_WORDS.map(word => createFlashcard(word));
}

// Seed flashcards for a new user
export function seedUserData(uid: string, localDb: any): void {
  const existing = localDb.getCollection<Flashcard>(uid, 'flashcards');
  if (existing.length > 0) return; // Don't seed if user already has cards

  const seedCards = createSeedFlashcards();
  seedCards.forEach(card => {
    localDb.setDoc(uid, 'flashcards', card.id, card);
  });
}

// Get the list of seed word strings (for vocabulary deconstruction)
export function getSeedWordList(): { en: string; cn: string }[] {
  return SEED_WORDS.map(word => {
    const entry = localDictionary.getEntry(word);
    return {
      en: entry?.word || word,
      cn: entry?.translation || '',
    };
  });
}
