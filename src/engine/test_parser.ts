import * as fs from 'fs';
import * as path from 'path';
import { parseCreditReportText } from './parser';

const SCRATCH_DIR = "C:\\Users\\ricky\\.gemini\\antigravity\\brain\\51c69c51-b321-4a7a-8cd0-63ccbf864a69\\scratch";

function testFile(fileName: string) {
  const filePath = path.join(SCRATCH_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  const rawText = fs.readFileSync(filePath, 'utf-8');
  console.log(`\n========================================`);
  console.log(`Testing: ${fileName}`);
  console.log(`========================================`);
  
  const startTime = Date.now();
  const parsed = parseCreditReportText(rawText);
  const duration = Date.now() - startTime;
  
  console.log(`Parsed in ${duration}ms`);
  console.log(`Bureau: ${parsed.bureau}`);
  console.log(`Report Date: ${parsed.reportDate}`);
  console.log(`Personal Info:`);
  console.log(`  Names: ${parsed.personalInfo.names.join(', ')}`);
  console.log(`  SSNs: ${parsed.personalInfo.ssns.join(', ')}`);
  console.log(`  DOBs: ${parsed.personalInfo.dobs.join(', ')}`);
  console.log(`Accounts: ${parsed.accounts.length}`);
  console.log(`Collections: ${parsed.collections.length}`);
  console.log(`Inquiries: ${parsed.inquiries.length}`);
  console.log(`Public Records: ${parsed.publicRecords.length}`);
  
  if (parsed.accounts.length > 0) {
    console.log(`\nSample Accounts (First 3):`);
    parsed.accounts.slice(0, 3).forEach((acct, idx) => {
      console.log(`  ${idx + 1}. Creditor: ${acct.creditorName}`);
      console.log(`     Account No: ${acct.accountNumber}`);
      console.log(`     Status: ${acct.accountStatus}`);
      console.log(`     Balance: $${acct.currentBalance}`);
      console.log(`     Opened: ${acct.dateOpened}`);
      console.log(`     Closed: ${acct.dateClosed || 'N/A'}`);
      console.log(`     History: ${acct.paymentHistory}`);
    });
  }
  
  if (parsed.collections.length > 0) {
    console.log(`\nSample Collections (First 3):`);
    parsed.collections.slice(0, 3).forEach((col, idx) => {
      console.log(`  ${idx + 1}. Creditor: ${col.creditorName}`);
      console.log(`     Account No: ${col.accountNumber}`);
      console.log(`     Original Creditor: ${col.originalCreditor || 'N/A'}`);
      console.log(`     Balance: $${col.currentBalance}`);
      console.log(`     Status: ${col.accountStatus}`);
    });
  }
}

const files = [
  'equifax_SALISHA_MCDOWELL_JUNE_22_EQ_ACR.txt',
  'experian_SALISHA_MCDOWELL_EX_ACR_JUNE_22.txt',
  'transunion_SALISHA_MCDOWELL_JUNE_22_TU_ACR.txt'
];

files.forEach(testFile);
