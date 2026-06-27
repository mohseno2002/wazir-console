var CACHE = "wazir-console-v1";
var CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

self.addEventListener("install", function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(CORE).catch(function(){}); }));
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){ if(k!==CACHE) return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  if(e.request.method !== "GET") return;
  var url = e.request.url;
  // لا تتدخّل في تطبيقات github.io الخارجية المفتوحة داخل iframe
  if(url.indexOf("github.io") > -1 && url.indexOf(self.location.host) < 0) return;
  e.respondWith(
    caches.open(CACHE).then(function(c){
      return c.match(e.request).then(function(hit){
        var net = fetch(e.request).then(function(res){
          if(res && res.status === 200){ c.put(e.request, res.clone()); }
          return res;
        }).catch(function(){ return hit; });
        return hit || net;
      });
    })
  );
});
