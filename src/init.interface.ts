export interface IInit {
  init(): Promise<any>;
  serviceName: string;
}
