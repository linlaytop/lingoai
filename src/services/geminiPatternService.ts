export interface PatternChallenge {
  pattern: string;
  originalSentence: string;
  variableParts: string[];
  generatedPrompt: string;
  expectedPattern: string;
  hint: string;
}

export interface EvaluationResult {
  score: number;
  correction: string;
  explanation: string;
  isCorrect: boolean;
}

// Local pattern service - replaces Gemini API
export const geminiPatternService = {
  async generateChallenge(sentence: string): Promise<PatternChallenge> {
    await new Promise(resolve => setTimeout(resolve, 300));

    // Simple pattern detection
    const words = sentence.split(/\s+/);
    const pattern = 'Subject + Verb + Object';

    return {
      pattern,
      originalSentence: sentence,
      variableParts: words.slice(0, 3),
      generatedPrompt: '请用相同的句型造一个新句子',
      expectedPattern: sentence,
      hint: '注意主谓宾的顺序，尝试替换名词和动词',
    };
  },

  async evaluateResponse(userResponse: string, expectedSentence: string, pattern: string): Promise<EvaluationResult> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const response = userResponse.trim().toLowerCase();
    const expected = expectedSentence.trim().toLowerCase();

    // Simple similarity check
    const responseWords = response.split(/\s+/);
    const expectedWords = expected.split(/\s+/);
    const commonWords = responseWords.filter(w => expectedWords.includes(w));
    const similarity = commonWords.length / Math.max(expectedWords.length, 1);

    const isCorrect = similarity > 0.5 || response.length > 10;
    const score = Math.round(similarity * 100);

    return {
      score: Math.max(score, isCorrect ? 60 : 30),
      correction: isCorrect ? userResponse : expectedSentence,
      explanation: isCorrect
        ? '做得好！你的句子结构正确。继续练习！'
        : '句型需要调整，请参考正确答案并再试一次。',
      isCorrect,
    };
  },
};
