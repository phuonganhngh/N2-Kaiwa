import { lesson, roundQuestions, randomTen, voicePrompt } from './core.js';

const $ = id => document.getElementById(id);
const storageKey = 'n2-kaiwa.preferences.v1';
let grammar, bank, source, currentSet = [], position = 0, randomSet = [];
let draftSelection = new Set(), handoffPrompt = '', toastTimer;
let preferences = {};
try { preferences = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch { /* Storage is optional. */ }
const bounded = (value, max) => Number.isInteger(value) && value >= 1 && value <= max ? value : 1;
const state = { mode: 'daily', day: bounded(preferences.day, 22), round: 1,
  covered: bounded(preferences.covered, 22), scope: preferences.scope === 'all' ? 'all' : 'covered',
  custom: Array.isArray(preferences.custom) ? preferences.custom.filter(n => Number.isInteger(n) && n >= 1 && n <= 214) : [] };
function save() {
  try { localStorage.setItem(storageKey, JSON.stringify({ day: state.day, covered: state.covered, scope: state.scope, custom: state.custom })); } catch { /* Private browsing must still work. */ }
}
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function notify(message) {
  clearTimeout(toastTimer); $('toast').textContent = message; $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 5000);
}
function option(value, text) { const node = el('option', text); node.value = value; return node; }
function coveredBank() { return bank.slice(0, state.covered * 10); }
function selectedRound() { return roundQuestions(currentSet, state.round); }
function current() { return currentSet[position]; }
function fillRounds() {
  $('round').replaceChildren();
  for (let r = 1; r <= Math.ceil(currentSet.length / 5); r++) {
    $('round').append(option(r, `Round ${r} · ${1 + (r - 1) * 5}–${Math.min(r * 5, currentSet.length)}`));
  }
  if (!currentSet.length) $('round').append(option(1, 'Choose grammar first'));
  state.round = bounded(state.round, Math.max(1, Math.ceil(currentSet.length / 5)));
  $('round').value = state.round;
}
function loadSet() {
  if (state.mode === 'daily') currentSet = lesson(bank, state.day);
  if (state.mode === 'custom') currentSet = bank.filter(e => state.custom.includes(e.stt));
  position = 0; state.round = 1; fillRounds(); render();
}
function changeMode(mode) {
  if (mode === 'custom' && !state.custom.length) { openSelection(); return; }
  state.mode = mode;
  document.querySelectorAll('[data-mode]').forEach(button => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('active', active); button.setAttribute('aria-pressed', active);
  });
  $('daily-controls').hidden = mode !== 'daily';
  $('custom-controls').hidden = mode !== 'custom';
  $('mark-covered').hidden = mode !== 'daily';
  $('custom-summary').textContent = `${state.custom.length} structures in your personal practice set.`;
  loadSet(); save();
}
function hideReveals() {
  for (const [button, content, label] of [
    ['toggle-question','japanese-question','Japanese question'], ['toggle-answer','japanese-answer','Japanese answer']
  ]) {
    $(content).hidden = true;
    $(button).setAttribute('aria-expanded', 'false');
    $(button).replaceChildren(el('span', '＋'), document.createTextNode(` Show ${label}`));
  }
}
function render() {
  const e = current(); if (!e) return;
  state.round = Math.floor(position / 5) + 1; $('round').value = state.round;
  const dayLabel = state.mode === 'daily' ? `Day ${state.day}` : 'Custom practice';
  $('exercise-location').textContent = `${dayLabel} / Round ${state.round}`;
  $('question-count').textContent = `Question ${position + 1} of ${currentSet.length}`;
  $('nav-count').textContent = `${String(position + 1).padStart(2, '0')} / ${String(currentSet.length).padStart(2, '0')}`;
  $('progress-fill').style.width = `${(position + 1) / currentSet.length * 100}%`;
  $('target').textContent = e.targetGrammar; $('stt').textContent = `STT ${String(e.stt).padStart(3,'0')}`;
  $('english-question').textContent = e.englishQuestion;
  $('japanese-question').textContent = e.japaneseQuestion;
  $('meaning-hint').textContent = e.englishMeaningHint;
  $('japanese-answer').textContent = e.japaneseModelAnswer;
  $('previous').disabled = position === 0; $('next').disabled = position === currentSet.length - 1;
  const count = selectedRound().length;
  $('round-copy-description').textContent = `${count === 5 ? 'Five' : count} questions, in order.`;
  $('copy-five').textContent = 'Copy 5Qs';
  $('copy-five').setAttribute('aria-label', `Copy 5Qs — ${count} available in this round`);
  const original = grammar.find(g => g.stt === e.stt);
  $('source-stt').textContent = `${original.stt} · Sheet row ${original.sourceRow}`;
  $('source-structure').textContent = original.structure;
  $('source-meaning').textContent = original.meaning ?? 'Not supplied in the source workbook.';
  $('source-examples').textContent = original.examples ?? 'Not supplied in the source workbook.';
  $('source-notes').replaceChildren();
  if (e.sourceUsageNote) $('source-notes').append(el('p', 'Source usage note: ' + e.sourceUsageNote, 'source-note'));
  if (e.context) $('source-notes').append(el('p', 'Practice context: ' + e.context, 'source-note'));
  source.notes.filter(note => note.afterStt === e.stt).forEach(note => {
    $('source-notes').append(el('p', `Unnumbered source note (row ${note.sourceRow}):\n${note.cells.filter(v => v !== null).join('\n')}`, 'source-note'));
  });
  hideReveals();
}
function toggle(buttonId, contentId, label) {
  const show = $(contentId).hidden;
  $(contentId).hidden = !show;
  $(buttonId).setAttribute('aria-expanded', String(show));
  $(buttonId).replaceChildren(el('span', show ? '−' : '＋'), document.createTextNode(` ${show ? 'Hide' : 'Show'} ${label}`));
}
async function clipboard(text) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return true; } catch { /* Try selection-based copy next. */ }
  }
  const previousFocus = document.activeElement;
  const textarea = el('textarea'); textarea.value = text; textarea.setAttribute('aria-label','Prompt for clipboard');
  textarea.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
  // Keep the fallback inside the active modal; background elements are inert.
  (document.querySelector('dialog[open]') || document.body).append(textarea);
  textarea.focus(); textarea.select(); textarea.setSelectionRange(0, text.length);
  let copied = false;
  try { copied = document.execCommand('copy'); } catch { /* Manual copy is available. */ }
  textarea.remove(); previousFocus?.focus(); return copied;
}
function presentManualCopy(prompt) {
  handoffPrompt = prompt; $('prompt-text').value = prompt;
  if (!$('handoff-dialog').open) $('handoff-dialog').showModal();
}
async function copyExercises(exercises) {
  const prompt = voicePrompt(exercises);
  const copied = await clipboard(prompt);
  if ($('random-dialog').open) $('random-dialog').close();
  if (!copied) presentManualCopy(prompt);
  if (copied) notify(`Copied ${exercises.length} ${exercises.length === 1 ? 'exercise' : 'exercises'} · paste into ChatGPT`);
}
function generateRandom() {
  state.scope = $('random-scope').value; save();
  const pool = state.scope === 'all' ? bank : state.scope === 'custom' ? bank.filter(e => state.custom.includes(e.stt)) : coveredBank();
  const enough = pool.length >= 10;
  randomSet = enough ? randomTen(pool) : [];
  $('copy-random').disabled = !enough;
  $('random-note').textContent = `${pool.length} available structures · ${state.scope === 'all' ? 'entire bank' : state.scope === 'custom' ? 'your Custom selection' : `covered through Day ${state.covered}`} · ${enough ? 'no duplicates' : 'select at least 10 structures in Custom, or choose another pool'}`;
  $('random-list').replaceChildren();
  randomSet.forEach(e => {
    const item = el('li'); const title = el('b', `STT ${e.stt} · ${e.targetGrammar}`); title.lang = 'ja';
    const ja = el('p',e.japaneseQuestion); ja.lang = 'ja';
    item.append(title, el('p',e.englishQuestion), ja, el('small',e.englishMeaningHint));
    $('random-list').append(item);
  });
}
function openRandom() {
  $('random-custom-option').disabled = state.mode !== 'custom';
  $('random-scope').value = state.mode === 'custom' ? 'custom' : state.scope === 'custom' ? 'covered' : state.scope;
  generateRandom(); $('random-dialog').showModal();
}
function openSelection() {
  draftSelection = new Set(state.custom);
  $('grammar-search').value = '';
  renderDayChoices(); renderOptions(); $('custom-dialog').showModal();
}
function syncSelection() {
  $('selected-count').textContent = `${draftSelection.size} structures selected`;
  $('apply-selection').disabled = !draftSelection.size;
  document.querySelectorAll('#custom-days input').forEach(input => {
    const entries = lesson(grammar, Number(input.value));
    const count = entries.filter(g => draftSelection.has(g.stt)).length;
    input.checked = count === entries.length;
    input.indeterminate = count > 0 && count < entries.length;
    input.closest('label').classList.toggle('has-selection', count > 0);
  });
}
function renderDayChoices() {
  $('custom-days').replaceChildren();
  for (let day = 1; day <= Math.ceil(grammar.length / 10); day++) {
    const label = el('label', undefined, 'day-choice');
    const input = el('input'); input.type = 'checkbox'; input.value = day;
    input.setAttribute('aria-label', `D${day} — select grammar for Day ${day}`);
    label.append(input, el('span', `D${day}`));
    input.addEventListener('change', () => {
      const entries = lesson(grammar,day);
      if (input.checked) {
        entries.forEach(g => draftSelection.add(g.stt));
      } else {
        entries.forEach(g => draftSelection.delete(g.stt));
      }
      renderOptions();
    });
    $('custom-days').append(label);
  }
  syncSelection();
}
function renderOptions() {
  syncSelection();
  const query = $('grammar-search').value.trim().toLowerCase();
  $('grammar-options').replaceChildren();
  let lastDay = 0;
  grammar.filter(g => query
    ? String(g.stt) === query || `${g.structure} ${g.meaning || ''}`.toLowerCase().includes(query)
    : true).forEach(g => {
    const day = Math.ceil(g.stt / 10);
    if (day !== lastDay) {
      $('grammar-options').append(el('h3', `D${day} · STT ${(day - 1) * 10 + 1}–${Math.min(day * 10, grammar.length)}`, 'grammar-day-heading'));
      lastDay = day;
    }
    const label = el('label', undefined, 'grammar-option');
    const input = el('input'); input.type = 'checkbox'; input.value = g.stt; input.checked = draftSelection.has(g.stt);
    const span = el('span', `${g.stt}. ${g.structure}`); span.lang = 'ja';
    const small = el('small',g.meaning ?? 'Meaning not supplied in source'); small.lang = 'vi'; span.append(small);
    input.addEventListener('change', () => {
      if (input.checked) draftSelection.add(g.stt);
      else draftSelection.delete(g.stt);
      syncSelection();
    });
    label.append(input,span); $('grammar-options').append(label);
  });
  if (!$('grammar-options').children.length) $('grammar-options').append(el('p', 'No matching entries. Try a different search.', 'setting-note'));
}
async function init() {
  try {
    const responses = await Promise.all([fetch('./data/grammar.json'),fetch('./data/exercises.json?v=20261028-full-review')]);
    if (responses.some(r => !r.ok)) throw new Error('Local data could not be loaded.');
    [source, bank] = await Promise.all(responses.map(r => r.json())); grammar = source.entries;
    if (grammar.length !== 214 || bank.length !== grammar.length || bank.some((e,i) => e.stt !== grammar[i].stt || e.targetGrammar !== grammar[i].structure)) throw new Error('The local question bank does not match the grammar source.');
    const days = Math.ceil(bank.length / 10);
    for (let day = 1; day <= days; day++) {
      const count = lesson(bank,day).length;
      $('day').append(option(day,`Day ${day} · ${count}`));
      $('covered').append(option(day,`Day ${day} · STT 1–${Math.min(day*10,bank.length)}`));
    }
    $('day').value = state.day; $('covered').value = state.covered; $('bank-count').textContent = bank.length;
    document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => button.dataset.mode === 'custom' ? openSelection() : changeMode('daily')));
    $('day').addEventListener('change', () => { state.day = Number($('day').value); loadSet(); save(); });
    $('round').addEventListener('change', () => { position = (Number($('round').value) - 1)*5; render(); });
    $('covered').addEventListener('change', () => {
      state.covered = Number($('covered').value); save();
    });
    $('mark-covered').addEventListener('click', () => {
      state.covered = Math.max(state.covered,state.day); $('covered').value = state.covered; save();
      notify(`Covered through Day ${state.covered}`);
    });
    $('previous').addEventListener('click', () => { if (position > 0) { position--; render(); } });
    $('next').addEventListener('click', () => { if (position < currentSet.length-1) { position++; render(); } });
    $('toggle-question').addEventListener('click', () => toggle('toggle-question','japanese-question','Japanese question'));
    $('toggle-answer').addEventListener('click', () => toggle('toggle-answer','japanese-answer','Japanese answer'));
    $('copy-one').addEventListener('click', () => copyExercises([current()]));
    $('copy-five').addEventListener('click', () => copyExercises(selectedRound()));
    $('copy-ten').addEventListener('click',openRandom);
    $('random-scope').addEventListener('change',generateRandom); $('reroll').addEventListener('click',generateRandom);
    $('copy-random').addEventListener('click', () => copyExercises(randomSet));
    $('choose-grammar').addEventListener('click',openSelection);
    $('grammar-search').addEventListener('input',renderOptions);
    $('clear-selection').addEventListener('click', () => { draftSelection.clear(); renderOptions(); });
    $('apply-selection').addEventListener('click', () => {
      if (!draftSelection.size) return;
      state.custom = [...draftSelection].sort((a,b)=>a-b); save(); $('custom-dialog').close(); changeMode('custom');
    });
    $('help-button').addEventListener('click', () => $('help-dialog').showModal());
    document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
    $('select-prompt').addEventListener('click', () => { $('prompt-text').focus(); $('prompt-text').select(); $('prompt-text').setSelectionRange(0,handoffPrompt.length); });
    $('retry-copy').addEventListener('click', async () => {
      if (await clipboard(handoffPrompt)) {
        $('handoff-dialog').close(); notify('Prompt copied. Paste it into ChatGPT.');
      } else notify('Copy unavailable. Select the prompt and copy it manually.');
    });
    $('reset-progress').addEventListener('click', () => {
      state.day = 1; state.covered = 1; state.custom = []; state.scope = 'covered'; save();
      $('day').value = 1; $('covered').value = 1; changeMode('daily'); $('help-dialog').close(); notify('Local preferences reset.');
    });
    loadSet(); $('loading').hidden = true; $('workspace').hidden = false;
  } catch (error) {
    $('loading').className = 'load-error';
    $('loading').textContent = `${error.message} Serve the project with a static web server (npm start), rather than opening index.html as a file. Reload to retry.`;
  }
}
init();
