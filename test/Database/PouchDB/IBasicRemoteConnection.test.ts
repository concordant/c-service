import uuid from "uuid/v4";
import {Document} from "../../../src/Database/DataTypes/Interfaces/Types";
import {PouchDB} from "../../../src/Database/Implementation/Adapters/PouchDB/Adapter";
import PouchDBDataSource, {
    IConnectionParams,
    IConnectionProtocol,
} from "../../../src/Database/Implementation/PouchDB/DataSource/PouchDBDataSource";
import {IBasicConnection, IDBObject} from "../../../src/Database/Interfaces/Types";

class TestObject {
    constructor(public foo: string = "foo") {
    }
}

describe("Get tests", () => {
    const TEST_KEY = "test_key";
    let connection: IBasicConnection;

    beforeAll(() => {
        const params: IConnectionParams = {
            connectionParams: {},
            dbName: "testdb", host: "localhost", port: 5984, protocol: IConnectionProtocol.HTTP,
        };
        const dataSource = new PouchDBDataSource(PouchDB, params);
        return dataSource.connection(false).then((c) => connection = c);

    });

    // THIS IS NOT A TEST
    it("update existing key", (done) => {
        connection.get<TestObject>(TEST_KEY, new TestObject())
            .then(() => connection.get<TestObject>(TEST_KEY, new TestObject("bar")))
            .then(() => connection.get<TestObject>(TEST_KEY))
            .then((obj) => {
                obj.updateValue(new TestObject("xpto"));
                obj.save().then(() => done());
            });
    });

    afterAll(() => {
        return connection.close()
            .catch((error) => fail(error));
    });

});

// // TEST Passes but connection isn't closed in certain situations
// describe("Sync tests", () => {
//     const TEST_KEY = uuid();
//     let connection1: IBasicConnection;
//     let connection2: IBasicConnection;
//     const remoteDBs = ["http://localhost:5984/testdb"];
//
//     beforeAll(() => {
//         const params1: IConnectionParams = {
//             connectionParams: {adapter: "memory"},
//             dbName: "testdb",
//             remoteDBs,
//         };
//         const params2: IConnectionParams = {
//             connectionParams: {},
//             dbName: "testdb", host: "localhost", port: 5984, protocol: IConnectionProtocol.HTTP,
//         };
//         const dataSource1 = new PouchDBDataSource(PouchDB, params1);
//         const dataSource2 = new PouchDBDataSource(PouchDB, params2);
//         return dataSource1.connection(false)
//             .then((c) => connection1 = c)
//             .then(() => dataSource2.connection(false))
//             .then((c) => connection2 = c);
//
//     });
//     it("test", (done) => {
//         const random = uuid();
//         const sub = connection1.subscribe<TestObject>(TEST_KEY, {
//             change: (key, newObj) => {
//                 if (newObj.currentValue().foo === random) {
//                     done();
//                 }
//             },
//         });
//
//         connection2.get<TestObject>(TEST_KEY, new TestObject())
//             .then((obj: Document<TestObject>) => {
//                 obj.updateValue(new TestObject(random));
//                 return obj.save();
//             })
//             // .then(() => done())
//             .catch((error) => fail(error));
//     });
//
//     afterAll(() => {
//         return connection1.close()
//             .then(() => connection2.close())
//             .catch((error) => fail(error));
//     });
// });
