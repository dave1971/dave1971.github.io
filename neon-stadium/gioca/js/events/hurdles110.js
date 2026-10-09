'use strict';
// ===== 110 metri ostacoli =====
// A = run, B = jump the hurdle. Hitting a hurdle costs speed.

const HURDLE_H = 1.067;

class Hurdles110 extends Sprint100 {
  constructor(n, meta) {
    super(n, meta);
    this.len = 110;
    this.hx = [];
    for (let i = 0; i < 10; i++) this.hx.push(13.72 + i * 9.14);
  }
  resetRace() {
    super.resetRace();
    // si corre col solo A (B salta l'ostacolo): passo da un dito solo; la velocita' massima degli
    // ostacolisti resta quella del loro tetto, piu' bassa dei velocisti
    this.r = this.r.map((_, p) => new Runner({ vmax: this.capP(p), gain: passoUnDito(this.capP(p)) }));
    this.j = [];
    for (let p = 0; p < this.n; p++) this.j.push({ y: 0, vy: 0, air: false, next: 0, down: Array(10).fill(0), hits: 0 });
  }
  action(p, b) {
    if (b === 0) { this.r[p].tap(); return; }
    const j = this.j[p];
    if (!j.air) { j.air = true; j.vy = 5.0; Snd.jump(); }
  }
  stepRunner(p, dt) {
    const r = this.r[p], j = this.j[p];
    if (j.air) {
      j.vy -= 25 * dt; j.y += j.vy * dt;
      if (j.y <= 0) { j.y = 0; j.air = false; }
    }
    r.update(dt, !j.air);
    // hurdle collision (lead foot ~0.25 m ahead of the hip)
    if (j.next < 10 && r.x + 0.25 >= this.hx[j.next]) {
      if (j.y < 0.3) {
        j.down[j.next] = 1; j.hits++;
        r.v *= 0.55; r.e *= 0.5;
        Snd.clang();
        if (this.fin[p] == null) this.say(p, 'OSTACOLO!', '#ff9800', 0.8);
      }
      j.next++;
    }
  }
  hud(p) {
    const s = super.hud(p);
    return s || (this.j[p].hits ? 'Ostacoli abbattuti: ' + this.j[p].hits : '');
  }
  drawProps(ctx, p, w, h, camX, ppm, ax, L) {
    const j = this.j[p];
    for (let i = 0; i < 10; i++) {
      const x = ax + (this.hx[i] - camX) * ppm;
      if (x < -60 || x > w + 60) continue;
      drawHurdle(ctx, x, L.gy, ppm, j.down[i]);
    }
  }
  poseFor(p, gy, ppm) {
    const j = this.j[p];
    if (j.air) {
      // Dallo stacco (5 m/s in su) all'atterraggio (5 in giu') la velocita' cala in modo regolare: e'
      // l'orologio del salto. Busto, braccia e gamba d'attacco entrano ed escono dalla corsa con
      // dolcezza; la gamba di richiamo segue la sua strada per intero (vedi Pose.ostacolo).
      const u = clamp((5 - j.vy) / 10, 0, 1), H = Pose.ostacolo(u);
      const q = lerpPose(Pose.run(this.r[p].ph, 1), H, clamp(0.45 + 2.2 * Math.sin(Math.PI * u), 0, 1));
      q.lt = H.lt; q.ls = H.ls; q.ltk = H.ltk;
      return [q, gy - (0.85 + j.y) * ppm];
    }
    return super.poseFor(p, gy, ppm);
  }
}

function drawHurdle(ctx, x, gy, ppm, down) {
  const hh = HURDLE_H * ppm, d = 0.35 * ppm, lift = 0.22 * ppm;
  ctx.save();
  ctx.lineCap = 'round';
  if (down) {
    ctx.strokeStyle = '#888'; ctx.lineWidth = Math.max(2, ppm * 0.05);
    ctx.beginPath(); ctx.moveTo(x - 0.2 * ppm, gy - 2); ctx.lineTo(x + hh * 0.9, gy - 4); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(x + hh * 0.2, gy - 0.12 * ppm, hh * 0.7, 0.09 * ppm);
    ctx.restore();
    return;
  }
  ctx.strokeStyle = '#9e9e9e'; ctx.lineWidth = Math.max(2, ppm * 0.05);
  // far post, near post, feet
  ctx.beginPath();
  ctx.moveTo(x + d, gy - lift); ctx.lineTo(x + d, gy - lift - hh);
  ctx.moveTo(x, gy); ctx.lineTo(x, gy - hh);
  ctx.moveTo(x - 0.3 * ppm, gy); ctx.lineTo(x + 0.05 * ppm, gy);
  ctx.moveTo(x + d - 0.3 * ppm, gy - lift); ctx.lineTo(x + d + 0.05 * ppm, gy - lift);
  ctx.stroke();
  // top board with stripes
  const bw = Math.max(4, ppm * 0.14);
  ctx.lineWidth = bw; ctx.lineCap = 'butt';
  const n = 5;
  for (let i = 0; i < n; i++) {
    ctx.strokeStyle = i % 2 ? '#111' : '#fff';
    ctx.beginPath();
    ctx.moveTo(x + d * i / n, gy - hh - lift * i / n);
    ctx.lineTo(x + d * (i + 1) / n, gy - hh - lift * (i + 1) / n);
    ctx.stroke();
  }
  ctx.restore();
}

registerEvent({
  id: '110h', name: '110 OSTACOLI', cls: Hurdles110, lowerBetter: true,
  labels: ['CORRI', 'SALTA'],
  help: ['A: premi velocemente per correre', 'B: salta l\'ostacolo (poco prima di raggiungerlo)', 'Ogni ostacolo abbattuto ti rallenta!'],
  fmt: Fmt.time, pts: Pts.track(5.74352, 28.5, 1.92),
});
