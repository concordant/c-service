import {State} from "../EndpointImpl/WebSocketNode";
import {Endpoint, IMessage, INodeInfo} from "../utils/NetworkCommon";

export type Event = "message" | "connected" | "close" | "error";
// export type State = "listening" | "stop" | "error";
// export type State = "listening" | string;

type handlerType = (endpoint: Endpoint, ...params: any) => INodeResponse;

export interface INodeResponse { state: State; response?: any; }

export interface INode {

    info: INodeInfo;
    endpoint: Endpoint;

    // advertiseService(info: IServiceInfo): Promise<Endpoint>; TODO: Create separate interface

    findPeers(): Promise<Endpoint[]>;

    connect(address: string, port: number, handlers?: { [event: string]: handlerType[] }): Promise<Endpoint>;

    accept(endpoint: Endpoint): boolean;

    sendAsync(msg: IMessage, to: Endpoint): Promise<IMessage>;

    // addEventHandler(event: string, handler: (...params: any) => State): any;

    stop(errorCode?: number): Promise<boolean>;

}
