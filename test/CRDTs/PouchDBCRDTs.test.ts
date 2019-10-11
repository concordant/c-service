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
    public static wrap(object: CRDT, type: string) {
        return new CRDTWrapper(CRDTCodec.encode(object.state()), type);
    }

    public static unwrap(object: CRDTWrapper, clientId: string) {
        const unwrapped = CRDT(object.type)(clientId);
        unwrapped.apply(CRDTCodec.decode(object.buffer));
        return unwrapped;
    }

    private buffer: any;

    constructor(buffer: any, private type: string) {
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
        const defaultObject = CRDTWrapper.wrap(CRDT("ormap")("client1"), "ormap");
        return connection2.get<CRDTWrapper>(TEST_KEY, () => defaultObject)
            .then(() => connection2.get<CRDTWrapper>(TEST_KEY))
            .then((obj: Document<CRDTWrapper>) => {
                const newCRDT = CRDTWrapper.unwrap(obj.current(), "client2");
                newCRDT.applySub("r1", "ormap", "applySub", "A", "mvreg", "write", "A");
                return obj.update(CRDTWrapper.wrap(newCRDT, "ormap")).save();
            })
            .then(() => connection2.get<CRDT>(TEST_KEY))
            .then((obj: Document<CRDTWrapper>) => {
                const newCRDT = CRDTWrapper.unwrap(obj.current(), "client2");
                expect(newCRDT.value().r1).toBeDefined();
            })
            .catch((error) => fail(error));
    });

    // Based on RemoteConflicts.test.ts
    it("conflict handler triggered on get", (done) => {
        TEST_KEY = uuid();

        const client1DefaultObject = CRDT("ormap")("client1");
        // default object is created by client2
        const client2DefaultObjectWrapped = CRDTWrapper.wrap(CRDT("ormap")("client2"), "ormap");
        let remoteObj: Document<CRDTWrapper>;
        let onlyAfter = false;

        // hooks are handled by client2
        // need to create hooks for different connections to set different clientIds.
        const hooks: DatabaseHooks = {
            conflictHandler: (obj: Document<CRDTWrapper>, objs: Array<Document<CRDTWrapper>>) => {
                if (!onlyAfter) {
                    fail("Unexpected conflict trigger");
                }

                const objCRDT = CRDTWrapper.unwrap(obj.current(), "client2");
                if (objs.length > 0) {
                    objs.forEach((o) => {
                        const other = CRDTWrapper.unwrap(o.current(), "client2");
                        // console.log("Merging", objCRDT.value(), other.value());
                        objCRDT.apply(other.state());
                    });
                    // console.log("Resulting state", objCRDT.value());
                    return CRDTWrapper.wrap(objCRDT, "ormap");
                }
                throw new Error("Unexpected call");
            },
        };

        connection2.registerHooks(hooks);

        const sub = connection1.subscribe<CRDTWrapper>(TEST_KEY, {
            change: (key, newObj) => {
                connection1.cancel(sub);
                onlyAfter = true;
                const spreadSheetMap1 = CRDTWrapper.unwrap(newObj.current(), "client1");
                spreadSheetMap1.applySub("r1", "ormap", "applySub", "A", "mvreg", "write", "A");
                newObj.update(CRDTWrapper.wrap(spreadSheetMap1, "ormap"))
                    .save()
                    .then(() => {
                        client1DefaultObject.applySub("r2", "ormap", "applySub", "A", "mvreg", "write", "A");
                        return remoteObj.update(CRDTWrapper.wrap(client1DefaultObject, "ormap"))
                            .save()
                            .catch((err) => fail(err));
                    })
                    .then(() => promiseDelay(null, 200))
                    .then(() => connection2.get<CRDT>(TEST_KEY))
                    .then((obj) => {
                        const unwrapped = CRDTWrapper.unwrap(obj.current(), "client1");
                        expect(unwrapped.value().r1).toBeDefined();
                        expect(unwrapped.value().r2).toBeDefined();
                    })
                    .then(() => done());
            },
        });

        return connection2.get<CRDTWrapper>(TEST_KEY, () => client2DefaultObjectWrapped)
            .then((obj: Document<CRDTWrapper>) => remoteObj = obj)
            .catch((error) => fail(error));
    });

});

describe("Test offline support with CRDTs", () => {
    const TEST_KEY = uuid();
    let connection1: IBasicConnection;
    let connection2: IBasicConnection;
    const remoteDBs = ["http://localhost:5984/testdb"];
    let originalTimeout: number;

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

    // "go offline and receive remote updates on reconnect"
    // "go offline and push local updates on reconnect"
    // "go offline; update; receive remote updates on reconnect; solve conflict"

    beforeEach(() => {
        originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
    });

    it("go offline and receive pending updates on reconnect", (done) => {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

        const client1DefaultObject = CRDT("ormap")("client1");
        const client2DefaultObjectWrapped = CRDTWrapper.wrap(CRDT("ormap")("client2"), "ormap");
        let remoteObj: Document<CRDTWrapper>;
        let onlyAfter = false;

        const hooks: DatabaseHooks = {
            conflictHandler: (obj: Document<CRDTWrapper>, objs: Array<Document<CRDTWrapper>>) => {
                if (!onlyAfter) {
                    fail("Unexpected conflict trigger");
                }
                const objCRDT = CRDTWrapper.unwrap(obj.current(), "client2");
                if (objs.length > 0) {
                    objs.forEach((o) => {
                        const other = CRDTWrapper.unwrap(o.current(), "client2");
                        // console.log("Merging", objCRDT.value(), other.value());
                        objCRDT.apply(other.state());
                    });
                    // console.log("Resulting state", objCRDT.value());
                    return CRDTWrapper.wrap(objCRDT, "ormap");
                }
                throw new Error("Unexpected call");
            },
        };

        connection2.registerHooks(hooks);

        const sub = connection1.subscribe<CRDTWrapper>(TEST_KEY, {
            change: (key, newObj) => {
                connection1.cancel(sub);
                onlyAfter = true;
                const spreadSheetMap1 = CRDTWrapper.unwrap(newObj.current(), "client1");
                spreadSheetMap1.applySub("r1", "ormap", "applySub", "A", "mvreg", "write", "A");
                newObj.update(CRDTWrapper.wrap(spreadSheetMap1, "ormap"))
                    .save()
                    .then(() => {
                        client1DefaultObject.applySub("r2", "ormap", "applySub", "A", "mvreg", "write", "A");
                        return remoteObj.update(CRDTWrapper.wrap(client1DefaultObject, "ormap"))
                            .save()
                            .catch((err) => fail(err));
                    })
                    .then(() => promiseDelay(null, 200))
                    // .then(() => connection2.goOnline())
                    .then(() => connection2.get<CRDT>(TEST_KEY))
                    .then((obj) => {
                        const unwrapped = CRDTWrapper.unwrap(obj.current(), "client1");
                        expect(unwrapped.value().r1).toBeDefined();
                        expect(unwrapped.value().r2).toBeDefined();
                    })
                    .then(() => done());
            },
        });

        return connection2.get<CRDTWrapper>(TEST_KEY, () => client2DefaultObjectWrapped)
            .then((obj: Document<CRDTWrapper>) => remoteObj = obj)
            .then(() => connection2.goOffline())
            .catch((error) => fail(error));

    });

    afterEach(() => {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
        return connection1
            .close()
            .then(() => connection2.close())
            .catch((err) => console.log(err));
    });
});
