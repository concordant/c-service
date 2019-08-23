import WebSocket from "ws";
import {IMessage, IRemoteEndpointStub} from "../Utils/NetworkCommon";

export default class RemoteWebSocketEndpointStub implements IRemoteEndpointStub {

    constructor(public connection: WebSocket) {
    }

    public send(msg: IMessage): void {
        this.connection.send(JSON.stringify(msg));
    }
}
