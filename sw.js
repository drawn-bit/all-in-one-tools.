/* =========================================================
   VEXORA service worker
   Menyajikan isi ZIP tools (yang sudah di-ekstrak ke Cache Storage)
   di alamat virtual  <folder-situs>/__vx/<toolId>-<versi>/...
   Selain alamat itu, semua request dibiarkan lewat seperti biasa.
   ========================================================= */
const CACHE = "vexora-tools-v1";
const PREFIX = new URL("__vx/", self.registration.scope).pathname;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;
  if (request.method !== "GET" && request.method !== "HEAD") return;

  // Alamat virtual tools: dilayani dari Cache Storage.
  if (url.pathname.startsWith(PREFIX)) {
    event.respondWith(serve(request, url));
    return;
  }

  // Tools sering memakai path absolut seperti /style.css atau /assets/app.js.
  // Kalau permintaan datang dari dalam sebuah tools, cari dulu di isi ZIP tools itu.
  const origin = self.location.origin;
  const refPrefix = origin + PREFIX;
  const referrer = request.referrer || "";

  if (referrer.startsWith(refPrefix)) {
    const toolDir = referrer.slice(refPrefix.length).split("/")[0];

    if (toolDir) {
      const scopePath = new URL(self.registration.scope).pathname;
      let rest = url.pathname;

      if (scopePath !== "/" && rest.startsWith(scopePath)) {
        rest = rest.slice(scopePath.length);
      } else {
        rest = rest.replace(/^\/+/, "");
      }

      const mapped = new URL(PREFIX + toolDir + "/" + rest, origin);

      event.respondWith(
        (async () => {
          const cache = await caches.open(CACHE);
          const hit =
            (await cache.match(mapped.origin + mapped.pathname)) ||
            (rest.endsWith("/") || rest === ""
              ? await cache.match(mapped.origin + mapped.pathname + "index.html")
              : null);

          if (hit) return serve(request, mapped);

          return fetch(request);
        })()
      );
    }
  }
});

async function serve(request, url) {
  try {
    const cache = await caches.open(CACHE);

    let path = url.origin + url.pathname;
    let response = await cache.match(path);

    // Alamat folder -> index.html
    if (!response && path.endsWith("/")) {
      response = await cache.match(path + "index.html");
    }

    if (!response) {
      return new Response("File tidak ditemukan di dalam ZIP tools.", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    const range = request.headers.get("Range");

    if (!range) return response;

    // Dukungan Range (video/audio bisa di-seek)
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!match) return response;

    const blob = await response.blob();
    const size = blob.size;

    let start = match[1] === "" ? NaN : Number(match[1]);
    let end = match[2] === "" ? NaN : Number(match[2]);

    if (Number.isNaN(start)) {
      // bytes=-N  (N byte terakhir)
      start = Math.max(0, size - end);
      end = size - 1;
    } else if (Number.isNaN(end) || end >= size) {
      end = size - 1;
    }

    if (start > end || start >= size) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": "bytes */" + size }
      });
    }

    return new Response(blob.slice(start, end + 1), {
      status: 206,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") || "application/octet-stream",
        "Content-Range": "bytes " + start + "-" + end + "/" + size,
        "Content-Length": String(end - start + 1),
        "Accept-Ranges": "bytes"
      }
    });
  } catch (error) {
    return new Response("Gagal membuka tools: " + error.message, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
}
