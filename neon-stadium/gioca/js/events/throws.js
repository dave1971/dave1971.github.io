'use strict';
// ===== Lanci dal cerchio: peso, disco, martello =====
// A = gira su te stesso, sempre più veloce. La barra dell'equilibrio cala tanto più in fretta quanto
// più forte giri: se finisce esci dal cerchio ed è nullo. B = premilo quando il corpo è rivolto verso
// il settore (lancetta verde sul quadrante): da quel momento il corpo si ferma e l'alzo sale finché
// tieni premuto. Rilascia per lanciare. Quanto va lontano l'attrezzo lo decidono insieme i giri, che
// danno la velocità, e l'alzo, che decide la traiettoria: per un corpo che non plana il meglio sta
// intorno ai 43°, un po' sotto i 45 perché l'attrezzo parte già da due metri d'altezza.
// 3 lanci, conta il migliore.

// difference from the release direction, wrapped to (-PI, PI]
function angErr(a) {
  let d = (a + Math.PI) % TAU;
  if (d < 0) d += TAU;
  return d - Math.PI;
}

// Past the circle (or the runway) the implement lands on grass, not on the track: paint the sector
// over the stadium's lane lines so the field reads for what it is.
function drawSector(ctx, sx, L, w, h, from) {
  const x0 = Math.max(0, sx(from));
  if (x0 > w) return;
  ctx.fillStyle = '#4e9a3f'; ctx.fillRect(x0, L.grassBot, w - x0, h - L.grassBot);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let y = L.grassBot; y < h; y += Math.max(8, h * 0.05)) ctx.fillRect(x0, y, w - x0, Math.max(3, h * 0.02));
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x0 - 2, L.grassBot, 3, h - L.grassBot);
}

class SpinThrow extends EventBase {
  constructor(n, meta) {
    super(n, meta);
    this.cfg();
    this.attempts = 3;
    this.S = [];
    for (let p = 0; p < n; p++) this.S.push(this.fresh({ att: 0, best: null }, p));
  }
  // decay/resp shape the spin-up (il passo di ogni colpo e' da un dito solo: B e' il lancio), drain how fast balance goes at full speed,
  // vk the speed given to the implement, view the metres framed by the camera
  cfg() {
    this.decay = 1.6; this.resp = 1.1; this.drain = 0.42; this.sector = 0.5; this.h0 = 1.85;
    // l'alzo: parte basso e sale finché tieni premuto B
    this.elMin = 12; this.elMax = 70; this.elRate = 78;
    this.angBand = [40, 46]; this.angWide = [32, 54];   // spicchi verde e giallo del quadrante
  }
  fresh(o) {
    return { att: o.att, best: o.best, ph: 'ready', e: 0, w: 0, ang: 0, el: 0, tilt: 0, bal: 1, t: 0,
      x: 0, y: this.h0, vx: 0, vy: 0, spin: 0, dist: null, err: 0, why: '', landX: null, zoom: 1 };
  }
  press(p, b) {
    const s = this.S[p];
    if (this.res[p]) return;
    if (s.ph === 'ready') { if (b === 0) { s.ph = 'spin'; s.e = 1; Snd.step(); } return; }
    if (s.ph !== 'spin') return;
    if (b === 0) s.e = Math.min(s.e + 1, 12);
    else this.lift(p, s);
  }
  release(p, b) {
    if (b === 1 && this.S[p].ph === 'lift') this.launch(p, this.S[p]);
  }
  // B premuto: la direzione è decisa in questo istante, il corpo si ferma e l'alzo comincia a salire.
  // Chi è girato fuori dal settore lo scopre subito, come prima.
  lift(p, s) {
    const err = angErr(s.ang);
    s.err = err;
    if (Math.abs(err) > this.sector) {
      s.why = 'fuori dal settore'; s.dist = null; s.out = true;
      s.ph = 'fly'; s.t = 0; s.vx = 0; s.vy = 0;
      this.foul(p, s);
      return;
    }
    s.ph = 'lift'; s.el = this.elMin; s.t = 0;
    Snd.step();
  }
  // Parte con la velocità che i giri hanno accumulato e con l'alzo scelto. La direzione era già
  // stata decisa premendo B: dritto nel settore è tutta distanza, di traverso costa velocità.
  launch(p, s) {
    const a = s.el * Math.PI / 180;
    s.ph = 'fly'; s.t = 0; s.spin = 0;
    const v = this.vk * Math.pow(s.w, 0.85) * Math.pow(Math.cos(s.err), 0.7);
    s.vx = v * Math.cos(a); s.vy = v * Math.sin(a);
    s.tilt = -a * 0.85;       // assetto al rilascio: un po' meno inclinato della traiettoria
                              // (NON chiamarlo att: quello e' il numero del lancio)
    s.x = 0.6; s.y = this.h0;
    Snd.whoosh();
  }
  foul(p, s) {
    s.ph = 'done'; s.t = 0; s.dist = null;
    this.say(p, 'NULLO!', '#ff5555', 1.9, s.why);
    Snd.fail();
  }
  update(dt) {
    for (let p = 0; p < this.n; p++) {
      const s = this.S[p];
      if (this.res[p]) continue;
      s.t += dt;
      if (s.ph === 'spin') {
        const wmax = this.capP(p);
        s.e -= s.e * this.decay * dt;
        s.w += (Math.min(wmax, s.e * passoUnDito(wmax, this.decay)) - s.w) * Math.min(1, this.resp * dt);
        s.ang += s.w * dt;
        s.bal -= dt * this.drain * (0.12 + Math.pow(clamp(s.w / wmax, 0, 1), 2.2));
        if (s.bal <= 0) { s.bal = 0; s.why = 'uscito dal cerchio'; this.foul(p, s); }
      } else if (s.ph === 'lift') {
        // L'equilibrio **si ferma qui**: la barra misura quanto puoi restare a girare dentro al
        // cerchio, e premendo B hai smesso di girare. Il lancio ormai e' tuo: quello che rischi
        // adesso non e' il nullo ma l'angolo, perche' tenendo premuto troppo parte a 70 gradi.
        s.el += dt * this.elRate;
        if (s.el >= this.elMax) { s.el = this.elMax; this.launch(p, s); }
      } else if (s.ph === 'fly') {
        s.zoom = Math.max(0, s.zoom - dt * 2.4);
        s.spin += dt * 9;
        if (!s.out) {
          s.x += s.vx * dt; s.vy -= 9.8 * dt; s.y += s.vy * dt;
          if (s.y <= 0) this.land(p, s);
        } else if (s.t > 1.1) this.foul(p, s);
      } else if (s.ph === 'done') {
        if (s.t > 2.2) this.nextAttempt(p, s);
      }
    }
    this.baseUpdate(dt);
  }
  land(p, s) {
    s.y = 0; s.landX = s.x; s.dist = Math.max(0, s.x);
    s.ph = 'done'; s.t = 0;
    const nb = s.best == null || s.dist > s.best;
    if (nb) s.best = s.dist;
    this.say(p, Fmt.m(s.dist), '#fff', 1.9, nb && s.att > 0 ? 'Miglior lancio!' : '');
    Snd.thud(); Snd.applause();
  }
  nextAttempt(p, s) {
    s.att++;
    if (s.att >= this.attempts) this.finish(p, s.best);
    else this.S[p] = this.fresh(s);
  }
  hud(p) {
    const s = this.S[p];
    return 'Lancio ' + Math.min(s.att + 1, this.attempts) + '/' + this.attempts + (s.best != null ? '  •  ' + Fmt.m(s.best) : '');
  }
  liveScore(q) { return this.S[q].best; }

  // ---------- drawing ----------
  // Dial of the body's facing: green wedge = the sector, so release with the needle inside it.
  drawDial(ctx, w, h, s) {
    const R = clamp(h * 0.15, 30, 66), cx = w - R - 20, cy = h * 0.42;
    const err = angErr(s.ang), inSec = Math.abs(err) <= this.sector;
    const col = Math.abs(err) <= 0.16 ? '#00e63c' : inSec ? '#ffd600' : '#ff5252';
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    // the sector opens to the right of the dial, which is where the athlete throws
    ctx.fillStyle = 'rgba(0,230,60,0.30)';
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, -this.sector, this.sector);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,230,60,0.55)';
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, -0.16, 0.16);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(s.ang) * R * 0.3, cy - Math.sin(s.ang) * R * 0.3);
    ctx.lineTo(cx + Math.cos(s.ang) * R * 0.92, cy + Math.sin(s.ang) * R * 0.92);
    ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    txt(ctx, 'RILASCIO', cx, cy - R - 12, Math.max(10, R * 0.24), '#fff');
  }
  drawCircle(ctx, sx, gy, ppm) {
    // throwing circle seen from the side: a pale band with a raised stop board at the front
    ctx.fillStyle = '#d7d2c4';
    ctx.fillRect(sx(-1.1), gy - 2, 2.2 * ppm, Math.max(3, 0.09 * ppm));
    ctx.fillStyle = '#e53935';
    ctx.fillRect(sx(1.05), gy - 0.14 * ppm, Math.max(3, 0.12 * ppm), 0.14 * ppm);
  }
  drawCage() { }
  drawImplement(ctx, x, y, r, s) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.arc(x, y, r + 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9e9e9e';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, Math.PI * 2); ctx.fill();
  }
  drawLane(ctx, p, w, h) {
    const s = this.S[p], ax = w * 0.3;
    // the camera stays on the circle, then travels with the implement and pulls back to hold the arc
    const flying = (s.ph === 'fly' || s.ph === 'done') && !s.out;
    const ppm = flying ? lerp(h / this.flyView, h / 4.6, s.zoom) : h / 4.6;
    const camX = flying ? Math.max(0, (s.landX == null ? s.x : s.landX) - this.flyView * 0.18) : 0;
    const L = Bg.stadium(ctx, w, h, camX, ppm, ax);
    const sx = X => ax + (X - camX) * ppm;
    Bg.distMarks(ctx, w, h, camX, ppm, ax, L, this.step, this.view, this.step, d => d + ' m');
    drawSector(ctx, sx, L, w, h, 1.6);
    this.drawCircle(ctx, sx, L.gy, ppm);
    this.drawCage(ctx, sx, L.gy, ppm);
    // the landing mark, and your best of the day
    if (s.best != null) {
      const x = sx(s.best);
      ctx.fillStyle = '#eee'; ctx.fillRect(x - 1, L.gy - 0.6 * ppm, 2, 0.6 * ppm);
      ctx.fillStyle = PCOL[p].ui; ctx.fillRect(x + 1, L.gy - 0.6 * ppm, 0.3 * ppm, 0.2 * ppm);
    }
    if (s.landX != null) {
      ctx.fillStyle = 'rgba(120,80,20,0.6)';
      ctx.beginPath(); ctx.ellipse(sx(s.landX), L.gy + 2, 0.32 * ppm, 0.08 * ppm, 0, 0, Math.PI * 2); ctx.fill();
    }
    // athlete: turning on the spot is a horizontal squeeze, like a twist in the air
    const hx = sx(0), hy = L.gy - 0.93 * ppm;
    const c = Math.cos(s.ang), f = c >= 0 ? 1 : -1;
    const pose = s.ph === 'ready' ? this.readyPose(s) : s.ph === 'lift' ? this.liftPose(s) : s.ph === 'spin' ? this.spinPose(s) : this.flyPose(s);
    shadow(ctx, hx, L.gy, ppm);
    // il giro si vede come uno schiacciamento in orizzontale: sq e' quanto resta della larghezza
    const sq = s.ph === 'spin' || s.ph === 'lift' || s.ph === 'fly' ? Math.max(0.18, Math.abs(c)) : 1;
    // L'attrezzo attaccato a un filo (il martello) gira attorno all'atleta: mezzo giro gli passa
    // dietro, e allora va disegnato prima di lui.
    const filo = !!this.drawFilo && s.ph !== 'done' && !(s.ph === 'fly' && !s.out);
    const dietro = filo && Math.sin(s.ang) < 0;
    if (dietro) this.drawFilo(ctx, s, hx, hy, ppm, c, f, sq, pose);
    ctx.save();
    if (sq < 1) { ctx.translate(hx, hy); ctx.scale(sq, 1); ctx.translate(-hx, -hy); }
    const J = drawAthlete(ctx, hx, hy, ppm, pose, PCOL[p], f);
    ctx.restore();
    // implement, in hand or in the air
    if (s.ph === 'fly' && !s.out) {
      this.drawImplement(ctx, sx(s.x), L.gy - s.y * ppm, Math.max(6, this.rad * ppm), s);
      txt(ctx, Fmt.m(Math.max(0, s.x)), w / 2, h * 0.16, clamp(h * 0.1, 18, 34), '#ffeb3b');
    }
    // dove l'attrezzo si tiene proprio nella mano (il peso), lo si disegna dove la mano e' davvero
    else if (filo) { if (!dietro) this.drawFilo(ctx, s, hx, hy, ppm, c, f, sq, pose); }
    // (appoggiato un po' piu' avanti e piu' su delle dita, contro il collo: `scarto`, in metri)
    else if (this.inMano && s.ph !== 'done') {
      const sc = this.scarto || [0, 0];
      this.drawImplement(ctx, hx + (J.handN[0] - hx + f * sc[0] * ppm) * sq, J.handN[1] - sc[1] * ppm, Math.max(5, this.rad * ppm), s);
    }
    else if (s.ph === 'lift') {
      const k = clamp((s.el - this.elMin) / Math.max(1, this.elMax - this.elMin), 0, 1);
      this.drawImplement(ctx, hx + f * (0.42 + 0.1 * k) * ppm * Math.abs(c), hy - (0.35 + 0.55 * k) * ppm, Math.max(5, this.rad * ppm), s);
    }
    else if (s.ph !== 'done') this.drawImplement(ctx, hx + f * 0.42 * ppm * Math.abs(c), hy - 0.35 * ppm, Math.max(5, this.rad * ppm), s);
    // HUD: how fast you are turning and how much balance is left
    const wmax = this.capP(p);
    drawMeter(ctx, 16, h * 0.09, w * 0.22, Math.max(10, h * 0.045), s.w / wmax, PCOL[p].ui, (s.w / TAU).toFixed(1) + ' giri/s');
    // durante l'alzo la barra e' spenta: si vede a colpo d'occhio che li' non si rischia piu' il nullo
    const bc = s.ph === 'lift' ? '#78909c' : s.bal > 0.5 ? '#43a047' : s.bal > 0.22 ? '#ffb300' : '#e53935';
    drawMeter(ctx, 16, h * 0.09 + Math.max(16, h * 0.062), w * 0.22, Math.max(10, h * 0.045), s.bal, bc,
      s.ph === 'lift' ? 'EQUILIBRIO OK' : 'EQUILIBRIO');
    if (s.ph === 'spin' || s.ph === 'ready') this.drawDial(ctx, w, h, s);
    else if (s.ph === 'lift') this.drawAngle(ctx, w, h, s.el, true);
    if (s.ph === 'ready' && !this.msg[p]) {
      txt(ctx, 'LANCIO ' + (s.att + 1) + ' DI ' + this.attempts, w / 2, h * 0.28, clamp(h * 0.12, 20, 42), '#ffeb3b');
      txt(ctx, 'premi A per girare, B per alzare e lanciare', w / 2, h * 0.28 + clamp(h * 0.1, 16, 32), clamp(h * 0.07, 13, 24), '#fff');
    }
    this.drawMsg(ctx, p, w, h);
  }
  readyPose() { return Pose.stand(); }
  // dopo il rilascio: di solito la stessa posa del giro (il peso invece distende il braccio)
  flyPose(s) { return this.spinPose(s); }
  spinPose(s) {
    const k = clamp(s.w / 12, 0, 1);
    return { torso: 0.12 + 0.1 * k, neck: -0.05, lu: 1.1 + 0.5 * k, lf: 1.5, ru: 0.9 + 0.6 * k, rf: 1.35,
      lt: 0.25 * Math.sin(s.ang * 2), ls: -0.15, rt: -0.25 * Math.sin(s.ang * 2), rs: -0.15 };
  }
  // Mentre sale l'alzo il corpo si apre indietro e il braccio si alza con l'attrezzo: si vede
  // sull'atleta la stessa cosa che dice la lancetta.
  liftPose(s) {
    const k = clamp((s.el - this.elMin) / Math.max(1, this.elMax - this.elMin), 0, 1);
    const p = this.spinPose(s);
    p.torso = 0.1 - 0.32 * k; p.neck = -0.1 - 0.1 * k;
    p.ru = 1.2 + 1.0 * k; p.rf = 1.5 + 1.1 * k;
    p.lu = 1.0 + 0.6 * k; p.lf = 1.4 + 0.5 * k;
    p.lt = 0.3; p.ls = -0.1; p.rt = -0.35; p.rs = -0.2;
    return p;
  }
}

// ---------- peso ----------
class ShotPut extends SpinThrow {
  cfg() {
    super.cfg();
    this.drain = 0.46; this.vk = 1.63; this.rad = 0.06;
    this.view = 26; this.step = 5; this.flyView = 10;
  }
  /**
   * Il peso non si lancia, si spinge: sta appoggiato fra il collo e la mandibola, sotto l'orecchio,
   * col braccio piegato e il gomito dietro, all'altezza della spalla; al rilascio il braccio si
   * distende in avanti lungo l'alzo. L'altro braccio resta teso in avanti e fa da bilanciere al giro.
   *
   * Prima il braccio penzolava lungo il fianco e il peso era disegnato per aria davanti al petto.
   * Adesso il peso si disegna nella mano (inMano), e la mano si porta dove deve stare: le due
   * inclinazioni del braccio si ricavano dal punto in cui si vuole la mano (`braccio`).
   */
  get inMano() { return true; }
  get scarto() { return [0.075, 0.035]; }
  // Le inclinazioni di braccio e avambraccio perche' la mano arrivi a (dx avanti, dy in basso) dalla
  // spalla, col gomito dalla parte di dietro. Le misure sono quelle del corpo (BODY), in metri.
  braccio(dx, dy) {
    const a = BODY.ua, f = BODY.fa, d = clamp(Math.hypot(dx, dy), Math.abs(a - f) + 0.01, a + f - 0.005);
    const verso = Math.atan2(dx, dy);
    const a1 = verso + Math.acos(clamp((a * a + d * d - f * f) / (2 * a * d), -1, 1));
    const k = d / Math.max(1e-6, Math.hypot(dx, dy));
    const ex = Math.sin(a1) * a, ey = Math.cos(a1) * a;
    return [a1, Math.atan2(dx * k - ex, dy * k - ey)];
  }
  // Il peso al collo: la mano sta alla base del collo, appena dietro la spalla e quattro dita piu'
  // su, seguendo il busto. Con la mano li' il gomito viene dietro, all'altezza della spalla (con la
  // mano piu' avanti finiva sopra la testa), e il peso, che si disegna poco oltre le dita (`scarto`),
  // cade sotto l'orecchio.
  MANO() { return [-0.022, 0.048]; }             // avanti, su (metri, lungo il busto)
  alCollo(p) {
    const t = p.torso, [av, su] = this.MANO();
    const [ru, rf] = this.braccio(av * Math.cos(t) + su * Math.sin(t), av * Math.sin(t) - su * Math.cos(t));
    p.ru = ru; p.rf = rf;
    return p;
  }
  readyPose() {
    const p = Pose.stand();
    p.lu = 1.35; p.lf = 1.5;                   // l'altro braccio gia' teso in avanti
    return this.alCollo(p);
  }
  spinPose(s) {
    const p = super.spinPose(s);
    p.torso = 0.2;
    p.lu = 1.45; p.lf = 1.55;                  // teso in avanti: aiuta a girare
    return this.alCollo(p);
  }
  liftPose(s) {
    const k = clamp((s.el - this.elMin) / Math.max(1, this.elMax - this.elMin), 0, 1);
    const p = super.liftPose(s);
    p.lu = 1.5 + 0.5 * k; p.lf = 1.6 + 0.5 * k;   // l'altro braccio indica dove andra' il peso
    return this.alCollo(p);                    // caricato sulle gambe, ma il peso resta al collo
  }
  // il rilascio: in un decimo e mezzo di secondo il braccio si distende lungo l'alzo scelto
  flyPose(s) {
    if (!(s.vx > 0)) return this.spinPose(s);  // fuori settore o fuori dal cerchio: non ha lanciato
    const al = clamp(s.el || this.elMin, this.elMin, this.elMax) * Math.PI / 180;
    const k = clamp((s.el - this.elMin) / Math.max(1, this.elMax - this.elMin), 0, 1);
    const e = s.ph === 'done' ? 1 : clamp(s.t / 0.15, 0, 1), m = e * e * (3 - 2 * e);
    const p = super.liftPose(s);
    p.torso = lerp(0.1 - 0.32 * k, 0.28, m);   // dalla schiena inarcata si butta in avanti dietro al peso
    p.lu = lerp(1.5 + 0.5 * k, 0.9, m); p.lf = lerp(1.6 + 0.5 * k, 1.2, m);
    const t = p.torso, [av, su] = this.MANO(), L = BODY.ua + BODY.fa - 0.02;
    const x0 = av * Math.cos(t) + su * Math.sin(t), y0 = av * Math.sin(t) - su * Math.cos(t);
    const [ru, rf] = this.braccio(lerp(x0, Math.cos(al) * L, m), lerp(y0, -Math.sin(al) * L, m));
    p.ru = ru; p.rf = rf;
    return p;
  }
  drawImplement(ctx, x, y, r) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.arc(x, y, r + 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#607d8b';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.34, 0, Math.PI * 2); ctx.fill();
  }
}

// ---------- disco ----------
class Discus extends SpinThrow {
  cfg() {
    super.cfg();
    this.drain = 0.42; this.vk = 2.81; this.rad = 0.11;
    this.view = 80; this.step = 10; this.flyView = 22;
  }
  /**
   * Il disco si tiene e si lancia con una mano sola: il braccio che lo porta e' teso, l'altro sta
   * giu' a 45 gradi e fa da bilanciere al giro. Prima le braccia erano tutte e due tese in avanti e
   * il disco era disegnato per aria, sotto le mani. Adesso sta nella mano (inMano), appena oltre le dita.
   */
  get inMano() { return true; }
  get scarto() { return [0.07, 0]; }
  spinPose(s) {
    const p = super.spinPose(s), k = clamp(s.w / 12, 0, 1);
    p.ru = p.rf = 1.35 + 0.15 * k;             // teso, e sale verso l'orizzontale man mano che gira piu' forte
    p.lu = p.lf = Math.PI / 4;                 // l'altro a 45 gradi verso il basso
    return p;
  }
  liftPose(s) {
    const k = clamp((s.el - this.elMin) / Math.max(1, this.elMax - this.elMin), 0, 1);
    const p = super.liftPose(s);
    p.ru = p.rf = 1.4 + 1.0 * k;               // il braccio col disco sale teso insieme all'alzo
    p.lu = p.lf = Math.PI / 4;
    return p;
  }
  drawCage(ctx, sx, gy, ppm) {
    ctx.strokeStyle = 'rgba(180,190,200,0.5)'; ctx.lineWidth = Math.max(1, ppm * 0.02);
    for (const d of [-1.9, 1.9]) {
      ctx.beginPath(); ctx.moveTo(sx(d), gy); ctx.lineTo(sx(d), gy - 3.6 * ppm); ctx.stroke();
    }
  }
  // Un disco non capitombola: gira attorno al proprio asse, e di profilo lo vedi sempre di taglio,
  // con l'assetto che si è preso al rilascio (per questo scendendo prende vento e plana un po').
  // Della rotazione resta solo un tremolio: lo spessore apparente pulsa e il bordo oscilla di un soffio.
  drawImplement(ctx, x, y, r, s) {
    const volo = s.ph === 'fly' || s.ph === 'done';
    const ph = s.spin * 4.2;                       // ~6 giri al secondo, come un disco vero
    const tilt = volo ? (s.tilt || 0) + Math.sin(ph) * 0.045 : 0;
    const thin = volo ? 0.21 + 0.09 * Math.abs(Math.cos(ph)) : 0.28;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(tilt);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.ellipse(0, 0, r + 2, Math.max(3, r * thin + 2), 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8d6e63';
    ctx.beginPath(); ctx.ellipse(0, 0, r, Math.max(1.5, r * thin), 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#bcaaa4';
    ctx.beginPath(); ctx.ellipse(0, -r * thin * 0.3, r * 0.55, Math.max(1, r * thin * 0.42), 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// ---------- martello ----------
class Hammer extends SpinThrow {
  cfg() {
    super.cfg();
    this.drain = 0.40; this.vk = 2.85; this.rad = 0.09;
    this.view = 95; this.step = 10; this.flyView = 28;
  }
  drawCage(ctx, sx, gy, ppm) {
    ctx.strokeStyle = 'rgba(180,190,200,0.5)'; ctx.lineWidth = Math.max(1, ppm * 0.02);
    for (const d of [-2.1, 2.1]) {
      ctx.beginPath(); ctx.moveTo(sx(d), gy); ctx.lineTo(sx(d), gy - 4.2 * ppm); ctx.stroke();
    }
  }
  /**
   * Il martello e' una palla in fondo a un cavo d'acciaio lungo un metro e venti, che l'atleta tiene
   * dall'altro capo con le braccia tese.
   *
   * Da fermo la palla e' appoggiata per terra davanti a lui. Girando, la palla si alza e si
   * allontana: nei primi due giri il cavo si distende, dal secondo in poi e' parallelo al terreno e
   * la palla gira larga attorno all'atleta, e cosi' resta fino al rilascio. Quando si carica l'alzo
   * (B) il cavo sale dell'angolo scelto. Prima la palla era disegnata ferma davanti al petto, senza
   * cavo, per tutta la gara.
   */
  get CAVO() { return 1.2; }
  // quanto il martello si e' alzato: 0 per terra, 1 col cavo parallelo al terreno (dopo due giri)
  alzata(s) { const u = clamp(s.ang / (2 * TAU), 0, 1); return u * u * (3 - 2 * u); }
  spinPose(s) {
    const m = this.alzata(s), a = lerp(0.85, 1.5, m);      // le braccia tese salgono col martello
    return { torso: lerp(0.2, -0.16, m), neck: -0.05, lu: a, lf: a, ru: a, rf: a,   // e il busto fa da contrappeso
      lt: 0.25 * Math.sin(s.ang * 2), ls: -0.15, rt: -0.25 * Math.sin(s.ang * 2), rs: -0.15 };
  }
  readyPose(s) { const p = this.spinPose(s); p.lt = 0.12; p.rt = -0.1; p.ls = p.rs = -0.05; return p; }
  liftPose(s) {
    const k = clamp((s.el - this.elMin) / Math.max(1, this.elMax - this.elMin), 0, 1);
    const p = this.spinPose(s), a = p.ru + s.el * Math.PI / 180 * 0.55;
    p.ru = p.rf = p.lu = p.lf = a;
    p.torso -= 0.16 * k;
    p.lt = 0.3; p.ls = -0.1; p.rt = -0.35; p.rs = -0.2;
    return p;
  }
  // dove sta la palla finche' e' attaccata alle mani, e il cavo che la tiene
  drawFilo(ctx, s, hx, hy, ppm, c, f, sq, pose) {
    const Lc = this.CAVO, B = BODY.ua + BODY.fa, r = Math.max(5, this.rad * ppm);
    // le mani (insieme): dal bacino, in metri, con la y in giu'
    const mx = Math.sin(pose.torso) * BODY.torso + Math.sin(pose.ru) * B;
    const my = -Math.cos(pose.torso) * BODY.torso + Math.cos(pose.ru) * B;
    const X = hx + f * sq * mx * ppm, Y = hy + my * ppm, terra = hy + 0.93 * ppm;
    const manoH = 0.93 - my;                               // quanto sono alte le mani da terra
    const su = s.ph === 'lift' ? Lc * Math.sin(s.el * Math.PI / 180) : 0;
    const pallaH = Math.max(this.rad, lerp(this.rad, manoH, this.alzata(s)) + su);
    const dh = clamp(manoH - pallaH, -Lc, Lc), largo = Math.sqrt(Lc * Lc - dh * dh);
    const px = X + c * largo * ppm, py = terra - pallaH * ppm;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = Math.max(2.4, ppm * 0.03);
    ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(px, py); ctx.stroke();
    ctx.strokeStyle = '#cfd8dc'; ctx.lineWidth = Math.max(1.2, ppm * 0.014);
    ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(px, py); ctx.stroke();
    ctx.restore();
    this.testa(ctx, px, py, r);
  }
  drawImplement(ctx, x, y, r, s) {
    // in volo: head plus the wire trailing behind it
    ctx.strokeStyle = 'rgba(200,200,200,0.8)'; ctx.lineWidth = Math.max(1, r * 0.3);
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(s.spin) * r * 3.4, y - Math.sin(s.spin) * r * 3.4);
    ctx.lineTo(x, y);
    ctx.stroke();
    this.testa(ctx, x, y, r);
  }
  testa(ctx, x, y, r) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.arc(x, y, r + 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#546e7a';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.32, 0, Math.PI * 2); ctx.fill();
  }
}

// il quadrante dell'alzo è quello del salto in lungo, con gli spicchi spostati dove conviene lanciare
SpinThrow.prototype.drawAngle = LongJump.prototype.drawAngle;

const throwHelp = attrezzo => ['A: gira su te stesso, sempre più veloce. Occhio all\'equilibrio:',
  'se la barra si svuota esci dal cerchio ed è nullo.',
  'B: premi con la lancetta nel settore verde e tienilo premuto per alzare',
  'l\'angolo (il meglio è ~43°), poi rilascia per lanciare ' + attrezzo + '.'];

registerEvent({
  id: 'peso', name: 'LANCIO DEL PESO', cls: ShotPut, lowerBetter: false,
  labels: ['GIRA', 'ALZA E LANCIA'], help: throwHelp('il peso'),
  fmt: Fmt.m, pts: (f => m => f(m == null ? null : m * 100))(Pts.field(0.4517, 150, 1.05)),
});
registerEvent({
  id: 'disco', name: 'LANCIO DEL DISCO', cls: Discus, lowerBetter: false,
  labels: ['GIRA', 'ALZA E LANCIA'], help: throwHelp('il disco'),
  fmt: Fmt.m, pts: (f => m => f(m == null ? null : m * 100))(Pts.field(0.0885, 400, 1.1)),
});
registerEvent({
  id: 'martello', name: 'LANCIO DEL MARTELLO', cls: Hammer, lowerBetter: false,
  labels: ['GIRA', 'ALZA E LANCIA'], help: throwHelp('il martello'),
  fmt: Fmt.m, pts: (f => m => f(m == null ? null : m * 100))(Pts.field(0.0753, 450, 1.1)),
});
