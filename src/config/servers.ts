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
    id: 'frenqy',
    nameKey: 'connect.frenqyServer',
    url: 'wss://riichi-frenqy.rabimimi.com:5000',
  },
  {
    id: 'local',
    nameKey: 'connect.localServer',
    url: 'ws://localhost:5150',
  },
];
