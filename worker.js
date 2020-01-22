"use strict";

// https://developers.google.com/web/fundamentals/primers/service-workers/

const CACHE_NAME = "plq";

// const urlsToCache = [ /*"index.html", "index.css", "index.js"*/ ];

// self.addEventListener("install", e =>
//   e.waitUntil(caches.open(CACHE_NAME)
//               .then(cache => cache.addAll(urlsToCache))
//               // .then(() => console.log("cache populated"))
//              ));

self.addEventListener("fetch", e => (
  e.respondWith(
    fetch(e.request)
    // caches.match(e.request.url.replace(/\/$/, "/index.html"))
    //   // .then(cached => (console.log("cache:", e.request, "=>", cached),
    //   //                  cached))
    //   .then(cached => cached || fetch(e.request))
  )));

// to clear: caches.delete("plq")
