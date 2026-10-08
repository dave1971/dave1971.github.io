'use strict';
// ===== Lancio del giavellotto =====
// A = rincorsa. Tieni premuto B per alzare l'angolo di lancio e rilascia per scagliarlo. L'attrezzo
// plana, quindi l'angolo giusto è più basso di quello di un salto. 3 lanci, conta il migliore.
//
// La linea in fondo alla pedana non va passata MAI, nemmeno dopo il lancio: come nel giavellotto
// vero, mentre carica il braccio l'atleta fa ancora qualche passo e dopo il rilascio gli serve
// spazio per fermarsi. Quindi B si preme due o tre metri prima della linea (di piu' chi corre di
// piu'), e la misura si prende dalla linea: lo spazio lasciato in piu' sono metri regalati.

class Javelin extends EventBase {
  constructor(n, meta) {
    super(n, meta);
    this.runup = 30; this.attempts = 3; this.view = 105; this.step = 10; this.flyView = 26;
    this.bestAng = 36; this.band = 16; // ideal release angle and how wide the band that still glides is
    this.angBand = [31, 42]; this.angWide = [22, 52]; // green and yellow wedges of the dial
    // Dove la planata e' piena. Sta due gradi sotto l'angolo ideale perche' alzando il tiro la
    // parabola da sola porta piu' lontano: sommate, le due cose mettono il lancio migliore a 36 gradi.
    this.glideAng = 34;
    this.zona = [3, 1];                // metri prima del punto limite: dove va bene caricare, e dove va benissimo
    this.passo = 0.35;                 // quanta rincorsa resta nelle gambe mentre si carica il braccio
    this.frena = 2.5;                  // la frenata dopo il rilascio (m/s^2)
    this.vk = 2.70;                    // how much of the run-up speed ends up in the javelin
    this.S = [];
    for (let p = 0; p < n; p++) this.S.push(this.fresh({ att: 0, best: null }, p));
  }
  fresh(o, p) {
    return { att: o.att, best: o.best, ph: 'ready', r: new Runner({ x: -this.runup, vmax: this.capP(p), gain: passoUnDito(this.capP(p)) }),   // col solo A: B e' il lancio
      x: -this.runup, ang: 0, pt: 0, t: 0, jx: 0, jy: 0, vx: 0, vy: 0, rot: 0, dist: null, why: '',
      foul: false, landX: null, landRot: -1, zoom: 1, slide: false, bv: 0, bph: 0 };
  }
  /**
   * Quanti metri servono da quando si preme B a quando l'atleta e' fermo: i passi fatti mentre il
   * braccio sale fino all'angolo `ang`, piu' la frenata dopo il rilascio. E' la distanza dalla linea
   * a cui B va premuto, al piu' tardi, correndo a `v`.
   */
  spazio(v, ang) {
    const u = v * this.passo;
    return u * (ang / 120) + u * u / (2 * this.frena);
  }
  // il punto limite per questo atleta lanciato al massimo: da li' in poi premere B e' nullo sicuro
  limite(p) { return this.spazio(this.capP(p), this.bestAng); }
  press(p, b) {
    const s = this.S[p];
    if (this.res[p]) return;
    if (s.ph === 'ready') { if (b === 0) { s.ph = 'run'; s.r.tap(); } return; }
    if (s.ph === 'run') { if (b === 0) s.r.tap(); else this.wind(p, s); }
  }
  release(p, b) { if (b === 1 && this.S[p].ph === 'wind') this.launch(p, this.S[p]); }
  // B pressed while running: the arm goes back and the angle starts to climb
  wind(p, s) {
    s.foul = s.r.x > 0.02;
    s.x = s.r.x; s.v0 = s.r.v; s.ang = 0; s.pt = 0; s.ph = 'wind';
    Snd.step();
  }
  /**
   * Quanto plana il giavellotto a quest'angolo: fino al 30% di velocita' in piu'.
   *
   * Prima la planata scendeva a punta dall'angolo ideale: due gradi di errore, cioe' 17 millesimi di
   * secondo sul rilascio di B, costavano 5 metri su 95, e la gara si decideva tutta li'. Un avversario
   * della CPU quei millesimi li ha, un pollice no. Adesso la curva ha la cima tonda: in tutta la
   * fascia verde della lancetta si perde poco (meno del 2% fra 34 e 38 gradi, il 5% ai bordi), e fuori
   * dal verde si paga come prima. Il lancio perfetto non e' cambiato.
   */
  glide(ang) {
    const o = Math.abs(ang - this.glideAng) / this.band;
    return 1 + 0.30 * clamp(1 - o * o, 0, 1);
  }
  launch(p, s) {
    const a = Math.max(6, s.ang) * Math.PI / 180;
    // a javelin glides: releasing near the ideal angle carries it much further than a bare projectile
    const v = Math.max(3, s.v0) * this.vk * this.glide(s.ang);
    s.vx = v * Math.cos(a); s.vy = v * Math.sin(a);
    s.jx = s.x; s.jy = 2.0; s.ph = 'fly'; s.t = 0; s.rot = a;
    s.bv = s.v0 * this.passo;          // lanciato: adesso c'e' da fermarsi
    Snd.whoosh();
    if (s.foul) { s.why = 'piede oltre la pedana'; }
  }
  // dopo il rilascio l'atleta frena; se passa la linea, il lancio e' nullo anche se e' gia' partito
  frenata(s, dt) {
    if (s.bv <= 0) return;
    s.x += s.bv * dt; s.bph += dt * (2.5 + s.bv * 2.4);
    s.bv = Math.max(0, s.bv - this.frena * dt);
    if (s.x > 0.02 && !s.foul) { s.foul = true; s.why = 'non ti sei fermato prima della linea'; }
  }
  update(dt) {
    for (let p = 0; p < this.n; p++) {
      const s = this.S[p];
      if (this.res[p]) continue;
      s.t += dt;
      switch (s.ph) {
        case 'run':
          s.r.update(dt); s.x = s.r.x;
          if (s.r.x > 0.15) {
            s.ph = 'done'; s.t = 0; s.foul = true; s.slide = true; s.dist = null;
            s.why = 'non hai lanciato in tempo';
            this.say(p, 'NULLO!', '#ff5555', 1.9, s.why); Snd.fail();
          }
          break;
        case 'wind':
          s.pt += dt; s.ang = Math.min(70, s.pt * 120); s.x += s.v0 * this.passo * dt;
          if (s.x > 0.02) s.foul = true;
          if (s.ang >= 70) this.launch(p, s);
          break;
        case 'fly': {
          this.frenata(s, dt);
          s.zoom = Math.max(0, s.zoom - dt * 2.2);
          s.jx += s.vx * dt; s.vy -= 9.8 * dt; s.jy += s.vy * dt;
          s.rot = Math.atan2(s.vy, s.vx);
          if (s.jy <= 0) this.land(p, s);
          break;
        }
        case 'done':
          if (s.slide) { s.r.e = 0; s.r.update(dt); s.x = s.r.x; }
          else this.frenata(s, dt);
          if (s.t > 2.2) this.nextAttempt(p, s);
          break;
      }
    }
    this.baseUpdate(dt);
  }
  land(p, s) {
    s.jy = 0; s.landX = s.jx; s.ph = 'done'; s.t = 0;
    // it stays stuck at the angle it arrived at, never flatter than looks believable
    s.landRot = clamp(s.rot, -1.35, -0.45);
    // un lancio corto atterra prima che l'atleta si sia fermato: si guarda dove si fermera'
    if (!s.foul && s.x + s.bv * s.bv / (2 * this.frena) > 0.02) { s.foul = true; s.why = 'non ti sei fermato prima della linea'; }
    if (s.foul) {
      s.dist = null;
      this.say(p, 'NULLO!', '#ff5555', 1.9, s.why);
      Snd.fail();
      return;
    }
    s.dist = Math.max(0, s.jx);
    const nb = s.best == null || s.dist > s.best;
    if (nb) s.best = s.dist;
    this.say(p, Fmt.m(s.dist), '#fff', 1.9, nb && s.att > 0 ? 'Miglior lancio!' : '');
    Snd.thud(); Snd.applause();
  }
  nextAttempt(p, s) {
    s.att++;
    if (s.att >= this.attempts) this.finish(p, s.best);
    else this.S[p] = this.fresh(s, p);
  }
  hud(p) {
    const s = this.S[p];
    return 'Lancio ' + Math.min(s.att + 1, this.attempts) + '/' + this.attempts + (s.best != null ? '  •  ' + Fmt.m(s.best) : '');
  }
  liveScore(q) { return this.S[q].best; }
  // Seen from far away the javelin is only a few pixels thick, so it gets a dark outline to read
  // against the crowd as well as against the sky.
  drawJavelin(ctx, x, y, len, rot) {
    const lw = Math.max(1.5, len * 0.0167);
    ctx.save();
    ctx.translate(x, y); ctx.rotate(-rot);
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = lw + 1.3;
    ctx.beginPath(); ctx.moveTo(-len * 0.5, 0); ctx.lineTo(len * 0.5, 0); ctx.stroke();
    ctx.strokeStyle = '#eceff1'; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(-len * 0.5, 0); ctx.lineTo(len * 0.5, 0); ctx.stroke();
    ctx.strokeStyle = '#37474f'; ctx.lineWidth = lw * 1.5;
    ctx.beginPath(); ctx.moveTo(len * 0.28, 0); ctx.lineTo(len * 0.5, 0); ctx.stroke();
    ctx.restore();
  }
  /**
   * I segni sulla pedana. Dalla linea all'indietro: il tratto che serve per fermarsi (rosso: chi
   * preme B li' finisce oltre la linea), poi il metro buono per caricare il lancio (verde), poi due
   * metri dove si puo' ma si regala misura (giallo). Quanto e' lungo il tratto rosso dipende da
   * quanto corre l'atleta: e' quello di una rincorsa al massimo.
   * In piu' un segno segue l'atleta passo passo, sul punto che conta per il nullo (il bacino), e
   * dice col colore com'e' premere B adesso.
   */
  drawLancio(ctx, sx, w, h, s, p) {
    const y0 = h * 0.72, hh = h * 0.26, Z = this.zona, N = this.limite(p);
    const band = (a, b, col) => { ctx.fillStyle = col; ctx.fillRect(sx(a), y0, Math.max(2, sx(b) - sx(a)), hh); };
    band(-N - Z[0], -N - Z[1], 'rgba(255,214,0,0.16)');
    band(-N - Z[1], -N, 'rgba(0,230,60,0.34)');
    band(-N, 0, 'rgba(229,57,53,0.22)');
    const sz = Math.max(11, h * 0.042), ty = y0 + hh - 12;
    const lx = sx(-N - Z[0] / 2), fx = sx(-N / 2);
    if (lx > 40 && lx < w - 40) txt(ctx, 'LANCIO', lx, ty, sz, '#fff');
    if (fx > 40 && fx < w - 40) txtFit(ctx, 'FRENATA', fx, ty, sz, '#ffcdd2', 'center', Math.max(20, sx(0) - sx(-N) - 8));
  }
  // Il segno che segue l'atleta: una barra sottile e nient'altro (la freccia in cima e lo spessore
  // di prima erano troppo). Sta dietro di lui, alta abbastanza da spuntare sopra la testa, oltre che
  // fra le gambe e sotto i piedi.
  drawSegno(ctx, sx, h, s, p) {
    if (s.ph !== 'run' && s.ph !== 'ready') return;
    const Z = this.zona, d = -s.x - this.limite(p);       // quanto manca al punto limite
    const col = d < 0 ? '#ff5252' : d <= Z[1] ? '#00e63c' : d <= Z[0] ? '#ffd600' : '#ff9800';
    segnoAtleta(ctx, sx(s.x), h, h / 4.8, col);
  }
  drawLane(ctx, p, w, h) {
    const s = this.S[p], ax = w * 0.3;
    // the camera runs with the athlete, then travels with the javelin and pulls back to hold the arc
    const flying = s.ph === 'fly' || (s.ph === 'done' && s.landX != null && !s.foul);
    const ppm = flying ? lerp(h / this.flyView, h / 4.8, s.zoom) : h / 4.8;
    const camX = flying ? Math.max(0, (s.ph === 'fly' ? s.jx : s.landX) - this.flyView * 0.18) : s.x;
    const L = Bg.stadium(ctx, w, h, camX, ppm, ax);
    const sx = X => ax + (X - camX) * ppm;
    Bg.distMarks(ctx, w, h, camX, ppm, ax, L, this.step, this.view, this.step, d => d + ' m');
    // runway, foul arc, marks
    drawSector(ctx, sx, L, w, h, 0);
    ctx.fillStyle = '#fafafa'; ctx.fillRect(sx(-0.3), L.gy - 2, 0.3 * ppm, 5);
    ctx.fillStyle = '#e53935'; ctx.fillRect(sx(0), L.gy - 0.5 * ppm, Math.max(2, 0.05 * ppm), 0.5 * ppm);
    if (!flying) {
      this.drawLancio(ctx, sx, w, h, s, p);
      ctx.fillStyle = '#e53935'; ctx.fillRect(sx(0) - 2, h * 0.72, 4, h * 0.26);    // la linea da non passare
    }
    if (s.best != null) {
      const x = sx(s.best);
      ctx.fillStyle = '#eee'; ctx.fillRect(x - 1, L.gy - 0.6 * ppm, 2, 0.6 * ppm);
      ctx.fillStyle = PCOL[p].ui; ctx.fillRect(x + 1, L.gy - 0.6 * ppm, 0.3 * ppm, 0.2 * ppm);
    }
    if (s.landX != null && s.ph === 'done' && !s.foul) {
      // the point is the anchor: put it in the ground and let the shaft lean back from there
      const len = Math.max(26, 2.6 * ppm), a = -s.landRot;
      this.drawJavelin(ctx, sx(s.landX) - len / 2 * Math.cos(a), L.gy + 0.04 * ppm - len / 2 * Math.sin(a), len, s.landRot);
    }
    // athlete
    let pose, hipY = L.gy - 0.9 * ppm;
    if (s.ph === 'ready') { pose = Pose.stand(); hipY = L.gy - 0.93 * ppm; }
    else if (s.ph === 'run' || s.slide) { pose = Pose.run(s.r.ph, s.r.k()); hipY = L.gy - (0.87 + 0.05 * Math.abs(Math.sin(s.r.ph))) * ppm; }
    else if (s.ph === 'fly' || s.ph === 'done') {
      // rilasciato: gli ultimi passi di frenata, sempre piu' corti, e poi fermo a guardare il lancio
      const k = clamp(s.bv / 2.2, 0, 1);
      pose = lerpPose(Pose.stand(), Pose.run(s.bph, 0.55), k);
      hipY = L.gy - lerp(0.93, 0.88, k) * ppm;
    }
    else {
      const k = clamp(s.ang / 70, 0, 1);
      pose = Pose.run(1.2, 0.8);
      pose.ru = -0.9 + 1.9 * k; pose.rf = pose.ru + 0.25; pose.lu = 1.5; pose.lf = 1.7;
      pose.torso = 0.25 - 0.3 * k;
    }
    if (!flying) this.drawSegno(ctx, sx, h, s, p);      // dietro l'atleta: davanti dava fastidio
    shadow(ctx, sx(s.x), L.gy, ppm);
    const J = drawAthlete(ctx, sx(s.x), hipY, ppm, pose, PCOL[p]);
    if (s.ph === 'fly' && s.jy > 0) this.drawJavelin(ctx, sx(s.jx), L.gy - s.jy * ppm, Math.max(26, 2.6 * ppm), s.rot);
    else if (s.ph === 'run' || s.ph === 'wind' || s.ph === 'ready') {
      const rot = s.ph === 'wind' ? s.ang * Math.PI / 180 : 0.1;
      this.drawJavelin(ctx, J.handN[0], J.handN[1], 2.6 * ppm, rot);
    }
    drawMeter(ctx, 16, h * 0.09, w * 0.2, Math.max(10, h * 0.045), s.r.v / this.capP(p), PCOL[p].ui, (s.r.v * 3.6).toFixed(0) + ' km/h');
    if (s.ph === 'wind') this.drawAngle(ctx, w, h, s.ang, true);
    if (s.ph === 'fly') txt(ctx, Fmt.m(Math.max(0, s.jx)), w / 2, h * 0.16, clamp(h * 0.1, 18, 34), '#ffeb3b');
    if (s.ph === 'ready' && !this.msg[p]) {
      txt(ctx, 'LANCIO ' + (s.att + 1) + ' DI ' + this.attempts, w / 2, h * 0.28, clamp(h * 0.12, 20, 42), '#ffeb3b');
      txt(ctx, 'premi A per partire', w / 2, h * 0.28 + clamp(h * 0.1, 16, 32), clamp(h * 0.07, 13, 24), '#fff');
    }
    this.drawMsg(ctx, p, w, h);
  }
}
// the release-angle dial is the long jump's; angBand/angWide move the good wedges to where a javelin flies
Javelin.prototype.drawAngle = LongJump.prototype.drawAngle;

registerEvent({
  id: 'giavellotto', name: 'LANCIO DEL GIAVELLOTTO', cls: Javelin, lowerBetter: false,
  labels: ['CORRI', 'LANCIA'],
  help: ['A: premi velocemente per prendere la rincorsa.', 'B: tienilo premuto 2-3 metri prima della linea (segno verde)',
    'per alzare l\'angolo (ideale ~36°) e rilascia: devi fermarti prima della linea.'],
  fmt: Fmt.m, pts: (f => m => f(m == null ? null : m * 100))(Pts.field(0.0712, 700, 1.08)),
});
