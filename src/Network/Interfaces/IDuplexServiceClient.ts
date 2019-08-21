import {Endpoint, IMessage, INodeInfo} from "../utils/NetworkCommon";

type Event = "message" | "connected" | "close" | "error";
type State = "listening" | "stop" | "error";

export interface IDuplexServiceClient {
    connect(info: INodeInfo): Promise<Endpoint>;

    sendAsync(msg: IMessage, endpoint: Endpoint): Promise<IMessage>;

    addEventHandler(event: string, handler: (...params: any) => State): any;
}
