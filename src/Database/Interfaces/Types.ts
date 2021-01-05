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

/**
 * This is the default API Types interface,
 * it must be the only way to export types.
 */

/**
 * A pointer to a database object.
 * @Comment Firebase uses paths, e.g. "/users/userId", this might be
 * better if we want to allow direct access to sub collections,
 * e.g. "/users/userId/friends" --- I do not address object querying in this document
 * We also must consider GraphQL interface, that is what FaunaDB is doing.
 * I've walked a few steps on that direction myself. I think its doable... but something for after the MVP
 */
import ITxConnection, { IBasicConnection, IDataSource } from "./IConnection";
import IDB, { IDBEventEmitter, IDBHooks, IDBParams } from "./IDB";
import { IDBSaveAllHandlers, IDBTxHandlers } from "./IHandlers";
import IRegister from "./IRegister";

export type DataSource = IDataSource;
export type Connection = IBasicConnection | ITxConnection;
export type Database = IDB;
export type DBTxHandler = IDBTxHandlers;
export type DBSaveAllHandler = IDBSaveAllHandlers;
export type DBEventEmitter = IDBEventEmitter;
export type DBHooks = IDBHooks<any>;
export type DBParams = IDBParams;
// export type InternalObject<T> = IInternalObject<T>;
export type Document<T> = IRegister<T>;

export type Key = string | { key: string; bucket: string };

export type EventType = "UPDATE";
