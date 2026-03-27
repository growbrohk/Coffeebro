/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-ca84f546'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "profile-frog-hero.png",
    "revision": "aacebd77c0843e497bef26336a39ef8d"
  }, {
    "url": "placeholder.svg",
    "revision": "35707bd9960ba5281c72af927b79291f"
  }, {
    "url": "og-image.png",
    "revision": "b1b6896e6edfddeaf0db005f30919862"
  }, {
    "url": "index.html",
    "revision": "8ca4221d05eb5735878ee7bc2b367727"
  }, {
    "url": "favicon.png",
    "revision": "5af3cae3d4bcf968e90a16bec0ff714d"
  }, {
    "url": "favicon.ico",
    "revision": "5af3cae3d4bcf968e90a16bec0ff714d"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "454324a36e277508bcc7a7b1b9d2fdee"
  }, {
    "url": "icons/icon-maskable-512.png",
    "revision": "31ca53808b22e8e4b3232b47a0dedb26"
  }, {
    "url": "icons/icon-maskable-192.png",
    "revision": "5c4ecb52b1e6c19d4cb438eae0eb77f1"
  }, {
    "url": "icons/icon-512.png",
    "revision": "31ca53808b22e8e4b3232b47a0dedb26"
  }, {
    "url": "icons/icon-192.png",
    "revision": "5c4ecb52b1e6c19d4cb438eae0eb77f1"
  }, {
    "url": "assets/index-DfoisMEg.js",
    "revision": null
  }, {
    "url": "assets/index-DVYsUX7b.css",
    "revision": null
  }, {
    "url": "assets/hunt-pin-star-Da2i0JzL.svg",
    "revision": null
  }, {
    "url": "assets/coffee-shop-pin-BCde-HmC.svg",
    "revision": null
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("/index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
