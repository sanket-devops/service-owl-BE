import { ICore } from "./Icore";

export interface Idashboard extends ICore {
  hostCheck: boolean;
  metricsCheck: boolean;
  hostName: string;
  ipAddress: string;
  userName: string;
  userPass: string;
  port: IPort[];
  hostMetrics: IhostMetrics[];
  linkTo: ILinked[];
  groupName: string;
  clusterName: string;
  envName: string;
  vmName: string;
  status?: string;
  note: string;
}

export interface Ispeedtest extends ICore {
  speedTest: Itestmetrics[];
  internetCheck: boolean;
}

export interface Itestmetrics {
  speedTest: [];
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

export interface IhostMetrics {
  diskStatus: any[];
  memStatus: any[];
  cpuStatus: any[];
  DiskTotal: string;
  DiskUsage: string;
  DiskFree: string;
  MemTotal: string;
  MemUsage: string;
  MemFree: string;
  CpuTotal: string;
  CpuUsage: string;
  CpuFree: string;
  CPU: string;
  uptime: string;
}