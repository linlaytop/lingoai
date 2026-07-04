import { WordAnalysis, LiaisonAnalysis } from "../types";
import { localDictionary } from "../lib/dictionary";

// Local word analysis - replaces Gemini API
export async function analyzeWord(query: string): Promise<WordAnalysis> {
  // Simulate small delay for UX
  await new Promise(resolve => setTimeout(resolve, 300));
  return localDictionary.analyze(query);
}

// Local liaison analysis - replaces Gemini API
export async function analyzeLiaison(sentence: string): Promise<LiaisonAnalysis> {
  await new Promise(resolve => setTimeout(resolve, 300));
  const words = sentence.split(/\s+/);
  const liaisons: { words: string; type: string; explanation: string }[] = [];

  for (let i = 0; i < words.length - 1; i++) {
    const current = words[i].toLowerCase();
    const next = words[i + 1].toLowerCase();
    const currentEndsVowel = /[aeiou]$/.test(current.replace(/[^a-z]/g, ''));
    const nextStartsVowel = /^[aeiou]/.test(next.replace(/[^a-z]/g, ''));

    if (currentEndsVowel && nextStartsVowel) {
      liaisons.push({
        words: `${words[i]} ${words[i + 1]}`,
        type: 'Vowel-to-Vowel Linking',
        explanation: 'Add a subtle glide sound (/j/ or /w/) between the two vowels.',
      });
    } else if (/[aeiou]$/.test(current.replace(/[^a-z]/g, '')) === false && nextStartsVowel) {
      liaisons.push({
        words: `${words[i]} ${words[i + 1]}`,
        type: 'Consonant-Vowel Liaison',
        explanation: 'Link the consonant sound directly to the following vowel.',
      });
    }
  }

  // Check for flap T
  if (/\bt\w*\s+[aeiou]/i.test(sentence)) {
    liaisons.push({
      words: 't + vowel',
      type: 'Flap T',
      explanation: 'The /t/ sound between vowels becomes a quick flap, similar to a soft /d/.',
    });
  }

  return {
    id: crypto.randomUUID(),
    sentence,
    translation: '（练习英语连读技巧）',
    liaisons: liaisons.length > 0 ? liaisons : [{
      words: sentence,
      type: 'General Practice',
      explanation: 'Practice reading this sentence smoothly, linking words together naturally.',
    }],
    fullExplanation: '连读是英语口语的重要技巧。当单词以辅音结尾、下一个单词以元音开头时，应自然地将它们连接起来。多听多练，慢慢就能掌握自然的英语节奏。',
    timestamp: Date.now(),
  };
}

export async function generateLiaisonSentences(count: number = 5): Promise<LiaisonAnalysis[]> {
  await new Promise(resolve => setTimeout(resolve, 300));
  const sentences = [
    'Pick it up and put it on the table.',
    'I would like to get a cup of coffee.',
    'She is an old friend of mine.',
    'Turn it off when you leave the room.',
    'Can you hand it over to me?',
    'Look at this amazing picture!',
    'I have a lot of work to do today.',
    'What time is it right now?',
  ];

  return sentences.slice(0, count).map(sentence => ({
    id: crypto.randomUUID(),
    sentence,
    translation: '（连读练习句）',
    liaisons: [{
      words: sentence,
      type: 'Practice',
      explanation: 'Practice linking words naturally.',
    }],
    fullExplanation: '注意单词之间的自然连接，练习流畅的英语口语节奏。',
    timestamp: Date.now(),
  }));
}

export async function generateRhyme(text: string, style: string = 'rhythmic'): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, 300));
  return `Study hard, don't you wait,\nMemory song will be great.\nLearn the words and sing along,\nMake your English nice and strong.`;
}

export async function generateMusicTrack(prompt: string, style: string = 'cheerful English nursery rhyme'): Promise<{ audioUrl: string; lyrics: string }> {
  throw new Error('音乐生成功能需要 AI API 支持，当前为本地模式暂不可用。');
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

// Local chat dialogue - uses simple pattern matching
export async function chatDialogue(message: string, history: ChatMessage[], context?: string): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, 500));

  const msg = message.toLowerCase().trim();

  // Simple response patterns
  if (/hello|hi|hey|good (morning|afternoon|evening)/.test(msg)) {
    return "Hello! How are you today? I'm glad you're practicing English. 你好！今天想练习什么内容呢？";
  }
  if (/how are you/.test(msg)) {
    return "I'm doing great, thank you for asking! How about you? Are you ready to learn some English today? 我很好，谢谢！你准备好学英语了吗？";
  }
  if (/thank/.test(msg)) {
    return "You're very welcome! Keep up the great work. 不客气！继续加油！";
  }
  if (/bye|goodbye|see you/.test(msg)) {
    return "Goodbye! It was nice talking with you. Keep practicing! 再见！很高兴和你聊天，继续练习哦！";
  }
  if (/\?$/.test(message.trim())) {
    return `That's a great question! Let me help you understand. "${message}" - this is something worth exploring. 这是一个很好的问题！让我们一起探讨。`;
  }

  return `That's interesting! You said: "${message}". Can you tell me more about it? Try using complete sentences. 你说得很有趣！能告诉我更多吗？试着用完整的句子表达。`;
}

export async function transcribeMedia(file: File): Promise<string> {
  throw new Error('媒体转录功能需要 AI API 支持，当前为本地模式暂不可用。');
}
