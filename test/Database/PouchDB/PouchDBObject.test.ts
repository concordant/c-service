import _ from "lodash";
import {Document} from "../../../src/Database/DataTypes/Interfaces/Types";
import PouchDBDataSource, {IConnectionParams} from "../../../src/Database/Implementation/PouchDB/DataSource/PouchDBDataSource";
import {CONTEXT_COMPARE, IBasicConnection} from "../../../src/Database/Interfaces/Types";

class TestObject {
    constructor(public foo: string = "foo") {
    }
}

describe("Establish Connection tests", () => {
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
                obj1.updateValue(obj1.currentValue());
                expect(obj1.compareVersion(obj)).toEqual(CONTEXT_COMPARE.CONCURRENT);
            });
    });

    it("compare two subsequent versions", (done) => {
        let obj0: Document<TestObject>;

        connection.get<TestObject>(TEST_KEY, new TestObject())
            .then((obj: Document<TestObject>) => {
                obj.updateValue(new TestObject("bar"));
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
                obj1.updateValue(obj1.currentValue());
                expect(obj1.isDirty()).toEqual(true);
            });
    });


});
