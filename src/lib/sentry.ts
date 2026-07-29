/**
 * Lightweight Sentry reporter for Cloudflare Workers (no SDK dependency).
 * Parses SENTRY_DSN and POSTs envelope to Sentry ingest API.
 */

type SentryLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

interface SentryContext {
  dsn?: string;
  environment?: string;
  release?: string;
  request?: {
    method?: string;
    path?: string;
    ip?: string;
    userAgent?: string;
  };
  user?: { id?: string; email?: string };
  extra?: Record<string, unknown>;
}

function parseDsn(dsn: string): { publicKey: string; host: string; projectId: string } | null {
  try {
    const u = new URL(dsn);
    const publicKey = u.username;
    const projectId = u.pathname.replace(/^\//, '');
    if (!publicKey || !projectId) return null;
    return { publicKey, host: u.host, projectId };
  } catch {
    return null;
  }
}

export async function captureSentryException(
  error: Error,
  ctx: SentryContext
): Promise<{ sent: boolean; reason?: string }> {
  const dsn = ctx.dsn?.trim();
  if (!dsn) return { sent: false, reason: 'no_dsn' };

  const parsed = parseDsn(dsn);
  if (!parsed) return { sent: false, reason: 'invalid_dsn' };

  const eventId = crypto.randomUUID().replace(/-/g, '');
  const timestamp = Date.now() / 1000;

  const event = {
    event_id: eventId,
    timestamp,
    platform: 'javascript',
    level: 'error' as SentryLevel,
    environment: ctx.environment || 'production',
    release: ctx.release || 'smart-fcra-v2@2.0.0',
    exception: {
      values: [{
        type: error.name || 'Error',
        value: error.message,
        stacktrace: {
          frames: (error.stack || '')
            .split('\n')
            .slice(1, 12)
            .map((line) => ({ filename: line.trim() })),
        },
      }],
    },
    request: ctx.request ? {
      method: ctx.request.method,
      url: ctx.request.path,
      headers: {
        'User-Agent': ctx.request.userAgent || '',
      },
    } : undefined,
    user: ctx.user,
    extra: ctx.extra,
    tags: { runtime: 'cloudflare-workers', product: 'smart-fcra-v2' },
  };

  const envelope = [
    JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString(), dsn }),
    JSON.stringify({ type: 'event' }),
    JSON.stringify(event),
  ].join('\n');

  const url = `https://${parsed.host}/api/${parsed.projectId}/envelope/?sentry_version=7&sentry_key=${parsed.publicKey}&sentry_client=smart-fcra-worker/2.0.0`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
      body: envelope,
    });
    if (!res.ok) {
      return { sent: false, reason: `http_${res.status}` };
    }
    return { sent: true };
  } catch (e: any) {
    return { sent: false, reason: e?.message || 'fetch_failed' };
  }
}
