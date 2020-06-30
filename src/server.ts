/**
 * MIT License
 * 
 * Copyright (c) 2020, Concordant and contributors
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import {ApolloServer, gql} from "apollo-server-express";
import * as bodyParser from "body-parser";
import express from "express";
import {makeExecutableSchema} from "graphql-tools";
import Nano, {MaybeDocument} from "nano";
import PouchDBImpl from "pouchdb";
import {OpenAPI, useSofa} from "sofa-api";
import {Document} from "./Database/DataTypes/Interfaces/Types";
import PouchDBDataSource, {
    AdapterParams,
    ConnectionProtocol,
} from "./Database/Implementation/PouchDB/DataSource/PouchDBDataSource";
import {Connection, DatabaseHooks} from "./Database/Interfaces/Types";
import CRDTWrapper from "./Utils/CRDTWrapper";

const maxRetryTimeout = 30000;
// http://USERNAME:PASSWORD/URL:PORT
const dbUrl = process.env.COUCHDB_URL || "http://localhost:5984/";
const dbName = process.env.DBNAME || "";
const serviceName = process.env.SERVICE_NAME || "couchdb";
const clientId = "STATIC_CLIENT_ID";

const username = process.env.COUCHDB_USER || undefined;
const userpass = process.env.COUCHDB_PASSWORD || undefined;

interface IReplicator extends MaybeDocument {
    source: string;
    continuous?: boolean;
    target: string;
    state?: string;
}

const typeDefs = gql`
    type Replicator {
        id: ID!,
        source: String,
        target: String,
        continuous: Boolean,
        state: String
    }

    type AppObject {
        id : String!,
        document: String
    }

    type Query {
        replicators : [Replicator],
        replicator(id: ID) : Replicator
        appObjects : [AppObject]
    }

    type Mutation {
        replicator(source: String, target: String, continuous: Boolean): String,
        createApp(appName: String): String,
        deleteApp(appName: String): String,
    }

    schema {
        query: Query,
        mutation: Mutation
    }
`;

let connection: Connection;

const resolvers = {
    Mutation: {
        createApp: (_: any, {appName}: any) => {
            return client.db.create(appName).then((body) => {
                console.log(`Database ${appName} created`, body);
                return "ok";
            });
        },
        deleteApp: (_: any, {appName}: any) => {
            client.db.destroy(appName).then((body) => {
                console.log(`Database ${appName} destroyed`, body);
                return "ok";
            });
        },
        replicator: (_: any, {source, target, continuous}: any) => {
            console.log("replicator called for params", source, target, continuous);
            return client.db.replicate(source, target, {
                continuous,
                create_target: true,
            }).then((body: any) => "ok");
        },
    },
    Query: {
        appObjects: () => appDB.list()
            .then((objs) => objs.rows.map((r) => {
                return connection.get<CRDTWrapper<any>>(r.id)
                    .then((obj: Document<CRDTWrapper<any>>) => {
                        const {unwrapped} = CRDTWrapper.unwrap(obj.current(), "");
                        return {id: r.id, document: JSON.stringify(unwrapped.value())};
                    })
                    .catch((error) => console.log("error", error));
            })),
        replicator: async (_: any, {id}: any) => replicator.get(id)
            .then((r: any) => ({
                continuous: r.continuous,
                id: r._id,
                source: r.source.url,
                state: r._replication_state,
                target: r.target.url,
            })),
        replicators: async (): Promise<IReplicator[]> => {
            const list = await replicator.list();
            return Promise.all(list.rows.map((r) => replicator.get(r.id)))
                .then((rows) =>
                    rows
                        .filter((r: any) => r.source !== undefined)
                        .map((r: any) => ({
                            continuous: r.continuous,
                            id: r._id,
                            source: r.source.url,
                            state: r._replication_state,
                            target: r.target.url,
                        })));

        },
    },
};

const app = express();

const schema = makeExecutableSchema({
    resolvers,
    typeDefs,
});
const openApi = OpenAPI({
    info: {
        title: "Concordant API",
        version: "1.0.0",
    },
    schema,
});
openApi.save("./swagger.yml");

app.use(
    "/api",
    bodyParser.json(),
    useSofa({
        schema,
        onRoute(info) {
            openApi.addRoute(info, {
                basePath: "/api",
            });
        },
    }),
);

// app.use(bodyParser.json());

const server = new ApolloServer({
    resolvers,
    typeDefs,
});

server.applyMiddleware({app});

app.listen({port: 4000}, (): any =>
    console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`));

if (!dbName) {
    console.log("Please set DBNAME environment variable");
    process.exit(1);
}

const connectDB = (timeout = 1000) => appDB.info()
    .then((info) => {
        console.log("Connected to database", info);
    })
    .catch((error) => {
        const retryIn = Math.min(timeout * 2, maxRetryTimeout);
        setTimeout(() => connectDB(retryIn), retryIn);
        console.log(error, `retry in ${retryIn}`);
    });

const client = Nano({url: dbUrl, requestDefaults: {jar: true}});

if (username && userpass) {
    client.auth(username, userpass)
        .then((res) => {
            console.log("Authenticated", res);
            // return client.db.create("test");
        })
        .catch((err) => console.log(err));
}

const appDB = client.db.use(dbName);
const replicator = client.db.use("_replicator");

console.log("Connecting to", dbUrl);
// dumpNetworkServices();
connectDB().catch((error: any) => console.log(error));

const hooks: DatabaseHooks = {
    conflictHandler: (obj: Document<CRDTWrapper<any>>, objs: Array<Document<CRDTWrapper<any>>>) => {
        const {unwrapped: objCRDT} = CRDTWrapper.unwrap(obj.current(), clientId);
        if (objs.length > 0) {
            objs.forEach((o) => {
                const {unwrapped} = CRDTWrapper.unwrap(o.current(), clientId);
                objCRDT.apply(unwrapped.state());
            });
            return CRDTWrapper.wrap(objCRDT, "ormap");
        }
        throw new Error("Unexpected call");
    },
};

// TODO: support database url parameter. This might not work properly
const database: AdapterParams = {
    connectionParams: {},
    dbName,
    url: dbUrl,
};

const dataSource = new PouchDBDataSource(PouchDBImpl, database);
dataSource.connection({autoSave: false, handleConflicts: true})
    .then((newConnection) => {
        connection = newConnection;
        connection.registerHooks(hooks);
    });
