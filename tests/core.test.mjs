import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { lesson, roundQuestions, randomTen, voicePrompt, shuffled } from '../core.js';
const source = JSON.parse(readFileSync(new URL('../data/grammar.json',import.meta.url)));
const bank = JSON.parse(readFileSync(new URL('../data/exercises.json',import.meta.url)));
test('all 214 original STTs have exactly one complete exercise with unchanged grammar', () => {
  assert.equal(source.entries.length,214); assert.equal(bank.length,214);
  assert.equal(new Set(bank.map(e=>e.id)).size,214);
  assert.equal(source.notes.length,10);
  bank.forEach((e,i)=>{
    assert.equal(e.stt,i+1); assert.equal(e.targetGrammar,source.entries[i].structure);
    for (const key of ['englishQuestion','japaneseQuestion','englishMeaningHint','japaneseModelAnswer']) assert.ok(e[key]?.trim(),`${e.stt}: ${key}`);
    assert.match(e.japaneseQuestion,/[ぁ-んァ-ヶ一-龯]/); assert.match(e.japaneseModelAnswer,/[ぁ-んァ-ヶ一-龯]/);
    assert.ok(e.englishMeaningHint.length < 100);
  });
  const checksum = createHash('sha256').update(readFileSync(new URL('../source/Grammar-N2.xlsx',import.meta.url))).digest('hex');
  assert.equal(checksum,source.sha256);
  assert.equal(source.sheet,'Sheet'); assert.equal(source.entries[156].meaning,null);
});
test('daily lessons preserve source order; final lesson has four without fabrication',()=>{
  for(let day=1;day<=21;day++) assert.deepEqual(lesson(bank,day).map(e=>e.stt),Array.from({length:10},(_,i)=>(day-1)*10+i+1));
  assert.deepEqual(lesson(bank,22).map(e=>e.stt),[211,212,213,214]);
  assert.equal(roundQuestions(lesson(bank,22),1).length,4);
});
test('round copy uses exactly the selected five, even when current question differs',()=>{
  assert.deepEqual(roundQuestions(lesson(bank,2),1).map(e=>e.stt),[11,12,13,14,15]);
  assert.deepEqual(roundQuestions(lesson(bank,2),2).map(e=>e.stt),[16,17,18,19,20]);
});
test('random selection gives ten unique exercises from eligible pool without mutation',()=>{
  const original=bank.map(e=>e.id);
  for(let i=0;i<50;i++){
    const pick=randomTen(bank.slice(0,20));
    assert.equal(pick.length,10); assert.equal(new Set(pick.map(e=>e.id)).size,10);
    assert.ok(pick.every(e=>e.stt<=20));
  }
  assert.deepEqual(bank.map(e=>e.id),original);
  assert.throws(()=>randomTen(bank.slice(0,9)),/At least 10/);
  assert.throws(()=>randomTen(Array(10).fill(bank[0])),/At least 10/);
  assert.deepEqual(shuffled([1,2,3],()=>0),[2,3,1]);
});
test('each copy mode preserves exact content and excludes all model answers and source examples',()=>{
  for(const exercises of [[bank[0]],roundQuestions(lesson(bank,1),2),randomTen(bank),bank]){
    const prompt=voicePrompt(exercises);
    assert.equal((prompt.match(/^Exercise \d+$/gm)||[]).length,exercises.length);
    exercises.forEach(e=>{
      for(const field of ['targetGrammar','englishQuestion','japaneseQuestion','englishMeaningHint']) assert.ok(prompt.includes(e[field]));
      assert.ok(prompt.includes(`Original grammar STT: ${e.stt}\n`));
      assert.ok(!prompt.includes(e.japaneseModelAnswer));
    });
    for(const command of ['ヒントをください','フィードバックお願いします','もう一度','次の問題']) assert.ok(prompt.includes(command));
    assert.ok(prompt.includes('Vietnamese')); assert.ok(!prompt.includes('japaneseModelAnswer'));
  }
});
