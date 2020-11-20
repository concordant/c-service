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
import { crdtlib } from "c-crdtlib";
import uuid = require("uuid");
import { Document } from "../../src/Database/DataTypes/Interfaces/Types";
import { PouchDB } from "../../src/Database/Implementation/Adapters/PouchDB/Adapter";
import PouchDBDataSource, {
  AdapterParams,
  ConnectionProtocol,
} from "../../src/Database/Implementation/PouchDB/DataSource/PouchDBDataSource";
import {
  DatabaseHooks,
  IBasicConnection,
} from "../../src/Database/Interfaces/Types";
import { promiseDelay } from "../../src/Utils/Utils";
import CRDTWrapper from "../../src/Utils/CRDTWrapper";

import {
  dbName,
  couchdbHost,
  couchdbPort,
  couchdbUser,
  couchdbPassword,
  remoteDBurl,
} from "../testParams";

describe("Basic usage", () => {
  let TEST_KEY: string;
  let connection1: IBasicConnection;
  let connection2: IBasicConnection;
  const environment1 = new crdtlib.utils.SimpleEnvironment(
    new crdtlib.utils.DCUId("client1")
  );
  const environment2 = new crdtlib.utils.SimpleEnvironment(
    new crdtlib.utils.DCUId("client2")
  );
  const remoteDBs = [remoteDBurl];

  beforeAll(() => {
    const params1: AdapterParams = {
      connectionParams: { adapter: "memory" },
      dbName,
      remoteDBs,
    };
    const params2: AdapterParams = {
      connectionParams: {
        auth: { username: couchdbUser, password: couchdbPassword },
      },
      dbName,
      host: couchdbHost,
      port: couchdbPort,
      protocol: ConnectionProtocol.HTTP,
    };
    const dataSource1 = new PouchDBDataSource(PouchDB, params1);
    const dataSource2 = new PouchDBDataSource(PouchDB, params2);
    return dataSource1
      .connection({ autoSave: false, handleConflicts: true })
      .then((c) => (connection1 = c))
      .then(() =>
        dataSource2.connection({ autoSave: false, handleConflicts: true })
      )
      .then((c) => (connection2 = c));
  });

  afterAll(() => {
    return connection1
      .close()
      .then(() => connection2.close())
      .catch((err) => console.error(err));
  });

  it("Save and update CRDT object", () => {
    TEST_KEY = uuid();
    const defaultObject = CRDTWrapper.wrap(new crdtlib.crdt.PNCounter());
    return connection2
      .get<CRDTWrapper<any>>(TEST_KEY, () => defaultObject)
      .then(() => connection2.get<CRDTWrapper<any>>(TEST_KEY))
      .then((obj: Document<CRDTWrapper<any>>) => {
        const newCRDT = CRDTWrapper.unwrap(obj.current());
        newCRDT.increment(42, environment1.getNewTimestamp());
        return obj.update(CRDTWrapper.wrap(newCRDT)).save();
      })
      .then(() => connection2.get<CRDTWrapper<any>>(TEST_KEY))
      .then((obj: Document<CRDTWrapper<any>>) => {
        const newCRDT = CRDTWrapper.unwrap(obj.current());
        expect(newCRDT.get()).toBe(42);
      })
      .catch((error) => fail(error));
  });

  // Based on RemoteConflicts.test.ts
  it("Conflict handler triggered on get", (done) => {
    TEST_KEY = uuid();

    const client1DefaultObject = new crdtlib.crdt.PNCounter();
    // default object is created by client2
    const client2DefaultObjectWrapped = CRDTWrapper.wrap(
      new crdtlib.crdt.PNCounter()
    );
    let remoteObj: Document<CRDTWrapper<any>>;
    let onlyAfter = false;

    // hooks are handled by client2
    // need to create hooks for different connections to set different clientIds.
    const hooks: DatabaseHooks = {
      conflictHandler: (
        obj: Document<CRDTWrapper<any>>,
        objs: Array<Document<CRDTWrapper<any>>>
      ) => {
        if (!onlyAfter) {
          fail("Unexpected conflict trigger");
        }

        const objCRDT = CRDTWrapper.unwrap(obj.current());
        if (objs.length > 0) {
          objs.forEach((o) => {
            const other = CRDTWrapper.unwrap(o.current());
            objCRDT.merge(other);
          });
          return CRDTWrapper.wrap(objCRDT);
        }
        throw new Error("Unexpected call");
      },
    };

    connection2.registerHooks(hooks);

    const sub = connection1.subscribe<CRDTWrapper<any>>(TEST_KEY, {
      change: (key, newObj) => {
        connection1.cancel(sub);
        onlyAfter = true;
        const crdt = CRDTWrapper.unwrap(newObj.current());
        crdt.increment(40, environment2.getNewTimestamp());
        newObj
          .update(CRDTWrapper.wrap(crdt))
          .save()
          .then(() => {
            client1DefaultObject.increment(2, environment1.getNewTimestamp());
            return remoteObj
              .update(CRDTWrapper.wrap(client1DefaultObject))
              .save()
              .catch((err) => fail(err));
          })
          .then(() => promiseDelay(null, 200))
          .then(() => connection2.get<CRDTWrapper<any>>(TEST_KEY))
          .then((obj) => {
            const unwrapped = CRDTWrapper.unwrap(obj.current());
            expect(unwrapped.get()).toBe(42);
          })
          .then(() => done());
      },
    });

    return connection2
      .get<CRDTWrapper<any>>(TEST_KEY, () => client2DefaultObjectWrapped)
      .then((obj: Document<CRDTWrapper<any>>) => (remoteObj = obj))
      .catch((error) => fail(error));
  });
});

describe("Test offline support with CRDTs", () => {
  const TEST_KEY = uuid();
  let connection1: IBasicConnection;
  let connection2: IBasicConnection;
  const environment1 = new crdtlib.utils.SimpleEnvironment(
    new crdtlib.utils.DCUId("client1")
  );
  const environment2 = new crdtlib.utils.SimpleEnvironment(
    new crdtlib.utils.DCUId("client2")
  );
  const remoteDBs = [remoteDBurl];
  let originalTimeout: number;

  beforeAll(() => {
    const params1: AdapterParams = {
      connectionParams: { adapter: "memory" },
      dbName,
      remoteDBs,
    };
    const params2: AdapterParams = {
      connectionParams: {
        auth: { username: couchdbUser, password: couchdbPassword },
      },
      dbName,
      host: couchdbHost,
      port: couchdbPort,
      protocol: ConnectionProtocol.HTTP,
    };
    const dataSource1 = new PouchDBDataSource(PouchDB, params1);
    const dataSource2 = new PouchDBDataSource(PouchDB, params2);
    return dataSource1
      .connection({ autoSave: false, handleConflicts: true })
      .then((c) => (connection1 = c))
      .then(() =>
        dataSource2.connection({ autoSave: false, handleConflicts: true })
      )
      .then((c) => (connection2 = c));
  });

  afterAll(() => {
    return connection1
      .close()
      .then(() => connection2.close())
      .catch((err) => console.error(err));
  });

  // "go offline and receive remote updates on reconnect"
  // "go offline and push local updates on reconnect"
  // "go offline; update; receive remote updates on reconnect; solve conflict"

  beforeEach(() => {
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
  });

  afterEach(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
  });

  it("Go offline and receive pending updates on reconnect", (done) => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

    const client1DefaultObject = new crdtlib.crdt.PNCounter();
    const client2DefaultObjectWrapped = CRDTWrapper.wrap(
      new crdtlib.crdt.PNCounter()
    );
    let remoteObj: Document<CRDTWrapper<any>>;
    let onlyAfter = false;

    const hooks: DatabaseHooks = {
      conflictHandler: (
        obj: Document<CRDTWrapper<any>>,
        objs: Array<Document<CRDTWrapper<any>>>
      ) => {
        if (!onlyAfter) {
          fail("Unexpected conflict trigger");
        }
        const objCRDT = CRDTWrapper.unwrap(obj.current());
        if (objs.length > 0) {
          objs.forEach((o) => {
            const other = CRDTWrapper.unwrap(o.current());
            objCRDT.merge(other);
          });
          return CRDTWrapper.wrap(objCRDT);
        }
        throw new Error("Unexpected call");
      },
    };

    connection2.registerHooks(hooks);

    const sub = connection1.subscribe<CRDTWrapper<any>>(TEST_KEY, {
      change: (key, newObj) => {
        connection1.cancel(sub);
        onlyAfter = true;
        const crdt = CRDTWrapper.unwrap(newObj.current());
        crdt.increment(40, environment2.getNewTimestamp());
        newObj
          .update(CRDTWrapper.wrap(crdt))
          .save()
          .then(() => {
            client1DefaultObject.increment(2, environment1.getNewTimestamp());
            return remoteObj
              .update(CRDTWrapper.wrap(client1DefaultObject))
              .save()
              .catch((err) => fail(err));
          })
          .then(() => promiseDelay(null, 200))
          // .then(() => connection2.goOnline())
          .then(() => connection2.get<CRDTWrapper<any>>(TEST_KEY))
          .then((obj) => {
            const unwrapped = CRDTWrapper.unwrap(obj.current());
            expect(unwrapped.get()).toBe(42);
          })
          .then(() => done());
      },
    });

    return connection2
      .get<CRDTWrapper<any>>(TEST_KEY, () => client2DefaultObjectWrapped)
      .then((obj: Document<CRDTWrapper<any>>) => (remoteObj = obj))
      .then(() => connection2.goOffline())
      .catch((error) => fail(error));
  });
});
