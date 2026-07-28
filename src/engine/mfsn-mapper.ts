import { CreditReportData, ParsedAccount, ParsedInquiry, ParsedPublicRecord } from './violations';

/**
 * Maps MyFreeScoreNow (MFSN) response JSON to internal CreditReportData format
 */
export function mapMfsnToInternal(mfsnData: any): CreditReportData[] {
  if (!mfsnData?.data?.providerViews) return [];

  const bureauReports: CreditReportData[] = [];

  for (const view of mfsnData.data.providerViews) {
    const bureau = view.provider || 'Unknown';
    const summary = view.summary || {};
    const subject = summary.subject || {};

    const report: CreditReportData = {
      bureau,
      reportDate: summary.reportGenerated ? new Date(summary.reportGenerated).toLocaleDateString() : new Date().toLocaleDateString(),
      personalInfo: {
        names: subject.currentName ? [`${subject.currentName.firstName} ${subject.currentName.lastName}`] : [],
        addresses: subject.currentAddress ? [
          `${subject.currentAddress.line1}, ${subject.currentAddress.line3}, ${subject.currentAddress.line4} ${subject.currentAddress.line5}`
        ] : [],
        employers: (subject.employmentHistory || []).map((e: any) => e.employerName).filter(Boolean),
        ssns: subject.nationalIdentifier ? [subject.nationalIdentifier] : [],
        dobs: subject.dateOfBirth ? [new Date(subject.dateOfBirth).toLocaleDateString()] : []
      },
      scores: extractMfsnScores(view, summary, bureau),
      accounts: [],
      inquiries: [],
      publicRecords: [],
      collections: []
    };

    // Map Accounts (Revolving, Mortgage, Installment, Other)
    const allAccounts = [
      ...(view.revolvingAccounts || []),
      ...(view.mortgageAccounts || []),
      ...(view.installmentAccounts || []),
      ...(view.otherAccounts || [])
    ];

    report.accounts = allAccounts.map(a => mapAccount(a));

    // Map Collections
    report.collections = (view.collections || []).map((c: any) => mapCollection(c, bureau));

    // Map Inquiries
    report.inquiries = (view.inquiries || []).map((i: any) => ({
      creditorName: i.contactInformation?.contactName || 'Unknown',
      inquiryDate: i.reportedDate ? new Date(i.reportedDate).toLocaleDateString() : '',
      inquiryType: i.type || 'Hard'
    }));

    // Map Public Records
    if (view.publicRecords) {
      const pr = view.publicRecords;
      const records: ParsedPublicRecord[] = [];
      
      (pr.bankruptcies || []).forEach((b: any) => {
        records.push({
          recordType: 'Bankruptcy',
          filingDate: b.filedDate ? new Date(b.filedDate).toLocaleDateString() : '',
          status: b.dispositionStatus?.description || 'Unknown',
          court: b.courtName,
          amount: b.liability?.amount,
          chapter: b.dispositionStatus?.description?.match(/Chapter \d+/)?.[0] || ''
        });
      });

      (pr.judgments || []).forEach((j: any) => {
        records.push({
          recordType: 'Judgment',
          filingDate: j.filedDate ? new Date(j.filedDate).toLocaleDateString() : '',
          status: j.status?.description || 'Unknown',
          amount: j.amount?.amount,
          court: j.courtName
        });
      });

      (pr.liens || []).forEach((l: any) => {
        records.push({
          recordType: 'Tax Lien',
          filingDate: l.filedDate ? new Date(l.filedDate).toLocaleDateString() : '',
          status: l.status || 'Unknown',
          amount: l.lienAmount?.amount,
          court: l.courtName
        });
      });

      report.publicRecords = records;
    }

    bureauReports.push(report);
  }

  return bureauReports;
}

function mapAccount(a: any): ParsedAccount {
  return {
    creditorName: a.accountName || 'Unknown',
    accountNumber: a.accountNumber || '',
    accountType: a.accountType || '',
    accountStatus: a.accountStatus || '',
    dateOpened: a.dateOpened ? new Date(a.dateOpened).toLocaleDateString() : '',
    dateClosed: a.dateClosed ? new Date(a.dateClosed).toLocaleDateString() : undefined,
    currentBalance: a.balanceAmount?.amount || 0,
    originalAmount: a.highCreditAmount?.amount || 0,
    highBalance: a.highCreditAmount?.amount || 0,
    creditLimit: a.creditLimitAmount?.amount || 0,
    monthlyPayment: a.monthlyPayment?.amount || 0,
    paymentStatus: a.accountStatus || '',
    paymentHistory: transformPaymentHistory(a.paymentHistory || []),
    isCollection: a.accountStatus === 'COLLECTION' || a.accountStatus === 'COLLECTION_OR_CHARGEOFF',
    dateReported: a.reportedDate ? new Date(a.reportedDate).toLocaleDateString() : undefined,
    lastPaymentDate: a.lastPaymentDate ? new Date(a.lastPaymentDate).toLocaleDateString() : undefined,
    dofd: a.firstDelinquencyDate ? new Date(a.firstDelinquencyDate).toLocaleDateString() : undefined,
    comments: (a.comments || []).map((c: any) => c.description).join('; '),
    responsibility: a.paymentResponsibility
  };
}

function mapCollection(c: any, bureau: string): ParsedAccount {
  return {
    creditorName: c.agencyClient || 'Unknown Collector',
    accountNumber: c.accountNumber || '',
    accountType: 'Collection',
    accountStatus: c.status || 'COLLECTION',
    dateOpened: c.assignedDate ? new Date(c.assignedDate).toLocaleDateString() : '',
    currentBalance: c.amount?.amount || 0,
    originalAmount: c.orginalAmountOwed?.amount || 0,
    highBalance: c.orginalAmountOwed?.amount || 0,
    creditLimit: 0,
    monthlyPayment: 0,
    paymentStatus: c.status || 'COLLECTION',
    paymentHistory: '',
    isCollection: true,
    dateReported: c.reportedDate ? new Date(c.reportedDate).toLocaleDateString() : undefined,
    originalCreditor: c.agencyClient // MFSN usually puts the OC in a specific field if available, but the spec says CollectionItem has originalAmountOwed
  };
}

function transformPaymentHistory(history: any[]): string {
  // MFSN history is an array of years, each with months.
  // We want to sort by year descending and then months descending (Dec to Jan)
  // to create the string format the engine expects.
  const sortedHistory = [...history].sort((a, b) => b.year - a.year);
  let historyStr = '';

  const months = ['december', 'november', 'october', 'september', 'august', 'july', 'june', 'may', 'april', 'march', 'february', 'january'];

  for (const yearObj of sortedHistory) {
    for (const month of months) {
      const monthData = yearObj[month];
      if (monthData && monthData.value) {
        // Extract the code (last character of value like "PAYS_AS_AGREED C")
        const code = monthData.value.split(' ').pop();
        historyStr += code || 'U'; // U for unknown
      }
    }
  }

  return historyStr;
}

function extractMfsnScores(view: any, summary: any, bureau: string) {
  const scoreBlock = view.creditScore || view.score || summary.creditScore || summary.score || {};
  const factors = Array.isArray(scoreBlock.factors)
    ? scoreBlock.factors.map((f: any) => (typeof f === 'string' ? f : f.description || f.factor || '')).filter(Boolean)
    : [];
  const numeric =
    Number(scoreBlock.score ?? scoreBlock.value ?? scoreBlock.ficoScore ?? scoreBlock.vantageScore ?? NaN);
  const fico = Number.isFinite(numeric) ? numeric : null;
  const bureauKey = String(bureau || '').toLowerCase();
  return {
    fico,
    vantage: Number.isFinite(Number(scoreBlock.vantageScore)) ? Number(scoreBlock.vantageScore) : null,
    equifax: bureauKey.includes('equifax') ? fico : null,
    experian: bureauKey.includes('experian') ? fico : null,
    transunion: bureauKey.includes('transunion') || bureauKey.includes('trans union') ? fico : null,
    provider: 'MyFreeScoreNow',
    model: scoreBlock.model || scoreBlock.scoreModel || scoreBlock.name || 'FICO',
    pulledAt: summary.reportGenerated || undefined,
    factors,
  };
}
