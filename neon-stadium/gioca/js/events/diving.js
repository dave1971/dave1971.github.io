'use strict';
// ===== Tuffi dalla piattaforma (10 m) =====
// A = jump; HOLD A to tuck (fast somersaults), release to open. B = add a half twist.
// Enter the water vertical and straight. 3 dives, scores are summed.

class Diving extends EventBase {
  constructor(n, meta) {
    super(n, meta);
    this.dives = 3;
    this.S = [];
    for (let p = 0; p < n; p++) this.S.push(this.fresh({ k: 0, total: 0 }));
  }
  fresh(o) {
    return { k: o.k, total: o.total, ph: 'ready', x: -0.3, y: 10.93, vx: 0, vy: 0, ang: 0, w: 0, tuck: false,
      twist: 0, tw: 0, t: 0, drops: [], sc: null };
  }
  press(p, b) {
    const s = this.S[p];
    if (this.res[p]) return;
    if (b === 0) {
      if (s.ph === 'ready') { s.ph = 'air'; s.vy = 3.4; s.vx = 1.1; s.w = 1.5; s.tuck = true; Snd.jump(); }
      else if (s.ph === 'air') s.tuck = true;
    } else if (s.ph === 'air' && s.twist < this.capP(p)) { s.twist++; s.tw = 0.3; Snd.click(); }
  }
  release(p, b) { if (b === 0) this.S[p].tuck = false; }
  update(dt) {
    for (let p = 0; this.tocca(p); p++) {
      const s = this.S[p];
      if (this.res[p]) continue;
      s.t += dt;
      if (s.ph === 'air') {
        s.vy -= 9.8 * dt; s.y += s.vy * dt; s.x += s.vx * dt;
        const tgt = s.tuck ? 10 : 1.2;   // a touch slower, so the dial can be read and acted on
        s.w += (tgt - s.w) * Math.min(1, (s.tuck ? 8 : 14) * dt);
        s.ang += s.w * dt;
        s.tw -= dt;
        if (s.y <= 0.6) this.enter(p, s);
      } else if (s.ph === 'water') {
        s.y -= 3 * dt;
        if (s.t > 0.9) { s.ph = 'score'; s.t = 0; this.showScore(p, s); }
      } else if (s.ph === 'score' && s.t > 3) {
        s.k++;
        if (s.k >= this.dives) this.finish(p, s.total);
        else this.S[p] = this.fresh(s);
      }
      for (const q of s.drops) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy -= 9.8 * dt; q.t -= dt; }
      s.drops = s.drops.filter(q => q.t > 0);
    }
    this.baseUpdate(dt);
  }
  enter(p, s) {
    const half = Math.max(0, Math.round(s.ang / Math.PI));
    const err = Math.abs(s.ang - half * Math.PI) * 180 / Math.PI;
    const head = half % 2 === 1;
    const dd = Math.round((1.2 + 0.3 * half + 0.2 * s.twist + (head ? 0.2 : 0)) * 10) / 10;
    // the judges mark the entry down gently: a tenth of a second late used to wipe out the dive
    let ex = 10 - err / 14 - (s.tuck ? 3 : 0) - (s.tw > 0 ? 2 : 0);
    ex = clamp(ex, 0, 10) * this.pf[p];
    const judges = [0, 1, 2].map(() => clamp(Math.round((ex + rnd(-0.6, 0.6)) * 2) / 2, 0, 10));
    const score = Math.round(judges.reduce((a, b) => a + b, 0) * dd * 100) / 100;
    s.total = Math.round((s.total + score) * 100) / 100;
    s.sc = { judges, dd, score, half, err, head };
    s.ph = 'water'; s.t = 0;
    Snd.splash();
    const big = clamp(err / 30, 0.3, 3) + (s.tuck ? 1.2 : 0);
    for (let i = 0; i < 14 * big; i++) s.drops.push({ x: s.x + rnd(-0.3, 0.3), y: 0, vx: rnd(-1.2, 1.2) * big * 0.6, vy: rnd(2, 5) * Math.sqrt(big), t: 1.2 });
  }
  showScore(p, s) {
    const c = s.sc;
    const name = c.half === 0 ? 'Tuffo in piedi' : (c.half / 2) + ' salti mortali' + (this.S[p].twist ? ' + ' + (s.twist / 2) + ' avv.' : '');
    const col = c.score >= 60 ? '#7CFC00' : c.score >= 30 ? '#fff' : '#ff8a80';
    this.say(p, c.score.toFixed(2), col, 3, name + '  •  giudici ' + c.judges.join(' - ') + '  •  coeff. ' + c.dd.toFixed(1));
    if (c.score >= 45) Snd.applause(); else Snd.fail();
  }
  liveScore(q) { return this.S[q].total; }
  hud(p) { const s = this.S[p]; return 'Tuffo ' + Math.min(s.k + 1, this.dives) + '/' + this.dives + '  •  Totale ' + s.total.toFixed(2); }
  // Where the body axis ends up at the entry if the tuck is released right now.
  predict(s) {
    let y = s.y, vy = s.vy, w = s.w, ang = s.ang;
    const dt = 1 / 120;
    for (let i = 0; i < 2000 && y > 0.6; i++) {
      vy -= 9.8 * dt; y += vy * dt;
      w += (1.2 - w) * Math.min(1, 14 * dt);
      ang += w * dt;
    }
    return ang;
  }
  // Rotation dial: the faint needle is the body now, the bright one is how it would enter the water
  // if A were released at this instant. Vertical (up or down) is what the judges want.
  drawSpin(ctx, w, h, s) {
    const R = clamp(h * 0.16, 34, 74), cx = w - R - 22, cy = h * 0.46;
    const pred = this.predict(s), half = Math.round(pred / Math.PI);
    const err = Math.abs(pred - half * Math.PI) * 180 / Math.PI;
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
    // the two ways in that count as vertical: head down and feet down
    ctx.fillStyle = 'rgba(0,230,60,0.38)';
    for (const a of [0, Math.PI]) {
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, a - Math.PI / 2 - 0.14, a - Math.PI / 2 + 0.14);
      ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    needle(s.ang, R * 0.8, 3, 'rgba(255,255,255,0.45)');
    needle(pred, R * 0.92, 5, col);
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    txt(ctx, 'INGRESSO', cx, cy - R - 12, Math.max(10, R * 0.22), '#fff');
    txt(ctx, Math.round(err) + '\u00b0', cx, cy + R + 14, Math.max(12, R * 0.3), col);
  }
  drawLane(ctx, p, w, h) {
    const s = this.S[p], ppm = h / 6.5;
    const camY = clamp(s.y, 2.2, 9.9);
    const ax = w * 0.4;
    const sx = X => ax + X * ppm, sy = Y => h * 0.5 + (camY - Y) * ppm;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1e88e5'); g.addColorStop(1, '#bbdefb');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // far stands at pool level
    if (sy(2.4) < h) Bg.crowdBand(ctx, w, sy(2.4), sy(0), 0);
    // tower
    ctx.fillStyle = '#b0bec5'; ctx.fillRect(sx(-4), sy(10.3), 2.4 * ppm, sy(-1) - sy(10.3));
    ctx.fillStyle = '#90a4ae';
    for (const [hh, len] of [[10, 4], [7.5, 3.2], [5, 2.6]]) {
      ctx.fillRect(sx(-4), sy(hh), len * ppm, 0.3 * ppm);
      txt(ctx, hh + ' m', sx(-3.9), sy(hh) - 0.25 * ppm, Math.max(10, ppm * 0.3), '#fff', 'left', { italic: false });
    }
    ctx.fillStyle = '#d32f2f'; ctx.fillRect(sx(-4), sy(10), 4 * ppm, 0.07 * ppm);
    // diver
    if (s.ph !== 'score' || s.y > -0.5) {
      let pose = s.tuck && s.ph === 'air' ? Pose.tuck() : Pose.straight();
      if (s.ph === 'ready') pose = Pose.armsOut();
      pose.rot = s.ang;
      const hx = sx(s.x), hy = sy(s.y);
      ctx.save();
      if (s.tw > 0) { ctx.translate(hx, hy); ctx.scale(Math.max(0.15, Math.abs(Math.cos((0.3 - s.tw) / 0.3 * Math.PI))), 1); ctx.translate(-hx, -hy); }
      drawAthlete(ctx, hx, hy, ppm, Object.assign(pose, TUFFO), PCOL[p]);
      ctx.restore();
    }
    // water
    const wy = sy(0);
    if (wy < h) {
      const gw = ctx.createLinearGradient(0, wy, 0, h);
      gw.addColorStop(0, 'rgba(0,172,230,0.92)'); gw.addColorStop(1, 'rgba(1,87,155,0.97)');
      ctx.fillStyle = gw; ctx.fillRect(0, wy, w, h - wy);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      for (let x = 0; x < w; x += 30) ctx.fillRect(x + 8 * Math.sin(G.t * 2 + x), wy, 14, 2);
    }
    ctx.fillStyle = '#e1f5fe';
    for (const q of s.drops) ctx.fillRect(sx(q.x) - 2, sy(q.y) - 2, 4, 4);
    // HUD: rotation so far, shape, and the dial that says how the entry would come out
    if (s.ph === 'air') {
      txt(ctx, (s.ang / (2 * Math.PI)).toFixed(1) + ' giri', w - 16, h * 0.12, clamp(h * 0.09, 15, 30), '#fff', 'right');
      txt(ctx, s.tuck ? 'RAGGRUPPATO' : 'DISTESO', w - 16, h * 0.12 + clamp(h * 0.09, 15, 30), clamp(h * 0.06, 11, 20), s.tuck ? '#ffeb3b' : '#b2ff59', 'right');
      this.drawSpin(ctx, w, h, s);
    }
    if (s.ph === 'ready' && !this.msg[p]) {
      txt(ctx, 'TUFFO ' + (s.k + 1) + ' DI ' + this.dives, w * 0.62, h * 0.3, clamp(h * 0.11, 20, 40), '#ffeb3b');
      txt(ctx, 'premi A per saltare', w * 0.62, h * 0.3 + clamp(h * 0.1, 16, 32), clamp(h * 0.07, 13, 24), '#fff');
    }
    this.drawMsg(ctx, p, w, h);
  }
}

registerEvent({
  id: 'tuffi', name: 'TUFFI DALLA PIATTAFORMA', cls: Diving, lowerBetter: false,
  labels: ['SALTA/RAGGR.', 'AVVITA'],
  help: ['A: salta. Tieni premuto A per raggrupparti e ruotare', 'veloce, rilascia per distenderti. B: mezzo avvitamento.', 'Entra in acqua dritto e verticale! 3 tuffi, punti sommati.'],
  fmt: Fmt.pts, pts: v => v == null ? 0 : Math.round(v * 3),
});
