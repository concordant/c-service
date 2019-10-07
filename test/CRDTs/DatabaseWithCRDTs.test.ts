// @ts-ignore
import CRDT from "delta-crdts";
// @ts-ignore
import CRDTCodec from "delta-crdts-msgpack-codec";
import uuid = require("uuid");
import {Document} from "../../src/Database/DataTypes/Interfaces/Types";
import {PouchDB} from "../../src/Database/Implementation/Adapters/PouchDB/Adapter";
import PouchDBDataSource, {
    AdapterParams,
    ConnectionProtocol,
} from "../../src/Database/Implementation/PouchDB/DataSource/PouchDBDataSource";
import {DatabaseHooks, IBasicConnection} from "../../src/Database/Interfaces/Types";
import {promiseDelay} from "../../src/Utils/Utils";

class CRDTWrapper {
    public static wrap(object: CRDT, type: string, clientId: string) {
        return new CRDTWrapper(CRDTCodec.encode(object.state()), type, clientId);
    }

    public static unwrap(object: CRDTWrapper) {
        const unwrapped = CRDT(object.type)(object.clientId);
        unwrapped.apply(CRDTCodec.decode(object.buffer));
        return unwrapped;
    }

    private buffer: any;

    constructor(buffer: any, private type: string, private clientId: string) {
        this.buffer = buffer;
    }

}

describe("Basic usage", () => {
    let TEST_KEY: string;
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

    it("Save and update CRDT object", () => {
        TEST_KEY = uuid();
        const defaultObject = CRDTWrapper.wrap(CRDT("ormap")("client1"), "ormap", "client1");
        return connection2.get<CRDTWrapper>(TEST_KEY, defaultObject)
            .then(() => connection2.get<CRDTWrapper>(TEST_KEY))
            .then((obj: Document<CRDTWrapper>) => {
                const newCRDT = CRDTWrapper.unwrap(obj.current());
                newCRDT.applySub("r1", "ormap", "applySub", "A", "mvreg", "write", "A");
                return obj.update(CRDTWrapper.wrap(newCRDT, "ormap", "client1")).save();
            })
            .then(() => connection2.get<CRDT>(TEST_KEY))
            .then((obj: Document<CRDTWrapper>) => {
                const newCRDT = CRDTWrapper.unwrap(obj.current());
                expect(newCRDT.value().r1).toBeDefined();
            })
            .catch((error) => fail(error));
    });

    // Based on RemoteConflicts.test.ts
    it("conflict handler triggered on get", (done) => {
        TEST_KEY = uuid();

        const client1DefaultObject = CRDT("ormap")("client1");
        // default object is created by client2
        const client2DefaultObjectWrapped = CRDTWrapper.wrap(CRDT("ormap")("client2"), "ormap", "client2");
        let remoteObj: Document<CRDTWrapper>;
        let onlyAfter = false;

        // hooks are handled by client2
        // need to create hooks for different connections to set different clientIds.
        const hooks: DatabaseHooks = {
            conflictHandler: (obj: Document<CRDTWrapper>, objs: Array<Document<CRDTWrapper>>) => {
                if (!onlyAfter) {
                    fail("Unexpected conflict trigger");
                }

                const objCRDT = CRDTWrapper.unwrap(obj.current());
                if (objs.length > 0) {
                    objs.forEach((o) => {
                        const other = CRDTWrapper.unwrap(o.current());
                        // console.log("Merging", objCRDT.value(), other.value());
                        objCRDT.apply(other.state());
                    });
                    // console.log("Resulting state", objCRDT.value());
                    return CRDTWrapper.wrap(objCRDT, "ormap", "client2");
                }
                throw new Error("Unexpected call");
            },
        };

        connection2.registerHooks(hooks);

        const sub = connection1.subscribe<CRDTWrapper>(TEST_KEY, {
            change: (key, newObj) => {
                connection1.cancel(sub);
                onlyAfter = true;
                const spreadSheetMap1 = CRDTWrapper.unwrap(newObj.current());
                spreadSheetMap1.applySub("r1", "ormap", "applySub", "A", "mvreg", "write", "A");
                newObj.update(CRDTWrapper.wrap(spreadSheetMap1, "ormap", "client1"))
                    .save()
                    .then(() => {
                        client1DefaultObject.applySub("r2", "ormap", "applySub", "A", "mvreg", "write", "A");
                        return remoteObj.update(CRDTWrapper.wrap(client1DefaultObject, "ormap", "client1"))
                            .save()
                            .catch((err) => fail(err));
                    })
                    .then(() => promiseDelay(null, 200))
                    .then(() => connection2.get<CRDT>(TEST_KEY))
                    .then((obj) => {
                        const unwrapped = CRDTWrapper.unwrap(obj.current());
                        expect(unwrapped.value().r1).toBeDefined();
                        expect(unwrapped.value().r2).toBeDefined();
                    })
                    .then(() => done());
            },
        });

        return connection2.get<CRDTWrapper>(TEST_KEY, client2DefaultObjectWrapped)
            .then((obj: Document<CRDTWrapper>) => remoteObj = obj)
            .catch((error) => fail(error));
    });

});
