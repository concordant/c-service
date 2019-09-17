import mdns, {Service} from "mdns";
import PouchDB from "pouchdb";

const maxRetryTimeout = 30000;
const dbUrl = process.env.COUCHDB_URL || "http://localhost:5984/";
const dbName: string = process.env.DBNAME as string || "";

if (!dbName) {
    console.log("Please set DBNAME environment variable");
    process.exit(1);
}

const processURL = (url: string) => {
    const parts = dbUrl.split(":");
    return {type: parts[0], port: parts[2].split("/")[0]};
};

const publishService = (url: string, dbname: string) => {
    const {type, port} = processURL(url);
    const service = mdns.createAdvertisement(mdns.tcp(type), parseInt(port, 10), {
        name: "couchdb",
    });
    service.start();
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

// const searchServices = (timeout) => bonjour.find({}, (service) => {
//     console.log("Found Service", service)
// });

const browser = mdns.createBrowser(mdns.tcp("http"));
browser.on("serviceUp", (service: Service) => {
    console.log("service up: ", service);
});
browser.on("serviceDown", (service: Service) => {
    console.log("service down: ", service);
});
browser.start();

const db = new PouchDB(dbUrl + dbName);
connectDB().catch((error) => console.log(error));
