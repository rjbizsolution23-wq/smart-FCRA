/**
 * Twilio Video conference rooms + Access Tokens (Workers-compatible JWT).
 * Advisor consults / coaching — NOT a substitute for certified RON.
 */
export type VideoEnv = {
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_API_KEY_SID?: string;
  TWILIO_API_KEY_SECRET?: string;
  TWILIO_PHONE_NUMBER?: string;
  DB: any;
  DOCS?: R2Bucket;
};

function b64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function videoConfigured(env: VideoEnv): boolean {
  return !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_API_KEY_SID && env.TWILIO_API_KEY_SECRET);
}

export async function createTwilioVideoAccessToken(
  env: VideoEnv,
  opts: { identity: string; roomName: string; ttlSeconds?: number },
): Promise<{ token: string; identity: string; roomName: string; expiresAt: number; simulated?: boolean }> {
  const ttl = opts.ttlSeconds || 3600;
  const exp = Math.floor(Date.now() / 1000) + ttl;
  if (!videoConfigured(env)) {
    return {
      token: `sim_${b64url(JSON.stringify({ identity: opts.identity, room: opts.roomName, exp }))}`,
      identity: opts.identity,
      roomName: opts.roomName,
      expiresAt: exp,
      simulated: true,
    };
  }

  const header = { typ: 'JWT', alg: 'HS256', cty: 'twilio-fpa;v=1' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    jti: `${env.TWILIO_API_KEY_SID}-${now}`,
    iss: env.TWILIO_API_KEY_SID,
    sub: env.TWILIO_ACCOUNT_SID,
    iat: now,
    exp,
    grants: {
      identity: opts.identity,
      video: { room: opts.roomName },
    },
  };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(payload));
  const data = `${h}.${p}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.TWILIO_API_KEY_SECRET!),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return {
    token: `${data}.${b64url(sig)}`,
    identity: opts.identity,
    roomName: opts.roomName,
    expiresAt: exp,
  };
}

async function twilioBasicAuth(env: VideoEnv): Promise<string | null> {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) return null;
  return btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);
}

export async function createVideoRoom(
  env: VideoEnv,
  opts: {
    orgId: string;
    clientId?: string | null;
    hostUserId: string;
    purpose?: string;
    recordingEnabled?: boolean;
    uniqueName?: string;
  },
) {
  const sessionId = crypto.randomUUID().replace(/-/g, '').slice(0, 24);
  const roomName = opts.uniqueName || `sfcra-${opts.orgId.slice(0, 8)}-${sessionId}`;
  let roomSid: string | null = null;
  let status = 'scheduled';
  let meta: any = { provider: 'twilio_video' };

  const auth = await twilioBasicAuth(env);
  if (auth && videoConfigured(env)) {
    try {
      const body = new URLSearchParams({
        UniqueName: roomName,
        Type: 'group',
        RecordParticipantsOnConnect: opts.recordingEnabled === false ? 'false' : 'true',
      });
      const res = await fetch('https://video.twilio.com/v1/Rooms', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });
      const data = await res.json() as any;
      if (res.ok) {
        roomSid = data.sid;
        status = 'live';
        meta.twilio = { sid: data.sid, status: data.status };
      } else {
        meta.twilioError = data.message || data;
        // Fall through to local scheduled room
        status = 'scheduled';
      }
    } catch (e: any) {
      meta.twilioError = e.message;
    }
  } else {
    meta.simulated = true;
    status = 'scheduled';
  }

  await env.DB.prepare(
    `INSERT INTO video_conference_sessions
      (id, org_id, client_id, room_name, room_sid, purpose, status, host_user_id, recording_enabled, scheduled_at, started_at, metadata_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, datetime('now'), datetime('now'))`
  ).bind(
    sessionId,
    opts.orgId,
    opts.clientId || null,
    roomName,
    roomSid,
    opts.purpose || 'advisor_consult',
    status,
    opts.hostUserId,
    opts.recordingEnabled === false ? 0 : 1,
    status === 'live' ? new Date().toISOString() : null,
    JSON.stringify(meta),
  ).run();

  return {
    sessionId,
    roomName,
    roomSid,
    status,
    recordingEnabled: opts.recordingEnabled !== false,
    simulated: !!meta.simulated || !roomSid,
    purpose: opts.purpose || 'advisor_consult',
  };
}

export async function issueRoomToken(
  env: VideoEnv,
  opts: { sessionId: string; orgId: string; identity: string },
) {
  const row = await env.DB.prepare(
    `SELECT * FROM video_conference_sessions WHERE id = ? AND org_id = ?`
  ).bind(opts.sessionId, opts.orgId).first() as any;
  if (!row) throw new Error('Video session not found');
  if (row.status === 'cancelled' || row.status === 'completed') {
    throw new Error(`Session is ${row.status}`);
  }
  const token = await createTwilioVideoAccessToken(env, {
    identity: opts.identity,
    roomName: row.room_name,
  });
  return { ...token, sessionId: row.id, roomSid: row.room_sid, status: row.status, purpose: row.purpose };
}

export async function completeVideoSession(
  env: VideoEnv,
  opts: { sessionId: string; orgId: string; recordingSid?: string; compositionSid?: string },
) {
  await env.DB.prepare(
    `UPDATE video_conference_sessions SET status = 'completed', ended_at = datetime('now'), recording_sid = COALESCE(?, recording_sid), composition_sid = COALESCE(?, composition_sid), updated_at = datetime('now')
     WHERE id = ? AND org_id = ?`
  ).bind(opts.recordingSid || null, opts.compositionSid || null, opts.sessionId, opts.orgId).run();
  return { ok: true, sessionId: opts.sessionId };
}
