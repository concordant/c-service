import express from "express";
import * as http from "http";
import WebSocket, {Server} from "ws";
import {INode, INodeResponse} from "../Interfaces/INode";
import {Endpoint, IMessage, INodeInfo, Protocol} from "../utils/NetworkCommon";

export type State = string; // "listening" | "stop" | "error"

type handlerType = (endpoint: Endpoint, ...params: any) => INodeResponse;

export class WebSocketNode implements INode {

    public readonly info: INodeInfo;
    public readonly endpoint: Endpoint;
    private connected: { [s: string]: Endpoint };
    private httpServer: http.Server;

    constructor(port: number, private handlers: { [event: string]: handlerType[] } = {}) {

        // TODO: consider exposing http interface
        const app = express();
        this.httpServer = http.createServer(app);
        this.endpoint = new Server({server: this.httpServer});
        this.connected = [];

        const connectionHandler = (ws: WebSocket, req: any, client: any) => {
            console.log(`Socket server received new connection from websocket ${ws} and ${req}`);
            this.registerEventHandlers(ws, handlers);
            this.connected.push(ws);
            return {state: "listening"};
        };

        const connectionEvent = "connection";
        this.endpoint.on(connectionEvent, connectionHandler);
        if (this.handlers[connectionEvent]) {
            this.handlers[connectionEvent].forEach((handler) => this.endpoint.on("connection", handler));
        }

        this.info = {
            port,
            protocol: Protocol.WEBSOCKET,
        };

        this.httpServer.listen(port, () => {
            console.log(`Server started on port ${port} :)`);
        });
    }

    public findPeers(): Promise<Endpoint[]> {
        return Promise.resolve([{}]);
    }

    public connect(address: string, port: number, handlers: { [event: string]: handlerType[] } = {}): Promise<Endpoint> {
        const url = `ws://${address}:${port}/`;
        console.log(`[WebSocketNode] connect to ${url}`);
        const socket = new WebSocket(url);
        this.registerEventHandlers(socket, handlers);
        this.connected.push(socket);
        return Promise.resolve(socket);
    }

    public accept(endpoint: Endpoint): boolean {
        return false;
    }

    public sendAsync(msg: IMessage, to: Endpoint): Promise<IMessage> {
        // TODO: Should check if is connected or not?
        if (to instanceof WebSocket) {
            to.send(JSON.stringify(msg));
        }
        return Promise.resolve(msg);
    }

    // public addEventHandler(event: string, handler: (...params: any) => State): any {
    //     return;
    // }

    public stop(errorCode?: number) {
        this.httpServer.close();
        this.endpoint.close();
        return Promise.resolve(true);
    }

    private registerEventHandlers(ws: WebSocket, handlers: { [event: string]: handlerType[] }) {
        const events = ["message", "close", "error", "open"];
        // TODO: handle state transition by handler
        events.forEach(
            (e: string) => {
                if (handlers[e]) {
                    handlers[e].forEach((handler) => {
                        console.log("Register handler for ", e, handler);
                        ws.on(e, (...args) => handler(ws, ...args));
                    });
                }
            });
    }

}
