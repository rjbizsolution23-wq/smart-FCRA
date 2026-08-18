/**
 * Persist TradelineMaster inventory + send RJ payment/order emails.
 */
import { sendAppEmail, type EmailEnv } from './email';
import {
  fetchTradelines,
  fetchTradelineMasterUser,
  TRADELINE_BRAND,
  TRADELINE_FROM_EMAIL_DEFAULT,
  TRADELINE_OPS_EMAIL_DEFAULT,
  type EnrichedTradeline,
  type TradelineMasterEnv,
} from './tradelinemaster-client';

export type TradelineSyncEnv = TradelineMasterEnv & EmailEnv & {
  DB: any;
  TRADELINE_OPS_EMAIL?: string;
  TRADELINE_FROM_EMAIL?: string;
};

export async function syncTradelineInventory(env: TradelineSyncEnv): Promise<{
  ok: boolean;
  count: number;
  fetchedAt: string;
  balance?: number;
  error?: string;
}> {
  const fetched = await fetchTradelines(env);
  const user = await fetchTradelineMasterUser(env).catch(() => ({ ok: false as const }));
  const balance = user.ok ? Number(user.user?.Balance ?? 0) : undefined;
  const ledgerUser = user.ok ? user.user?.UserName : undefined;

  if (!fetched.ok) {
    try {
      await env.DB.prepare(
        `INSERT INTO tradeline_inventory_meta (id, last_fetched_at, last_fetch_ok, last_count, last_error, ledger_balance, ledger_user, updated_at)
         VALUES ('default', ?, 0, 0, ?, ?, ?, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
           last_fetched_at=excluded.last_fetched_at,
           last_fetch_ok=0,
           last_error=excluded.last_error,
           ledger_balance=excluded.ledger_balance,
           ledger_user=excluded.ledger_user,
           updated_at=datetime('now')`,
      ).bind(fetched.fetchedAt, fetched.error || 'fetch_failed', balance ?? null, ledgerUser || null).run();
    } catch { /* migration pending */ }
    return { ok: false, count: 0, fetchedAt: fetched.fetchedAt, balance, error: fetched.error };
  }

  try {
    await env.DB.prepare('DELETE FROM tradeline_inventory').run();
    for (const t of fetched.tradelines) {
      await env.DB.prepare(
        `INSERT INTO tradeline_inventory (
          id, lender, spots_available, credit_limit, cycles, date_opened, statement_date, posting_date,
          cardholder_address_id, wholesale_price, retail_price, markup_rate, statement_day, posting_day,
          account_age_label, posting_window_label, raw_json, fetched_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      ).bind(
        t.id, t.lender, t.spotsAvailable, t.creditLimit, t.cycles, t.dateOpened, t.statementDate, t.postingDate,
        t.cardholderAddressId, t.wholesalePrice, t.retailPrice, t.markupRate, t.statementDay, t.postingDay,
        t.accountAgeLabel, t.postingWindowLabel, JSON.stringify(t), fetched.fetchedAt,
      ).run();
    }
    await env.DB.prepare(
      `INSERT INTO tradeline_inventory_meta (id, last_fetched_at, last_fetch_ok, last_count, last_error, ledger_balance, ledger_user, updated_at)
       VALUES ('default', ?, 1, ?, NULL, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         last_fetched_at=excluded.last_fetched_at,
         last_fetch_ok=1,
         last_count=excluded.last_count,
         last_error=NULL,
         ledger_balance=excluded.ledger_balance,
         ledger_user=excluded.ledger_user,
         updated_at=datetime('now')`,
    ).bind(fetched.fetchedAt, fetched.tradelines.length, balance ?? null, ledgerUser || null).run();
  } catch (e: any) {
    return {
      ok: true,
      count: fetched.tradelines.length,
      fetchedAt: fetched.fetchedAt,
      balance,
      error: `cache_write_failed: ${e?.message || e}`,
    };
  }

  return { ok: true, count: fetched.tradelines.length, fetchedAt: fetched.fetchedAt, balance };
}

export async function loadCachedTradelines(env: { DB: any }): Promise<{
  tradelines: EnrichedTradeline[];
  meta: any;
}> {
  let rows: any[] = [];
  let meta: any = null;
  try {
    const r = await env.DB.prepare(
      `SELECT * FROM tradeline_inventory ORDER BY statement_date ASC, retail_price ASC`,
    ).all();
    rows = r.results || [];
    meta = await env.DB.prepare(`SELECT * FROM tradeline_inventory_meta WHERE id = 'default'`).first();
  } catch {
    return { tradelines: [], meta: null };
  }
  const tradelines = rows.map((row) => {
    try {
      if (row.raw_json) return JSON.parse(row.raw_json) as EnrichedTradeline;
    } catch { /* fall through */ }
    return {
      id: row.id,
      lender: row.lender,
      spotsAvailable: row.spots_available,
      creditLimit: row.credit_limit,
      cycles: row.cycles,
      dateOpened: row.date_opened,
      statementDate: row.statement_date,
      postingDate: row.posting_date,
      cardholderAddressId: row.cardholder_address_id,
      wholesalePrice: row.wholesale_price,
      retailPrice: row.retail_price,
      markupRate: row.markup_rate,
      markupAmount: Number(row.retail_price) - Number(row.wholesale_price),
      statementDay: row.statement_day,
      postingDay: row.posting_day,
      postingWindowStart: '',
      postingWindowEnd: '',
      postingWindowLabel: row.posting_window_label,
      accountAgeYears: 0,
      accountAgeMonths: 0,
      accountAgeLabel: row.account_age_label,
      statementLabel: row.statement_date,
    } as EnrichedTradeline;
  });
  return { tradelines, meta };
}

export function money(n: number): string {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function sendTradelineOrderEmails(
  env: TradelineSyncEnv,
  opts: {
    orderId: string;
    tradeline: EnrichedTradeline;
    client: Record<string, any>;
    status: string;
    tlmOrderId?: number | null;
    tlmMessage?: string | null;
    placeLive?: boolean;
  },
): Promise<{ ops: any; client: any }> {
  const opsTo = env.TRADELINE_OPS_EMAIL || TRADELINE_OPS_EMAIL_DEFAULT;
  const from = env.TRADELINE_FROM_EMAIL || TRADELINE_FROM_EMAIL_DEFAULT;
  const c = opts.client || {};
  const t = opts.tradeline;
  const subject = `[${TRADELINE_BRAND}] Tradeline ${opts.status.toUpperCase()} — ${t.lender} ${money(t.creditLimit)} · ${c.FirstName || ''} ${c.LastName || ''}`.trim();

  const detailsHtml = `
    <div style="font-family:Georgia,serif;max-width:640px;margin:0 auto;color:#1a1a1a">
      <div style="background:linear-gradient(135deg,#0b1f33,#1a3a5c);color:#fff;padding:20px 24px;border-radius:12px 12px 0 0">
        <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.8">${TRADELINE_BRAND}</div>
        <h1 style="margin:6px 0 0;font-size:22px">Tradeline Order Update</h1>
      </div>
      <div style="border:1px solid #d9e2ec;border-top:0;padding:20px 24px;border-radius:0 0 12px 12px;background:#f8fafc">
        <p><strong>Internal order:</strong> ${opts.orderId}<br/>
        <strong>Status:</strong> ${opts.status}<br/>
        ${opts.tlmOrderId ? `<strong>TradelineMaster OrderId:</strong> ${opts.tlmOrderId}<br/>` : ''}
        ${opts.tlmMessage ? `<strong>API message:</strong> ${opts.tlmMessage}<br/>` : ''}
        </p>
        <h3 style="margin:16px 0 8px">Tradeline</h3>
        <ul>
          <li>Lender: <strong>${t.lender}</strong> (#${t.id})</li>
          <li>Limit: <strong>${money(t.creditLimit)}</strong> · Spots: ${t.spotsAvailable}</li>
          <li>Statement: ${t.statementLabel} · Posting: ${t.postingWindowLabel}</li>
          <li>Age: ${t.accountAgeLabel} · Cycles: ${t.cycles}</li>
          <li>Price: <strong>${money(t.retailPrice)}</strong></li>
          <li>Internal cost: ${money(t.wholesalePrice)}</li>
        </ul>
        <h3 style="margin:16px 0 8px">Client</h3>
        <ul>
          <li>${c.FirstName || ''} ${c.MiddleName || ''} ${c.LastName || ''} ${c.Suffix || ''}</li>
          <li>Email: ${c.Email || '—'}</li>
          <li>Phone: ${c.Phone || '—'}</li>
          <li>DOB: ${c.DOB || '—'}</li>
          <li>Address: ${c.PhysicalAddress || ''}, ${c.City || ''} ${c.StateCode || ''} ${c.ZipCode || ''}</li>
          <li>Credit portal: ${c.CreditReportAgencyURL || '—'}</li>
          <li>Portal user: ${c.CreditReportAgencyUsername || '—'}</li>
        </ul>
        <div style="margin-top:18px;padding:14px;background:#fff7ed;border:1px solid #fdba74;border-radius:8px">
          <strong>Payment / placement:</strong> Reply to this thread or email
          <a href="mailto:${opsTo}">${opsTo}</a>.
          Retail due: <strong>${money(t.retailPrice)}</strong>.
          ${opts.placeLive ? 'Live API placement was attempted.' : 'Order is held as a quote until payment clears / ledger is funded.'}
        </div>
        <p style="font-size:12px;color:#64748b;margin-top:16px">Sent via Smart FCRA · ${from}</p>
      </div>
    </div>`;

  const text = `${subject}\nOrder ${opts.orderId}\n${t.lender} ${money(t.creditLimit)}\nRetail ${money(t.retailPrice)}\nPay/contact: ${opsTo}`;

  const ops = await sendAppEmail(env, {
    to: opsTo,
    from,
    fromName: TRADELINE_BRAND,
    subject,
    html: detailsHtml,
    text,
    purpose: 'support',
  });

  let clientMail: any = { sent: false, skipped: true };
  if (c.Email) {
    clientMail = await sendAppEmail(env, {
      to: String(c.Email),
      from,
      fromName: TRADELINE_BRAND,
      subject: `Your tradeline request — ${t.lender} ${money(t.creditLimit)}`,
      html: `
        <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto">
          <h2>${TRADELINE_BRAND}</h2>
          <p>Hi ${c.FirstName || 'there'},</p>
          <p>We received your authorized-user tradeline request for <strong>${t.lender}</strong>
          with a <strong>${money(t.creditLimit)}</strong> limit (${t.accountAgeLabel}).</p>
          <p>Investment: <strong>${money(t.retailPrice)}</strong> · Statement ${t.statementLabel} · Posting ${t.postingWindowLabel}</p>
          <p>For payment instructions and next steps, email
          <a href="mailto:${opsTo}">${opsTo}</a> and reference order <code>${opts.orderId}</code>.</p>
          <p style="font-size:12px;color:#64748b">Educational note: AU results vary by bureau and are not guaranteed.</p>
        </div>`,
      text: `Tradeline request ${opts.orderId}. Pay/contact ${opsTo}. Amount ${money(t.retailPrice)}.`,
      purpose: 'support',
    });
  }

  return { ops, client: clientMail };
}
