'use strict';
// ===== Tiro al piattello =====
// The button on the left of the control bar fires the sight on the left of the screen, the one on the
// right fires the right sight. Which of A/B sits on which side depends on the dominant hand, so the
// mapping follows it. 2 shells per launch. 15 clays.

// button -> sight, and (being its own inverse) sight -> the button that fires it
const skeetSight = (p, b) => (PCOL[p] && PCOL[p].lefty) ? b : 1 - b;

class Skeet extends EventBase {
  constructor(n, meta) {
    super(n, meta);
    // random launch sequence (shared by both players): 1-3 doubles, always 15 clays in total
    const rng = mulberry32((Date.now() & 0xffff) + 7);
    const nD = 1 + ((rng() * 3) | 0), nV = 15 - nD;
    const types = [];
    for (let i = 0; i < nV; i++) types.push(i < nD ? 'D' : (rng() < 0.5 ? 'L' : 'R'));
    for (let i = types.length - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0; [types[i], types[j]] = [types[j], types[i]]; }
    if (types[0] === 'D') { const k = types.findIndex(t => t !== 'D'); [types[0], types[k]] = [types[k], types[0]]; }
    let t0 = 0;
    this.vol = types.map((ty, i) => {
      const T = lerp(2.3, 1.5, i / (nV - 1)) + (rng() - 0.5) * 0.24;
      const v = { ty, first: ty === 'D' ? (rng() < 0.5 ? 'L' : 'R') : ty, T, t0 };
      t0 += T + (ty === 'D' ? this.DOUBLE_GAP : 0) + 1.2;
      return v;
    });
    this.total = 15;
    this.pend = null;
    this.clock = -2;
    this.cur = -1;
    this.sightU = [0.33, 0.67]; this.sightV = 0.45; this.R = 26;
    this.Rp = Array.from({ length: n }, (_, p) => this.R * this.pf[p]);
    this.S = [];
    for (let p = 0; p < n; p++) this.S.push({ hits: 0, shells: 0, clays: [], reload: [0, 0], flash: [0, 0], parts: [], aim: 0, dim: [960, 200] });
  }
  get DOUBLE_GAP() { return 1.0; } // seconds between the two clays of a double
  launch(side, T) {
    for (const s of this.S) s.clays.push({ side, t: 0, T, alive: true });
    Snd.tone(220, 0.1, 'square', 0.06);
  }
  clayPos(c) {
    const k = c.t / c.T;
    const u = c.side === 'L' ? 0.06 + 0.88 * k : 0.94 - 0.88 * k;
    const q = (u - 0.5) / 0.17;
    return [u, this.sightV + 0.067 * (q * q - 1)];
  }
  btnFor(p, g) { return skeetSight(p, g); } // which button fires sight g (used by the CPU)
  press(p, b) {
    const s = this.S[p], g = skeetSight(p, b); // g = the sight this button fires
    if (this.res[p] || this.clock < 0) return;
    s.aim = g;
    if (s.shells <= 0 || s.reload[g] > 0) { Snd.click(); return; }
    s.shells--; s.reload[g] = 0.22; s.flash[g] = 0.12;
    Snd.shot();
    const [w, h] = s.dim, su = this.sightU[g];
    for (const c of s.clays) {
      if (!c.alive) continue;
      const [u, v] = this.clayPos(c);
      if (Math.hypot((u - su) * w, (v - this.sightV) * h) < this.Rp[p]) {
        c.alive = false; s.hits++;
        Snd.clay();
        for (let i = 0; i < 14; i++) s.parts.push({ u, v, du: rnd(-0.15, 0.15), dv: rnd(-0.35, 0.1), t: rnd(0.5, 0.9) });
        this.say(p, 'COLPITO!', '#7CFC00', 0.6);
        break;
      }
    }
  }
  update(dt) {
    this.clock += dt;
    const nxt = this.cur + 1;
    if (nxt < this.vol.length && this.clock >= this.vol[nxt].t0) {
      this.cur = nxt;
      const V = this.vol[nxt];
      for (const s of this.S) { s.shells = 2; s.clays = []; }
      this.launch(V.first, V.T);
      // doubles: the second clay leaves the opposite trap house a moment later
      this.pend = V.ty === 'D' ? { side: V.first === 'L' ? 'R' : 'L', at: V.t0 + this.DOUBLE_GAP, T: V.T } : null;
    }
    if (this.pend && this.clock >= this.pend.at) { this.launch(this.pend.side, this.pend.T); this.pend = null; }
    for (const s of this.S) {
      for (const c of s.clays) c.t += dt;
      s.clays = s.clays.filter(c => c.t < c.T);
      for (let b = 0; b < 2; b++) { s.reload[b] -= dt; s.flash[b] -= dt; }
      for (const q of s.parts) { q.u += q.du * dt; q.v += q.dv * dt; q.dv += 0.8 * dt; q.t -= dt; }
      s.parts = s.parts.filter(q => q.t > 0);
    }
    const last = this.vol[this.vol.length - 1];
    if (this.clock > last.t0 + last.T + (last.ty === 'D' ? this.DOUBLE_GAP : 0) + 1) {
      for (let p = 0; p < this.n; p++) this.finish(p, this.S[p].hits, this.S[p].hits + '/' + this.total);
    }
    this.baseUpdate(dt);
  }
  hud(p) { return 'Colpiti ' + this.S[p].hits + '/' + this.total; }
  liveScore(q) { return this.S[q].hits; }
  drawLane(ctx, p, w, h) {
    const s = this.S[p];
    s.dim = [w, h];
    // sky + scenery
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#3d8fd6'); g.addColorStop(0.75, '#cfe9ff'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#6f9a5b';
    ctx.beginPath(); ctx.moveTo(0, h * 0.8);
    for (let x = 0; x <= w; x += 40) ctx.lineTo(x, h * (0.74 + 0.04 * Math.sin(x * 0.013) + 0.02 * Math.sin(x * 0.041)));
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
    ctx.fillStyle = '#2e7d32';
    for (let x = 12; x < w; x += 55) { const th = h * (0.07 + 0.03 * Math.sin(x)); ctx.beginPath(); ctx.moveTo(x - 12, h * 0.82); ctx.lineTo(x, h * 0.82 - th); ctx.lineTo(x + 12, h * 0.82); ctx.fill(); }
    ctx.fillStyle = '#7cb342'; ctx.fillRect(0, h * 0.82, w, h * 0.18);
    // trap houses
    for (const u of [0.02, 0.9]) {
      ctx.fillStyle = '#8d6e63'; ctx.fillRect(u * w, h * 0.78, w * 0.08, h * 0.12);
      ctx.fillStyle = '#5d4037'; ctx.fillRect(u * w - 4, h * 0.76, w * 0.08 + 8, h * 0.03);
      ctx.fillStyle = '#222'; ctx.fillRect(u * w + (u < 0.5 ? w * 0.05 : w * 0.01), h * 0.8, w * 0.02, h * 0.03);
    }
    // clays
    for (const c of s.clays) {
      if (!c.alive) continue;
      const [u, v] = this.clayPos(c);
      ctx.fillStyle = '#ff6d00';
      ctx.beginPath(); ctx.ellipse(u * w, v * h, 7, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffab40'; ctx.fillRect(u * w - 4, v * h - 3, 8, 2);
    }
    ctx.fillStyle = '#ff6d00';
    for (const q of s.parts) ctx.fillRect(q.u * w, q.v * h, 3, 3);
    // sights
    for (let b = 0; b < 2; b++) {
      const x = this.sightU[b] * w, y = this.sightV * h, fl = s.flash[b] > 0;
      ctx.strokeStyle = fl ? '#fff' : PCOL[p].ui; ctx.lineWidth = fl ? 4 : 2.5;
      ctx.beginPath(); ctx.arc(x, y, this.R, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - this.R - 8, y); ctx.lineTo(x - 6, y); ctx.moveTo(x + 6, y); ctx.lineTo(x + this.R + 8, y);
      ctx.moveTo(x, y - this.R - 8); ctx.lineTo(x, y - 6); ctx.moveTo(x, y + 6); ctx.lineTo(x, y + this.R + 8);
      ctx.stroke();
      txt(ctx, skeetSight(p, b) ? 'B' : 'A', x + this.R + 12, y - this.R, 16, PCOL[p].ui);
    }
    // shooter seen from behind (drawDiSpalle in athlete.js: schiena, testa col berretto e le cuffie, fucile)
    drawDiSpalle(ctx, PCOL[p], PCOL[p], w * 0.5, h, h / 200, this.sightU[s.aim] * w, this.sightV * h, 'fucile');
    // HUD
    for (let i = 0; i < 2; i++) {
      ctx.fillStyle = i < s.shells ? '#d32f2f' : 'rgba(0,0,0,0.3)';
      rrect(ctx, 16 + i * 16, h * 0.08, 11, 24, 3); ctx.fill();
      ctx.fillStyle = i < s.shells ? '#c9a227' : 'rgba(0,0,0,0.3)'; ctx.fillRect(16 + i * 16, h * 0.08 + 18, 11, 6);
    }
    txt(ctx, 'LANCIO ' + Math.max(1, this.cur + 1) + '/' + this.vol.length, 56, h * 0.08 + 12, 15, '#fff', 'left');
    txt(ctx, s.hits + '/' + this.total, w - 16, h * 0.12, clamp(h * 0.11, 18, 36), '#fff', 'right');
    if (this.clock < 0) txt(ctx, 'PRONTI...', w / 2, h * 0.25, clamp(h * 0.13, 22, 46), '#ffeb3b');
    this.drawMsg(ctx, p, w, h);
  }
}

registerEvent({
  id: 'piattello', name: 'TIRO AL PIATTELLO', cls: Skeet, lowerBetter: false,
  labels: ['SPARA SX', 'SPARA DX'],
  labelsFor: p => skeetSight(p, 0) === 0 ? ['SPARA SX', 'SPARA DX'] : ['SPARA DX', 'SPARA SX'],
  help: () => {
    const L = skeetSight(0, 0) === 0 ? 0 : 1; // the button that fires the LEFT sight
    const ab = ['A', 'B'], kb = [T(Keys.name(0)), T(Keys.name(1))];
    return [ab[L] + ' spara nel mirino SINISTRO, ' + ab[1 - L] + ' nel mirino DESTRO.',
      'Spara quando il piattello attraversa il mirino.',
      '2 cartucce per lancio, 15 piattelli (nei doppi il 2° parte dopo 1 s).',
      'Tastiera: ' + kb[L] + ' = mirino sinistro, ' + kb[1 - L] + ' = mirino destro.'];
  },
  fmt: v => v + '/15', pts: v => v == null ? 0 : Math.round(v * 1000 / 15),
});
