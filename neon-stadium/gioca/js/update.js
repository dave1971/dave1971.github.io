'use strict';
// ===== Update check =====
// Reads a tiny manifest published on GitHub Pages; if it announces a newer build the title screen
// offers it. Dentro l'app si punta direttamente all'apk, e dentro l'eseguibile di Windows all'exe:
// se ne occupa l'involucro, che lo scarica e lo installa, perché passare dalla pagina significa
// passare da pubblicità e blocchi vari. Fuori (browser) si apre la pagina del gioco, come sempre.
// Manifest: {"versionCode": 5, "versionName": "1.4", "url": "…", "apk": "…", "exe": "…", "exeCode": 5, "note": "…"}
// (exeCode: il numero dell'ultimo exe pubblicato, quando non e' lo stesso dell'apk; se manca vale versionCode.
// exeName ed exeNote: versione e nota dell'exe, quando sono diverse da quelle dell'apk)

const UPDATE_URL = 'https://dave1971.github.io/olimpiadi/version.json';
const GAME_PAGE = 'https://dave1971.github.io/olimpiadi/';
const GAME_BUILD = 113; // must match versionCode in app/build.gradle (the build fails if it drifts)

const Updater = {
  info: null, started: false,
  LAST: 'olimpiadi_upd_last', SKIP: 'olimpiadi_upd_skip',
  read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  write(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
  check() {
    if (this.started) return;
    this.started = true;
    // la versione web e' sempre l'ultima: niente da aggiornare
    if (window.OLIMPIADI_PLATFORM === 'web') return;
    if (typeof fetch !== 'function') return; // one check per launch (the manifest is a few hundred bytes)
    let late = false;
    const timer = setTimeout(() => { late = true; }, 6000);
    fetch(UPDATE_URL, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        clearTimeout(timer);
        if (late || !d || typeof d.versionCode !== 'number') return;
        this.write(this.LAST, String(Date.now()));
        // L'exe puo' restare indietro rispetto all'apk (una versione pubblicata solo per Android e web):
        // il manifesto dice allora a parte qual e' l'ultimo exe (exeCode), e l'exe guarda quello.
        const code = window.OLIMPIADI_PLATFORM === 'win' && typeof d.exeCode === 'number' ? d.exeCode : d.versionCode;
        if (code > GAME_BUILD && String(code) !== this.read(this.SKIP)) {
          this.info = d; this.info.code = code;
          // e quando l'exe e' avanti o indietro, nome e nota dell'exe (exeName, exeNote) al posto di quelli dell'apk
          if (window.OLIMPIADI_PLATFORM === 'win' && code !== d.versionCode) {
            if (d.exeName) this.info.versionName = d.exeName;
            if (d.exeNote) this.info.note = d.exeNote;
          }
        }
      })
      .catch(() => { clearTimeout(timer); }); // offline, or manifest not published: stay silent
  },
  // Il file da scaricare direttamente, quando c'è qualcuno che sa installarlo: dentro l'app Android
  // è l'apk, dentro l'eseguibile di Windows è l'exe nuovo. Remote.srv è >= 0 solo quando attorno al
  // gioco c'è un ospite in ascolto; nel browser resta -1 e si apre la pagina, come sempre.
  direct() {
    const d = this.info;
    if (!d || typeof Remote === 'undefined' || Remote.srv < 0) return '';
    return (window.OLIMPIADI_PLATFORM === 'win' ? d.exe : d.apk) || '';
  },
  open() {
    const d = this.info || {};
    const u = this.direct() || d.url || GAME_PAGE;
    if (this.direct()) Conta.manda('agg');     // l'aggiornamento scaricato da dentro l'app
    this.info = null;
    // in the app the WebView hands http(s) links to the system browser
    try { if (!window.open(u, '_blank')) location.href = u; } catch (e) { location.href = u; }
  },
  later() { this.info = null; },
  skip() { if (this.info) this.write(this.SKIP, String(this.info.code || this.info.versionCode)); this.info = null; },
};
