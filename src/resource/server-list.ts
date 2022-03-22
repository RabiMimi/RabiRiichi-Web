export interface IServerInfo {
  name: string;
  address: string;
}

export const ServerList: IServerInfo[] = [
  {
    name: 'Localhost',
    address: 'localhost:4333',
  },
  {
    name: 'Rabimimi',
    address: 'riichi.rabimimi.com',
  },
];
