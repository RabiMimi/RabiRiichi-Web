export interface DefaultServer {
  id: string;
  nameKey: string;
  url: string;
}

export const DEFAULT_SERVERS: DefaultServer[] = [
  {
    id: 'official',
    nameKey: 'connect.officialServer',
    url: 'wss://riichi-server.rabimimi.com',
  },
  {
    id: 'local',
    nameKey: 'connect.localServer',
    url: 'ws://localhost:5150',
  },
];
