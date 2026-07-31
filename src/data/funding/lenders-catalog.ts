/**
 * Clean Master Lender & Tradeline catalog (RJ Business Solutions).
 *
 * Source dump claimed 1656 rows (2026-07-31). Only IDs 1–65 from
 * `lenders-database.ts` are verified product / institution names.
 * Rows 66–1656 were markdown / roadmap / menu / tech-stack pollution —
 * see docs/funding/LENDER_DUMP_AUDIT_2026-07-31.md.
 */

export type LenderProductType =
  | 'RENT_REPORTER'
  | 'PRIMARY_TRADELINE'
  | 'BUSINESS_CARD'
  | 'CREDIT_UNION'
  | 'FINANCIAL_INSTITUTION';

export type LenderCategory =
  | 'Soft-Pull / Direct Bank / Underwriter'
  | 'Credit Union & Tradeline Database';

export type LenderRecord = {
  id: number;
  name: string;
  type: LenderProductType;
  underwriter: string;
  minCreditScore: number;
  source: string;
  category: LenderCategory;
  /** Goals this product commonly supports */
  goals: Array<'rebuild' | 'thin_file' | 'mortgage' | 'auto' | 'business' | 'student' | 'debt'>;
  notes?: string;
};

export const LENDER_CATALOG_META = {
  system: 'RJ Business Solutions - Master Lender & Tradeline Intelligence Database',
  dumpClaimedTotal: 1656,
  curatedTotal: 65,
  updatedAt: '2026-07-31',
  curationRule: 'Import only verified lenders-database.ts rows (ids 1–65). Reject polluted markdown scrape rows.',
} as const;

/** Verified lenders / tradeline products (ids 1–65). */
export const LENDER_CATALOG: LenderRecord[] = [
  // Rent reporters
  { id: 1, name: 'RentReporters', type: 'RENT_REPORTER', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 300, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['thin_file', 'rebuild', 'mortgage'] },
  { id: 2, name: 'BoomPay Rent Reporting', type: 'RENT_REPORTER', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 300, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['thin_file', 'rebuild', 'mortgage'] },
  { id: 3, name: 'Rental Kharma', type: 'RENT_REPORTER', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 300, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['thin_file', 'rebuild', 'mortgage'] },

  // Primary / builder tradelines
  { id: 4, name: 'Self Credit Builder Account', type: 'PRIMARY_TRADELINE', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 300, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['thin_file', 'rebuild', 'auto', 'mortgage'] },
  { id: 5, name: 'Kickoff Credit Builder', type: 'PRIMARY_TRADELINE', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 300, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['thin_file', 'rebuild'] },
  { id: 6, name: 'Credit Strong Installment Builder', type: 'PRIMARY_TRADELINE', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 300, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['thin_file', 'rebuild', 'auto', 'mortgage'] },
  { id: 7, name: 'Ava Credit Builder Card', type: 'PRIMARY_TRADELINE', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 300, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['thin_file', 'rebuild'] },
  { id: 8, name: 'Chime Credit Builder Secured Visa', type: 'PRIMARY_TRADELINE', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 300, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['thin_file', 'rebuild'] },
  { id: 9, name: 'Extra Debit-Credit Card', type: 'PRIMARY_TRADELINE', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 300, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['thin_file', 'rebuild'] },

  // Business cards
  { id: 10, name: 'Chase Ink Business Cash®', type: 'BUSINESS_CARD', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 700, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['business'] },
  { id: 11, name: 'Chase Ink Business Unlimited®', type: 'BUSINESS_CARD', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 700, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['business'] },
  { id: 12, name: 'American Express Blue Business® Plus', type: 'BUSINESS_CARD', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 680, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['business'] },
  { id: 13, name: 'Bank of America Business Advantage', type: 'BUSINESS_CARD', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 710, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['business'] },
  { id: 14, name: 'U.S. Bank Triple Cash Rewards Business', type: 'BUSINESS_CARD', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 720, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['business'] },
  { id: 15, name: 'PNC Visa® Business Credit Card', type: 'BUSINESS_CARD', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 700, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['business'] },

  // Named credit unions (typed CREDIT_UNION in source)
  { id: 16, name: 'Navy Federal Credit Union (NFCU)', type: 'CREDIT_UNION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 17, name: 'Pentagon Federal Credit Union (PenFed)', type: 'CREDIT_UNION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 680, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage'] },
  { id: 18, name: 'Digital Federal Credit Union (DCU)', type: 'CREDIT_UNION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 670, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage'] },
  { id: 19, name: 'Alliant Credit Union', type: 'CREDIT_UNION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 680, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage'] },
  { id: 20, name: 'First Tech Federal Credit Union', type: 'CREDIT_UNION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 690, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage'] },
  { id: 21, name: 'Boeing Employees Credit Union (BECU)', type: 'CREDIT_UNION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 660, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 22, name: 'Mountain America Credit Union (MACU)', type: 'CREDIT_UNION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 670, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage'] },
  { id: 23, name: 'America First Credit Union', type: 'CREDIT_UNION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 660, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 24, name: 'Suncoast Credit Union', type: 'CREDIT_UNION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 650, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 25, name: 'State Employees Credit Union of NC (SECU)', type: 'CREDIT_UNION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 640, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },

  // Additional CUs / FIs (source typed as Financial Institution / Lender)
  { id: 26, name: 'Golden 1 Credit Union', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 27, name: 'SchoolsFirst Federal Credit Union', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 28, name: 'Star One Credit Union', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 29, name: 'Patelco Credit Union', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 30, name: 'Chevron Federal Credit Union', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 31, name: 'San Mateo Credit Union', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 32, name: 'Logix Federal Credit Union', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 33, name: 'Tech CU (Technology Credit Union)', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 34, name: 'Provident Credit Union', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 35, name: 'Redwood Credit Union', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 36, name: 'Randolph-Brooks Federal Credit Union (RBFCU)', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 37, name: 'Security Service Federal Credit Union (SSFCU)', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 38, name: 'Texas Dow Employees Credit Union (TDECU)', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 39, name: 'First Tech Federal Credit Union (TX Branch)', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage'], notes: 'Branch listing of First Tech; treat as same CU family as id 20.' },
  { id: 40, name: 'Austin Telco Federal Credit Union', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 41, name: 'Credit Union of Texas (CUTX)', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 42, name: 'GECU (Greater El Paso CU)', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 43, name: 'VyStar Credit Union', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 44, name: 'MIDFLORIDA Credit Union', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 45, name: 'Space Coast Credit Union', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 46, name: 'Community First Credit Union of Florida', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 47, name: 'Tropical Financial Credit Union', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 48, name: 'Bethpage Federal Credit Union', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 49, name: 'State Excellence FCU (Teachers Federal CU)', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'], notes: 'Name may map to Teachers Federal Credit Union — verify before client referral.' },
  { id: 50, name: 'Hudson Valley Credit Union', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 51, name: 'MCU (Municipal Credit Union)', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 52, name: 'Lake Michigan Credit Union (LMCU)', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 53, name: 'MSU Federal Credit Union', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild', 'student'] },
  { id: 54, name: 'DFCU Financial', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 55, name: 'Genisys Credit Union', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 56, name: 'Delta Community Credit Union', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 57, name: "Georgia's Own Credit Union", type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'], notes: 'Dump name was truncated to "Georgia"; expanded to likely institution — verify.' },
  { id: 58, name: 'Associated Credit Union', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 59, name: 'LGE Community Credit Union', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 60, name: 'Service Credit Union', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 61, name: 'Truliant Federal Credit Union', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 62, name: 'Chartway Federal Credit Union', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 63, name: 'Langley Federal Credit Union', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 64, name: 'Navy Army Community Credit Union', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
  { id: 65, name: 'Idaho Central Credit Union (ICCU)', type: 'FINANCIAL_INSTITUTION', underwriter: 'Direct / Soft-Pull Partner', minCreditScore: 620, source: 'lenders-database.ts', category: 'Soft-Pull / Direct Bank / Underwriter', goals: ['auto', 'mortgage', 'rebuild'] },
];

export function getLenderById(id: number): LenderRecord | undefined {
  return LENDER_CATALOG.find((l) => l.id === id);
}

export function lendersByType(type: LenderProductType): LenderRecord[] {
  return LENDER_CATALOG.filter((l) => l.type === type);
}

export function catalogStats() {
  const byType: Record<string, number> = {};
  for (const l of LENDER_CATALOG) {
    byType[l.type] = (byType[l.type] || 0) + 1;
  }
  return {
    ...LENDER_CATALOG_META,
    curatedCount: LENDER_CATALOG.length,
    byType,
    rejectedFromDump: LENDER_CATALOG_META.dumpClaimedTotal - LENDER_CATALOG.length,
  };
}
