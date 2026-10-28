export function lesson(entries, day) {
  return entries.slice((day - 1) * 10, day * 10);
}
export function roundQuestions(entries, round) {
  return entries.slice((round - 1) * 5, round * 5);
}
export function shuffled(items, random = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
export function randomTen(entries, random = Math.random) {
  const unique = [...new Map(entries.map(e => [e.id, e])).values()];
  if (unique.length < 10) throw new Error('At least 10 available exercises are needed. Choose more covered days or use the entire bank.');
  return shuffled(unique, random).slice(0, 10);
}
export function voicePrompt(exercises) {
  if (!exercises.length) throw new Error('Select at least one exercise.');
  // Explicit allowlist: model answers and original source examples never enter prompts.
  const instructions = `N2 Controlled Kaiwa Trainer — Controlled Speaking Level 2
Act as a natural Japanese conversation partner. Use ONLY the exercise list below, in the exact order. Do not invent replacement questions or change the target grammar.
Ask exactly one Japanese question at a time, using the exact Japanese Question. Then wait for my spoken Japanese response. Encourage me to use the target grammar naturally in an original sentence based on meaning, rather than translate a complete model sentence word for word.
Do not reveal or construct a model answer before I attempt a response. Keep explanations short during practice. English Meaning Hints are keywords, not sentences to translate.
When I say 「ヒントをください」, give an additional short English keyword hint without revealing an answer.
When I say 「フィードバックお願いします」, give concise Vietnamese explanations and corrections for my attempted response. Evaluate grammar correctness, naturalness, and speaking independence (independent / hint-assisted / repeated). Do not claim to assess pronunciation if you only receive text.
When I say 「もう一度」, repeat the current exact Japanese question and let me try again.
When I say 「次の問題」, advance to the next listed exercise. Do not advance before that command. After the final exercise, tell me the set is complete.
Start by asking the first Japanese Question. The English Question and English Meaning Hint below are reference support; do not read the full list aloud.

EXERCISES (${exercises.length})`;
  return instructions + '\n\n' + exercises.map((e, i) => `Exercise ${i + 1}\nOriginal grammar STT: ${e.stt}\nTarget grammar: ${e.targetGrammar}\nJapanese Question: ${e.japaneseQuestion}\nEnglish Question: ${e.englishQuestion}\nEnglish Meaning Hint: ${e.englishMeaningHint}`).join('\n\n');
}
