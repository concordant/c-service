import PouchDBDataSource, {
    DEFAULT_PORT,
    IConnectionParams,
    IConnectionProtocol,
} from "../../../src/Database/DataSources/PoucDBDataSource";
import {Register} from "../../../src/Database/DataTypes/Interfaces/Types";
import {IBasicConnection, IDBObject, Key} from "../../../src/Database/Interfaces/Types";

class TestObject {
    constructor(public foo: string = "foo") {
    }
}

describe("Establish Connection", () => {
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
            .catch((e) => done());
    });

});

describe("get tests", () => {
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

    afterEach(() => {

    });

});

describe("modify object test", () => {
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
                const value = obj.currentValue();
                obj.updateValue(new TestObject("bar"));
                expect(obj.currentValue().foo).toEqual("bar");
                done();
            });
    });

    it("get object and save update", (done) => {
        console.log("create test");
        connection.get<TestObject>(TEST_KEY, new TestObject())
            .then((obj: Register<TestObject>) => {
                const value = obj.currentValue();
                obj.updateValue(new TestObject("bar"));
                return obj.save();
            })
            .then(() => connection.get<TestObject>(TEST_KEY, new TestObject()))
            .then((obj: Register<TestObject>) => expect(obj.currentValue().foo).toEqual("bar"))
            .then((() => done()));

    });

    afterEach(() => {

    });

});
