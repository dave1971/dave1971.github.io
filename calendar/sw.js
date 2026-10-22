// Il service worker del calendario di D e F. Fa una cosa sola: tiene una copia della pagina e delle
// sue icone, cosi' l'app installata sul telefono si apre anche senza rete. Prima prova sempre la rete
// (la pagina aggiornata vince), e solo se non c'e' usa la copia. Gli appuntamenti stanno sul Worker,
// che e' su un altro indirizzo: quelle richieste non le tocca.
var CASSA = 'calendario-coppia-1';
var PAGINA = ['./', 'manifest.webmanifest', 'icona-192.png', 'icona-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CASSA).then(function (c) { return c.addAll(PAGINA); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (k) {
    return Promise.all(k.filter(function (n) { return n !== CASSA; }).map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(function (r) {
    if (r.ok) {
      var copia = r.clone();
      caches.open(CASSA).then(function (c) { c.put(e.request, copia); });
    }
    return r;
  }).catch(function () {
    return caches.match(e.request, { ignoreSearch: true }).then(function (r) { return r || caches.match('./'); });
  }));
});
