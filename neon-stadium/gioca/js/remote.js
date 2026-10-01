'use strict';
// ===== Telecomando =====
// Un telefono o un tablet sulla stessa rete apre una pagina servita dall'app e diventa il pad.
// Qui entra tutto quello che arriva da lì: i tasti passano per la stessa porta della tastiera,
// i tocchi per la stessa porta delle dita sullo schermo, quindi nessuna schermata sa di essere
// comandata da lontano. Nel verso opposto mandiamo solo una fotografia di cosa mostrare sul pad.
//
// Il gioco non chiama mai l'app: è l'app che, tre volte al secondo, chiama Remote.pull() e si porta
// via quello che serve. Un solo canale, quello di evaluateJavascript, che è anche l'unico che si è
// dimostrato affidabile su tutti i televisori: il ponte addJavascriptInterface su alcuni non esiste
// proprio, e il telecomando restava cieco senza un solo errore da nessuna parte.

const Remote = {
  url: '',        // indirizzo da digitare sul tablet, vuoto se il server non è partito
  peers: 0,       // telecomandi che si sono fatti vivi negli ultimi secondi
  held: [[false, false, false], [false, false, false]],   // cosa tiene premuto ogni telecomando, per giocatore
  seq: [0, 0],    // numero di serie dei messaggi: uno vecchio che arriva tardi va buttato
  sc: null,
  srv: -1,        // server: -1 non siamo nell'app, 0 spento, 1 acceso
  want: -1,       // cosa vuole il giocatore; l'app lo legge dallo stato e lo esaudisce
  imgErr: '',     // perché la miniatura non parte, se non parte: si legge dal pad
  img: 0,         // cambia a ogni foto nuova: il pad la richiede solo quando questo si muove
  sig: '',        // com'era la schermata all'ultimo giro
  shotOf: null, shotAt: 0,

  // mask: bit 0 = tasto A, bit 1 = tasto B, bit 2 = tasto C (le gare che ce l'hanno). Arriva lo stato completo, non il cambiamento, così
  // un messaggio perso non lascia il gioco con un tasto incastrato giù.
  keys(p, mask, n) {
    p = clamp(p | 0, 0, 1); mask = mask | 0; n = n | 0;
    if (n && n <= this.seq[p]) return;          // sorpassato da uno più recente: ignoralo
    this.seq[p] = n;
    const h = this.held[p];
    for (let b = 0; b < 3; b++) {
      const want = !!(mask & (1 << b));
      if (want === h[b]) continue;
      h[b] = want;
      if (G.scene && G.scene.key) G.scene.key(p, b, want);
    }
  },
  // x e y arrivano da 0 a 1 sul fotogramma che il pad sta mostrando, cioè sul canvas: li riporto
  // alle coordinate del gioco con la stessa trasformazione di un dito sul vetro, bande nere comprese
  point(p, x, y, down) {
    const sc = G.scene, id = 'remote' + p;
    if (!sc) return;
    if (down && sc.pointerDown) {
      const c = G.canvas, v = G.view;
      const lx = ((c ? c.width : G.W) * clamp(x, 0, 1) - v.ox) / v.s;
      const ly = ((c ? c.height : G.H) * clamp(y, 0, 1) - v.oy) / v.s;
      sc.pointerDown(lx, ly, id);
    } else if (!down && sc.pointerUp) sc.pointerUp(id);
  },
  back() { G.back(); },

  // A thumbnail of what is on the television, so the pad is not a blank rectangle to aim at: you see
  // the screen and touch where you see. Drawn only while somebody is holding a controller.
  frame() {
    const src = G.canvas;
    if (!src || !src.width) { this.imgErr = 'canvas vuoto'; return ''; }
    const w = 720, h = Math.max(1, Math.round(w * src.height / src.width));
    const b = this.buf || (this.buf = document.createElement('canvas'));
    if (b.width !== w || b.height !== h) { b.width = w; b.height = h; }
    b.getContext('2d').drawImage(src, 0, 0, w, h);
    // un WebView che non sa codificare restituisce "data:," invece di sollevare un errore
    for (const type of ['image/jpeg', 'image/webp', 'image/png']) {
      let d = '';
      try { d = b.toDataURL(type, 0.6) || ''; } catch (e) { this.imgErr = type + ': ' + (e && e.message || e); continue; }
      if (d.length > 200) { this.imgErr = ''; return d; }
      this.imgErr = type + ': vuota';
    }
    return '';
  },

  // I pulsanti della schermata, in coordinate 0..1 sul fotogramma: il pad li disegna come rettangoli
  // con la loro scritta, così si sa dove toccare anche quando la miniatura non arriva.
  padButtons() {
    const sc = G.scene;
    if (!sc || !sc.btns || (sc.ev && !sc.paused)) return [];
    const c = G.canvas, v = G.view, W = c ? c.width : G.W, H = c ? c.height : G.H;
    const r4 = z => Math.round(z * 1e4) / 1e4;
    return sc.btns.slice(0, 64).map(b => ({
      x: r4((b.x * v.s + v.ox) / W), y: r4((b.y * v.s + v.oy) / H),
      w: r4(b.w * v.s / W), h: r4(b.h * v.s / H),
      t: String(T(b.label || b.name || b.flag || (b.ev ? SHORT[b.ev.id] : '') || '')).slice(0, 18),
    }));
  },

  // Cosa deve far vedere il telecomando: se siamo in gara mostra i due pulsanti con le loro
  // etichette, altrimenti il riquadro con cui si toccano i menu.
  snapshot() {
    const sc = G.scene, es = sc && sc.ev ? sc : null;
    const c = G.canvas;
    // quanti giocatori: in gara lo sa la gara, nei menu lo sa la schermata che ha scelto 1 o 2.
    // Serve perche' il selettore G1/G2 del pad deve comparire prima di far partire la gara.
    const o = { w: c ? c.width : G.W, h: c ? c.height : G.H, lang: LANG, v: GAME_VERSION,
      humans: (sc && sc.humans) || 0 };
    if (this.want >= 0) o.srv = this.want;      // l'app legge di qui se accendere o spegnere
    o.btns = this.padButtons();
    if (this.imgErr) o.imgerr = this.imgErr;
    if (!es) { o.mode = 'menu'; o.ev = ''; return o; }
    o.mode = es.paused ? 'menu' : 'play';
    o.ev = T(es.meta.name);
    o.lab = []; o.hud = []; o.lefty = [];
    for (let p = 0; p < es.humans; p++) {
      o.lab.push((es.ev.labels(p) || ['', '']).map(T));
      o.hud.push(T(es.ev.hud(p) || ''));
      o.lefty.push(!!(PCOL[p] && PCOL[p].lefty));
    }
    return o;
  },

  // L'app chiama questo tre volte al secondo: porta l'indirizzo e chi è collegato, si prende lo
  // stato. Non può sollevare un'eccezione: se il ritratto della schermata va storto il telecomando
  // deve almeno poter dire che cosa è andato storto, invece di restare muto per sempre.
  pull(url, peers, wantFrame, server) {
    this.url = url || '';
    this.peers = peers | 0;
    this.srv = server == null ? -1 : (server ? 1 : 0);
    if (this.want < 0) this.want = this.srv;    // prima volta: si parte da com'è messo adesso
    if (G.scene !== this.sc) { this.sc = G.scene; this.held = [[false, false, false], [false, false, false]]; }
    try {
      const o = this.snapshot();
      this.sig = JSON.stringify(o);        // la firma non comprende il numero della foto,
      o.img = this.img;                    // altrimenti ogni foto ne chiederebbe un'altra
      return JSON.stringify(o);
    } catch (e) {
      const c = G.canvas;
      return JSON.stringify({
        mode: 'menu', ev: '', btns: [],
        w: c ? c.width : 960, h: c ? c.height : 540,
        v: typeof GAME_VERSION === 'undefined' ? '' : GAME_VERSION,
        err: String((e && e.message) || e).slice(0, 160),
      });
    }
  },
  // La foto sta ferma: si rifà solo se la schermata è cambiata, e comunque ogni tre secondi per
  // sicurezza. Il televisore paga la codifica una volta ogni tanto invece che tre volte al secondo,
  // e quel risparmio diventa risoluzione: a 256 px le scritte dei pulsanti erano illeggibili.
  pullFrame() {
    try {
      const now = Date.now() / 1000;
      if (now - this.shotAt < 0.5) return '';                              // mai più di due al secondo
      if (this.sig === this.shotOf && now - this.shotAt < 3) return '';
      const d = this.frame();
      if (!d) return '';
      this.shotOf = this.sig; this.shotAt = now; this.img++;
      return d;
    } catch (e) { this.imgErr = String((e && e.message) || e).slice(0, 80); return ''; }
  },
};

// `const Remote` alone would not be reachable as window.Remote from the app's evaluateJavascript
window.Remote = Remote;

/** Accende o spegne il server del telecomando. L'app se ne accorge al giro dopo. */
Remote.toggle = function () { this.want = this.srv > 0 ? 0 : 1; };
