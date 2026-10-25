import config from '../../android/client-config.json';

export const CLIENT_ORIGINS = config.origins;
export const CLIENT_DOWNLOAD_URL = config.downloadUrl;
export type ClientEnvironment = keyof typeof CLIENT_ORIGINS;

export function getClientEnvironment(
  clientOrigin: string,
): ClientEnvironment | undefined {
  return (Object.keys(CLIENT_ORIGINS) as ClientEnvironment[]).find(
    (environment) => CLIENT_ORIGINS[environment] === clientOrigin,
  );
}

/** Start a fresh client session; room links and credentials never cross origins. */
export function getClientUrl(environment: ClientEnvironment): string {
  return `${CLIENT_ORIGINS[environment]}/`;
}
