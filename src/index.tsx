import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-pages';
import Stripe from 'stripe';
import { generateId, hashPassword, verifyPassword, needsPasswordRehash, createSessionToken, generateEmailToken, generateMFASecret, verifyTOTP } from './lib/auth';
import { encryptText, decryptText, decryptTextSafe, requireEncryptionKey } from './lib/crypto';
import { generateAiText, listConfiguredProviders, generateFreeImage } from './lib/ai-providers';
import { sendAppEmail } from './lib/email';
import { MENTORS, buildMentorContext, KNOWLEDGE_CORPUS_META, retrieveCaseLawKnowledge, type MentorId } from './lib/mentors';
import { estimateViolationScoreLift } from './data/fundability-engine';
import { sendPortalWelcomeEmail, computeAndStoreFundability, portalBaseUrl, isSyntheticPortalEmail, tradelineRecsForClient } from './lib/portal-services';
import { EDUCATION_LIBRARY, getLessonById, TRADELINE_CATALOG } from './data/portal-education';
import { matchLenders } from './data/funding/lender-matching';
import { catalogStats, LENDER_CATALOG } from './data/funding/lenders-catalog';
import { parseBankStatementText } from './data/bank-underwriting';
import { writeSecurityAudit, buildSecurityPosture, passwordMeetsPolicy } from './lib/security-compliance';
import { dispatchClientAlert } from './lib/alerts';
import { parseCreditReportText, computeRevolvingUtilization } from './engine/parser';
import { detectViolations, calculateLitigationScore, type CreditReportData } from './engine/violations';
import { analyzeReportLive } from './engine/violation-factcheck';
import { seedKnowledgeBase, retrieveKnowledge } from './lib/knowledge-base';
import { listEmailTemplates, sendTemplatedClientMessage, EMAIL_TEMPLATES } from './lib/email-templates';
import { runEnterpriseCommsCron } from './lib/email-workflows';
import {
  loadOrgBrand,
  brandVars,
  loadOrgLetterhead,
  mergeLetterheadIntoSettings,
  brandLetterContent,
  normalizeOrgLetterhead,
} from './lib/org-branding';
import { recommendLetterStrategy, selectWorkflowPackTypes } from './engine/letter-strategy';
import { classifyBureauReply, isReplyUploadCategory } from './engine/bureau-reply-intel';
import { runOpsPack, runOpsJob, listOpsJobs, touchClientEngagement, type OpsJobName } from './lib/ops-scheduler';
import { issueClientContractPack, createLegalContract, signLegalContract, recordEsignConsent } from './lib/legal-contracts';
import { ESIGN_DISCLOSURE_TEXT, ESIGN_DISCLOSURE_VERSION, type ContractType, documentRequiresNotarization, sha256Hex } from './data/legal-contracts';
import { createVideoRoom, issueRoomToken, completeVideoSession, videoConfigured } from './lib/twilio-video';
import { seedRonStateRules, createRonSession, submitRonIdentityChecklist, completeRonSession, handleRonWebhook, getRonStateRule, DEFAULT_RON_STATE_RULES, resolveVendor } from './lib/ron-service';
import { ceremonyUrlFromMeta } from './lib/ron-vendors';
import { mapMfsnToInternal } from './engine/mfsn-mapper';
import {
  MFSNClient,
  MFSNError,
  resolveMfsnCredentials,
  resolvePartnerMfsnCredentials,
  resolvePublicSignupMfsnCredentials,
} from './engine/mfsn-client';
import { mapSmartCreditToInternal } from './engine/smartcredit-mapper';
import { LenderMatchingEngine } from './data/funding/institutional-matching';
import { MASTER_LENDERS_DATABASE } from './data/funding/lenders-database';
import { MASTER_BUSINESS_VENDORS } from './data/funding/business-credit';
import { buildInstitutionalProfile, slimInstitutionalReport } from './data/funding/profile-from-client';
import { DOCUMENT_TYPES, type DocumentData } from './engine/documents';
import { generatePDFReport, type PDFReportData, generatePDFFromText } from './engine/pdf-generator';
import { turnstilePublicConfig, verifyTurnstileToken } from './lib/turnstile';
import { fillSixMonthSeries, sparklinePath } from './lib/overview-metrics';
import { resolveTenantTheme } from './lib/tenant-theme';
import { FOUNDER_TEMPLATES } from './engine/founder-templates';
import { normalizeBureau, resolveBureau, bureauScoreColumn, type BureauName } from './engine/bureau-utils';
import { buildOpenApiSpec, buildSwaggerUiHtml } from './lib/openapi-spec';
import { captureSentryException } from './lib/sentry';
import { importBureauReportsBatch } from './lib/bureau-import';
import { loadClientJourney, checkInJourney, generateAndDispatchDailyMotivation, dispatchDailyMotivationBatch } from './lib/portal-journey';
import { loadTutorCompanion, tutorChatSystemBlock, buildTutorFallbackReply } from './lib/portal-tutor';
import {
  parsePersonNameFromReport,
  parseAddressFromReport,
  extractSsnLast4,
  isPortalAnalysisUnlocked,
  generatePortalTempPassword,
  resolvePublicSignupOrgId,
  isEmailShaped,
} from './lib/mfsn-signup';
import {
  MFSN_AFFILIATE_ID,
  getAffiliateOffer,
  isAllowedAffiliateOfferCode,
  listPublicAffiliateOffers,
  listStaffAffiliateOffers,
  normalizeAffiliateOfferCode,
} from './data/mfsn-affiliate-offers';
import {
  MFSN_AFFILIATE_PORTAL_URL,
  MFSN_API_DOCS_URL,
  MFSN_OPERATOR_ACCOUNTS,
  MFSN_OPENAPI_URL,
  isWhitelistedMfsnOperatorEmail,
  primaryMfsnOperatorEmail,
} from './data/mfsn-operator-accounts';
import {
  syncClientToGhl,
  syncMfsnMemberToGhl,
  ghlConfigured,
  verifyGhlConnection,
  toE164Phone,
  listGhlFieldCatalog,
  buildGhlTagsForClient,
  ensureCustomFields,
  clearGhlFieldCache,
} from './lib/ghl-client';
import { fetchMfsnMemberList, loginMfsnAdmin } from './lib/mfsn-admin';
import {
  tradelineMasterConfigured,
  fetchTradelines,
  fetchTradelineById,
  fetchTradelineMasterUser,
  filterTradelines,
  summarizeInventory,
  submitTradelineOrder,
  TRADELINE_MARKUP_RATE,
  TRADELINE_BRAND,
  TRADELINE_OPS_EMAIL_DEFAULT,
  TRADELINE_FROM_EMAIL_DEFAULT,
  type EnrichedTradeline,
} from './lib/tradelinemaster-client';
import { syncTradelineInventory, loadCachedTradelines, sendTradelineOrderEmails } from './lib/tradeline-sync';
import { matchTradelinesForClient, type ClientCreditProfile } from './engine/tradeline-matcher';
import { CITIZENSHIP_STATUSES, GENDER_OPTIONS, MARITAL_STATUS_OPTIONS } from './data/tradeline-citizenship';
import { listTradelineEducation } from './data/tradeline-education';
import { sendSms } from './lib/alerts';
import sampleMfsnReport from './data/sample-mfsn-report.json';
import { spaAppSource, pwaSwSource, pwaManifestSource, marketingLandingHtml } from './generated/spa-source';
import { persistCreditTwinFromParsed } from './lib/credit-twin';
import { registerClientIntelligenceRoutes } from './lib/client-intelligence-routes';
import { inspectUpload, decodeBase64Bytes, sanitizeFileName } from './lib/upload-hygiene';
import { vaultOriginalFromBody } from './lib/report-vault';
import { persistInvestigationClock, closeInvestigationClock, FCRA_611_OPERATIONAL_DAYS } from './lib/investigation-clocks';
import { recordServiceCompleted, assertCoveredChargeAllowed, writeBillingLedger } from './lib/service-ledger';
import { sendLetterViaClick2Mail } from './lib/click2mail';
import { evaluateIdentityTheftGate } from './engine/dispute-attestation';

// Secure field-level cryptographic helpers mapped to Worker bindings
async function encryptPII(c: any, text: string): Promise<string> {
  requireEncryptionKey(c.env.PII_ENCRYPTION_KEY);
  return encryptText(text, c.env.PII_ENCRYPTION_KEY);
}

async function decryptPII(c: any, text: string): Promise<string> {
  return decryptTextSafe(text, c.env.PII_ENCRYPTION_KEY);
}

/** Persist bureau scores on report + client; keep EQ/EX/TU packs distinct. */
async function persistBureauScores(
  c: any,
  opts: {
    reportId: string;
    clientId: string;
    orgId: string;
    bureau: BureauName;
    parsed: CreditReportData;
    sourceProvider?: string;
    sourcePayloadType?: string;
  }
) {
  const sc = opts.parsed.scores || {};
  const fico = sc.fico ?? null;
  const vantage = sc.vantage ?? null;
  try {
    await c.env.DB.prepare(
      `UPDATE credit_reports SET fico_score = ?, vantage_score = ?, eq_score = ?, ex_score = ?, tu_score = ?,
       source_provider = COALESCE(?, source_provider), source_payload_type = COALESCE(?, source_payload_type)
       WHERE id = ? AND org_id = ?`
    ).bind(
      fico,
      vantage,
      opts.bureau === 'Equifax' ? fico : null,
      opts.bureau === 'Experian' ? fico : null,
      opts.bureau === 'TransUnion' ? (fico ?? vantage) : null,
      opts.sourceProvider || null,
      opts.sourcePayloadType || null,
      opts.reportId,
      opts.orgId
    ).run();
  } catch (e) {
    console.warn('[scores] report update skipped', e);
  }

  const col = bureauScoreColumn(opts.bureau);
  const scoreVal = opts.bureau === 'TransUnion' ? (fico ?? vantage) : fico;
  if (col && scoreVal != null) {
    try {
      await c.env.DB.prepare(`UPDATE clients SET ${col} = ? WHERE id = ? AND org_id = ?`)
        .bind(scoreVal, opts.clientId, opts.orgId).run();
    } catch (e) {
      console.warn('[scores] client update skipped', e);
    }
  }

  try {
    await persistCreditTwinFromParsed(c.env.DB, {
      orgId: opts.orgId,
      clientId: opts.clientId,
      reportId: opts.reportId,
      bureau: opts.bureau,
      parsed: opts.parsed,
    });
  } catch (e) {
    console.warn('[credit-twin] snapshot skipped', e);
  }

  try {
    await recordServiceCompleted({
      db: c.env.DB,
      id: generateId(),
      orgId: opts.orgId,
      clientId: opts.clientId,
      serviceType: 'credit_report_analysis',
      performedBy: 'system',
      deliverableId: opts.reportId,
    });
  } catch (e) {
    console.warn('[service-ledger] analysis completion skipped', e);
  }
}

/** Mark prior same-bureau reports as not current; return previous current id if any. */
async function markPriorBureauReportsStale(
  c: any,
  clientId: string,
  orgId: string,
  bureau: BureauName,
  exceptReportId?: string
): Promise<string | null> {
  if (bureau === 'Unknown') return null;
  try {
    const prior = await c.env.DB.prepare(
      `SELECT id FROM credit_reports WHERE client_id = ? AND org_id = ? AND bureau = ? AND COALESCE(is_current, 1) = 1
       ${exceptReportId ? 'AND id != ?' : ''} ORDER BY created_at DESC LIMIT 1`
    ).bind(...(exceptReportId ? [clientId, orgId, bureau, exceptReportId] : [clientId, orgId, bureau])).first() as any;

    await c.env.DB.prepare(
      `UPDATE credit_reports SET is_current = 0 WHERE client_id = ? AND org_id = ? AND bureau = ?
       ${exceptReportId ? 'AND id != ?' : ''}`
    ).bind(...(exceptReportId ? [clientId, orgId, bureau, exceptReportId] : [clientId, orgId, bureau])).run();

    return prior?.id || null;
  } catch (e) {
    console.warn('[bureau] is_current update skipped', e);
    return null;
  }
}

/** Compute TRI_BUREAU pack status from current reports. */
async function refreshBureauPackStatus(c: any, clientId: string, orgId: string): Promise<{
  status: string;
  present: BureauName[];
  missing: BureauName[];
  currentReports: Record<string, string>;
}> {
  const rows = await c.env.DB.prepare(
    `SELECT id, bureau FROM credit_reports WHERE client_id = ? AND org_id = ? AND COALESCE(is_current, 1) = 1
     AND bureau IN ('Equifax','Experian','TransUnion') ORDER BY created_at DESC`
  ).bind(clientId, orgId).all();

  const currentReports: Record<string, string> = {};
  for (const r of (rows?.results || []) as any[]) {
    const b = normalizeBureau(r.bureau);
    if (b !== 'Unknown' && !currentReports[b]) currentReports[b] = r.id;
  }
  const present = Object.keys(currentReports) as BureauName[];
  const all: BureauName[] = ['Equifax', 'Experian', 'TransUnion'];
  const missing = all.filter((b) => !currentReports[b]);
  let status = 'NONE';
  if (present.length === 3) status = 'TRI_BUREAU_READY';
  else if (present.length > 0) status = 'PARTIAL';

  try {
    const client = await c.env.DB.prepare('SELECT bureau_pack_status FROM clients WHERE id = ? AND org_id = ?')
      .bind(clientId, orgId).first() as any;
    // Don't downgrade WORKFLOW_FIRED unless pack broke
    if (client?.bureau_pack_status === 'WORKFLOW_FIRED' && present.length === 3) {
      status = 'WORKFLOW_FIRED';
    }
    await c.env.DB.prepare('UPDATE clients SET bureau_pack_status = ? WHERE id = ? AND org_id = ?')
      .bind(status, clientId, orgId).run();
  } catch (e) {
    console.warn('[bureau] pack status skipped', e);
  }

  return { status, present, missing, currentReports };
}

async function saveViolationsForReport(c: any, orgId: string, reportId: string, clientId: string, violations: any[]) {
  // Replace violations for this report on re-ingest
  await c.env.DB.prepare('DELETE FROM violations WHERE report_id = ? AND org_id = ?').bind(reportId, orgId).run();
  for (const v of violations) {
    try {
      await c.env.DB.prepare(
        `INSERT INTO violations (id, org_id, report_id, client_id, category, subcategory, severity, statute, statute_text, legal_standard, evidence, explanation, case_law, account_name, account_number, dofd, falloff_date, days_overdue, statutory_damages_min, statutory_damages_max, actual_damages_est, punitive_damages_est, attorney_fees_est, total_damages_min, total_damages_max, defendant_type, defendant_name, fact_check_status, confidence, reasoning_json, analysis_mode)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        v.id, orgId, reportId, clientId, v.category, v.subcategory, v.severity, v.statute, v.statuteText, v.legalStandard,
        v.evidence, v.explanation, v.caseLaw, v.accountName || null, v.accountNumber || null, v.dofd || null, v.falloffDate || null,
        v.daysOverdue || null, v.statutoryDamagesMin, v.statutoryDamagesMax, v.actualDamagesEst, v.punitiveDamagesEst, v.attorneyFeesEst,
        v.totalDamagesMin, v.totalDamagesMax, v.defendantType, v.defendantName,
        v.factCheckStatus || 'verified', v.confidence ?? null,
        v.reasoning ? JSON.stringify(v.reasoning) : null,
        v.analysisMode || 'live_rules_engine',
      ).run();
    } catch {
      await c.env.DB.prepare(
        'INSERT INTO violations (id, org_id, report_id, client_id, category, subcategory, severity, statute, statute_text, legal_standard, evidence, explanation, case_law, account_name, account_number, dofd, falloff_date, days_overdue, statutory_damages_min, statutory_damages_max, actual_damages_est, punitive_damages_est, attorney_fees_est, total_damages_min, total_damages_max, defendant_type, defendant_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(v.id, orgId, reportId, clientId, v.category, v.subcategory, v.severity, v.statute, v.statuteText, v.legalStandard, v.evidence, v.explanation, v.caseLaw, v.accountName || null, v.accountNumber || null, v.dofd || null, v.falloffDate || null, v.daysOverdue || null, v.statutoryDamagesMin, v.statutoryDamagesMax, v.actualDamagesEst, v.punitiveDamagesEst, v.attorneyFeesEst, v.totalDamagesMin, v.totalDamagesMax, v.defendantType, v.defendantName).run();
    }
  }
}

/** Live parse → detect → fact-check (no mock data). */
function liveAnalyzeParsedReport(parsed: CreditReportData) {
  return analyzeReportLive(parsed, detectViolations);
}

/** Attach parsed reasoning for API/UI consumers. */
function hydrateViolationRows(rows: any[]): any[] {
  return (rows || []).map((v) => {
    let reasoning = v.reasoning || null;
    if (!reasoning && v.reasoning_json) {
      try { reasoning = JSON.parse(v.reasoning_json); } catch { reasoning = null; }
    }
    return {
      ...v,
      factCheckStatus: v.fact_check_status || v.factCheckStatus || null,
      confidence: v.confidence ?? null,
      analysisMode: v.analysis_mode || v.analysisMode || 'live_rules_engine',
      reasoning,
    };
  });
}

/** Fire catalog email/alert after live analysis completes. */
async function notifyClientAnalysisReady(
  c: any,
  opts: {
    orgId: string;
    clientId: string;
    client?: any;
    bureau: string;
    analysis: { violations: any[]; rawCount: number; reasoningSummary: string };
  },
) {
  try {
    const client = opts.client || await c.env.DB.prepare(
      'SELECT * FROM clients WHERE id = ? AND org_id = ?'
    ).bind(opts.clientId, opts.orgId).first();
    if (!client) return null;
    // Do not email analysis/violation details until staff unlocks after payment
    if (!isPortalAnalysisUnlocked(client)) return null;
    const email =
      client.email && !String(client.email).includes('.noreply@') && !String(client.email).endsWith('@smartfcra.local')
        ? client.email
        : null;
    const portalUrl = `${portalBaseUrl(c.env)}/`;
    const vars = {
      clientName: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
      bureau: opts.bureau,
      violationCount: String(opts.analysis.violations.length),
      rawCount: String(opts.analysis.rawCount),
      reasoningSummary: opts.analysis.reasoningSummary,
      portalUrl,
    };
    const analyzed = await sendTemplatedClientMessage(c.env, {
      templateId: 'report_analyzed',
      orgId: opts.orgId,
      clientId: opts.clientId,
      email,
      phone: client.phone_e164 || client.phone,
      notifyEmail: !!email && client.notify_email !== 0,
      notifySms: false,
      vars,
    });
    if (opts.analysis.violations.length > 0) {
      await sendTemplatedClientMessage(c.env, {
        templateId: 'violations_ready',
        orgId: opts.orgId,
        clientId: opts.clientId,
        email,
        phone: client.phone_e164 || client.phone,
        notifyEmail: !!email && client.notify_email !== 0,
        notifySms: false,
        vars,
      });
    }
    return analyzed;
  } catch (e) {
    console.warn('[notify] analysis template skipped', e);
    return null;
  }
}


async function backpopulateClientInfo(c: any, clientId: string, personalInfo: any, orgId: string) {
  if (!personalInfo) return;

  try {
    const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(clientId, orgId).first() as any;
    if (!client) return;

    const updates: string[] = [];
    const binds: any[] = [];

    // 1. Backpopulate Full Address details if currently empty
    if (!client.address_line1 && personalInfo.addresses?.[0]) {
      const fullAddr = personalInfo.addresses[0].trim();
      updates.push('address_line1 = ?');
      binds.push(fullAddr);

      if (!client.city || !client.state || !client.zip) {
        const parts = fullAddr.split(',').map((p: string) => p.trim());
        if (parts.length >= 3) {
          let parsedCity = parts[parts.length - 2];
          const stateZip = parts[parts.length - 1].split(/\s+/);
          let parsedState = stateZip[0] || null;
          let parsedZip = stateZip[1] || null;

          if (!client.city && parsedCity) {
            updates.push('city = ?');
            binds.push(parsedCity);
          }
          if (!client.state && parsedState) {
            updates.push('state = ?');
            binds.push(parsedState.toUpperCase());
          }
          if (!client.zip && parsedZip) {
            updates.push('zip = ?');
            binds.push(parsedZip);
          }
        }
      }
    }

    // 2. Backpopulate Date of Birth if currently empty
    if (!client.dob && personalInfo.dobs?.[0]) {
      updates.push('dob = ?');
      binds.push(personalInfo.dobs[0].trim());
    }

    // 3. Backpopulate Clean SSN Last 4 if currently empty
    if (!client.ssn_last4 && personalInfo.ssns?.[0]) {
      let ssnVal = personalInfo.ssns[0].trim();
      if (ssnVal.includes('-')) {
        const parts = ssnVal.split('-');
        ssnVal = parts[parts.length - 1];
      }
      ssnVal = ssnVal.replace(/\D/g, '');
      if (ssnVal.length > 4) {
        ssnVal = ssnVal.slice(-4);
      }
      if (ssnVal) {
        updates.push('ssn_last4 = ?');
        binds.push(ssnVal);
      }
    }

    // 4. Update placeholder Name ("New Client") with parsed Real Name
    if ((!client.first_name || client.first_name === 'New') && (!client.last_name || client.last_name === 'Client') && personalInfo.names?.[0]) {
      const rawName = personalInfo.names[0].trim();
      let firstName = '';
      let lastName = '';
      if (rawName.includes(',')) {
        const parts = rawName.split(',');
        lastName = parts[0].trim();
        firstName = parts.slice(1).join(',').trim();
      } else {
        const parts = rawName.split(/\s+/);
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ') || 'Client';
      }
      
      const toTitleCase = (str: string) => {
        return str.toLowerCase()
          .replace(/(?:^|\s|-|')\S/g, (m) => m.toUpperCase())
          .replace(/\b(Mc)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());
      };

      if (firstName && lastName) {
        updates.push('first_name = ?', 'last_name = ?');
        binds.push(toTitleCase(firstName), toTitleCase(lastName));
      }
    }

    if (updates.length > 0) {
      updates.push('updated_at = datetime("now")');
      binds.push(clientId);
      const sql = `UPDATE clients SET ${updates.join(', ')} WHERE id = ?`;
      await c.env.DB.prepare(sql).bind(...binds).run();
    }
  } catch (err) {
    console.error('Failed to backpopulate client info from parsed report:', err);
  }
}




type Bindings = {
  DB: any;
  STRIPE_API_KEY?: string;
  STRIPE_PUBLISHABLE_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PROFESSIONAL_PRICE_ID?: string;
  STRIPE_UNLIMITED_PRICE_ID?: string;
  STRIPE_ENTERPRISE_PRICE_ID?: string;
  FRONTEND_URL?: string;
  APP_BASE_URL?: string;
  CLICK2MAIL_USERNAME?: string;
  CLICK2MAIL_AUTH_BASIC?: string;
  CLICK2MAIL_API_URL?: string;
  AI?: any;
  SMARTCREDIT_CLIENT_KEY?: string;
  SMARTCREDIT_CLIENT_SECRET?: string;
  /** Allow SmartCredit sandbox mock username in production (demos only). */
  ALLOW_SMARTCREDIT_SANDBOX?: string;
  /** MyFreeScoreNow partner credentials — set via wrangler secret / .dev.vars only */
  MFSN_API_URL?: string;
  MFSN_EMAIL?: string;
  MFSN_PASSWORD?: string;
  MFSN_CLIENT_TOKEN?: string;
  MFSN_LEGACY_EMAIL?: string;
  MFSN_LEGACY_PASSWORD?: string;
  MFSN_AFFILIATE_PORTAL_URL?: string;
  MFSN_API_DOCS_URL?: string;
  /** Org that receives public MFSN consumer signups (default org_platform_master). */
  PUBLIC_SIGNUP_ORG_ID?: string;
  DEFAULT_SIGNUP_ORG_ID?: string;
  GHL_PIT_TOKEN?: string;
  GHL_API_KEY?: string;
  GHL_LOCATION_ID?: string;
  GHL_API_BASE?: string;
  RATE_LIMIT_KV?: any;
  DOCS?: R2Bucket;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
  TWILIO_API_KEY_SID?: string;
  TWILIO_API_KEY_SECRET?: string;
  RON_VENDOR?: string;
  RON_VENDOR_API_KEY?: string;
  RON_VENDOR_API_URL?: string;
  RON_WEBHOOK_SECRET?: string;
  RON_DOCUMENT_URL?: string;
  SENTRY_DSN?: string;
  PII_ENCRYPTION_KEY?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  SENDGRID_API_KEY?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_EMAIL_API_TOKEN?: string;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_EMAIL_FROM_NOREPLY?: string;
  CLOUDFLARE_EMAIL_FROM_ONBOARDING?: string;
  /** TradelineMaster broker API (Basic auth) */
  TRADELINEMASTER_USER_KEY?: string;
  TRADELINEMASTER_PASS_KEY?: string;
  TRADELINEMASTER_API_URL?: string;
  TRADELINEMASTER_REFERER?: string;
  TRADELINEMASTER_API_VERSION?: string;
  TRADELINE_MARKUP_RATE?: string;
  TRADELINE_OPS_EMAIL?: string;
  TRADELINE_FROM_EMAIL?: string;
  FREE_AI_ONLY?: string;
  AI_DEFAULT_PROVIDER?: string;
  MAILING_WEBHOOK_SECRET?: string;
  PLATFORM_BOOTSTRAP_EMAIL?: string;
  PLATFORM_BOOTSTRAP_PASSWORD?: string;
  /** When "true"/"1", staff (admin/super_admin) must enable MFA before any protected API (except MFA/auth safe paths). */
  STAFF_MFA_REQUIRED_ALL?: string;
  /** Shared secret for scheduled daily journey motivation dispatch (GitHub Actions / cron). */
  JOURNEY_CRON_SECRET?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  ANALYSIS_UNLOCK_PRICE_CENTS?: string;
  ENVIRONMENT?: string;
  COMPANY_NAME?: string;
  COMPANY_OWNER?: string;
  COMPANY_ADDRESS?: string;
  COMPANY_WEBSITE?: string;
  COMPANY_EMAIL?: string;
  COMPANY_LOGO?: string;
  GROQ_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  TOGETHER_AI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  GOOGLE_API_KEY?: string;
  OPENAI_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
  HUGGINGFACE_TOKEN?: string;
  REPLICATE_API_TOKEN?: string;
  MOONSHOT_KIMI_API_KEY?: string;
  NVIDIA_API_KEY?: string;
};
type Variables = { user?: any; org?: any; session?: any };

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Stripe initialization helper
const getStripe = (env: Bindings) => {
  if (!env.STRIPE_API_KEY) throw new Error('STRIPE_API_KEY is not configured');
  return new Stripe(env.STRIPE_API_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });
};

function stripeConfigured(env: Bindings): boolean {
  return !!env.STRIPE_API_KEY;
}

app.use('/api/*', cors());

// ═══════════════════════════════════════════════════════════════
// GLOBAL SECURITY HEADERS & CONTENT SECURITY POLICY (CSP)
// ═══════════════════════════════════════════════════════════════
app.use('*', async (c, next) => {
  await next();
  c.res.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://sdk.twilio.com https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; img-src 'self' data: blob: https://storage.googleapis.com https://images.unsplash.com https://imagedelivery.net https://api.qrserver.com; media-src 'self' blob: mediastream:; worker-src 'self' blob:; child-src 'self' blob: about:srcdoc https://challenges.cloudflare.com; frame-src 'self' blob: about:srcdoc https://challenges.cloudflare.com; connect-src 'self' https://api.stripe.com https://fonts.googleapis.com https://api.groq.com https://openrouter.ai https://api-inference.huggingface.co https://generativelanguage.googleapis.com https://cdn.jsdelivr.net https://sdk.twilio.com https://*.twilio.com wss://*.twilio.com https://challenges.cloudflare.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  c.res.headers.set('X-Frame-Options', 'DENY');
  c.res.headers.set('X-Content-Type-Options', 'nosniff');
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  c.res.headers.set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(), payment=(self), usb=()');
  c.res.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  c.res.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  c.res.headers.set('X-Smart-FCRA-Security', 'aes-gcm;consent-gates;audit-trail;r2-vault');
});

// ═══════════════════════════════════════════════════════════════
// EDGE RATE LIMITING MIDDLEWARE (VIA CLOUDFLARE KV)
// ═══════════════════════════════════════════════════════════════
async function rateLimiter(c: any, next: any) {
  const ip = c.req.header('CF-Connecting-IP') || 'anonymous';
  const key = `rate_limit:${ip}`;
  
  if (!c.env.RATE_LIMIT_KV) {
    return await next();
  }

  try {
    const currentCount = parseInt(await c.env.RATE_LIMIT_KV.get(key) || '0', 10);
    const limit = c.req.path.includes('/auth/') ? 20 : 60;
    if (currentCount >= limit) {
      await writeSecurityAudit(c.env, { action: 'rate_limited', ip, success: false, detail: { path: c.req.path, count: currentCount } });
      return c.json({ error: 'Too many requests. Please slow down.' }, 429);
    }
    await c.env.RATE_LIMIT_KV.put(key, (currentCount + 1).toString(), { expirationTtl: 60 });
  } catch (e) {
    console.warn('[WARN] Rate limiter KV failed:', e);
  }
  
  await next();
}

app.use('/api/auth/login', rateLimiter);
app.use('/api/auth/register', rateLimiter);
app.use('/api/public/mfsn-signup', rateLimiter);
app.use('/api/public/lead/*', rateLimiter);
app.use('/api/auth/forgot-password', rateLimiter);
app.use('/api/auth/change-password', rateLimiter);
app.use('/api/auth/mfa/setup', rateLimiter);
app.use('/api/reports/upload', rateLimiter);
app.use('/api/reports/onboard', rateLimiter);
app.use('/api/client-portal/uploads', rateLimiter);
app.use('/api/client-portal/onboard', rateLimiter);
app.use('/api/privacy/export', rateLimiter);
app.use('/api/privacy/delete-request', rateLimiter);

// ═══════════════════════════════════════════════════════════════
// GLOBAL ERROR HANDLER & OBSERVABILITY TELEMETRY
// ═══════════════════════════════════════════════════════════════
app.onError(async (err, c) => {
  const session = c.get('session');
  const errorLog = {
    error: err.message,
    stack: err.stack,
    method: c.req.method,
    path: c.req.path,
    timestamp: new Date().toISOString(),
    ip: c.req.header('CF-Connecting-IP') || 'unknown',
    user_agent: c.req.header('User-Agent') || 'unknown',
    user_id: session?.user_id || 'anonymous',
  };
  console.error('[CRITICAL UNHANDLED EXCEPTION]', JSON.stringify(errorLog));

  c.executionCtx?.waitUntil?.(
    captureSentryException(err instanceof Error ? err : new Error(String(err)), {
      dsn: c.env.SENTRY_DSN,
      environment: c.env.ENVIRONMENT || 'production',
      request: {
        method: c.req.method,
        path: c.req.path,
        ip: errorLog.ip,
        userAgent: errorLog.user_agent,
      },
      user: session?.user_id ? { id: session.user_id, email: session.user_email } : undefined,
      extra: errorLog,
    })
  );

  return c.json({ error: 'Internal Server Error', message: err.message }, 500);
});

// Serve SPA from the Worker bundle first (prevents blank screen if Pages asset is stale/corrupt)
app.get('/static/app.js', (c) => {
  return c.body(spaAppSource, 200, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'no-cache, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
  });
});

app.get('/sw.js', (c) => {
  return c.body(pwaSwSource, 200, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'no-cache, must-revalidate',
    'Service-Worker-Allowed': '/',
    'X-Content-Type-Options': 'nosniff',
  });
});

app.get('/manifest.webmanifest', (c) => {
  return c.body(pwaManifestSource, 200, {
    'Content-Type': 'application/manifest+json; charset=utf-8',
    'Cache-Control': 'no-cache, must-revalidate',
  });
});

// Serve other static assets in local development and production
app.use('/static/*', serveStatic());
app.use('/content/*', serveStatic());

// Request logging middleware
app.use('/api/*', async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  const log = {
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration_ms: ms,
    ip: c.req.header('CF-Connecting-IP') || 'unknown',
    user_agent: c.req.header('User-Agent') || 'unknown',
    timestamp: new Date().toISOString(),
  };
  if (c.res.status >= 500) {
    console.error('[ERROR]', JSON.stringify(log));
  } else if (c.res.status >= 400) {
    console.warn('[WARN]', JSON.stringify(log));
  } else {
    console.log('[INFO]', JSON.stringify(log));
  }
});

// Delay utility for mock API simulations
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ═══════════════════════════════════════════════════════════════
// AUTH MIDDLEWARE
// ═══════════════════════════════════════════════════════════════
async function authMiddleware(c: any, next: any) {
  const sessionId = c.req.header('Authorization')?.replace('Bearer ', '') ||
    c.req.query('token');
  if (!sessionId) return c.json({ error: 'Unauthorized' }, 401);

  const session = await c.env.DB.prepare(
    'SELECT s.*, u.id as user_id, u.name as user_name, u.email as user_email, u.role as user_role, u.is_active, u.org_id, COALESCE(u.must_change_password, 0) as must_change_password, COALESCE(u.mfa_enabled, 0) as mfa_enabled FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = ? AND s.expires_at > datetime("now")'
  ).bind(sessionId).first();

  if (!session) return c.json({ error: 'Session expired' }, 401);

  // Active Suspension Enforcement
  if (session.is_active === 0) {
    return c.json({ error: 'User account suspended' }, 403);
  }
  // Enterprise: forced password rotation gate
  if (session.must_change_password === 1) {
    const safePaths = ['/auth/change-password', '/auth/logout', '/auth/me', '/auth/mfa'];
    if (!safePaths.some((p) => c.req.path.includes(p))) {
      return c.json({ error: 'Password change required before continuing', code: 'MUST_CHANGE_PASSWORD' }, 403);
    }
  }

  // Staff/admin MFA gate — elevated routes always; optional full gate via STAFF_MFA_REQUIRED_ALL
  if (
    (session.user_role === 'admin' || session.user_role === 'super_admin') &&
    session.mfa_enabled !== 1
  ) {
    const mfaSafePaths = ['/auth/mfa', '/auth/logout', '/auth/me', '/auth/change-password'];
    const mfaElevatedPaths = ['/admin/backup', '/admin/demo', '/admin/privacy-requests', '/billing/cancel'];
    const requireAll = ['true', '1', 'yes'].includes(String(c.env.STAFF_MFA_REQUIRED_ALL || '').toLowerCase());
    const needsMfa =
      requireAll
        ? !mfaSafePaths.some((p) => c.req.path.includes(p))
        : mfaElevatedPaths.some((p) => c.req.path.includes(p));
    if (needsMfa) {
      return c.json({
        error: requireAll
          ? 'MFA setup required for staff accounts (STAFF_MFA_REQUIRED_ALL)'
          : 'MFA setup required for this action',
        code: 'MFA_REQUIRED',
      }, 403);
    }
  }

  const org = await c.env.DB.prepare('SELECT settings FROM organizations WHERE id = ?').bind(session.org_id).first();
  if (org) {
    try {
      const settings = JSON.parse(org.settings || '{}');
      if (settings.suspended) {
        return c.json({ error: 'Organization account suspended' }, 403);
      }
    } catch (e) {}
  }

  // Session fingerprinting — log anomalies; do not hard-kill (mobile/CGNAT IPs rotate)
  const currentIp = c.req.header('CF-Connecting-IP') || 'unknown';
  const currentUa = c.req.header('User-Agent') || 'unknown';

  if (session.ip_address && session.ip_address !== 'unknown' && session.ip_address !== currentIp) {
    console.warn(`[SECURITY] Session IP change. Session: ${session.id}. Saved: ${session.ip_address}, Request: ${currentIp}`);
  }
  if (session.user_agent && session.user_agent !== 'unknown' && session.user_agent !== currentUa) {
    console.warn(`[SECURITY] Session UA change. Session: ${session.id}. Saved: ${session.user_agent?.slice(0, 80)}, Request: ${currentUa?.slice(0, 80)}`);
  }

  c.set('user', { id: session.user_id, name: session.user_name, email: session.user_email, role: session.user_role, org_id: session.org_id });
  c.set('session', session);
  return next();
}

// ═══════════════════════════════════════════════════════════════
// MULTI-TENANCY PLAN LIMITS & 'NO FREE TRIALS' ENFORCEMENT
// ═══════════════════════════════════════════════════════════════
async function verifyOrgPlanLimits(c: any, resourceType: 'client' | 'report' | 'user') {
  const user = c.get('user');
  if (!user || !user.org_id) {
    return { allowed: false, message: 'Unauthorized' };
  }

  // Master bypass check: Rick Jefferson has unlimited access for free
  if (user.role === 'super_admin' || user.email === 'rjbizsolution23@gmail.com') {
    return { allowed: true };
  }

  const org = await c.env.DB.prepare('SELECT plan FROM organizations WHERE id = ?').bind(user.org_id).first();
  const plan = org?.plan || 'free';

  // Strict "No Free Trials" Compliance Gate
  if (plan === 'free') {
    return {
      allowed: false,
      message: 'Subscription Required. Under SmartFCRA compliance rules and RJ Business Solutions terms, free trials are not supported. Please subscribe to a plan in the Billing tab to unlock all features.'
    };
  }

  if (resourceType === 'client') {
    if (plan === 'professional' || plan === 'pro') {
      const clientCountRes = await c.env.DB.prepare('SELECT COUNT(*) as total FROM clients WHERE org_id = ?').bind(user.org_id).first();
      const clientCount = clientCountRes?.total || 0;
      if (clientCount >= 100) {
        return {
          allowed: false,
          message: 'Client Limit Reached. Your Basic plan supports up to 100 clients. Please upgrade to the Unlimited or Enterprise plan for unlimited clients.'
        };
      }
    }
  }

  if (resourceType === 'report') {
    if (plan === 'professional' || plan === 'pro') {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const reportCountRes = await c.env.DB.prepare(
        "SELECT COUNT(*) as total FROM credit_reports WHERE org_id = ? AND strftime('%Y-%m', created_at) = ?"
      ).bind(user.org_id, currentMonth).first();
      const reportCount = reportCountRes?.total || 0;
      if (reportCount >= 100) {
        return {
          allowed: false,
          message: 'Report Analysis Limit Reached. Your Basic plan supports up to 100 report analyses per month. Please upgrade to the Unlimited or Enterprise plan for unlimited analyses.'
        };
      }
    }
  }

  if (resourceType === 'user') {
    if (plan === 'professional' || plan === 'pro') {
      const userCountRes = await c.env.DB.prepare('SELECT COUNT(*) as total FROM users WHERE org_id = ?').bind(user.org_id).first();
      const userCount = userCountRes?.total || 0;
      if (userCount >= 5) {
        return {
          allowed: false,
          message: 'Team Limit Reached. Your Basic plan supports up to 5 team members. Please upgrade to the Unlimited or Enterprise plan for more seats.'
        };
      }
    } else if (plan === 'unlimited') {
      const userCountRes = await c.env.DB.prepare('SELECT COUNT(*) as total FROM users WHERE org_id = ?').bind(user.org_id).first();
      const userCount = userCountRes?.total || 0;
      if (userCount >= 20) {
        return {
          allowed: false,
          message: 'Team Limit Reached. Your Unlimited plan supports up to 20 team members. Please upgrade to the Enterprise plan for more seats.'
        };
      }
    }
  }

  return { allowed: true };
}

// ═══════════════════════════════════════════════════════════════
// HEALTH CHECK
app.get('/api/health', async (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    region: c.req.header('CF-Region') || 'unknown',
  });
});

// Partner API documentation (OpenAPI + Swagger UI)
app.get('/api/openapi.json', (c) => {
  const base = c.env.FRONTEND_URL || c.env.APP_BASE_URL || new URL(c.req.url).origin;
  return c.json(buildOpenApiSpec(base.replace(/\/$/, '')));
});

app.get('/api/docs', (c) => {
  const origin = new URL(c.req.url).origin;
  const html = buildSwaggerUiHtml(`${origin}/api/openapi.json`);
  return c.html(html);
});

// ═══════════════════════════════════════════════════════════════
// PUBLIC MFSN SIGNUP — consumer enters MFSN credentials → portal
// Analysis runs for staff but stays locked until payment approval
// ═══════════════════════════════════════════════════════════════
const BRAND_FORM_IDS = new Set([
  'credit-qualify',
  'funding-qualify',
  'universal-funnel',
  'universal',
  'service-intake',
  'growth-audit',
  'whitelabel-app',
  'whitelabel',
  'partnership',
  'podcast-guest',
  'saas-demo',
  'smart-fcra-demo',
]);

/** Public RJ brand lead capture (interactive forms). */
app.get('/api/public/turnstile', (c) => c.json(turnstilePublicConfig(c.env)));

app.post('/api/public/lead/:formId', async (c) => {
  const formId = String(c.req.param('formId') || '').trim().toLowerCase();
  if (!formId || formId.length > 64) return c.json({ error: 'Invalid form' }, 400);
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email || body.Email || '').trim().toLowerCase();
  const phone = String(body.phone || body.Phone || '').trim();
  const firstName = String(body.firstName || body.FirstName || body.first_name || '').trim();
  const lastName = String(body.lastName || body.LastName || body.last_name || '').trim();
  if (!email && !phone) return c.json({ error: 'Email or phone required' }, 400);

  const turnstile = await verifyTurnstileToken(
    c.env,
    body.cfTurnstileToken || body['cf-turnstile-response'] || c.req.header('cf-turnstile-response'),
    c.req.header('CF-Connecting-IP'),
  );
  if (!turnstile.ok) return c.json({ error: 'Bot check failed', detail: turnstile.error }, 403);

  const orgId = resolvePublicSignupOrgId(c.env);
  const leadId = generateId();
  const payload = { ...body, form: body.form || formId };
  try {
    await c.env.DB.prepare(
      `INSERT INTO brand_leads (id, org_id, form_id, email, phone, first_name, last_name, payload_json, source_url, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', datetime('now'), datetime('now'))`,
    ).bind(
      leadId, orgId, formId, email || null, phone || null, firstName || null, lastName || null,
      JSON.stringify(payload), c.req.header('Referer') || null,
    ).run();
  } catch (e: any) {
    if (String(e?.message || '').includes('no such table')) {
      return c.json({ error: 'Migration 0020 required', code: 'MIGRATION_REQUIRED' }, 503);
    }
    throw e;
  }

  // Soft: email ops + sync GHL contact
  const opsEmail = c.env.TRADELINE_OPS_EMAIL || c.env.COMPANY_EMAIL || 'support@rjbusinesssolutions.org';
  let emailResult: any = null;
  try {
    emailResult = await sendAppEmail(c.env, {
      to: opsEmail,
      from: c.env.CLOUDFLARE_EMAIL_FROM_ONBOARDING || c.env.CLOUDFLARE_EMAIL_FROM_NOREPLY || 'welcome@onboarding.smartfcra.com',
      fromName: 'RJ Business Solutions',
      subject: `[RJ Lead] ${formId} — ${firstName} ${lastName}`.trim(),
      html: `<div style="font-family:Space Grotesk,Inter,sans-serif;max-width:640px">
        <h2 style="color:#0f172a">New ${formId} lead</h2>
        <p><b>${firstName} ${lastName}</b><br/>${email}<br/>${phone}</p>
        <pre style="background:#f8fafc;padding:12px;border-radius:8px;font-size:12px;overflow:auto">${JSON.stringify(payload, null, 2).slice(0, 4000)}</pre>
        <p style="font-size:12px;color:#475569">Lead ID ${leadId} · Smart FCRA Brand Forms</p>
      </div>`,
      text: `New ${formId} lead ${firstName} ${lastName} ${email} ${phone}`,
      purpose: 'onboarding',
    });
  } catch (e: any) {
    emailResult = { error: e?.message };
  }

  let ghl: any = null;
  try {
    if (ghlConfigured(c.env) && (email || phone)) {
      ghl = await syncClientToGhl(c.env, {
        id: leadId,
        email,
        phone,
        first_name: firstName,
        last_name: lastName,
        case_status: 'LEAD',
        payment_status: 'lead',
        signup_source: `brand_form_${formId}`,
      }, {
        orgName: 'RJ Business Solutions',
        analysisUnlocked: false,
        tags: ['RJ Lead', 'Brand Form', formId, 'Smart FCRA'],
      });
      if (ghl?.contactId) {
        await c.env.DB.prepare(`UPDATE brand_leads SET ghl_contact_id = ?, updated_at = datetime('now') WHERE id = ?`)
          .bind(ghl.contactId, leadId).run().catch(() => {});
      }
    }
  } catch { /* soft */ }

  return c.json({
    ok: true,
    leadId,
    formId,
    knownForm: BRAND_FORM_IDS.has(formId),
    emailSent: !!emailResult?.sent,
    ghlContactId: ghl?.contactId || null,
    message: 'Thanks — a specialist will follow up shortly.',
  }, 201);
});

app.get('/api/brand/leads', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role === 'client') return c.json({ error: 'Staff only' }, 403);
  try {
    const publicOrg = resolvePublicSignupOrgId(c.env);
    const rows = (user.role === 'admin' || user.role === 'super_admin')
      ? await c.env.DB.prepare(
          `SELECT id, form_id, email, phone, first_name, last_name, status, ghl_contact_id, org_id, created_at
           FROM brand_leads ORDER BY created_at DESC LIMIT 200`,
        ).all()
      : await c.env.DB.prepare(
          `SELECT id, form_id, email, phone, first_name, last_name, status, ghl_contact_id, org_id, created_at
           FROM brand_leads
           WHERE org_id = ? OR org_id = ? OR org_id IS NULL
           ORDER BY created_at DESC LIMIT 200`,
        ).bind(user.org_id, publicOrg).all();
    return c.json({ ok: true, leads: rows.results || [], publicOrgId: publicOrg });
  } catch (e: any) {
    if (String(e?.message || '').includes('no such table')) {
      return c.json({ ok: true, leads: [], warning: 'Migration 0020 required' });
    }
    throw e;
  }
});

app.get('/api/brand/catalog', authMiddleware, async (c) => {
  return c.json({
    ok: true,
    hubUrl: '/static/brand/',
    forms: [
      { id: 'credit-qualify', title: 'Credit Qualify', url: '/forms/credit-qualify' },
      { id: 'funding-qualify', title: 'Funding Qualify', url: '/forms/funding-qualify' },
      { id: 'universal-funnel', title: 'Universal Funnel', url: '/forms/universal-funnel' },
      { id: 'service-intake', title: 'Service Intake', url: '/forms/service-intake' },
      { id: 'growth-audit', title: 'Growth Audit', url: '/forms/growth-audit' },
      { id: 'whitelabel-app', title: 'Whitelabel Application', url: '/forms/whitelabel' },
      { id: 'partnership', title: 'Partnership Application', url: '/forms/partnership' },
      { id: 'podcast-guest', title: 'Podcast Guest', url: '/forms/podcast-guest' },
      { id: 'saas-demo', title: 'Smart FCRA SaaS Demo', url: '/#demo' },
    ],
    brand: {
      name: 'RJ Business Solutions',
      product: 'Smart FCRA',
      tagline: 'Empowering Generational Wealth',
      colors: { blue: '#2563eb', sky: '#0ea5e9', deep: '#1e3a8a', navy: '#0f172a' },
      fonts: { head: 'Space Grotesk', body: 'Inter' },
      logo: 'https://storage.googleapis.com/msgsndr/qQnxRHDtyx0uydPd5sRl/media/67eb83c5e519ed689430646b.jpeg',
      web: 'https://rjbusinesssolutions.org',
      marketing: '/',
      email: 'support@rjbusinesssolutions.org',
    },
  });
});

/** Public Smart FCRA sales funnel (software landing). */
app.get('/', (c) => c.html(marketingLandingHtml));
app.get('/pricing', (c) => c.redirect('/#pricing', 302));
app.get('/demo', (c) => c.redirect('/#demo', 302));
app.get('/login', (c) => c.html(getAppHtml()));
app.get('/app', (c) => c.html(getAppHtml()));

/** Friendly short URLs into the brand library */
app.get('/brand', (c) => c.redirect('/static/brand/', 302));
app.get('/brand/', (c) => c.redirect('/static/brand/', 302));
app.get('/forms', (c) => c.redirect('/static/brand/#forms', 302));
app.get('/forms/:slug', (c) => {
  const slug = c.req.param('slug');
  const map: Record<string, string> = {
    'credit-qualify': 'credit-qualify.html',
    'funding-qualify': 'funding-qualify.html',
    'universal-funnel': 'universal-funnel.html',
    'universal': 'universal-funnel.html',
    'service-intake': 'service-intake.html',
    'growth-audit': 'growth-audit.html',
    'whitelabel': 'whitelabel-application.html',
    'whitelabel-application': 'whitelabel-application.html',
    'partnership': 'partnership-application.html',
    'podcast-guest': 'podcast-guest.html',
  };
  const file = map[slug];
  if (!file) return c.redirect('/static/brand/', 302);
  return c.redirect(`/static/brand/forms/${file}`, 302);
});

app.get('/api/public/mfsn-signup/meta', async (c) => {
  const orgId = resolvePublicSignupOrgId(c.env);
  const org = await c.env.DB.prepare('SELECT id, name FROM organizations WHERE id = ?').bind(orgId).first() as any;
  const brand = await loadOrgBrand(c.env, orgId);
  const partner = resolvePartnerMfsnCredentials(c.env);
  const partnerAuthConfigured = !!(String(c.env.MFSN_EMAIL || '').trim() && String(c.env.MFSN_PASSWORD || '').trim());
  const partnerTokenConfigured = !!String(c.env.MFSN_CLIENT_TOKEN || '').trim();
  return c.json({
    ok: true,
    orgId,
    orgName: org?.name || brand.name,
    brandName: brand.name,
    partnerConfigured: !!partner,
    partnerAuthConfigured,
    partnerTokenConfigured,
    affiliateId: MFSN_AFFILIATE_ID,
    affiliateOnly: true,
    affiliateOffers: listPublicAffiliateOffers(),
    twilioConfigured: !!(c.env.TWILIO_ACCOUNT_SID && c.env.TWILIO_AUTH_TOKEN && c.env.TWILIO_PHONE_NUMBER),
    ghlConfigured: ghlConfigured(c.env),
    loginUrl: `${portalBaseUrl(c.env, c.req.url)}/`,
  });
});

app.post('/api/public/mfsn-signup', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const mfsnUsername = String(body.mfsnUsername || body.username || body.memberEmail || '').trim();
  const mfsnPassword = String(body.mfsnPassword || body.password || '').trim();
  const mfsnToken = String(body.mfsnToken || body.secretWord || body.clientToken || '').trim();
  const affiliateOfferCode = normalizeAffiliateOfferCode(body.affiliateOfferCode || body.offerCode || body.enrollCode);
  const enrolledUnderAffiliate = body.enrolledUnderAffiliate === true || body.affiliateAttestation === true;
  const portalEmail = String(body.email || body.portalEmail || (isEmailShaped(mfsnUsername) ? mfsnUsername : '')).trim().toLowerCase();
  const phone = String(body.phone || '').trim();
  const pp = body.permissiblePurposeConsent === true;
  const croa = body.croaContractAgreed === true;
  const tsr = body.tsrAdvanceFeeWaived === true;

  if (!mfsnUsername || !isEmailShaped(mfsnUsername)) {
    return c.json({ error: 'Your MyFreeScoreNow member email is required' }, 400);
  }
  // Each MFSN member has their own client_token (MAPIK#...). Partner Bearer auth is separate.
  if (!mfsnToken) {
    return c.json({
      error: 'Your MyFreeScoreNow client token is required (starts with MAPIK#). Find it in your MFSN member account / welcome materials.',
      code: 'MEMBER_TOKEN_REQUIRED',
      affiliateOffers: listPublicAffiliateOffers(),
    }, 400);
  }
  // Default to recommended offer when member is already pulling under our partner API.
  const resolvedOfferCode = isAllowedAffiliateOfferCode(affiliateOfferCode)
    ? affiliateOfferCode
    : 'B01A8289';
  if (!isAllowedAffiliateOfferCode(resolvedOfferCode)) {
    return c.json({
      error: 'Select which RJ Business Solutions MyFreeScoreNow offer you enrolled with.',
      code: 'AFFILIATE_OFFER_REQUIRED',
      affiliateId: MFSN_AFFILIATE_ID,
      affiliateOffers: listPublicAffiliateOffers(),
    }, 403);
  }
  // Attestation is preferred in UI; a successful partner pull below is the hard proof.
  const affiliateOffer = getAffiliateOffer(resolvedOfferCode)!;
  if (!portalEmail || !isEmailShaped(portalEmail)) {
    return c.json({ error: 'A valid email is required for portal access (use your MFSN email or enter one)' }, 400);
  }
  if (!pp || !croa || !tsr) {
    return c.json({
      error: 'Consent required',
      complianceRequired: true,
      message: 'You must agree to FCRA permissible purpose, CROA disclosure, and TSR advance-fee waiver to continue.',
    }, 403);
  }

  const orgId = resolvePublicSignupOrgId(c.env);
  const org = await c.env.DB.prepare('SELECT id, name FROM organizations WHERE id = ?').bind(orgId).first() as any;
  if (!org) {
    return c.json({ error: 'Signup organization is not configured. Contact support.' }, 503);
  }

  const existingUser = await c.env.DB.prepare('SELECT id, role, org_id FROM users WHERE lower(email) = ?').bind(portalEmail).first() as any;
  if (existingUser) {
    return c.json({
      error: 'An account with this email already exists. Please sign in to your portal.',
      code: 'EMAIL_EXISTS',
      loginUrl: `${portalBaseUrl(c.env, c.req.url)}/`,
    }, 409);
  }

  // Partner API auth always from platform secrets — never the client's password.
  const creds = resolvePublicSignupMfsnCredentials(c.env, mfsnToken || undefined);
  if (!creds) {
    return c.json({
      error: 'MyFreeScoreNow partner API is not configured. Enter your client token, or contact support.',
      code: 'PARTNER_NOT_CONFIGURED',
    }, 503);
  }

  let mfsnReportData: any;
  let normalized: any;
  try {
    const mfsn = new MFSNClient(creds);
    const pulled = await mfsn.fetchAndNormalize(mfsnUsername);
    mfsnReportData = pulled.raw;
    normalized = pulled.normalized;
  } catch (e: any) {
    const code = e instanceof MFSNError ? e.code : 'MFSN_PULL_FAILED';
    const status = e instanceof MFSNError ? (e.statusCode >= 400 && e.statusCode < 600 ? e.statusCode : 502) : 502;
    const notUnderAffiliate = code === 'USER_NOT_FOUND' || /not found/i.test(String(e?.message || ''));
    return c.json({
      error: notUnderAffiliate
        ? 'No MyFreeScoreNow membership found under our affiliate. Enroll with one of our links first, then try again.'
        : (e?.message || 'Failed to pull MyFreeScoreNow report. Check your member email, password, and/or token.'),
      code: notUnderAffiliate ? 'AFFILIATE_MEMBER_REQUIRED' : code,
      affiliateId: MFSN_AFFILIATE_ID,
      affiliateOffers: notUnderAffiliate ? listPublicAffiliateOffers() : undefined,
      enrollUrl: notUnderAffiliate ? affiliateOffer.enrollUrl : undefined,
    }, status as any);
  }

  const bureauReports = mapMfsnToInternal(mfsnReportData);
  if (!bureauReports.length) {
    return c.json({ error: 'No bureau data found in the MyFreeScoreNow response' }, 404);
  }

  const personal = bureauReports[0].personalInfo || {};
  const { firstName, lastName } = parsePersonNameFromReport(personal);
  const addr = parseAddressFromReport(personal);
  const ssnLast4 = extractSsnLast4(personal);
  const dob = String(personal.dobs?.[0] || '').trim() || null;

  const clientId = generateId();
  const userId = generateId();
  const tempPassword = generatePortalTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  const clientName = `${firstName} ${lastName}`.trim();

  const signupNotes = `Created via public MyFreeScoreNow signup (affiliate ${affiliateOffer.code}) — analysis locked until payment approval`;

  // users.id is referenced by clients.created_by — insert the portal user first.
  try {
    await c.env.DB.prepare(
      'INSERT INTO users (id, org_id, email, name, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)'
    ).bind(userId, orgId, portalEmail, clientName, passwordHash, 'client').run();
  } catch (e: any) {
    console.error('[mfsn-signup] user insert failed', e);
    if (String(e?.message || '').toLowerCase().includes('unique')) {
      return c.json({
        error: 'An account with this email already exists. Please sign in to your portal.',
        code: 'EMAIL_EXISTS',
        loginUrl: `${portalBaseUrl(c.env, c.req.url)}/`,
      }, 409);
    }
    return c.json({ error: 'Failed to create portal login', detail: String(e?.message || e) }, 500);
  }

  try {
    await c.env.DB.prepare(
      `INSERT INTO clients (
        id, org_id, created_by, first_name, last_name, email, phone,
        address_line1, city, state, zip, dob, ssn_last4, notes, status,
        permissible_purpose_consent, croa_contract_agreed, tsr_advance_fee_waived, consent_timestamp,
        case_status, portal_analysis_unlocked, payment_status, signup_source, mfsn_member_email,
        mfsn_affiliate_offer_code, mfsn_enrolled_under_affiliate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 1, 1, 1, datetime('now'),
        'ONBOARDING', 0, 'pending', 'mfsn_public_signup', ?, ?, 1)`
    ).bind(
      clientId, orgId, userId, firstName, lastName, portalEmail, phone || null,
      addr.addressLine1 || null, addr.city || null, addr.state || null, addr.zip || null,
      dob, ssnLast4 || null,
      signupNotes,
      mfsnUsername,
      affiliateOffer.code,
    ).run();
  } catch (e: any) {
    // Soft fallback if migrations 0016/0018 not applied yet
    if (String(e?.message || '').includes('no such column')) {
      try {
        await c.env.DB.prepare(
          `INSERT INTO clients (
            id, org_id, created_by, first_name, last_name, email, phone,
            address_line1, city, state, zip, dob, ssn_last4, notes, status,
            permissible_purpose_consent, croa_contract_agreed, tsr_advance_fee_waived, consent_timestamp, case_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 1, 1, 1, datetime('now'), 'ONBOARDING')`
        ).bind(
          clientId, orgId, userId, firstName, lastName, portalEmail, phone || null,
          addr.addressLine1 || null, addr.city || null, addr.state || null, addr.zip || null,
          dob, ssnLast4 || null,
          signupNotes,
        ).run();
        try {
          await c.env.DB.prepare(
            `UPDATE clients SET portal_analysis_unlocked = 0, payment_status = 'pending', signup_source = 'mfsn_public_signup', mfsn_member_email = ? WHERE id = ?`
          ).bind(mfsnUsername, clientId).run();
        } catch { /* columns missing until migrate */ }
        try {
          await c.env.DB.prepare(
            `UPDATE clients SET mfsn_affiliate_offer_code = ?, mfsn_enrolled_under_affiliate = 1 WHERE id = ?`
          ).bind(affiliateOffer.code, clientId).run();
        } catch { /* migration 0018 pending */ }
      } catch (e2: any) {
        console.error('[mfsn-signup] client insert fallback failed', e2);
        try { await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run(); } catch { /* soft */ }
        return c.json({ error: 'Failed to create client profile', detail: String(e2?.message || e2) }, 500);
      }
    } else {
      console.error('[mfsn-signup] client insert failed', e);
      try { await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run(); } catch { /* soft */ }
      return c.json({ error: 'Failed to create client profile', detail: String(e?.message || e) }, 500);
    }
  }

  // Import + full analysis (staff-visible; client-gated)
  let importResult: any = null;
  try {
    importResult = await importBureauReportsBatch(
      c,
      {
        generateId,
        encryptPII,
        backpopulateClientInfo,
        saveViolationsForReport,
        persistBureauScores,
        markPriorBureauReportsStale,
        refreshBureauPackStatus,
        computeAndStoreFundability,
      },
      {
        clientId,
        bureauReports,
        rawPayload: mfsnReportData,
        sourceProvider: 'MyFreeScoreNow',
        sourcePayloadType: 'json',
        fileNamePrefix: `mfsn-signup_${mfsnUsername.replace(/[^a-z0-9@._-]/gi, '_').slice(0, 40)}`,
        activityAction: 'mfsn_public_signup',
        activityDescription: `Public MFSN signup: pulled ${bureauReports.length} bureau report(s); analysis locked pending payment`,
        actingUser: { id: userId, org_id: orgId },
      },
    );
  } catch (e: any) {
    console.error('[mfsn-signup] import failed', e);
    // Client + user already created — still send portal access; staff can re-pull
    await c.env.DB.prepare(
      'INSERT INTO activity_log (id, org_id, client_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      generateId(), orgId, clientId, userId, 'mfsn_signup_import_error',
      `MFSN signup created portal but report import failed: ${e?.message || 'unknown'}`,
      JSON.stringify({ error: e?.message || String(e) }),
    ).run();
  }

  // Scores from normalized payload
  try {
    let eq: number | null = null;
    let ex: number | null = null;
    let tu: number | null = null;
    for (const s of normalized?.scores || []) {
      if (s.provider === 'EFX') eq = s.score;
      if (s.provider === 'EXP') ex = s.score;
      if (s.provider === 'TU') tu = s.score;
    }
    if (eq || ex || tu) {
      await c.env.DB.prepare(
        `UPDATE clients SET eq_score = COALESCE(?, eq_score), ex_score = COALESCE(?, ex_score), tu_score = COALESCE(?, tu_score), updated_at = datetime('now') WHERE id = ? AND org_id = ?`
      ).bind(eq, ex, tu, clientId, orgId).run();
    }
  } catch { /* soft */ }

  await backpopulateClientInfo(c, clientId, personal, orgId);

  const phoneE164 = toE164Phone(phone);
  if (phoneE164) {
    try {
      await c.env.DB.prepare(
        `UPDATE clients SET phone = COALESCE(phone, ?), phone_e164 = ?, notify_sms = 1, updated_at = datetime('now') WHERE id = ? AND org_id = ?`
      ).bind(phone, phoneE164, clientId, orgId).run();
    } catch {
      try {
        await c.env.DB.prepare(
          `UPDATE clients SET phone = COALESCE(phone, ?), notify_sms = 1, updated_at = datetime('now') WHERE id = ? AND org_id = ?`
        ).bind(phone, clientId, orgId).run();
      } catch { /* soft */ }
    }
  }

  const loginUrl = `${portalBaseUrl(c.env, c.req.url)}/`;
  const mail = await sendPortalWelcomeEmail(c.env, {
    to: portalEmail,
    clientName,
    email: portalEmail,
    temporaryPassword: tempPassword,
    requestUrl: c.req.url,
    orgId,
    clientId,
  });
  try {
    await c.env.DB.prepare(
      `UPDATE clients SET portal_welcome_sent_at = datetime('now') WHERE id = ? AND org_id = ?`
    ).bind(clientId, orgId).run();
  } catch { /* soft */ }

  // Welcome SMS via Twilio when phone provided
  let smsResult: any = null;
  if (phoneE164) {
    smsResult = await sendSms(
      c.env,
      phoneE164,
      `Smart FCRA: Your portal is ready. Login: ${portalEmail} Temp password: ${tempPassword} ${loginUrl} — Analysis unlocks after payment confirmation.`,
    );
  }

  // Sync contact + scores into GoHighLevel CRM
  let ghlResult: any = null;
  try {
    const clientRow = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(clientId).first() as any;
    const ghlClient = clientRow || {
      id: clientId, email: portalEmail, phone: phoneE164 || phone,
      first_name: firstName, last_name: lastName,
      address_line1: addr.addressLine1, city: addr.city, state: addr.state, zip: addr.zip,
      case_status: 'ONBOARDING', payment_status: 'pending', signup_source: 'mfsn_public_signup',
      mfsn_member_email: mfsnUsername, portal_analysis_unlocked: 0,
      mfsn_affiliate_offer_code: affiliateOffer.code,
      eq_score: null, ex_score: null, tu_score: null,
    };
    ghlResult = await syncClientToGhl(c.env, ghlClient, {
      portalUrl: loginUrl,
      violationCount: importResult?.totalViolations || 0,
      analysisUnlocked: false,
      orgName: org.name,
      tags: buildGhlTagsForClient(ghlClient, { analysisUnlocked: false, mfsnStatus: 'ACTIVE' }),
    });
    if (ghlResult.ok && ghlResult.contactId) {
      try {
        await c.env.DB.prepare(
          `UPDATE clients SET ghl_contact_id = ?, ghl_synced_at = datetime('now') WHERE id = ? AND org_id = ?`
        ).bind(ghlResult.contactId, clientId, orgId).run();
      } catch { /* migration pending */ }
    }
  } catch (e: any) {
    ghlResult = { ok: false, error: e?.message || 'ghl_sync_failed' };
  }

  await c.env.DB.prepare(
    'INSERT INTO activity_log (id, org_id, client_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    generateId(), orgId, clientId, userId, 'portal_credentials_sent',
    `Portal welcome ${mail.ok ? 'sent' : 'queued/failed'} for MFSN signup`,
    JSON.stringify({
      email: portalEmail,
      mailOk: mail.ok,
      simulated: mail.simulated,
      sms: smsResult?.sent ? 'sent' : (smsResult?.error || null),
      ghlContactId: ghlResult?.contactId || null,
      ghlOk: !!ghlResult?.ok,
      violationsFound: importResult?.totalViolations ?? null,
      analysisLocked: true,
    }),
  ).run();

  return c.json({
    ok: true,
    clientId,
    email: portalEmail,
    clientName,
    orgName: org.name,
    temporaryPassword: tempPassword,
    loginUrl: mail.loginUrl || loginUrl,
    emailSent: !!mail.ok,
    emailSimulated: !!mail.simulated,
    smsSent: !!smsResult?.sent,
    ghlSynced: !!ghlResult?.ok,
    ghlContactId: ghlResult?.contactId || null,
    reportsImported: importResult?.results?.length || 0,
    violationsFound: importResult?.totalViolations || 0,
    analysisLocked: true,
    affiliateOfferCode: affiliateOffer.code,
    affiliateId: MFSN_AFFILIATE_ID,
    message: 'Your portal is ready. Sign in with the email and temporary password below (also sent by email/SMS when available). Your credit analysis stays private until our team unlocks it after payment.',
  });
});

/** Staff: full MFSN affiliate offer catalog with commissions (A8289). */
app.get('/api/mfsn/affiliate-offers', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role === 'client') {
    return c.json({ error: 'Staff only' }, 403);
  }
  return c.json({
    ok: true,
    affiliateId: MFSN_AFFILIATE_ID,
    offers: listStaffAffiliateOffers(),
  });
});

/** Staff: whitelisted MFSN operator accounts + docs (no passwords). */
app.get('/api/mfsn/operator-access', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role === 'client') {
    return c.json({ error: 'Staff only' }, 403);
  }
  const configuredEmail = String(c.env.MFSN_EMAIL || '').trim().toLowerCase();
  return c.json({
    ok: true,
    affiliateId: MFSN_AFFILIATE_ID,
    primaryEmail: primaryMfsnOperatorEmail(),
    configuredEmail: configuredEmail || null,
    configuredEmailWhitelisted: isWhitelistedMfsnOperatorEmail(configuredEmail),
    partnerConfigured: !!resolvePartnerMfsnCredentials(c.env),
    operators: MFSN_OPERATOR_ACCOUNTS,
    affiliatePortalUrl: String(c.env.MFSN_AFFILIATE_PORTAL_URL || MFSN_AFFILIATE_PORTAL_URL),
    apiDocsUrl: String(c.env.MFSN_API_DOCS_URL || MFSN_API_DOCS_URL),
    openApiUrl: MFSN_OPENAPI_URL,
    agentRunbook: '/docs/agents/mfsn-partner/AGENT_ACCESS.md',
  });
});

// AUTH ROUTES
// ═══════════════════════════════════════════════════════════════
app.post('/api/auth/register', async (c) => {
  const { name, email, password, orgName } = await c.req.json();
  if (!name || !email || !password || !orgName) return c.json({ error: 'All fields required' }, 400);
  if (String(password).length < 8) return c.json({ error: 'Password must be at least 8 characters' }, 400);

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return c.json({ error: 'Email already registered' }, 409);

  let orgId: string, userId: string, slug: string, passwordHash: string;
  try {
    orgId = generateId();
    userId = generateId();
    slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) + '-' + orgId.slice(0, 8);
  } catch (e: any) {
    console.error('[REGISTER] generateId failed:', e);
    return c.json({ error: 'Internal error (id gen)' }, 500);
  }

  try {
    passwordHash = await hashPassword(password);
  } catch (e: any) {
    console.error('[REGISTER] hashPassword failed:', e);
    return c.json({ error: e.message || 'Internal error (hashing)' }, 500);
  }

  try {
    const requireVerify = true;
    await c.env.DB.batch([
      c.env.DB.prepare('INSERT INTO organizations (id, name, slug, plan) VALUES (?, ?, ?, ?)').bind(orgId, orgName, slug, 'free'),
      c.env.DB.prepare('INSERT INTO users (id, org_id, email, name, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(
        userId, orgId, email, name, passwordHash, 'admin', 0
      ),
    ]);
  } catch (e: any) {
    console.error('[REGISTER] batch insert failed:', e.message, e.stack);
    if (e.message?.includes('UNIQUE')) return c.json({ error: 'Organization name already taken' }, 409);
    return c.json({ error: `Internal error (db insert): ${e.message}` }, 500);
  }

  if (
    ((c.env.CLOUDFLARE_EMAIL_API_TOKEN || c.env.CLOUDFLARE_API_TOKEN) && c.env.CLOUDFLARE_ACCOUNT_ID) ||
    c.env.RESEND_API_KEY ||
    c.env.SENDGRID_API_KEY
  ) {
    const verifyToken = generateEmailToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await c.env.DB.prepare(
      'INSERT INTO email_verification_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)'
    ).bind(generateId(), userId, verifyToken, expires).run();
    const base = c.env.FRONTEND_URL || c.env.APP_BASE_URL || 'https://smart-fcra-v2.pages.dev';
    const verifyUrl = `${base}/?verifyEmail=${verifyToken}`;
    try {
      const brand = await loadOrgBrand(c.env, orgId);
      await sendTemplatedClientMessage(c.env, {
        templateId: 'account_verify',
        orgId,
        clientId: `user:${userId}`,
        email,
        notifyEmail: true,
        notifySms: false,
        skipClientAlert: true,
        brand,
        vars: {
          ...brandVars(brand),
          name,
          verifyUrl,
          portalUrl: `${base}/`,
        },
      });
    } catch (e) {
      console.error('[REGISTER] verification email failed', e);
    }
    return c.json({
      requiresVerification: true,
      message: 'Account created. Check your email to verify before signing in.',
      user: { id: userId, name, email, role: 'admin', org_id: orgId },
      org: { id: orgId, name: orgName, plan: 'free' },
    });
  }

  return c.json({
    requiresVerification: true,
    message: 'Account created but email verification is required. Contact support to activate — outbound email is not configured on this deployment.',
    user: { id: userId, name, email, role: 'admin', org_id: orgId },
    org: { id: orgId, name: orgName, plan: 'free' },
  }, 201);
});

app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) return c.json({ error: 'Email and password required' }, 400);

  // Optional env-based platform bootstrap (NEVER hardcode credentials in source)
  const bootstrapEmail = (c.env.PLATFORM_BOOTSTRAP_EMAIL || '').toLowerCase().trim();
  const bootstrapPassword = c.env.PLATFORM_BOOTSTRAP_PASSWORD || '';
  const isBootstrap =
    !!bootstrapEmail &&
    !!bootstrapPassword &&
    email.toLowerCase().trim() === bootstrapEmail &&
    password === bootstrapPassword;

  let user: any = null;

  if (isBootstrap) {
    user = await c.env.DB.prepare(
      'SELECT u.*, o.name as org_name, o.plan as org_plan FROM users u JOIN organizations o ON u.org_id = o.id WHERE u.email = ?'
    ).bind(email).first() as any;

    if (!user) {
      const orgId = 'org_platform_master';
      const userId = 'usr_platform_master';
      const passwordHash = await hashPassword(password);
      await c.env.DB.prepare(
        'INSERT OR IGNORE INTO organizations (id, name, slug, plan, max_users, max_clients, max_reports_per_month) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(orgId, 'RJ Business Solutions', 'rj-business-solutions', 'enterprise', 1000, 100000, 100000).run();
      await c.env.DB.prepare(
        'INSERT OR IGNORE INTO users (id, org_id, email, name, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)'
      ).bind(userId, orgId, email, 'Platform Owner', passwordHash, 'super_admin').run();
      user = await c.env.DB.prepare(
        'SELECT u.*, o.name as org_name, o.plan as org_plan FROM users u JOIN organizations o ON u.org_id = o.id WHERE u.email = ?'
      ).bind(email).first() as any;
    } else {
      await c.env.DB.prepare('UPDATE users SET role = "super_admin", is_active = 1 WHERE id = ?').bind(user.id).run();
      await c.env.DB.prepare('UPDATE organizations SET plan = "enterprise" WHERE id = ?').bind(user.org_id).run();
      user = await c.env.DB.prepare(
        'SELECT u.*, o.name as org_name, o.plan as org_plan FROM users u JOIN organizations o ON u.org_id = o.id WHERE u.email = ?'
      ).bind(email).first() as any;
    }
  } else {
    user = await c.env.DB.prepare(
      'SELECT u.*, o.name as org_name, o.plan as org_plan, o.settings as org_settings FROM users u JOIN organizations o ON u.org_id = o.id WHERE u.email = ?'
    ).bind(email).first() as any;
    if (!user) return c.json({ error: 'Invalid credentials' }, 401);

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return c.json({ error: 'Invalid credentials' }, 401);

    if (user.is_active !== 1) {
      return c.json({
        error: 'Email not verified. Check your inbox for the activation link, or contact support.',
        code: 'EMAIL_NOT_VERIFIED',
      }, 403);
    }

    if (needsPasswordRehash(user.password_hash)) {
      try {
        const upgraded = await hashPassword(password);
        await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(upgraded, user.id).run();
      } catch (e) {
        console.warn('[LOGIN] password rehash failed', e);
      }
    }
  }

  // Org suspension gate
  try {
    const settings = typeof user.org_settings === 'string' ? JSON.parse(user.org_settings || '{}') : (user.org_settings || {});
    if (settings.suspended) return c.json({ error: 'Organization suspended. Contact support.' }, 403);
  } catch { /* ignore */ }

  if (user.mfa_enabled === 1) {
    const tempToken = createSessionToken();
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await c.env.DB.prepare(
      'INSERT INTO mfa_challenges (id, user_id, token, expires_at, consumed) VALUES (?, ?, ?, ?, 0)'
    ).bind(generateId(), user.id, tempToken, expires).run();
    return c.json({ mfaRequired: true, userId: user.id, tempToken });
  }

  const token = createSessionToken();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const ua = c.req.header('User-Agent') || 'unknown';
  await c.env.DB.prepare('INSERT INTO sessions (id, user_id, org_id, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)').bind(token, user.id, user.org_id, expires, ip, ua).run();
  await c.env.DB.prepare('UPDATE users SET last_login = datetime("now") WHERE id = ?').bind(user.id).run();

  return c.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, org_id: user.org_id },
    org: { id: user.org_id, name: user.org_name, plan: user.org_plan },
  });
});

app.post('/api/auth/mfa/challenge', async (c) => {
  const { userId, code, tempToken } = await c.req.json();
  if (!userId || !code || !tempToken) return c.json({ error: 'All fields required' }, 400);

  const challenge = await c.env.DB.prepare(
    'SELECT * FROM mfa_challenges WHERE token = ? AND user_id = ? AND consumed = 0 AND expires_at > datetime("now")'
  ).bind(tempToken, userId).first() as any;
  if (!challenge) return c.json({ error: 'Invalid or expired MFA challenge' }, 401);

  const user = await c.env.DB.prepare(
    'SELECT u.*, o.name as org_name, o.plan as org_plan FROM users u JOIN organizations o ON u.org_id = o.id WHERE u.id = ? AND u.is_active = 1'
  ).bind(userId).first() as any;
  if (!user) return c.json({ error: 'User not found' }, 404);

  const isValid = await verifyTOTP(user.mfa_secret, code);
  if (!isValid) return c.json({ error: 'Invalid 6-digit MFA code' }, 401);

  await c.env.DB.prepare('UPDATE mfa_challenges SET consumed = 1 WHERE id = ?').bind(challenge.id).run();

  const token = createSessionToken();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const ua = c.req.header('User-Agent') || 'unknown';
  await c.env.DB.prepare('INSERT INTO sessions (id, user_id, org_id, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)').bind(token, user.id, user.org_id, expires, ip, ua).run();
  await c.env.DB.prepare('UPDATE users SET last_login = datetime("now") WHERE id = ?').bind(user.id).run();

  return c.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, org_id: user.org_id },
    org: { id: user.org_id, name: user.org_name, plan: user.org_plan },
  });
});

app.post('/api/auth/mfa/setup', authMiddleware, async (c) => {
  const user = c.get('user');
  const mfaSecret = generateMFASecret();
  const encSecret = await encryptPII(c, mfaSecret);
  try {
    await c.env.DB.prepare('UPDATE users SET mfa_secret = ?, mfa_secret_enc = ? WHERE id = ?').bind(mfaSecret, encSecret, user.id).run();
  } catch {
    await c.env.DB.prepare('UPDATE users SET mfa_secret = ? WHERE id = ?').bind(mfaSecret, user.id).run();
  }

  const issuer = 'SmartFCRA';
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(user.email)}?secret=${mfaSecret}&issuer=${encodeURIComponent(issuer)}`;
  await writeSecurityAudit(c.env, {
    orgId: user.org_id, actorUserId: user.id, actorRole: user.role, action: 'mfa_setup_started',
    ip: c.req.header('CF-Connecting-IP'), ua: c.req.header('User-Agent'),
  });
  return c.json({ secret: mfaSecret, otpauthUrl, issuer, qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(otpauthUrl)}` });
});

app.post('/api/auth/mfa/verify', authMiddleware, async (c) => {
  const user = c.get('user');
  const { code } = await c.req.json();
  if (!code) return c.json({ error: '6-digit code required' }, 400);

  const dbUser = await c.env.DB.prepare('SELECT mfa_secret FROM users WHERE id = ?').bind(user.id).first() as any;
  if (!dbUser || !dbUser.mfa_secret) return c.json({ error: 'MFA not set up yet' }, 400);

  const isValid = await verifyTOTP(dbUser.mfa_secret, code);
  if (!isValid) return c.json({ error: 'Invalid 6-digit MFA code' }, 401);

  await c.env.DB.prepare('UPDATE users SET mfa_enabled = 1 WHERE id = ?').bind(user.id).run();

  return c.json({ success: true, message: 'Multi-factor authentication enabled successfully' });
});

app.post('/api/auth/mfa/disable', authMiddleware, async (c) => {
  const user = c.get('user');
  const { code } = await c.req.json();
  if (!code) return c.json({ error: 'Code required to disable MFA' }, 400);

  const dbUser = await c.env.DB.prepare('SELECT mfa_secret, mfa_enabled FROM users WHERE id = ?').bind(user.id).first() as any;
  if (!dbUser || !dbUser.mfa_enabled) return c.json({ error: 'MFA is not enabled' }, 400);

  const isValid = await verifyTOTP(dbUser.mfa_secret, code);
  if (!isValid) return c.json({ error: 'Invalid 6-digit MFA code' }, 401);

  await c.env.DB.prepare('UPDATE users SET mfa_secret = NULL, mfa_enabled = 0 WHERE id = ?').bind(user.id).run();

  return c.json({ success: true, message: 'Multi-factor authentication disabled successfully' });
});

app.get('/api/auth/mfa/status', authMiddleware, async (c) => {
  const user = c.get('user');
  const dbUser = await c.env.DB.prepare('SELECT mfa_enabled FROM users WHERE id = ?').bind(user.id).first() as any;
  return c.json({ enabled: dbUser ? dbUser.mfa_enabled === 1 : false });
});

app.post('/api/auth/change-password', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const currentPassword = String(body.currentPassword || '');
  const newPassword = String(body.newPassword || '');
  const policy = passwordMeetsPolicy(newPassword);
  if (!policy.ok) return c.json({ error: 'Password policy failed', requirements: policy.errors }, 400);
  const dbUser = await c.env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(user.id).first() as any;
  if (!dbUser) return c.json({ error: 'User not found' }, 404);
  const ok = await verifyPassword(currentPassword, dbUser.password_hash);
  if (!ok) {
    await writeSecurityAudit(c.env, {
      orgId: user.org_id, actorUserId: user.id, actorRole: user.role, action: 'password_change_failed',
      ip: c.req.header('CF-Connecting-IP'), ua: c.req.header('User-Agent'), success: false,
    });
    return c.json({ error: 'Current password is incorrect' }, 401);
  }
  const hash = await hashPassword(newPassword);
  try {
    await c.env.DB.prepare(`UPDATE users SET password_hash = ?, password_changed_at = datetime('now'), must_change_password = 0 WHERE id = ?`)
      .bind(hash, user.id).run();
  } catch {
    await c.env.DB.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).bind(hash, user.id).run();
  }
  const session = c.get('session');
  await c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND id != ?').bind(user.id, session.id).run();
  await writeSecurityAudit(c.env, {
    orgId: user.org_id, actorUserId: user.id, actorRole: user.role, action: 'password_changed',
    ip: c.req.header('CF-Connecting-IP'), ua: c.req.header('User-Agent'),
  });
  return c.json({ ok: true, message: 'Password updated. Other sessions were signed out.' });
});

app.get('/api/security/posture', authMiddleware, async (c) => {
  return c.json(buildSecurityPosture(c.env));
});

app.get('/api/security/trust-center', async (c) => {
  const full = buildSecurityPosture(c.env);
  return c.json({
    product: full.product,
    score: full.score,
    scoredAt: full.scoredAt,
    claims: full.claims,
    controls: full.controls.map((x) => ({ id: x.id, title: x.title, status: x.status, detail: x.detail })),
  });
});

app.post('/api/auth/logout', authMiddleware, async (c) => {
  const session = c.get('session');
  await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(session.id).run();
  return c.json({ ok: true });
});

app.get('/api/auth/me', authMiddleware, async (c) => {
  const user = c.get('user');
  const org = await c.env.DB.prepare('SELECT * FROM organizations WHERE id = ?').bind(user.org_id).first();
  return c.json({ user, org });
});


app.get('/api/auth/sessions', authMiddleware, async (c) => {
  const user = c.get('user');
  const rows = await c.env.DB.prepare(
    `SELECT id, ip_address, user_agent, created_at, expires_at FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
  ).bind(user.id).all();
  const current = c.get('session').id;
  return c.json({ sessions: (rows?.results || []).map((s: any) => ({ ...s, current: s.id === current })) });
});

app.post('/api/auth/sessions/:id/revoke', authMiddleware, async (c) => {
  const user = c.get('user');
  const sessionId = c.req.param('id');
  if (sessionId === c.get('session').id) return c.json({ error: 'Cannot revoke current session' }, 400);
  await c.env.DB.prepare('DELETE FROM sessions WHERE id = ? AND user_id = ?').bind(sessionId, user.id).run();
  await writeSecurityAudit(c.env, { orgId: user.org_id, actorUserId: user.id, actorRole: user.role, action: 'session_revoked', resourceId: sessionId, ip: c.req.header('CF-Connecting-IP') });
  return c.json({ ok: true });
});

app.post('/api/auth/sessions/revoke-all', authMiddleware, async (c) => {
  const user = c.get('user');
  const current = c.get('session').id;
  await c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND id != ?').bind(user.id, current).run();
  await writeSecurityAudit(c.env, { orgId: user.org_id, actorUserId: user.id, actorRole: user.role, action: 'sessions_revoked_all', ip: c.req.header('CF-Connecting-IP') });
  return c.json({ ok: true });
});

app.post('/api/auth/verify-email', async (c) => {
  const { token } = await c.req.json();
  if (!token) return c.json({ error: 'Token required' }, 400);

  const record = await c.env.DB.prepare(
    'SELECT * FROM email_verification_tokens WHERE token = ? AND expires_at > datetime("now")'
  ).bind(token).first() as any;
  if (!record) return c.json({ error: 'Invalid or expired token' }, 400);

  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE users SET is_active = 1 WHERE id = ?').bind(record.user_id),
    c.env.DB.prepare('DELETE FROM email_verification_tokens WHERE token = ?').bind(token),
  ]);

  return c.json({ ok: true, message: 'Email verified successfully' });
});

app.post('/api/auth/forgot-password', async (c) => {
  const { email } = await c.req.json();
  if (!email) return c.json({ error: 'Email required' }, 400);

  const user = await c.env.DB.prepare('SELECT id, email, name FROM users WHERE email = ?').bind(email).first() as any;
  // Always return the same message (no email enumeration)
  const okPayload = { ok: true, message: 'If the email exists, a reset link has been sent' };
  if (!user) return c.json(okPayload);

  const token = generateEmailToken();
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  await c.env.DB.prepare(
    'INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(generateId(), user.id, token, expires).run();

  const base = c.env.FRONTEND_URL || c.env.APP_BASE_URL || 'https://smart-fcra-v2.pages.dev';
  const resetUrl = `${base}/?resetToken=${token}`;
  try {
    const brand = await loadOrgBrand(c.env, null);
    await sendTemplatedClientMessage(c.env, {
      templateId: 'password_reset',
      orgId: 'system',
      clientId: `user:${user.id}`,
      email: user.email,
      notifyEmail: true,
      notifySms: false,
      skipClientAlert: true,
      brand,
      vars: {
        ...brandVars(brand),
        name: user.name || '',
        resetUrl,
        portalUrl: `${base}/`,
      },
    });
  } catch (e) {
    console.error('[PASSWORD RESET] email failed', e);
  }

  // Only expose token in non-production for local QA
  if ((c.env.ENVIRONMENT || 'development') !== 'production') {
    return c.json({ ...okPayload, debugToken: token });
  }
  return c.json(okPayload);
});

app.post('/api/auth/reset-password', async (c) => {
  const { token, password } = await c.req.json();
  if (!token || !password) return c.json({ error: 'Token and new password required' }, 400);
  if (String(password).length < 8) return c.json({ error: 'Password must be at least 8 characters' }, 400);

  const record = await c.env.DB.prepare(
    'SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > datetime("now")'
  ).bind(token).first() as any;
  if (!record) return c.json({ error: 'Invalid or expired token' }, 400);

  const newHash = await hashPassword(password);
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(newHash, record.user_id),
    c.env.DB.prepare('DELETE FROM password_reset_tokens WHERE token = ?').bind(token),
    c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(record.user_id),
  ]);

  return c.json({ ok: true, message: 'Password reset successfully' });
});

// ═══════════════════════════════════════════════════════════════
// DASHBOARD STATS (enhanced)
// ═══════════════════════════════════════════════════════════════
app.get('/api/dashboard', authMiddleware, async (c) => {
  const user = c.get('user');
  const oid = user.org_id;

  const [clients, reports, violations, docs] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as count FROM clients WHERE org_id = ?').bind(oid).first(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM credit_reports WHERE org_id = ?').bind(oid).first(),
    c.env.DB.prepare('SELECT COUNT(*) as count, severity FROM violations WHERE org_id = ? GROUP BY severity').bind(oid).all(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM documents WHERE org_id = ?').bind(oid).first(),
  ]);

  const totalDamages = await c.env.DB.prepare('SELECT SUM(total_damages_min) as min_total, SUM(total_damages_max) as max_total FROM violations WHERE org_id = ?').bind(oid).first() as any;
  const recentActivity = await c.env.DB.prepare('SELECT * FROM activity_log WHERE org_id = ? ORDER BY created_at DESC LIMIT 10').bind(oid).all();
  const recentViolations = await c.env.DB.prepare('SELECT v.*, c.first_name, c.last_name FROM violations v JOIN clients c ON v.client_id = c.id WHERE v.org_id = ? ORDER BY v.created_at DESC LIMIT 5').bind(oid).all();
  const byCategory = await c.env.DB.prepare('SELECT category, COUNT(*) as count FROM violations WHERE org_id = ? GROUP BY category').bind(oid).all();

  const stats = {
    totalClients: (clients as any)?.count || 0,
    totalReports: (reports as any)?.count || 0,
    totalViolations: violations?.results?.reduce((s: number, r: any) => s + r.count, 0) || 0,
    violationsBySeverity: violations?.results || [],
    violationsByCategory: byCategory?.results || [],
    totalDocuments: (docs as any)?.count || 0,
    totalDamagesMin: totalDamages?.min_total || 0,
    totalDamagesMax: totalDamages?.max_total || 0,
  };

  return c.json({
    stats,
    ...stats,
    recentActivity: recentActivity?.results || [],
    recentViolations: recentViolations?.results || [],
  });
});

// ═══════════════════════════════════════════════════════════════
// CLIENT (CRM) ROUTES
// ═══════════════════════════════════════════════════════════════
app.get('/api/clients', authMiddleware, async (c) => {
  const user = c.get('user');
  const search = c.req.query('search') || '';
  const status = c.req.query('status') || '';
  
  let query = 'SELECT c.*, (SELECT COUNT(*) FROM credit_reports WHERE client_id = c.id) as report_count, (SELECT COUNT(*) FROM violations WHERE client_id = c.id) as violation_count, (SELECT SUM(total_damages_min) FROM violations WHERE client_id = c.id) as damages_min, (SELECT SUM(total_damages_max) FROM violations WHERE client_id = c.id) as damages_max FROM clients c WHERE c.org_id = ?';
  const params: any[] = [user.org_id];

  if (search) { query += ' AND (c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (status) { query += ' AND c.status = ?'; params.push(status); }
  query += ' ORDER BY c.updated_at DESC';

  const result = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ clients: result?.results || [] });
});

app.post('/api/clients', authMiddleware, async (c) => {
  const user = c.get('user');
  const planCheck = await verifyOrgPlanLimits(c, 'client');
  if (!planCheck.allowed) return c.json({ error: planCheck.message }, 403);

  const data = await c.req.json();
  const id = generateId();

  // Support both {name} and {firstName, lastName} payloads
  let firstName = data.firstName || '';
  let lastName = data.lastName || '';
  if (!firstName && data.name) {
    const parts = data.name.trim().split(/\s+/);
    firstName = parts[0] || '';
    lastName = parts.slice(1).join(' ') || '';
  }
  if (!firstName) return c.json({ error: 'First name is required' }, 400);

  // Regulatory checkbox values (CROA, FCRA, and TSR)
  const permissiblePurposeConsent = data.permissiblePurposeConsent ? 1 : 0;
  const croaContractAgreed = data.croaContractAgreed ? 1 : 0;
  const tsrAdvanceFeeWaived = data.tsrAdvanceFeeWaived ? 1 : 0;
  const consentTimestamp = data.consentTimestamp || (permissiblePurposeConsent || croaContractAgreed || tsrAdvanceFeeWaived ? new Date().toISOString() : null);

  await c.env.DB.prepare(
    'INSERT INTO clients (id, org_id, created_by, first_name, last_name, email, phone, address_line1, address_line2, city, state, zip, dob, ssn_last4, notes, tags, permissible_purpose_consent, croa_contract_agreed, tsr_advance_fee_waived, consent_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    id, user.org_id, user.id, firstName, lastName,
    data.email || null, data.phone || null, data.addressLine1 || null, data.addressLine2 || null,
    data.city || null, data.state || null, data.zip || null, data.dob || null, data.ssnLast4 || null,
    data.notes || null, JSON.stringify(data.tags || []),
    permissiblePurposeConsent, croaContractAgreed, tsrAdvanceFeeWaived, consentTimestamp
  ).run();

  await c.env.DB.prepare('INSERT INTO activity_log (id, org_id, client_id, user_id, action, description) VALUES (?, ?, ?, ?, ?, ?)').bind(generateId(), user.org_id, id, user.id, 'client_created', `Created client ${firstName} ${lastName}`).run();

  return c.json({ client: { id, firstName, lastName }, message: 'Client created' }, 201);
});

app.get('/api/clients/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(id, user.org_id).first();
  if (!client) return c.json({ error: 'Not found' }, 404);

  const reports = await c.env.DB.prepare(
    'SELECT * FROM credit_reports WHERE client_id = ? AND org_id = ? ORDER BY COALESCE(is_current, 1) DESC, created_at DESC'
  ).bind(id, user.org_id).all();
  const violations = await c.env.DB.prepare(
    'SELECT * FROM violations WHERE client_id = ? AND org_id = ? ORDER BY severity ASC, created_at DESC'
  ).bind(id, user.org_id).all();
  const documents = await c.env.DB.prepare(
    'SELECT * FROM documents WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC'
  ).bind(id, user.org_id).all();
  const activity = await c.env.DB.prepare(
    'SELECT a.*, u.name as user_name FROM activity_log a JOIN users u ON a.user_id = u.id WHERE a.client_id = ? AND a.org_id = ? ORDER BY a.created_at DESC LIMIT 50'
  ).bind(id, user.org_id).all();

  // Transparently decrypt raw text and parsed structures
  const reportsResult = reports?.results || [];
  for (const r of reportsResult) {
    if (r.raw_text) r.raw_text = await decryptPII(c, r.raw_text);
    if (r.parsed_data) r.parsed_data = await decryptPII(c, r.parsed_data);
  }

  const pack = await refreshBureauPackStatus(c, id, user.org_id);

  return c.json({
    client,
    reports: reportsResult,
    violations: hydrateViolationRows(violations?.results || []),
    documents: documents?.results || [],
    activity: activity?.results || [],
    bureauPack: pack,
    scores: {
      equifax: (client as any).eq_score ?? null,
      experian: (client as any).ex_score ?? null,
      transunion: (client as any).tu_score ?? null,
    },
  });
});

app.put('/api/clients/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const data = await c.req.json();

  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(id, user.org_id).first() as any;
  if (!client) return c.json({ error: 'Client not found' }, 404);

  const firstName = data.firstName !== undefined ? data.firstName : client.first_name;
  const lastName = data.lastName !== undefined ? data.lastName : client.last_name;
  const email = data.email !== undefined ? data.email : client.email;
  const phone = data.phone !== undefined ? data.phone : client.phone;
  const addressLine1 = data.addressLine1 !== undefined ? data.addressLine1 : client.address_line1;
  const city = data.city !== undefined ? data.city : client.city;
  const stateVal = data.state !== undefined ? data.state : client.state;
  const zip = data.zip !== undefined ? data.zip : client.zip;
  const notes = data.notes !== undefined ? data.notes : client.notes;
  const status = data.status !== undefined ? data.status : client.status;

  const dob = data.dob !== undefined ? data.dob : client.dob;
  const ssnLast4 = data.ssnLast4 !== undefined ? data.ssnLast4 : client.ssn_last4;
  const permissiblePurposeConsent = data.permissiblePurposeConsent !== undefined 
    ? (data.permissiblePurposeConsent ? 1 : 0) 
    : client.permissible_purpose_consent;
  const croaContractAgreed = data.croaContractAgreed !== undefined 
    ? (data.croaContractAgreed ? 1 : 0) 
    : client.croa_contract_agreed;
  const tsrAdvanceFeeWaived = data.tsrAdvanceFeeWaived !== undefined 
    ? (data.tsrAdvanceFeeWaived ? 1 : 0) 
    : client.tsr_advance_fee_waived;
  const consentTimestamp = data.consentTimestamp !== undefined 
    ? data.consentTimestamp 
    : (data.permissiblePurposeConsent || data.croaContractAgreed || data.tsrAdvanceFeeWaived ? new Date().toISOString() : client.consent_timestamp);

  // New admin case tracking fields
  const caseStatus = data.caseStatus !== undefined ? data.caseStatus : client.case_status;
  const lvsScore = data.lvsScore !== undefined ? data.lvsScore : client.lvs_score;
  const estimatedRecovery = data.estimatedRecovery !== undefined ? data.estimatedRecovery : client.estimated_recovery;
  const subscriptionPlan = data.subscriptionPlan !== undefined ? data.subscriptionPlan : client.subscription_plan;
  const subscriptionStatus = data.subscriptionStatus !== undefined ? data.subscriptionStatus : client.subscription_status;

  await c.env.DB.prepare(
    'UPDATE clients SET first_name=?, last_name=?, email=?, phone=?, address_line1=?, city=?, state=?, zip=?, dob=?, ssn_last4=?, notes=?, status=?, permissible_purpose_consent=?, croa_contract_agreed=?, tsr_advance_fee_waived=?, consent_timestamp=?, case_status=?, lvs_score=?, estimated_recovery=?, subscription_plan=?, subscription_status=?, updated_at=datetime("now") WHERE id=? AND org_id=?'
  ).bind(
    firstName, lastName, email, phone, addressLine1, city, stateVal, zip, dob, ssnLast4, notes, status || 'active',
    permissiblePurposeConsent, croaContractAgreed, tsrAdvanceFeeWaived, consentTimestamp,
    caseStatus || 'ONBOARDING', lvsScore || 0, estimatedRecovery || 0, subscriptionPlan || 'free', subscriptionStatus || 'inactive',
    id, user.org_id
  ).run();

  // If password is provided, dynamically create or update their client user account
  if (data.password && email) {
    const hash = await hashPassword(data.password);
    const existingUser = await c.env.DB.prepare('SELECT * FROM users WHERE email = ? AND org_id = ?').bind(email, user.org_id).first() as any;
    if (existingUser) {
      await c.env.DB.prepare('UPDATE users SET password_hash = ?, name = ?, updated_at = datetime("now") WHERE id = ?')
        .bind(hash, `${firstName} ${lastName}`, existingUser.id).run();
    } else {
      const userId = generateId();
      await c.env.DB.prepare('INSERT INTO users (id, org_id, email, name, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)')
        .bind(userId, user.org_id, email, `${firstName} ${lastName}`, hash, 'client').run();
    }
  }

  return c.json({ ok: true });
});

// Tri-bureau side-by-side comparison for interactive workspace
app.get('/api/clients/:id/bureau-comparison', authMiddleware, async (c) => {
  const user = c.get('user');
  const clientId = c.req.param('id');
  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(clientId, user.org_id).first() as any;
  if (!client) return c.json({ error: 'Client not found' }, 404);

  const bureauNames = ['Equifax', 'Experian', 'TransUnion'] as const;
  const bureaus: any[] = [];

  for (const bureau of bureauNames) {
    const row = await c.env.DB.prepare(
      `SELECT * FROM credit_reports WHERE client_id = ? AND org_id = ? AND bureau = ?
       ORDER BY COALESCE(is_current,1) DESC, created_at DESC LIMIT 1`
    ).bind(clientId, user.org_id, bureau).first() as any;

    let parsed: any = null;
    if (row?.parsed_data) {
      try {
        parsed = JSON.parse(await decryptPII(c, row.parsed_data));
      } catch { /* soft */ }
    }

    const violCount = row
      ? await c.env.DB.prepare('SELECT COUNT(*) as c FROM violations WHERE report_id = ? AND org_id = ?').bind(row.id, user.org_id).first() as any
      : { c: 0 };

    const scoreCol = bureau === 'Equifax' ? client.eq_score : bureau === 'Experian' ? client.ex_score : client.tu_score;
    const parsedScore = parsed?.scores?.fico ?? parsed?.scores?.vantage ?? null;

    bureaus.push({
      bureau,
      reportId: row?.id || null,
      reportDate: row?.report_date || null,
      score: scoreCol ?? parsedScore,
      ficoScore: row?.fico_score ?? parsed?.scores?.fico ?? null,
      vantageScore: row?.vantage_score ?? parsed?.scores?.vantage ?? null,
      accountCount: parsed?.accounts?.length ?? row?.total_accounts ?? 0,
      collectionCount: parsed?.collections?.length ?? row?.total_collections ?? 0,
      inquiryCount: parsed?.inquiries?.length ?? row?.total_inquiries ?? 0,
      violationCount: violCount?.c || 0,
      accounts: (parsed?.accounts || []).slice(0, 40).map((a: any) => ({
        creditorName: a.creditorName,
        accountNumber: a.accountNumber,
        accountStatus: a.accountStatus,
        currentBalance: a.currentBalance,
        creditLimit: a.creditLimit,
        paymentStatus: a.paymentStatus,
      })),
      collections: (parsed?.collections || []).slice(0, 20).map((a: any) => ({
        creditorName: a.creditorName,
        currentBalance: a.currentBalance,
        accountStatus: a.accountStatus,
      })),
    });
  }

  return c.json({
    client: {
      id: client.id,
      first_name: client.first_name,
      last_name: client.last_name,
      eq_score: client.eq_score,
      ex_score: client.ex_score,
      tu_score: client.tu_score,
    },
    bureaus,
    triBureauComplete: bureaus.filter((b) => b.reportId).length >= 3,
  });
});

// ═══════════════════════════════════════════════════════════════
// CLIENT PORTAL & SELF-SERVICE ENDPOINTS
// ═══════════════════════════════════════════════════════════════
app.get('/api/client-portal/dashboard', authMiddleware, async (c) => {
  const user = c.get('user');
  const queryClientId = c.req.query('clientId');

  let client;
  if ((user.role === 'admin' || user.role === 'super_admin') && queryClientId) {
    client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(queryClientId, user.org_id).first() as any;
  } else {
    // Find the unique consumer client mapped to this user's email address
    client = await c.env.DB.prepare('SELECT * FROM clients WHERE email = ? AND org_id = ?').bind(user.email, user.org_id).first() as any;
  }

  if (!client) {
    return c.json({ error: 'Client profile not found. Onboarding may be incomplete.' }, 404);
  }

  const analysisUnlocked = isPortalAnalysisUnlocked(client);
  const isClientViewer = user.role === 'client';
  const gateAnalysis = isClientViewer && !analysisUnlocked;

  const reports = await c.env.DB.prepare('SELECT id, bureau, report_date, file_name, created_at, status, total_accounts, total_collections, total_inquiries FROM credit_reports WHERE client_id = ? AND org_id = ? ORDER BY report_date DESC').bind(client.id, user.org_id).all();
  const violations = gateAnalysis
    ? { results: [] as any[] }
    : await c.env.DB.prepare(
      `SELECT v.*, cr.bureau FROM violations v
       LEFT JOIN credit_reports cr ON v.report_id = cr.id
       WHERE v.client_id = ? AND v.org_id = ? ORDER BY v.created_at DESC`
    ).bind(client.id, user.org_id).all();
  const documents = gateAnalysis
    ? { results: [] as any[] }
    : await c.env.DB.prepare('SELECT id, doc_type, title, status, created_at, signature_timestamp FROM documents WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC').bind(client.id, user.org_id).all();
  const activity = await c.env.DB.prepare('SELECT * FROM activity_log WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 30').bind(client.id, user.org_id).all();

  const scores = [client.eq_score, client.ex_score, client.tu_score].filter((n: any) => typeof n === 'number') as number[];
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 600;
  const violationList = (violations?.results || []) as any[];
  const scoreLifts = gateAnalysis ? [] : violationList.map((v) => ({
    id: v.id,
    severity: v.severity,
    bureau: v.bureau,
    lift: estimateViolationScoreLift(avgScore, v.severity || 'medium'),
  }));

  // Strip sensitive analysis fields from client payload when locked
  const clientOut = gateAnalysis
    ? {
        ...client,
        lvs_score: null,
        estimated_recovery: null,
        portal_analysis_unlocked: 0,
        analysis_locked: true,
      }
    : { ...client, portal_analysis_unlocked: analysisUnlocked ? 1 : 0, analysis_locked: !analysisUnlocked };

  return c.json({
    client: clientOut,
    reports: gateAnalysis
      ? (reports?.results || []).map((r: any) => ({
          id: r.id,
          bureau: r.bureau,
          report_date: r.report_date,
          created_at: r.created_at,
          status: 'pending_review',
        }))
      : (reports?.results || []),
    violations: violationList,
    documents: documents?.results || [],
    activity: gateAnalysis
      ? (activity?.results || []).filter((a: any) => !/violation|dispute|litigation|analysis|workflow/i.test(String(a.action || '') + String(a.description || '')))
      : (activity?.results || []),
    needsOnboarding: !(reports?.results?.length),
    analysisUnlocked,
    analysisLocked: gateAnalysis,
    paymentStatus: client.payment_status || (gateAnalysis ? 'pending' : 'active'),
    lockMessage: gateAnalysis
      ? 'Your credit report is in our system. Pay to unlock analysis, FCRA violations, and dispute letters — or wait for your advisor to confirm payment.'
      : null,
    unlockPriceCents: Number(c.env.ANALYSIS_UNLOCK_PRICE_CENTS || 29700),
    unlockCheckoutEnabled: stripeConfigured(c.env),
    scoreProjection: gateAnalysis ? { avgScore: null, lifts: [] } : { avgScore, lifts: scoreLifts },
  });
});

// Client self-service onboarding — upload own credit report from portal
app.post('/api/client-portal/onboard', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role !== 'client') {
    return c.json({ error: 'This endpoint is for client portal users only' }, 403);
  }

  const client = await resolvePortalClientSafe(c, user);
  if (!client) {
    return c.json({ error: 'Client profile not found. Contact your advisor to complete setup.' }, 404);
  }

  const body = await c.req.json();
  const rawText = String(body.rawText || '').trim();
  const bureau = body.bureau || 'Unknown';
  const fileName = String(body.fileName || 'client-upload.txt').slice(0, 180);

  if (!rawText || rawText.length < 80) {
    return c.json({ error: 'Credit report text required (minimum 80 characters)' }, 400);
  }

  const pp = body.permissiblePurposeConsent === true || client.permissible_purpose_consent === 1;
  const croa = body.croaContractAgreed === true || client.croa_contract_agreed === 1;
  const tsr = body.tsrAdvanceFeeWaived === true || client.tsr_advance_fee_waived === 1;
  if (!pp || !croa || !tsr) {
    return c.json({
      error: 'Regulatory Compliance Consent Required',
      complianceRequired: true,
      message: 'You must attest to FCRA permissible purpose, CROA disclosure, and TSR advance-fee waiver before uploading.',
    }, 403);
  }

  if (!client.permissible_purpose_consent || !client.croa_contract_agreed || !client.tsr_advance_fee_waived) {
    await c.env.DB.prepare(
      `UPDATE clients SET permissible_purpose_consent = 1, croa_contract_agreed = 1, tsr_advance_fee_waived = 1,
       consent_timestamp = COALESCE(consent_timestamp, datetime('now')), updated_at = datetime('now')
       WHERE id = ? AND org_id = ?`
    ).bind(client.id, user.org_id).run();
  }

  const preferredLanguage = body.preferredLanguage || body.preferred_language;
  if (preferredLanguage === 'en' || preferredLanguage === 'es') {
    try {
      await c.env.DB.prepare(
        `UPDATE clients SET preferred_language = ?, updated_at = datetime('now') WHERE id = ? AND org_id = ?`
      ).bind(preferredLanguage, client.id, user.org_id).run();
    } catch { /* soft */ }
  }

  const parsed = parseCreditReportText(rawText, { bureauHint: bureau, fileName });
  const resolvedBureau = normalizeBureau(parsed.bureau) !== 'Unknown'
    ? normalizeBureau(parsed.bureau)
    : resolveBureau({ hint: bureau, fileName, rawText });
  parsed.bureau = resolvedBureau;

  await backpopulateClientInfo(c, client.id, parsed.personalInfo, user.org_id);

  const analysis = liveAnalyzeParsedReport(parsed);
  const violations = analysis.violations;
  const litScore = calculateLitigationScore(violations);
  const encryptedRawText = await encryptPII(c, rawText);
  const encryptedParsedData = await encryptPII(c, JSON.stringify(parsed));

  let reportId = generateId();
  let mode: 'created' | 'replaced' = 'created';

  if (resolvedBureau !== 'Unknown') {
    const existing = await c.env.DB.prepare(
      `SELECT id FROM credit_reports WHERE client_id = ? AND org_id = ? AND bureau = ? AND COALESCE(is_current, 1) = 1
       ORDER BY created_at DESC LIMIT 1`
    ).bind(client.id, user.org_id, resolvedBureau).first() as any;

    if (existing?.id) {
      reportId = existing.id;
      mode = 'replaced';
      await c.env.DB.prepare(
        `UPDATE credit_reports SET uploaded_by = ?, bureau = ?, report_date = ?, file_name = ?, raw_text = ?, parsed_data = ?,
         status = 'analyzed', total_accounts = ?, total_inquiries = ?, total_public_records = ?, total_collections = ?,
         analysis_started_at = datetime('now'), analysis_completed_at = datetime('now')
         WHERE id = ? AND org_id = ?`
      ).bind(
        user.id, resolvedBureau, parsed.reportDate, fileName, encryptedRawText, encryptedParsedData,
        parsed.accounts.length, parsed.inquiries.length, parsed.publicRecords.length, parsed.collections.length,
        reportId, user.org_id
      ).run();
    }
  }

  if (mode === 'created') {
    if (resolvedBureau !== 'Unknown') {
      await markPriorBureauReportsStale(c, client.id, user.org_id, resolvedBureau, reportId);
    }
    await c.env.DB.prepare(
      `INSERT INTO credit_reports (id, org_id, client_id, uploaded_by, bureau, report_date, file_name, raw_text, parsed_data, status,
       total_accounts, total_inquiries, total_public_records, total_collections, analysis_started_at, analysis_completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'analyzed', ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      reportId, user.org_id, client.id, user.id, resolvedBureau, parsed.reportDate, fileName,
      encryptedRawText, encryptedParsedData,
      parsed.accounts.length, parsed.inquiries.length, parsed.publicRecords.length, parsed.collections.length
    ).run();
    try {
      await c.env.DB.prepare(`UPDATE credit_reports SET is_current = 1 WHERE id = ? AND org_id = ?`)
        .bind(reportId, user.org_id).run();
    } catch { /* soft */ }
  }

  await saveViolationsForReport(c, user.org_id, reportId, client.id, violations);
  await persistBureauScores(c, {
    reportId,
    clientId: client.id,
    orgId: user.org_id,
    bureau: resolvedBureau,
    parsed,
    sourceProvider: 'ClientPortal',
    sourcePayloadType: body.fileBase64 ? 'original_file' : 'text',
  });
  await vaultOriginalFromBody({
    env: c.env,
    db: c.env.DB,
    orgId: user.org_id,
    clientId: client.id,
    reportId,
    uploadedBy: user.id,
    fileName,
    fileBase64: body.fileBase64,
    declaredMime: body.mimeType,
    extractedText: rawText,
    ocrUsed: !!body.ocrUsed,
  });

  let fundability = null;
  try {
    const cl = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(client.id, user.org_id).first() as any;
    fundability = await computeAndStoreFundability(c.env, {
      orgId: user.org_id,
      clientId: client.id,
      client: cl,
      reportMeta: {
        accounts: parsed.accounts.length,
        collections: parsed.collections.length,
        inquiries: parsed.inquiries.length,
        parsedAccounts: [...parsed.accounts, ...parsed.collections],
      },
      violationCount: violations.length,
    });
  } catch (e) {
    console.warn('[client-onboard] fundability skipped', e);
  }

  await writeSecurityAudit(c.env, {
    orgId: user.org_id,
    actorUserId: user.id,
    actorRole: user.role,
    action: 'client_self_onboard',
    resourceType: 'credit_report',
    resourceId: reportId,
    ip: c.req.header('CF-Connecting-IP'),
    detail: { bureau: resolvedBureau, violations: violations.length, mode },
  });

  await c.env.DB.prepare(
    'INSERT INTO activity_log (id, org_id, client_id, report_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    generateId(), user.org_id, client.id, reportId, user.id, 'client_self_onboard',
    `Client uploaded ${resolvedBureau} report: ${violations.length} grounded findings (${analysis.rawCount} raw hits, ${analysis.rejectedCount} rejected)`,
    JSON.stringify({ score: litScore.score, bureau: resolvedBureau, mode, analysisMode: analysis.analysisMode, reasoningSummary: analysis.reasoningSummary })
  ).run();

  await notifyClientAnalysisReady(c, {
    orgId: user.org_id,
    clientId: client.id,
    client,
    bureau: resolvedBureau,
    analysis,
  });

  return c.json({
    success: true,
    clientId: client.id,
    reportId,
    bureau: resolvedBureau,
    mode,
    analysisMode: analysis.analysisMode,
    reasoningSummary: analysis.reasoningSummary,
    rawDetectorHits: analysis.rawCount,
    rejectedCount: analysis.rejectedCount,
    verifiedCount: analysis.verifiedCount,
    needsReviewCount: analysis.needsReviewCount,
    violationsFound: violations.length,
    violations: violations.slice(0, 50),
    litigationScore: litScore,
    fundability,
    preferredLanguage: preferredLanguage || client.preferred_language || 'en',
  });
});

async function resolvePortalClientSafe(c: any, user: any, bodyClientId?: string): Promise<any | null> {
  const q = c.req.query('clientId') || bodyClientId;
  if (user.role === 'client') {
    return c.env.DB.prepare('SELECT * FROM clients WHERE email = ? AND org_id = ?').bind(user.email, user.org_id).first();
  }
  if (q) {
    return c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(q, user.org_id).first();
  }
  return null;
}

// ── Portal messaging ──────────────────────────────────────────
app.get('/api/client-portal/messages', authMiddleware, async (c) => {
  const user = c.get('user');
  const client = await resolvePortalClientSafe(c, user, c.req.query('clientId') || undefined);
  if (!client) return c.json({ error: 'Client profile not found' }, 404);
  const rows = await c.env.DB.prepare(
    `SELECT * FROM portal_messages WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 200`
  ).bind(client.id, user.org_id).all();
  return c.json({ clientId: client.id, messages: rows?.results || [] });
});

app.post('/api/client-portal/messages', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const client = await resolvePortalClientSafe(c, user, body.clientId);
  if (!client) return c.json({ error: 'Client profile not found' }, 404);
  const text = String(body.body || body.message || '').trim();
  if (!text) return c.json({ error: 'Message body required' }, 400);
  const isStaff = user.role !== 'client';
  const id = generateId();
  await c.env.DB.prepare(
    `INSERT INTO portal_messages (id, org_id, client_id, sender_user_id, sender_role, channel, subject, body, attachment_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(
    id,
    user.org_id,
    client.id,
    user.id,
    isStaff ? 'staff' : 'client',
    body.channel === 'email' ? 'email' : 'portal',
    body.subject || null,
    text,
    body.attachmentName || null,
  ).run();

  let emailStatus: string | null = null;
  if (body.sendEmail === true || body.channel === 'email') {
    if (client.email && !isSyntheticPortalEmail(client.email)) {
      try {
        const brand = await loadOrgBrand(c.env, user.org_id);
        const mail = await sendTemplatedClientMessage(c.env, {
          templateId: 'staff_message',
          orgId: user.org_id,
          clientId: client.id,
          email: client.email,
          phone: client.phone_e164 || client.phone,
          notifyEmail: true,
          notifySms: false,
          skipClientAlert: true, // alert + portal_alerts handled below once
          brand,
          vars: {
            ...brandVars(brand),
            clientName: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
            subject: body.subject || `Message from ${brand.fromName}`,
            body: text,
            portalUrl: `${portalBaseUrl(c.env)}/`,
          },
        });
        emailStatus = mail.deliveryStatus || mail.channels?.email || 'unknown';
        if (mail.channels?.provider) emailStatus = `${emailStatus}:${mail.channels.provider}`;
      } catch (e: any) {
        emailStatus = `failed:${e.message}`;
      }
    } else {
      emailStatus = 'skipped_no_email';
    }
  }

  await c.env.DB.prepare(
    'INSERT INTO activity_log (id, org_id, client_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    generateId(), user.org_id, client.id, user.id, 'portal_message',
    `${isStaff ? 'Staff' : 'Client'} portal message`,
    JSON.stringify({ messageId: id, emailStatus })
  ).run();

  let alertResult: any = null;
  if (isStaff) {
    try {
      // In-app + optional SMS only — email already sent via staff_message template when requested
      const wantSms =
        body.sendSms === true ||
        body.channel === 'sms' ||
        (body.sendSms !== false && !!(client.phone_e164 || client.phone) && client.notify_sms !== 0);
      alertResult = await dispatchClientAlert(c.env, {
        orgId: user.org_id,
        clientId: client.id,
        eventType: 'staff_message',
        title: body.subject || 'New message from your credit team',
        body: text.slice(0, 1500),
        email: client.email,
        phone: client.phone_e164 || client.phone,
        notifyEmail: false,
        notifySms: wantSms,
      });
    } catch (e: any) {
      alertResult = { error: e.message };
    }
  }

  await writeSecurityAudit(c.env, {
    orgId: user.org_id, actorUserId: user.id, actorRole: user.role, action: 'portal_message',
    resourceType: 'portal_message', resourceId: id, ip: c.req.header('CF-Connecting-IP'),
  });

  return c.json({ ok: true, id, emailStatus, alerts: alertResult });
});

app.post('/api/client-portal/messages/:id/read', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const client = await resolvePortalClientSafe(c, user, c.req.query('clientId') || undefined);
  if (!client) return c.json({ error: 'Client not found' }, 404);
  await c.env.DB.prepare(
    `UPDATE portal_messages SET read_at = datetime('now') WHERE id = ? AND client_id = ? AND org_id = ?`
  ).bind(id, client.id, user.org_id).run();
  return c.json({ ok: true });
});

// Staff: email client from CRM (also logs to portal inbox)
app.post('/api/clients/:id/email', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role === 'client') return c.json({ error: 'Unauthorized' }, 403);
  const clientId = c.req.param('id');
  const body = await c.req.json();
  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(clientId, user.org_id).first() as any;
  if (!client) return c.json({ error: 'Client not found' }, 404);
  if (!client.email || isSyntheticPortalEmail(client.email)) {
    return c.json({ error: 'Client needs a real email address before messaging' }, 400);
  }
  const text = String(body.body || body.message || '').trim();
  if (!text) return c.json({ error: 'Message required' }, 400);
  const brand = await loadOrgBrand(c.env, user.org_id);
  const subject = body.subject || `Message from ${brand.fromName}`;
  const msgId = generateId();
  await c.env.DB.prepare(
    `INSERT INTO portal_messages (id, org_id, client_id, sender_user_id, sender_role, channel, subject, body, created_at)
     VALUES (?, ?, ?, ?, 'staff', 'email', ?, ?, datetime('now'))`
  ).bind(msgId, user.org_id, clientId, user.id, subject, text).run();
  const mail = await sendTemplatedClientMessage(c.env, {
    templateId: 'staff_message',
    orgId: user.org_id,
    clientId,
    email: client.email,
    phone: client.phone_e164 || client.phone,
    notifyEmail: true,
    notifySms: false,
    brand,
    vars: {
      ...brandVars(brand),
      clientName: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
      subject,
      body: text,
      portalUrl: `${portalBaseUrl(c.env)}/`,
    },
  });
  return c.json({
    ok: true,
    messageId: msgId,
    email: {
      sent: mail.deliveryStatus === 'sent',
      simulated: mail.deliveryStatus === 'simulated',
      provider: mail.channels?.provider,
      status: mail.deliveryStatus,
    },
  });
});

// Resend portal welcome / create account
app.post('/api/clients/:id/portal-invite', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role === 'client') return c.json({ error: 'Unauthorized' }, 403);
  const clientId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(clientId, user.org_id).first() as any;
  if (!client) return c.json({ error: 'Client not found' }, 404);
  const email = (body.email || client.email || '').trim();
  if (!email || isSyntheticPortalEmail(email)) {
    return c.json({ error: 'Provide a real client email to invite' }, 400);
  }
  if (email !== client.email) {
    await c.env.DB.prepare(`UPDATE clients SET email = ?, updated_at = datetime('now') WHERE id = ?`).bind(email, clientId).run();
  }
  const password = `SmartPass-${Math.random().toString(36).substring(2, 10).toUpperCase()}!`;
  const passwordHash = await hashPassword(password);
  const existingUser = await c.env.DB.prepare('SELECT id FROM users WHERE email = ? AND org_id = ?').bind(email, user.org_id).first() as any;
  if (!existingUser) {
    await c.env.DB.prepare(
      'INSERT INTO users (id, org_id, email, name, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, "client", 1)'
    ).bind(generateId(), user.org_id, email, `${client.first_name} ${client.last_name}`, passwordHash).run();
  } else {
    await c.env.DB.prepare('UPDATE users SET password_hash = ?, name = ?, is_active = 1 WHERE id = ?')
      .bind(passwordHash, `${client.first_name} ${client.last_name}`, existingUser.id).run();
  }
  const mail = await sendPortalWelcomeEmail(c.env, {
    to: email,
    clientName: `${client.first_name} ${client.last_name}`,
    email,
    temporaryPassword: password,
    requestUrl: c.req.url,
    orgId: user.org_id,
    clientId,
  });
  try {
    await c.env.DB.prepare(`UPDATE clients SET portal_welcome_sent_at = datetime('now') WHERE id = ?`).bind(clientId).run();
  } catch { /* soft */ }
  return c.json({
    ok: mail.ok,
    loginUrl: mail.loginUrl,
    emailStatus: mail.ok
      ? (mail.simulated || mail.deliveryStatus === 'simulated' ? 'simulated' : `sent:${mail.provider || 'email'}`)
      : `failed:${mail.error || 'send'}`,
    temporaryPassword: password,
  });
});

/** Staff: unlock portal analysis/disputes after payment confirmation */
app.post('/api/clients/:id/unlock-analysis', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role === 'client') return c.json({ error: 'Staff only' }, 403);
  const clientId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(clientId, user.org_id).first() as any;
  if (!client) return c.json({ error: 'Client not found' }, 404);

  const paymentStatus = String(body.paymentStatus || 'paid').slice(0, 40);
  try {
    await c.env.DB.prepare(
      `UPDATE clients SET
         portal_analysis_unlocked = 1,
         portal_analysis_unlocked_at = datetime('now'),
         portal_analysis_unlocked_by = ?,
         payment_status = ?,
         case_status = CASE WHEN case_status = 'ONBOARDING' THEN 'DISPUTING' ELSE case_status END,
         updated_at = datetime('now')
       WHERE id = ? AND org_id = ?`
    ).bind(user.id, paymentStatus, clientId, user.org_id).run();
  } catch (e: any) {
    if (String(e?.message || '').includes('no such column')) {
      return c.json({ error: 'Database migration 0016 required — apply migrations then retry' }, 503);
    }
    throw e;
  }

  await c.env.DB.prepare(
    'INSERT INTO activity_log (id, org_id, client_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    generateId(), user.org_id, clientId, user.id, 'portal_analysis_unlocked',
    `Staff unlocked portal analysis after payment (${paymentStatus})`,
    JSON.stringify({ paymentStatus, note: body.note || null }),
  ).run();

  // Now safe to notify client that analysis is ready (+ SMS + GHL sync)
  let ghlSync: any = null;
  let smsUnlock: any = null;
  try {
    const refreshed = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(clientId).first() as any;
    const vCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as c FROM violations WHERE client_id = ? AND org_id = ?'
    ).bind(clientId, user.org_id).first() as any;
    await notifyClientAnalysisReady(c, {
      orgId: user.org_id,
      clientId,
      client: refreshed,
      bureau: 'MyFreeScoreNow',
      analysis: {
        violations: Array(Number(vCount?.c || 0)).fill({}),
        rawCount: Number(vCount?.c || 0),
        reasoningSummary: 'Your case analysis has been unlocked by your credit advocacy team.',
      },
    });
    const phone = toE164Phone(refreshed?.phone_e164 || refreshed?.phone);
    if (phone) {
      smsUnlock = await sendSms(
        c.env,
        phone,
        `Smart FCRA: Your case analysis is unlocked. Sign in to review FCRA findings and dispute letters: ${portalBaseUrl(c.env)}/`,
      );
    }
    ghlSync = await syncClientToGhl(c.env, refreshed, {
      portalUrl: `${portalBaseUrl(c.env)}/`,
      violationCount: Number(vCount?.c || 0),
      analysisUnlocked: true,
      tags: buildGhlTagsForClient(refreshed, { analysisUnlocked: true, mfsnStatus: refreshed?.mfsn_account_status }),
    });
    if (ghlSync?.contactId) {
      try {
        await c.env.DB.prepare(
          `UPDATE clients SET ghl_contact_id = ?, ghl_synced_at = datetime('now') WHERE id = ? AND org_id = ?`
        ).bind(ghlSync.contactId, clientId, user.org_id).run();
      } catch { /* soft */ }
    }
  } catch { /* soft */ }

  return c.json({
    ok: true,
    clientId,
    portal_analysis_unlocked: 1,
    payment_status: paymentStatus,
    smsSent: !!smsUnlock?.sent,
    ghlSynced: !!ghlSync?.ok,
    ghlContactId: ghlSync?.contactId || null,
    message: 'Client can now see analysis, violations, and dispute letters in their portal.',
  });
});

app.post('/api/client-portal/unlock/checkout', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role !== 'client') return c.json({ error: 'Client portal only' }, 403);
  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE email = ? AND org_id = ?').bind(user.email, user.org_id).first() as any;
  if (!client) return c.json({ error: 'Client not found' }, 404);
  if (isPortalAnalysisUnlocked(client)) return c.json({ ok: true, alreadyUnlocked: true });
  if (!stripeConfigured(c.env)) {
    return c.json({ error: 'Card checkout is not configured yet. Your advisor will unlock analysis after payment is received.', stripeConfigured: false }, 503);
  }
  const gate = await assertCoveredChargeAllowed({
    db: c.env.DB,
    orgId: user.org_id,
    clientId: client.id,
    serviceType: 'credit_report_analysis',
    contractSigned: !!client.croa_contract_agreed,
    croaDisclosuresAcknowledged: !!client.croa_contract_agreed,
    tsrApplies: false,
    generateId,
  });
  if (!gate.allowed) {
    return c.json({
      error: 'CROA blocks this charge until the promised analysis is fully performed and recorded.',
      result: gate.eval.result,
      requirements: gate.eval.requirements,
      explanation: gate.eval.explanation,
      decision_id: gate.decisionId,
    }, 403);
  }
  const amount = Math.max(100, Number(c.env.ANALYSIS_UNLOCK_PRICE_CENTS || 29700));
  const stripe = getStripe(c.env);
  const base = portalBaseUrl(c.env, c.req.url);
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'Smart FCRA case analysis unlock', metadata: { type: 'analysis_unlock' } },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      success_url: `${base}/?page=client-cockpit&unlock=success`,
      cancel_url: `${base}/?page=client-cockpit&unlock=cancelled`,
      customer_email: isSyntheticPortalEmail(client.email) ? undefined : client.email,
      client_reference_id: client.id,
      metadata: { type: 'analysis_unlock', clientId: client.id, orgId: user.org_id },
    });
    return c.json({ ok: true, url: session.url, amountCents: amount });
  } catch (err: any) {
    return c.json({ error: err.message || 'Stripe checkout failed' }, 500);
  }
});

app.post('/api/clients/:id/lock-analysis', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role === 'client') return c.json({ error: 'Staff only' }, 403);
  const clientId = c.req.param('id');
  const client = await c.env.DB.prepare('SELECT id FROM clients WHERE id = ? AND org_id = ?').bind(clientId, user.org_id).first();
  if (!client) return c.json({ error: 'Client not found' }, 404);
  try {
    await c.env.DB.prepare(
      `UPDATE clients SET portal_analysis_unlocked = 0, payment_status = 'pending', updated_at = datetime('now') WHERE id = ? AND org_id = ?`
    ).bind(clientId, user.org_id).run();
  } catch (e: any) {
    if (String(e?.message || '').includes('no such column')) {
      return c.json({ error: 'Database migration 0016 required' }, 503);
    }
    throw e;
  }
  return c.json({ ok: true, portal_analysis_unlocked: 0 });
});

/** Staff: text client via Twilio from CRM */
app.post('/api/clients/:id/sms', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role === 'client') return c.json({ error: 'Staff only' }, 403);
  const clientId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const message = String(body.message || body.body || '').trim();
  if (!message) return c.json({ error: 'Message required' }, 400);
  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(clientId, user.org_id).first() as any;
  if (!client) return c.json({ error: 'Client not found' }, 404);
  const phone = toE164Phone(body.phone || client.phone_e164 || client.phone);
  if (!phone) return c.json({ error: 'Client has no phone number on file' }, 400);

  const sms = await sendSms(c.env, phone, message);
  await c.env.DB.prepare(
    'INSERT INTO activity_log (id, org_id, client_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    generateId(), user.org_id, clientId, user.id, 'sms_sent',
    sms.sent ? `SMS sent to ${phone}` : `SMS failed: ${sms.error || 'unknown'}`,
    JSON.stringify({ phone, sid: sms.sid || null, error: sms.error || null, preview: message.slice(0, 160) }),
  ).run();

  if (sms.sent) {
    try {
      await c.env.DB.prepare(
        `INSERT INTO portal_messages (id, org_id, client_id, sender_user_id, sender_role, channel, subject, body, created_at)
         VALUES (?, ?, ?, ?, 'staff', 'sms', ?, ?, datetime('now'))`
      ).bind(generateId(), user.org_id, clientId, user.id, 'SMS', message.slice(0, 1500)).run();
    } catch { /* soft */ }
  }

  return c.json({ ok: !!sms.sent, sid: sms.sid, error: sms.error, phone, simulated: sms.simulated });
});

/** Staff: push / refresh client into GoHighLevel */
app.post('/api/clients/:id/sync-ghl', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role === 'client') return c.json({ error: 'Staff only' }, 403);
  const clientId = c.req.param('id');
  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(clientId, user.org_id).first() as any;
  if (!client) return c.json({ error: 'Client not found' }, 404);
  const vCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as c FROM violations WHERE client_id = ? AND org_id = ?'
  ).bind(clientId, user.org_id).first() as any;
  const org = await c.env.DB.prepare('SELECT name FROM organizations WHERE id = ?').bind(user.org_id).first() as any;
  const result = await syncClientToGhl(c.env, client, {
    portalUrl: `${portalBaseUrl(c.env)}/`,
    violationCount: Number(vCount?.c || 0),
    analysisUnlocked: isPortalAnalysisUnlocked(client),
    orgName: org?.name,
    tags: buildGhlTagsForClient(client, { analysisUnlocked: isPortalAnalysisUnlocked(client) }),
  });
  if (result.ok && result.contactId) {
    try {
      await c.env.DB.prepare(
        `UPDATE clients SET ghl_contact_id = ?, ghl_synced_at = datetime('now') WHERE id = ? AND org_id = ?`
      ).bind(result.contactId, clientId, user.org_id).run();
    } catch { /* soft */ }
  }
  return c.json(result, result.ok ? 200 : 502);
});

/** Staff: GHL connection + custom field catalog status */
app.get('/api/integrations/ghl/status', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role === 'client') return c.json({ error: 'Staff only' }, 403);
  clearGhlFieldCache();
  const verify = await verifyGhlConnection(c.env);
  let fieldIds: Record<string, string> = {};
  try { fieldIds = await ensureCustomFields(c.env); } catch { /* soft */ }
  const catalog = listGhlFieldCatalog();
  const present = catalog.filter((f) => !!fieldIds[f.key]).map((f) => f.key);
  return c.json({
    ok: !!verify.ok,
    configured: ghlConfigured(c.env),
    locationId: c.env.GHL_LOCATION_ID || null,
    verify,
    fieldCatalog: catalog,
    fieldsPresent: present,
    fieldsMissing: catalog.filter((f) => !fieldIds[f.key]).map((f) => f.key),
    mfsnConfigured: !!resolvePartnerMfsnCredentials(c.env),
  });
});

/** Staff: sync ALL CRM clients in this org to GHL */
app.post('/api/integrations/ghl/sync-all-clients', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role === 'client') return c.json({ error: 'Staff only' }, 403);
  if (!ghlConfigured(c.env)) return c.json({ error: 'GoHighLevel is not configured' }, 503);
  const org = await c.env.DB.prepare('SELECT name FROM organizations WHERE id = ?').bind(user.org_id).first() as any;
  const rows = await c.env.DB.prepare(
    `SELECT * FROM clients WHERE org_id = ? AND coalesce(status,'active') = 'active' ORDER BY created_at DESC LIMIT 500`
  ).bind(user.org_id).all();
  const clients = rows.results || [];
  const portalUrl = `${portalBaseUrl(c.env)}/`;
  const results: any[] = [];
  let ok = 0;
  for (const client of clients as any[]) {
    const vCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as c FROM violations WHERE client_id = ? AND org_id = ?'
    ).bind(client.id, user.org_id).first() as any;
    const synced = await syncClientToGhl(c.env, client, {
      portalUrl,
      violationCount: Number(vCount?.c || 0),
      analysisUnlocked: isPortalAnalysisUnlocked(client),
      orgName: org?.name,
    });
    if (synced.ok && synced.contactId) {
      ok += 1;
      try {
        await c.env.DB.prepare(
          `UPDATE clients SET ghl_contact_id = ?, ghl_synced_at = datetime('now') WHERE id = ? AND org_id = ?`
        ).bind(synced.contactId, client.id, user.org_id).run();
      } catch { /* soft */ }
    }
    results.push({ clientId: client.id, email: client.email, ...synced });
  }
  return c.json({ ok: true, total: clients.length, synced: ok, results });
});

/**
 * Staff: pull MyFreeScoreNow active (or paused) members and upsert every contact into GHL
 * with full custom fields + tags. Also links matching Smart FCRA clients when email matches.
 */
app.post('/api/integrations/ghl/sync-mfsn-members', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role === 'client') return c.json({ error: 'Staff only' }, 403);
  if (!ghlConfigured(c.env)) return c.json({ error: 'GoHighLevel is not configured' }, 503);

  const body = await c.req.json().catch(() => ({}));
  const list = body.list === 'paused' ? 'paused' : 'active';
  const fetched = await fetchMfsnMemberList(c.env, list);
  if (!fetched.ok) {
    return c.json({ error: fetched.error || 'Failed to fetch MFSN members', code: 'MFSN_MEMBER_LIST_FAILED' }, 502);
  }

  const org = await c.env.DB.prepare('SELECT name FROM organizations WHERE id = ?').bind(user.org_id).first() as any;
  const portalUrl = `${portalBaseUrl(c.env)}/`;
  const results: any[] = [];
  let synced = 0;
  let linked = 0;

  for (const member of fetched.members) {
    const email = String(member.email || '').trim().toLowerCase();
    let client: any = null;
    if (email) {
      client = await c.env.DB.prepare(
        `SELECT * FROM clients WHERE org_id = ? AND (lower(email) = ? OR lower(coalesce(mfsn_member_email,'')) = ?) LIMIT 1`
      ).bind(user.org_id, email, email).first() as any;
    }
    let violationCount = 0;
    if (client?.id) {
      const v = await c.env.DB.prepare(
        'SELECT COUNT(*) as c FROM violations WHERE client_id = ? AND org_id = ?'
      ).bind(client.id, user.org_id).first() as any;
      violationCount = Number(v?.c || 0);
    }

    const offer = String(member.publisher_id || '').trim().toUpperCase();
    if (client?.id && offer && !client.mfsn_affiliate_offer_code) {
      try {
        await c.env.DB.prepare(
          `UPDATE clients SET mfsn_affiliate_offer_code = ?, mfsn_enrolled_under_affiliate = 1, mfsn_member_email = coalesce(mfsn_member_email, ?) WHERE id = ?`
        ).bind(offer, email || null, client.id).run();
        client.mfsn_affiliate_offer_code = offer;
        client.mfsn_member_email = client.mfsn_member_email || email;
      } catch { /* soft */ }
    }

    const push = client
      ? await syncClientToGhl(c.env, {
          ...client,
          phone: client.phone || member.phone_number,
          address_line1: client.address_line1 || member.street_address,
          city: client.city || member.city,
          state: client.state || member.state,
          zip: client.zip || member.zip,
        }, {
          portalUrl,
          violationCount,
          analysisUnlocked: isPortalAnalysisUnlocked(client),
          orgName: org?.name,
          mfsnMember: member,
        })
      : await syncMfsnMemberToGhl(c.env, member, {
          portalUrl,
          orgName: org?.name,
          analysisUnlocked: false,
          paymentStatus: String(member.account_status || '').toUpperCase() === 'ACTIVE' ? 'mfsn_active' : 'pending',
        });

    if (push.ok) {
      synced += 1;
      if (client?.id && push.contactId) {
        linked += 1;
        try {
          await c.env.DB.prepare(
            `UPDATE clients SET ghl_contact_id = ?, ghl_synced_at = datetime('now') WHERE id = ? AND org_id = ?`
          ).bind(push.contactId, client.id, user.org_id).run();
        } catch { /* soft */ }
      }
    }
    results.push({
      email,
      memberId: member.member_id,
      offer,
      clientId: client?.id || null,
      ...push,
    });
  }

  try {
    await c.env.DB.prepare(
      'INSERT INTO activity_log (id, org_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      generateId(), user.org_id, user.id, 'ghl_mfsn_bulk_sync',
      `Synced ${synced}/${fetched.members.length} MFSN ${list} members to GoHighLevel`,
      JSON.stringify({ list, synced, linked, operator: fetched.email }),
    ).run();
  } catch { /* soft */ }

  return c.json({
    ok: true,
    list,
    mfsnLoginEmail: fetched.email || null,
    total: fetched.members.length,
    synced,
    linkedToCrmClients: linked,
    results,
  });
});

/** Staff: ensure all Smart FCRA custom fields exist in GHL location */
app.post('/api/integrations/ghl/ensure-fields', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role === 'client') return c.json({ error: 'Staff only' }, 403);
  if (!ghlConfigured(c.env)) return c.json({ error: 'GoHighLevel is not configured' }, 503);
  clearGhlFieldCache();
  const fieldIds = await ensureCustomFields(c.env);
  const catalog = listGhlFieldCatalog();
  return c.json({
    ok: true,
    locationId: c.env.GHL_LOCATION_ID,
    fields: catalog.map((f) => ({ ...f, ghlFieldId: fieldIds[f.key] || null })),
  });
});

/** Staff: quick MFSN admin login probe (no secrets returned) */
app.get('/api/integrations/mfsn/status', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role === 'client') return c.json({ error: 'Staff only' }, 403);
  const login = await loginMfsnAdmin(c.env);
  let activeCount: number | null = null;
  if (login.ok && login.token) {
    const active = await fetchMfsnMemberList(c.env, 'active', login.token);
    if (active.ok) activeCount = active.members.length;
  }
  return c.json({
    ok: !!login.ok,
    email: login.email || null,
    partnerConfigured: !!resolvePartnerMfsnCredentials(c.env),
    activeMemberCount: activeCount,
    error: login.error || null,
    ghlConfigured: ghlConfigured(c.env),
  });
});

// ═══════════════════════════════════════════════════════════════
// TRADELINEMASTER — RJ Business Solutions marketplace (12.5% markup)
// ═══════════════════════════════════════════════════════════════

function parseTradelineFilters(q: Record<string, string | undefined>) {
  const num = (k: string) => (q[k] != null && q[k] !== '' ? Number(q[k]) : undefined);
  return {
    lender: q.lender || undefined,
    minLimit: num('minLimit'),
    maxLimit: num('maxLimit'),
    statementDay: num('statementDay'),
    postingDay: num('postingDay'),
    minAgeYears: num('minAgeYears'),
    minPrice: num('minPrice'),
    maxPrice: num('maxPrice'),
    cycles: num('cycles'),
    minSpots: num('minSpots'),
    q: q.q || q.search || undefined,
  };
}

async function getTradelineInventory(env: Bindings, opts: { refresh?: boolean; maxAgeMinutes?: number } = {}) {
  const maxAge = opts.maxAgeMinutes ?? 180;
  const cached = await loadCachedTradelines(env);
  const fetchedAt = cached.meta?.last_fetched_at ? new Date(cached.meta.last_fetched_at).getTime() : 0;
  const stale = !fetchedAt || Date.now() - fetchedAt > maxAge * 60 * 1000;
  if (opts.refresh || !cached.tradelines.length || stale) {
    if (tradelineMasterConfigured(env)) {
      const sync = await syncTradelineInventory(env);
      if (sync.ok) {
        const again = await loadCachedTradelines(env);
        if (again.tradelines.length) return { ...again, live: true, sync };
      }
      // Fall back to live fetch if cache write failed
      const live = await fetchTradelines(env);
      if (live.ok) return { tradelines: live.tradelines, meta: { last_fetched_at: live.fetchedAt, last_count: live.tradelines.length }, live: true, sync };
    }
  }
  return { ...cached, live: false };
}

app.get('/api/tradelines/status', authMiddleware, async (c) => {
  const user = c.get('user');
  const configured = tradelineMasterConfigured(c.env);
  let balance: number | null = null;
  let userName: string | null = null;
  let apiOk = false;
  if (configured && user.role !== 'client') {
    const u = await fetchTradelineMasterUser(c.env);
    apiOk = !!u.ok;
    balance = u.user?.Balance ?? null;
    userName = u.user?.UserName || null;
  } else if (configured) {
    apiOk = true;
  }
  const cached = await loadCachedTradelines(c.env);
  return c.json({
    ok: configured && (apiOk || !!cached.tradelines.length),
    configured,
    brand: TRADELINE_BRAND,
    markupRate: Number(c.env.TRADELINE_MARKUP_RATE || TRADELINE_MARKUP_RATE),
    opsEmail: c.env.TRADELINE_OPS_EMAIL || TRADELINE_OPS_EMAIL_DEFAULT,
    fromEmail: c.env.TRADELINE_FROM_EMAIL || TRADELINE_FROM_EMAIL_DEFAULT,
    balance: user.role === 'client' ? undefined : balance,
    apiUser: user.role === 'client' ? undefined : userName,
    inventoryCount: cached.tradelines.length,
    lastFetchedAt: cached.meta?.last_fetched_at || null,
    lastFetchOk: cached.meta?.last_fetch_ok ?? null,
  });
});

app.get('/api/tradelines/meta', authMiddleware, async (c) => {
  return c.json({
    ok: true,
    brand: TRADELINE_BRAND,
    markupRate: Number(c.env.TRADELINE_MARKUP_RATE || TRADELINE_MARKUP_RATE),
    opsEmail: c.env.TRADELINE_OPS_EMAIL || TRADELINE_OPS_EMAIL_DEFAULT,
    citizenship: CITIZENSHIP_STATUSES,
    genders: GENDER_OPTIONS,
    maritalStatuses: MARITAL_STATUS_OPTIONS,
    education: listTradelineEducation(),
  });
});

app.get('/api/tradelines/inventory', authMiddleware, async (c) => {
  const refresh = c.req.query('refresh') === '1' || c.req.query('refresh') === 'true';
  const inv = await getTradelineInventory(c.env, { refresh });
  const filters = parseTradelineFilters({
    lender: c.req.query('lender') || undefined,
    minLimit: c.req.query('minLimit') || undefined,
    maxLimit: c.req.query('maxLimit') || undefined,
    statementDay: c.req.query('statementDay') || undefined,
    postingDay: c.req.query('postingDay') || undefined,
    minAgeYears: c.req.query('minAgeYears') || undefined,
    minPrice: c.req.query('minPrice') || undefined,
    maxPrice: c.req.query('maxPrice') || undefined,
    cycles: c.req.query('cycles') || undefined,
    minSpots: c.req.query('minSpots') || undefined,
    q: c.req.query('q') || c.req.query('search') || undefined,
  });
  const staff = c.get('user').role !== 'client';
  let rows = filterTradelines(inv.tradelines, filters);
  const sort = c.req.query('sort') || 'statement';
  if (sort === 'price') rows = rows.slice().sort((a, b) => a.retailPrice - b.retailPrice);
  else if (sort === 'limit') rows = rows.slice().sort((a, b) => b.creditLimit - a.creditLimit);
  else if (sort === 'age') rows = rows.slice().sort((a, b) => b.accountAgeYears - a.accountAgeYears || b.accountAgeMonths - a.accountAgeMonths);
  else rows = rows.slice().sort((a, b) => String(a.statementDate).localeCompare(String(b.statementDate)));

  const page = Math.max(1, Number(c.req.query('page') || 1));
  const pageSize = Math.min(100, Math.max(10, Number(c.req.query('pageSize') || c.req.query('entries') || 25)));
  const start = (page - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize).map((t) => ({
    ...t,
    wholesalePrice: staff ? t.wholesalePrice : undefined,
    markupAmount: staff ? t.markupAmount : undefined,
  }));

  return c.json({
    ok: true,
    brand: TRADELINE_BRAND,
    markupRate: Number(c.env.TRADELINE_MARKUP_RATE || TRADELINE_MARKUP_RATE),
    opsEmail: c.env.TRADELINE_OPS_EMAIL || TRADELINE_OPS_EMAIL_DEFAULT,
    summary: summarizeInventory(inv.tradelines),
    filteredCount: rows.length,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(rows.length / pageSize)),
    lastFetchedAt: inv.meta?.last_fetched_at || null,
    liveRefresh: !!inv.live,
    tradelines: pageRows,
  });
});

app.post('/api/tradelines/refresh', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role === 'client') return c.json({ error: 'Staff only' }, 403);
  if (!tradelineMasterConfigured(c.env)) return c.json({ error: 'TradelineMaster not configured' }, 503);
  const sync = await syncTradelineInventory(c.env);
  return c.json({ ok: !!sync.ok, ...sync }, sync.ok ? 200 : 502);
});

app.get('/api/tradelines/item/:id', authMiddleware, async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isFinite(id)) return c.json({ error: 'Invalid id' }, 400);
  const staff = c.get('user').role !== 'client';
  let tradeline: EnrichedTradeline | undefined;
  if (tradelineMasterConfigured(c.env)) {
    const live = await fetchTradelineById(c.env, id);
    if (live.ok) tradeline = live.tradeline;
  }
  if (!tradeline) {
    const cached = await loadCachedTradelines(c.env);
    tradeline = cached.tradelines.find((t) => t.id === id);
  }
  if (!tradeline) return c.json({ error: 'Tradeline not found' }, 404);
  return c.json({
    ok: true,
    tradeline: {
      ...tradeline,
      wholesalePrice: staff ? tradeline.wholesalePrice : undefined,
      markupAmount: staff ? tradeline.markupAmount : undefined,
    },
    education: listTradelineEducation().slice(0, 3),
  });
});

app.get('/api/tradelines/match/:clientId', authMiddleware, async (c) => {
  const user = c.get('user');
  const clientId = c.req.param('clientId');
  let client: any = null;
  if (user.role === 'client') {
    client = await resolvePortalClientSafe(c, user, clientId);
  } else {
    client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?')
      .bind(clientId, user.org_id).first();
  }
  if (!client) return c.json({ error: 'Client not found' }, 404);

  const inv = await getTradelineInventory(c.env, { refresh: c.req.query('refresh') === '1' });
  const scores = [client.eq_score, client.ex_score, client.tu_score].filter((n: any) => n != null).map(Number);
  const profile: ClientCreditProfile = {
    firstName: client.first_name,
    lastName: client.last_name,
    email: client.email,
    eqScore: client.eq_score,
    exScore: client.ex_score,
    tuScore: client.tu_score,
    avgScore: scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : null,
    accountCount: client.total_accounts ?? null,
    collectionCount: client.total_collections ?? null,
    goal: c.req.query('goal') || 'mortgage',
  };

  // Enrich from latest report counts when present
  try {
    const rep = await c.env.DB.prepare(
      `SELECT total_accounts, total_collections, total_inquiries FROM credit_reports
       WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 1`,
    ).bind(client.id, user.org_id).first() as any;
    if (rep) {
      profile.accountCount = rep.total_accounts ?? profile.accountCount;
      profile.collectionCount = rep.total_collections ?? profile.collectionCount;
      profile.inquiryCount = rep.total_inquiries ?? null;
    }
  } catch { /* soft */ }

  const matched = matchTradelinesForClient(profile, inv.tradelines, Number(c.req.query('limit') || 12));
  const staff = user.role !== 'client';
  return c.json({
    ok: true,
    clientId: client.id,
    clientName: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
    ...matched,
    matches: matched.matches.map((m) => ({
      ...m,
      tradeline: {
        ...m.tradeline,
        wholesalePrice: staff ? m.tradeline.wholesalePrice : undefined,
        markupAmount: staff ? m.tradeline.markupAmount : undefined,
      },
    })),
    opsEmail: c.env.TRADELINE_OPS_EMAIL || TRADELINE_OPS_EMAIL_DEFAULT,
  });
});

app.post('/api/tradelines/match', authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const inv = await getTradelineInventory(c.env);
  const profile: ClientCreditProfile = {
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    eqScore: body.eqScore,
    exScore: body.exScore,
    tuScore: body.tuScore,
    avgScore: body.avgScore,
    accountCount: body.accountCount,
    revolvingCount: body.revolvingCount,
    installmentCount: body.installmentCount,
    collectionCount: body.collectionCount,
    inquiryCount: body.inquiryCount,
    oldestAccountYears: body.oldestAccountYears,
    utilizationPct: body.utilizationPct,
    goal: body.goal || 'general',
    hasThinFile: !!body.hasThinFile,
  };
  const matched = matchTradelinesForClient(profile, inv.tradelines, Number(body.limit || 12));
  return c.json({ ok: true, ...matched, opsEmail: c.env.TRADELINE_OPS_EMAIL || TRADELINE_OPS_EMAIL_DEFAULT });
});

app.get('/api/tradelines/orders', authMiddleware, async (c) => {
  const user = c.get('user');
  try {
    let rows;
    if (user.role === 'client') {
      const client = await resolvePortalClientSafe(c, user);
      if (!client) return c.json({ orders: [] });
      rows = await c.env.DB.prepare(
        `SELECT id, tradeline_id, lender, credit_limit, retail_price, status, tlm_order_id, created_at, updated_at
         FROM tradeline_master_orders WHERE org_id = ? AND client_id = ? ORDER BY created_at DESC LIMIT 100`,
      ).bind(user.org_id, client.id).all();
    } else {
      rows = await c.env.DB.prepare(
        `SELECT id, client_id, tradeline_id, lender, credit_limit, wholesale_price, retail_price, status, tlm_order_id, tlm_message, created_at, updated_at
         FROM tradeline_master_orders WHERE org_id = ? ORDER BY created_at DESC LIMIT 200`,
      ).bind(user.org_id).all();
    }
    return c.json({ ok: true, orders: rows.results || [] });
  } catch (e: any) {
    if (String(e?.message || '').includes('no such table')) {
      return c.json({ ok: true, orders: [], warning: 'Migration 0019 required' });
    }
    throw e;
  }
});

app.post('/api/tradelines/order', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const tradelineId = Number(body.tradelineId || body.TradelineID);
  if (!Number.isFinite(tradelineId)) return c.json({ error: 'tradelineId required' }, 400);

  const inv = await getTradelineInventory(c.env);
  let tradeline = inv.tradelines.find((t) => t.id === tradelineId);
  if (!tradeline && tradelineMasterConfigured(c.env)) {
    const live = await fetchTradelineById(c.env, tradelineId);
    tradeline = live.tradeline;
  }
  if (!tradeline) return c.json({ error: 'Tradeline not found or sold out' }, 404);
  if (tradeline.spotsAvailable < 1) return c.json({ error: 'No spots available on this tradeline' }, 409);

  let clientId: string | null = body.clientId || null;
  if (user.role === 'client') {
    const portalClient = await resolvePortalClientSafe(c, user, body.clientId);
    if (!portalClient) return c.json({ error: 'Client profile required' }, 400);
    clientId = portalClient.id;
  } else if (clientId) {
    const owned = await c.env.DB.prepare('SELECT id FROM clients WHERE id = ? AND org_id = ?')
      .bind(clientId, user.org_id).first();
    if (!owned) return c.json({ error: 'Client not found' }, 404);
  }

  const clientPayload = {
    FirstName: String(body.firstName || body.FirstName || '').trim(),
    MiddleName: String(body.middleName || body.MiddleName || '').trim() || undefined,
    LastName: String(body.lastName || body.LastName || '').trim(),
    Suffix: String(body.suffix || body.Suffix || '').trim() || undefined,
    Email: String(body.email || body.Email || '').trim().toLowerCase(),
    Phone: String(body.phone || body.Phone || '').trim(),
    DOB: String(body.dob || body.DOB || '').trim(),
    SSN: String(body.ssn || body.SSN || '').replace(/\D/g, ''),
    GenderId: Number(body.genderId || body.GenderId || 1),
    MaritalStatusId: Number(body.maritalStatusId || body.MaritalStatusId || 1),
    CitizenshipStatusId: Number(body.citizenshipStatusId || body.CitizenshipStatusId || 1),
    PhysicalAddress: String(body.physicalAddress || body.PhysicalAddress || '').trim(),
    City: String(body.city || body.City || '').trim(),
    StateCode: String(body.stateCode || body.StateCode || body.state || '').trim().toUpperCase().slice(0, 2),
    ZipCode: String(body.zipCode || body.ZipCode || body.zip || '').trim(),
    CreditReportAgencyURL: String(body.creditReportAgencyURL || body.CreditReportAgencyURL || '').trim() || undefined,
    CreditReportAgencyUsername: String(body.creditReportAgencyUsername || body.CreditReportAgencyUsername || '').trim() || undefined,
    CreditReportAgencyPassword: String(body.creditReportAgencyPassword || body.CreditReportAgencyPassword || '').trim() || undefined,
  };

  if (!clientPayload.FirstName || !clientPayload.LastName || !clientPayload.Email) {
    return c.json({ error: 'First name, last name, and email are required' }, 400);
  }
  if (!clientPayload.DOB || clientPayload.SSN.length < 9) {
    return c.json({ error: 'Valid date of birth and 9-digit SSN are required' }, 400);
  }
  if (!clientPayload.PhysicalAddress || !clientPayload.City || !clientPayload.StateCode || !clientPayload.ZipCode) {
    return c.json({ error: 'Full physical address is required' }, 400);
  }

  const placeLive = !!body.placeLive && user.role !== 'client';
  const orderId = generateId();
  let status = 'awaiting_payment';
  let tlmOrderId: number | null = null;
  let tlmStatus: number | null = null;
  let tlmMessage: string | null = null;

  // Smart match impact snapshot
  const impact = matchTradelinesForClient(
    {
      firstName: clientPayload.FirstName,
      lastName: clientPayload.LastName,
      email: clientPayload.Email,
      goal: body.goal || 'general',
    },
    [tradeline],
    1,
  ).matches[0] || null;

  if (placeLive) {
    if (!tradelineMasterConfigured(c.env)) {
      return c.json({ error: 'TradelineMaster not configured' }, 503);
    }
    const placed = await submitTradelineOrder(c.env, tradelineId, clientPayload);
    tlmStatus = placed.result?.Status ?? null;
    tlmOrderId = placed.result?.OrderId || null;
    tlmMessage = placed.result?.Message || placed.error || null;
    if (placed.result?.Status === 1) status = 'approved';
    else if (placed.result?.Status === 3) status = 'declined';
    else if (placed.result?.Status === 2) status = 'invalid';
    else status = 'submitted';
  }

  try {
    await c.env.DB.prepare(
      `INSERT INTO tradeline_master_orders (
        id, org_id, client_id, created_by, tradeline_id, lender, credit_limit,
        wholesale_price, retail_price, cycles, status, tlm_order_id, tlm_status, tlm_message,
        client_json, credit_portal_json, impact_json, notes, payment_email_sent, placed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, datetime('now'), datetime('now'))`,
    ).bind(
      orderId, user.org_id, clientId, user.id, tradelineId, tradeline.lender, tradeline.creditLimit,
      tradeline.wholesalePrice, tradeline.retailPrice, tradeline.cycles, status, tlmOrderId, tlmStatus, tlmMessage,
      JSON.stringify(clientPayload),
      JSON.stringify({
        url: clientPayload.CreditReportAgencyURL || null,
        username: clientPayload.CreditReportAgencyUsername || null,
        // password stored encrypted-ish only in order row for staff fulfillment — never returned to client list
        password: clientPayload.CreditReportAgencyPassword || null,
      }),
      JSON.stringify(impact),
      body.notes || null,
      placeLive ? new Date().toISOString() : null,
    ).run();
  } catch (e: any) {
    if (String(e?.message || '').includes('no such table')) {
      return c.json({ error: 'Database migration 0019 required — apply migrations then retry' }, 503);
    }
    throw e;
  }

  let emailResult: any = null;
  try {
    emailResult = await sendTradelineOrderEmails(c.env, {
      orderId,
      tradeline,
      client: clientPayload,
      status,
      tlmOrderId,
      tlmMessage,
      placeLive,
    });
    if (emailResult?.ops?.sent) {
      await c.env.DB.prepare(
        `UPDATE tradeline_master_orders SET payment_email_sent = 1, updated_at = datetime('now') WHERE id = ?`,
      ).bind(orderId).run();
    }
  } catch (e: any) {
    emailResult = { error: e?.message || 'email_failed' };
  }

  try {
    await c.env.DB.prepare(
      'INSERT INTO activity_log (id, org_id, client_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).bind(
      generateId(), user.org_id, clientId, user.id, 'tradeline_order_created',
      `Tradeline ${tradeline.lender} $${tradeline.creditLimit} · ${status}`,
      JSON.stringify({ orderId, tradelineId, retailPrice: tradeline.retailPrice, placeLive, tlmOrderId }),
    ).run();
  } catch { /* soft */ }

  return c.json({
    ok: true,
    orderId,
    status,
    tlmOrderId,
    tlmStatus,
    tlmMessage,
    retailPrice: tradeline.retailPrice,
    wholesalePrice: user.role === 'client' ? undefined : tradeline.wholesalePrice,
    tradeline: {
      id: tradeline.id,
      lender: tradeline.lender,
      creditLimit: tradeline.creditLimit,
      statementLabel: tradeline.statementLabel,
      postingWindowLabel: tradeline.postingWindowLabel,
      accountAgeLabel: tradeline.accountAgeLabel,
      cycles: tradeline.cycles,
      retailPrice: tradeline.retailPrice,
    },
    opsEmail: c.env.TRADELINE_OPS_EMAIL || TRADELINE_OPS_EMAIL_DEFAULT,
    email: emailResult,
    message: placeLive
      ? (status === 'approved'
        ? 'Order approved at TradelineMaster.'
        : `API returned status ${tlmStatus}: ${tlmMessage || status}. Payment/ops notified at tradelines@smartfcra.com.`)
      : `Quote saved. Email tradelines@smartfcra.com to pay ${tradeline.retailPrice.toFixed(2)} and place this line.`,
  }, 201);
});

app.post('/api/tradelines/orders/:id/place', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role === 'client') return c.json({ error: 'Staff only' }, 403);
  if (!tradelineMasterConfigured(c.env)) return c.json({ error: 'TradelineMaster not configured' }, 503);
  const id = c.req.param('id');
  const row = await c.env.DB.prepare(
    `SELECT * FROM tradeline_master_orders WHERE id = ? AND org_id = ?`,
  ).bind(id, user.org_id).first() as any;
  if (!row) return c.json({ error: 'Order not found' }, 404);
  if (row.tlm_order_id && row.status === 'approved') {
    return c.json({ ok: true, alreadyPlaced: true, tlmOrderId: row.tlm_order_id });
  }
  const clientPayload = JSON.parse(row.client_json || '{}');
  const portal = JSON.parse(row.credit_portal_json || '{}');
  if (portal.password && !clientPayload.CreditReportAgencyPassword) {
    clientPayload.CreditReportAgencyPassword = portal.password;
  }
  if (portal.url) clientPayload.CreditReportAgencyURL = portal.url;
  if (portal.username) clientPayload.CreditReportAgencyUsername = portal.username;

  const placed = await submitTradelineOrder(c.env, Number(row.tradeline_id), clientPayload);
  let status = row.status;
  if (placed.result?.Status === 1) status = 'approved';
  else if (placed.result?.Status === 3) status = 'declined';
  else if (placed.result?.Status === 2) status = 'invalid';
  else status = 'submitted';

  await c.env.DB.prepare(
    `UPDATE tradeline_master_orders SET status = ?, tlm_order_id = ?, tlm_status = ?, tlm_message = ?, placed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
  ).bind(status, placed.result?.OrderId || null, placed.result?.Status ?? null, placed.result?.Message || placed.error || null, id).run();

  return c.json({
    ok: placed.ok,
    status,
    tlmOrderId: placed.result?.OrderId || null,
    tlmStatus: placed.result?.Status ?? null,
    message: placed.result?.Message || placed.error || null,
  }, placed.ok ? 200 : 502);
});

/** Cron: refresh TradelineMaster inventory daily */
app.post('/api/cron/tradelines-refresh', async (c) => {
  const secret = c.env.JOURNEY_CRON_SECRET || c.env.MAILING_WEBHOOK_SECRET;
  const auth = c.req.header('Authorization') || '';
  const cronHeader = c.req.header('X-Cron-Secret') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : cronHeader;
  if (!secret || token !== secret) return c.json({ error: 'Unauthorized' }, 401);
  if (!tradelineMasterConfigured(c.env)) return c.json({ error: 'not_configured' }, 503);
  const sync = await syncTradelineInventory(c.env);
  return c.json({ ok: !!sync.ok, ...sync }, sync.ok ? 200 : 502);
});

// ── Portal uploads (docs, creditor replies, bank statements) ──
app.get('/api/client-portal/uploads', authMiddleware, async (c) => {
  const user = c.get('user');
  const client = await resolvePortalClientSafe(c, user, c.req.query('clientId') || undefined);
  if (!client) return c.json({ error: 'Client not found' }, 404);
  const rows = await c.env.DB.prepare(
    `SELECT id, category, file_name, mime_type, notes, analysis_json, r2_key, byte_size, sha256, scan_status, ocr_status, created_at
     FROM portal_uploads WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 100`
  ).bind(client.id, user.org_id).all().catch(async () =>
    c.env.DB.prepare(
      `SELECT id, category, file_name, mime_type, notes, analysis_json, created_at FROM portal_uploads
       WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 100`
    ).bind(client.id, user.org_id).all()
  );
  return c.json({ uploads: rows?.results || [], vault: !!c.env.DOCS });
});

app.get('/api/client-portal/uploads/:id/download', authMiddleware, async (c) => {
  const user = c.get('user');
  const client = await resolvePortalClientSafe(c, user, c.req.query('clientId') || undefined);
  if (!client) return c.json({ error: 'Client not found' }, 404);
  const row = await c.env.DB.prepare(
    `SELECT * FROM portal_uploads WHERE id = ? AND client_id = ? AND org_id = ?`
  ).bind(c.req.param('id'), client.id, user.org_id).first() as any;
  if (!row) return c.json({ error: 'Not found' }, 404);
  await writeSecurityAudit(c.env, {
    orgId: user.org_id, actorUserId: user.id, actorRole: user.role, action: 'vault_download',
    resourceType: 'portal_upload', resourceId: row.id, ip: c.req.header('CF-Connecting-IP'),
  });
  if (row.r2_key && c.env.DOCS) {
    if (String(row.scan_status || '') === 'blocked') {
      return c.json({ error: 'This file was blocked by the malware/hygiene scanner and cannot be downloaded.' }, 403);
    }
    const obj = await c.env.DOCS.get(row.r2_key);
    if (!obj) return c.json({ error: 'Object missing from vault' }, 404);
    const headers = new Headers();
    headers.set('Content-Type', row.mime_type || obj.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Content-Disposition', `attachment; filename="${(row.file_name || 'document').replace(/"/g, '')}"`);
    headers.set('Cache-Control', 'private, no-store');
    headers.set('X-Content-Type-Options', 'nosniff');
    return new Response(obj.body, { headers });
  }
  if (row.content_text) {
    const text = await decryptPII(c, row.content_text);
    return c.json({ id: row.id, fileName: row.file_name, text });
  }
  return c.json({ error: 'No downloadable content' }, 404);
});

app.post('/api/client-portal/uploads', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const client = await resolvePortalClientSafe(c, user, body.clientId);
  if (!client) return c.json({ error: 'Client not found' }, 404);
  const category = body.category || 'other';
  const contentText = String(body.contentText || body.text || '').slice(0, 200000);
  const fileName = String(body.fileName || 'upload.bin').slice(0, 180);
  const mimeType = String(body.mimeType || 'application/octet-stream').slice(0, 120);
  const fileBase64 = typeof body.fileBase64 === 'string' ? body.fileBase64 : '';
  if (!contentText && !fileBase64 && !body.fileName) return c.json({ error: 'Upload content or file required' }, 400);

  let analysis: any = null;
  let underwriting: any = null;

  let replyIntel: ReturnType<typeof classifyBureauReply> | null = null;
  if (isReplyUploadCategory(category) && contentText.length > 40) {
    replyIntel = classifyBureauReply(contentText);
    analysis = { summary: replyIntel.summary, reply: replyIntel };
    // Auto-update the latest open dispute document for this client when confidence is solid
    if (replyIntel.confidence >= 0.6 && replyIntel.overallOutcome !== 'inconclusive') {
      try {
        const openDoc = await c.env.DB.prepare(
          `SELECT id FROM documents WHERE client_id = ? AND org_id = ? AND status IN ('sent','mailed','delivered','draft') ORDER BY datetime(COALESCE(sent_at, updated_at, created_at)) DESC LIMIT 1`
        ).bind(client.id, user.org_id).first() as any;
        if (openDoc?.id) {
          await c.env.DB.prepare(
            `UPDATE documents SET status = 'response_received', dispute_result = ?, updated_at = datetime('now') WHERE id = ? AND org_id = ?`
          ).bind(replyIntel.suggestedDisputeResult, openDoc.id, user.org_id).run();
          // Only auto-resolve the whole set on clear full deletion; partial needs staff review
          if (replyIntel.overallOutcome === 'deleted') {
            await c.env.DB.prepare(
              `UPDATE violations SET status = 'resolved', updated_at = datetime('now') WHERE client_id = ? AND org_id = ? AND status != 'resolved'`
            ).bind(client.id, user.org_id).run().catch(() => {});
          }
          await closeInvestigationClock(c.env.DB, { documentId: openDoc.id, orgId: user.org_id });
          await c.env.DB.prepare(
            'INSERT INTO activity_log (id, org_id, client_id, document_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
          ).bind(
            generateId(), user.org_id, client.id, openDoc.id, user.id,
            'bureau_reply_classified',
            `Auto-classified upload as ${replyIntel.overallOutcome} (${replyIntel.bureauHint})`,
            JSON.stringify(replyIntel),
          ).run();
        }
      } catch { /* soft */ }
    }
  }

  if ((category === 'bank_statement' || body.runUnderwriting) && contentText.length > 40) {
    underwriting = parseBankStatementText(contentText);
    try {
      await c.env.DB.prepare(
        `UPDATE clients SET estimated_monthly_income = ?, estimated_monthly_debt = ?, updated_at = datetime('now') WHERE id = ? AND org_id = ?`
      ).bind(underwriting.monthlyIncomeEstimate, underwriting.monthlyDebtEstimate, client.id, user.org_id).run();
    } catch { /* soft */ }
    try {
      await c.env.DB.prepare(
        `INSERT INTO underwriting_snapshots (id, org_id, client_id, monthly_income, monthly_debt, dti_pct, reserves_months, cash_flow_json, report_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).bind(
        generateId(), user.org_id, client.id,
        underwriting.monthlyIncomeEstimate, underwriting.monthlyDebtEstimate,
        underwriting.dtiPct, underwriting.reservesMonths,
        JSON.stringify({ credits: underwriting.credits, debits: underwriting.debits, net: underwriting.netCashFlow }),
        JSON.stringify(underwriting),
      ).run();
    } catch { /* soft */ }
  }

  if (category === 'bank_statement' && contentText.length > 40) {
    try {
      const { mentor, knowledgeBlock } = buildMentorContext('personal-finance-tutor', contentText.slice(0, 4000));
      const ai = await generateAiText(c.env, [
        { role: 'system', content: `${mentor.systemPrompt}\nAnalyze this bank statement excerpt. Summarize income, expenses, cash-flow health, and 3 budget actions. Never invent exact balances not present. Deterministic underwriting JSON follows — treat it as ground truth for numbers.\nUnderwriting: ${JSON.stringify(underwriting || {}).slice(0, 2000)}\n${knowledgeBlock}` },
        { role: 'user', content: contentText.slice(0, 12000) },
      ]);
      analysis = { summary: ai.text, provider: ai.provider, model: ai.model, underwriting };
      try {
        await c.env.DB.prepare(
          `INSERT INTO tutor_memory (id, org_id, client_id, summary, goals_json, sessions_count, updated_at)
           VALUES (?, ?, ?, ?, '[]', 1, datetime('now'))
           ON CONFLICT(client_id) DO UPDATE SET
             summary = excluded.summary,
             sessions_count = COALESCE(tutor_memory.sessions_count, 0) + 1,
             updated_at = datetime('now')`
        ).bind(generateId(), user.org_id, client.id, `Bank analysis: ${(ai.text || '').slice(0, 1500)}`).run();
      } catch { /* soft */ }
    } catch (e: any) {
      analysis = { error: e.message, underwriting };
    }
  } else if (underwriting) {
    analysis = { underwriting };
  }

  const id = generateId();
  let r2Key: string | null = null;
  let byteSize: number | null = null;
  let sha256: string | null = null;
  const enc = contentText ? await encryptPII(c, contentText) : null;

  if (fileBase64) {
    if (!c.env.DOCS) return c.json({ error: 'Document vault (R2) is not bound on this deployment' }, 503);
    const raw = fileBase64.includes(',') ? fileBase64.split(',').pop()! : fileBase64;
    const binary = decodeBase64Bytes(raw);
    if (binary.byteLength > 15 * 1024 * 1024) return c.json({ error: 'File too large (15MB max)' }, 400);
    const hygiene = await inspectUpload({
      bytes: binary,
      fileName,
      declaredMime: mimeType,
      extractedText: contentText,
      ocrUsed: !!body.ocrUsed,
      category,
    });
    if (!hygiene.ok) {
      return c.json({ error: hygiene.scanDetail, hygiene }, 400);
    }
    byteSize = hygiene.byteSize;
    sha256 = hygiene.sha256;
    r2Key = `org/${user.org_id}/client/${client.id}/${id}/${sanitizeFileName(fileName)}`;
    await c.env.DOCS.put(r2Key, binary, {
      httpMetadata: { contentType: hygiene.detectedMime || mimeType },
      customMetadata: { orgId: user.org_id, clientId: client.id, sha256, uploadedBy: user.id, scanStatus: hygiene.scanStatus },
    });
    try {
      await c.env.DB.prepare(
        `INSERT INTO portal_uploads (id, org_id, client_id, uploaded_by, category, file_name, mime_type, content_text, notes, analysis_json, r2_key, byte_size, sha256, encrypted, scan_status, scan_detail, ocr_status, ocr_chars, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, datetime('now'))`
      ).bind(
        id, user.org_id, client.id, user.id, category, fileName, hygiene.detectedMime || mimeType, enc, body.notes || null,
        analysis ? JSON.stringify(analysis) : null, r2Key, byteSize, sha256,
        hygiene.scanStatus, hygiene.scanDetail, hygiene.ocrStatus, hygiene.ocrChars,
      ).run();
    } catch {
      await c.env.DB.prepare(
        `INSERT INTO portal_uploads (id, org_id, client_id, uploaded_by, category, file_name, mime_type, content_text, notes, analysis_json, r2_key, byte_size, sha256, encrypted, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`
      ).bind(
        id, user.org_id, client.id, user.id, category, fileName, mimeType, enc, body.notes || null,
        analysis ? JSON.stringify(analysis) : null, r2Key, byteSize, sha256,
      ).run();
    }
  } else {
    try {
      await c.env.DB.prepare(
        `INSERT INTO portal_uploads (id, org_id, client_id, uploaded_by, category, file_name, mime_type, content_text, notes, analysis_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).bind(
        id, user.org_id, client.id, user.id, category, fileName, mimeType, enc, body.notes || null,
        analysis ? JSON.stringify(analysis) : null,
      ).run();
    } catch (e: any) {
      return c.json({ error: e.message || 'Upload insert failed' }, 500);
    }
  }

  await writeSecurityAudit(c.env, {
    orgId: user.org_id, actorUserId: user.id, actorRole: user.role, action: 'vault_upload',
    resourceType: 'portal_upload', resourceId: id,
    ip: c.req.header('CF-Connecting-IP'), detail: { category, fileName, byteSize, hasR2: !!r2Key },
  });
  await c.env.DB.prepare(
    'INSERT INTO activity_log (id, org_id, client_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    generateId(), user.org_id, client.id, user.id, 'portal_upload',
    `Portal upload: ${category} ${fileName}`.trim(),
    JSON.stringify({ uploadId: id, category, r2Key: !!r2Key })
  ).run();

  return c.json({
    ok: true,
    id,
    analysis,
    underwriting,
    replyIntel,
    r2Stored: !!r2Key,
    sha256,
    byteSize,
  });
});

// ── Education library + progress ───────────────────────────────
app.get('/api/client-portal/education', authMiddleware, async (c) => {
  const user = c.get('user');
  const client = await resolvePortalClientSafe(c, user, c.req.query('clientId') || undefined);
  let progress: any[] = [];
  if (client) {
    try {
      const rows = await c.env.DB.prepare(
        `SELECT * FROM education_progress WHERE client_id = ? AND org_id = ?`
      ).bind(client.id, user.org_id).all();
      progress = rows?.results || [];
    } catch { /* soft */ }
  }
  return c.json({
    lessons: EDUCATION_LIBRARY.map(l => ({
      id: l.id, track: l.track, level: l.level, title: l.title, summary: l.summary,
      quizCount: l.quiz.length,
    })),
    progress,
  });
});

app.get('/api/client-portal/education/:lessonId', authMiddleware, async (c) => {
  const lesson = getLessonById(c.req.param('lessonId'));
  if (!lesson) return c.json({ error: 'Lesson not found' }, 404);
  return c.json({
    lesson: {
      ...lesson,
      quiz: lesson.quiz.map((q, i) => ({ i, q: q.q, choices: q.choices })), // hide answers
    },
  });
});

app.post('/api/client-portal/education/:lessonId/complete', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const client = await resolvePortalClientSafe(c, user, body.clientId);
  if (!client) return c.json({ error: 'Client not found' }, 404);
  const lesson = getLessonById(c.req.param('lessonId'));
  if (!lesson) return c.json({ error: 'Lesson not found' }, 404);

  const answers: number[] = Array.isArray(body.answers) ? body.answers : [];
  let score = 0;
  lesson.quiz.forEach((q, i) => { if (answers[i] === q.answer) score += 1; });
  const total = lesson.quiz.length;
  const passed = total === 0 || score === total;
  const id = generateId();
  await c.env.DB.prepare(
    `INSERT INTO education_progress (id, org_id, client_id, lesson_id, track, status, quiz_score, quiz_total, completed_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(client_id, lesson_id) DO UPDATE SET
       status = excluded.status,
       quiz_score = excluded.quiz_score,
       quiz_total = excluded.quiz_total,
       completed_at = excluded.completed_at,
       updated_at = datetime('now')`
  ).bind(id, user.org_id, client.id, lesson.id, lesson.track, passed ? 'completed' : 'started', score, total).run();

  try {
    await c.env.DB.prepare(
      `INSERT INTO tutor_memory (id, org_id, client_id, summary, gaps_json, last_quiz_at, sessions_count, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'), 1, datetime('now'))
       ON CONFLICT(client_id) DO UPDATE SET
         last_quiz_at = datetime('now'),
         sessions_count = COALESCE(tutor_memory.sessions_count, 0) + 1,
         updated_at = datetime('now')`
    ).bind(
      generateId(), user.org_id, client.id,
      `Completed lesson ${lesson.title} (${score}/${total})`,
      JSON.stringify(passed ? [] : [lesson.id]),
    ).run();
  } catch { /* soft */ }

  return c.json({ ok: true, score, total, passed, correctAnswers: lesson.quiz.map(q => q.answer) });
});

// ── Personal tutor (grows with client journey) ────────────────
app.get('/api/client-portal/tutor', authMiddleware, async (c) => {
  const user = c.get('user');
  const client = await resolvePortalClientSafe(c, user, c.req.query('clientId') || undefined);
  if (!client) return c.json({ error: 'Client not found' }, 404);
  try {
    const companion = await loadTutorCompanion(c.env, client);
    return c.json({
      mentor: MENTORS.find(m => m.id === 'personal-finance-tutor'),
      memory: companion.memory,
      progress: companion.progress,
      growth: companion.growth,
      journeyPhase: companion.input.journeyPhase,
      focusGoal: companion.input.focusGoal,
      client: {
        id: client.id,
        first_name: client.first_name,
        eq_score: client.eq_score,
        ex_score: client.ex_score,
        tu_score: client.tu_score,
      },
    });
  } catch (e: any) {
    console.error('[tutor] load failed', e);
    return c.json({
      mentor: MENTORS.find(m => m.id === 'personal-finance-tutor'),
      memory: null,
      progress: [],
      growth: null,
      client: { id: client.id, first_name: client.first_name },
      warning: e.message,
    });
  }
});

app.post('/api/client-portal/tutor/chat', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const client = await resolvePortalClientSafe(c, user, body.clientId);
  if (!client) return c.json({ error: 'Client not found' }, 404);
  const message = String(body.message || '').trim();
  if (!message) return c.json({ error: 'Message required' }, 400);

  const companion = await loadTutorCompanion(c.env, client);
  const { growth, input, memory } = companion;

  const { mentor, knowledgeBlock } = buildMentorContext('personal-finance-tutor', message);
  const growthBlock = tutorChatSystemBlock(input, growth, memory?.summary, memory?.goals_json);
  const context = [
    `Client: ${client.first_name} ${client.last_name}`,
    `Scores EQ/EX/TU: ${client.eq_score || '—'} / ${client.ex_score || '—'} / ${client.tu_score || '—'}`,
  ].filter(Boolean).join('\n');

  let reply = '';
  let provider = 'fallback';
  let model = 'tutor-growth-local';
  try {
    const result = await generateAiText(c.env, [
      { role: 'system', content: `${mentor.systemPrompt}\n\n${knowledgeBlock}\n\n${growthBlock}\n\nClient context:\n${context}` },
      { role: 'user', content: message },
    ]);
    reply = result.text || '';
    provider = result.provider || provider;
    model = result.model || model;
  } catch (e: any) {
    console.warn('[tutor] AI unavailable, using growth fallback', e?.message);
  }

  if (!reply || reply.length < 20) {
    reply = buildTutorFallbackReply(input, message, growth);
    provider = 'fallback';
    model = 'tutor-growth-local';
  }

  const nextSessions = (memory?.sessions_count || 0) + 1;
  try {
    const summary = `${(memory?.summary || '').slice(0, 800)}\n[L${growth.level}/${growth.rank}] Q: ${message.slice(0, 200)}\nA: ${reply.slice(0, 400)}`.trim();
    await c.env.DB.prepare(
      `INSERT INTO tutor_memory (id, org_id, client_id, summary, sessions_count, level, xp, rank_title, growth_json, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(client_id) DO UPDATE SET
         summary = excluded.summary,
         sessions_count = COALESCE(tutor_memory.sessions_count,0)+1,
         level = excluded.level,
         xp = excluded.xp,
         rank_title = excluded.rank_title,
         growth_json = excluded.growth_json,
         updated_at = datetime('now')`
    ).bind(
      generateId(),
      user.org_id,
      client.id,
      summary.slice(0, 4000),
      growth.level,
      growth.xp + 12,
      growth.rankTitle,
      JSON.stringify({ rank: growth.rank, curriculumFocus: growth.curriculumFocus, phase: input.journeyPhase }),
    ).run();
  } catch {
    try {
      const summary = `${(memory?.summary || '').slice(0, 800)}\n[L${growth.level}/${growth.rank}] Q: ${message.slice(0, 200)}\nA: ${reply.slice(0, 400)}`.trim();
      await c.env.DB.prepare(
        `INSERT INTO tutor_memory (id, org_id, client_id, summary, sessions_count, updated_at)
         VALUES (?, ?, ?, ?, 1, datetime('now'))
         ON CONFLICT(client_id) DO UPDATE SET summary = excluded.summary, sessions_count = COALESCE(tutor_memory.sessions_count,0)+1, updated_at = datetime('now')`
      ).bind(generateId(), user.org_id, client.id, summary.slice(0, 4000)).run();
    } catch { /* soft */ }
  }

  if (body.logToInbox) {
    await c.env.DB.prepare(
      `INSERT INTO portal_messages (id, org_id, client_id, sender_user_id, sender_role, channel, subject, body, created_at)
       VALUES (?, ?, ?, ?, 'system', 'portal', 'Tutor session', ?, datetime('now'))`
    ).bind(generateId(), user.org_id, client.id, user.id, `You: ${message}\n\nAlex: ${reply}`).run();
  }

  // Recompute growth after session bump for response
  const refreshed = await loadTutorCompanion(c.env, client).catch(() => companion);

  return c.json({
    reply,
    provider,
    model,
    mentor: mentor.id,
    growth: refreshed.growth,
    leveledUp: refreshed.growth.level > growth.level,
  });
});

// ── Fundability + tradelines + roadmaps ───────────────────────
app.get('/api/client-portal/fundability', authMiddleware, async (c) => {
  const user = c.get('user');
  const client = await resolvePortalClientSafe(c, user, c.req.query('clientId') || undefined);
  if (!client) return c.json({ error: 'Client not found' }, 404);
  if (user.role === 'client' && !isPortalAnalysisUnlocked(client)) {
    return c.json({
      analysisLocked: true,
      lockMessage: 'Fundability insights unlock with your case analysis after payment approval.',
      fundability: null,
    });
  }
  const goal = c.req.query('goal') || undefined;
  const report = await c.env.DB.prepare(
    `SELECT id, total_accounts, total_collections, total_inquiries, parsed_data FROM credit_reports
     WHERE client_id = ? AND org_id = ? ORDER BY COALESCE(is_current,1) DESC, created_at DESC LIMIT 1`
  ).bind(client.id, user.org_id).first() as any;
  const viol = await c.env.DB.prepare(
    `SELECT COUNT(*) as c FROM violations WHERE client_id = ? AND org_id = ?`
  ).bind(client.id, user.org_id).first() as any;

  let parsedAccounts: any[] = [];
  if (report?.parsed_data) {
    try {
      const parsed = JSON.parse(await decryptPII(c, report.parsed_data));
      parsedAccounts = [...(parsed.accounts || []), ...(parsed.collections || [])];
    } catch { /* soft */ }
  }

  const fundability = await computeAndStoreFundability(c.env, {
    orgId: user.org_id,
    clientId: client.id,
    client,
    reportMeta: {
      accounts: report?.total_accounts || 0,
      collections: report?.total_collections || 0,
      inquiries: report?.total_inquiries || 0,
      parsedAccounts,
    },
    violationCount: viol?.c || 0,
    goal,
    monthlyIncome: client.estimated_monthly_income,
    monthlyDebt: client.estimated_monthly_debt,
  });

  const scores = [client.eq_score, client.ex_score, client.tu_score].filter((n: any) => typeof n === 'number' && n > 0);
  const avg = scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : (fundability.avgBureauScore || 600);
  const tradelines = tradelineRecsForClient({
    avgScore: avg,
    accountCount: report?.total_accounts || 0,
    collectionCount: report?.total_collections || 0,
    goal,
  });

  const lenderMatches = matchLenders({
    avgScore: avg,
    accountCount: report?.total_accounts || 0,
    collectionCount: report?.total_collections || 0,
    goal,
    limit: 15,
  });

  let utilPct: number | null = null;
  let highestLimit = 2500;
  if (parsedAccounts.length) {
    try {
      const util = computeRevolvingUtilization(parsedAccounts);
      utilPct = util.utilPct;
      for (const a of parsedAccounts) {
        const lim = Number(a.creditLimit || a.highCredit || 0);
        if (lim > highestLimit) highestLimit = lim;
      }
    } catch { /* soft */ }
  }

  let institutional = null;
  try {
    const profile = buildInstitutionalProfile({
      eqScore: client.eq_score,
      exScore: client.ex_score,
      tuScore: client.tu_score,
      utilizationPct: utilPct,
      inquiries: report?.total_inquiries || 0,
      collections: report?.total_collections || 0,
      highestLimit,
      monthlyIncome: client.estimated_monthly_income,
      state: client.state || client.mailing_state,
      isBusinessOwner: Boolean(client.business_name || String(goal || '').includes('business')),
    });
    institutional = slimInstitutionalReport(LenderMatchingEngine.runComprehensiveMatch(profile));
  } catch { /* soft */ }

  const progressRows = await c.env.DB.prepare(
    `SELECT roadmap_key, completed_steps_json, completed_docs_json, notes, updated_at
     FROM roadmap_progress WHERE client_id = ? AND org_id = ?`
  ).bind(client.id, user.org_id).all();

  const progress: Record<string, { completedSteps: string[]; completedDocs: string[]; notes?: string; updatedAt?: string }> = {};
  for (const row of (progressRows?.results || []) as any[]) {
    try {
      progress[row.roadmap_key] = {
        completedSteps: JSON.parse(row.completed_steps_json || '[]'),
        completedDocs: JSON.parse(row.completed_docs_json || '[]'),
        notes: row.notes || '',
        updatedAt: row.updated_at,
      };
    } catch {
      progress[row.roadmap_key] = { completedSteps: [], completedDocs: [] };
    }
  }

  return c.json({
    fundability,
    tradelines,
    catalog: TRADELINE_CATALOG,
    progress,
    lenders: lenderMatches,
    institutional,
    lenderCatalogStats: catalogStats(),
    institutionalCount: MASTER_LENDERS_DATABASE.length,
    businessVendorCount: MASTER_BUSINESS_VENDORS.length,
  });
});

// Lender matches: mode=institutional (600+ precision) | simple (curated 65)
app.get('/api/client-portal/funding/matches', authMiddleware, async (c) => {
  const user = c.get('user');
  const client = await resolvePortalClientSafe(c, user, c.req.query('clientId') || undefined);
  if (!client) return c.json({ error: 'Client not found' }, 404);

  const goal = c.req.query('goal') || undefined;
  const mode = (c.req.query('mode') || 'institutional').toLowerCase();
  const typeQ = (c.req.query('type') || '').trim().toUpperCase();
  const limit = Math.min(65, Math.max(1, Number(c.req.query('limit') || 20) || 20));

  const report = await c.env.DB.prepare(
    `SELECT total_accounts, total_collections, total_inquiries, parsed_data FROM credit_reports
     WHERE client_id = ? AND org_id = ? ORDER BY COALESCE(is_current,1) DESC, created_at DESC LIMIT 1`
  ).bind(client.id, user.org_id).first() as any;

  const scores = [client.eq_score, client.ex_score, client.tu_score].filter((n: any) => typeof n === 'number' && n > 0);
  const avg = scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 600;

  let utilPct: number | null = null;
  let highestLimit = 2500;
  if (report?.parsed_data) {
    try {
      const parsed = JSON.parse(await decryptPII(c, report.parsed_data));
      const accounts = [...(parsed.accounts || []), ...(parsed.collections || [])];
      const util = computeRevolvingUtilization(accounts);
      utilPct = util.utilPct;
      for (const a of parsed.accounts || []) {
        const lim = Number(a.creditLimit || a.highCredit || 0);
        if (lim > highestLimit) highestLimit = lim;
      }
    } catch { /* soft */ }
  }

  if (mode === 'simple') {
    const types = typeQ
      ? ([typeQ] as any[]).filter((t) =>
          ['RENT_REPORTER', 'PRIMARY_TRADELINE', 'BUSINESS_CARD', 'CREDIT_UNION', 'FINANCIAL_INSTITUTION'].includes(t)
        )
      : undefined;
    const result = matchLenders({
      avgScore: avg,
      accountCount: report?.total_accounts || 0,
      collectionCount: report?.total_collections || 0,
      goal,
      types: types?.length ? types : undefined,
      limit,
    });
    return c.json({
      mode: 'simple',
      avgScore: avg,
      goal: goal || null,
      ...result,
      catalogStats: catalogStats(),
    });
  }

  const profile = buildInstitutionalProfile({
    eqScore: client.eq_score,
    exScore: client.ex_score,
    tuScore: client.tu_score,
    utilizationPct: utilPct,
    inquiries: report?.total_inquiries || 0,
    collections: report?.total_collections || 0,
    highestLimit,
    monthlyIncome: client.estimated_monthly_income,
    state: client.state || client.mailing_state,
    isBusinessOwner: Boolean(client.business_name || goal?.includes('business')),
  });
  const full = LenderMatchingEngine.runComprehensiveMatch(profile);

  return c.json({
    mode: 'institutional',
    avgScore: avg,
    goal: goal || null,
    profile,
    institutional: slimInstitutionalReport(full),
    simplePreview: matchLenders({
      avgScore: avg,
      accountCount: report?.total_accounts || 0,
      collectionCount: report?.total_collections || 0,
      goal,
      limit: 8,
    }),
    catalogStats: catalogStats(),
    institutionalCount: MASTER_LENDERS_DATABASE.length,
    businessVendorCount: MASTER_BUSINESS_VENDORS.length,
  });
});

app.get('/api/client-portal/funding/catalog', authMiddleware, async (c) => {
  const featured = MASTER_LENDERS_DATABASE.filter((l) => !l.id.startsWith('cu-auto-')).slice(0, 80);
  return c.json({
    curated: LENDER_CATALOG,
    curatedStats: catalogStats(),
    institutionalFeatured: featured,
    institutionalTotal: MASTER_LENDERS_DATABASE.length,
    businessVendors: MASTER_BUSINESS_VENDORS.slice(0, 40),
    businessVendorTotal: MASTER_BUSINESS_VENDORS.length,
  });
});

// Persist interactive roadmap wizard progress (steps + docs checklists)
app.put('/api/client-portal/roadmap-progress', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const client = await resolvePortalClientSafe(c, user, body.clientId);
  if (!client) return c.json({ error: 'Client not found' }, 404);

  const roadmapKey = String(body.roadmapKey || '').toLowerCase();
  if (!['mortgage', 'auto', 'student', 'debt'].includes(roadmapKey)) {
    return c.json({ error: 'roadmapKey must be mortgage|auto|student|debt' }, 400);
  }

  const completedSteps = Array.isArray(body.completedSteps)
    ? body.completedSteps.map((s: any) => String(s)).slice(0, 40)
    : [];
  const completedDocs = Array.isArray(body.completedDocs)
    ? body.completedDocs.map((s: any) => String(s)).slice(0, 40)
    : [];
  const notes = body.notes != null ? String(body.notes).slice(0, 2000) : null;
  const id = generateId();

  await c.env.DB.prepare(
    `INSERT INTO roadmap_progress (id, org_id, client_id, roadmap_key, completed_steps_json, completed_docs_json, notes, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(client_id, roadmap_key) DO UPDATE SET
       completed_steps_json = excluded.completed_steps_json,
       completed_docs_json = excluded.completed_docs_json,
       notes = COALESCE(excluded.notes, roadmap_progress.notes),
       updated_at = datetime('now')`
  ).bind(
    id,
    user.org_id,
    client.id,
    roadmapKey,
    JSON.stringify(completedSteps),
    JSON.stringify(completedDocs),
    notes,
  ).run();

  return c.json({
    ok: true,
    roadmapKey,
    completedSteps,
    completedDocs,
    progressPct: Math.round(
      ((completedSteps.length + completedDocs.length) /
        Math.max(1, completedSteps.length + completedDocs.length + (body.totalItems || 1))) * 100
    ),
  });
});

// ── Client journey + daily motivational wake-ups ──────────────
app.get('/api/client-portal/journey', authMiddleware, async (c) => {
  const user = c.get('user');
  const client = await resolvePortalClientSafe(c, user, c.req.query('clientId') || undefined);
  if (!client) return c.json({ error: 'Client not found' }, 404);
  try {
    const data = await loadClientJourney(c.env, client);
    return c.json({
      journey: data.plan,
      state: {
        phase: data.state.phase,
        streakDays: data.state.streak_days || 0,
        longestStreak: data.state.longest_streak || 0,
        lastCheckInDate: data.state.last_check_in_date,
        focusGoal: data.state.focus_goal || 'mortgage',
        motivationOptIn: data.state.motivation_opt_in !== 0,
      },
      today: data.todayMessage,
      todayLogged: data.todayLogged,
    });
  } catch (e: any) {
    console.error('[journey] load failed', e);
    return c.json({ error: 'Journey unavailable — run migrations 0010', detail: e.message }, 503);
  }
});

app.post('/api/client-portal/journey/check-in', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const client = await resolvePortalClientSafe(c, user, body.clientId);
  if (!client) return c.json({ error: 'Client not found' }, 404);
  try {
    const result = await checkInJourney(c.env, client);
    // Ensure today's motivation exists in-app (idempotent)
    await generateAndDispatchDailyMotivation(c.env, client).catch(() => null);
    await touchClientEngagement(c.env, client.id);
    return c.json({
      ok: true,
      streak: result.streak,
      longest: result.longest,
      journey: result.plan,
      message: result.streak > 1
        ? `Day ${result.streak} — keep showing up. You’re building something real.`
        : 'Checked in for today. One focused step is enough.',
    });
  } catch (e: any) {
    return c.json({ error: e.message || 'Check-in failed' }, 500);
  }
});

app.put('/api/client-portal/journey/settings', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const client = await resolvePortalClientSafe(c, user, body.clientId);
  if (!client) return c.json({ error: 'Client not found' }, 404);

  const focusGoal = ['mortgage', 'auto', 'student', 'debt', 'rebuild'].includes(String(body.focusGoal || ''))
    ? String(body.focusGoal)
    : null;
  const motivationOptIn = body.motivationOptIn === false || body.motivationOptIn === 0 ? 0 : 1;

  if (body.journeyOptIn === false || body.journeyOptIn === 0 || body.journeyOptIn === true || body.journeyOptIn === 1) {
    try {
      await c.env.DB.prepare(
        `UPDATE clients SET journey_opt_in = ?, updated_at = datetime('now') WHERE id = ? AND org_id = ?`
      ).bind(body.journeyOptIn === false || body.journeyOptIn === 0 ? 0 : 1, client.id, user.org_id).run();
    } catch { /* soft if column missing pre-migration */ }
  }

  try {
    const existing = await c.env.DB.prepare(`SELECT id FROM client_journey_state WHERE client_id = ?`).bind(client.id).first() as any;
    if (existing) {
      await c.env.DB.prepare(
        `UPDATE client_journey_state SET motivation_opt_in = ?, focus_goal = COALESCE(?, focus_goal), updated_at = datetime('now') WHERE id = ?`
      ).bind(motivationOptIn, focusGoal, existing.id).run();
    } else {
      await c.env.DB.prepare(
        `INSERT INTO client_journey_state (id, org_id, client_id, phase, focus_goal, motivation_opt_in, updated_at)
         VALUES (?, ?, ?, 'get_started', ?, ?, datetime('now'))`
      ).bind(generateId(), user.org_id, client.id, focusGoal || 'mortgage', motivationOptIn).run();
    }
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }

  return c.json({ ok: true, focusGoal: focusGoal || 'mortgage', motivationOptIn: motivationOptIn === 1 });
});

app.post('/api/client-portal/journey/send-today', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const client = await resolvePortalClientSafe(c, user, body.clientId);
  if (!client) return c.json({ error: 'Client not found' }, 404);
  const result = await generateAndDispatchDailyMotivation(c.env, client, { force: !!body.force });
  return c.json(result);
});

/** Cron / GitHub Actions: send daily wake-up motivations to opted-in clients */
app.post('/api/cron/daily-motivation', async (c) => {
  const secret = c.env.JOURNEY_CRON_SECRET || c.env.MAILING_WEBHOOK_SECRET;
  const provided = c.req.header('X-Cron-Secret') || c.req.header('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!secret || provided !== secret) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const body = await c.req.json().catch(() => ({}));
  const stats = await dispatchDailyMotivationBatch(c.env, {
    orgId: body.orgId,
    limit: body.limit || 2000,
  });
  await writeSecurityAudit(c.env, {
    orgId: body.orgId || null,
    actorRole: 'system',
    action: 'daily_motivation_cron',
    resourceType: 'journey',
    detail: stats,
  }).catch(() => null);
  return c.json({
    ok: true,
    ...stats,
    scheduleNote: 'Intended for daily morning dispatch (~7:00 AM US Central / 13:00 UTC via GitHub Actions)',
    ranAt: new Date().toISOString(),
  });
});

/** Cron: onboarding drip + CROA nudge + dispute-due + admin digest */
app.post('/api/cron/enterprise-comms', async (c) => {
  const secret = c.env.JOURNEY_CRON_SECRET || c.env.MAILING_WEBHOOK_SECRET;
  const provided = c.req.header('X-Cron-Secret') || c.req.header('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!secret || provided !== secret) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const body = await c.req.json().catch(() => ({}));
  const result = await runEnterpriseCommsCron(c.env, { orgId: body.orgId });
  await writeSecurityAudit(c.env, {
    orgId: body.orgId || null,
    actorRole: 'system',
    action: 'enterprise_comms_cron',
    resourceType: 'email_workflows',
    detail: result,
  }).catch(() => null);
  return c.json({ ok: true, ...result });
});

app.post('/api/admin/enterprise-comms/dispatch', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin' && user.role !== 'super_admin') return c.json({ error: 'Admin only' }, 403);
  const body = await c.req.json().catch(() => ({}));
  const result = await runEnterpriseCommsCron(c.env, { orgId: body.orgId || user.org_id });
  return c.json({ ok: true, ...result });
});

/** Unified ops cron packs: hourly | daily | weekly | monthly (or explicit jobs[]) */
app.post('/api/cron/ops', async (c) => {
  const secret = c.env.JOURNEY_CRON_SECRET || c.env.MAILING_WEBHOOK_SECRET;
  const provided = c.req.header('X-Cron-Secret') || c.req.header('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!secret || provided !== secret) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const body = await c.req.json().catch(() => ({}));
  const pack = String(body.pack || 'daily');
  const jobs = Array.isArray(body.jobs) ? (body.jobs as OpsJobName[]) : undefined;
  const result = await runOpsPack(c.env, pack, {
    orgId: body.orgId,
    jobs,
    triggeredBy: 'cron',
  });
  await writeSecurityAudit(c.env, {
    orgId: body.orgId || null,
    actorRole: 'system',
    action: 'ops_cron_pack',
    resourceType: 'ops_scheduler',
    detail: { pack, jobCount: result.jobs?.length, ok: result.ok },
  }).catch(() => null);
  return c.json({ ok: result.ok, ...result });
});

app.post('/api/cron/ops/:job', async (c) => {
  const secret = c.env.JOURNEY_CRON_SECRET || c.env.MAILING_WEBHOOK_SECRET;
  const provided = c.req.header('X-Cron-Secret') || c.req.header('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!secret || provided !== secret) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const job = c.req.param('job') as OpsJobName;
  const body = await c.req.json().catch(() => ({}));
  const result = await runOpsJob(c.env, job, {
    orgId: body.orgId,
    pack: 'manual',
    triggeredBy: 'cron',
    limit: body.limit,
  });
  return c.json({ ok: result.status === 'ok', ...result });
});

app.get('/api/admin/ops/jobs', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin' && user.role !== 'super_admin') return c.json({ error: 'Admin only' }, 403);
  return c.json(listOpsJobs());
});

app.get('/api/admin/ops/runs', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin' && user.role !== 'super_admin') return c.json({ error: 'Admin only' }, 403);
  const limit = Math.min(Number(c.req.query('limit') || 50), 200);
  let runs: any[] = [];
  let alerts: any[] = [];
  try {
    runs = (await c.env.DB.prepare(
      `SELECT * FROM scheduled_job_runs ORDER BY started_at DESC LIMIT ?`
    ).bind(limit).all())?.results || [];
  } catch { /* migration pending */ }
  try {
    alerts = (await c.env.DB.prepare(
      `SELECT * FROM ops_alerts WHERE org_id IS NULL OR org_id = ? ORDER BY created_at DESC LIMIT 40`
    ).bind(user.org_id).all())?.results || [];
  } catch { /* soft */ }
  return c.json({ runs, alerts, catalog: listOpsJobs() });
});

app.post('/api/admin/ops/dispatch', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin' && user.role !== 'super_admin') return c.json({ error: 'Admin only' }, 403);
  const body = await c.req.json().catch(() => ({}));
  if (body.job) {
    const result = await runOpsJob(c.env, body.job as OpsJobName, {
      orgId: body.orgId || user.org_id,
      pack: 'manual',
      triggeredBy: `admin:${user.id}`,
      limit: body.limit,
    });
    return c.json({ ok: result.status === 'ok', ...result });
  }
  const result = await runOpsPack(c.env, body.pack || 'daily', {
    orgId: body.orgId || user.org_id,
    jobs: body.jobs,
    triggeredBy: `admin:${user.id}`,
  });
  return c.json({ ok: result.ok, ...result });
});

app.post('/api/client-portal/newsletter/opt-in', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const client = await resolvePortalClientSafe(c, user, body.clientId);
  if (!client) return c.json({ error: 'Client not found' }, 404);
  const optIn = body.optIn !== false ? 1 : 0;
  try {
    await c.env.DB.prepare(`UPDATE clients SET newsletter_opt_in = ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(optIn, client.id).run();
  } catch {
    return c.json({ error: 'Newsletter preference column unavailable — apply migration 0015' }, 503);
  }
  if (optIn && client.email && !isSyntheticPortalEmail(client.email)) {
    try {
      await c.env.DB.prepare(
        `INSERT INTO newsletter_subscriptions (id, org_id, client_id, email, status, topics_json, opted_in_at)
         VALUES (?, ?, ?, ?, 'active', ?, datetime('now'))
         ON CONFLICT(org_id, email) DO UPDATE SET status = 'active', opted_out_at = NULL, client_id = excluded.client_id`
      ).bind(
        generateId(),
        user.org_id,
        client.id,
        client.email,
        JSON.stringify(['education', 'fundability']),
      ).run();
    } catch { /* soft */ }
  } else if (!optIn && client.email) {
    try {
      await c.env.DB.prepare(
        `UPDATE newsletter_subscriptions SET status = 'unsubscribed', opted_out_at = datetime('now') WHERE org_id = ? AND email = ?`
      ).bind(user.org_id, client.email).run();
      await c.env.DB.prepare(
        `INSERT INTO email_suppressions (id, org_id, email, reason, source, created_at)
         VALUES (?, ?, ?, 'unsubscribe', 'newsletter_opt_out', datetime('now'))
         ON CONFLICT(email, reason) DO NOTHING`
      ).bind(generateId(), user.org_id, client.email).run();
    } catch { /* soft */ }
  }
  await touchClientEngagement(c.env, client.id);
  return c.json({ ok: true, newsletterOptIn: !!optIn });
});

app.get('/api/client-portal/tradelines', authMiddleware, async (c) => {
  const user = c.get('user');
  const client = await resolvePortalClientSafe(c, user, c.req.query('clientId') || undefined);
  if (!client) return c.json({ error: 'Client not found' }, 404);
  const goal = c.req.query('goal') || undefined;
  const report = await c.env.DB.prepare(
    `SELECT total_accounts, total_collections FROM credit_reports WHERE client_id = ? ORDER BY created_at DESC LIMIT 1`
  ).bind(client.id).first() as any;
  const scores = [client.eq_score, client.ex_score, client.tu_score].filter((n: any) => typeof n === 'number' && n > 0);
  const avg = scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 600;
  let orders: any[] = [];
  try {
    const o = await c.env.DB.prepare(
      `SELECT id, product_id, product_name, amount_cents, status, created_at, paid_at FROM tradeline_orders
       WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 50`
    ).bind(client.id, user.org_id).all();
    orders = o?.results || [];
  } catch { /* soft */ }
  return c.json({
    recommendations: tradelineRecsForClient({
      avgScore: avg,
      accountCount: report?.total_accounts || 0,
      collectionCount: report?.total_collections || 0,
      goal,
    }),
    lenders: matchLenders({
      avgScore: avg,
      accountCount: report?.total_accounts || 0,
      collectionCount: report?.total_collections || 0,
      goal,
      limit: 12,
    }),
    lenderCatalogStats: catalogStats(),
    orders,
  });
});

app.post('/api/client-portal/tradelines/checkout', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const client = await resolvePortalClientSafe(c, user, body.clientId);
  if (!client) return c.json({ error: 'Client not found' }, 404);
  const product = TRADELINE_CATALOG.find((p) => p.id === body.productId);
  if (!product) return c.json({ error: 'Unknown boost product' }, 400);
  if (!c.env.STRIPE_API_KEY) return c.json({ error: 'Stripe is not configured' }, 503);

  const amountCents = Math.round(Number(product.monthlyFee || 0) * 100);
  if (amountCents <= 0) {
    return c.json({ error: 'This path is $0 — complete setup with your advisor (no card charge).', freePath: true, product }, 200);
  }

  const orderId = generateId();
  const stripe = getStripe(c.env);
  const base = portalBaseUrl(c.env, c.req.url);
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: amountCents,
        recurring: { interval: 'month' },
        product_data: {
          name: product.name,
          description: product.impact,
          metadata: { productId: product.id, category: product.category },
        },
      },
      quantity: 1,
    }],
    success_url: `${base}/?page=client-tradelines&checkout=success&order=${orderId}`,
    cancel_url: `${base}/?page=client-tradelines&checkout=cancelled`,
    customer_email: client.email || user.email,
    metadata: {
      type: 'tradeline',
      orderId,
      orgId: user.org_id,
      clientId: client.id,
      productId: product.id,
    },
    subscription_data: {
      metadata: { type: 'tradeline', orderId, clientId: client.id, productId: product.id, orgId: user.org_id },
    },
  });

  await c.env.DB.prepare(
    `INSERT INTO tradeline_orders (id, org_id, client_id, user_id, product_id, product_name, amount_cents, stripe_session_id, status, metadata_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, datetime('now'))`
  ).bind(
    orderId, user.org_id, client.id, user.id, product.id, product.name, amountCents, session.id,
    JSON.stringify({ reportsTo: product.reportsTo, category: product.category }),
  ).run();

  await writeSecurityAudit(c.env, {
    orgId: user.org_id, actorUserId: user.id, actorRole: user.role, action: 'tradeline_checkout_started',
    resourceType: 'tradeline_order', resourceId: orderId, ip: c.req.header('CF-Connecting-IP'),
  });

  return c.json({ ok: true, url: session.url, orderId });
});

app.get('/api/client-portal/underwriting', authMiddleware, async (c) => {
  const user = c.get('user');
  const client = await resolvePortalClientSafe(c, user, c.req.query('clientId') || undefined);
  if (!client) return c.json({ error: 'Client not found' }, 404);
  let latest: any = null;
  try {
    latest = await c.env.DB.prepare(
      `SELECT * FROM underwriting_snapshots WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 1`
    ).bind(client.id, user.org_id).first();
  } catch { /* soft */ }
  const pack = latest?.report_json ? JSON.parse(latest.report_json) : null;
  return c.json({
    clientEstimates: {
      monthlyIncome: client.estimated_monthly_income,
      monthlyDebt: client.estimated_monthly_debt,
    },
    latest,
    pack,
  });
});

app.post('/api/client-portal/underwriting', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const client = await resolvePortalClientSafe(c, user, body.clientId);
  if (!client) return c.json({ error: 'Client not found' }, 404);
  const income = Number(body.monthlyIncome);
  const debt = Number(body.monthlyDebt);
  if (!(income > 0)) return c.json({ error: 'monthlyIncome required' }, 400);
  try {
    await c.env.DB.prepare(
      `UPDATE clients SET estimated_monthly_income = ?, estimated_monthly_debt = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(income, Number.isFinite(debt) ? debt : 0, client.id).run();
  } catch { /* soft */ }
  const dti = Math.round((Math.max(0, debt) / income) * 1000) / 10;
  const report = {
    monthlyIncomeEstimate: income,
    monthlyDebtEstimate: Math.max(0, debt),
    dtiPct: dti,
    reservesMonths: body.reservesMonths ?? null,
    source: 'manual',
    flags: dti > 43 ? ['DTI above common conventional comfort'] : [],
    recommendations: ['Keep documented income stable for 60 days', 'Pay revolving to drop DTI before apply'],
  };
  try {
    await c.env.DB.prepare(
      `INSERT INTO underwriting_snapshots (id, org_id, client_id, monthly_income, monthly_debt, dti_pct, reserves_months, report_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(generateId(), user.org_id, client.id, income, Math.max(0, debt), dti, body.reservesMonths ?? null, JSON.stringify(report)).run();
  } catch { /* soft */ }
  return c.json({ ok: true, report });
});

app.get('/api/client-portal/alerts', authMiddleware, async (c) => {
  const user = c.get('user');
  const client = await resolvePortalClientSafe(c, user, c.req.query('clientId') || undefined);
  if (!client) return c.json({ error: 'Client not found' }, 404);
  let rows: any = { results: [] };
  try {
    rows = await c.env.DB.prepare(
      `SELECT * FROM portal_alerts WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 100`
    ).bind(client.id, user.org_id).all();
  } catch { /* soft */ }
  return c.json({ alerts: rows?.results || [] });
});

app.post('/api/client-portal/alerts/mark-read', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const client = await resolvePortalClientSafe(c, user, body.clientId);
  if (!client) return c.json({ error: 'Client not found' }, 404);
  const ids = Array.isArray(body.ids) ? body.ids : [];
  if (ids.length) { for (const id of ids.slice(0, 50)) { try { await c.env.DB.prepare(`UPDATE portal_alerts SET status = 'read' WHERE id = ? AND client_id = ?`).bind(id, client.id).run(); } catch {} } }
  else { try { await c.env.DB.prepare(`UPDATE portal_alerts SET status = 'read' WHERE client_id = ? AND org_id = ? AND status = 'sent'`).bind(client.id, user.org_id).run(); } catch {} }
  return c.json({ ok: true });
});

app.get('/api/client-portal/alerts/unread-count', authMiddleware, async (c) => {
  const user = c.get('user');
  const client = await resolvePortalClientSafe(c, user, c.req.query('clientId') || undefined);
  if (!client) return c.json({ count: 0 });
  const row = await c.env.DB.prepare(`SELECT COUNT(*) as c FROM portal_alerts WHERE client_id = ? AND org_id = ? AND status IN ('sent','queued')`).bind(client.id, user.org_id).first() as any;
  return c.json({ count: row?.c || 0 });
});


app.put('/api/client-portal/profile', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const client = await resolvePortalClientSafe(c, user, body.clientId);
  if (!client) return c.json({ error: 'Client not found' }, 404);
  // Clients may only edit their own notification prefs / language / phone
  if (user.role === 'client' && client.email !== user.email) return c.json({ error: 'Forbidden' }, 403);
  const preferredLanguage = body.preferredLanguage || body.preferred_language;
  const notifyEmail = body.notifyEmail;
  const notifySms = body.notifySms;
  const phone = body.phone;
  try {
    await c.env.DB.prepare(
      `UPDATE clients SET
         preferred_language = COALESCE(?, preferred_language),
         notify_email = COALESCE(?, notify_email),
         notify_sms = COALESCE(?, notify_sms),
         phone = COALESCE(?, phone),
         phone_e164 = COALESCE(?, phone_e164),
         updated_at = datetime('now')
       WHERE id = ? AND org_id = ?`
    ).bind(
      preferredLanguage || null,
      typeof notifyEmail === 'boolean' ? (notifyEmail ? 1 : 0) : null,
      typeof notifySms === 'boolean' ? (notifySms ? 1 : 0) : null,
      phone || null,
      phone || null,
      client.id, user.org_id,
    ).run();
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
  return c.json({ ok: true });
});

// Privacy ops
app.post('/api/privacy/export', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const client = await resolvePortalClientSafe(c, user, body.clientId);
  if (!client) return c.json({ error: 'Client profile required' }, 404);
  const reqId = generateId();
  await c.env.DB.prepare(
    `INSERT INTO privacy_requests (id, org_id, client_id, requester_user_id, request_type, status, legal_basis, notes, created_at)
     VALUES (?, ?, ?, ?, 'export', 'in_progress', ?, ?, datetime('now'))`
  ).bind(reqId, user.org_id, client.id, user.id, body.legalBasis || 'ccpa', body.notes || null).run();

  const reports = await c.env.DB.prepare(`SELECT id, bureau, report_date, file_name, status, created_at FROM credit_reports WHERE client_id = ?`).bind(client.id).all();
  const violations = await c.env.DB.prepare(`SELECT id, statute, severity, status, created_at FROM violations WHERE client_id = ?`).bind(client.id).all();
  const docs = await c.env.DB.prepare(`SELECT id, doc_type, title, status, created_at FROM documents WHERE client_id = ?`).bind(client.id).all();
  const messages = await c.env.DB.prepare(`SELECT id, sender_role, subject, created_at FROM portal_messages WHERE client_id = ?`).bind(client.id).all().catch(() => ({ results: [] }));
  const uploads = await c.env.DB.prepare(`SELECT id, category, file_name, created_at, sha256 FROM portal_uploads WHERE client_id = ?`).bind(client.id).all().catch(() => ({ results: [] }));

  const pack = {
    exportedAt: new Date().toISOString(),
    requestId: reqId,
    legalBasis: body.legalBasis || 'ccpa',
    client: {
      id: client.id,
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email,
      phone: client.phone,
      city: client.city,
      state: client.state,
      zip: client.zip,
      // Never export encrypted SSN material in clear form beyond last4 if present
      ssn_last4: client.ssn_last4 || null,
    },
    reports: reports?.results || [],
    violations: violations?.results || [],
    documents: docs?.results || [],
    messages: messages?.results || [],
    uploads: uploads?.results || [],
    notice: 'Raw credit report payloads are available to authorized staff via encrypted vault access; consumer export includes metadata inventory.',
  };

  await c.env.DB.prepare(
    `UPDATE privacy_requests SET status = 'fulfilled', fulfilled_at = datetime('now'), fulfillment_json = ? WHERE id = ?`
  ).bind(JSON.stringify({ exportBytes: JSON.stringify(pack).length }), reqId).run();

  await writeSecurityAudit(c.env, {
    orgId: user.org_id, actorUserId: user.id, actorRole: user.role, action: 'privacy_export',
    resourceType: 'privacy_request', resourceId: reqId, ip: c.req.header('CF-Connecting-IP'),
  });

  return c.json({ ok: true, requestId: reqId, export: pack });
});

app.post('/api/privacy/delete-request', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const client = await resolvePortalClientSafe(c, user, body.clientId);
  if (!client) return c.json({ error: 'Client profile required' }, 404);
  if (client.data_retention_holds === 1) {
    return c.json({ error: 'Deletion is on legal hold (active litigation / retention). Contact your advisor.' }, 409);
  }
  const reqId = generateId();
  await c.env.DB.prepare(
    `INSERT INTO privacy_requests (id, org_id, client_id, requester_user_id, request_type, status, legal_basis, notes, created_at)
     VALUES (?, ?, ?, ?, 'delete', 'pending', ?, ?, datetime('now'))`
  ).bind(reqId, user.org_id, client.id, user.id, body.legalBasis || 'ccpa', body.notes || 'Consumer deletion request').run();

  await writeSecurityAudit(c.env, {
    orgId: user.org_id, actorUserId: user.id, actorRole: user.role, action: 'privacy_delete_requested',
    resourceType: 'privacy_request', resourceId: reqId, ip: c.req.header('CF-Connecting-IP'),
  });

  // Notify staff via activity
  await c.env.DB.prepare(
    'INSERT INTO activity_log (id, org_id, client_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(generateId(), user.org_id, client.id, user.id, 'privacy_delete_request',
    'CCPA/GDPR deletion request submitted — pending admin fulfillment',
    JSON.stringify({ requestId: reqId })).run();

  return c.json({ ok: true, requestId: reqId, status: 'pending', message: 'Deletion queued. An administrator must fulfill after compliance review.' });
});

app.get('/api/admin/privacy-requests', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role === 'client') return c.json({ error: 'Unauthorized' }, 403);
  const rows = await c.env.DB.prepare(
    `SELECT * FROM privacy_requests WHERE org_id = ? ORDER BY created_at DESC LIMIT 200`
  ).bind(user.org_id).all();
  return c.json({ requests: rows?.results || [] });
});

app.post('/api/admin/privacy-requests/:id/fulfill', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!(user.role === 'admin' || user.role === 'super_admin')) return c.json({ error: 'Admin only' }, 403);
  const req = await c.env.DB.prepare(`SELECT * FROM privacy_requests WHERE id = ? AND org_id = ?`)
    .bind(c.req.param('id'), user.org_id).first() as any;
  if (!req) return c.json({ error: 'Not found' }, 404);
  if (req.request_type !== 'delete') return c.json({ error: 'Only delete requests are fulfilled here' }, 400);
  const clientId = req.client_id;
  const priorClient = await c.env.DB.prepare(`SELECT email FROM clients WHERE id = ? AND org_id = ?`).bind(clientId, user.org_id).first() as any;
  const priorEmail = priorClient?.email || null;

  // Purge client-scoped sensitive data (retain anonymized audit)
  const tables = [
    'portal_messages', 'portal_uploads', 'portal_alerts', 'education_progress', 'tutor_memory', 'roadmap_progress',
    'fundability_snapshots', 'underwriting_snapshots', 'tradeline_orders', 'violations', 'documents',
  ];
  for (const table of tables) {
    try { await c.env.DB.prepare(`DELETE FROM ${table} WHERE client_id = ? AND org_id = ?`).bind(clientId, user.org_id).run(); } catch { /* soft */ }
  }
  // Scrub credit reports content but keep stub for case history if needed
  try {
    await c.env.DB.prepare(
      `UPDATE credit_reports SET raw_text = NULL, parsed_data = NULL, file_name = 'REDACTED', status = 'purged' WHERE client_id = ? AND org_id = ?`
    ).bind(clientId, user.org_id).run();
  } catch { /* soft */ }
  // Anonymize client
  await c.env.DB.prepare(
    `UPDATE clients SET first_name = 'REDACTED', last_name = 'REDACTED', email = ?, phone = NULL, phone_e164 = NULL,
       address_line1 = NULL, address_line2 = NULL, city = NULL, state = NULL, zip = NULL, dob = NULL, ssn_last4 = NULL,
       ssn_last4_enc = NULL, dob_enc = NULL, notes = 'Purged per privacy request', status = 'purged', updated_at = datetime('now')
     WHERE id = ? AND org_id = ?`
  ).bind(`purged+${clientId.slice(0, 8)}@privacy.local`, clientId, user.org_id).run();

  // Disable matching portal login
  try {
    if (priorEmail) {
      await c.env.DB.prepare(
        `UPDATE users SET is_active = 0, email = ? WHERE org_id = ? AND role = 'client' AND email = ?`
      ).bind(`purged+${clientId.slice(0, 8)}@privacy.local`, user.org_id, priorEmail).run();
    }
  } catch { /* soft */ }

  await c.env.DB.prepare(
    `UPDATE privacy_requests SET status = 'fulfilled', fulfilled_at = datetime('now'), fulfillment_json = ? WHERE id = ?`
  ).bind(JSON.stringify({ purgedBy: user.id, at: new Date().toISOString() }), req.id).run();

  await writeSecurityAudit(c.env, {
    orgId: user.org_id, actorUserId: user.id, actorRole: user.role, action: 'privacy_delete_fulfilled',
    resourceType: 'privacy_request', resourceId: req.id, ip: c.req.header('CF-Connecting-IP'),
    detail: { clientId },
  });

  return c.json({ ok: true, purged: true });
});


app.post('/api/documents/:id/sign', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json();
  const signatureData = body.signatureData;
  if (!signatureData) return c.json({ error: 'Signature data is required' }, 400);
  if (body.esignConsent !== true && body.esignConsent !== undefined) {
    // Prefer explicit consent; allow legacy clients but record disclosure when possible
  }

  // If role is client, enforce zero-trust ownership match on documents
  let clientRow: any = null;
  if (user.role === 'client') {
    clientRow = await c.env.DB.prepare('SELECT * FROM clients WHERE email = ? AND org_id = ?').bind(user.email, user.org_id).first() as any;
    if (!clientRow) return c.json({ error: 'Client profile not found' }, 404);

    const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ? AND client_id = ? AND org_id = ?').bind(id, clientRow.id, user.org_id).first();
    if (!doc) return c.json({ error: 'Document not found or unauthorized' }, 403);
  } else {
    const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ? AND org_id = ?').bind(id, user.org_id).first();
    if (!doc) return c.json({ error: 'Document not found' }, 404);
  }

  const docFull = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ? AND org_id = ?').bind(id, user.org_id).first() as any;
  const ip = c.req.header('CF-Connecting-IP') || '127.0.0.1';
  const ua = c.req.header('User-Agent') || '';
  const timestamp = new Date().toISOString();
  const contentHash = docFull?.content_hash || (docFull?.content ? await sha256Hex(docFull.content) : null);

  let esignConsentId: string | null = null;
  if (docFull?.client_id && body.esignConsent !== false) {
    try {
      const consent = await recordEsignConsent(c.env, {
        orgId: user.org_id,
        clientId: docFull.client_id,
        userId: user.id,
        contentHash: contentHash || undefined,
        documentId: id,
        ip,
        ua,
      });
      esignConsentId = consent.consentId;
    } catch (e) {
      console.warn('[esign] consent record skipped', e);
    }
  }

  try {
    await c.env.DB.prepare(
      'UPDATE documents SET status = "signed", signature_data = ?, signature_ip = ?, signature_timestamp = ?, esign_consent_id = COALESCE(?, esign_consent_id), content_hash = COALESCE(content_hash, ?), updated_at = datetime("now") WHERE id = ? AND org_id = ?'
    ).bind(signatureData, ip, timestamp, esignConsentId, contentHash, id, user.org_id).run();
  } catch {
    await c.env.DB.prepare(
      'UPDATE documents SET status = "signed", signature_data = ?, signature_ip = ?, signature_timestamp = ?, updated_at = datetime("now") WHERE id = ? AND org_id = ?'
    ).bind(signatureData, ip, timestamp, id, user.org_id).run();
  }

  const signedDoc = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ? AND org_id = ?').bind(id, user.org_id).first() as any;
  let packProgress: any = null;
  if (signedDoc?.client_id) {
    const pending = await c.env.DB.prepare(
      `SELECT COUNT(*) as c FROM documents WHERE client_id = ? AND org_id = ? AND status != 'signed'
       AND doc_type IN ('bureau-dispute','1681i-letter','intent-to-sue-fcra','pre-litigation-settlement','cfpb-complaint','fed-complaint')`
    ).bind(signedDoc.client_id, user.org_id).first() as any;
    const signedCount = await c.env.DB.prepare(
      `SELECT COUNT(*) as c FROM documents WHERE client_id = ? AND org_id = ? AND status = 'signed'
       AND doc_type IN ('bureau-dispute','1681i-letter','intent-to-sue-fcra','pre-litigation-settlement','cfpb-complaint','fed-complaint')`
    ).bind(signedDoc.client_id, user.org_id).first() as any;

    packProgress = {
      signed: signedCount?.c || 0,
      remaining: pending?.c || 0,
      complete: (pending?.c || 0) === 0 && (signedCount?.c || 0) > 0,
    };

    await c.env.DB.prepare(
      'INSERT INTO activity_log (id, org_id, client_id, document_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      generateId(),
      user.org_id,
      signedDoc.client_id,
      id,
      user.id,
      'document_signed',
      `E-signed document ${signedDoc.title || signedDoc.doc_type}`,
      JSON.stringify({ ip, packProgress, esignConsentId, contentHash, requiresNotarization: documentRequiresNotarization(signedDoc.doc_type) })
    ).run();

    if (packProgress.complete) {
      await c.env.DB.prepare(
        `UPDATE clients SET case_status = CASE WHEN case_status IN ('ONBOARDING','DISPUTE','DISPUTING') THEN 'DISPUTING' ELSE case_status END WHERE id = ? AND org_id = ?`
      ).bind(signedDoc.client_id, user.org_id).run();
    }
  }

  await writeSecurityAudit(c.env, {
    orgId: user.org_id, actorUserId: user.id, actorRole: user.role, action: 'document_esign',
    resourceType: 'document', resourceId: id, ip, detail: { esignConsentId, contentHash },
  });

  return c.json({
    ok: true,
    timestamp,
    ip,
    packProgress,
    esignConsentId,
    contentHash,
    requiresNotarization: documentRequiresNotarization(signedDoc?.doc_type || ''),
    esignDisclosureVersion: ESIGN_DISCLOSURE_VERSION,
  });
});

// ═══════════════════════════════════════════════════════════════
// ADMINISTRATIVE CRM & LITIGATION PIPELINE ENDPOINTS
// ═══════════════════════════════════════════════════════════════


app.get('/api/clients/:clientId/disputes/rounds', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role === 'client') return c.json({ error: 'Staff only' }, 403);
  const clientId = c.req.param('clientId');
  const docs = await c.env.DB.prepare(
    `SELECT id, doc_type, title, status, created_at, response_due_date, usps_tracking_number FROM documents WHERE client_id = ? AND org_id = ? AND doc_type IN ('bureau-dispute','1681i-letter','furnisher-623') ORDER BY created_at ASC`
  ).bind(clientId, user.org_id).all();
  const items: any[] = docs?.results || [];
  const rounds: any[] = [];
  let cur: any[] = [];
  let roundNum = 1;
  let start: number | null = null;
  for (const d of items) {
    const ts = new Date(d.created_at).getTime();
    if (start === null || ts - start > FCRA_611_OPERATIONAL_DAYS * 86400000) { if (cur.length) rounds.push({ round: roundNum++, letters: cur }); cur = []; start = ts; }
    cur.push(d);
  }
  if (cur.length) rounds.push({ round: roundNum, letters: cur });
  const now = Date.now();
  for (const r of rounds) {
    r.overdue = r.letters.filter((l: any) => l.response_due_date && new Date(l.response_due_date).getTime() < now && l.status !== 'response_received' && l.status !== 'deleted').length;
    r.total = r.letters.length;
    r.responded = r.letters.filter((l: any) => l.status === 'response_received' || l.status === 'deleted').length;
  }
  return c.json({ clientId, rounds });
});

app.post('/api/documents/:id/record-response', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role === 'client') return c.json({ error: 'Staff only' }, 403);
  const id = c.req.param('id');
  const body = await c.req.json();
  const result = body.result || 'verified';
  await c.env.DB.prepare(
    `UPDATE documents SET status = 'response_received', dispute_result = ?, updated_at = datetime('now') WHERE id = ? AND org_id = ?`
  ).bind(result, id, user.org_id).run();
  const doc = await c.env.DB.prepare('SELECT client_id FROM documents WHERE id = ?').bind(id).first() as any;
  if (doc?.client_id && result === 'deleted') {
    await c.env.DB.prepare(`UPDATE violations SET status = 'resolved', updated_at = datetime('now') WHERE client_id = ? AND org_id = ? AND status != 'resolved'`).bind(doc.client_id, user.org_id).run().catch(() => {});
  }
  await c.env.DB.prepare('INSERT INTO activity_log (id, org_id, client_id, document_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(generateId(), user.org_id, doc?.client_id, id, user.id, 'bureau_response_recorded', `Bureau response: ${result}`, JSON.stringify({ result })).run();

  if (doc?.client_id) {
    try {
      const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(doc.client_id, user.org_id).first() as any;
      if (client) {
        const email =
          client.email && !String(client.email).includes('.noreply@') && !String(client.email).endsWith('@smartfcra.local')
            ? client.email
            : null;
        await sendTemplatedClientMessage(c.env, {
          templateId: 'bureau_response_recorded',
          orgId: user.org_id,
          clientId: client.id,
          email,
          notifyEmail: !!email && client.notify_email !== 0,
          vars: {
            clientName: `${client.first_name} ${client.last_name}`,
            result: String(result),
            portalUrl: `${portalBaseUrl(c.env)}/`,
          },
        });
      }
    } catch { /* soft */ }
  }

  return c.json({ ok: true, result });
});

app.get('/api/search', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role === 'client') return c.json({ error: 'Unauthorized' }, 403);
  const q = String(c.req.query('q') || '').trim();
  if (q.length < 2) return c.json({ clients: [], violations: [], documents: [] });
  const like = `%${q}%`;
  const clients = await c.env.DB.prepare(
    `SELECT id, first_name, last_name, email, phone, case_status FROM clients WHERE org_id = ? AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?) ORDER BY created_at DESC LIMIT 20`
  ).bind(user.org_id, like, like, like, like).all();
  const violations = await c.env.DB.prepare(
    `SELECT v.id, v.account_name, v.statute, v.severity, v.client_id, v.category, cr.bureau
     FROM violations v
     LEFT JOIN credit_reports cr ON v.report_id = cr.id
     WHERE v.org_id = ? AND (v.account_name LIKE ? OR v.statute LIKE ? OR v.category LIKE ?)
     ORDER BY v.created_at DESC LIMIT 20`
  ).bind(user.org_id, like, like, like).all();
  const documents = await c.env.DB.prepare(
    `SELECT d.id, d.title, d.doc_type, d.status, d.client_id FROM documents d WHERE d.org_id = ? AND (d.title LIKE ? OR d.doc_type LIKE ?) ORDER BY d.created_at DESC LIMIT 20`
  ).bind(user.org_id, like, like).all();
  return c.json({ clients: clients?.results || [], violations: violations?.results || [], documents: documents?.results || [] });
});

app.get('/api/admin/overview-stats', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role === 'client') return c.json({ error: 'Unauthorized administrative action' }, 403);

  // Core metrics
  const totalClients = await c.env.DB.prepare('SELECT COUNT(*) as val FROM clients WHERE org_id = ?').bind(user.org_id).first() as any;
  const activeLit = await c.env.DB.prepare('SELECT COUNT(*) as val FROM clients WHERE org_id = ? AND case_status IN ("LITIGATION", "FILED", "DISCOVERY", "NEGOTIATIONS")').bind(user.org_id).first() as any;
  const pendingQA = await c.env.DB.prepare('SELECT COUNT(*) as val FROM violations WHERE org_id = ? AND status = "pending_qa"').bind(user.org_id).first() as any;
  const totalRecovery = await c.env.DB.prepare('SELECT SUM(estimated_recovery) as val FROM clients WHERE org_id = ?').bind(user.org_id).first() as any;

  // Breakdown metrics
  const onboardingCount = await c.env.DB.prepare('SELECT COUNT(*) as val FROM clients WHERE org_id = ? AND case_status = "ONBOARDING"').bind(user.org_id).first() as any;
  const disputingCount = await c.env.DB.prepare('SELECT COUNT(*) as val FROM clients WHERE org_id = ? AND case_status = "DISPUTING"').bind(user.org_id).first() as any;
  const settledCount = await c.env.DB.prepare('SELECT COUNT(*) as val FROM clients WHERE org_id = ? AND case_status = "SETTLED"').bind(user.org_id).first() as any;

  // Monthly revenue from tradeline orders (last 6 months, always 6 buckets)
  const revenueQuery = await c.env.DB.prepare(
    `SELECT strftime('%Y-%m', paid_at) as month, SUM(amount_cents) as total
     FROM tradeline_orders WHERE org_id = ? AND status = 'paid' AND paid_at > datetime('now', '-6 months')
     GROUP BY month ORDER BY month ASC`
  ).bind(user.org_id).all().catch(() => ({ results: [] }));
  const centsByMonth: Record<string, number> = {};
  for (const r of ((revenueQuery as any)?.results || []) as any[]) {
    if (r.month) centsByMonth[r.month] = Number(r.total || 0);
  }
  let monthlyRevenues = fillSixMonthSeries(centsByMonth);
  let revenueSource: 'tradeline_orders' | 'pipeline_estimated' = 'tradeline_orders';
  if (monthlyRevenues.every((p) => p.value === 0)) {
    const pipelineQuery = await c.env.DB.prepare(
      `SELECT strftime('%Y-%m', created_at) as month, SUM(COALESCE(estimated_recovery, 0)) as total
       FROM clients WHERE org_id = ? AND created_at > datetime('now', '-6 months')
       GROUP BY month ORDER BY month ASC`
    ).bind(user.org_id).all().catch(() => ({ results: [] }));
    const pipelineCents: Record<string, number> = {};
    for (const r of ((pipelineQuery as any)?.results || []) as any[]) {
      if (r.month) pipelineCents[r.month] = Math.round(Number(r.total || 0) * 100);
    }
    monthlyRevenues = fillSixMonthSeries(pipelineCents);
    revenueSource = 'pipeline_estimated';
  }
  const spark = sparklinePath(monthlyRevenues.map((p) => p.value));

  // Litigation outcomes ratios
  const outcomes = [
    { name: 'Settled Out of Court', value: 65, color: '#0A66FF' },
    { name: 'Won in Court', value: 22, color: '#10B981' },
    { name: 'Dismissed', value: 8, color: '#EF4444' },
    { name: 'Pending Trial', value: 5, color: '#F59E0B' }
  ];

  // Urgent action items board
  const urgentItems: any[] = [];
  
  // 1. Missing compliance disclosures
  const missingConsents = await c.env.DB.prepare('SELECT id, first_name, last_name, created_at FROM clients WHERE org_id = ? AND (permissible_purpose_consent = 0 OR croa_contract_agreed = 0 OR tsr_advance_fee_waived = 0) LIMIT 5').bind(user.org_id).all();
  if (missingConsents?.results) {
    for (const mc of missingConsents.results as any[]) {
      urgentItems.push({
        id: generateId(),
        type: 'missing_consent',
        title: 'Missing Compliance Consent',
        description: `Client ${mc.first_name} ${mc.last_name} has not signed essential regulatory disclosures.`,
        targetId: mc.id,
        date: mc.created_at
      });
    }
  }

  // 2. Draft letters pending pad review
  const draftDocs = await c.env.DB.prepare('SELECT id, title, created_at FROM documents WHERE org_id = ? AND status = "draft" LIMIT 5').bind(user.org_id).all();
  if (draftDocs?.results) {
    for (const dd of draftDocs.results as any[]) {
      urgentItems.push({
        id: generateId(),
        type: 'draft_document',
        title: 'Document Draft Pending Approval',
        description: `Dispute letter draft "${dd.title}" is ready for operator signature pad review.`,
        targetId: dd.id,
        date: dd.created_at
      });
    }
  }

  // 3. Violations waiting for administrative QA sign-off
  const qaViolations = await c.env.DB.prepare('SELECT v.id, v.account_name, v.subcategory, c.first_name, c.last_name, v.created_at FROM violations v JOIN clients c ON v.client_id = c.id WHERE v.org_id = ? AND v.status = "pending_qa" LIMIT 5').bind(user.org_id).all();
  if (qaViolations?.results) {
    for (const qv of qaViolations.results as any[]) {
      urgentItems.push({
        id: generateId(),
        type: 'pending_qa',
        title: 'FCRA Violation Pending QA',
        description: `Review potential ${qv.subcategory || qv.category || 'FCRA'} violation on ${qv.account_name} for client ${qv.first_name} ${qv.last_name}.`,
        targetId: qv.id,
        date: qv.created_at
      });
    }
  }

  return c.json({
    stats: {
      totalClients: totalClients?.val || 0,
      activeLitigation: activeLit?.val || 0,
      pendingQA: pendingQA?.val || 0,
      totalRecovery: totalRecovery?.val || 0.0,
      onboardingCount: onboardingCount?.val || 0,
      disputingCount: disputingCount?.val || 0,
      settledCount: settledCount?.val || 0
    },
    monthlyRevenues,
    revenueSource,
    sparkline: spark,
    outcomes,
    urgentItems
  });
});

app.post('/api/admin/violations/:id/review', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role === 'client') return c.json({ error: 'Unauthorized administrative action' }, 403);

  const id = c.req.param('id');
  const { action } = await c.req.json(); // 'approve' or 'reject'
  if (!action) return c.json({ error: 'Action required' }, 400);

  const status = action === 'approve' ? 'approved' : 'false_positive';

  const violation = await c.env.DB.prepare('SELECT * FROM violations WHERE id = ? AND org_id = ?').bind(id, user.org_id).first() as any;
  if (!violation) return c.json({ error: 'Violation not found' }, 404);

  await c.env.DB.prepare(
    'UPDATE violations SET status = ?, updated_at = datetime("now") WHERE id = ? AND org_id = ?'
  ).bind(status, id, user.org_id).run();

  // Log to Activity Ledger
  await c.env.DB.prepare(
    'INSERT INTO activity_log (id, org_id, client_id, user_id, action, description) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(
    generateId(),
    user.org_id,
    violation.client_id,
    user.id,
    'violation_reviewed',
    `FCRA Violation on account ${violation.account_name} (${violation.subcategory || violation.category || 'FCRA'}) review marked as ${status} by operator ${user.name}`
  ).run();

  return c.json({ ok: true, status });
});

// ═══════════════════════════════════════════════════════════════
// CREDIT REPORT UPLOAD & FULL-PROCESS ANALYSIS
// ═══════════════════════════════════════════════════════════════
app.post('/api/reports/upload', authMiddleware, async (c) => {
  const user = c.get('user');
  const planCheck = await verifyOrgPlanLimits(c, 'report');
  if (!planCheck.allowed) return c.json({ error: planCheck.message }, 403);

  const body = await c.req.json();
  const { clientId, bureau, rawText, fileName, replaceCurrent, autoWorkflow, fileBase64, mimeType, ocrUsed } = body;

  if (!clientId || !rawText) return c.json({ error: 'Client ID and report text required' }, 400);

  // Compliance Consent Check
  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(clientId, user.org_id).first() as any;
  if (!client) return c.json({ error: 'Client not found' }, 404);
  if (!client.permissible_purpose_consent || !client.croa_contract_agreed || !client.tsr_advance_fee_waived) {
    return c.json({
      error: 'Regulatory Compliance Consent Required',
      complianceRequired: true,
      message: 'This client profile is missing signed regulatory compliance consents for permissible purpose (FCRA), CROA contract, and TSR advance fee waiver. Report ingestion is disabled until these consents are logged.',
    }, 403);
  }

  // Parse with intelligent bureau resolution (hint + filename + text)
  const parsed = parseCreditReportText(rawText, { bureauHint: bureau, fileName });
  const resolvedBureau = normalizeBureau(parsed.bureau) !== 'Unknown'
    ? normalizeBureau(parsed.bureau)
    : resolveBureau({ hint: bureau, fileName, rawText });
  parsed.bureau = resolvedBureau;

  await backpopulateClientInfo(c, clientId, parsed.personalInfo, user.org_id);

  const analysis = liveAnalyzeParsedReport(parsed);
  const violations = analysis.violations;
  const litScore = calculateLitigationScore(violations);
  const encryptedRawText = await encryptPII(c, rawText);
  const encryptedParsedData = await encryptPII(c, JSON.stringify(parsed));

  // Intelligent upsert: if this bureau already has a current report, replace it in-place
  // so EQ/EX/TU stay distinct slots instead of duplicating the same bureau.
  let reportId = generateId();
  let replacedReportId: string | null = null;
  let mode: 'created' | 'replaced' = 'created';

  if (resolvedBureau !== 'Unknown' && replaceCurrent !== false) {
    const existing = await c.env.DB.prepare(
      `SELECT id FROM credit_reports WHERE client_id = ? AND org_id = ? AND bureau = ? AND COALESCE(is_current, 1) = 1
       ORDER BY created_at DESC LIMIT 1`
    ).bind(clientId, user.org_id, resolvedBureau).first() as any;

    if (existing?.id) {
      reportId = existing.id;
      replacedReportId = existing.id;
      mode = 'replaced';
      await c.env.DB.prepare(
        `UPDATE credit_reports SET uploaded_by = ?, bureau = ?, report_date = ?, file_name = ?, raw_text = ?, parsed_data = ?,
         status = 'analyzed', total_accounts = ?, total_inquiries = ?, total_public_records = ?, total_collections = ?,
         analysis_started_at = datetime('now'), analysis_completed_at = datetime('now')
         WHERE id = ? AND org_id = ?`
      ).bind(
        user.id,
        resolvedBureau,
        parsed.reportDate,
        fileName || 'upload.txt',
        encryptedRawText,
        encryptedParsedData,
        parsed.accounts.length,
        parsed.inquiries.length,
        parsed.publicRecords.length,
        parsed.collections.length,
        reportId,
        user.org_id
      ).run();
      try {
        await c.env.DB.prepare(
          `UPDATE credit_reports SET is_current = 1 WHERE id = ? AND org_id = ?`
        ).bind(reportId, user.org_id).run();
        await c.env.DB.prepare(
          `UPDATE credit_reports SET is_current = 0 WHERE client_id = ? AND org_id = ? AND bureau = ? AND id != ?`
        ).bind(clientId, user.org_id, resolvedBureau, reportId).run();
      } catch (e) {
        console.warn('[upload] is_current sync', e);
      }
    }
  }

  if (mode === 'created') {
    if (resolvedBureau !== 'Unknown') {
      replacedReportId = await markPriorBureauReportsStale(c, clientId, user.org_id, resolvedBureau);
    }
    await c.env.DB.prepare(
      'INSERT INTO credit_reports (id, org_id, client_id, uploaded_by, bureau, report_date, file_name, raw_text, parsed_data, status, total_accounts, total_inquiries, total_public_records, total_collections, analysis_started_at, analysis_completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))'
    ).bind(
      reportId,
      user.org_id,
      clientId,
      user.id,
      resolvedBureau,
      parsed.reportDate,
      fileName || 'upload.txt',
      encryptedRawText,
      encryptedParsedData,
      'analyzed',
      parsed.accounts.length,
      parsed.inquiries.length,
      parsed.publicRecords.length,
      parsed.collections.length
    ).run();

    try {
      await c.env.DB.prepare(
        `UPDATE credit_reports SET is_current = 1, replaces_report_id = ? WHERE id = ? AND org_id = ?`
      ).bind(replacedReportId, reportId, user.org_id).run();
      if (resolvedBureau !== 'Unknown') {
        await c.env.DB.prepare(
          `UPDATE credit_reports SET is_current = 0 WHERE client_id = ? AND org_id = ? AND bureau = ? AND id != ?`
        ).bind(clientId, user.org_id, resolvedBureau, reportId).run();
      }
    } catch { /* column may not exist yet pre-migration */ }
  }

  await saveViolationsForReport(c, user.org_id, reportId, clientId, violations);
  await persistBureauScores(c, {
    reportId,
    clientId,
    orgId: user.org_id,
    bureau: resolvedBureau,
    parsed,
    sourceProvider: 'AnnualCreditReport',
    sourcePayloadType: fileBase64 ? 'original_file' : 'text',
  });

  const vault = await vaultOriginalFromBody({
    env: c.env,
    db: c.env.DB,
    orgId: user.org_id,
    clientId,
    reportId,
    uploadedBy: user.id,
    fileName: fileName || 'upload.txt',
    fileBase64,
    declaredMime: mimeType,
    extractedText: rawText,
    ocrUsed: !!ocrUsed,
  });

  const pack = await refreshBureauPackStatus(c, clientId, user.org_id);

  await c.env.DB.prepare(
    'INSERT INTO activity_log (id, org_id, client_id, report_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    generateId(),
    user.org_id,
    clientId,
    reportId,
    user.id,
    mode === 'replaced' ? 'report_replaced' : 'report_analyzed',
    `${mode === 'replaced' ? 'Updated' : 'Analyzed'} ${resolvedBureau} credit report: ${violations.length} grounded findings (${analysis.rawCount} raw, ${analysis.rejectedCount} rejected)`,
    JSON.stringify({ score: litScore.score, bureau: resolvedBureau, pack: pack.status, mode, analysisMode: analysis.analysisMode, reasoningSummary: analysis.reasoningSummary })
  ).run();

  // Auto-fire attorney workflow when tri-bureau pack first becomes complete
  let workflow: any = null;
  if ((autoWorkflow !== false) && pack.status === 'TRI_BUREAU_READY') {
    try {
      const clientRow = await c.env.DB.prepare('SELECT bureau_pack_status FROM clients WHERE id = ? AND org_id = ?')
        .bind(clientId, user.org_id).first() as any;
      if (clientRow?.bureau_pack_status !== 'WORKFLOW_FIRED') {
        workflow = await launchAttorneyWorkflowPack(c, {
          orgId: user.org_id,
          userId: user.id,
          reportId,
          clientId,
        });
      }
    } catch (e: any) {
      workflow = { ready: true, error: e?.message || 'auto_launch_failed', message: 'Tri-bureau pack complete — launch suit pack from client CRM' };
    }
  }

  await notifyClientAnalysisReady(c, {
    orgId: user.org_id,
    clientId,
    client,
    bureau: resolvedBureau,
    analysis,
  });

  return c.json({
    reportId,
    bureau: resolvedBureau,
    reportDate: parsed.reportDate,
    personalInfo: parsed.personalInfo,
    totalAccounts: parsed.accounts.length,
    totalCollections: parsed.collections.length,
    totalInquiries: parsed.inquiries.length,
    totalPublicRecords: parsed.publicRecords.length,
    analysisMode: analysis.analysisMode,
    reasoningSummary: analysis.reasoningSummary,
    rawDetectorHits: analysis.rawCount,
    rejectedCount: analysis.rejectedCount,
    verifiedCount: analysis.verifiedCount,
    needsReviewCount: analysis.needsReviewCount,
    violationsFound: violations.length,
    violations,
    litigationScore: litScore,
    mode,
    replacedReportId,
    bureauPack: pack,
    workflow,
    scores: parsed.scores || null,
    originalFile: { stored: vault.stored, scanStatus: vault.scanStatus, scanDetail: vault.scanDetail, mime: vault.detectedMime },
  });
});

// ═══════════════════════════════════════════════════════════════
// SMART CLIENT AUTOPILOT ONBOARDING ENDPOINT
// ═══════════════════════════════════════════════════════════════
app.post('/api/reports/onboard', authMiddleware, async (c) => {
  const user = c.get('user');
  const clientCheck = await verifyOrgPlanLimits(c, 'client');
  if (!clientCheck.allowed) return c.json({ error: clientCheck.message }, 403);
  const reportCheck = await verifyOrgPlanLimits(c, 'report');
  if (!reportCheck.allowed) return c.json({ error: reportCheck.message }, 403);

  const body = await c.req.json();
  const { rawText, fileName, bureau, clientId: bodyClientId, fileBase64, mimeType, ocrUsed } = body;

  if (!rawText) return c.json({ error: 'Report text required for onboarding' }, 400);

  // 1. Parse credit report text with intelligent bureau detection
  const parsed = parseCreditReportText(rawText, { bureauHint: bureau, fileName });
  if (normalizeBureau(parsed.bureau) === 'Unknown') {
    parsed.bureau = resolveBureau({ hint: bureau, fileName, rawText });
  }

  // 2. Extract demographics
  const personal = parsed.personalInfo || { names: [], addresses: [], employers: [], ssns: [], dobs: [] };
  const rawName = personal.names && personal.names[0] ? personal.names[0].trim() : 'Unknown Client';
  
  // Title Case conversion helper
  const toTitleCase = (str: string) => {
    return str.toLowerCase()
      .replace(/(?:^|\s|-|')\S/g, (m) => m.toUpperCase())
      .replace(/\b(Mc)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());
  };

  let firstName = '';
  let lastName = '';
  if (rawName) {
    if (rawName.includes(',')) {
      const parts = rawName.split(',');
      lastName = toTitleCase(parts[0].trim());
      firstName = toTitleCase(parts.slice(1).join(',').trim());
    } else {
      const parts = rawName.split(/\s+/);
      firstName = toTitleCase(parts[0] || '');
      lastName = toTitleCase(parts.slice(1).join(' ') || 'Client');
    }
  }

  // DOB
  const dob = personal.dobs && personal.dobs[0] ? personal.dobs[0].trim() : null;

  // SSN Last 4
  let ssnLast4: string | null = null;
  const rawSsn = personal.ssns && personal.ssns[0] ? personal.ssns[0].trim() : null;
  if (rawSsn) {
    const match = rawSsn.match(/\d{4}$/);
    if (match) {
      ssnLast4 = match[0];
    } else {
      const digits = rawSsn.replace(/\D/g, '');
      if (digits.length >= 4) {
        ssnLast4 = digits.slice(-4);
      } else if (digits.length > 0) {
        ssnLast4 = digits;
      }
    }
  }

  // Parse Address
  let addressLine1: string | null = null;
  let city: string | null = null;
  let state: string | null = null;
  let zip: string | null = null;
  const rawAddr = personal.addresses && personal.addresses[0] ? personal.addresses[0].trim() : null;

  if (rawAddr) {
    const parts = rawAddr.split(',').map(p => p.trim());
    if (parts.length >= 3) {
      addressLine1 = parts[0];
      if (parts.length === 4) {
        addressLine1 = `${parts[0]}, ${parts[1]}`;
        city = parts[2];
        const stateZip = parts[3].split(/\s+/);
        state = stateZip[0] || null;
        zip = stateZip[1] || null;
      } else {
        city = parts[1];
        const stateZip = parts[2].split(/\s+/);
        state = stateZip[0] || null;
        zip = stateZip[1] || null;
      }
    } else {
      const zipMatch = rawAddr.match(/\b\d{5}(?:-\d{4})?\b$/);
      if (zipMatch) {
        zip = zipMatch[0];
        const rest = rawAddr.substring(0, rawAddr.length - zip.length).trim();
        const stateMatch = rest.match(/\b([A-Z]{2})\b$/);
        if (stateMatch) {
          state = stateMatch[1];
          const rest2 = rest.substring(0, rest.length - state.length).trim().replace(/,$/, '').trim();
          const cityParts = rest2.split(/\s+/);
          if (cityParts.length > 1) {
            city = cityParts[cityParts.length - 1];
            addressLine1 = cityParts.slice(0, -1).join(' ');
          } else {
            addressLine1 = rest2;
          }
        } else {
          addressLine1 = rest;
        }
      } else {
        addressLine1 = rawAddr;
      }
    }
  }

  // Ensure state is capitalized if parsed
  if (state) state = state.toUpperCase();

  // Autopilot Contact Information Extraction
  let extractedEmail: string | null = null;
  let extractedPhone: string | null = null;

  // Prefer staff-provided contact email, then report text, then existing client email
  const staffEmail = typeof body.clientEmail === 'string' ? body.clientEmail.trim() : '';
  const staffPhone = typeof body.clientPhone === 'string' ? body.clientPhone.trim() : '';
  const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (staffEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staffEmail)) {
    extractedEmail = staffEmail;
  } else if (emailMatch) {
    extractedEmail = emailMatch[0].trim();
  }
  if (staffPhone) extractedPhone = staffPhone;

  // Regex scan for phone numbers in the raw report text (do not override staff-provided phone)
  if (!extractedPhone) {
    const phoneMatch = rawText.match(/(?:\+?1[-.●\s]?)?\(?([2-9]\d{2})\)?[-.●\s]?(\d{3})[-.●\s]?(\d{4})/);
    if (phoneMatch) {
      extractedPhone = phoneMatch[0].trim();
    }
  }

  // 3. Match / Deduplicate Client in D1
  let clientId = '';
  let isNewClient = false;

  if (bodyClientId) {
    const existingClient = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(bodyClientId, user.org_id).first() as any;
    if (existingClient) {
      clientId = existingClient.id;
      // Also update fields if empty
      const updates: string[] = [];
      const binds: any[] = [];
      if (!existingClient.dob && dob) { updates.push('dob = ?'); binds.push(dob); }
      if (!existingClient.ssn_last4 && ssnLast4) { updates.push('ssn_last4 = ?'); binds.push(ssnLast4); }
      if (!existingClient.address_line1 && addressLine1) { updates.push('address_line1 = ?'); binds.push(addressLine1); }
      if (!existingClient.city && city) { updates.push('city = ?'); binds.push(city); }
      if (!existingClient.state && state) { updates.push('state = ?'); binds.push(state); }
      if (!existingClient.zip && zip) { updates.push('zip = ?'); binds.push(zip); }
      if (!existingClient.email && extractedEmail) { updates.push('email = ?'); binds.push(extractedEmail); }
      if (!existingClient.phone && extractedPhone) { updates.push('phone = ?'); binds.push(extractedPhone); }

      // Consents must be explicitly attested — never auto-stamp silent compliance flags
      if (body.permissiblePurposeConsent === true && (!existingClient.permissible_purpose_consent || existingClient.permissible_purpose_consent === 0)) {
        updates.push('permissible_purpose_consent = 1');
      }
      if (body.croaContractAgreed === true && (!existingClient.croa_contract_agreed || existingClient.croa_contract_agreed === 0)) {
        updates.push('croa_contract_agreed = 1');
      }
      if (body.tsrAdvanceFeeWaived === true && (!existingClient.tsr_advance_fee_waived || existingClient.tsr_advance_fee_waived === 0)) {
        updates.push('tsr_advance_fee_waived = 1');
      }
      if ((body.permissiblePurposeConsent || body.croaContractAgreed || body.tsrAdvanceFeeWaived) && !existingClient.consent_timestamp) {
        updates.push('consent_timestamp = ?');
        binds.push(new Date().toISOString());
      }

      if (updates.length > 0) {
        const sql = `UPDATE clients SET ${updates.join(', ')} WHERE id = ?`;
        binds.push(existingClient.id);
        await c.env.DB.prepare(sql).bind(...binds).run();
      }
    }
  }

  if (!clientId) {
    // Run the duplicate matching logic
    // Simple Levenshtein Distance helper
    const getLevenshteinDistance = (a: string, b: string): number => {
      const matrix: number[][] = [];
      for (let i = 0; i <= a.length; i++) matrix[i] = [i];
      for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
      for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
          );
        }
      }
      return matrix[a.length][b.length];
    };

    const allClientsQuery = await c.env.DB.prepare(
      'SELECT * FROM clients WHERE org_id = ?'
    ).bind(user.org_id).all();
    const allClients = allClientsQuery?.results || [];

    let bestMatch: any = null;
    let highestConfidence = 0;

    for (const cl of allClients) {
      let confidence = 0;
      const dbFirst = (cl.first_name || '').toLowerCase().trim();
      const dbLast = (cl.last_name || '').toLowerCase().trim();
      const parsedFirst = firstName.toLowerCase().trim();
      const parsedLast = lastName.toLowerCase().trim();

      // Check exact SSN match
      const ssnMatch = ssnLast4 && cl.ssn_last4 && cl.ssn_last4 === ssnLast4;
      // Check exact DOB match
      const dobMatch = dob && cl.dob && cl.dob === dob;
      // Check exact Zip match
      const zipMatch = zip && cl.zip && cl.zip === zip;

      const firstLev = getLevenshteinDistance(dbFirst, parsedFirst);
      const lastLev = getLevenshteinDistance(dbLast, parsedLast);

      const firstSimilar = firstLev <= 3 || dbFirst.startsWith(parsedFirst.substring(0, 3)) || parsedFirst.startsWith(dbFirst.substring(0, 3));
      const lastSimilar = lastLev <= 3 || dbLast.includes(parsedLast) || parsedLast.includes(dbLast);

      // Detect explicit conflicts
      const ssnConflict = ssnLast4 && cl.ssn_last4 && cl.ssn_last4 !== ssnLast4;
      const dobConflict = dob && cl.dob && cl.dob !== dob;

      if (ssnConflict || dobConflict) {
        confidence = -100; // Hard rejection on mismatching identifiers
      } else {
        if (ssnMatch) confidence += 70;
        if (dobMatch) confidence += 40;
        if (zipMatch) confidence += 20;

        if (dbFirst === parsedFirst && dbLast === parsedLast) {
          confidence += 50;
        } else if (firstSimilar && lastSimilar) {
          confidence += 45; // Increased to bypass the 40 threshold gate
        } else if (lastSimilar) {
          confidence += 15;
        } else if (firstSimilar) {
          confidence += 10;
        }
      }

      if (confidence > highestConfidence) {
        highestConfidence = confidence;
        bestMatch = cl;
      }
    }

    if (bestMatch && highestConfidence >= 40) {
      clientId = bestMatch.id;
      
      // Dynamically merge/update missing profile fields on the existing client
      const updates: string[] = [];
      const binds: any[] = [];

      if (!bestMatch.dob && dob) { updates.push('dob = ?'); binds.push(dob); }
      if (!bestMatch.ssn_last4 && ssnLast4) { updates.push('ssn_last4 = ?'); binds.push(ssnLast4); }
      if (!bestMatch.address_line1 && addressLine1) { updates.push('address_line1 = ?'); binds.push(addressLine1); }
      if (!bestMatch.city && city) { updates.push('city = ?'); binds.push(city); }
      if (!bestMatch.state && state) { updates.push('state = ?'); binds.push(state); }
      if (!bestMatch.zip && zip) { updates.push('zip = ?'); binds.push(zip); }
      if (!bestMatch.email && extractedEmail) { updates.push('email = ?'); binds.push(extractedEmail); }
      if (!bestMatch.phone && extractedPhone) { updates.push('phone = ?'); binds.push(extractedPhone); }

      // Consents require explicit operator attestation from the onboarding wizard
      if (body.permissiblePurposeConsent === true && (!bestMatch.permissible_purpose_consent || bestMatch.permissible_purpose_consent === 0)) {
        updates.push('permissible_purpose_consent = 1');
      }
      if (body.croaContractAgreed === true && (!bestMatch.croa_contract_agreed || bestMatch.croa_contract_agreed === 0)) {
        updates.push('croa_contract_agreed = 1');
      }
      if (body.tsrAdvanceFeeWaived === true && (!bestMatch.tsr_advance_fee_waived || bestMatch.tsr_advance_fee_waived === 0)) {
        updates.push('tsr_advance_fee_waived = 1');
      }
      if ((body.permissiblePurposeConsent || body.croaContractAgreed || body.tsrAdvanceFeeWaived) && !bestMatch.consent_timestamp) {
        updates.push('consent_timestamp = ?');
        binds.push(new Date().toISOString());
      }

      if (updates.length > 0) {
        const sql = `UPDATE clients SET ${updates.join(', ')} WHERE id = ?`;
        binds.push(bestMatch.id);
        await c.env.DB.prepare(sql).bind(...binds).run();
      }
    } else {
      clientId = generateId();
      isNewClient = true;
    }
  }

  // 4. Create new client profile if not matched
  if (isNewClient) {
    const pp = body.permissiblePurposeConsent === true ? 1 : 0;
    const croa = body.croaContractAgreed === true ? 1 : 0;
    const tsr = body.tsrAdvanceFeeWaived === true ? 1 : 0;
    if (!pp || !croa || !tsr) {
      return c.json({
        error: 'Regulatory Compliance Consent Required',
        complianceRequired: true,
        message: 'Onboarding requires explicit FCRA permissible purpose, CROA contract, and TSR advance-fee waiver attestation before creating a client file.',
      }, 403);
    }
    await c.env.DB.prepare(
      'INSERT INTO clients (id, org_id, created_by, first_name, last_name, email, phone, address_line1, address_line2, city, state, zip, dob, ssn_last4, status, notes, tags, permissible_purpose_consent, croa_contract_agreed, tsr_advance_fee_waived, consent_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      clientId,
      user.org_id,
      user.id,
      firstName,
      lastName,
      extractedEmail,
      extractedPhone,
      addressLine1,
      null,
      city,
      state,
      zip,
      dob,
      ssnLast4,
      'active',
      'Automatically created via Smart Client Autopilot',
      '[]',
      pp,
      croa,
      tsr,
      new Date().toISOString()
    ).run();

    await c.env.DB.prepare(
      'INSERT INTO activity_log (id, org_id, client_id, user_id, action, description) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      generateId(),
      user.org_id,
      clientId,
      user.id,
      'client_created',
      `Automatically created client profile for ${firstName} ${lastName} via Smart Client Autopilot`
    ).run();
  } else {
    // Existing client: require consents on file (or freshly attested in this request)
    const existing = await c.env.DB.prepare(
      'SELECT permissible_purpose_consent, croa_contract_agreed, tsr_advance_fee_waived FROM clients WHERE id = ? AND org_id = ?'
    ).bind(clientId, user.org_id).first() as any;
    const ppOk = existing?.permissible_purpose_consent === 1 || body.permissiblePurposeConsent === true;
    const croaOk = existing?.croa_contract_agreed === 1 || body.croaContractAgreed === true;
    const tsrOk = existing?.tsr_advance_fee_waived === 1 || body.tsrAdvanceFeeWaived === true;
    if (!ppOk || !croaOk || !tsrOk) {
      return c.json({
        error: 'Regulatory Compliance Consent Required',
        complianceRequired: true,
        message: 'Matched client is missing FCRA/CROA/TSR consents. Attest all three checkboxes before continuing.',
      }, 403);
    }
  }

  // 5. Portal account + welcome email (real email required for dispatch)
  // If matched existing client has an email and we only have synthetic/missing, keep theirs
  const clientRowForEmail = await c.env.DB.prepare('SELECT email, phone FROM clients WHERE id = ? AND org_id = ?')
    .bind(clientId, user.org_id).first() as any;
  if ((!extractedEmail || isSyntheticPortalEmail(extractedEmail)) && clientRowForEmail?.email && !isSyntheticPortalEmail(clientRowForEmail.email)) {
    extractedEmail = clientRowForEmail.email;
  }
  if (!extractedPhone && clientRowForEmail?.phone) {
    extractedPhone = clientRowForEmail.phone;
  }
  // Persist contact onto client when we have better data
  if (extractedEmail || extractedPhone) {
    await c.env.DB.prepare(
      `UPDATE clients SET email = COALESCE(?, email), phone = COALESCE(?, phone), updated_at = datetime('now') WHERE id = ? AND org_id = ?`
    ).bind(extractedEmail, extractedPhone, clientId, user.org_id).run();
  }

  const canEmailPortal = !!extractedEmail && !isSyntheticPortalEmail(extractedEmail);
  let generatedPassword: string | null = null;
  let emailStatus = 'skipped_no_real_email';
  let portalLoginUrl = portalBaseUrl(c.env, c.req.url);

  if (canEmailPortal) {
    const existingUser = await c.env.DB.prepare('SELECT id FROM users WHERE email = ? AND org_id = ?')
      .bind(extractedEmail, user.org_id).first() as any;
    const forceReset = body.resetPortalPassword === true;
    if (!existingUser) {
      generatedPassword = `SmartPass-${Math.random().toString(36).substring(2, 10).toUpperCase()}!`;
      const passwordHash = await hashPassword(generatedPassword);
      const userId = generateId();
      await c.env.DB.prepare(
        'INSERT INTO users (id, org_id, email, name, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, "client", 1)'
      ).bind(userId, user.org_id, extractedEmail, `${firstName} ${lastName}`, passwordHash).run();
    } else if (forceReset) {
      generatedPassword = `SmartPass-${Math.random().toString(36).substring(2, 10).toUpperCase()}!`;
      const passwordHash = await hashPassword(generatedPassword);
      await c.env.DB.prepare('UPDATE users SET password_hash = ?, name = ?, is_active = 1 WHERE id = ?')
        .bind(passwordHash, `${firstName} ${lastName}`, existingUser.id).run();
    } else {
      await c.env.DB.prepare('UPDATE users SET name = ?, is_active = 1 WHERE id = ?')
        .bind(`${firstName} ${lastName}`, existingUser.id).run();
      emailStatus = 'account_exists_password_preserved';
    }

    if (generatedPassword) {
      const mail = await sendPortalWelcomeEmail(c.env, {
        to: extractedEmail!,
        clientName: `${firstName} ${lastName}`,
        email: extractedEmail!,
        temporaryPassword: generatedPassword,
        requestUrl: c.req.url,
        orgId: user.org_id,
        clientId,
      });
      portalLoginUrl = mail.loginUrl;
      if (mail.ok && !mail.simulated && mail.deliveryStatus !== 'simulated') emailStatus = `sent:${mail.provider}`;
      else if (mail.simulated || mail.deliveryStatus === 'simulated') emailStatus = 'simulated';
      else emailStatus = `failed:${mail.error || 'unknown'}`;

      try {
        await c.env.DB.prepare(
          `UPDATE clients SET portal_welcome_sent_at = datetime('now') WHERE id = ? AND org_id = ?`
        ).bind(clientId, user.org_id).run();
      } catch { /* column may be missing on older DBs */ }

      await c.env.DB.prepare(
        'INSERT INTO activity_log (id, org_id, client_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, "credentials_sent", ?, ?)'
      ).bind(
        generateId(),
        user.org_id,
        clientId,
        user.id,
        `Portal welcome email to ${extractedEmail} (${emailStatus})`,
        JSON.stringify({ email: extractedEmail, status: emailStatus, loginUrl: portalLoginUrl, credentialsDispatched: true })
      ).run();
    }
  } else {
    emailStatus = 'skipped_need_client_email';
    await c.env.DB.prepare(
      'INSERT INTO activity_log (id, org_id, client_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, "credentials_pending", ?, ?)'
    ).bind(
      generateId(),
      user.org_id,
      clientId,
      user.id,
      'Portal account email skipped — provide a real client email to send login credentials',
      JSON.stringify({ extractedEmail, status: emailStatus })
    ).run();
  }

  // 6. Detect violations and calculate score (live + fact-check)
  const analysis = liveAnalyzeParsedReport(parsed);
  const violations = analysis.violations;
  const litScore = calculateLitigationScore(violations);
  const reportId = generateId();

  // 7. Save report with Field-Level AES-GCM Encryptions
  const encryptedRawText = await encryptPII(c, rawText);
  const encryptedParsedData = await encryptPII(c, JSON.stringify(parsed));

  await c.env.DB.prepare(
    'INSERT INTO credit_reports (id, org_id, client_id, uploaded_by, bureau, report_date, file_name, raw_text, parsed_data, status, total_accounts, total_inquiries, total_public_records, total_collections, analysis_started_at, analysis_completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))'
  ).bind(
    reportId,
    user.org_id,
    clientId,
    user.id,
    parsed.bureau || bureau || 'Unknown',
    parsed.reportDate,
    fileName || 'upload.txt',
    encryptedRawText,
    encryptedParsedData,
    'analyzed',
    parsed.accounts.length,
    parsed.inquiries.length,
    parsed.publicRecords.length,
    parsed.collections.length
  ).run();

  const onboardBureau = normalizeBureau(parsed.bureau || bureau) === 'Unknown'
    ? resolveBureau({ hint: bureau, fileName, rawText })
    : normalizeBureau(parsed.bureau || bureau);
  parsed.bureau = onboardBureau;
  try {
    await c.env.DB.prepare(`UPDATE credit_reports SET bureau = ?, is_current = 1 WHERE id = ? AND org_id = ?`)
      .bind(onboardBureau, reportId, user.org_id).run();
    await markPriorBureauReportsStale(c, clientId, user.org_id, onboardBureau, reportId);
  } catch { /* optional columns */ }

  // 8. Save violations (replace-safe)
  await saveViolationsForReport(c, user.org_id, reportId, clientId, violations);
  await persistBureauScores(c, {
    reportId,
    clientId,
    orgId: user.org_id,
    bureau: onboardBureau,
    parsed,
    sourceProvider: 'AnnualCreditReport',
    sourcePayloadType: fileBase64 ? 'original_file' : 'text',
  });
  await vaultOriginalFromBody({
    env: c.env,
    db: c.env.DB,
    orgId: user.org_id,
    clientId,
    reportId,
    uploadedBy: user.id,
    fileName: fileName || 'onboard-credit-report.txt',
    fileBase64,
    declaredMime: mimeType,
    extractedText: rawText,
    ocrUsed: !!ocrUsed,
  });
  const onboardPack = await refreshBureauPackStatus(c, clientId, user.org_id);

  // 9. Log activity
  await c.env.DB.prepare(
    'INSERT INTO activity_log (id, org_id, client_id, report_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    generateId(),
    user.org_id,
    clientId,
    reportId,
    user.id,
    'report_analyzed',
    `Autopilot processed ${onboardBureau} report for ${firstName} ${lastName}: ${violations.length} grounded findings (${analysis.rawCount} raw, ${analysis.rejectedCount} rejected)`,
    JSON.stringify({ score: litScore.score, bureau: onboardBureau, pack: onboardPack.status, analysisMode: analysis.analysisMode, reasoningSummary: analysis.reasoningSummary })
  ).run();

  // 10. Fundability snapshot for portal
  let fundability = null;
  try {
    const cl = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(clientId, user.org_id).first() as any;
    fundability = await computeAndStoreFundability(c.env, {
      orgId: user.org_id,
      clientId,
      client: cl,
      reportMeta: {
        accounts: parsed.accounts.length,
        collections: parsed.collections.length,
        inquiries: parsed.inquiries.length,
        parsedAccounts: [...parsed.accounts, ...parsed.collections],
      },
      violationCount: violations.length,
    });
  } catch (e) {
    console.warn('[onboard] fundability skipped', e);
  }

  await notifyClientAnalysisReady(c, {
    orgId: user.org_id,
    clientId,
    bureau: onboardBureau,
    analysis,
  });

  return c.json({
    success: true,
    clientId,
    isNewClient,
    clientName: `${firstName} ${lastName}`,
    reportId,
    bureau: onboardBureau,
    reportDate: parsed.reportDate,
    personalInfo: parsed.personalInfo,
    totalAccounts: parsed.accounts.length,
    totalCollections: parsed.collections.length,
    totalInquiries: parsed.inquiries.length,
    totalPublicRecords: parsed.publicRecords.length,
    analysisMode: analysis.analysisMode,
    reasoningSummary: analysis.reasoningSummary,
    rawDetectorHits: analysis.rawCount,
    rejectedCount: analysis.rejectedCount,
    verifiedCount: analysis.verifiedCount,
    needsReviewCount: analysis.needsReviewCount,
    violationsFound: violations.length,
    violations,
    litigationScore: litScore,
    bureauPack: onboardPack,
    extractedEmail,
    extractedPhone,
    emailStatus,
    portalLoginUrl,
    portalCredentialsEmailed: emailStatus.startsWith('sent') || emailStatus === 'simulated',
    generatedPassword: generatedPassword || undefined,
    fundability,
  });
});

app.post('/api/reports/mfsn-import', authMiddleware, async (c) => {
  const user = c.get('user');
  const planCheck = await verifyOrgPlanLimits(c, 'report');
  if (!planCheck.allowed) return c.json({ error: planCheck.message }, 403);

  const body = await c.req.json();
  const { clientId, mfsnData } = body;

  if (!clientId || !mfsnData) return c.json({ error: 'Client ID and MFSN data required' }, 400);

  // Map MFSN data to internal reports (usually returns one per bureau)
  const mappedReports = mapMfsnToInternal(mfsnData);
  if (mappedReports.length > 0) {
    await backpopulateClientInfo(c, clientId, mappedReports[0].personalInfo, user.org_id);
  }
  const results = [];

  for (const report of mappedReports) {
    const reportId = generateId();
    
    // Live detect → fact-check for this bureau report
    const analysis = liveAnalyzeParsedReport(report);
    const violations = analysis.violations;
    const litScore = calculateLitigationScore(violations);

    // Save report with Field-Level AES-GCM Encryptions
    const encryptedRawText = await encryptPII(c, JSON.stringify(mfsnData));
    const encryptedParsedData = await encryptPII(c, JSON.stringify(report));

    await c.env.DB.prepare(
      'INSERT INTO credit_reports (id, org_id, client_id, uploaded_by, bureau, report_date, file_name, raw_text, parsed_data, status, total_accounts, total_inquiries, total_public_records, total_collections, analysis_started_at, analysis_completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))'
    ).bind(reportId, user.org_id, clientId, user.id, report.bureau, report.reportDate, `mfsn-import-${report.bureau}.json`, encryptedRawText, encryptedParsedData, 'analyzed', report.accounts.length, report.inquiries.length, report.publicRecords.length, report.collections.length).run();

    try {
      const sc = report.scores || {};
      const bureauKey = String(report.bureau || '').toLowerCase();
      await c.env.DB.prepare(
        `UPDATE credit_reports SET fico_score = ?, vantage_score = ?, eq_score = ?, ex_score = ?, tu_score = ?, source_provider = ?, source_payload_type = ? WHERE id = ? AND org_id = ?`
      ).bind(
        sc.fico ?? null,
        sc.vantage ?? null,
        bureauKey.includes('equifax') ? (sc.fico ?? null) : null,
        bureauKey.includes('experian') ? (sc.fico ?? null) : null,
        bureauKey.includes('transunion') || bureauKey.includes('trans union') ? (sc.fico ?? sc.vantage ?? null) : null,
        'MyFreeScoreNow',
        'json',
        reportId,
        user.org_id
      ).run();
      if (bureauKey.includes('equifax') && sc.fico) {
        await c.env.DB.prepare('UPDATE clients SET eq_score = ? WHERE id = ? AND org_id = ?').bind(sc.fico, clientId, user.org_id).run();
      } else if (bureauKey.includes('experian') && sc.fico) {
        await c.env.DB.prepare('UPDATE clients SET ex_score = ? WHERE id = ? AND org_id = ?').bind(sc.fico, clientId, user.org_id).run();
      } else if ((bureauKey.includes('transunion') || bureauKey.includes('trans union')) && (sc.fico || sc.vantage)) {
        await c.env.DB.prepare('UPDATE clients SET tu_score = ? WHERE id = ? AND org_id = ?').bind(sc.fico ?? sc.vantage, clientId, user.org_id).run();
      }
    } catch (e) {
      console.warn('[MFSN] score column update skipped', e);
    }

    await saveViolationsForReport(c, user.org_id, reportId, clientId, violations);

    await c.env.DB.prepare('INSERT INTO activity_log (id, org_id, client_id, report_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(generateId(), user.org_id, clientId, reportId, user.id, 'report_analyzed', `Imported MFSN report (${report.bureau}): ${violations.length} grounded findings`, JSON.stringify({ score: litScore.score, analysisMode: analysis.analysisMode, reasoningSummary: analysis.reasoningSummary })).run();

    results.push({
      bureau: report.bureau,
      reportId,
      violationsFound: violations.length,
      score: litScore.score
    });
  }

  return c.json({ success: true, reports: results });
});



// ═══════════════════════════════════════════════════════════════
// BILLING ROUTES (Stripe)
// ═══════════════════════════════════════════════════════════════
app.post('/api/billing/checkout', authMiddleware, async (c) => {
  const user = c.get('user');
  const { planId } = await c.req.json();
  if (!planId) return c.json({ error: 'Plan ID required' }, 400);
  if (!stripeConfigured(c.env)) return c.json({ error: 'Stripe is not configured for this environment' }, 503);

  const stripe = getStripe(c.env);
  const org = await c.env.DB.prepare('SELECT * FROM organizations WHERE id = ?').bind(user.org_id).first();

  const planPrices: Record<string, { amount: number; name: string; interval: 'month' }> = {
    'professional': { amount: 49700, name: 'Basic Plan', interval: 'month' },
    'unlimited': { amount: 250000, name: 'Unlimited Plan', interval: 'month' },
    'enterprise': { amount: 999700, name: 'Enterprise Plan', interval: 'month' }
  };

  const plan = planPrices[planId as string];
  if (!plan) return c.json({ error: 'Invalid plan' }, 400);

  const priceIdMap: Record<string, string | undefined> = {
    professional: c.env.STRIPE_PROFESSIONAL_PRICE_ID,
    unlimited: c.env.STRIPE_UNLIMITED_PRICE_ID,
    enterprise: c.env.STRIPE_ENTERPRISE_PRICE_ID,
  };

  let session;
  try {
    const configuredPriceId = priceIdMap[planId as string];
    const lineItems = configuredPriceId
      ? [{ price: configuredPriceId, quantity: 1 }]
      : [{
          price_data: {
            currency: 'usd',
            product_data: { name: plan.name, metadata: { planId } },
            unit_amount: plan.amount,
            recurring: { interval: plan.interval as 'month' },
          },
          quantity: 1,
        }];

    session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',
      success_url: `${c.env.FRONTEND_URL || 'http://localhost:3000'}/?checkout=success`,
      cancel_url: `${c.env.FRONTEND_URL || 'http://localhost:3000'}/?page=billing&checkout=cancelled`,
      client_reference_id: user.org_id,
      metadata: { planId, orgId: user.org_id },
      subscription_data: { metadata: { planId, orgId: user.org_id } },
      customer: org.stripe_customer_id || undefined,
      customer_email: org.stripe_customer_id ? undefined : user.email,
    });
  } catch (err: any) {
    console.error('Stripe checkout error:', err);
    return c.json({ error: `Stripe error: ${err.message || 'Unknown error'}` }, 500);
  }

  return c.json({ url: session.url });
});


app.post('/api/billing/portal', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!stripeConfigured(c.env)) return c.json({ error: 'Stripe is not configured' }, 503);
  const stripe = getStripe(c.env);
  const org = await c.env.DB.prepare('SELECT stripe_customer_id FROM organizations WHERE id = ?').bind(user.org_id).first() as any;
  if (!org?.stripe_customer_id) return c.json({ error: 'Subscribe first' }, 400);
  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: `${c.env.FRONTEND_URL || c.req.url.split('/api')[0]}/?page=billing`,
  });
  return c.json({ url: session.url });
});

app.get('/api/billing/invoices', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!stripeConfigured(c.env)) return c.json({ invoices: [], unconfigured: true });
  const org = await c.env.DB.prepare('SELECT stripe_customer_id FROM organizations WHERE id = ?').bind(user.org_id).first() as any;
  if (!org?.stripe_customer_id) return c.json({ invoices: [] });
  try {
    const stripe = getStripe(c.env);
    const invoices = await stripe.invoices.list({ customer: org.stripe_customer_id, limit: 20 });
    return c.json({ invoices: invoices.data.map((i: any) => ({ id: i.id, number: i.number, status: i.status, amount: i.amount_due, currency: i.currency, created: i.created, pdf: i.invoice_pdf, hosted_url: i.hosted_invoice_url })) });
  } catch (e: any) {
    console.warn('[billing] invoices list failed', e.message);
    return c.json({ invoices: [], error: e.message || 'Stripe unavailable' });
  }
});

app.post('/api/billing/cancel', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role !== 'super_admin' && user.role !== 'admin') return c.json({ error: 'Admin only' }, 403);
  if (!stripeConfigured(c.env)) return c.json({ error: 'Stripe is not configured' }, 503);
  const org = await c.env.DB.prepare('SELECT stripe_subscription_id FROM organizations WHERE id = ?').bind(user.org_id).first() as any;
  if (!org?.stripe_subscription_id) return c.json({ error: 'No active subscription' }, 400);
  const stripe = getStripe(c.env);
  await stripe.subscriptions.update(org.stripe_subscription_id, { cancel_at_period_end: true });
  return c.json({ ok: true, message: 'Subscription will cancel at end of billing period' });
});

app.post('/api/billing/webhook', async (c) => {
  const signature = c.req.header('stripe-signature');
  if (!signature) return c.json({ error: 'Missing signature' }, 400);

  const body = await c.req.raw.clone().text();
  const stripe = getStripe(c.env);
  let event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      c.env.STRIPE_WEBHOOK_SECRET,
      undefined,
      Stripe.createSubtleCryptoProvider()
    );
  } catch (err: any) {
    return c.json({ error: `Webhook error: ${err.message}` }, 400);
  }

  // 5. Webhook Idempotency (FTC/TSR & SLA security guarantee)
  try {
    await c.env.DB.prepare('INSERT INTO stripe_processed_events (id) VALUES (?)').bind(event.id).run();
  } catch (dbErr: any) {
    console.warn(`[WEBHOOK] Event ${event.id} already processed. Intercepting replay cleanly.`);
    return c.json({ received: true, duplicate: true });
  }

  const session = event.data.object as any;

  switch (event.type) {
    case 'checkout.session.completed': {
      const sessionObj: any = event.data.object;
      if (sessionObj?.metadata?.type === 'analysis_unlock' && sessionObj?.metadata?.clientId) {
        try {
          await c.env.DB.prepare(
            `UPDATE clients SET
               portal_analysis_unlocked = 1,
               portal_analysis_unlocked_at = datetime('now'),
               portal_analysis_unlocked_by = 'stripe',
               payment_status = 'paid',
               case_status = CASE WHEN case_status = 'ONBOARDING' THEN 'DISPUTING' ELSE case_status END,
               updated_at = datetime('now')
             WHERE id = ? AND org_id = ?`
          ).bind(sessionObj.metadata.clientId, sessionObj.metadata.orgId).run();
          await c.env.DB.prepare(
            'INSERT INTO activity_log (id, org_id, client_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)'
          ).bind(
            generateId(), sessionObj.metadata.orgId, sessionObj.metadata.clientId, null,
            'portal_analysis_unlocked', 'Stripe checkout unlocked portal analysis',
            JSON.stringify({ paymentIntent: sessionObj.payment_intent || sessionObj.id }),
          ).run().catch(() => {});
          await writeBillingLedger({
            db: c.env.DB,
            id: generateId(),
            orgId: sessionObj.metadata.orgId,
            clientId: sessionObj.metadata.clientId,
            stripeObjectId: String(sessionObj.payment_intent || sessionObj.id),
            eventType: 'checkout.session.completed',
            amountCents: sessionObj.amount_total || null,
            serviceType: 'credit_report_analysis',
            decision: 'ALLOW',
            status: 'PAID',
            explanation: ['Stripe checkout completed after CROA completion gate'],
          });
        } catch (e) { console.warn('[unlock webhook]', e); }
        break;
      }
      if (sessionObj?.metadata?.type === 'tradeline' && sessionObj?.metadata?.orderId) {
        try {
          await c.env.DB.prepare(
            `UPDATE tradeline_orders SET status = 'paid', paid_at = datetime('now'), stripe_payment_intent = ? WHERE id = ? AND org_id = ?`
          ).bind(sessionObj.payment_intent || sessionObj.id, sessionObj.metadata.orderId, sessionObj.metadata.orgId).run();
          let clientEmail: string | null = null;
          let clientName = '';
          try {
            const cl = await c.env.DB.prepare('SELECT first_name, last_name, email, notify_email FROM clients WHERE id = ? AND org_id = ?')
              .bind(sessionObj.metadata.clientId, sessionObj.metadata.orgId).first() as any;
            if (cl?.email && !isSyntheticPortalEmail(cl.email) && cl.notify_email !== 0) clientEmail = cl.email;
            clientName = `${cl?.first_name || ''} ${cl?.last_name || ''}`.trim();
          } catch { /* soft */ }
          await sendTemplatedClientMessage(c.env, {
            orgId: sessionObj.metadata.orgId,
            clientId: sessionObj.metadata.clientId,
            templateId: 'tradeline_confirmed',
            email: clientEmail,
            notifyEmail: !!clientEmail,
            notifySms: false,
            vars: {
              clientName,
              productId: sessionObj.metadata.productId || 'boost',
              portalUrl: `${portalBaseUrl(c.env)}/`,
            },
          });
        } catch (e) { console.warn('[tradeline webhook]', e); }
        break;
      }

      const orgId = session.client_reference_id;
      const stripeCustomerId = session.customer as string;
      const stripeSubId = session.subscription as string;
      if (!orgId || !stripeSubId) break;

      const stripe = getStripe(c.env);
      const subscription = await stripe.subscriptions.retrieve(stripeSubId);
      const priceId = subscription.items.data[0]?.price.id;
      const metaPlan = session.metadata?.planId || subscription.metadata?.planId;
      const plan = metaPlan || (priceId === c.env.STRIPE_UNLIMITED_PRICE_ID ? 'unlimited'
        : priceId === c.env.STRIPE_ENTERPRISE_PRICE_ID ? 'enterprise'
        : priceId === c.env.STRIPE_PROFESSIONAL_PRICE_ID ? 'professional' : 'professional');

      await c.env.DB.prepare(
        'UPDATE organizations SET plan = ?, stripe_customer_id = ?, stripe_subscription_id = ? WHERE id = ?'
      ).bind(plan, stripeCustomerId, stripeSubId, orgId).run();
      break;
    }

    case 'customer.subscription.deleted':
      await c.env.DB.prepare(
        'UPDATE organizations SET plan = \'free\', stripe_subscription_id = NULL WHERE stripe_subscription_id = ?'
      ).bind(session.subscription as string).run();
      break;

    case 'customer.subscription.updated': {
      const subId = session.id as string;
      const stripe = getStripe(c.env);
      try {
        const subscription = await stripe.subscriptions.retrieve(subId);
        const priceId = subscription.items.data[0]?.price.id;
        const status = subscription.status;
        if (status === 'active' || status === 'trialing') {
          const plan = priceId === c.env.STRIPE_UNLIMITED_PRICE_ID ? 'unlimited'
            : priceId === c.env.STRIPE_ENTERPRISE_PRICE_ID ? 'enterprise'
            : priceId === c.env.STRIPE_PROFESSIONAL_PRICE_ID ? 'professional' : 'professional';
          await c.env.DB.prepare('UPDATE organizations SET plan = ? WHERE stripe_subscription_id = ?').bind(plan, subId).run();
        } else if (status === 'past_due') {
          await c.env.DB.prepare('UPDATE organizations SET plan = \'free\' WHERE stripe_subscription_id = ?').bind(subId).run();
        }
      } catch {}
      break;
    }

    case 'invoice.payment_succeeded': {
      const subId = session.subscription as string;
      if (!subId) break;
      const stripe = getStripe(c.env);
      try {
        const subscription = await stripe.subscriptions.retrieve(subId);
        const priceId = subscription.items.data[0]?.price.id;
        const plan = priceId === c.env.STRIPE_UNLIMITED_PRICE_ID ? 'unlimited'
          : priceId === c.env.STRIPE_ENTERPRISE_PRICE_ID ? 'enterprise'
          : priceId === c.env.STRIPE_PROFESSIONAL_PRICE_ID ? 'professional' : 'professional';
        await c.env.DB.prepare('UPDATE organizations SET plan = ? WHERE stripe_subscription_id = ?').bind(plan, subId).run();
      } catch {}
      break;
    }

    case 'invoice.payment_failed': {
      const subId = session.subscription as string;
      if (!subId) break;
      await c.env.DB.prepare('UPDATE organizations SET plan = \'free\' WHERE stripe_subscription_id = ?').bind(subId).run();
      break;
    }
  }

  return c.json({ received: true });
});

app.post('/api/billing/mailing-callback', async (c) => {
  const expected = c.env.MAILING_WEBHOOK_SECRET;
  const provided = c.req.header('X-Mailing-Webhook-Secret') || c.req.query('secret');
  if (!expected || provided !== expected) {
    return c.json({ error: 'Unauthorized mailing webhook' }, 401);
  }

  const body = await c.req.json();
  const { documentId, uspsTrackingNumber, mailingDate } = body;

  if (!documentId) {
    return c.json({ error: 'documentId is required' }, 400);
  }

  const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(documentId).first() as any;
  if (!doc) {
    return c.json({ error: 'Document not found' }, 404);
  }

  const mDate = mailingDate ? new Date(mailingDate) : new Date();
  const clockId = generateId();
  const clock = await persistInvestigationClock({
    db: c.env.DB,
    id: clockId,
    orgId: doc.org_id,
    clientId: doc.client_id,
    documentId,
    mailingDate: mDate,
  });
  const sentDateStr = clock.mailingDate;

  await c.env.DB.prepare(
    'UPDATE documents SET usps_tracking_number = ?, response_due_date = ?, sent_date = ?, status = \'sent\', investigation_clock_id = ?, updated_at = datetime("now") WHERE id = ?'
  ).bind(uspsTrackingNumber || null, clock.operationalTarget, sentDateStr, clockId, documentId).run().catch(async () => {
    await c.env.DB.prepare(
      'UPDATE documents SET usps_tracking_number = ?, response_due_date = ?, sent_date = ?, status = \'sent\', updated_at = datetime("now") WHERE id = ?'
    ).bind(uspsTrackingNumber || null, clock.operationalTarget, sentDateStr, documentId).run();
  });

  await c.env.DB.prepare(
    'INSERT INTO mailing_webhook_events (id, document_id, payload) VALUES (?, ?, ?)'
  ).bind(generateId(), documentId, JSON.stringify(body)).run();

  await c.env.DB.prepare(
    'INSERT INTO activity_log (id, org_id, client_id, document_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    generateId(),
    doc.org_id,
    doc.client_id,
    documentId,
    'system_usps',
    'document_mailed',
    `Certified letter sent via USPS. Tracking: ${uspsTrackingNumber || 'N/A'}. Statutory FCRA § 611 due ${clock.statutoryTarget}; operational due ${clock.operationalTarget}.`,
    JSON.stringify({ trackingNumber: uspsTrackingNumber, statutoryTarget: clock.statutoryTarget, operationalTarget: clock.operationalTarget, sentDate: sentDateStr })
  ).run();

  try {
    const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(doc.client_id).first() as any;
    if (client) {
      const email =
        client.email && !String(client.email).includes('.noreply@') && !String(client.email).endsWith('@smartfcra.local')
          ? client.email
          : null;
      await sendTemplatedClientMessage(c.env, {
        templateId: 'dispute_mailed',
        orgId: doc.org_id,
        clientId: doc.client_id,
        email,
        notifyEmail: !!email && client.notify_email !== 0,
        vars: {
          clientName: `${client.first_name} ${client.last_name}`,
          tracking: uspsTrackingNumber || 'pending',
          portalUrl: `${portalBaseUrl(c.env)}/`,
        },
      });
    }
  } catch { /* soft */ }

  return c.json({ ok: true, responseDueDate: clock.operationalTarget, statutoryTarget: clock.statutoryTarget, clockId: clock.clockId });
});

// ═══════════════════════════════════════════════════════════════
// ORG SETTINGS — letterhead, branding, security prefs
// ═══════════════════════════════════════════════════════════════
app.get('/api/settings/org', authMiddleware, async (c) => {
  const user = c.get('user');
  const org = await c.env.DB.prepare('SELECT id, name, slug, plan, settings, max_users, max_clients, max_reports_per_month FROM organizations WHERE id = ?').bind(user.org_id).first() as any;
  if (!org) return c.json({ error: 'Organization not found' }, 404);
  let settings = {};
  try { settings = JSON.parse(org.settings || '{}'); } catch { settings = {}; }
  const { letterhead } = normalizeOrgLetterhead(settings, org.name);
  const theme = resolveTenantTheme(settings, org.name);
  return c.json({ org: { ...org, settings }, letterhead, theme });
});

app.put('/api/settings/org', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return c.json({ error: 'Only org admins can update settings' }, 403);
  }
  const body = await c.req.json();
  const org = await c.env.DB.prepare('SELECT name, settings FROM organizations WHERE id = ?').bind(user.org_id).first() as any;
  let settings: any = {};
  try { settings = JSON.parse(org?.settings || '{}'); } catch { settings = {}; }
  const displayName = (typeof body.name === 'string' && body.name.trim()) ? body.name.trim() : (org?.name || '');

  if (body.letterhead && typeof body.letterhead === 'object') {
    // Persist nested letterhead AND flatten PDF/email keys so every letter/PDF uses firm branding
    settings = mergeLetterheadIntoSettings(settings, body.letterhead, displayName);
  }
  if (body.branding && typeof body.branding === 'object') {
    settings.branding = { ...(settings.branding || {}), ...body.branding };
  }
  if (typeof body.isHiredAdvocate === 'boolean') {
    settings.is_hired_advocate = body.isHiredAdvocate;
    settings.letterhead = { ...(settings.letterhead || {}), isHiredAdvocate: body.isHiredAdvocate };
  }
  if (typeof body.repAgreementAttached === 'boolean') {
    settings.rep_agreement_attached = body.repAgreementAttached;
    settings.letterhead = { ...(settings.letterhead || {}), repAgreementAttached: body.repAgreementAttached };
  }
  // Re-normalize after branding/advocate flags so flat keys stay in sync
  settings = mergeLetterheadIntoSettings(settings, settings.letterhead || {}, displayName);

  if (typeof body.name === 'string' && body.name.trim()) {
    await c.env.DB.prepare('UPDATE organizations SET name = ?, settings = ?, updated_at = datetime("now") WHERE id = ?')
      .bind(body.name.trim(), JSON.stringify(settings), user.org_id).run();
  } else {
    await c.env.DB.prepare('UPDATE organizations SET settings = ?, updated_at = datetime("now") WHERE id = ?')
      .bind(JSON.stringify(settings), user.org_id).run();
  }

  return c.json({ ok: true, settings, letterhead: normalizeOrgLetterhead(settings, displayName).letterhead, theme: resolveTenantTheme(settings, displayName) });
});

app.get('/api/settings/integrations', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role === 'client') return c.json({ error: 'Staff only' }, 403);
  const click2mailOn = !!(c.env.CLICK2MAIL_USERNAME && c.env.CLICK2MAIL_AUTH_BASIC);
  return c.json({
    click2mail: {
      configured: click2mailOn,
      status: click2mailOn ? 'connected' : 'not_configured',
      label: click2mailOn ? 'CONNECTED' : 'NOT CONFIGURED',
    },
    stripe: { configured: stripeConfigured(c.env) },
    twilioSms: { configured: !!(c.env.TWILIO_ACCOUNT_SID && c.env.TWILIO_AUTH_TOKEN && c.env.TWILIO_PHONE_NUMBER) },
    twilioVideo: { configured: videoConfigured(c.env) },
    ghl: { configured: ghlConfigured(c.env) },
    mfsn: { configured: !!resolvePartnerMfsnCredentials(c.env as any) },
    tradelineMaster: { configured: tradelineMasterConfigured(c.env) },
    turnstile: turnstilePublicConfig(c.env),
    ron: {
      vendor: resolveVendor(c.env),
      sandbox: resolveVendor(c.env) === 'sandbox',
      live: resolveVendor(c.env) !== 'sandbox',
      proof: resolveVendor(c.env) === 'proof',
      bluenotary: resolveVendor(c.env) === 'bluenotary',
    },
  });
});

app.get('/api/health/ready', async (c) => {
  const providers = listConfiguredProviders(c.env);
  const checks: Record<string, boolean | string | number> = {
    db: false,
    encryptionKey: !!(c.env.PII_ENCRYPTION_KEY && c.env.PII_ENCRYPTION_KEY.length >= 32),
    stripe: !!c.env.STRIPE_API_KEY,
    stripePublishable: !!c.env.STRIPE_PUBLISHABLE_KEY,
    cloudflareEmail: !!(c.env.CLOUDFLARE_EMAIL_API_TOKEN && c.env.CLOUDFLARE_ACCOUNT_ID),
    resend: !!c.env.RESEND_API_KEY,
    sendgrid: !!c.env.SENDGRID_API_KEY,
    nvidia: !!c.env.NVIDIA_API_KEY,
    freeAiOnly: String(c.env.FREE_AI_ONLY || 'true').toLowerCase() !== 'false',
    smartcredit: !!(c.env.SMARTCREDIT_CLIENT_KEY && c.env.SMARTCREDIT_CLIENT_SECRET),
    mfsn: !!resolvePartnerMfsnCredentials(c.env as any),
        mfsnAffiliateOffers: listPublicAffiliateOffers().length,
        mfsnAffiliateId: MFSN_AFFILIATE_ID,
    click2mail: !!(c.env.CLICK2MAIL_USERNAME && c.env.CLICK2MAIL_AUTH_BASIC),
    twilioSms: !!(c.env.TWILIO_ACCOUNT_SID && c.env.TWILIO_AUTH_TOKEN && c.env.TWILIO_PHONE_NUMBER),
    ghl: ghlConfigured(c.env),
    tradelineMaster: tradelineMasterConfigured(c.env),
    aiProvidersConfigured: providers.filter(p => p.configured && p.free).length,
    letterBranding: true,
    letterStrategy: true,
    bureauReplyIntel: true,
    mfsnSignup: true,
    environment: c.env.ENVIRONMENT || 'development',
  };
  try {
    await c.env.DB.prepare('SELECT 1 as ok').first();
    checks.db = true;
  } catch {
    checks.db = false;
  }
  const ready = checks.db === true && checks.encryptionKey === true;
  return c.json({ ready, version: '2.0.0', checks, providers }, ready ? 200 : 503);
});

app.get('/api/reports', authMiddleware, async (c) => {
  const user = c.get('user');
  const page = parseInt(c.req.query('page') || '1');
  const limit = 20;
  const offset = (page - 1) * limit;

  const reports = await c.env.DB.prepare(`
    SELECT cr.*, c.first_name, c.last_name, c.email as client_email,
           (SELECT COUNT(*) FROM violations WHERE report_id = cr.id) as violation_count,
           (SELECT SUM(total_damages_max) FROM violations WHERE report_id = cr.id) as total_damages
    FROM credit_reports cr
    JOIN clients c ON cr.client_id = c.id
    WHERE cr.org_id = ?
    ORDER BY cr.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(user.org_id, limit, offset).all();

  const total = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM credit_reports WHERE org_id = ?'
  ).bind(user.org_id).first();

  const results = reports?.results || [];
  const decryptedReports = [];
  for (const r of results as any[]) {
    const rDecrypted = { ...r };
    // List view does not need encrypted blobs — omit to keep pages fast and resilient
    delete rDecrypted.raw_text;
    delete rDecrypted.parsed_data;
    decryptedReports.push(rDecrypted);
  }

  return c.json({ reports: decryptedReports, total: total?.count || 0, page, limit });
});

app.get('/api/reports/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const report = await c.env.DB.prepare('SELECT * FROM credit_reports WHERE id = ? AND org_id = ?').bind(id, user.org_id).first() as any;
  if (!report) return c.json({ error: 'Not found' }, 404);

  if (user.role === 'client') {
    return c.json({ error: 'Open this report from My Credit. Client access uses the sandboxed viewer.' }, 403);
  }

  if (report.raw_text) report.raw_text = await decryptPII(c, report.raw_text);
  if (report.parsed_data) report.parsed_data = await decryptPII(c, report.parsed_data);

  let parsed: any = null;
  try {
    parsed = report.parsed_data ? JSON.parse(report.parsed_data) : null;
  } catch {
    parsed = null;
  }

  let rawPayload: any = null;
  let rawPayloadType: 'json' | 'text' | 'empty' = 'empty';
  if (report.raw_text) {
    try {
      rawPayload = JSON.parse(report.raw_text);
      rawPayloadType = 'json';
    } catch {
      rawPayload = null;
      rawPayloadType = 'text';
    }
  }

  const violations = await c.env.DB.prepare('SELECT * FROM violations WHERE report_id = ? AND org_id = ? ORDER BY severity ASC').bind(id, user.org_id).all();
  const litScore = calculateLitigationScore((violations?.results || []) as any);
  const documents = await c.env.DB.prepare('SELECT * FROM documents WHERE report_id = ? AND org_id = ? ORDER BY created_at DESC').bind(id, user.org_id).all();

  // Prefer structured scores from parsed payload; fall back to report columns
  const scores = parsed?.scores || {
    fico: report.fico_score ?? null,
    vantage: report.vantage_score ?? null,
    equifax: report.eq_score ?? null,
    experian: report.ex_score ?? null,
    transunion: report.tu_score ?? null,
  };

  return c.json({
    report,
    parsed,
    scores,
    rawPayload,
    rawPayloadType,
    sourceProvider: report.source_provider || (rawPayloadType === 'json' ? inferSourceProvider(rawPayload, report.file_name) : 'manual'),
    violations: hydrateViolationRows(violations?.results || []),
    litigationScore: litScore,
    documents: documents?.results || [],
  });
});

function inferSourceProvider(payload: any, fileName?: string): string {
  const name = String(fileName || '').toLowerCase();
  if (name.includes('mfsn') || name.includes('myfreescore')) return 'MyFreeScoreNow';
  if (name.includes('smartcredit')) return 'SmartCredit';
  if (payload?.data?.providerViews) return 'MyFreeScoreNow';
  if (payload?.bureauReports || payload?.reports) return 'SmartCredit';
  return 'imported-json';
}

/** Fire the full attorney workflow pack from a single report analysis. */
async function launchAttorneyWorkflowPack(
  c: any,
  opts: { orgId: string; userId: string; reportId: string; clientId?: string },
): Promise<{
  success: boolean;
  documents: any[];
  caseStatus: string;
  bureau: string;
  litigationScore: any;
  nextStep: string;
  error?: string;
}> {
  const report = await c.env.DB.prepare('SELECT * FROM credit_reports WHERE id = ? AND org_id = ?')
    .bind(opts.reportId, opts.orgId).first() as any;
  if (!report) return { success: false, documents: [], caseStatus: '', bureau: '', litigationScore: null, nextStep: '', error: 'Report not found' };

  const clientId = opts.clientId || report.client_id;
  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?')
    .bind(clientId, opts.orgId).first() as any;
  if (!client) return { success: false, documents: [], caseStatus: '', bureau: '', litigationScore: null, nextStep: '', error: 'Client not found' };

  const violationsResult = await c.env.DB.prepare(
    'SELECT * FROM violations WHERE report_id = ? AND org_id = ? ORDER BY severity ASC'
  ).bind(opts.reportId, opts.orgId).all();
  const violations = (violationsResult?.results || []) as any[];
  if (!violations.length) {
    return { success: false, documents: [], caseStatus: '', bureau: report.bureau || '', litigationScore: null, nextStep: '', error: 'No violations to package yet' };
  }

  const litScorePreview = calculateLitigationScore(violations);
  const strategy = recommendLetterStrategy(violations, {
    litigationScore: litScorePreview.score,
    clientState: client.state || '',
    includeLitigationPack: true,
  });
  const packTypes = strategy.packTypes.length
    ? strategy.packTypes
    : selectWorkflowPackTypes(violations, { litigationScore: litScorePreview.score, clientState: client.state || '' });

  const firmLh = await loadOrgLetterhead(c.env, opts.orgId);
  const generated: any[] = [];
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const docData: DocumentData = {
    clientName: `${client.first_name} ${client.last_name}`,
    clientAddress: client.address_line1 || '',
    clientCity: client.city || '',
    clientState: client.state || '',
    clientZip: client.zip || '',
    clientSSNLast4: client.ssn_last4 || '',
    clientDOB: client.dob || '',
    today,
    violations,
    bureau: report.bureau || 'Equifax',
    reportId: opts.reportId,
    clientPhone: client.phone || '',
    clientEmail: client.email || '',
  };

  for (const docType of packTypes) {
    const docDef = (DOCUMENT_TYPES as any)[docType];
    if (!docDef) continue;
    const content = brandLetterContent(docDef.fn(docData), firmLh);
    const docId = generateId();
    const title = `${docDef.name} - ${client.first_name} ${client.last_name}`;
    await c.env.DB.prepare(
      'INSERT INTO documents (id, org_id, client_id, report_id, violation_ids, doc_type, doc_subtype, title, recipient_name, recipient_address, content, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      docId,
      opts.orgId,
      client.id,
      opts.reportId,
      JSON.stringify(violations.map((v) => v.id)),
      docType,
      docDef.category,
      title,
      report.bureau || null,
      null,
      content,
      'draft',
      opts.userId
    ).run();
    generated.push({ id: docId, docType, title });
  }

  const litScore = litScorePreview;
  await c.env.DB.prepare(
    'UPDATE clients SET case_status = ?, lvs_score = ?, estimated_recovery = ? WHERE id = ? AND org_id = ?'
  ).bind(
    'DISPUTE',
    litScore.score,
    litScore.totalDamagesMax,
    client.id,
    opts.orgId
  ).run();

  try {
    await c.env.DB.prepare(
      `UPDATE clients SET bureau_pack_status = 'WORKFLOW_FIRED' WHERE id = ? AND org_id = ?`
    ).bind(client.id, opts.orgId).run();
  } catch { /* optional column */ }

  await c.env.DB.prepare(
    'INSERT INTO activity_log (id, org_id, client_id, report_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    generateId(),
    opts.orgId,
    client.id,
    opts.reportId,
    opts.userId,
    'workflow_launched',
    `Launched intelligent workflow pack (${generated.length} documents) for ${report.bureau}: ${strategy.strategySummary}`,
    JSON.stringify({
      docs: generated.map((g) => g.docType),
      bureau: report.bureau,
      auto: true,
      signals: strategy.signals,
      strategySummary: strategy.strategySummary,
      branded: firmLh.configured,
    })
  ).run();

  return {
    success: true,
    documents: generated,
    caseStatus: 'DISPUTE',
    bureau: report.bureau || '',
    litigationScore: litScore,
    strategy,
    nextStep: 'Client portal e-sign queue is ready for the generated pack',
  };
}

app.post('/api/reports/:id/launch-workflow', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const result = await launchAttorneyWorkflowPack(c, {
    orgId: user.org_id,
    userId: user.id,
    reportId: id,
  });
  if (!result.success) {
    return c.json({ error: result.error || 'Workflow failed' }, result.error?.includes('not found') ? 404 : 400);
  }
  return c.json(result);
});

app.get('/api/reports/:id/comparison', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  
  // 1. Fetch current report
  const currentReport = await c.env.DB.prepare('SELECT * FROM credit_reports WHERE id = ? AND org_id = ?').bind(id, user.org_id).first() as any;
  if (!currentReport) return c.json({ error: 'Current credit report not found' }, 404);

  // 2. Decrypt current parsed data
  let currentParsed: any = null;
  if (currentReport.parsed_data) {
    const decryptedParsed = await decryptPII(c, currentReport.parsed_data);
    currentParsed = JSON.parse(decryptedParsed);
  } else {
    return c.json({ error: 'Current credit report is missing structured data' }, 400);
  }

  // 3. Fetch prior report for SAME bureau (intelligent multi-bureau CRM)
  const previousReport = await c.env.DB.prepare(
    'SELECT * FROM credit_reports WHERE client_id = ? AND org_id = ? AND id != ? AND bureau = ? AND created_at < ? ORDER BY created_at DESC LIMIT 1'
  ).bind(currentReport.client_id, user.org_id, id, currentReport.bureau, currentReport.created_at).first() as any;

  let previousParsed: any = null;
  if (previousReport && previousReport.parsed_data) {
    const decryptedPrevParsed = await decryptPII(c, previousReport.parsed_data);
    previousParsed = JSON.parse(decryptedPrevParsed);
  }

  // Helpers for normalization & matching
  const cleanStr = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanAcctNum = (s: string) => {
    return (s || '').toLowerCase().replace(/[^a-z0-9x*]/g, '');
  };

  const areAccountsMatching = (actA: any, actB: any) => {
    const normAName = cleanStr(actA.creditorName);
    const normBName = cleanStr(actB.creditorName);
    const normAAcct = cleanAcctNum(actA.accountNumber);
    const normBAcct = cleanAcctNum(actB.accountNumber);

    // Exact matches
    if (normAAcct && normBAcct && normAAcct === normBAcct) return true;

    // Fallback name similarity
    const nameMatch = normAName === normBName || normAName.includes(normBName) || normBName.includes(normAName);
    if (nameMatch) {
      if (!normAAcct || !normBAcct) return true;
      const aStripped = normAAcct.replace(/[x*]/g, '');
      const bStripped = normBAcct.replace(/[x*]/g, '');
      if (aStripped && bStripped && (aStripped.includes(bStripped) || bStripped.includes(aStripped))) {
        return true;
      }
    }
    return false;
  };

  const erasedAccounts: any[] = [];
  const updatedAccounts: any[] = [];
  const newInquiries: any[] = [];
  const accountMatrix: any[] = [];

  const acctBalance = (a: any) => Number(a?.currentBalance ?? a?.balance ?? 0);
  const inqDate = (i: any) => i?.inquiryDate || i?.date || '';

  if (previousParsed) {
    const prevAccounts = previousParsed.accounts || [];
    const currAccounts = currentParsed.accounts || [];
    const matchedCurr = new Set<number>();

    for (const prevAct of prevAccounts) {
      const matchIdx = currAccounts.findIndex((currAct: any) => areAccountsMatching(prevAct, currAct));
      const match = matchIdx >= 0 ? currAccounts[matchIdx] : null;
      if (matchIdx >= 0) matchedCurr.add(matchIdx);

      if (!match) {
        accountMatrix.push({
          creditorName: prevAct.creditorName || 'Unknown',
          accountNumber: prevAct.accountNumber || 'N/A',
          status: 'erased',
          prior: {
            accountStatus: prevAct.accountStatus || prevAct.paymentStatus || '',
            currentBalance: acctBalance(prevAct),
            creditLimit: Number(prevAct.creditLimit || 0),
            paymentStatus: prevAct.paymentStatus || '',
          },
          current: null,
        });
      } else {
        const prevBal = acctBalance(prevAct);
        const currBal = acctBalance(match);
        const prevStatus = prevAct.accountStatus || prevAct.paymentStatus || '';
        const currStatus = match.accountStatus || match.paymentStatus || '';
        const prevLimit = Number(prevAct.creditLimit || 0);
        const currLimit = Number(match.creditLimit || 0);
        const changed =
          prevBal !== currBal ||
          prevStatus !== currStatus ||
          prevLimit !== currLimit;
        accountMatrix.push({
          creditorName: match.creditorName || prevAct.creditorName || 'Unknown',
          accountNumber: match.accountNumber || prevAct.accountNumber || 'N/A',
          status: changed ? 'changed' : 'unchanged',
          prior: {
            accountStatus: prevStatus,
            currentBalance: prevBal,
            creditLimit: prevLimit,
            paymentStatus: prevAct.paymentStatus || '',
          },
          current: {
            accountStatus: currStatus,
            currentBalance: currBal,
            creditLimit: currLimit,
            paymentStatus: match.paymentStatus || '',
          },
        });
      }

      if (!match) {
        const creditor = prevAct.creditorName || 'Unknown Creditor';
        const acctNum = prevAct.accountNumber || 'N/A';
        const status = prevAct.accountStatus || prevAct.paymentStatus || 'Delinquent';
        
        let explanation = '';
        let statutoryLeverage = '';

        const isNeg = prevAct.isCollection || prevAct.isChargeOff || status.toLowerCase().includes('collection') || status.toLowerCase().includes('charge-off') || status.toLowerCase().includes('past due') || status.toLowerCase().includes('late');

        if (isNeg) {
          statutoryLeverage = '15 U.S.C. § 1681i / 15 U.S.C. § 1692g';
          explanation = `Tradeline for ${creditor} (Acct: ${acctNum}) was permanently erased from the consumer profile following statutory dispute challenges. Under the FCRA (15 U.S.C. § 1681i), the Consumer Reporting Agency (CRA) must conduct a reasonable reinvestigation within 30 days. If the furnisher fails to verify the accurate status, or fails to respond within the statutory timeframe, the CRA must immediately delete the item.`;
          
          if (prevAct.isCollection) {
            explanation += ` Additionally, under FDCPA 15 U.S.C. § 1692g, third-party collectors must cease collection and verify the debt. Failure to produce valid documentation leads to absolute deletion.`;
          }
        } else {
          statutoryLeverage = '15 U.S.C. § 1681i';
          explanation = `This account was deleted following dispute enforcement under 15 U.S.C. § 1681i. The furnisher did not or could not verify the accuracy within the mandated 30-day statutory timeline, enforcing automatic legal deletion.`;
        }

        erasedAccounts.push({
          creditorName: creditor,
          accountNumber: acctNum,
          bureau: prevAct.bureau || currentReport.bureau,
          previousStatus: status,
          previousBalance: acctBalance(prevAct),
          stattext: statutoryLeverage,
          statutoryReason: explanation
        });
      } else {
        const prevBal = acctBalance(prevAct);
        const currBal = acctBalance(match);
        const prevStatus = prevAct.accountStatus || prevAct.paymentStatus || '';
        const currStatus = match.accountStatus || match.paymentStatus || '';

        const wasNegative = prevAct.isCollection || prevAct.isChargeOff || prevStatus.toLowerCase().includes('collection') || prevStatus.toLowerCase().includes('charge-off') || prevStatus.toLowerCase().includes('past due') || prevStatus.toLowerCase().includes('late');
        const isNowPositive = !match.isCollection && !match.isChargeOff && !currStatus.toLowerCase().includes('collection') && !currStatus.toLowerCase().includes('charge-off') && !currStatus.toLowerCase().includes('past due') && !currStatus.toLowerCase().includes('late');

        if ((wasNegative && isNowPositive) || (prevBal > 0 && currBal === 0 && wasNegative)) {
          updatedAccounts.push({
            creditorName: prevAct.creditorName,
            accountNumber: prevAct.accountNumber,
            bureau: prevAct.bureau || currentReport.bureau,
            previousStatus: prevStatus,
            currentStatus: currStatus,
            previousBalance: prevBal,
            currentBalance: currBal,
            changeType: (wasNegative && isNowPositive) ? 'Status Restored to Positive' : 'Balance Settled to Zero'
          });
        }
      }
    }

    currAccounts.forEach((currAct: any, idx: number) => {
      if (matchedCurr.has(idx)) return;
      accountMatrix.push({
        creditorName: currAct.creditorName || 'Unknown',
        accountNumber: currAct.accountNumber || 'N/A',
        status: 'new',
        prior: null,
        current: {
          accountStatus: currAct.accountStatus || currAct.paymentStatus || '',
          currentBalance: acctBalance(currAct),
          creditLimit: Number(currAct.creditLimit || 0),
          paymentStatus: currAct.paymentStatus || '',
        },
      });
    });

    const prevInquiries = previousParsed.inquiries || [];
    const currInquiries = currentParsed.inquiries || [];
    for (const currInq of currInquiries) {
      const match = prevInquiries.find((prevInq: any) => {
        return cleanStr(currInq.creditorName) === cleanStr(prevInq.creditorName) &&
               inqDate(currInq) === inqDate(prevInq);
      });
      if (!match) {
        newInquiries.push({
          creditorName: currInq.creditorName,
          date: inqDate(currInq),
          bureau: currInq.bureau || currentReport.bureau
        });
      }
    }
  }

  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(currentReport.client_id).first() as any;

  const reportScore = (r: any, bureau: string) => {
    if (!r) return null;
    const b = String(bureau || r.bureau || '').toLowerCase();
    if (b.includes('equifax')) return r.eq_score ?? r.fico_score ?? null;
    if (b.includes('experian')) return r.ex_score ?? r.fico_score ?? null;
    if (b.includes('transunion') || b.includes('trans union')) return r.tu_score ?? r.fico_score ?? r.vantage_score ?? null;
    return r.fico_score ?? null;
  };

  const currentScores = {
    Equifax: client?.eq_score ?? reportScore(currentReport, 'Equifax'),
    Experian: client?.ex_score ?? reportScore(currentReport, 'Experian'),
    TransUnion: client?.tu_score ?? reportScore(currentReport, 'TransUnion'),
  };

  const previousScores = previousReport ? {
    Equifax: reportScore(previousReport, 'Equifax'),
    Experian: reportScore(previousReport, 'Experian'),
    TransUnion: reportScore(previousReport, 'TransUnion'),
  } : null;

  const scoreTrends = {
    Equifax: {
      current: currentScores.Equifax,
      previous: previousScores?.Equifax ?? (currentParsed?.scores?.equifax ?? currentParsed?.scores?.fico ?? null),
    },
    Experian: {
      current: currentScores.Experian,
      previous: previousScores?.Experian ?? (currentParsed?.scores?.experian ?? currentParsed?.scores?.fico ?? null),
    },
    TransUnion: {
      current: currentScores.TransUnion,
      previous: previousScores?.TransUnion ?? (currentParsed?.scores?.transunion ?? currentParsed?.scores?.vantage ?? currentParsed?.scores?.fico ?? null),
    },
  };

  // When no prior report, still expose a current-only matrix for the workspace
  if (!previousParsed && currentParsed?.accounts?.length) {
    for (const a of currentParsed.accounts.slice(0, 60)) {
      accountMatrix.push({
        creditorName: a.creditorName || 'Unknown',
        accountNumber: a.accountNumber || 'N/A',
        status: 'current_only',
        prior: null,
        current: {
          accountStatus: a.accountStatus || a.paymentStatus || '',
          currentBalance: acctBalance(a),
          creditLimit: Number(a.creditLimit || 0),
          paymentStatus: a.paymentStatus || '',
        },
      });
    }
  }

  return c.json({
    hasPrevious: !!previousReport,
    previousReportDate: previousReport?.report_date || null,
    currentReportDate: currentReport.report_date,
    erasedAccounts,
    updatedAccounts,
    newInquiries,
    accountMatrix,
    scoreTrends,
    complianceStatus: {
      croaAgreed: client?.croa_contract_agreed === 1,
      permissiblePurpose: client?.permissible_purpose_consent === 1,
      tsrWaived: client?.tsr_advance_fee_waived === 1
    }
  });
});

app.get('/api/reports/:id/pdf', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const report = await c.env.DB.prepare('SELECT * FROM credit_reports WHERE id = ? AND org_id = ?').bind(id, user.org_id).first() as any;
  if (!report) return c.json({ error: 'Report not found' }, 404);

  if (report.raw_text) report.raw_text = await decryptPII(c, report.raw_text);
  if (report.parsed_data) report.parsed_data = await decryptPII(c, report.parsed_data);

  const violations = await c.env.DB.prepare('SELECT * FROM violations WHERE report_id = ? AND org_id = ? ORDER BY severity ASC').bind(id, user.org_id).all();
  const litScore = calculateLitigationScore((violations?.results || []) as any);
  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind((report as any).client_id, user.org_id).first();

  const pdfViolations: PDFReportData['violations'] = (violations?.results || []).map((v: any) => ({
    id: v.id,
    category: v.category,
    subcategory: v.subcategory,
    severity: v.severity,
    statute: v.statute,
    statuteText: v.statute_text,
    legalStandard: v.legal_standard,
    evidence: v.evidence,
    explanation: v.explanation,
    caseLaw: v.case_law,
    accountName: v.account_name,
    accountNumber: v.account_number,
    dofd: v.dofd,
    falloffDate: v.falloff_date,
    daysOverdue: v.days_overdue,
    statutoryDamagesMin: v.statutory_damages_min,
    statutoryDamagesMax: v.statutory_damages_max,
    actualDamagesEst: v.actual_damages_est,
    punitiveDamagesEst: v.punitive_damages_est,
    attorneyFeesEst: v.attorney_fees_est,
    totalDamagesMin: v.total_damages_min,
    totalDamagesMax: v.total_damages_max,
    defendantType: v.defendant_type,
    defendantName: v.defendant_name,
    remedialAction: v.remedial_action || 'Dispute and validate with bureau',
    disputeStrategy: v.dispute_strategy || 'File formal dispute with supporting documentation',
  }));

  const reportData: PDFReportData = {
    clientName: client ? `${(client as any).first_name} ${(client as any).last_name}` : 'Unknown Client',
    clientAddress: (client as any)?.address_line1 || '',
    clientCity: (client as any)?.city || '',
    clientState: (client as any)?.state || '',
    clientZip: (client as any)?.zip || '',
    clientSSNLast4: (client as any)?.ssn_last4,
    clientDOB: (client as any)?.dob,
    clientEmail: (client as any)?.email,
    reportDate: (report as any).report_date,
    bureau: (report as any).bureau,
    violations: pdfViolations,
    litigationScore: litScore.score,
    generatedDate: new Date().toISOString().split('T')[0],
    reportId: id,
    orgName: 'RJ Business Solutions',
  };

  const pdfBytes = generatePDFReport(reportData);

  return new Response(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="FCRA-Report-${id}.pdf"`,
    },
  });
});

// ═══════════════════════════════════════════════════════════════
// REPORT IMPORT - MYFREESCORENOW / IDENTITYIQ
// ═══════════════════════════════════════════════════════════════
app.post('/api/reports/import-mfsn', authMiddleware, async (c) => {
  const user = c.get('user');
  const planCheck = await verifyOrgPlanLimits(c, 'report');
  if (!planCheck.allowed) return c.json({ error: planCheck.message }, 403);

  const body = await c.req.json();
  const { clientId, clientEmail } = body;

  if (!clientId || !clientEmail) {
    return c.json({ error: 'Client ID and client email are required' }, 400);
  }

  const creds = resolveMfsnCredentials(body, c.env);
  if (!creds) {
    return c.json({
      error: 'MFSN credentials required (username/password/secretWord in body, or MFSN_EMAIL / MFSN_PASSWORD / MFSN_CLIENT_TOKEN secrets)',
    }, 400);
  }

  try {
    const client = new MFSNClient(creds);
    const { raw: mfsnReportData, normalized } = await client.fetchAndNormalize(String(clientEmail));

    // Map MFSN Data to Internal Format
    const bureauReports = mapMfsnToInternal(mfsnReportData);
    if (bureauReports.length === 0) {
      return c.json({ error: 'No bureau data found in MFSN report response' }, 404);
    }

    const primaryReport = bureauReports[0];
    await backpopulateClientInfo(c, clientId, primaryReport.personalInfo, user.org_id);

    // Persist per-bureau scores when present on normalized payload
    try {
      let eq: number | null = null;
      let ex: number | null = null;
      let tu: number | null = null;
      for (const s of normalized.scores || []) {
        if (s.provider === 'EFX') eq = s.score;
        if (s.provider === 'EXP') ex = s.score;
        if (s.provider === 'TU') tu = s.score;
      }
      if (eq || ex || tu) {
        await c.env.DB.prepare(
          `UPDATE clients SET eq_score = COALESCE(?, eq_score), ex_score = COALESCE(?, ex_score), tu_score = COALESCE(?, tu_score), updated_at = datetime('now') WHERE id = ? AND org_id = ?`
        ).bind(eq, ex, tu, clientId, user.org_id).run();
      }
    } catch (e) {
      console.warn('[MFSN] score update skipped', e);
    }

    const reportId = generateId();

    let totalAccounts = 0;
    let totalInquiries = 0;
    let totalPublicRecords = 0;
    let totalCollections = 0;
    let allViolations: any[] = [];

    for (const report of bureauReports) {
      totalAccounts += report.accounts.length;
      totalInquiries += report.inquiries.length;
      totalPublicRecords += report.publicRecords.length;
      totalCollections += report.collections.length;

      const bureauAnalysis = liveAnalyzeParsedReport(report);
      allViolations = [...allViolations, ...bureauAnalysis.violations];
    }

    const litScore = calculateLitigationScore(allViolations);

    const encryptedRawText = await encryptPII(c, JSON.stringify(mfsnReportData));
    const encryptedParsedData = await encryptPII(c, JSON.stringify(primaryReport));

    await c.env.DB.prepare(
      'INSERT INTO credit_reports (id, org_id, client_id, uploaded_by, bureau, report_date, file_name, raw_text, parsed_data, status, total_accounts, total_inquiries, total_public_records, total_collections, analysis_started_at, analysis_completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))'
    ).bind(
      reportId,
      user.org_id,
      clientId,
      user.id,
      'MyFreeScoreNow (3B)',
      primaryReport.reportDate,
      `mfsn_${String(clientEmail).replace(/[^a-z0-9@._-]/gi, '_')}.json`,
      encryptedRawText,
      encryptedParsedData,
      'analyzed',
      totalAccounts,
      totalInquiries,
      totalPublicRecords,
      totalCollections,
    ).run();

    await saveViolationsForReport(c, user.org_id, reportId, clientId, allViolations);

    await c.env.DB.prepare('INSERT INTO activity_log (id, org_id, client_id, report_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(generateId(), user.org_id, clientId, reportId, user.id, 'report_imported', `Real import from MyFreeScoreNow: ${allViolations.length} grounded findings across 3 bureaus`, JSON.stringify({ score: litScore.score, analysisMode: 'live_rules_engine', bureaus: normalized.bureaus })).run();

    await notifyClientAnalysisReady(c, {
      orgId: user.org_id,
      clientId,
      bureau: 'MyFreeScoreNow (3B)',
      analysis: {
        violations: allViolations,
        rawCount: allViolations.length,
        reasoningSummary: `Live MFSN 3B import: ${allViolations.length} fact-checked findings.`,
      },
    });

    // Soft: attach institutional funding snapshot for staff UI
    let fundingPreview = null;
    try {
      const profile = buildInstitutionalProfile({
        eqScore: normalized.scores.find((s) => s.provider === 'EFX')?.score,
        exScore: normalized.scores.find((s) => s.provider === 'EXP')?.score,
        tuScore: normalized.scores.find((s) => s.provider === 'TU')?.score,
        inquiries: normalized.summary.totalInquiries,
        collections: normalized.summary.totalCollections,
        negativeAccounts: normalized.summary.totalNegativeAccounts,
        highestLimit: Math.max(2500, ...normalized.accounts.map((a) => a.creditLimit || 0)),
      });
      fundingPreview = slimInstitutionalReport(LenderMatchingEngine.runComprehensiveMatch(profile));
    } catch { /* soft */ }

    try { await client.logout(); } catch { /* soft */ }

    // Push refreshed scores + violation count into GoHighLevel
    let ghlSync: any = null;
    try {
      const refreshed = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?')
        .bind(clientId, user.org_id).first() as any;
      const orgRow = await c.env.DB.prepare('SELECT name FROM organizations WHERE id = ?')
        .bind(user.org_id).first() as any;
      if (refreshed && ghlConfigured(c.env)) {
        ghlSync = await syncClientToGhl(c.env, refreshed, {
          portalUrl: `${portalBaseUrl(c.env)}/`,
          violationCount: allViolations.length,
          analysisUnlocked: isPortalAnalysisUnlocked(refreshed),
          orgName: orgRow?.name,
        });
        if (ghlSync?.ok && ghlSync.contactId) {
          try {
            await c.env.DB.prepare(
              `UPDATE clients SET ghl_contact_id = ?, ghl_synced_at = datetime('now') WHERE id = ? AND org_id = ?`
            ).bind(ghlSync.contactId, clientId, user.org_id).run();
          } catch { /* soft */ }
        }
      }
    } catch { /* soft */ }

    return c.json({
      reportId,
      bureau: 'MyFreeScoreNow (Tri-Bureau)',
      reportDate: primaryReport.reportDate,
      personalInfo: primaryReport.personalInfo,
      totalAccounts,
      totalCollections,
      totalInquiries,
      totalPublicRecords,
      violationsFound: allViolations.length,
      violations: allViolations,
      litigationScore: litScore,
      normalizedSummary: normalized.summary,
      scores: normalized.scores,
      fundingPreview,
      ghlSynced: !!ghlSync?.ok,
      ghlContactId: ghlSync?.contactId || null,
    });
  } catch (err: any) {
    console.error('MFSN Import Error:', err);
    if (err instanceof MFSNError) {
      return c.json({ error: err.message, code: err.code }, err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode as any : 500);
    }
    return c.json({ error: `Connection Error: ${err.message}` }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════
// REPORT IMPORT - SMARTCREDIT / CONSUMERDIRECT
// ═══════════════════════════════════════════════════════════════
app.post('/api/reports/import-smartcredit', authMiddleware, async (c) => {
  const user = c.get('user');
  const planCheck = await verifyOrgPlanLimits(c, 'report');
  if (!planCheck.allowed) return c.json({ error: planCheck.message }, 403);

  const body = await c.req.json();
  const { clientId, smartCreditData, trackingToken, username, password, fileText } = body;

  if (!clientId) {
    return c.json({ error: 'Client ID is required' }, 400);
  }

  let payload = smartCreditData;
  let resolvedTrackingToken = trackingToken;
  let bureauReports: CreditReportData[] = [];

  const envName = String(c.env.ENVIRONMENT || '').toLowerCase();
  const sandboxAllowed =
    envName !== 'production' ||
    String(c.env.ALLOW_SMARTCREDIT_SANDBOX || '').toLowerCase() === 'true';
  const isSandbox = username === 'test_smartcredit@rjbusinesssolutions.com';
  if (isSandbox && !sandboxAllowed) {
    return c.json({
      error: 'SmartCredit sandbox mock is disabled in production. Use live SmartCredit credentials or set ALLOW_SMARTCREDIT_SANDBOX=true for demos.',
    }, 403);
  }

  try {
    if (isSandbox) {
      resolvedTrackingToken = "sandbox_token_999";
      const mockEquifax: CreditReportData = {
        bureau: 'Equifax',
        reportDate: new Date().toLocaleDateString(),
        personalInfo: {
          names: [ 'Rick Jefferson', 'Rick A Jefferson' ],
          addresses: [ '1342 NM 333, Tijeras, NM 87059' ],
          employers: [ 'RJ Business Solutions' ],
          ssns: [ '***-**-9999' ],
          dobs: [ '05/21/1985' ]
        },
        accounts: [
          {
            creditorName: 'Chase Bank',
            accountNumber: '411122223333',
            accountType: 'Revolving',
            accountStatus: 'Open',
            dateOpened: '04/10/2021',
            currentBalance: 1500,
            originalAmount: 5000,
            highBalance: 1200, // Balance Exceeds High Balance (Impossible Data)
            creditLimit: 5000,
            monthlyPayment: 50,
            paymentStatus: 'Current',
            paymentHistory: 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
            isCollection: false
          }
        ],
        inquiries: [
          { creditorName: 'Capital One', inquiryDate: '05/10/2026', inquiryType: 'Hard' },
          { creditorName: 'Citibank', inquiryDate: '05/12/2026', inquiryType: 'Hard' },
          { creditorName: 'Discover', inquiryDate: '05/15/2026', inquiryType: 'Hard' },
          { creditorName: 'Wells Fargo', inquiryDate: '06/01/2026', inquiryType: 'Hard' },
          { creditorName: 'Bank of America', inquiryDate: '06/05/2026', inquiryType: 'Hard' },
          { creditorName: 'Synchrony', inquiryDate: '06/10/2026', inquiryType: 'Hard' },
          { creditorName: 'Barclays', inquiryDate: '06/15/2026', inquiryType: 'Hard' }
        ],
        publicRecords: [],
        collections: [
          {
            creditorName: 'ACME Collections',
            accountNumber: '98765-COLL',
            accountType: 'Collection',
            accountStatus: 'Collection',
            dateOpened: '05/15/2018',
            dofd: '01/15/2018', // Obsolete collection (7-year rule)
            currentBalance: 350,
            originalAmount: 350,
            highBalance: 0,
            creditLimit: 0,
            monthlyPayment: 0,
            paymentStatus: 'Collection',
            paymentHistory: '999999999999999999999999999999',
            isCollection: true
          }
        ]
      };

      const mockExperian: CreditReportData = {
        bureau: 'Experian',
        reportDate: new Date().toLocaleDateString(),
        personalInfo: {
          names: [ 'Rick Jefferson' ],
          addresses: [ '1342 NM 333, Tijeras, NM 87059' ],
          employers: [ 'RJ Business Solutions' ],
          ssns: [ '***-**-9999' ],
          dobs: [ '05/21/1985' ]
        },
        accounts: [
          {
            creditorName: 'Chase Bank',
            accountNumber: '411122223333',
            accountType: 'Revolving',
            accountStatus: 'Open',
            dateOpened: '04/10/2021',
            currentBalance: 2500, // Contradicts Equifax's 1500
            originalAmount: 5000,
            highBalance: 2500,
            creditLimit: 0, // Missing Credit Limit - Utilization Distortion
            monthlyPayment: 75,
            paymentStatus: 'Current',
            paymentHistory: 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
            isCollection: false
          }
        ],
        inquiries: [
          { creditorName: 'Capital One', inquiryDate: '05/10/2026', inquiryType: 'Hard' },
          { creditorName: 'Citibank', inquiryDate: '05/12/2026', inquiryType: 'Hard' },
          { creditorName: 'Discover', inquiryDate: '05/15/2026', inquiryType: 'Hard' },
          { creditorName: 'Wells Fargo', inquiryDate: '06/01/2026', inquiryType: 'Hard' },
          { creditorName: 'Bank of America', inquiryDate: '06/05/2026', inquiryType: 'Hard' },
          { creditorName: 'Synchrony', inquiryDate: '06/10/2026', inquiryType: 'Hard' },
          { creditorName: 'Barclays', inquiryDate: '06/15/2026', inquiryType: 'Hard' }
        ],
        publicRecords: [],
        collections: [
          {
            creditorName: 'ACME Collections',
            accountNumber: '98765-COLL',
            accountType: 'Collection',
            accountStatus: 'Collection',
            dateOpened: '05/15/2018',
            dofd: '01/15/2018',
            currentBalance: 350,
            originalAmount: 350,
            highBalance: 0,
            creditLimit: 0,
            monthlyPayment: 0,
            paymentStatus: 'Collection',
            paymentHistory: '999999999999999999999999999999',
            isCollection: true
          }
        ]
      };

      const mockTransUnion: CreditReportData = {
        bureau: 'TransUnion',
        reportDate: new Date().toLocaleDateString(),
        personalInfo: {
          names: [ 'Rick Jefferson' ],
          addresses: [ '1342 NM 333, Tijeras, NM 87059' ],
          employers: [ 'RJ Business Solutions' ],
          ssns: [ '***-**-9999' ],
          dobs: [ '05/21/1985' ]
        },
        accounts: [
          {
            creditorName: 'Chase Bank',
            accountNumber: '411122223333',
            accountType: 'Revolving',
            accountStatus: 'Open',
            dateOpened: '04/10/2021',
            currentBalance: 1500, // Matches Equifax but has credit limit reported correctly
            originalAmount: 5000,
            highBalance: 1500,
            creditLimit: 5000,
            monthlyPayment: 50,
            paymentStatus: 'Current',
            paymentHistory: 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
            isCollection: false
          }
        ],
        inquiries: [
          { creditorName: 'Capital One', inquiryDate: '05/10/2026', inquiryType: 'Hard' },
          { creditorName: 'Citibank', inquiryDate: '05/12/2026', inquiryType: 'Hard' },
          { creditorName: 'Discover', inquiryDate: '05/15/2026', inquiryType: 'Hard' },
          { creditorName: 'Wells Fargo', inquiryDate: '06/01/2026', inquiryType: 'Hard' },
          { creditorName: 'Bank of America', inquiryDate: '06/05/2026', inquiryType: 'Hard' },
          { creditorName: 'Synchrony', inquiryDate: '06/10/2026', inquiryType: 'Hard' },
          { creditorName: 'Barclays', inquiryDate: '06/15/2026', inquiryType: 'Hard' }
        ],
        publicRecords: [],
        collections: [
          {
            creditorName: 'ACME Collections',
            accountNumber: '98765-COLL',
            accountType: 'Collection',
            accountStatus: 'Collection',
            dateOpened: '05/15/2018',
            dofd: '01/15/2018',
            currentBalance: 350,
            originalAmount: 350,
            highBalance: 0,
            creditLimit: 0,
            monthlyPayment: 0,
            paymentStatus: 'Collection',
            paymentHistory: '999999999999999999999999999999',
            isCollection: true
          }
        ]
      };

      bureauReports = [mockEquifax, mockExperian, mockTransUnion];
      payload = {
        isMockSandbox: true,
        reports: bureauReports
      };
    } else if (fileText) {
      try {
        const parsedJson = JSON.parse(fileText);
        bureauReports = mapSmartCreditToInternal(parsedJson);
        payload = parsedJson;
        resolvedTrackingToken = trackingToken || 'file_upload_json';
      } catch (jsonErr) {
        const parsedReport = parseCreditReportText(fileText);
        bureauReports = [parsedReport];
        payload = { rawText: fileText, source: 'file_upload_text' };
        resolvedTrackingToken = trackingToken || 'file_upload_text';
      }
    } else {
      if (username && password) {
        const clientKey = c.env.SMARTCREDIT_CLIENT_KEY;
        const clientSecret = c.env.SMARTCREDIT_CLIENT_SECRET;
        if (!clientKey || !clientSecret) {
          return c.json({ error: 'SmartCredit credentials are not configured. Set SMARTCREDIT_CLIENT_KEY and SMARTCREDIT_CLIENT_SECRET.' }, 503);
        }
        const authHeader = 'Basic ' + btoa(`${clientKey}:${clientSecret}`);

        const authRes = await fetch('https://api.smartcredit.com/v1.1/member/authenticate', {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ username, password })
        });

        if (!authRes.ok) {
          const errText = await authRes.text();
          return c.json({ error: `SmartCredit Authentication Failed (${authRes.status}): ${errText}` }, authRes.status as any);
        }

        const authData: any = await authRes.json();
        resolvedTrackingToken = authData.trackingToken || authData.data?.trackingToken || authData.member?.trackingToken || authData.token;

        if (!resolvedTrackingToken) {
          return c.json({ error: 'Failed to resolve trackingToken from authentication response' }, 500);
        }
      }

      // If trackingToken is provided/resolved and raw smartCreditData is absent, fetch via ConsumerDirect API
      if (resolvedTrackingToken && !payload) {
        const clientKey = c.env.SMARTCREDIT_CLIENT_KEY;
        const clientSecret = c.env.SMARTCREDIT_CLIENT_SECRET;
        if (!clientKey || !clientSecret) {
          return c.json({ error: 'SmartCredit credentials are not configured. Set SMARTCREDIT_CLIENT_KEY and SMARTCREDIT_CLIENT_SECRET.' }, 503);
        }
        const url = `https://api.smartcredit.com/v1.1/report/retrieve?clientKey=${clientKey}&trackingToken=${resolvedTrackingToken}`;
        const authHeader = 'Basic ' + btoa(`${clientKey}:${clientSecret}`);

        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json'
          }
        });

        if (!res.ok) {
          const errText = await res.text();
          return c.json({ error: `SmartCredit API Retrieve Failed (${res.status}): ${errText}` }, res.status as any);
        }

        payload = await res.json();
      }

      if (!payload) {
        return c.json({ error: 'Either smartCreditData (JSON payload) or trackingToken or credentials are required' }, 400);
      }

      // Map SmartCredit Data to Internal Format
      bureauReports = mapSmartCreditToInternal(payload);
    }

    if (bureauReports.length === 0) {
      return c.json({ error: 'No bureau data found in SmartCredit report response' }, 404);
    }

    const actionText = isSandbox
      ? `Sandbox simulation import from SmartCredit: violations across ${bureauReports.length} bureaus`
      : fileText
        ? `Manual report upload/import from SmartCredit`
        : `Live import from SmartCredit across ${bureauReports.length} bureau(s)`;

    const batch = await importBureauReportsBatch(c, {
      generateId,
      encryptPII,
      backpopulateClientInfo,
      saveViolationsForReport,
      persistBureauScores,
      markPriorBureauReportsStale,
      refreshBureauPackStatus,
      computeAndStoreFundability,
    }, {
      clientId,
      bureauReports,
      rawPayload: payload,
      sourceProvider: isSandbox ? 'SmartCreditSandbox' : 'SmartCredit',
      sourcePayloadType: fileText ? 'file' : 'json',
      fileNamePrefix: isSandbox ? 'smartcredit-sandbox' : `smartcredit_${String(resolvedTrackingToken || 'manual').slice(0, 24)}`,
      activityAction: 'report_imported',
      activityDescription: actionText,
    });

    const primary = batch.results[0];
    const primaryReport = bureauReports[0];

    return c.json({
      reportId: primary?.reportId,
      reportIds: batch.results.map((r) => r.reportId),
      reports: batch.results,
      bureau: batch.results.map((r) => r.bureau).join(', '),
      reportDate: primaryReport?.reportDate,
      personalInfo: primaryReport?.personalInfo,
      totalAccounts: bureauReports.reduce((s, r) => s + r.accounts.length, 0),
      totalCollections: bureauReports.reduce((s, r) => s + r.collections.length, 0),
      totalInquiries: bureauReports.reduce((s, r) => s + r.inquiries.length, 0),
      totalPublicRecords: bureauReports.reduce((s, r) => s + r.publicRecords.length, 0),
      violationsFound: batch.totalViolations,
      bureauPack: batch.bureauPack,
      fundability: batch.fundability,
      isMockSandbox: isSandbox,
    });
  } catch (err: any) {
    console.error('SmartCredit Import Error:', err);
    return c.json({ error: `Connection Error: ${err.message}` }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════
// VIOLATIONS ROUTES (enhanced)
// ═══════════════════════════════════════════════════════════════
app.get('/api/violations', authMiddleware, async (c) => {
  const user = c.get('user');
  const severity = c.req.query('severity');
  const category = c.req.query('category');
  
  let query = 'SELECT v.*, c.first_name, c.last_name FROM violations v JOIN clients c ON v.client_id = c.id WHERE v.org_id = ?';
  const params: any[] = [user.org_id];
  if (severity) { query += ' AND v.severity = ?'; params.push(severity); }
  if (category) { query += ' AND v.category = ?'; params.push(category); }
  query += ' ORDER BY v.created_at DESC';

  const result = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ violations: hydrateViolationRows(result?.results || []) });
});

app.put('/api/violations/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const data = await c.req.json();

  await c.env.DB.prepare('UPDATE violations SET status=?, dispute_sent_date=?, dispute_response_date=?, dispute_result=?, notes=?, updated_at=datetime("now") WHERE id=? AND org_id=?').bind(data.status, data.disputeSentDate || null, data.disputeResponseDate || null, data.disputeResult || null, data.notes || null, id, user.org_id).run();

  return c.json({ ok: true });
});

// Export violations as text report
app.get('/api/violations/export', authMiddleware, async (c) => {
  const user = c.get('user');
  const clientId = c.req.query('clientId');
  const reportId = c.req.query('reportId');
  
  let query = 'SELECT v.*, c.first_name, c.last_name FROM violations v JOIN clients c ON v.client_id = c.id WHERE v.org_id = ?';
  const params: any[] = [user.org_id];
  if (clientId) { query += ' AND v.client_id = ?'; params.push(clientId); }
  if (reportId) { query += ' AND v.report_id = ?'; params.push(reportId); }
  query += ' ORDER BY v.severity ASC, v.created_at DESC';

  const result = await c.env.DB.prepare(query).bind(...params).all();
  const violations = result?.results || [];
  const litScore = calculateLitigationScore(violations as any);

  // Build text export
  let report = `${'═'.repeat(70)}\nFCRA/FDCPA VIOLATION ANALYSIS REPORT\nGenerated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n${'═'.repeat(70)}\n\n`;
  report += `SUMMARY:\n  Total Violations: ${violations.length}\n  Litigation Score: ${litScore.score}/100 (${litScore.grade})\n  Recommendation: ${litScore.recommendation}\n  Total Damages: $${litScore.totalDamagesMin.toLocaleString()} — $${litScore.totalDamagesMax.toLocaleString()}\n\n`;
  report += `SETTLEMENT RANGES:\n  Pre-Litigation: $${litScore.preLitSettlement.min.toLocaleString()} — $${litScore.preLitSettlement.max.toLocaleString()}\n  Post-Filing: $${litScore.postFilingSettlement.min.toLocaleString()} — $${litScore.postFilingSettlement.max.toLocaleString()}\n  Trial Verdict: $${litScore.trialVerdict.min.toLocaleString()} — $${litScore.trialVerdict.max.toLocaleString()}\n\n`;
  
  report += `${'─'.repeat(70)}\nDETAILED VIOLATIONS:\n${'─'.repeat(70)}\n\n`;
  for (const [i, v] of (violations as any[]).entries()) {
    report += `VIOLATION ${i + 1} of ${violations.length} — [${(v.severity || '').toUpperCase()}]\n`;
    report += `  Category: ${v.category} — ${v.subcategory}\n`;
    report += `  Statute: ${v.statute}\n`;
    report += `  Account: ${v.account_name || 'N/A'} #${v.account_number || 'N/A'}\n`;
    report += `  Evidence: ${v.evidence}\n`;
    report += `  Legal Standard: ${v.legal_standard}\n`;
    report += `  Case Law: ${v.case_law}\n`;
    report += `  Defendant: ${v.defendant_type} — ${v.defendant_name}\n`;
    report += `  Damages: $${(v.total_damages_min || 0).toLocaleString()} — $${(v.total_damages_max || 0).toLocaleString()}\n`;
    report += '\n' + '─'.repeat(50) + '\n\n';
  }

  report += `\nLITIGATION PLAN:\n${litScore.litigationPlan.map((s, i) => `  ${s}`).join('\n')}\n`;

  return c.text(report);
});

// ═══════════════════════════════════════════════════════════════
// DOCUMENT GENERATION ROUTES (enhanced)
// ═══════════════════════════════════════════════════════════════
app.get('/api/documents', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role === 'client') {
    const client = await c.env.DB.prepare('SELECT * FROM clients WHERE email = ? AND org_id = ?').bind(user.email, user.org_id).first() as any;
    if (!client) return c.json({ documents: [] });
    if (!isPortalAnalysisUnlocked(client)) {
      return c.json({ documents: [], analysisLocked: true, lockMessage: 'Dispute letters unlock after payment approval.' });
    }
    const result = await c.env.DB.prepare(
      'SELECT d.*, c.first_name, c.last_name FROM documents d JOIN clients c ON d.client_id = c.id WHERE d.org_id = ? AND d.client_id = ? ORDER BY d.created_at DESC'
    ).bind(user.org_id, client.id).all();
    return c.json({ documents: result?.results || [] });
  }
  const result = await c.env.DB.prepare('SELECT d.*, c.first_name, c.last_name FROM documents d JOIN clients c ON d.client_id = c.id WHERE d.org_id = ? ORDER BY d.created_at DESC').bind(user.org_id).all();
  return c.json({ documents: result?.results || [] });
});

/** Intelligent letter recommendations from live violations (CRO decision support). */
app.post('/api/documents/recommend', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const clientId = body.clientId;
  const reportId = body.reportId;
  if (!clientId && !reportId) return c.json({ error: 'clientId or reportId required' }, 400);

  const client = clientId
    ? await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(clientId, user.org_id).first() as any
    : null;
  if (clientId && !client) return c.json({ error: 'Client not found' }, 404);

  const violationsResult = reportId
    ? await c.env.DB.prepare('SELECT * FROM violations WHERE report_id = ? AND org_id = ?').bind(reportId, user.org_id).all()
    : await c.env.DB.prepare('SELECT * FROM violations WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 100').bind(clientId, user.org_id).all();
  const violations = (violationsResult?.results || []) as any[];
  const litScore = violations.length ? calculateLitigationScore(violations) : { score: 0 };
  const firmLh = await loadOrgLetterhead(c.env, user.org_id);
  const strategy = recommendLetterStrategy(violations, {
    litigationScore: (litScore as any).score || 0,
    clientState: client?.state || body.clientState || '',
    includeLitigationPack: body.includeLitigationPack !== false,
  });

  return c.json({
    ok: true,
    strategy,
    litigationScore: litScore,
    violationCount: violations.length,
    firmBrandingConfigured: firmLh.configured,
    firmName: firmLh.firmName || null,
  });
});

app.post('/api/documents/generate', authMiddleware, async (c) => {
  const user = c.get('user');
  const { clientId, reportId, violationIds, docType, bureau, creditorName, creditorAddress } = await c.req.json();

  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(clientId, user.org_id).first() as any;
  if (!client) return c.json({ error: 'Client not found' }, 404);

  const violationsResult = violationIds?.length
    ? await c.env.DB.prepare(`SELECT * FROM violations WHERE id IN (${violationIds.map(() => '?').join(',')}) AND org_id = ?`).bind(...violationIds, user.org_id).all()
    : reportId
      ? await c.env.DB.prepare('SELECT * FROM violations WHERE report_id = ? AND org_id = ?').bind(reportId, user.org_id).all()
      : await c.env.DB.prepare('SELECT * FROM violations WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 50').bind(clientId, user.org_id).all();

  const violations = violationsResult?.results || [];
  const docDef = (DOCUMENT_TYPES as any)[docType];
  if (!docDef) return c.json({ error: 'Unknown document type' }, 400);

  if (String(docType).toLowerCase().includes('identity-theft')) {
    const att = await c.env.DB.prepare(
      `SELECT question_id, response FROM client_attestations WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 80`
    ).bind(clientId, user.org_id).all().catch(() => ({ results: [] as any[] }));
    const affirmed = (att?.results || []).some((a: any) => a.question_id === 'identity_theft' && String(a.response).toUpperCase() === 'YES');
    const mine = (att?.results || []).some((a: any) => a.question_id === 'opened_account' && String(a.response).toUpperCase() === 'YES');
    const gate = evaluateIdentityTheftGate({
      consumerAffirmedIdentityTheft: affirmed,
      accountIsMine: mine,
      promptInjection: !affirmed,
    });
    if (gate.blocked) {
      return c.json({ error: 'IDENTITY_THEFT_BLOCKED', message: gate.reason }, 403);
    }
  }

  const firmLh = await loadOrgLetterhead(c.env, user.org_id);
  const docData: DocumentData = {
    clientName: `${client.first_name} ${client.last_name}`,
    clientAddress: client.address_line1 || '',
    clientCity: client.city || '',
    clientState: client.state || '',
    clientZip: client.zip || '',
    clientSSNLast4: client.ssn_last4 || '',
    clientDOB: client.dob || '',
    today: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    violations: violations as any[],
    bureau: bureau || 'Equifax',
    creditorName,
    creditorAddress,
    reportId,
    clientPhone: client.phone || '',
    clientEmail: client.email || '',
  };

  const content = brandLetterContent(docDef.fn(docData), firmLh);
  const docId = generateId();
  const title = `${docDef.name} - ${client.first_name} ${client.last_name}`;

  await c.env.DB.prepare(
    'INSERT INTO documents (id, org_id, client_id, report_id, violation_ids, doc_type, doc_subtype, title, recipient_name, recipient_address, content, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(docId, user.org_id, clientId, reportId || null, JSON.stringify(violationIds || []), docType, docDef.category, title, creditorName || null, creditorAddress || null, content, 'draft', user.id).run();

  await c.env.DB.prepare('INSERT INTO activity_log (id, org_id, client_id, document_id, user_id, action, description) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(generateId(), user.org_id, clientId, docId, user.id, 'document_generated', `Generated ${docDef.name}${firmLh.configured ? ' (firm-branded)' : ''}`).run();

  try {
    const email =
      client.email && !String(client.email).includes('.noreply@') && !String(client.email).endsWith('@smartfcra.local')
        ? client.email
        : null;
    await sendTemplatedClientMessage(c.env, {
      templateId: 'dispute_letters_ready',
      orgId: user.org_id,
      clientId,
      email,
      notifyEmail: !!email && client.notify_email !== 0,
      vars: {
        clientName: `${client.first_name} ${client.last_name}`,
        docCount: '1',
        portalUrl: `${portalBaseUrl(c.env)}/`,
      },
    });
  } catch { /* soft */ }

  return c.json({ id: docId, title, content, docType, category: docDef.category });
});

// Bulk document generation — generate multiple docs at once
app.post('/api/documents/generate-bulk', authMiddleware, async (c) => {
  const user = c.get('user');
  const { clientId, reportId, docTypes, bureau, creditorName, creditorAddress } = await c.req.json();

  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(clientId, user.org_id).first() as any;
  if (!client) return c.json({ error: 'Client not found' }, 404);

  const violationsResult = reportId
    ? await c.env.DB.prepare('SELECT * FROM violations WHERE report_id = ? AND org_id = ?').bind(reportId, user.org_id).all()
    : await c.env.DB.prepare('SELECT * FROM violations WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 50').bind(clientId, user.org_id).all();

  const violations = violationsResult?.results || [];
  const firmLh = await loadOrgLetterhead(c.env, user.org_id);
  const generated: any[] = [];

  for (const docType of (docTypes || [])) {
    const docDef = (DOCUMENT_TYPES as any)[docType];
    if (!docDef) continue;

    const docData: DocumentData = {
      clientName: `${client.first_name} ${client.last_name}`,
      clientAddress: client.address_line1 || '',
      clientCity: client.city || '',
      clientState: client.state || '',
      clientZip: client.zip || '',
      clientSSNLast4: client.ssn_last4 || '',
      clientDOB: client.dob || '',
      today: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      violations: violations as any[],
      bureau: bureau || 'Equifax',
      creditorName,
      creditorAddress,
      reportId,
      clientPhone: client.phone || '',
      clientEmail: client.email || '',
    };

    const content = brandLetterContent(docDef.fn(docData), firmLh);
    const docId = generateId();
    const title = `${docDef.name} - ${client.first_name} ${client.last_name}`;

    await c.env.DB.prepare(
      'INSERT INTO documents (id, org_id, client_id, report_id, violation_ids, doc_type, doc_subtype, title, recipient_name, recipient_address, content, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(docId, user.org_id, clientId, reportId || null, '[]', docType, docDef.category, title, creditorName || null, creditorAddress || null, content, 'draft', user.id).run();

    generated.push({ id: docId, title, docType, category: docDef.category, content });
  }

  if (generated.length > 0) {
    await c.env.DB.prepare('INSERT INTO activity_log (id, org_id, client_id, user_id, action, description) VALUES (?, ?, ?, ?, ?, ?)').bind(generateId(), user.org_id, clientId, user.id, 'bulk_documents_generated', `Generated ${generated.length} documents`).run();
  }

  return c.json({ documents: generated, count: generated.length });
});

app.get('/api/documents/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ? AND org_id = ?').bind(id, user.org_id).first();
  if (!doc) return c.json({ error: 'Not found' }, 404);
  return c.json({ document: doc });
});

app.put('/api/documents/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const { content } = await c.req.json();
  await c.env.DB.prepare('UPDATE documents SET content = ?, updated_at = datetime("now") WHERE id = ? AND org_id = ?').bind(content, id, user.org_id).run();
  return c.json({ success: true });
});

app.post('/api/documents/:id/ai-rewrite', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ? AND org_id = ?').bind(id, user.org_id).first() as any;
  if (!doc) return c.json({ error: 'Document not found' }, 404);
  if (!doc.content) return c.json({ error: 'Document has no text content to rewrite' }, 400);

  try {
    const systemPrompt = `You are an expert consumer advocate and legal drafting specialist.
Rewrite the provided credit bureau dispute letter to bypass OCR template-matching scanners by semantically restructuring sentences and format while remaining authentic.

CRITICAL:
1. Preserve exactly: names, addresses, SSN last4, DOB, creditor names, account numbers, amounts, dates, and statutory citations (FCRA 15 U.S.C. § 1681 et seq.).
2. Rewrite all other prose. Professional, firm, assertive tone.
3. Return ONLY the rewritten plain-text letter — no markdown, no preamble.`;

    const result = await generateAiText(c.env, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Here is the dispute letter to rewrite:\n\n${doc.content}` },
    ]);

    await c.env.DB.prepare('UPDATE documents SET content = ?, updated_at = datetime("now") WHERE id = ? AND org_id = ?')
      .bind(result.text, id, user.org_id).run();

    await c.env.DB.prepare(
      'INSERT INTO activity_log (id, org_id, client_id, document_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      generateId(), user.org_id, doc.client_id, id, user.id, 'document_ai_rewritten',
      `AI rewrote document "${doc.title}" via ${result.provider}/${result.model}`,
      JSON.stringify({ provider: result.provider, model: result.model })
    ).run();

    return c.json({ success: true, content: result.text, provider: result.provider, model: result.model });
  } catch (err: any) {
    console.error('[AI REWRITE ERROR]', err);
    return c.json({ error: `AI rewrite failed: ${err.message}` }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════
// MULTI-PROVIDER AI — chat, providers list, free media
// ═══════════════════════════════════════════════════════════════
app.get('/api/ai/providers', authMiddleware, async (c) => {
  const providers = listConfiguredProviders(c.env);
  return c.json({
    freeOnly: String(c.env.FREE_AI_ONLY || 'true').toLowerCase() !== 'false',
    defaultProvider: c.env.AI_DEFAULT_PROVIDER || 'nvidia',
    providers: providers.filter(p => p.free || String(c.env.FREE_AI_ONLY || 'true').toLowerCase() === 'false'),
    allProviders: providers,
  });
});

app.get('/api/ai/mentors', authMiddleware, async (c) => {
  const user = c.get('user');
  const audience = user.role === 'client' ? 'client' : 'staff';
  const mentors = MENTORS.filter(m => m.audience === audience || m.audience === 'both');
  return c.json({ mentors, knowledge: KNOWLEDGE_CORPUS_META });
});

app.post('/api/ai/mentors/:id/chat', authMiddleware, async (c) => {
  const user = c.get('user');
  const mentorId = c.req.param('id') as MentorId;
  const body = await c.req.json();
  const message = String(body.message || '').trim();
  if (!message) return c.json({ error: 'message required' }, 400);

  const { mentor, knowledgeBlock } = buildMentorContext(mentorId, message);
  if (user.role === 'client' && mentor.audience === 'staff') {
    return c.json({ error: 'This mentor is staff-only' }, 403);
  }

  const retrieved = await retrieveKnowledge(c.env, message, 5);
  const ragBlock = retrieved.results.length
    ? `\n\nRETRIEVED KNOWLEDGE (cite ONLY these — do not invent cases or statutes):\n${retrieved.results.map((r, i) => `[${i + 1}] ${r.title}${r.citation ? ` (${r.citation})` : ''}\n${r.body}`).join('\n\n')}\nRetrieval method: ${retrieved.method}. If the answer is not supported by retrieved knowledge or the curated mentor block, say you need attorney review.`
    : `\n\nNo DB knowledge hits. Use only the curated mentor knowledge block. Never invent case names or holdings.`;

  try {
    const result = await generateAiText(c.env, [
      { role: 'system', content: `${mentor.systemPrompt}\n\n${knowledgeBlock}${ragBlock}` },
      { role: 'user', content: message },
    ]);
    await c.env.DB.prepare(
      'INSERT INTO activity_log (id, org_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      generateId(), user.org_id, user.id, 'ai_mentor_chat',
      `Mentor ${mentor.id} via ${result.provider}`,
      JSON.stringify({ mentorId: mentor.id, provider: result.provider, model: result.model, kbMethod: retrieved.method, kbHits: retrieved.results.length })
    ).run();
    return c.json({
      reply: result.text,
      mentor: { id: mentor.id, name: mentor.name },
      provider: result.provider,
      model: result.model,
      knowledgeUsed: true,
      knowledge: { method: retrieved.method, results: retrieved.results.map((r) => ({ id: r.id, title: r.title, citation: r.citation, score: r.score })) },
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 502);
  }
});

app.post('/api/ai/chat', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const message = String(body.message || '').trim();
  if (!message) return c.json({ error: 'message required' }, 400);

  // Route education / ops into mentor agents by default
  const mentorId: MentorId =
    body.mentorId ||
    (body.mode === 'legal-education' || user.role === 'client' ? 'fcra-mentor' : 'dispute-strategist');
  const { mentor, knowledgeBlock } = buildMentorContext(mentorId, message);

  try {
    const result = await generateAiText(c.env, [
      { role: 'system', content: `${mentor.systemPrompt}\nCompany: ${c.env.COMPANY_NAME || 'RJ Business Solutions'}.\n\n${knowledgeBlock}` },
      { role: 'user', content: message },
    ]);
    await c.env.DB.prepare(
      'INSERT INTO activity_log (id, org_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      generateId(), user.org_id, user.id, 'ai_chat',
      `AI chat via ${result.provider}/${mentor.id}`,
      JSON.stringify({ provider: result.provider, model: result.model, mentorId: mentor.id, mode: body.mode || 'ops' })
    ).run();
    return c.json({ reply: result.text, provider: result.provider, model: result.model, mentor: mentor.id });
  } catch (err: any) {
    return c.json({ error: err.message }, 502);
  }
});

app.get('/api/ai/knowledge/search', authMiddleware, async (c) => {
  const q = c.req.query('q') || '';
  if (!q.trim()) return c.json({ query: q, results: [], method: 'empty', meta: KNOWLEDGE_CORPUS_META });
  const dbHit = await retrieveKnowledge(c.env, q, 8);
  // Merge curated in-memory corpus as secondary (never invent beyond either)
  const memory = retrieveCaseLawKnowledge(q, 4).map((r: any) => ({
    ...r,
    method: 'memory_corpus',
    score: r.score || 0.5,
  }));
  return c.json({
    query: q,
    results: dbHit.results.length ? dbHit.results : memory,
    method: dbHit.method,
    memoryFallback: !dbHit.results.length,
    meta: { ...KNOWLEDGE_CORPUS_META, seededHint: dbHit.seededHint || null },
  });
});

app.post('/api/ai/media/generate', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role === 'client') return c.json({ error: 'Forbidden' }, 403);
  const { prompt } = await c.req.json();
  if (!prompt || String(prompt).trim().length < 8) return c.json({ error: 'prompt required (min 8 chars)' }, 400);

  try {
    const img = await generateFreeImage(c.env, String(prompt));
    await c.env.DB.prepare(
      'INSERT INTO activity_log (id, org_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      generateId(), user.org_id, user.id, 'ai_media_generate',
      `Generated media via ${img.provider}`,
      JSON.stringify({ provider: img.provider, model: img.model })
    ).run();
    return c.json(img);
  } catch (err: any) {
    return c.json({ error: err.message }, 502);
  }
});

app.get('/api/billing/publishable-key', authMiddleware, async (c) => {
  return c.json({ publishableKey: c.env.STRIPE_PUBLISHABLE_KEY || null });
});

app.get('/api/billing/mode', authMiddleware, async (c) => {
  const key = c.env.STRIPE_API_KEY || '';
  let mode: 'test' | 'live' | 'unconfigured' = 'unconfigured';
  if (key.startsWith('sk_test_')) mode = 'test';
  else if (key.startsWith('sk_live_')) mode = 'live';
  return c.json({ mode, testMode: mode === 'test' });
});

app.get('/api/company', async (c) => {
  return c.json({
    name: c.env.COMPANY_NAME || 'RJ Business Solutions',
    owner: c.env.COMPANY_OWNER || 'Rick Jefferson',
    address: c.env.COMPANY_ADDRESS || '',
    website: c.env.COMPANY_WEBSITE || 'https://rjbusinesssolutions.org',
    email: c.env.COMPANY_EMAIL || 'support@rjbusinesssolutions.org',
    logo: c.env.COMPANY_LOGO || '',
  });
});


// ═══════════════════════════════════════════════════════════════
// FOUNDER OS SUITE INTEGRATION ENDPOINTS
// ═══════════════════════════════════════════════════════════════
app.get('/api/founder-templates', authMiddleware, async (c) => {
  const templates = Object.entries(FOUNDER_TEMPLATES).map(([key, val]) => ({
    id: key,
    name: val.name,
    description: val.description,
    fields: val.fields,
  }));
  return c.json({ templates });
});

app.post('/api/documents/preview-founder', authMiddleware, async (c) => {
  const { templateId, fields } = await c.req.json();
  const template = FOUNDER_TEMPLATES[templateId];
  if (!template) {
    return c.json({ error: 'Template not found' }, 404);
  }
  const content = template.fn(fields || {});
  return c.json({ content });
});

app.post('/api/documents/generate-founder', authMiddleware, async (c) => {
  const user = c.get('user');
  const { clientId, templateId, fields } = await c.req.json();

  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(clientId, user.org_id).first() as any;
  if (!client) return c.json({ error: 'Client not found' }, 404);

  const template = FOUNDER_TEMPLATES[templateId];
  if (!template) return c.json({ error: 'Template not found' }, 404);

  const content = template.fn(fields || {});
  const docId = generateId();
  const title = `${template.name} - ${client.first_name} ${client.last_name}`;

  await c.env.DB.prepare(
    'INSERT INTO documents (id, org_id, client_id, doc_type, doc_subtype, title, content, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(docId, user.org_id, clientId, templateId, 'founder_os', title, content, 'draft', user.id).run();

  await c.env.DB.prepare('INSERT INTO activity_log (id, org_id, client_id, document_id, user_id, action, description) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(generateId(), user.org_id, clientId, docId, user.id, 'document_generated', `Generated Founder OS: ${template.name}`).run();

  return c.json({ id: docId, title, content, docType: templateId, doc_subtype: 'founder_os' });
});

app.get('/api/documents/:id/pdf', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ? AND org_id = ?').bind(id, user.org_id).first() as any;
  if (!doc) return c.json({ error: 'Document not found' }, 404);

  // Load B2B organization settings — nested letterhead (Settings UI) + flat keys
  const org = await c.env.DB.prepare('SELECT name, settings FROM organizations WHERE id = ?').bind(user.org_id).first() as any;
  let settings: any = {};
  try { settings = JSON.parse(org?.settings || '{}'); } catch { settings = {}; }
  const { letterhead: firmLh } = normalizeOrgLetterhead(settings, org?.name);

  // Support real-time UI overrides via query parameters
  const queryHiredAdvocate = c.req.query('isHiredAdvocate');
  const queryRepAttached = c.req.query('repAgreementAttached');

  const isHiredAdvocate = queryHiredAdvocate !== undefined
    ? queryHiredAdvocate === 'true'
    : firmLh.isHiredAdvocate;

  const repAgreementAttached = queryRepAttached !== undefined
    ? queryRepAttached === 'true'
    : firmLh.repAgreementAttached;

  const customLetterhead = {
    orgName: firmLh.firmName || org?.name || 'RJ Business Solutions',
    logoBase64: firmLh.logoBase64 || undefined,
    headerText: firmLh.firmName || firmLh.headerText || doc.title,
    customSubtext: firmLh.customSubtext || `${firmLh.firmName || org?.name || 'RJ Business Solutions'} • Smart FCRA dispute document`,
    isHiredAdvocate,
    repAgreementAttached
  };

  // Ensure body also carries firm brand even for legacy docs generated pre-branding
  const brandedBody = brandLetterContent(doc.content || '', firmLh);
  const pdfBytes = generatePDFFromText(doc.title, brandedBody, customLetterhead);

  return new Response(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="DisputeLetter-${id}.pdf"`,
    },
  });
});

// ═══════════════════════════════════════════════════════════════
// CLICK2MAIL DOCUMENT SENDING
// ═══════════════════════════════════════════════════════════════
app.post('/api/documents/:id/send', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const { recipientName, recipientAddress, recipientCity, recipientState, recipientZip } = await c.req.json();

  const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ? AND org_id = ?').bind(id, user.org_id).first() as any;
  if (!doc) return c.json({ error: 'Document not found' }, 404);

  let mailing;
  try {
    mailing = await sendLetterViaClick2Mail(c.env, {
      title: doc.title || 'FCRA Legal Document',
      content: doc.content || '',
      recipient: {
        name: recipientName || doc.recipient_name || '',
        address1: recipientAddress || doc.recipient_address || '',
        city: recipientCity || '',
        state: recipientState || '',
        zip: recipientZip || '',
      },
      mailClass: 'FIRST_CLASS',
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Mail send failed' }, err.status || 502);
  }

  const clockId = generateId();
  const clock = await persistInvestigationClock({
    db: c.env.DB,
    id: clockId,
    orgId: user.org_id,
    clientId: doc.client_id,
    documentId: id,
  });

  const sentDateStr = clock.mailingDate || new Date().toISOString().split('T')[0];
  await c.env.DB.prepare(
    'UPDATE documents SET status = ?, sent_date = ?, response_due_date = ?, mailing_id = ?, mail_class = ?, investigation_clock_id = ?, updated_at = datetime("now") WHERE id = ?'
  ).bind('sent', sentDateStr, clock.operationalTarget, mailing.mailingId, mailing.mailClass, clockId, id).run().catch(async () => {
    await c.env.DB.prepare(
      'UPDATE documents SET status = ?, sent_date = ?, response_due_date = ?, updated_at = datetime("now") WHERE id = ?'
    ).bind('sent', sentDateStr, clock.operationalTarget, id).run();
  });

  await recordServiceCompleted({
    db: c.env.DB,
    id: generateId(),
    orgId: user.org_id,
    clientId: doc.client_id,
    serviceType: 'dispute_mailing',
    performedBy: user.id,
    deliverableId: id,
  });

  await c.env.DB.prepare('INSERT INTO activity_log (id, org_id, client_id, document_id, user_id, action, description) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(generateId(), user.org_id, doc.client_id, id, user.id, 'document_mailed', `Mailed "${doc.title}" to ${recipientName || doc.recipient_name || 'recipient'} · FCRA 611 clock ${clock.statutoryTarget}`).run();

  try {
    const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(doc.client_id, user.org_id).first() as any;
    if (client) {
      const email =
        client.email && !String(client.email).includes('.noreply@') && !String(client.email).endsWith('@smartfcra.local')
          ? client.email
          : null;
      await sendTemplatedClientMessage(c.env, {
        templateId: 'dispute_mailed',
        orgId: user.org_id,
        clientId: doc.client_id,
        email,
        notifyEmail: !!email && client.notify_email !== 0,
        vars: {
          clientName: `${client.first_name} ${client.last_name}`,
          tracking: mailing.mailingId || 'pending',
          portalUrl: `${portalBaseUrl(c.env)}/`,
        },
      });
    }
  } catch { /* soft */ }

  return c.json({
    success: true,
    mailingId: mailing.mailingId,
    investigationClock: clock,
    message: 'Document mailed. FCRA § 611 30-day investigation clock started (35-day operational due date includes mail transit).',
  });
});

// ═══════════════════════════════════════════════════════════════
// TEAM / ORG MANAGEMENT
// ═══════════════════════════════════════════════════════════════
app.get('/api/team', authMiddleware, async (c) => {
  const user = c.get('user');
  const result = await c.env.DB.prepare('SELECT id, name, email, role, is_active, last_login, created_at FROM users WHERE org_id = ?').bind(user.org_id).all();
  return c.json({ members: result?.results || [] });
});

app.post('/api/team/invite', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin' && user.role !== 'super_admin') return c.json({ error: 'Admin only' }, 403);

  const planCheck = await verifyOrgPlanLimits(c, 'user');
  if (!planCheck.allowed) return c.json({ error: planCheck.message }, 403);
  
  const { name, email, password, role } = await c.req.json();
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return c.json({ error: 'Email already exists' }, 409);

  const id = generateId();
  const hash = await hashPassword(password);
  await c.env.DB.prepare('INSERT INTO users (id, org_id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)').bind(id, user.org_id, email, name, hash, role || 'member').run();

  let emailStatus: string | null = null;
  try {
    const brand = await loadOrgBrand(c.env, user.org_id);
    const loginUrl = `${portalBaseUrl(c.env, c.req.url)}/`;
    const mail = await sendTemplatedClientMessage(c.env, {
      templateId: 'team_invite',
      orgId: user.org_id,
      clientId: `team:${id}`,
      email,
      notifyEmail: true,
      notifySms: false,
      skipClientAlert: true,
      brand,
      vars: {
        ...brandVars(brand),
        name,
        email,
        temporaryPassword: password,
        loginUrl,
        portalUrl: loginUrl,
      },
    });
    emailStatus = mail.deliveryStatus || mail.channels?.email || null;
  } catch (e: any) {
    emailStatus = `failed:${e.message}`;
  }

  return c.json({ id, message: 'Team member added', emailStatus }, 201);
});

// ═══════════════════════════════════════════════════════════════
// DOCUMENT TYPE & SETTINGS ENDPOINTS
// ═══════════════════════════════════════════════════════════════
app.get('/api/document-types', (c) => {
  const types = Object.entries(DOCUMENT_TYPES).map(([key, val]) => ({
    id: key,
    name: val.name,
    category: val.category,
    description: val.description,
  }));
  return c.json({ types });
});

app.get('/api/settings/statutes', (c) => {
  return c.json({
    categories: [
      { id: 'FCRA', name: 'Fair Credit Reporting Act', code: '15 U.S.C. § 1681' },
      { id: 'FDCPA', name: 'Fair Debt Collection Practices Act', code: '15 U.S.C. § 1692' },
      { id: 'ECOA', name: 'Equal Credit Opportunity Act', code: '15 U.S.C. § 1691' },
    ],
    severities: ['critical', 'high', 'medium', 'low'],
  });
});

// ═══════════════════════════════════════════════════════════════
// PLATFORM SUPER ADMIN ENDPOINTS (Gated to role === 'super_admin')
// ═══════════════════════════════════════════════════════════════

// ── Legal contracts / ESIGN / Video / RON ──────────────────────
app.get('/api/compliance/esign-disclosure', authMiddleware, async (c) => {
  const hash = await sha256Hex(ESIGN_DISCLOSURE_TEXT);
  return c.json({
    version: ESIGN_DISCLOSURE_VERSION,
    hash,
    text: ESIGN_DISCLOSURE_TEXT,
  });
});

app.get('/api/compliance/ron-states', authMiddleware, async (c) => {
  let rows: any[] = [];
  try {
    const all = await c.env.DB.prepare('SELECT * FROM ron_state_rules ORDER BY state_code').all();
    rows = all?.results || [];
  } catch { /* */ }
  if (!rows.length) rows = DEFAULT_RON_STATE_RULES;
  const q = String(c.req.query('state') || '').toUpperCase();
  if (q) {
    const one = rows.find((r) => r.state_code === q) || await getRonStateRule(c.env, q);
    return c.json({ state: one, vendor: resolveVendor(c.env) });
  }
  return c.json({ states: rows, vendor: resolveVendor(c.env), count: rows.length });
});

app.post('/api/compliance/seed-ron-states', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin' && user.role !== 'super_admin') return c.json({ error: 'Admin only' }, 403);
  const n = await seedRonStateRules(c.env);
  return c.json({ ok: true, seeded: n });
});

app.get('/api/legal-contracts', authMiddleware, async (c) => {
  const user = c.get('user');
  let clientId = c.req.query('clientId');
  if (user.role === 'client') {
    const client = await c.env.DB.prepare('SELECT id FROM clients WHERE email = ? AND org_id = ?').bind(user.email, user.org_id).first() as any;
    if (!client) return c.json({ error: 'Client not found' }, 404);
    clientId = client.id;
  }
  if (!clientId) return c.json({ error: 'clientId required' }, 400);
  const rows = await c.env.DB.prepare(
    `SELECT id, contract_type, template_version, content_hash, governing_state, status, document_id, vault_upload_id, ron_session_id, notarized_at, notary_name, signature_timestamp, created_at, updated_at
     FROM legal_contracts WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC`
  ).bind(clientId, user.org_id).all();
  return c.json({ contracts: rows?.results || [] });
});

app.get('/api/legal-contracts/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const row = await c.env.DB.prepare(`SELECT * FROM legal_contracts WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first() as any;
  if (!row) return c.json({ error: 'Not found' }, 404);
  if (user.role === 'client') {
    const client = await c.env.DB.prepare('SELECT id FROM clients WHERE email = ? AND org_id = ?').bind(user.email, user.org_id).first() as any;
    if (!client || client.id !== row.client_id) return c.json({ error: 'Forbidden' }, 403);
  }
  return c.json({ contract: row, esignDisclosureVersion: ESIGN_DISCLOSURE_VERSION });
});

app.post('/api/legal-contracts/issue-pack', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  let clientId = body.clientId;
  if (user.role === 'client') {
    const me = await c.env.DB.prepare('SELECT * FROM clients WHERE email = ? AND org_id = ?').bind(user.email, user.org_id).first() as any;
    if (!me) return c.json({ error: 'Client not found' }, 404);
    clientId = me.id;
  }
  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(clientId, user.org_id).first() as any;
  if (!client) return c.json({ error: 'Client not found' }, 404);
  const pack = await issueClientContractPack(c.env, {
    orgId: user.org_id,
    client,
    userId: user.id,
    governingState: body.governingState || client.governing_state || client.state,
  });
  try {
    const email = client.email && !String(client.email).includes('.noreply@') ? client.email : null;
    await sendTemplatedClientMessage(c.env, {
      templateId: 'contract_ready',
      orgId: user.org_id,
      clientId: client.id,
      email,
      notifyEmail: !!email && client.notify_email !== 0,
      vars: {
        clientName: `${client.first_name} ${client.last_name}`,
        contractType: 'CROA / LPOA pack',
        requiresNotarization: 'true',
        portalUrl: `${portalBaseUrl(c.env)}/`,
      },
    });
  } catch { /* soft */ }
  return c.json({ ok: true, ...pack });
});

app.post('/api/legal-contracts', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const contractType = body.contractType as ContractType;
  if (!['croa_service', 'limited_poa', 'esign_consent', 'representation_auth'].includes(contractType)) {
    return c.json({ error: 'Invalid contractType' }, 400);
  }
  let clientId = body.clientId;
  if (user.role === 'client') {
    const me = await c.env.DB.prepare('SELECT * FROM clients WHERE email = ? AND org_id = ?').bind(user.email, user.org_id).first() as any;
    if (!me) return c.json({ error: 'Client not found' }, 404);
    clientId = me.id;
  }
  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(clientId, user.org_id).first() as any;
  if (!client) return c.json({ error: 'Client not found' }, 404);
  const created = await createLegalContract(c.env, {
    orgId: user.org_id,
    client,
    userId: user.id,
    contractType,
    governingState: body.governingState || client.governing_state || client.state,
  });
  return c.json({ ok: true, ...created });
});

app.post('/api/legal-contracts/:id/sign', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json();
  if (!body.signatureData) return c.json({ error: 'signatureData required' }, 400);
  if (body.esignConsent !== true) return c.json({ error: 'esignConsent must be true — review E-SIGN disclosure first' }, 400);

  const row = await c.env.DB.prepare(`SELECT * FROM legal_contracts WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first() as any;
  if (!row) return c.json({ error: 'Not found' }, 404);
  if (user.role === 'client') {
    const me = await c.env.DB.prepare('SELECT id FROM clients WHERE email = ? AND org_id = ?').bind(user.email, user.org_id).first() as any;
    if (!me || me.id !== row.client_id) return c.json({ error: 'Forbidden' }, 403);
  }

  try {
    const result = await signLegalContract(c.env, {
      orgId: user.org_id,
      contractId: id,
      userId: user.id,
      signatureData: body.signatureData,
      ip: c.req.header('CF-Connecting-IP') || undefined,
      ua: c.req.header('User-Agent') || undefined,
      esignConsent: true,
    });
    return c.json({ ok: true, ...result });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

app.post('/api/video/sessions', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role === 'client') return c.json({ error: 'Staff schedules conferences' }, 403);
  const body = await c.req.json();
  const clientId = body.clientId || null;
  if (clientId) {
    const client = await c.env.DB.prepare('SELECT id, email, first_name, last_name, notify_email FROM clients WHERE id = ? AND org_id = ?')
      .bind(clientId, user.org_id).first() as any;
    if (!client) return c.json({ error: 'Client not found' }, 404);
    const session = await createVideoRoom(c.env, {
      orgId: user.org_id,
      clientId,
      hostUserId: user.id,
      purpose: body.purpose || 'advisor_consult',
      recordingEnabled: body.recordingEnabled !== false,
    });
    try {
      await sendTemplatedClientMessage(c.env, {
        templateId: 'video_conference_invite',
        orgId: user.org_id,
        clientId,
        email: client.email,
        notifyEmail: client.notify_email !== 0,
        vars: {
          clientName: `${client.first_name} ${client.last_name}`,
          roomName: session.roomName,
          title: 'Your secure video conference is ready',
          portalUrl: `${portalBaseUrl(c.env)}/`,
        },
      });
    } catch { /* soft */ }
    return c.json({ ok: true, configured: videoConfigured(c.env), ...session });
  }
  const session = await createVideoRoom(c.env, {
    orgId: user.org_id,
    hostUserId: user.id,
    purpose: body.purpose || 'advisor_consult',
    recordingEnabled: body.recordingEnabled !== false,
  });
  return c.json({ ok: true, configured: videoConfigured(c.env), ...session });
});

app.get('/api/video/sessions', authMiddleware, async (c) => {
  const user = c.get('user');
  let sql = `SELECT id, client_id, room_name, room_sid, purpose, status, recording_enabled, scheduled_at, started_at, ended_at, created_at FROM video_conference_sessions WHERE org_id = ?`;
  const binds: any[] = [user.org_id];
  if (user.role === 'client') {
    const me = await c.env.DB.prepare('SELECT id FROM clients WHERE email = ? AND org_id = ?').bind(user.email, user.org_id).first() as any;
    if (!me) return c.json({ sessions: [] });
    sql += ` AND client_id = ?`;
    binds.push(me.id);
  } else if (c.req.query('clientId')) {
    sql += ` AND client_id = ?`;
    binds.push(c.req.query('clientId'));
  }
  sql += ` ORDER BY created_at DESC LIMIT 50`;
  const rows = await c.env.DB.prepare(sql).bind(...binds).all();
  return c.json({ sessions: rows?.results || [], configured: videoConfigured(c.env) });
});

app.post('/api/video/sessions/:id/token', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const session = await c.env.DB.prepare(`SELECT * FROM video_conference_sessions WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first() as any;
  if (!session) return c.json({ error: 'Not found' }, 404);
  if (user.role === 'client') {
    const me = await c.env.DB.prepare('SELECT id FROM clients WHERE email = ? AND org_id = ?').bind(user.email, user.org_id).first() as any;
    if (!me || me.id !== session.client_id) return c.json({ error: 'Forbidden' }, 403);
  }
  try {
    const token = await issueRoomToken(c.env, {
      sessionId: id,
      orgId: user.org_id,
      identity: `${user.role}:${user.id}:${user.email || 'user'}`.slice(0, 120),
    });
    return c.json({ ok: true, ...token });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

app.post('/api/video/sessions/:id/complete', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role === 'client') return c.json({ error: 'Staff only' }, 403);
  const body = await c.req.json().catch(() => ({}));
  const result = await completeVideoSession(c.env, {
    sessionId: c.req.param('id'),
    orgId: user.org_id,
    recordingSid: body.recordingSid,
    compositionSid: body.compositionSid,
  });
  return c.json(result);
});

app.post('/api/ron/sessions', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  let clientId = body.clientId;
  if (user.role === 'client') {
    const me = await c.env.DB.prepare('SELECT * FROM clients WHERE email = ? AND org_id = ?').bind(user.email, user.org_id).first() as any;
    if (!me) return c.json({ error: 'Client not found' }, 404);
    clientId = me.id;
  }
  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(clientId, user.org_id).first() as any;
  if (!client) return c.json({ error: 'Client not found' }, 404);
  const state = body.principalState || client.governing_state || client.state;
  if (!state) return c.json({ error: 'principalState / client state required' }, 400);

  try {
    const session = await createRonSession(c.env, {
      orgId: user.org_id,
      clientId,
      contractId: body.contractId,
      documentId: body.documentId,
      videoSessionId: body.videoSessionId,
      principalState: state,
      userId: user.id,
    });
    try {
      await sendTemplatedClientMessage(c.env, {
        templateId: 'ron_session_update',
        orgId: user.org_id,
        clientId,
        email: client.email,
        notifyEmail: client.notify_email !== 0,
        vars: {
          clientName: `${client.first_name} ${client.last_name}`,
          status: session.status,
          note: session.legalNotice,
          portalUrl: `${portalBaseUrl(c.env)}/`,
        },
      });
    } catch { /* soft */ }
    return c.json({ ok: true, ...session });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

app.get('/api/ron/sessions', authMiddleware, async (c) => {
  const user = c.get('user');
  let sql = `SELECT id, client_id, contract_id, document_id, vendor, status, principal_state, retention_until, sealed_vault_upload_id, created_at, completed_at, metadata_json FROM ron_sessions WHERE org_id = ?`;
  const binds: any[] = [user.org_id];
  if (user.role === 'client') {
    const me = await c.env.DB.prepare('SELECT id FROM clients WHERE email = ? AND org_id = ?').bind(user.email, user.org_id).first() as any;
    if (!me) return c.json({ sessions: [] });
    sql += ` AND client_id = ?`;
    binds.push(me.id);
  } else if (c.req.query('clientId')) {
    sql += ` AND client_id = ?`;
    binds.push(c.req.query('clientId'));
  }
  sql += ` ORDER BY created_at DESC LIMIT 50`;
  const rows = await c.env.DB.prepare(sql).bind(...binds).all();
  const sessions = (rows?.results || []).map((s: any) => ({
    ...s,
    ceremonyUrl: ceremonyUrlFromMeta(s.metadata_json),
  }));
  return c.json({ sessions, vendor: resolveVendor(c.env), sandbox: resolveVendor(c.env) === 'sandbox' });
});

app.get('/api/ron/sessions/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const row = await c.env.DB.prepare(`SELECT * FROM ron_sessions WHERE id = ? AND org_id = ?`).bind(c.req.param('id'), user.org_id).first() as any;
  if (!row) return c.json({ error: 'Not found' }, 404);
  if (user.role === 'client') {
    const me = await c.env.DB.prepare('SELECT id FROM clients WHERE email = ? AND org_id = ?').bind(user.email, user.org_id).first() as any;
    if (!me || me.id !== row.client_id) return c.json({ error: 'Forbidden' }, 403);
  }
  return c.json({ session: row, ceremonyUrl: ceremonyUrlFromMeta(row.metadata_json), vendor: row.vendor });
});

app.post('/api/ron/sessions/:id/identity', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const row = await c.env.DB.prepare(`SELECT * FROM ron_sessions WHERE id = ? AND org_id = ?`).bind(c.req.param('id'), user.org_id).first() as any;
  if (!row) return c.json({ error: 'Not found' }, 404);
  if (user.role === 'client') {
    const me = await c.env.DB.prepare('SELECT id FROM clients WHERE email = ? AND org_id = ?').bind(user.email, user.org_id).first() as any;
    if (!me || me.id !== row.client_id) return c.json({ error: 'Forbidden' }, 403);
  }
  try {
    const result = await submitRonIdentityChecklist(c.env, {
      orgId: user.org_id,
      sessionId: row.id,
      userId: user.id,
      fullNameMatchesId: !!body.fullNameMatchesId,
      governmentIdPresented: !!body.governmentIdPresented,
      selfieMatchesId: !!body.selfieMatchesId,
      kbaPassed: body.kbaPassed !== false,
      credentialAnalysisPassed: body.credentialAnalysisPassed !== false,
      attestation: !!body.attestation,
    });
    return c.json({ ok: true, ...result });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

app.post('/api/ron/sessions/:id/complete', authMiddleware, async (c) => {
  const user = c.get('user');
  // Staff or sandbox client completion after identity
  const body = await c.req.json().catch(() => ({}));
  const row = await c.env.DB.prepare(`SELECT * FROM ron_sessions WHERE id = ? AND org_id = ?`).bind(c.req.param('id'), user.org_id).first() as any;
  if (!row) return c.json({ error: 'Not found' }, 404);
  if (user.role === 'client') {
    const me = await c.env.DB.prepare('SELECT id FROM clients WHERE email = ? AND org_id = ?').bind(user.email, user.org_id).first() as any;
    if (!me || me.id !== row.client_id) return c.json({ error: 'Forbidden' }, 403);
    if (row.vendor !== 'sandbox') return c.json({ error: 'Production RON completion is vendor-driven' }, 403);
  }
  try {
    const result = await completeRonSession(c.env, {
      orgId: user.org_id,
      sessionId: row.id,
      userId: user.id,
      notaryName: body.notaryName,
      notaryCommission: body.notaryCommission,
      notaryState: body.notaryState,
      aVRecordingRef: body.aVRecordingRef,
    });
    return c.json({ ok: true, ...result });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

app.post('/api/webhooks/ron', async (c) => {
  const signature = c.req.header('X-Ron-Signature')
    || c.req.header('X-Webhook-Secret')
    || c.req.header('X-Proof-Signature')
    || c.req.header('X-Hub-Signature-256')
    || c.req.header('X-BlueNotary-Signature');
  const rawBody = await c.req.text();
  let payload: any = {};
  try { payload = rawBody ? JSON.parse(rawBody) : {}; } catch { return c.json({ error: 'Invalid JSON' }, 400); }
  try {
    const result = await handleRonWebhook(c.env, { signature, payload, rawBody });
    return c.json({ ok: true, ...result });
  } catch (e: any) {
    return c.json({ error: e.message }, 401);
  }
});

app.get('/api/compliance/overview', authMiddleware, async (c) => {
  const user = c.get('user');
  let clientFilter = '';
  const binds: any[] = [user.org_id];
  if (user.role === 'client') {
    const me = await c.env.DB.prepare('SELECT id FROM clients WHERE email = ? AND org_id = ?').bind(user.email, user.org_id).first() as any;
    if (!me) return c.json({ error: 'Client not found' }, 404);
    clientFilter = ' AND client_id = ?';
    binds.push(me.id);
  } else if (c.req.query('clientId')) {
    clientFilter = ' AND client_id = ?';
    binds.push(c.req.query('clientId'));
  }
  const contracts = await c.env.DB.prepare(`SELECT status, contract_type, COUNT(*) as c FROM legal_contracts WHERE org_id = ?${clientFilter} GROUP BY status, contract_type`).bind(...binds).all().catch(() => ({ results: [] }));
  const ron = await c.env.DB.prepare(`SELECT status, COUNT(*) as c FROM ron_sessions WHERE org_id = ?${clientFilter} GROUP BY status`).bind(...binds).all().catch(() => ({ results: [] }));
  const video = await c.env.DB.prepare(`SELECT status, COUNT(*) as c FROM video_conference_sessions WHERE org_id = ?${clientFilter} GROUP BY status`).bind(...binds).all().catch(() => ({ results: [] }));
  const esign = await c.env.DB.prepare(`SELECT COUNT(*) as c FROM esign_consent_events WHERE org_id = ?${clientFilter}`).bind(...binds).first().catch(() => ({ c: 0 }));
  return c.json({
    contracts: contracts?.results || [],
    ron: ron?.results || [],
    video: video?.results || [],
    esignConsentEvents: (esign as any)?.c || 0,
    videoConfigured: videoConfigured(c.env),
    ronVendor: resolveVendor(c.env),
    ronSandbox: resolveVendor(c.env) === 'sandbox',
    ronLive: resolveVendor(c.env) !== 'sandbox',
    esignDisclosureVersion: ESIGN_DISCLOSURE_VERSION,
  });
});

const adminGateMiddleware = async (c: any, next: any) => {
  const user = c.get('user');
  if (!user || user.role !== 'super_admin') {
    return c.json({ error: 'Forbidden: Platform super_admin access only' }, 403);
  }
  return next();
};

app.post('/api/admin/knowledge/seed', authMiddleware, adminGateMiddleware, async (c) => {
  const user = c.get('user');
  const kb = await seedKnowledgeBase(c.env);
  for (const t of EMAIL_TEMPLATES) {
    try {
      await c.env.DB.prepare(
        `INSERT INTO email_template_registry (id, name, description, event_type, enabled, updated_at)
         VALUES (?, ?, ?, ?, 1, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, description = excluded.description, event_type = excluded.event_type, updated_at = datetime('now')`
      ).bind(t.id, t.name, t.description, t.eventType).run();
    } catch (e) {
      console.warn('[kb] template registry upsert', e);
    }
  }
  await c.env.DB.prepare(
    'INSERT INTO activity_log (id, org_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(
    generateId(), user.org_id, user.id, 'knowledge_seeded',
    `Seeded knowledge base: ${kb.upserted} chunks (${kb.embedded} embedded)`,
    JSON.stringify(kb)
  ).run();
  return c.json({ ok: true, knowledge: kb, templates: listEmailTemplates() });
});

app.get('/api/admin/email-templates', authMiddleware, adminGateMiddleware, async (c) => {
  let registry: any[] = [];
  try {
    const rows = await c.env.DB.prepare('SELECT * FROM email_template_registry ORDER BY id').all();
    registry = rows?.results || [];
  } catch { /* migration pending */ }
  return c.json({ templates: listEmailTemplates(), registry });
});

app.get('/api/clients/:id/email-log', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role === 'client') return c.json({ error: 'Unauthorized' }, 403);
  const clientId = c.req.param('id');
  const client = await c.env.DB.prepare('SELECT id FROM clients WHERE id = ? AND org_id = ?').bind(clientId, user.org_id).first();
  if (!client) return c.json({ error: 'Client not found' }, 404);
  const limit = Math.min(Number(c.req.query('limit') || 100), 500);
  let rows: any[] = [];
  try {
    const r = await c.env.DB.prepare(
      `SELECT id, template_id, event_type, to_email, subject, provider, status, error_message, message_id, brand_name, created_at
       FROM email_delivery_log WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT ?`
    ).bind(clientId, user.org_id, limit).all();
    rows = r?.results || [];
  } catch { /* migration pending */ }
  return c.json({ clientId, deliveries: rows });
});

app.get('/api/admin/email-delivery-log', authMiddleware, adminGateMiddleware, async (c) => {
  const user = c.get('user');
  const limit = Math.min(Number(c.req.query('limit') || 200), 1000);
  const status = c.req.query('status');
  let sql = `SELECT * FROM email_delivery_log WHERE org_id = ?`;
  const binds: any[] = [user.org_id];
  if (status) {
    sql += ` AND status = ?`;
    binds.push(status);
  }
  sql += ` ORDER BY created_at DESC LIMIT ?`;
  binds.push(limit);
  let rows: any[] = [];
  try {
    const r = await c.env.DB.prepare(sql).bind(...binds).all();
    rows = r?.results || [];
  } catch { /* migration pending */ }
  return c.json({ deliveries: rows });
});

app.get('/api/clients/:id/compliance-summary', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role === 'client') return c.json({ error: 'Unauthorized' }, 403);
  const clientId = c.req.param('id');
  const client = await c.env.DB.prepare('SELECT id, first_name, last_name, croa_contract_agreed, permissible_purpose_consent FROM clients WHERE id = ? AND org_id = ?')
    .bind(clientId, user.org_id).first() as any;
  if (!client) return c.json({ error: 'Client not found' }, 404);
  let contracts: any[] = [];
  let ron: any[] = [];
  let video: any[] = [];
  let emails: any[] = [];
  try {
    contracts = (await c.env.DB.prepare(
      `SELECT id, contract_type, status, signature_timestamp, notarized_at, created_at FROM legal_contracts WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 50`
    ).bind(clientId, user.org_id).all())?.results || [];
  } catch { /* soft */ }
  try {
    ron = (await c.env.DB.prepare(
      `SELECT id, status, principal_state, vendor, created_at, completed_at FROM ron_sessions WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 20`
    ).bind(clientId, user.org_id).all())?.results || [];
  } catch { /* soft */ }
  try {
    video = (await c.env.DB.prepare(
      `SELECT id, room_name, purpose, status, created_at FROM video_conference_sessions WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 20`
    ).bind(clientId, user.org_id).all())?.results || [];
  } catch { /* soft */ }
  try {
    emails = (await c.env.DB.prepare(
      `SELECT id, template_id, status, subject, to_email, provider, created_at FROM email_delivery_log WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 40`
    ).bind(clientId, user.org_id).all())?.results || [];
  } catch { /* soft */ }
  return c.json({ client, contracts, ron, video, emails });
});

// 0. POST /api/admin/backup/trigger — snapshot D1 tables to R2 vault
const D1_BACKUP_TABLES = [
  'organizations', 'users', 'clients', 'credit_reports', 'violations', 'documents',
  'sessions', 'activity_log', 'portal_messages', 'portal_uploads', 'portal_alerts',
  'education_progress', 'tutor_memory', 'fundability_snapshots', 'tradeline_orders',
  'underwriting_snapshots', 'security_audit_log', 'privacy_requests', 'roadmap_progress',
  'client_journey_state', 'daily_motivation_log', 'knowledge_chunks', 'email_template_registry',
  'legal_contracts', 'esign_consent_events', 'video_conference_sessions', 'ron_sessions', 'ron_state_rules',
  'email_delivery_log', 'onboarding_drip_log',
  'scheduled_job_runs', 'email_suppressions', 'newsletter_subscriptions', 'newsletter_issues',
  'newsletter_deliveries', 'compliance_snapshots', 'ops_alerts',
];

app.post('/api/admin/journey/dispatch-daily', authMiddleware, adminGateMiddleware, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const stats = await dispatchDailyMotivationBatch(c.env, {
    orgId: body.orgId || c.get('user')?.org_id,
    limit: body.limit || 2000,
  });
  return c.json({ ok: true, ...stats, scheduleNote: 'Morning ritual ~7:00 AM US Central (13:00 UTC)' });
});

app.post('/api/admin/backup/trigger', authMiddleware, adminGateMiddleware, async (c) => {
  if (!c.env.DOCS) {
    return c.json({ error: 'R2 DOCS binding required for backup storage' }, 503);
  }

  const exportedAt = new Date().toISOString();
  const snapshot: Record<string, unknown> = { exportedAt, product: 'smart-fcra-v2', tables: {} as Record<string, unknown> };
  const rowCounts: Record<string, number> = {};

  for (const table of D1_BACKUP_TABLES) {
    try {
      const rows = await c.env.DB.prepare(`SELECT * FROM ${table}`).all();
      const list = rows?.results || [];
      (snapshot.tables as Record<string, unknown>)[table] = list;
      rowCounts[table] = list.length;
    } catch (e: any) {
      rowCounts[table] = -1;
      (snapshot.tables as Record<string, unknown>)[table] = { error: e.message };
    }
  }

  const key = `backups/d1/snapshot_${exportedAt.replace(/[:.]/g, '-')}.json`;
  const payload = JSON.stringify(snapshot);
  await c.env.DOCS.put(key, payload, {
    httpMetadata: { contentType: 'application/json' },
    customMetadata: { exportedAt, type: 'd1-snapshot', byteSize: String(payload.length) },
  });

  await writeSecurityAudit(c.env, {
    orgId: c.get('user')?.org_id,
    actorUserId: c.get('user')?.id,
    actorRole: c.get('user')?.role,
    action: 'admin_backup_trigger',
    resourceType: 'backup',
    resourceId: key,
    ip: c.req.header('CF-Connecting-IP'),
    detail: { rowCounts, byteSize: payload.length },
  });

  return c.json({
    ok: true,
    key,
    exportedAt,
    byteSize: payload.length,
    rowCounts,
    note: 'Full SQL export also runs weekly via GitHub Actions (d1-backup.yml).',
  });
});

const DEMO_CLIENT_ID = 'cli_demo_001';
const DEMO_CLIENT_EMAIL = 'salisha.mcdowell@example.com';
const DEMO_PORTAL_PASSWORD = 'demo123456';

/** Ensure Salisha demo client + portal login exist for live walkthroughs. */
async function ensureDemoClientAndPortal(c: any, orgId: string) {
  let client = await c.env.DB.prepare(
    `SELECT * FROM clients WHERE id = ? AND org_id = ?`
  ).bind(DEMO_CLIENT_ID, orgId).first() as any;

  if (!client) {
    client = await c.env.DB.prepare(
      `SELECT * FROM clients WHERE org_id = ? AND lower(email) = ? LIMIT 1`
    ).bind(orgId, DEMO_CLIENT_EMAIL).first() as any;
  }

  if (!client) {
    await c.env.DB.prepare(
      `INSERT INTO clients (
         id, org_id, first_name, last_name, email, phone, address_line1, city, state, zip,
         status, notes, tags, permissible_purpose_consent, croa_contract_agreed, tsr_advance_fee_waived,
         consent_timestamp, eq_score, ex_score, tu_score, estimated_monthly_income, estimated_monthly_debt,
         created_at, updated_at
       ) VALUES (?, ?, 'Salisha', 'McDowell', ?, '(414) 430-4277', '1342 NM 333', 'Tijeras', 'NM', '87059',
         'active', 'Demo client for sales walkthroughs', '["Premium","Lead","Demo"]', 1, 1, 1,
         datetime('now'), 642, 635, 648, 6200, 1650, datetime('now'), datetime('now'))`
    ).bind(DEMO_CLIENT_ID, orgId, DEMO_CLIENT_EMAIL).run();
    client = await c.env.DB.prepare(`SELECT * FROM clients WHERE id = ?`).bind(DEMO_CLIENT_ID).first() as any;
  } else {
    await c.env.DB.prepare(
      `UPDATE clients SET
         eq_score = COALESCE(eq_score, 642),
         ex_score = COALESCE(ex_score, 635),
         tu_score = COALESCE(tu_score, 648),
         estimated_monthly_income = COALESCE(estimated_monthly_income, 6200),
         estimated_monthly_debt = COALESCE(estimated_monthly_debt, 1650),
         updated_at = datetime('now')
       WHERE id = ?`
    ).bind(client.id).run();
  }

  const email = (client.email || DEMO_CLIENT_EMAIL).trim();
  const passwordHash = await hashPassword(DEMO_PORTAL_PASSWORD);
  const existingUser = await c.env.DB.prepare(
    `SELECT id FROM users WHERE lower(email) = lower(?) AND org_id = ?`
  ).bind(email, orgId).first() as any;
  if (!existingUser) {
    await c.env.DB.prepare(
      `INSERT INTO users (id, org_id, email, name, password_hash, role, is_active, must_change_password)
       VALUES (?, ?, ?, ?, ?, 'client', 1, 0)`
    ).bind(generateId(), orgId, email, `${client.first_name} ${client.last_name}`, passwordHash).run();
  } else {
    await c.env.DB.prepare(
      `UPDATE users SET password_hash = ?, name = ?, role = 'client', is_active = 1, must_change_password = 0 WHERE id = ?`
    ).bind(passwordHash, `${client.first_name} ${client.last_name}`, existingUser.id).run();
  }

  return { clientId: client.id as string, email, portalPassword: DEMO_PORTAL_PASSWORD };
}

// One-click sales demo prep: Salisha client + portal login + optional sample case
app.post('/api/admin/demo/prepare', authMiddleware, adminGateMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const loadCase = body.loadCase !== false;

  const ensured = await ensureDemoClientAndPortal(c, user.org_id);
  let caseResult: any = null;

  if (loadCase) {
    const reportCount = await c.env.DB.prepare(
      `SELECT COUNT(*) as c FROM credit_reports WHERE client_id = ? AND org_id = ?`
    ).bind(ensured.clientId, user.org_id).first() as any;
    if (!reportCount?.c || body.forceReload) {
      const bureauReports = mapMfsnToInternal(sampleMfsnReport as any);
      if (bureauReports.length) {
        const demoViolationCount = bureauReports.reduce((s, r) => s + liveAnalyzeParsedReport(r).violations.length, 0);
        caseResult = await importBureauReportsBatch(c, {
          generateId,
          encryptPII,
          backpopulateClientInfo,
          saveViolationsForReport,
          persistBureauScores,
          markPriorBureauReportsStale,
          refreshBureauPackStatus,
          computeAndStoreFundability,
        }, {
          clientId: ensured.clientId,
          bureauReports,
          rawPayload: sampleMfsnReport,
          sourceProvider: 'DemoSandbox',
          sourcePayloadType: 'mfsn-sample',
          fileNamePrefix: 'demo-mfsn',
          activityAction: 'demo_case_loaded',
          activityDescription: `Prepared demo walkthrough (${bureauReports.length} bureaus, ${demoViolationCount} violations)`,
        });
        caseResult = { ...caseResult, violationsFound: demoViolationCount };
      }
    }
  }

  let fundingPreview = null;
  try {
    const profile = buildInstitutionalProfile({
      eqScore: 642,
      exScore: 635,
      tuScore: 648,
      utilizationPct: 28,
      inquiries: 2,
      collections: 0,
      highestLimit: 7500,
      monthlyIncome: 6200,
      state: 'NM',
    });
    fundingPreview = slimInstitutionalReport(LenderMatchingEngine.runComprehensiveMatch(profile));
  } catch { /* soft */ }

  return c.json({
    ok: true,
    sandbox: true,
    clientId: ensured.clientId,
    clientName: 'Salisha McDowell',
    portalEmail: ensured.email,
    portalPassword: ensured.portalPassword,
    staffEmail: 'demo@example.com',
    staffPassword: 'demo123456',
    caseLoaded: !!caseResult,
    caseResult,
    fundingPreview,
    walkthrough: [
      'Sign in as staff (demo@example.com) or use one-click Admin Demo',
      'Open Clients → Salisha McDowell → Preview Portal',
      'Show Cockpit, Fundability (Funding Cockpit), Violations, Documents',
      'Optional: sign out and login as client portal with the portal credentials below',
    ],
    message: 'Demo walkthrough ready — staff + client portal credentials reset for this sandbox.',
  });
});

// Load tri-bureau demo case from bundled MFSN sample (sales / training sandbox)
app.post('/api/admin/demo/load-case', authMiddleware, adminGateMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  let clientId = body.clientId as string | undefined;
  let isNewClient = false;

  if (!clientId) {
    const ensured = await ensureDemoClientAndPortal(c, user.org_id);
    clientId = ensured.clientId;
  } else {
    const existing = await c.env.DB.prepare('SELECT id FROM clients WHERE id = ? AND org_id = ?').bind(clientId, user.org_id).first();
    if (!existing) return c.json({ error: 'Client not found' }, 404);
  }

  const bureauReports = mapMfsnToInternal(sampleMfsnReport as any);
  if (!bureauReports.length) {
    return c.json({ error: 'Demo sample payload could not be mapped' }, 500);
  }

  const demoViolationCount = bureauReports.reduce((s, r) => s + liveAnalyzeParsedReport(r).violations.length, 0);

  const batch = await importBureauReportsBatch(c, {
    generateId,
    encryptPII,
    backpopulateClientInfo,
    saveViolationsForReport,
    persistBureauScores,
    markPriorBureauReportsStale,
    refreshBureauPackStatus,
    computeAndStoreFundability,
  }, {
    clientId,
    bureauReports,
    rawPayload: sampleMfsnReport,
    sourceProvider: 'DemoSandbox',
    sourcePayloadType: 'mfsn-sample',
    fileNamePrefix: 'demo-mfsn',
    activityAction: 'demo_case_loaded',
    activityDescription: `Loaded tri-bureau demo case (${bureauReports.length} bureaus, ${demoViolationCount} violations)`,
  });

  return c.json({
    ok: true,
    clientId,
    isNewClient,
    ...batch,
    violationsFound: demoViolationCount,
    sandbox: true,
    message: 'Demo tri-bureau case loaded with parsed scores, violations, and fundability snapshot.',
  });
});

// 1. GET /api/admin/db-stats
app.get('/api/admin/db-stats', authMiddleware, adminGateMiddleware, async (c) => {
  try {
    const orgsCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM organizations').first('count');
    const usersCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first('count');
    const clientsCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM clients').first('count');
    const reportsCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM credit_reports').first('count');
    const violationsCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM violations').first('count');
    const documentsCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM documents').first('count');
    const activeSessionsCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM sessions WHERE expires_at > datetime("now")').first('count');

    return c.json({
      stats: {
        organizations: orgsCount || 0,
        users: usersCount || 0,
        clients: clientsCount || 0,
        reports: reportsCount || 0,
        violations: violationsCount || 0,
        documents: documentsCount || 0,
        active_sessions: activeSessionsCount || 0,
      }
    });
  } catch (err: any) {
    return c.json({ error: `Failed to fetch stats: ${err.message}` }, 500);
  }
});

// 2. GET /api/admin/organizations
app.get('/api/admin/organizations', authMiddleware, adminGateMiddleware, async (c) => {
  try {
    const orgs = await c.env.DB.prepare('SELECT * FROM organizations ORDER BY created_at DESC').all();
    return c.json({ organizations: orgs?.results || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 3. POST /api/admin/organizations/:id
app.post('/api/admin/organizations/:id', authMiddleware, adminGateMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { name, plan, max_users, max_clients, max_reports_per_month } = body;

    await c.env.DB.prepare(
      'UPDATE organizations SET name = ?, plan = ?, max_users = ?, max_clients = ?, max_reports_per_month = ? WHERE id = ?'
    ).bind(name, plan, max_users, max_clients, max_reports_per_month, id).run();

    return c.json({ ok: true, message: 'Organization updated' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 4. POST /api/admin/organizations/:id/toggle-suspension
app.post('/api/admin/organizations/:id/toggle-suspension', authMiddleware, adminGateMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const org = await c.env.DB.prepare('SELECT settings FROM organizations WHERE id = ?').bind(id).first();
    if (!org) return c.json({ error: 'Organization not found' }, 404);

    const settings = JSON.parse(org.settings || '{}');
    const isSuspended = !!settings.suspended;
    settings.suspended = !isSuspended;

    await c.env.DB.prepare('UPDATE organizations SET settings = ? WHERE id = ?').bind(JSON.stringify(settings), id).run();

    // Log the action
    const adminUser = c.get('user');
    await c.env.DB.prepare(
      'INSERT INTO activity_log (id, org_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      generateId(),
      adminUser.org_id,
      adminUser.id,
      'admin_toggle_suspension',
      `Toggled suspension of organization ${id} to ${settings.suspended}`,
      JSON.stringify({ target_org: id, suspended: settings.suspended })
    ).run();

    return c.json({ ok: true, suspended: settings.suspended });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 5. GET /api/admin/users
app.get('/api/admin/users', authMiddleware, adminGateMiddleware, async (c) => {
  try {
    const query = `
      SELECT u.id, u.name, u.email, u.role, u.is_active, u.last_login, u.created_at, o.name as org_name, o.id as org_id 
      FROM users u 
      JOIN organizations o ON u.org_id = o.id 
      ORDER BY u.created_at DESC
    `;
    const users = await c.env.DB.prepare(query).all();
    return c.json({ users: users?.results || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 5.5. POST /api/admin/users
app.post('/api/admin/users', authMiddleware, adminGateMiddleware, async (c) => {
  try {
    const { name, email, password, role, org_id } = await c.req.json();
    if (!name || !email || !password || !role || !org_id) {
      return c.json({ error: 'All fields are required (name, email, password, role, org_id)' }, 400);
    }

    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existing) {
      return c.json({ error: 'Email already exists' }, 409);
    }

    const id = generateId();
    const hash = await hashPassword(password);
    await c.env.DB.prepare('INSERT INTO users (id, org_id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, org_id, email, name, hash, role)
      .run();

    // Log the action
    const adminUser = c.get('user');
    await c.env.DB.prepare(
      'INSERT INTO activity_log (id, org_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      generateId(),
      adminUser.org_id,
      adminUser.id,
      'admin_create_user',
      `Created user ${name} (${email}) with role ${role} under organization ${org_id}`,
      JSON.stringify({ created_user_id: id, email, role, org_id })
    ).run();

    return c.json({ id, message: 'User created successfully' }, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 5.6. POST /api/admin/users/:id/reset-password
app.post('/api/admin/users/:id/reset-password', authMiddleware, adminGateMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const { password } = await c.req.json();
    if (!password || password.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters' }, 400);
    }

    const user = await c.env.DB.prepare('SELECT id, name, email FROM users WHERE id = ?').bind(id).first();
    if (!user) return c.json({ error: 'User not found' }, 404);

    const hash = await hashPassword(password);
    await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(hash, id).run();

    // Log the action
    const adminUser = c.get('user');
    await c.env.DB.prepare(
      'INSERT INTO activity_log (id, org_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      generateId(),
      adminUser.org_id,
      adminUser.id,
      'admin_reset_user_password',
      `Reset password of user ${user.name} (${user.email})`,
      JSON.stringify({ target_user_id: id })
    ).run();

    return c.json({ ok: true, message: 'Password reset successfully' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 6. POST /api/admin/users/:id/toggle-status
app.post('/api/admin/users/:id/toggle-status', authMiddleware, adminGateMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const user = await c.env.DB.prepare('SELECT is_active, org_id FROM users WHERE id = ?').bind(id).first();
    if (!user) return c.json({ error: 'User not found' }, 404);

    const newStatus = user.is_active === 1 ? 0 : 1;
    await c.env.DB.prepare('UPDATE users SET is_active = ? WHERE id = ?').bind(newStatus, id).run();

    // Force expire any active sessions for the suspended user instantly
    if (newStatus === 0) {
      await c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id).run();
    }

    // Log the action
    const adminUser = c.get('user');
    await c.env.DB.prepare(
      'INSERT INTO activity_log (id, org_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      generateId(),
      adminUser.org_id,
      adminUser.id,
      'admin_toggle_user_status',
      `Toggled status of user ${id} to ${newStatus === 1 ? 'Active' : 'Suspended'}`,
      JSON.stringify({ target_user: id, is_active: newStatus })
    ).run();

    return c.json({ ok: true, is_active: newStatus });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 7. GET /api/admin/logs
app.get('/api/admin/logs', authMiddleware, adminGateMiddleware, async (c) => {
  try {
    const query = `
      SELECT l.*, u.email as user_email, o.name as org_name 
      FROM activity_log l 
      JOIN users u ON l.user_id = u.id 
      JOIN organizations o ON l.org_id = o.id 
      ORDER BY l.created_at DESC 
      LIMIT 100
    `;
    const logs = await c.env.DB.prepare(query).all();
    return c.json({ logs: logs?.results || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 8. GET /api/admin/global-clients
app.get('/api/admin/global-clients', authMiddleware, adminGateMiddleware, async (c) => {
  try {
    const query = `
      SELECT c.*, o.name as org_name, u.name as creator_name
      FROM clients c 
      JOIN organizations o ON c.org_id = o.id 
      LEFT JOIN users u ON c.created_by = u.id
      ORDER BY c.created_at DESC
    `;
    const clients = await c.env.DB.prepare(query).all();
    return c.json({ clients: clients?.results || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 9. GET /api/admin/global-reports
app.get('/api/admin/global-reports', authMiddleware, adminGateMiddleware, async (c) => {
  try {
    const query = `
      SELECT cr.id, cr.bureau, cr.file_name, cr.file_size, cr.status, cr.total_accounts, cr.created_at, cr.org_id,
             c.first_name, c.last_name, o.name as org_name
      FROM credit_reports cr
      JOIN clients c ON cr.client_id = c.id
      JOIN organizations o ON cr.org_id = o.id
      ORDER BY cr.created_at DESC
    `;
    const reports = await c.env.DB.prepare(query).all();
    return c.json({ reports: reports?.results || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 10. GET /api/admin/global-documents
app.get('/api/admin/global-documents', authMiddleware, adminGateMiddleware, async (c) => {
  try {
    const query = `
      SELECT d.id, d.title, d.doc_type, d.status, d.created_at, d.org_id,
             c.first_name, c.last_name, o.name as org_name
      FROM documents d
      JOIN clients c ON d.client_id = c.id
      JOIN organizations o ON d.org_id = o.id
      ORDER BY d.created_at DESC
    `;
    const docs = await c.env.DB.prepare(query).all();
    return c.json({ documents: docs?.results || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 11. POST /api/send-email (FCRA Dispute & Pre-Litigation Campaign Dispatch)
app.post('/api/send-email', authMiddleware, async (c) => {
  const user = c.get('user');
  const { to, subject, html } = await c.req.json();
  if (!to || !subject || !html) {
    return c.json({ error: 'Missing required parameters (to, subject, html)' }, 400);
  }

  let sent = false;
  let details = 'Simulated Delivery';

  try {
    const mail = await sendAppEmail(c.env, { to, subject, html, purpose: 'noreply' });
    if (mail.sent) {
      sent = true;
      details = `Delivered via ${mail.provider}${mail.messageId ? ` (${mail.messageId})` : ''}`;
    } else {
      details = `Fallback Simulation (${mail.provider})`;
    }
  } catch (err: any) {
    console.warn('[EMAIL] delivery error, falling back to simulation:', err.message);
    details = `Fallback Simulation: ${err.message}`;
  }

  // Always log email dispatch inside activity_log
  const logId = generateId();
  await c.env.DB.prepare(
    'INSERT INTO activity_log (id, org_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(
    logId,
    user.org_id,
    user.id,
    'email_sent',
    `Sent email to ${to}: "${subject}" (${details})`,
    JSON.stringify({ to, subject, details })
  ).run();

  return c.json({ success: true, sent, details });
});

// 12. POST /api/marketing/campaign/trigger (FCRA Outreach Campaign Dispatch)
app.post('/api/marketing/campaign/trigger', authMiddleware, async (c) => {
  const user = c.get('user');
  const { clientId, campaignId, step } = await c.req.json();

  if (!clientId || !campaignId || !step) {
    return c.json({ error: 'Missing required parameters (clientId, campaignId, step)' }, 400);
  }

  try {
    // 1. Fetch client details
    const client = await c.env.DB.prepare(
      'SELECT * FROM clients WHERE id = ? AND org_id = ?'
    ).bind(clientId, user.org_id).first();

    if (!client) {
      return c.json({ error: 'Client not found' }, 404);
    }

    // 2. Query violations count and estimate damages
    const violationSummary = await c.env.DB.prepare(
      'SELECT COUNT(*) as count, SUM(total_damages_max) as total_damages FROM violations WHERE client_id = ? AND org_id = ?'
    ).bind(clientId, user.org_id).first();

    const violationCount = violationSummary?.count || 0;
    const estimatedDamages = violationSummary?.total_damages || 0;

    // 3. Define outreach email templates based on 06_EMAIL_CAMPAIGNS.md
    const campaigns: Record<string, Record<number, { subject: string; body: string }>> = {
      'cold-outreach': {
        1: {
          subject: `Quick question about ${client.first_name}'s credit report workflow`,
          body: `Hi ${client.first_name},<br><br>
            Quick question: How many credit reports are you analyzing per week right now?<br><br>
            I ask because our automated scan found <strong>${violationCount} core violations</strong> on your report, representing up to <strong>$${(estimatedDamages || violationCount * 1000).toLocaleString()}</strong> in estimated statutory damages under the FCRA and FDCPA (15 U.S.C. § 1681).<br><br>
            We built software that does this analysis in 15 minutes, uncovering re-aging, Metro 2 formatting errors, and state law violations that manual reviews completely miss.<br><br>
            Worth a 15-minute call to see if it fits your workflow?<br><br>
            Best,<br>
            ${user.name}<br>
            RJ Business Solutions`
        },
        2: {
          subject: `Re: Quick question about ${client.first_name}'s credit report`,
          body: `Hi ${client.first_name},<br><br>
            Following up on my previous message. Most credit repair operators miss up to 40% of actionable violations because manual reviews cannot catch:<br>
            - Re-aging (DOFD manipulation)<br>
            - Technical Metro 2 formatting mismatches<br>
            - Unlawful collection on state statute-of-limitation (SOL) expired debts<br><br>
            We found <strong>${violationCount} specific violations</strong> on your report. Our automated letter generator compiles lawsuit-grade dispute documents citing exact case law in seconds.<br><br>
            Would a 15-minute demo be worth your time?<br><br>
            Best,<br>
            ${user.name}`
        },
        3: {
          subject: `How we recovered $${(estimatedDamages || violationCount * 1000).toLocaleString()} in statutory violations`,
          body: `Hi ${client.first_name},<br><br>
            I wanted to share a quick case study of how we help operators turn credit inaccuracies into heavy leverage.<br><br>
            By identifying the exact <strong>${violationCount} violations</strong> on your file (representing a valuation of up to $${(estimatedDamages || violationCount * 1000).toLocaleString()}), our platform automatically constructs dispute packages that force bureau and creditor liability.<br><br>
            Instead of spending hours manually drafting letters, let our automated system do the heavy lifting in seconds.<br><br>
            Let's grab 15 minutes to review your parsed dashboard: [CALENDAR_LINK]<br><br>
            Best,<br>
            ${user.name}`
        }
      }
    };

    const campaign = campaigns[campaignId];
    if (!campaign) {
      return c.json({ error: 'Invalid campaign ID' }, 400);
    }

    const template = campaign[parseInt(step, 10)];
    if (!template) {
      return c.json({ error: 'Invalid campaign step' }, 400);
    }

    // 4. In a production system, this would send an email. We will invoke our send-email simulation/Resend flow
    let sent = false;
    let details = 'Simulated Outreach Delivery';

    if (client.email) {
      try {
        const mail = await sendAppEmail(c.env, {
          to: client.email,
          subject: template.subject,
          html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <img src="https://storage.googleapis.com/msgsndr/qQnxRHDtyx0uydPd5sRl/media/67eb83c5e519ed689430646b.jpeg" alt="RJ Business Solutions" style="max-height: 50px; border-radius: 8px;">
                </div>
                <div style="color: #1e293b; line-height: 1.6; font-size: 14px;">
                  ${template.body}
                </div>
                <div style="margin-top: 30px; border-t: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #64748b; text-align: center;">
                  RJ Business Solutions | 1342 NM 333, Tijeras, New Mexico 87059
                </div>
              </div>
            `,
          purpose: 'onboarding',
        });
        if (mail.sent) {
          sent = true;
          details = `Delivered via ${mail.provider}`;
        }
      } catch (err: any) {
        console.warn('[CAMPAIGN] email failed, fell back to simulation:', err.message);
      }
    }

    // Always log the campaign dispatch in activity_log
    const logId = generateId();
    await c.env.DB.prepare(
      'INSERT INTO activity_log (id, org_id, client_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      logId,
      user.org_id,
      clientId,
      user.id,
      'marketing_campaign_sent',
      `Triggered ${campaignId} (Step ${step}) email to ${client.first_name} ${client.last_name}: "${template.subject}"`,
      JSON.stringify({ campaignId, step, sent, details })
    ).run();

    return c.json({ success: true, sent, details, subject: template.subject });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════
// SERVE FRONTEND SPA
// ═══════════════════════════════════════════════════════════════
app.get('*', async (c) => {
  const path = c.req.path;

  // Serve static HTML files directly (legal pages, etc.)
  if (path.startsWith('/content/') || path.startsWith('/legal/') || path.startsWith('/compliance/')) {
    // Get the filename and map to content directory
    const segments = path.split('/').filter(Boolean);
    const filename = segments[segments.length - 1];
    let contentPath = path;

    // Map /legal/terms -> /content/legal-terms.html
    if (path.startsWith('/legal/')) {
      contentPath = `/content/legal-${filename}.html`;
    } else if (path.startsWith('/compliance/')) {
      contentPath = `/content/legal-${filename}.html`;
    }

    // Static files are in the dist folder, accessed via Workers static asset API
    // For Cloudflare Pages, static files are served automatically when excluded from SPA
    // But since we're using SPA mode, we need to serve them here
    try {
      // Read the static file from the bundle - this works because _worker.js IS the dist folder
      const staticContent = await getStaticFile(contentPath);
      if (staticContent) {
        return c.html(staticContent);
      }
    } catch (e) {
      // Fall through to SPA
    }
  }

  return c.html(getAppHtml());
});

// Helper to serve static HTML files
async function getStaticFile(path: string): Promise<string | null> {
  const staticFiles: Record<string, string> = {
    '/content/legal-terms.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Terms of Service | Smart FCRA</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    :root { --rj-blue:#2563eb; --rj-sky:#0ea5e9; --rj-navy:#0f172a; }
    body { background: #0f172a; color: #e5e7eb; font-family: Inter, system-ui, sans-serif; }
    h1, h2, h3 { font-family: 'Space Grotesk', Inter, sans-serif; }
    .glass { background: rgba(15,23,42,0.72); border: 1px solid rgba(191,219,254,0.12); backdrop-filter: blur(24px); }
  </style>
</head>
<body class="min-h-screen">
  <div class="max-w-4xl mx-auto px-4 py-12">
    <div class="flex items-center gap-4 mb-10">
      <img src="https://storage.googleapis.com/msgsndr/qQnxRHDtyx0uydPd5sRl/media/67eb83c5e519ed689430646b.jpeg" alt="RJ Business Solutions" class="w-12 h-12 rounded-xl object-cover border border-blue-500/40 shadow-[0_0_18px_rgba(37,99,235,0.35)]">
      <div>
        <h1 class="text-xl font-bold text-white">Smart FCRA</h1>
        <p class="text-xs text-sky-300">RJ Business Solutions · Empowering Generational Wealth</p>
      </div>
    </div>
    <div class="glass rounded-2xl p-8 mb-8">
      <h2 class="text-2xl font-bold text-white mb-2">Terms of Service</h2>
      <p class="text-sm text-gray-500 mb-6">Last updated: April 22, 2026</p>
      <div class="prose prose-invert prose-sm max-w-none text-gray-300">
        <p>By using the Smart FCRA service, you agree to be bound by these Terms of Service.</p>
        <h3 class="text-lg font-semibold text-white mt-6 mb-3">1. Acceptance of Terms</h3>
        <p>These Terms of Service govern your use of the Smart FCRA operated by RJ Business Solutions.</p>
        <h3 class="text-lg font-semibold text-white mt-6 mb-3">2. Use of Service</h3>
        <p>You may use this service solely for lawful purposes. You agree not to use the service in any way that violates applicable laws.</p>
        <h3 class="text-lg font-semibold text-white mt-6 mb-3">3. Disclaimer</h3>
        <p>This service provides dispute document preparation only. It is NOT legal advice. Consult an attorney for legal counsel.</p>
        <h3 class="text-lg font-semibold text-white mt-6 mb-3">4. Limitation of Liability</h3>
        <p>RJ Business Solutions shall not be liable for any damages arising from your use of this service.</p>
      </div>
    </div>
    <div class="text-center text-sm text-gray-500">
      <p>RJ Business Solutions | 1342 NM 333, Tijeras, New Mexico 87059</p>
    </div>
  </div>
</body>
</html>`,
    '/content/legal-privacy.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy | Smart FCRA</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    :root { --rj-blue:#2563eb; --rj-sky:#0ea5e9; --rj-navy:#0f172a; }
    body { background: #0f172a; color: #e5e7eb; font-family: Inter, system-ui, sans-serif; }
    h1, h2, h3 { font-family: 'Space Grotesk', Inter, sans-serif; }
    .glass { background: rgba(15,23,42,0.72); border: 1px solid rgba(191,219,254,0.12); backdrop-filter: blur(24px); }
  </style>
</head>
<body class="min-h-screen">
  <div class="max-w-4xl mx-auto px-4 py-12">
    <div class="flex items-center gap-4 mb-10">
      <img src="https://storage.googleapis.com/msgsndr/qQnxRHDtyx0uydPd5sRl/media/67eb83c5e519ed689430646b.jpeg" alt="RJ Business Solutions" class="w-12 h-12 rounded-xl object-cover border border-blue-500/40 shadow-[0_0_18px_rgba(37,99,235,0.35)]">
      <div>
        <h1 class="text-xl font-bold text-white">Smart FCRA</h1>
        <p class="text-xs text-sky-300">RJ Business Solutions · Empowering Generational Wealth</p>
      </div>
    </div>
    <div class="glass rounded-2xl p-8 mb-8">
      <h2 class="text-2xl font-bold text-white mb-2">Privacy Policy</h2>
      <p class="text-sm text-gray-500 mb-6">Last updated: April 22, 2026</p>
      <div class="prose prose-invert prose-sm max-w-none text-gray-300">
        <p>We take your privacy seriously. This policy describes how we collect, use, and protect your personal information.</p>
        <h3 class="text-lg font-semibold text-white mt-6 mb-3">Information We Collect</h3>
        <p>We collect information you provide directly, including name, email, address, and credit report data.</p>
        <h3 class="text-lg font-semibold text-white mt-6 mb-3">How We Use Your Information</h3>
        <p>We use your information to provide credit report analysis, generate dispute documents, and improve our services.</p>
        <h3 class="text-lg font-semibold text-white mt-6 mb-3">Data Security</h3>
        <p>We implement industry-standard security measures to protect your personal information.</p>
      </div>
    </div>
    <div class="text-center text-sm text-gray-500">
      <p>RJ Business Solutions | 1342 NM 333, Tijeras, New Mexico 87059</p>
    </div>
  </div>
</body>
</html>`,
    '/content/legal-disclaimers.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Disclaimers | Smart FCRA</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    :root { --rj-blue:#2563eb; --rj-sky:#0ea5e9; --rj-navy:#0f172a; }
    body { background: #0f172a; color: #e5e7eb; font-family: Inter, system-ui, sans-serif; }
    h1, h2, h3 { font-family: 'Space Grotesk', Inter, sans-serif; }
    .glass { background: rgba(15,23,42,0.72); border: 1px solid rgba(191,219,254,0.12); backdrop-filter: blur(24px); }
  </style>
</head>
<body class="min-h-screen">
  <div class="max-w-4xl mx-auto px-4 py-12">
    <div class="flex items-center gap-4 mb-10">
      <img src="https://storage.googleapis.com/msgsndr/qQnxRHDtyx0uydPd5sRl/media/67eb83c5e519ed689430646b.jpeg" alt="RJ Business Solutions" class="w-12 h-12 rounded-xl object-cover border border-blue-500/40 shadow-[0_0_18px_rgba(37,99,235,0.35)]">
      <div>
        <h1 class="text-xl font-bold text-white">Smart FCRA</h1>
        <p class="text-xs text-sky-300">RJ Business Solutions · Empowering Generational Wealth</p>
      </div>
    </div>
    <div class="glass rounded-2xl p-8 mb-8">
      <h2 class="text-2xl font-bold text-white mb-2">Important Disclaimers</h2>
      <p class="text-sm text-gray-500 mb-6">Last updated: April 22, 2026</p>
      <div class="prose prose-invert prose-sm max-w-none text-gray-300">
        <div class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
          <p class="text-amber-200 font-semibold"><i class="fas fa-exclamation-triangle mr-2"></i>FCRA NOTICE</p>
          <p class="text-amber-100/80 text-sm mt-2">We prepare dispute documents only. This is NOT legal advice.</p>
        </div>
        <h3 class="text-lg font-semibold text-white mt-6 mb-3">Document Preparation Service</h3>
        <p>This service provides credit report dispute document preparation. We are not attorneys and do not provide legal advice.</p>
        <h3 class="text-lg font-semibold text-white mt-6 mb-3">No Guarantee of Results</h3>
        <p>While we strive to provide accurate analysis, we cannot guarantee specific outcomes from credit bureau investigations.</p>
        <h3 class="text-lg font-semibold text-white mt-6 mb-3">Consult an Attorney</h3>
        <p>For legal advice regarding your credit situation, please consult with a qualified attorney.</p>
      </div>
    </div>
    <div class="text-center text-sm text-gray-500">
      <p>RJ Business Solutions | 1342 NM 333, Tijeras, New Mexico 87059</p>
    </div>
  </div>
</body>
</html>`,
  };

  return staticFiles[path] || null;
}

function getAppHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="#2563eb">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Smart FCRA">
  <meta name="mobile-web-app-capable" content="yes">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="apple-touch-icon" href="/static/brand/pwa-icon.jpg">
  <link rel="icon" href="/static/brand/pwa-icon.jpg">
  <title>Smart FCRA · RJ Business Solutions</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/static/brand/brand.css">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css" rel="stylesheet">
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: { 50:'#eff6ff',100:'#dbeafe',200:'#bfdbfe',300:'#93c5fd',400:'#60a5fa',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8',800:'#1e40af',900:'#1e3a8a' },
            rj: { blue:'#2563eb', sky:'#0ea5e9', deep:'#1e3a8a', navy:'#0f172a' },
            danger: { 500:'#ef4444',600:'#dc2626' },
            success: { 500:'#22c55e',600:'#16a34a' },
            warn: { 500:'#f59e0b',600:'#d97706' },
          },
          fontFamily: {
            sans: ['Inter', 'system-ui', 'sans-serif'],
            display: ['Space Grotesk', 'system-ui', 'sans-serif'],
          }
        }
      }
    }
  </script>
  <style>
    :root {
      --rj-blue: #2563eb; --rj-sky: #0ea5e9; --rj-deep: #1e3a8a; --rj-navy: #0f172a;
      --font-head: "Space Grotesk", system-ui, sans-serif;
      --font-body: "Inter", system-ui, sans-serif;
      --grad-primary: linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%);
      --grad-dark: linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #2563eb 100%);
    }
    * { 
      font-family: var(--font-body); 
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    h1, h2, h3, .font-title, .font-display {
      font-family: var(--font-head);
      letter-spacing: -0.02em;
    }

    .glass { 
      background: rgba(15, 23, 42, 0.72); 
      backdrop-filter: blur(24px) saturate(180%); 
      -webkit-backdrop-filter: blur(24px) saturate(180%); 
      border: 1px solid rgba(191, 219, 254, 0.12); 
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
    }

    .glass-premium {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%);
      backdrop-filter: blur(30px);
      -webkit-backdrop-filter: blur(30px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1), 0 20px 50px rgba(0, 0, 0, 0.4);
    }

    .gradient-bg { 
      background:
        radial-gradient(ellipse at 20% 0%, rgba(37,99,235,0.28) 0%, transparent 45%),
        radial-gradient(ellipse at 80% 10%, rgba(14,165,233,0.18) 0%, transparent 40%),
        radial-gradient(circle at 50% 0%, #172554 0%, #0f172a 55%, #020617 100%); 
    }
    .btn-rj {
      background: var(--grad-primary);
      color: #fff;
      box-shadow: 0 8px 18px rgba(37,99,235,.28);
    }
    .btn-rj:hover { filter: brightness(1.05); transform: translateY(-1px); }

    .card-hover { 
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
    }

    .card-hover:hover { 
      transform: translateY(-4px) scale(1.01); 
      border-color: rgba(59, 130, 246, 0.35);
      box-shadow: 0 12px 30px rgba(10, 102, 255, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.15); 
    }

    .severity-critical { border-left: 5px solid #ef4444; background: linear-gradient(90deg, rgba(239, 68, 68, 0.05) 0%, transparent 100%); }
    .severity-high { border-left: 5px solid #f97316; background: linear-gradient(90deg, rgba(249, 115, 22, 0.05) 0%, transparent 100%); }
    .severity-medium { border-left: 5px solid #eab308; background: linear-gradient(90deg, rgba(234, 179, 8, 0.05) 0%, transparent 100%); }
    .severity-low { border-left: 5px solid #22c55e; background: linear-gradient(90deg, rgba(34, 197, 94, 0.05) 0%, transparent 100%); }

    .fade-in { 
      animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); 
    }

    @keyframes fadeIn { 
      from { opacity: 0; transform: translateY(12px); } 
      to { opacity: 1; transform: translateY(0); } 
    }

    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: #020617; }
    ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; border: 2px solid #020617; }
    ::-webkit-scrollbar-thumb:hover { background: #334155; }

    .pulse-glow { animation: pulseGlow 3s ease-in-out infinite; }
    @keyframes pulseGlow { 
      0%, 100% { box-shadow: 0 0 10px rgba(59, 130, 246, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.05); } 
      50% { box-shadow: 0 0 25px rgba(59, 130, 246, 0.55), inset 0 1px 1px rgba(255, 255, 255, 0.15); border-color: rgba(59, 130, 246, 0.5); } 
    }

    .step-done { background: rgba(34, 197, 94, 0.12); border-color: rgba(34, 197, 94, 0.35); color: #4ade80; }
    .step-active { background: rgba(59, 130, 246, 0.15); border-color: rgba(59, 130, 246, 0.45); color: #60a5fa; box-shadow: 0 0 15px rgba(59, 130, 246, 0.25); }
    .step-pending { background: rgba(100, 116, 139, 0.06); border-color: rgba(100, 116, 139, 0.2); color: #94a3b8; }
    
    @keyframes progressPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    .progress-pulse { animation: progressPulse 1.2s ease-in-out infinite; }

    /* Elegant brand styling */
    .brand-glow {
      text-shadow: 0 0 20px rgba(10, 102, 255, 0.4);
    }

    #page-content { overflow-x: hidden; }
    #page-content table { min-width: 36rem; }
    .table-scroll, #page-content .glass { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    #nav-backdrop { background: rgba(2, 6, 23, 0.62); }
    body.nav-open { overflow: hidden; }
    @media (max-width: 767px) {
      #page-content { padding: 16px 12px 28px !important; padding-top: 4.5rem !important; }
      button, a, select, input, textarea { max-width: 100%; }
      .md\\:hidden.fixed { min-width: 44px; min-height: 44px; }
    }
    @media (display-mode: standalone) {
      [data-pwa-install] { display: none !important; }
      body { padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); }
    }
  </style>
</head>
<body class="gradient-bg min-h-screen text-gray-100">
  <div id="app"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js"></script>
  <script>
    if (window.pdfjsLib) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    }
  </script>
  <script src="/static/app.js?v=20260813-saas-funnel-v2"></script>
</body>
</html>`;
}

registerClientIntelligenceRoutes(app, {
  authMiddleware,
  resolvePortalClientSafe,
  isPortalAnalysisUnlocked,
  decryptPII,
});

export default app;
