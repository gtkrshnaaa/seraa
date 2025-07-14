const CACHE_NAME = 'seraa-cache-v1';
const URLS_TO_CACHE = [
    '/',
    '/index.html',
    '/app.html',
    '/styles.css',
    '/app.js',
    '/db.js',
    '/key_manager.js',
    '/context_builder.js',
    '/api.js',
    '/manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(URLS_TO_CACHE);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                // Not in cache - fetch from network
                return fetch(event.request);
            })
    );
});