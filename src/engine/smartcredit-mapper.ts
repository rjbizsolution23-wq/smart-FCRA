import { CreditReportData, ParsedAccount, ParsedInquiry, ParsedPublicRecord } from './violations';

/**
 * Maps SmartCredit / ConsumerDirect response JSON to internal CreditReportData format.
 * Written defensively with robust fallbacks to support multiple variations of the API payload.
 */
export function mapSmartCreditToInternal(smartCreditData: any): CreditReportData[] {
  if (!smartCreditData) return [];

  // Normalize input: handle payload wrapping under .data, .reports, .providerViews etc.
  let rawReports: any[] = [];

  if (Array.isArray(smartCreditData)) {
    rawReports = smartCreditData;
  } else if (Array.isArray(smartCreditData.reports)) {
    rawReports = smartCreditData.reports;
  } else if (Array.isArray(smartCreditData.bureauReports)) {
    rawReports = smartCreditData.bureauReports;
  } else if (smartCreditData.data) {
    const data = smartCreditData.data;
    if (Array.isArray(data.reports)) {
      rawReports = data.reports;
    } else if (Array.isArray(data.bureauReports)) {
      rawReports = data.bureauReports;
    } else if (Array.isArray(data.providerViews)) {
      rawReports = data.providerViews;
    } else if (typeof data === 'object') {
      rawReports = [data];
    }
  } else if (typeof smartCreditData === 'object') {
    // If it's a single report object, wrap it in an array
    rawReports = [smartCreditData];
  }

  const bureauReports: CreditReportData[] = [];

  for (const rawReport of rawReports) {
    if (!rawReport || typeof rawReport !== 'object') continue;

    const bureau = rawReport.bureau || rawReport.provider || rawReport.sourceName || 'Unknown Bureau';
    const reportDateRaw = rawReport.reportDate || rawReport.generatedDate || rawReport.createdDate || new Date().toISOString();
    const reportDate = isNaN(Date.parse(reportDateRaw)) ? new Date().toLocaleDateString() : new Date(reportDateRaw).toLocaleDateString();

    // Demographics mapping
    const personalInfo = rawReport.personalInfo || rawReport.subject || rawReport.demographics || {};
    const names: string[] = [];
    if (personalInfo.names) {
      names.push(...(Array.isArray(personalInfo.names) ? personalInfo.names : [personalInfo.names]));
    } else if (personalInfo.firstName || personalInfo.lastName) {
      names.push(`${personalInfo.firstName || ''} ${personalInfo.lastName || ''}`.trim());
    } else if (personalInfo.currentName) {
      const cn = personalInfo.currentName;
      names.push(`${cn.firstName || ''} ${cn.lastName || ''}`.trim());
    }

    const addresses: string[] = [];
    if (Array.isArray(personalInfo.addresses)) {
      personalInfo.addresses.forEach((addr: any) => {
        if (typeof addr === 'string') {
          addresses.push(addr);
        } else if (addr && typeof addr === 'object') {
          addresses.push(`${addr.line1 || addr.address1 || ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.zip || addr.postalCode || ''}`.trim().replace(/^,\s*/, ''));
        }
      });
    } else if (personalInfo.currentAddress) {
      const addr = personalInfo.currentAddress;
      addresses.push(`${addr.line1 || addr.line3 || ''}, ${addr.city || addr.line4 || ''}, ${addr.state || addr.line5 || ''}`.trim().replace(/^,\s*/, ''));
    }

    const employers: string[] = [];
    if (Array.isArray(personalInfo.employers)) {
      employers.push(...personalInfo.employers);
    } else if (Array.isArray(personalInfo.employmentHistory)) {
      personalInfo.employmentHistory.forEach((emp: any) => {
        if (typeof emp === 'string') employers.push(emp);
        else if (emp && emp.employerName) employers.push(emp.employerName);
      });
    }

    const ssns: string[] = [];
    if (personalInfo.ssn) {
      ssns.push(personalInfo.ssn);
    } else if (personalInfo.nationalIdentifier) {
      ssns.push(personalInfo.nationalIdentifier);
    } else if (rawReport.ssn) {
      ssns.push(rawReport.ssn);
    }

    const dobs: string[] = [];
    if (personalInfo.dob) {
      dobs.push(new Date(personalInfo.dob).toLocaleDateString());
    } else if (personalInfo.dateOfBirth) {
      dobs.push(new Date(personalInfo.dateOfBirth).toLocaleDateString());
    } else if (rawReport.dob) {
      dobs.push(new Date(rawReport.dob).toLocaleDateString());
    }

    const report: CreditReportData = {
      bureau,
      reportDate,
      personalInfo: {
        names: names.filter(Boolean),
        addresses: addresses.filter(Boolean),
        employers: employers.filter(Boolean),
        ssns: ssns.filter(Boolean),
        dobs: dobs.filter(Boolean)
      },
      scores: extractSmartCreditScores(rawReport, bureau),
      accounts: [],
      inquiries: [],
      publicRecords: [],
      collections: []
    };

    // Tradelines/Accounts Mapping
    const rawAccounts = rawReport.accounts || rawReport.tradelines || rawReport.tradeLines || [];
    const allAccounts: any[] = Array.isArray(rawAccounts) ? rawAccounts : [];

    // Fallback support for categorized account groupings (MFSN-like structures under SmartCredit report)
    const categorizedAccounts = [
      ...(rawReport.revolvingAccounts || []),
      ...(rawReport.installmentAccounts || []),
      ...(rawReport.mortgageAccounts || []),
      ...(rawReport.otherAccounts || [])
    ];
    allAccounts.push(...categorizedAccounts);

    for (const a of allAccounts) {
      if (!a || typeof a !== 'object') continue;

      const isColl = a.isCollection || a.accountType?.toUpperCase() === 'COLLECTION' || a.accountStatus?.toUpperCase() === 'COLLECTION' || a.accountStatus?.toUpperCase() === 'COLLECTION_OR_CHARGEOFF';
      const mappedAcct = mapAccount(a);

      if (isColl) {
        report.collections.push(mappedAcct);
      } else {
        report.accounts.push(mappedAcct);
      }
    }

    // Direct Collections mapping if present
    const rawCollections = rawReport.collections || rawReport.collectionAccounts || [];
    if (Array.isArray(rawCollections)) {
      rawCollections.forEach((c: any) => {
        report.collections.push(mapAccount(c));
      });
    }

    // Inquiries Mapping
    const rawInquiries = rawReport.inquiries || rawReport.creditInquiries || rawReport.tradeInquiries || [];
    if (Array.isArray(rawInquiries)) {
      report.inquiries = rawInquiries.map((i: any) => {
        if (!i || typeof i !== 'object') return { creditorName: 'Unknown', inquiryDate: '', inquiryType: 'Hard' };
        const name = i.creditorName || i.contactInformation?.contactName || i.subscriberName || 'Unknown';
        const dateRaw = i.inquiryDate || i.reportedDate || i.date || '';
        const date = dateRaw && !isNaN(Date.parse(dateRaw)) ? new Date(dateRaw).toLocaleDateString() : '';
        return {
          creditorName: name,
          inquiryDate: date,
          inquiryType: i.inquiryType || i.type || 'Hard',
          purpose: i.purpose || i.inquiryType || undefined
        };
      });
    }

    // Public Records Mapping
    const rawPublicRecords = rawReport.publicRecords || rawReport.public_records || rawReport.publicRecordItems || {};
    if (rawPublicRecords && typeof rawPublicRecords === 'object') {
      const records: ParsedPublicRecord[] = [];

      // Bankruptcies
      const bankruptcies = rawPublicRecords.bankruptcies || rawPublicRecords.bankruptcy || [];
      if (Array.isArray(bankruptcies)) {
        bankruptcies.forEach((b: any) => {
          if (!b) return;
          const dateRaw = b.filingDate || b.filedDate || b.dateFiled || '';
          records.push({
            recordType: 'Bankruptcy',
            filingDate: dateRaw && !isNaN(Date.parse(dateRaw)) ? new Date(dateRaw).toLocaleDateString() : '',
            status: b.status || b.dispositionStatus?.description || b.disposition || 'Unknown',
            court: b.court || b.courtName || b.courtDescription || '',
            amount: b.amount || b.liability?.amount || undefined,
            chapter: b.chapter || b.dispositionStatus?.description?.match(/Chapter \d+/)?.[0] || ''
          });
        });
      }

      // Judgments
      const judgments = rawPublicRecords.judgments || rawPublicRecords.judgment || [];
      if (Array.isArray(judgments)) {
        judgments.forEach((j: any) => {
          if (!j) return;
          const dateRaw = j.filingDate || j.filedDate || j.dateFiled || '';
          records.push({
            recordType: 'Judgment',
            filingDate: dateRaw && !isNaN(Date.parse(dateRaw)) ? new Date(dateRaw).toLocaleDateString() : '',
            status: j.status || j.status?.description || 'Unknown',
            court: j.court || j.courtName || '',
            amount: j.amount || j.amount?.amount || undefined
          });
        });
      }

      // Liens
      const liens = rawPublicRecords.liens || rawPublicRecords.lien || [];
      if (Array.isArray(liens)) {
        liens.forEach((l: any) => {
          if (!l) return;
          const dateRaw = l.filingDate || l.filedDate || '';
          records.push({
            recordType: 'Tax Lien',
            filingDate: dateRaw && !isNaN(Date.parse(dateRaw)) ? new Date(dateRaw).toLocaleDateString() : '',
            status: l.status || 'Unknown',
            court: l.court || l.courtName || '',
            amount: l.amount || l.lienAmount?.amount || undefined
          });
        });
      }

      // Handle flat public record arrays if they are not categorized
      if (Array.isArray(rawPublicRecords)) {
        rawPublicRecords.forEach((r: any) => {
          if (!r) return;
          const dateRaw = r.filingDate || r.filedDate || '';
          records.push({
            recordType: r.recordType || r.type || 'Public Record',
            filingDate: dateRaw && !isNaN(Date.parse(dateRaw)) ? new Date(dateRaw).toLocaleDateString() : '',
            status: r.status || 'Unknown',
            court: r.court || r.courtName || '',
            amount: r.amount || undefined,
            chapter: r.chapter || undefined
          });
        });
      }

      report.publicRecords = records;
    }

    bureauReports.push(report);
  }

  return bureauReports;
}

function mapAccount(a: any): ParsedAccount {
  const parseDateStr = (val: any) => {
    if (!val) return undefined;
    return !isNaN(Date.parse(val)) ? new Date(val).toLocaleDateString() : undefined;
  };

  const paymentHistoryStr = transformPaymentHistory(a.paymentHistory || a.payment_history || a.history || []);

  return {
    creditorName: a.creditorName || a.accountName || a.name || 'Unknown Creditor',
    accountNumber: a.accountNumber || a.account_number || a.number || '',
    accountType: a.accountType || a.type || 'Unknown',
    accountStatus: a.accountStatus || a.status || '',
    dateOpened: parseDateStr(a.dateOpened || a.openDate || a.date_opened) || '',
    dateClosed: parseDateStr(a.dateClosed || a.closeDate || a.date_closed),
    dofd: parseDateStr(a.dofd || a.firstDelinquencyDate || a.dateOfFirstDelinquency),
    dola: parseDateStr(a.dola || a.dateOfLastActivity || a.lastActivityDate),
    dateChargedOff: parseDateStr(a.dateChargedOff || a.chargeOffDate),
    currentBalance: Number(a.currentBalance || a.balance || a.balanceAmount?.amount || 0),
    originalAmount: Number(a.originalAmount || a.highCredit || a.highCreditAmount?.amount || a.originalAmountOwed?.amount || 0),
    highBalance: Number(a.highBalance || a.highCredit || a.highCreditAmount?.amount || 0),
    creditLimit: Number(a.creditLimit || a.limit || a.creditLimitAmount?.amount || 0),
    monthlyPayment: Number(a.monthlyPayment || a.payment || a.monthlyPaymentAmount?.amount || 0),
    paymentStatus: a.paymentStatus || a.status || a.accountStatus || '',
    paymentHistory: paymentHistoryStr,
    isCollection: Boolean(a.isCollection || a.accountType?.toUpperCase() === 'COLLECTION' || a.accountStatus?.toUpperCase() === 'COLLECTION' || a.accountStatus?.toUpperCase() === 'COLLECTION_OR_CHARGEOFF'),
    collectorName: a.collectorName || a.agencyClient || undefined,
    originalCreditor: a.originalCreditor || a.agencyClient || undefined,
    disputeFlag: a.disputeFlag || a.disputed || false,
    comments: Array.isArray(a.comments) ? a.comments.join('; ') : (a.comments || ''),
    dateReported: parseDateStr(a.dateReported || a.reportedDate || a.date_reported),
    lastPaymentDate: parseDateStr(a.lastPaymentDate || a.paymentDate || a.last_payment_date),
    terms: a.terms || undefined,
    responsibility: a.responsibility || a.paymentResponsibility || undefined
  };
}

/**
 * Parses and transforms payment histories from SmartCredit/ConsumerDirect structures
 * into the standard Metro 2 payment code history string format expected by our engine.
 */
function transformPaymentHistory(history: any): string {
  if (!history) return '';

  if (typeof history === 'string') return history;

  if (Array.isArray(history)) {
    // If it's a flat array of payment status strings or codes
    if (history.every(item => typeof item === 'string')) {
      return history.map(code => {
        const val = code.trim().toUpperCase();
        if (val === 'CURRENT' || val === 'OK' || val === '0' || val === 'C') return 'C';
        if (val.includes('30') || val === '1') return '1';
        if (val.includes('60') || val === '2') return '2';
        if (val.includes('90') || val === '3') return '3';
        if (val.includes('120') || val === '4') return '4';
        if (val.includes('CHARGEOFF') || val.includes('COLLECTION') || val === '9') return '9';
        return 'U';
      }).join('');
    }

    // If it's an array of year/month objects similar to MFSN
    const sortedHistory = [...history].sort((a, b) => {
      const yearA = Number(a.year || 0);
      const yearB = Number(b.year || 0);
      return yearB - yearA;
    });

    let historyStr = '';
    const months = ['december', 'november', 'october', 'september', 'august', 'july', 'june', 'may', 'april', 'march', 'february', 'january'];

    for (const yearObj of sortedHistory) {
      for (const m of months) {
        const monthData = yearObj[m];
        if (monthData && monthData.value) {
          const code = monthData.value.split(' ').pop();
          historyStr += code || 'U';
        }
      }
    }
    return historyStr;
  }

  if (typeof history === 'object') {
    // If it's a key-value pair of date to code (e.g. { "2026-05": "C", "2026-04": "1" })
    const sortedKeys = Object.keys(history).sort((a, b) => b.localeCompare(a));
    return sortedKeys.map(k => {
      const code = String(history[k]).trim().toUpperCase();
      if (code === 'CURRENT' || code === 'OK' || code === 'C' || code === '0') return 'C';
      if (code.includes('30') || code === '1') return '1';
      if (code.includes('60') || code === '2') return '2';
      if (code.includes('90') || code === '3') return '3';
      if (code.includes('120') || code === '4') return '4';
      if (code.includes('CHARGEOFF') || code.includes('COLLECTION') || code === '9') return '9';
      return 'U';
    }).join('');
  }

  return '';
}

function extractSmartCreditScores(rawReport: any, bureau: string) {
  const scoreBlock = rawReport.creditScore || rawReport.score || rawReport.scores || {};
  const numeric = Number(
    scoreBlock.score ?? scoreBlock.value ?? scoreBlock.fico ?? scoreBlock.ficoScore ?? rawReport.ficoScore ?? NaN
  );
  const fico = Number.isFinite(numeric) ? numeric : null;
  const bureauKey = String(bureau || '').toLowerCase();
  const factors = Array.isArray(scoreBlock.factors)
    ? scoreBlock.factors.map((f: any) => (typeof f === 'string' ? f : f.description || f.factor || '')).filter(Boolean)
    : [];
  return {
    fico,
    vantage: Number.isFinite(Number(scoreBlock.vantage || scoreBlock.vantageScore))
      ? Number(scoreBlock.vantage || scoreBlock.vantageScore)
      : null,
    equifax: bureauKey.includes('equifax') ? fico : null,
    experian: bureauKey.includes('experian') ? fico : null,
    transunion: bureauKey.includes('transunion') || bureauKey.includes('trans union') ? fico : null,
    provider: 'SmartCredit',
    model: scoreBlock.model || scoreBlock.scoreModel || 'FICO',
    pulledAt: rawReport.reportDate || rawReport.generatedDate || undefined,
    factors,
  };
}
