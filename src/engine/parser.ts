// Credit Report Text Parser
// Extracts structured data from raw credit report text with high precision
// Branded for Rick Jefferson | RJ Business Solutions

import type { CreditReportData, ParsedAccount, ParsedInquiry, ParsedPublicRecord } from './violations';

export function parseCreditReportText(rawText: string): CreditReportData {
  const text = rawText.replace(/\r\n/g, '\n');
  
  // Detect bureau based on first 1500 chars (eliminates disclosure cross-contamination)
  let bureau = 'Unknown';
  const headerCheck = text.substring(0, Math.min(1500, text.length)).toLowerCase();
  
  if (headerCheck.includes('experian') || headerCheck.includes('usa.experian.com')) {
    bureau = 'Experian';
  } else if (headerCheck.includes('transunion') || headerCheck.includes('transunion.com') || headerCheck.includes('personal credit report for:')) {
    bureau = 'TransUnion';
  } else if (headerCheck.includes('equifax') || headerCheck.includes('equifax.com') || headerCheck.includes('confirmation #')) {
    bureau = 'Equifax';
  } else {
    // Global fallback
    if (/equifax/i.test(text)) bureau = 'Equifax';
    else if (/experian/i.test(text)) bureau = 'Experian';
    else if (/transunion|trans\s*union/i.test(text)) bureau = 'TransUnion';
  }

  // Extract report date
  let reportDate = '';
  if (bureau === 'TransUnion') {
    const tuDateMatch = text.match(/Credit Report Date\r?\n(\d{2}\/\d{2}\/\d{4})/i) || text.match(/Date Created:\r?\n(\d{2}\/\d{2}\/\d{4})/i);
    if (tuDateMatch) reportDate = tuDateMatch[1].trim();
  } else if (bureau === 'Equifax') {
    const eqDateMatch = text.match(/Date:\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{2}\/\d{2}\/\d{4})/i);
    if (eqDateMatch) reportDate = eqDateMatch[1].trim();
  } else if (bureau === 'Experian') {
    const exDateMatch = text.match(/Date Generated\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{2}\/\d{2}\/\d{4})/i);
    if (exDateMatch) reportDate = exDateMatch[1].trim();
  }

  if (!reportDate) {
    const fallbackMatch = text.match(/report\s*(?:date|generated|as of)[:\s]*([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
    reportDate = fallbackMatch ? fallbackMatch[1].trim() : new Date().toLocaleDateString();
  }

  // Extract personal info using high-precision bureau-specific extractors
  const personalInfo = extractPersonalInfo(text, bureau);

  // Extract accounts, inquiries, and public records using specialized bureau sub-parsers
  let accounts: ParsedAccount[] = [];
  let inquiries: ParsedInquiry[] = [];
  let publicRecords: ParsedPublicRecord[] = [];

  if (bureau === 'Experian') {
    accounts = parseExperianAccounts(text);
    inquiries = parseExperianInquiries(text);
    publicRecords = parseExperianPublicRecords(text);
  } else if (bureau === 'Equifax') {
    accounts = parseEquifaxAccounts(text);
    inquiries = parseEquifaxInquiries(text);
    publicRecords = parseEquifaxPublicRecords(text);
  } else if (bureau === 'TransUnion') {
    accounts = parseTransUnionAccounts(text);
    inquiries = parseTransUnionInquiries(text);
    publicRecords = parseTransUnionPublicRecords(text);
  } else {
    // Fallback parser for non-standard formats
    accounts = parseFallbackAccounts(text);
    inquiries = parseFallbackInquiries(text);
    publicRecords = parseFallbackPublicRecords(text);
  }

  // Separate collections and regular accounts
  const collections = accounts.filter(a => a.isCollection);
  const regularAccounts = accounts.filter(a => !a.isCollection);

  return {
    bureau,
    reportDate,
    personalInfo,
    accounts: regularAccounts,
    inquiries,
    publicRecords,
    collections,
  };
}

// ═══════════════════════════════════════════════════════════════
// PERSONAL INFO EXTRACTION (Bureau Specific)
// ═══════════════════════════════════════════════════════════════
export function isValidClientName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 50) return false;
  
  // Must be composed mostly of alphabetic characters, spaces, hyphens, apostrophes
  if (!/^[A-Za-z\s\-']+$/.test(trimmed)) return false;

  // Split into words and count
  const words = trimmed.split(/\s+/);
  if (words.length > 5) return false;

  // Check against generic boilerplate patterns or common corporate/disclosure terms
  const blacklist = /including|credit|bureau|specialty|agencies|accessing|cfpb|report|disclosure|consumer|confidential|rights|act|disclaimer|dispute|investigation|page|date|confirmation|number|summary|prepared|official|address|personal|information|welcome|access|online|annual|service|identity|protection|system|detector|smart|credit/i;
  if (blacklist.test(trimmed)) return false;

  return true;
}

function extractPersonalInfo(text: string, bureau: string): CreditReportData['personalInfo'] {
  const names: string[] = [];
  const addresses: string[] = [];
  const employers: string[] = [];
  const ssns: string[] = [];
  const dobs: string[] = [];

  const lines = text.split('\n');

  // Universal High-Priority Name Extraction (e.g. Prepared for: VACARIA KELLER DABNER)
  const preparedMatch = text.match(/Prepared\s+for:\s*([A-Za-z][A-Za-z\t \-']{2,40})/i) || 
                        text.match(/Prepared\s+For\s*:\s*([A-Za-z][A-Za-z\t \-']{2,40})/i);
  if (preparedMatch) {
    const nameCandidate = preparedMatch[1].trim();
    if (isValidClientName(nameCandidate)) {
      names.push(nameCandidate);
    }
  }

  if (bureau === 'Experian') {
    // Find name block
    let nameIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === 'Names' && lines[i - 1]?.trim() === 'At a\nGlance' || lines[i].trim() === 'Names' && i < 50) {
        nameIdx = i;
        break;
      }
    }
    if (nameIdx !== -1) {
      for (let offset = 1; offset <= 15; offset++) {
        const line = lines[nameIdx + offset]?.trim();
        if (!line || /Addresses|Phone Numbers|Employers|--- PAGE|At a/i.test(line)) break;
        if (line.startsWith('Name ID')) {
          // Accumulate the lines above this ID as a full name
          const accumulated: string[] = [];
          for (let back = 1; back <= 3; back++) {
            const prevLine = lines[nameIdx + offset - back]?.trim();
            if (!prevLine || prevLine.startsWith('Name ID') || /Names|Addresses|--- PAGE/i.test(prevLine)) break;
            accumulated.push(prevLine);
          }
          accumulated.reverse();
          const fullName = accumulated.join(' ').trim();
          if (fullName && !names.includes(fullName)) {
            names.push(fullName);
          }
        }
      }
    }

    // Find address block
    let addrIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === 'Addresses' && i < 100) {
        addrIdx = i;
        break;
      }
    }
    if (addrIdx !== -1) {
      let currentAddrLines: string[] = [];
      for (let offset = 1; offset <= 30; offset++) {
        const line = lines[addrIdx + offset]?.trim();
        if (!line || /Phone Numbers|Employers|--- PAGE|At a/i.test(line)) break;
        if (line.startsWith('Address ID')) {
          const joinedAddr = currentAddrLines.join(', ').replace(/,\s*,/g, ',').trim();
          if (joinedAddr && !addresses.includes(joinedAddr)) {
            addresses.push(joinedAddr);
          }
          currentAddrLines = [];
        } else {
          currentAddrLines.push(line);
        }
      }
    }

    // Find employer block
    let empIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === 'Employers' && i < 120) {
        empIdx = i;
        break;
      }
    }
    if (empIdx !== -1) {
      for (let offset = 1; offset <= 10; offset++) {
        const line = lines[empIdx + offset]?.trim();
        if (!line || /--- PAGE|Accounts|Account Info/i.test(line)) break;
        if (line && !employers.includes(line)) {
          employers.push(line);
        }
      }
    }

    // Year of Birth / DOB
    const yobMatch = text.match(/Year of Birth\r?\n(\d{4})/i);
    if (yobMatch) {
      dobs.push(`01/01/${yobMatch[1]}`);
    }

  } else if (bureau === 'Equifax') {
    // Personal Info starts after "Personal Information"
    let pIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === 'Personal Information' && i < 100) {
        pIdx = i;
        break;
      }
    }
    if (pIdx !== -1) {
      // Look for name line (usually 1-3 lines down)
      let nameFound = false;
      for (let offset = 1; offset <= 6; offset++) {
        const line = lines[pIdx + offset]?.trim();
        if (!line) continue;
        if (!nameFound && isValidClientName(line)) {
          names.push(line);
          nameFound = true;
          // Address might follow on the very next non-empty line
          const nextLine = lines[pIdx + offset + 2]?.trim() || lines[pIdx + offset + 1]?.trim();
          if (nextLine && nextLine.includes('|')) {
            const parts = nextLine.split('|');
            addresses.push(parts[0].trim());
          }
        }
      }
    }

    // Robust Address Extraction for Equifax (when on the same line)
    const eqAddrMatch = text.match(/(?:[A-Z][A-Z\s\-']{2,40})\s+([0-9]+\s+[A-Z0-9\s#\.]+?,\s*[A-Z\s]+?,\s*[A-Z]{2}\s+\d{5})\s+Social Security Number/i);
    if (eqAddrMatch) {
      const addr = eqAddrMatch[1].trim();
      if (!addresses.includes(addr)) {
        addresses.push(addr);
      }
    }

    // SSN
    const ssnMatch = text.match(/Social Security Number:\s*([^\s\n|]+)/i) || text.match(/Social Security Number\s+([^\s\n|]+)/i);
    if (ssnMatch) ssns.push(ssnMatch[1].trim());

    // DOB
    const dobMatch = text.match(/Date of Birth:\s*([^\s\n|]+)/i) || text.match(/Date of Birth\s+([^\s\n|]+)/i);
    if (dobMatch) dobs.push(dobMatch[1].trim());

  } else if (bureau === 'TransUnion') {
    const nameMatch = text.match(/Personal Credit Report for:\r?\n([^\r\n]+)/i);
    if (nameMatch) names.push(nameMatch[1].trim());

    // SSN
    const ssnMatch = text.match(/Social Security Number\r?\n([^\s\n|]+)/i);
    if (ssnMatch) ssns.push(ssnMatch[1].trim());

    // DOB
    const dobMatch = text.match(/Date of Birth\r?\n([^\s\n|]+)/i);
    if (dobMatch) dobs.push(dobMatch[1].trim());

    // Address
    let addrIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === 'Current Address' && i < 100) {
        addrIdx = i;
        break;
      }
    }
    if (addrIdx !== -1) {
      const line = lines[addrIdx + 1]?.trim();
      if (line && !/Date Reported/i.test(line)) {
        addresses.push(line);
      }
    }

    // Employers
    let empIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === 'Employers' && i < 100) {
        empIdx = i;
        break;
      }
    }
    if (empIdx !== -1) {
      for (let offset = 2; offset <= 5; offset++) {
        const line = lines[empIdx + offset]?.trim();
        if (!line || /Accounts|--- PAGE/i.test(line)) break;
        if (line !== 'Employer' && !employers.includes(line)) {
          employers.push(line);
        }
      }
    }
  }

  // Backup Universal US Address Pattern Extraction
  if (addresses.length === 0) {
    const addrRegex = /([0-9]+\s+[A-Z0-9\s#\.]+?,\s*[A-Z\s]+?,\s*[A-Z]{2}\s+\d{5})/gi;
    let match;
    while ((match = addrRegex.exec(text)) !== null) {
      const addr = match[1].trim();
      if (!/PO Box|P\.O\.\s*Box|Atlanta,\s*GA\s*303|Sartell,\s*MN|Knoxville,\s*TN|Charlotte,\s*NC|Gilbert,\s*AZ|Las\s*Vegas,\s*NV|Philadelphia,\s*PA|Woodland\s*Hills|Allen,\s*TX/i.test(addr)) {
        if (!addresses.includes(addr)) {
          addresses.push(addr);
        }
      }
    }
  }

  // Fallbacks if arrays are empty to prevent incomplete parses
  if (names.length === 0) {
    const sMatch = text.match(/(?:consumer\s+name|client\s+name|^name)[:\s]+([A-Za-z][A-Za-z\t \-']{2,35})/im);
    if (sMatch) {
      const nameCandidate = sMatch[1].trim();
      if (isValidClientName(nameCandidate)) {
        names.push(nameCandidate);
      }
    }
  }
  if (ssns.length === 0) {
    const sMatch = text.match(/(?:ssn|social)[:\s]*(?:xxx-xx-|[\d*]{3}-[\d*]{2}-)(\d{4})/i);
    if (sMatch) ssns.push('XXX-XX-' + sMatch[1]);
  }
  if (dobs.length === 0) {
    const sMatch = text.match(/(?:birth|dob|born)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
    if (sMatch) dobs.push(sMatch[1]);
  }

  return { names, addresses, employers, ssns, dobs };
}

// ═══════════════════════════════════════════════════════════════
// EXPERIAN SUB-PARSER
// ═══════════════════════════════════════════════════════════════
function parseExperianAccounts(text: string): ParsedAccount[] {
  const accounts: ParsedAccount[] = [];
  const blocks = text.split(/Account Info\r?\n/);

  for (let idx = 1; idx < blocks.length; idx++) {
    const block = blocks[idx];
    if (block.length < 50) continue;

    const acct: Partial<ParsedAccount> = {};

    // Creditor Name
    const nameMatch = block.match(/Account Name\s+([^\r\n]+)/);
    acct.creditorName = nameMatch ? nameMatch[1].trim() : 'Unknown';

    // Account Number
    const numMatch = block.match(/Account Number\s+([^\r\n]+)/);
    acct.accountNumber = numMatch ? numMatch[1].trim() : '';

    // Account Type
    const typeMatch = block.match(/Account Type\s+([^\r\n]+)/);
    acct.accountType = typeMatch ? typeMatch[1].trim() : '';

    // Date Opened
    const openedMatch = block.match(/Date Opened\s+(\d{2}\/\d{2}\/\d{4})/);
    acct.dateOpened = openedMatch ? openedMatch[1].trim() : '';

    // Date Closed
    const closedMatch = block.match(/Date Closed\s+(\d{2}\/\d{2}\/\d{4})/);
    if (closedMatch) acct.dateClosed = closedMatch[1].trim();

    // Status (multi-line non-greedy check)
    const statusMatch = block.match(/Status\s+([\s\S]+?)(?=\r?\n(?:Status Updated|Balance|Recent Payment|Monthly Payment))/i);
    acct.accountStatus = statusMatch ? statusMatch[1].replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim() : '';

    // Balance
    const balanceMatch = block.match(/Balance\s+([^\r\n]+)/);
    if (balanceMatch) {
      const bStr = balanceMatch[1].trim();
      acct.currentBalance = bStr === '-' ? 0 : parseFloat(bStr.replace(/[$,]/g, '')) || 0;
    }

    // Original Balance
    const origMatch = block.match(/Original Balance\s+([^\r\n]+)/);
    if (origMatch) {
      const oStr = origMatch[1].trim();
      acct.originalAmount = oStr === '-' ? 0 : parseFloat(oStr.replace(/[$,]/g, '')) || 0;
      acct.highBalance = acct.originalAmount;
    }

    // Highest Balance
    const highMatch = block.match(/Highest Balance\s+([^\r\n]+)/);
    if (highMatch) {
      const hStr = highMatch[1].trim();
      if (hStr !== '-') {
        acct.highBalance = parseFloat(hStr.replace(/[$,]/g, '')) || acct.originalAmount || 0;
      }
    }

    // Original Creditor
    const origCredMatch = block.match(/Original Creditor\s+([^\r\n]+)/);
    if (origCredMatch) {
      acct.originalCreditor = origCredMatch[1].trim();
    }

    // Monthly Payment
    const paymentMatch = block.match(/Monthly Payment\s+([^\r\n]+)/);
    if (paymentMatch) {
      const pStr = paymentMatch[1].trim();
      acct.monthlyPayment = pStr === '-' ? 0 : parseFloat(pStr.replace(/[$,]/g, '')) || 0;
    }

    // Payment History Pattern
    const payHistoryMatch = block.match(/Payment History[\s\S]+?([0-9CXBDELGHJK\-]{6,})/);
    if (payHistoryMatch) {
      acct.paymentHistory = payHistoryMatch[1];
    }

    // Collection indicator
    acct.isCollection = /collection/i.test(acct.accountType || '') ||
                        /collection/i.test(acct.accountStatus || '') ||
                        /charged?\s*off/i.test(acct.accountStatus || '') ||
                        /credence resource/i.test(acct.creditorName || '') ||
                        /portfolio recovery/i.test(acct.creditorName || '');

    accounts.push(finalizeAccount(acct));
  }
  return accounts;
}

function parseExperianInquiries(text: string): ParsedInquiry[] {
  const inquiries: ParsedInquiry[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().toLowerCase() === 'inquired on') {
      const dateLine = lines[i + 1]?.trim();
      const dateMatch = dateLine?.match(/^(\d{2}\/\d{2}\/\d{4})/);
      if (dateMatch) {
        const inquiryDate = dateMatch[1];
        // Collect creditor name by backing up
        const nameLines: string[] = [];
        for (let offset = 1; offset <= 4; offset++) {
          const prevIdx = i - offset;
          if (prevIdx >= 0) {
            const cand = lines[prevIdx].trim();
            if (!cand) continue;
            if (/until|scheduled|record|inquiry is|inquired on|--- PAGE/i.test(cand)) {
              break;
            }
            nameLines.push(cand);
          }
        }
        nameLines.reverse();
        const creditorName = nameLines.join(' ').replace(/^700\s+/i, '').trim();
        inquiries.push({
          creditorName: creditorName || 'Unknown',
          inquiryDate,
          inquiryType: 'Hard'
        });
      }
    }
  }
  return inquiries;
}

function parseExperianPublicRecords(text: string): ParsedPublicRecord[] {
  const records: ParsedPublicRecord[] = [];
  // Experian Bankruptcy format
  const bkBlock = text.match(/Bankruptcy[\s\S]+?Filing Date\s+(\d{2}\/\d{2}\/\d{4})/i);
  if (bkBlock) {
    const chapterMatch = text.match(/Bankruptcy[\s\S]+?Chapter\s+(\d+)/i);
    const statusMatch = text.match(/Bankruptcy[\s\S]+?Status\s+([^\r\n]+)/i);
    records.push({
      recordType: 'Bankruptcy',
      filingDate: bkBlock[1],
      chapter: chapterMatch ? chapterMatch[1] : '7',
      status: statusMatch ? statusMatch[1].trim() : 'Filed'
    });
  }
  return records;
}

// ═══════════════════════════════════════════════════════════════
// EQUIFAX SUB-PARSER
// ═══════════════════════════════════════════════════════════════
function parseEquifaxAccounts(text: string): ParsedAccount[] {
  const accounts: ParsedAccount[] = [];
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('Date Reported:')) {
      // Find creditor name by backing up
      let creditorName = 'Unknown';
      for (let offset = 1; offset <= 5; offset++) {
        const prevIdx = i - offset;
        if (prevIdx >= 0) {
          const cand = lines[prevIdx].trim();
          if (cand && !/page|prepared for|date:|confirmation #|credit accounts|Summary|Your Credit Report/i.test(cand)) {
            creditorName = cand;
            break;
          }
        }
      }

      creditorName = creditorName.replace(/\s*-\s*(?:closed|open)\s*$/i, '').trim();

      const blockText = lines.slice(i, Math.min(lines.length, i + 15)).join('\n');
      const acct: Partial<ParsedAccount> = { creditorName };

      // Account Number
      const numMatch = blockText.match(/Account Number:\s*([^\s\n|]+)/i);
      acct.accountNumber = numMatch ? numMatch[1].trim() : '';

      // Account Type
      const typeMatch = blockText.match(/Loan\/Account Type:\s*([^\r\n|]+)/i);
      acct.accountType = typeMatch ? typeMatch[1].trim() : '';

      // Status
      const statusMatch = blockText.match(/Status:\s*([^|\r\n]+)/i);
      acct.accountStatus = statusMatch ? statusMatch[1].trim() : '';

      // Balance
      const balanceMatch = line.match(/Balance:\s*([^\s\n|]+)/i);
      if (balanceMatch) {
        acct.currentBalance = parseFloat(balanceMatch[1].replace(/[$,]/g, '')) || 0;
      }

      // Date Opened
      const openedMatch = blockText.match(/Date Opened:\s*(\d{2}\/\d{2}\/\d{4})/i);
      acct.dateOpened = openedMatch ? openedMatch[1].trim() : '';

      // Date Closed
      const closedMatch = blockText.match(/Date Closed:\s*(\d{2}\/\d{2}\/\d{4})/i);
      if (closedMatch) acct.dateClosed = closedMatch[1].trim();

      // DOFD
      const dofdMatch = blockText.match(/Date of 1st Delinquency:\s*(\d{2}\/\d{2}\/\d{4})/i);
      if (dofdMatch) acct.dofd = dofdMatch[1].trim();

      // High Credit / Original Amount
      const origMatch = blockText.match(/High Credit:\s*([^\s\n|]+)/i);
      if (origMatch) {
        acct.originalAmount = parseFloat(origMatch[1].replace(/[$,]/g, '')) || 0;
        acct.highBalance = acct.originalAmount;
      }

      // Monthly Payment
      const paymentMatch = blockText.match(/Scheduled Payment Amount:\s*([^\s\n|]+)/i);
      if (paymentMatch) {
        acct.monthlyPayment = parseFloat(paymentMatch[1].replace(/[$,]/g, '')) || 0;
      }

      // Collection indicator
      acct.isCollection = /collection/i.test(acct.accountType || '') ||
                          /collection/i.test(acct.accountStatus || '') ||
                          /charged?\s*off/i.test(acct.accountStatus || '') ||
                          /credence resource/i.test(acct.creditorName || '');

      accounts.push(finalizeAccount(acct));
    }
  }

  return accounts;
}

function parseEquifaxInquiries(text: string): ParsedInquiry[] {
  const inquiries: ParsedInquiry[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const typeMatch = line.match(/^(Hard|Soft)\s+([\d/,\s]+)/i);
    if (typeMatch) {
      const inquiryType = typeMatch[1];
      const datesRaw = typeMatch[2];
      const dates = datesRaw.match(/\d{2}\/\d{2}\/\d{4}/g) || [];
      
      // Get creditor name by backing up and skipping Phone and ZIP lines
      let creditorName = 'Unknown';
      for (let offset = 1; offset <= 5; offset++) {
        const prevIdx = i - offset;
        if (prevIdx >= 0) {
          const cand = lines[prevIdx].trim();
          if (cand && !/phone:|page|prepared for|date:|confirmation #/i.test(cand) && !/^\d{5}/.test(cand) && !cand.endsWith('FL') && !cand.endsWith('TX') && !cand.endsWith('NY') && !cand.endsWith('CA') && !cand.endsWith('GA') && !cand.endsWith('OH')) {
            creditorName = cand;
            break;
          }
        }
      }

      for (const d of dates) {
        inquiries.push({
          creditorName,
          inquiryDate: d,
          inquiryType: inquiryType.charAt(0).toUpperCase() + inquiryType.slice(1).toLowerCase()
        });
      }
    }
  }
  return inquiries;
}

function parseEquifaxPublicRecords(text: string): ParsedPublicRecord[] {
  const records: ParsedPublicRecord[] = [];
  const bkMatch = text.match(/Bankruptcy[\s\S]+?Filing Date:\s*(\d{2}\/\d{2}\/\d{4})/i);
  if (bkMatch) {
    const chapterMatch = text.match(/Bankruptcy[\s\S]+?Chapter\s*(\d+)/i);
    const statusMatch = text.match(/Bankruptcy[\s\S]+?Status:\s*([^\n|]+)/i);
    records.push({
      recordType: 'Bankruptcy',
      filingDate: bkMatch[1],
      chapter: chapterMatch ? chapterMatch[1] : '7',
      status: statusMatch ? statusMatch[1].trim() : 'Filed'
    });
  }
  return records;
}

// ═══════════════════════════════════════════════════════════════
// TRANSUNION SUB-PARSER
// ═══════════════════════════════════════════════════════════════
function parseTransUnionAccounts(text: string): ParsedAccount[] {
  const accounts: ParsedAccount[] = [];
  const blocks = text.split(/Account Name\r?\n/);

  for (let idx = 1; idx < blocks.length; idx++) {
    const block = blocks[idx];
    const lines = block.split('\n');
    const firstLine = lines[0].trim();
    if (!firstLine) continue;

    // Separate creditor name from account number
    let creditorName = 'Unknown';
    let accountNumber = '';

    const numMatch = firstLine.match(/([A-Z0-9*]{4,}\**)$/);
    if (numMatch) {
      accountNumber = numMatch[1];
      creditorName = firstLine.substring(0, numMatch.index).trim();
    } else {
      creditorName = firstLine;
    }

    const acct: Partial<ParsedAccount> = { creditorName, accountNumber };

    // Date Opened
    const openedMatch = block.match(/Date Opened\s+(\d{2}\/\d{2}\/\d{4})/);
    acct.dateOpened = openedMatch ? openedMatch[1].trim() : '';

    // Date Closed
    const closedMatch = block.match(/Date Closed\s+(\d{2}\/\d{2}\/\d{4})/);
    if (closedMatch) acct.dateClosed = closedMatch[1].trim();

    // Account Type
    const typeMatch = block.match(/Account Type\s+([^\r\n]+)/);
    const loanMatch = block.match(/Loan Type\s+([^\r\n]+)/);
    acct.accountType = typeMatch ? typeMatch[1].trim() : (loanMatch ? loanMatch[1].trim() : '');

    // Balance
    const balanceMatch = block.match(/Balance\s+(\$[\d,]+|- - -)/);
    if (balanceMatch) {
      const bStr = balanceMatch[1].trim();
      acct.currentBalance = bStr === '- - -' ? 0 : parseFloat(bStr.replace(/[$,]/g, '')) || 0;
    }

    // Pay Status
    const statusMatch = block.match(/Pay Status\s+>([^<]+)</);
    acct.accountStatus = statusMatch ? statusMatch[1].trim() : '';

    // Remarks
    const remarksMatch = block.match(/Remarks\s+>([^<]+)</);
    if (remarksMatch) {
      acct.comments = remarksMatch[1].trim();
    }

    // Original Creditor
    const origCredMatch = block.match(/Original Creditor\s+([^\r\n]+)/);
    if (origCredMatch) {
      acct.originalCreditor = origCredMatch[1].trim();
    }

    // High Balance (Hist.) / Original Amount
    const highHistMatch = block.match(/High Balance\s*\(Hist\.\)\s+High balance of\s+\$?([\d,]+)/i);
    if (highHistMatch) {
      acct.originalAmount = parseFloat(highHistMatch[1].replace(/,/g, '')) || 0;
      acct.highBalance = acct.originalAmount;
    }

    // Collection indicator
    acct.isCollection = /collection/i.test(acct.accountType || '') ||
                        /collection/i.test(acct.accountStatus || '') ||
                        /charged?\s*off/i.test(acct.accountStatus || '') ||
                        /credence resource/i.test(acct.creditorName || '') ||
                        /portfolio recovery/i.test(acct.creditorName || '') ||
                        /collection/i.test(acct.comments || '');

    accounts.push(finalizeAccount(acct));
  }

  return accounts;
}

function parseTransUnionInquiries(text: string): ParsedInquiry[] {
  const inquiries: ParsedInquiry[] = [];
  const lines = text.split('\n');
  
  // Find Name list under "Regular Inquiries"
  let nameListIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === 'Name' && lines[i - 1]?.trim() === 'Regular Inquiries') {
      nameListIdx = i;
      break;
    }
  }

  const creditorNames: string[] = [];
  if (nameListIdx !== -1) {
    for (let offset = 1; offset <= 30; offset++) {
      const cand = lines[nameListIdx + offset]?.trim();
      if (!cand || /Date Closed|Remarks|Payment History|--- PAGE/i.test(cand)) {
        break;
      }
      creditorNames.push(cand);
    }
  }

  // Find Requested On lines and pair with Names sequentially
  let seq = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === 'Requested On') {
      const dateLine = lines[i + 1]?.trim();
      const dateMatch = dateLine?.match(/^(\d{2}\/\d{2}\/\d{4})/);
      if (dateMatch) {
        const inquiryDate = dateMatch[1];
        const creditorName = creditorNames[seq] || 'Unknown';
        seq++;
        inquiries.push({
          creditorName,
          inquiryDate,
          inquiryType: 'Hard'
        });
      }
    }
  }

  return inquiries;
}

function parseTransUnionPublicRecords(text: string): ParsedPublicRecord[] {
  const records: ParsedPublicRecord[] = [];
  const bkMatch = text.match(/Bankruptcy[\s\S]+?Date Filed\s+(\d{2}\/\d{2}\/\d{4})/i);
  if (bkMatch) {
    const chapterMatch = text.match(/Bankruptcy[\s\S]+?Chapter\s+(\d+)/i);
    const statusMatch = text.match(/Bankruptcy[\s\S]+?Status\s+>([^<]+)</i);
    records.push({
      recordType: 'Bankruptcy',
      filingDate: bkMatch[1],
      chapter: chapterMatch ? chapterMatch[1] : '7',
      status: statusMatch ? statusMatch[1].trim() : 'Filed'
    });
  }
  return records;
}

// ═══════════════════════════════════════════════════════════════
// FALLBACK / GENERIC PARSER
// ═══════════════════════════════════════════════════════════════
function parseFallbackAccounts(text: string): ParsedAccount[] {
  const accounts: ParsedAccount[] = [];
  const accountBlocks = text.split(/(?=(?:account|creditor|subscriber)\s*(?:name|#)?[:\s]+[A-Z])/i);
  
  for (const block of accountBlocks) {
    if (block.length < 50) continue;
    const acct = parseAccountBlock(block);
    if (acct && acct.creditorName) {
      accounts.push(acct);
    }
  }
  return accounts;
}

function parseAccountBlock(block: string): ParsedAccount | null {
  const acct: Partial<ParsedAccount> = {};
  const nameMatch = block.match(/(?:account|creditor|subscriber)\s*(?:name)?[:\s]+([^\n]+)/i);
  if (nameMatch) acct.creditorName = nameMatch[1].trim();
  else return null;

  const numMatch = block.match(/(?:account|acct)\s*(?:#|number|no)[:\s]*([^\n]+)/i);
  if (numMatch) acct.accountNumber = numMatch[1].trim();

  const lines = block.split('\n');
  for (const line of lines) {
    parseFieldLine(line.trim(), acct);
  }
  return finalizeAccount(acct);
}

function parseFieldLine(line: string, acct: Partial<ParsedAccount>) {
  const l = line.toLowerCase();

  if (/account\s*type/i.test(line)) {
    const val = line.split(/[:\s]+/).slice(-1)[0];
    acct.accountType = val;
  }
  if (/(?:account\s*)?status/i.test(line) && !/payment/i.test(line)) {
    const val = line.replace(/.*(?:status)[:\s]*/i, '').trim();
    if (val) acct.accountStatus = val;
  }
  if (/payment\s*status/i.test(line)) {
    const val = line.replace(/.*(?:payment\s*status)[:\s]*/i, '').trim();
    if (val) acct.paymentStatus = val;
  }

  const dateFields: Array<[RegExp, keyof ParsedAccount]> = [
    [/date\s*opened/i, 'dateOpened'],
    [/date\s*closed/i, 'dateClosed'],
    [/(?:date\s*of\s*)?first\s*delinquen/i, 'dofd'],
    [/(?:date\s*of\s*)?last\s*activit/i, 'dola'],
    [/(?:date\s*)?charged?\s*off/i, 'dateChargedOff'],
  ];
  for (const [pattern, field] of dateFields) {
    if (pattern.test(line)) {
      const dateMatch = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
      if (dateMatch) (acct as any)[field] = dateMatch[1];
    }
  }

  const moneyFields: Array<[RegExp, keyof ParsedAccount]> = [
    [/(?:current\s*)?balance/i, 'currentBalance'],
    [/(?:original|loan)\s*(?:amount|balance)/i, 'originalAmount'],
    [/(?:high|highest)\s*(?:balance|credit)/i, 'highBalance'],
    [/credit\s*limit/i, 'creditLimit'],
    [/(?:monthly|scheduled)\s*payment/i, 'monthlyPayment'],
  ];
  for (const [pattern, field] of moneyFields) {
    if (pattern.test(line)) {
      const amtMatch = line.match(/\$?\s*([\d,]+(?:\.\d{2})?)/);
      if (amtMatch) (acct as any)[field] = parseFloat(amtMatch[1].replace(/,/g, ''));
    }
  }

  if (/payment\s*(?:history|pattern|profile)/i.test(line)) {
    const histMatch = line.match(/([0-9CXBDELGHJK\-]+)/);
    if (histMatch && histMatch[1].length >= 6) {
      acct.paymentHistory = histMatch[1];
    }
  }
  if (/original\s*creditor/i.test(line)) {
    const val = line.replace(/.*original\s*creditor[:\s]*/i, '').trim();
    if (val) acct.originalCreditor = val;
  }
  if (/collection/i.test(l) || /charged?\s*off/i.test(l) || /profit\s*(?:and|&)\s*loss/i.test(l)) {
    acct.isCollection = true;
  }
}

function parseFallbackInquiries(text: string): ParsedInquiry[] {
  const inquiries: ParsedInquiry[] = [];
  const inquirySection = text.match(/(?:inquir(?:y|ies)|credit\s*checks?)(.*?)(?=(?:public\s*record|account|end\s*of\s*report|\z))/is);
  if (!inquirySection) return inquiries;
  
  const section = inquirySection[1];
  const lines = section.split('\n');
  
  for (const line of lines) {
    const match = line.match(/([A-Z][A-Za-z\s&.']+?)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
    if (match) {
      inquiries.push({
        creditorName: match[1].trim(),
        inquiryDate: match[2],
        inquiryType: /hard|regular/i.test(line) ? 'Hard' : 'Soft',
        purpose: '',
      });
    }
  }
  return inquiries;
}

function parseFallbackPublicRecords(text: string): ParsedPublicRecord[] {
  const records: ParsedPublicRecord[] = [];
  const prSection = text.match(/public\s*record(.*?)(?=(?:inquir|account|end\s*of|\z))/is);
  if (!prSection) return records;
  
  const section = prSection[1];
  
  const bkMatch = section.match(/(?:chapter\s*(\d+)\s*)?bankruptc(?:y|ies)\s*.*?(?:filed|entered|date)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
  if (bkMatch) {
    records.push({
      recordType: 'Bankruptcy',
      filingDate: bkMatch[2],
      chapter: bkMatch[1] || '7',
      status: /discharg/i.test(section) ? 'Discharged' : /dismiss/i.test(section) ? 'Dismissed' : 'Filed',
    });
  }
  return records;
}

function finalizeAccount(partial: Partial<ParsedAccount>): ParsedAccount {
  return {
    creditorName: partial.creditorName || 'Unknown',
    accountNumber: partial.accountNumber || '',
    accountType: partial.accountType || '',
    accountStatus: partial.accountStatus || '',
    dateOpened: partial.dateOpened || '',
    dateClosed: partial.dateClosed,
    dofd: partial.dofd,
    dola: partial.dola,
    dateChargedOff: partial.dateChargedOff,
    currentBalance: partial.currentBalance || 0,
    originalAmount: partial.originalAmount || 0,
    highBalance: partial.highBalance || 0,
    creditLimit: partial.creditLimit || 0,
    monthlyPayment: partial.monthlyPayment || 0,
    paymentStatus: partial.paymentStatus || '',
    paymentHistory: partial.paymentHistory || '',
    isCollection: partial.isCollection || false,
    collectorName: partial.collectorName,
    originalCreditor: partial.originalCreditor,
    disputeFlag: partial.disputeFlag,
    comments: partial.comments,
  };
}
