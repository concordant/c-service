/**
 * MIT License
 *
 * Copyright (c) 2022, Concordant and contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import StoreDataSource from "./database/StoreDataSource";
import CONFIG from "./config.json";

const serverUrl = CONFIG.serverUrl;

const url = CONFIG.url;
const username = CONFIG.username;
const password = CONFIG.password;

/* eslint-disable no-undef */
self.addEventListener("install", function (event) {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

/**
 * Send an "update" message to each service worker clients
 * @param {*} doc the sent message
 */
function onChange(doc, subscriberId) {
  return self.clients
    .get(subscriberId)
    .then((client) => {
      var message = {
        type: "update",
        data: doc,
      };
      client.postMessage(JSON.stringify(message));
      return Promise.resolve(true);
    })
    .catch(() => {
      return Promise.reject(false);
    });
}

self.addEventListener("fetch", function (event) {
  if (self.db === undefined) {
    self.db = new StoreDataSource();
  }
  if (event.request.url.startsWith(serverUrl)) {
    var responseInit = {
      // status/statusText default to 200/OK, but we're explicitly setting them here.
      status: 200,
      statusText: "OK",
      headers: {
        "Content-Type": "application/json",
      },
    };
    event.respondWith(
      (async function () {
        const json = await event.request.clone().json();
        const dbName = json.appName;
        const params = {
          url,
          username,
          password,
          dbName,
        };
        let db = self.db.getOrConnect(params, onChange);
        let responseBody;
        switch (event.request.url.replace(serverUrl, "")) {
          case "create-app":
            responseBody = await db.isConnected();
            break;
          case "get-object":
            responseBody = await db.getObject(json.id);
            break;
          case "update-object":
            responseBody = await db.updateObject(json.id, json.document);
            break;
          case "subscribe":
            responseBody = await db.subscribe(
              json.collectionUId,
              event.clientId
            );
            break;
          case "unsubscribe":
            fetch(event.request);
            responseBody = await db.unsubscribe(
              json.collectionUId,
              event.clientId
            );
            break;
          default:
            return new Response("Unknown request url : " + event.request.url, {
              status: 404,
              statusText: "Not Found",
              headers: {
                "Content-Type": "application/json",
              },
            });
        }
        return new Response(JSON.stringify(responseBody), responseInit);
      })()
    );
  }
});
