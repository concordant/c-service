/**
 * MIT License
 *
 * Copyright (c) 2020, Concordant and contributors
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

import PouchDBDataSource from "./database/PouchDBDataSource.ts";
import CONFIG from "./config.json";

const serverUrl = CONFIG.serverUrl;

const url = CONFIG.url;
const username = CONFIG.username;
const password = CONFIG.password;

/* eslint-disable no-undef */
self.addEventListener("install", function (event) {
  self.db = {};
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

function connectDB(dbName) {
  const localDB = new PouchDBDataSource({ dbName });

  const params = {
    url,
    username,
    password,
    dbName,
  };
  const remoteDB = new PouchDBDataSource(params);
  localDB.sync(remoteDB);

  self.db[dbName] = localDB;
}

self.addEventListener("fetch", function (event) {
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
        return event.request.json().then((json) => {
          const requestType = event.request.url.replace(serverUrl, "");
          if (!self.db[json.appName]) {
            connectDB(json.appName);
          }
          switch (requestType) {
            case "create-app":
              return self.db[json.appName]
                .isConnected()
                .then((responseBody) => {
                  return new Response(
                    JSON.stringify(responseBody),
                    responseInit
                  );
                });
            case "get-object":
              return self.db[json.appName]
                .getObject(json.id)
                .then((responseBody) => {
                  return new Response(
                    JSON.stringify(responseBody),
                    responseInit
                  );
                });
            case "update-object":
              return self.db[json.appName]
                .updateObject(json.id, json.document)
                .then((responseBody) => {
                  return new Response(
                    JSON.stringify(responseBody),
                    responseInit
                  );
                });
            default:
              return new Response("Wrong request type : " + requestType, {
                status: 404,
                statusText: "Not Found",
                headers: {
                  "Content-Type": "application/json",
                },
              });
          }
        });
      })()
    );
  }
});
