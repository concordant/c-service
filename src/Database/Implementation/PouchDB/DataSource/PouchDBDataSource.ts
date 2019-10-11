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
    url?: string;
    dbName: string;
    connectionParams?: any;
    remoteDBs?: string[];
}

export const DEFAULT_PORT = 3896;

export default class PouchDBDataSource implements IDataSource {

    public db: Database;
    private active: { [K in string]: Sync<any> } = {};
    private inactive: string[] = [];

    constructor(private levelFactory: any, params: AdapterParams) {
        const {url, protocol, host, port, dbName, connectionParams, remoteDBs} = params;

        if (!(host || port || protocol) && !url) {
            this.db = new levelFactory(dbName, connectionParams);
        } else {
            if (!url) {
                this.db = new levelFactory(`${protocol}://${host}:${port}/${dbName}`, connectionParams);
            } else {
                const slash = url.charAt(url.length - 1) === "/" ? "" : "/";
                this.db = new levelFactory(url + slash + dbName, connectionParams);
            }
        }
        if (remoteDBs) {
            remoteDBs.forEach((remoteUrl) => this.connectRemote(remoteUrl));
        }
    }

    public connection(params: ConnectionParams): Promise<PouchDBImpl> {
        const {autoSave} = params;
        if (autoSave) {
            return Promise.reject("Not Implemented");
        }

        const connection = new PouchDBImpl(this, params, {});

        // Wait for connection
        return Promise.resolve(connection)
            .then((adapter: PouchDBImpl) => adapter.isConnected())
            .then((result) => result ? connection : Promise.reject(Error(`Error: ${result}`)));
    }

    public txConnection() {
        return Promise.reject("Not Implemented");
    }

    public activeRemotes(): string[] {
        return Object.keys(this.active);
    }

    public disconnect(): Promise<void> {
        if (Object.keys(this.active).length > 0) {
            for (const [url, h] of Object.entries(this.active)) {
                if (h === undefined) {
                    delete this.active[url];
                }
                h.on("complete", () => {
                    this.inactive.push(url);
                    delete this.active[url];
                });
                h.cancel();
            }
        }

        const waitFor = (resolve: any) => {
            if (Object.keys(this.active).length === 0) {
                return resolve();
            } else {
                setTimeout(() => waitFor(resolve), 1000);
            }
        };
        return new Promise((resolve) => waitFor(resolve));
    }

    public connect() {
        this.inactive.forEach((url, idx) => {
            this.connectRemote(url);
            delete this.inactive[idx];
        });
    }

    public close(): Promise<void> {
        return this.disconnect().then(() => this.db.close());
    }

    private connectRemote(url: string) {
        const remote = new this.levelFactory(url);
        this.active[url] = this.db.sync(remote, {live: true, retry: true});
        // .on("error", (error: any) => console.error("Sync Error in", url, error))
        // .on("change", (info: any) => console.log("Sync change in", url, info))
        // .on("paused", (info: any) => console.log("Sync paused in", url, info));
    }

}
