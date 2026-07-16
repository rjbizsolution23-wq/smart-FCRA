/**
 * 🧠 NEURONEDGE LABS™ — ENHANCED VIOLATION TYPE DEFINITIONS v4.0
 * 
 * Company:        RJ Business Solutions
 * Owner:          Rick Jefferson
 * Version:        4.0.0 — Truth-Engine Fusion
 * Last Updated:   2026-07-16
 */

export interface Violation {
  // Identifiers
  id: string;
  orgId?: string;
  reportId: string;
  clientId: string;
  
  // Classification
  category: 'FCRA' | 'FDCPA' | 'ECOA' | 'TILA' | 'State Law - California' | 'State Law - Florida' | 'State Law - Texas' | 'State Law - New York' | 'State Law - Illinois' | 'Metro 2 Technical' | 'Bankruptcy' | 'SCRA';
  subcategory: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  
  // Legal Foundation
  statute: string;                    // e.g., "15 U.S.C. § 1681c(a)(4)"
  statuteText: string;                // Full text of the statute
  legalStandard: string;              // What the law requires
  
  // Evidence & Explanation
  evidence: string;                   // Exact discrepancy from credit report
  explanation: string;                // Plain English explanation for client
  caseLaw?: string;                   // Supporting court decisions
  
  // Account Details
  accountName?: string;
  accountNumber?: string;
  originalCreditor?: string;
  collectionAgency?: string;
  dofd?: string;                      // Date of First Delinquency
  falloffDate?: string;               // DOFD + 7 years
  daysOverdue?: number;               // Days past fall-off date
  
  // Balance Details
  currentBalance?: string;
  originalBalance?: string;
  chargeOffAmount?: string;
  scheduledPayment?: string;
  actualPayment?: string;
  
  // Payment History
  paymentHistory?: string;            // Metro 2 string (e.g., "CCCC1239")
  accountStatus?: string;             // Metro 2 status code
  
  // Defendant Information
  defendantType: 'CRA' | 'Furnisher' | 'Debt Collector' | 'Creditor';
  defendantName: string;
  defendantAddress?: string;
  
  // Damages Calculation
  statutoryDamagesMin: number;        // Minimum statutory damages
  statutoryDamagesMax: number;        // Maximum statutory damages
  actualDamagesEst: number;           // Estimated actual damages
  punitiveDamagesEst: number;         // Estimated punitive damages
  attorneyFeesEst: number;            // Estimated attorney's fees
  totalDamagesMin: number;            // Total minimum recovery
  totalDamagesMax: number;            // Total maximum recovery
  
  // State-Specific
  stateStatute?: string;              // State law citation
  stateDamagesMin?: number;           // State statutory damages min
  stateDamagesMax?: number;           // State statutory damages max
  
  // Workflow Status
  status: 'detected' | 'disputed' | 'validated' | 'resolved' | 'litigation';
  disputeSentDate?: string;
  disputeResponseDate?: string;
  disputeResult?: 'deleted' | 'updated' | 'verified' | 'no-response';
  notes?: string;
  
  // Bureau-Specific Dispute Text
  bureauDisputeText?: {
    equifax?: string;
    experian?: string;
    transunion?: string;
  };
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

export interface ViolationAnalysisResult {
  violations: Violation[];
  totalViolations: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  
  // Damages Summary
  totalStatutoryMin: number;
  totalStatutoryMax: number;
  totalActual: number;
  totalPunitive: number;
  totalAttorneyFees: number;
  grandTotalMin: number;
  grandTotalMax: number;
  
  // Litigation Metrics
  litigationScore: number;            // 0-100
  litigationGrade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F';
  recommendedAction: 'LITIGATE' | 'DEMAND_SETTLEMENT' | 'DISPUTE_FIRST' | 'MONITOR';
  
  // Class Action Viability
  classActionScore?: number;          // 0-40 (Rule 23 four-factor)
  classActionViability?: 'HIGH' | 'MODERATE' | 'LOW';
  
  // Defendants
  defendants: {
    name: string;
    type: 'CRA' | 'Furnisher' | 'Debt Collector';
    violationCount: number;
    damagesMin: number;
    damagesMax: number;
  }[];
  
  // By Statute
  byStatute: {
    [statute: string]: {
      count: number;
      damagesMin: number;
      damagesMax: number;
    };
  };
}

export interface ParsedAccount {
  creditorName: string;
  accountNumber: string;
  accountType?: string;
  accountStatus?: string;
  currentBalance?: string;
  originalBalance?: string;
  creditLimit?: string;
  highBalance?: string;
  monthlyPayment?: string;
  scheduledPayment?: string;
  actualPayment?: string;
  dateOpened?: string;
  dateClosed?: string;
  dateReported?: string;
  dofd?: string;                      // Date of First Delinquency
  dola?: string;                      // Date of Last Activity
  paymentHistory?: string;            // Metro 2 payment string
  remarks?: string;
  ecoaCode?: string;                  // 1, 2, 3, 5, 7, T, X, W, Z
  industryCode?: string;
  original30?: number;
  original60?: number;
  original90?: number;
  original120?: number;
  pastDueAmount?: string;
  chargeOffAmount?: string;
  isCollection?: boolean;
}

export interface ParsedInquiry {
  inquirerName: string;
  inquiryDate: string;
  inquiryType?: 'hard' | 'soft' | 'promotional';
  permissiblePurpose?: string;
}

export interface ParsedPublicRecord {
  recordType: 'bankruptcy' | 'judgment' | 'tax-lien' | 'foreclosure';
  filingDate?: string;
  dischargeDate?: string;
  courtName?: string;
  caseNumber?: string;
  amount?: string;
  status?: string;
  chapter?: string;                   // Chapter 7, 11, 13
  liabilityAmount?: string;
}

export interface CreditReportData {
  bureau: string;
  reportDate: string;
  personalInfo: {
    names: string[];
    addresses: string[];
    employers: string[];
    ssns: string[];
    dobs: string[];
  };
  scores?: {
    equifax?: number;
    experian?: number;
    transunion?: number;
  };
  accounts: ParsedAccount[];
  inquiries: ParsedInquiry[];
  publicRecords: ParsedPublicRecord[];
  collections: ParsedAccount[];
}

export interface ClientContext {
  state: string;                      // Two-letter state code
  hasActiveMilitary?: boolean;
  hasBankruptcy?: boolean;
  bankruptcyChapter?: string;
  bankruptcyDischargeDate?: string;
  identityTheftVictim?: boolean;
  disputeHistory?: {
    date: string;
    bureau: string;
    result: string;
  }[];
}
