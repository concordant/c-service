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

import { IContext } from "./IContext";
import { IDBHandlers } from "./IHandlers";
import { DBEventEmitter, DBHooks, Document, Key } from "./Types";

import Sync = PouchDB.Replication.Sync;

// export interface IInternalObject<T> {
//     conflicts?: string[];
// }

export interface IDBParams {
  syncHandlers?: Array<Sync<any> | undefined>;
  hooks?: DBHooks;
}

export interface IDBHooks<T> {
  conflictHandler: (current: Document<T>, objs: Array<Document<T>>) => T;
}

/**
 *  A representation of a database object that the user can interact with
 */
export interface IDBObject<T> extends IContext {
  id: string;

  /**
   * Commit the current modifications on the object
   */
  save(): Promise<IDBObject<T>>;

  /**
   * Checks if the object has local uncommitted changes
   */
  isDirty(): boolean;

  /**
   * Retrieves the current value of the object
   */
  current(): T;
}

// TODO: Interface must extend event emitter.
// TODO: BasicConnection emits events on auto save; TxConnection emits events on transaction accept and commit
export default interface IDB {
  /**
   * Register a handler that allows to intersect certain calls in the system
   * Currently it provides a ConflictHandler, which allows the programmer to
   * manage multiple conflicting versions of the same object
   */
  registerHooks(hooks: DBHooks): void;

  /**
   * Get an object from the database
   * Object is cached in the local store until release is called
   *
   * @param key - identifier of the object
   * @param defaultObjFunc - Reject promise if default object is not provided and object does not exist
   * @param  passThrough - ignore the cached value and fetch a fresh version
   * @return current object associated with the key, empty object if it doesn't exist yet.
   * Reject promise if impossible to get object or object is not of the given type.
   */

  get<T>(
    key: Key,
    defaultObjFunc?: () => T,
    passThrough?: boolean
  ): Promise<Document<T>>;

  // query TODO: Need to think more about this before making decisions. Dont forget GraphQL!

  /**
   * Delete the value associated with a key
   * Implementation might not actually delete the key, dependending on the store
   * In that case it must use some tombstone to distinguish empty value from deleted
   *
   * @param key - identifier of the object
   */
  delete(key: Key): Promise<void>;

  /**
   * Subscribes events for a given key with a given filter
   *
   * @param keyOrKeys - identifier of a single object, or an array of identifiers
   * @param filter - predicate to decide if the event should be triggered
   * @param handlers - handlers for each event type
   * @returns EventEmitter for this subscription
   */
  subscribe<T>(
    keyOrKeys: Key | Key[],
    handlers: IDBHandlers<Document<T>>,
    filter?: IFilter
  ): DBEventEmitter;

  /**
   * Stop listening to events of provided EventEmitter
   * @param eventEmitter the event emitter to to be stopped
   */
  cancel(eventEmitter: DBEventEmitter): void;

  /**
   * Release object from local store
   *
   * @param key - identifier of the object
   * @throws error if object cannot be released
   */
  release(key: Key): void | Error;

  releaseAll(): void | Error;

  /**
   * Close database
   */
  close(): Promise<void>;
}

export interface IDBEventEmitter extends EventEmitter {
  cancel(): void;
}

/**
 * An event subscription filter. Can be used to receive events only for certain predicate updates
 */
export interface IFilter {
  attributes: any;
  // TODO: This is a placeholder definition. Needs to be designed with query model in mind
}
