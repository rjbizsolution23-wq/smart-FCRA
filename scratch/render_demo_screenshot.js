import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BUREAU_ADDRESSES = {
  'equifax': 'Equifax Information Services LLC\nP.O. Box 740256\nAtlanta, GA 30374',
  'experian': 'Experian Information Solutions, Inc.\nP.O. Box 4500\nAllen, TX 75013',
  'transunion': 'TransUnion LLC\nP.O. Box 2000\nChester, PA 19016',
};

function generate1681iLetter(data) {
  const rawBureau = (data.bureau || 'equifax').toLowerCase();
  const address = BUREAU_ADDRESSES[rawBureau] || BUREAU_ADDRESSES.equifax;

  let bureauName = 'Equifax';
  if (rawBureau === 'experian') bureauName = 'Experian';
  else if (rawBureau === 'transunion') bureauName = 'TransUnion';

  const clientNameParts = (data.clientName || '').trim().split(/\s+/);
  let firstName = '';
  let middleName = '';
  let lastName = '';
  if (clientNameParts.length === 1) {
    firstName = clientNameParts[0];
  } else if (clientNameParts.length === 2) {
    firstName = clientNameParts[0];
    lastName = clientNameParts[1];
  } else if (clientNameParts.length >= 3) {
    firstName = clientNameParts[0];
    middleName = clientNameParts.slice(1, -1).join(' ');
    lastName = clientNameParts[clientNameParts.length - 1];
  }

  const fullName = `${firstName}${middleName ? ' ' + middleName : ''} ${lastName}`;

  let activeViolations = data.violations.filter(v => {
    const vBureau = (v.bureau || '').toLowerCase();
    return vBureau === rawBureau;
  });
  if (activeViolations.length === 0) {
    activeViolations = data.violations;
  }

  const bulletList = activeViolations.map(v => {
    const creditor = v.creditorName || v.defendantName || v.defendant_name || v.accountName || v.account_name || '[CREDITOR NAME]';
    const acctNum = v.accountNumber || v.account_number || '[ACCOUNT NUMBER]';
    const text = v.evidence || '[DISPUTE VERBIAGE]';
    return `• ${creditor} (Account #: ${acctNum}): ${text}`;
  }).join('\n');

  const confNum = data.reportId || '6062537823';
  const fileNum = data.reportId || '358261728';

  return `${data.today}

${bureauName}
‎
${address}


RE: Confirmation # ${confNum}     Date:${data.today}

I have reviewed my ${bureauName} credit report which I have obtained from your credit reporting agency, and the${bureauName} File Number is ${fileNum}. I have found out that in my credit report there is some information which is incomplete, inaccurate, or inconsistent.


Under 15 U.S. Code § 1681i, I am entitled to request a reinvestigation of any accounts on my credit report that contain inaccurate information. Please refer to 15 U.S. Code § 1681i(a)(1)(A) and 15 U.S. Code § 1681e(b) for further clarification.

I wish to opt out of all email communications. Please note that you may have an incorrect or outdated email address on file, which could result in my personal information being shared with unauthorized parties. Moving forward, I request that all correspondence be sent exclusively to my mailing address, which is provided above.


I am disputing the information below because I believe it is untrue, incomplete, inaccurate, or inconsistent, and I want you to investigate any information related to my personal information that is inaccurate, incomplete, not authenticated, or no longer valid. This will help ensure you're only maintaining accurate information about me, which reduces the risk of identity theft or a mixed file. I appreciate your efforts in retaining the following correct details on my record, listed below. The information listed is the only accurate personal data you should have on file. Please delete any other information that does not match.

My name is ${fullName}.My address is ${data.clientAddress}, ${data.clientCity}, ${data.clientState} ${data.clientZip}.My last four SSN: ${data.clientSSNLast4 || ''}.My date of birth is ${data.clientDOB || ''}.

The following account(s) on my credit report from your agency, ${bureauName}, are inaccurate:
${bulletList}


I am requesting that you and the furnishers conduct a thorough investigation of the accounts I am disputing. Please forward a copy of this letter to each furnisher and make sure both you and they comply with the law by performing a proper investigation, not a generic response or a rubber stamp. I take the accuracy of my credit reports seriously, and it is essential that every piece of information is correct, complete, and fully verified. My report currently contains contradictory, incomplete, and incorrect information that cannot be verified, and whether that came from the furnisher or from your own reporting, it is now your responsibility to fix it.

I expect every account listed to be 100% accurate, complete, and verifiable. If it isn't, it must be deleted immediately, not corrected halfway. As you investigate, if you come across any other inaccurate, incomplete, or unverifiable information beyond what I've listed, I expect that to be corrected or deleted as well.

Once your investigation is complete, please send me the results along with a full copy of my file, meaning everything you have on me. That includes all inquiries, both hard and soft pulls, along with their stated purpose, and copies of certifications from anyone who has accessed my report. Under FCRA § 1681g, you're required to disclose all sources of information and identify anyone who accessed my file. Under FCRA § 1681i, I'm also requesting a description of the procedures used to investigate each disputed account, including the business name, address, and phone number of any furnisher you contacted.

Please don't ignore this letter or skip a real investigation. Under Section 1681i(a) of the Fair Credit Reporting Act, you're required to investigate disputed information and make sure only 100% accurate, verifiable, and complete information stays on my report. Anything that doesn't meet that standard must be promptly deleted.

I am sending this letter personally, not through a credit repair company, so please don't reject it based on the postmark location or anything else.

I am requesting a complete copy of my file after this reinvestigation is finished. As defined under 15 U.S.C. § 1681a(g), the term "file" means all information on me that you retain, regardless of how it's stored, so a partial disclosure would not satisfy this request and would not be lawful.

If you end up verifying or deeming any of the disputed information above as accurate and complete, I am requesting a description of the procedure used to determine that accuracy or completeness, including the business name, address, and phone number of any furnisher contacted, within 15 days of making that determination, as required under 15 U.S.C. § 1681i(a)(6)(B)(iii) and § 1681i(a)(7).

I have enclosed proof of my identity current mailing address, and My social security card. This is not required under the FCRA, but I'm including it to help move the investigation along without delay.

Sincerely,
${fullName}
‎
${data.clientAddress}, ${data.clientCity}, ${data.clientState} ${data.clientZip}`;
}

async function run() {
  const mockData = {
    clientName: 'Gary A. Branch',
    clientAddress: '124 Main Street',
    clientCity: 'Albuquerque',
    clientState: 'NM',
    clientZip: '87102',
    clientSSNLast4: '4321',
    clientDOB: '05/12/1978',
    today: 'July 6, 2026',
    bureau: 'equifax',
    reportId: 'EQ-8273941',
    violations: [
      {
        bureau: 'equifax',
        creditorName: 'CHASE CARD SERVICES',
        accountNumber: '4412XXXXXXXX1234',
        evidence: 'I am disputing this account because Equifax is reporting incomplete and inaccurate account information. Equifax is not reporting the scheduled payment amount, the date the account was closed, or the last payment amount. These fields are required for complete and accurate reporting of the account history, payment activity, and account status. This reporting does not comply with Metro 2 reporting standards for complete and accurate credit reporting.'
      }
    ]
  };

  const letterText = generate1681iLetter(mockData);

  // Convert plain text to styled HTML
  const styledHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>1681i Round 1 Dispute Letter</title>
      <style>
        body {
          margin: 0;
          padding: 40px;
          background-color: #f3f4f6;
          display: flex;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        .page {
          width: 800px;
          background-color: #ffffff;
          padding: 60px 80px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          border: 1px solid #e5e7eb;
          box-sizing: border-box;
          position: relative;
        }
        .header-tag {
          font-family: sans-serif;
          font-size: 11px;
          color: #2563eb;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          border-bottom: 2px solid #3b82f6;
          padding-bottom: 8px;
          margin-bottom: 40px;
          font-weight: bold;
          display: flex;
          justify-content: space-between;
        }
        .letter-content {
          font-family: 'Courier New', Courier, monospace;
          font-size: 14px;
          line-height: 1.5;
          color: #111827;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .signature-line {
          margin-top: 40px;
          border-top: 1px dashed #9ca3af;
          width: 250px;
          padding-top: 8px;
          font-family: sans-serif;
          font-size: 12px;
          color: #4b5563;
        }
        .stamp {
          position: absolute;
          top: 120px;
          right: 80px;
          border: 3px double #dc2626;
          color: #dc2626;
          font-family: sans-serif;
          font-size: 14px;
          font-weight: bold;
          padding: 8px 16px;
          text-transform: uppercase;
          transform: rotate(12deg);
          border-radius: 4px;
          opacity: 0.8;
          user-select: none;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header-tag">
          <span>RJ Business Solutions Premium Dispute Engine</span>
          <span>Build ID: NEL-20260706-948271</span>
        </div>
        <div class="stamp">Certified Mail</div>
        <div class="letter-content">${letterText}</div>
        <div class="signature-line">
          Gary A. Branch (Digital Verification Token)
        </div>
      </div>
    </body>
    </html>
  `;

  // Start browser
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1000, height: 1350 });
  await page.setContent(styledHtml);

  // Wait for fonts to render
  await page.waitForTimeout(1000);

  // Ensure absolute directory path
  const targetDir = 'C:\\Users\\ricky\\.gemini\\antigravity\\brain\\51c69c51-b321-4a7a-8cd0-63ccbf864a69';
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const outputPath = path.join(targetDir, 'media_render_1681i_letter.png');
  await page.screenshot({ path: outputPath, fullPage: true });

  console.log(`Screenshot saved successfully to ${outputPath}`);
  await browser.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
