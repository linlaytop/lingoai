import pdfToText from 'react-pdftotext';
import mammoth from 'mammoth';
import { Flashcard } from '../types';
import { localDictionary } from '../lib/dictionary';

// Common stop words in English
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
  'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our',
  'their', 'what', 'which', 'who', 'when', 'where', 'why', 'how',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'some',
  'such', 'no', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
  'very', 'just', 'as', 'if', 'about', 'up', 'out', 'then', 'here',
  'there', 'now',
]);

/**
 * Detect whether a line looks like a vocabulary entry.
 * Returns the parsed {word, translation} pair or null.
 *
 * Supports common patterns:
 *   word - 翻译
 *   word  翻译
 *   word: 翻译
 *   word = 翻译
 *   word\t翻译
 *   word 翻译
 *   翻译 - word
 *   翻译 word
 */
function parseLine(line: string): { word: string; translation: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Match word - translation / word: translation / word = translation
  // Word part: letters, spaces, hyphens, apostrophes
  // Translation part: Chinese characters, English definitions, etc.
  const patterns: RegExp[] = [
    // English word(s) + separator + translation
    /^([a-zA-Z][a-zA-Z\s\-']{0,60})\s*[-:=—–]\s+(.+)$/,
    // Translation + separator + English word
    /^(.+?)\s*[-:=—–]\s+([a-zA-Z][a-zA-Z\s\-']{1,60})$/,
    // English word (tab/multi-space) translation
    /^([a-zA-Z][a-zA-Z\s\-']{1,60})\s{2,}(.+)$/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      const a = match[1].trim();
      const b = match[2].trim();
      // Decide which is the English word side
      if (/^[a-zA-Z]/.test(a)) {
        return { word: a, translation: b };
      } else if (/^[a-zA-Z]/.test(b)) {
        return { word: b, translation: a };
      }
    }
  }
  return null;
}

/**
 * Parse plain text containing vocabulary entries into flashcards.
 * Used as a fallback when structured parsing of a Word document fails.
 */
function parseTextToFlashcards(text: string, limit = 30): Flashcard[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const cards: Flashcard[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    if (cards.length >= limit) break;
    const parsed = parseLine(line);
    if (!parsed) continue;

    const wordKey = parsed.word.toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(wordKey)) continue;
    if (STOP_WORDS.has(wordKey)) continue;
    if (parsed.word.length < 2) continue;
    if (!/^[a-zA-Z]/.test(parsed.word)) continue;

    seen.add(wordKey);
    const analysis = localDictionary.analyze(parsed.word);
    cards.push({
      id: crypto.randomUUID(),
      front: parsed.word,
      back: analysis.translation || parsed.translation,
      viewCount: 0,
      details: {
        ...analysis,
        translation: analysis.translation || parsed.translation,
        definition: analysis.definition || parsed.translation,
      },
    } as Flashcard);
  }

  return cards;
}

/**
 * Parse text into sentences, used when the Word file contains
 * whole sentences rather than word/definition pairs.
 */
function parseSentencesToFlashcards(text: string, limit = 30): Flashcard[] {
  const sentencePattern = /[^.!?。！？\n]+[.!?。！？]+/g;
  const sentences = text.match(sentencePattern) || [];
  const cards: Flashcard[] = [];
  const seen = new Set<string>();

  for (const raw of sentences) {
    if (cards.length >= limit) break;
    const sentence = raw.trim().replace(/\s+/g, ' ');
    if (sentence.length < 5 || sentence.length > 200) continue;
    if (!/[a-zA-Z]/.test(sentence)) continue;
    const key = sentence.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cards.push({
      id: crypto.randomUUID(),
      front: sentence,
      back: '(句子)',
      viewCount: 0,
      sentence: sentence,
      details: {
        id: crypto.randomUUID(),
        word: sentence,
        translation: '',
        definition: sentence,
        examples: [],
        synonyms: [],
        timestamp: Date.now(),
      },
    } as Flashcard);
  }
  return cards;
}

export async function processPDFToFlashcards(file: File): Promise<Flashcard[]> {
  try {
    const text = await pdfToText(file);
    if (!text || text.trim().length === 0) {
      throw new Error("无法从 PDF 中提取文本，请确保它是可搜索的 PDF 而非图片扫描件。");
    }

    // Try structured parsing first
    const structured = parseTextToFlashcards(text, 30);
    if (structured.length > 0) return structured;

    // Fall back to word extraction
    const wordPattern = /\b[a-zA-Z]{2,}\b/g;
    const allWords = text.match(wordPattern) || [];
    const uniqueWords = Array.from(new Set(
      allWords
        .map((w) => w.toLowerCase())
        .filter((w) => !STOP_WORDS.has(w) && w.length > 2)
    )).slice(0, 30);

    return uniqueWords.map((word) => {
      const analysis = localDictionary.analyze(word);
      return {
        id: crypto.randomUUID(),
        front: word,
        back: analysis.translation,
        viewCount: 0,
        details: analysis,
      } as Flashcard;
    });
  } catch (error: any) {
    console.error('PDF Processing error:', error);
    throw error;
  }
}

/**
 * Parse a Word (.docx) file into flashcards.
 * Supports two common formats inside the document:
 *   1) Word-definition pairs (one per line): "apple - 苹果"
 *   2) Plain sentences (one per line or per paragraph)
 * If structured pairs are found, those are used. Otherwise sentences
 * are returned so the user can still review full sentences.
 */
export async function processWordToFlashcards(file: File): Promise<Flashcard[]> {
  if (!file.name.toLowerCase().endsWith('.docx') && file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    throw new Error('仅支持 .docx 格式的 Word 文件（旧版 .doc 请先另存为 .docx）。');
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = (result.value || '').trim();

    if (!text || text.length === 0) {
      throw new Error('无法从 Word 文件中提取文字，请确认文件包含可识别的内容。');
    }

    // Try structured word/definition pairs first
    const structured = parseTextToFlashcards(text, 60);
    if (structured.length > 0) {
      return structured;
    }

    // Otherwise treat content as full sentences
    const sentences = parseSentencesToFlashcards(text, 30);
    if (sentences.length > 0) {
      return sentences;
    }

    throw new Error('未能从 Word 中识别到有效单词或句子。');
  } catch (error: any) {
    console.error('Word Processing error:', error);
    throw error;
  }
}
