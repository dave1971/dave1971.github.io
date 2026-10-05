// Il contatore di dave1971.github.io. Sta nella radice del sito e ogni pagina lo carica con una riga:
//   <script src="/conta.js" defer></script>
//
// Manda al Worker un segnale minuscolo per ogni visita alla pagina e per ogni clic su un download o su
// "gioca nel browser". Il Worker tiene solo un numero per giorno, progetto, evento e paese: niente
// cookie, niente indirizzi, niente che dica chi era. I numeri si leggono su /statistiche/.
//
// Il progetto e' la cartella del sito in cui sta la pagina (la radice e' "home"). Un clic conta per
// il progetto verso cui punta il link, cosi' un download fatto dalla pagina d'ingresso va al gioco
// giusto. Per un link che esce dal sito (una release su GitHub) il progetto non si puo' ricavare: va
// scritto sul link con  data-conta="cartella:scarica-exe".
(function () {
  'use strict';
  var locale = /^(localhost$|127\.)/.test(location.hostname);
  // in locale si parla col Worker di prova (npx wrangler dev), mai con quello vero
  var W = locale ? 'http://127.0.0.1:8787/c' : 'https://olimpiadi-record.olimpiadi-dave1971.workers.dev/c';
  // la pagina del gioco vive in olimpiadi/ per via degli aggiornamenti, ma il progetto e' neon-stadium
  var ALIAS = { olimpiadi: 'neon-stadium' };

  function cartella(percorso) {
    var m = /^\/([a-z0-9][a-z0-9-]*)\//.exec(percorso);
    return m ? (ALIAS[m[1]] || m[1]) : '';
  }
  var SITO = cartella(location.pathname) || 'home';

  function conta(evento, progetto) {
    // chi sulla pagina delle statistiche ha scelto di non contarsi
    try { if (localStorage.getItem('dave1971_noconta')) return; } catch (e) { /* niente memoria: si conta */ }
    if (location.protocol === 'file:') return;
    var u = W + '?s=' + encodeURIComponent(progetto || SITO) + '&e=' + encodeURIComponent(evento);
    try { if (navigator.sendBeacon && navigator.sendBeacon(u)) return; } catch (e) { /* si prova con l'immagine */ }
    new Image().src = u;
  }

  conta('visita');

  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a) return;
    var scritto = a.getAttribute('data-conta'), evento = '', progetto = '';
    if (scritto) {
      var pezzi = scritto.split(':');
      evento = pezzi[pezzi.length - 1];
      if (pezzi.length > 1) progetto = pezzi[0];
    } else {
      var est = /\.(apk|exe|zip)$/i.exec(a.pathname);
      if (est) evento = 'scarica-' + est[1].toLowerCase();
      else if (/\/(gioca|app)\/$/.test(a.pathname)) evento = 'apri-web';
      else return;
    }
    if (!progetto && a.hostname === location.hostname) progetto = cartella(a.pathname);
    conta(evento, progetto);
  }, true);
})();
