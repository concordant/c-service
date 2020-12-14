/**
 * MIT License
 *
 * Copyright (c) 2020, Concordant and contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { IConnectionParams, IDataSource } from "../../../Interfaces/Types";
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
  connectionParams?: IConnectionParams;
  remoteDBs?: string[];
}

export const DEFAULT_PORT = 3896;

export default class PouchDBDataSource implements IDataSource {
  public db: Database;
  private active: { [K in string]: Sync<any> } = {};
  private inactive: string[] = [];

  // TODO: levelFactory should be declared something like: (addr: string, params: IConnectionParams | undefined) => Database 
  constructor(private levelFactory: any, params: AdapterParams) {
    const {
      url,
      protocol,
      host,
      port,
      dbName,
      connectionParams,
      remoteDBs,
    } = params;

    if (!(host || port || protocol) && !url) {
      this.db = new levelFactory(dbName, connectionParams);
    } else {
      if (!url) {
        this.db = new levelFactory(
          `${protocol}://${host}:${port}/${dbName}`,
          connectionParams
        );
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
    const { autoSave } = params;
    if (autoSave) {
      return Promise.reject("Not Implemented");
    }

    const connection = new PouchDBImpl(this, params, {});

    // Wait for connection
    return Promise.resolve(connection)
      .then((adapter: PouchDBImpl) => adapter.isConnected())
      .then((result) =>
        result ? connection : Promise.reject(Error(`Error: ${result}`))
      );
  }

  public txConnection(): Promise<never> {
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

  public connect(): void {
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
    this.active[url] = this.db.sync(remote, { live: true, retry: true });
    // .on("error", (error: any) => console.error("Sync Error in", url, error))
    // .on("change", (info: any) => console.log("Sync change in", url, info))
    // .on("paused", (info: any) => console.log("Sync paused in", url, info));
  }
}
