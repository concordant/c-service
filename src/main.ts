import PouchDBDataSource from "./Database/Implementation/PouchDB/DataSource/PouchDBDataSource";
import PouchDBObject from "./Database/Implementation/PouchDB/DataTypes/PouchDBObject";
import PouchDB from "./Database/Implementation/PouchDB/PouchDB";
import {Connection, Database, DataSource, DBSaveAllHandler, DBTxHandler, Key} from "./Database/Interfaces/Types";

//TODO: these exports need to be curated
import {
    EndpointEvent,
    Handler,
    IAsyncDuplexEndpoint,
    IHandlerResp,
    State,
} from "./Network/Interfaces/IAsyncDuplexEndpoint";
import {IEndpointInfo, IMessage, IRemoteEndpointStub, Protocol, RemoteEndpoint} from "./Network/Utils/NetworkCommon";

export {
    IAsyncDuplexEndpoint,
    EndpointEvent,
    Handler,
    IHandlerResp,
    State,
    IEndpointInfo,
    IMessage,
    IRemoteEndpointStub,
    Protocol,
    RemoteEndpoint,

    Connection,
    Database,
    DataSource,
    DBSaveAllHandler,
    DBTxHandler,
    Key,

    PouchDBDataSource,
    PouchDBObject,
    PouchDB,
};
