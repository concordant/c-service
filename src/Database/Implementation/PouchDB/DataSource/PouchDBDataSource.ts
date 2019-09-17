import {IConnectionParams, IDataSource} from "../../../Interfaces/Types";
import PouchDBImpl from "../PouchDB";
import Database = PouchDB.Database;
import Sync = PouchDB.Replication.Sync;

export type AdapterParams = IAdapterParams;
export type ConnectionParams = IConnectionParams;

export enum ConnectionProtocol {
    WEBSOCKET = "ws",
    SECURE_WEBSOCKET = "wss",
    HTTP = "http",
    HTTPS = "https",
}

export interface IAdapterParams {
    protocol?: ConnectionProtocol;
    host?: string;
    port?: number;
    dbName: string;
    connectionParams?: any;
    remoteDBs?: string[];
}

export const DEFAULT_PORT = 3896;

export default class PouchDBDataSource implements IDataSource {

    private db: Database;
    private syncHandlers?: Array<Sync<any>>;

    constructor(levelUPAdapter: any, params: AdapterParams) {
        const {protocol, host, port, dbName, connectionParams, remoteDBs} = params;

        if (!(host || port || protocol)) {
            this.db = new levelUPAdapter(dbName, connectionParams);
        } else {
            const url = `${protocol}://${host}:${port}/${dbName}`;
            this.db = new levelUPAdapter(url, connectionParams);
        }

        if (remoteDBs) {
            this.syncHandlers = remoteDBs.map((dbUrl) => {
                const otherDB = new levelUPAdapter(dbUrl);
                return this.db.sync(otherDB, {
                    live: true,
                    retry: true,
                });
                // .on("error", (error: any) => console.error("Sync Error", error))
                // .on("change", (info: any) => console.log("Sync change", info))
                // .on("paused", (info: any) => console.log("Sync paused", info))
            });
        }
    }

    public connection(params: ConnectionParams): Promise<PouchDBImpl> {
        const {syncHandlers} = this;
        const {autoSave} = params;
        if (autoSave) {
            return Promise.reject("Not Implemented");
        }

        const connection = new PouchDBImpl(this.db, params, {syncHandlers});
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
