import * as fs from 'fs';
import * as path from 'path';
import { parseCreditReportText } from '../src/engine/parser';

const filePath = path.join('scratch', 'eq_report.txt');
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const rawText = fs.readFileSync(filePath, 'utf-8');
console.log(`Loaded ${rawText.length} characters.`);

const parsed = parseCreditReportText(rawText);
console.log(`Bureau: ${parsed.bureau}`);
console.log(`Report Date: ${parsed.reportDate}`);
console.log(`Personal Info:`);
console.log(`  Names: ${JSON.stringify(parsed.personalInfo.names)}`);
console.log(`  SSNs: ${JSON.stringify(parsed.personalInfo.ssns)}`);
console.log(`  DOBs: ${JSON.stringify(parsed.personalInfo.dobs)}`);
console.log(`  Addresses: ${JSON.stringify(parsed.personalInfo.addresses)}`);
console.log(`Accounts: ${parsed.accounts.length}`);
console.log(`Collections: ${parsed.collections.length}`);
console.log(`Inquiries: ${parsed.inquiries.length}`);
console.log(`Public Records: ${parsed.publicRecords.length}`);

if (parsed.accounts.length > 0) {
  console.log(`\nRegular Accounts:`);
  parsed.accounts.forEach((a, idx) => {
    console.log(`  ${idx + 1}. ${a.creditorName} (${a.accountNumber}) - Type: ${a.accountType}, Status: ${a.accountStatus}, Balance: $${a.currentBalance}, Opened: ${a.dateOpened}`);
  });
}

if (parsed.collections.length > 0) {
  console.log(`\nCollections:`);
  parsed.collections.forEach((a, idx) => {
    console.log(`  ${idx + 1}. ${a.creditorName} (${a.accountNumber}) - Type: ${a.accountType}, Status: ${a.accountStatus}, Balance: $${a.currentBalance}, Opened: ${a.dateOpened}`);
  });
}
