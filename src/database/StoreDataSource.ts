/**
 * MIT License
 *
 * Copyright (c) 2022, Concordant and contributors
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
    onChange?: (doc: string, subscribers: string) => Promise<boolean>
  ): DataSource {
    const dbName = params.dbName;
    const db = this.databases[dbName];
    if (db !== undefined) {
      return db;
    }

    if (onChange === undefined) {
      this.databases[dbName] = new PouchDBDataSource(params, true);
    } else {
      const remoteDB = new PouchDBDataSource(params, false);
      const localDB = new PouchDBDataSource(
        { dbName },
        true,
        remoteDB,
        onChange
      );
      this.databases[dbName] = localDB;
    }
    return this.databases[dbName];
  }
}
