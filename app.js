// 英語トレーニング（中1）— 単語（コンプリ対策）・KP（英作文）・不規則動詞
// 単語や例文のデータは公開ページに載せない。iPhoneで一度「取り込む」（端末内に保存）。
// 記憶の単位は「単語×技能」：m＝英→日（4択）／c＝例文の空欄（和訳つき・つづり）／p＝日→英（つづり）。
'use strict';

const KEY = 'eigo-v1', DKEY = 'eigo-data';
const STEPS = [1, 3, 7, 14, 30, 60];
const DAILY_MS = 10 * 60 * 1000;
const CFG = window.EIGO_CONFIG || {};

// ---------- 日付 ----------
const pad2 = n => String(n).padStart(2, '0');
const dstr = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const today = () => dstr(new Date());
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return dstr(d); };
const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5);
const nextTuesday = () => { const d = new Date(); d.setDate(d.getDate() + ((2 - d.getDay() + 7) % 7 || 7)); return dstr(d); };

// ---------- 保存 ----------
let S, D = null;
function load() {
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
  if (!S || !S.cards) S = { cards: {}, seen: {}, log: [], settings: { from: 114, to: 117, testDate: nextTuesday(), kp: '6-3', mode: 'paper' }, sheets: [], created: today() };
  if (!S.settings.mode) S.settings.mode = 'paper';
  if (!S.sheets) S.sheets = [];
  try { D = JSON.parse(localStorage.getItem(DKEY)); } catch (e) { D = null; }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 保存できない環境 */ } }
let W = {}, KP = {}, IRR = {};
function index() {
  W = {}; KP = {}; IRR = {};
  if (!D) return;
  for (const w of D.words || []) W[w.no] = w;
  for (const k of D.kp || []) KP[k.id] = k;
  for (const v of D.irr || []) IRR[v[0]] = v;
}

// ---------- 表示の部品 ----------
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const $ = q => document.querySelector(q);
const app = () => $('#app');
function speak(text) {
  try {
    const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.9;
    const v = speechSynthesis.getVoices().find(v => /en[-_]US/i.test(v.lang)); if (v) u.voice = v;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch (e) { /* 読み上げ不可 */ }
}
const spkBtn = (text, label = '発音') => `<button class="speak" data-say="${esc(text)}">▶ ${label}</button>`;
function bindSpeak() { app().querySelectorAll('[data-say]').forEach(b => b.onclick = () => speak(b.dataset.say)); }
const INPUT = 'autocapitalize="off" autocorrect="off" autocomplete="off" spellcheck="false"';

// ---------- 採点 ----------
const normWord = s => String(s).toLowerCase().replace(/[’‘]/g, "'").replace(/[~〜.?!,]/g, ' ').replace(/\s+/g, ' ').trim();
const CONTR = { "i'm": 'i am', "you're": 'you are', "we're": 'we are', "they're": 'they are', "he's": 'he is', "she's": 'she is', "it's": 'it is', "that's": 'that is', "what's": 'what is', "there's": 'there is', "who's": 'who is', "where's": 'where is', "don't": 'do not', "doesn't": 'does not', "didn't": 'did not', "isn't": 'is not', "aren't": 'are not', "wasn't": 'was not', "weren't": 'were not', "can't": 'cannot', "won't": 'will not', "i'll": 'i will', "you'll": 'you will', "we'll": 'we will', "they'll": 'they will', "he'll": 'he will', "she'll": 'she will', "it'll": 'it will', "let's": 'let us', "haven't": 'have not', "hasn't": 'has not' };
function tokens(s) {
  const t = String(s).replace(/[’‘]/g, "'").replace(/[—–]+/g, ' ').toLowerCase().match(/[a-z0-9']+(?:\.[a-z]+\.?)?/g) || [];
  return t.flatMap(w => (CONTR[w] || w.replace(/^can not$/, 'cannot')).split(' '));
}
function sameSentence(a, b) { const x = tokens(a), y = tokens(b); return x.length === y.length && x.every((w, i) => w === y[i]); }
// 大文字・ピリオドの点検（KPテストで減点される型）
function styleIssues(ans, model) {
  const out = [];
  const sents = String(ans).split(/(?<!\b(?:Mr|Mrs|Ms|Mt|Dr|St)\.)(?<=[.?!])\s+|\s*[—–]+\s*/i).filter(s => s.trim()); // Mr. Mt. などでは区切らない
  for (const s of sents) {
    if (/^[a-z]/.test(s.trim())) { out.push('文の始めは大文字にしよう'); break; }
  }
  if (!/[.?!]\s*$/.test(String(ans).trim())) out.push('文の終わりに「.」か「?」を付けよう');
  if (/(^|\s)i(\s|'|$)/.test(ans)) out.push('「I（私は）」はいつも大文字');
  const body = String(model).replace(/(^|[.?!—]\s*)[A-Z][A-Za-z']*/g, '$1'); // 文頭の語は固有名詞の点検から外す
  const caps = (body.match(/\b[A-Z][a-z]+\b/g) || []).filter((w, i, a) => !/^(I|The|A|An|What|Where|When|Who|How|Is|Are|Do|Does|Did|Can|Will|This|That|These|Those|It|He|She|We|You|They|My|Your|Yes|No|Be|Don't|There|Which|Whose|Let's|Please|Was|Were|Have|Has|Why|May|Must|Shall|Should|Would|Could)$/.test(w));
  for (const c of caps) if (new RegExp('\\b' + c.toLowerCase() + '\\b').test(ans)) { out.push(`「${c}」は大文字で始めよう`); break; }
  return out;
}
// 単語ごとの違い（足りない語・余分な語）
function diffHtml(ans, model) {
  const a = tokens(ans), m = tokens(model), n = a.length, k = m.length;
  const L = Array.from({ length: n + 1 }, () => Array(k + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = k - 1; j >= 0; j--) L[i][j] = a[i] === m[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  let i = 0, j = 0; const out = [];
  while (i < n && j < k) {
    if (a[i] === m[j]) { out.push(`<span>${esc(m[j])}</span>`); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) { out.push(`<span class="extra">${esc(a[i])}</span>`); i++; }
    else { out.push(`<span class="miss">${esc(m[j])}</span>`); j++; }
  }
  while (i < n) out.push(`<span class="extra">${esc(a[i++])}</span>`);
  while (j < k) out.push(`<span class="miss">${esc(m[j++])}</span>`);
  return out.join(' ');
}

// ---------- 復習の時期（単語×技能ごと） ----------
function rate(id, grade) {
  const t = today(), c = S.cards[id] || { b: 0, d: t, lapse: 0, ok: 0 };
  if (grade === 'again') { c.b = 0; c.d = addDays(t, 1); c.lapse++; c.rv = 1; }
  else if (c.lastOk !== t) {
    if (grade === 'hard') c.d = addDays(t, c.b ? Math.max(1, Math.round(STEPS[c.b - 1] / 2)) : 1);
    else { c.b = Math.min(c.b + (grade === 'easy' ? 2 : 1), STEPS.length); c.d = addDays(t, STEPS[c.b - 1]); c.rv = 0; }
    c.lastOk = t; c.ok++;
  }
  // テスト範囲の語は、テスト前日までに必ずもう一度出す
  const w = W[Number(id.slice(1).split('.')[0])];
  const td = S.settings.testDate;
  if (w && id[0] === 'w' && inRange(w) && td && td > t && c.d >= td) c.d = addDays(td, -1) > t ? addDays(td, -1) : addDays(t, 1);
  S.cards[id] = c;
  // 単語は段階を上げる：英→日 → 例文の空欄 → 日→英
  if (id[0] === 'w' && grade !== 'again') {
    const no = id.slice(1).split('.')[0], sk = id.split('.')[1];
    const nextSk = sk === 'm' ? 'c' : sk === 'c' ? 'p' : null;
    if (nextSk && !S.cards[`w${no}.${nextSk}`] && cardOk(`w${no}.${nextSk}`)) S.cards[`w${no}.${nextSk}`] = { b: 0, d: addDays(t, 1), lapse: 0, ok: 0 };
  }
  return c;
}
const inRange = w => w.page >= S.settings.from && w.page <= S.settings.to;
function cardOk(id) { // データ上その形式で出せるか
  if (id[0] !== 'w') return true;
  const w = W[Number(id.slice(1).split('.')[0])]; if (!w) return false;
  if (id.endsWith('.c')) return !!(w.ex_en && w.target && w.ex_en.includes(w.target));
  return true;
}
function dueList() {
  const t = today();
  return Object.entries(S.cards).filter(([id, c]) => c.d <= t && cardExists(id))
    .sort((a, b) => (inR(b[0]) - inR(a[0])) || (b[1].rv || 0) - (a[1].rv || 0) || a[1].d.localeCompare(b[1].d)).map(([id]) => id);
}
const inR = id => (id[0] === 'w' && W[Number(id.slice(1).split('.')[0])] && inRange(W[Number(id.slice(1).split('.')[0])])) ? 1 : 0;
const cardExists = id => id[0] === 'w' ? !!W[Number(id.slice(1).split('.')[0])] : id[0] === 'k' ? !!KP[id.slice(1)] : id[0] === 'r' ? !!redFind(id) : !!IRR[id.slice(1)];
function newWords() { // テスト範囲の未学習語。番号が隣り合う語（似た語のことが多い）を続けて出さない
  const list = (D.words || []).filter(w => inRange(w) && !S.seen[w.no]).sort((a, b) => a.no - b.no);
  const odd = list.filter((_, i) => i % 2 === 0), even = list.filter((_, i) => i % 2 === 1);
  return odd.concat(even);
}

// ---------- 出題の組み立て ----------
let Q = null;
function makeItem(id, opt = {}) {
  if (id[0] === 'w') {
    const [no, sk] = id.slice(1).split('.'); const w = W[Number(no)];
    return { id, kind: sk, w, ...opt };
  }
  if (id[0] === 'k') return { id, kind: 'kp', k: KP[id.slice(1)], ...opt };
  if (id[0] === 'r') { const f = redFind(id); return { id, kind: 'red', sheet: f.sheet, mask: f.mask, ...opt }; }
  return { id, kind: 'irr', v: IRR[id.slice(1)], ...opt };
}
function startDaily() { Q = { mode: 'daily', title: '毎日10分', end: Date.now() + DAILY_MS, done: [], retry: [], used: new Set(), n: 0 }; next(); }
function startFixed(mode, title, items) { Q = { mode, title, queue: items, i: 0, done: [], retry: [], used: new Set(), n: 0 }; next(); }
function pickDaily() {
  const n = Q.done.length;
  const r = Q.retry.findIndex(x => x.at <= n); if (r >= 0) return Q.retry.splice(r, 1)[0].item;
  const due = dueList().filter(id => !Q.used.has(id));
  if (Q.n % 3 !== 2 && due.length) return makeItem(due[0]);
  const nw = newWords()[0];
  if (nw) return { id: `w${nw.no}.m`, kind: 'intro', w: nw };
  if (due.length) return makeItem(due[0]);
  const pool = (D.words || []).filter(inRange); if (!pool.length) return null;
  const w = pool[Math.floor(Math.random() * pool.length)];
  return makeItem(`w${w.no}.${cardOk(`w${w.no}.c`) && Math.random() < .6 ? 'c' : 'p'}`, { extra: true });
}
function next() {
  let it;
  if (Q.mode === 'daily') { if (Date.now() >= Q.end && Q.done.length) return finish(); it = pickDaily(); }
  else {
    const n = Q.done.length, r = Q.retry.findIndex(x => x.at <= n);
    if (r >= 0) it = Q.retry.splice(r, 1)[0].item;
    else if (Q.i < Q.queue.length) it = Q.queue[Q.i++];
    else if (Q.retry.length) it = Q.retry.shift().item;
  }
  if (!it) return finish();
  Q.used.add(it.id); Q.n++; Q.cur = { ...it, t0: Date.now(), hint: false };
  if (it.kind === 'intro') return intro();
  ask();
}

// ---------- 画面：新しい単語の紹介 ----------
function intro() {
  const { w } = Q.cur; S.seen[w.no] = 1; save();
  app().innerHTML = `${topBar()}
    <div class="top"><span class="tag">新しい単語</span><span class="sub">No.${w.no}　p.${w.page}</span></div>
    <div class="word">${esc(w.word)}</div>
    <div class="center">${spkBtn(w.word)}</div>
    <div class="mean">${esc(w.pos ? `［${w.pos}］` : '')}${esc(w.mean)}</div>
    ${w.ex_en ? `<div class="card"><div class="sent" style="font-size:19px">${esc(w.ex_en)}</div><div class="sub">${esc(w.ex_ja)}</div><div style="margin-top:8px">${spkBtn(w.ex_en, '例文')}</div></div>` : ''}
    <div class="info">声に出して３回言ってから、次へ進もう。</div>
    <button class="big" id="nx">覚えた。テストする</button>`;
  bindSpeak(); speak(w.word);
  $('#nx').onclick = () => { Q.cur = { ...makeItem(`w${w.no}.m`), t0: Date.now(), hint: false, fresh: true }; ask(); };
}

// ---------- 画面：出題 ----------
function topBar() {
  const w = Q.mode === 'daily' ? Math.min(100, 100 * (1 - (Q.end - Date.now()) / DAILY_MS)) : 100 * Math.min(1, Q.done.filter(d => !d.retry).length / Q.queue.length);
  return `<div class="bar"><i style="width:${w}%"></i></div>`;
}
function tag() {
  const c = S.cards[Q.cur.id];
  if (Q.cur.retry) return '<span class="tag rv">もう一度（形を変えて）</span>';
  if (c && c.rv) return '<span class="tag rv">リベンジ問題</span>';
  return `<span class="tag">${{ m: '意味', c: '例文の空欄', p: 'つづり', kp: 'KP英作文', irr: '不規則動詞', red: '赤シート' }[Q.cur.kind]}</span>`;
}
function ask() {
  const it = Q.cur; let body = '';
  if (it.kind === 'red') return askRed();
  const paper = S.settings.mode !== 'type' && it.kind !== 'm';
  if (it.kind === 'm') {
    const opts = choices(it.w);
    body = `<div class="word">${esc(it.w.word)}</div><div class="center">${spkBtn(it.w.word)}</div>
      <div class="prompt center">意味はどれ？</div><div class="choices">${opts.map(o => `<button data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
  } else if (it.kind === 'c') {
    const w = it.w, blank = w.ex_en.replace(w.target, '<span class="blank">（　　　）</span>');
    const ja = w.ja_target ? esc(w.ex_ja).replace(esc(w.ja_target), `<u>${esc(w.ja_target)}</u>`) : esc(w.ex_ja);
    body = `<div class="prompt">（　）に入る英語を書こう</div><div class="ja">${ja}</div><div class="sent">${blank}</div>
      <input class="ans" id="a" ${INPUT}><div id="hl"></div>`;
  } else if (it.kind === 'p') {
    body = `<div class="prompt">英語で書こう</div><div class="mean" style="font-size:24px">${esc(it.w.pos ? `［${it.w.pos}］` : '')}${esc(it.w.mean)}</div>
      <input class="ans" id="a" ${INPUT}><div id="hl"></div>`;
  } else if (it.kind === 'kp') {
    body = `<div class="prompt">英語に直そう（${esc(it.k.section)}　${esc(it.k.grammar || '')}）</div><div class="ja">${esc(it.k.ja)}</div>
      <textarea class="ans" id="a" ${INPUT} placeholder="文の始めの大文字と、最後の「.」「?」も忘れずに"></textarea><div id="hl"></div>`;
  } else if (it.kind === 'irr') {
    body = `<div class="prompt">過去形を書こう</div><div class="word">${esc(it.v[0])}</div><div class="mean">${esc(it.v[2] || '')}</div>
      <input class="ans" id="a" ${INPUT}><div id="hl"></div>`;
  }
  if (paper) body = body.replace(/<input class="ans"[^>]*>|<textarea[\s\S]*?<\/textarea>/, '<div class="info">手元の紙に書いてから「答えを見る」を押そう。</div><div id="rv"></div>');
  app().innerHTML = `${topBar()}<div class="top">${tag()}<span class="sub">${it.w ? `No.${it.w.no}　p.${it.w.page}` : ''}</span></div>${body}
    <div id="msg"></div>
    ${it.kind === 'm' ? '' : paper ? '<button class="big" id="ok" disabled style="opacity:.4">答えを見る（3）</button>' : '<button class="big" id="ok">答える</button>'}
    <div class="foot"><button class="link" id="hint">${it.kind === 'm' ? '' : 'ヒント'}</button><button class="link" id="quit">今日はここまで</button></div>`;
  bindSpeak();
  if (it.kind === 'm') app().querySelectorAll('[data-o]').forEach(b => b.onclick = () => judge(b.dataset.o === it.w.mean, b.dataset.o));
  else if (paper) {
    const b = $('#ok'); let n = 3;
    const tick = setInterval(() => { n--; if (!b.isConnected) return clearInterval(tick); if (n > 0) b.textContent = `答えを見る（${n}）`; else { clearInterval(tick); b.disabled = false; b.style.opacity = 1; b.textContent = '答えを見る'; } }, 1000);
    b.onclick = reveal;
    $('#hint').onclick = () => { it.hint = true; $('#hl') ? $('#hl').innerHTML = `<div class="hintline">${esc(hintOf(it))}</div>` : $('#msg').innerHTML = `<div class="hintline">${esc(hintOf(it))}</div>`; };
  } else {
    const a = $('#a'); setTimeout(() => a.focus(), 50);
    a.onkeydown = e => { if (e.key === 'Enter' && it.kind !== 'kp') { e.preventDefault(); submit(); } };
    $('#ok').onclick = submit;
    $('#hint').onclick = () => { it.hint = true; $('#hl').innerHTML = `<div class="hintline">${esc(hintOf(it))}</div>`; };
  }
  $('#quit').onclick = () => (Q.done.length ? finish() : home());
}
function answerOf(it) { if (it.kind === 'red') return `赤シート（${it.sheet.name}）`; return it.kind === 'm' ? it.w.mean : it.kind === 'c' ? it.w.target : it.kind === 'p' ? it.w.word.replace(/\s*~\s*/g, ' ').trim() : it.kind === 'irr' ? it.v[1] : it.k.en; }
function hintOf(it) {
  if (it.kind === 'kp') return it.k.hint || '使う文法：' + (it.k.grammar || '');
  const a = answerOf(it).split(/,\s*/)[0];
  return a.split(' ').map(x => x[0] + ' _'.repeat(x.length - 1)).join('　') + `（${a.replace(/\s/g, '').length}文字）`;
}
function choices(w) {
  const pool = (D.words || []).filter(x => x.no !== w.no && x.mean !== w.mean && x.pos === w.pos && Math.abs(x.no - w.no) < 400);
  const pick = []; while (pick.length < 3 && pool.length) pick.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0].mean);
  return [w.mean, ...pick].sort(() => Math.random() - .5);
}
function submit() {
  const it = Q.cur, v = $('#a').value.trim();
  if (!v) { $('#msg').innerHTML = '<div class="msg">答えを書いてね</div>'; return; }
  if (it.kind === 'kp') {
    const models = [it.k.en, ...(it.k.alts || [])];
    const hit = models.find(m => sameSentence(v, m));
    if (!hit) return judge(false, v);
    const iss = styleIssues(v, hit);
    return judge(true, v, iss.length ? iss : null);
  }
  const a0 = answerOf(it), ok = [a0, ...a0.split(/,\s*/)].some(a => normWord(a) === normWord(v)); // 「Me, too.」のようにカンマを含む連語もそのまま正解
  judge(ok, v);
}
function judge(ok, given, style) {
  const it = Q.cur, sec = (Date.now() - it.t0) / 1000;
  const limit = it.kind === 'kp' ? 60 : it.kind === 'm' ? 6 : 15;
  let grade = !ok ? 'again' : (it.hint || style || sec > limit) ? 'hard' : (sec < limit / 3 && !it.fresh) ? 'easy' : 'good';
  if (!Q.cur.retry) rate(it.id, grade); else if (!ok) rate(it.id, 'again');
  S.log.push({ at: new Date().toISOString(), mode: Q.mode, id: it.id, ok, grade, sec: Math.round(sec), hint: it.hint, retry: !!it.retry });
  if (S.log.length > 4000) S.log = S.log.slice(-4000);
  save();
  Q.done.push({ id: it.id, ok, retry: !!it.retry, rv: !!(S.cards[it.id] || {}).rv && !ok, it });
  if (!ok && !it.retry) Q.retry.push({ at: Q.done.length + 3, item: { ...retryForm(it), retry: true } });
  showResult(ok, given, style);
}
function reveal() {
  const it = Q.cur; it.sec = (Date.now() - it.t0) / 1000;
  const ans = answerOf(it), big = it.kind === 'kp' ? `<div class="sent">${esc(ans)}</div>` : `<div class="word" style="letter-spacing:.12em">${esc(ans)}</div>`;
  const check = it.kind === 'kp' ? `<div class="sub" style="margin-top:6px">点検：文の始めの大文字／最後の「.」「?」／三単現の s・複数形の s／つづり</div>` +
    ((it.k.alts || []).length ? `<div class="sub">これも正解：${(it.k.alts || []).slice(0, 2).map(a => `<span class="en">${esc(a)}</span>`).join('　')}</div>` : '') : '<div class="sub center">１文字でも違えば×（テストと同じ）</div>';
  $('#rv').innerHTML = `<div class="card"><div class="sub">正しい答え</div>${big}${check}<div style="margin-top:8px">${spkBtn(it.kind === 'kp' ? it.k.en : (it.w ? (it.w.ex_en || it.w.word) : ans))}</div></div>
    <div class="row" style="margin-top:10px"><button class="big" data-g="good" style="background:var(--ok)">○ 合ってた</button>${it.kind === 'kp' ? '<button class="big" data-g="hard" style="background:#ba7517">△ 小さなミス</button>' : ''}<button class="big" data-g="again" style="background:var(--ng)">× 違った</button></div>`;
  $('#ok').remove(); bindSpeak();
  app().querySelectorAll('[data-g]').forEach(b => b.onclick = () => selfJudge(b.dataset.g));
  $('#rv').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function selfJudge(g) { // 紙に書いて自分で○×
  const it = Q.cur, ok = g !== 'again';
  if (ok && (it.hint || it.sec > 40)) g = 'hard';
  if (!it.retry) rate(it.id, g); else if (!ok) rate(it.id, 'again');
  S.log.push({ at: new Date().toISOString(), mode: Q.mode, id: it.id, ok, grade: g, sec: Math.round(it.sec || 0), hint: it.hint, retry: !!it.retry, self: 1 });
  if (S.log.length > 4000) S.log = S.log.slice(-4000);
  save();
  Q.done.push({ id: it.id, ok, retry: !!it.retry, it });
  if (!ok && !it.retry) Q.retry.push({ at: Q.done.length + 3, item: { ...retryForm(it), retry: true } });
  next();
}
function retryForm(it) { // 間違えたら、少しあとに形を変えて聞き直す
  if (it.kind === 'c') return makeItem(`w${it.w.no}.p`);
  if (it.kind === 'p') return makeItem(cardOk(`w${it.w.no}.c`) ? `w${it.w.no}.c` : `w${it.w.no}.m`);
  if (it.kind === 'red') return makeItem(it.id);
  return makeItem(it.id);
}
function showResult(ok, given, style) {
  const it = Q.cur, ans = answerOf(it);
  let detail = '';
  if (it.kind === 'kp') detail = ok ? '' : `<div class="card diff">${diffHtml(given, it.k.en)}</div><div class="sub">赤い下線＝足りない語　取り消し線＝いらない語</div>`;
  const w = it.w;
  app().innerHTML = `${topBar()}
    <div class="mark ${ok ? 'ok' : 'ng'}">${ok ? '○' : '×'}</div>
    ${style ? `<div class="msg">${style.map(esc).join('<br>')}（テストでは減点されるよ）</div>` : ''}
    <div class="card"><div class="sub">正しい答え</div><div class="sent">${esc(ans)}</div>
      ${!ok && given ? `<div class="sub">あなたの答え：<span class="en">${esc(given)}</span></div>` : ''}${detail}</div>
    ${w ? `<div class="card"><b class="en">${esc(w.word)}</b>　${esc(w.mean)}${w.ex_en ? `<div class="sub en" style="margin-top:6px">${esc(w.ex_en)}</div>` : ''}<div style="margin-top:8px">${spkBtn(w.ex_en || w.word)}</div></div>` : ''}
    ${it.kind === 'kp' ? `<div class="card"><div class="sub">文法のポイント</div><div>${esc(it.k.note || '')}</div><div style="margin-top:8px">${spkBtn(it.k.en, '英文')}</div></div>` : ''}
    <p class="sub center">${ok ? '' : 'あとで形を変えてもう一度出るよ。'}</p>
    <button class="big" id="nx">次へ</button>
    ${!ok && it.kind === 'kp' ? '<button class="ghost" id="self">これも正しいはず（先生・家の人に確認）</button>' : ''}`;
  bindSpeak(); if (ok) speak(it.kind === 'kp' ? it.k.en : (w ? w.word : ans));
  $('#nx').onclick = next;
  const sb = $('#self'); if (sb) sb.onclick = () => { S.log[S.log.length - 1].self = 1; const c = S.cards[it.id]; if (c) { c.lapse = Math.max(0, c.lapse - 1); } save(); next(); };
}
function finish() {
  const first = Q.done.filter(d => !d.retry), ok = first.filter(d => d.ok).length;
  const miss = first.filter(d => !d.ok);
  sendLog();
  const pass = Q.mode === 'compli' ? (ok >= 8 ? '合格ライン（8点）クリア！' : 'あと少し。間違えた語は明日リベンジ。') : '';
  app().innerHTML = `<h1>${esc(Q.title)} おしまい</h1>
    <div class="stats"><div><b>${ok}<small>/${first.length}</small></b><span>正解</span></div><div><b>${miss.length}</b><span>明日リベンジ</span></div><div><b>${streak()}</b><span>連続した日数</span></div></div>
    ${pass ? `<p class="center">${pass}</p>` : ''}
    ${miss.length ? `<h2>間違えたもの</h2><div class="list">${miss.map(d => `<div class="en">${esc(answerOf(d.it))}</div>`).join('')}</div>` : '<p class="center">全部正解！</p>'}
    <button class="big" id="hm">ホームへ</button>`;
  $('#hm').onclick = home; Q = null;
}
function streak() { const s = new Set(S.log.map(l => dstr(new Date(l.at)))); let n = 0; for (let d = today(); s.has(d); d = addDays(d, -1)) n++; return n; }
function sendLog() { // 記録は番号と正誤だけ送る（単語・例文の中身・写真は送らない）。150件ずつ
  if (!CFG.formPostUrl || !CFG.formFields) return;
  const f = CFG.formFields, pending = S.log.filter(l => !l.s); if (!pending.length) return;
  for (let i = 0; i < pending.length; i += 150) {
    const part = pending.slice(i, i + 150), first = part.filter(l => !l.retry);
    try {
      const fd = new FormData();
      fd.append(f.mode, 'eigo-' + ((Q && Q.mode) || 'daily'));
      fd.append(f.score, `${first.filter(l => l.ok).length}/${first.length}`);
      fd.append(f.log, JSON.stringify(part.map(l => [l.at.slice(0, 16), l.id, l.ok ? 1 : 0, l.grade, l.sec, l.hint ? 1 : 0, l.retry ? 1 : 0, l.self ? 1 : 0])));
      fetch(CFG.formPostUrl, { method: 'POST', body: fd, mode: 'no-cors', keepalive: true }).catch(() => {});
      part.forEach(l => { l.s = 1; });
    } catch (e) { /* 端末には残っている */ }
  }
  save();
}
// 1回分を終えた時だけでなく、途中でアプリを閉じた・切り替えた時にも送る
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') sendLog(); });
window.addEventListener('pagehide', sendLog);

// ---------- ホーム ----------
function home() {
  Q = null;
  if (!D) return importScreen();
  const st = S.settings, left = st.testDate ? daysBetween(today(), st.testDate) : null;
  const rangeWords = (D.words || []).filter(inRange);
  const solid = rangeWords.filter(w => ['c', 'p'].some(sk => (S.cards[`w${w.no}.${sk}`] || {}).b >= 2)).length;
  const due = dueList().length, rv = dueList().filter(id => (S.cards[id] || {}).rv).length;
  app().innerHTML = `
    <div class="top"><span class="sub">${today().replace(/-/g, '.')}</span><span class="sub">連続 ${streak()}日</span></div>
    <h1>今日の英語</h1>
    ${left !== null && left >= 0 ? `<p class="sub">次のコンプリテスト（p.${st.from}〜${st.to}）まで あと <b style="font-size:20px;color:var(--accent)">${left}</b> 日　範囲の${rangeWords.length}語中 ${solid}語が定着</p>` : ''}
    <button class="big" id="daily">毎日10分をはじめる<small>${rv ? `リベンジ ${rv}・` : ''}復習 ${due - rv}・新しい単語 ${newWords().length}</small></button>
    <div class="menu">
      <button id="compli"><span>コンプリ本番形式（10問）</span><span class="sub">テスト前日に</span></button>
      <button id="kp"><span>KP英作文</span><span class="sub">${esc(st.kp || '範囲を選ぶ')}</span></button>
      <button id="red"><span>写真で赤シート</span><span class="sub">${S.sheets.length}枚</span></button>
      <button id="irr"><span>不規則動詞の過去形</span><span class="sub">${(D.irr || []).length}語</span></button>
      <button id="cfg"><span>設定（範囲・テスト日）</span><span class="sub">›</span></button>
    </div>`;
  $('#daily').onclick = startDaily;
  $('#compli').onclick = () => {
    const pool = rangeWords.filter(w => cardOk(`w${w.no}.c`)).sort(() => Math.random() - .5).slice(0, 10);
    if (!pool.length) return alert('範囲の単語がありません。設定で頁を確かめてください。');
    pool.forEach(w => { S.seen[w.no] = 1; }); startFixed('compli', 'コンプリ本番形式', pool.map(w => makeItem(`w${w.no}.c`)));
  };
  $('#kp').onclick = kpPicker; $('#irr').onclick = () => startFixed('irr', '不規則動詞', Object.keys(IRR).sort(() => Math.random() - .5).slice(0, 10).map(b => makeItem(`v${b}`)));
  $('#cfg').onclick = settings;
  $('#red').onclick = redList;
}
function kpPicker() {
  const secs = [...new Set((D.kp || []).map(k => k.section))];
  app().innerHTML = `<h1>KP英作文</h1><p class="sub">次に受けるKPテストの番号を選ぼう</p>
    <div class="menu">${secs.map(s => { const g = (D.kp || []).find(k => k.section === s); return `<button data-s="${esc(s)}"><span>KP${esc(s)}</span><span class="sub">${esc(g.grammar || '')}</span></button>`; }).join('')}</div>
    <button class="link" id="back">もどる</button>`;
  app().querySelectorAll('[data-s]').forEach(b => b.onclick = () => {
    S.settings.kp = b.dataset.s; save();
    startFixed('kp', `KP${b.dataset.s}`, (D.kp || []).filter(k => k.section === b.dataset.s).sort(() => Math.random() - .5).map(k => makeItem(`k${k.id}`)));
  });
  $('#back').onclick = home;
}
function settings() {
  const st = S.settings;
  app().innerHTML = `<h1>設定</h1>
    <h2>次のコンプリテスト</h2>
    <div class="row"><label class="f"><span>範囲（最初の頁）</span><input type="number" id="from" value="${st.from}"></label><label class="f"><span>（最後の頁）</span><input type="number" id="to" value="${st.to}"></label></div>
    <label class="f"><span>テストの日</span><input type="date" id="td" value="${st.testDate || ''}"></label>
    <h2>答え方</h2>
    <select id="mode"><option value="paper" ${st.mode !== 'type' ? 'selected' : ''}>紙に書いて、自分で○×（標準）</option><option value="type" ${st.mode === 'type' ? 'selected' : ''}>iPhoneに打ち込んで自動採点</option></select>
    <h2>データ</h2>
    <p class="sub">単語 ${(D.words || []).length}語・KP ${(D.kp || []).length}文・不規則動詞 ${(D.irr || []).length}語（${esc(D.version || '')}）</p>
    <button class="ghost" id="reimp">新しいデータを取り込む</button>
    <button class="ghost" id="ex">記録をファイルに書き出す</button>
    <button class="big" id="sv">保存してもどる</button>`;
  $('#sv').onclick = () => { st.from = +$('#from').value; st.to = +$('#to').value; st.testDate = $('#td').value; st.mode = $('#mode').value; save(); home(); };
  $('#reimp').onclick = importScreen;
  $('#ex').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S)], { type: 'application/json' })); a.download = `eigo-kiroku-${today()}.json`; a.click(); };
}
function importScreen() {
  app().innerHTML = `<h1>データの取り込み</h1>
    <p>お父さんから届いた「eigo-data」で始まるファイルを選んでください。</p>
    <p class="sub">LINEで届いたら、ファイルを長押し→「“ファイル”に保存」してから、下のボタンで選びます。データはこのiPhoneの中にだけ保存されます。</p>
    <input type="file" id="f" accept=".json,application/json" style="margin:16px 0">
    <div id="msg"></div>${D ? '<button class="link" id="back">もどる</button>' : ''}`;
  $('#f').onchange = e => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (!Array.isArray(d.words) || !d.words.length) throw new Error('単語が入っていません');
        localStorage.setItem(DKEY, JSON.stringify(d)); D = d; index();
        $('#msg').innerHTML = `<div class="info">取り込みました：単語 ${d.words.length}語・KP ${(d.kp || []).length}文・不規則動詞 ${(d.irr || []).length}語</div><button class="big" id="go">はじめる</button>`;
        $('#go').onclick = home;
      } catch (err) { $('#msg').innerHTML = `<div class="msg">取り込めませんでした（${esc(err.message)}）</div>`; }
    };
    r.readAsText(file);
  };
  const b = $('#back'); if (b) b.onclick = home;
}

load(); index(); save(); home();
if (S.log.some(l => !l.s)) sendLog(); // 送り残しがあれば起動時に送る
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
