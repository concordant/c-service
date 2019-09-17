import PouchDB from "pouchdb";
import InMemoryAdapter from "pouchdb-adapter-memory";

PouchDB.plugin(InMemoryAdapter);

export {PouchDB};
