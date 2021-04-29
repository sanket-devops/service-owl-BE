import {ICore} from './Icore';

export interface Idashboard extends ICore {
  hostName: string,
  ipAddress: string,
  port: IPort[],
  linkTo: ILinked[],
  groupName: string,
  clusterName: string,
  envName: string,
  vmName: string,
  status?: string,
  note: string
}

export interface IPort {
  name: string;
  port: number;
  status: string;
}


export interface ILinked {
  hostName: string;
  ipAddress: string;
  port: number;
}
