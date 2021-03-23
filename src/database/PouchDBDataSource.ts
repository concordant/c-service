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
import { crdtlib } from "@concordant/c-crdtlib";
import { promiseDelay } from "../utils";
import DataSource from "./DataSource";
import PouchDB from "pouchdb";

/**
 * Parameters for PouchDB database.
 */
export interface PouchDBParams {
  dbName: string;
  username?: string;
  password?: string;
  url?: string;
}

/**
 * A database adapter between Concordant service API and PouchDB specific API.
 */
export default class PouchDBDataSource implements DataSource {
  /**
   * PouchDB client adapter.
   */
  private database: PouchDB.Database;

  /**
   * Default constructor.
   * @param params parameters for PouchDB database.
   */
  constructor(params: PouchDBParams) {
    const { dbName, url, username, password } = params;

    if (url === undefined) {
      this.database = new PouchDB(dbName);
    } else {
      const slash = url.slice(-1) === "/" ? "" : "/";
      this.database = new PouchDB(url + slash + dbName, {
        auth: { username, password },
      });
    }
  }

  /**
   * Is connection still active.
   * Return a promise to a boolean.
   * Reject promise if impossible to contact database.
   */
  public isConnected(): Promise<boolean> {
    return this.database
      .info()
      .then(() => true)
      .catch((error) => Promise.reject(error));
  }

  /**
   * Get a given object from the database.
   * @param docName unique identifier of the targeted document.
   * Return a promise to a string object.
   * Reject promise if impossible to get object.
   */
  public getObject(docName: string): Promise<string> {
    return this.database
      .info()
      .then((body) => {
        return this.database
          .get(docName)
          .then((body) => Promise.resolve(JSON.stringify(body)))
          .catch((error) => {
            try {
              const objectUId = JSON.parse(docName);
              const newCrdt = crdtlib.crdt.DeltaCRDTFactory.Companion.createDeltaCRDT(
                objectUId.type
              );
              return Promise.resolve(newCrdt.toJson());
            } catch (error) {
              return Promise.reject(error);
            }
          });
      })
      .catch((error) => {
        return Promise.reject(error);
      });
  }

  /**
   * Get all objects from the database.
   * Return promise a promise to an array of string objects.
   * Reject promise if impossible to get objects.
   */
  public getObjects(): Promise<Promise<string>[]> {
    return this.database
      .info()
      .then((body) => {
        return this.database
          .allDocs()
          .then((objs) => objs.rows.map((obj) => this.getObject(obj.id)))
          .catch((error) => Promise.reject(error));
      })
      .catch((error) => Promise.reject(error));
  }

  /**
   * Update a given object with the given [value].
   * @param docName unique identifier of the targeted object.
   * @param document value to be put in the database.
   * Return a promise to the new stored value.
   * Reject promise if impossible to update object.
   */
  public updateObject(docName: string, document: string): Promise<string> {
    return this.database
      .info()
      .then((body) => {
        return this.database
          .get(docName)
          .then((body) => {
            try {
              const CRDT = crdtlib.crdt.DeltaCRDT.Companion.fromJson(
                document.replace(/\\'/g, "'")
              );
              const bodyCRDT = crdtlib.crdt.DeltaCRDT.Companion.fromJson(
                JSON.stringify(body)
              );
              bodyCRDT.merge(CRDT);
              const newDocument = JSON.parse(bodyCRDT.toJson());
              newDocument._id = docName;
              newDocument._rev = body._rev;
              return this.database
                .put(newDocument)
                .then(() => newDocument)
                .catch((error) => this.updateObject(docName, document));
            } catch (error) {
              return Promise.reject(error);
            }
          })
          .catch((error) => {
            try {
              const newDocument = JSON.parse(document.replace(/\\'/g, "'"));
              newDocument._id = docName;
              return this.database
                .put(newDocument)
                .then(() => newDocument)
                .catch((error) => this.updateObject(docName, document));
            } catch (error) {
              return Promise.reject(error);
            }
          });
      })
      .catch((error) => Promise.reject(error));
  }

  /**
   * Close the database.
   * Return an empty promise.
   * Reject promise if impossible to close the database.
   */
  public close(): Promise<void> {
    return this.database
      .close()
      .then()
      .catch((error) => Promise.reject(error));
  }
}
