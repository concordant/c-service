import bonjourFunc from "bonjour";
import PouchDB from "pouchdb";

const bonjour = new bonjourFunc();
const maxRetryTimeout = 30000;
const dbUrl = process.env.COUCHDB_URL || "http://localhost:5984/";
const dbName = process.env.DBNAME;

if (!dbName) {
    console.log("Please set DBNAME environment variable");
    process.exit(1);
}

const processURL = (url) => {
    const parts = dbUrl.split(":");
    return {type: parts[0], port: parts[2].split("/")[0]};
};

const publishService = (dbUrl, dbName) => {
    const {type, port} = processURL(dbUrl);
    const service = {type, protocol: 'tcp', port, name: 'CouchDB', txt: {dbName}};
    bonjour.publish(service);
    console.log("Publishing Service", service);
};

const connectDB = (timeout = 1000) => db.info()
    .then(({db_name}) => {
        publishService(dbUrl, dbName);
    })
    .catch((error) => {
        const retryIn = Math.min(timeout * 2, maxRetryTimeout);
        setTimeout(() => connectDB(retryIn), retryIn);
        console.log(error, `retry in ${retryIn}`);
    });

const searchServices = (timeout) => bonjour.find({}, (service) => {
    console.log("Found Service", service)
});


const db = new PouchDB(dbUrl + dbName);
connectDB().catch((error) => console.log(error));
setInterval(searchServices, 30000);

