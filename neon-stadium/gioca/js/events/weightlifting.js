'use strict';
// ===== Sollevamento pesi (slancio) =====
// A = mash to build power and pull the bar to the shoulders. B = jerk overhead when the needle is in the green.
// Keep mashing A to hold the weight until the judges give three white lights.

class Weightlifting extends EventBase {
  constructor(n, meta) {
    super(n, meta);
    this.start = [110, 150, 200][clamp(Lv.i, 1, 3) - 1]; this.inc = 5;
    this.S = [];
    for (let p = 0; p < n; p++) this.S.push(this.fresh({ W: this.start, fails: 0, best: null }));
  }
  fresh(o) { return { W: o.W, fails: o.fails, best: o.best, ph: 'ready', P: 0, prog: 0, t: 0, needle: 0, nd: 1, ok: null, lights: null, drop: 0, why: '' }; }
  need(W, p) { return 15 + (W - 100) * this.capP(p); }
  /**
   * La fascia verde dello slancio, e quanto corre la lancetta.
   *
   * Prima la fascia si stringeva col peso E la lancetta accelerava: due difficoltà che si
   * moltiplicavano. A 250 kg restava una finestra utile di quattro centesimi di secondo — non
   * difficile, impossibile, e il tempo diventava il tetto della gara molto prima delle braccia.
   *
   * Adesso la fascia sta ferma e a crescere è solo la velocità della lancetta, con un passo più
   * gentile: la finestra va da mezzo secondo scarso coi pesi leggeri a un decimo e mezzo vicino al
   * limite. Così il tetto torna a essere quello che deve, cioè la forza: `need()` supera quello che
   * l'atleta sa mettere nel bilanciere intorno ai 272 kg al livello olimpico, appena sopra il
   * record del mondo vero.
   */
  zone() { return 0.16; }
  needleSpeed(W) { return 1.1 + (W - 140) * 0.008; }
  // the loads already lifted at this level can be passed, exactly like the bar events (in carriera
  // quelli dei campionati, nelle gare singole quelli delle gare singole di prima)
  skipLimit(p) {
    if (Superate.conta(p)) return Superate.get(this.meta.id, p);
    if (!Game.careerMode || p !== 0 || !Career.data) return null;
    const b = Career.bestMap()[this.meta.id];
    return b == null ? null : b;
  }
  canSkip(p, s) {
    const m = this.skipLimit(p);
    return m != null && s.ph === 'ready' && s.W <= m + 1e-6;
  }
  skip(p, s) {
    const best = Math.max(s.best == null ? 0 : s.best, s.W);
    Snd.click();
    this.S[p] = this.fresh({ W: s.W + this.inc, fails: 0, best });
  }
  press(p, b) {
    const s = this.S[p];
    if (this.res[p]) return;
    if (s.ph === 'ready' && b === 1) { if (this.canSkip(p, s)) this.skip(p, s); return; }
    if (b === 0) {
      if (s.ph === 'ready') { s.ph = 'pull'; s.t = 0; }
      // a still-growing athlete cannot put as much force into the bar
      if (s.ph === 'pull' || s.ph === 'rack' || s.ph === 'hold' || s.ph === 'jerk') s.P = Math.min(100 * this.pf[p], s.P + 13 * this.pf[p]);
    } else if (s.ph === 'rack') {
      if (Math.abs(s.needle - 0.5) < this.zone(s.W)) { s.ph = 'jerk'; s.t = 0; Snd.grunt(); }
      else this.fail(p, s, 'slancio fuori tempo');
    }
  }
  fail(p, s, why) {
    s.ph = 'show'; s.t = 0; s.ok = false; s.lights = [0, 0, 0]; s.fails++; s.drop = 0.001;
    this.say(p, 'NULLO', '#ff5555', 2, why + ' (errore ' + s.fails + '/3)');
    Snd.thud(); Snd.fail();
  }
  update(dt) {
    for (let p = 0; p < this.n; p++) {
      const s = this.S[p];
      if (this.res[p]) continue;
      s.t += dt;
      // the effort fades slowly, so what you can lift depends on how strong the athlete is
      // rather than on how fast you can drum the button
      s.P -= s.P * 0.6 * dt;
      const need = this.need(s.W, p);
      switch (s.ph) {
        case 'pull':
          s.prog = Math.max(0, s.prog + (s.P - need) / 25 * dt);
          if (s.prog >= 1) { s.prog = 1; s.ph = 'rack'; s.t = 0; s.needle = 0; s.nd = 1; Snd.clang(); }
          else if (s.t > 7) this.fail(p, s, 'troppo lento');
          break;
        case 'rack': {
          const sp = this.needleSpeed(s.W);
          s.needle += s.nd * sp * dt;
          if (s.needle > 1) { s.needle = 1; s.nd = -1; } else if (s.needle < 0) { s.needle = 0; s.nd = 1; }
          if (s.t > 4) this.fail(p, s, 'tempo scaduto');
          break;
        }
        case 'jerk': if (s.t > 0.3) { s.ph = 'hold'; s.t = 0; } break;
        case 'hold':
          if (s.t > 0.25 && s.P < need * 0.6) this.fail(p, s, 'cedimento');
          else if (s.t >= 1.6) {
            s.ph = 'show'; s.t = 0; s.ok = true; s.lights = [1, 1, 1]; s.best = s.W; s.fails = 0;
            Superate.metti(this.meta.id, p, s.W);
            this.say(p, 'ALZATA VALIDA!', '#7CFC00', 2, Fmt.kg(s.W));
            Snd.applause();
          }
          break;
        case 'show':
          if (s.drop > 0) s.drop += dt;
          if (s.t > 2.3) {
            if (s.fails >= 3) this.finish(p, s.best, s.best == null ? 'NESSUNA ALZATA' : undefined);
            else this.S[p] = this.fresh({ W: s.ok ? s.W + this.inc : s.W, fails: s.fails, best: s.best });
          }
          break;
      }
    }
    this.baseUpdate(dt);
  }
  liveScore(q) { return this.S[q].best; }
  hud(p) { const s = this.S[p]; return 'Peso ' + Fmt.kg(s.W) + '  •  Errori ' + s.fails + '/3'; }
  body(s) {
    const pr = s.prog;
    switch (s.ph) {
      case 'ready': return [Pose.liftDown(), 0.49];
      case 'pull':
        if (pr < 0.6) return [lerpPose(Pose.liftDown(), Pose.liftPull(), pr / 0.6), lerp(0.49, 0.86, pr / 0.6)];
        return [lerpPose(Pose.liftPull(), Pose.liftRack(), (pr - 0.6) / 0.4), lerp(0.86, 0.93, (pr - 0.6) / 0.4)];
      case 'rack': return [Pose.liftRack(), 0.93 - 0.02 * Math.sin(s.t * 6)];
      case 'jerk': return [lerpPose(Pose.liftRack(), Pose.liftOver(), clamp(s.t / 0.3, 0, 1)), lerp(0.93, 0.8, clamp(s.t / 0.3, 0, 1))];
      case 'hold': return [Pose.liftOver(), 0.8];
      default:
        if (s.ok) return [Pose.liftOver(), 0.8];
        return [Pose.stand(), 0.93];
    }
  }
  drawPlates(ctx, x, y, ppm, W) {
    const r = 0.225 * ppm;
    ctx.fillStyle = '#b71c1c'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e53935'; ctx.lineWidth = Math.max(1, r * 0.12); ctx.beginPath(); ctx.arc(x, y, r * 0.85, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = W >= 180 ? '#1565c0' : '#fdd835'; ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.arc(x, y, r * 0.18, 0, Math.PI * 2); ctx.fill();
  }
  drawLane(ctx, p, w, h) {
    const s = this.S[p], ppm = h / 3.3, cx = w * 0.5, gy = h * 0.88;
    // arena
    ctx.fillStyle = '#1a1f3a'; ctx.fillRect(0, 0, w, h);
    Bg.crowdBand(ctx, w, h * 0.05, h * 0.5, 0);
    ctx.fillStyle = 'rgba(10,12,30,0.55)'; ctx.fillRect(0, 0, w, h * 0.5);
    const sp = ctx.createRadialGradient(cx, gy - h * 0.3, 10, cx, gy - h * 0.3, h * 0.7);
    sp.addColorStop(0, 'rgba(255,250,220,0.35)'); sp.addColorStop(1, 'rgba(255,250,220,0)');
    ctx.fillStyle = sp; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3e2723'; ctx.fillRect(0, gy, w, h - gy);
    ctx.fillStyle = '#a1887f'; ctx.fillRect(cx - 2 * ppm, gy - 0.08 * ppm, 4 * ppm, 0.08 * ppm + 4);
    ctx.fillStyle = '#8d6e63'; ctx.fillRect(cx - 2 * ppm, gy, 4 * ppm, h * 0.05);
    // weight board
    ctx.fillStyle = '#000'; rrect(ctx, w - 170, h * 0.08, 150, Math.max(34, h * 0.16), 6); ctx.fill();
    txt(ctx, Fmt.kg(s.W), w - 95, h * 0.08 + Math.max(34, h * 0.16) / 2, clamp(h * 0.1, 18, 34), '#ffea00', 'center', { outline: false });
    // judges' lights
    for (let i = 0; i < 3; i++) {
      const lx = w - 150 + i * 50, ly = h * 0.08 + Math.max(34, h * 0.16) + 22;
      ctx.fillStyle = s.lights ? (s.lights[i] ? '#fff' : '#ff1744') : '#333';
      ctx.beginPath(); ctx.arc(lx + 5, ly, 10, 0, Math.PI * 2); ctx.fill();
    }
    // athlete + barbell
    const [pose, hy] = this.body(s);
    shadow(ctx, cx, gy, ppm, 1.2);
    const J = drawAthlete(ctx, cx, gy - hy * ppm, ppm, pose, PCOL[p]);
    let bx = (J.handN[0] + J.handF[0]) / 2, by = (J.handN[1] + J.handF[1]) / 2;
    if (s.ph === 'show' && s.drop > 0) {
      const k = clamp(s.drop / 0.45, 0, 1);
      by = lerp(by, gy - 0.225 * ppm, k * k); bx += k * 0.3 * ppm;
    }
    this.drawPlates(ctx, bx, by, ppm, s.W);
    // meters
    const mx = 18, my = h * 0.12, mh = h * 0.62, mw = 18;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(mx - 3, my - 3, mw + 6, mh + 6);
    const need = this.need(s.W, p) / 100;
    ctx.fillStyle = s.P / 100 >= need ? '#76ff03' : '#ff9100';
    ctx.fillRect(mx, my + mh * (1 - s.P / 100), mw, mh * s.P / 100);
    ctx.fillStyle = '#fff'; ctx.fillRect(mx - 5, my + mh * (1 - need) - 1, mw + 10, 3);
    txt(ctx, 'FORZA', mx + mw / 2 + 2, my + mh + 14, 11, '#fff', 'center', { italic: false });
    if (s.ph === 'rack') {
      const zw = this.zone(s.W);
      drawMeter(ctx, cx - w * 0.18, h * 0.1, w * 0.36, Math.max(12, h * 0.06), 0, '#fff', '', [0.5 - zw, 0.5 + zw]);
      ctx.fillStyle = '#ffeb3b';
      ctx.fillRect(cx - w * 0.18 + w * 0.36 * s.needle - 3, h * 0.1 - 6, 6, Math.max(12, h * 0.06) + 12);
      txt(ctx, 'B: SLANCIO!', cx, h * 0.1 + Math.max(12, h * 0.06) + 16, clamp(h * 0.07, 13, 22), '#ffeb3b');
    }
    if (s.ph === 'hold') txt(ctx, 'TIENI! (A)', cx, h * 0.14, clamp(h * 0.09, 16, 30), '#ffeb3b');
    if (s.ph === 'ready' && !this.msg[p]) {
      const y = h * 0.18, st = clamp(h * 0.09, 15, 30);
      txt(ctx, 'BILANCIERE ' + Fmt.kg(s.W), cx, y, clamp(h * 0.1, 18, 38), '#ffeb3b');
      txt(ctx, 'premi A velocemente per sollevare', cx, y + st, clamp(h * 0.065, 12, 22), '#fff');
      if (this.canSkip(p, s)) txt(ctx, 'B: passa a ' + Fmt.kg(s.W + this.inc), cx, y + st * 1.8, clamp(h * 0.06, 12, 20), '#7CFC00');
    }
    this.drawMsg(ctx, p, w, h);
  }
}

registerEvent({
  id: 'pesi', name: 'SOLLEVAMENTO PESI', cls: Weightlifting, lowerBetter: false,
  labels: ['FORZA', 'SLANCIO'],
  help: ['A: premi velocemente per portare il bilanciere al petto', 'B: slancio sopra la testa quando l\'indicatore è nel verde,', 'poi continua con A per tenerlo. 3 errori consecutivi = fine.',
    'A gara ferma B passa i pesi che hai già sollevato.'],
  fmt: Fmt.kg, pts: Pts.field(1.5, 50, 1.25),
});
