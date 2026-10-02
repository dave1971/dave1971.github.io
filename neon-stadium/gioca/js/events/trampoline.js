'use strict';
// ===== Trampolino elastico =====
// A = stacca dal telo; tieni premuto A per raggrupparti e girare veloce, rilascia per distenderti.
// B = mezzo avvitamento. Qui non esiste l'entrata di testa: si deve tornare sul telo in piedi, cioè
// con i salti mortali contati per intero. 3 esercizi, punteggi sommati.

class Trampoline extends EventBase {
  constructor(n, meta) {
    super(n, meta);
    this.skills = 3;
    this.v0 = 8.0;          // push off the bed: about 3.3 m up and 1.6 s of air
    this.S = [];
    for (let p = 0; p < n; p++) this.S.push(this.fresh({ k: 0, total: 0 }));
  }
  fresh(o) {
    return { k: o.k, total: o.total, ph: 'ready', y: 0, vy: 0, ang: 0, w: 0, tuck: false,
      twist: 0, tw: 0, t: 0, bed: 0, sc: null };
  }
  press(p, b) {
    const s = this.S[p];
    if (this.res[p]) return;
    if (b === 0) {
      if (s.ph === 'ready') { s.ph = 'air'; s.vy = this.v0; s.w = 1.4; s.tuck = true; s.bed = 1; Snd.jump(); }
      else if (s.ph === 'air') s.tuck = true;
    } else if (s.ph === 'air' && s.twist < this.capP(p)) { s.twist++; s.tw = 0.3; Snd.click(); }
  }
  release(p, b) { if (b === 0) this.S[p].tuck = false; }
  update(dt) {
    for (let p = 0; p < this.n; p++) {
      const s = this.S[p];
      if (this.res[p]) continue;
      s.t += dt;
      s.bed = Math.max(0, s.bed - dt * 2.5);
      if (s.ph === 'air') {
        s.vy -= 9.8 * dt; s.y += s.vy * dt;
        const tgt = s.tuck ? 10 : 1.2;
        s.w += (tgt - s.w) * Math.min(1, (s.tuck ? 8 : 14) * dt);
        s.ang += s.w * dt;
        s.tw -= dt;
        if (s.y <= 0 && s.vy < 0) this.landing(p, s);
      } else if (s.ph === 'land') {
        if (s.t > 0.8) { s.ph = 'score'; s.t = 0; this.showScore(p, s); }
      } else if (s.ph === 'score' && s.t > 3) {
        s.k++;
        if (s.k >= this.skills) this.finish(p, s.total);
        else this.S[p] = this.fresh(s);
      }
    }
    this.baseUpdate(dt);
  }
  // Feet back on the bed: only whole somersaults count, so the body axis must come back to vertical.
  landing(p, s) {
    s.y = 0; s.bed = 1;
    const turns = Math.max(0, Math.round(s.ang / TAU));
    const err = Math.abs(s.ang - turns * TAU) * 180 / Math.PI;
    const dd = Math.round((1.0 + 0.4 * turns + 0.2 * s.twist) * 10) / 10;
    let ex = 10 - err / 14 - (s.tuck ? 3 : 0) - (s.tw > 0 ? 2 : 0);
    ex = clamp(ex, 0, 10) * this.pf[p];
    const judges = [0, 1, 2].map(() => clamp(Math.round((ex + rnd(-0.6, 0.6)) * 2) / 2, 0, 10));
    const score = Math.round(judges.reduce((a, b) => a + b, 0) * dd * 100) / 100;
    s.total = Math.round((s.total + score) * 100) / 100;
    s.sc = { judges, dd, score, turns, err };
    s.ph = 'land'; s.t = 0;
    Snd.thud();
  }
  showScore(p, s) {
    const c = s.sc;
    const name = (c.turns === 0 ? 'salto teso' : c.turns + (c.turns === 1 ? ' salto mortale' : ' salti mortali'))
      + (s.twist ? ' + ' + (s.twist / 2) + ' avv.' : '');
    const col = c.score >= 60 ? '#7CFC00' : c.score >= 30 ? '#fff' : '#ff8a80';
    this.say(p, c.score.toFixed(2), col, 3, name + '  •  giudici ' + c.judges.join(' - ') + '  •  coeff. ' + c.dd.toFixed(1));
    if (c.score >= 45) Snd.applause(); else Snd.fail();
  }
  liveScore(q) { return this.S[q].total; }
  hud(p) { const s = this.S[p]; return 'Esercizio ' + Math.min(s.k + 1, this.skills) + '/' + this.skills + '  •  Totale ' + s.total.toFixed(2); }
  // Where the body axis lands if the tuck is released right now.
  predict(s) {
    let y = s.y, vy = s.vy, w = s.w, ang = s.ang;
    const dt = 1 / 120;
    for (let i = 0; i < 2000 && (y > 0 || vy > 0); i++) {
      vy -= 9.8 * dt; y += vy * dt;
      w += (1.2 - w) * Math.min(1, 14 * dt);
      ang += w * dt;
    }
    return ang;
  }
  // Only one way down counts here, feet first, so the dial has a single green wedge.
  drawSpin(ctx, w, h, s) {
    const R = clamp(h * 0.16, 34, 74), cx = w - R - 22, cy = h * 0.46;
    const pred = this.predict(s), turns = Math.round(pred / TAU);
    const err = Math.abs(pred - turns * TAU) * 180 / Math.PI;
    const col = err <= 8 ? '#00e63c' : err <= 20 ? '#ffd600' : '#ff5252';
    const needle = (a, len, width, color) => {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - Math.sin(a) * len * 0.55, cy + Math.cos(a) * len * 0.55);
      ctx.lineTo(cx + Math.sin(a) * len, cy - Math.cos(a) * len);
      ctx.stroke();
    };
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,230,60,0.38)';
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, -Math.PI / 2 - 0.14, -Math.PI / 2 + 0.14);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    needle(s.ang, R * 0.8, 3, 'rgba(255,255,255,0.45)');
    needle(pred, R * 0.92, 5, col);
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    txt(ctx, 'ARRIVO', cx, cy - R - 12, Math.max(10, R * 0.22), '#fff');
    txt(ctx, Math.round(err) + '°', cx, cy + R + 14, Math.max(12, R * 0.3), col);
  }
  drawLane(ctx, p, w, h) {
    const s = this.S[p], ppm = h / 7.6;
    const ax = w * 0.42, by = h * 0.93;          // the bed sits here
    const sy = Y => by - Y * ppm;
    // gym hall
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#2b3350'); g.addColorStop(1, '#4a5578');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    Bg.crowdBand(ctx, w, h * 0.04, h * 0.28, 0);
    ctx.fillStyle = '#6d7699'; ctx.fillRect(0, h * 0.28, w, h * 0.72);
    ctx.fillStyle = '#5b6488'; ctx.fillRect(0, by + 0.55 * ppm, w, h);
    // frame and bed, dipping when the athlete lands on it
    const dip = s.bed * 0.35 * ppm;
    ctx.fillStyle = '#37474f';
    ctx.fillRect(ax - 2.0 * ppm, by, 0.14 * ppm, 1.1 * ppm);
    ctx.fillRect(ax + 1.86 * ppm, by, 0.14 * ppm, 1.1 * ppm);
    ctx.strokeStyle = '#90a4ae'; ctx.lineWidth = Math.max(3, 0.11 * ppm);
    ctx.beginPath();
    ctx.moveTo(ax - 1.9 * ppm, by);
    ctx.quadraticCurveTo(ax, by + dip * 2, ax + 1.9 * ppm, by);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
    for (let i = -4; i <= 4; i++) {
      const x = ax + i * 0.42 * ppm;
      ctx.beginPath(); ctx.moveTo(x, by + 0.02 * ppm); ctx.lineTo(x, by + dip * 1.4); ctx.stroke();
    }
    // athlete
    let pose = s.tuck && s.ph === 'air' ? Pose.tuck() : Pose.straight();
    if (s.ph === 'ready' || s.ph === 'land') pose = Pose.armsOut();
    pose.rot = s.ph === 'ready' ? 0 : s.ang;
    const hy = sy(s.y + 0.95) + (s.ph === 'air' ? 0 : dip);
    ctx.save();
    if (s.tw > 0) { ctx.translate(ax, hy); ctx.scale(Math.max(0.15, Math.abs(Math.cos((0.3 - s.tw) / 0.3 * Math.PI))), 1); ctx.translate(-ax, -hy); }
    drawAthlete(ctx, ax, hy, ppm, Object.assign(pose, SCALZO), PCOL[p]);
    ctx.restore();
    if (s.ph === 'air') {
      txt(ctx, (s.ang / TAU).toFixed(1) + ' giri', w - 16, h * 0.12, clamp(h * 0.09, 15, 30), '#fff', 'right');
      txt(ctx, s.tuck ? 'RAGGRUPPATO' : 'DISTESO', w - 16, h * 0.12 + clamp(h * 0.09, 15, 30), clamp(h * 0.06, 11, 20), s.tuck ? '#ffeb3b' : '#b2ff59', 'right');
      this.drawSpin(ctx, w, h, s);
    }
    if (s.ph === 'ready' && !this.msg[p]) {
      txt(ctx, 'ESERCIZIO ' + (s.k + 1) + ' DI ' + this.skills, w * 0.5, h * 0.24, clamp(h * 0.11, 20, 40), '#ffeb3b');
      txt(ctx, 'premi A per staccare', w * 0.5, h * 0.24 + clamp(h * 0.1, 16, 32), clamp(h * 0.07, 13, 24), '#fff');
    }
    this.drawMsg(ctx, p, w, h);
  }
}

registerEvent({
  id: 'trampolino', name: 'TRAMPOLINO ELASTICO', cls: Trampoline, lowerBetter: false,
  labels: ['STACCA/RAGGR.', 'AVVITA'],
  help: ['A: stacca. Tieni premuto A per raggrupparti e girare', 'veloce, rilascia per distenderti. B: mezzo avvitamento.',
    'Torna sul telo in piedi! 3 esercizi, punti sommati.'],
  fmt: Fmt.pts, pts: v => v == null ? 0 : Math.round(v * 5),
});
