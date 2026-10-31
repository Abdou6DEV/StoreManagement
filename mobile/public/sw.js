const CACHE_PREFIX = "reda-mobile-shell-";
const SCOPE_URL = new URL(self.registration.scope);
const SHELL_URL = new URL("./", SCOPE_URL);
const READY_URL = new URL("__cache_ready__", SCOPE_URL);

async function getBuildCacheName(html) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(html),
  );
  const buildId = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  )
    .join("")
    .slice(0, 16);
  return `${CACHE_PREFIX}${buildId}`;
}

async function getCurrentCache() {
  const names = (await caches.keys()).filter((name) =>
    name.startsWith(CACHE_PREFIX),
  );
  for (const name of names.reverse()) {
    const cache = await caches.open(name);
    if (await cache.match(READY_URL)) return cache;
  }
  return null;
}

function isAppAsset(url) {
  return (
    url.origin === SCOPE_URL.origin &&
    url.pathname.startsWith(`${SCOPE_URL.pathname}assets/`)
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // Vite's built HTML contains content-hashed asset URLs. Its hash gives
      // each deployed app build an isolated cache without manual version bumps.
      const shellResponse = await fetch(SHELL_URL, { cache: "no-store" });
      if (!shellResponse.ok) {
        throw new Error(`Unable to fetch PWA shell: ${shellResponse.status}`);
      }

      const html = await shellResponse.clone().text();
      const cacheName = await getBuildCacheName(html);
      const cache = await caches.open(cacheName);
      await cache.put(SHELL_URL, shellResponse.clone());

      // Pre-cache the entry JS/CSS so the PWA can start offline after install.
      const assetUrls = new Set();
      const attributePattern = /(?:src|href)=["']([^"']+)["']/g;
      for (const match of html.matchAll(attributePattern)) {
        const assetUrl = new URL(match[1], SHELL_URL);
        if (isAppAsset(assetUrl)) assetUrls.add(assetUrl.href);
      }

      await Promise.all(
        Array.from(assetUrls, async (assetUrl) => {
          const response = await fetch(assetUrl, { cache: "no-store" });
          if (!response.ok) {
            throw new Error(`Unable to precache PWA asset: ${assetUrl}`);
          }
          await cache.put(assetUrl, response);
        }),
      );

      // A cache is eligible for use only after the complete shell is cached.
      await cache.put(READY_URL, new Response("ready"));
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = (await caches.keys()).filter((name) =>
        name.startsWith(CACHE_PREFIX),
      );
      let currentName = null;
      for (const name of names.reverse()) {
        const cache = await caches.open(name);
        if (await cache.match(READY_URL)) {
          currentName = name;
          break;
        }
      }
      await Promise.all(
        names
          .filter((name) => name !== currentName)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== SCOPE_URL.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await getCurrentCache();
          const shell = cache ? await cache.match(SHELL_URL) : null;
          return shell || Response.error();
        }
      })(),
    );
    return;
  }

  // Cache only Vite's fingerprinted assets. API, auth, arbitrary GET, and
  // HTML responses are deliberately excluded from runtime caching.
  if (!isAppAsset(url)) return;

  event.respondWith(
    (async () => {
      const cache = await getCurrentCache();
      const cached = cache ? await cache.match(request) : null;
      if (cached) return cached;

      const response = await fetch(request);
      if (response.ok && cache) {
        await cache.put(request, response.clone());
      }
      return response;
    })(),
  );
});
