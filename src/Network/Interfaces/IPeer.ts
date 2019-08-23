// import {EndpointIMessage} from "../utils/NetworkCommon";
// import {IAsyncDuplexEndpoint} from "./IAsyncDuplexEndpoint";
//
// type handlerType = (endpoint: Endpoint, ...params: any) => INodeResponse;
//
// export interface IPeerStub {
//     endpoint: Endpoint;
// }
//
// export interface INodeResponse {
//     state: State;
//     response?: any;
// }
//
// export interface IPeer {
//
//     // advertiseService(info: IServiceInfo): Promise<Endpoint>; TODO: Create separate interface
//
//     findPeers(): Promise<Endpoint[]>;
//
//     connect(info: IPeerStub): Promise<Endpoint>;
//
//     // TODO: Not sure this method is necessary
//     accept(endpoint: Endpoint): boolean;
//
//     sendAsync(msg: IMessage, endpoint: Endpoint): Promise<IMessage>;
//
//     request(msg: IMessage, endpoint: Endpoint): Promise<IMessage>;
//
//     addEventHandler(event: string, handler: (...params: any) => State): any;
//
//     stop(errorCode?: number): Promise<boolean>;
//
// }
