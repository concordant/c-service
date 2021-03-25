#!/usr/bin/env node

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
import { crdtlib } from "@concordant/c-crdtlib";
import cors from "cors";
import express from "express";
import { makeExecutableSchema } from "graphql-tools";
import { OpenAPI, useSofa } from "sofa-api";
import { graphQLSchema } from "./schema";
import PouchDBDataSource, { PouchDBParams } from "./database/PouchDBDataSource";

// CouchDB variables
const url = process.env.COUCHDB_URL || "http://localhost:5984/";
const username = process.env.COUCHDB_USER || undefined;
const password = process.env.COUCHDB_PASSWORD || undefined;

// GraphQL definition
const typeDefs = gql(graphQLSchema);

// Resolvers for GraphQL
const resolvers = {
  Mutation: {
    createApp(_: any, { appName }: any): Promise<boolean> {
      const params: PouchDBParams = {
        url,
        username,
        password,
        dbName: appName,
      };
      const dataSource = new PouchDBDataSource(params);
      return dataSource.isConnected();
    },
    deleteApp(_: any, { appName }: any): Promise<boolean> {
      return Promise.reject("Not yet implemented");
    },
    updateObject: (_: any, { appName, id, document }: any): Promise<string> => {
      const params: PouchDBParams = {
        url,
        username,
        password,
        dbName: appName,
      };
      const dataSource = new PouchDBDataSource(params);
      return dataSource.updateObject(id, document);
    },
    replicator: (_: any, { source, target, continuous }: any) => {
      return Promise.reject("Not yet implemented");
    },
  },
  Query: {
    getObjects: (_: any, { appName }: any): Promise<Promise<string>[]> => {
      const params: PouchDBParams = {
        url,
        username,
        password,
        dbName: appName,
      };
      const dataSource = new PouchDBDataSource(params);
      return dataSource.getObjects();
    },
    getObject: (_: any, { appName, id }: any): Promise<string> => {
      const params: PouchDBParams = {
        url,
        username,
        password,
        dbName: appName,
      };
      const dataSource = new PouchDBDataSource(params);
      return dataSource.getObject(id);
    },
    replicators: async () => {
      return Promise.reject("Not yet implemented");
    },
    replicator: async (_: any, { id }: any) => {
      return Promise.reject("Not yet implemented");
    },
  },
};

// Create express server
const app = express();

// Cors configurations
const coreOptions: cors.CorsOptions = {
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "X-Access-Token",
  ],
  credentials: true,
  methods: "GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE",
  origin: "*",
  preflightContinue: false,
};

// Configure API
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

// Bind express server and API
app.use(
  "/api",
  cors(coreOptions),
  bodyParser.json({ limit: "10mb" }),
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

// Configure GraphQL server
const server = new ApolloServer({
  resolvers,
  typeDefs,
});

// Bind GraphQL server with API
server.applyMiddleware({ app });

// Launch server
app.listen(4000, "0.0.0.0");
