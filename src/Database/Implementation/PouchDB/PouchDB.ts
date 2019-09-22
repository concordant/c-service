import _ from "lodash";
import {Document} from "../../DataTypes/Interfaces/Types";
import {
    DatabaseEventEmitter,
    IBasicConnection,
    IDBHandlers,
    IDBSaveAllHandlers,
    IFilter,
    Key,
} from "../../Interfaces/Types";
import {ConnectionParams} from "./DataSource/PouchDBDataSource";
import PouchDBObject from "./DataTypes/PouchDBObject";
import Database = PouchDB.Database;
import PouchError = PouchDB.Core.Error;
import PouchDocument = PouchDB.Core.Document;
import ExistingDocument = PouchDB.Core.ExistingDocument;
import Response = PouchDB.Core.Response;
import Sync = PouchDB.Replication.Sync;
import AllDocsMeta = PouchDB.Core.AllDocsMeta;

const CHANGE_EVENT = "change";
const NOT_FOUND_ERROR_CODE = 404;

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
    private subscriptions: DatabaseEventEmitter[];

    constructor(private connection: Database, private params: ConnectionParams, public syncHandlers?: Array<Sync<any> | undefined>) {
        this.subscriptions = [];
    }

    public isConnected(): Promise<boolean> {
        return this.connection.info()
            .then(() => true)
            .catch(() => Promise.reject(new Error("Couldn't Connect to server")));
    }

    public get<T>(key: Key, defaultObj?: T, passThrough?: boolean): Promise<Document<T>> {
        const {handleConflicts} = this.params;
        if (passThrough) {
            return Promise.reject("Not Implemented");
        }
        return this.connection.get<T>(PouchDB.convertKeyToId(key), {conflicts: handleConflicts})
            .then((obj: (ExistingDocument<T> & AllDocsMeta)) => new PouchDBObject<T>(obj, this, obj._conflicts !== undefined && obj._conflicts.length > 0))
            .catch((error: Error) => {
                const pouchError = error as PouchError;
                if (pouchError.status === NOT_FOUND_ERROR_CODE && (defaultObj !== undefined && defaultObj !== null)) {
                    return this.create<T>(key, defaultObj);
                }
                return Promise.reject(error);
            });

    }

    public save<T>(obj: PouchDBObject<T>): Promise<PouchDBObject<T>> {
        return this.connection.put(obj.currentValue())
            .then((resp: Response) =>
                new PouchDBObject<T>({_id: resp.id, _rev: resp.rev, ...obj.currentValue()}, this));
    }

    public delete(key: Key): Promise<void> {
        return Promise.reject("Not Implemented");
    }

    public subscribe<T>(
        keyOrKeys: Key | Key[],
        handlers: IDBHandlers<Document<T>>,
        filter?: IFilter): DatabaseEventEmitter {
        let docIds: string[];
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
        if (handlers.change) {
            changes.on(CHANGE_EVENT, (change) => {
                if (handlers.change && change.doc) {
                    const obj: Document<T> = new PouchDBObject(change.doc, this);
                    handlers.change(change.id, obj);
                }
            });
        }
        this.subscriptions.push(changes);
        return changes;
    }

    public cancelSubscription(sub: DatabaseEventEmitter) {
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
        if (this.syncHandlers) {
            this.syncHandlers.forEach((h, idx) => {
                if (h === undefined) {
                    return;
                }
                h.on("complete", (info: any) => {
                    if (this.syncHandlers) {
                        this.syncHandlers[idx] = undefined;
                    }
                });
                h.cancel();
            });
        }
        const waitFor = (resolve: any) => {
            if (!this.syncHandlers || this.syncHandlers.every((h) => h === undefined)) {
                return resolve(this.connection.close());
            } else {
                setTimeout(() => waitFor(resolve), 1000);
            }
        };

        return new Promise((resolve) => waitFor(resolve));
    }

    public isAutoSave(): boolean {
        return this.params.autoSave || false;
    }

    public isHandleConflicts(): boolean {
        return this.params.handleConflicts || false;
    }

    private create<T>(key: Key, obj: T):
        Promise<PouchDBObject<T>> {
        const doc = obj as PouchDocument<T> & ExistingDocument<T>;
        doc._id = PouchDB.convertKeyToId(key);
        return this.connection.put(obj)
            .then((resp: Response) => {
                doc._rev = resp.rev;
                return new PouchDBObject(doc, this);
            });
    }

}
