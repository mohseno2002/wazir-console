var CACHE = "wazir-console-v14";
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
  // لا تخزّن طلبات Firebase مطلقاً (بيانات حية)
  if(url.indexOf("firebasedatabase.app") > -1 || url.indexOf("firebaseio.com") > -1) return;

  var isHTML = e.request.mode === "navigate" || url.indexOf(".html") > -1 || url.endsWith("/");
  if(isHTML){
    // network-first للصفحة: يجيب الأحدث دائماً، ويرجع للكاش فقط دون اتصال
    e.respondWith(
      fetch(e.request).then(function(res){
        if(res && res.status === 200){ var cp=res.clone(); caches.open(CACHE).then(function(c){ c.put(e.request, cp); }); }
        return res;
      }).catch(function(){ return caches.match(e.request); })
    );
    return;
  }
  // cache-first لباقي الموارد (أيقونات، مانيفست)
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
