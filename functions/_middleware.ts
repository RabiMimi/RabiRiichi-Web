/**
 * Cloudflare Pages middleware: sends mainland China page loads to the mirror
 * CDN, which pulls from this same deployment (see src/config/mirrorRedirect.ts).
 */
import { getMirrorRedirect } from '../src/config/mirrorRedirect';

interface PagesContext {
  request: Request & { cf?: { country?: string } };
  next: () => Promise<Response>;
}

export async function onRequest({
  request,
  next,
}: PagesContext): Promise<Response> {
  const target = getMirrorRedirect(request, request.cf?.country);
  if (!target) return next();
  return new Response(null, {
    status: 302,
    headers: {
      Location: target,
      // Per-visitor decision: never let a shared cache replay it.
      'Cache-Control': 'private, no-store',
    },
  });
}
