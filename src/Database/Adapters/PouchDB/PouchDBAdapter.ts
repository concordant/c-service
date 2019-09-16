import {IBasicConnection, IDBHandlers, IDBObject, IFilter, Key} from "../../Interfaces/Types";
import Database = PouchDB.Database;
import {PouchDBObject} from "./PouchDBObject";

export class PouchDBAdapter implements IBasicConnection {

    protected static getKey(key: Key): string {
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

    public get<Y>(key: Key): Promise<PouchDBObject<Y>> {
        return this.connection.get(PouchDBAdapter.getKey(key))
            .then((obj: any) => new PouchDBObject<Y>(obj));
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
}
