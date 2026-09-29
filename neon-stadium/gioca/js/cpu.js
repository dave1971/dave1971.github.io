'use strict';
// ===== CPU rivals =====
// Each CPU athlete drives its own player index through the same press/release API used by the buttons.
// Skill s (0..1) sets the tap rate and how precise the timing is (err scales every random offset).

// s (0..1) is the athlete's place in the field of its own tier: 0 = the weakest entrant of that
// championship, 1 = the favourite, who gets close to the ceiling the tier allows.
// In free play the tiers differ by how well the rivals play. In a career meeting they all compete like
// trained athletes and what separates them is how developed they are (CPU_F), the same yardstick the
// player is measured by — so the qualifying mark of the tier is worth about a third place.
const CAREER_CPU = { hz: [10.0, 12.5], err: [0.62, 0.12], hit: [0.35, 0.80] };
function cpuParams(s) {
  const L = Game.careerMode ? CAREER_CPU : Lv.cur();
  s = clamp(s, 0, 1);
  return { hz: lerp(L.hz[0], L.hz[1], s), err: lerp(L.err[0], L.err[1], s), hit: lerp(L.hit[0], L.hit[1], s) };
}

// fictional rivals (name, country code, kit)
const CPU_ROSTER = [
  { name: 'J. OKAFOR', short: 'NGR', shirt: '#2e7d32', shorts: '#fafafa', skin: '#6d4c2f', hair: '#111111', ui: '#66d36e' },
  { name: 'L. ANDERSEN', short: 'SWE', shirt: '#fafafa', shorts: '#c62828', skin: '#f5d0b0', hair: '#e0c068', ui: '#e6e6e6' },
  { name: 'M. TAKEDA', short: 'JPN', shirt: '#7b1fa2', shorts: '#212121', skin: '#e8c39e', hair: '#111111', ui: '#c07be0' },
  { name: 'R. SILVA', short: 'BRA', shirt: '#fdd835', shorts: '#1565c0', skin: '#c68642', hair: '#2b1a0e', ui: '#ffe45c' },
  { name: 'P. NOVAK', short: 'POL', shirt: '#ef6c00', shorts: '#fafafa', skin: '#f1c27d', hair: '#5d3a1a', ui: '#ffa04d' },
  { name: 'D. WALKER', short: 'USA', shirt: '#00897b', shorts: '#fafafa', skin: '#8d5524', hair: '#111111', ui: '#4dd0c0' },
  { name: 'H. KAYA', short: 'TUR', shirt: '#6d4c41', shorts: '#fdd835', skin: '#f0c8a0', hair: '#3b2412', ui: '#c29a88' },
];

const pick = a => a[(Math.random() * a.length) | 0];
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

class Cpu {
  constructor(id, skill, p) {
    this.id = id; this.p = p; this.L = cpuParams(clamp(skill, 0, 1));
    this.acc = Math.random(); this.held = [false, false]; this.mem = {}; this.react = null;
  }
  tick(ev, dt) {
    if (ev.res[this.p]) { this.up(ev, 0); this.up(ev, 1); return; }
    const f = CPU_AI[this.id];
    if (f) f.call(this, ev, dt);
  }
  down(ev, b) { if (!this.held[b]) { this.held[b] = true; ev.press(this.p, b); } }
  up(ev, b) { if (this.held[b]) { this.held[b] = false; ev.release(this.p, b); } }
  tap(ev, b) { ev.press(this.p, b); ev.release(this.p, b); }
  // tap at the athlete's rate with a little human-like jitter
  mash(ev, dt, b, mult) {
    this.acc += dt * this.L.hz * (mult || 1) * rnd(0.85, 1.15);
    if (this.acc >= 1) { this.acc -= 1; this.tap(ev, b); }
  }
  // roughly normal random offset (sd ~0.7 * err * scale)
  err(scale) { return (Math.random() + Math.random() + Math.random() - 1.5) * 1.4 * this.L.err * scale; }
  // per-attempt memory: regenerated whenever the event hands us a new state object
  fresh(key, make) {
    if (this.mem.key !== key) { this.mem = make(); this.mem.key = key; }
    return this.mem;
  }
  // reaction time after the starting gun (races)
  reaction(ev) {
    if (!ev.st.running()) { this.react = null; return false; }
    if (this.react == null) this.react = rnd(0.13, 0.25) + 0.08 * this.L.err;
    return ev.st.raceT >= this.react;
  }
}

// Fuori carriera tutti gli atleti hanno lo stesso tetto (quello del livello) e corrono tutti alla
// velocita' massima: con errori di tempo cosi' piccoli arrivavano quasi tutti allo stesso centimetro
// (nell'asta al Mondiale sette su sette a 6,20). Ognuno ha allora la sua forma per la gara, secondo
// quanto e' bravo fra gli atleti del suo livello: il favorito sta a un soffio dal tetto, il piu' debole
// ne perde un decimo. La perdita viene da errori veri, uno stacco un po' anticipato e la spinta in volo
// fuori tempo, non da un numero appiccicato. In carriera no: la' i tetti sono gia' diversi (CPU_F).
function formaBar(c, ev) {
  if (c.forma !== undefined) return c.forma;
  if (Game.careerMode) return (c.forma = null);
  const L = Lv.cur(), r = clamp((c.L.hit - L.hit[0]) / (L.hit[1] - L.hit[0]), 0, 1);
  const top = ev.baseHeight(ev.vmax, 1, c.p), span = top - ev.baseHeight(ev.vmax, 0, c.p), H = top + ev.maxBonus;
  const perso = Math.max(0, ((1 - r) * 0.10 + 0.01) * H + (Math.random() + Math.random() + Math.random() - 1.5) * 0.04 * H);
  const bon = Math.min(ev.maxBonus * 0.9, perso * 0.6), resto = perso - bon;
  return (c.forma = {
    push: (0.06 + 0.24 * bon / ev.maxBonus) * (Math.random() < 0.5 ? -1 : 1),
    take: -clamp(resto / span, 0, 0.9) * ev.tol,
  });
}

function cpuBar(ev, dt) {
  const s = ev.S[this.p];
  const f = formaBar(this, ev) || { take: 0, push: 0 };
  const m = this.fresh(s, () => ({ wait: rnd(0.6, 1.4), take: ev.ideal + f.take + this.err(ev.tol * 0.55), push: ev.center + f.push + this.err(0.14), pushed: false }));
  if (s.ph === 'ready') { if ((m.wait -= dt) <= 0) this.tap(ev, 0); return; }
  if (s.ph === 'run') { this.mash(ev, dt, 0); if (s.x > m.take) this.tap(ev, 1); return; }
  if (s.ph === 'flight' && !m.pushed && s.ft >= m.push) { this.tap(ev, 1); m.pushed = true; }
}

// the three circle throws: wind up, then let go on the first pass through the sector once balance runs low
function cpuThrow(ev, dt) {
  const s = ev.S[this.p];
  const m = this.fresh(s, () => ({ wait: rnd(0.5, 1.2), bal: clamp(0.34 + this.err(0.6), 0.08, 0.85),
    off: this.err(0.55), el: 43 + this.err(8) }));
  if (s.ph === 'ready') { this.up(ev, 1); if ((m.wait -= dt) <= 0) this.tap(ev, 0); return; }
  if (s.ph === 'spin') {
    this.mash(ev, dt, 0);
    // B premuto e tenuto: da qui in poi conta solo l'alzo
    if (s.bal <= m.bal && Math.abs(angErr(s.ang + m.off)) < 0.17) this.down(ev, 1);
    return;
  }
  if (s.ph === 'lift') { if (s.el >= m.el) this.up(ev, 1); return; }
  this.up(ev, 1);        // in volo o nullo: il tasto va mollato, o al lancio dopo non si preme piu'
}

const CPU_AI = {
  '100m'(ev, dt) {
    if (ev.fin[this.p] != null || !this.reaction(ev)) return;
    this.mash(ev, dt, 0);
  },
  '110h'(ev, dt) {
    const p = this.p;
    if (ev.fin[p] != null || !this.reaction(ev)) return;
    this.mash(ev, dt, 0);
    const j = ev.j[p], r = ev.r[p];
    if (j.air || j.next >= 10) return;
    const m = this.fresh('h' + j.next, () => ({ at: 1.6 + this.err(0.9) }));
    if (ev.hx[j.next] - r.x < m.at) this.tap(ev, 1);
  },
  lungo(ev, dt) {
    const s = ev.S[this.p];
    const m = this.fresh(s, () => ({ wait: rnd(0.5, 1.3), ang: 43 + this.err(9), margin: 0.3 + this.err(0.5) }));
    if (s.ph === 'ready') { if ((m.wait -= dt) <= 0) this.tap(ev, 0); return; }
    if (s.ph === 'run') { this.mash(ev, dt, 0); if (s.x > -m.margin) this.down(ev, 1); return; }
    // take-off: keep B held until the target angle, then let go
    if (s.ph === 'push' && s.ang < m.ang) return;
    this.up(ev, 1);
  },
  triplo(ev, dt) {
    const s = ev.S[this.p];
    const m = this.fresh(s, () => ({ wait: rnd(0.5, 1.3), take: -0.35 + this.err(0.4), off: [this.err(0.09), this.err(0.09)], done: [false, false] }));
    if (s.ph === 'ready') { if ((m.wait -= dt) <= 0) this.tap(ev, 0); return; }
    if (s.ph === 'run') { this.mash(ev, dt, 0); if (s.x > m.take) this.tap(ev, 1); return; }
    if (s.seg > 1 || m.done[s.seg]) return;
    const seg = s.seg, o = m.off[seg]; // >0 press before touchdown, <0 after
    // (mark the segment before tapping: the tap itself moves s.seg on to the next one)
    if (s.ph === 'air' && o >= 0 && s.vy < 0) {
      const tl = (s.vy + Math.sqrt(s.vy * s.vy + 20 * s.y)) / 10;
      if (tl <= o) { m.done[seg] = true; this.tap(ev, 1); }
    } else if (s.ph === 'contact' && (o >= 0 || s.ct >= -o)) { m.done[seg] = true; this.tap(ev, 1); }
  },
  alto(ev, dt) { cpuBar.call(this, ev, dt); },
  asta(ev, dt) { cpuBar.call(this, ev, dt); },
  piattello(ev) {
    const s = ev.S[this.p], w = s.dim[0];
    for (const c of s.clays) {
      if (!c.alive) continue;
      const u = ev.clayPos(c)[0];
      c.cpu = c.cpu || [null, null];
      for (let b = 0; b < 2; b++) {
        const d = (u - ev.sightU[b]) * w * (c.side === 'L' ? 1 : -1); // <0 while approaching the sight
        if (d < -80 || d > 60) continue;
        const k = c.cpu[b] || (c.cpu[b] = {
          off: Math.random() < this.L.hit ? rnd(-7, 7) : (Math.random() < 0.5 ? -1 : 1) * (ev.Rp[this.p] + rnd(6, 16)), fired: false });
        if (!k.fired && d >= k.off && s.shells > 0 && s.reload[b] <= 0) { k.fired = true; this.tap(ev, ev.btnFor(this.p, b)); }
      }
    }
  },
  pesi(ev, dt) {
    const s = ev.S[this.p];
    const m = this.fresh(s, () => ({ wait: rnd(0.6, 1.3), zone: clamp(0.55 + this.err(0.8), 0.15, 2) }));
    // Fuori carriera tutti premevano fino alla forza piena e alzavano tutti lo stesso carico, al chilo:
    // come nel barile, ognuno ha la sua forza massima, secondo quanto e' bravo fra gli atleti del suo
    // livello (il favorito al pieno, il piu' debole un quinto sotto). In carriera la forza la fa gia' CPU_F.
    if (this.forza === undefined) {
      const L = Lv.cur(), r = clamp((this.L.hit - L.hit[0]) / (L.hit[1] - L.hit[0]), 0, 1);
      this.forza = Game.careerMode ? 100 : clamp(100 - (1 - r) * 20 + (Math.random() + Math.random() + Math.random() - 1.5) * 4, 70, 100);
    }
    if (s.ph === 'ready') { if ((m.wait -= dt) <= 0) this.tap(ev, 0); return; }
    if (s.ph === 'pull' || s.ph === 'jerk' || s.ph === 'hold') { if (s.P < this.forza) this.mash(ev, dt, 0); return; }
    if (s.ph === 'rack') {
      if (s.P < this.forza) this.mash(ev, dt, 0, 0.6);
      if (s.t > 0.35 && Math.abs(s.needle - 0.5) < ev.zone(s.W) * m.zone) this.tap(ev, 1);
    }
  },
  '50sl'(ev, dt) {
    const s = ev.S[this.p];
    if (s.fin != null || !this.reaction(ev)) return;
    if (s.ph === 'block') { this.tap(ev, 0); return; }
    if (s.ph !== 'swim') return;
    this.mash(ev, dt, 0);
    if (this.mem.br == null) this.mem.br = clamp(0.24 + this.err(0.18), 0.01, 0.6);
    if (s.o2 < this.mem.br && s.breath <= 0) { this.tap(ev, 1); this.mem.br = null; }
  },
  '200m'(ev, dt) {
    if (ev.fin[this.p] != null || !this.reaction(ev)) return;
    this.mash(ev, dt, 0);
  },
  peso(ev, dt) { cpuThrow.call(this, ev, dt); },
  disco(ev, dt) { cpuThrow.call(this, ev, dt); },
  martello(ev, dt) { cpuThrow.call(this, ev, dt); },
  giavellotto(ev, dt) {
    const s = ev.S[this.p];
    const m = this.fresh(s, () => ({ wait: rnd(0.5, 1.3), ang: ev.bestAng + this.err(8), margin: 0.5 + this.err(0.6) }));
    if (s.ph === 'ready') { if ((m.wait -= dt) <= 0) this.tap(ev, 0); return; }
    if (s.ph === 'run') { this.mash(ev, dt, 0); if (s.x > -m.margin) this.down(ev, 1); return; }
    if (s.ph === 'wind' && s.ang < m.ang) return;
    this.up(ev, 1);
  },
  arco(ev, dt) {
    const s = ev.S[this.p];
    const m = this.fresh(s, () => ({
      wait: rnd(0.4, 1.1),
      // how close to the gold this archer insists on before loosing, and how long he is willing to wait
      ring: lerp(4.2, 0.5, this.L.hit) * rnd(0.85, 1.2),
      patience: rnd(1.6, 3.4), breath: Math.random() < this.L.hit,
    }));
    if (s.ph === 'ready') { if ((m.wait -= dt) <= 0) this.down(ev, 0); return; }
    if (s.ph !== 'draw') { this.up(ev, 0); this.up(ev, 1); return; }
    if (s.draw < 1) return;
    if (m.breath && s.held > 1.1) this.down(ev, 1);
    const d = Math.hypot(s.ax, s.ay) / ev.R10;
    if (d <= m.ring || s.held > m.patience + 1.4) { this.up(ev, 1); this.up(ev, 0); }
  },
  // The routine a rival attempts, not just how well he performs it: at the olympics they ask for the
  // twists the tier allows instead of repeating the university exercise with a steadier landing.
  trampolino(ev, dt) {
    const s = ev.S[this.p];
    const m = this.fresh(s, () => ({
      wait: rnd(0.6, 1.4),
      // how many somersaults is a matter of how good the athlete is, as it always was;
      // how many twists is what the championship allows, and that is the part that was missing
      turns: this.L.err > 0.8 ? 1 : this.L.err > 0.4 ? pick([1, 2]) : 2,
      twists: Math.min(ev.cap, Math.round(ev.cap * lerp(0.35, 1, clamp(this.L.hit, 0, 1)))),
      aim: this.err(0.9), released: false,
    }));
    if (s.ph === 'ready') { if ((m.wait -= dt) <= 0) this.down(ev, 0); return; }
    if (s.ph !== 'air') { this.up(ev, 0); return; }
    if (!m.released && this.held[0] && ev.predict(s) >= m.turns * TAU + m.aim) { this.up(ev, 0); m.released = true; }
    // a twist still turning when the feet touch costs two points, so stop asking for them in time
    const left = (s.vy + Math.sqrt(Math.max(0, s.vy * s.vy + 19.6 * s.y))) / 9.8;
    if (s.twist < m.twists && s.tw <= 0 && left > 0.45) this.tap(ev, 1);
  },
  // Il volteggio ha due mestieri in fila: prima una rincorsa da velocista con lo stacco a tempo,
  // poi un tuffo. L'avversario sbaglia la pedana di qualche centimetro, come un umano.
  volteggio(ev, dt) {
    const s = ev.S[this.p];
    const m = this.fresh(s, () => ({
      wait: rnd(0.6, 1.4),
      turns: this.L.err > 0.8 ? 1 : this.L.err > 0.45 ? pick([1, 2]) : 2,
      twists: Math.min(ev.twMax(), Math.round(ev.twMax() * lerp(0.3, 1, clamp(this.L.hit, 0, 1)))),
      at: 0.10 + Math.abs(this.err(0.45)),        // di quanto anticipa lo stacco sulla pedana
      rep: this.err(0.5) * 0.5,                   // e di quanto sbaglia la repulsione sulle mani
      aim: this.err(0.9), released: false, pushed: false,
    }));
    if (s.ph === 'ready') { if ((m.wait -= dt) <= 0) this.tap(ev, 0); return; }
    if (s.ph === 'run') {
      this.mash(ev, dt, 0);
      if (s.r.x > -m.at) this.tap(ev, 1);
      return;
    }
    // la repulsione: seconda spinta, sulle mani, quando il corpo passa per la verticale
    if (s.ph === 'hands') {
      if (!m.pushed && s.ang >= ev.pushAng + m.rep * ev.pushBand) { this.tap(ev, 1); m.pushed = true; }
      return;
    }
    if (s.ph !== 'air') { this.up(ev, 0); return; }
    if (!m.released && !this.held[0]) this.down(ev, 0);   // si raggruppa appena lascia il castello
    if (!m.released && this.held[0] && ev.predict(s) >= m.turns * TAU + m.aim) { this.up(ev, 0); m.released = true; }
    const left = (s.vy + Math.sqrt(Math.max(0, s.vy * s.vy + 19.6 * Math.max(0, s.y - ev.hipStand)))) / 9.8;
    if (s.twist < m.twists && s.tw <= 0 && left > 0.45) this.tap(ev, 1);
  },
  // L'ultimo frazionista parte quando il compagno passa sul segno (sbagliando di qualche passo),
  // allunga la mano quando se lo sente addosso e poi corre.
  staffetta(ev, dt) {
    const s = ev.S[this.p];
    const m = this.fresh(s, () => ({ at: this.err(1.6), reach: 1.25 + this.err(0.4) }));
    if (s.fin != null) { this.up(ev, 1); return; }
    if (s.ph === 'wait') { if (s.inX >= ev.Z0 - s.mark + m.at) this.tap(ev, 0); return; }
    this.mash(ev, dt, 0);
    if (s.got) { this.up(ev, 1); return; }
    // partito troppo presto: si rallenta per farsi raggiungere prima della fine della zona
    if (ev.gap(s) < m.reach) this.down(ev, 1);
  },
  // In parete si va a ritmo: la presa parte un soffio dopo che il corpo e' pronto. Ogni tanto chi
  // e' meno preciso anticipa e scivola, come un umano.
  arrampicata(ev) {
    const s = ev.S[this.p];
    if (s.fin != null || !this.reaction(ev) || s.slip > 0) return;
    const m = this.fresh('m' + s.k + '_' + s.slips, () => ({
      late: 0.015 + Math.abs(this.err(0.06)), early: Math.random() < (1 - this.L.hit) * 0.07,
    }));
    if (s.ready >= s.need + (m.early ? -0.06 : m.late)) this.tap(ev, s.k % 2 === 0 ? 0 : 1);
  },
  // Lancio pedalando, picchiata a un secondo e mezzo dalla linea (piu' o meno), colpo di reni sul
  // traguardo quando se lo ricorda.
  ciclismo(ev, dt) {
    const s = ev.S[this.p];
    if (s.fin != null) return;
    const m = this.fresh(s, () => ({ dive: 1.45 + this.err(0.7), lunge: 1.6 + this.err(1.5), wait: rnd(0.2, 0.7) }));
    if ((m.wait -= dt) > 0) return;
    this.mash(ev, dt, 0);
    if (s.dive < 0 && s.s >= -s.v * m.dive) this.tap(ev, 1);
    else if (s.dive >= 0 && !s.thrown && ev.LEN - s.s <= m.lunge) this.tap(ev, 1);
  },
  // Il cavaliere tiene il galoppo che si sente di tenere e stacca dove vede il punto, sbagliando
  // di qualche decina di centimetri tanto più quanto è meno preciso.
  equitazione(ev, dt) {
    const s = ev.S[this.p];
    if (s.fin != null) return;
    const m = this.fresh('j' + s.next + '_' + s.ref, () => ({
      spot: this.err(0.75), vt: clamp(0.86 + this.err(0.1), 0.72, 1), wait: rnd(0.1, 0.4),
    }));
    if ((m.wait -= dt) > 0) return;
    if (s.v < ev.capP(this.p) * m.vt) this.mash(ev, dt, 0, 0.35);
    if (s.ph === 'run' && s.next < ev.F.length && ev.F[s.next].x - s.x <= ev.ideal(s.next) + m.spot) this.tap(ev, 1);
  },
  // Il b-boy ha la sua uscita in testa: per ogni nota decide in partenza quando la prende (un po'
  // prima o un po' dopo), se se la perde, e fin dove tiene le power move.
  breaking(ev) {
    if (ev.res[this.p]) { this.up(ev, 0); this.up(ev, 1); return; }
    const plan = this.mem.plan || (this.mem.plan = ev.notes.map(q => ({
      at: q.t + this.err(0.09), miss: Math.random() < (1 - this.L.hit) * 0.18,
      rel: q.len ? q.t + q.len * (Math.random() < this.L.hit ? 1.03 : rnd(0.5, 0.92)) : 0, go: false, up: false,
    })));
    const t = ev.clock;
    ev.notes.forEach((q, i) => {
      const k = plan[i];
      if (k.miss) return;
      if (!k.go && t >= k.at) { k.go = true; if (q.len) this.down(ev, q.b); else this.tap(ev, q.b); }
      if (q.len && k.go && !k.up && t >= k.rel) { k.up = true; this.up(ev, q.b); }
    });
  },
  tuffi(ev, dt) {
    const s = ev.S[this.p], L = this.L;
    const m = this.fresh(s, () => ({
      wait: rnd(0.8, 1.6),
      half: L.err > 0.8 ? 3 : L.err > 0.4 ? pick([3, 5]) : 5,
      twists: Math.min(ev.cap, L.err > 0.8 ? 0 : L.err > 0.4 ? pick([0, 1]) : pick([1, 2, 3])),
      aim: this.err(0.9), released: false, // rivals miss the vertical by a human amount, not by degrees
    }));
    if (s.ph === 'ready') { if ((m.wait -= dt) <= 0) this.down(ev, 0); return; }
    if (s.ph !== 'air') { this.up(ev, 0); return; }
    if (!m.released && this.held[0] && ev.predict(s) >= m.half * Math.PI + m.aim) { this.up(ev, 0); m.released = true; }
    if (s.twist < m.twists && s.tw <= 0 && s.y > 4) this.tap(ev, 1);
  },
};
