import {Document} from "../../../src/Database/DataTypes/Interfaces/Types";
import {PouchDB} from "../../../src/Database/Implementation/Adapters/PouchDB/Adapter";
import PouchDBDataSource, {
    AdapterParams,
} from "../../../src/Database/Implementation/PouchDB/DataSource/PouchDBDataSource";
import PouchDBObject from "../../../src/Database/Implementation/PouchDB/DataTypes/PouchDBObject";
import {Database} from "../../../src/Database/Interfaces/Types";

class TestObject {
    constructor(public foo: string = "foo") {
    }
}

describe("Handling conflicts", () => {

    let connection1: Database;
    let connection2: Database;
    const TEST_KEY = "test_key";

    beforeAll(() => {
        const params: AdapterParams = {
            connectionParams: {adapter: "memory"},
            dbName: "testdb",
        };
        const dataSource = new PouchDBDataSource(PouchDB, params);
        return dataSource.connection({handleConflicts: true})
            .then((pouchConnection) => {
                connection1 = pouchConnection;
                return dataSource.connection({handleConflicts: true});
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

    it("Conflict rejection", (done) => {
        let obj1: Document<TestObject>;
        let obj2: Document<TestObject>;

        connection1.get<TestObject>(TEST_KEY, new TestObject())
            .then((obj) => {
                obj1 = obj;
                return connection2.get<TestObject>(TEST_KEY);
            })
            .then((obj) => {
                obj2 = obj;
                return obj1.updateValue(new TestObject("obj1")).save();
            })
            .then(() => obj2.updateValue(new TestObject("obj2")).save())
            .then(() => connection1.get(TEST_KEY))
            .then((conflictObj) => {
                expect((conflictObj as PouchDBObject<TestObject>).conflict).toEqual(true);
            })
            .catch((error: Error) => {
                const pouchError = error as unknown as { status: number };
                expect(pouchError.status).toEqual(409);
                done();
            });
    });

});
