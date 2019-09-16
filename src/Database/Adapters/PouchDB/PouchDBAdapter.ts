import {IBasicConnection, IDBHandlers, IDBObject, IFilter, Key} from "../../Interfaces/Types";
import Database = PouchDB.Database;
import PouchError = PouchDB.Core.Error;
import {PouchDBObject} from "./PouchDBObject";
import Document = PouchDB.Core.Document;
import ExistingDocument = PouchDB.Core.ExistingDocument;
import Response = PouchDB.Core.Response;

export class PouchDBAdapter implements IBasicConnection {

    protected static convertKeyToId(key: Key): string {
        if (typeof key === "string") {
            return key;
        } else if (!key.key) {
            throw Error("Object must have a defined key");
        }
        return `${key.bucket}_${key.key}`;
    }

    constructor(private connection: Database, private autoSave: boolean) {

    }

    public isConnected(): Promise<boolean> {
        return this.connection.info()
            .then(() => true)
            .catch(() => Promise.reject(new Error("Couldn't Connect to server")));
    }

    public get<T>(key: Key, defaultObj?: T, passThrough?: boolean): Promise<PouchDBObject<T>> {
        if (passThrough) {
            return Promise.reject("Not Implemented");
        }
        return this.connection.get(PouchDBAdapter.convertKeyToId(key))
            .then((obj: any) => new PouchDBObject<T>(obj))
            .catch((error: Error) => {
                const pouchError = error as PouchError;
                if (pouchError.reason === "missing" && (defaultObj !== undefined && defaultObj !== null)) {
                    return this.create<T>(key, defaultObj);
                }
                return Promise.reject(error);
            });

    }

    public delete(key: Key): Promise<void> {
        return Promise.reject("Not Implemented");
    }

    public subscribe<T>(key: Key, filter?: IFilter, handlers?: IDBHandlers<IDBObject<T>>) {
        return {
            cancel: () => {
                throw Error("Not Implemented");
            },
        };
    }

    public saveAll() {
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

    private create<T>(key: Key, obj: T): Promise<PouchDBObject<T>> {
        const doc = obj as Document<T> & ExistingDocument<T>;
        doc._id = PouchDBAdapter.convertKeyToId(key);
        return this.connection.put(obj)
            .then((resp: Response) => {
                doc._rev = resp.rev;
                return new PouchDBObject(doc);
            });
    }
}
