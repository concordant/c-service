import PouchDB from "pouchdb";
import InMemoryAdapter from "pouchdb-adapter-memory";
import {PouchDBAdapter} from "../Adapters/PouchDB/PouchDBAdapter";
import {Connection, IBasicConnection, IDataSource} from "../Interfaces/Types";
import Database = PouchDB.Database;

PouchDB.plugin(InMemoryAdapter);

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

    constructor(params: IConnectionParams) {
        const {protocol, host, port, dbName, connectionParams} = params;

        if (!(host || port || protocol)) {
            this.db = new PouchDB(dbName, connectionParams);
        } else {
            const url = `${protocol}://${host}:${port}/${dbName}`;
            this.db = new PouchDB(url, connectionParams);
        }
    }

    public connection(autoSave: boolean): Promise<PouchDBAdapter> {
        if (!autoSave) {
            return Promise.reject("Not Implemented");
        }

        const connection = new PouchDBAdapter(this.db, autoSave);
        return Promise.resolve(connection)
            .then((adapter: PouchDBAdapter) => adapter.isConnected())
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
