// File: src/service-worker.js

const CACHE_NAME = 'seraa-cache-v3'; // Version bump to trigger re-caching
const URLS_TO_CACHE = [
    // Root of our app scope is now /src/
    '/',
    '/index.html',
    '/app.html',

    // Styles
    '/assets/styles/styles.css',

    // Scripts
    '/src/app.js',
    '/src/db.js',
    '/src/key_manager.js',
    '/src/context_builder.js',
    '/src/api.js',
    'https://cdn.jsdelivr.net/npm/idb@7/build/index.min.js', // Cache the CDN library

    // Manifest
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
    self.skipWaiting(); // Force the new service worker to activate
});

self.addEventListener('activate', event => {
    // Clean up old caches
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
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