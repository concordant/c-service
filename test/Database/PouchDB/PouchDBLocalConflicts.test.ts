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
import { PouchDB } from "../../../src/Database/Implementation/Adapters/PouchDB/Adapter";
import PouchDBDataSource, {
  AdapterParams,
} from "../../../src/Database/Implementation/PouchDB/DataSource/PouchDBDataSource";
import PouchDBObject from "../../../src/Database/Implementation/PouchDB/DataTypes/PouchDBObject";
import { Database, DataSource } from "../../../src/Database/Interfaces/Types";
import { Document } from "../../../src/Database/Interfaces/Types";

class TestObject {
  constructor(public foo: string = "foo") {}
}

describe("Handling conflicts", () => {
  let connection1: Database;
  let connection2: Database;
  let dataSource: DataSource;
  const TEST_KEY = "test_key";

  beforeAll(() => {
    const params: AdapterParams = {
      connectionParams: { adapter: "memory" },
      dbName: "testdb",
    };
    dataSource = new PouchDBDataSource(PouchDB, params);
    return dataSource
      .connection({ handleConflicts: true })
      .then((pouchConnection) => {
        connection1 = pouchConnection;
        return dataSource.connection({ handleConflicts: true });
      })
      .then((pouchConnection) => {
        connection2 = pouchConnection;
      })
      .then(() => expect(connection1).toBeDefined())
      .then(() => expect(connection2).toBeDefined());
  });

  it("connection init", () => {
    expect(true).toEqual(true);
  });

  it("Conflict rejection without retry", (done) => {
    let obj1: Document<TestObject>;
    let obj2: Document<TestObject>;

    connection1
      .get<TestObject>(TEST_KEY, () => new TestObject())
      .then((obj) => {
        obj1 = obj;
        return connection2.get<TestObject>(TEST_KEY);
      })
      .then((obj) => {
        obj2 = obj;
        return obj2.update(new TestObject("obj2")).save();
      })
      .then(() => obj1.update(new TestObject("obj1")).save())
      .then(() => connection1.get(TEST_KEY))
      .then((conflictObj) => {
        expect(
          (conflictObj as PouchDBObject<TestObject>).conflicts.length > 0
        ).toEqual(true);
      })
      .catch((error: Error) => {
        const pouchError = (error as unknown) as { status: number };
        expect(pouchError.status).toEqual(409);
        done();
      });
  });

  it("Conflict solved with retry", (done) => {
    let obj1: Document<TestObject>;
    let obj2: Document<TestObject>;
    let retryConnection: Database;

    return dataSource
      .connection({ handleConflicts: true, putRetriesBeforeError: 1 })
      .then((pouchConnection) => {
        retryConnection = pouchConnection;
        return retryConnection.get<TestObject>(
          TEST_KEY,
          () => new TestObject()
        );
      })
      .then((obj) => {
        obj1 = obj;
        return connection2.get<TestObject>(TEST_KEY);
      })
      .then((obj) => {
        obj2 = obj;
        return obj2.update(new TestObject("conflict")).save();
      })
      .then(() => obj1.update(new TestObject("winner")).save())
      .then(() => retryConnection.get<TestObject>(TEST_KEY))
      .then((obj) => {
        expect(obj.current().foo).toEqual("winner");
        done();
      })
      .catch((error: Error) => {
        fail(error);
      });
  });
});
