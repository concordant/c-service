import {ApolloServer, gql} from "apollo-server-express";
import * as bodyParser from "body-parser";
import express from "express";
import {makeExecutableSchema} from "graphql-tools";
import Nano from "nano";
import sofa from "sofa-api";
import {dumpNetworkServices, publishService} from "./Network/Discovery/Advertising/AdvertisingService";

const maxRetryTimeout = 30000;
// http://USERNAME:PASSWORD/URL:PORT
const dbUrl = process.env.COUCHDB_URL || "http://localhost:5984/";
const dbName = process.env.DBNAME || "";
const serviceName = process.env.SERVICE_NAME || "couchdb";

interface IReplicator {
    id: string;
    source: string;
    continuous: boolean;
    target: string;
    state: string;
}

const typeDefs = gql`
    type Replicator {
        id: ID,
        source: String!,
        target: String,
        continuous: Boolean,
        state: String
    }

    type Object {
        key : String!
    }

    type Query {
        replicators : [Replicator],
        replicator(id: ID) : Replicator
    }

    schema {
        query: Query
    }
`;

const resolvers = {
    Query: {
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
app.use(sofa({schema}));
app.use(bodyParser.json());

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
        publishService(dbUrl, serviceName);
    })
    .catch((error) => {
        const retryIn = Math.min(timeout * 2, maxRetryTimeout);
        setTimeout(() => connectDB(retryIn), retryIn);
        console.log(error, `retry in ${retryIn}`);
    });

const client = Nano(dbUrl);
const appDB = client.db.use(dbName);
const replicator = client.db.use("_replicator");

console.log("Connecting to", dbUrl);
dumpNetworkServices();
connectDB().catch((error: any) => console.log(error));
