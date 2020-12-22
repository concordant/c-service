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
import uuid from "uuid/v4";
import { PouchDB } from "../../../src/Database/Implementation/Adapters/PouchDB/Adapter";
import PouchDBDataSource, {
  AdapterParams,
  ConnectionProtocol,
  DEFAULT_PORT,
} from "../../../src/Database/Implementation/PouchDB/DataSource/PouchDBDataSource";
import { IBasicConnection } from "../../../src/Database/Interfaces/IConnection";
import { IDBObject } from "../../../src/Database/Interfaces/IDB";
import {
  dbName,
  couchdbHost,
  couchdbPort,
  couchdbUser,
  couchdbPassword,
  remoteDBurl,
} from "../../testParams";
import {
  DBEventEmitter,
  Document,
} from "../../../src/Database/Interfaces/Types";

class TestObject {
  constructor(public foo: string = "foo") {}
}

const WAIT_FOR_TEST =
  (process.env.WAIT_FOR_TEST && parseInt(process.env.WAIT_FOR_TEST, 10)) || 300;

describe("Establish Connection tests", () => {
  it("Init local in-memory database", (done) => {
    const params: AdapterParams = {
      connectionParams: { adapter: "memory" },
      dbName,
    };
    const dataSource = new PouchDBDataSource(PouchDB, params);
    dataSource
      .connection({ autoSave: false })
      .then((result) => (result ? done() : fail()));
  });

  it("Reject init database", (done) => {
    const params: AdapterParams = {
      dbName,
      host: "NO-HOST",
      port: DEFAULT_PORT,
      protocol: ConnectionProtocol.HTTPS,
    };
    const dataSource = new PouchDBDataSource(PouchDB, params);
    dataSource
      .connection({ autoSave: false })
      .then(() => fail())
      .catch(() => done());
  });
});

describe("Get tests", () => {
  const TEST_KEY = "test_key";
  let connection: IBasicConnection;

  beforeAll(() => {
    const params: AdapterParams = {
      connectionParams: { adapter: "memory" },
      dbName,
    };
    const dataSource = new PouchDBDataSource(PouchDB, params);
    return dataSource
      .connection({ autoSave: false })
      .then((pouchConnection) => {
        connection = pouchConnection;
      })
      .then(() => expect(connection).toBeDefined());
  });

  it("get empty key", (done) => {
    connection
      .get<TestObject>(TEST_KEY, () => new TestObject())
      .then((obj: IDBObject<TestObject>) => {
        const value = obj.current();
        expect(value.foo).toEqual("foo");
        done();
      });
  });

  it("get existing key", (done) => {
    connection
      .get<TestObject>(TEST_KEY, () => new TestObject())
      .then(() =>
        connection.get<TestObject>(TEST_KEY, () => new TestObject("bar"))
      )
      .then(() => connection.get<TestObject>(TEST_KEY))
      .then((obj) => {
        const value = obj.current();
        expect(value.foo).toEqual("foo");
        done();
      });
  });
});

describe("Modify object tests", () => {
  const TEST_KEY = "test_key";

  let connection: IBasicConnection;

  beforeAll(() => {
    const params: AdapterParams = {
      connectionParams: { adapter: "memory" },
      dbName,
    };
    const dataSource = new PouchDBDataSource(PouchDB, params);
    return dataSource
      .connection({ autoSave: false })
      .then((pouchConnection) => {
        connection = pouchConnection;
      })
      .then(() => expect(connection).toBeDefined());
  });

  it("get object and update local", (done) => {
    connection
      .get<TestObject>(TEST_KEY, () => new TestObject())
      .then((obj: Document<TestObject>) => {
        obj.update(new TestObject("bar"));
        expect(obj.current().foo).toEqual("bar");
        done();
      });
  });

  it("get object and save update", (done) => {
    connection
      .get<TestObject>(TEST_KEY, () => new TestObject())
      .then((obj: Document<TestObject>) => {
        obj.update(new TestObject("bar"));
        return obj.save();
      })
      .then(() => connection.get<TestObject>(TEST_KEY, () => new TestObject()))
      .then((obj: Document<TestObject>) =>
        expect(obj.current().foo).toEqual("bar")
      )
      .then(() => done());
  });
});

describe("Database events test", () => {
  let connection: IBasicConnection;

  beforeEach(() => {
    const params: AdapterParams = {
      connectionParams: { adapter: "memory" },
      dbName,
    };
    const dataSource = new PouchDBDataSource(PouchDB, params);
    return dataSource
      .connection({ autoSave: false })
      .then((pouchConnection) => {
        connection = pouchConnection;
      })
      .then(() => expect(connection).toBeDefined());
  });

  it("subscribe to changes --- create", (done) => {
    const random = uuid();
    connection.subscribe<TestObject>(random, {
      change: (key, obj) => {
        expect(key).toEqual(random);
        expect(obj.current().foo).toEqual("foo");
        done();
      },
    });

    connection
      .get<TestObject>(random, () => new TestObject())
      .catch((error) => fail(error));
  });

  it("subscribe to changes --- update", (done) => {
    const random = uuid();
    connection
      .get<TestObject>(random, () => new TestObject())
      .then((obj: Document<TestObject>) => {
        connection.subscribe<TestObject>(random, {
          change: (key, newObj) => {
            expect(key).toEqual(random);
            expect(newObj.current().foo).toEqual("bar");
            done();
          },
        });

        obj.update(new TestObject("bar"));
        return obj.save();
      })
      .catch((error) => fail(error));
  });

  it("subscribe array of keys", (done) => {
    let counter = 0;
    const random0 = uuid();
    const random1 = uuid();
    connection.subscribe<TestObject>([random0, random1], {
      change: () => {
        counter = counter + 1;
      },
    });

    connection
      .get<TestObject>(random0, () => new TestObject())
      .catch((error) => fail(error));

    connection
      .get<TestObject>(random1, () => new TestObject())
      .catch((error) => fail(error));
    setTimeout(() => {
      expect(counter).toEqual(2);
      done();
    }, WAIT_FOR_TEST);
  });

  it("cancel subscription", (done) => {
    let counter = 0;
    const random0 = uuid();
    const random1 = uuid();
    const eventEmitter: DBEventEmitter = connection.subscribe<TestObject>(
      [random0, random1],
      {
        change: () => {
          counter = counter + 1;
          if (counter === 2) {
            connection.cancel(eventEmitter);
          }
        },
      }
    );

    connection
      .get<TestObject>(random0, () => new TestObject())
      .then((obj: Document<TestObject>) => {
        obj.update(new TestObject("bar"));
        return obj.save();
      })
      .catch((error) => fail(error));

    connection
      .get<TestObject>(random1, () => new TestObject())
      .catch((error) => fail(error));

    setTimeout(() => {
      expect(counter).toEqual(2);
      done();
    }, WAIT_FOR_TEST);
  });
  afterEach(() => {
    return connection.close().catch((err) => console.error(err));
  });
});

describe("Test offline support", () => {
  const TEST_KEY = uuid();
  let connection1: IBasicConnection;
  let connection2: IBasicConnection;
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
      .connection({ autoSave: false })
      .then((c) => (connection1 = c))
      .then(() => dataSource2.connection({ autoSave: false }))
      .then((c) => (connection2 = c));
  });

  beforeEach(() => {
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
  });

  it("go offline and receive pending updates on reconnect", (done) => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

    const changeHandler = (key: string, obj: Document<TestObject>) => {
      expect(connection1.isOnline()).toBe(true);
      expect(key).toEqual(TEST_KEY);
      expect(obj.current().foo).toEqual("foo");
      done();
    };

    // TODO: On connection should wait for initial sync to complete... use parameter to wait for it
    new Promise((resolve) => setTimeout(() => resolve(), 500))
      .then(() =>
        connection1.get<TestObject>(TEST_KEY, () => new TestObject("first get"))
      )
      .then(() => {
        connection1.subscribe<TestObject>(TEST_KEY, { change: changeHandler });
      })
      .then(() => connection1.goOffline(true))
      .then(() => connection2.get<TestObject>(TEST_KEY, () => new TestObject()))
      .then((obj) => obj.update(new TestObject("foo")).save())
      .then(() => new Promise((resolve) => setTimeout(() => resolve(), 200)))
      .then(() => connection1.goOnline())
      .catch((error) => fail(error));
  });

  afterEach(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
    return connection1
      .close()
      .then(() => connection2.close())
      .catch((err) => console.error(err));
  });
});

// "go offline and receive remote updates on reconnect"
// "go offline and push local updates on reconnect"
// "go offline; update; receive remote updates on reconnect; solve conflict"
// "go offline; local read succeeds "
