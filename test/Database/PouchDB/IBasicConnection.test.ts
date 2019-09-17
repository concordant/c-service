import uuid from "uuid/v4";
import {Document} from "../../../src/Database/DataTypes/Interfaces/Types";
import {PouchDB} from "../../../src/Database/Implementation/Adapters/PouchDB/Adapter";
import PouchDBDataSource, {
    AdapterParams,
    ConnectionProtocol,
    DEFAULT_PORT,
} from "../../../src/Database/Implementation/PouchDB/DataSource/PouchDBDataSource";
import {DatabaseEventEmitter, IBasicConnection, IDBObject} from "../../../src/Database/Interfaces/Types";

class TestObject {
    constructor(public foo: string = "foo") {
    }
}

const WAIT_FOR_TEST = process.env.WAIT_FOR_TEST && parseInt(process.env.WAIT_FOR_TEST, 10) || 300;

describe("Establish Connection tests", () => {
    it("Init local in-memory database", (done) => {
        const params: AdapterParams = {
            connectionParams: {adapter: "memory"},
            dbName: "testdb",
        };
        const dataSource = new PouchDBDataSource(PouchDB, params);
        dataSource.connection({autoSave: false})
            .then((result) => result ? done() : fail());
    });

    it("Reject init database", (done) => {
        const params: AdapterParams = {
            dbName: "testdb",
            host: "NO-HOST",
            port: DEFAULT_PORT,
            protocol: ConnectionProtocol.HTTPS,
        };
        const dataSource = new PouchDBDataSource(PouchDB, params);
        dataSource.connection({autoSave: false})
            .then(() => fail())
            .catch(() => done());
    });

});

describe("Get tests", () => {
    const TEST_KEY = "test_key";
    let connection: IBasicConnection;

    beforeAll(() => {
        const params: AdapterParams = {
            connectionParams: {adapter: "memory"},
            dbName: "testdb",
        };
        const dataSource = new PouchDBDataSource(PouchDB, params);
        return dataSource.connection({autoSave: false})
            .then((pouchConnection) => {
                connection = pouchConnection;
            })
            .then(() => expect(connection).toBeDefined());

    });

    it("get empty key", (done) => {
        connection.get<TestObject>(TEST_KEY, new TestObject())
            .then((obj: IDBObject<TestObject>) => {
                const value = obj.current();
                expect(value.foo).toEqual("foo");
                done();
            });
    });

    it("get existing key", (done) => {
        connection.get<TestObject>(TEST_KEY, new TestObject())
            .then(() => connection.get<TestObject>(TEST_KEY, new TestObject("bar")))
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
    const TEST_KEY_ARRAY = "test_key_array";

    let connection: IBasicConnection;

    beforeAll(() => {
        const params: AdapterParams = {
            connectionParams: {adapter: "memory"},
            dbName: "testdb",
        };
        const dataSource = new PouchDBDataSource(PouchDB, params);
        return dataSource.connection({autoSave: false})
            .then((pouchConnection) => {
                connection = pouchConnection;
            })
            .then(() => expect(connection).toBeDefined());

    });

    it("get object and update local", (done) => {
        connection.get<TestObject>(TEST_KEY, new TestObject())
            .then((obj: Document<TestObject>) => {
                obj.update(new TestObject("bar"));
                expect(obj.current().foo).toEqual("bar");
                done();
            });
    });

    it("get object and save update", (done) => {
        connection.get<TestObject>(TEST_KEY, new TestObject())
            .then((obj: Document<TestObject>) => {
                obj.update(new TestObject("bar"));
                return obj.save();
            })
            .then(() => connection.get<TestObject>(TEST_KEY, new TestObject()))
            .then((obj: Document<TestObject>) => expect(obj.current().foo).toEqual("bar"))
            .then((() => done()));

    });
});

describe("Database events test", () => {

    let connection: IBasicConnection;

    beforeEach(() => {
        const params: AdapterParams = {
            connectionParams: {adapter: "memory"},
            dbName: "testdb",
        };
        const dataSource = new PouchDBDataSource(PouchDB, params);
        return dataSource.connection({autoSave: false})
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

        connection.get<TestObject>(random, new TestObject())
            .catch((error) => fail(error));
    });

    it("subscribe to changes --- update", (done) => {
        const random = uuid();
        connection.get<TestObject>(random, new TestObject())
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

        connection.get<TestObject>(random0, new TestObject())
            .catch((error) => fail(error));

        connection.get<TestObject>(random1, new TestObject())
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
        const eventEmitter: DatabaseEventEmitter = connection.subscribe<TestObject>([random0, random1], {
            change: () => {
                counter = counter + 1;
                if (counter === 2) {
                    connection.cancel(eventEmitter);
                }
            },
        });

        connection.get<TestObject>(random0, new TestObject())
            .then((obj: Document<TestObject>) => {
                obj.update(new TestObject("bar"));
                return obj.save();
            })
            .catch((error) => fail(error));

        connection.get<TestObject>(random1, new TestObject())
            .catch((error) => fail(error));

        setTimeout(() => {
            expect(counter).toEqual(2);
            done();
        }, WAIT_FOR_TEST);
    });
    afterEach(() => {
        return connection.close().catch((err) => console.log(err));
    });
});
