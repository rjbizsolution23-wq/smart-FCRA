/**
 * FCRA SUPREME VIOLATION DETECTOR
 * Demo Page - Full Integration Example
 * 
 * This page demonstrates how to use all components together
 * with sample data and real-world scenarios
 */

import React, { useState, useEffect } from 'react';
import { CreditReportDashboard } from '../components/CreditReportDashboard';

// Sample credit report data
const sampleCreditReportData = {
  personalInfo: {
    name: 'John Doe',
    ssn: '***-**-1234',
    dob: '1985-03-15',
    address: '123 Main St, Anytown, CA 90210',
    phone: '(555) 123-4567',
    email: 'john.doe@email.com'
  },

  accounts: [
    {
      accountId: 'ACC001',
      accountName: 'Capital One Credit Card',
      accountNumber: '****1234',
      accountType: 'CREDIT_CARD',
      creditorName: 'CAPITAL ONE',
      currentBalance: 2500,
      creditLimit: 5000,
      monthlyPayment: 75,
      accountStatus: '11',
      dateOpened: '2018-05-10',
      dateOfFirstDelinquency: null,
      dateLastActive: '2024-01-15',
      bureau: 'EXPERIAN',
      violations: [],
      paymentHistory: [
        { month: '2024-01', status: 'CURRENT', code: '0' },
        { month: '2023-12', status: 'CURRENT', code: '0' },
        { month: '2023-11', status: 'CURRENT', code: '0' },
        { month: '2023-10', status: 'CURRENT', code: '0' },
        { month: '2023-09', status: 'CURRENT', code: '0' },
      ],
      remarks: null
    },
    {
      accountId: 'ACC001_EQ',
      accountName: 'Capital One Credit Card',
      accountNumber: '****1234',
      accountType: 'CREDIT_CARD',
      creditorName: 'CAPITAL ONE',
      currentBalance: 2600, // DISCREPANCY - different balance
      creditLimit: 5000,
      monthlyPayment: 75,
      accountStatus: '11',
      dateOpened: '2018-05-10',
      dateOfFirstDelinquency: null,
      dateLastActive: '2024-01-15',
      bureau: 'EQUIFAX',
      violations: ['VIOL_001'],
      paymentHistory: [
        { month: '2024-01', status: 'CURRENT', code: '0' },
        { month: '2023-12', status: 'CURRENT', code: '0' },
        { month: '2023-11', status: 'CURRENT', code: '0' },
      ],
      remarks: null
    },
    {
      accountId: 'ACC002',
      accountName: 'XYZ Medical Collection',
      accountNumber: 'MED789',
      accountType: 'COLLECTION',
      creditorName: 'XYZ COLLECTIONS',
      currentBalance: 450,
      accountStatus: '97',
      dateOpened: '2016-03-20',
      dateOfFirstDelinquency: '2015-11-01',
      dateLastActive: '2016-03-20',
      bureau: 'EXPERIAN',
      violations: ['VIOL_002', 'VIOL_003'],
      paymentHistory: [],
      remarks: 'Medical debt - Obsolete per 15 U.S.C. § 1681c(a)(4)'
    },
    {
      accountId: 'ACC002_EQ',
      accountName: 'XYZ Medical Collection',
      accountNumber: 'MED789',
      accountType: 'COLLECTION',
      creditorName: 'XYZ COLLECTIONS',
      currentBalance: 450,
      accountStatus: '97',
      dateOpened: '2016-03-20',
      dateOfFirstDelinquency: '2015-11-01',
      dateLastActive: '2016-03-20',
      bureau: 'EQUIFAX',
      violations: ['VIOL_002', 'VIOL_003'],
      paymentHistory: [],
      remarks: 'Medical debt - Obsolete per 15 U.S.C. § 1681c(a)(4)'
    },
    {
      accountId: 'ACC003',
      accountName: 'Chase Auto Loan',
      accountNumber: '****5678',
      accountType: 'AUTO_LOAN',
      creditorName: 'CHASE AUTO FINANCE',
      currentBalance: 15000,
      highBalance: 25000,
      monthlyPayment: 450,
      accountStatus: '13',
      dateOpened: '2020-01-15',
      dateOfFirstDelinquency: null,
      dateLastActive: '2024-01-01',
      bureau: 'TRANSUNION',
      violations: [],
      paymentHistory: [
        { month: '2024-01', status: 'CURRENT', code: '0' },
        { month: '2023-12', status: 'CURRENT', code: '0' },
        { month: '2023-11', status: 'CURRENT', code: '0' },
      ],
      remarks: null
    },
    {
      accountId: 'ACC004',
      accountName: 'ABC Collections',
      accountNumber: 'COL456',
      accountType: 'COLLECTION',
      creditorName: 'ABC COLLECTION AGENCY',
      currentBalance: 1200,
      accountStatus: '71',
      dateOpened: '2017-06-10',
      dateOfFirstDelinquency: '2016-12-15',
      dateLastActive: '2017-06-10',
      bureau: 'EXPERIAN',
      violations: ['VIOL_004', 'VIOL_005'],
      paymentHistory: [],
      remarks: 'Re-aged account - DOFD manipulation detected'
    }
  ],

  violations: [
    {
      id: 'VIOL_001',
      violationType: 'FCRA § 607(b) - Inaccurate Balance Reporting',
      statute: '15 U.S.C. § 1681e(b)',
      severity: 'MEDIUM',
      accountId: 'ACC001_EQ',
      accountName: 'Capital One Credit Card',
      bureau: 'EQUIFAX',
      description: 'Balance reported as $2,600 on Equifax but $2,500 on Experian. Furnisher failed to maintain reasonable procedures for maximum possible accuracy.',
      evidence: 'Experian: $2,500; Equifax: $2,600; Discrepancy: $100',
      legalStandard: 'CRAs must follow reasonable procedures to assure maximum possible accuracy. Courts have held that material discrepancies between bureaus indicate failure to follow reasonable procedures.',
      caselaw: 'Cushman v. Trans Union Corp., 115 F.3d 220 (3d Cir. 1997)',
      damages: {
        statutory: { min: 100, max: 1000 },
        punitive: { estimated: 2500 },
        attorneys: true
      },
      recommendedAction: 'Dispute with Equifax; Demand investigation per § 611',
      willfulness: 'POSSIBLE',
      classActionViable: false
    },
    {
      id: 'VIOL_002',
      violationType: 'FCRA § 605(a)(4) - Obsolete Information',
      statute: '15 U.S.C. § 1681c(a)(4)',
      severity: 'CRITICAL',
      accountId: 'ACC002',
      accountName: 'XYZ Medical Collection',
      bureau: 'EXPERIAN',
      description: 'Medical collection account reporting beyond 7-year obsolescence period. DOFD: 2015-11-01, Fall-off date: 2022-11-01. Currently 2024-01-20 - account is 14 months past legal reporting period.',
      evidence: 'DOFD: 2015-11-01 → DOFD + 7 years = 2022-11-01 → Still reporting as of 2024-01-20',
      legalStandard: 'No CRA may make any consumer report containing adverse information that antedates the report by more than 7 years (15 U.S.C. § 1681c(a)(4)). Clock starts 180 days after delinquency.',
      caselaw: 'Nelson v. Chase Manhattan Mortgage Corp., 282 F.3d 1057 (9th Cir. 2002) - Reporting outdated information IS inaccurate reporting',
      damages: {
        statutory: { min: 100, max: 1000 },
        actual: { estimated: 5000, basis: 'Credit denial, emotional distress' },
        punitive: { estimated: 10000 },
        attorneys: true
      },
      recommendedAction: 'Immediate deletion demand; File CFPB complaint; Consider litigation',
      willfulness: 'LIKELY',
      classActionViable: true
    },
    {
      id: 'VIOL_003',
      violationType: 'FDCPA § 807(2)(A) - False Representation of Debt',
      statute: '15 U.S.C. § 1692e(2)(A)',
      severity: 'HIGH',
      accountId: 'ACC002',
      accountName: 'XYZ Medical Collection',
      bureau: 'EXPERIAN',
      description: 'Collector continues reporting debt past statute of limitations. Medical debt from 2015 is time-barred under California 4-year SOL (Cal. Civ. Proc. Code § 337). Reporting creates false impression of collectability.',
      evidence: 'DOFD: 2015-11-01; CA SOL expires: 2019-11-01; Still reporting: 2024-01-20',
      legalStandard: 'Debt collector may not use false representation of character, amount, or legal status of debt. Reporting time-barred debt falsely represents legal status.',
      caselaw: 'McMahon v. LVNV Funding, LLC, 744 F.3d 1010 (7th Cir. 2014) - Time-barred debt reporting can violate FDCPA',
      damages: {
        statutory: { max: 1000 },
        actual: { estimated: 3000 },
        attorneys: true
      },
      recommendedAction: 'Send FDCPA validation letter; Demand deletion; File complaint',
      willfulness: 'LIKELY',
      classActionViable: true
    },
    {
      id: 'VIOL_004',
      violationType: 'FCRA § 623(a)(2) - Re-Aging / DOFD Manipulation',
      statute: '15 U.S.C. § 1681s-2(a)(2)',
      severity: 'CRITICAL',
      accountId: 'ACC004',
      accountName: 'ABC Collections',
      bureau: 'EXPERIAN',
      description: 'Furnisher manipulated Date of First Delinquency. Original DOFD: 2016-12-15, but furnisher reset to 2017-06-10 (collection placement date). This illegally extends reporting period by 6 months.',
      evidence: 'True DOFD: 2016-12-15; Reported DOFD: 2017-06-10; Difference: 6 months extension',
      legalStandard: 'Furnisher must report correct DOFD - the date account first became 180 days delinquent. DOFD cannot be reset when sold/transferred.',
      caselaw: 'Johnson v. MBNA America Bank, 357 F.3d 426 (4th Cir. 2004) - DOFD manipulation is willful FCRA violation',
      damages: {
        statutory: { min: 100, max: 1000 },
        punitive: { estimated: 15000, basis: 'Willful manipulation to extend reporting' },
        attorneys: true
      },
      recommendedAction: 'Demand correction of DOFD; File CFPB complaint; Strong litigation case',
      willfulness: 'PROVEN',
      classActionViable: true
    },
    {
      id: 'VIOL_005',
      violationType: 'FCRA § 611(a) - Failure to Reinvestigate',
      statute: '15 U.S.C. § 1681i(a)',
      severity: 'HIGH',
      accountId: 'ACC004',
      accountName: 'ABC Collections',
      bureau: 'EXPERIAN',
      description: 'Consumer disputed re-aging on 2023-11-15. CRA failed to complete investigation within 30 days. No response received as of 2023-12-20 (35 days later).',
      evidence: 'Dispute submitted: 2023-11-15; 30-day deadline: 2023-12-15; Current date: 2023-12-20',
      legalStandard: 'CRA must conduct reasonable reinvestigation and respond within 30 days of dispute (§ 611(a)(1)).',
      caselaw: 'Cushman v. Trans Union Corp., 115 F.3d 220 (3d Cir. 1997) - CRA must do more than parrot verification',
      damages: {
        statutory: { min: 100, max: 1000 },
        actual: { estimated: 2000, basis: 'Ongoing inaccuracy, stress' },
        punitive: { estimated: 5000 },
        attorneys: true
      },
      recommendedAction: 'Follow-up demand letter; File CFPB complaint; Consider litigation',
      willfulness: 'POSSIBLE',
      classActionViable: false
    }
  ],

  damages: {
    total: 55500,
    fcra: {
      statutory: 5000,
      actual: 10000,
      punitive: 32500,
      attorneys: true
    },
    fdcpa: {
      statutory: 1000,
      actual: 3000,
      attorneys: true
    },
    ecoa: {
      statutory: 0,
      punitive: 0
    },
    stateLaw: {
      total: 4000,
      details: 'California CCRAA - 2 violations × $2,000'
    }
  },

  litigationScore: {
    score: 82,
    rating: 'STRONG',
    factors: {
      violationCount: 10,
      willfulness: 8,
      documentation: 9,
      damages: 8,
      defendantResources: 7
    },
    recommendation: 'PURSUE LITIGATION - Strong case with multiple willful violations, well-documented evidence, and significant damages potential.',
    estimatedRecovery: { min: 15000, max: 60000, likely: 35000 },
    classActionViable: true,
    classActionScore: 34,
    classActionFactors: {
      commonality: 9,
      typicality: 8,
      adequacy: 8,
      numerosity: 9
    }
  },

  timelineEvents: [
    {
      id: 'TL001',
      date: '2024-01-20',
      type: 'VIOLATION',
      severity: 'CRITICAL',
      title: 'Obsolete Information Detected',
      description: 'XYZ Medical Collection found reporting 14 months past 7-year limit',
      accountName: 'XYZ Medical Collection',
      bureau: 'EXPERIAN'
    },
    {
      id: 'TL002',
      date: '2024-01-15',
      type: 'PAYMENT',
      severity: 'POSITIVE',
      title: 'On-Time Payment Recorded',
      description: 'Capital One Credit Card - January payment posted',
      accountName: 'Capital One Credit Card',
      bureau: 'ALL',
      amount: 75
    },
    {
      id: 'TL003',
      date: '2023-12-20',
      type: 'DISPUTE',
      severity: 'NEGATIVE',
      title: 'Dispute Investigation Overdue',
      description: 'Experian failed to respond within 30-day deadline',
      accountName: 'ABC Collections',
      bureau: 'EXPERIAN'
    },
    {
      id: 'TL004',
      date: '2023-11-15',
      type: 'DISPUTE',
      severity: 'NEUTRAL',
      title: 'Dispute Filed',
      description: 'Disputed re-aging violation on ABC Collections account',
      accountName: 'ABC Collections',
      bureau: 'EXPERIAN'
    },
    {
      id: 'TL005',
      date: '2020-01-15',
      type: 'ACCOUNT_OPENED',
      severity: 'POSITIVE',
      title: 'Auto Loan Opened',
      description: 'Chase Auto Finance - $25,000 loan approved',
      accountName: 'Chase Auto Loan',
      bureau: 'TRANSUNION',
      amount: 25000
    },
    {
      id: 'TL006',
      date: '2018-05-10',
      type: 'ACCOUNT_OPENED',
      severity: 'POSITIVE',
      title: 'Credit Card Opened',
      description: 'Capital One - $5,000 credit limit',
      accountName: 'Capital One Credit Card',
      bureau: 'ALL',
      amount: 5000
    },
    {
      id: 'TL007',
      date: '2017-06-10',
      type: 'CHARGE_OFF',
      severity: 'CRITICAL',
      title: 'Collection Account Opened',
      description: 'ABC Collections - Account placed for collection',
      accountName: 'ABC Collections',
      bureau: 'EXPERIAN',
      amount: 1200
    },
    {
      id: 'TL008',
      date: '2016-12-15',
      type: 'DELINQUENCY',
      severity: 'CRITICAL',
      title: 'First Delinquency',
      description: 'ABC Collections - Original delinquency date',
      accountName: 'ABC Collections',
      bureau: 'EXPERIAN'
    },
    {
      id: 'TL009',
      date: '2016-03-20',
      type: 'CHARGE_OFF',
      severity: 'CRITICAL',
      title: 'Medical Collection Opened',
      description: 'XYZ Medical Collection - $450 medical debt',
      accountName: 'XYZ Medical Collection',
      bureau: 'EXPERIAN',
      amount: 450
    },
    {
      id: 'TL010',
      date: '2015-11-01',
      type: 'DELINQUENCY',
      severity: 'CRITICAL',
      title: 'Medical Debt Delinquency',
      description: 'XYZ Medical - First delinquency (DOFD)',
      accountName: 'XYZ Medical Collection',
      bureau: 'ALL'
    }
  ],

  inquiries: [
    {
      id: 'INQ001',
      date: '2023-12-10',
      creditor: 'CHASE AUTO FINANCE',
      type: 'HARD',
      bureau: 'EXPERIAN'
    },
    {
      id: 'INQ002',
      date: '2023-11-20',
      creditor: 'CAPITAL ONE',
      type: 'SOFT',
      bureau: 'EQUIFAX'
    }
  ],

  publicRecords: []
};

export const DemoPage: React.FC = () => {
  const [language, setLanguage] = useState<'en' | 'es'>('en');
  const [reportData, setReportData] = useState(sampleCreditReportData);

  const handleLanguageChange = (lang: 'en' | 'es') => {
    setLanguage(lang);
  };

  const handleGenerateDocument = (docType: string) => {
    console.log('Generate document:', docType);
    // In production, this would call the backend API
    alert(`Document generation requested: ${docType}`);
  };

  const handleExportData = (format: 'JSON' | 'CSV' | 'PDF') => {
    console.log('Export data:', format);
    
    if (format === 'JSON') {
      const dataStr = JSON.stringify(reportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'credit-report-analysis.json';
      a.click();
    } else if (format === 'CSV') {
      // Export violations as CSV
      const csv = [
        ['ID', 'Type', 'Statute', 'Severity', 'Account', 'Bureau', 'Description'],
        ...reportData.violations.map(v => [
          v.id,
          v.violationType,
          v.statute,
          v.severity,
          v.accountName,
          v.bureau,
          v.description
        ])
      ].map(row => row.join(',')).join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'violations-report.csv';
      a.click();
    } else {
      alert('PDF export would be implemented with backend integration');
    }
  };

  return (
    <div className="min-h-screen">
      <CreditReportDashboard
        reportData={reportData}
        language={language}
        onLanguageChange={handleLanguageChange}
        onGenerateDocument={handleGenerateDocument}
        onExportData={handleExportData}
      />
    </div>
  );
};

export default DemoPage;
