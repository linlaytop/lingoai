import { Flashcard } from "../types";
import { localDictionary } from "./dictionary";
import { getSeedWordList } from "./seedData";

// Local vocabulary deconstruction - replaces Gemini API
// Provides word/sentence data for games from the built-in dictionary
export async function deconstructCards(cards: Flashcard[]): Promise<{en: string, cn: string}[]> {
  await new Promise(resolve => setTimeout(resolve, 300));

  const result: {en: string, cn: string}[] = [];

  // Extract words from user's flashcards
  for (const card of cards) {
    const word = card.front.trim();
    const entry = localDictionary.getEntry(word);
    if (entry) {
      result.push({ en: entry.word, cn: entry.translation });
    } else {
      result.push({ en: word, cn: card.back });
    }
  }

  // If user has fewer than 10 cards, supplement with seed words for better gameplay
  if (result.length < 10) {
    const seedWords = getSeedWordList();
    const existingWords = new Set(result.map(r => r.en.toLowerCase()));
    for (const seed of seedWords) {
      if (!existingWords.has(seed.en.toLowerCase())) {
        result.push(seed);
        if (result.length >= 20) break;
      }
    }
  }

  return result;
}
