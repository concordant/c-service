import DataSource from "./DataSource";
import PouchDBDataSource, { PouchDBParams } from "./PouchDBDataSource";

/**
 * Store associated DataSource of clients id
 */
export default class StoreDataSource {
  /**
   * Client ID to DataSource
   */
  private databases: { [key: string]: DataSource };

  constructor() {
    this.databases = {};
  }

  /**
   * Get or connect to a database
   * @param params Database parameters
   * @param onChange onChange handler if connected to a remote Database
   * @returns the associated DataSource
   */
  public getOrConnect(
    params: PouchDBParams,
    onChange?: (doc: string) => void
  ): DataSource {
    const dbName = params.dbName;
    const db = this.databases[dbName];
    if (db !== undefined) {
      return db;
    }
    const remoteDB = new PouchDBDataSource(params);

    if (onChange === undefined) {
      this.databases[dbName] = remoteDB;
    } else {
      const localDB = new PouchDBDataSource({ dbName });
      localDB.sync(remoteDB, onChange);
      this.databases[dbName] = localDB;
    }
    return this.databases[dbName];
  }
}
