/**
 * MyFreeScoreNow (MFSN) API Client — Workers-safe.
 *
 * Auth + fetch-3B-json. No zod dependency. Credentials MUST come from
 * constructor args or Cloudflare env — never hardcoded.
 *
 * Docs: https://myfreescorenow.portal.swaggerhub.com/reporting/docs/mfsn-reports-v-1-0-0
 */

export type BureauCode = 'EFX' | 'TU' | 'EXP' | 'UNKNOWN';
export type ScoreRange = 'POOR' | 'FAIR' | 'GOOD' | 'VERY_GOOD' | 'EXCEPTIONAL';

export type MFSNClientConfig = {
  apiUrl?: string;
  email: string;
  password: string;
  clientToken: string;
};

export class MFSNError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly response?: unknown,
  ) {
    super(message);
    this.name = 'MFSNError';
  }
}

export type NormalizedCreditReport = {
  pulledAt: string;
  bureaus: BureauCode[];
  scores: Array<{
    provider: BureauCode;
    score: number;
    scoreRange: ScoreRange;
    scoreModel: string;
    scoreReasons: unknown[];
  }>;
  summary: {
    totalOpenAccounts: number;
    totalNegativeAccounts: number;
    totalInquiries: number;
    totalPublicRecords: number;
    totalCollections: number;
    lengthOfCreditHistoryMonths: number;
    averageAccountAgeMonths: number;
    oldestAccountName?: string;
  };
  accounts: Array<{
    provider: BureauCode;
    accountName?: string;
    accountType?: string;
    balance?: number;
    creditLimit?: number;
    monthlyPayment?: number;
    isNegative: boolean;
    isDelinquent: boolean;
    openedDate?: string;
    status?: string;
  }>;
  inquiries: Array<{ provider: BureauCode; type: string; reportedDate?: string }>;
  collections: Array<{
    provider: BureauCode;
    agencyClient?: string;
    amount?: number;
    status?: string;
  }>;
};

function asBureau(v: unknown): BureauCode {
  const s = String(v || '').toUpperCase();
  if (s === 'EFX' || s === 'EQUIFAX') return 'EFX';
  if (s === 'TU' || s === 'TRANSUNION') return 'TU';
  if (s === 'EXP' || s === 'EXPERIAN') return 'EXP';
  return 'UNKNOWN';
}

export class MFSNClient {
  private accessToken: string | null = null;
  private sessionId: string | null = null;
  private tokenExpiresAt = 0;
  private readonly apiUrl: string;
  private readonly email: string;
  private readonly password: string;
  private readonly clientToken: string;

  constructor(config: MFSNClientConfig) {
    if (!config.email || !config.password || !config.clientToken) {
      throw new MFSNError(400, 'CONFIG_MISSING', 'MFSN email, password, and clientToken are required');
    }
    this.apiUrl = (config.apiUrl || 'https://api.myfreescorenow.com').replace(/\/$/, '');
    this.email = config.email;
    this.password = config.password;
    this.clientToken = config.clientToken;
  }

  static fromEnv(env: {
    MFSN_API_URL?: string;
    MFSN_EMAIL?: string;
    MFSN_PASSWORD?: string;
    MFSN_CLIENT_TOKEN?: string;
  }): MFSNClient {
    return new MFSNClient({
      apiUrl: env.MFSN_API_URL,
      email: env.MFSN_EMAIL || '',
      password: env.MFSN_PASSWORD || '',
      clientToken: env.MFSN_CLIENT_TOKEN || '',
    });
  }

  async login(): Promise<{ accessToken: string; sessionId?: string; raw: any }> {
    const formData = new FormData();
    formData.append('email', this.email);
    formData.append('password', this.password);

    const response = await fetch(`${this.apiUrl}/api/auth/login`, {
      method: 'POST',
      body: formData,
    });

    const data: any = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      throw new MFSNError(response.status, 'LOGIN_FAILED', data.message || 'MFSN login failed', data);
    }

    const accessToken =
      data?.data?.accessToken ||
      data?.accessToken ||
      data?.token ||
      data?.data?.token;
    const sessionId = data?.data?.sessionId || data?.sessionId;

    if (!accessToken) {
      throw new MFSNError(500, 'INVALID_RESPONSE', 'MFSN login response missing access token', data);
    }

    this.accessToken = String(accessToken);
    this.sessionId = sessionId ? String(sessionId) : null;
    this.tokenExpiresAt = Date.now() + 60 * 60 * 1000;

    return { accessToken: this.accessToken, sessionId: this.sessionId || undefined, raw: data };
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.accessToken || Date.now() >= this.tokenExpiresAt - 60_000) {
      await this.login();
    }
  }

  async logout(): Promise<void> {
    if (!this.accessToken) return;
    try {
      await fetch(`${this.apiUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
    } finally {
      this.accessToken = null;
      this.sessionId = null;
      this.tokenExpiresAt = 0;
    }
  }

  /** Fetch raw 3-bureau JSON for a member email. */
  async fetch3BReport(memberEmail: string): Promise<any> {
    await this.ensureAuthenticated();

    const formData = new FormData();
    formData.append('email', memberEmail);
    formData.append('client_token', this.clientToken);

    const response = await fetch(`${this.apiUrl}/api/auth/fetch-3B-json`, {
      method: 'POST',
      body: formData,
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    const data: any = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      const errMsg = data?.message || 'Report fetch failed';
      let code = 'FETCH_FAILED';
      if (String(errMsg).includes('suspended')) code = 'USER_SUSPENDED';
      else if (String(errMsg).toLowerCase().includes('not found')) code = 'USER_NOT_FOUND';
      else if (String(errMsg).includes('TOKEN')) code = 'TOKEN_INVALID';
      throw new MFSNError(response.status || 400, code, errMsg, data);
    }
    return data;
  }

  getScoreRange(score: number): ScoreRange {
    if (score >= 800) return 'EXCEPTIONAL';
    if (score >= 740) return 'VERY_GOOD';
    if (score >= 670) return 'GOOD';
    if (score >= 580) return 'FAIR';
    return 'POOR';
  }

  normalizeReport(raw: any): NormalizedCreditReport {
    const views = raw?.data?.providerViews || [];
    const bureaus = views.map((v: any) => asBureau(v.provider)).filter((b: BureauCode) => b !== 'UNKNOWN') as BureauCode[];

    const scores = views
      .filter((v: any) => v?.summary?.creditScore?.score != null)
      .map((v: any) => {
        const score = Number(v.summary.creditScore.score);
        return {
          provider: asBureau(v.provider),
          score,
          scoreRange: this.getScoreRange(score),
          scoreModel: 'VantageScore 3.0',
          scoreReasons: v.summary.creditScore.scoreReasons || [],
        };
      });

    const firstSummary = views.find((v: any) => v.summary)?.summary;
    const summary = {
      totalOpenAccounts:
        (firstSummary?.revolvingAccounts?.totalAccounts || 0) +
        (firstSummary?.mortgageAccounts?.totalAccounts || 0) +
        (firstSummary?.installmentAccounts?.totalAccounts || 0) +
        (firstSummary?.otherAccounts?.totalAccounts || 0),
      totalNegativeAccounts: firstSummary?.totalNegativeAccounts || 0,
      totalInquiries: firstSummary?.totalInquires || firstSummary?.totalInquiries || 0,
      totalPublicRecords: firstSummary?.totalPublicRecords || 0,
      totalCollections: firstSummary?.totalCollections || 0,
      lengthOfCreditHistoryMonths: firstSummary?.lengthOfCreditHistoryMonths || 0,
      averageAccountAgeMonths: firstSummary?.averageAccountAgeMonths || 0,
      oldestAccountName: firstSummary?.oldestAccountName,
    };

    const accounts: NormalizedCreditReport['accounts'] = [];
    for (const view of views) {
      const allAccounts = [
        ...(view.revolvingAccounts || []),
        ...(view.mortgageAccounts || []),
        ...(view.installmentAccounts || []),
        ...(view.otherAccounts || []),
      ];
      for (const acc of allAccounts) {
        accounts.push({
          provider: asBureau(view.provider),
          accountName: acc.accountName,
          accountType: acc.accountType,
          balance: acc.balanceAmount?.amount,
          creditLimit: acc.creditLimitAmount?.amount,
          monthlyPayment: acc.monthlyPayment?.amount,
          isNegative: Boolean(acc.isNegative),
          isDelinquent: Boolean(acc.isDelinquent),
          openedDate: acc.dateOpened,
          status: acc.accountStatus,
        });
      }
    }

    const inquiries: NormalizedCreditReport['inquiries'] = [];
    for (const view of views) {
      for (const inq of view.inquiries || []) {
        inquiries.push({
          provider: asBureau(view.provider),
          type: inq.type || 'OTHER',
          reportedDate: inq.reportedDate,
        });
      }
    }

    const collections: NormalizedCreditReport['collections'] = [];
    for (const view of views) {
      for (const col of view.collections || []) {
        collections.push({
          provider: asBureau(view.provider),
          agencyClient: col.agencyClient,
          amount: col.amount?.amount ?? col.orginalAmountOwed?.amount,
          status: col.status,
        });
      }
    }

    return {
      pulledAt: new Date().toISOString(),
      bureaus,
      scores,
      summary,
      accounts,
      inquiries,
      collections,
    };
  }

  async fetchAndNormalize(memberEmail: string): Promise<{ raw: any; normalized: NormalizedCreditReport }> {
    const raw = await this.fetch3BReport(memberEmail);
    return { raw, normalized: this.normalizeReport(raw) };
  }
}

/** Resolve credentials: request body overrides env secrets. */
export function resolveMfsnCredentials(
  body: { username?: string; password?: string; secretWord?: string; clientToken?: string },
  env: { MFSN_EMAIL?: string; MFSN_PASSWORD?: string; MFSN_CLIENT_TOKEN?: string; MFSN_API_URL?: string },
): MFSNClientConfig | null {
  const email = (body.username || env.MFSN_EMAIL || '').trim();
  const password = (body.password || env.MFSN_PASSWORD || '').trim();
  const clientToken = (body.secretWord || body.clientToken || env.MFSN_CLIENT_TOKEN || '').trim();
  if (!email || !password || !clientToken) return null;
  return { apiUrl: env.MFSN_API_URL, email, password, clientToken };
}
