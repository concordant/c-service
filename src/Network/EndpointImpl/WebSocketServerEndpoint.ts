import express from "express";
import * as http from "http";
import WebSocket, {Server} from "ws";
import {Handler} from "../Interfaces/IAsyncDuplexEndpoint";
import {IEndpointInfo, Protocol} from "../Utils/NetworkCommon";
import WebSocketEndpoint from "./WebSocketEndpoint";

type ServerEndpointEvent = "connection" | "message" | "close" | "error";
export default class WebSocketServerEndpoint extends WebSocketEndpoint {

    public readonly info: IEndpointInfo;
    public readonly serverEndpoint: Server;
    private readonly httpServer: http.Server;

    constructor(port: number, private serverHandlers: { [event in ServerEndpointEvent]?: Handler[] } = {}) {
        super();
        // TODO: consider exposing http interface
        const app = express();
        this.httpServer = http.createServer(app);
        this.serverEndpoint = new Server({server: this.httpServer});

        const connectionHandler = (ws: WebSocket, req: any, client: any) => {
            console.log(`Socket server received new connection from websocket ${ws} and ${req}`);
            this.addEventHandlers(ws, serverHandlers);
            this.connected.push(ws);
            return {state: "listening"};
        };

        const connectionEvent = "connection";
        this.serverEndpoint.on(connectionEvent, connectionHandler);
        if (this.serverHandlers[connectionEvent] !== undefined) {
            this.serverHandlers[connectionEvent]!.forEach((handler: Handler) =>
                this.serverEndpoint.on("connection", handler));
        }

        delete this.serverHandlers.connection;

        this.info = {
            port,
            protocol: Protocol.WEBSOCKET,
        };

        this.httpServer.listen(port, () => {
            console.log(`Server started on port ${port} :)`);
        });
    }

    public close(errorCode?: number) {
        return super.close().then(() => {
            this.httpServer.close();
            this.serverEndpoint.close();
            return true;
        });
    }
}
