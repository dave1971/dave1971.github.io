'use strict';
// ===== Le istruzioni a immagini =====
// Prima di ogni gara non c'e' piu' da leggere: una fila di passi, e per ogni passo quale tasto, come si
// preme, e una fotografia dell'atleta in quel momento. Le fotografie non sono disegni fatti a parte:
// dietro la schermata gira davvero la gara, con un atleta solo guidato dal pilota migliore che il
// gioco conosce, e quando arriva il momento di un passo se ne ritaglia l'inquadratura. Cosi' cambiando
// la grafica o le regole di una gara le sue istruzioni cambiano da sole.
//
// GUIDE[id] = i passi di quella gara, nell'ordine in cui si fanno. Un passo:
//   t      i tasti: [['A', 'rapido'], ['B', 'click']] (uno o piu', nell'ordine in cui si leggono); anche
//          () => [...] quando il tasto dipende dalla mano del giocatore (i mirini del piattello)
//   q      ev => vero quando e' il momento della fotografia (il giocatore e' sempre il numero 0)
//   dopo   secondi di gioco da lasciar passare dopo q, se la posa buona viene un attimo piu' tardi
//   nota   due parole su QUANDO premere, se serve ("NEL VERDE", "SULLA LINEA"); niente altro
//   m      quanti metri di campo si vedono in larghezza attorno all'atleta (se no 4,4)
//   dx,dy  di quanti metri spostare l'inquadratura (dy verso l'alto); anche ev => metri
//   riq    [x0, y0, x1, y1] in frazioni della corsia, al posto dell'inquadratura sull'atleta
//   hud    [x0, y0, x1, y1] in frazioni della corsia, oppure (w, h) => [x0, y0, x1, y1] in punti: uno
//          strumento da mostrare nell'angolo della foto (la lancetta, la barra della forza)
//   prima  ev => {...} da fare un attimo prima della fotografia (allargare l'inquadratura della gara)
//   pilota (cpu, ev, dt) => {...} al posto del pilota normale, per i passi che lui non farebbe
// Al posto della lista si puo' dare { passi: [...], inizio: (ev, cpu) => {...}, mem: {...} }: `inizio` prepara
// la gara di dimostrazione appena creata, `mem` fissa i bersagli che il pilota si sceglie a caso (l'alzo
// a cui lascia, per esempio), cosi' la fotografia viene sempre nel punto giusto.
const GUIDE = {};

// i modi di premere: la scritta e' l'unica cosa che si legge
const GUIDA_TIPI = {
  rapido: 'RAPIDO', click: '1 CLICK', tieni: 'TIENI PREMUTO', rilascia: 'RILASCIA',
  alterna: 'ALTERNATI', insieme: 'INSIEME', fermo: 'NON PREMERE',
};
const GUIDA_PASSO = 1 / 120;      // il passo del gioco
const GUIDA_MAX_S = 70;           // oltre, la prova di dimostrazione si ricomincia
const GUIDA_PROVE = 4;            // dopo tante prove andate male le foto che mancano restano vuote

class Guida {
  constructor(meta) {
    this.meta = meta;
    const g = GUIDE[meta.id] || null;
    this.def = g && !Array.isArray(g) ? g : { passi: g };
    this.passi = this.def.passi || null;
    this.foto = []; this.i = 0; this.prove = 0;
    this.fatto = !this.passi;
    if (this.passi) this.prova();
  }
  // Tutto quello che la gara di dimostrazione fa non deve lasciare traccia: niente suoni, niente misure
  // salvate (Superate), e l'atleta e' al massimo della forma anche se la carriera e' appena cominciata.
  zitto(fn) {
    const snd = Snd.on, demo = Game.demo;
    Snd.on = false; Game.demo = true;
    try { return fn(); } finally { Snd.on = snd; Game.demo = demo; }
  }
  prova() {
    this.zitto(() => {
      this.ev = new this.meta.cls(1, this.meta);
      this.cpu = new Cpu(this.meta.id, 1, 0);
      // senza errori di tempo e senza le giornate storte: deve far vedere come si fa, non sbagliare
      this.cpu.L = { hz: 13.5, err: 0, hit: 0.97 };
      this.cpu.forma = null;
      if (this.def.inizio) this.def.inizio(this.ev, this.cpu);
    });
    this.simT = 0; this.attesa = -1;
  }
  /** Manda avanti la dimostrazione per qualche millisecondo, cosi' la schermata non si pianta mai. */
  avanza(ms) {
    if (this.fatto) return;
    const fine = Date.now() + ms;
    this.zitto(() => {
      while (!this.fatto && Date.now() < fine) {
        for (let k = 0; k < 30 && !this.fatto; k++) this.passo();
      }
    });
  }
  passo() {
    const p = this.passi[this.i], ev = this.ev;
    try {
      if (p.pilota) p.pilota(this.cpu, ev, GUIDA_PASSO); else this.cpu.tick(ev, GUIDA_PASSO);
      const mem = this.def.mem;
      if (mem) for (const k in mem) if (k in this.cpu.mem) this.cpu.mem[k] = mem[k];
      ev.update(GUIDA_PASSO);
      this.simT += GUIDA_PASSO;
      if (this.attesa < 0 && p.q(ev)) this.attesa = p.dopo || 0;
      if (this.attesa >= 0 && (this.attesa -= GUIDA_PASSO) <= 0) {
        if (p.prima) p.prima(ev);
        this.foto[this.i] = this.scatta(p);
        this.attesa = -1;
        if (++this.i >= this.passi.length) { this.fine(); return; }
      }
    } catch (e) {
      // una gara che non regge la dimostrazione non deve rompere la schermata: restano i tasti
      if (typeof console !== 'undefined') console.warn('guida ' + this.meta.id + ': ' + (e && e.message));
      this.fine();
      return;
    }
    // finita la prova senza aver trovato tutti i momenti (un nullo, un colpo mancato): si riprova
    if (ev.res[0] || this.simT > GUIDA_MAX_S) {
      if (++this.prove >= GUIDA_PROVE) this.fine(); else this.prova();
    }
  }
  fine() { this.fatto = true; this.ev = null; this.cpu = null; }

  // ---------- la fotografia ----------
  // La gara si disegna due volte. La prima in piccolo, solo per vedere dove finisce l'atleta: si
  // intercetta drawAthlete e si prende nota del punto e della scala. La seconda dentro una tela grande
  // quanto la scheda, spostata e ingrandita in modo che ci cada proprio quel pezzo di campo.
  scatta(p) {
    const W = G.W, H = G.H - HUD_H - CTRL_H, ev = this.ev;
    const msg = ev.msg[0]; ev.msg[0] = null;          // le scritte grandi ("VIA!") coprirebbero l'atleta
    // le scritte che lampeggiano seguono l'orologio del gioco: lo si ferma su un istante in cui si vedono
    const gt = G.t; G.t = 0.02;
    // e la scritta dello starter ("PRONTI...") finirebbe addosso a chi sta sul blocco
    const st = ev.st, stt = st ? st.text : null;
    if (st) st.text = '';
    try {
      let x0, y0, x1, y1;
      if (p.riq) { x0 = p.riq[0] * W; y0 = p.riq[1] * H; x1 = p.riq[2] * W; y1 = p.riq[3] * H; }
      else {
        const a = this.trova(W, H);
        if (!a) return null;
        const larga = (p.m || 4.4) * a.ppm, alta = larga * GUIDA_FOTO.h / GUIDA_FOTO.w;
        const num = v => typeof v === 'function' ? v(ev) : (v || 0);
        let cx = a.x + num(p.dx) * a.ppm, cy = a.y - (0.12 + num(p.dy)) * a.ppm;
        // con uno strumento nell'angolo in alto a destra l'atleta si sposta in basso a sinistra
        if (p.hud) { cx += larga * 0.17; cy -= alta * 0.13; }
        x0 = cx - larga / 2; x1 = cx + larga / 2; y0 = cy - alta / 2; y1 = cy + alta / 2;
        // la foto non esce dalla corsia: si sposta, non si deforma. Se e' piu' alta della corsia (una
        // scena larga, col mostro lontano) la corsia ci sta in mezzo, come in un film
        if (x1 - x0 < W) { const s = Math.max(0, -x0) - Math.max(0, x1 - W); x0 += s; x1 += s; }
        if (y1 - y0 < H) { const s = Math.max(0, -y0) - Math.max(0, y1 - H); y0 += s; y1 += s; }
        else { y0 = (H - alta) / 2; y1 = y0 + alta; }
      }
      const out = { img: this.ritaglio(x0, y0, x1, y1, GUIDA_FOTO.w, GUIDA_FOTO.h), hud: null };
      if (p.hud) {
        const r = typeof p.hud === 'function' ? p.hud(W, H, ev) : [p.hud[0] * W, p.hud[1] * H, p.hud[2] * W, p.hud[3] * H];
        const hw = r[2] - r[0], hh = r[3] - r[1], k = Math.min(GUIDA_FOTO.w * 0.44 / hw, GUIDA_FOTO.h * 0.5 / hh);
        out.hud = this.ritaglio(r[0], r[1], r[2], r[3], hw * k, hh * k);
      }
      return out;
    } finally { ev.msg[0] = msg; G.t = gt; if (st) st.text = stt; }
  }
  trova(W, H) {
    const c = document.createElement('canvas'), k = 0.2;
    c.width = Math.ceil(W * k); c.height = Math.ceil(H * k);
    const ctx = c.getContext('2d');
    ctx.setTransform(k, 0, 0, k, 0, 0);
    let a = null;
    const io = PCOL[0], vero = window.drawAthlete;
    window.drawAthlete = function (cx, x, y, ppm, pose, col) {
      // chi ha i colori del giocatore (un costume ne fa una copia: si guarda il nome). Se lo si disegna
      // piu' volte (un riflesso, un'ombra) vale la piu' grande; la scala e' quella dell'asse meno
      // schiacciato, perche' chi gira su se stesso viene disegnato stretto ma e' alto uguale.
      if (col === io || (col && io && col.name === io.name && col.main === io.main)) {
        const m = cx.getTransform(), pp = ppm * Math.max(Math.hypot(m.a, m.b), Math.hypot(m.c, m.d)) / k;
        if (!a || pp > a.ppm) a = { x: (m.a * x + m.c * y + m.e) / k, y: (m.b * x + m.d * y + m.f) / k, ppm: pp };
      }
      return vero.apply(this, arguments);
    };
    try { this.ev.drawLane(ctx, 0, W, H); } finally { window.drawAthlete = vero; }
    return a;
  }
  ritaglio(x0, y0, x1, y1, w, h) {
    const W = G.W, H = G.H - HUD_H - CTRL_H, dpr = GUIDA_FOTO.dpr;
    const c = document.createElement('canvas');
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    const ctx = c.getContext('2d'), k = c.width / (x1 - x0);
    ctx.setTransform(k, 0, 0, k, -x0 * k, -y0 * k);
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    this.ev.drawLane(ctx, 0, W, H);
    return c;
  }
}
// la misura di una fotografia, in punti dello schermo di gioco; dpr = quanti pixel veri per punto
const GUIDA_FOTO = { w: 200, h: 150, dpr: 2 };

// ---------- il disegno ----------
// Un tasto come quelli della gara, piu' piccolo, col segno di come si preme.
function guidaTasto(ctx, x, y, r, lettera, tipo, t) {
  const i = 'ABC'.indexOf(lettera), base = i === 0 ? PCOL[0].ui : i === 2 ? '#ef6c00' : '#607d8b';
  // il tasto "vive": chi va premuto in fretta batte, chi va tenuto resta giu', chi va lasciato torna su
  let giu = 0;
  if (tipo === 'rapido' || tipo === 'alterna') giu = Math.sin(t * 22 + (tipo === 'alterna' && i ? Math.PI : 0)) > 0 ? 1 : 0;
  else if (tipo === 'click') giu = (t % 1.4) < 0.18 ? 1 : 0;
  else if (tipo === 'tieni' || tipo === 'insieme') giu = 1;
  else if (tipo === 'rilascia') giu = (t % 1.6) < 0.8 ? 1 : 0;
  const rr = r * (giu ? 0.9 : 1);
  if (tipo === 'fermo') ctx.globalAlpha = 0.45;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.arc(x + 2, y + 3, r, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createRadialGradient(x - rr * 0.3, y - rr * 0.4, 2, x, y, rr);
  g.addColorStop(0, shade(base, giu ? 1.7 : 1.4)); g.addColorStop(1, shade(base, giu ? 0.9 : 0.65));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = giu ? '#fff' : 'rgba(255,255,255,0.4)'; ctx.lineWidth = giu ? 3 : 2; ctx.stroke();
  txt(ctx, lettera, x, y + 1, rr * 1.05, '#fff');
  ctx.globalAlpha = 1;
  if (tipo === 'fermo') {        // la croce di chi non va toccato
    ctx.strokeStyle = '#ff5252'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - r * 0.75, y - r * 0.75); ctx.lineTo(x + r * 0.75, y + r * 0.75);
    ctx.moveTo(x + r * 0.75, y - r * 0.75); ctx.lineTo(x - r * 0.75, y + r * 0.75); ctx.stroke();
  }
  // i segni attorno: le onde di chi batte in fretta, l'anello di chi tiene, la freccia di chi lascia
  ctx.strokeStyle = '#ffd600'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  if (tipo === 'rapido' || tipo === 'alterna') {
    for (let k = 0; k < 2; k++) for (const s of [-1, 1]) {
      const a0 = -Math.PI / 2 + s * (0.55 + k * 0.02), rr2 = r + 5 + k * 5;
      ctx.beginPath(); ctx.arc(x, y, rr2, a0 - 0.32, a0 + 0.32); ctx.stroke();
    }
  } else if (tipo === 'tieni' || tipo === 'insieme') {
    ctx.beginPath(); ctx.arc(x, y, r + 5, 0, Math.PI * 2); ctx.stroke();
  } else if (tipo === 'rilascia') {
    const yy = y - r - 5;
    ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x, yy - 10); ctx.moveTo(x - 5, yy - 5); ctx.lineTo(x, yy - 10); ctx.lineTo(x + 5, yy - 5); ctx.stroke();
  }
}

/**
 * La fila dei passi, dentro il rettangolo dato. `guida` puo' non avere ancora tutte le fotografie:
 * al loro posto c'e' un riquadro che aspetta.
 */
function guidaDisegna(ctx, guida, x, y, w, h, t) {
  const passi = guida.passi, n = passi.length, spazio = 22;
  // con pochi passi le fotografie sono piu' grandi; in altezza devono starci anche i tasti e le scritte
  const sotto = 114, cw = Math.min(n <= 2 ? 280 : n === 3 ? 250 : 215, (w - (n - 1) * spazio) / n, (h - sotto) * GUIDA_FOTO.w / GUIDA_FOTO.h);
  const ch = cw * GUIDA_FOTO.h / GUIDA_FOTO.w;
  const tot = n * cw + (n - 1) * spazio, x0 = x + (w - tot) / 2;
  const r = Math.min(21, cw * 0.13);
  y += Math.max(0, (h - sotto - ch) / 2);
  passi.forEach((p, i) => {
    const px = x0 + i * (cw + spazio), f = guida.foto[i];
    // la fotografia
    ctx.save();
    rrect(ctx, px, y, cw, ch, 10); ctx.clip();
    if (f && f.img) ctx.drawImage(f.img, px, y, cw, ch);
    else {
      ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(px, y, cw, ch);
      if (!guida.fatto) { ctx.fillStyle = 'rgba(255,255,255,' + (0.1 + 0.08 * Math.sin(t * 6 + i)).toFixed(3) + ')'; ctx.fillRect(px, y, cw, ch); }
    }
    ctx.restore();
    // lo strumento da tenere d'occhio, nell'angolo
    if (f && f.hud) {
      const hw = f.hud.width / GUIDA_FOTO.dpr * cw / GUIDA_FOTO.w, hh = f.hud.height / GUIDA_FOTO.dpr * cw / GUIDA_FOTO.w;
      const hx = px + cw - hw - 4, hy = y + 4;
      ctx.save(); rrect(ctx, hx, hy, hw, hh, 6); ctx.clip(); ctx.drawImage(f.hud, hx, hy, hw, hh); ctx.restore();
      ctx.strokeStyle = '#ffd600'; ctx.lineWidth = 2; rrect(ctx, hx, hy, hw, hh, 6); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; rrect(ctx, px, y, cw, ch, 10); ctx.stroke();
    // il numero del passo
    ctx.fillStyle = '#ffd600'; ctx.beginPath(); ctx.arc(px + 15, y + 15, 12, 0, Math.PI * 2); ctx.fill();
    txt(ctx, String(i + 1), px + 15, y + 16, 15, '#1a1a2e', 'center', { outline: false, italic: false });
    // la freccia verso il passo dopo
    if (i < n - 1) txt(ctx, '›', px + cw + spazio / 2, y + ch / 2, 30, '#ffd600', 'center', { italic: false });
    // i tasti, ognuno con sotto come si preme
    const tasti = typeof p.t === 'function' ? p.t() : p.t;
    const k = tasti.length, by = y + ch + 14 + r + 6, col = cw / k;
    // come si preme: una riga, o due quando la colonna e' stretta ("TIENI" / "PREMUTO")
    ctx.font = 'bold 13px ' + FONT;
    const scritte = tasti.map(tt => {
      const s = T(GUIDA_TIPI[tt[1]] || tt[1]), sp = s.indexOf(' ');
      return ctx.measureText(s).width <= col - 6 || sp < 0 ? [s] : [s.slice(0, sp), s.slice(sp + 1)];
    });
    const righe = Math.max.apply(null, scritte.map(s => s.length));
    tasti.forEach((tt, j) => {
      const bx = px + col * (j + 0.5);
      guidaTasto(ctx, bx, by, r, tt[0], tt[1], t + i * 0.3);
      scritte[j].forEach((s, l) => txtFit(ctx, s, bx, by + r + 18 + l * 15, 13, '#fff', 'center', col - 4, { italic: false, crudo: true }));
      if (j < k - 1) txt(ctx, tt[1] === 'alterna' ? '⇄' : '+', px + col * (j + 1), by, 20, '#ffd600', 'center', { italic: false, crudo: true });
    });
    if (p.nota) txtFit(ctx, p.nota, px + cw / 2, by + r + 36 + (righe - 1) * 15, 13, '#7CFC00', 'center', cw, { italic: false });
  });
}

// ---------- gli strumenti che si mostrano nell'angolo ----------
// Stanno dove li disegnano le gare: qui se ne ripete solo il riquadro, in punti della corsia.
const GUIDA_HUD = {
  // la lancetta dell'alzo (salto in lungo, giavellotto, lanci, tronco)
  alzo(w, h) { const r = clamp(h * 0.34, 46, 110), pw = r * 1.45 + 40, ph = r + 44, x = w - pw - 12, y = Math.max(6, h * 0.05); return [x, y, x + pw, y + ph]; },
  // il quadrante del giro, nei lanci dalla pedana
  giro(w, h) { const R = clamp(h * 0.15, 30, 66), cx = w - R - 20, cy = h * 0.42; return [cx - R - 8, cy - R - 24, cx + R + 8, cy + R + 8]; },
  // la barra della forza, in piedi a sinistra
  forza(w, h) { return [6, h * 0.11, 48, h * 0.77]; },
  // una barra coricata in alto al centro, larga la frazione f della corsia
  barra: (f, y0, y1) => (w, h) => [w / 2 - w * f / 2 - 10, h * y0, w / 2 + w * f / 2 + 10, h * y1],
  // le barre in alto a sinistra (velocita', equilibrio)
  sinistra: righe => (w, h) => [8, h * 0.05, 24 + w * 0.22, h * 0.09 + righe * Math.max(18, h * 0.07)],
};

// ---------- le gare ----------
// Nelle corse si parte allo sparo: chi tocca prima fa falsa partenza.
const GUIDA_SPARO = { t: [['A', 'fermo'], ['B', 'fermo']], q: ev => ev.st.state === 'set', dopo: 0.3, nota: 'ASPETTA LO SPARO' };

GUIDE['100m'] = GUIDE['200m'] = [
  GUIDA_SPARO,
  { t: [['A', 'alterna'], ['B', 'alterna']], q: ev => ev.st.running() && ev.st.raceT > 1.6 },
];
GUIDE['110h'] = [
  GUIDA_SPARO,
  { t: [['A', 'rapido']], q: ev => ev.st.running() && !ev.j[0].air && ev.r[0].x > 5 && ev.r[0].x < 11 },
  { t: [['B', 'click']], q: ev => ev.j[0].air && ev.j[0].y > 0.35, nota: 'PRIMA DELL\'OSTACOLO', m: 5 },
];
GUIDE.lungo = {
  mem: { ang: 44 },
  passi: [
    { t: [['A', 'rapido']], q: ev => ev.S[0].ph === 'run' && ev.S[0].r.v > 0.8 * ev.S[0].r.vmax && ev.S[0].x > -22 },
    { t: [['B', 'tieni']], q: ev => ev.S[0].ph === 'run' && ev.S[0].x > -1.3, nota: 'PRIMA DELLA LINEA ROSSA', m: 5.4, dx: 0.9 },
    { t: [['B', 'rilascia']], q: ev => ev.S[0].ph === 'air' && ev.S[0].at > 0.12, nota: 'LANCETTA NEL VERDE', hud: GUIDA_HUD.alzo },
  ],
};
GUIDE.triplo = [
  { t: [['A', 'rapido']], q: ev => ev.S[0].ph === 'run' && ev.S[0].r.v > 0.8 * ev.S[0].r.vmax && ev.S[0].x > -22 },
  { t: [['B', 'click']], q: ev => ev.S[0].ph === 'run' && ev.S[0].x > -1.3, nota: 'PRIMA DELLA LINEA ROSSA', m: 5.4, dx: 0.9 },
  { t: [['B', 'click']], q: ev => ev.S[0].ph === 'air' && ev.S[0].seg === 0 && ev.S[0].vy < -1.6, nota: 'QUANDO TOCCHI TERRA' },
  { t: [['B', 'click']], q: ev => ev.S[0].ph === 'air' && ev.S[0].seg === 1 && ev.S[0].vy < -1.3, nota: 'E ANCORA' },
];
GUIDE.alto = [
  { t: [['A', 'rapido']], q: ev => ev.S[0].ph === 'run' && ev.S[0].r.v > 0.8 * ev.vmax },
  { t: [['B', 'click']], q: ev => ev.S[0].ph === 'run' && ev.S[0].x > ev.ideal - 0.5, nota: 'SUL SEGNO BIANCO', m: 5.4, dx: 0.6 },
  { t: [['B', 'click']], q: ev => ev.S[0].ph === 'flight' && ev.S[0].ft >= ev.center - 0.03, nota: 'SOPRA L\'ASTICELLA', m: 5 },
];
GUIDE.asta = [
  { t: [['A', 'rapido']], q: ev => ev.S[0].ph === 'run' && ev.S[0].r.v > 0.8 * ev.vmax, m: 6 },
  { t: [['B', 'click']], q: ev => ev.S[0].ph === 'flight' && ev.S[0].ft > 0.1, nota: 'SUL SEGNO BIANCO', m: 8, dx: 1.5, dy: 1 },
  { t: [['B', 'click']], q: ev => ev.S[0].ph === 'flight' && ev.S[0].ft >= ev.center - 0.06, nota: 'IN CIMA, A TESTA IN GIÙ', m: 4.2 },
];
GUIDE.giavellotto = [
  { t: [['A', 'rapido']], q: ev => ev.S[0].ph === 'run' && ev.S[0].r.v > 0.8 * ev.S[0].r.vmax },
  { t: [['B', 'tieni']], q: ev => ev.S[0].ph === 'run' && ev.S[0].x > -(ev.limite(0) + 0.9), nota: 'COL SEGNO VERDE', m: 6.4, dx: 1.6 },
  { t: [['B', 'rilascia']], q: ev => ev.S[0].ph === 'wind' && ev.S[0].ang >= 32, nota: 'LANCETTA NEL VERDE', hud: GUIDA_HUD.alzo },
];
GUIDE.peso = GUIDE.disco = GUIDE.martello = [
  { t: [['A', 'rapido']], q: ev => ev.S[0].ph === 'spin' && ev.S[0].w > 0.6 * ev.capP(0), hud: GUIDA_HUD.sinistra(2) },
  { t: [['B', 'tieni']], q: ev => ev.S[0].ph === 'spin' && ev.S[0].w > 0.7 * ev.capP(0) && Math.abs(angErr(ev.S[0].ang)) < 0.16, nota: 'LANCETTA NEL VERDE', hud: GUIDA_HUD.giro },
  { t: [['B', 'rilascia']], q: ev => ev.S[0].ph === 'lift' && ev.S[0].el >= 40, nota: 'LANCETTA NEL VERDE', hud: GUIDA_HUD.alzo },
];

// il quadrante dell'arrivo (tuffi, trampolino, volteggio): la lancetta che deve stare nel verde
GUIDA_HUD.giroscopio = (w, h) => { const R = clamp(h * 0.16, 34, 74), cx = w - R - 22, cy = h * 0.46; return [cx - R - 8, cy - R - 22, cx + R + 8, cy + R + 22]; };

GUIDE.pesi = [
  { t: [['A', 'rapido']], q: ev => ev.S[0].ph === 'pull' && ev.S[0].prog > 0.35 && ev.S[0].prog < 0.8, nota: 'SOPRA LA TACCA', m: 3.6, hud: GUIDA_HUD.forza },
  { t: [['B', 'click']], q: ev => ev.S[0].ph === 'rack' && Math.abs(ev.S[0].needle - 0.5) < 0.16, nota: 'LANCETTA NEL VERDE', m: 3.6, hud: GUIDA_HUD.barra(0.36, 0.06, 0.27) },
  { t: [['A', 'rapido']], q: ev => ev.S[0].ph === 'hold' && ev.S[0].t > 0.3, nota: 'TIENILO SU', m: 3.6 },
];
GUIDE['50sl'] = [
  { t: [['A', 'fermo'], ['B', 'fermo']], q: ev => ev.st.state === 'set' && ev.S[0].ph === 'block', dopo: 0.3, nota: 'ASPETTA LO SPARO' },
  { t: [['A', 'rapido']], q: ev => ev.S[0].ph === 'swim' && ev.S[0].x > 8 && ev.S[0].o2 > 0.4 && ev.S[0].breath <= 0 },
  { t: [['B', 'click']], q: ev => ev.S[0].ph === 'swim' && ev.S[0].fin == null && ev.S[0].breath <= 0 && ev.S[0].o2 < 0.3, nota: 'ARIA QUASI FINITA', hud: GUIDA_HUD.sinistra(1.2) },
];
GUIDE.tuffi = [
  { t: [['A', 'tieni']], q: ev => ev.S[0].ph === 'air' && ev.S[0].tuck && ev.S[0].tw <= 0 && ev.S[0].ang > 3 },
  { t: [['B', 'click']], q: ev => ev.S[0].ph === 'air' && ev.S[0].tw > 0.17 && ev.S[0].tw < 0.24 },
  { t: [['A', 'rilascia']], q: ev => ev.S[0].ph === 'air' && !ev.S[0].tuck && ev.S[0].y < 9, nota: 'LANCETTA NEL VERDE', hud: GUIDA_HUD.giroscopio },
];
GUIDE.trampolino = [
  { t: [['A', 'tieni']], q: ev => { const s = ev.S[0]; return s.ph === 'air' && s.tuck && s.ang > 2 && (s.tw <= 0 || Math.abs(Math.cos((0.3 - s.tw) / 0.3 * Math.PI)) > 0.9); } },
  { t: [['B', 'click']], q: ev => ev.S[0].ph === 'air' && ev.S[0].tw > 0.17 && ev.S[0].tw < 0.24 },
  { t: [['A', 'rilascia']], q: ev => ev.S[0].ph === 'air' && !ev.S[0].tuck && ev.S[0].tw <= 0, nota: 'LANCETTA NEL VERDE', hud: GUIDA_HUD.giroscopio },
];
GUIDE.volteggio = [
  { t: [['A', 'rapido']], q: ev => ev.S[0].ph === 'run' && ev.S[0].r.x > -15 && ev.S[0].r.x < -4 },
  { t: [['A', 'rilascia'], ['B', 'click']], q: ev => ev.S[0].ph === 'run' && ev.S[0].r.x > -0.85, nota: 'SULLA PEDANA', m: 5, dx: 1 },
  { t: [['B', 'click']], q: ev => ev.S[0].ph === 'hands' && Math.abs(ev.S[0].ang - ev.pushAng) <= ev.pushBand * 0.35, nota: 'IN VERTICALE', hud: GUIDA_HUD.giroscopio },
  { t: [['A', 'tieni'], ['B', 'rapido']], q: ev => ev.S[0].ph === 'air' && ev.S[0].tuck && ev.S[0].tw > 0.03 && ev.S[0].tw < 0.22 },
  { t: [['A', 'rilascia']], q: ev => ev.S[0].ph === 'air' && !ev.S[0].tuck && ev.S[0].tw <= 0 && ev.S[0].t > 0.2, nota: 'LANCETTA NEL VERDE', hud: GUIDA_HUD.giroscopio },
];

// Il tiro al piattello (e al piccione): due mirini, un tasto per mirino. Quale tasto dipende dalla mano
// del giocatore, come nella gara. I primi due lanci della dimostrazione partono uno per parte.
const guidaNelMirino = g => ev => ev.S[0].clays.some(c => c.alive &&
  Math.hypot((ev.clayPos(c)[0] - ev.sightU[g]) * ev.S[0].dim[0], (ev.clayPos(c)[1] - ev.sightV) * ev.S[0].dim[1]) < ev.Rp[0]);
GUIDE.piattello = {
  inizio: ev => {
    // la gara prende le misure della corsia la prima volta che si disegna: qui la si disegna a vuoto
    ev.drawLane(document.createElement('canvas').getContext('2d'), 0, G.W, G.H - HUD_H - CTRL_H);
    ev.vol[0].ty = ev.vol[0].first = 'L'; ev.vol[1].ty = ev.vol[1].first = 'R';
  },
  passi: [
    { t: () => [[skeetSight(0, 0) === 0 ? 'A' : 'B', 'click']], q: guidaNelMirino(0), nota: 'NEL MIRINO SINISTRO', riq: [0.13, 0.12, 0.61, 1] },
    { t: () => [[skeetSight(0, 0) === 1 ? 'A' : 'B', 'click']], q: guidaNelMirino(1), nota: 'NEL MIRINO DESTRO', riq: [0.39, 0.12, 0.87, 1] },
  ],
};

// Il tiro con l'arco: il respiro (B) il pilota lo trattiene di rado, quindi nel secondo passo lo si fa
// per lui: arco teso, B giu', e si aspetta che il mirino si fermi.
const guidaBersaglio = (w, h) => { const R = clamp(h * 0.33, 60, 170), cx = w * 0.62, cy = h * 0.46; return [cx - R - 8, cy - R - 8, cx + R + 8, cy + R + 8]; };
GUIDE.arco = [
  { t: [['A', 'tieni']], q: ev => ev.S[0].ph === 'draw' && ev.S[0].draw > 0.5 && ev.S[0].draw < 1, hud: GUIDA_HUD.sinistra(1.2) },
  { t: [['A', 'tieni'], ['B', 'tieni']], q: ev => ev.S[0].ph === 'draw' && ev.S[0].steady && ev.S[0].breath < 0.8, nota: 'IL MIRINO SI FERMA', hud: guidaBersaglio,
    pilota: (cpu, ev, dt) => { const s = ev.S[0]; if (s.ph === 'draw' && s.draw >= 1) { if (!s.steady) ev.press(0, 1); } else cpu.tick(ev, dt); } },
  { t: [['A', 'rilascia']], q: ev => ev.S[0].ph === 'draw' && ev.S[0].draw >= 1 && Math.hypot(ev.S[0].ax, ev.S[0].ay) <= ev.R10 * 3, nota: 'MIRINO SUL GIALLO', hud: guidaBersaglio },
];
