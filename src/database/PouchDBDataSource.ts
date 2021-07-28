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

import * as WebSocket from "ws";
import { crdtlib } from "@concordant/c-crdtlib";
import DataSource from "./DataSource";
import PouchDB from "pouchdb";

/**
 * Parameters for PouchDB database.
 */
export interface PouchDBParams {
  dbName: string;
  username?: string;
  password?: string;
  url?: string;
}

/**
 * A database adapter between Concordant service API and PouchDB specific API.
 */
export default class PouchDBDataSource implements DataSource {
  /**
   * PouchDB client adapter.
   */
  private database: PouchDB.Database;

  /**
   * Map of subscription items to subscribers.
   */
  private followers: Map<string, Set<string>>;

  /**
   * Map of client ID to associated Web Socket.
   */
  private webSockets: Map<string, WebSocket>;

  /**
   * Default constructor.
   * @param params parameters for PouchDB database.
   * @param setChange set live changes feed.
   * @param remoteDB synchronize with a remote PouchDB database.
   * @param onChange callback when a change occurs.
   */
  constructor(
    params: PouchDBParams,
    setChange: boolean,
    remoteDB?: PouchDBDataSource,
    onChange?: (doc: string, subscribers: string) => Promise<boolean>
  ) {
    const { dbName, url, username, password } = params;

    if (url === undefined) {
      this.database = new PouchDB(dbName);
    } else {
      const slash = url.slice(-1) === "/" ? "" : "/";
      this.database = new PouchDB(url + slash + dbName, {
        auth: { username, password },
      });
    }
    if (remoteDB !== undefined) {
      this.sync(remoteDB);
    }
    if (setChange) {
      this.database
        .changes({ live: true, since: "now", include_docs: true })
        .on("change", (change) => {
          const obj = JSON.parse(change.id);
          if (onChange === undefined) {
            this.getSubscribers(obj.collectionUId)?.forEach((subscriberId) => {
              const ws = this.getWebSocket(subscriberId);
              if (ws) {
                ws.send(JSON.stringify(change.doc), (error) => {
                  if (error) {
                    this.removeWebSocket(subscriberId);
                    this.unsubscribe(obj.collectionUId, subscriberId);
                  }
                });
              }
            });
          } else {
            this.getSubscribers(obj.collectionUId)?.forEach((subscriberId) => {
              onChange(JSON.stringify(change.doc), subscriberId).catch(() => {
                this.unsubscribe(obj.collectionUId, subscriberId);
              });
            });
          }
        });
    }
    this.followers = new Map();
    this.webSockets = new Map();
  }

  /**
   * Is connection still active.
   * @returns a promise to a boolean.
   * Reject promise if impossible to contact database.
   */
  public isConnected(): Promise<boolean> {
    return this.database
      .info()
      .then(() => Promise.resolve(true))
      .catch((error) => Promise.reject(error));
  }

  /**
   * Perform bidirectional replication between the local database and the remote database.
   * @param remoteDB the remote PouchDB database.
   */
  private sync(remoteDB: PouchDBDataSource) {
    this.database.sync(remoteDB.database, {
      live: true,
      retry: true,
    });
  }

  /**
   * Get a given object from the database.
   * @param docName unique identifier of the targeted document.
   * @returns a promise to a string object.
   * Reject promise if impossible to get object.
   */
  public getObject(docName: string): Promise<string> {
    return this.database
      .info()
      .then((body) => {
        return this.database
          .get(docName)
          .then((body) => Promise.resolve(JSON.stringify(body)))
          .catch((error) => {
            try {
              const objectUId = JSON.parse(docName);
              const newCrdt =
                crdtlib.crdt.DeltaCRDTFactory.Companion.createDeltaCRDT(
                  objectUId.type
                );
              return Promise.resolve(newCrdt.toJson());
            } catch (error) {
              return Promise.reject(error);
            }
          });
      })
      .catch((error) => Promise.reject(error));
  }

  /**
   * Get all objects from the database.
   * @returns promise a promise to an array of string objects.
   * Reject promise if impossible to get objects.
   */
  public getObjects(): Promise<Promise<string>[]> {
    return this.database
      .info()
      .then((body) => {
        return this.database
          .allDocs()
          .then((objs) => objs.rows.map((obj) => this.getObject(obj.id)))
          .catch((error) => Promise.reject(error));
      })
      .catch((error) => Promise.reject(error));
  }

  /**
   * Update a given object with the given [value].
   * @param docName unique identifier of the targeted object.
   * @param document value to be put in the database.
   * @returns a promise to the new stored value.
   * Reject promise if impossible to update object.
   */
  public updateObject(docName: string, document: string): Promise<string> {
    return this.database
      .info()
      .then((body) => {
        return this.database
          .get(docName)
          .then((body) => {
            try {
              const CRDT = crdtlib.crdt.DeltaCRDT.Companion.fromJson(
                document.replace(/\\'/g, "'")
              );
              const bodyCRDT = crdtlib.crdt.DeltaCRDT.Companion.fromJson(
                JSON.stringify(body)
              );
              bodyCRDT.merge(CRDT);
              const newDocument = JSON.parse(bodyCRDT.toJson());
              newDocument._id = docName;
              newDocument._rev = body._rev;
              return this.database
                .put(newDocument)
                .then(() => {
                  return "OK";
                })
                .catch((error) => {
                  return this.updateObject(docName, document);
                });
            } catch (error) {
              return Promise.reject(error);
            }
          })
          .catch((error) => {
            try {
              const newDocument = JSON.parse(document.replace(/\\'/g, "'"));
              newDocument._id = docName;
              return this.database
                .put(newDocument)
                .then(() => "OK")
                .catch((err) => {
                  if (err.name === "conflict") {
                    return this.updateObject(docName, document);
                  } else {
                    return Promise.reject(err);
                  }
                });
            } catch (error) {
              return Promise.reject(error);
            }
          });
      })
      .catch((error) => Promise.reject(error));
  }

  /**
   * Close the database.
   * @returns an empty promise.
   * Reject promise if impossible to close the database.
   */
  public close(): Promise<void> {
    return this.database
      .close()
      .then()
      .catch((error) => Promise.reject(error));
  }

  /**
   * Subscribe to updates.
   * @param collectionUId subscription item.
   * @param clientId subscriber id.
   * @returns true.
   */
  public subscribe(collectionUId: string, clientId: string): Promise<boolean> {
    if (this.followers.get(collectionUId) === undefined) {
      this.followers.set(collectionUId, new Set());
    }
    this.followers.get(collectionUId)?.add(clientId);
    return Promise.resolve(true);
  }

  /**
   * Get the list of subscribers of a collection.
   * @param collectionUId the collection uid.
   * @returns a set of subscribers ids.
   */
  public getSubscribers(collectionUId: string): Set<string> | undefined {
    return this.followers.get(collectionUId);
  }

  /**
   * Unsubscribe to updates.
   * @param collectionUId unsubscription item.
   * @param clientId subscriber id.
   * @returns true if previously subscribed, false otherwise.
   */
  public unsubscribe(
    collectionUId: string,
    clientId: string
  ): Promise<boolean> {
    const follows = this.followers.get(collectionUId);
    return follows
      ? Promise.resolve(follows.delete(clientId))
      : Promise.resolve(false);
  }

  /**
   * Save the web socket of a client.
   * @param clientId id of connected client.
   * @param ws associated web socket.
   */
  public addWebSocket(clientId: string, ws: WebSocket): void {
    this.webSockets.set(clientId, ws);
  }

  /**
   * Get the web socket of a client.
   * @param clientId id of the client.
   * @returns the associated web socket.
   */
  public getWebSocket(clientId: string): WebSocket | undefined {
    return this.webSockets.get(clientId);
  }

  /**
   * Unsave the web socket of a client.
   * @param clientId client id.
   */
  public removeWebSocket(clientId: string): void {
    this.webSockets.delete(clientId);
  }
}
