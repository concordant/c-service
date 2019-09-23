import uuid = require("uuid");
import {Document} from "../../../src/Database/DataTypes/Interfaces/Types";
import {PouchDB} from "../../../src/Database/Implementation/Adapters/PouchDB/Adapter";
import PouchDBDataSource, {
    AdapterParams, ConnectionProtocol,
} from "../../../src/Database/Implementation/PouchDB/DataSource/PouchDBDataSource";
import PouchDBObject from "../../../src/Database/Implementation/PouchDB/DataTypes/PouchDBObject";
import {DatabaseHooks, IBasicConnection} from "../../../src/Database/Interfaces/Types";
import {promiseDelay} from "../../../src/Utils/Utils";

class TestObject {
    constructor(public foo: string = "foo") {
    }
}

// FIX: TESTS DONT ALWAYS EXIT
describe("Handling conflicts", () => {
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
        return dataSource1.connection({autoSave: false, handleConflicts: true})
            .then((c) => connection1 = c)
            .then(() => dataSource2.connection({autoSave: false, handleConflicts: true}))
            .then((c) => connection2 = c);

    });

    it("generate conflict", (done) => {
        const random = uuid();
        let remoteObj: Document<TestObject>;

        const hooks: DatabaseHooks = {
            conflictHandler: (obj, objs) => {
                if (objs.length > 0) {
                    done();
                    return obj;
                }
                fail("No conflicts returned");
                throw new Error("Unexpected call");
            },
        };

        connection2.registerHooks(hooks);

        const sub = connection1.subscribe<TestObject>(TEST_KEY, {
            change: (key, newObj) => {
                connection1.cancel(sub);
                newObj.update(new TestObject("value1"))
                    .save()
                    .then(() => remoteObj.update(new TestObject("value2")).save())
                    .then(() => promiseDelay(null, 500))
                    .then(() => connection2.get<TestObject>(TEST_KEY));
            },
        });

        connection2.get<TestObject>(TEST_KEY, new TestObject())
            .then((obj: Document<TestObject>) => {
                remoteObj = obj;
            })
            .catch((error) => fail(error));
    });

    afterAll(() => {
        return connection1.close()
            .then(() => connection2.close())
            .catch((error) => fail(error));
    });
});

describe("Automatic conflict resolution", () => {
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
        return dataSource1.connection({autoSave: false, handleConflicts: false})
            .then((c) => connection1 = c)
            .then(() => dataSource2.connection({autoSave: false, handleConflicts: false}))
            .then((c) => connection2 = c);

    });

    it("Last Write Wins --  default strategy", (done) => {
        const random = uuid();
        let remoteObj: Document<TestObject>;

        const hooks: DatabaseHooks = {
            conflictHandler: (obj, objs) => {
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
                newObj.update(new TestObject("value1")).save()
                    .then(() => remoteObj.update(new TestObject("value2")).save());
            },
        });

        let updtCount = 0;
        const sub2 = connection2.subscribe<TestObject>(random, {
            change: (key, newObj) => {
                updtCount++;
                const pouchObj = newObj as PouchDBObject<TestObject>;
                if (updtCount === 2 && pouchObj.current().foo === "value2" && pouchObj.conflicts.length === 0) {
                    done();
                }
            },
        });

        connection2.get<TestObject>(random, new TestObject())
            .then((obj: Document<TestObject>) => {
                remoteObj = obj;
            })
            .catch((error) => fail(error));
    });

    afterAll(() => {
        return connection1.close()
            .then(() => connection2.close())
            .catch((error) => fail(error));
    });

});
