const MOBILE_USER_AGENT =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

/**
 * Whether the browser runs on a phone or tablet, which play landscape-only.
 *
 * iPadOS Safari reports a desktop ("Macintosh") user agent by default, so an
 * iPad would slip past a user-agent check and be left playing in portrait. It
 * is told apart from a Mac by its multi-touch screen.
 */
export function isHandheldDevice(
  userAgent: string,
  maxTouchPoints: number,
): boolean {
  return (
    MOBILE_USER_AGENT.test(userAgent) ||
    (userAgent.includes('Macintosh') && maxTouchPoints > 1)
  );
}
