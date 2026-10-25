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

export function getClientEnvironment(
  clientOrigin: string,
): ClientEnvironment | undefined {
  return (Object.keys(CLIENT_ORIGINS) as ClientEnvironment[]).find(
    (environment) => CLIENT_ORIGINS[environment] === clientOrigin,
  );
}

/**
 * Start a fresh client session; room links and credentials never cross
 * origins. Only the Android-app flag is carried over (see nativeApp.ts).
 */
export function getClientUrl(
  environment: ClientEnvironment,
  fromNativeApp: boolean = IS_NATIVE_APP,
): string {
  const url = `${CLIENT_ORIGINS[environment]}/`;
  return fromNativeApp
    ? `${url}?${NATIVE_APP_PARAM}=${NATIVE_APP_PARAM_VALUE}`
    : url;
}
