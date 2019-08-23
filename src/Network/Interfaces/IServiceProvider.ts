import {IEndpointInfo} from "../utils/NetworkCommon";

type IServiceInfo = IEndpointInfo;

export interface IServiceProvider {
    advertiseService(info: IServiceInfo): Promise<IEndpointInfo>;
}
