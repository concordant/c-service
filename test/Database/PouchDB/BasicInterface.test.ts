import PouchDBDataSource, {
    DEFAULT_PORT,
    IConnectionParams,
    IConnectionProtocol,
} from "../../../src/Database/DataSources/PoucDBDataSource";
import {IBasicConnection, IDBObject, Key} from "../../../src/Database/Interfaces/Types";

describe("Establish Connection", () => {
    it("Init local in-memory database", (done) => {
        const params: IConnectionParams = {
            connectionParams: {adapter: "memory"},
            dbName: "testDB",
        };
        const dataSource = new PouchDBDataSource(params);
        dataSource.connection(true)
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
        dataSource.connection(true)
            .then(() => fail())
            .catch((e) => done());
    });

});

describe("get tests", () => {
    const TEST_KEY = "test_key";

    class TestObject {
        constructor(public foo: string = "foo") {
        }
    }

    let connection: IBasicConnection;

    beforeAll(() => {
        const params: IConnectionParams = {
            connectionParams: {adapter: "memory"},
            dbName: "testDB",
        };
        const dataSource = new PouchDBDataSource(params);
        return dataSource.connection(true)
            .then((pouchConnection) => {
                connection = pouchConnection;
            })
            .then(() => expect(connection).toBeDefined());

    });

    it("get empty key", (done) => {
        connection.get<TestObject>(TEST_KEY, new TestObject())
            .then((obj: IDBObject<TestObject>) => {
                const value = obj.value();
                expect(value.foo).toEqual("foo");
                done();
            });
    });

    it("get existing key", (done) => {
        connection.get<TestObject>(TEST_KEY, new TestObject())
            .then(() => connection.get<TestObject>(TEST_KEY, new TestObject("bar")))
            .then(() => connection.get<TestObject>(TEST_KEY))
            .then((obj) => {
                const value = obj.value();
                expect(value.foo).toEqual("foo");
                done();
            });
    });

    afterEach(() => {

    });

});
