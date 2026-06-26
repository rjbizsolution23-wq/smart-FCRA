const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\ricky\\Downloads\\Nvidia12\\founder docs';
const destFile = path.join(__dirname, '..', 'src', 'engine', 'founder-templates.ts');

const templatesMetadata = [
  {
    id: 'founder-agreement',
    name: 'Founder Equity and Vesting Agreement',
    filename: '06_FOUNDER_AGREEMENT.md',
    description: 'Establish equity allocation, vesting schedules, IP assignments, and dispute resolution for founders.',
    fields: [
      { name: 'companyName', label: 'Company Name', placeholder: 'e.g. RJ Business Solutions, Inc.', defaultVal: 'RJ Business Solutions, Inc.' },
      { name: 'effectiveDate', label: 'Effective Date', placeholder: 'e.g. June 25, 2026', defaultVal: 'June 25, 2026' },
      { name: 'founder1Name', label: 'Founder 1 Name', placeholder: 'e.g. Rick Jefferson', defaultVal: 'Rick Jefferson' },
      { name: 'founder1Address', label: 'Founder 1 Address', placeholder: 'e.g. 1342 NM 333, Tijeras, NM 87059', defaultVal: '1342 NM 333, Tijeras, New Mexico 87059' },
      { name: 'founder2Name', label: 'Founder 2 Name', placeholder: 'e.g. Anita Menon', defaultVal: 'Anita Menon' },
      { name: 'founder2Address', label: 'Founder 2 Address', placeholder: 'e.g. 4506 San Mateo Blvd NE, Albuquerque, NM 87109', defaultVal: '4506 San Mateo Blvd NE, Albuquerque, New Mexico 87109' },
      { name: 'founder3Name', label: 'Founder 3 Name', placeholder: 'e.g. Vikram Iyer', defaultVal: 'Vikram Iyer' },
      { name: 'founder3Address', label: 'Founder 3 Address', placeholder: 'e.g. 1209 Lomas Blvd NW, Albuquerque, NM 87102', defaultVal: '1209 Lomas Blvd NW, Albuquerque, New Mexico 87102' },
      { name: 'state', label: 'State of Incorporation', placeholder: 'e.g. New Mexico', defaultVal: 'New Mexico' }
    ]
  },
  {
    id: 'board-resolution',
    name: 'Initial Board Resolution',
    filename: null, // Custom
    description: 'Formally authorize corporate banking, share issuances, and early stage corporate compliance.',
    fields: [
      { name: 'companyName', label: 'Company Name', placeholder: 'e.g. RJ Business Solutions, Inc.', defaultVal: 'RJ Business Solutions, Inc.' },
      { name: 'effectiveDate', label: 'Effective Date', placeholder: 'e.g. June 25, 2026', defaultVal: 'June 25, 2026' },
      { name: 'founder1Name', label: 'President Name', placeholder: 'e.g. Rick Jefferson', defaultVal: 'Rick Jefferson' },
      { name: 'resolutionSubject', label: 'Resolution Subject', placeholder: 'e.g. Banking & Stock Issuances', defaultVal: 'Opening Corporate Bank Account and Approving Founder Share Issuances' },
      { name: 'state', label: 'State', placeholder: 'e.g. New Mexico', defaultVal: 'New Mexico' }
    ]
  },
  {
    id: 'shareholders-agreement',
    name: 'Shareholders Agreement',
    filename: '09_SHAREHOLDERS_AGREEMENT.md',
    description: 'Establish voting rights, share transfer restrictions, pre-emptive rights, and board governance.',
    fields: [
      { name: 'companyName', label: 'Company Name', placeholder: 'e.g. RJ Business Solutions, Inc.', defaultVal: 'RJ Business Solutions, Inc.' },
      { name: 'effectiveDate', label: 'Effective Date', placeholder: 'e.g. June 25, 2026', defaultVal: 'June 25, 2026' },
      { name: 'founder1Name', label: 'Founder 1 Name', placeholder: 'e.g. Rick Jefferson', defaultVal: 'Rick Jefferson' },
      { name: 'founder2Name', label: 'Founder 2 Name', placeholder: 'e.g. Anita Menon', defaultVal: 'Anita Menon' },
      { name: 'founder3Name', label: 'Founder 3 Name', placeholder: 'e.g. Vikram Iyer', defaultVal: 'Vikram Iyer' },
      { name: 'state', label: 'State of Incorporation', placeholder: 'e.g. New Mexico', defaultVal: 'New Mexico' }
    ]
  },
  {
    id: 'cap-table',
    name: 'Capitalization Table & Vesting Matrix',
    filename: '10_CAPITALIZATION_TABLE.md',
    description: 'Official record of equity ownership, capitalization structure, and founder vesting schedules.',
    fields: [
      { name: 'companyName', label: 'Company Name', placeholder: 'e.g. RJ Business Solutions, Inc.', defaultVal: 'RJ Business Solutions, Inc.' },
      { name: 'effectiveDate', label: 'Effective Date', placeholder: 'e.g. June 25, 2026', defaultVal: 'June 25, 2026' },
      { name: 'founder1Name', label: 'Founder 1 Name', placeholder: 'e.g. Rick Jefferson', defaultVal: 'Rick Jefferson' },
      { name: 'founder2Name', label: 'Founder 2 Name', placeholder: 'e.g. Anita Menon', defaultVal: 'Anita Menon' },
      { name: 'founder3Name', label: 'Founder 3 Name', placeholder: 'e.g. Vikram Iyer', defaultVal: 'Vikram Iyer' }
    ]
  },
  {
    id: 'esop-agreement',
    name: 'Employee Stock Option Plan (ESOP) Agreement',
    filename: '11_ESOP_AGREEMENT.md',
    description: 'Grant equity incentive options to key early-stage hires with custom cliff and vesting terms.',
    fields: [
      { name: 'companyName', label: 'Company Name', placeholder: 'e.g. RJ Business Solutions, Inc.', defaultVal: 'RJ Business Solutions, Inc.' },
      { name: 'effectiveDate', label: 'Effective Date', placeholder: 'e.g. June 25, 2026', defaultVal: 'June 25, 2026' },
      { name: 'employeeName', label: 'Employee Name', placeholder: 'e.g. Anita Menon', defaultVal: 'Anita Menon' },
      { name: 'shareCount', label: 'Option Share Count', placeholder: 'e.g. 100,000', defaultVal: '1,000,000' },
      { name: 'state', label: 'State', placeholder: 'e.g. New Mexico', defaultVal: 'New Mexico' }
    ]
  },
  {
    id: 'exit-addendum',
    name: 'Founder Exit Addendum',
    filename: '08_CO_FOUNDER_EXIT_ADDENDUM.md',
    description: 'Define Good Leaver/Bad Leaver classifications, transition handovers, and stock buyback protocols.',
    fields: [
      { name: 'companyName', label: 'Company Name', placeholder: 'e.g. RJ Business Solutions, Inc.', defaultVal: 'RJ Business Solutions, Inc.' },
      { name: 'effectiveDate', label: 'Effective Date', placeholder: 'e.g. June 25, 2026', defaultVal: 'June 25, 2026' },
      { name: 'founder1Name', label: 'Founder 1 Name', placeholder: 'e.g. Rick Jefferson', defaultVal: 'Rick Jefferson' },
      { name: 'founder2Name', label: 'Founder 2 Name', placeholder: 'e.g. Anita Menon', defaultVal: 'Anita Menon' },
      { name: 'state', label: 'State of Incorporation', placeholder: 'e.g. New Mexico', defaultVal: 'New Mexico' }
    ]
  },
  {
    id: 'nda',
    name: 'Mutual Non-Disclosure Agreement (NDA)',
    filename: '12_NONDISCLOSURE_AGREEMENT.md',
    description: 'Protect proprietary technology and business data during strategic discussions and integrations.',
    fields: [
      { name: 'companyName', label: 'Company Name', placeholder: 'e.g. RJ Business Solutions, Inc.', defaultVal: 'RJ Business Solutions, Inc.' },
      { name: 'effectiveDate', label: 'Effective Date', placeholder: 'e.g. June 25, 2026', defaultVal: 'June 25, 2026' },
      { name: 'counterpartyName', label: 'Counterparty Company', placeholder: 'e.g. Apex Systems Integration, LLC', defaultVal: 'Apex Systems Integration, LLC' },
      { name: 'counterpartyAddress', label: 'Counterparty Address', placeholder: 'e.g. 100 Gold Ave SW, Albuquerque, NM 87102', defaultVal: '100 Gold Ave SW, Albuquerque, New Mexico 87102' },
      { name: 'purpose', label: 'NDA Purpose', placeholder: 'e.g. AI frameworks discussions', defaultVal: 'advanced agentic AI coding frameworks, local edge orchestration gateways, and customized operational software suites' },
      { name: 'state', label: 'Governing State', placeholder: 'e.g. New Mexico', defaultVal: 'New Mexico' }
    ]
  },
  {
    id: 'ip-assignment',
    name: 'Intellectual Property Assignment (PIIA)',
    filename: '13_INTELLECTUAL_PROPERTY_ASSIGNMENT.md',
    description: 'Ensure all pre-incorporation and post-incorporation inventions are fully assigned to the corporation.',
    fields: [
      { name: 'companyName', label: 'Company Name', placeholder: 'e.g. RJ Business Solutions, Inc.', defaultVal: 'RJ Business Solutions, Inc.' },
      { name: 'effectiveDate', label: 'Effective Date', placeholder: 'e.g. June 25, 2026', defaultVal: 'June 25, 2026' },
      { name: 'founder1Name', label: 'Assignor Name', placeholder: 'e.g. Rick Jefferson', defaultVal: 'Rick Jefferson' },
      { name: 'state', label: 'Governing State', placeholder: 'e.g. New Mexico', defaultVal: 'New Mexico' }
    ]
  },
  {
    id: 'trademark-registration',
    name: 'Trademark Registration Application Template',
    filename: '14_TRADEMARK_REGISTRATION_TEMPLATE.md',
    description: 'Prepare corporate brand names and logo marks for federal and state trademark protection.',
    fields: [
      { name: 'companyName', label: 'Company Name', placeholder: 'e.g. RJ Business Solutions, Inc.', defaultVal: 'RJ Business Solutions, Inc.' },
      { name: 'effectiveDate', label: 'Effective Date', placeholder: 'e.g. June 25, 2026', defaultVal: 'June 25, 2026' },
      { name: 'trademarkName', label: 'Trademark Name', placeholder: 'e.g. NeuronEdge Labs', defaultVal: 'NeuronEdge Labs' },
      { name: 'state', label: 'State', placeholder: 'e.g. New Mexico', defaultVal: 'New Mexico' }
    ]
  },
  {
    id: 'employment-agreement',
    name: 'Executive Employment Agreement',
    filename: '15_EMPLOYMENT_AGREEMENT.md',
    description: 'Define compensation, duties, benefits, and protective covenants for senior corporate executives.',
    fields: [
      { name: 'companyName', label: 'Company Name', placeholder: 'e.g. RJ Business Solutions, Inc.', defaultVal: 'RJ Business Solutions, Inc.' },
      { name: 'effectiveDate', label: 'Effective Date', placeholder: 'e.g. June 25, 2026', defaultVal: 'June 25, 2026' },
      { name: 'employeeName', label: 'Employee Name', placeholder: 'e.g. Rick Jefferson', defaultVal: 'Rick Jefferson' },
      { name: 'jobTitle', label: 'Executive Job Title', placeholder: 'e.g. Chief Executive Officer', defaultVal: 'Founder & Chief Executive Officer' },
      { name: 'salary', label: 'Annual Salary', placeholder: 'e.g. $180,000', defaultVal: '$180,000' },
      { name: 'state', label: 'Governing State', placeholder: 'e.g. New Mexico', defaultVal: 'New Mexico' }
    ]
  },
  {
    id: 'job-offer',
    name: 'Key Employee Offer Letter',
    filename: '16_JOB_OFFER_LETTER.md',
    description: 'Professional job offer letter outlining compensation, equity options, role details, and start dates.',
    fields: [
      { name: 'companyName', label: 'Company Name', placeholder: 'e.g. RJ Business Solutions, Inc.', defaultVal: 'RJ Business Solutions, Inc.' },
      { name: 'effectiveDate', label: 'Effective Date', placeholder: 'e.g. June 25, 2026', defaultVal: 'June 25, 2026' },
      { name: 'candidateName', label: 'Candidate Name', placeholder: 'e.g. Vikram Iyer', defaultVal: 'Vikram Iyer' },
      { name: 'jobTitle', label: 'Job Title', placeholder: 'e.g. Lead AI Engineer', defaultVal: 'Lead AI Engineer' },
      { name: 'salary', label: 'Annual Salary Offered', placeholder: 'e.g. $150,000', defaultVal: '$150,000' },
      { name: 'startDate', label: 'Start Date', placeholder: 'e.g. July 1, 2026', defaultVal: 'July 1, 2026' }
    ]
  },
  {
    id: 'hr-policies',
    name: 'HR Policies & Employee Handbook',
    filename: '17_HR_POLICIES_HANDBOOK.md',
    description: 'Establish workplace standards, code of conduct, employment classifications, and benefits.',
    fields: [
      { name: 'companyName', label: 'Company Name', placeholder: 'e.g. RJ Business Solutions, Inc.', defaultVal: 'RJ Business Solutions, Inc.' },
      { name: 'effectiveDate', label: 'Effective Date', placeholder: 'e.g. June 25, 2026', defaultVal: 'June 25, 2026' },
      { name: 'state', label: 'Governing State', placeholder: 'e.g. New Mexico', defaultVal: 'New Mexico' }
    ]
  },
  {
    id: 'terms-of-service',
    name: 'SaaS Terms of Service',
    filename: '18_TERMS_OF_SERVICE.md',
    description: 'Define terms of use, licensing, user accounts, fee schedules, and platform liabilities.',
    fields: [
      { name: 'companyName', label: 'Company Name', placeholder: 'e.g. RJ Business Solutions, Inc.', defaultVal: 'RJ Business Solutions, Inc.' },
      { name: 'effectiveDate', label: 'Effective Date', placeholder: 'e.g. June 25, 2026', defaultVal: 'June 25, 2026' },
      { name: 'state', label: 'Governing State', placeholder: 'e.g. New Mexico', defaultVal: 'New Mexico' },
      { name: 'websiteUrl', label: 'Website URL', placeholder: 'e.g. https://rjbusinesssolutions.org', defaultVal: 'https://rickjeffersonsolutions.com' }
    ]
  },
  {
    id: 'privacy-policy',
    name: 'Privacy & Data Protection Policy',
    filename: '19_PRIVACY_POLICY.md',
    description: 'GDPR/CCPA compliant policy disclosing user data flows, collection methods, and consumer rights.',
    fields: [
      { name: 'companyName', label: 'Company Name', placeholder: 'e.g. RJ Business Solutions, Inc.', defaultVal: 'RJ Business Solutions, Inc.' },
      { name: 'effectiveDate', label: 'Effective Date', placeholder: 'e.g. June 25, 2026', defaultVal: 'June 25, 2026' },
      { name: 'state', label: 'Governing State', placeholder: 'e.g. New Mexico', defaultVal: 'New Mexico' },
      { name: 'websiteUrl', label: 'Website URL', placeholder: 'e.g. https://rjbusinesssolutions.org', defaultVal: 'https://rickjeffersonsolutions.com' },
      { name: 'contactEmail', label: 'Contact Support Email', placeholder: 'e.g. support@rjbusinesssolutions.org', defaultVal: 'support@rjbusinesssolutions.org' }
    ]
  },
  {
    id: 'consultant-agreement',
    name: 'Independent Consultant Agreement',
    filename: null, // Custom
    description: 'Standard independent contractor agreement defining scope of services, rates, and IP assignments.',
    fields: [
      { name: 'companyName', label: 'Company Name', placeholder: 'e.g. RJ Business Solutions, Inc.', defaultVal: 'RJ Business Solutions, Inc.' },
      { name: 'effectiveDate', label: 'Effective Date', placeholder: 'e.g. June 25, 2026', defaultVal: 'June 25, 2026' },
      { name: 'consultantName', label: 'Consultant Name', placeholder: 'e.g. Alex Rivers', defaultVal: 'Alex Rivers' },
      { name: 'consultantServices', label: 'Services Scope', placeholder: 'e.g. AI Core Model Optimization', defaultVal: 'AI Core Model Optimization and Testing' },
      { name: 'consultantRate', label: 'Consultant Rate', placeholder: 'e.g. $125 per hour', defaultVal: '$125 per hour' },
      { name: 'state', label: 'Governing State', placeholder: 'e.g. New Mexico', defaultVal: 'New Mexico' }
    ]
  },
  {
    id: 'share-certificate',
    name: 'Common Stock Share Certificate',
    filename: null, // Custom
    description: 'Official corporate share certificate certifying stock ownership, par value, and transfer terms.',
    fields: [
      { name: 'companyName', label: 'Company Name', placeholder: 'e.g. RJ Business Solutions, Inc.', defaultVal: 'RJ Business Solutions, Inc.' },
      { name: 'effectiveDate', label: 'Certificate Date', placeholder: 'e.g. June 25, 2026', defaultVal: 'June 25, 2026' },
      { name: 'shareholderName', label: 'Shareholder Name', placeholder: 'e.g. Rick Jefferson', defaultVal: 'Rick Jefferson' },
      { name: 'shareCount', label: 'Share Count', placeholder: 'e.g. 6,000,000', defaultVal: '6,000,000' },
      { name: 'certificateNumber', label: 'Certificate Number', placeholder: 'e.g. CS-001', defaultVal: 'CS-001' }
    ]
  },
  {
    id: 'indemnity-agreement',
    name: 'Director & Officer Indemnification Agreement',
    filename: null, // Custom
    description: 'Legally indemnify corporate board members and officers against individual liability or lawsuits.',
    fields: [
      { name: 'companyName', label: 'Company Name', placeholder: 'e.g. RJ Business Solutions, Inc.', defaultVal: 'RJ Business Solutions, Inc.' },
      { name: 'effectiveDate', label: 'Effective Date', placeholder: 'e.g. June 25, 2026', defaultVal: 'June 25, 2026' },
      { name: 'indemniteeName', label: 'Indemnitee Name', placeholder: 'e.g. Anita Menon', defaultVal: 'Anita Menon' },
      { name: 'state', label: 'Governing State', placeholder: 'e.g. New Mexico', defaultVal: 'New Mexico' }
    ]
  },
  {
    id: 'incorporation-cert',
    name: 'Certificate of Incorporation',
    filename: '07_CERTIFICATE_OF_INCORPORATION.md',
    description: 'Official corporate filing document establishing authorized share capital, directors, and registered agents.',
    fields: [
      { name: 'companyName', label: 'Company Name', placeholder: 'e.g. RJ Business Solutions, Inc.', defaultVal: 'RJ Business Solutions, Inc.' },
      { name: 'effectiveDate', label: 'Filing Date', placeholder: 'e.g. June 25, 2026', defaultVal: 'June 25, 2026' },
      { name: 'incorporatorName', label: 'Incorporator Name', placeholder: 'e.g. Rick Jefferson', defaultVal: 'Rick Jefferson' },
      { name: 'state', label: 'Filing State', placeholder: 'e.g. New Mexico', defaultVal: 'New Mexico' }
    ]
  }
];

const CUSTOM_TEMPLATES_TEXT = {
  'board-resolution': `# ACTION BY UNANIMOUS WRITTEN CONSENT OF THE BOARD OF DIRECTORS
OF
{{companyName}}

Effective Date: {{effectiveDate}}

The undersigned, being all of the members of the Board of Directors of {{companyName}}, a corporation organized under the laws of the State of {{state}} (the "Company"), hereby take the following actions and adopt the following resolutions by unanimous written consent pursuant to the laws of the State of {{state}} and the Bylaws of the Company:

---

## 1. APPOINTMENT OF CORPORATE OFFICERS
**RESOLVED**, that the following individuals are hereby appointed to the offices set forth opposite their names, to serve at the pleasure of the Board of Directors:

*   **President & Chief Executive Officer**: {{founder1Name}}
*   **Secretary & Treasurer**: Anita Menon

---

## 2. APPROVAL OF RESOLUTION SUBJECT:
### {{resolutionSubject}}

**RESOLVED**, that the President & Chief Executive Officer, {{founder1Name}}, is hereby authorized, empowered, and directed, in the name and on behalf of the Company, to execute and deliver any and all documents, agreements, certificates, or applications required to open, establish, and maintain corporate checking, savings, investment, or other transaction accounts at any financial institution of their choosing, and to designate authorized signers for such accounts.

**RESOLVED FURTHER**, that the Company is authorized to issue shares of its Common Stock to the initial founders in accordance with the Capitalization Table and Vesting Matrix, and the officers of the Company are authorized to execute and deliver appropriate Common Stock share certificates representing such shares.

---

## 3. COMPLIANCE AND GENERAL COMPLIANCE INSTRUCTIONS
**RESOLVED FURTHER**, that the officers of the Company are authorized and directed to take all such further actions and to execute and deliver all such further agreements, applications, or certificates as may be necessary or desirable to carry out the intent and accomplish the purposes of the foregoing resolutions.

### SIGNATURE OF DIRECTORS:

____________________________
**{{founder1Name}}**, Director

____________________________
**Anita Menon**, Director

____________________________
**Vikram Iyer**, Director`,

  'consultant-agreement': `# INDEPENDENT CONSULTANT AGREEMENT

This Independent Consultant Agreement (the "Agreement") is entered into as of {{effectiveDate}} (the "Effective Date"), by and between:

1.  **{{companyName}}**, a corporation organized under the laws of the State of {{state}} (the "Company"); and
2.  **{{consultantName}}**, an independent contractor residing in the State of {{state}} (the "Consultant").

---

## SECTION 1: SCOPE OF SERVICES
Consultant agrees to perform the following professional consulting and technical services for the Company (the "Services"):

*   **Core Services**: {{consultantServices}}
*   **Handovers**: Provide regular progress reports, written source code, testing configurations, and deployment logs as requested by the Board.

---

## SECTION 2: COMPENSATION AND RATES
The Company shall pay Consultant for the performance of Services in accordance with the following terms:

*   **Rate**: {{consultantRate}}
*   **Invoicing**: Consultant shall invoice the Company bi-weekly, detailing hours worked and specific items completed. Payment terms are Net-15.

---

## SECTION 3: INTELLECTUAL PROPERTY AND WORK PRODUCT
Consultant agrees that all inventions, software code, algorithms, documentation, brand systems, and work product developed or conceived in the performance of Services under this Agreement (the "Work Product") shall be the sole and exclusive property of the Company. Consultant hereby assigns all right, title, and interest in the Work Product perpetually and worldwide to the Company.

---

## SECTION 4: GOVERNING LAW AND RESOLUTION
This Agreement shall be governed by, and construed in accordance with, the laws of the State of {{state}}. Any dispute arising under this Agreement shall be resolved exclusively through binding arbitration in accordance with the Commercial Rules of the American Arbitration Association, with the physical venue of arbitration in Tijeras, {{state}}.

### IN WITNESS WHEREOF, the Parties have executed this Independent Consultant Agreement as of the Effective Date.

#### COMPANY:
**{{companyName}}**

By: ____________________________
Name: {{founder1Name}}
Title: CEO

#### CONSULTANT:
By: ____________________________
Name: {{consultantName}}
Consultant`,

  'share-certificate': `================================================================================
                         COMMON STOCK SHARE CERTIFICATE
================================================================================

Certificate Number: {{certificateNumber}}                             Number of Shares: {{shareCount}}

                                {{companyName}}
                Organized under the laws of the State of New Mexico

This certifies that:

                               {{shareholderName}}

is the registered holder of {{shareCount}} shares of Common Stock of {{companyName}}, transferable only on the books of the Corporation by the holder hereof in person or by a duly authorized attorney upon surrender of this Certificate properly endorsed.

These shares are subject to certain transfer restrictions, buyback options, and vesting schedules set forth in the Founder Equity and Vesting Agreement and the Shareholders' Agreement of the Company, copies of which are on file at the principal executive offices of the Corporation.

IN WITNESS WHEREOF, the Corporation has caused this Certificate to be signed by its duly authorized officers and its Corporate Seal to be hereunto affixed.

Dated: {{effectiveDate}}

____________________________                    ____________________________
Anita Menon, Secretary                          {{shareholderName}}, Shareholder

================================================================================`,

  'indemnity-agreement': `# DIRECTOR AND OFFICER INDEMNIFICATION AGREEMENT

This Indemnification Agreement (the "Agreement") is entered into as of {{effectiveDate}} (the "Effective Date"), by and between **{{companyName}}**, a corporation organized under the laws of the State of {{state}} (the "Company"), and **{{indemniteeName}}**, a Director and/or Officer of the Company (the "Indemnitee").

---

## RECITALS
**WHEREAS**, the Company desires to attract and retain highly qualified individuals to serve as Directors and Officers; and

**WHEREAS**, Indemnitee is willing to serve, or continue to serve, in such capacity provided that they are indemnified against liabilities, costs, and expenses incurred in connection with their service to the fullest extent permitted by the laws of the State of {{state}}.

**NOW, THEREFORE**, the Parties agree as follows:

---

## SECTION 1: CORE INDEMNIFICATION OBLIGATIONS
The Company shall indemnify and hold harmless Indemnitee, to the fullest extent permitted by law, if Indemnitee was, is, or is threatened to be made a party to or witness in any threatened, pending, or completed action, suit, or proceeding by reason of the fact that Indemnitee is or was a Director, Officer, employee, or agent of the Company, against all expenses, judgments, fines, penalties, and amounts paid in settlement actually and reasonably incurred by Indemnitee in connection with such action.

---

## SECTION 2: ADVANCEMENT OF EXPENSES
The Company shall advance all reasonable expenses, including attorneys' fees, court costs, and expert fees, incurred by Indemnitee in defending or testifying in any proceeding within ten (15) days of receipt of a written request and invoice, subject to an undertaking by Indemnitee to repay such advances if it is ultimately determined that Indemnitee is not entitled to indemnification.

---

## SECTION 3: SEAT OF GOVERNING LAW
This Agreement shall be governed by, and construed in accordance with, the laws of the State of {{state}}. Any dispute arising out of this Agreement shall be settled by binding arbitration before a single arbitrator under AAA Commercial Arbitration Rules, sitting in Tijeras, {{state}}.

### IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.

#### COMPANY:
**{{companyName}}**

By: ____________________________
Name: Rick Jefferson
Title: CEO

#### INDEMNITEE:
By: ____________________________
Name: {{indemniteeName}}
Indemnitee`
};

function run() {
  console.log('Starting templates bundling...');
  
  let outputCode = `// ===========================================================================
// FOUNDER OS SUITE TEMPLATES REGISTRY
// 18 Corporate, Operational, and Legal Templates
// Branded for Rick Jefferson | Powered by RJ Business Solutions
// ===========================================================================

export interface FounderTemplateField {
  name: string;
  label: string;
  placeholder: string;
  defaultVal?: string;
}

export interface FounderTemplate {
  id: string;
  name: string;
  description: string;
  fields: FounderTemplateField[];
  fn: (fields: Record<string, string>) => string;
}

export const FOUNDER_TEMPLATES: Record<string, FounderTemplate> = {
`;

  for (const meta of templatesMetadata) {
    console.log(`Processing: ${meta.name} (${meta.id})`);
    
    let rawText = '';
    
    if (meta.filename) {
      const filePath = path.join(srcDir, meta.filename);
      if (fs.existsSync(filePath)) {
        rawText = fs.readFileSync(filePath, 'utf8');
      } else {
        console.error(`Error: file not found at ${filePath}`);
        process.exit(1);
      }
    } else {
      rawText = CUSTOM_TEMPLATES_TEXT[meta.id] || '';
    }

    // Replace specific instances of Rick's data with dynamic placeholders
    // to compile them into template strings. We need to be careful with exact matches.
    let processedText = rawText;

    // Do general substitutions
    processedText = processedText
      .replace(/RJ Business Solutions, Inc\./g, '{{companyName}}')
      .replace(/RJ Business Solutions/g, '{{companyName}}') // Fallback matching
      .replace(/Rick Jefferson/g, '{{founder1Name}}')
      .replace(/Anita Menon/g, '{{founder2Name}}')
      .replace(/Vikram Iyer/g, '{{founder3Name}}')
      .replace(/1342 NM 333, Tijeras, New Mexico 87059/g, '{{founder1Address}}')
      .replace(/4506 San Mateo Blvd NE, Albuquerque, New Mexico 87109/g, '{{founder2Address}}')
      .replace(/1209 Lomas Blvd NW, Albuquerque, New Mexico 87102/g, '{{founder3Address}}')
      .replace(/New Mexico/g, '{{state}}')
      .replace(/June 25, 2026/g, '{{effectiveDate}}');

    // Escaping backticks and variables for typescript literal injection
    // We will represent the text template inside a function, and we can replace the placeholders
    // with actual fields values at runtime.
    // Replace {{fieldName}} with ${fields.fieldName || '...'}
    let jsTemplateText = processedText
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\${/g, '\\${');

    // Convert {{field}} to \${fields.field || 'default'}
    jsTemplateText = jsTemplateText.replace(/\{\{(\w+)\}\}/g, (match, fieldName) => {
      const fieldMeta = meta.fields.find(f => f.name === fieldName);
      const defaultVal = fieldMeta ? fieldMeta.defaultVal : '';
      return `\${fields.${fieldName} || '${defaultVal}'}`;
    });

    outputCode += `  '${meta.id}': {
    id: '${meta.id}',
    name: '${meta.name}',
    description: '${meta.description}',
    fields: ${JSON.stringify(meta.fields, null, 6)},
    fn: (fields: Record<string, string>) => {
      return \`${jsTemplateText}\`;
    }
  },\n`;
  }

  outputCode += `};\n`;

  fs.mkdirSync(path.dirname(destFile), { recursive: true });
  fs.writeFileSync(destFile, outputCode, 'utf8');
  console.log(`Success! Written 18 templates to ${destFile}`);
}

run();
