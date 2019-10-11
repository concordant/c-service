import {promiseDelay} from "../../../Utils/Utils";
import {Document} from "../../DataTypes/Interfaces/Types";
import {
    DatabaseEventEmitter, DatabaseHooks,
    DatabaseParams,
    IBasicConnection,
    IDBHandlers,
    IDBSaveAllHandlers,
    IFilter,
    Key,
} from "../../Interfaces/Types";
import PouchDBDataSource, {ConnectionParams} from "./DataSource/PouchDBDataSource";
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
    private subscriptions: DatabaseEventEmitter[];
    // lastSeq is the seq from the last received change.
    private handlers: Array<{ handlers: IDBHandlers<Document<any>>, docIds: string[], lastSeq: number }> = [];

    constructor(
        private dataSource: PouchDBDataSource,
        private connectionParams: ConnectionParams,
        private params: DatabaseParams,
    ) {
        this.connection = dataSource.db;
        this.subscriptions = [];
    }

    // TODO: Add support for multiple handlers per hook
    public registerHooks(hooks: DatabaseHooks) {
        this.params.hooks = hooks;
    }

    public isConnected(): Promise<boolean> {
        return this.connection.info()
            .then(() => true)
            .catch(() => Promise.reject(new Error("Couldn't Connect to server")));
    }

    // TODO

    public isOnline(): boolean {
        return this.dataSource.activeRemotes().length !== 0;
    }

    public goOffline(waitFlush?: boolean): Promise<void> {
        return this.dataSource.disconnect();
    }

    public goOnline(waitFlush?: boolean): Promise<void> {
        return Promise.resolve(this.dataSource.connect());
    }

    public get<T>(key: Key, defaultObjFunc?: () => T, passThrough?: boolean): Promise<PouchDBObject<T>> {
        const {handleConflicts} = this.connectionParams;
        if (passThrough) {
            return Promise.reject("Not Implemented");
        }

        const getParams = {conflicts: handleConflicts};
        const convertedKey = PouchDB.convertKeyToId(key);

        return this.connection.get<T>(convertedKey, getParams)
            .then((obj) => this.handleGetResponse(obj))
            .catch((error: PouchError) => {
                if (error.status === NOT_FOUND_ERROR_CODE && (defaultObjFunc !== undefined && defaultObjFunc !== null)) {
                    return this.create<T>(key, defaultObjFunc());
                }
                return Promise.reject(error);
            });

    }

    public save<T>(obj: PouchDBObject<T>): Promise<PouchDBObject<T>> {
        return this.saveInternal(obj, 0);
    }

    public saveInternal<T>(obj: PouchDBObject<T>, retryCount: number): Promise<PouchDBObject<T>> {
        const {putRetriesBeforeError = 0, putRetryMaxTimeout = DEFAULT_RETRY_MAX_TIMEOUT} = this.connectionParams;
        return Promise.all(obj.conflicts.map((c) => {
            return this.connection.remove(obj.id, c);
        }))
            .then(() => this.connection.put(obj.current()))
            .then((resp: Response) =>
                new PouchDBObject<T>({_id: resp.id, _rev: resp.rev, ...obj.current()}, this))
            .catch((error: PouchError) => {
                if (error.status === CONFLICT_ERROR_CODE &&
                    putRetriesBeforeError && retryCount < putRetriesBeforeError) {
                    return promiseDelay(null, Math.random() * putRetryMaxTimeout)
                        .then(() => this.get<T>(obj.id))
                        .then((objConflicting) => {
                            return this.saveInternal<T>(objConflicting
                                .updateNoSideEffects(obj.current()), retryCount + 1);
                        });
                }
                return Promise.reject(error);
            });

    }

    public delete(key: Key): Promise<void> {
        return Promise.reject("Not Implemented");
    }

    public subscribe<T>(
        keyOrKeys: Key | Key[],
        handlers: IDBHandlers<Document<T>>,
        filter?: IFilter): DatabaseEventEmitter {
        let docIds: string[];
        const {handleConflicts} = this.connectionParams;

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
        const handler = {handlers, docIds, lastSeq: 0};
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
                        const getParams = {conflicts: handleConflicts};
                        this.connection.get<T>(change.doc._id, getParams)
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

    public cancel(sub: DatabaseEventEmitter) {
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

    public release(key: Key): void | Error {
        throw Error("Not Implemented");
    }

    public releaseAll(): void | Error {
        throw Error("Not Implemented");
    }

    public discard(key: Key) {
        throw Error("Not Implemented");
    }

    public discardAll() {
        throw Error("Not Implemented");
    }

    public setAutoSave() {
        throw Error("Not Implemented");
    }

    public close(): Promise<void> {
        Object.values(this.subscriptions).forEach((v: DatabaseEventEmitter) => v.cancel());
        return this.dataSource.close();
    }

    public isAutoSave(): boolean {
        const {autoSave} = this.connectionParams;
        return autoSave || false;
    }

    public isHandleConflicts(): boolean {
        const {handleConflicts} = this.connectionParams;
        return handleConflicts || false;
    }

    private create<T>(key: Key, obj: T):
        Promise<PouchDBObject<T>> {
        const doc = obj as PouchDocument<T> & ExistingDocument<T>;
        doc._id = PouchDB.convertKeyToId(key);
        return this.connection.put(doc)
            .then((resp: Response) => {
                doc._rev = resp.rev;
                return new PouchDBObject(doc, this);
            });
    }

    private handleGetResponse<T>(objIn: (ExistingDocument<T> & AllDocsMeta)): Promise<PouchDBObject<T>> {
        const {hooks} = this.params;
        const {handleConflicts} = this.connectionParams;
        const getParams = {conflicts: handleConflicts};
        return Promise.resolve(new PouchDBObject<T>(objIn, this, objIn._conflicts || []))
            .then((obj) => {
                if (obj.conflicts.length > 0) {
                    if (!hooks || !hooks.conflictHandler) {
                        return Promise.reject("Found conflict, but no conflict handler is registered");
                    }
                    return Promise.all(obj.conflicts.map(
                        (rev: string) => this.connection.get(objIn._id, {rev, ...getParams})))
                        .then((objs: Array<(ExistingDocument<any> & AllDocsMeta)>) => {
                            return hooks.conflictHandler(obj, objs.map((o) => new PouchDBObject(o, this, [])));
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
