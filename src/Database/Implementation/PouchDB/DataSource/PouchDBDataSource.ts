import PouchDB from "pouchdb";
import InMemoryAdapter from "pouchdb-adapter-memory";
import {IDataSource} from "../../../Interfaces/Types";
import PouchDBImpl from "../PouchDB";
import Database = PouchDB.Database;

PouchDB.plugin(InMemoryAdapter);

export type ConnectionParams = IConnectionParams;

export enum IConnectionProtocol {
    WEBSOCKET = "ws",
    SECURE_WEBSOCKET = "wss",
    HTTP = "http",
    HTTPS = "https",
}

export interface IConnectionParams {
    protocol?: IConnectionProtocol;
    host?: string;
    port?: number;
    dbName: string;
    connectionParams?: any;
}

export const DEFAULT_PORT = 3896;

export default class PouchDBDataSource implements IDataSource {

    private db: Database;

    constructor(params: ConnectionParams) {
        const {protocol, host, port, dbName, connectionParams} = params;

        if (!(host || port || protocol)) {
            this.db = new PouchDB(dbName, connectionParams);
        } else {
            const url = `${protocol}://${host}:${port}/${dbName}`;
            this.db = new PouchDB(url, connectionParams);
        }
    }

    public connection(autoSave: boolean): Promise<PouchDBImpl> {
        if (autoSave) {
            return Promise.reject("Not Implemented");
        }

        const connection = new PouchDBImpl(this.db, autoSave);
        return Promise.resolve(connection)
            .then((adapter: PouchDBImpl) => adapter.isConnected())
            .then((result) => result ? connection : Promise.reject(Error(`Error: ${result}`)));
    }

    public txConnection() {
        return Promise.reject("Not Implemented");
    }

    public goOffline(flush?: boolean) {
        return Promise.reject("Not Implemented");
    }

    public goOnline(tryFlush?: boolean) {
        return Promise.reject("Not Implemented");
    }
}
