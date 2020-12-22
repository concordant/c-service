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
import uuid = require("uuid");
import { DBHooks, Document } from "../../../src/Database/Interfaces/Types";
import { PouchDB } from "../../../src/Database/Implementation/Adapters/PouchDB/Adapter";
import PouchDBDataSource, {
  AdapterParams,
  ConnectionProtocol,
} from "../../../src/Database/Implementation/PouchDB/DataSource/PouchDBDataSource";
import PouchDBObject from "../../../src/Database/Implementation/PouchDB/DataTypes/PouchDBObject";
import { promiseDelay } from "../../../src/Utils/Utils";
import {
  dbName,
  couchdbHost,
  couchdbPort,
  couchdbUser,
  couchdbPassword,
  remoteDBurl,
} from "../../testParams";
import { IBasicConnection } from "../../../src/Database/Interfaces/IConnection";

class TestObject {
  constructor(public foo: string = "foo") {}
}

// FIX: TESTS DONT ALWAYS EXIT
// NOTE: The semantics of mixing automatic conflict resolution with resolution hooks is not specified.
describe("Handling conflicts basic", () => {
  let TEST_KEY: string;
  let connection1: IBasicConnection;
  let connection2: IBasicConnection;
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

  it("conflict handler triggered on get", (done) => {
    TEST_KEY = uuid();
    let remoteObj: Document<TestObject>;
    let onlyAfter = false;

    const hooks: DBHooks = {
      conflictHandler: (
        obj: Document<TestObject>,
        objs: Array<Document<TestObject>>
      ) => {
        if (!onlyAfter) {
          fail("Unexpected conflict trigger");
        }

        if (objs.length > 0) {
          done();
          return obj;
        }
        throw new Error("Unexpected call");
      },
    };

    connection2.registerHooks(hooks);

    const sub = connection1.subscribe<TestObject>(TEST_KEY, {
      change: (key, newObj) => {
        connection1.cancel(sub);
        onlyAfter = true;
        newObj
          .update(new TestObject("value1"))
          .save()
          .then(() => remoteObj.update(new TestObject("value2")).save())
          .then(() => promiseDelay(500))
          .then(() => connection2.get<TestObject>(TEST_KEY));
      },
    });

    connection2
      .get<TestObject>(TEST_KEY, () => new TestObject())
      .then((obj: Document<TestObject>) => {
        remoteObj = obj;
      })
      .catch((error) => fail(error));
  });

  it("conflict handler triggered onChange", (done) => {
    TEST_KEY = uuid();
    let remoteObj: Document<TestObject>;
    let solved = false;

    const hooks: DBHooks = {
      conflictHandler: () => {
        return new TestObject("conflict solved");
      },
    };

    connection1.registerHooks(hooks);
    connection2.registerHooks(hooks);

    const sub1 = connection1.subscribe<TestObject>(TEST_KEY, {
      change: (key, newObj) => {
        connection1.cancel(sub1);
        newObj
          .update(new TestObject("value1"))
          .save() // Modify created object
          .then(() => remoteObj.update(new TestObject("value2")).save()); // save conflicting version
      },
    });

    connection2.subscribe<TestObject>(TEST_KEY, {
      change: (key, newObj) => {
        if (newObj.current().foo === "conflict solved" && !solved) {
          solved = true;
          newObj.save().then(() => {
            // Make sure the resolution is propagated on save
            return connection2
              .get<TestObject>(TEST_KEY)
              .then((obj: Document<TestObject>) => {
                expect(obj.current().foo).toEqual("conflict solved");
                done();
              });
          });
        }
      },
    });

    // Create object
    connection2
      .get<TestObject>(TEST_KEY, () => new TestObject())
      .then((obj: Document<TestObject>) => {
        remoteObj = obj; // keep first retrieved version to generate conflict later
      })
      .catch((error) => fail(error));
  });

  afterAll(() => {
    return connection1
      .close()
      .then(() => connection2.close())
      .catch((error) => fail(error));
  });
});

describe("Automatic conflict resolution", () => {
  let connection1: IBasicConnection;
  let connection2: IBasicConnection;
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
      .connection({ autoSave: false, handleConflicts: false })
      .then((c) => (connection1 = c))
      .then(() =>
        dataSource2.connection({ autoSave: false, handleConflicts: false })
      )
      .then((c) => (connection2 = c));
  });

  it("Last Write Wins", (done) => {
    const random = uuid();
    let remoteObj: Document<TestObject>;

    const hooks: DBHooks = {
      conflictHandler: (
        obj: Document<TestObject>,
        objs: Array<Document<TestObject>>
      ) => {
        if (objs.length > 0) {
          fail();
        }
        return obj;
      },
    };

    connection1.registerHooks(hooks);
    connection2.registerHooks(hooks);

    const sub1 = connection1.subscribe<TestObject>(random, {
      change: (key, newObj) => {
        connection1.cancel(sub1);
        newObj
          .update(new TestObject("value1"))
          .save()
          .then(() => remoteObj.update(new TestObject("value2")).save());
      },
    });

    let updtCount = 0;
    connection2.subscribe<TestObject>(random, {
      change: (key, newObj) => {
        updtCount++;
        const pouchObj = newObj as PouchDBObject<TestObject>;
        if (
          updtCount === 2 &&
          pouchObj.current().foo === "value2" &&
          pouchObj.conflicts.length === 0
        ) {
          done();
        }
      },
    });

    connection2
      .get<TestObject>(random, () => new TestObject())
      .then((obj: Document<TestObject>) => {
        remoteObj = obj;
      })
      .catch((error) => fail(error));
  });

  afterAll(() => {
    return connection1
      .close()
      .then(() => connection2.close())
      .catch((error) => fail(error));
  });
});
