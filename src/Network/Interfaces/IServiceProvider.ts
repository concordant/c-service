import {IEndpointInfo} from "../Utils/NetworkCommon";

type IServiceInfo = IEndpointInfo;

export interface IServiceProvider {
    advertiseService(info: IServiceInfo): Promise<IEndpointInfo>;
}
