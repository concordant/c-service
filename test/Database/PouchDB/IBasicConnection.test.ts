import PouchDBDataSource, {
    DEFAULT_PORT,
    IConnectionParams,
    IConnectionProtocol,
} from "../../../src/Database/DataSources/PoucDBDataSource";
import {Register} from "../../../src/Database/DataTypes/Interfaces/Types";
import {DatabaseEventEmitter, IBasicConnection, IDBObject} from "../../../src/Database/Interfaces/Types";

class TestObject {
    constructor(public foo: string = "foo") {
    }
}

describe("Establish Connection tests", () => {
    it("Init local in-memory database", (done) => {
        const params: IConnectionParams = {
            connectionParams: {adapter: "memory"},
            dbName: "testDB",
        };
        const dataSource = new PouchDBDataSource(params);
        dataSource.connection(false)
            .then((result) => result ? done() : fail());
    });

    it("Reject init database", (done) => {
        const params: IConnectionParams = {
            dbName: "testDB",
            host: "NO-HOST",
            port: DEFAULT_PORT,
            protocol: IConnectionProtocol.HTTPS,
        };
        const dataSource = new PouchDBDataSource(params);
        dataSource.connection(false)
            .then(() => fail())
            .catch(() => done());
    });

});

describe("Get tests", () => {
    const TEST_KEY = "test_key";
    let connection: IBasicConnection;

    beforeAll(() => {
        const params: IConnectionParams = {
            connectionParams: {adapter: "memory"},
            dbName: "testDB",
        };
        const dataSource = new PouchDBDataSource(params);
        return dataSource.connection(false)
            .then((pouchConnection) => {
                connection = pouchConnection;
            })
            .then(() => expect(connection).toBeDefined());

    });

    it("get empty key", (done) => {
        connection.get<TestObject>(TEST_KEY, new TestObject())
            .then((obj: IDBObject<TestObject>) => {
                const value = obj.currentValue();
                expect(value.foo).toEqual("foo");
                done();
            });
    });

    it("get existing key", (done) => {
        connection.get<TestObject>(TEST_KEY, new TestObject())
            .then(() => connection.get<TestObject>(TEST_KEY, new TestObject("bar")))
            .then(() => connection.get<TestObject>(TEST_KEY))
            .then((obj) => {
                const value = obj.currentValue();
                expect(value.foo).toEqual("foo");
                done();
            });
    });

});

describe("Modify object tests", () => {
    const TEST_KEY = "test_key";

    let connection: IBasicConnection;

    beforeAll(() => {
        const params: IConnectionParams = {
            connectionParams: {adapter: "memory"},
            dbName: "testDB",
        };
        const dataSource = new PouchDBDataSource(params);
        return dataSource.connection(false)
            .then((pouchConnection) => {
                connection = pouchConnection;
            })
            .then(() => expect(connection).toBeDefined());

    });

    it("get object and update local", (done) => {
        connection.get<TestObject>(TEST_KEY, new TestObject())
            .then((obj: Register<TestObject>) => {
                obj.updateValue(new TestObject("bar"));
                expect(obj.currentValue().foo).toEqual("bar");
                done();
            });
    });

    it("get object and save update", (done) => {
        connection.get<TestObject>(TEST_KEY, new TestObject())
            .then((obj: Register<TestObject>) => {
                obj.updateValue(new TestObject("bar"));
                return obj.save();
            })
            .then(() => connection.get<TestObject>(TEST_KEY, new TestObject()))
            .then((obj: Register<TestObject>) => expect(obj.currentValue().foo).toEqual("bar"))
            .then((() => done()));

    });

});

describe("Database events test", () => {

    const TEST_KEY = "test_key0";
    const TEST_KEY1 = "test_key1";

    let connection: IBasicConnection;
    let dbCounter = 0;

    beforeEach(() => {
        const params: IConnectionParams = {
            connectionParams: {adapter: "memory"},
            dbName: "testDB" + dbCounter++,
        };
        const dataSource = new PouchDBDataSource(params);
        return dataSource.connection(false)
            .then((pouchConnection) => {
                connection = pouchConnection;
            })
            .then(() => expect(connection).toBeDefined());

    });

    it("subscribe to changes --- create", (done) => {
        connection.subscribe<TestObject>(TEST_KEY, {
            change: (key, obj) => {
                expect(key).toEqual(TEST_KEY);
                expect(obj.currentValue().foo).toEqual("foo");
                done();
            },
        });

        connection.get<TestObject>(TEST_KEY, new TestObject())
            .catch((error) => fail(error));
    });

    it("subscribe to changes --- update", (done) => {
        connection.get<TestObject>(TEST_KEY, new TestObject())
            .then((obj: Register<TestObject>) => {
                connection.subscribe<TestObject>(TEST_KEY, {
                    change: (key, newObj) => {
                        expect(key).toEqual(TEST_KEY);
                        expect(newObj.currentValue().foo).toEqual("bar");
                        done();
                    },
                });

                obj.updateValue(new TestObject("bar"));
                return obj.save();
            })
            .catch((error) => fail(error));
    });

    afterEach(() => {
        return connection.close();
    });

    it("subscribe array of keys", (done) => {
        let counter = 0;
        connection.subscribe<TestObject>([TEST_KEY, TEST_KEY1], {
            change: () => {
                counter = counter + 1;
            },
        });

        connection.get<TestObject>(TEST_KEY, new TestObject())
            .catch((error) => fail(error));

        connection.get<TestObject>(TEST_KEY1, new TestObject())
            .catch((error) => fail(error));
        setTimeout(() => {
            expect(counter).toEqual(2);
            done();
        }, 1000);
    });

    it("cancel subscription", (done) => {
        let counter = 0;
        const eventEmitter: DatabaseEventEmitter = connection.subscribe<TestObject>([TEST_KEY, TEST_KEY1], {
            change: () => {
                counter = counter + 1;
                if (counter === 2) {
                    connection.cancelSubscription(eventEmitter);
                }
            },
        });

        connection.get<TestObject>(TEST_KEY, new TestObject())
            .then((obj: Register<TestObject>) => {
                obj.updateValue(new TestObject("bar"));
                return obj.save();
            })
            .catch((error) => fail(error));

        connection.get<TestObject>(TEST_KEY1, new TestObject())
            .catch((error) => fail(error));

        setTimeout(() => {
            expect(counter).toEqual(2);
            done();
        }, 1000);
    });
});
