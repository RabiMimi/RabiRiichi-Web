import './util/array.extensions';

export interface IInit {
  init(): Promise<any>;
  serviceName: string;
}
