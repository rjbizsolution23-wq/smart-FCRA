/**
 * Calling hours engine — block marketing calls outside permitted local windows.
 * Default US: 8:00 AM – 9:00 PM consumer local time (configure with counsel).
 */
export type CallingHoursConfig = {
  startHour: number;
  endHour: number;
  timezone?: string;
};

export const DEFAULT_CALLING_HOURS: CallingHoursConfig = {
  startHour: 8,
  endHour: 21,
};

const TZ_FALLBACK = 'America/Denver';

export function resolveClientTimezone(client?: { timezone?: string; state?: string } | null): string {
  if (client?.timezone) return client.timezone;
  const stateTz: Record<string, string> = {
    CA: 'America/Los_Angeles', WA: 'America/Los_Angeles', OR: 'America/Los_Angeles',
    NV: 'America/Los_Angeles', AZ: 'America/Phoenix',
    TX: 'America/Chicago', IL: 'America/Chicago', CO: 'America/Denver',
    NY: 'America/New_York', FL: 'America/New_York', NJ: 'America/New_York',
    NM: 'America/Denver',
  };
  if (client?.state && stateTz[client.state.toUpperCase()]) return stateTz[client.state.toUpperCase()];
  return TZ_FALLBACK;
}

export function localHourNow(timezone: string, at = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    }).formatToParts(at);
    const h = parts.find((p) => p.type === 'hour')?.value;
    return Number(h ?? 12);
  } catch {
    return at.getUTCHours();
  }
}

export function canPlaceMarketingCall(opts: {
  client?: { timezone?: string; state?: string; marketing_call_consent?: number } | null;
  config?: CallingHoursConfig;
  at?: Date;
}): { allowed: boolean; reason?: string; localHour?: number; timezone?: string } {
  if (opts.client && opts.client.marketing_call_consent !== 1) {
    return { allowed: false, reason: 'Marketing call consent not granted' };
  }
  const cfg = opts.config || DEFAULT_CALLING_HOURS;
  const tz = resolveClientTimezone(opts.client);
  const hour = localHourNow(tz, opts.at);
  if (hour < cfg.startHour || hour >= cfg.endHour) {
    return {
      allowed: false,
      reason: `Outside permitted calling window (${cfg.startHour}:00–${cfg.endHour}:00 ${tz})`,
      localHour: hour,
      timezone: tz,
    };
  }
  return { allowed: true, localHour: hour, timezone: tz };
}

export type CallRecordingPolicy = {
  jurisdiction: string;
  disclosureRequired: boolean;
  twoPartyConsent: boolean;
  retentionYears: number;
};

export const DEFAULT_CALL_RECORDING_POLICIES: CallRecordingPolicy[] = [
  { jurisdiction: 'US-default', disclosureRequired: true, twoPartyConsent: false, retentionYears: 7 },
  { jurisdiction: 'CA', disclosureRequired: true, twoPartyConsent: true, retentionYears: 7 },
  { jurisdiction: 'FL', disclosureRequired: true, twoPartyConsent: true, retentionYears: 7 },
  { jurisdiction: 'TX', disclosureRequired: true, twoPartyConsent: false, retentionYears: 7 },
  { jurisdiction: 'NY', disclosureRequired: true, twoPartyConsent: true, retentionYears: 7 },
];

export function recordingPolicyForState(state?: string): CallRecordingPolicy {
  const s = String(state || '').toUpperCase();
  return DEFAULT_CALL_RECORDING_POLICIES.find((p) => p.jurisdiction === s)
    || DEFAULT_CALL_RECORDING_POLICIES[0];
}
