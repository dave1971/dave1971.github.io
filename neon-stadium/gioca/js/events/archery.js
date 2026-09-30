'use strict';
// ===== Tiro con l'arco =====
// A = tendi l'arco e tienilo teso: il mirino oscilla, e più a lungo resti in tensione più il braccio
// trema. Rilascia A per scoccare. B = trattieni il respiro: l'oscillazione quasi si ferma, ma il fiato
// dura poco e si ricarica solo fra una freccia e l'altra. 6 frecce, punti sommati (10 al centro).

class Archery extends EventBase {
  constructor(n, meta) {
    super(n, meta);
    this.arrows = 6;
    this.R10 = 0.062;       // radius of the gold ten, as a fraction of the target width
    this.drawT = 0.75;      // seconds to come to full draw
    this.S = [];
    for (let p = 0; p < n; p++) this.S.push(this.fresh({ k: 0, total: 0, stuck: [] }, p));
  }
  fresh(o) {
    return { k: o.k, total: o.total, stuck: o.stuck, ph: 'ready', t: 0, draw: 0, held: 0, breath: 1,
      hold: false, steady: false, ax: 0, ay: 0, hx: 0, hy: 0, sc: null, ph1: rnd(0, TAU), ph2: rnd(0, TAU),
      ph3: rnd(0, TAU), ph4: rnd(0, TAU), fx: 0, fy: 0, ft: 0 };
  }
  press(p, b) {
    const s = this.S[p];
    if (this.res[p]) return;
    if (b === 0) { if (s.ph === 'ready') { s.ph = 'draw'; s.hold = true; Snd.click(); } }
    else if (s.ph === 'draw' && s.breath > 0) s.steady = true;
  }
  release(p, b) {
    const s = this.S[p];
    if (this.res[p]) return;
    if (b === 1) { s.steady = false; return; }
    if (s.ph === 'draw' && s.draw > 0.35) this.loose(p, s);
  }
  // Dove tira il braccio: due onde lente incrociate con due piu' rapide, piu' larghe man mano che
  // il braccio si stanca. Questa e' l'oscillazione "libera": il respiro non entra qui dentro.
  aim(p, s) {
    const k = 1 / Math.max(0.35, this.capP(p));
    const tired = 1 + 1.9 * clamp((s.held - 1.6) / 3, 0, 1);
    const a = 0.085 * k * tired, t = s.held;
    return [a * (Math.sin(t * 2.3 + s.ph1) + 0.55 * Math.sin(t * 5.1 + s.ph2)),
      a * (Math.sin(t * 1.9 + s.ph3) + 0.55 * Math.sin(t * 6.2 + s.ph4))];
  }
  loose(p, s) {
    // Even a perfect release is never exact: the looser the archer, the more the arrow strays.
    // Dove la freccia va a finire si decide qui, una volta sola: da quel punto vengono il punteggio,
    // il volo e il buco sul bersaglio. Prima il punteggio nasceva dal tiro sbagliato e il buco dal
    // punto di mira, quindi il pallino rosso non corrispondeva quasi mai al numero annunciato.
    const j = 0.145 / Math.max(0.35, this.capP(p));
    const hx = s.ax + (Math.random() + Math.random() - 1) * j;
    const hy = s.ay + (Math.random() + Math.random() - 1) * j;
    const d = Math.hypot(hx, hy);
    const score = clamp(11 - Math.ceil(d / this.R10), 0, 10);
    s.sc = { score, d };
    s.hx = hx; s.hy = hy;
    s.total += score;
    s.stuck = s.stuck.concat([{ x: hx, y: hy, score }]);
    s.ph = 'fly'; s.t = 0; s.ft = 0; s.hold = false; s.steady = false;
    Snd.twang();
  }
  update(dt) {
    for (let p = 0; p < this.n; p++) {
      const s = this.S[p];
      if (this.res[p]) continue;
      s.t += dt;
      if (s.ph === 'draw') {
        s.draw = Math.min(1, s.draw + dt / this.drawT);
        s.held += dt;
        if (s.steady) { s.breath -= dt * 0.55; if (s.breath <= 0) { s.breath = 0; s.steady = false; } }
        // Il mirino insegue l'oscillazione, non ci sta sopra. Col respiro trattenuto la insegue
        // quasi per niente, e quindi **resta dov'e'**: e' questo che vuol dire fermare la mano.
        // Prima il respiro rimpiccioliva l'onda, e il mirino saltava di colpo verso il centro:
        // sembrava che ne comparisse un altro, e mollando B saltava indietro.
        const a = this.aim(p, s);
        const f = 1 - Math.exp(-(s.steady ? 0.3 : 9) * dt);
        s.ax += (a[0] - s.ax) * f;
        s.ay += (a[1] - s.ay) * f;
        if (s.held > 7) this.loose(p, s);   // the arm gives way: the arrow goes wherever it is pointing
      } else if (s.ph === 'fly') {
        s.ft += dt * 3.4;
        if (s.ft >= 1) { s.ph = 'score'; s.t = 0; this.showScore(p, s); }
      } else if (s.ph === 'score' && s.t > 1.6) {
        s.k++;
        if (s.k >= this.arrows) this.finish(p, s.total);
        else this.S[p] = this.fresh(s);
      }
    }
    this.baseUpdate(dt);
  }
  showScore(p, s) {
    const v = s.sc.score;
    const col = v >= 9 ? '#ffd600' : v >= 7 ? '#7CFC00' : v > 0 ? '#fff' : '#ff8a80';
    this.say(p, v === 0 ? 'FUORI!' : v + '', col, 1.5, v === 10 ? 'in pieno centro' : '');
    if (v > 0) Snd.thock();                 // la freccia si pianta: se ha mancato il paglione, niente
    if (v >= 9) Snd.applause(v === 10 ? 1 : 0.6); else if (v === 0) Snd.fail();
  }
  liveScore(q) { return this.S[q].total; }
  hud(p) { const s = this.S[p]; return 'Freccia ' + Math.min(s.k + 1, this.arrows) + '/' + this.arrows + '  •  Totale ' + s.total; }

  // ---------- drawing ----------
  // Una freccia da (tx,ty), la punta, a (cx,cy), la cocca: l'asta chiara, la punta di ferro se si
  // vede, e le piume nel colore del giocatore in coda. Piantata nel bersaglio la punta non si vede (e'
  // dentro): resta un forellino scuro e l'asta sporge verso l'arciere, con le piume all'estremita' libera.
  // Prima l'asta usciva dalla parte opposta all'arciere, senza piume, e il punto rosso dell'impatto
  // sembrava l'impennaggio: pareva piantata al contrario.
  drawArrow(ctx, tx, ty, cx, cy, col, dentro) {
    const L = Math.hypot(cx - tx, cy - ty) || 1, ux = (cx - tx) / L, uy = (cy - ty) / L, nx = -uy, ny = ux;
    const piuma = Math.max(5, L * 0.28), larga = Math.max(2.5, L * 0.07);
    ctx.strokeStyle = '#eceff1'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(cx, cy); ctx.stroke();
    if (dentro) { ctx.fillStyle = '#263238'; ctx.beginPath(); ctx.arc(tx, ty, 2.2, 0, TAU); ctx.fill(); }
    else {
      ctx.fillStyle = '#90a4ae';
      ctx.beginPath(); ctx.moveTo(tx - ux * 3, ty - uy * 3); ctx.lineTo(tx + ux * 5 + nx * 2.5, ty + uy * 5 + ny * 2.5); ctx.lineTo(tx + ux * 5 - nx * 2.5, ty + uy * 5 - ny * 2.5); ctx.fill();
    }
    // le piume: due alette ai lati dell'asta, dalla cocca verso la punta
    ctx.fillStyle = col;
    for (const k of [1, -1]) {
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + nx * larga * k, cy + ny * larga * k);
      ctx.lineTo(cx - ux * piuma + nx * larga * 0.4 * k, cy - uy * piuma + ny * larga * 0.4 * k); ctx.lineTo(cx - ux * piuma, cy - uy * piuma); ctx.closePath(); ctx.fill();
    }
  }
  drawTarget(ctx, cx, cy, R, s, col) {
    const rings = [['#f5f5f5', 2], ['#212121', 4], ['#29b6f6', 6], ['#e53935', 8], ['#ffd600', 10]];
    for (const [col, top] of rings) {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(cx, cy, R * this.R10 * (11 - (top - 1)), 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
    for (let i = 1; i <= 10; i++) {
      ctx.beginPath(); ctx.arc(cx, cy, R * this.R10 * i, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.arc(cx, cy, R * this.R10 * 1, 0, Math.PI * 2); ctx.stroke();
    // arrows already in the face: sporgono verso l'arciere (a sinistra) e un po' in alto, come arrivano
    for (const a of s.stuck) {
      const x = cx + a.x * R, y = cy + a.y * R;
      this.drawArrow(ctx, x, y, x - R * 0.24, y - R * 0.09, col, true);
    }
  }
  drawSight(ctx, cx, cy, R, s, col) {
    const x = cx + s.ax * R, y = cy + s.ay * R, r = R * 0.075;
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - r * 1.7, y); ctx.lineTo(x - r * 0.4, y);
    ctx.moveTo(x + r * 0.4, y); ctx.lineTo(x + r * 1.7, y);
    ctx.moveTo(x, y - r * 1.7); ctx.lineTo(x, y - r * 0.4);
    ctx.moveTo(x, y + r * 0.4); ctx.lineTo(x, y + r * 1.7);
    ctx.stroke();
  }
  // Braccio a due segmenti risolto all'indietro: data la spalla e il punto dove la mano deve finire,
  // trova gomito e avambraccio. Serve perche' la mano della corda non puo' stare "circa li": deve
  // stare esattamente sulla cocca, altrimenti la corda si piega in un punto che non e' il suo mezzo.
  armTo(sx, sy, tx, ty) {
    const L1 = BODY.ua, L2 = BODY.fa;
    let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy);
    const hi = L1 + L2 - 0.004, lo = Math.abs(L1 - L2) + 0.004;
    if (d > hi || d < lo) { const k = (d > hi ? hi : lo) / Math.max(d, 1e-6); dx *= k; dy *= k; d = Math.hypot(dx, dy); }
    const base = Math.atan2(dx, dy);                       // 0 = verso il basso, come nelle pose
    const a = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    let best = null;
    for (const sign of [-1, 1]) {                          // dei due gomiti possibili si tiene quello alto
      const lu = base + sign * a;
      const ex = sx + Math.sin(lu) * L1, ey = sy + Math.cos(lu) * L1;
      if (!best || ey < best[2]) best = [lu, Math.atan2(tx - ex, ty - ey), ey];
    }
    return best;
  }

  // L'arciere. Tutto nasce da un punto solo: la cocca, cioe' il mezzo esatto della corda. Li' va la
  // mano che tira, e da li' parte la freccia, orizzontale, che passa sopra l'impugnatura. Prima la
  // mano andava dove la portava il braccio e la corda finiva piegata a un quarto della sua lunghezza.
  drawArcher(ctx, w, h, s, p) {
    const ppm = h / 4.4, bx = w * 0.17, gy = h * 0.93, hipY = gy - 0.93 * ppm;
    const pull = s.ph === 'draw' ? s.draw : 0;
    // metri. L'allungo e' quello che l'apertura delle braccia di questo atleta permette davvero:
    // tirando di piu' la mano finiva dietro l'orecchio invece che sotto il mento.
    const BRACE = 0.2, DRAW = 0.355, HALF = 0.76, ARROW = 0.58;
    const torso = -0.05;
    // braccio dell'arco: teso verso il bersaglio, appena sopra la spalla, all'altezza del mento
    const pose = { torso, neck: 0.18, ru: 1.66, rf: 1.72, lt: 0.2, ls: 0.02, rt: -0.2, rs: -0.02 };
    const sx = Math.sin(torso) * BODY.torso, sy = -Math.cos(torso) * BODY.torso;
    const gxM = sx + Math.sin(pose.ru) * BODY.ua + Math.sin(pose.rf) * BODY.fa;
    const gyM = sy + Math.cos(pose.ru) * BODY.ua + Math.cos(pose.rf) * BODY.fa;
    const nkM = [gxM - BRACE - DRAW * pull, gyM];                 // la cocca: sul mezzo esatto della corda
    const arm = this.armTo(sx, sy, nkM[0], nkM[1]);
    pose.lu = arm[0]; pose.lf = arm[1];

    shadow(ctx, bx, gy, ppm);
    drawAthlete(ctx, bx, hipY, ppm, pose, PCOL[p]);

    const M = (px, py) => [bx + px * ppm, hipY + py * ppm];
    const grip = M(gxM, gyM), nock = M(nkM[0], nkM[1]);
    const tipU = M(gxM - BRACE, gyM - HALF), tipD = M(gxM - BRACE, gyM + HALF);
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Un ricurvo vero: un fusto dritto in mezzo e due flettenti che da li' rientrano verso la corda,
    // con la punta che torna un po' in avanti. Un arco tutto curvo sembrava una C.
    const RIS = 0.24;                                       // mezzo fusto
    ctx.strokeStyle = '#6d4c41'; ctx.lineWidth = Math.max(2, ppm * 0.042);
    for (const k of [-1, 1]) {
      const root = M(gxM, gyM + k * RIS), tip = k < 0 ? tipU : tipD;
      const c1 = M(gxM - 0.02, gyM + k * (RIS + 0.2)), c2 = M(gxM - 0.25, gyM + k * 0.7);
      ctx.beginPath(); ctx.moveTo(root[0], root[1]);
      ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], tip[0], tip[1]); ctx.stroke();
    }
    // il fusto, piu' grosso, con la finestra dove appoggia la freccia
    ctx.strokeStyle = '#5d4037'; ctx.lineWidth = Math.max(3, ppm * 0.07);
    const g0 = M(gxM, gyM - RIS), g1 = M(gxM, gyM + RIS);
    ctx.beginPath(); ctx.moveTo(g0[0], g0[1]); ctx.lineTo(g1[0], g1[1]); ctx.stroke();
    ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = Math.max(2, ppm * 0.03);
    const r0 = M(gxM - 0.005, gyM - 0.19), r1 = M(gxM - 0.005, gyM - 0.02);
    ctx.beginPath(); ctx.moveTo(r0[0], r0[1]); ctx.lineTo(r1[0], r1[1]); ctx.stroke();
    // la corda: due mezzi uguali, perche' la cocca e' esattamente a meta' fra le estremita'
    ctx.strokeStyle = '#eceff1'; ctx.lineWidth = Math.max(1, ppm * 0.018);
    ctx.beginPath(); ctx.moveTo(tipU[0], tipU[1]); ctx.lineTo(nock[0], nock[1]); ctx.lineTo(tipD[0], tipD[1]); ctx.stroke();
    // la freccia: orizzontale sulla linea della cocca, passa sopra l'impugnatura
    if (s.ph !== 'fly' && s.ph !== 'score') {
      const tip = M(nkM[0] + ARROW, nkM[1]);
      ctx.strokeStyle = '#cfd8dc'; ctx.lineWidth = Math.max(1.5, ppm * 0.022);
      ctx.beginPath(); ctx.moveTo(nock[0], nock[1]); ctx.lineTo(tip[0], tip[1]); ctx.stroke();
      ctx.strokeStyle = '#ef5350'; ctx.lineWidth = Math.max(1, ppm * 0.016);
      const f0 = M(nkM[0] + 0.03, nkM[1]), f1 = M(nkM[0] + 0.1, nkM[1] - 0.035);
      ctx.beginPath(); ctx.moveTo(f0[0], f0[1]); ctx.lineTo(f1[0], f1[1]); ctx.stroke();
    }
    ctx.restore();
    return grip;
  }
  drawLane(ctx, p, w, h) {
    const s = this.S[p];
    // range: sky, grass, the butt holding the target face
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#5aa9e6'); g.addColorStop(0.62, '#cfe9ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    Bg.crowdBand(ctx, w, h * 0.06, h * 0.32, 0);
    ctx.fillStyle = '#6f9a5b'; ctx.fillRect(0, h * 0.32, w, h * 0.68);
    ctx.fillStyle = '#7cb342'; ctx.fillRect(0, h * 0.62, w, h * 0.38);
    const R = clamp(h * 0.33, 60, 170), cx = w * 0.62, cy = h * 0.46;
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(cx - 4, cy + R * 0.7, 8, h - (cy + R * 0.7));
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(cx, h * 0.97, R * 0.5, R * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    this.drawTarget(ctx, cx, cy, R, s, PCOL[p].ui);
    const grip = this.drawArcher(ctx, w, h, s, p);
    if (s.ph === 'draw') {
      const d = Math.hypot(s.ax, s.ay) / this.R10;
      const col = d <= 1 ? '#ffd600' : d <= 3 ? '#7CFC00' : d <= 6 ? '#fff' : '#ff8a80';
      this.drawSight(ctx, cx, cy, R, s, col);
      drawMeter(ctx, 16, h * 0.09, w * 0.2, Math.max(10, h * 0.045), s.draw, PCOL[p].ui,
        s.draw < 1 ? 'IN TENSIONE' : 'PRONTO');
      const bc = s.breath > 0.4 ? '#29b6f6' : s.breath > 0.15 ? '#ffb300' : '#e53935';
      drawMeter(ctx, 16, h * 0.09 + Math.max(16, h * 0.062), w * 0.2, Math.max(10, h * 0.045), s.breath, bc, 'FIATO');
    }
    if (s.ph === 'fly') {
      // the arrow crosses to the face
      const x = lerp(grip[0], cx + s.hx * R, s.ft), y = lerp(grip[1], cy + s.hy * R, s.ft) - Math.sin(s.ft * Math.PI) * h * 0.06;
      this.drawArrow(ctx, x, y, x - 30, y - 11, PCOL[p].ui, false);
    }
    txt(ctx, s.total + '', w - 16, h * 0.12, clamp(h * 0.11, 18, 36), '#fff', 'right');
    if (s.ph === 'ready' && !this.msg[p]) {
      txt(ctx, 'FRECCIA ' + (s.k + 1) + ' DI ' + this.arrows, w * 0.35, h * 0.2, clamp(h * 0.11, 20, 40), '#ffeb3b');
      txt(ctx, 'tieni premuto A per tendere l\'arco', w * 0.35, h * 0.2 + clamp(h * 0.1, 16, 32), clamp(h * 0.065, 12, 22), '#fff');
    }
    this.drawMsg(ctx, p, w, h);
  }
}

registerEvent({
  id: 'arco', name: 'TIRO CON L\'ARCO', cls: Archery, lowerBetter: false,
  labels: ['TENDI E TIRA', 'RESPIRO'],
  help: ['Tieni premuto A per tendere l\'arco, rilascia per scoccare.', 'B: trattieni il respiro e il mirino quasi si ferma,',
    'ma il fiato è poco. 6 frecce, 10 punti al centro.'],
  fmt: v => v + '/60', pts: v => v == null ? 0 : Math.round(v * 17.6),
});
