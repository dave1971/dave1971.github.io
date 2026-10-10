'use strict';
// ===== Core engine: canvas, main loop, input, audio, drawing utilities =====

const G = { W: 960, H: 540, scene: null, t: 0, view: { s: 1, ox: 0, oy: 0 } };
// la barra dei pulsanti A e B in fondo alle gare: dalla 1.4.3 un po' piu' alta, per pulsanti piu' grandi
const HUD_H = 36, CTRL_H = 128;

const HUMAN_COLS = [
  { name: 'GIOCATORE 1', short: 'G1', shirt: '#e8322d', shorts: '#1c2a6b', skin: '#f1c27d', hair: '#3b2412', ui: '#ff5145' },
  { name: 'GIOCATORE 2', short: 'G2', shirt: '#2f7df0', shorts: '#f2f2f2', skin: '#c68642', hair: '#15110d', ui: '#45a0ff' },
];
// colours the player can pick for his athlete (shirt, shorts, skin, hair)
const KIT_KEYS = ['shirt', 'shorts', 'skin', 'hair'];
const KIT_NAME = { shirt: 'MAGLIETTA', shorts: 'PANTALONCINI', skin: 'PELLE', hair: 'CAPELLI' };
const KIT = {
  shirt:  ['#e8322d', '#ff6f00', '#ffd600', '#7cb342', '#00a152', '#00bcd4', '#2f7df0', '#3949ab', '#8e24aa', '#f06292', '#f2f2f2', '#263238'],
  shorts: ['#e8322d', '#ff6f00', '#ffd600', '#7cb342', '#00a152', '#00bcd4', '#2f7df0', '#1c2a6b', '#8e24aa', '#f06292', '#f2f2f2', '#263238'],
  skin:   ['#ffe0bd', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#5c3317'],
  hair:   ['#15110d', '#3b2412', '#6b4423', '#a9713b', '#d9b26a', '#e8e8e8', '#b71c1c', '#2f7df0'],
};
// live roster of the current competition: humans first, then the CPU athletes (rebuilt by Game.begin)
const PCOL = HUMAN_COLS.map(c => Object.assign({}, c));

// ---------- math helpers ----------
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ---------- drawing helpers ----------
const FONT = '"Trebuchet MS", "Arial Black", Arial, sans-serif';
function txt(ctx, s, x, y, size, color, align, opts) {
  opts = opts || {};
  // every visible string passes through here, so this is where the game is translated; a player's
  // name is not a word to translate (crudo), or a player called NIENTE would turn into NONE
  s = opts.crudo ? String(s) : T(s);
  ctx.font = (opts.italic === false ? '' : 'italic ') + (opts.weight || 'bold') + ' ' + size + 'px ' + FONT;
  ctx.textAlign = align || 'center';
  ctx.textBaseline = opts.base || 'middle';
  if (opts.outline !== false) {
    ctx.lineWidth = Math.max(2, size * 0.16);
    ctx.strokeStyle = opts.outlineColor || 'rgba(0,0,0,0.85)';
    ctx.lineJoin = 'round';
    ctx.strokeText(s, x, y);
  }
  ctx.fillStyle = color || '#fff';
  ctx.fillText(s, x, y);
}
// Come txt(), ma se la scritta non ci sta nella larghezza data si rimpicciolisce finché ci sta.
// Serve dove le colonne sono strette e il testo non si sa quanto sarà lungo: i nomi dei record
// arrivano da un file che cambia, e "SOTOMAYOR 1993" non è "BOLT 2009".
// Un nome in uno spazio stretto: prima si rimpicciolisce fino a 'min', poi si accorcia coi puntini.
// Scritto troppo piccolo un nome non si legge; accorciato si riconosce ancora. Restituisce il testo
// da scrivere e la grandezza, per scriverlo in grassetto dritto con txt(..., { crudo: true }).
function nomeIn(ctx, nome, w, size, min) {
  nome = String(nome || '');
  let s = size;
  const misura = () => { ctx.font = 'bold ' + s + 'px ' + FONT; return ctx.measureText(nome).width; };
  while (s > min && misura() > w) s--;
  let radice = nome.replace(/…$/, '');
  while (misura() > w && radice.length > 1) { radice = radice.slice(0, -1).trimEnd(); nome = radice + '…'; }
  return { t: nome, s };
}
function txtFit(ctx, s, x, y, size, color, align, w, opts) {
  opts = opts || {};
  const t = T(s);
  const style = (opts.italic === false ? '' : 'italic ') + (opts.weight || 'bold') + ' ';
  while (size > 8) {
    ctx.font = style + size + 'px ' + FONT;
    if (ctx.measureText(t).width <= w) break;
    size--;
  }
  txt(ctx, s, x, y, size, color, align, opts);
}
// La misura più grande con cui TUTTE queste scritte ci stanno in larghezza w. Una tabella in cui
// ogni casella si rimpicciolisce per conto suo si legge male: le colonne vanno tutte alla stessa
// misura, anche se a decidere è la riga peggiore.
function fitSize(ctx, righe, w, max, opts) {
  opts = opts || {};
  const style = (opts.italic ? 'italic ' : '') + (opts.weight || 'bold') + ' ';
  let size = max;
  for (const s of righe) {
    const t = T(s);
    while (size > 8) {
      ctx.font = style + size + 'px ' + FONT;
      if (ctx.measureText(t).width <= w) break;
      size--;
    }
  }
  return size;
}
// La stellina dei record nuovi: cinque punte, bordate di nero come tutto il resto del gioco.
function drawStar(ctx, x, y, r, col) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
    ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.stroke();
  ctx.fillStyle = col || '#ffd600';
  ctx.fill();
  ctx.restore();
}
function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function shade(hex, f) { // f<1 darker, f>1 lighter
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (f < 1) { r *= f; g *= f; b *= f; } else { r += (255 - r) * (f - 1); g += (255 - g) * (f - 1); b += (255 - b) * (f - 1); }
  return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
}

// ---------- UI buttons (menus) ----------
function drawBtn(ctx, b, hot) {
  ctx.save();
  const col = b.color || '#ffcc00';
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  rrect(ctx, b.x + 4, b.y + 5, b.w, b.h, 12); ctx.fill();
  const gr = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
  gr.addColorStop(0, shade(col, hot ? 1.5 : 1.25)); gr.addColorStop(1, shade(col, 0.75));
  ctx.fillStyle = gr;
  rrect(ctx, b.x, b.y, b.w, b.h, 12); ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = b.sel ? '#fff' : 'rgba(0,0,0,0.45)'; ctx.stroke();
  let size = b.size || 24;
  const label = T(b.label); // measured in the language it will be drawn in
  ctx.font = 'italic bold ' + size + 'px ' + FONT;
  while (size > 9 && ctx.measureText(label).width > b.w - 16) { size--; ctx.font = 'italic bold ' + size + 'px ' + FONT; }
  txt(ctx, label, b.x + b.w / 2, b.y + b.h / 2 + (b.sub ? -9 : 1), size, b.textColor || '#fff');
  if (b.sub) txt(ctx, b.sub, b.x + b.w / 2, b.y + b.h / 2 + 15, 14, '#fff', 'center', { italic: false });
  ctx.restore();
}
function hitBtn(btns, x, y) {
  for (let i = btns.length - 1; i >= 0; i--) {
    const b = btns[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}

// ---------- audio (synthesized, no assets) ----------
const Snd = {
  ctx: null, on: true, noiseBuf: null,
  // zitto: gli effetti tacciono senza toccare la scelta del giocatore (on) ne' la musica. Lo accende la
  // gara mentre manda avanti veloce gli atleti della CPU rimasti, e lo spegne subito dopo.
  zitto: false,
  unlock() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    // 'suspended' all'inizio, 'interrupted' su iPhone dopo una telefonata o tornando all'app
    if (this.ctx.state !== 'running') { try { this.ctx.resume(); } catch (e) { /* ci riprova al prossimo tocco */ } }
    this.apple();
    if (typeof Music !== 'undefined') Music.resume();
  },
  // Su iPhone e iPad Safari tratta l'audio delle pagine come i suoni di sistema: con la levetta del
  // silenzioso abbassata non si sente niente, anche col volume al massimo (e' successo a Davide con la
  // versione web). Si dice a Safari che il gioco suona come un lettore musicale: nei Safari recenti c'e'
  // navigator.audioSession apposta; nei vecchi basta far girare, dentro un tocco, un <audio> di silenzio.
  // Fuori da iPhone e iPad (Android, Windows, i computer) non serve e non si fa niente.
  apple() {
    if (this.appleOk) return;
    const ua = navigator.userAgent || '';
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (!ios) { this.appleOk = true; return; }
    try { if (navigator.audioSession) { navigator.audioSession.type = 'playback'; this.appleOk = true; return; } } catch (e) { /* si prova col silenzio */ }
    try {
      if (!this.muto) {
        // mezzo secondo di silenzio in un WAV fatto qui: nessun file da scaricare
        const n = 4000, b = new Uint8Array(44 + n), dv = new DataView(b.buffer);
        const s = (o, t) => { for (let i = 0; i < t.length; i++) b[o + i] = t.charCodeAt(i); };
        s(0, 'RIFF'); dv.setUint32(4, 36 + n, true); s(8, 'WAVE'); s(12, 'fmt ');
        dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
        dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true);
        s(36, 'data'); dv.setUint32(40, n, true); b.fill(128, 44);
        this.muto = new Audio(URL.createObjectURL(new Blob([b], { type: 'audio/wav' })));
        this.muto.loop = true;
        this.muto.setAttribute('playsinline', '');
      }
      const pr = this.muto.play();
      if (pr && pr.then) pr.then(() => { this.appleOk = true; }).catch(() => { /* al prossimo tocco */ });
    } catch (e) { /* niente da fare: si resta come prima */ }
  },
  tone(f, d, type, v, slide, delay) {
    if (!this.on || this.zitto || !this.ctx) return;
    const c = this.ctx, t = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + d);
    g.gain.setValueAtTime(v || 0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + d);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + d + 0.02);
  },
  noise(d, v, freq, q, delay) {
    if (!this.on || this.zitto || !this.ctx) return;
    const c = this.ctx, t = c.currentTime + (delay || 0);
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 1200; f.Q.value = q || 0.7;
    const g = c.createGain();
    g.gain.setValueAtTime(v || 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + d);
    s.connect(f); f.connect(g); g.connect(c.destination);
    s.start(t, Math.random() * 0.5); s.stop(t + d + 0.02);
  },
  gun() { this.noise(0.5, 0.9, 900, 0.4); this.tone(120, 0.25, 'sawtooth', 0.2, 0.3); },
  shot() { this.noise(0.25, 0.7, 1500, 0.5); },
  clay() { this.noise(0.18, 0.5, 3500, 1.5); this.tone(1800, 0.08, 'square', 0.05, 0.5); },
  step() { this.tone(70 + Math.random() * 30, 0.04, 'triangle', 0.12); },
  splash() { this.noise(0.6, 0.5, 700, 0.5); this.noise(0.3, 0.3, 2500, 0.8, 0.05); },
  stroke() { this.noise(0.12, 0.12, 900, 1.2); },
  jump() { this.tone(300, 0.18, 'square', 0.08, 2.2); },
  thud() { this.tone(90, 0.2, 'sine', 0.3, 0.5); this.noise(0.15, 0.25, 300, 0.8); },
  clang() { this.tone(520, 0.4, 'triangle', 0.12); this.tone(780, 0.3, 'triangle', 0.08); },
  beep(hi) { this.tone(hi ? 880 : 440, hi ? 0.35 : 0.15, 'square', 0.1); },
  click() { this.tone(660, 0.05, 'square', 0.07); },
  fail() { this.tone(300, 0.15, 'square', 0.1, 0.7); this.tone(200, 0.35, 'square', 0.1, 0.6, 0.15); },

  // Un rumore che monta invece di partire di colpo. noise() attacca al massimo e si spegne: e' il
  // profilo di un colpo, giusto per lo sparo e per l'acqua. Una folla invece cresce e cala, e se
  // parte di colpo dall'altoparlante di un telefono sembra un'esplosione.
  swell(d, v, freq, q, delay, up) {
    if (!this.on || this.zitto || !this.ctx) return;
    const c = this.ctx, t = c.currentTime + (delay || 0), a = up || 0.25;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 800; f.Q.value = q || 0.5;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0005, t + d);
    s.connect(f); f.connect(g); g.connect(c.destination);
    s.start(t, Math.random() * 0.5); s.stop(t + d + 0.02);
  },
  // Applausi dopo una buona prova: tanti battiti di mani brevissimi, fitti all'inizio e poi sempre
  // piu' radi, sopra il brusio della folla. k da 0 a 1: quanto e' stata bella.
  applause(k) {
    if (!this.on || this.zitto || !this.ctx) return;
    k = k == null ? 1 : k;
    const dur = 1.2 + 0.7 * k, n = Math.round(24 + 36 * k);
    this.swell(dur + 0.3, 0.13 + 0.12 * k, 650, 0.6, 0, 0.3);
    for (let i = 0; i < n; i++) {
      const at = Math.pow(Math.random(), 1.6) * dur;
      const cala = 1 - at / (dur + 0.2);
      this.noise(0.012 + Math.random() * 0.012, (0.16 + Math.random() * 0.22) * cala, 1100 + Math.random() * 1500, 1.4, at);
    }
  },
  // Una moneta: un tintinnio da campanella, con le parziali stonate del metallo e il ticchettio
  // del contatto. Nel negozio si compra con un paio di monete, si vende con una cascata.
  ting(f, delay, v) {
    v = v || 0.07;
    this.tone(f, 0.3, 'sine', v, 0, delay);
    this.tone(f * 2.76, 0.14, 'sine', v * 0.55, 0, delay);
    this.tone(f * 5.4, 0.06, 'sine', v * 0.25, 0, delay);
    this.noise(0.015, v * 1.4, 7000, 1, delay);
  },
  coins() { this.ting(2350, 0); this.ting(2950, 0.07, 0.06); this.ting(2650, 0.15, 0.05); },
  cashIn() { for (let i = 0; i < 9; i++) this.ting(2100 + Math.random() * 1100, i * 0.055 + Math.random() * 0.02, 0.045 + Math.random() * 0.03); },
  // Un allenamento andato a segno: una scaletta che sale, piu' svelta e piu' alta del motivo che
  // apre le gare, con una scintilla in cima
  levelUp() {
    [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, i === 3 ? 0.22 : 0.07, 'square', 0.055, 0, i * 0.05));
    this.ting(3136, 0.2, 0.05);
  },
  // Un attrezzo che parte dalla mano: un soffio che sale e si allontana, non un salto
  whoosh() {
    if (!this.on || this.zitto || !this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(2600, t + 0.28);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.45, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.4);
    s.connect(f); f.connect(g); g.connect(c.destination);
    s.start(t, Math.random() * 0.5); s.stop(t + 0.42);
  },
  // Lo sforzo del pesista quando parte lo slancio: un "hop" basso, di gola
  grunt() { this.tone(150, 0.16, 'sawtooth', 0.09, 0.7); this.swell(0.14, 0.05, 400, 1, 0, 0.02); },
  // L'arco: la corda che schiocca, e la freccia che si pianta nel paglione
  twang() { this.tone(220, 0.18, 'triangle', 0.1, 0.55); this.noise(0.05, 0.12, 2500, 1.5); },
  thock() { this.tone(160, 0.08, 'square', 0.08, 0.5); this.noise(0.04, 0.2, 900, 1); },
  // short jingle when an event starts
  startTune() {
    const n = [523, 659, 784, 1047], d = 0.13;
    n.forEach((f, i) => {
      const len = i === 3 ? 0.32 : d;
      this.tone(f, len, 'square', 0.07, 0, i * d);
      this.tone(f / 2, len, 'triangle', 0.05, 0, i * d);
    });
  },
  fanfare() {
    const n = [523, 659, 784, 1047, 784, 1047];
    const d = [0.12, 0.12, 0.12, 0.3, 0.12, 0.5];
    let t = 0;
    for (let i = 0; i < n.length; i++) { this.tone(n[i], d[i] + 0.05, 'square', 0.08, 0, t); this.tone(n[i] / 2, d[i] + 0.05, 'triangle', 0.08, 0, t); t += d[i]; }
  },
};

// ---------- input ----------
// One key per action: G1 A, G1 B, G2 A, G2 B, and then the third button (C) of the events that have
// three: G1 C, G2 C. The defaults put the two players on opposite sides of the keyboard; each key can
// be remapped from the title screen and the choice stays on the device.
const KEY_DEF = ['KeyM', 'KeyX', 'KeyK', 'KeyL', 'KeyC', 'KeyJ'];
const KEY_EXTRA = { Space: [0, 0], Enter: [0, 1] }; // always spare keys for player 1, unless he binds them elsewhere
// l'azione numero i: [giocatore, pulsante]. Le prime quattro sono A e B dei due giocatori, poi i due C.
const keyAct = i => (i < 4 ? [i >> 1, i & 1] : [i - 4, 2]);
const keyIdx = (p, b) => (b === 2 ? 4 + p : p * 2 + b);
const KEY_LOCKED = ['Escape', 'Backspace']; // reserved for back / pause, never bindable
const KEY_NAMES = {
  Space: 'SPAZIO', Enter: 'INVIO', Tab: 'TAB', CapsLock: 'BLOC MAIUSC',
  ShiftLeft: 'SHIFT SX', ShiftRight: 'SHIFT DX', ControlLeft: 'CTRL SX', ControlRight: 'CTRL DX',
  AltLeft: 'ALT SX', AltRight: 'ALT GR', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓',
  Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: '\'', Backquote: '`',
  BracketLeft: '[', BracketRight: ']', Backslash: '\\', Minus: '-', Equal: '=',
  Insert: 'INS', Delete: 'CANC', Home: 'HOME', End: 'FINE', PageUp: 'PAG ↑', PageDown: 'PAG ↓',
};
function keyName(code) {
  if (!code) return '—';
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if (/^Key.$/.test(code)) return code.slice(3);
  if (/^Digit.$/.test(code)) return code.slice(5);
  if (/^Numpad/.test(code)) return 'NUM ' + code.slice(6).toUpperCase();
  if (/^F\d+$/.test(code)) return code;
  return code.toUpperCase();
}
const Keys = {
  store: 'olimpiadi_keys_v1',
  codes: KEY_DEF.slice(), // index: see keyAct / keyIdx
  map: {},
  load() {
    try {
      const d = JSON.parse(localStorage.getItem(this.store));
      if (Array.isArray(d)) d.forEach((c, i) => { if (i < KEY_DEF.length && typeof c === 'string' && c && KEY_LOCKED.indexOf(c) < 0) this.codes[i] = c; });
    } catch (e) { /* storage unavailable */ }
    // Chi aveva scelto i suoi tasti prima che ci fosse il C puo' aver gia' dato C o J a un'altra azione:
    // il terzo tasto prende allora il primo libero, cosi' nessun tasto serve due azioni.
    const liberi = ['KeyC', 'KeyJ', 'KeyV', 'KeyN', 'KeyB', 'KeyH', 'KeyG', 'KeyF'];
    for (let i = 4; i < this.codes.length; i++) {
      if (this.codes.indexOf(this.codes[i]) === i) continue;
      this.codes[i] = liberi.find(c => this.codes.indexOf(c) < 0);
    }
    this.build();
  },
  save() {
    try { localStorage.setItem(this.store, JSON.stringify(this.codes)); } catch (e) { /* ignore */ }
    this.build();
  },
  build() {
    this.map = Object.assign({}, KEY_EXTRA); // a binding of the player's own always wins over the spares
    this.codes.forEach((c, i) => { this.map[c] = keyAct(i); });
  },
  name(i) { return keyName(this.codes[i]); },
  isDefault() { return this.codes.every((c, i) => c === KEY_DEF[i]); },
  reset() { this.codes = KEY_DEF.slice(); this.save(); },
  // taking a key that another action already uses swaps the two, so no action is ever left without a key
  set(i, code) {
    if (!code || KEY_LOCKED.indexOf(code) >= 0) return false; // a key the browser cannot name is no key at all
    const j = this.codes.indexOf(code);
    if (j === i) return false;
    if (j >= 0) this.codes[j] = this.codes[i];
    this.codes[i] = code;
    this.save();
    return true;
  },
};
Keys.load();

G.toLogical = function (e) {
  const v = G.view, dpr = G.dpr;
  return { x: (e.clientX * dpr - v.ox) / v.s, y: (e.clientY * dpr - v.oy) / v.s };
};

// quanto scorre un elenco a ogni tasto, in pixel
const ARROWS = { ArrowUp: -56, ArrowDown: 56, PageUp: -280, PageDown: 280 };

G.init = function () {
  const c = document.getElementById('game');
  G.canvas = c; G.ctx = c.getContext('2d');
  window.addEventListener('resize', G.resize);
  G.resize();
  const down = e => {
    e.preventDefault();
    Snd.unlock();
    const p = G.toLogical(e);
    if (G.scene && G.scene.pointerDown) G.scene.pointerDown(p.x, p.y, e.pointerId);
  };
  const up = e => {
    e.preventDefault();
    // Safari su iPhone accende l'audio solo quando il dito si alza, non quando scende
    Snd.unlock();
    if (G.scene && G.scene.pointerUp) G.scene.pointerUp(e.pointerId);
  };
  // il dito che si sposta serve solo agli elenchi che scorrono: chi non lo vuole non lo sente
  const move = e => {
    if (!G.scene || !G.scene.pointerMove) return;
    const p = G.toLogical(e);
    G.scene.pointerMove(p.x, p.y, e.pointerId);
  };
  c.addEventListener('pointerdown', down);
  c.addEventListener('pointermove', move);
  c.addEventListener('pointerup', up);
  c.addEventListener('pointercancel', up);
  c.addEventListener('contextmenu', e => e.preventDefault());
  // e per i Safari vecchi il gesto che conta e' touchend (pointerup non basta sempre)
  c.addEventListener('touchend', () => Snd.unlock(), { passive: true });
  // la rotella del mouse: su Windows e con una tastiera USB è il modo naturale di scorrere
  window.addEventListener('wheel', e => {
    if (!G.scene || !G.scene.wheel) return;
    e.preventDefault();
    G.scene.wheel(e.deltaMode === 1 ? e.deltaY * 28 : e.deltaY);   // a righe o a pixel, secondo il browser
  }, { passive: false });
  window.addEventListener('keydown', e => {
    if (e.repeat) return;
    Snd.unlock();
    // a screen that is waiting to learn a key takes it raw, before anything else can claim it
    if (G.scene && G.scene.rawKey && G.scene.rawKey(e.code)) { e.preventDefault(); return; }
    // text-entry screens (name input) swallow printable keys next
    if (G.scene && G.scene.textKey && !e.ctrlKey && !e.metaKey && !e.altKey && e.key) {
      if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter') { e.preventDefault(); if (G.scene.textKey(e.key)) return; }
    }
    if (e.code === 'Escape' || e.code === 'Backspace') { G.back(); return; }
    const m = Keys.map[e.code];
    if (m && G.scene && G.scene.key) { e.preventDefault(); G.scene.key(m[0], m[1], true); return; }
    // le frecce scorrono gli elenchi lunghi, ma solo se non se le è già prese una gara
    if (G.scene && G.scene.wheel && ARROWS[e.code]) { e.preventDefault(); G.scene.wheel(ARROWS[e.code]); }
  });
  window.addEventListener('keyup', e => {
    const m = Keys.map[e.code];
    if (m && G.scene && G.scene.key) G.scene.key(m[0], m[1], false);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.scene && G.scene.pause) G.scene.pause();
  });
  G.last = performance.now();
  requestAnimationFrame(G.frame);
};

// Android back button / Esc
G.back = function () {
  if (G.scene && G.scene.back) return G.scene.back();
  return false;
};

G.resize = function () {
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const iw = window.innerWidth, ih = window.innerHeight;
  // una finestra ancora senza misura (una scheda aperta in secondo piano, un pannello nascosto, una
  // rotazione a meta'): 0/0 dava NaN a tutte le misure e il primo disegno si fermava per sempre, con lo
  // schermo nero. Si tengono le misure di prima; al prossimo resize, con la finestra vera, si rifa'.
  G.dpr = dpr;
  if (!(iw > 0) || !(ih > 0)) return;
  G.H = 540;
  G.W = Math.round(clamp(540 * iw / ih, 760, 1280));
  const s = Math.min(iw / G.W, ih / G.H);
  G.canvas.width = Math.round(iw * dpr);
  G.canvas.height = Math.round(ih * dpr);
  G.canvas.style.width = iw + 'px';
  G.canvas.style.height = ih + 'px';
  G.view = { s: s * dpr, ox: (iw - G.W * s) / 2 * dpr, oy: (ih - G.H * s) / 2 * dpr };
  if (G.scene && G.scene.resize) G.scene.resize();
};

G.setScene = function (sc) {
  G.scene = sc;
  // la musica segue la schermata: chi non ne chiede una resta sul motivo dei menu
  if (typeof Music !== 'undefined') Music.play(sc.music || 'menu');
  if (sc.enter) sc.enter();
};

const STEP = 1 / 120;
G.acc = 0;
// Un errore dentro un fotogramma non deve fermare il gioco per sempre: prima la richiesta del fotogramma
// dopo stava in fondo, e un'eccezione qualunque (un suono chiesto male, una gara con un difetto) lasciava
// lo schermo congelato e i tasti muti senza dire niente. Adesso il giro continua, e l'errore resta in
// G.errore: il telecomando lo scrive in fondo al pad (Remote.snapshot).
G.errore = null;
G.guasto = function (e) {
  const m = String((e && e.message) || e).slice(0, 120);
  G.errore = { t: Date.now(), m, n: G.errore && G.errore.m === m ? G.errore.n + 1 : 1 };
  if (G.errore.n === 1 && typeof console !== 'undefined') console.error(e);
};
G.frame = function (ts) {
  try { G.passo(ts); } catch (e) { G.guasto(e); }
  requestAnimationFrame(G.frame);
};
G.passo = function (ts) {
  const dt = Math.min(0.1, (ts - G.last) / 1000);
  G.last = ts;
  G.acc += dt;
  let n = 0;
  while (G.acc >= STEP && n < 12) {
    G.t += STEP;
    if (G.scene && G.scene.update) G.scene.update(STEP);
    G.acc -= STEP; n++;
  }
  if (n >= 12) G.acc = 0;
  const ctx = G.ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, G.canvas.width, G.canvas.height);
  const v = G.view;
  ctx.setTransform(v.s, 0, 0, v.s, v.ox, v.oy);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, G.W, G.H); ctx.clip();
  if (G.scene && G.scene.draw) G.scene.draw(ctx);
  ctx.restore();
};
