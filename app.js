'use strict';
/*
 * 별별 시간표 — 1단계: 뼈대
 * 시작 화면, 부모님 비밀번호(4자리), 프로필, 블록 보관함, 태블릿 내부 저장, 백업
 * 다음 단계(24시간 타임라인, 실행 모드 등)는 설계서 순서대로 이어서 붙인다.
 */

/* ---------- 고정 자료 ---------- */
const ICONS = {
  meal: 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16z M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8z',
  tooth: 'M3 21l10-10 M12 6h8v4h-8z M14 6V4 M17 6V4 M20 6V4',
  bag: 'M5 8h14v12H5z M9 8V6a3 3 0 0 1 6 0v2',
  pencil: 'M4 20l4-1 11-11-3-3L5 16z M14 6l3 3',
  music: 'M9 18V5l11-2v13 M6 21a3 3 0 1 0 0-6a3 3 0 0 0 0 6z M17 19a3 3 0 1 0 0-6a3 3 0 0 0 0 6z',
  book: 'M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4z M20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z',
  drop: 'M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z',
  box: 'M4 8l8-4 8 4v10l-8 4-8-4z M4 8l8 4 8-4 M12 12v10',
  moon: 'M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z',
  ball: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18',
  art: 'M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2-1.5h2a4 4 0 0 0 4-4c0-4.5-4-8-9-8z M7.5 11h.01 M10 7.5h.01 M14.5 7.5h.01',
  run: 'M14 3a2 2 0 1 0 0 4a2 2 0 1 0 0-4z M7 21l3-6 3 2v4 M10 15l1-6 4 3 3-1 M6 11l3-2h3',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  sun: 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8z M12 2v2 M12 20v2 M4 12H2 M22 12h-2 M5 5l1.5 1.5 M17.5 17.5L19 19 M5 19l1.5-1.5 M17.5 6.5L19 5'
};
const COLORS = [
  { id: 'yellow', v: '#FFE08A', name: '노랑' },
  { id: 'mint', v: '#BDEBD3', name: '민트' },
  { id: 'sky', v: '#BFDDFE', name: '하늘' },
  { id: 'peach', v: '#FFC9B0', name: '복숭아' },
  { id: 'lilac', v: '#DCCBFB', name: '보라' },
  { id: 'pink', v: '#FFD1E3', name: '분홍' }
];
const DEFAULT_BLOCKS = [
  ['아침 먹기', 'meal', 'peach', 15, false],
  ['양치하기', 'tooth', 'sky', 5, false],
  ['가방 챙기기', 'bag', 'mint', 5, false],
  ['숙제하기', 'pencil', 'yellow', 20, true],
  ['책 읽기', 'book', 'mint', 15, true],
  ['피아노 연습', 'music', 'lilac', 20, true],
  ['씻기', 'drop', 'sky', 15, false],
  ['정리하기', 'box', 'peach', 10, false]
];
const APP_VERSION = 'v24';  // 코드를 고칠 때마다 sw.js의 VERSION과 함께 올린다
const STAR_PATH = 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z';

/* ---------- 저장소: 태블릿 브라우저 안(IndexedDB), 안 되면 메모리 ---------- */
const store = (() => {
  const DB = 'byeolbyeol', ST = 'kv';
  const mem = {};
  let dbp = null;
  function open() {
    if (!dbp) {
      dbp = new Promise((res, rej) => {
        try {
          const r = indexedDB.open(DB, 1);
          r.onupgradeneeded = () => r.result.createObjectStore(ST);
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
        } catch (e) { rej(e); }
      });
    }
    return dbp;
  }
  function req(mode, fn) {
    return open().then(db => new Promise((res, rej) => {
      const tx = db.transaction(ST, mode);
      const out = fn(tx.objectStore(ST));
      tx.oncomplete = () => res(out && 'result' in out ? out.result : undefined);
      tx.onerror = () => rej(tx.error);
    }));
  }
  return {
    async get(k) { try { return await req('readonly', s => s.get(k)); } catch (e) { return mem[k]; } },
    async set(k, v) { mem[k] = v; try { await req('readwrite', s => s.put(v, k)); return true; } catch (e) { return false; } },
    async del(k) { delete mem[k]; try { await req('readwrite', s => s.delete(k)); } catch (e) { /* 메모리만 */ } },
    async all() {
      try {
        const db = await open();
        return await new Promise((res, rej) => {
          const out = {};
          const c = db.transaction(ST).objectStore(ST).openCursor();
          c.onsuccess = () => { const cur = c.result; if (cur) { out[cur.key] = cur.value; cur.continue(); } else res(out); };
          c.onerror = () => rej(c.error);
        });
      } catch (e) { return Object.assign({}, mem); }
    },
    async clear() { for (const k in mem) delete mem[k]; try { await req('readwrite', s => s.clear()); } catch (e) { /* 메모리만 */ } }
  };
})();

/* ---------- 상태 ---------- */
const S = {
  screen: 'start',
  profiles: [],
  settings: {},
  blocks: {},
  drawings: {},
  draw: null,
  setup: {},
  plans: {},
  expanded: new Set(),
  dayDraft: null,
  editPid: null,
  preview: null,
  history: {},
  g: null,
  scrolled: false,
  scrollTo: null,
  current: null,
  unlockedUntil: 0,
  parentTab: 'kids',
  parentKid: null,
  keypad: null,
  dialog: null,
  toast: null,
  afterUnlock: null
};

/* ---------- 도우미 ---------- */
const $app = document.getElementById('app');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const colorOf = id => (COLORS.find(c => c.id === id) || COLORS[0]).v;
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
// 진동: 갤럭시 탭은 진동, 진동이 없는 아이패드는 짧은 효과음으로 대신한다
let audioCtx = null;
function unlockAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) { /* 소리 없이 계속 */ }
}
function tone(freq, dur, vol, delay) {
  if (!audioCtx || audioCtx.state !== 'running') return;
  const t = audioCtx.currentTime + (delay || 0);
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(t); o.stop(t + dur + 0.02);
}
function vibrate(p) {
  let done = false;
  try { if (navigator.vibrate) done = navigator.vibrate(p); } catch (e) { done = false; }
  if (done || S.settings.sound === false) return;
  try {
    if (Array.isArray(p)) { tone(660, 0.07, 0.05); tone(990, 0.09, 0.05, 0.09); }  // 완료·삭제
    else if (p >= 20) { tone(520, 0.06, 0.06); tone(780, 0.08, 0.06, 0.06); }      // 꾹 눌러서 잡았을 때
    else if (p >= 10) tone(880, 0.05, 0.04);                                        // 톡 누름
    else tone(1400, 0.025, 0.025);                                                  // 5분 칸에 맞춰질 때
  } catch (e) { /* 소리 없이 계속 */ }
}

// 이름 받침: "하늘" → 하늘아 / 하늘이의, "바다" → 바다야 / 바다의
function hasBatchim(name) {
  const ch = String(name).trim().slice(-1);
  const code = ch.charCodeAt(0) - 0xAC00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
}
const callName = n => n + (hasBatchim(n) ? '아' : '야');
const ownerName = n => n + (hasBatchim(n) ? '이의' : '의');
const senderName = n => n + (hasBatchim(n) ? '이가' : '가');

async function hashPin(pin) {
  const text = 'byeolbyeol:' + pin;
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    let h = 0; for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
    return 'x' + h;
  }
}

// 블록 그림: 아이가 그린 그림이 있으면 그 그림, 없으면 기본 그림
function iconHtml(b, size) {
  if (b.icon === 'image' && b.image) return `<img src="${esc(b.image)}" alt="" width="${size}" height="${size}" style="object-fit:contain;border-radius:6px">`;
  return svgIcon(b.icon, size);
}

function svgIcon(key, size, stroke) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke || '#1F2A44'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[key] || ICONS.star || ICONS.sun}"></path></svg>`;
}
const svgStar = size => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR_PATH}" fill="#F5A524" stroke="#8A5A00" stroke-width="1.3" stroke-linejoin="round"></path></svg>`;
const svgLock = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1F2A44" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4"></path></svg>`;

function toast(text) {
  S.toast = text;
  render();
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { S.toast = null; render(); }, 2200);
}

/* ---------- 불러오기·저장 ---------- */
async function loadAll() {
  S.profiles = (await store.get('profiles')) || [];
  S.settings = (await store.get('settings')) || {};
  if (ZOOMS.includes(S.settings.zoom)) PX = S.settings.zoom;
  S.blocks = {};
  S.drawings = {}; S.setup = {}; S.plans = {}; S.history = {}; S.weekPast = {}; S.week = {}; S.marks = {}; S.todayPlan = {}; S.hist = {}; S.ctx = null; S.offer = {}; S.editPid = null; S.preview = null;
  for (const p of S.profiles) {
    S.blocks[p.id] = (await store.get('blocks:' + p.id)) || [];
    S.drawings[p.id] = (await store.get('drawings:' + p.id)) || [];
    S.setup[p.id] = await store.get('setup:' + p.id);
    if (!S.setup[p.id]) { S.setup[p.id] = defaultSetup(); await store.set('setup:' + p.id, S.setup[p.id]); }
    S.week[p.id] = (await store.get('week:' + p.id)) || {};
    S.marks[p.id] = (await store.get('marks:' + p.id)) || {};
    S.todayPlan[p.id] = await loadOrMakeDay(p.id, today());
    S.plans[p.id] = S.todayPlan[p.id];
    await loadHist(p.id);
    S.weekPast[p.id] = 0;
    for (const d of weekDatesBeforeToday()) {
      const day = await store.get('day:' + p.id + ':' + d);
      if (day) S.weekPast[p.id] += day.blocks.reduce((n, b) => n + (b.status === 'done' ? b.stars || 0 : 0), 0);
    }
  }
}
// 이번 주 월요일부터 어제까지 날짜
function weekDatesBeforeToday() {
  const d = new Date(), out = [], back = (d.getDay() + 6) % 7;
  for (let i = back; i >= 1; i--) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i);
    out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`);
  }
  return out;
}
const weekStars = kid => (S.weekPast[kid] || 0) + S.todayPlan[kid].blocks.reduce((n, b) => n + (b.status === 'done' ? b.stars || 0 : 0), 0);
const saveProfiles = () => store.set('profiles', S.profiles);
const saveSettings = () => store.set('settings', S.settings);
const saveBlocks = id => store.set('blocks:' + id, S.blocks[id]);
const saveDrawings = id => store.set('drawings:' + id, S.drawings[id]);
async function addDrawing(kid, image) {
  (S.drawings[kid] = S.drawings[kid] || []).unshift({ id: uid(), image, createdAt: today() });
  await saveDrawings(kid);
}

function makeDefaultBlocks() {
  return DEFAULT_BLOCKS.map(([name, icon, color, minutes, needsCheck]) => ({ id: uid(), name, icon, color, minutes, needsCheck }));
}

/* ---------- 잠금 ---------- */
const isUnlocked = () => S.unlockedUntil === Infinity;
function requireParent(then, title) {
  if (isUnlocked()) { then(); return; }
  S.afterUnlock = then;
  S.keypad = { mode: 'unlock', value: '', msg: '', back: S.screen, title };
  S.screen = 'pin';
  render();
}
// 1분마다 '지금' 선을 옮기고, 날짜가 바뀌면 새 하루를 불러온다
setInterval(async () => {
  const kid = S.current;
  if (kid && S.todayPlan[kid] && S.todayPlan[kid].date !== today()) { S.ctx = null; await loadAll(); if (['todo', 'home', 'run', 'clear', 'op'].includes(S.screen) && !isUnlocked()) S.screen = 'op'; render(); return; }
  const typing = document.activeElement && document.activeElement.tagName === 'INPUT';
  if (S.screen === 'op' && !S.dialog && !S.draw && !S.g && !typing) render();
}, 30000);


/* ---------- 화면 그리기 ---------- */
function render() {
  let html = '';
  switch (S.screen) {
    case 'start': html = viewStart(); break;
    case 'pin': html = viewKeypad(); break;
    case 'profiles': html = viewProfiles(); break;
    case 'home': html = viewHome(); break;
    case 'op': html = viewOp(); break;
    case 'parent': html = viewParent(); break;
    case 'gallery': html = viewGallery(); break;
    case 'run': html = viewRun(); break;
    case 'todo': html = viewTodo(); break;
    case 'clear': html = viewClear(); break;
    case 'confirm': html = viewConfirm(); break;
  }
  if (S.dialog) html += viewDialog();
  if (S.draw) html += viewDraw();
  if (S.toast) html += `<div class="toast" role="status">${esc(S.toast)}</div>`;
  // 그리는 중에 화면이 다시 그려져도 그림이 지워지지 않게 잠시 보관
  const pad = document.getElementById('pad');
  if (S.draw && pad) S.draw.snapshot = pad.toDataURL();
  const oldTl = document.getElementById('timeline');
  const keep = oldTl ? oldTl.scrollTop : null;
  $app.innerHTML = html;
  if (S.draw) setupPad();
  const tl = document.getElementById('timeline');
  if (tl) {
    if (S._targetY != null) {
      const target = Math.max(0, S._targetY - tl.clientHeight / 3);
      if (S.scrolled && tl.scrollTo && !matchMedia('(prefers-reduced-motion: reduce)').matches) { tl.scrollTop = keep || 0; tl.scrollTo({ top: target, behavior: 'smooth' }); }
      else tl.scrollTop = target;
      S.scrolled = true;
    }
    else if (!S.scrolled) { tl.scrollTop = Math.max(0, (S._nowY || 0) - 180); S.scrolled = true; }
    else if (keep != null) tl.scrollTop = keep;
    S._targetY = null;
  }
}

function viewStart() {
  return `<main class="screen start">
    <div class="start-stars">${svgStar(90)}${svgStar(130)}${svgStar(90)}</div>
    <h1>별별 시간표</h1>
    <p>오늘도 내 시간은 내가 정해요</p>
    <button class="btn btn-go btn-big" data-action="start">시작하기</button>
  </main>`;
}

function viewKeypad() {
  const k = S.keypad;
  const titles = {
    setup1: '부모님 비밀번호 4자리를 정해 주세요',
    setup2: '한 번 더 눌러 주세요',
    unlock: '부모님 비밀번호',
    change1: '새 비밀번호 4자리',
    change2: '새 비밀번호를 한 번 더'
  };
  const dots = [0, 1, 2, 3].map(i => `<span class="dot${i < k.value.length ? ' on' : ''}"></span>`).join('');
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'cancel'].map(n => {
    if (n === 'back') return `<button data-action="key" data-k="back" aria-label="지우기">←</button>`;
    if (n === 'cancel') return k.mode === 'setup1' || k.mode === 'setup2'
      ? '<span></span>'
      : `<button data-action="key" data-k="cancel" aria-label="취소" style="font-size:20px">취소</button>`;
    return `<button data-action="key" data-k="${n}">${n}</button>`;
  }).join('');
  const help = k.mode.startsWith('setup') ? '<p class="help" style="text-align:center">부모님 메뉴(블록 만들기, 별 확인)를 열 때 써요. 아이에게는 비밀이에요.</p>' : '';
  return `<main class="screen"><div class="keypad-wrap">
    <h2>${esc(k.title || titles[k.mode])}</h2>${help}
    <div class="dots${k.shake ? ' shake' : ''}" aria-label="${k.value.length}자리 입력됨">${dots}</div>
    <div class="msg" role="alert">${esc(k.msg)}</div>
    <div class="keypad">${keys}</div>
  </div></main>`;
}

function viewProfiles() {
  const cards = S.profiles.map(p => `<button class="profile-card" data-action="open-profile" data-id="${p.id}">
      <span class="avatar" style="background:${colorOf(p.color)}">${esc(p.name.slice(0, 1))}</span>
      <span>${esc(p.name)}</span>
    </button>`).join('');
  const last = S.settings.lastBackup;
  const stale = S.profiles.length && (!last || (Date.now() - new Date(last).getTime()) > 7 * 864e5);
  const banner = stale ? `<div class="banner"><span>${last ? `마지막 백업이 ${esc(last)}이에요.` : '아직 백업한 적이 없어요.'} 일주일에 한 번 백업해 두면 안전해요.</span><button class="btn" data-action="go-backup">백업하러 가기</button></div>` : '';
  const body = S.profiles.length
    ? `<div class="profiles">${cards}</div>`
    : `<div class="empty"><h2>아이를 먼저 추가해 주세요</h2><p class="help">부모님 메뉴에서 아이 이름과 색을 정하면, 기본 블록 8개가 함께 만들어져요.</p><button class="btn btn-dark" data-action="go-parent-add">아이 추가하기</button></div>`;
  return `<main class="screen">
    <div class="topbar">
      <div class="topbar-left"><h1 class="title-big">누구의 시간표를 열까요?</h1></div>
      <div class="topbar-right"><button class="btn btn-icon" data-action="go-parent" aria-label="부모님 메뉴">${svgLock}</button></div>
    </div>
    ${banner}${body}
  </main>`;
}

function blockCard(b, action) {
  const attrs = action ? `data-action="${action}" data-id="${b.id}"` : 'disabled';
  return `<button class="block-card" style="background:${colorOf(b.color)}" ${attrs}>
    <span class="block-icon">${iconHtml(b, b.icon === 'image' ? 68 : 44)}</span>
    <span class="block-name">${esc(b.name)}</span>
    <span class="block-meta">기본 ${b.minutes}분${b.needsCheck ? '<span class="chip">확인 필요</span>' : ''}</span>
  </button>`;
}

function giftBadge(kid) {
  const gifts = (S.drawings[kid] || []).filter(g => g.unseen).length;
  return gifts ? `<span class="badge">선물 ${gifts}</span>` : '';
}

function kidTopbar(p, tab) {
  if (S.ctx) return planEditTopbar(p, tab);
  return `<div class="topbar">
      <div class="topbar-left">
        <span class="avatar" style="background:${colorOf(p.color)}">${esc(p.name.slice(0, 1))}</span>
        <div><h1 class="title-big">${esc(ownerName(p.name))} 하루</h1><p class="sub">${esc(new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }))}</p></div>
        <div class="tabs" role="tablist">
          <button role="tab" data-action="go-todo" aria-selected="${tab === 'todo'}">오늘의 할 일</button>
          <button role="tab" data-action="go-home" aria-selected="${tab === 'home'}">오늘 시간표</button>
        </div>
      </div>
      <div class="topbar-right">
        <button class="btn btn-plan" data-action="go-plan">${svgLock}계획하기</button>
        <span class="week-stars">${svgStar(26)}이번 주 별 ${weekStars(p.id)}개</span>
        <button class="btn btn-art" data-action="go-gallery">${svgIcon('art', 26)}그림${giftBadge(p.id)}</button>
        <button class="btn" data-action="go-profiles">다른 사람</button>
        <button class="btn btn-icon" data-action="go-parent" aria-label="부모님 메뉴">${svgLock}</button>
      </div>
    </div>`;
}

function viewHome() {
  const p = S.profiles.find(x => x.id === S.current);
  if (!p) { S.screen = 'profiles'; return viewProfiles(); }
  const empty = !S.plans[p.id].blocks.length;
  return editorFrame(p, 'home', `
    <div class="home-body home-wide">
      <section class="panel tl-panel" aria-labelledby="today-title">
        <div class="section-head"><h2 id="today-title">${S.ctx ? '시간표' : '오늘 시간표'}</h2><span class="sub">${ctxWeekend(p.id) ? '주말' : '평일'}${S.ctx ? '' : ` · ${miniClock(nowMin(), 22)} 지금 ${ampm(nowMin())} ${clockText(nowMin())}`}</span><span class="tl-tools">${S.editPid ? '<button class="btn btn-sm btn-go btn-done" data-action="edit-done">다 고쳤어요</button>' : ''}${(S.history[p.id] || []).length ? '<button class="btn btn-sm" data-action="undo">' + svgUndo + '되돌리기</button>' : ''}<button class="btn btn-sm btn-icon" data-action="zoom" data-d="-1" aria-label="작게 보기" ${PX === ZOOMS[0] ? 'disabled' : ''}>−</button><button class="btn btn-sm btn-icon" data-action="zoom" data-d="1" aria-label="크게 보기" ${PX === ZOOMS[ZOOMS.length - 1] ? 'disabled' : ''}>+</button></span></div>
        ${S.editPid ? '<p class="help tl-tip">끌어서 옮기고, 아래 손잡이를 당기면 시간이 바뀌어요. 빈 곳을 끌면 시간표가 넘어가요. 다 고쳤으면 빈 곳을 톡 누르거나 "다 고쳤어요"를 눌러요.</p>' : ''}
        ${empty ? `<div class="now-strip now-idle"><span class="now-text"><b>아직 할 일이 없어요</b><small>할 일에서 블록을 넣으면 시간표가 저절로 채워져요</small></span><button class="btn btn-go" data-action="go-todo">할 일 넣으러 가기</button></div>` : ''}
        <div id="timeline" class="tl-scroll">${timelineHtml(p)}</div>
      </section>
    </div>`);
}

/* ---------- 편집 모드 (부모님) ---------- */
const ED_MENU = [['confirm', '확인 대기', 'M5 12l4 4 10-10'], ['meeting', '가족 회의', 'M8 11a3 3 0 1 0 0-6a3 3 0 1 0 0 6z M16 11a3 3 0 1 0 0-6a3 3 0 1 0 0 6z M2 20c0-3 3-5 6-5s6 2 6 5 M12 20c0-3 2-5 5-5s5 2 5 5'], ['blocks', '할 일 블록', 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z'], ['week', '요일별 할 일', 'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4'], ['special', '특별한 날', STAR_PATH], ['day', '하루 시간', 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z M12 7v5l3 2'], ['settings', '아이·설정', 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8z M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2']];
const edTabNow = () => S.ctx ? (S.ctx.kind === 'week' ? 'week' : 'special') : (ED_MENU.some(m => m[0] === S.parentTab) ? S.parentTab : 'week');
function editShell(content) {
  const tab = edTabNow();
  const kids = S.profiles.map(k => `<button class="ed-kid" data-action="ed-kid" data-id="${k.id}" aria-pressed="${k.id === S.current}">${esc(k.name)}</button>`).join('');
  const nav = ED_MENU.map(([id, label, d]) => `<button class="ed-nav-item" data-action="ed-go" data-tab="${id}" ${tab === id ? 'aria-current="page"' : ''}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"></path></svg>${label}${id === 'confirm' && S.current && pendingConfirms(S.current).length ? `<span class="badge ed-badge">${pendingConfirms(S.current).length}</span>` : ''}</button>${id === 'meeting' ? '<span class="ed-nav-sep"></span>' : ''}`).join('');
  return `<main class="ed">
    <header class="ed-top"><span class="ed-chip">편집 모드</span><div class="ed-kids">${kids}</div><button class="btn ed-exit" data-action="ed-exit">${svgLock}편집 끝내기</button></header>
    <div class="ed-body"><nav class="ed-nav" aria-label="편집 메뉴">${nav}<p class="ed-soon">나중에 추가: 목표·보상 관리 · 기록 보기</p></nav>
      <section class="ed-main">${content}</section></div>
  </main>`;
}
function viewParent() {
  const tab = edTabNow();
  if (!S.current || !S.profiles.some(k => k.id === S.current)) S.current = S.profiles.length ? S.profiles[0].id : null;
  S.parentKid = S.current;
  if (!S.current && tab !== 'settings') S.parentTab = 'settings';
  let body;
  if (!S.current || S.parentTab === 'settings') body = parentSettings();
  else if (tab === 'blocks') body = parentBlocks();
  else if (tab === 'day') body = parentDay();
  else if (tab === 'confirm') body = parentConfirm();
  else if (tab === 'meeting') body = parentMeeting();
  else if (tab === 'special') body = `<div class="ed-head"><h1>특별한 날</h1></div>${planMonthHtml(S.current)}`;
  else body = parentBlocks();
  return editShell(body);
}
function parentSettings() {
  return `${parentKids()}${S.profiles.length ? '' : ''}
    <h3 class="sub-head">비밀번호</h3><div class="row"><div class="grow"><span class="name">편집 모드 비밀번호</span><span class="sub">편집 모드와 "오늘 바꾸기" 확인에 써요</span></div><button class="btn" data-action="change-pin">바꾸기</button></div>
    ${parentBackup().replace('<h2>백업</h2>', '<h3 class="sub-head">백업</h3>')}
    <h3 class="sub-head">앱</h3><div class="row"><div class="grow"><span class="name">앱 버전 ${APP_VERSION}</span><span class="sub">두 기기의 버전이 같은지 확인해요</span></div><button class="btn" data-action="reload-app">새로 고침</button></div>`;
}

/* 편집기(할 일·시간표)를 감싸는 틀: 편집 모드 / 오늘 바꾸기 */
function editorFrame(p, view, inner) {
  const c = S.ctx;
  const seg = `<div class="seg-switch" role="tablist"><button role="tab" data-action="go-todo" aria-selected="${view === 'todo'}">할 일</button><button role="tab" data-action="go-home" aria-selected="${view === 'home'}">시간표</button></div>`;
  if (c && c.kind === 'change') {
    return `<main class="screen screen-fit change">
      <header class="change-bar"><div class="change-title"><b>오늘 할 일 바꾸는 중</b><small>다 바꾸면 엄마·아빠 확인을 받아야 오늘 시간표에 들어가요</small></div>${seg}
        <div class="change-actions"><button class="btn" data-action="change-cancel">그만두기</button><button class="btn btn-go" data-action="change-done">다 바꿨어요</button></div></header>
      ${inner}</main>`;
  }
  if (c && c.kind === 'week') {
    return editShell(`<div class="ed-head"><h1>요일별 할 일</h1>${seg}<span class="spacer"></span><button class="btn btn-sm" data-action="plan-copy" data-dow="${c.dow}">${DAY_NAMES[c.dow]}요일을 다른 요일에 복사</button></div>
      ${weekDayBar(p.id, view)}<div class="ed-editor">${inner}</div>`);
  }
  if (c && c.kind === 'date') {
    const sub = S.plans[p.id].edited ? '이날만 따로 짠 계획이에요' : `${DOW_FULL[templateDow(p.id, c.date)]} 기본 시간표를 따르고 있어요. 고치면 이날만 바뀌어요`;
    return editShell(`<div class="ed-head"><button class="btn btn-sm" data-action="ed-go" data-tab="special">← 달력</button><h1>${esc(dateLabel(c.date))}</h1>${seg}<span class="ed-sub">${esc(sub)}</span></div><div class="ed-editor">${inner}</div>`);
  }
  S.screen = 'op'; return viewOp();
}

/* ---------- 운용 모드 (아이) ---------- */
const OP_TABS = [['today', '오늘', 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8z M12 2v2 M12 20v2 M4 12H2 M22 12h-2 M5 5l1.5 1.5 M17.5 17.5L19 19 M5 19l1.5-1.5 M17.5 6.5L19 5'], ['timeline', '시간표', 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z M12 7v5l3 2'], ['week', '이번 주', 'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4'], ['rewards', '별·보상', STAR_PATH]];
function viewOp() {
  const p = S.profiles.find(x => x.id === S.current);
  if (!p) { S.screen = 'profiles'; return viewProfiles(); }
  if (S.ctx) closeCtx();
  const tab = S.opTab || 'today';
  const titles = { today: `${ownerName(p.name)} ${DOW_FULL[new Date().getDay()]}`, timeline: '오늘 시간표', week: '이번 주 할 일', rewards: '별과 보상' };
  const subs = { today: `${new Date().getMonth() + 1}월 ${new Date().getDate()}일 · 지금 ${ampm(nowMin())} ${clockText(nowMin())}${(S.marks[p.id][today()] || {}).label ? ' · ' + S.marks[p.id][today()].label : ''}`, timeline: '보기만 해요. 바꾸고 싶으면 "오늘"에서 바꿔요', week: '엄마·아빠와 함께 정한 계획이에요', rewards: '' };
  let body;
  if (tab === 'timeline') body = `<section class="panel tl-panel op-tl"><div class="section-head"><span class="sub">${miniClock(nowMin(), 22)} 지금 ${ampm(nowMin())} ${clockText(nowMin())}</span><span class="tl-tools"><button class="btn btn-sm btn-icon" data-action="zoom" data-d="-1" aria-label="작게 보기" ${PX === ZOOMS[0] ? 'disabled' : ''}>−</button><button class="btn btn-sm btn-icon" data-action="zoom" data-d="1" aria-label="크게 보기" ${PX === ZOOMS[ZOOMS.length - 1] ? 'disabled' : ''}>+</button></span></div><div id="timeline" class="tl-scroll">${timelineHtml(p)}</div></section>`;
  else if (tab === 'week') body = opWeekHtml(p.id);
  else if (tab === 'rewards') body = opRewardsHtml(p.id);
  else body = opTodayHtml(p.id);
  const tabs = OP_TABS.map(([id, label, d]) => `<button class="op-tab" data-action="op-tab" data-tab="${id}" ${tab === id ? 'aria-current="page"' : ''}><span class="op-tab-pill"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"></path></svg></span>${label}${id === 'rewards' ? giftBadge(p.id) : ''}</button>`).join('');
  return `<main class="op">
    <header class="op-top"><div class="op-who"><span class="avatar" style="background:${colorOf(p.color)}">${esc(p.name.slice(0, 1))}</span><div><h1 class="title-big">${esc(titles[tab])}</h1>${subs[tab] ? `<p class="sub">${esc(subs[tab])}</p>` : ''}</div></div>
      <div class="op-right"><span class="week-stars">${svgStar(24)}이번 주 별 ${weekStars(p.id)}개</span>${S.profiles.length > 1 ? '<button class="btn" data-action="go-profiles">다른 사람</button>' : ''}<button class="btn btn-icon" data-action="go-parent" aria-label="편집 모드 (부모님)">${svgLock}</button></div></header>
    <div class="op-body op-${tab}">${body}</div>
    <nav class="op-tabs" aria-label="화면">${tabs}</nav>
  </main>`;
}
function opTodayHtml(kid) {
  const plan = S.todayPlan[kid], b = nextTodo(kid), missed = missedOf(kid), nm = nowMin();
  let hero;
  if (!plan.blocks.length) hero = `<div class="op-hero op-hero-empty"><b>오늘 할 일이 아직 없어요</b><p>엄마·아빠와 함께 정해요</p><button class="btn btn-go run-mid" data-action="change-start">오늘 할 일 정하기</button></div>`;
  else if (!b) hero = `<div class="op-hero op-hero-done">${svgStar(90)}<b>${missed.length ? '이제 남은 일정은 없어요' : dayCleared(plan) ? '오늘 하루 클리어!' : '오늘 할 일을 다 했어요!'}</b><p>${missed.length ? '놓친 일을 지금 해도 별을 받을 수 있어요' : plan.blocks.some(x => !x.confirmed) ? '엄마·아빠 확인을 받으면 하루 클리어예요' : `오늘 별 ${plan.blocks.reduce((n, x) => n + (x.stars || 0), 0)}개${streakOf(kid) >= 2 ? ` · ${streakOf(kid)}일 연속 클리어` : ''}`}</p></div>`;
  else {
    const t = templateOf(kid, b), a = toM(b.start), running = b.status === 'running';
    const left = running ? Math.ceil((b.startedAtMs + b.minutes * 60000 - Date.now()) / 60000) : 0;
    const label = running ? '하는 중이에요' : a <= nm ? '지금 할 시간이에요!' : `다음 할 일 · ${a - nm < 60 ? `${a - nm}분 뒤` : `${ampm(a)} ${clockText(a)}`}`;
    const after = plan.blocks.filter(x => isPending(x) && x.pid !== b.pid && toM(x.start) >= a).sort((x, y) => toM(x.start) - toM(y.start))[0];
    hero = `<div class="op-hero${running || a <= nm ? ' op-hero-now' : ''}"><span class="op-hero-label">${label}</span>
      <div class="op-hero-what"><span class="run-icon op-icon" style="background:${colorOf(t.color)}">${iconHtml(t, t.icon === 'image' ? 120 : 64)}</span>
        <div class="run-name"><b>${esc(t.name)}</b><span class="run-when">${ampm(a)} ${clockText(a)} ~ ${clockText(a + b.minutes)} · ${b.minutes}분</span>${t.needsCheck ? '<small>다 하면 엄마·아빠 확인</small>' : ''}</div></div>
      <button class="btn btn-go run-big" data-action="${running ? 'run-open' : 'op-start'}" data-id="${b.pid}">${running ? (left > 0 ? `이어서 하기 · ${left}분 남음` : '이어서 하기') : '시작하기'}</button>
      ${after ? `<div class="run-next"><span class="sub">그다음</span><b>${esc(templateOf(kid, after).name)}</b><span>${clockText(toM(after.start))}</span></div>` : ''}</div>`;
  }
  const segs = segList(kid).concat(plan.blocks.some(x => segOf(kid, x).id === 'etc') ? [etcSeg(kid)] : []);
  const fixed = todayFixed(kid);
  const list = segs.map(sg => {
    const items = plan.blocks.filter(x => segOf(kid, x).id === sg.id).map(x => ({ x, m: toM(x.start) }))
      .concat(fixed.filter(f => !f.fold && toM(f.start) >= toM(sg.start) && toM(f.start) < toM(sg.end)).map(f => ({ f, m: toM(f.start) })))
      .sort((p, q) => p.m - q.m);
    if (!items.length) return '';
    return `<div class="op-seg"><span class="op-seg-name">${esc(sg.name)}</span>${items.map(({ x, f, m }) => {
      if (f) return `<div class="op-row op-row-fixed"><span class="op-time">${clockText(m)}</span><span class="tl-icon op-row-icon" style="background:#E4E7EE">${svgLock}</span><span class="op-row-name">${esc(f.name)}</span></div>`;
      const t = templateOf(kid, x), missedOne = isPending(x) && endOf(x) <= nm, isNext = b && b.pid === x.pid;
      const state = x.status === 'done' ? starRow(x.stars, !x.confirmed, 18) : x.status === 'running' ? '<span class="chip chip-run">하는 중</span>' : missedOne ? `<span class="op-missed">${x.redo ? '다시 해 봐요' : '놓쳤어요'}</span>` : isNext ? '<span class="op-nowtag">다음!</span>' : '';
      return `<button class="op-row${isNext ? ' op-row-next' : ''}${x.status === 'done' ? ' op-row-done' : ''}" data-action="open-placed" data-id="${x.pid}"><span class="op-time">${clockText(m)}</span><span class="tl-icon op-row-icon" style="background:${colorOf(t.color)}">${iconHtml(t, t.icon === 'image' ? 34 : 20)}</span><span class="op-row-name">${esc(t.name)}</span>${state}</button>`;
    }).join('')}</div>`;
  }).join('');
  const doneN = plan.blocks.filter(x => x.status === 'done').length;
  return `${hero}
    <section class="panel op-list"><div class="section-head"><h2>오늘 할 일</h2><span class="sub">${plan.blocks.length ? `${plan.blocks.length}개 중 ${doneN}개 했어요` : ''}</span>${missed.length ? `<button class="btn btn-sm btn-missed" data-action="open-missed">놓친 일 ${missed.length}개</button>` : ''}</div>
      <div class="op-list-body">${list || '<p class="help">아직 할 일이 없어요.</p>'}</div>
      ${pendingConfirms(kid).length ? `<button class="op-confirm" data-action="confirm-ask">${starRow(1, true, 30)}<span><b>엄마·아빠 확인 받기</b><small>확인 기다리는 별 ${pendingStars(kid)}개</small></span></button>` : ''}
      ${new Date().getDay() === 0 ? `<button class="op-meet" data-action="meet-open"><b>오늘은 가족 회의 날!</b><small>엄마·아빠와 이번 주를 돌아봐요</small></button>` : ''}
      <button class="btn op-change" data-action="change-start">오늘 할 일 바꾸고 싶어요</button></section>`;
}
// 이번 주(월~일) 보기: 지난 날은 저장된 기록, 오늘은 오늘, 앞으로는 계획(따로 짠 날 또는 요일 기본)
function opWeekHtml(kid) {
  const info = S.opWeek && S.opWeek.kid === kid && S.opWeek.at === today() ? S.opWeek.days : null;
  if (!info) loadOpWeek(kid);
  const base = new Date(), monday = new Date(base.getFullYear(), base.getMonth(), base.getDate() - (base.getDay() + 6) % 7);
  const cols = [0, 1, 2, 3, 4, 5, 6].map(i => {
    const x = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i), d = dateKey(x), w = x.getDay();
    const plan = d === today() ? S.todayPlan[kid] : (info && info[d]) || makeDayFromTemplate(kid, d);
    const mark = S.marks[kid][d], past = d < today();
    const stars = plan.blocks.reduce((n, b) => n + (b.status === 'done' ? b.stars || 0 : 0), 0);
    const items = plan.blocks.slice().sort((a, b) => toM(a.start) - toM(b.start)).map(b => { const t = templateOf(kid, b); return `<div class="pw-block" style="background:${colorOf(t.color)}"><span class="tl-icon pw-icon">${iconHtml(t, t.icon === 'image' ? 30 : 18)}</span><span class="pw-text"><span class="pw-name">${esc(t.name)}</span><span class="pw-time">${clockText(toM(b.start))}${b.status === 'done' ? ' · 별 ' + (b.stars || 0) : ''}</span></span></div>`; }).join('');
    return `<section class="pw-col${d === today() ? ' pw-today' : ''}${w === 0 || w === 6 ? ' pw-weekend' : ''}${past ? ' pw-past' : ''}">
      <div class="pw-head"><b>${DAY_NAMES[w]}</b><span>${x.getMonth() + 1}/${x.getDate()}</span></div>
      ${mark ? `<span class="pm-tag ${mark.type === 'off' ? 'pm-off' : 'pm-special'}">${esc(mark.label)}</span>` : ''}
      ${past && stars ? `<span class="pw-stars">${svgStar(16)} 별 ${stars}개</span>` : ''}
      <div class="pw-list">${items || '<p class="help">할 일이 없어요</p>'}</div></section>`;
  }).join('');
  return `<div class="pw-grid">${cols}</div>`;
}
async function loadOpWeek(kid) {
  if (S._opWeekLoading === kid) return;
  S._opWeekLoading = kid;
  const base = new Date(), days = {};
  const monday = new Date(base.getFullYear(), base.getMonth(), base.getDate() - (base.getDay() + 6) % 7);
  for (let i = 0; i < 7; i++) {
    const d = dateKey(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
    if (d === today()) continue;
    const stored = await store.get('day:' + kid + ':' + d);
    if (stored && (d < today() || stored.edited !== false)) days[d] = stored;
  }
  S.opWeek = { kid, at: today(), days };
  S._opWeekLoading = null;
  if (S.screen === 'op' && S.opTab === 'week' && !S.dialog) render();
}
function opRewardsHtml(kid) {
  const info = S.opWeek && S.opWeek.kid === kid && S.opWeek.at === today() ? S.opWeek.days : null;
  if (!info) loadOpWeek(kid);
  const base = new Date(), monday = new Date(base.getFullYear(), base.getMonth(), base.getDate() - (base.getDay() + 6) % 7);
  const per = [0, 1, 2, 3, 4, 5, 6].map(i => {
    const x = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i), d = dateKey(x);
    const plan = d === today() ? S.todayPlan[kid] : info && info[d];
    return { w: x.getDay(), n: plan ? plan.blocks.reduce((s, b) => s + (b.status === 'done' ? b.stars || 0 : 0), 0) : 0, isT: d === today() };
  });
  const max = Math.max(10, ...per.map(x => x.n));
  const todayStars = per.find(x => x.isT).n;
  const bars = per.map(x => `<div class="rw-bar"><span>${x.n || ''}</span><i style="height:${Math.max(4, Math.round(x.n / max * 150))}px;background:${x.isT ? '#F5C76A' : x.n ? '#F5A524' : '#E3E8F2'}"></i><small>${DAY_NAMES[x.w]}</small></div>`).join('');
  const art = (S.drawings[kid] || []).slice(0, 4).map(g => `<button class="art-tile rw-art${g.unseen ? ' art-gift' : ''}" data-action="go-gallery"><img src="${esc(g.image)}" alt="내 그림"></button>`).join('');
  return `<section class="panel rw-box"><span class="sub">이번 주 모은 별</span>${svgStar(110)}<b class="rw-big">${weekStars(kid)}개</b><p class="sub">오늘 ${todayStars}개${pendingStars(kid) ? ` · 확인 기다리는 별 ${pendingStars(kid)}개` : ''}</p>${streakOf(kid) ? `<span class="rw-streak">연속 클리어 ${streakOf(kid)}일째</span>` : ''}${pendingStars(kid) ? `<button class="btn btn-go" data-action="confirm-ask">엄마·아빠 확인 받기</button>` : ''}<p class="help">보물상자와 보상은 엄마·아빠와 함께 정해요 (곧 생겨요)</p></section>
    <section class="panel rw-week"><h2>요일별 별</h2><div class="rw-bars">${bars}</div></section>
    <section class="panel rw-art-panel"><div class="section-head"><h2>내 그림</h2>${giftBadge(kid)}</div><div class="rw-art-grid">${art || '<p class="help">아직 그림이 없어요</p>'}</div><button class="btn btn-art run-mid" data-action="go-gallery">그림 보관함</button></section>`;
}

/* 오늘 바꾸기 → 부모님 확인 */
function changeDiff(before, after) {
  const A = new Map(before.map(b => [b.pid, b])), B = new Map(after.map(b => [b.pid, b]));
  const out = [];
  after.forEach(b => { if (!A.has(b.pid)) out.push({ mark: '+', cls: 'add', name: b.name, detail: `${clockText(toM(b.start))} · ${b.minutes}분` }); });
  before.forEach(b => { if (!B.has(b.pid)) out.push({ mark: '−', cls: 'del', name: b.name, detail: '오늘은 빼기' }); });
  after.forEach(b => { const o = A.get(b.pid); if (o && (o.start !== b.start || o.minutes !== b.minutes)) out.push({ mark: '→', cls: 'mov', name: b.name, detail: `${clockText(toM(o.start))}${o.minutes !== b.minutes ? ` ${o.minutes}분` : ''} → ${clockText(toM(b.start))}${o.minutes !== b.minutes ? ` ${b.minutes}분` : ''}` }); });
  return out;
}
async function applyChange(scope) {
  const kid = S.current, tp = S.todayPlan[kid];
  tp.blocks = JSON.parse(JSON.stringify(S.plans[kid].blocks));
  tp.edited = true;
  await store.set('day:' + kid + ':' + today(), tp);
  const dow = new Date().getDay();
  if (scope === 'week') { S.week[kid][dow] = { dow, blocks: tp.blocks.map(cleanBlock) }; await store.set('week:' + kid, S.week[kid]); }
  closeCtx(); S.unlockedUntil = 0; S.screen = 'op'; S.opTab = 'today'; S.opWeek = null;
  toast(scope === 'week' ? `바꿨어요! 앞으로 ${DOW_FULL[dow]}마다 이렇게 해요` : '바꿨어요! 오늘만 이렇게 해요');
}
const modeActions = {
  'op-tab'(el) { S.opTab = el.dataset.tab; S.scrolled = false; render(); },
  'op-start'(el) { S.dialog = null; S.runPid = el.dataset.id; S.runResult = null; S.screen = 'run'; S._runPhase = null; actions['run-start'](); },
  'change-start'() {
    const kid = S.current;
    S.ctx = { kind: 'change' }; S.editPid = null; S.history[kid] = []; S.tdSel = null; S.scrolled = false;
    S.changeOrig = JSON.parse(JSON.stringify(S.todayPlan[kid].blocks));
    S.plans[kid] = { date: today(), blocks: JSON.parse(JSON.stringify(S.todayPlan[kid].blocks)), edited: true };
    S.screen = 'todo'; render();
  },
  'change-cancel'() { closeCtx(); S.screen = 'op'; render(); },
  'change-done'() {
    const kid = S.current, diff = changeDiff(S.changeOrig, S.plans[kid].blocks);
    if (!diff.length) { closeCtx(); S.screen = 'op'; toast('바뀐 게 없어요'); return; }
    S.dialog = { type: 'change-confirm', diff }; render();
  },
  'change-apply'(el) {
    const scope = el.dataset.scope;
    S.dialog = null;
    requireParent(() => { applyChange(scope); }, '엄마·아빠 확인');
  },
  'ed-go'(el) {
    const tab = el.dataset.tab;
    if (tab === 'week') { const d = S.ctx && S.ctx.kind === 'week' ? S.ctx.dow : new Date().getDay(); closeCtx(); openCtx({ kind: 'week', dow: d, also: [d] }, S.screen === 'home' ? 'home' : 'todo'); return; }
    closeCtx(); S.parentTab = tab; S.screen = 'parent'; S.calInfo = null; render();
  },
  'ed-kid'(el) {
    const c = S.ctx, scr = S.screen;
    if (c) closeCtx();
    S.current = S.parentKid = el.dataset.id; S.dayDraft = null; S.calInfo = null;
    if (c && c.kind === 'week') { openCtx({ kind: 'week', dow: c.dow, also: [c.dow] }, scr); return; }
    S.screen = 'parent'; render();
  },
  'ed-exit'() { closeCtx(); S.unlockedUntil = 0; S.dayDraft = null; S.screen = S.current ? 'op' : 'profiles'; S.scrolled = false; render(); }
};

/* ---------- 6단계: 부모님 확인 · 하루 클리어 · 가족 회의 ---------- */
const HIST_DAYS = 42;
const addDays = (d, n) => { const x = dateObj(d); return dateKey(new Date(x.getFullYear(), x.getMonth(), x.getDate() + n)); };
const mondayOf = d => addDays(d, -((dateObj(d).getDay() + 6) % 7));
// 지난 기록 (오늘 빼고 최근 6주)
async function loadHist(kid) {
  const days = {};
  for (let i = 1; i <= HIST_DAYS; i++) {
    const d = addDays(today(), -i), r = await store.get('day:' + kid + ':' + d);
    if (r && r.blocks && r.blocks.length) days[d] = r;
  }
  S.hist[kid] = days;
}
const dayRec = (kid, d) => d === today() ? S.todayPlan[kid] : (S.hist[kid] || {})[d];
const sumStars = (bl, onlyConfirmed) => bl.reduce((n, b) => n + (b.status === 'done' && (!onlyConfirmed || b.confirmed) ? b.stars || 0 : 0), 0);
// 하루 클리어 = 할 일을 모두 하고, 확인이 필요한 일은 모두 확인받음
const dayCleared = p => !!(p && p.blocks.length && p.blocks.every(b => b.status === 'done' && b.confirmed));
// 확인 기다리는 일 (오늘 + 지난 날)
function pendingConfirms(kid) {
  const out = [];
  const add = (d, p) => p && p.blocks.forEach(b => { if (b.status === 'done' && !b.confirmed) out.push({ d, b }); });
  add(today(), S.todayPlan[kid]);
  Object.keys(S.hist[kid] || {}).sort().reverse().forEach(d => add(d, S.hist[kid][d]));
  return out;
}
// "아직이에요"로 돌려보낸 일 (다시 하기 전까지 되돌릴 수 있게 보여 준다)
function redoList(kid) {
  const out = [];
  const add = (d, p) => p && p.blocks.forEach(b => { if (b.redo && b.redoPrev && b.status !== 'done') out.push({ d, b }); });
  add(today(), S.todayPlan[kid]);
  Object.keys(S.hist[kid] || {}).forEach(d => add(d, S.hist[kid][d]));
  return out;
}
const REDO_KEYS = ['status', 'startedAtMs', 'endAt', 'stars', 'confirmed', 'ext', 'baseMinutes', 'fast', 'minutes'];
const pendingStars = kid => pendingConfirms(kid).reduce((n, x) => n + (x.b.stars || 0), 0);
// 연속 클리어: 오늘은 아직 안 끝났으면 건너뛰고, 할 일이 없던 날도 건너뛴다
function streakOf(kid) {
  let n = 0;
  if (dayCleared(S.todayPlan[kid])) n++;
  for (let i = 1; i <= HIST_DAYS; i++) {
    const p = (S.hist[kid] || {})[addDays(today(), -i)];
    if (!p || !p.blocks.length) continue;
    if (dayCleared(p)) n++; else break;
  }
  return n;
}
const relDay = d => d === today() ? '오늘' : d === addDays(today(), -1) ? '어제' : dateLabel(d);
async function saveDayRec(kid, d) {
  const p = dayRec(kid, d);
  if (p) await store.set('day:' + kid + ':' + d, p);
}
async function confirmItems(kid, items) {
  const days = new Set();
  items.forEach(({ d, b }) => { b.confirmed = true; days.add(d); });
  for (const d of days) await saveDayRec(kid, d);
}
function confirmRowsHtml(kid, items, mode) {
  const groups = {};
  items.forEach(it => (groups[it.d] = groups[it.d] || []).push(it));
  return Object.keys(groups).sort().reverse().map(d => {
    const p = dayRec(kid, d), clr = dayCleared(p);
    const rows = groups[d].map(({ b }) => {
      const t = templateOf(kid, b), done = b.confirmed, just = S.confirmJust && S.confirmJust.has(b.pid);
      if (b.redo && b.status !== 'done') {
        const pv = b.redoPrev || {};
        return `<div class="cf-row cf-redo"><span class="tl-icon cf-icon" style="background:${colorOf(t.color)}">${iconHtml(t, t.icon === 'image' ? 48 : 30)}</span>
          <div class="cf-what"><b>${esc(t.name)}</b><span class="sub">${d === today() ? (mode === 'kid' ? '조금만 더 하면 돼요! 다시 해 보고 별을 받아요' : '아이 화면에 "다시 해 봐요"로 떠요. 다시 하면 별을 받을 수 있어요') : '이날은 못 한 일로 남아요'}</span></div>
          <span class="chip cf-redo-chip">다시 해 봐요</span>
          ${pv.status ? `<button class="btn cf-btn-sub" data-action="confirm-undo" data-d="${d}" data-id="${b.pid}">되돌리기</button>` : ''}</div>`;
      }
      const used = b.endAt ? Math.max(1, toM(b.endAt) - toM(b.start)) : null;
      return `<div class="cf-row${done ? ' cf-done' : ''}">
        <span class="tl-icon cf-icon" style="background:${colorOf(t.color)}">${iconHtml(t, t.icon === 'image' ? 48 : 30)}</span>
        <div class="cf-what"><b>${esc(t.name)}</b><span class="sub">${clockText(toM(b.start))}${b.endAt ? ' ~ ' + clockText(toM(b.endAt)) : ''}${used ? ` · ${used}분 걸림` : ''}${b.ext ? ` · 5분 ${b.ext}번 늘림` : ''}</span>
          ${b.fast && !done ? `<span class="cf-fast">빨리 끝났어요 (${used || '?'}분 / ${b.baseMinutes || b.minutes}분) · 꼼꼼히 봐 주세요</span>` : ''}</div>
        <span class="${just ? 'star-pop' : ''}">${starRow(b.stars, !done, mode === 'kid' ? 34 : 26)}</span>
        ${done ? '<span class="chip cf-ok">확인했어요</span>' : `<button class="btn cf-btn-sub" data-action="confirm-redo" data-d="${d}" data-id="${b.pid}">아직이에요</button><button class="btn btn-go cf-btn" data-action="confirm-one" data-d="${d}" data-id="${b.pid}">확인</button>`}
      </div>`;
    }).join('');
    return `<section class="cf-day"><div class="cf-day-head"><h3>${esc(relDay(d))}</h3>${clr ? '<span class="chip cf-clear">하루 클리어!</span>' : ''}</div>${rows}</section>`;
  }).join('');
}
// 아이 화면에서 연 확인 화면 (확인하면 별이 금색으로 바뀌는 연출)
function viewConfirm() {
  const kid = S.current, p = S.profiles.find(x => x.id === kid);
  if (!p) { S.screen = 'profiles'; return viewProfiles(); }
  const items = (S.confirmList || []).map(({ d, pid }) => { const r = dayRec(kid, d); const b = r && r.blocks.find(x => x.pid === pid); return b ? { d, b } : null; }).filter(Boolean);
  const left = items.filter(x => !x.b.confirmed && x.b.status === 'done');
  const gained = items.filter(x => x.b.confirmed).reduce((n, x) => n + (x.b.stars || 0), 0);
  if (S.confirmEnd) {
    return `<main class="screen clear cf-end">
      <div class="clear-top star-pop">${svgStar(110)}${svgStar(160)}${svgStar(110)}</div>
      <h1 class="clear-title">진짜 별 ${gained}개!</h1>
      <p class="clear-sub">${esc(callName(p.name))}, 엄마·아빠가 확인했어요. 별이 금색으로 빛나요</p>
      ${dayCleared(S.todayPlan[kid]) ? `<div class="cf-badge">오늘 하루 클리어!${streakOf(kid) >= 2 ? ` · ${streakOf(kid)}일 연속` : ''}</div>` : streakOf(kid) >= 2 ? `<div class="cf-badge">${streakOf(kid)}일 연속 클리어</div>` : ''}
      <div class="actions clear-actions"><button class="btn btn-go run-mid" data-action="confirm-close">끝내기</button></div>
    </main>`;
  }
  return `<main class="screen cf-screen">
    <div class="topbar"><div class="topbar-left"><span class="avatar" style="background:${colorOf(p.color)}">${esc(p.name.slice(0, 1))}</span>
      <div><h1 class="title-big">엄마·아빠 확인</h1><p class="sub">정말 다 했는지 보고 "확인"을 눌러 주세요. 확인한 별만 금색이 돼요</p></div></div>
      <div class="topbar-right">${left.length > 1 ? `<button class="btn btn-go" data-action="confirm-all">모두 확인 · 별 ${left.reduce((n, x) => n + (x.b.stars || 0), 0)}개</button>` : ''}</div></div>
    <div class="cf-list">${confirmRowsHtml(kid, items, 'kid') || '<p class="help">확인할 일이 없어요.</p>'}</div>
    <div class="actions cf-actions">
      ${gained ? `<button class="btn btn-go run-mid" data-action="confirm-finish">다 확인했어요 · 별 ${gained}개</button>` : `<button class="btn run-mid" data-action="confirm-close">${left.length ? '나중에 할게요' : '끝내기'}</button>`}
    </div>
  </main>`;
}
function parentConfirm() {
  const kid = S.current, items = pendingConfirms(kid), redo = redoList(kid);
  const all = items.concat(redo);
  return `<div class="ed-head"><h1>확인 대기</h1><span class="ed-sub">아이가 끝냈다고 한 일이에요. 확인하면 별이 금색이 되고, 하루 클리어에 들어가요</span><span class="spacer"></span>
      ${items.length > 1 ? `<button class="btn btn-plan-solid" data-action="confirm-all">모두 확인 (${items.length}개)</button>` : ''}</div>
    <div class="cf-list cf-list-ed">${confirmRowsHtml(kid, all, 'parent') || '<div class="panel cf-empty"><b>확인 기다리는 일이 없어요</b><p class="help">"확인 필요"로 정한 블록을 아이가 끝내면 여기에 모여요.</p></div>'}</div>`;
}

/* 가족 회의: 한 주 돌아보기와 다음 주 미리보기 */
function weekSummary(kid, monday) {
  const days = [0, 1, 2, 3, 4, 5, 6].map(i => {
    const d = addDays(monday, i), p = d <= today() ? dayRec(kid, d) : null;
    const bl = p ? p.blocks : [];
    return { d, w: dateObj(d).getDay(), future: d > today(), total: bl.length, done: bl.filter(b => b.status === 'done').length, stars: sumStars(bl), gold: sumStars(bl, true), cleared: dayCleared(p), blocks: bl, mark: S.marks[kid][d] };
  });
  const all = days.flatMap(x => x.blocks.map(b => ({ b, d: x.d })));
  const byName = f => { const m = {}; all.filter(f).forEach(({ b }) => { const t = templateOf(kid, b), k = b.blockId || t.name; (m[k] = m[k] || { t, n: 0, ext: 0, mins: [] }).n++; m[k].ext += b.ext || 0; if (b.endAt) m[k].mins.push(toM(b.endAt) - toM(b.start)); }); return Object.values(m).sort((a, b) => b.n - a.n); };
  return {
    days,
    total: days.reduce((n, x) => n + x.total, 0), done: days.reduce((n, x) => n + x.done, 0),
    stars: days.reduce((n, x) => n + x.stars, 0), gold: days.reduce((n, x) => n + x.gold, 0),
    cleared: days.filter(x => x.cleared).length, planned: days.filter(x => x.total).length,
    ext: byName(({ b }) => b.ext > 0).filter(x => x.n >= 2),
    fast: byName(({ b }) => b.fast).filter(x => x.n >= 2),
    missed: byName(({ b, d }) => isPending(b) && (d < today() || endOf(b) <= nowMin())).filter(x => x.n >= 1)
  };
}
function parentMeeting() {
  const kid = S.current, p = S.profiles.find(x => x.id === kid);
  const off = S.meetWeek || 0, monday = addDays(mondayOf(today()), off * 7), sum = weekSummary(kid, monday);
  const rate = sum.total ? Math.round(sum.done / sum.total * 100) : 0, wait = pendingConfirms(kid).length;
  const range = `${dateObj(monday).getMonth() + 1}/${dateObj(monday).getDate()} ~ ${dateObj(addDays(monday, 6)).getMonth() + 1}/${dateObj(addDays(monday, 6)).getDate()}`;
  const tiles = [[`${sum.stars}개`, '모은 별', sum.stars > sum.gold ? `금색 ${sum.gold} · 확인 전 ${sum.stars - sum.gold}` : '모두 금색'], [`${sum.cleared}일`, '하루 클리어', `할 일 있던 날 ${sum.planned}일 중`], [`${rate}%`, '해낸 할 일', `${sum.total}개 중 ${sum.done}개`], [`${streakOf(kid)}일`, '연속 클리어', '오늘까지 이어진 날']]
    .map(([v, l, s]) => `<div class="mt-tile"><b>${v}</b><span>${l}</span><small>${s}</small></div>`).join('');
  const dayRows = sum.days.map(x => `<div class="mt-day${x.future ? ' mt-future' : ''}${x.d === today() ? ' mt-today' : ''}">
      <b>${DAY_NAMES[x.w]}</b><span class="mt-date">${dateObj(x.d).getMonth() + 1}/${dateObj(x.d).getDate()}</span>
      <div class="mt-bar">${x.total ? `<i style="width:${Math.round(x.done / x.total * 100)}%"></i>` : ''}</div>
      <span class="mt-num">${x.future ? '아직' : x.total ? `${x.done}/${x.total}` : x.mark && x.mark.type === 'off' ? '쉬는 날' : '할 일 없음'}</span>
      <span class="mt-star">${x.stars ? svgStar(16) + ' ' + x.stars : ''}</span>${x.cleared ? '<span class="chip cf-clear">클리어</span>' : '<span></span>'}</div>`).join('');
  const tips = [];
  sum.ext.forEach(x => tips.push(`<li><span class="tl-icon mt-ic" style="background:${colorOf(x.t.color)}">${iconHtml(x.t, 22)}</span><span><b>${esc(x.t.name)}</b>: 이번 주 ${x.n}번 시간을 늘렸어요. 기본 시간을 5분 늘려 볼까요?</span></li>`));
  sum.fast.forEach(x => tips.push(`<li><span class="tl-icon mt-ic" style="background:${colorOf(x.t.color)}">${iconHtml(x.t, 22)}</span><span><b>${esc(x.t.name)}</b>: ${x.n}번 아주 빨리 끝냈어요. 시간을 줄이거나 조금 어렵게 해도 돼요</span></li>`));
  sum.missed.slice(0, 4).forEach(x => tips.push(`<li><span class="tl-icon mt-ic" style="background:${colorOf(x.t.color)}">${iconHtml(x.t, 22)}</span><span><b>${esc(x.t.name)}</b>: ${x.n}번 못 했어요. 시간대를 옮겨 볼까요?</span></li>`));
  // 다음 주 미리보기
  const nm = addDays(mondayOf(today()), 7);
  const next = [0, 1, 2, 3, 4, 5, 6].map(i => { const d = addDays(nm, i), t = makeDayFromTemplate(kid, d), mk = S.marks[kid][d]; return `<div class="mt-next-day"><b>${DAY_NAMES[dateObj(d).getDay()]}</b><span>${t.blocks.length ? `할 일 ${t.blocks.length}개` : '없음'}</span>${mk ? `<span class="pm-tag ${mk.type === 'off' ? 'pm-off' : 'pm-special'}">${esc(mk.label)}</span>` : ''}</div>`; }).join('');
  return `<div class="ed-head"><h1>가족 회의</h1>
      <div class="seg-switch" role="tablist"><button role="tab" data-action="meet-week" data-off="-1" aria-selected="${off === -1}">지난주</button><button role="tab" data-action="meet-week" data-off="0" aria-selected="${off === 0}">이번 주</button></div>
      <span class="ed-sub">${range} · 일요일에 ${esc(p.name + (hasBatchim(p.name) ? "이와" : "와"))} 함께 봐요</span></div>
    ${wait ? `<button class="mt-wait" data-action="ed-go" data-tab="confirm">${starRow(1, true, 24)}<span>확인 기다리는 일이 <b>${wait}개</b> 있어요. 먼저 확인하면 별과 클리어가 정확해져요</span><span class="mt-go">확인하러 가기 →</span></button>` : ''}
    <div class="mt-tiles">${tiles}</div>
    <div class="mt-grid">
      <section class="panel mt-days"><h3 class="sub-head">요일별</h3>${dayRows}</section>
      <section class="panel mt-talk"><h3 class="sub-head">이야기 나눌 거리</h3>
        <ol class="mt-q"><li>이번 주에 가장 뿌듯했던 일은?</li><li>제일 힘들었던 블록은? 왜 힘들었을까?</li><li>다음 주에 바꾸고 싶은 시간이 있어?</li></ol>
        <h3 class="sub-head">살펴볼 점</h3>${tips.length ? `<ul class="mt-tips">${tips.join('')}</ul>` : '<p class="help">특별히 고칠 점이 없어요. 잘 지냈어요!</p>'}</section>
    </div>
    <section class="panel mt-next"><div class="section-head"><h3 class="sub-head">다음 주 미리보기</h3><span class="spacer"></span><button class="btn btn-sm" data-action="ed-go" data-tab="week">요일별 할 일 고치기</button><button class="btn btn-sm" data-action="ed-go" data-tab="special">특별한 날 넣기</button></div>
      <div class="mt-next-grid">${next}</div>
      <p class="help">이번 주 목표와 보상 고르기는 다음 단계(7단계)에서 여기에 생겨요.</p></section>`;
}

const confirmActions = {
  'confirm-ask'() {
    const kid = S.current, list = pendingConfirms(kid);
    if (!list.length) { toast('확인할 일이 없어요'); return; }
    S.dialog = null;
    requireParent(() => {
      S.confirmList = list.map(({ d, b }) => ({ d, pid: b.pid }));
      S.confirmJust = null; S.confirmEnd = false; S.screen = 'confirm'; render();
    }, '엄마·아빠 확인');
  },
  async 'confirm-one'(el) {
    const kid = S.current, r = dayRec(kid, el.dataset.d), b = r && r.blocks.find(x => x.pid === el.dataset.id);
    if (!b) return;
    const wasClear = dayCleared(r);
    await confirmItems(kid, [{ d: el.dataset.d, b }]);
    S.confirmJust = new Set([b.pid]);
    unlockAudio(); vibrate([15, 40, 15]);
    [784, 988, 1175].forEach((f, i) => tone(f, 0.14, 0.05, i * 0.08));
    if (!wasClear && dayCleared(r)) { toast(`${relDay(el.dataset.d)} 하루 클리어!`); [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 0.06, 0.3 + i * 0.11)); }
    else if (S.screen === 'parent') toast(`${templateOf(kid, b).name}: 확인했어요`);
    else render();
  },
  async 'confirm-all'() {
    const kid = S.current;
    const items = S.screen === 'confirm'
      ? (S.confirmList || []).map(({ d, pid }) => { const r = dayRec(kid, d); const b = r && r.blocks.find(x => x.pid === pid); return b && !b.confirmed && b.status === 'done' ? { d, b } : null; }).filter(Boolean)
      : pendingConfirms(kid);
    if (!items.length) return;
    await confirmItems(kid, items);
    S.confirmJust = new Set(items.map(x => x.b.pid));
    unlockAudio(); vibrate([15, 40, 15]);
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, 0.06, i * 0.1));
    if (S.screen === 'confirm') { S.confirmEnd = true; render(); } else toast(`${items.length}개 모두 확인했어요`);
  },
  // 아직이에요: 다시 해야 할 일로 되돌린다 (오늘이면 '놓친 일'에 "다시 해 봐요"로 떠서 다시 할 수 있다)
  async 'confirm-redo'(el) {
    const kid = S.current, d = el.dataset.d, r = dayRec(kid, d), b = r && r.blocks.find(x => x.pid === el.dataset.id);
    if (!b || b.status !== 'done') return;
    b.redoPrev = {}; REDO_KEYS.forEach(k => { b.redoPrev[k] = b[k]; });
    b.minutes = b.baseMinutes || b.minutes;
    ['startedAtMs', 'endAt', 'stars', 'confirmed', 'ext', 'baseMinutes', 'fast'].forEach(k => delete b[k]);
    b.status = 'pending'; b.redo = true;
    await saveDayRec(kid, d);
    vibrate(10);
    toast(d === today() ? `${templateOf(kid, b).name}: 다시 해 보기로 했어요` : `${templateOf(kid, b).name}: 못 한 일로 바꿨어요`);
  },
  async 'confirm-undo'(el) {
    const kid = S.current, d = el.dataset.d, r = dayRec(kid, d), b = r && r.blocks.find(x => x.pid === el.dataset.id);
    if (!b || !b.redoPrev || !b.redoPrev.status) return;
    REDO_KEYS.forEach(k => { if (b.redoPrev[k] === undefined) delete b[k]; else b[k] = b.redoPrev[k]; });
    delete b.redo; delete b.redoPrev;
    await saveDayRec(kid, d);
    toast('되돌렸어요');
  },
  'confirm-finish'() { S.confirmEnd = true; S.confirmJust = null; [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 0.06, i * 0.11)); render(); },
  'confirm-close'() {
    S.unlockedUntil = 0; S.confirmList = null; S.confirmJust = null; S.confirmEnd = false;
    S.screen = 'op'; S.opWeek = null; S.scrolled = false; render();
  },
  'meet-week'(el) { S.meetWeek = Number(el.dataset.off); render(); },
  'meet-open'() { requireParent(() => { closeCtx(); S.parentTab = 'meeting'; S.meetWeek = 0; S.screen = 'parent'; render(); }, '가족 회의'); }
};


function viewGallery() {
  const p = S.profiles.find(x => x.id === S.current);
  if (!p) { S.screen = 'profiles'; return viewProfiles(); }
  const list = S.drawings[p.id] || [], blocks = S.blocks[p.id] || [];
  const need = blocks.filter(b => b.icon !== 'image').sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const isNew = b => b.createdAt && (Date.now() - new Date(b.createdAt).getTime()) < 3 * 864e5;
  const suggest = need.length ? `<div class="suggest"><span class="suggest-title">이런 걸 그려볼까?</span>${need.map(b => `<button class="suggest-chip" style="background:${colorOf(b.color)}" data-action="gallery-suggest" data-id="${b.id}"><span class="block-icon sm">${svgIcon(b.icon, 26)}</span>${esc(b.name)}${isNew(b) ? '<span class="chip chip-new">새 블록</span>' : ''}</button>`).join('')}</div>` : '';
  const tiles = list.map(g => {
    const usedBy = blocks.filter(b => b.icon === 'image' && b.image === g.image);
    const meta = g.unseen ? '<span class="chip chip-gift">새 선물!</span>'
      : usedBy.length ? `<span class="chip chip-block" style="background:${colorOf(usedBy[0].color)}">${esc(usedBy[0].name)}${usedBy.length > 1 ? ` 외 ${usedBy.length - 1}개` : ''}</span>`
      : g.fromName ? `<span class="chip">${esc(senderName(g.fromName))} 줬어요</span>`
      : `<span>${esc(g.createdAt.slice(5).replace('-', '/'))}</span>`;
    return `<button class="art-tile${g.unseen ? ' art-gift' : ''}" data-action="open-drawing" data-id="${g.id}"><img src="${esc(g.image)}" alt="내 그림"><span class="art-meta">${meta}</span></button>`;
  }).join('');
  return `<main class="screen">
    <div class="topbar">
      <div class="topbar-left">
        <span class="avatar" style="background:${colorOf(p.color)}">${esc(p.name.slice(0, 1))}</span>
        <div><h1 class="title-big">${esc(ownerName(p.name))} 그림 보관함</h1><p class="sub">시간 날 때 미리 그려 두면 블록 그림으로 쓸 수 있어요</p></div>
      </div>
      <div class="topbar-right"><button class="btn" data-action="gallery-back">돌아가기</button></div>
    </div>
    <section class="panel">
      <div class="draw-row">
        <button class="btn btn-go btn-tall" data-action="gallery-new">${svgIcon('art', 28, '#FFFFFF')}새로 그리기</button>
        <label class="btn btn-tall" for="gallery-file">그림 사진 올리기</label>
        <input id="gallery-file" type="file" accept="image/*" data-change="gallery-image" hidden>
      </div>
      ${suggest}
      <div class="art-grid">${tiles || '<p class="help">아직 그림이 없어요. 새로 그려 볼까요?</p>'}</div>
    </section>
  </main>`;
}

function soundRow() {
  const on = S.settings.sound !== false;
  return `<h3 class="sub-head">소리</h3>
    <div class="row"><div class="grow"><span class="name">효과음</span><span class="sub">톡 누를 때, 블록을 잡을 때, 5분 칸에 맞춰질 때 나는 짧은 소리예요. 진동이 되는 기기에서는 진동이 먼저 나요.</span></div>
      <label class="switch" for="sound-switch"><input id="sound-switch" type="checkbox" ${on ? 'checked' : ''} data-change="sound">${on ? '켜짐' : '꺼짐'}</label></div>`;
}

function parentKids() {
  const rows = S.profiles.map(p => `<div class="row">
      <span class="avatar" style="background:${colorOf(p.color)}">${esc(p.name.slice(0, 1))}</span>
      <div class="grow"><span class="name">${esc(p.name)}</span><span class="sub">부를 때: "${esc(callName(p.name))}" · 블록 ${(S.blocks[p.id] || []).length}개</span></div>
      <button class="btn" data-action="edit-kid" data-id="${p.id}">고치기</button>
    </div>`).join('');
  return `<div class="ed-head"><h1>아이·설정</h1></div><div class="section-head"><h3 class="sub-head">아이</h3><button class="btn btn-plan-solid" data-action="add-kid">+ 아이 추가</button></div>
    <p class="help">아이마다 블록, 시간표, 별, 기록이 따로 저장돼요.</p>
    <div class="list">${rows || '<p class="help">아직 아이가 없어요.</p>'}</div>
    ${soundRow()}`;
}

function parentBlocks() {
  if (!S.profiles.length) return '<h2>블록 보관함</h2><p class="help">아이를 먼저 추가해 주세요.</p>';
  if (!S.profiles.some(p => p.id === S.parentKid)) S.parentKid = S.profiles[0].id;
  const kidTabs = S.profiles.map(p => `<button class="pill" data-action="pick-kid" data-id="${p.id}" aria-pressed="${p.id === S.parentKid}">${esc(p.name)}</button>`).join('');
  const blocks = (S.blocks[S.parentKid] || []).map(b => blockCard(b, 'edit-block')).join('');
  return `<div class="ed-head"><h1>할 일 블록</h1><span class="ed-sub">${esc(senderName(S.profiles.find(k => k.id === S.parentKid).name))} 쓰는 블록 ${(S.blocks[S.parentKid] || []).length}개 · 누르면 고칠 수 있어요</span><span class="spacer"></span><button class="btn btn-plan-solid" data-action="add-block">+ 새 블록</button></div>
    <p class="help">"확인 필요"를 켠 블록은 엄마·아빠가 확인해야 진짜 별이 돼요.</p>
    <div class="blocks">${blocks || '<p class="help">블록이 없어요.</p>'}</div>`;
}

function parentBackup() {
  const last = S.settings.lastBackup ? esc(S.settings.lastBackup) : '아직 없음';
  return `<h2>백업</h2>
    <p class="help">모든 기록은 이 기기 안에만 저장돼요. 기기를 바꾸거나 앱을 지웠을 때 되살리려면 백업 파일이 필요해요. 비밀번호를 잊었을 때도 백업 파일로 복구해요.</p>
    <div class="row"><div class="grow"><span class="name">백업 파일 저장</span><span class="sub">마지막 백업: ${last}</span></div><button class="btn btn-go" data-action="export">파일로 저장</button></div>
    <div class="row"><div class="grow"><span class="name">백업 파일 불러오기</span><span class="sub">지금 기록은 백업 파일 내용으로 바뀌어요</span></div>
      <label class="btn" for="import-file">파일 고르기</label>
      <input id="import-file" type="file" accept="application/json,.json" data-change="import" hidden>
    </div>`;
}

function parentPin() {
  return `<h2>비밀번호 바꾸기</h2>
    <p class="help">새 비밀번호 4자리를 두 번 눌러 바꿔요.</p>
    <div><button class="btn btn-dark" data-action="change-pin">새 비밀번호 정하기</button></div>`;
}

/* ---------- 2단계: 24시간 타임라인 ---------- */
// 확대 단계: 1분당 px. 기본 2.4 (1시간 = 144px). 블록 높이는 소요 시간에 정확히 비례한다
const ZOOMS = [1.4, 1.8, 2.4, 3.2, 4.4];
let PX = 2.4;
const FOLD_H = 34;       // 접힌 띠 높이
const SEG_COLORS = [['#EAF7F0', '#1E6B4A'], ['#FFF4D6', '#7A5300'], ['#F3EEFE', '#5B3FA8'], ['#E8F3FF', '#1F4F8F'], ['#FFEDF4', '#8A2A5A']];
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

const toM = hm => { const [h, m] = String(hm).split(':').map(Number); return h * 60 + m; };
const toHM = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const clockText = m => { m = ((m % 1440) + 1440) % 1440; const h = Math.floor(m / 60); return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')}`; };
const ampm = m => (((m % 1440) + 1440) % 1440) < 720 ? '오전' : '오후';
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const isWeekend = (d = new Date()) => d.getDay() === 0 || d.getDay() === 6;

function defaultSetup() {
  return {
    sleep: { start: '21:00', end: '07:00' },
    segments: {
      weekday: [
        { id: uid(), name: '학교 가기 전', start: '07:00', end: '08:40', c: 0 },
        { id: uid(), name: '학교 다녀와서', start: '13:30', end: '18:00', c: 1 },
        { id: uid(), name: '저녁·자기 전', start: '18:00', end: '21:00', c: 2 }
      ],
      weekend: [
        { id: uid(), name: '아침', start: '07:30', end: '12:00', c: 3 },
        { id: uid(), name: '점심 먹고', start: '12:00', end: '18:00', c: 1 },
        { id: uid(), name: '저녁', start: '18:00', end: '21:00', c: 2 }
      ]
    },
    fixed: [{ id: uid(), name: '학교', days: [1, 2, 3, 4, 5], start: '08:40', end: '13:30', fold: true }]
  };
}

// 지금 고치는 계획을 저장한다: 오늘 / 날짜 / 요일 기본 시간표
function savePlan(kid) {
  const plan = S.plans[kid];
  if (S.ctx && S.ctx.kind === 'change') return Promise.resolve();
  if (S.ctx && S.ctx.kind === 'week') {
    S.week[kid][S.ctx.dow] = plan;
    return store.set('week:' + kid, S.week[kid]).then(() => { if (S.ctx.dow === new Date().getDay()) return refreshTodayFromTemplate(kid); });
  }
  plan.edited = true;
  return store.set('day:' + kid + ':' + plan.date, plan);
}
// 시간표의 블록은 보관함 블록의 이름·그림이 바뀌면 같이 바뀌게 보관함을 먼저 본다
const templateOf = (kid, pb) => Object.assign({}, pb, (S.blocks[kid] || []).find(b => b.id === pb.blockId) || {});
const todayFixed = kid => { const dow = ctxDow(); return ((S.setup[kid] || {}).fixed || []).filter(f => f.days.includes(dow)); };

// 바늘 시계: 짧은 바늘(시), 긴 빨간 바늘(분)
function miniClock(m, size) {
  const ha = ((m / 60) % 12) * 30, ma = (m % 60) * 6;
  return `<svg class="mini-clock" width="${size}" height="${size}" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="12.5" fill="#FFFFFF" stroke="#1F2A44" stroke-width="1.5"/><line x1="14" y1="14" x2="14" y2="7.5" stroke="#1F2A44" stroke-width="2.6" stroke-linecap="round" transform="rotate(${ha} 14 14)"/><line x1="14" y1="14" x2="14" y2="4.2" stroke="#E5484D" stroke-width="1.6" stroke-linecap="round" transform="rotate(${ma} 14 14)"/><circle cx="14" cy="14" r="1.6" fill="#1F2A44"/></svg>`;
}

// 하루 0~24시를 '펼친 부분'과 '접힌 띠'로 나눈다 (잠자는 시간, 접기로 한 고정 일정)
function buildPieces(kid) {
  const st = S.setup[kid], wake = toM(st.sleep.end), bed = toM(st.sleep.start);
  const folds = [];
  if (wake > 0) folds.push({ from: 0, to: wake, label: '잠자는 시간', key: 'sleep-am' });
  if (bed < 1440) folds.push({ from: bed, to: 1440, label: '잠자는 시간', key: 'sleep-pm' });
  todayFixed(kid).filter(f => f.fold).forEach(f => folds.push({ from: toM(f.start), to: toM(f.end), label: f.name, key: 'fx-' + f.id }));
  folds.sort((a, b) => a.from - b.from);
  const pieces = [];
  let t = 0, y = 0;
  for (const f of folds) {
    if (f.from < t) continue;
    if (f.from > t) { pieces.push({ from: t, to: f.from, folded: false, y, h: (f.from - t) * PX }); y += (f.from - t) * PX; }
    const open = S.expanded.has(f.key);
    const h = open ? (f.to - f.from) * PX : FOLD_H;
    pieces.push({ from: f.from, to: f.to, folded: !open, opened: open, label: f.label, key: f.key, y, h });
    y += h; t = f.to;
  }
  if (t < 1440) { pieces.push({ from: t, to: 1440, folded: false, y, h: (1440 - t) * PX }); y += (1440 - t) * PX; }
  return { pieces, total: y };
}
function yOf(pieces, m) {
  for (const p of pieces) {
    if (m >= p.from && m <= p.to) return p.folded ? p.y + (m - p.from) / (p.to - p.from) * p.h : p.y + (m - p.from) * PX;
  }
  return 0;
}

function timelineHtml(p) {
  const kid = p.id, { pieces, total } = buildPieces(kid), Y = m => yOf(pieces, m);
  const open = pc => !pc.folded;
  let out = '';
  // 구간 색 띠
  const segs = segList(kid);
  for (const sg of segs) {
    const a = toM(sg.start), b = toM(sg.end), [bg, ink] = SEG_COLORS[sg.c % SEG_COLORS.length];
    let first = true;
    for (const pc of pieces.filter(open)) {
      const f = Math.max(a, pc.from), t = Math.min(b, pc.to);
      if (t <= f) continue;
      out += `<div class="tl-band" style="top:${Y(f)}px;height:${Y(t) - Y(f)}px;background:${bg}">${first ? `<span class="tl-band-label" style="color:${ink}">${esc(sg.name)}</span>` : ''}</div>`;
      first = false;
    }
  }
  // 시각 줄 (펼친 부분만)
  for (let h = 0; h < 24; h++) {
    const m = h * 60;
    if (!pieces.some(pc => open(pc) && m >= pc.from && m < pc.to)) continue;
    if (pieces.some(pc => open(pc) && m + 30 >= pc.from && m + 30 < pc.to)) out += `<div class="tl-half" style="top:${Y(m + 30)}px"><span>30분</span></div>`;
    out += `<div class="tl-hour" style="top:${Y(m)}px"><span class="tl-hour-label">${miniClock(m, 18)}<span><small>${ampm(m)}</small>${h % 12 || 12}시</span></span></div>`;
  }
  // 접힌 띠, 펼친 띠
  const nm = nowMin();
  const chevron = d => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"></path></svg>`;
  for (const pc of pieces) {
    if (pc.folded) {
      const here = nm >= pc.from && nm < pc.to;
      out += `<button class="tl-fold${here ? ' tl-fold-now' : ''}" style="top:${pc.y + 4}px;height:${pc.h - 8}px" data-action="toggle-fold" data-key="${pc.key}">${chevron('M6 9l6 6 6-6')}<span><b>${esc(pc.label)}</b> ${ampm(pc.from)} ${clockText(pc.from)} ~ ${ampm(pc.to)} ${clockText(pc.to)}</span>${here ? '<span class="tl-here">지금 여기</span>' : ''}</button>`;
    } else if (pc.opened) {
      out += `<div class="tl-shade" style="top:${pc.y}px;height:${pc.h}px"></div><button class="tl-unfold" style="top:${pc.y + 6}px" data-action="toggle-fold" data-key="${pc.key}">${chevron('M6 15l6-6 6 6')}${esc(pc.label)} 접기</button>`;
    }
  }
  // 고정 일정과 블록
  const items = [];
  todayFixed(kid).forEach(f => { if (f.fold && !S.expanded.has('fx-' + f.id)) return; items.push({ fixed: true, name: f.name, start: toM(f.start), end: toM(f.end) }); });
  const shown = (S.preview && S.preview.kid === kid) ? S.preview.blocks : S.plans[kid].blocks;
  if (S.editPid && !shown.some(b => b.pid === S.editPid)) S.editPid = null;
  shown.forEach(pb => { const t = templateOf(kid, pb); items.push(Object.assign({}, t, { pid: pb.pid, status: pb.status, stars: pb.stars, confirmed: pb.confirmed, start: toM(pb.start), end: endOf(pb) })); });
  items.sort((a, b) => a.start - b.start);
  let bottom = -1;
  for (const it of items) {
    const y0 = Y(it.start), y1 = Y(it.end);
    const top = Math.max(y0 + 1, bottom + 2), h = Math.max(8, y1 - y0 - 2);
    bottom = top + h;
    const tier = h >= 52 ? 'full' : h >= 30 ? 'mid' : 'mini';
    const csz = Math.min(24, h - 6);
    const time = csz >= 20
      ? `<span class="tl-time">${miniClock(it.start, csz)}<span>${clockText(it.start)}~${clockText(it.end)}</span></span>`
      : `<span class="tl-time">${clockText(it.start)}~${clockText(it.end)}</span>`;
    const check = h >= 22 ? `<span class="chip${h < 34 ? ' chip-sm' : ''}">확인</span>` : '';
    if (it.fixed) {
      const fsz = Math.max(16, Math.min(40, h - 8));
      out += `<div class="tl-item tl-fixed tl-${tier}" style="top:${top}px;height:${h}px">${tier !== 'mini' ? `<span class="tl-icon" style="width:${fsz}px;height:${fsz}px">${svgLock}</span>` : ''}<span class="tl-name">${esc(it.name)}</span>${time}</div>`;
    } else {
      const isz = tier === 'full' ? Math.min(56, h - 10) : h - 6;
      const g = S.g && S.g.active && S.g.pid === it.pid ? S.g : null;
      const cls = (it.status === 'done' ? ' tl-done' : it.status === 'running' ? ' tl-running' : '') + (S.flashPid === it.pid ? ' tl-flash' : '') + (S.editPid === it.pid ? ' tl-edit' : '') + (g ? ' tl-drag' : '') + (S.preview && S.preview.newPid === it.pid ? ' tl-new' : '');
      const bubble = g ? `<span class="tl-bubble">${g.mode === 'resize' ? `${clockText(it.end)}에 끝 · ${it.end - it.start}분` : `${ampm(it.start)} ${clockText(it.start)} 시작`}</span>` : '';
      const handle = S.editPid === it.pid ? '<span class="tl-handle" aria-hidden="true"></span>' : '';
      const icon = tier === 'mini' ? '' : `<span class="tl-icon" style="width:${isz}px;height:${isz}px">${iconHtml(it, it.icon === 'image' ? isz - 2 : Math.round(isz * 0.62))}</span>`;
      const mfs = tier === 'mini' ? `;font-size:${Math.max(10, Math.min(14, h - 3))}px` : '';
      out += `<button class="tl-item tl-${tier}${cls}" style="top:${top}px;height:${h}px;background:${colorOf(it.color)}${mfs}" data-action="open-placed" data-id="${it.pid}">${icon}<span class="tl-name">${esc(it.name)}</span>${it.status === 'done' ? starRow(it.stars, !it.confirmed, h >= 30 ? 18 : Math.max(10, h - 6)) : it.status === 'running' ? '<span class="chip chip-run">하는 중</span>' : it.needsCheck ? check : ''}${time}${bubble}${handle}</button>`;
      if (S.editPid === it.pid && !g) out += `<button class="tl-trash" style="top:${top + h / 2 - 26}px" data-action="delete-placed" data-id="${it.pid}" aria-label="${esc(it.name)} 시간표에서 빼기">${svgTrash}</button>`;
    }
  }
  // 지금 선
  if (isTodayCtx() && pieces.some(pc => open(pc) && nm >= pc.from && nm < pc.to)) out += `<div class="tl-now" style="top:${Y(nm)}px" aria-label="지금 시각"></div>`;
  const firstB = (S.plans[kid].blocks[0] || null);
  S._nowY = isTodayCtx() ? Y(nm) : Y(firstB ? toM(firstB.start) : toM(S.setup[kid].sleep.end));
  S._pieces = pieces;
  if (S.scrollTo != null) { S._targetY = Y(S.scrollTo); S.scrollTo = null; }
  return `<div class="tl" style="height:${total}px">${out}</div>`;
}

const isPending = b => !b.status || b.status === 'pending';
// 끝난 블록은 실제로 끝낸 시각까지 (그래도 시간표에서는 최소 5분 크기)
const endOf = b => (b.status === 'done' && b.endAt) ? Math.max(toM(b.start) + 5, toM(b.endAt)) : toM(b.start) + b.minutes;

// 톡 눌러 넣기: 마지막 블록 바로 뒤 (블록이 없으면 지금 시각부터). 고정 일정·잠자는 시간은 건너뜀
function nextFreeStart(kid, minutes) {
  const st = S.setup[kid], plan = S.plans[kid];
  const now = Math.ceil(nowMin() / 5) * 5;
  const busy = [{ from: 0, to: toM(st.sleep.end) }, { from: toM(st.sleep.start), to: 1440 }]
    .concat(todayFixed(kid).map(f => ({ from: toM(f.start), to: toM(f.end) })))
    .concat(plan.blocks.map(b => ({ from: toM(b.start), to: endOf(b) })));
  const lastEnd = plan.blocks.reduce((m, b) => Math.max(m, endOf(b)), 0);
  let t = plan.blocks.length ? lastEnd : Math.max(now, toM(st.sleep.end));
  for (let guard = 0; guard < 60; guard++) {
    const hit = busy.find(r => t < r.to && t + minutes > r.from);
    if (!hit) break;
    t = hit.to;
  }
  return t + minutes <= toM(st.sleep.start) && t + minutes <= 1440 ? t : null;
}

/* ---------- 3단계: 블록 옮기기 · 시간 바꾸기 ---------- */
const LONG_PRESS = 450, LIB_PRESS = 350, MAGNET = 10, MAX_MIN = 120;
const svgUndo = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1F2A44" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14L4 9l5-5 M4 9h10a6 6 0 0 1 0 12h-3"></path></svg>';
const svgTrash = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13 M10 11v6 M14 11v6"></path></svg>';
const snap5 = m => Math.round(m / 5) * 5;

function pushHistory(kid) {
  if (!S.ctx) S.offer[kid] = true;
  const h = S.history[kid] = S.history[kid] || [];
  h.push(S.ctx && S.ctx.kind === 'week' ? JSON.stringify({ week: S.week[kid] }) : JSON.stringify(S.plans[kid].blocks));
  if (h.length > 30) h.shift();
}

// 화면 위치(y) → 시각(분)
function mOf(pieces, y) {
  for (const p of pieces) {
    if (y >= p.y && y < p.y + p.h) return p.folded ? p.from + (y - p.y) / p.h * (p.to - p.from) : p.from + (y - p.y) / PX;
  }
  return y < 0 ? 0 : 1440;
}

/*
 * 블록 하나를 옮기거나(move) 길이를 바꿨을 때(resize) 하루 시간표를 다시 맞춘다.
 * - 다른 블록 위에 놓으면: 그 블록 위쪽 절반이면 그 자리로 들어가고, 아래쪽 절반이면 바로 뒤에 붙는다
 * - 고정 일정(학교·학원)과 겹치면 가까운 쪽으로 비켜난다
 * - 뒤 블록과 겹치면 뒤 블록들이 밀린다 (고정 일정은 건너뛰며)
 * - 잠자는 시간을 넘기면 null (그 자리에는 못 놓음)
 */
function arrange(kid, blocks, D, mode) {
  const st = S.setup[kid], wake = toM(st.sleep.end), bed = toM(st.sleep.start);
  const locked = blocks.filter(b => b.pid !== D.pid && !isPending(b));
  const fixed = todayFixed(kid).map(f => ({ from: toM(f.start), to: toM(f.end) }))
    .concat(locked.map(b => ({ from: toM(b.start), to: endOf(b) }))).sort((a, b) => a.from - b.from);
  const hitFixed = (a, len) => fixed.find(f => a < f.to && a + len > f.from);
  const others = blocks.filter(b => b.pid !== D.pid && isPending(b)).map(b => Object.assign({}, b, { s: toM(b.start) })).sort((a, b) => a.s - b.s);
  let s = D.start, len = D.minutes;
  if (mode === 'move') {
    s = Math.max(wake, Math.min(s, bed - len));
    const A = others.find(o => o.s < s && s < o.s + o.minutes);
    if (A) s = s < A.s + A.minutes / 2 ? A.s : A.s + A.minutes;
    const f = hitFixed(s, len);
    if (f) s = (s + len / 2 < (f.from + f.to) / 2 && f.from - len >= wake) ? f.from - len : f.to;
  } else {
    const f = fixed.find(x => x.from >= s && x.from < s + len);
    if (f) len = f.from - s;
    len = Math.min(len, bed - s);
    if (len < 5) return null;
  }
  const out = [Object.assign({}, D, { s, minutes: len }, mode === 'move' ? { seg: segAt(kid, s).id } : {})];
  let cursor = s + len;
  for (const o of others) {
    if (o.s < s) { if (o.s + o.minutes > s) return null; out.push(o); continue; }
    let t = Math.max(o.s, cursor);
    for (let i = 0; i < 12; i++) { const f = hitFixed(t, o.minutes); if (!f) break; t = f.to; }
    o.s = t; cursor = t + o.minutes; out.push(o);
  }
  if (out.some(o => o.s < wake || o.s + o.minutes > bed)) return null;
  return out.map(o => { const r = Object.assign({}, o, { start: toHM(o.s), origStart: toHM(o.s) }); delete r.s; return r; })
    .concat(locked).sort((a, b) => toM(a.start) - toM(b.start));
}

// 자석: 다른 블록의 끝이나 시작 근처(10분 안)에 놓으면 딱 붙인다
function magnet(blocks, pid, m, len) {
  let best = m, dist = MAGNET + 1;
  for (const b of blocks) {
    if (b.pid === pid) continue;
    const a = toM(b.start), e = a + b.minutes;
    if (Math.abs(m - e) < dist) { dist = Math.abs(m - e); best = e; }
    if (Math.abs(m + len - a) < dist) { dist = Math.abs(m + len - a); best = a - len; }
  }
  return dist <= MAGNET ? best : m;
}

function renderTimeline() {
  const tl = document.getElementById('timeline'), p = S.profiles.find(x => x.id === S.current);
  if (!tl || !p) return;
  const top = tl.scrollTop;
  tl.innerHTML = timelineHtml(p);
  tl.scrollTop = top;
  S._targetY = null;
}
const tlInner = () => document.querySelector('#timeline .tl');
const inside = (el, x, y) => { if (!el) return false; const r = el.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; };

function dragUpdate() {
  const g = S.g, kid = S.current, inner = tlInner();
  if (!g || !g.active || !inner) return;
  const plan = S.plans[kid], y = g.cy - inner.getBoundingClientRect().top;
  let key, result = null;
  if (g.type === 'lib') {
    const over = inside(document.getElementById('timeline'), g.cx, g.cy);
    if (g.ghost) g.ghost.classList.toggle('ghost-ok', over);
    if (!over) { if (S.preview) { S.preview = null; g.last = null; g.lastValid = null; renderTimeline(); } return; }
    const m = magnet(plan.blocks, null, snap5(mOf(S._pieces, y - 24)), g.block.minutes);
    key = 'L' + m;
    if (key === g.last) return;
    result = arrange(kid, plan.blocks, Object.assign({}, g.block, { start: m }), 'move');
  } else if (g.mode === 'move') {
    const m = magnet(plan.blocks, g.pid, snap5(mOf(S._pieces, y - g.grabDy)), g.orig.minutes);
    key = 'M' + m;
    if (key === g.last) return;
    result = arrange(kid, plan.blocks, Object.assign({}, g.orig, { start: m }), 'move');
  } else {
    const end = snap5(mOf(S._pieces, y - g.grabDy));
    const len = Math.max(5, Math.min(MAX_MIN, end - toM(g.orig.start)));
    key = 'R' + len;
    if (key === g.last) return;
    result = arrange(kid, plan.blocks, Object.assign({}, g.orig, { start: toM(g.orig.start), minutes: len }), 'resize');
  }
  g.last = key;
  if (!result) return;
  const sig = JSON.stringify(result.map(b => b.pid + b.start + b.minutes));
  if (sig !== g.sig) { g.sig = sig; vibrate(8); }
  g.lastValid = result;
  S.preview = { kid, blocks: result, newPid: g.type === 'lib' ? g.block.pid : null };
  renderTimeline();
}

function autoScroll() {
  const g = S.g;
  if (!g || !g.active) return;
  const tl = document.getElementById('timeline');
  if (tl) {
    const r = tl.getBoundingClientRect(), y = g.cy;
    let v = 0;
    if (g.cx >= r.left && g.cx <= r.right) {
      if (y < r.top + 70) v = -Math.min(18, (r.top + 70 - y) / 4);
      else if (y > r.bottom - 70) v = Math.min(18, (y - (r.bottom - 70)) / 4);
    }
    if (v) { tl.scrollTop += v; g.last = null; dragUpdate(); }
  }
  g.raf = requestAnimationFrame(autoScroll);
}

function startTlDrag(g) {
  const tl = document.getElementById('timeline'), item = tl && tl.querySelector(`.tl-item[data-id="${g.pid}"]`);
  if (!item) return;
  const r = item.getBoundingClientRect();
  g.active = true;
  g.mode = g.onHandle ? 'resize' : 'move';
  g.grabDy = g.mode === 'resize' ? g.y0 - r.bottom : g.y0 - r.top;
  g.orig = Object.assign({}, S.plans[S.current].blocks.find(b => b.pid === g.pid));
  try { tl.setPointerCapture(g.pointerId); } catch (e) { /* 없어도 동작 */ }
  autoScroll();
}

function startLibDrag(g) {
  const kid = S.current, b = (S.blocks[kid] || []).find(x => x.id === g.id);
  if (!b) { S.g = null; return; }
  g.active = true;
  g.block = { pid: uid(), blockId: b.id, name: b.name, icon: b.icon, image: b.image || null, color: b.color, minutes: b.minutes, needsCheck: !!b.needsCheck, status: 'pending' };
  const ghost = document.createElement('div');
  ghost.className = 'lib-ghost';
  ghost.style.background = colorOf(b.color);
  ghost.innerHTML = `<span class="block-icon">${iconHtml(b, b.icon === 'image' ? 60 : 40)}</span><span class="block-name">${esc(b.name)}</span>`;
  document.body.appendChild(ghost);
  g.ghost = ghost;
  moveGhost(g);
  try { g.el.setPointerCapture(g.pointerId); } catch (e) { /* 없어도 동작 */ }
  vibrate(20);
  autoScroll();
}
const moveGhost = g => { if (g.ghost) g.ghost.style.transform = `translate(${g.cx - 70}px, ${g.cy - 50}px) rotate(-3deg)`; };

async function endDrag(cancel) {
  const g = S.g;
  S.g = null;
  if (!g) return;
  clearTimeout(g.timer);
  if (g.raf) cancelAnimationFrame(g.raf);
  if (g.ghost) g.ghost.remove();
  if (g.longPressed || g.active) S._suppressClick = { t: Date.now(), x: g.cx, y: g.cy };
  const kid = S.current;
  if (!g.active || cancel) { if (S.preview) { S.preview = null; renderTimeline(); } return; }
  const result = g.lastValid;
  S.preview = null;
  if (!result) {
    if (g.type === 'lib') { render(); return; }
    toast('그 시간에는 놓을 수 없어요');
    return;
  }
  pushHistory(kid);
  S.plans[kid].blocks = result;
  await savePlan(kid);
  if (g.type === 'lib') {
    const pid = g.block.pid;
    S.flashPid = pid;
    setTimeout(() => { if (S.flashPid === pid) S.flashPid = null; }, 1600);
    vibrate(15);
  }
  render();
}

function exitEdit() {
  if (!S.editPid) return;
  S.editPid = null;
  S._exitAt = Date.now();
  renderTimeline();
  document.querySelectorAll('.tl-tip, .btn-done').forEach(e => e.remove());
}
$app.addEventListener('pointerdown', ev => {
  if (S.editPid && S.screen === 'home' && !S.g && !ev.target.closest('.tl-edit, .tl-trash')) {
    // 편집 중에 블록 밖을 누르면 '끝내기 후보'. 손을 뗄 때 거의 안 움직였으면 끝낸다 (끌어서 넘기면 편집 유지)
    S._exitTap = { id: ev.pointerId, x: ev.clientX, y: ev.clientY };
    if (ev.target.closest('#timeline')) return; // 시간표 안에서는 다른 블록을 열지 않는다
  }
  if (S.screen === 'todo' && !S.dialog && !S.draw && !S.g) {
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    const lib = ev.target.closest('.td-lib'), card = ev.target.closest('.td-card:not(.td-locked)');
    if (!lib && !card) return;
    const g = { pointerId: ev.pointerId, x0: ev.clientX, y0: ev.clientY, cx: ev.clientX, cy: ev.clientY, todo: true };
    if (card && ev.target.closest('.td-handle')) {
      const pb = S.plans[S.current].blocks.find(b => b.pid === card.dataset.id);
      Object.assign(g, { type: 'tdsize', pid: card.dataset.id, orig: pb.minutes, minutes: pb.minutes, handle: true });
    } else if (lib) {
      Object.assign(g, { type: 'tdlib', id: lib.dataset.id, el: lib });
      g.timer = setTimeout(() => { g.longPressed = true; startTdGesture(g); }, LIB_PRESS);
    } else {
      Object.assign(g, { type: 'tdmove', pid: card.dataset.id });
      g.timer = setTimeout(() => { g.longPressed = true; startTdGesture(g); }, LIB_PRESS);
    }
    S.g = g;
    return;
  }
  if (S.screen !== 'home' || S.dialog || S.draw || S.g) return;
  if (ev.pointerType === 'mouse' && ev.button !== 0) return;
  const item = ev.target.closest('#timeline .tl-item:not(.tl-fixed)');
  const card = !item && ev.target.closest('.home-body .block-card[data-action="add-to-day"]');
  if (!item && !card) return;
  const g = { pointerId: ev.pointerId, x0: ev.clientX, y0: ev.clientY, cx: ev.clientX, cy: ev.clientY };
  if (item) {
    Object.assign(g, { type: 'tl', pid: item.dataset.id, editing: S.editPid === item.dataset.id, onHandle: !!ev.target.closest('.tl-handle') });
    const pb = S.plans[S.current].blocks.find(b => b.pid === g.pid);
    if (pb && !isPending(pb)) { g.locked = true; S.g = g; return; } // 하는 중·끝난 블록은 톡(열기)만
    if (!g.editing) g.timer = setTimeout(() => {
      g.longPressed = true;
      S.editPid = g.pid;
      vibrate(25);
      const tl = document.getElementById('timeline');
      try { tl.setPointerCapture(g.pointerId); } catch (e) { /* 없어도 동작 */ }
      render();
    }, LONG_PRESS);
  } else {
    Object.assign(g, { type: 'lib', id: card.dataset.id, el: card });
    g.timer = setTimeout(() => { g.longPressed = true; startLibDrag(g); }, LIB_PRESS);
  }
  S.g = g;
});
$app.addEventListener('pointermove', ev => {
  const t = S._exitTap;
  if (t && t.id === ev.pointerId && Math.hypot(ev.clientX - t.x, ev.clientY - t.y) >= 12) S._exitTap = null;
  const g = S.g;
  if (!g || ev.pointerId !== g.pointerId) return;
  g.cx = ev.clientX; g.cy = ev.clientY;
  const dist = Math.hypot(g.cx - g.x0, g.cy - g.y0);
  if (g.todo) {
    if (!g.active) {
      if (g.handle && dist > 4) startTdGesture(g);
      else if (!g.longPressed && !g.handle && dist > 10) { clearTimeout(g.timer); S.g = null; return; }
      else return;
    }
    tdUpdate();
    return;
  }
  if (!g.active) {
    if (g.type === 'tl' && (g.editing || g.longPressed) && dist > 4) startTlDrag(g);
    else if (!g.longPressed && !g.editing && dist > 10) { clearTimeout(g.timer); S.g = null; return; } // 화면을 넘기는 중
    else return;
  }
  if (g.type === 'lib') moveGhost(g);
  dragUpdate();
});
function checkExitTap(ev, cancel) {
  const t = S._exitTap;
  if (!t || t.id !== ev.pointerId) return;
  S._exitTap = null;
  if (!cancel && Math.hypot(ev.clientX - t.x, ev.clientY - t.y) < 12) exitEdit();
}
$app.addEventListener('pointerup', ev => {
  checkExitTap(ev, false);
  const g = S.g;
  if (!g || ev.pointerId !== g.pointerId) return;
  // 톡 누르기는 손을 떼는 순간 직접 처리한다 (아이패드 사파리는 이 경우 클릭이 오지 않을 때가 있음)
  const tap = !g.active && !g.longPressed && Math.hypot(ev.clientX - g.x0, ev.clientY - g.y0) < 12;
  if (g.todo) {
    endTdGesture(false);
    if (!tap) return;
    S._suppressClick = { t: Date.now(), x: g.cx, y: g.cy };
    if (g.type === 'tdlib') actions['td-add'](g.el);
    else actions['open-placed']({ dataset: { id: g.pid } });
    return;
  }
  endDrag(false);
  if (!tap) return;
  S._suppressClick = { t: Date.now(), x: g.cx, y: g.cy };
  if (g.type === 'lib') actions['add-to-day'](g.el);
  else if (g.type === 'tl' && !g.editing) actions['open-placed']({ dataset: { id: g.pid } });
});
$app.addEventListener('pointercancel', ev => { checkExitTap(ev, true); if (S.g && ev.pointerId === S.g.pointerId) { if (S.g.todo) endTdGesture(true); else endDrag(true); } });
document.addEventListener('pointerdown', unlockAudio, { once: true });
// 끄는 동안 화면이 같이 넘어가지 않게
document.addEventListener('touchmove', ev => { if (S.g && (S.g.active || S.g.longPressed || S.g.editing || S.g.handle)) ev.preventDefault(); }, { passive: false });
// 꾹 누를 때 뜨는 메뉴(이미지 저장 등) 막기
document.addEventListener('contextmenu', ev => { if (ev.target.closest && ev.target.closest('.tl-item, .block-card, .td-card, .art-tile, .icon-pick')) ev.preventDefault(); });

/* ---------- 5단계: 계획 구조 (주간 기본 시간표 · 달력 · 오늘 자동 생성) ---------- */
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DOW_FULL = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const dateObj = d => { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd); };
const dateKey = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
const dateLabel = d => { const x = dateObj(d); return `${x.getMonth() + 1}월 ${x.getDate()}일 ${DOW_FULL[x.getDay()]}`; };
// 지금 고치는 대상: null = 오늘, { kind: 'week', dow } = 요일 기본 시간표, { kind: 'date', date } = 그 날짜
const isTodayCtx = () => !S.ctx || S.ctx.kind === 'change' || (S.ctx.kind === 'date' && S.ctx.date === today());
const ctxDate = () => !S.ctx || S.ctx.kind === 'change' ? today() : (S.ctx.kind === 'date' ? S.ctx.date : null);
const ctxDow = () => S.ctx && S.ctx.kind === 'week' ? S.ctx.dow : dateObj(ctxDate()).getDay();
const isOffDay = (kid, d) => !!(d && S.marks[kid] && S.marks[kid][d] && S.marks[kid][d].type === 'off');
const ctxWeekend = kid => { const w = ctxDow(); return w === 0 || w === 6 || isOffDay(kid, ctxDate()); };
// 그 날짜가 따를 기본 시간표 요일 (쉬는 날은 토요일)
const templateDow = (kid, d) => isOffDay(kid, d) ? 6 : dateObj(d).getDay();
const RUNTIME_KEYS = ['status', 'startedAtMs', 'endAt', 'stars', 'confirmed', 'ext', 'baseMinutes', 'fast'];
function cleanBlock(b) {
  const r = Object.assign({}, b, { pid: uid(), minutes: b.baseMinutes || b.minutes, status: 'pending' });
  RUNTIME_KEYS.slice(1).forEach(k => delete r[k]);
  r.start = r.origStart = b.origStart || b.start;
  return r;
}
function makeDayFromTemplate(kid, d) {
  const t = (S.week[kid] || {})[templateDow(kid, d)];
  return { date: d, edited: false, blocks: t ? t.blocks.map(cleanBlock).sort((a, b) => toM(a.start) - toM(b.start)) : [] };
}
// 날짜 계획: 따로 고친 적이 있으면 그것, 아니면 기본 시간표에서 새로 (고친 적 없는 날은 기본이 바뀌면 따라감)
async function loadOrMakeDay(kid, d) {
  const stored = await store.get('day:' + kid + ':' + d);
  if (stored && !(stored.edited === false && stored.blocks.every(isPending))) return stored;
  const made = makeDayFromTemplate(kid, d);
  if (d === today()) await store.set('day:' + kid + ':' + d, made);
  return made;
}
const weekPlan = (kid, dow) => (S.week[kid][dow] = S.week[kid][dow] || { dow, blocks: [] });

// 계획 편집기로 들어가기 / 나오기
async function openCtx(ctx, screen) {
  const kid = S.current;
  S.ctx = ctx; S.editPid = null; S.history[kid] = []; S.tdSel = null; S.scrolled = false;
  if (ctx.kind === 'week') S.plans[kid] = weekPlan(kid, ctx.dow);
  else S.plans[kid] = ctx.date === today() ? S.todayPlan[kid] : await loadOrMakeDay(kid, ctx.date);
  S.screen = screen; render();
}
function closeCtx() {
  const kid = S.current;
  S.ctx = null; S.plans[kid] = S.todayPlan[kid]; S.editPid = null; S.history[kid] = []; S.scrolled = false;
}

function planEditTopbar(p, tab) {
  const c = S.ctx, title = c.kind === 'week' ? `${DOW_FULL[c.dow]} 기본 시간표` : `${dateLabel(c.date)} 계획`;
  const sub = c.kind === 'week' ? '매주 이 요일마다 이렇게 해요' : (S.plans[p.id].edited ? '이날만 따로 짠 계획이에요' : `${DOW_FULL[templateDow(p.id, c.date)]} 기본 시간표를 따르고 있어요. 고치면 이날만 바뀌어요`);
  return `<div class="topbar plan-edit-bar">
      <div class="topbar-left">
        <button class="btn" data-action="plan-back">← 계획하기</button>
        <div><h1 class="title-big">${esc(title)}</h1><p class="sub">${esc(p.name)} · ${esc(sub)}</p></div>
        <div class="tabs" role="tablist">
          <button role="tab" data-action="go-todo" aria-selected="${tab === 'todo'}">할 일</button>
          <button role="tab" data-action="go-home" aria-selected="${tab === 'home'}">시간표</button>
        </div>
      </div>
      <div class="topbar-right"><button class="btn btn-go" data-action="plan-back">다 했어요</button></div>
    </div>${c.kind === 'week' ? weekDayBar(p.id, tab) : ''}`;
}
// 요일 기본 시간표 편집: 위에 월~일 탭 (눌러서 바로 다른 요일로), 할 일 화면에는 '함께 넣을 요일'
function weekDayBar(kid, tab) {
  const c = S.ctx, also = c.also || [c.dow];
  const tabs = DOW_ORDER.map(d => {
    const n = ((S.week[kid][d] || {}).blocks || []).length;
    return `<button class="wd-tab${d === c.dow ? ' wd-on' : ''}${d === 0 || d === 6 ? ' wd-weekend' : ''}" data-action="wd-switch" data-dow="${d}" aria-pressed="${d === c.dow}"><b>${DAY_NAMES[d]}</b><small>${n ? n + '개' : '비어 있음'}</small></button>`;
  }).join('');
  const together = ''; // '함께 넣을 요일'은 없앰: 요일마다 따로 정한다
  return `<div class="wd-bar"><div class="wd-tabs">${tabs}</div>${together}</div>`;
}
// 다른 요일에서 같은 구간 찾기 (주말은 구간이 달라서 이름 → 순서 → 시각으로 찾음)
function mapSeg(kid, segId, fromWeekend, toWeekend) {
  if (fromWeekend === toWeekend || segId === 'etc') return segId;
  const from = S.setup[kid].segments[fromWeekend ? 'weekend' : 'weekday'] || [], to = S.setup[kid].segments[toWeekend ? 'weekend' : 'weekday'] || [];
  const i = from.findIndex(x => x.id === segId), src = from[i];
  if (!src) return to.length ? to[0].id : 'etc';
  const byName = to.find(x => x.name === src.name);
  return (byName || to[i] || to.find(x => toM(src.start) >= toM(x.start) && toM(src.start) < toM(x.end)) || to[0] || { id: 'etc' }).id;
}
// 보고 있는 요일에도 넣을지 (요일 기본 시간표에서 '함께 넣을 요일'에 빠져 있으면 안 넣음)
const homeIncluded = () => true;
const daysText = list => list.slice().sort((x, y) => DOW_ORDER.indexOf(x) - DOW_ORDER.indexOf(y)).map(d => DAY_NAMES[d]).join('·');
// 함께 넣을 다른 요일들에도 같은 블록을 그 구간 맨 뒤에 붙인다
function addToOtherDays(kid, block, segId) {
  const c = S.ctx;
  return [];
  const home = c.dow, homePlan = S.plans[kid], homeWeekend = home === 0 || home === 6, done = [];
  for (const d of c.also) {
    if (d === home) continue;
    c.dow = d; S.plans[kid] = weekPlan(kid, d);
    const seg = mapSeg(kid, segId, homeWeekend, d === 0 || d === 6);
    appendToSeg(kid, seg, newPlaced(block, seg));
    done.push(d);
  }
  c.dow = home; S.plans[kid] = homePlan;
  return done;
}

// 오늘 바꾼 것을 요일 기본 시간표에도 쓸지 묻는 띠
function offerBar(kid) {
  return '';
  if (S.ctx || !S.offer[kid] || !S.todayPlan[kid].blocks.length) return '';
  const dow = new Date().getDay();
  return `<div class="offer-bar"><span>오늘 바꾼 시간표를 <b>앞으로 ${DOW_FULL[dow]}마다</b> 쓸까요?</span>
    <button class="btn btn-sm" data-action="offer-no">오늘만</button>
    <button class="btn btn-sm btn-go" data-action="offer-yes">${svgLock}부모님과 기본으로 저장</button></div>`;
}

/* 계획하기 화면 */
function blockMini(kid, b) {
  const t = templateOf(kid, b);
  return `<div class="pw-block" style="background:${colorOf(t.color)}"><span class="tl-icon pw-icon">${iconHtml(t, t.icon === 'image' ? 30 : 18)}</span><span class="pw-text"><span class="pw-name">${esc(t.name)}</span><span class="pw-time">${clockText(toM(b.start))} · ${b.minutes}분</span></span></div>`;
}
function viewPlan() {
  const p = S.profiles.find(x => x.id === S.current);
  if (!p) { S.screen = 'profiles'; return viewProfiles(); }
  const tab = S.planTab || 'week';
  const tabs = `<div class="tabs" role="tablist"><button role="tab" data-action="plan-tab" data-tab="week" aria-selected="${tab === 'week'}">주간 기본 시간표</button><button role="tab" data-action="plan-tab" data-tab="month" aria-selected="${tab === 'month'}">달력</button></div>`;
  return `<main class="screen screen-fit plan">
    <div class="topbar">
      <div class="topbar-left"><button class="btn" data-action="plan-exit">${svgLock}잠그고 아이 화면으로</button>
        <div><h1 class="title-big">${esc(ownerName(p.name))} 계획하기</h1><p class="sub">부모님과 함께 일주일과 한 달을 미리 정해요</p></div>${tabs}</div>
    </div>
    ${tab === 'week' ? planWeekHtml(p.id) : planMonthHtml(p.id)}
  </main>`;
}
function planWeekHtml(kid) {
  const todayDow = new Date().getDay(), tp = S.todayPlan[kid];
  const cols = DOW_ORDER.map(d => {
    const wp = (S.week[kid][d] || { blocks: [] }), bl = wp.blocks.slice().sort((a, b) => toM(a.start) - toM(b.start));
    const total = bl.reduce((n, b) => n + b.minutes, 0);
    return `<section class="pw-col${d === todayDow ? ' pw-today' : ''}${d === 0 || d === 6 ? ' pw-weekend' : ''}">
      <div class="pw-head"><b>${DAY_NAMES[d]}</b><span>${bl.length ? `${bl.length}개 · ${Math.floor(total / 60) ? Math.floor(total / 60) + '시간 ' : ''}${total % 60 ? total % 60 + '분' : ''}` : '비어 있어요'}</span></div>
      <div class="pw-list">${bl.map(b => blockMini(kid, b)).join('') || '<p class="help">할 일을 넣어 주세요</p>'}</div>
      <div class="pw-actions">
        <button class="btn btn-sm btn-go" data-action="plan-edit-week" data-dow="${d}" data-screen="todo">할 일</button>
        <button class="btn btn-sm" data-action="plan-edit-week" data-dow="${d}" data-screen="home">시간표</button>
        ${bl.length ? `<button class="btn btn-sm" data-action="plan-copy" data-dow="${d}">복사</button>` : ''}
      </div>
    </section>`;
  }).join('');
  const pull = tp.blocks.length ? `<button class="btn btn-sm" data-action="plan-pull-today">오늘(${DAY_NAMES[todayDow]}) 시간표를 ${DOW_FULL[todayDow]} 기본으로 가져오기</button>` : '';
  return `<div class="plan-tools"><p class="help">요일마다 반복할 할 일과 시각을 정해요. 한 요일을 다 짜면 "복사"로 다른 요일에 한 번에 옮길 수 있어요. 바꾼 기본 시간표는 따로 고치지 않은 날에 적용돼요.</p>${pull}</div>
    <div class="pw-grid">${cols}</div>`;
}
function planMonthHtml(kid) {
  const ym = S.calMonth || today().slice(0, 7);
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(y, m - 1, 1), days = new Date(y, m, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const info = (S.calInfo && S.calInfo.kid === kid && S.calInfo.ym === ym) ? S.calInfo.days : null;
  if (!info) { loadMonthInfo(kid, ym); }
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push('<div class="pm-cell pm-empty"></div>');
  for (let dd = 1; dd <= days; dd++) {
    const d = `${ym}-${String(dd).padStart(2, '0')}`, x = new Date(y, m - 1, dd), w = x.getDay();
    const mark = S.marks[kid][d], inf = info && info[d];
    const past = d < today(), isT = d === today();
    const tags = [];
    if (mark) tags.push(`<span class="pm-tag ${mark.type === 'off' ? 'pm-off' : 'pm-special'}">${esc(mark.type === 'off' ? (mark.label || '쉬는 날') : mark.label)}</span>`);
    if (inf && inf.edited && !past) tags.push('<span class="pm-tag pm-own">따로 계획</span>');
    const stars = inf && (past || isT) && inf.stars ? `<span class="pm-stars">${svgStar(14)}${inf.stars}</span>` : '';
    cells.push(`<button class="pm-cell${isT ? ' pm-today' : ''}${w === 0 || w === 6 ? ' pm-weekend' : ''}${past ? ' pm-past' : ''}" data-action="plan-date" data-date="${d}">
      <span class="pm-num">${dd}</span>${tags.join('')}${stars}</button>`);
  }
  return `<div class="plan-tools pm-nav"><button class="btn btn-sm btn-icon" data-action="cal-move" data-d="-1" aria-label="지난달">‹</button><b class="pm-title">${y}년 ${m}월</b><button class="btn btn-sm btn-icon" data-action="cal-move" data-d="1" aria-label="다음 달">›</button>
      <p class="help">날짜를 누르면 그날만 따로 계획하거나, 특별한 날·쉬는 날로 표시할 수 있어요. 쉬는 날은 토요일 기본 시간표를 따라요.</p></div>
    <div class="pm-grid">${['월', '화', '수', '목', '금', '토', '일'].map(n => `<span class="pm-dow">${n}</span>`).join('')}${cells.join('')}</div>`;
}
async function loadMonthInfo(kid, ym) {
  if (S._calLoading === kid + ym) return;
  S._calLoading = kid + ym;
  const all = await store.all(), days = {}, pre = 'day:' + kid + ':' + ym;
  for (const k of Object.keys(all)) {
    if (!k.startsWith(pre)) continue;
    const d = k.slice(('day:' + kid + ':').length), plan = all[k];
    days[d] = { edited: plan.edited !== false && plan.blocks.length > 0, stars: plan.blocks.reduce((n, b) => n + (b.status === 'done' ? b.stars || 0 : 0), 0) };
  }
  S.calInfo = { kid, ym, days };
  S._calLoading = null;
  if (S.screen === 'plan') render();
}

const planActions = {
  'go-plan'() { actions['go-parent'](); },
  'plan-exit'() { closeCtx(); S.unlockedUntil = 0; S.screen = 'home'; render(); },
  'plan-tab'(el) { S.planTab = el.dataset.tab; render(); },
  'plan-back'() { actions['ed-go']({ dataset: { tab: S.ctx && S.ctx.kind === 'date' ? 'special' : 'week' } }); },
  'plan-edit-week'(el) { const d = Number(el.dataset.dow); openCtx({ kind: 'week', dow: d, also: [d] }, el.dataset.screen); },
  'wd-switch'(el) {
    const kid = S.current, d = Number(el.dataset.dow), c = S.ctx;
    if (!c || c.kind !== 'week' || d === c.dow) return;
    if (!c.also || (c.also.length === 1 && c.also[0] === c.dow)) c.also = [d];
    c.dow = d;
    S.plans[kid] = weekPlan(kid, d); S.editPid = null; S.tdSel = null; S.scrolled = false;
    vibrate(8); render();
  },
  'wd-also'(el) {
    const c = S.ctx, d = Number(el.dataset.dow);
    c.also = c.also || [c.dow];
    c.also = c.also.includes(d) ? c.also.filter(x => x !== d) : c.also.concat(d);
    vibrate(5); render();
  },
  'wd-also-set'(el) {
    S.ctx.also = el.dataset.set.split('').map(Number);
    vibrate(5); render();
  },
  'td-week'() {
    requireParent(() => { closeCtx(); openCtx({ kind: 'week', dow: new Date().getDay(), also: [new Date().getDay()] }, 'todo'); });
  },
  'plan-copy'(el) { S.dialog = { type: 'copy-day', from: Number(el.dataset.dow), to: [] }; render(); },
  'copy-pick'(el) {
    const d = Number(el.dataset.dow), to = S.dialog.to;
    S.dialog.to = to.includes(d) ? to.filter(x => x !== d) : to.concat(d);
    el.setAttribute('aria-pressed', String(S.dialog.to.includes(d)));
  },
  'copy-weekdays'() { S.dialog.to = [1, 2, 3, 4, 5].filter(d => d !== S.dialog.from); render(); },
  async 'copy-do'() {
    const kid = S.current, d = S.dialog, src = weekPlan(kid, d.from);
    if (!d.to.length) { toast('복사할 요일을 골라 주세요'); return; }
    d.to.forEach(t => { S.week[kid][t] = { dow: t, blocks: src.blocks.map(cleanBlock) }; });
    await store.set('week:' + kid, S.week[kid]);
    S.dialog = null;
    toast(`${DAY_NAMES[d.from]}요일 시간표를 ${d.to.sort((a, b) => DOW_ORDER.indexOf(a) - DOW_ORDER.indexOf(b)).map(x => DAY_NAMES[x]).join('·')}요일에 복사했어요`);
    await refreshTodayFromTemplate(kid);
  },
  async 'plan-pull-today'() {
    const kid = S.current, dow = new Date().getDay();
    S.week[kid][dow] = { dow, blocks: S.todayPlan[kid].blocks.map(cleanBlock) };
    await store.set('week:' + kid, S.week[kid]);
    S.offer[kid] = false;
    toast(`오늘 시간표를 ${DOW_FULL[dow]} 기본으로 저장했어요`);
  },
  'plan-date'(el) { S.dialog = { type: 'plan-date', date: el.dataset.date, label: (S.marks[S.current][el.dataset.date] || {}).label || '' }; render(); },
  'plan-edit-date'(el) { const d = S.dialog.date; S.dialog = null; openCtx({ kind: 'date', date: d }, el.dataset.screen); },
  async 'date-mark'(el) {
    const kid = S.current, d = S.dialog.date, type = el.dataset.type;
    if (type === 'none') delete S.marks[kid][d];
    else S.marks[kid][d] = { type, label: type === 'special' ? (S.dialog.label.trim() || '특별한 날') : (S.dialog.label.trim() || '쉬는 날') };
    await store.set('marks:' + kid, S.marks[kid]);
    S.dialog = null;
    if (d === today()) await refreshTodayFromTemplate(kid);
    S.calInfo = null;
    toast(type === 'none' ? '표시를 지웠어요' : type === 'off' ? '쉬는 날로 표시했어요 (토요일 기본 시간표)' : '특별한 날로 표시했어요');
  },
  async 'date-reset'() {
    const kid = S.current, d = S.dialog.date;
    if (d === today() && S.todayPlan[kid].blocks.some(b => !isPending(b))) { toast('오늘은 이미 시작한 일이 있어서 되돌릴 수 없어요'); return; }
    await store.del('day:' + kid + ':' + d);
    if (d === today()) { S.todayPlan[kid] = S.plans[kid] = await loadOrMakeDay(kid, d); }
    S.dialog = null; S.calInfo = null;
    toast('기본 시간표를 따르도록 되돌렸어요');
  },
  'cal-move'(el) {
    const [y, m] = (S.calMonth || today().slice(0, 7)).split('-').map(Number);
    const x = new Date(y, m - 1 + Number(el.dataset.d), 1);
    S.calMonth = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`; render();
  },
  'offer-no'() { S.offer[S.current] = false; render(); },
  'offer-yes'() {
    const back = S.screen;
    requireParent(async () => {
      S.screen = back;
      await planActions['plan-pull-today']();
      S.unlockedUntil = 0;
      render();
    });
  }
};
// 기본 시간표가 바뀌면, 오늘을 아직 손대지 않았을 때 오늘도 새 기본으로
async function refreshTodayFromTemplate(kid) {
  const tp = S.todayPlan[kid];
  if (tp.edited !== false || !tp.blocks.every(isPending)) return;
  S.todayPlan[kid] = makeDayFromTemplate(kid, today());
  await store.set('day:' + kid + ':' + today(), S.todayPlan[kid]);
  if (!S.ctx) S.plans[kid] = S.todayPlan[kid];
}

/* ---------- 오늘의 할 일 (순서와 상관없이 구간에 할 일 넣기) ---------- */
const now5 = () => Math.ceil(nowMin() / 5) * 5;
function segRange(kid, segId) {
  const sg = segId === 'etc' ? etcSeg(kid) : segList(kid).find(x => x.id === segId) || etcSeg(kid);
  return { from: toM(sg.start), to: toM(sg.end) };
}
// 구간이 이미 시작됐으면 지금부터, 아니면 구간 시작부터 채운다
const segBase = (kid, segId) => { const r = segRange(kid, segId), n = now5(); return isTodayCtx() && n > r.from && n < r.to ? n : r.from; };
function busyFor(kid, exceptPids) {
  return todayFixed(kid).map(f => ({ from: toM(f.start), to: toM(f.end) }))
    .concat(S.plans[kid].blocks.filter(b => !exceptPids.includes(b.pid)).map(b => ({ from: toM(b.start), to: endOf(b) })));
}
const skipBusy = (t, len, busy) => { for (let i = 0; i < 40; i++) { const h = busy.find(r => t < r.to && t + len > r.from); if (!h) break; t = h.to; } return t; };
// 아직 안 한 블록끼리 겹치면 뒤로 민다 (계획 바꾸기이므로 '밀림'이 아니라 새 계획으로 기록)
function planPush(kid) {
  const plan = S.plans[kid];
  const busy = todayFixed(kid).map(f => ({ from: toM(f.start), to: toM(f.end) }))
    .concat(plan.blocks.filter(b => !isPending(b)).map(b => ({ from: toM(b.start), to: endOf(b) })));
  let prevEnd = 0;
  for (const b of plan.blocks.filter(isPending).sort((a, c) => toM(a.start) - toM(c.start))) {
    const t = skipBusy(Math.max(toM(b.start), prevEnd), b.minutes, busy);
    b.start = b.origStart = toHM(t);
    prevEnd = t + b.minutes;
  }
  plan.blocks.sort((a, c) => toM(a.start) - toM(c.start));
}
// 구간의 아직 안 한 블록을 주어진 순서대로 처음부터 다시 채운다
function packSeg(kid, segId, pids) {
  const plan = S.plans[kid], list = pids.map(id => plan.blocks.find(b => b.pid === id)).filter(b => b && isPending(b));
  const busy = busyFor(kid, list.map(b => b.pid));
  let t = segBase(kid, segId);
  for (const b of list) { t = skipBusy(t, b.minutes, busy); b.start = b.origStart = toHM(t); b.seg = segId; t += b.minutes; }
  planPush(kid);
}
const segPids = (kid, segId) => S.plans[kid].blocks.filter(b => isPending(b) && segOf(kid, b).id === segId).sort((a, b) => toM(a.start) - toM(b.start)).map(b => b.pid);
function newPlaced(b, segId) {
  return { pid: uid(), blockId: b.id, name: b.name, icon: b.icon, image: b.image || null, color: b.color, minutes: b.minutes, needsCheck: !!b.needsCheck, start: '00:00', origStart: '00:00', status: 'pending', seg: segId };
}
// 구간 맨 뒤에 붙이기 (시간표에서 맞춰 둔 다른 시각은 건드리지 않음)
function appendToSeg(kid, segId, pb) {
  const plan = S.plans[kid];
  const last = plan.blocks.filter(b => segOf(kid, b).id === segId).reduce((m, b) => Math.max(m, endOf(b)), 0);
  const t = skipBusy(Math.max(segBase(kid, segId), last), pb.minutes, busyFor(kid, []));
  pb.start = pb.origStart = toHM(t);
  plan.blocks.push(pb);
  planPush(kid);
}
function warnBed(kid) {
  const bed = toM(S.setup[kid].sleep.start);
  if (S.plans[kid].blocks.some(b => isPending(b) && endOf(b) > bed)) toast('잠자기 전까지 시간이 모자라요. 시간표에서 확인해 봐요');
}
function currentSegId(kid) {
  const list = segList(kid);
  if (!isTodayCtx()) return list.length ? list[0].id : 'etc';
  const n = nowMin();
  const cur = list.find(sg => n >= toM(sg.start) && n < toM(sg.end)) || list.find(sg => toM(sg.start) > n) || list[0];
  return cur ? cur.id : 'etc';
}

function tdCard(kid, b, opts) {
  const t = templateOf(kid, b), o = opts || {};
  const minutes = o.minutes != null ? o.minutes : b.minutes;
  const h = Math.round(58 + Math.min(120, minutes) * 1.1);
  const locked = !isPending(b);
  const state = b.status === 'done' ? starRow(b.stars, !b.confirmed, 22) : b.status === 'running' ? '<span class="chip chip-run">하는 중</span>' : `<span class="td-min">${minutes}분</span>`;
  return `<button class="td-card${locked ? ' td-locked' : ''}${o.lifted ? ' td-lifted' : ''}${S.flashPid === b.pid ? ' tl-flash' : ''}" style="min-height:${h}px;background:${colorOf(t.color)}" data-action="open-placed" data-id="${b.pid}">
    <span class="tl-icon td-icon">${iconHtml(t, t.icon === 'image' ? 40 : 24)}</span>
    <span class="td-name">${esc(t.name)}</span>${state}
    ${locked ? '' : '<span class="td-handle" aria-hidden="true"></span>'}
    ${o.bubble ? `<span class="td-bubble">${o.bubble}</span>` : ''}
  </button>`;
}

function tdColumns(kid) {
  const segs = segList(kid).slice();
  const plan = S.plans[kid];
  if (plan.blocks.some(b => segOf(kid, b).id === 'etc') || !segs.length) segs.push(etcSeg(kid));
  const sel = S.tdSel && segs.some(x => x.id === S.tdSel) ? S.tdSel : currentSegId(kid);
  const g = S.g && S.g.active && S.screen === 'todo' ? S.g : null;
  return segs.map(sg => {
    let blocks = plan.blocks.filter(b => segOf(kid, b).id === sg.id).sort((a, b) => toM(a.start) - toM(b.start));
    const lifted = g && g.type === 'tdmove' ? g.pid : null;
    if (lifted) blocks = blocks.filter(b => b.pid !== lifted);
    let cards = blocks.map(b => tdCard(kid, b, g && g.type === 'tdsize' && g.pid === b.pid ? { minutes: g.minutes, bubble: `${g.orig}분 → ${g.minutes}분` } : null));
    if (g && g.drop && g.drop.seg === sg.id && (g.type === 'tdlib' || g.type === 'tdmove')) {
      cards.splice(g.drop.index, 0, `<div class="td-slot" style="min-height:${Math.round(58 + Math.min(120, g.slotMin) * 1.1)}px">여기에 들어가요</div>`);
    }
    const total = blocks.reduce((n, b) => n + (g && g.type === 'tdsize' && g.pid === b.pid ? g.minutes : b.minutes), 0);
    const done = blocks.length && blocks.every(b => b.status === 'done');
    return `<section class="td-col${sg.id === sel ? ' td-sel' : ''}${done ? ' td-clear' : ''}" data-seg="${sg.id}" data-action="td-select">
      <button class="td-head" data-action="td-select" data-seg="${sg.id}"><span class="td-title">${esc(sg.name)}</span><span class="td-total">${done ? '클리어!' : `총 ${total}분`}</span><span class="td-range">${clockText(toM(sg.start))}~${clockText(toM(sg.end))}</span></button>
      <div class="td-list">${cards.join('')}<div class="td-drop">${sg.id === sel ? '보관함 블록을 톡 누르면 여기에 들어가요' : '여기에 놓기'}</div></div>
    </section>`;
  }).join('');
}

function viewTodo() {
  const p = S.profiles.find(x => x.id === S.current);
  if (!p) { S.screen = 'profiles'; return viewProfiles(); }
  const lib = (S.blocks[p.id] || []).map(b => `<button class="block-card td-lib" style="background:${colorOf(b.color)}" data-action="td-add" data-id="${b.id}">
      <span class="block-icon">${iconHtml(b, b.icon === 'image' ? 44 : 26)}</span><span class="block-name">${esc(b.name)}</span><span class="block-meta">기본 ${b.minutes}분</span></button>`).join('');
  const isEdit = S.ctx && S.ctx.kind !== 'change';
  return editorFrame(p, 'todo', `
    <div class="td-tools"><p class="help">블록을 톡 누르면 고른 구간(주황 테두리)에 들어가요. 꾹 눌러서 원하는 구간으로 끌어다 놓아도 돼요. 블록 아래 손잡이를 당기면 시간이 바뀌어요.</p>${(S.history[p.id] || []).length ? '<button class="btn btn-sm" data-action="undo">' + svgUndo + '되돌리기</button>' : ''}${S.plans[p.id].blocks.some(isPending) ? '<button class="btn btn-sm btn-danger" data-action="td-reset">처음부터 다시</button>' : ''}</div>
    <div id="td-board" class="td-board">
      <section class="panel td-libpanel"><h2>블록 보관함</h2><div class="td-libgrid">${lib || '<p class="help">아직 블록이 없어요.</p>'}</div>
        ${isEdit ? '<button class="btn btn-ghost" data-action="ed-go" data-tab="blocks">+ 새 블록 만들기</button>' : ''}</section>
      <div id="td-cols" class="td-cols">${tdColumns(p.id)}</div>
    </div>`);
}
function renderTodoCols() {
  const el = document.getElementById('td-cols');
  if (!el || !S.current) return;
  const keep = Array.from(el.querySelectorAll('.td-list')).map(x => x.scrollTop);
  el.innerHTML = tdColumns(S.current);
  el.querySelectorAll('.td-list').forEach((x, i) => { x.scrollTop = keep[i] || 0; });
}

// 끌어서 놓을 곳: 손가락 아래 구간과 그 안에서 몇 번째인지
function tdDropAt(x, y) {
  const el = document.elementFromPoint(x, y), col = el && el.closest('.td-col');
  if (!col) return null;
  const cards = Array.from(col.querySelectorAll('.td-card'));
  let index = 0;
  for (const c of cards) { const r = c.getBoundingClientRect(); if (y > r.top + r.height / 2) index++; }
  return { seg: col.dataset.seg, index };
}

const todoActions = {
  'go-todo'() { if (!S.ctx) return; S.screen = 'todo'; S.editPid = null; render(); },
  'td-select'(el) { if (S.tdSel === el.dataset.seg) return; S.tdSel = el.dataset.seg; vibrate(8); renderTodoCols(); },
  async 'td-add'(el) {
    const kid = S.current, b = (S.blocks[kid] || []).find(x => x.id === el.dataset.id);
    if (!b) return;
    const seg = S.tdSel || currentSegId(kid);
    pushHistory(kid);
    const pb = newPlaced(b, seg), here = homeIncluded();
    if (here) appendToSeg(kid, seg, pb);
    const others = addToOtherDays(kid, b, seg);
    await savePlan(kid);
    vibrate(10);
    if (others.length) toast(`${b.name}: ${daysText(here ? [S.ctx.dow].concat(others) : others)}요일에 넣었어요`);
    if (here) { S.flashPid = pb.pid; setTimeout(() => { if (S.flashPid === pb.pid) S.flashPid = null; }, 1600); }
    render();
    warnBed(kid);
  },
  'td-reset'() {
    const kid = S.current, n = S.plans[kid].blocks.filter(isPending).length;
    const kept = S.plans[kid].blocks.length - n;
    S.dialog = { type: 'confirm', title: S.ctx ? '이 계획을 처음부터 다시 짤까요?' : '오늘 할 일을 처음부터 다시 짤까요?', text: `아직 안 한 블록 ${n}개를 모두 빼요.${kept ? ` 이미 한 블록 ${kept}개와 별은 그대로 남아요.` : ''} 잘못 눌렀으면 "되돌리기"로 돌아올 수 있어요.`, yes: '모두 빼기', onYes: async () => {
      pushHistory(kid);
      S.plans[kid].blocks = S.plans[kid].blocks.filter(b => !isPending(b));
      await savePlan(kid);
      S.dialog = null;
      vibrate([15, 40, 15]);
      toast('오늘 할 일을 비웠어요');
    } };
    render();
  },
  'reload-app'() { location.reload(); },
  'lib-new'() { actions['ed-go']({ dataset: { tab: 'blocks' } }); actions['add-block'](); }
};

function startTdGesture(g) {
  g.active = true;
  const board = document.getElementById('td-board');
  if (g.type !== 'tdsize') {
    const kid = S.current;
    const src = g.type === 'tdlib' ? (S.blocks[kid] || []).find(x => x.id === g.id) : templateOf(kid, S.plans[kid].blocks.find(b => b.pid === g.pid));
    g.slotMin = g.type === 'tdlib' ? src.minutes : S.plans[kid].blocks.find(b => b.pid === g.pid).minutes;
    const ghost = document.createElement('div');
    ghost.className = 'lib-ghost';
    ghost.style.background = colorOf(src.color);
    ghost.innerHTML = `<span class="block-icon">${iconHtml(src, src.icon === 'image' ? 60 : 40)}</span><span class="block-name">${esc(src.name)}</span>`;
    document.body.appendChild(ghost);
    g.ghost = ghost; moveGhost(g);
  }
  try { (g.type === 'tdlib' ? g.el : board).setPointerCapture(g.pointerId); } catch (e) { /* 없어도 동작 */ }
  vibrate(20);
  renderTodoCols();
}
function tdUpdate() {
  const g = S.g;
  if (g.type === 'tdsize') {
    const m = Math.max(5, Math.min(MAX_MIN, g.orig + Math.round((g.cy - g.y0) / 14) * 5));
    if (m !== g.minutes) { g.minutes = m; vibrate(8); renderTodoCols(); }
    return;
  }
  moveGhost(g);
  const d = tdDropAt(g.cx, g.cy), key = d ? d.seg + ':' + d.index : '';
  if (key !== g.dropKey) { g.dropKey = key; g.drop = d; if (d) vibrate(8); renderTodoCols(); }
}
async function endTdGesture(cancel) {
  const g = S.g; S.g = null;
  if (!g) return;
  clearTimeout(g.timer);
  if (g.ghost) g.ghost.remove();
  if (g.longPressed || g.active) S._suppressClick = { t: Date.now(), x: g.cx, y: g.cy };
  const kid = S.current, plan = S.plans[kid];
  if (!g.active || cancel) { renderTodoCols(); return; }
  if (g.type === 'tdsize') {
    if (g.minutes !== g.orig) {
      pushHistory(kid);
      plan.blocks.find(b => b.pid === g.pid).minutes = g.minutes;
      planPush(kid);
      await savePlan(kid);
    }
    render(); warnBed(kid); return;
  }
  const d = g.drop;
  if (!d) { render(); return; }
  pushHistory(kid);
  let pb;
  if (g.type === 'tdlib') pb = newPlaced((S.blocks[kid] || []).find(x => x.id === g.id), d.seg);
  else pb = plan.blocks.find(b => b.pid === g.pid);
  const from = g.type === 'tdmove' ? segOf(kid, pb).id : null;
  const order = segPids(kid, d.seg).filter(id => id !== pb.pid);
  const atEnd = d.index >= order.length;
  if (g.type === 'tdlib') {
    const src = (S.blocks[kid] || []).find(x => x.id === g.id);
    if (!homeIncluded()) {
      const others = addToOtherDays(kid, src, d.seg);
      await savePlan(kid);
      toast(others.length ? `${src.name}: ${daysText(others)}요일에 넣었어요` : '넣을 요일을 먼저 골라 주세요');
      render(); return;
    }
    if (atEnd) appendToSeg(kid, d.seg, pb); else { pb.start = toHM(segBase(kid, d.seg)); plan.blocks.push(pb); }
    addToOtherDays(kid, src, d.seg);
  }
  if (!(g.type === 'tdlib' && atEnd)) {
    // 몇 번째 앞에 넣을지: 화면의 카드 순서(끝낸 블록 포함)를 아직 안 한 블록 순서로 바꾼다
    const shown = plan.blocks.filter(b => segOf(kid, b).id === d.seg && b.pid !== pb.pid).sort((a, b) => toM(a.start) - toM(b.start));
    const before = shown.slice(0, d.index).filter(isPending).length;
    order.splice(before, 0, pb.pid);
    pb.seg = d.seg;
    packSeg(kid, d.seg, order);
    if (from && from !== d.seg) packSeg(kid, from, segPids(kid, from).filter(id => id !== pb.pid));
  }
  await savePlan(kid);
  S.flashPid = pb.pid; setTimeout(() => { if (S.flashPid === pb.pid) S.flashPid = null; }, 1600);
  vibrate(15);
  render(); warnBed(kid);
}

/* ---------- 4단계: 실행 모드 ---------- */
const STAR_TEMP = 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z';
// 별 n개 (확인 전 별은 점선 테두리의 연한 별)
function starRow(n, temp, size) {
  const one = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR_PATH}" fill="${temp ? '#FFF8E1' : '#F5A524'}" stroke="${temp ? '#B9A06A' : '#8A5A00'}" stroke-width="1.4" ${temp ? 'stroke-dasharray="2 1.6"' : ''} stroke-linejoin="round"></path></svg>`;
  return `<span class="stars${temp ? ' stars-temp' : ''}" aria-label="별 ${n}개${temp ? ' (확인 전)' : ''}">${one.repeat(n || 0)}</span>`;
}

const segList = kid => (S.setup[kid].segments[ctxWeekend(kid) ? 'weekend' : 'weekday'] || []);
const etcSeg = kid => ({ id: 'etc', name: '그 밖의 시간', start: S.setup[kid].sleep.end, end: S.setup[kid].sleep.start });
const segAt = (kid, m) => segList(kid).find(sg => m >= toM(sg.start) && m < toM(sg.end)) || etcSeg(kid);
function segOf(kid, pb) {
  if (pb.seg) { const sg = pb.seg === 'etc' ? etcSeg(kid) : segList(kid).find(x => x.id === pb.seg); if (sg) return sg; }
  return segAt(kid, toM(pb.origStart || pb.start));
}
const segBlocks = (kid, segId) => S.plans[kid].blocks.filter(b => segOf(kid, b).id === segId).sort((a, b) => toM(a.start) - toM(b.start));
const runningOf = kid => S.plans[kid].blocks.find(b => b.status === 'running');
// 다음 할 일: 하는 중이면 그 블록, 아니면 아직 안 한 블록 중 가장 이른 것
// 지금 할 일 순서: 하는 중 → 지금 시각에 해당하는 일 → 곧 할 다음 일. 시간이 지나버린 일은 '놓친 일'로 따로
const missedOf = kid => { const nm = nowMin(); return S.plans[kid].blocks.filter(b => isPending(b) && endOf(b) <= nm).sort((a, b) => toM(a.start) - toM(b.start)); };
function nextTodo(kid) {
  const r = runningOf(kid);
  if (r) return r;
  const nm = nowMin();
  return S.plans[kid].blocks.filter(b => isPending(b) && endOf(b) > nm).sort((a, b) => toM(a.start) - toM(b.start))[0] || null;
}

/*
 * 시작·연장·완료 뒤 아직 안 한 블록들의 시각을 다시 맞춘다.
 * 아직 안 한 블록은 처음 계획한 시각(origStart)보다 앞당겨지지 않고, 하는 중·끝난 블록·고정 일정과 겹치면 뒤로 밀린다.
 * 그래서 늦게 시작하면 뒤가 밀리고, 일찍 끝내면 밀렸던 만큼 원래 시각으로 돌아온다(따라잡기).
 */
function reflow(kid) {
  const plan = S.plans[kid];
  const busy = todayFixed(kid).map(f => ({ from: toM(f.start), to: toM(f.end) }))
    .concat(plan.blocks.filter(b => !isPending(b)).map(b => ({ from: toM(b.start), to: endOf(b) })));
  const pend = plan.blocks.filter(isPending).sort((a, b) => toM(a.origStart || a.start) - toM(b.origStart || b.start));
  let prevEnd = 0;
  for (const b of pend) {
    if (!b.origStart) b.origStart = b.start;
    let t = Math.max(toM(b.origStart), prevEnd);
    for (let i = 0; i < 30; i++) { const hit = busy.find(r => t < r.to && t + b.minutes > r.from); if (!hit) break; t = hit.to; }
    b.start = toHM(t);
    prevEnd = t + b.minutes;
  }
  plan.blocks.sort((a, b) => toM(a.start) - toM(b.start));
}
const delayOf = kid => S.plans[kid].blocks.filter(isPending).reduce((m, b) => Math.max(m, toM(b.start) - toM(b.origStart || b.start)), 0);

function nowStrip(kid) {
  const plan = S.plans[kid];
  if (!plan.blocks.length) return '';
  const b = nextTodo(kid), missed = missedOf(kid);
  const missedBtn = missed.length ? `<button class="btn btn-missed" data-action="open-missed">놓친 일 ${missed.length}개</button>` : '';
  if (!b) {
    if (missed.length) return `<div class="now-row"><div class="now-strip now-idle"><span class="now-text"><b>이제 남은 일정은 없어요</b><small>놓친 일을 지금 해도 돼요</small></span></div>${missedBtn}</div>`;
    const total = plan.blocks.reduce((n, x) => n + (x.stars || 0), 0);
    return `<div class="now-strip now-done">${svgStar(30)}<span class="now-text"><b>오늘 할 일을 다 했어요!</b> 별 ${total}개</span></div>`;
  }
  const t = templateOf(kid, b), a = toM(b.start), nm = nowMin();
  const running = b.status === 'running';
  const left = running ? Math.ceil((b.startedAtMs + b.minutes * 60000 - Date.now()) / 60000) : 0;
  const isNow = !running && a <= nm;
  const delay = delayOf(kid);
  return `<div class="now-row"><button class="now-strip${running ? ' now-running' : isNow ? ' now-now' : ''}" data-action="run-open" data-id="${b.pid}">
    <span class="tl-icon now-icon" style="background:${colorOf(t.color)}">${iconHtml(t, t.icon === 'image' ? 40 : 28)}</span>
    <span class="now-text"><small>${running ? '하는 중' : isNow ? '지금 할 시간이에요!' : `다음 할 일 · ${a - nm < 60 ? `${a - nm}분 뒤` : `${ampm(a)} ${clockText(a)}`}`}</small><b>${esc(t.name)}</b></span>
    <span class="now-time">${running ? (left > 0 ? `${left}분 남음` : '시간이 다 됐어요') : `${ampm(a)} ${clockText(a)}`}${delay > 0 ? `<small class="now-delay">${delay}분 밀렸어요</small>` : ''}</span>
    <span class="btn btn-go now-go">${running ? '이어서 하기' : '하러 가기'}</span>
  </button>${missedBtn}</div>`;
}

const CIRC = 2 * Math.PI * 150;
function runState(pb) {
  if (!pb || pb.status !== 'running') return { phase: pb && pb.status === 'done' ? 'done' : 'ready', rem: (pb ? pb.minutes : 0) * 60000, frac: 1 };
  const total = pb.minutes * 60000, rem = pb.startedAtMs + total - Date.now();
  return { phase: rem <= 0 ? 'over' : rem <= 60000 ? 'last' : 'run', rem, frac: Math.max(0, Math.min(1, rem / total)) };
}
const remText = rem => rem <= 0 ? '시간 끝' : rem < 60000 ? `${Math.ceil(rem / 1000)}초` : `${Math.ceil(rem / 60000)}분`;
const RUN_COLORS = { ready: '#3E7CC9', run: '#2E9E5B', last: '#F5A524', over: '#D64545', done: '#2E9E5B' };
const starsFor = pb => (Date.now() - pb.startedAtMs) / 60000 <= pb.minutes + 0.5 ? [3, 2, 1][pb.ext || 0] : 1;

function viewRun() {
  const kid = S.current, plan = S.plans[kid], pb = plan && plan.blocks.find(b => b.pid === S.runPid);
  if (!pb) { S.screen = 'op'; return viewOp(); }
  const t = templateOf(kid, pb), st = runState(pb), seg = segOf(kid, pb);
  const sbl = segBlocks(kid, seg.id), doneN = sbl.filter(b => b.status === 'done').length;
  const dots = `<span class="run-dots-label">이 구간 ${doneN}/${sbl.length}</span>` + sbl.map(b => {
    const bt = templateOf(kid, b);
    if (b.status === 'done') return `<span class="run-dot run-dot-done" title="${esc(bt.name)}">${starRow(1, !b.confirmed, 30)}</span>`;
    return `<span class="run-dot${b.pid === pb.pid ? ' run-dot-now' : ''}" style="background:${colorOf(bt.color)}" title="${esc(bt.name)}">${iconHtml(bt, bt.icon === 'image' ? 26 : 18)}</span>`;
  }).join('');
  const other = runningOf(kid);
  const a = toM(pb.start), z = a + pb.minutes;
  const next = plan.blocks.filter(b => isPending(b) && b.pid !== pb.pid).sort((x, y) => toM(x.start) - toM(y.start))[0];
  const nt = next && templateOf(kid, next);
  const extLeft = 2 - (pb.ext || 0);
  let buttons;
  if (pb.status === 'running') {
    buttons = `<button class="btn btn-go run-big" data-action="run-done">다 했어요!</button>
      <button class="btn run-mid" data-action="run-extend" ${extLeft ? '' : 'disabled'}>${extLeft ? `5분만 더 (${extLeft}번 남음)` : '더 늘릴 수 없어요'}</button>`;
  } else if (other && other.pid !== pb.pid) {
    buttons = `<p class="run-note">먼저 <b>${esc(templateOf(kid, other).name)}</b>을(를) 끝내요</p><button class="btn btn-go run-mid" data-action="run-open" data-id="${other.pid}">그거 하러 가기</button>`;
  } else {
    buttons = `<button class="btn btn-go run-big" data-action="run-start">시작!</button>`;
  }
  const preview = pb.status === 'running' ? `<div class="run-preview"><span>${st.phase === 'over' ? '지금 끝내면' : '지금 끝내면'}</span>${starRow(st.phase === 'over' ? 1 : [3, 2, 1][pb.ext || 0], t.needsCheck, 30)}${t.needsCheck ? '<span class="sub">· 확인 필요</span>' : ''}</div>` : '';
  return `<main class="screen run run-${st.phase}">
    <div class="topbar">
      <div class="topbar-left"><button class="btn" data-action="run-close">← 시간표</button><h1 class="title-big">${esc(seg.name)}</h1></div>
      <div class="run-dots" aria-label="이 구간 진행">${dots}</div>
    </div>
    <div class="run-body">
      <div class="run-timer">
        <svg viewBox="0 0 380 380" role="img" aria-label="남은 시간">
          <circle cx="190" cy="190" r="150" fill="#FFFFFF" stroke="#E3E8F2" stroke-width="32"></circle>
          <circle id="run-arc" cx="190" cy="190" r="150" fill="none" stroke="${RUN_COLORS[st.phase]}" stroke-width="32" stroke-linecap="round" stroke-dasharray="${(st.frac * CIRC).toFixed(1)} ${CIRC.toFixed(1)}" transform="rotate(-90 190 190)"></circle>
        </svg>
        <div class="run-timer-text"><span id="run-left">${st.phase === 'ready' ? pb.minutes + '분' : remText(st.rem)}</span><small id="run-sub">${st.phase === 'ready' ? '시작을 누르면 시작해요' : st.phase === 'over' ? '시간이 다 됐어요' : '남았어요'}</small></div>
      </div>
      <div class="run-info">
        <div class="run-what">
          <span class="run-icon" style="background:${colorOf(t.color)}">${iconHtml(t, t.icon === 'image' ? 150 : 96)}</span>
          <div class="run-name"><small>${pb.status === 'running' ? '지금 하는 일' : '지금 할 일'}</small><b>${esc(t.name)}</b>
            <span class="run-when">${miniClock(a, 30)} ${ampm(a)} ${clockText(a)} ~ ${clockText(z)} · ${pb.minutes}분</span></div>
        </div>
        ${preview}
        <div class="run-buttons">${buttons}</div>
        ${nt ? `<div class="run-next"><span class="sub">다음</span><span class="tl-icon" style="width:44px;height:44px;background:${colorOf(nt.color)}">${iconHtml(nt, nt.icon === 'image' ? 40 : 26)}</span><b>${esc(nt.name)}</b><span>${clockText(toM(next.start))}</span>${pb.status === 'running' ? '<span class="run-free-tip">일찍 끝내면 자유 시간!</span>' : ''}</div>` : ''}
      </div>
    </div>
    ${S.runResult ? viewRunResult() : ''}
  </main>`;
}

function viewRunResult() {
  const r = S.runResult;
  return `<div class="run-result" role="dialog" aria-modal="true">
    <div class="run-result-stars">${Array.from({ length: r.stars }, (_, i) => `<span class="pop" style="animation-delay:${i * 0.18}s">${starRow(1, r.temp, i === 1 ? 140 : 110)}</span>`).join('')}</div>
    <h2>${r.stars === 3 ? '최고예요!' : r.stars === 2 ? '잘했어요!' : '끝까지 해냈어요!'} 별 ${r.stars}개</h2>
    ${r.catchup ? '<p class="run-badge">따라잡기 성공!</p>' : ''}
    ${r.free ? `<p class="run-badge run-badge-free">자유 시간 ${r.free}분!</p>` : ''}
    ${r.temp ? '<p class="sub">엄마·아빠한테 보여주면 별이 금색으로 빛나요</p>' : ''}
    <div class="actions run-result-actions">
      ${r.cleared ? `<button class="btn btn-go run-mid" data-action="clear-open" data-seg="${r.cleared}">클리어 보러 가기</button>`
        : r.nextPid ? `<button class="btn run-mid" data-action="run-close">시간표로</button><button class="btn btn-go run-mid" data-action="run-open" data-id="${r.nextPid}">다음 할 일</button>`
        : `<button class="btn btn-go run-mid" data-action="run-close">시간표로</button>`}
    </div>
  </div>`;
}

function viewClear() {
  const kid = S.current, seg = segList(kid).find(x => x.id === S.clearSeg) || { id: 'etc', name: '그 밖의 시간' };
  const blocks = segBlocks(kid, seg.id).filter(b => b.status === 'done');
  const todayStars = S.plans[kid].blocks.reduce((n, b) => n + (b.status === 'done' ? b.stars || 0 : 0), 0);
  const temp = blocks.filter(b => !b.confirmed).reduce((n, b) => n + (b.stars || 0), 0);
  const cards = blocks.map(b => {
    const t = templateOf(kid, b);
    return `<div class="clear-card${b.confirmed ? '' : ' clear-temp'}"><div class="clear-head"><span class="tl-icon" style="width:56px;height:56px;background:${colorOf(t.color)}">${iconHtml(t, t.icon === 'image' ? 52 : 32)}</span><b>${esc(t.name)}</b></div>${starRow(b.stars, !b.confirmed, 44)}<span class="sub">${b.stars === 1 && !b.ext ? '시간은 넘겼지만 끝까지!' : b.ext ? `5분 ${b.ext}번 늘림` : '시간 안에 끝!'}${b.confirmed ? '' : ' · 확인 기다리는 중'}</span></div>`;
  }).join('');
  return `<main class="screen clear">
    <div class="clear-top">${svgStar(110)}${svgStar(150)}${svgStar(110)}</div>
    <h1 class="clear-title">${esc(seg.name)} 클리어!</h1>
    <p class="clear-sub">블록 ${blocks.length}개를 모두 해냈어요 · 오늘 모은 별 ${todayStars}개</p>
    <div class="clear-grid">${cards}</div>
    ${temp ? `<button class="clear-note" data-action="confirm-ask">${starRow(1, true, 36)}<b>엄마·아빠한테 보여주면 별 ${temp}개가 금색으로 빛나요!</b><span class="btn btn-go">확인 받기</span></button>` : ''}
    <div class="actions clear-actions"><button class="btn btn-go run-mid" data-action="run-close">시간표로</button></div>
  </main>`;
}

const runActions = {
  'run-open'(el) {
    S.runPid = el.dataset.id; S.runResult = null; S.dialog = null; S.editPid = null;
    S.screen = 'run'; S._runPhase = null; render();
  },
  'open-missed'() { S.dialog = { type: 'missed' }; render(); },
  async 'missed-remove'(el) {
    const kid = S.current, b = S.plans[kid].blocks.find(x => x.pid === el.dataset.id);
    if (!b) return;
    pushHistory(kid);
    S.plans[kid].blocks = S.plans[kid].blocks.filter(x => x.pid !== b.pid);
    await savePlan(kid);
    if (!missedOf(kid).length) S.dialog = null;
    toast(`${b.name}: 시간표에서 뺐어요`);
  },
  'run-close'() { S.screen = 'op'; S.opTab = 'today'; S.runResult = null; S.scrolled = false; S.opWeek = null; render(); },
  async 'run-start'() {
    const kid = S.current, pb = S.plans[kid].blocks.find(b => b.pid === S.runPid);
    if (!pb || !isPending(pb) || runningOf(kid)) return;
    if (!pb.origStart) pb.origStart = pb.start;
    pb.status = 'running'; pb.startedAtMs = Date.now(); pb.start = toHM(nowMin());
    delete pb.redo; delete pb.redoPrev;
    pb.baseMinutes = pb.minutes; pb.ext = 0;
    reflow(kid);
    S.history[kid] = [];
    await savePlan(kid);
    unlockAudio(); vibrate(20); tone(523, 0.12, 0.06); tone(784, 0.18, 0.06, 0.12);
    const d = delayOf(kid);
    if (d > 0) toast(`늦게 시작해서 뒤 일정이 ${d}분 밀렸어요`); else render();
  },
  async 'run-extend'() {
    const kid = S.current, pb = S.plans[kid].blocks.find(b => b.pid === S.runPid);
    if (!pb || pb.status !== 'running' || (pb.ext || 0) >= 2) return;
    pb.ext = (pb.ext || 0) + 1; pb.minutes += 5;
    reflow(kid);
    await savePlan(kid);
    vibrate(15);
    toast(`5분 늘렸어요 (${2 - pb.ext}번 남음)`);
  },
  async 'run-done'() {
    const kid = S.current, plan = S.plans[kid], pb = plan.blocks.find(b => b.pid === S.runPid);
    if (!pb || pb.status !== 'running') return;
    const t = templateOf(kid, pb);
    const delayBefore = delayOf(kid);
    const elapsed = (Date.now() - pb.startedAtMs) / 60000;
    pb.stars = starsFor(pb);
    pb.fast = elapsed < (pb.baseMinutes || pb.minutes) / 2;
    pb.status = 'done'; pb.endAt = toHM(nowMin()); pb.confirmed = !t.needsCheck;
    reflow(kid);
    S.history[kid] = [];
    await savePlan(kid);
    const next = plan.blocks.filter(isPending).sort((a, b) => toM(a.start) - toM(b.start)).find(b => toM(b.start) >= nowMin());
    const gap = next ? toM(next.start) - nowMin() : 0;
    const seg = segOf(kid, pb), sb = segBlocks(kid, seg.id);
    S.runResult = {
      stars: pb.stars, temp: !pb.confirmed,
      catchup: delayBefore > 0 && delayOf(kid) === 0,
      free: gap >= 3 && gap <= 180 ? gap : 0,
      cleared: sb.length && sb.every(b => b.status === 'done') ? seg.id : null,
      nextPid: (nextTodo(kid) || {}).pid || null
    };
    vibrate([15, 40, 15]);
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 0.06, i * 0.11));
    render();
  },
  'clear-open'(el) { S.clearSeg = el.dataset.seg; S.runResult = null; S.screen = 'clear'; render(); }
};

// 1초마다 타이머 숫자와 원만 바꾼다 (버튼은 그대로 두어서 누르는 중에 사라지지 않게)
function tickRun() {
  if (S.screen !== 'run' || S.runResult) return;
  const pb = S.plans[S.current] && S.plans[S.current].blocks.find(b => b.pid === S.runPid);
  if (!pb || pb.status !== 'running') return;
  const st = runState(pb);
  if (S._runPhase && S._runPhase !== st.phase) {
    if (st.phase === 'last') { vibrate([20, 80, 20]); tone(784, 0.25, 0.06); tone(988, 0.3, 0.06, 0.25); }
    if (st.phase === 'over') { vibrate([40, 80, 40, 80, 40]); [659, 523, 659].forEach((f, i) => tone(f, 0.22, 0.07, i * 0.25)); }
    S._runPhase = st.phase;
    render();
    return;
  }
  S._runPhase = st.phase;
  const arc = document.getElementById('run-arc'), left = document.getElementById('run-left');
  if (arc) arc.setAttribute('stroke-dasharray', `${(st.frac * CIRC).toFixed(1)} ${CIRC.toFixed(1)}`);
  if (left) left.textContent = remText(st.rem);
}
setInterval(tickRun, 1000);

/* 부모님 메뉴: 하루 시간 (잠자는 시간, 구간, 고정 일정) */
function setPath(obj, path, val) {
  const keys = path.split('.');
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
  o[keys[keys.length - 1]] = val;
}
function checkDay(d) {
  const wake = toM(d.sleep.end), bed = toM(d.sleep.start);
  if (!(bed > wake)) return '잠드는 시각은 일어나는 시각보다 늦어야 해요';
  for (const mode of ['weekday', 'weekend']) for (const sg of d.segments[mode]) {
    if (!String(sg.name).trim()) return '이름 없는 구간이 있어요';
    if (!(toM(sg.end) > toM(sg.start))) return `${sg.name}: 끝나는 시각이 시작보다 늦어야 해요`;
  }
  for (const f of d.fixed) {
    if (!String(f.name).trim()) return '이름 없는 고정 일정이 있어요';
    if (!(toM(f.end) > toM(f.start))) return `${f.name}: 끝나는 시각이 시작보다 늦어야 해요`;
    if (!f.days.length) return `${f.name}: 요일을 하나 이상 골라 주세요`;
  }
  return null;
}
function parentDay() {
  if (!S.profiles.length) return '<h2>하루 시간</h2><p class="help">아이를 먼저 추가해 주세요.</p>';
  if (!S.profiles.some(p => p.id === S.parentKid)) S.parentKid = S.profiles[0].id;
  const kid = S.parentKid;
  if (!S.dayDraft || S.dayDraft.kid !== kid) S.dayDraft = { kid, mode: isWeekend() ? 'weekend' : 'weekday', data: JSON.parse(JSON.stringify(S.setup[kid])) };
  const d = S.dayDraft.data, mode = S.dayDraft.mode;
  const kidTabs = S.profiles.map(p => `<button class="pill" data-action="pick-kid" data-id="${p.id}" aria-pressed="${p.id === kid}">${esc(p.name)}</button>`).join('');
  const segRows = d.segments[mode].map((sg, i) => `<div class="row">
      <button class="swatch swatch-sm" style="background:${SEG_COLORS[sg.c % SEG_COLORS.length][0]}" data-action="seg-color" data-i="${i}" aria-label="띠 색 바꾸기"></button>
      <input class="text-input input-sm grow-input" maxlength="10" value="${esc(sg.name)}" data-tf="segments.${mode}.${i}.name" aria-label="구간 이름">
      <span class="time-pair"><input type="time" class="time-input" value="${esc(sg.start)}" data-tf="segments.${mode}.${i}.start" aria-label="시작"> ~ <input type="time" class="time-input" value="${esc(sg.end)}" data-tf="segments.${mode}.${i}.end" aria-label="끝"></span>
      <button class="btn btn-icon btn-danger" data-action="seg-del" data-i="${i}" aria-label="구간 삭제">✕</button>
    </div>`).join('');
  const fxRows = d.fixed.map((f, i) => `<div class="row row-col">
      <div class="row-line">
        <input class="text-input input-sm grow-input" maxlength="10" value="${esc(f.name)}" data-tf="fixed.${i}.name" aria-label="일정 이름">
        <span class="time-pair"><input type="time" class="time-input" value="${esc(f.start)}" data-tf="fixed.${i}.start" aria-label="시작"> ~ <input type="time" class="time-input" value="${esc(f.end)}" data-tf="fixed.${i}.end" aria-label="끝"></span>
        <button class="btn btn-icon btn-danger" data-action="fx-del" data-i="${i}" aria-label="일정 삭제">✕</button>
      </div>
      <div class="row-line">
        <span class="days">${[1, 2, 3, 4, 5, 6, 0].map(dd => `<button class="day-pill" data-action="fx-day" data-i="${i}" data-d="${dd}" aria-pressed="${f.days.includes(dd)}">${DAY_NAMES[dd]}</button>`).join('')}</span>
        <label class="switch"><input type="checkbox" ${f.fold ? 'checked' : ''} data-tfcheck="fixed.${i}.fold">시간표에서 접어서 보기</label>
      </div>
    </div>`).join('');
  return `<div class="ed-head"><h1>하루 시간</h1><span class="ed-sub">${esc(S.profiles.find(k => k.id === kid).name)}의 잠자는 시간, 구간, 학교·학원</span></div>
    <h3 class="sub-head">잠자는 시간</h3>
    <div class="row"><span class="grow">시간표에서 얇게 접혀 보여요. 블록은 잠자는 시간에 넣을 수 없어요.</span>
      <span class="time-pair">잠들기 <input type="time" class="time-input" value="${esc(d.sleep.start)}" data-tf="sleep.start" aria-label="잠드는 시각"></span>
      <span class="time-pair">일어나기 <input type="time" class="time-input" value="${esc(d.sleep.end)}" data-tf="sleep.end" aria-label="일어나는 시각"></span>
    </div>
    <div class="section-head"><h3 class="sub-head">구간 (색 띠)</h3>
      <div class="kid-tabs"><button class="pill" data-action="day-mode" data-mode="weekday" aria-pressed="${mode === 'weekday'}">평일</button><button class="pill" data-action="day-mode" data-mode="weekend" aria-pressed="${mode === 'weekend'}">주말</button></div></div>
    <p class="help">시간표 위에 색 띠로 보여서 "이 시간엔 이런 일을 해요"를 알려줘요. 색 네모를 누르면 띠 색이 바뀌어요.</p>
    <div class="list">${segRows}</div>
    <div><button class="btn btn-ghost" data-action="seg-add">+ 구간 추가</button></div>
    <h3 class="sub-head">고정 일정 (학교·학원)</h3>
    <p class="help">움직일 수 없는 회색 블록으로 보여요. 학교처럼 긴 일정은 접어 두면 시간표가 짧아져요.</p>
    <div class="list">${fxRows}</div>
    <div><button class="btn btn-ghost" data-action="fx-add">+ 고정 일정 추가</button></div>
    <div class="actions"><button class="btn" data-action="day-reset">원래대로</button><button class="btn btn-go" data-action="day-save">저장</button></div>`;
}

/* ---------- 대화상자 ---------- */
function viewDialog() {
  const d = S.dialog;
  let inner = '';
  if (d.type === 'kid') {
    const sw = COLORS.map(c => `<button class="swatch" style="background:${c.v}" data-action="draft" data-key="color" data-val="${c.id}" aria-pressed="${d.draft.color === c.id}" aria-label="${c.name}"></button>`).join('');
    inner = `<h2>${d.editing ? '아이 정보 고치기' : '아이 추가'}</h2>
      <div class="field"><label for="kid-name">이름</label><input id="kid-name" class="text-input" maxlength="8" value="${esc(d.draft.name)}" data-bind="name" autocomplete="off"></div>
      <div class="field"><span class="label">색</span><div class="swatches">${sw}</div></div>
      ${d.editing ? '' : '<p class="help">기본 블록 8개가 함께 만들어져요. 나중에 블록 보관함에서 고칠 수 있어요.</p>'}
      <div class="actions">${d.editing ? '<button class="btn btn-danger" data-action="ask-delete-kid">삭제</button><span class="spacer"></span>' : ''}<button class="btn" data-action="close-dialog">취소</button><button class="btn btn-go" data-action="save-kid">저장</button></div>`;
  } else if (d.type === 'block') {
    const b = d.draft;
    const gallery = S.drawings[S.parentKid] || [];
    const inGallery = gallery.some(g => g.image === b.image);
    const current = b.image && !inGallery ? `<button class="icon-pick icon-mine" data-action="draft" data-key="icon" data-val="image" aria-pressed="${b.icon === 'image'}" aria-label="지금 쓰는 그림"><img src="${esc(b.image)}" alt="" width="56" height="56"></button>` : '';
    const mine = current + gallery.map(g => `<button class="icon-pick icon-mine" data-action="pick-drawing" data-id="${g.id}" aria-pressed="${b.icon === 'image' && b.image === g.image}" aria-label="그림 보관함의 그림"><img src="${esc(g.image)}" alt="" width="56" height="56"></button>`).join('');
    const icons = Object.keys(ICONS).map(k => `<button class="icon-pick" data-action="draft" data-key="icon" data-val="${k}" aria-pressed="${b.icon === k}" aria-label="아이콘 ${k}">${svgIcon(k, 34)}</button>`).join('');
    const sw = COLORS.map(c => `<button class="swatch" style="background:${c.v}" data-action="draft" data-key="color" data-val="${c.id}" aria-pressed="${b.color === c.id}" aria-label="${c.name}"></button>`).join('');
    inner = `<h2>${d.editing ? '블록 고치기' : '새 블록'}</h2>
      <div class="field"><label for="block-name">이름</label><input id="block-name" class="text-input" maxlength="12" value="${esc(b.name)}" data-bind="name" autocomplete="off"></div>
      <div class="field"><span class="label">아이 그림 (그림 보관함)</span>
        <div class="icons">${mine || '<p class="help">아직 그림이 없어요. 아이가 그림 보관함에서 미리 그려 둘 수 있어요.</p>'}</div>
        <div class="draw-row">
          <button class="btn" data-action="open-draw">직접 그리기</button>
          <label class="btn" for="block-image-file">그림 사진 올리기</label>
          <input id="block-image-file" type="file" accept="image/*" data-change="block-image" hidden>
        </div>
        <p class="help">사진 팁: 흰 종이에 굵은 펜으로 크게 그리고, 그림이 가운데 오게 위에서 찍어요. JPG·PNG 사진 모두 되고, 앱이 정사각형으로 잘라 줄여요. 새로 그린 그림은 그림 보관함에도 저장돼요.</p>
      </div>
      <div class="field"><span class="label">기본 그림</span><div class="icons">${icons}</div></div>
      <div class="field"><span class="label">색</span><div class="swatches">${sw}</div></div>
      <div class="field"><span class="label">기본 시간</span><div class="stepper">
        <button class="btn btn-icon" data-action="minutes" data-d="-5" aria-label="5분 줄이기">−</button>
        <output>${b.minutes}분</output>
        <button class="btn btn-icon" data-action="minutes" data-d="5" aria-label="5분 늘리기">+</button></div></div>
      <label class="switch" for="needs-check"><input id="needs-check" type="checkbox" ${b.needsCheck ? 'checked' : ''} data-change="needs-check">부모님 확인 필요 (확인해야 진짜 별)</label>
      <div class="actions">${d.editing ? '<button class="btn btn-danger" data-action="delete-block">삭제</button><span class="spacer"></span>' : ''}<button class="btn" data-action="close-dialog">취소</button><button class="btn btn-go" data-action="save-block">저장</button></div>`;
  } else if (d.type === 'confirm') {
    inner = `<h2>${esc(d.title)}</h2><p class="help">${esc(d.text)}</p>
      <div class="actions"><button class="btn" data-action="close-dialog">취소</button><button class="btn btn-danger" data-action="confirm-yes">${esc(d.yes)}</button></div>`;
  } else if (d.type === 'drawing') {
    const kid = S.current, g = (S.drawings[kid] || []).find(x => x.id === d.id);
    const used = (S.blocks[kid] || []).filter(b => b.icon === 'image' && g && b.image === g.image).map(b => b.name);
    inner = g ? `<h2>내 그림</h2>
      <img class="art-big" src="${esc(g.image)}" alt="내 그림">
      <p class="help">${g.fromName ? `${esc(senderName(g.fromName))} ${esc(g.createdAt)}에 선물했어요` : `${esc(g.createdAt)}에 그렸어요`}${used.length ? ` · ${esc(used.join(', '))} 블록에 쓰는 중` : ''}</p>
      ${(S.blocks[kid] || []).length ? `<div class="field"><span class="label">블록에 붙이기</span>
        <p class="help">누르면 그 블록 그림이 이 그림으로 바뀌어요. 다시 누르면 원래 그림으로 돌아가요.</p>
        <div class="attach-grid">${(S.blocks[kid] || []).map(b => {
          const on = b.icon === 'image' && b.image === g.image;
          return `<button class="attach-chip" style="background:${colorOf(b.color)}" data-action="attach-drawing" data-id="${g.id}" data-block="${b.id}" aria-pressed="${on}"><span class="block-icon sm">${iconHtml(b, b.icon === 'image' ? 36 : 24)}</span><span class="attach-name">${esc(b.name)}</span>${on ? '<span class="chip chip-go">쓰는 중</span>' : ''}</button>`;
        }).join('')}</div></div>` : ''}
      ${S.profiles.length > 1 ? `<div class="gift-row">${S.profiles.filter(x => x.id !== kid).map(x => `<button class="btn btn-gift" data-action="send-drawing" data-id="${g.id}" data-to="${x.id}"><span class="avatar xs" style="background:${colorOf(x.color)}">${esc(x.name.slice(0, 1))}</span>${esc(x.name)}에게 선물하기</button>`).join('')}</div>` : ''}
      <div class="actions"><button class="btn btn-danger" data-action="ask-delete-drawing" data-id="${g.id}">지우기</button><span class="spacer"></span><button class="btn btn-go" data-action="close-dialog">닫기</button></div>` : '';
  } else if (d.type === 'use-drawing') {
    inner = `<h2>${esc(d.name)} 블록 그림으로 쓸까요?</h2>
      <img class="art-big" src="${esc(d.image)}" alt="방금 그린 그림">
      <div class="actions"><button class="btn" data-action="close-dialog">보관만 할래요</button><button class="btn btn-go" data-action="use-drawing-yes">블록 그림으로 쓰기</button></div>`;
  } else if (d.type === 'placed') {
    const kid = S.current, pb = (S.plans[kid] || { blocks: [] }).blocks.find(x => x.pid === d.pid);
    if (pb) {
      const t = templateOf(kid, pb), a = toM(pb.start), z = a + pb.minutes;
      inner = `<div class="placed-head"><span class="block-icon xl" style="background:#FFFFFF;border:6px solid ${colorOf(t.color)}">${iconHtml(t, t.icon === 'image' ? 128 : 72)}</span>
        <div><h2>${esc(t.name)}</h2><p class="placed-time">${miniClock(a, 44)}<span>${ampm(a)} ${clockText(a)} ~ ${clockText(z)}</span></p><p class="help">${pb.minutes}분${t.needsCheck ? ' · 부모님 확인 필요' : ''}</p></div></div>
        ${pb.status === 'done' ? `<div class="placed-result">${starRow(pb.stars, !pb.confirmed, 40)}<span>${clockText(toM(pb.start))}~${clockText(toM(pb.endAt))}에 했어요${pb.confirmed ? '' : ' · 엄마·아빠 확인을 기다려요'}</span></div>
        <div class="actions"><span class="spacer"></span>${!pb.confirmed && S.screen === 'op' ? '<button class="btn" data-action="close-dialog">닫기</button><button class="btn btn-go" data-action="confirm-ask">확인 받기</button>' : '<button class="btn btn-go" data-action="close-dialog">닫기</button>'}</div>`
        : pb.status === 'running' ? `<div class="actions"><span class="spacer"></span><button class="btn" data-action="close-dialog">닫기</button><button class="btn btn-go" data-action="run-open" data-id="${pb.pid}">이어서 하기</button></div>`
        : S.screen === 'op' ? `<div class="actions"><span class="spacer"></span><button class="btn" data-action="close-dialog">닫기</button>${runningOf(kid) ? '' : `<button class="btn btn-go" data-action="op-start" data-id="${pb.pid}">지금 시작하기</button>`}</div>`
        : `<p class="help">옮기거나 시간을 바꾸려면 시간표에서 이 블록을 꾹 눌러요.</p>
        <div class="actions"><button class="btn btn-danger" data-action="remove-placed" data-id="${pb.pid}">빼기</button><span class="spacer"></span><button class="btn${S.ctx ? ' btn-go' : ''}" data-action="close-dialog">닫기</button>${S.ctx ? '' : `<button class="btn btn-go" data-action="run-open" data-id="${pb.pid}">지금 하러 가기</button>`}</div>`}`;
    }
  } else if (d.type === 'change-confirm') {
    const dow = new Date().getDay();
    inner = `<h2>엄마·아빠 확인</h2><p class="help">${esc(senderName(S.profiles.find(k => k.id === S.current).name))} 오늘 할 일을 이렇게 바꾸고 싶어요</p>
      <div class="list">${d.diff.map(x => `<div class="diff-row diff-${x.cls}"><span class="diff-mark">${x.mark}</span><b>${esc(x.name)}</b><span class="diff-detail">${esc(x.detail)}</span></div>`).join('')}</div>
      <p class="help">"이번만"은 오늘만 바뀌고, "매주 ${DOW_FULL[dow]}도"는 ${DOW_FULL[dow]} 기본 시간표까지 바뀌어요. 누르면 비밀번호를 물어봐요.</p>
      <div class="actions"><button class="btn" data-action="close-dialog">더 고칠래요</button><span class="spacer"></span><button class="btn btn-go" data-action="change-apply" data-scope="once">이번만</button><button class="btn btn-plan-solid" data-action="change-apply" data-scope="week">매주 ${DOW_FULL[dow]}도</button></div>`;
  } else if (d.type === 'copy-day') {
    inner = `<h2>${DOW_FULL[d.from]} 시간표 복사</h2><p class="help">고른 요일의 기본 시간표가 ${DOW_FULL[d.from]}과 똑같아져요. 이미 짜 둔 요일은 바뀌어요.</p>
      <div class="days copy-days">${DOW_ORDER.filter(x => x !== d.from).map(x => `<button class="day-pill day-pill-lg" data-action="copy-pick" data-dow="${x}" aria-pressed="${d.to.includes(x)}">${DAY_NAMES[x]}</button>`).join('')}</div>
      <div><button class="btn btn-sm" data-action="copy-weekdays">평일 모두 고르기</button></div>
      <div class="actions"><button class="btn" data-action="close-dialog">취소</button><button class="btn btn-go" data-action="copy-do">복사하기</button></div>`;
  } else if (d.type === 'plan-date') {
    const kid = S.current, mark = S.marks[kid][d.date], inf = S.calInfo && S.calInfo.days[d.date];
    const past = d.date < today();
    const follows = inf && inf.edited ? '이날만 따로 짠 계획이 있어요' : `${DOW_FULL[templateDow(kid, d.date)]} 기본 시간표를 따라요`;
    inner = `<h2>${dateLabel(d.date)}</h2>
      <p class="help">${past ? '지난 날이에요. 기록만 볼 수 있어요.' : follows}${mark ? ` · ${esc(mark.label)}` : ''}${inf && inf.stars ? ` · 별 ${inf.stars}개` : ''}</p>
      ${past ? '' : `<div class="field"><span class="label">이날 계획 고치기</span><div class="draw-row">
        <button class="btn btn-go" data-action="plan-edit-date" data-screen="todo">할 일 고치기</button>
        <button class="btn" data-action="plan-edit-date" data-screen="home">시간표 고치기</button>
        ${inf && inf.edited ? '<button class="btn btn-danger" data-action="date-reset">기본 시간표로 되돌리기</button>' : ''}</div></div>
      <div class="field"><label for="mark-label">특별한 날 표시</label>
        <input id="mark-label" class="text-input input-sm" maxlength="10" placeholder="예: 생일, 체험학습" value="${esc(d.label)}" data-dbind="label" autocomplete="off">
        <div class="draw-row"><button class="btn" data-action="date-mark" data-type="special">특별한 날로</button><button class="btn" data-action="date-mark" data-type="off">쉬는 날로 (토요일 시간표)</button>${mark ? '<button class="btn btn-danger" data-action="date-mark" data-type="none">표시 지우기</button>' : ''}</div></div>`}
      <div class="actions"><button class="btn btn-go" data-action="close-dialog">닫기</button></div>`;
  } else if (d.type === 'missed') {
    const kid = S.current, list = missedOf(kid), busy = runningOf(kid);
    inner = `<h2>놓친 일</h2><p class="help">시간이 지나버린 일이에요. 지금 해도 별을 받을 수 있어요. 오늘 못 할 일은 "오늘 할 일 바꾸고 싶어요"에서 빼요.</p>
      <div class="list">${list.map(b => { const t = templateOf(kid, b), a = toM(b.start); return `<div class="row">
        <span class="tl-icon" style="width:52px;height:52px;background:${colorOf(t.color)}">${iconHtml(t, t.icon === 'image' ? 48 : 30)}</span>
        <div class="grow"><span class="name">${esc(t.name)}</span><span class="sub">${b.redo ? '엄마·아빠가 "조금만 더!"라고 했어요. 다시 해 봐요' : `${ampm(a)} ${clockText(a)}에 하기로 했어요`} · ${b.minutes}분</span></div>
        ${S.screen === 'op' ? '' : `<button class="btn btn-danger" data-action="missed-remove" data-id="${b.pid}">빼기</button>`}
        <button class="btn btn-go" data-action="op-start" data-id="${b.pid}" ${busy ? 'disabled' : ''}>지금 하기</button></div>`; }).join('') || '<p class="help">놓친 일이 없어요.</p>'}</div>
      ${busy ? '<p class="help">지금 하는 일을 먼저 끝내요.</p>' : ''}
      <div class="actions"><button class="btn btn-go" data-action="close-dialog">닫기</button></div>`;
  } else if (d.type === 'backup-text') {
    inner = `<h2>백업 내용</h2><p class="help">이 화면에서는 파일 저장이 막혀 있어요. 아래 내용을 복사해서 메모 앱 등에 붙여 두세요.</p>
      <textarea id="backup-text" class="backup-text" readonly>${esc(d.json)}</textarea>
      <div class="actions"><button class="btn" data-action="close-dialog">닫기</button><button class="btn btn-go" data-action="copy-backup">복사하기</button></div>`;
  }
  // 배경을 눌러도 닫히지 않음: 취소·저장 버튼으로만 나간다
  return `<div class="backdrop"><div class="dialog" role="dialog" aria-modal="true">${inner}</div></div>`;
}

/* ---------- 직접 그리기 ---------- */
const PEN_COLORS = [
  ['#1F2A44', '검정'], ['#6B7280', '회색'], ['#FFFFFF', '흰색'], ['#8D5A3B', '갈색'], ['#F6C7A8', '살구'], ['#E8D3B0', '베이지'],
  ['#E5484D', '빨강'], ['#FF7EB6', '분홍'], ['#FF8C1A', '주황'], ['#FFD23F', '노랑'], ['#8BD346', '연두'], ['#2E9E5B', '초록'],
  ['#4FC3F7', '하늘'], ['#3E7CC9', '파랑'], ['#2B3A8C', '남색'], ['#8B5CF6', '보라'], ['#C9A7FF', '연보라'], ['#00A6A6', '청록']
];
const PEN_SIZES = [[8, '가늘게'], [16, '보통'], [30, '굵게'], [52, '아주 굵게']];

function newDraw(opts) {
  return Object.assign({ color: PEN_COLORS[0][0], size: PEN_SIZES[1][0], erase: false, undo: [], snapshot: null, title: '직접 그리기' }, opts);
}

function viewDraw() {
  const d = S.draw;
  const recent = (S.settings.recentColors || []).filter(c => !PEN_COLORS.some(p => p[0] === c));
  const pen = (c, n) => `<button class="pen" style="background:${c}" data-action="pen-color" data-c="${c}" aria-pressed="${!d.erase && d.color === c}" aria-label="${n}"></button>`;
  const colors = PEN_COLORS.map(([c, n]) => pen(c, n)).join('') + recent.map(c => pen(c, '내가 만든 색')).join('');
  const sizes = PEN_SIZES.map(([s, n]) => `<button class="pill pill-size" data-action="pen-size" data-s="${s}" aria-pressed="${d.size === s}" aria-label="${n}"><span class="size-dot" style="width:${Math.round(6 + s / 2.4)}px;height:${Math.round(6 + s / 2.4)}px"></span></button>`).join('');
  return `<div class="backdrop draw-layer"><div class="dialog draw-dialog" role="dialog" aria-modal="true" aria-label="${esc(d.title)}">
    <h2 class="draw-title">${esc(d.title)}</h2>
    <canvas id="pad" class="pad" width="512" height="512" aria-label="그림판"></canvas>
    <div class="pen-colors">${colors}
      <label class="pen pen-custom" aria-label="원하는 색 만들기"><input type="color" value="${esc(d.color)}" data-change="pen-custom"></label>
    </div>
    <div class="draw-toolbar">
      <div class="tool-group">${sizes}<button class="pill" data-action="pen-erase" aria-pressed="${d.erase}">지우개</button></div>
      <div class="tool-group">
        <button class="pill" data-action="pen-undo">되돌리기</button>
        <button class="pill pill-danger" data-action="pen-clear">다 지우기</button>
      </div>
      <div class="tool-group tool-end">
        <button class="btn" data-action="draw-cancel">취소</button>
        <button class="btn btn-go" data-action="draw-done">다 그렸어요</button>
      </div>
    </div>
  </div></div>`;
}

function setupPad() {
  const c = document.getElementById('pad');
  if (!c || c.dataset.ready) return;
  c.dataset.ready = '1';
  const ctx = c.getContext('2d');
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (S.draw.snapshot) { const im = new Image(); im.onload = () => ctx.drawImage(im, 0, 0); im.src = S.draw.snapshot; }
  let drawing = false, last = null;
  const pos = e => { const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) * c.width / r.width, y: (e.clientY - r.top) * c.height / r.height }; };
  const pen = () => {
    ctx.globalCompositeOperation = S.draw.erase ? 'destination-out' : 'source-over';
    ctx.strokeStyle = S.draw.color; ctx.fillStyle = S.draw.color; ctx.lineWidth = S.draw.size;
  };
  c.addEventListener('pointerdown', e => {
    e.preventDefault();
    try { c.setPointerCapture(e.pointerId); } catch (err) { /* 없어도 그려짐 */ }
    S.draw.undo.push(ctx.getImageData(0, 0, c.width, c.height));
    if (S.draw.undo.length > 20) S.draw.undo.shift();
    drawing = true; last = pos(e);
    pen(); ctx.beginPath(); ctx.arc(last.x, last.y, S.draw.size / 2, 0, Math.PI * 2); ctx.fill();
  });
  c.addEventListener('pointermove', e => {
    if (!drawing) return;
    const p = pos(e);
    pen(); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last = p;
  });
  const stop = () => { drawing = false; };
  c.addEventListener('pointerup', stop);
  c.addEventListener('pointercancel', stop);
  c.addEventListener('pointerleave', stop);
}

// 그림은 실행 모드의 큰 화면에서도 선명하도록 384×384로 저장한다
const ART = 384;
// 그린 부분만 잘라 가운데 정사각형으로 맞춘 그림 (빈 그림이면 null)
function trimDrawing(c) {
  const ctx = c.getContext('2d');
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return null;
  const side = Math.max(x1 - x0, y1 - y0) * 1.16 + 8;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const out = document.createElement('canvas'); out.width = out.height = ART;
  out.getContext('2d').drawImage(c, cx - side / 2, cy - side / 2, side, side, 0, 0, ART, ART);
  return out.toDataURL('image/png');
}

// 사진: 가운데를 정사각형으로 잘라 JPG로 줄임
function photoToIcon(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onerror = () => rej(reader.error);
    reader.onload = () => {
      const im = new Image();
      im.onerror = () => rej(new Error('image'));
      im.onload = () => {
        const side = Math.min(im.naturalWidth, im.naturalHeight);
        const out = document.createElement('canvas'); out.width = out.height = ART;
        const ctx = out.getContext('2d');
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, ART, ART);
        ctx.drawImage(im, (im.naturalWidth - side) / 2, (im.naturalHeight - side) / 2, side, side, 0, 0, ART, ART);
        res(out.toDataURL('image/jpeg', 0.88));
      };
      im.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// 그림 고르기: 아이 그림과 기본 그림 중 하나만 선택 표시
function markIcon(el) {
  const box = el.closest('.dialog');
  if (box) box.querySelectorAll('.icon-pick').forEach(b => b.setAttribute('aria-pressed', String(b === el)));
}

// 고른 버튼만 표시를 바꾼다 (화면을 다시 그리지 않아서 키보드가 다시 올라오지 않음)
function markPicked(el, selector) {
  el.parentElement.querySelectorAll(selector).forEach(b => b.setAttribute('aria-pressed', String(b === el)));
}

/* ---------- 동작 ---------- */
const actions = {
  start() {
    unlockAudio();
    vibrate(10);
    if (!S.settings.pinHash) { S.keypad = { mode: 'setup1', value: '', msg: '' }; S.screen = 'pin'; }
    else S.screen = S.profiles.length === 1 ? 'op' : 'profiles';
    if (S.screen === 'op') { S.current = S.profiles[0].id; S.opTab = 'today'; }
    render();
  },
  key(el) { pressKey(el.dataset.k); },
  'open-profile'(el) { S.current = el.dataset.id; S.screen = 'op'; S.opTab = 'today'; S.tdSel = null; S.scrolled = false; S.opWeek = null; render(); },
  'go-profiles'() { if (S.ctx) closeCtx(); S.unlockedUntil = 0; S.screen = 'profiles'; S.editPid = null; render(); },
  'go-parent'() { requireParent(() => { S.parentTab = S.parentTab && ED_MENU.some(m => m[0] === S.parentTab) && S.parentTab !== 'week' ? S.parentTab : 'week'; if (S.parentTab === 'week' && S.current) { const d = new Date().getDay(); openCtx({ kind: 'week', dow: d, also: [d] }, 'todo'); } else { S.screen = 'parent'; render(); } }); },
  'go-parent-add'() { requireParent(() => { S.screen = 'parent'; S.parentTab = 'settings'; openKidDialog(null); }); },
  'go-backup'() { requireParent(() => { S.screen = 'parent'; S.parentTab = 'settings'; render(); }); },
  'lock-now'() { actions['ed-exit'](); },
  tab(el) { S.parentTab = el.dataset.tab; render(); },
  'pick-kid'(el) { S.parentKid = el.dataset.id; S.dayDraft = null; render(); },
  'add-kid'() { openKidDialog(null); },
  'edit-kid'(el) { openKidDialog(el.dataset.id); },
  async 'save-kid'() {
    const d = S.dialog, name = d.draft.name.trim();
    if (!name) { toast('이름을 적어 주세요'); return; }
    if (d.editing) {
      const p = S.profiles.find(x => x.id === d.editing);
      p.name = name; p.color = d.draft.color;
    } else {
      const p = { id: uid(), name, color: d.draft.color, createdAt: today() };
      S.profiles.push(p);
      S.blocks[p.id] = makeDefaultBlocks();
      S.drawings[p.id] = [];
      S.setup[p.id] = defaultSetup(); await store.set('setup:' + p.id, S.setup[p.id]);
      S.week[p.id] = {}; S.marks[p.id] = {};
      S.todayPlan[p.id] = S.plans[p.id] = { date: today(), blocks: [], edited: false };
      await saveBlocks(p.id);
      S.parentKid = p.id;
    }
    await saveProfiles();
    S.dialog = null;
    toast(d.editing ? '고쳤어요' : `${name} 추가했어요`);
  },
  'ask-delete-kid'() {
    const p = S.profiles.find(x => x.id === S.dialog.editing);
    S.dialog = { type: 'confirm', title: `${p.name} 삭제할까요?`, text: '블록과 기록이 모두 지워지고 되돌릴 수 없어요.', yes: '삭제', onYes: async () => {
      S.profiles = S.profiles.filter(x => x.id !== p.id);
      delete S.blocks[p.id]; delete S.drawings[p.id];
      await store.del('blocks:' + p.id);
      await store.del('drawings:' + p.id);
      await store.del('setup:' + p.id);
      const all = await store.all();
      for (const k of Object.keys(all)) if (k.startsWith('day:' + p.id + ':')) await store.del(k);
      delete S.setup[p.id]; delete S.plans[p.id];
      await saveProfiles();
      if (S.current === p.id) S.current = null;
      S.dialog = null; toast('삭제했어요');
    } };
    render();
  },
  'add-block'() {
    S.dialog = { type: 'block', editing: null, draft: { name: '', icon: 'pencil', color: 'yellow', minutes: 15, needsCheck: false } };
    render();
  },
  'edit-block'(el) {
    const b = S.blocks[S.parentKid].find(x => x.id === el.dataset.id);
    S.dialog = { type: 'block', editing: b.id, draft: Object.assign({}, b) };
    render();
  },
  minutes(el) {
    const d = S.dialog.draft;
    d.minutes = Math.min(MAX_MIN, Math.max(5, d.minutes + Number(el.dataset.d)));
    vibrate(8);
    el.parentElement.querySelector('output').textContent = d.minutes + '분';
  },
  async 'save-block'() {
    const d = S.dialog, b = d.draft, name = b.name.trim();
    if (!name) { toast('블록 이름을 적어 주세요'); return; }
    const list = S.blocks[S.parentKid];
    if (d.editing) {
      const orig = list.find(x => x.id === d.editing);
      if (b.icon === 'image' && orig.icon !== 'image') b.baseIcon = orig.icon;
      if (b.icon !== 'image') b.baseIcon = b.icon;
      Object.assign(orig, b, { name });
    }
    else list.push(Object.assign({}, b, { id: uid(), name, createdAt: today() }));
    await saveBlocks(S.parentKid);
    S.dialog = null;
    toast('블록을 저장했어요');
  },
  'delete-block'() {
    const id = S.dialog.editing, kid = S.parentKid;
    S.dialog = { type: 'confirm', title: '블록을 삭제할까요?', text: '보관함에서 사라져요.', yes: '삭제', onYes: async () => {
      S.blocks[kid] = S.blocks[kid].filter(x => x.id !== id);
      await saveBlocks(kid);
      S.dialog = null; toast('삭제했어요');
    } };
    render();
  },
  draft(el) {
    S.dialog.draft[el.dataset.key] = el.dataset.val;
    vibrate(5);
    if (el.dataset.key === 'icon') markIcon(el); else markPicked(el, `[data-key="${el.dataset.key}"]`);
  },
  'close-dialog'() { S.dialog = null; render(); },
  'open-draw'() { S.draw = newDraw({ mode: 'block', kid: S.parentKid }); render(); },
  'go-gallery'() { S.screen = 'gallery'; render(); },
  'go-home'() { S.screen = S.ctx ? 'home' : 'op'; S.scrolled = false; render(); },
  'gallery-back'() { S.screen = 'op'; S.opTab = 'rewards'; render(); },
  async 'add-to-day'(el) {
    const kid = S.current, b = (S.blocks[kid] || []).find(x => x.id === el.dataset.id);
    if (!b) return;
    const start = nextFreeStart(kid, b.minutes);
    if (start == null) { toast('오늘은 잠자기 전까지 더 넣을 시간이 없어요'); return; }
    const plan = S.plans[kid];
    pushHistory(kid);
    plan.blocks.push({ pid: uid(), blockId: b.id, name: b.name, icon: b.icon, image: b.image || null, color: b.color, minutes: b.minutes, needsCheck: !!b.needsCheck, start: toHM(start), origStart: toHM(start), status: 'pending' });
    plan.blocks.sort((x, y) => toM(x.start) - toM(y.start));
    await savePlan(kid);
    vibrate(10);
    S.scrollTo = start;
    S.flashPid = plan.blocks.find(x => toM(x.start) === start && x.blockId === b.id).pid;
    toast(`${b.name}: ${ampm(start)} ${clockText(start)}에 넣었어요`);
    setTimeout(() => { S.flashPid = null; }, 1600);
  },
  'open-placed'(el) { S.dialog = { type: 'placed', pid: el.dataset.id }; render(); },
  async 'remove-placed'(el) {
    const kid = S.current, plan = S.plans[kid];
    pushHistory(kid);
    plan.blocks = plan.blocks.filter(x => x.pid !== el.dataset.id);
    await savePlan(kid);
    S.dialog = null; toast('시간표에서 뺐어요');
  },
  async 'delete-placed'(el) {
    const kid = S.current, plan = S.plans[kid], b = plan.blocks.find(x => x.pid === el.dataset.id);
    if (!b) return;
    pushHistory(kid);
    plan.blocks = plan.blocks.filter(x => x.pid !== b.pid);
    S.editPid = null;
    await savePlan(kid);
    vibrate([15, 40, 15]);
    toast(`${b.name}: 시간표에서 뺐어요 (되돌리기 가능)`);
  },
  'edit-done'() { exitEdit(); },
  zoom(el) {
    const tl = document.getElementById('timeline');
    const mTop = tl && S._pieces ? mOf(S._pieces, tl.scrollTop) : null;
    const i = Math.max(0, Math.min(ZOOMS.length - 1, ZOOMS.indexOf(PX) + Number(el.dataset.d)));
    PX = ZOOMS[i];
    S.settings.zoom = PX; saveSettings();
    render();
    const nt = document.getElementById('timeline');
    if (nt && mTop != null) nt.scrollTop = yOf(S._pieces, mTop);
  },
  async undo() {
    const kid = S.current, h = S.history[kid];
    if (!h || !h.length) return;
    const snap = JSON.parse(h.pop());
    if (snap && snap.week) {
      S.week[kid] = snap.week;
      S.plans[kid] = weekPlan(kid, S.ctx.dow);
      await store.set('week:' + kid, S.week[kid]);
    } else {
      S.plans[kid].blocks = snap;
      await savePlan(kid);
    }
    S.editPid = null;
    vibrate(10);
    toast('되돌렸어요');
  },
  'toggle-fold'(el) {
    const k = el.dataset.key;
    if (S.expanded.has(k)) S.expanded.delete(k); else S.expanded.add(k);
    render();
  },
  'day-mode'(el) { S.dayDraft.mode = el.dataset.mode; render(); },
  'seg-add'() {
    const list = S.dayDraft.data.segments[S.dayDraft.mode];
    list.push({ id: uid(), name: '새 구간', start: '16:00', end: '17:00', c: list.length % SEG_COLORS.length });
    render();
  },
  'seg-del'(el) { S.dayDraft.data.segments[S.dayDraft.mode].splice(Number(el.dataset.i), 1); render(); },
  'seg-color'(el) {
    const sg = S.dayDraft.data.segments[S.dayDraft.mode][Number(el.dataset.i)];
    sg.c = (sg.c + 1) % SEG_COLORS.length;
    el.style.background = SEG_COLORS[sg.c][0];
  },
  'fx-add'() { S.dayDraft.data.fixed.push({ id: uid(), name: '학원', days: [1, 3, 5], start: '15:00', end: '16:00', fold: false }); render(); },
  'fx-del'(el) { S.dayDraft.data.fixed.splice(Number(el.dataset.i), 1); render(); },
  'fx-day'(el) {
    const f = S.dayDraft.data.fixed[Number(el.dataset.i)], dd = Number(el.dataset.d);
    f.days = f.days.includes(dd) ? f.days.filter(x => x !== dd) : f.days.concat(dd).sort();
    el.setAttribute('aria-pressed', String(f.days.includes(dd)));
  },
  'day-reset'() { S.dayDraft = null; render(); },
  async 'day-save'() {
    const kid = S.dayDraft.kid, d = S.dayDraft.data;
    const err = checkDay(d);
    if (err) { toast(err); return; }
    S.setup[kid] = JSON.parse(JSON.stringify(d));
    await store.set('setup:' + kid, S.setup[kid]);
    S.dayDraft = null;
    toast('하루 시간을 저장했어요');
  },
  'gallery-new'() { S.draw = newDraw({ mode: 'gallery', kid: S.current }); render(); },
  'gallery-suggest'(el) {
    const b = (S.blocks[S.current] || []).find(x => x.id === el.dataset.id);
    if (b) { S.draw = newDraw({ mode: 'gallery', kid: S.current, suggest: b.id, title: `${b.name} 그림 그리기` }); render(); }
  },
  async 'open-drawing'(el) {
    const kid = S.current, g = (S.drawings[kid] || []).find(x => x.id === el.dataset.id);
    if (g && g.unseen) { g.unseen = false; await saveDrawings(kid); }
    S.dialog = { type: 'drawing', id: el.dataset.id }; render();
  },
  async 'attach-drawing'(el) {
    const kid = S.current;
    const g = (S.drawings[kid] || []).find(x => x.id === el.dataset.id);
    const b = (S.blocks[kid] || []).find(x => x.id === el.dataset.block);
    if (!g || !b) return;
    let msg;
    if (b.icon === 'image' && b.image === g.image) {
      b.icon = b.baseIcon || 'sun'; b.image = null;
      msg = `${b.name} 블록을 원래 그림으로 돌렸어요`;
    } else {
      if (b.icon !== 'image') b.baseIcon = b.icon;
      b.icon = 'image'; b.image = g.image;
      vibrate([10, 40, 10]);
      msg = `${b.name} 블록에 붙였어요!`;
    }
    await saveBlocks(kid);
    toast(msg);
  },
  async 'send-drawing'(el) {
    const from = S.profiles.find(x => x.id === S.current), to = S.profiles.find(x => x.id === el.dataset.to);
    const g = (S.drawings[S.current] || []).find(x => x.id === el.dataset.id);
    if (!from || !to || !g) return;
    const theirs = S.drawings[to.id] = S.drawings[to.id] || [];
    if (theirs.some(x => x.image === g.image)) { toast(`${to.name}에게 이미 있는 그림이에요`); return; }
    theirs.unshift({ id: uid(), image: g.image, createdAt: today(), fromName: from.name, unseen: true });
    await saveDrawings(to.id);
    vibrate([10, 40, 10]);
    toast(`${to.name}에게 그림을 선물했어요!`);
  },
  'ask-delete-drawing'(el) {
    const kid = S.current, id = el.dataset.id;
    S.dialog = { type: 'confirm', title: '이 그림을 지울까요?', text: '블록에 쓰고 있는 그림은 블록에는 그대로 남아요.', yes: '지우기', onYes: async () => {
      S.drawings[kid] = (S.drawings[kid] || []).filter(g => g.id !== id);
      await saveDrawings(kid);
      S.dialog = null; toast('지웠어요');
    } };
    render();
  },
  async 'use-drawing-yes'() {
    const d = S.dialog, b = (S.blocks[d.kid] || []).find(x => x.id === d.blockId);
    if (b) { if (b.icon !== 'image') b.baseIcon = b.icon; b.icon = 'image'; b.image = d.image; await saveBlocks(d.kid); }
    S.dialog = null; toast(`${d.name} 블록 그림을 바꿨어요`);
  },
  'pick-drawing'(el) {
    const g = (S.drawings[S.parentKid] || []).find(x => x.id === el.dataset.id);
    if (!g) return;
    S.dialog.draft.image = g.image; S.dialog.draft.icon = 'image';
    vibrate(5); markIcon(el);
  },
  'pen-color'(el) {
    S.draw.color = el.dataset.c; S.draw.erase = false;
    markPicked(el, '.pen');
    const er = document.querySelector('[data-action="pen-erase"]'); if (er) er.setAttribute('aria-pressed', 'false');
  },
  'pen-size'(el) { S.draw.size = Number(el.dataset.s); markPicked(el, '[data-action="pen-size"]'); },
  'pen-erase'(el) {
    S.draw.erase = !S.draw.erase;
    el.setAttribute('aria-pressed', String(S.draw.erase));
    document.querySelectorAll('.pen').forEach(b => b.setAttribute('aria-pressed', String(!S.draw.erase && b.dataset.c === S.draw.color)));
  },
  'pen-undo'() {
    const c = document.getElementById('pad'), prev = S.draw.undo.pop();
    if (c && prev) c.getContext('2d').putImageData(prev, 0, 0);
  },
  'pen-clear'() {
    const c = document.getElementById('pad'); if (!c) return;
    const ctx = c.getContext('2d');
    S.draw.undo.push(ctx.getImageData(0, 0, c.width, c.height));
    ctx.clearRect(0, 0, c.width, c.height);
  },
  'draw-cancel'() { S.draw = null; render(); },
  async 'draw-done'() {
    const c = document.getElementById('pad');
    const url = c ? trimDrawing(c) : null;
    if (!url) { toast('그림을 먼저 그려 주세요'); return; }
    const d = S.draw;
    S.draw = null;
    await addDrawing(d.kid, url);
    if (d.mode === 'block' && S.dialog) {
      S.dialog.draft.image = url; S.dialog.draft.icon = 'image';
      render(); return;
    }
    const b = d.suggest && (S.blocks[d.kid] || []).find(x => x.id === d.suggest);
    if (b) { S.dialog = { type: 'use-drawing', kid: d.kid, blockId: b.id, name: b.name, image: url }; render(); return; }
    toast('그림 보관함에 넣었어요');
  },
  'confirm-yes'() { const f = S.dialog.onYes; if (f) f(); },
  'change-pin'() { S.keypad = { mode: 'change1', value: '', msg: '' }; S.screen = 'pin'; render(); },
  export() { exportBackup(); },
  'copy-backup'() {
    const ta = document.getElementById('backup-text');
    const done = () => toast('복사했어요');
    try {
      navigator.clipboard.writeText(S.dialog.json).then(done, () => { ta.select(); toast('글자를 길게 눌러 복사해 주세요'); });
    } catch (e) { ta.select(); toast('글자를 길게 눌러 복사해 주세요'); }
  }
};

function openKidDialog(id) {
  const p = id ? S.profiles.find(x => x.id === id) : null;
  const used = S.profiles.map(x => x.color);
  const free = (COLORS.find(c => !used.includes(c.id)) || COLORS[0]).id;
  S.dialog = { type: 'kid', editing: id, draft: { name: p ? p.name : '', color: p ? p.color : free } };
  render();
}

async function pressKey(k) {
  const kp = S.keypad;
  vibrate(10);
  if (k === 'cancel') {
    S.screen = kp.mode.startsWith('change') ? 'parent' : (kp.back || (S.current ? 'op' : 'profiles'));
    S.keypad = null; S.afterUnlock = null; render(); return;
  }
  if (k === 'back') { kp.value = kp.value.slice(0, -1); kp.msg = ''; kp.shake = false; render(); return; }
  if (kp.value.length >= 4) return;
  kp.value += k; kp.shake = false;
  render();
  if (kp.value.length < 4) return;

  if (kp.mode === 'setup1' || kp.mode === 'change1') {
    S.keypad = { mode: kp.mode === 'setup1' ? 'setup2' : 'change2', value: '', msg: '', first: kp.value };
    setTimeout(render, 150);
  } else if (kp.mode === 'setup2' || kp.mode === 'change2') {
    if (kp.value !== kp.first) {
      S.keypad = { mode: kp.mode === 'setup2' ? 'setup1' : 'change1', value: '', msg: '두 번 누른 숫자가 달라요. 처음부터 다시 해 주세요.', shake: true };
      vibrate([30, 40, 30]); setTimeout(render, 150); return;
    }
    S.settings.pinHash = await hashPin(kp.value);
    await saveSettings();
    S.unlockedUntil = Infinity;
    const first = kp.mode === 'setup2';
    S.keypad = null; S.screen = 'parent';
    if (first) { S.parentTab = 'settings'; openKidDialog(null); }
    toast(first ? '비밀번호를 정했어요' : '비밀번호를 바꿨어요');
  } else if (kp.mode === 'unlock') {
    if ((await hashPin(kp.value)) !== S.settings.pinHash) {
      kp.value = ''; kp.msg = '비밀번호가 달라요'; kp.shake = true;
      vibrate([30, 40, 30]); setTimeout(render, 150); return;
    }
    S.unlockedUntil = Infinity;
    S.keypad = null;
    const then = S.afterUnlock; S.afterUnlock = null;
    if (then) then(); else { S.screen = 'parent'; render(); }
  }
}

/* ---------- 백업 ---------- */
async function exportBackup() {
  const data = await store.all();
  const json = JSON.stringify({ app: 'byeolbyeol', version: 1, exportedAt: new Date().toISOString(), data });
  let saved = false;
  try {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `별별시간표-백업-${today()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    saved = true;
  } catch (e) { saved = false; }
  S.settings.lastBackup = today();
  await saveSettings();
  // 미리보기 화면처럼 다운로드가 막힌 곳에서도 내용을 챙길 수 있게 함께 보여 준다
  if (!saved || window.self !== window.top) { S.dialog = { type: 'backup-text', json }; render(); }
  else toast('백업 파일을 저장했어요');
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let parsed;
    try { parsed = JSON.parse(reader.result); } catch (e) { parsed = null; }
    if (!parsed || parsed.app !== 'byeolbyeol' || !parsed.data) { toast('별별 시간표 백업 파일이 아니에요'); return; }
    S.dialog = { type: 'confirm', title: '백업으로 되돌릴까요?', text: `${String(parsed.exportedAt).slice(0, 10)}에 저장한 백업이에요. 지금 기록은 모두 이 내용으로 바뀌어요.`, yes: '되돌리기', onYes: async () => {
      await store.clear();
      for (const k of Object.keys(parsed.data)) await store.set(k, parsed.data[k]);
      await loadAll();
      S.dialog = null; S.current = null;
      toast('백업으로 되돌렸어요');
    } };
    render();
  };
  reader.readAsText(file);
}

Object.assign(actions, runActions, todoActions, planActions, modeActions, confirmActions);

/* ---------- 이벤트 연결 ---------- */
$app.addEventListener('click', ev => {
  // 꾹 누르기·끌기가 끝난 직후의 클릭은 무시 (블록이 열리거나 추가되지 않게)
  const sc = S._suppressClick;
  if (sc && Date.now() - sc.t < 700 && Math.hypot(ev.clientX - sc.x, ev.clientY - sc.y) < 40) { S._suppressClick = null; ev.preventDefault(); return; }
  if (Date.now() - (S._exitAt || 0) < 600 && ev.target.closest('#timeline')) { ev.preventDefault(); return; }
  if (S.editPid && ev.target.closest('.tl-item.tl-edit')) return;
  const el = ev.target.closest('[data-action]');
  // 입력창 밖을 누르면 키보드를 내린다 (아이패드는 버튼을 눌러도 키보드가 남아 있음)
  const active = document.activeElement;
  if (active && active.tagName === 'INPUT' && ev.target !== active) active.blur();
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.action];
  if (fn) fn(el, ev);
});
$app.addEventListener('input', ev => {
  const el = ev.target;
  if (el.dataset.bind && S.dialog) S.dialog.draft[el.dataset.bind] = el.value;
  if (el.dataset.dbind && S.dialog) S.dialog[el.dataset.dbind] = el.value;
  if (el.dataset.tf && S.dayDraft) setPath(S.dayDraft.data, el.dataset.tf, el.value);
});
$app.addEventListener('change', ev => {
  const el = ev.target;
  if (el.dataset.change === 'needs-check' && S.dialog) S.dialog.draft.needsCheck = el.checked;
  if (el.dataset.change === 'sound') {
    S.settings.sound = el.checked;
    saveSettings();
    if (el.checked) { unlockAudio(); tone(660, 0.07, 0.05); tone(990, 0.09, 0.05, 0.09); }
    el.parentElement.lastChild.textContent = el.checked ? '켜짐' : '꺼짐';
  }
  if (el.dataset.tf && S.dayDraft) setPath(S.dayDraft.data, el.dataset.tf, el.value);
  if (el.dataset.tfcheck && S.dayDraft) setPath(S.dayDraft.data, el.dataset.tfcheck, el.checked);
  if (el.dataset.change === 'import' && el.files && el.files[0]) importBackup(el.files[0]);
  if (el.dataset.change === 'block-image' && el.files && el.files[0] && S.dialog) {
    const kid = S.parentKid;
    photoToIcon(el.files[0]).then(async url => {
      await addDrawing(kid, url);
      if (S.dialog && S.dialog.type === 'block') { S.dialog.draft.image = url; S.dialog.draft.icon = 'image'; }
      render();
    }, () => toast('이 파일은 열 수 없어요. JPG나 PNG 사진으로 올려 주세요'));
  }
  if (el.dataset.change === 'gallery-image' && el.files && el.files[0]) {
    const kid = S.current;
    photoToIcon(el.files[0]).then(async url => { await addDrawing(kid, url); toast('그림 보관함에 넣었어요'); },
      () => toast('이 파일은 열 수 없어요. JPG나 PNG 사진으로 올려 주세요'));
  }
  if (el.dataset.change === 'pen-custom' && S.draw) {
    const c = el.value.toUpperCase();
    S.draw.color = c; S.draw.erase = false;
    const rc = [c].concat((S.settings.recentColors || []).filter(x => x !== c)).slice(0, 6);
    S.settings.recentColors = rc; saveSettings();
    render();
  }
});
document.addEventListener('keydown', ev => {
  if (S.screen === 'pin' && /^[0-9]$/.test(ev.key)) pressKey(ev.key);
  else if (S.screen === 'pin' && ev.key === 'Backspace') pressKey('back');
});

/* ---------- 시작 ---------- */
(async function boot() {
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* 선택 사항 */ }
  try {
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('sw.js').then(r => r.update()).catch(() => {});
      // 새 버전이 설치되면 한 번 자동으로 다시 연다
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
    }
  } catch (e) { /* 미리보기 화면에서는 오프라인 기능 없음 */ }
  await loadAll();
  render();
})();
