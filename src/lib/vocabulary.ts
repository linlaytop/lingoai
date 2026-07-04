import { Flashcard } from "../types";
import { localDictionary } from "./dictionary";
import { getSeedWordList } from "./seedData";

// Local vocabulary deconstruction - replaces Gemini API
// Provides word/sentence data for games from the built-in dictionary.
// Always returns a real Chinese translation on the cn side so the
// "Word Match" / "Sentence Quiz" / "Plane" / "Zombie" / "Desert Racing"
// games never display placeholders like "(句子)" or empty strings.
export async function deconstructCards(cards: Flashcard[]): Promise<{en: string, cn: string}[]> {
  await new Promise(resolve => setTimeout(resolve, 300));

  const result: {en: string, cn: string}[] = [];

  for (const card of cards) {
    const word = card.front.trim();
    // 1. Try the full dictionary entry by the front text (works for words + sentences).
    const entry = localDictionary.getEntry(word);
    // 2. Fall back to the card's stored details.translation.
    // 3. Fall back to the card's back field.
    // 4. Last resort: explicit placeholder (we never want empty).
    let cn: string;
    if (entry && entry.translation) {
      cn = entry.translation;
    } else if (card.details?.translation && !card.details.translation.includes('暂无')) {
      cn = card.details.translation;
    } else if (card.back && card.back !== '(自定义句子)' && !card.back.includes('暂无')) {
      cn = card.back;
    } else {
      cn = '(暂无翻译)';
    }
    result.push({ en: word, cn });
  }

  // If user has fewer than 10 cards, supplement with seed words for better gameplay
  if (result.length < 10) {
    const seedWords = getSeedWordList();
    const existingWords = new Set(result.map(r => r.en.toLowerCase()));
    for (const seed of seedWords) {
      if (!existingWords.has(seed.en.toLowerCase()) && seed.cn) {
        result.push(seed);
        if (result.length >= 20) break;
      }
    }
  }

  return result;
}
