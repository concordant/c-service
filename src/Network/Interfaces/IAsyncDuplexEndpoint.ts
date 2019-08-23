import { IEndpointInfo, IMessage, RemoteEndpoint} from "../Utils/NetworkCommon";

export type EndpointEvent = "open" | "message" | "connected" | "close" | "error";
export type Handler = (endpoint: RemoteEndpoint, ...params: any) => IHandlerResp;

export interface IHandlerResp {
    state: State;
    response?: any;
}

export type State = "listening" | "stop" ;

/**
 *  A endpoint interface that is able to send a receive messages.
 *  When an endpoint is open, it transitions to a listening state.
 *  A transition to a stop state will shut down the endpoint.
 *  The endpoint listens to the following events:
 *  message: a message has been received
 *  connected: the endpoint successfully connected to the remote node.
 *  close: the endpoint is closed
 *  error: an error has occurred during the treatment of another event locally or remotely.
 */
export interface IAsyncDuplexEndpoint {
    // addEventHandler(event: string, handler: (...params: any) => State): any;

    close(errorCode?: number): Promise<boolean>;

    // TODO: check if connection event is "open" change name to open
    // TODO: check access map obbject by attribute or array
    connect(info: IEndpointInfo, handlers?: { [event in EndpointEvent]?: Handler[] }): Promise<RemoteEndpoint>;

    send(msg: IMessage, endpoint: RemoteEndpoint): Promise<IMessage>;
}
