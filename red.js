// 写真で赤シート：レジュメや単語帳の写真を取り込み、覚える所を指でなぞって隠す。
// 写真はこのiPhoneの中（IndexedDB）にだけ保存し、どこにも送らない。隠した1か所＝1枚のカードとして、日をあけて出題する。
'use strict';

const RED_DB = 'eigo-akasheet';
function redDb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(RED_DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('img');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function redPut(id, blob) { const db = await redDb(); return new Promise((res, rej) => { const t = db.transaction('img', 'readwrite'); t.objectStore('img').put(blob, id); t.oncomplete = res; t.onerror = () => rej(t.error); }); }
async function redGet(id) { const db = await redDb(); return new Promise((res, rej) => { const q = db.transaction('img').objectStore('img').get(id); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); }
async function redDel(id) { const db = await redDb(); return new Promise(res => { const t = db.transaction('img', 'readwrite'); t.objectStore('img').delete(id); t.oncomplete = res; }); }
const redUrl = {};
async function redSrc(sheet) { if (!redUrl[sheet.id]) { const b = await redGet(sheet.id); redUrl[sheet.id] = b ? URL.createObjectURL(b) : ''; } return redUrl[sheet.id]; }

function redFind(id) { // カードID r<写真ID>_<隠しID>
  const m = /^r([^_]+)_(.+)$/.exec(id); if (!m || !S.sheets) return null;
  const sheet = S.sheets.find(s => s.id === m[1]); if (!sheet) return null;
  const mask = sheet.masks.find(k => k.id === m[2]); return mask ? { sheet, mask } : null;
}
const redCardId = (sheet, mask) => `r${sheet.id}_${mask.id}`;

// 写真を縮めて保存（長辺1600px・JPEG）
function shrink(file) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      c.toBlob(b => (b ? res(b) : rej(new Error('写真を変換できませんでした'))), 'image/jpeg', 0.82);
    };
    img.onerror = () => rej(new Error('写真を読めませんでした')); img.src = url;
  });
}

function redList() {
  const t = today();
  app().innerHTML = `<h1>写真で赤シート</h1>
    <p class="sub">先生のレジュメや単語帳を写真に撮って取り込み、覚える所を指でなぞって隠します。写真はこのiPhoneの中にだけ保存されます。</p>
    <button class="big" id="add">写真を取り込む</button><input type="file" id="f" accept="image/*" style="display:none">
    <div class="menu">${S.sheets.map(sh => {
      const due = sh.masks.filter(k => ((S.cards[redCardId(sh, k)] || {}).d || t) <= t).length;
      return `<button data-p="${sh.id}"><span>${esc(sh.name)}</span><span class="sub">${sh.masks.length}か所${due ? `・今日 ${due}` : ''}</span></button>`;
    }).join('')}</div>
    <div id="msg"></div><button class="link" id="back">もどる</button>`;
  $('#add').onclick = () => $('#f').click();
  $('#f').onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      $('#msg').innerHTML = '<div class="info">取り込み中…</div>';
      const blob = await shrink(file), id = Date.now().toString(36);
      await redPut(id, blob);
      const d = new Date(), sh = { id, name: `${d.getMonth() + 1}/${d.getDate()}の写真${S.sheets.length + 1}`, masks: [] };
      S.sheets.push(sh); save(); redEdit(sh);
    } catch (err) { $('#msg').innerHTML = `<div class="msg">${esc(err.message)}</div>`; }
  };
  app().querySelectorAll('[data-p]').forEach(b => b.onclick = () => redSheetMenu(S.sheets.find(s => s.id === b.dataset.p)));
  $('#back').onclick = home;
}

function redSheetMenu(sh) {
  app().innerHTML = `<h1>${esc(sh.name)}</h1>
    <button class="big" id="go">練習する（${sh.masks.length}か所）</button>
    <button class="ghost" id="ed">隠す場所を直す</button>
    <button class="ghost" id="rn">名前を変える</button>
    <button class="ghost" id="del">この写真を消す</button>
    <button class="link" id="back">もどる</button>`;
  $('#go').onclick = () => { if (!sh.masks.length) return alert('先に隠す場所をなぞってください'); startFixed('red', sh.name, sh.masks.map(k => makeItem(redCardId(sh, k))).sort(() => Math.random() - .5)); };
  $('#ed').onclick = () => redEdit(sh);
  $('#rn').onclick = () => { const n = prompt('名前（例：KP6-3レジュメ）', sh.name); if (n) { sh.name = n; save(); redSheetMenu(sh); } };
  $('#del').onclick = async () => {
    if (!confirm('この写真と、隠した場所の記録を消します。よいですか？')) return;
    for (const k of sh.masks) delete S.cards[redCardId(sh, k)];
    S.sheets = S.sheets.filter(s => s !== sh); save(); await redDel(sh.id); redList();
  };
  $('#back').onclick = redList;
}

// 隠す場所を描く（指でなぞる＝四角。四角をタップ＝消す）
async function redEdit(sh) {
  const src = await redSrc(sh);
  let draw = true;
  app().innerHTML = `<div class="top"><b>${esc(sh.name)}</b><button class="speak" id="mode">いま：隠す場所を描く</button></div>
    <p class="sub">覚える所を指でなぞって四角で隠します。四角をタップすると消せます。写真を動かしたいときは上のボタンで「スクロール」に。</p>
    <div id="wrap" style="position:relative;touch-action:none;user-select:none;-webkit-user-select:none"><img src="${src}" style="width:100%;display:block;border-radius:8px" draggable="false"></div>
    <button class="big" id="sv">保存する（<span id="n">${sh.masks.length}</span>か所）</button>`;
  const wrap = $('#wrap');
  const paint = () => {
    wrap.querySelectorAll('.rm').forEach(e => e.remove());
    for (const k of sh.masks) {
      const d = document.createElement('div'); d.className = 'rm';
      Object.assign(d.style, { position: 'absolute', left: k.x * 100 + '%', top: k.y * 100 + '%', width: k.w * 100 + '%', height: k.h * 100 + '%', background: 'rgba(216,90,48,.75)', borderRadius: '3px' });
      d.onpointerdown = e => { e.stopPropagation(); if (confirm('この四角を消しますか？')) { sh.masks = sh.masks.filter(x => x !== k); paint(); } };
      wrap.appendChild(d);
    }
    $('#n').textContent = sh.masks.length;
  };
  paint();
  let st = null, ghost = null;
  const pos = e => { const r = wrap.getBoundingClientRect(); return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) }; };
  wrap.onpointerdown = e => {
    if (!draw) return; st = pos(e); try { wrap.setPointerCapture(e.pointerId); } catch (err) { /* 指を追えなくても描ける */ }
    ghost = document.createElement('div'); Object.assign(ghost.style, { position: 'absolute', border: '2px solid var(--rv)', background: 'rgba(216,90,48,.3)' }); wrap.appendChild(ghost);
  };
  wrap.onpointermove = e => {
    if (!st) return; const p = pos(e);
    Object.assign(ghost.style, { left: Math.min(st.x, p.x) * 100 + '%', top: Math.min(st.y, p.y) * 100 + '%', width: Math.abs(p.x - st.x) * 100 + '%', height: Math.abs(p.y - st.y) * 100 + '%' });
  };
  wrap.onpointerup = e => {
    if (!st) return; const p = pos(e), w = Math.abs(p.x - st.x), h = Math.abs(p.y - st.y);
    ghost.remove();
    if (w > 0.02 && h > 0.006) sh.masks.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), x: Math.min(st.x, p.x), y: Math.min(st.y, p.y), w, h: Math.max(h, 0.012) });
    st = null; paint();
  };
  $('#mode').onclick = () => { draw = !draw; wrap.style.touchAction = draw ? 'none' : 'auto'; $('#mode').textContent = draw ? 'いま：隠す場所を描く' : 'いま：スクロール'; };
  $('#sv').onclick = () => {
    const keep = new Set(sh.masks.map(k => redCardId(sh, k)));
    for (const id of Object.keys(S.cards)) if (id.startsWith(`r${sh.id}_`) && !keep.has(id)) delete S.cards[id];
    for (const id of keep) if (!S.cards[id]) S.cards[id] = { b: 0, d: today(), lapse: 0, ok: 0 };
    save(); redSheetMenu(sh);
  };
}

// 出題：全部の四角を隠し、出題する1か所だけ枠で示す。「めくる」→自分で○×
async function askRed() {
  const it = Q.cur, sh = it.sheet, src = await redSrc(sh);
  app().innerHTML = `${topBar()}<div class="top">${tag()}<span class="sub">${esc(sh.name)}</span></div>
    <p class="prompt">枠の中を思い出して、紙に書くか声に出そう</p>
    <div id="wrap" style="position:relative"><img src="${src}" style="width:100%;display:block;border-radius:8px"></div>
    <div id="rv"></div><button class="big" id="ok">めくる</button>
    <div class="foot"><span></span><button class="link" id="quit">今日はここまで</button></div>`;
  const wrap = $('#wrap'); let target = null;
  for (const k of sh.masks) {
    const d = document.createElement('div');
    Object.assign(d.style, { position: 'absolute', left: k.x * 100 + '%', top: k.y * 100 + '%', width: k.w * 100 + '%', height: k.h * 100 + '%', background: k === it.mask ? '#d85a30' : 'rgba(216,90,48,.55)', borderRadius: '3px', outline: k === it.mask ? '3px solid #185fa5' : 'none', outlineOffset: '2px' });
    wrap.appendChild(d); if (k === it.mask) target = d;
  }
  setTimeout(() => target && target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  $('#ok').onclick = () => {
    it.sec = (Date.now() - it.t0) / 1000;
    target.style.background = 'transparent'; target.style.outline = '3px solid #1d9e75';
    $('#ok').remove();
    $('#rv').innerHTML = `<div class="row" style="margin-top:10px"><button class="big" data-g="good" style="background:var(--ok)">○ 合ってた</button><button class="big" data-g="again" style="background:var(--ng)">× 違った</button></div>`;
    app().querySelectorAll('[data-g]').forEach(b => b.onclick = () => selfJudge(b.dataset.g));
  };
  $('#quit').onclick = () => (Q.done.length ? finish() : home());
}
