import PouchDBDataSource, {AdapterParams, ConnectionParams, ConnectionProtocol} from "./Database/Implementation/PouchDB/DataSource/PouchDBDataSource";
import PouchDBObject from "./Database/Implementation/PouchDB/DataTypes/PouchDBObject";
import PouchDB from "./Database/Implementation/PouchDB/PouchDB";
import {Connection, Database, DataSource, DBSaveAllHandler, DBTxHandler, Key} from "./Database/Interfaces/Types";

import {Document} from "./Database/DataTypes/Interfaces/Types";

export {
    AdapterParams,
    Connection,
    ConnectionParams,
    ConnectionProtocol,
    Database,
    DataSource,
    Document,
    DBSaveAllHandler,
    DBTxHandler,
    Key,

    PouchDBDataSource,
    PouchDBObject,
    PouchDB,
};
