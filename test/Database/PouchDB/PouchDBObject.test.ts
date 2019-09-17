import _ from "lodash";
import {Document} from "../../../src/Database/DataTypes/Interfaces/Types";
import {PouchDB} from "../../../src/Database/Implementation/Adapters/PouchDB/Adapter";
import PouchDBDataSource, {IAdapterParams} from "../../../src/Database/Implementation/PouchDB/DataSource/PouchDBDataSource";
import {CONTEXT_COMPARE, IBasicConnection} from "../../../src/Database/Interfaces/Types";

class TestObject {
    constructor(public foo: string = "foo") {
    }
}

describe("PouchDB Object tests", () => {
    // Need to clear database between tests
    const TEST_KEY = "test_key_cmp";
    let connection: IBasicConnection;

    beforeAll(() => {
        const params: IAdapterParams = {
            connectionParams: {adapter: "memory"},
            dbName: "testDB",
        };
        const dataSource = new PouchDBDataSource(PouchDB, params);
        return dataSource.connection({autoSave: false})
            .then((pouchConnection) => {
                connection = pouchConnection;
            })
            .then(() => expect(connection).toBeDefined());

    });

    it("compare two equal versions", () => {
        return connection.get<TestObject>(TEST_KEY, new TestObject())
            .then((obj: Document<TestObject>) => {
                expect(obj.compareVersion(obj)).toEqual(CONTEXT_COMPARE.EQUAL);
            });
    });

    it("compare modified version", () => {
        return connection.get<TestObject>(TEST_KEY, new TestObject())
            .then((obj: Document<TestObject>) => {
                const obj1 = _.clone(obj);
                obj1.update(obj1.current());
                expect(obj1.compareVersion(obj)).toEqual(CONTEXT_COMPARE.CONCURRENT);
            });
    });

    it("compare two subsequent versions", (done) => {
        let obj0: Document<TestObject>;

        connection.get<TestObject>(TEST_KEY, new TestObject())
            .then((obj: Document<TestObject>) => {
                obj.update(new TestObject("bar"));
                obj0 = obj;
                return obj.save();
            })
            .then(() => connection.get<TestObject>(TEST_KEY, new TestObject()))
            .then((obj: Document<TestObject>) => {
                expect(obj0.compareVersion(obj)).toEqual(CONTEXT_COMPARE.LESS_THAN);
                expect(obj.compareVersion(obj0)).toEqual(CONTEXT_COMPARE.GREATER_THAN);

                done();
            })
        ;
    });

    it("isDirty", () => {
        const obj0 = new TestObject();
        return connection.get<TestObject>(TEST_KEY, obj0)
            .then((obj: Document<TestObject>) => {
                const obj1 = _.clone(obj);
                obj1.update(obj1.current());
                expect(obj1.isDirty()).toEqual(true);
            });
    });


});
