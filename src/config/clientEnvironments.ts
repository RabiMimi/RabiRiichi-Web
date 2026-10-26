import config from '../../android/client-config.json';
import {
  IS_NATIVE_APP,
  NATIVE_APP_PARAM,
  NATIVE_APP_PARAM_VALUE,
} from './nativeApp';

export const CLIENT_ORIGINS = config.origins;
/** Release page for the APK; users download it from there by hand. */
export const CLIENT_DOWNLOAD_PAGE_URL = config.downloadPageUrl;
export type ClientEnvironment = keyof typeof CLIENT_ORIGINS;
export type ClientOrigins = Record<ClientEnvironment, string>;

/**
 * The primary origins first, then each mirror set (e.g. a mainland China CDN).
 * A mirror serves the same build, so its players switch within the mirror
 * rather than being sent back to the slow route.
 */
const CLIENT_ORIGIN_SETS: readonly ClientOrigins[] = [
  CLIENT_ORIGINS,
  ...config.mirrors.map((mirror) => mirror.origins),
];

function findEnvironment(
  origins: ClientOrigins,
  clientOrigin: string,
): ClientEnvironment | undefined {
  return (Object.keys(origins) as ClientEnvironment[]).find(
    (environment) => origins[environment] === clientOrigin,
  );
}

export function getClientEnvironment(
  clientOrigin: string,
): ClientEnvironment | undefined {
  for (const origins of CLIENT_ORIGIN_SETS) {
    const environment = findEnvironment(origins, clientOrigin);
    if (environment) return environment;
  }
  return undefined;
}

/** The origin set `clientOrigin` belongs to; unknown origins use the primary. */
function originSetFor(clientOrigin: string): ClientOrigins {
  return (
    CLIENT_ORIGIN_SETS.find((origins) =>
      findEnvironment(origins, clientOrigin),
    ) ?? CLIENT_ORIGINS
  );
}

/**
 * Start a fresh client session; room links and credentials never cross
 * origins. Only the Android-app flag is carried over (see nativeApp.ts).
 */
export function getClientUrl(
  environment: ClientEnvironment,
  currentOrigin: string,
  fromNativeApp: boolean = IS_NATIVE_APP,
): string {
  const url = `${originSetFor(currentOrigin)[environment]}/`;
  return fromNativeApp
    ? `${url}?${NATIVE_APP_PARAM}=${NATIVE_APP_PARAM_VALUE}`
    : url;
}
