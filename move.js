// LINE等のアプリ内ブラウザで開いたときの「引っ越し」部品（数学・英語アプリ共通）
// 使い方：本体より前に window.MOVE_CONFIG = { key: '端末保存の名前', url: '公開URL', name: 'アプリ名' } を置き、
//         本体より前に <script src="move.js"> を読み込む。
// - アプリ内ブラウザ（LINE・Instagram・Facebook）なら、画面上部に注意書きと「引っ越す」ボタンを出す。
// - 引っ越しは、端末内の記録を圧縮してURLに載せ、Chrome（Android）／Safari（iPhone）で開き直して取り込む。
//   取り込んだ記録は「未送信」に戻すので、引っ越し先で先生のフォームへ送り直される（週次報告は重複を除いて数える）。
'use strict';
(function () {
  const C = window.MOVE_CONFIG; if (!C) return;
  const ua = navigator.userAgent;
  const inApp = /\bLine\//i.test(ua) || /FBAN|FBAV|Instagram/i.test(ua) || /[?&]inapp=1/.test(location.search); // inapp=1 は試験用
  const android = /Android/i.test(ua) || /[?&]android=1/.test(location.search);
  const enc = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const dec = str => { const b = atob(str.replace(/-/g, '+').replace(/_/g, '/')); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  async function pack(obj) {
    const raw = new TextEncoder().encode(JSON.stringify(obj));
    if (window.CompressionStream) {
      const st = new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      return 'z' + enc(new Uint8Array(await new Response(st).arrayBuffer()));
    }
    return 'j' + enc(raw);
  }
  async function unpack(s) {
    let bytes = dec(s.slice(1));
    if (s[0] === 'z') bytes = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    return JSON.parse(new TextDecoder().decode(bytes));
  }
  const css = 'position:relative;z-index:9;margin:12px auto 0;max-width:480px;padding:14px 16px;border-radius:14px;font-size:15px;line-height:1.7;background:var(--rv-soft,#faece7);color:var(--rv-ink,#712b13)';
  const btn = 'display:block;width:100%;margin-top:10px;padding:14px;border:0;border-radius:12px;font:inherit;font-size:16px;background:var(--dark,#1f1f1d);color:var(--on-dark,#fff)';
  const box = html => { const d = document.createElement('div'); d.style.cssText = css; d.innerHTML = html; document.body.insertBefore(d, document.body.firstChild); return d; };
  const homeHelp = android
    ? '右上の「︙」を押して、「<b>ホーム画面に追加</b>」（または「アプリをインストール」）を選んでね。'
    : '下の共有ボタン（□に↑）を押して、「<b>ホーム画面に追加</b>」を選んでね。';

  // ---- 引っ越し先：URLに載った記録を取り込む ----
  const m = location.search.match(/[?&]mv=([^&]+)/) || location.hash.match(/[#&]mv=([^&]+)/);
  if (m) {
    window.MOVE_IMPORTING = true;
    const d = box('引っ越し中です…');
    unpack(decodeURIComponent(m[1])).then(data => {
      let cur = null; try { cur = JSON.parse(localStorage.getItem(C.key)); } catch (e) { /* なし */ }
      const logs = (data.log || []).map(l => { const x = { ...l }; delete x.s; return x; });
      let out = data;
      if (cur && Array.isArray(cur.log) && cur.log.length) { // こちらにも記録があれば、記録はまとめ、進み具合は記録の多いほうを採る
        const seen = new Set(cur.log.map(l => `${l.at}|${l.card || l.id}|${l.q}`));
        const add = logs.filter(l => !seen.has(`${l.at}|${l.card || l.id}|${l.q}`));
        out = logs.length > cur.log.length ? { ...data, log: cur.log.concat(add) } : { ...cur, log: cur.log.concat(add) };
        out.log.sort((a, b) => String(a.at).localeCompare(String(b.at)));
      } else out = { ...data, log: logs };
      out.resendVer = data.resendVer;
      localStorage.setItem(C.key, JSON.stringify(out));
      history.replaceState(null, '', location.pathname);
      d.innerHTML = `<b>引っ越し完了！</b>（これまでの記録 ${logs.length}問分）<br>先生への記録も、このあと自動で送り直されます。<br><br>
        <b>最後にひとつだけ：</b>${homeHelp}<br>次からは、ホーム画面のアイコンから開いてね（LINEのリンクからは開かないでね）。
        <button style="${btn}" id="mvgo">はじめる</button>`;
      document.getElementById('mvgo').onclick = () => location.reload();
    }).catch(e => { d.innerHTML = `引っ越しの取り込みに失敗しました（${String(e).slice(0, 80)}）。LINEの画面に戻って、もう一度ボタンを押してね。`; });
    return;
  }

  // ---- LINEなどの中で開いているとき：注意書き＋引っ越しボタン ----
  if (!inApp) return;
  const browser = android ? 'Chrome' : 'Safari';
  if (C.warnOnly) { // 記録を運べないアプリ（教材データや写真を端末に持つ）：開き直しの案内だけ
    window.addEventListener('DOMContentLoaded', () => {
      box(`<b>いまLINEの中で開いています。</b><br>このままだと記録が消えたり、先生に届かなかったりします。${browser}で開き直してから使ってね。
        <button style="${btn}" id="mvbtn">${android ? 'Chromeで開く' : 'URLをコピー（Safariに貼り付けて開く）'}</button><div id="mvmsg" style="margin-top:8px;font-size:13px"></div>`);
      document.getElementById('mvbtn').onclick = async () => {
        if (android) { location.href = `intent://${C.url.replace(/^https:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`; return; }
        try { await navigator.clipboard.writeText(C.url); document.getElementById('mvmsg').textContent = 'コピーしました。Safariを開いて、アドレス欄に貼り付けてね。'; }
        catch (e) { document.getElementById('mvmsg').textContent = '右下の「…」などのメニューから「Safariで開く」を選んでね。'; }
      };
    });
    return;
  }
  window.addEventListener('DOMContentLoaded', () => {
    const d = box(`<b>いまLINEの中で開いています。</b><br>このままだと記録が先生に届かず、消えることもあります。下のボタンで${android ? 'Chrome' : 'Safari'}に引っ越してね（これまでの記録もいっしょに移ります）。
      <button style="${btn}" id="mvbtn">${android ? 'Chromeに引っ越す' : '引っ越し用のリンクをコピー'}</button>
      <div id="mvmsg" style="margin-top:8px;font-size:13px"></div>`);
    document.getElementById('mvbtn').onclick = async () => {
      const msg = document.getElementById('mvmsg');
      try {
        let s = {}; try { s = JSON.parse(localStorage.getItem(C.key)) || {}; } catch (e) { /* 記録なし */ }
        const url = `${C.url}?mv=${await pack(s)}`;
        const copy = async () => { try { await navigator.clipboard.writeText(url); return true; } catch (e) { return false; } };
        if (android) {
          location.href = `intent://${url.replace(/^https:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
          msg.innerHTML = 'Chromeが開かないときは、下のボタンでリンクをコピーし、Chromeのアドレス欄に貼り付けてね。<button style="' + btn + '" id="mvcp">リンクをコピー</button>';
          document.getElementById('mvcp').onclick = async () => { msg.insertAdjacentHTML('beforeend', (await copy()) ? '<br>コピーしました。' : '<br>コピーできませんでした。'); };
        } else {
          msg.innerHTML = (await copy()) ? 'コピーしました。Safariを開いて、アドレス欄に貼り付けて開いてね。' : 'コピーできませんでした。先生に知らせてね。';
        }
      } catch (e) { msg.textContent = '引っ越しの準備に失敗しました：' + String(e).slice(0, 80); }
    };
  });
})();
