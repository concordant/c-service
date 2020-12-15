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
import { OpenAPI, useSofa } from "sofa-api";

// http://USERNAME:PASSWORD/URL:PORT
const dbUrl = process.env.COUCHDB_URL || "http://localhost:5984/";

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

  type Query {
    getObjects(appName: String): [String]
    getObject(appName: String, id: ID!): String
    replicators: [Replicator]
    replicator(id: ID!): Replicator
  }

  type Mutation {
    createApp(appName: String): String
    deleteApp(appName: String): String
    updateObject(appName: String, id: ID!, document: String): String
    replicator(source: String, target: String, continuous: Boolean): String
  }

  schema {
    query: Query
    mutation: Mutation
  }
`;

const resolvers = {
  Mutation: {
    createApp(_: any, { appName }: any) {
      return createApp(appName);
    },
    deleteApp(_: any, { appName }: any) {
      return deleteApp(appName);
    },
    updateObject: (_: any, { appName, id, document }: any) => {
      return updateObject(appName, id, document);
    },
    replicator: (_: any, { source, target, continuous }: any) => {
      return client.db
        .replicate(source, target, {
          continuous,
          create_target: true,
        })
        .then((body) => "ok")
        .catch((error) => console.error("error", error));
    },
  },
  Query: {
    getObjects: (_: any, { appName }: any) => {
      return getObjects(appName);
    },
    getObject: (_: any, { appName, id }: any) => {
      return getObject(appName, id);
    },
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
    replicator: async (_: any, { id }: any) =>
      replicator.get(id).then((r: any) => ({
        continuous: r.continuous,
        id: r._id,
        source: r.source.url,
        state: r._replication_state,
        target: r.target.url,
      })),
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

const server = new ApolloServer({
  resolvers,
  typeDefs,
});

server.applyMiddleware({ app });

app.listen({ port: 4000 });

/**
 * Creates a new database if it does not already exists
 *
 * TODO: init databse with defaults
 *
 * @param dbName the new database name
 */
function createApp(dbName: string) {
  console.warn(`[SERVER] Creating database: '${dbName}'`);
  client.db
    .use(dbName)
    .info()
    .catch((error) => {
      client.db.create(dbName).catch((error) => {
        console.error(`[SERVER][ERROR] Failed creating database '${dbName}'`);
        console.error(error);
      });
    });
  return "OK";
}

/**
 * Deletes a database if it exists
 *
 * @param dbName the targeted database name
 */
function deleteApp(dbName: string) {
  console.warn(`[SERVER] Deleting database: '${dbName}'`);
  client.db
    .use(dbName)
    .info()
    .then((body) => {
      client.db.destroy(dbName).catch((error) => {
        console.error(`[SERVER][ERROR] Failed deleting database '${dbName}'`);
        console.error(error);
      });
    })
    .catch((error) => {
      return;
    });
  return "OK";
}

/**
 * Updates the content of an object inside a database
 *
 * TODO handle concurrent updates
 *
 * @param dbName the targeted database name
 * @param docName the targeted document name
 * @param document the document new content
 */
function updateObject(dbName: string, docName: string, document: string) {
  console.warn(
    `[SERVER] Updating document '${docName}' in database '${dbName}'`
  );
  client.db
    .use(dbName)
    .info()
    .then((body) => {
      client.db
        .use(dbName)
        .get(docName)
        .then((body) => {
          const newDocument = JSON.parse(document);
          newDocument._rev = body._rev;
          client.db
            .use(dbName)
            .insert(newDocument, docName)
            .catch((error) => {
              console.error(
                `[SERVER][ERROR] Failed updating document '${docName}' in database '${dbName}'`
              );
              console.error(error);
            });
        })
        .catch((error) => {
          client.db
            .use(dbName)
            .insert(JSON.parse(document), docName)
            .catch((error) => {
              console.error(
                `[SERVER][ERROR] Failed updating document '${docName}' in database '${dbName}'`
              );
              console.error(error);
            });
        });
    })
    .catch((error) => {
      console.error(
        `[SERVER][ERROR] Failed updating document '${docName}' in database '${dbName}'`
      );
      console.error(error);
    });
  return "OK";
}

/**
 * Gets all documents from a given database.
 *
 * @param dbName the targeted database name
 */
function getObjects(dbName: string) {
  return client.db
    .use(dbName)
    .list()
    .then((objs) =>
      objs.rows.map((r) => {
        return client.db
          .use(dbName)
          .get(r.id)
          .then((body) => {
            return JSON.stringify(body);
          })
          .catch((error) => {
            console.error(
              `[SERVER][ERROR] Failed getting objects in database '${dbName}'`
            );
            console.error("error", error);
          });
      })
    )
    .catch((error) => {
      console.error(
        `[SERVER][ERROR] Failed getting objects in database '${dbName}'`
      );
      console.error("error", error);
    });
}

/**
 * Gets a given document from a given database.
 *
 * @param dbName the targeted database name
 * @param docName the targeted document name
 */
function getObject(dbName: string, docName: string) {
  return client.db
    .use(dbName)
    .get(docName)
    .then((body) => {
      return JSON.stringify(body);
    })
    .catch((error) => {
      console.error(
        `[SERVER][ERROR] Failed getting object '${docName}' in database '${dbName}'`
      );
      console.error("error", error);
    });
}

const client = Nano({ url: dbUrl, requestDefaults: { jar: true } });

if (username && userpass) {
  client.auth(username, userpass).catch((error) => {
    console.error("[SERVER][ERROR] Authentification failed");
    console.error(error);
  });
}

const replicator = client.db.use("_replicator");
