import {Document} from "../../DataTypes/Interfaces/Types";
import {
    DatabaseEventEmitter,
    IBasicConnection,
    IDBHandlers,
    IDBSaveAllHandlers,
    IFilter,
    Key,
} from "../../Interfaces/Types";
import PouchDBObject from "./DataTypes/PouchDBObject";
import Database = PouchDB.Database;
import PouchError = PouchDB.Core.Error;
import PouchDocument = PouchDB.Core.Document;
import ExistingDocument = PouchDB.Core.ExistingDocument;
import Response = PouchDB.Core.Response;
import Changes = PouchDB.Core.Changes;

const CHANGE_EVENT = "change";

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
    private subscriptions: { [subscriptionId in string]: Changes<any> };

    constructor(private connection: Database, public autoSave: boolean) {
        // this.eventEmitter = new EventEmitter();
        this.subscriptions = {};
    }

    public isConnected(): Promise<boolean> {
        return this.connection.info()
            .then(() => true)
            .catch(() => Promise.reject(new Error("Couldn't Connect to server")));
    }

    public get<T>(key: Key, defaultObj?: T, passThrough?: boolean): Promise<Document<T>> {
        if (passThrough) {
            return Promise.reject("Not Implemented");
        }
        return this.connection.get<T>(PouchDB.convertKeyToId(key))
            .then((obj: ExistingDocument<T>) => new PouchDBObject<T>(obj, this))
            .catch((error: Error) => {
                const pouchError = error as PouchError;
                if (pouchError.reason === "missing" && (defaultObj !== undefined && defaultObj !== null)) {
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
        return changes;
    }

    public cancelSubscription(eventEmitter: DatabaseEventEmitter) {
        eventEmitter.cancel();
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
        return this.connection.close();
    }

    private create<T>(key: Key, obj: T): Promise<PouchDBObject<T>> {
        const doc = obj as PouchDocument<T> & ExistingDocument<T>;
        doc._id = PouchDB.convertKeyToId(key);
        return this.connection.put(obj)
            .then((resp: Response) => {
                doc._rev = resp.rev;
                return new PouchDBObject(doc, this);
            });
    }
}
