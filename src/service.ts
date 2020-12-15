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
import { ApolloServer, gql } from "apollo-server-express";
import * as bodyParser from "body-parser";
import express from "express";
import { makeExecutableSchema } from "graphql-tools";
import Nano, { MaybeDocument } from "nano";
import PouchDBImpl from "pouchdb";
import { OpenAPI, useSofa } from "sofa-api";
import { Document } from "./Database/DataTypes/Interfaces/Types";
import PouchDBDataSource, {
  AdapterParams,
  ConnectionProtocol,
} from "./Database/Implementation/PouchDB/DataSource/PouchDBDataSource";
import { Connection, DatabaseHooks } from "./Database/Interfaces/Types";
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
    id: ID!
    source: String
    target: String
    continuous: Boolean
    state: String
  }

  type AppObject {
    id: String!
    document: String
  }

  type Query {
    replicators: [Replicator]
    replicator(id: ID): Replicator
    appObjects: [AppObject]
  }

  type Mutation {
    replicator(source: String, target: String, continuous: Boolean): String
    createApp(appName: String): String
    deleteApp(appName: String): String
  }

  schema {
    query: Query
    mutation: Mutation
  }
`;

let connection: Connection;

const resolvers = {
  Mutation: {
    createApp: (_: any, { appName }: any) => {
      return client.db.create(appName).then((body) => {
        return "ok";
      });
    },
    deleteApp: (_: any, { appName }: any) => {
      client.db.destroy(appName).then((body) => {
        return "ok";
      });
    },
    replicator: (_: any, { source, target, continuous }: any) => {
      return client.db
        .replicate(source, target, {
          continuous,
          create_target: true,
        })
        .then((body: any) => "ok");
    },
  },
  Query: {
    appObjects: () =>
      appDB.list().then((objs) =>
        objs.rows.map((r) => {
          return connection
            .get<CRDTWrapper<any>>(r.id)
            .then((obj: Document<CRDTWrapper<any>>) => {
              const { unwrapped } = CRDTWrapper.unwrap(obj.current(), "");
              return { id: r.id, document: JSON.stringify(unwrapped.value()) };
            })
            .catch((error) => console.error("error", error));
        })
      ),
    replicator: async (_: any, { id }: any) =>
      replicator.get(id).then((r: any) => ({
        continuous: r.continuous,
        id: r._id,
        source: r.source.url,
        state: r._replication_state,
        target: r.target.url,
      })),
    replicators: async (): Promise<IReplicator[]> => {
      const list = await replicator.list();
      return Promise.all(list.rows.map((r) => replicator.get(r.id))).then(
        (rows) =>
          rows
            .filter((r: any) => r.source !== undefined)
            .map((r: any) => ({
              continuous: r.continuous,
              id: r._id,
              source: r.source.url,
              state: r._replication_state,
              target: r.target.url,
            }))
      );
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
    method: {
      "Query.getObjects": "POST",
      "Query.getObject": "POST",
    },
  })
);

// app.use(bodyParser.json());

const server = new ApolloServer({
  resolvers,
  typeDefs,
});

server.applyMiddleware({ app });

app.listen({ port: 4000 });

/**
 * DBNAME is required env arg for the application, exit if unset
 */
if (!dbName) {
  console.error("Please set DBNAME environment variable");
  process.exit(1);
}

/**
 * Creates a new Database, used when DBNAME doesn't exist
 *
 * In case of failure, the server will exist with error
 * TODO: init DB with defaults
 *
 * @param appDB CouchDB DatabaseScope instance where to create the new DB
 * @param dbName new DB name
 */
function createDB(appDB: Nano.DatabaseScope, dbName: string) {
  console.warn("[SERVER] Creating DB:" + dbName);
  appDB.create(dbName).catch((error) => {
    console.error(`[SERVER][ERROR] Failed creating database ${dbName}`);
    console.error(error);
    process.exit(1);
  });
}

/**
 * Poll appDB waiting for connection ack
 *
 * If DBNAME doesn't exist, it will be created
 *
 * @param timeout polling sleep duration, multiplied by 2 at each retry
 */
const connectDB = (timeout = 1000) =>
  appDB.info().catch((error) => {
    const retryIn = Math.min(timeout * 2, maxRetryTimeout);
    setTimeout(() => connectDB(retryIn), retryIn);
    console.warn(error, `retry in ${retryIn}`);
    // If DB doesn't exist, create it before first retry
    if (error && error.error === "not_found" && timeout <= 1000) {
      createDB(client.db, dbName);
    }
  });

const client = Nano({ url: dbUrl, requestDefaults: { jar: true } });

if (username && userpass) {
  client.auth(username, userpass).catch((err) => console.error(err));
}

const appDB = client.db.use(dbName);
const replicator = client.db.use("_replicator");

// dumpNetworkServices();
connectDB().catch((error: any) => console.error(error));

const hooks: DatabaseHooks = {
  conflictHandler: (
    obj: Document<CRDTWrapper<any>>,
    objs: Array<Document<CRDTWrapper<any>>>
  ) => {
    const { unwrapped: objCRDT } = CRDTWrapper.unwrap(obj.current(), clientId);
    if (objs.length > 0) {
      objs.forEach((o) => {
        const { unwrapped } = CRDTWrapper.unwrap(o.current(), clientId);
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
dataSource
  .connection({ autoSave: false, handleConflicts: true })
  .then((newConnection) => {
    connection = newConnection;
    connection.registerHooks(hooks);
  });
