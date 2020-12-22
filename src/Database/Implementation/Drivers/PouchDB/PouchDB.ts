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
import { promiseDelay } from "../../../../Utils/Utils";
import { IBasicConnection } from "../../../Interfaces/IConnection";
import { IFilter } from "../../../Interfaces/IDB";
import { IDBHandlers, IDBSaveAllHandlers } from "../../../Interfaces/IHandlers";
import {
  DBEventEmitter,
  DBHooks,
  DBParams,
  Document,
  Key,
} from "../../../Interfaces/Types";
import PouchDBDataSource, {
  ConnectionParams,
} from "./DataSource/PouchDBDataSource";
import PouchDBObject from "./DataTypes/PouchDBObject";
import PouchError = PouchDB.Core.Error;
import PouchDocument = PouchDB.Core.Document;
import ExistingDocument = PouchDB.Core.ExistingDocument;
import Response = PouchDB.Core.Response;
import AllDocsMeta = PouchDB.Core.AllDocsMeta;
import Database = PouchDB.Database;

const CHANGE_EVENT = "change";
const NOT_FOUND_ERROR_CODE = 404;
const CONFLICT_ERROR_CODE = 409;

const DEFAULT_RETRY_MAX_TIMEOUT = 500; // ms

export default class PouchDB implements IBasicConnection {
  protected static convertKeyToId(key: Key): string {
    if (typeof key === "string") {
      return key;
    } else if (!key.key) {
      throw Error("Object must have a defined key");
    }
    return `${key.bucket}_${key.key}`;
  }

  // private eventEmitter: EventEmitter;
  private connection: Database;
  private subscriptions: DBEventEmitter[];
  // lastSeq is the seq from the last received change.
  private handlers: Array<{
    handlers: IDBHandlers<Document<any>>;
    docIds: string[];
    lastSeq: number;
  }> = [];

  constructor(
    private dataSource: PouchDBDataSource,
    private connectionParams: ConnectionParams,
    private params: DBParams
  ) {
    this.connection = dataSource.db;
    this.subscriptions = [];
  }

  // TODO: Add support for multiple handlers per hook
  public registerHooks(hooks: DBHooks): void {
    this.params.hooks = hooks;
  }

  public isConnected(): Promise<boolean> {
    return this.connection
      .info()
      .then(() => true)
      .catch(() => Promise.reject(new Error("Couldn't Connect to server")));
  }

  public isOnline(): boolean {
    return this.dataSource.activeRemotes().length !== 0;
  }

  // TODO: use waitFlush safety
  public goOffline(waitFlush?: boolean): Promise<void> {
    return this.dataSource.disconnect();
  }

  // TODO: use waitFlush safety
  public goOnline(waitFlush?: boolean): Promise<void> {
    return Promise.resolve(this.dataSource.connect());
  }

  public get<T>(
    key: Key,
    defaultObjFunc?: () => T,
    passThrough?: boolean
  ): Promise<PouchDBObject<T>> {
    const { handleConflicts } = this.connectionParams;
    if (passThrough) {
      return Promise.reject("Not Implemented");
    }

    const getParams = { conflicts: handleConflicts };
    const convertedKey = PouchDB.convertKeyToId(key);

    return this.connection
      .get<T>(convertedKey, getParams)
      .then((obj) => this.handleGetResponse(obj))
      .catch((error: PouchError) => {
        if (
          error.status === NOT_FOUND_ERROR_CODE &&
          defaultObjFunc !== undefined &&
          defaultObjFunc !== null
        ) {
          return this.create<T>(key, defaultObjFunc());
        }
        return Promise.reject(error);
      });
  }

  public save<T>(obj: PouchDBObject<T>): Promise<PouchDBObject<T>> {
    return this.saveInternal(obj, 0);
  }

  public saveInternal<T>(
    obj: PouchDBObject<T>,
    retryCount: number
  ): Promise<PouchDBObject<T>> {
    const {
      putRetriesBeforeError = 0,
      putRetryMaxTimeout = DEFAULT_RETRY_MAX_TIMEOUT,
    } = this.connectionParams;
    return Promise.all(
      obj.conflicts.map((c) => {
        return this.connection.remove(obj.id, c);
      })
    )
      .then(() => this.connection.put(obj.current()))
      .then(
        (resp: Response) =>
          new PouchDBObject<T>(
            { _id: resp.id, _rev: resp.rev, ...obj.current() },
            this
          )
      )
      .catch((error: PouchError) => {
        if (
          error.status === CONFLICT_ERROR_CODE &&
          putRetriesBeforeError &&
          retryCount < putRetriesBeforeError
        ) {
          return promiseDelay(Math.random() * putRetryMaxTimeout)
            .then(() => this.get<T>(obj.id))
            .then((objConflicting) => {
              return this.saveInternal<T>(
                objConflicting.updateNoSideEffects(obj.current()),
                retryCount + 1
              );
            });
        }
        return Promise.reject(error);
      });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public delete(key: Key): Promise<void> {
    return Promise.reject("Not Implemented");
  }

  // TODO: use filtring arg, Needs to be designed with query model in mind.
  public subscribe<T>(
    keyOrKeys: Key | Key[],
    handlers: IDBHandlers<Document<T>>,
    filter?: IFilter
  ): DBEventEmitter {
    let docIds: string[];
    const { handleConflicts } = this.connectionParams;

    if (keyOrKeys instanceof Array) {
      docIds = keyOrKeys.map((k) => PouchDB.convertKeyToId(k));
    } else if (typeof keyOrKeys === "string") {
      const keyString = PouchDB.convertKeyToId(keyOrKeys);
      docIds = [keyString];
    } else {
      throw Error("Keys bad format");
    }

    const changes = this.connection.changes<T>({
      doc_ids: docIds,
      include_docs: true,
      live: true,
      since: "now",
    });

    // Stores the handler definition. Might be useful.
    const handler = { handlers, docIds, lastSeq: 0 };
    this.handlers.push(handler);

    if (handlers.change) {
      changes.on(CHANGE_EVENT, (change) => {
        const callChangeHandler = (obj: PouchDBObject<T>) => {
          if (handlers.change && change.doc) {
            handlers.change(obj.id, obj);
          }
        };

        if (change.seq !== undefined && typeof change.seq === "number") {
          handler.lastSeq = Math.max(handler.lastSeq, change.seq);
        }
        if (change.doc) {
          if (handleConflicts) {
            const getParams = { conflicts: handleConflicts };
            this.connection
              .get<T>(change.doc._id, getParams)
              .then((obj) => this.handleGetResponse(obj))
              .then((obj) => {
                callChangeHandler(obj);
              });
          } else {
            callChangeHandler(new PouchDBObject(change.doc, this));
          }
        }
      });
    }

    this.subscriptions.push(changes);
    return changes;
  }

  public cancel(sub: DBEventEmitter): void {
    const idx = this.subscriptions.findIndex((e) => e === sub);
    if (idx >= 0) {
      this.subscriptions.splice(idx, 1);
      sub.cancel();
    }
  }

  public saveAll(): IDBSaveAllHandlers {
    throw Error("Not Implemented");
    return {};
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public release(key: Key): void | Error {
    throw Error("Not Implemented");
  }

  public releaseAll(): void | Error {
    throw Error("Not Implemented");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public discard(key: Key): void | Error {
    throw Error("Not Implemented");
  }

  public discardAll(): void | Error {
    throw Error("Not Implemented");
  }

  public setAutoSave(): void | Error {
    throw Error("Not Implemented");
  }

  public close(): Promise<void> {
    Object.values(this.subscriptions).forEach((v: DBEventEmitter) =>
      v.cancel()
    );
    return this.dataSource.close();
  }

  public isAutoSave(): boolean {
    const { autoSave } = this.connectionParams;
    return autoSave || false;
  }

  public isHandleConflicts(): boolean {
    const { handleConflicts } = this.connectionParams;
    return handleConflicts || false;
  }

  private create<T>(key: Key, obj: T): Promise<PouchDBObject<T>> {
    const doc = obj as PouchDocument<T> & ExistingDocument<T>;
    doc._id = PouchDB.convertKeyToId(key);
    return this.connection.put(doc).then((resp: Response) => {
      doc._rev = resp.rev;
      return new PouchDBObject(doc, this);
    });
  }

  private handleGetResponse<T>(
    objIn: ExistingDocument<T> & AllDocsMeta
  ): Promise<PouchDBObject<T>> {
    const { hooks } = this.params;
    const { handleConflicts } = this.connectionParams;
    const getParams = { conflicts: handleConflicts };
    return Promise.resolve(
      new PouchDBObject<T>(objIn, this, objIn._conflicts || [])
    ).then((obj) => {
      if (obj.conflicts.length > 0) {
        if (!hooks || !hooks.conflictHandler) {
          return Promise.reject(
            "Found conflict, but no conflict handler is registered"
          );
        }
        return Promise.all(
          obj.conflicts.map((rev: string) =>
            this.connection.get(objIn._id, { rev, ...getParams })
          )
        )
          .then((objs: Array<ExistingDocument<any> & AllDocsMeta>) => {
            return hooks.conflictHandler(
              obj,
              objs.map((o) => new PouchDBObject(o, this, []))
            );
          })
          .then((solved: T) => {
            obj.update(solved);
            return obj;
          });
      } else {
        return obj;
      }
    });
  }
}
