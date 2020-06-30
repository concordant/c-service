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
import {Document} from "../../../src/Database/DataTypes/Interfaces/Types";
import {PouchDB} from "../../../src/Database/Implementation/Adapters/PouchDB/Adapter";
import PouchDBDataSource, {
    AdapterParams,
    ConnectionProtocol,
} from "../../../src/Database/Implementation/PouchDB/DataSource/PouchDBDataSource";
import {IBasicConnection, IDBObject} from "../../../src/Database/Interfaces/Types";

class TestObject {
    constructor(public foo: string = "foo") {
    }
}

// TODO: Need to create database on server programmatically before running tests

describe("Get tests", () => {
    // const TEST_KEY = "test_key";
    let connection: IBasicConnection;

    beforeAll(() => {
        const params: AdapterParams = {
            connectionParams: {},
            dbName: "testdb", host: "localhost", port: 5984, protocol: ConnectionProtocol.HTTP,
        };
        const dataSource = new PouchDBDataSource(PouchDB, params);
        return dataSource.connection({autoSave: false}).then((c) => connection = c);

    });

    afterAll(() => {
        return connection.close()
            .catch((error) => fail(error));
    });

});

describe("Sync tests", () => {
    const TEST_KEY = uuid();
    let connection1: IBasicConnection;
    let connection2: IBasicConnection;
    const remoteDBs = ["http://localhost:5984/testdb"];

    beforeAll(() => {
        const params1: AdapterParams = {
            connectionParams: {adapter: "memory"},
            dbName: "testdb",
            remoteDBs,
        };
        const params2: AdapterParams = {
            connectionParams: {},
            dbName: "testdb", host: "localhost", port: 5984, protocol: ConnectionProtocol.HTTP,
        };
        const dataSource1 = new PouchDBDataSource(PouchDB, params1);
        const dataSource2 = new PouchDBDataSource(PouchDB, params2);
        return dataSource1.connection({autoSave: false})
            .then((c) => connection1 = c)
            .then(() => dataSource2.connection({autoSave: false}))
            .then((c) => connection2 = c);

    });
    it("test", (done) => {
        const random = uuid();
        const sub = connection1.subscribe<TestObject>(TEST_KEY, {
            change: (key, newObj) => {
                if (newObj.current().foo === random) {
                    done();
                }
            },
        });

        connection2.get<TestObject>(TEST_KEY, () => new TestObject())
            .then((obj: Document<TestObject>) => {
                obj.update(new TestObject(random));
                return obj.save();
            })
            // .then(() => done())
            .catch((error) => fail(error));
    });

    afterAll(() => {
        return connection1.close()
            .then(() => connection2.close())
            .catch((error) => fail(error));
    });
});
