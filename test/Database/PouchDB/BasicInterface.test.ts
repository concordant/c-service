import PouchDBDataSource, {
    DEFAULT_PORT,
    IConnectionParams,
    IConnectionProtocol,
} from "../../../src/Database/DataSources/PoucDBDataSource";

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
