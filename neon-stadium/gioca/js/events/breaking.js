'use strict';
// ===== Breaking =====
// Una uscita da sei battute sulla base del DJ, giudicata sul tempo. Le note scorrono da destra
// verso la linea a sinistra: si preme A o B quando la nota ci passa sopra. Le note lunghe si
// tengono premute fino in fondo (sono i power move: il windmill, l'headspin, la freeze), quelle
// doppie vogliono A e B insieme.
// Premere a vuoto, fuori tempo, toglie punti: i giudici guardano anche la pulizia.
//
// Il livello fa la coreografia (più veloce, più fitta, con più power move); l'atleta fa
// l'esecuzione: il punteggio finale è quello del tempo, moltiplicato per quanto il corpo regge i
// movimenti. Un b-boy non allenato che le prende tutte arriva a 72, allenato al massimo a 100.

// Una battuta per mossa. Le note sono [ottavo, tasto, durata in ottavi]: 0..7 dentro la battuta.
const MOSSE = {
  toprock: { nome: 'TOPROCK', note: [[0, 0], [2, 1], [4, 0], [6, 1]] },
  toprock2: { nome: 'TOPROCK', note: [[0, 0], [2, 1], [3, 0], [4, 1], [6, 0], [7, 1]] },
  footwork: { nome: 'FOOTWORK', note: [[0, 0], [2, 1], [4, 0], [6, 1]] },
  footwork8: { nome: '6-STEP', note: [[0, 0], [1, 1], [2, 0], [3, 1], [4, 0], [5, 1]] },
  footwork8b: { nome: '6-STEP', note: [[0, 0], [1, 1], [2, 0], [3, 1], [4, 0], [5, 1], [6, 0], [7, 1]] },
  windmill: { nome: 'WINDMILL', note: [[0, 0, 5], [6, 1]] },
  headspin: { nome: 'HEADSPIN', note: [[0, 1, 4], [4, 0], [6, 0]] },
  freeze: { nome: 'FREEZE', note: [[0, 0, 4], [0, 1, 4]] },
};
const COREO = [
  { bpm: 96, mosse: ['toprock', 'toprock', 'footwork', 'footwork', 'windmill', 'freeze'] },
  { bpm: 104, mosse: ['toprock', 'toprock2', 'footwork8', 'windmill', 'headspin', 'freeze'] },
  { bpm: 112, mosse: ['toprock2', 'footwork8b', 'windmill', 'headspin', 'footwork8b', 'freeze'] },
];

class Breaking extends EventBase {
  constructor(n, meta) {
    super(n, meta);
    const C = COREO[clamp(Lv.i, 1, 3) - 1];
    this.bpm = C.bpm; this.beat = 60 / C.bpm; this.e8 = this.beat / 2;
    this.IN = 8;                                        // otto battiti di attacco prima di cominciare
    this.moves = C.mosse.map(k => MOSSE[k]);
    this.notes = [];
    this.moves.forEach((m, bar) => {
      for (const [e, b, len] of m.note) {
        this.notes.push({ t: (this.IN + bar * 4) * this.beat + e * this.e8, b, len: len ? len * this.e8 : 0, bar });
      }
    });
    this.notes.sort((a, b) => a.t - b.t);
    this.max = this.notes.reduce((a, q) => a + 3 + (q.len ? 2 : 0), 0);
    this.END = (this.IN + this.moves.length * 4 + 1) * this.beat;
    this.clock = -0.6;
    this.S = [];
    for (let p = 0; p < n; p++) {
      this.S.push({ ph: 'ballo', j: this.notes.map(() => null), got: 0, hold: [null, null], stray: 0, cur: 0,
        pop: [], combo: 0, wobble: 0, last: '' });
    }
    this.exec = this.pcap.map(f => 0.72 + 0.28 * clamp((f - 0.8) / 0.2, 0, 1));
    this.sched = 0;                                     // il prossimo sedicesimo da mandare alla scheda audio
  }
  labels() { return ['BATTUTA', 'BATTUTA']; }
  press(p, b) {
    const s = this.S[p];
    if (this.res[p] || this.clock < 0) return;
    const t = this.clock;
    let best = -1, bd = 1e9;
    for (let i = 0; i < this.notes.length; i++) {
      const q = this.notes[i];
      if (q.t > t + 0.25) break;
      if (q.b !== b || s.j[i] != null) continue;
      const d = Math.abs(q.t - t);
      if (d < bd) { bd = d; best = i; }
    }
    if (best < 0 || bd > 0.16) {
      // a vuoto: i giudici se ne accorgono
      s.stray++; s.got = Math.max(0, s.got - 1); s.combo = 0; s.wobble = 0.3;
      this.pop(s, 'FUORI TEMPO', '#ff8a80');
      return;
    }
    const v = bd <= 0.05 ? 3 : bd <= 0.1 ? 2 : 1;
    s.j[best] = v; s.got += v; s.combo++;
    this.pop(s, v === 3 ? 'PERFETTO' : v === 2 ? 'BENE' : 'OK', v === 3 ? '#ffd600' : v === 2 ? '#7CFC00' : '#fff');
    if (this.notes[best].len) s.hold[b] = best;
    Snd.tone(b ? 660 : 520, 0.04, 'triangle', 0.05);
  }
  release(p, b) {
    const s = this.S[p], i = s.hold[b];
    if (i == null) return;
    s.hold[b] = null;
    const q = this.notes[i], k = clamp((this.clock - q.t) / q.len, 0, 1);
    // una power move lasciata a metà vale per quello che si è tenuto
    if (k < 0.9) { s.got += 2 * k; s.combo = 0; s.wobble = 0.4; this.pop(s, 'LASCIATO', '#ffab40'); }
    else { s.got += 2; this.pop(s, 'TENUTO!', '#ffd600'); }
  }
  pop(s, text, col) { s.pop.push({ text, col, t: 0.7 }); if (s.pop.length > 3) s.pop.shift(); }
  update(dt) {
    this.clock += dt;
    this.music();
    for (let p = 0; this.tocca(p); p++) {
      const s = this.S[p];
      for (const q of s.pop) q.t -= dt;
      s.pop = s.pop.filter(q => q.t > 0);
      if (s.wobble > 0) s.wobble -= dt;
      if (this.res[p]) continue;
      // le note passate senza essere prese
      for (let i = 0; i < this.notes.length; i++) {
        const q = this.notes[i];
        if (q.t > this.clock - 0.16) break;
        if (s.j[i] == null) { s.j[i] = 0; s.combo = 0; s.wobble = 0.35; this.pop(s, 'MANCATO', '#ff5252'); }
      }
      // le note lunghe tenute fino in fondo si chiudono da sole
      for (let b = 0; b < 2; b++) {
        const i = s.hold[b];
        if (i != null && this.clock >= this.notes[i].t + this.notes[i].len) { s.hold[b] = null; s.got += 2; this.pop(s, 'TENUTO!', '#ffd600'); }
      }
      if (this.clock >= this.END) {
        const v = Math.round(1000 * clamp(s.got / this.max, 0, 1) * this.exec[p]) / 10;
        s.ph = 'done';
        this.finish(p, v);
        this.say(p, v.toFixed(1), PCOL[p].ui, 4, 'voto dei giudici');
        Snd.applause(clamp((v - 40) / 60, 0.2, 1));
      }
    }
    this.baseUpdate(dt);
  }
  // Il punteggio mentre si balla: quello dei giudici se finisse adesso, sulle note già passate.
  liveScore(q) {
    const s = this.S[q];
    if (this.res[q]) return this.res[q].value;
    let m = 0;
    for (let i = 0; i < this.notes.length; i++) { if (s.j[i] == null) break; m += 3 + (this.notes[i].len ? 2 : 0); }
    return m ? Math.round(1000 * clamp(s.got / m, 0, 1) * this.exec[q]) / 10 : null;
  }
  fermo(p) { return this.S[p].ph === 'done'; }
  hud(p) {
    const s = this.S[p];
    const m = this.moves[clamp(Math.floor((this.clock / this.beat - this.IN) / 4), 0, this.moves.length - 1)];
    return (this.clock < this.IN * this.beat ? 'Pronti...' : m.nome) + (s.combo > 3 ? '  •  Serie ' + s.combo : '');
  }

  // ---------- la base: cassa, rullante, charleston e un giro di basso ----------
  music() {
    if (!Snd.on || !Snd.ctx || typeof Music === 'undefined') return;
    const c = Snd.ctx;
    if (!this.out) { this.out = c.createGain(); this.out.gain.value = 0.55; this.out.connect(c.destination); }
    const s16 = this.e8 / 2, fuori = { out: this.out };
    const lat = Math.min(0.15, c.outputLatency || c.baseLatency || 0);
    const BASSO = ['A1', 'A1', 'C2', 'A1', 'G1', 'G1', 'E1', 'G1'];
    while (this.sched * s16 < this.clock + 0.25 && this.sched * s16 < this.END + this.beat) {
      const k = this.sched, at = c.currentTime + (k * s16 - this.clock) - lat;
      this.sched++;
      if (at < c.currentTime - 0.02) continue;          // gia' passato (era in pausa): non si recupera
      const i = k % 16, bar = Math.floor(k / 16);
      const t = Math.max(at, c.currentTime);
      if (i === 0 || i === 7 || i === 10) Music.hit.call(fuori, 'K', t);
      if (i === 4 || i === 12) Music.hit.call(fuori, 'S', t);
      if (i % 2 === 0) Music.hit.call(fuori, i === 14 ? 'o' : 'h', t);
      if (i % 4 === 0 && bar >= 1) Music.voice(Music.freq(BASSO[(bar * 2 + i / 8) % 8 | 0]), t, s16 * 3, 'triangle', 0.13, 0, this.out);
      if (bar === 1 && i === 12) Music.hit.call(fuori, 'c', t);
    }
    // finito il ballo si spegne piano
    if (this.clock > this.END + this.beat && this.out && !this.spento) {
      this.spento = true;
      try { this.out.gain.setTargetAtTime(0.0001, c.currentTime, 0.3); } catch (e) { /* niente */ }
    }
  }

  // ---------- disegno ----------
  // La posa del ballerino, battuta per battuta: il tempo musicale (ph, in battiti) fa girare le
  // gambe nel windmill e nell'headspin, e fa andare avanti e indietro i passi del toprock.
  pose(p, gy, ppm) {
    const s = this.S[p], ph = this.clock / this.beat;
    const bar = Math.floor((ph - this.IN) / 4), m = ph < this.IN ? null : this.moves[Math.min(bar, this.moves.length - 1)];
    const k = m ? Object.keys(MOSSE).find(x => MOSSE[x] === m) : 'attesa';
    const sw = Math.sin(ph * Math.PI), w = s.wobble > 0 ? Math.sin(s.wobble * 40) * 0.15 : 0;
    if (!m || k.startsWith('toprock')) {
      // toprock: in piedi, passo incrociato avanti e indietro a ogni battito, braccia che segnano il tempo
      const a = m ? sw : Math.sin(ph * Math.PI) * 0.3;
      return [{ torso: -0.05 + w, neck: 0.1, lu: 0.6 + 0.5 * a, lf: 2.0, ru: 0.4 - 0.5 * a, rf: 1.9,
        lt: 0.35 * a, ls: 0.35 * a - 0.2 * Math.abs(a), rt: -0.35 * a, rs: -0.35 * a - 0.2 * Math.abs(a) }, gy - (0.9 - 0.04 * Math.abs(a)) * ppm];
    }
    if (k.startsWith('footwork')) {
      // a terra sulle mani, le gambe che girano attorno
      const a = ph * Math.PI;
      return [{ torso: 1.2 + w, neck: -0.4, lu: 0.1, lf: 0.05, ru: 0.25, rf: 0.2,
        lt: 1.1 + Math.sin(a) * 0.9, ls: 0.2 + Math.cos(a) * 0.8, rt: 1.3 + Math.sin(a + Math.PI) * 0.9, rs: 0.4 + Math.cos(a + Math.PI) * 0.8 }, gy - 0.5 * ppm];
    }
    if (k === 'windmill') {
      // il corpo gira sulla schiena, gambe a V
      const r = (ph - this.IN) * Math.PI * 0.9;
      return [{ rot: r, torso: 0, neck: 0, lu: 1.6, lf: 1.6, ru: -1.4, rf: -1.4, lt: 0.55, ls: 0.55, rt: -0.55, rs: -0.55 }, gy - 0.42 * ppm];
    }
    if (k === 'headspin') {
      // a testa in giu', le gambe aperte che ruotano
      const a = ph * Math.PI * 2;
      return [{ rot: Math.PI + w, torso: 0, neck: 0, lu: 0.5, lf: 0.2, ru: -0.5, rf: -0.2,
        lt: Math.sin(a) * 0.7, ls: Math.sin(a) * 0.7, rt: -Math.sin(a) * 0.7, rs: -Math.sin(a) * 0.7 }, gy - 1.25 * ppm];
    }
    // freeze: in equilibrio su una mano, gambe raccolte in aria (la "baby freeze")
    return [{ rot: 2.1 + w * 2, torso: 0.2, neck: 0.5, lu: 0.1, lf: 0.2, ru: 1.4, rf: 2.2, lt: 1.9, ls: 0.3, rt: 1.3, rs: -0.4 }, gy - 0.7 * ppm];
  }
  drawLane(ctx, p, w, h) {
    const s = this.S[p];
    // la pista: pavimento scuro, pubblico tutto attorno, un faro che segue il tempo
    ctx.fillStyle = '#1a1333'; ctx.fillRect(0, 0, w, h);
    Bg.crowdBand(ctx, w, h * 0.04, h * 0.42, this.clock * 20);
    ctx.fillStyle = 'rgba(20,10,40,0.45)'; ctx.fillRect(0, h * 0.04, w, h * 0.38);
    const gy = h * 0.66, ppm = h / 3.4, dx = w * 0.26;
    ctx.fillStyle = '#2b2b3a'; ctx.fillRect(0, h * 0.42, w, gy - h * 0.42 + 4);
    ctx.fillStyle = '#3b3b52';
    for (let i = 0; i < 12; i++) ctx.fillRect(0, h * 0.42 + i * (gy - h * 0.42) / 12, w, 1);
    const pulse = Math.max(0, Math.cos((this.clock / this.beat) * TAU)) * 0.2;
    const lg = ctx.createRadialGradient(dx, gy, 5, dx, gy, ppm * 1.8);
    lg.addColorStop(0, 'rgba(255,240,180,' + (0.28 + pulse) + ')'); lg.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = lg; ctx.fillRect(dx - ppm * 2, gy - ppm * 2.2, ppm * 4, ppm * 2.6);
    const [pose, hy] = this.pose(p, gy, ppm);
    shadow(ctx, dx, gy, ppm, 1.4);
    drawAthlete(ctx, dx, hy, ppm, pose, PCOL[p]);
    // il nome della mossa
    const ph = this.clock / this.beat, bar = Math.floor((ph - this.IN) / 4);
    if (ph >= this.IN && bar < this.moves.length) txt(ctx, this.moves[bar].nome, dx, h * 0.12, clamp(h * 0.07, 14, 26), '#ffd600');
    else if (ph < this.IN && ph > 0) txt(ctx, ph < this.IN - 3 ? 'SI PARTE...' : String(this.IN - Math.floor(ph)), dx, h * 0.12, clamp(h * 0.08, 16, 30), '#fff');
    // l'autostrada delle note: due corsie, A sopra e B sotto, la linea a sinistra
    const hx = w * 0.52, hw = w - hx - 14, hy0 = h * 0.54, lh = Math.max(20, h * 0.1), px = hw / (this.beat * 3.2);
    const X = t => hx + 34 + (t - this.clock) * px;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; rrect(ctx, hx - 4, hy0 - 6, hw + 8, lh * 2 + 12, 8); ctx.fill();
    for (let b = 0; b < 2; b++) {
      const y = hy0 + b * lh;
      ctx.fillStyle = b ? 'rgba(96,125,139,0.25)' : 'rgba(229,57,53,0.18)'; ctx.fillRect(hx, y, hw, lh - 2);
      txt(ctx, b ? 'B' : 'A', hx + 14, y + lh / 2, lh * 0.6, b ? '#b0bec5' : '#ff8a80');
    }
    // i battiti: righe sottili, piu' marcate all'inizio della battuta
    const b0 = Math.ceil((this.clock - 1) / this.beat), b1 = b0 + 5;
    for (let b = b0; b <= b1; b++) {
      const x = X(b * this.beat);
      if (x < hx + 30 || x > hx + hw) continue;
      ctx.fillStyle = b % 4 === 0 ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)';
      ctx.fillRect(x, hy0, b % 4 === 0 ? 2 : 1, lh * 2 - 2);
    }
    ctx.save();
    ctx.beginPath(); ctx.rect(hx + 28, hy0 - 4, hw - 28, lh * 2 + 8); ctx.clip();
    for (let i = 0; i < this.notes.length; i++) {
      const q = this.notes[i], x = X(q.t);
      if (x > hx + hw + 20) break;
      const xe = X(q.t + q.len);
      if (xe < hx + 20) continue;
      const y = hy0 + q.b * lh + lh / 2 - 1, r = lh * 0.36, jj = s.j[i];
      const col = jj == null ? (q.b ? '#cfd8dc' : '#ff5252') : jj === 0 ? '#555' : '#ffd600';
      if (q.len) { ctx.fillStyle = col; ctx.globalAlpha = 0.55; rrect(ctx, x, y - r * 0.55, xe - x, r * 1.1, r * 0.5); ctx.fill(); ctx.globalAlpha = 1; }
      if (jj != null && jj > 0 && !q.len) continue;       // presa: sparisce
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = '#fff'; ctx.fillRect(hx + 32, hy0 - 4, 3, lh * 2 + 4);   // la linea
    // i giudizi, uno sopra l'altro sopra la linea
    s.pop.forEach((q, i) => {
      ctx.save(); ctx.globalAlpha = clamp(q.t / 0.3, 0, 1);
      txt(ctx, q.text, hx + 34, hy0 - 16 - (s.pop.length - 1 - i) * 18 - (0.7 - q.t) * 20, 16, q.col);
      ctx.restore();
    });
    // il voto in alto a destra
    const v = this.liveScore(p);
    txt(ctx, v == null ? '--' : v.toFixed(1), w - 16, h * 0.12, clamp(h * 0.11, 18, 36), '#fff', 'right');
    if (s.combo > 3) txt(ctx, 'SERIE ' + s.combo, w - 16, h * 0.12 + clamp(h * 0.09, 16, 30), 15, '#ffd600', 'right');
    ctx.save(); ctx.translate(-w * 0.24, 0); this.drawMsg(ctx, p, w, h); ctx.restore();
  }
}

registerEvent({
  id: 'breaking', name: 'BREAKING', cls: Breaking, lowerBetter: false, music: 'nessuna',
  labels: ['BATTUTA', 'BATTUTA'],
  help: ['Premi A o B quando la nota arriva sulla linea bianca.', 'Le note lunghe si tengono premute fino in fondo,', 'quelle doppie vogliono A e B insieme. A vuoto perdi punti!'],
  fmt: Fmt.pts, pts: v => v == null ? 0 : Math.round(v * 11),
});
