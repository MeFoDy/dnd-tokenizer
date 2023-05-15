// Source: https://github.com/tomayac/SVGcode/blob/main/public/share-target/sharetargetsw.js

const CACHE_NAME = 'share-target-cache';
const ALL_CACHES = [CACHE_NAME];

self.addEventListener('install', (installEvent) => {
    installEvent.waitUntil(
        (async () => {
            await caches.open(CACHE_NAME);
            self.skipWaiting();
        })()
    );
});

self.addEventListener('activate', (activateEvent) => {
    activateEvent.waitUntil(
        (async () => {
            const cacheKeys = await caches.keys();
            await Promise.all(
                cacheKeys.map(async (cacheKey) => {
                    if (!ALL_CACHES.includes(cacheKey)) {
                        await caches.delete(cacheKey);
                    }
                })
            );
            self.clients.claim();
        })()
    );
});

self.addEventListener('fetch', (fetchEvent) => {
    if (
        fetchEvent.request.url.endsWith('/share-target/') &&
        fetchEvent.request.method === 'POST'
    ) {
        return fetchEvent.respondWith(
            (async () => {
                const formData = await fetchEvent.request.formData();
                const image = formData.get('image');
                const keys = await caches.keys();
                const sharedCache = await caches.open(
                    keys.filter((key) => key.startsWith('share-target'))[0]
                );
                await sharedCache.put('shared-image', new Response(image));
                return Response.redirect('./?share-target', 303);
            })()
        );
    }
});
