export const dbName =  process.env.DBNAME || "testdb";
export const couchdbHost = process.env.COUCHDB_HOST || "localhost";
const port = process.env.COUCHDB_PORT || "5984";
export const couchdbPort = +port;
export const couchdbUser = process.env.COUCHDB_USER || "admin";
export const couchdbPassword = process.env.COUCHDB_PASSWORD || "dbadmin";
export const remoteDBurl = "http://" + couchdbUser + ":" + couchdbPassword
    + "@"+ couchdbHost +":"+ couchdbPort + "/" + dbName;
