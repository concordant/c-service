export const dbName =  process.env.DBNAME || "testdb";
export const couchdbUser = process.env.COUCHDB_USER || "admin";
export const couchdbPassword = process.env.COUCHDB_PASSWORD || "dbadmin";
export const remoteDBurl = "http://" + couchdbUser + ":" + couchdbPassword
    + "@localhost:5984/" + dbName;
