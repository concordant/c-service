export enum Protocol {
    WEBSOCKET = "ws",
    SECURE_WEBSOCKET = "wss",
    HTTP = "http",
    HTTPS = "https",
}

export interface INodeInfo {
    readonly port: number;
    readonly address?: string;
    readonly protocol: Protocol;

}

export interface IMessage {
    headers?: Map<string, string>;
    content: string;
}

export type Endpoint = any; // TODO: specify type
