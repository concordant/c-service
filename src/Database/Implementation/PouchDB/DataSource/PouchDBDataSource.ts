import {IDataSource} from "../../../Interfaces/Types";
import PouchDBImpl from "../PouchDB";
import Database = PouchDB.Database;
import Sync = PouchDB.Replication.Sync;

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
    remoteDBs?: Database[];
}

export const DEFAULT_PORT = 3896;

export default class PouchDBDataSource implements IDataSource {

    private db: Database;
    private syncHandler?: Array<Sync<any>>;

    constructor(levelUPAdapter: any, params: ConnectionParams) {
        const {protocol, host, port, dbName, connectionParams} = params;

        if (!(host || port || protocol)) {
            this.db = new levelUPAdapter(dbName, connectionParams);
        } else {
            const url = `${protocol}://${host}:${port}/${dbName}`;
            this.db = new levelUPAdapter(url, connectionParams);
        }

        if (params.remoteDBs) {
            this.syncHandler = params.remoteDBs.map((db) => this.db
                .sync(db, {live: true})
                // .on("change", (ch) => console.log("change", ch))
                .on("error", (err) => {
                    // throw err;
                }));
        }
    }

    public connection(autoSave: boolean): Promise<PouchDBImpl> {
        if (autoSave) {
            return Promise.reject("Not Implemented");
        }

        const connection = new PouchDBImpl(this.db, autoSave, this.syncHandler);
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

    //TODO wait on complete to close
    // syncHandler.on('complete', function (info) {
    //     // replication was canceled!
    // });

}
