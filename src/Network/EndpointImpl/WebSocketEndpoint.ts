import WebSocket from "ws";
import {EndpointEvent, Handler, IAsyncDuplexEndpoint} from "../Interfaces/IAsyncDuplexEndpoint";
import {IEndpointInfo, IMessage, RemoteEndpoint} from "../utils/NetworkCommon";
import RemoteWebSocketEndpointStub from "./RemoteWebSocketEndpointStub";

export default class WebSocketEndpoint implements IAsyncDuplexEndpoint {

    protected connected: WebSocket[] = [];

    public connect(info: IEndpointInfo, handlers: { [event in EndpointEvent]?: Handler[] }): Promise<RemoteEndpoint> {
        const url = `${info.protocol}://${info.address}:${info.port}/`;
        console.log(`[WebSocketNode] connect to ${url}`);
        const socket = new WebSocket(url);
        this.addEventHandlers(socket, handlers);
        this.connected.push(socket);
        return Promise.resolve(new RemoteWebSocketEndpointStub(socket));
    }

    public send(msg: IMessage, to: RemoteEndpoint): Promise<IMessage> {
        if (to instanceof RemoteWebSocketEndpointStub && to.connection.readyState === WebSocket.OPEN) {
            to.send(msg);
            return Promise.resolve(msg);
        }
        return Promise.reject(new Error("Endpoint is not WebSocket or is closed"));
    }

    public close(errorCode?: number): Promise<boolean> {
        this.connected.forEach((ws) => ws.close());
        // TODO: Wait for sockets to close before returning.
        return Promise.resolve(true);
    }

    protected addEventHandlers(ws: WebSocket, handlers: { [event in EndpointEvent]?: Handler[] }) {
        const stub = new RemoteWebSocketEndpointStub(ws);
        Object.entries(handlers).forEach(([e, hs]) => hs !== undefined &&
            hs.forEach((h) => ws.on(e, (...args) => h(stub, ...args))));
    }

}
