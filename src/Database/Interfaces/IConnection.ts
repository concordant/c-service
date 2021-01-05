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

import { IDBSaveAllHandlers, IDBTxHandlers } from "./IHandlers";
import IOfflineSupport from "./IOfflineSupport";
import { Connection, DBHooks, Key } from "./Types";

/**
 * Database connection factory
 */
export interface IDataSource {
  /**
   *  Starts a new non-transactional session with the database
   *  Read operations always retrieve the most recent version of an object
   */
  connection(params: IConnectionParams): Promise<Connection>;

  /**
   * Starts a new transactional session with the database
   * Read operations retrieve object versions based on a snapshot.
   * @return a ITxConnection
   */
  txConnection(): Promise<ITxConnection>; // €
}

export interface IConnectionParams {
  autoSave?: boolean;
  handleConflicts?: boolean;
  hook?: DBHooks;
  putRetriesBeforeError?: number;
  putRetryMaxTimeout?: number;
}

/**
 * A Connection establishes a channel to query the database
 * Different types of connections can have different types of guarantees
 * @comment Channels might be a more appropriate name
 */
export interface IBasicConnection extends IOfflineSupport {
  /**
   * Calls save for every object in cache that has outstanding operations
   */
  saveAll(): IDBSaveAllHandlers;

  /**
   * Discard local updates for object with given key
   * @param key - identifier of the object
   */
  discard(key: Key): void;

  /**
   * Discard local updates for all objects in cache
   */
  discardAll(): void;

  /**
   * All objects automatically call save when their state changes
   */
  setAutoSave(): void;
}

/**
 * Establishes a transactional session with the database.
 * Aims to provide a general interface that programmers can use to delimit transactions
 */
export default interface ITxConnection extends IOfflineSupport {
  /**
   * Begins a new transactions.
   * @throws Error if a transaction is undergoing
   */
  begin(): void | Error;

  commit(): IDBTxHandlers;
}
