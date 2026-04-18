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
    "revision": "3d80fe8882d96b79b78989faee062706"
  }, {
    "url": "index.html",
    "revision": "44157ab16cb10f1967617518f37fcfe4"
  }, {
    "url": "favicon.png",
    "revision": "bded9006240c02849570f21f32689383"
  }, {
    "url": "favicon.ico",
    "revision": "9accbc416b9f6e77327316082dc07a0f"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "c899ae9b6f501c0f55a567cb28cab7b9"
  }, {
    "url": "quiz-frogs/seven-frogs.svg",
    "revision": "d9a67c75d4c948493f458e0fac45ef67"
  }, {
    "url": "quiz-frogs/mocha.svg",
    "revision": "6f5be6d140b1b72057ad1dfb30399f6e"
  }, {
    "url": "quiz-frogs/matcha.svg",
    "revision": "4e207c053e3ad8f41c3f914ce500433d"
  }, {
    "url": "quiz-frogs/latte.svg",
    "revision": "398fb1fc0df8bad8eeb8d2174e8b598c"
  }, {
    "url": "quiz-frogs/hand-drip.svg",
    "revision": "3adb39ab4e12a462359deee8139917ee"
  }, {
    "url": "quiz-frogs/espresso.svg",
    "revision": "e463df4f2cd83d05a86ac519419a7084"
  }, {
    "url": "quiz-frogs/dirty.svg",
    "revision": "a7a98f6f82e35e58ea39e92afebe3327"
  }, {
    "url": "quiz-frogs/cold-brew.svg",
    "revision": "99394444659e823df09a2c5f95986c4d"
  }, {
    "url": "quiz-frogs/americano.svg",
    "revision": "1fb8fec8abd71770847f73700e1cbaff"
  }, {
    "url": "quiz-frogs/americano-bw.svg",
    "revision": "7793f1c81225d58c29f303eb0635bad1"
  }, {
    "url": "q/share/mocha.html",
    "revision": "0dabf78c8c730e7b2aad46bb0ba7ce3b"
  }, {
    "url": "q/share/matcha.html",
    "revision": "8c668f35a75ebe8c824e7f736eb24aac"
  }, {
    "url": "q/share/latte.html",
    "revision": "d04da97191939169ecfbcf3bb31e016f"
  }, {
    "url": "q/share/hand-drip.html",
    "revision": "9d4dd778364ce5797790fceb625c508e"
  }, {
    "url": "q/share/espresso.html",
    "revision": "9d5bbe5b7940069bbd24dd2ec9de3712"
  }, {
    "url": "q/share/dirty.html",
    "revision": "00d8d04eb4d2b01213cfa66e6e8ed343"
  }, {
    "url": "q/share/cold-brew.html",
    "revision": "d39c01da58f41879ce3f82184d5d81c7"
  }, {
    "url": "og-quiz/mocha.png",
    "revision": "76ee7c38ea8faa879a8d9300dd2545a7"
  }, {
    "url": "og-quiz/matcha.png",
    "revision": "4d36e5c7716aad36825c54399c56e504"
  }, {
    "url": "og-quiz/latte.png",
    "revision": "b74c16cf2d986c6ac66744b5dcc44984"
  }, {
    "url": "og-quiz/hand-drip.png",
    "revision": "890c7fe0a33d7a9fd3b50f17f90c697b"
  }, {
    "url": "og-quiz/espresso.png",
    "revision": "149d6287071955a1c77891c2e6936cbd"
  }, {
    "url": "og-quiz/dirty.png",
    "revision": "4e845c777f92622454e228a4cbe3444c"
  }, {
    "url": "og-quiz/cold-brew.png",
    "revision": "6617e8c19249e0a58158da1eee0a5f3c"
  }, {
    "url": "icons/icon-maskable-512.png",
    "revision": "b52fa36f76f5fa573e63e70421155a73"
  }, {
    "url": "icons/icon-maskable-192.png",
    "revision": "54d16b8fa1f17d2ba6e063f58ada4daf"
  }, {
    "url": "icons/icon-512.png",
    "revision": "8a1024828355f0bc970a368e6c353a0d"
  }, {
    "url": "icons/icon-192.png",
    "revision": "5fc6aeae06b9db2271987300d0f9b8e3"
  }, {
    "url": "brand/logo-source.png",
    "revision": "b97b61357cd99cfaaf6342f3f86da238"
  }, {
    "url": "brand/coffeebro-frog.png",
    "revision": "9f9a53f760b47cff2b42d379b837624f"
  }, {
    "url": "brand/app-mark.png",
    "revision": "9653e59371e12a7e2187c0a935d0d19c"
  }, {
    "url": "assets/index-CBXcCTXl.js",
    "revision": null
  }, {
    "url": "assets/index-BaNtVwub.css",
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
