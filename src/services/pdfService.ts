import pdfToText from 'react-pdftotext';
import { Flashcard } from '../types';
import { localDictionary } from '../lib/dictionary';

export async function processPDFToFlashcards(file: File): Promise<Flashcard[]> {
  try {
    // 1. Extract text from PDF
    const text = await pdfToText(file);
    if (!text || text.trim().length === 0) {
      throw new Error("无法从 PDF 中提取文本，请确保它是可搜索的 PDF 而非图片扫描件。");
    }

    // 2. Extract vocabulary locally (no AI API needed)
    // Find English words from the text
    const wordPattern = /\b[a-zA-Z]{2,}\b/g;
    const allWords = text.match(wordPattern) || [];

    // Filter to unique words, exclude common stop words
    const stopWords = new Set([
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
      'there', 'now'
    ]);

    const uniqueWords = Array.from(new Set(
      allWords
        .map(w => w.toLowerCase())
        .filter(w => !stopWords.has(w) && w.length > 2)
    )).slice(0, 30); // Limit to 30 words

    // 3. Convert to Flashcards using local dictionary
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
    console.error("PDF Processing error:", error);
    throw error;
  }
}
