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

import * as WebSocket from "ws";

/**
 * A database adapter between Concordant service API and database specific API.
 */
export default interface DataSource {
  /**
   * Is connection still active.
   * @returns a promise to a boolean.
   * Reject promise if impossible to contact database.
   */
  isConnected(): Promise<boolean>;

  /**
   * Get a given object from the database.
   * @param docName unique identifier of the targeted document.
   * @returns a promise to a string object.
   * Reject promise if impossible to get object.
   */
  getObject(docName: string): Promise<string>;

  /**
   * Get all objects from the database.
   * @returns promise a promise to an array of string objects.
   * Reject promise if impossible to get objects.
   */
  getObjects(): Promise<Promise<string>[]>;

  /**
   * Update a given object with the given [value].
   * @param docName unique identifier of the targeted object.
   * @param document value to be put in the database.
   * @returns a promise to the new stored value.
   * Reject promise if impossible to update object.
   */
  updateObject(docName: string, document: string): Promise<string>;

  /**
   * Close the database.
   * @returns an empty promise.
   * Reject promise if impossible to close the database.
   */
  close(): Promise<void>;

  /**
   * Subscribe to updates.
   * @param collectionUId subscription item.
   * @param clientId subscriber id.
   * @returns true.
   */
  subscribe(collectionUId: string, clientId: string): Promise<boolean>;

  /**
   * Get the list of subscribers of a collection.
   * @param collectionUId the collection uid.
   * @returns a set of subscribers ids.
   */
  getSubscribers(collectionUId: string): Set<string> | undefined;

  /**
   * Unsubscribe to updates.
   * @param collectionUId unsubscription item.
   * @param clientId subscriber id.
   * @returns true if previously subscribed, false otherwise.
   */
  unsubscribe(collectionUId: string, clientId: string): Promise<boolean>;

  /**
   * Save the web socket of a client.
   * @param clientId id of connected client.
   * @param ws associated web socket.
   */
  addWebSocket(clientId: string, ws: WebSocket): void;

  /**
   * Get the web socket of a client.
   * @param clientId id of the client.
   * @returns the associated web socket.
   */
  getWebSocket(clientId: string): WebSocket | undefined;

  /**
   * Unsave the web socket of a client.
   * @param clientId client id.
   */
  removeWebSocket(clientId: string): void;
}
