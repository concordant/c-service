export enum Protocol {
    WEBSOCKET = "ws",
    SECURE_WEBSOCKET = "wss",
    HTTP = "http",
    HTTPS = "https",
}

export interface IEndpointInfo {
    readonly port: number;
    readonly address?: string;
    readonly protocol: Protocol;
}

export interface IMessage {
    headers?: Map<string, string>;
    content: any;
}

export interface IRemoteEndpointStub {
    connection: any;
    send(msg: IMessage): void;
}

export type RemoteEndpoint = IRemoteEndpointStub;
