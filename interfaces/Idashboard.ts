import {ICore} from './Icore';
import {ICore_hostMetrics} from './Icore_hostMetrics';

export interface Idashboard extends ICore {
  hostCheck: boolean,
  hostName: string,
  ipAddress: string,
  userName: string,
  userPass: string,
  port: IPort[],
  hostMetrics: IhostMetrics[],
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
  http: boolean;
  path: string; 
  method: string;
  statuscode: number;
}


export interface ILinked {
  hostName: string;
  ipAddress: string;
  port: number;
}


export interface IhostMetrics extends ICore_hostMetrics {
  DiskTotal: string;
  DiskFree: string;
  MemTotal: string;
  MemAvailable: string;
  CpuUsage: string;
  CPU: string;
  uptime: string;
}