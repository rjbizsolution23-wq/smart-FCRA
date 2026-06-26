// ===========================================================================
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
  'founder-agreement': {
    id: 'founder-agreement',
    name: 'Founder Equity and Vesting Agreement',
    description: 'Establish equity allocation, vesting schedules, IP assignments, and dispute resolution for founders.',
    fields: [
      {
            "name": "companyName",
            "label": "Company Name",
            "placeholder": "e.g. RJ Business Solutions, Inc.",
            "defaultVal": "RJ Business Solutions, Inc."
      },
      {
            "name": "effectiveDate",
            "label": "Effective Date",
            "placeholder": "e.g. June 25, 2026",
            "defaultVal": "June 25, 2026"
      },
      {
            "name": "founder1Name",
            "label": "Founder 1 Name",
            "placeholder": "e.g. Rick Jefferson",
            "defaultVal": "Rick Jefferson"
      },
      {
            "name": "founder1Address",
            "label": "Founder 1 Address",
            "placeholder": "e.g. 1342 NM 333, Tijeras, NM 87059",
            "defaultVal": "1342 NM 333, Tijeras, New Mexico 87059"
      },
      {
            "name": "founder2Name",
            "label": "Founder 2 Name",
            "placeholder": "e.g. Anita Menon",
            "defaultVal": "Anita Menon"
      },
      {
            "name": "founder2Address",
            "label": "Founder 2 Address",
            "placeholder": "e.g. 4506 San Mateo Blvd NE, Albuquerque, NM 87109",
            "defaultVal": "4506 San Mateo Blvd NE, Albuquerque, New Mexico 87109"
      },
      {
            "name": "founder3Name",
            "label": "Founder 3 Name",
            "placeholder": "e.g. Vikram Iyer",
            "defaultVal": "Vikram Iyer"
      },
      {
            "name": "founder3Address",
            "label": "Founder 3 Address",
            "placeholder": "e.g. 1209 Lomas Blvd NW, Albuquerque, NM 87102",
            "defaultVal": "1209 Lomas Blvd NW, Albuquerque, New Mexico 87102"
      },
      {
            "name": "state",
            "label": "State of Incorporation",
            "placeholder": "e.g. New Mexico",
            "defaultVal": "New Mexico"
      }
],
    fn: (fields: Record<string, string>) => {
      return `# FOUNDER EQUITY AND VESTING AGREEMENT

This Founder Equity and Vesting Agreement (the "Agreement") is entered into as of ${fields.effectiveDate || 'June 25, 2026'} (the "Effective Date"), by and among:

1.  **${fields.founder1Name || 'Rick Jefferson'}**, residing at ${fields.founder1Address || '1342 NM 333, Tijeras, New Mexico 87059'} ("Jefferson");
2.  **${fields.founder2Name || 'Anita Menon'}**, residing at ${fields.founder2Address || '4506 San Mateo Blvd NE, Albuquerque, New Mexico 87109'} ("Menon");
3.  **${fields.founder3Name || 'Vikram Iyer'}**, residing at ${fields.founder3Address || '1209 Lomas Blvd NW, Albuquerque, New Mexico 87102'} ("Iyer"); and
4.  **${fields.companyName || 'RJ Business Solutions, Inc.'}**, a corporation organized under the laws of the State of ${fields.state || 'New Mexico'}, with its principal place of business at ${fields.founder1Address || '1342 NM 333, Tijeras, New Mexico 87059'} (the "Company").

Each of Jefferson, Menon, and Iyer is individually referred to as a "Founder" and collectively as the "Founders." The Founders and the Company are collectively referred to as the "Parties" and individually as a "Party."

### RECITALS

**WHEREAS**, the Founders have collaborated to develop the concept, technology, and business plan for an advanced agentic AI coding and sovereign local edge orchestration suite;

**WHEREAS**, the Founders have agreed to incorporate the Company to operate and expand this business;

**WHEREAS**, the Company has authorized the issuance of Common Stock, and the Founders desire to acquire shares of Common Stock in the Company, subject to certain vesting conditions, restrictions on transfer, and buyback rights to align their interests with the long-term success of the Company; and

**WHEREAS**, the Founders desire to assign all proprietary rights, concepts, and intellectual property developed in connection with the Company to the Company as a condition of their stock ownership.

**NOW, THEREFORE**, in consideration of the mutual covenants, promises, and agreements contained herein, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the Parties agree as follows:

---

## SECTION 1: SHARE ALLOCATION AND ACQUISITION

### 1.1 Issuance of Common Stock
Subject to the terms and conditions of this Agreement, the Company hereby issues to each Founder, and each Founder hereby purchases and acquires, the number of shares of the Company's Common Stock, par value $0.0001 per share (the "Shares"), set forth below, at a purchase price of $0.0001 per share, paid in cash or through the assignment of pre-incorporation intellectual property to the Company:

*   **${fields.founder1Name || 'Rick Jefferson'}**: 6,000,000 Shares (60.0% of Authorized Capital) for a total consideration of $600.00.
*   **${fields.founder2Name || 'Anita Menon'}**: 1,500,000 Shares (15.0% of Authorized Capital) for a total consideration of $150.00.
*   **${fields.founder3Name || 'Vikram Iyer'}**: 1,000,000 Shares (10.0% of Authorized Capital) for a total consideration of $100.00.

The remaining 1,500,000 Shares (15.0% of Authorized Capital) are reserved under the Company's Employee Stock Option Plan ("ESOP") and for future advisory/investor allocations.

### 1.2 Share Certificates
Stock certificates representing the Shares shall be issued to each Founder and shall be held in escrow by the Secretary of the Company, together with blank stock powers executed by each Founder, until such Shares have vested in accordance with Section 2 or are repurchased by the Company in accordance with Section 3.

---

## SECTION 2: VESTING SCHEDULE AND ACCELERATION

### 2.1 Vesting Schedule
Except as otherwise provided herein, the Shares issued to each Founder shall vest in accordance with a forty-eight (48) month vesting schedule commencing on the Effective Date, subject to the Founder’s Continuous Service to the Company:

1.  **One-Year Cliff**: Twenty-five percent (25%) of the Shares shall vest on June 25, 2027 (the "Cliff Date"), representing twelve (12) months of continuous service. No Shares shall vest prior to the Cliff Date.
2.  **Monthly Vesting**: The remaining seventy-five percent (75%) of the Shares shall vest in thirty-six (36) equal monthly installments of 2.0833% on the 25th day of each calendar month following the Cliff Date, commencing on July 25, 2027, until all Shares are fully vested on June 25, 2030.

### 2.2 Continuous Service
"Continuous Service" means that the Founder's active-status involvement with the Company as an employee, director, officer, consultant, or independent contractor is not interrupted or terminated. The Board of Directors of the Company (the "Board") shall have the sole and absolute discretion to determine whether a Founder remains in Continuous Service.

### 2.3 Acceleration of Vesting
*   **Single-Trigger Acceleration**: Upon a Change of Control (as defined below), fifty percent (50%) of each Founder's then-unvested Shares shall immediately vest, and the remaining unvested Shares shall continue to vest in accordance with the schedule set forth in Section 2.1.
*   **Double-Trigger Acceleration**: If, within twelve (12) months following a Change of Control, a Founder's Continuous Service is terminated by the Company without "Cause" (as defined below) or by the Founder for "Good Reason" (as defined below), one hundred percent (100%) of such Founder's remaining unvested Shares shall immediately become fully vested as of the date of termination.
*   **Change of Control**: Means (a) a sale of all or substantially all of the assets of the Company; (b) a merger, consolidation, or reorganization of the Company in which the shareholders of the Company immediately prior to such transaction own less than fifty percent (50%) of the voting power of the surviving entity; or (c) any transaction or series of related transactions in which a third party acquires more than fifty percent (50%) of the outstanding voting stock of the Company.

---

## SECTION 3: COMPANY REPURCHASE RIGHTS AND EXIT PROTOCOLS

### 3.1 Voluntary or Involuntary Termination of Service
In the event a Founder's Continuous Service with the Company is terminated for any reason (including death, disability, voluntary resignation, or involuntary termination with or without Cause) prior to the full vesting of their Shares, the Company shall have an irrevocable option (the "Repurchase Option") to repurchase any or all of the unvested Shares held by such Founder as of the date of termination.

### 3.2 Repurchase Price
The repurchase price for any unvested Shares repurchased under Section 3.1 shall be equal to the original purchase price paid by the Founder ($0.0001 per share). The Founder shall receive payment for the repurchased Shares in cash, via check, or through the cancellation of any outstanding indebtedness of the Founder to the Company, within thirty (30) days of the date of termination.

### 3.3 Mechanics of Repurchase
The Repurchase Option may be exercised by the Company by delivering written notice to the terminating Founder (or their personal representative/estate) within ninety (90) days following the date of termination. Upon delivery of such notice and payment of the repurchase price, the Secretary of the Company, acting as escrow agent, shall transfer the unvested Shares back to the Company treasury, and the terminating Founder shall cease to have any rights as a shareholder with respect to such unvested Shares.

---

## SECTION 4: INTELLECTUAL PROPERTY ASSIGNMENT

### 4.1 Prior Inventions and Contributions
Each Founder hereby represents and warrants that they have disclosed to the Company all inventions, software, code, algorithms, designs, brand marks, and other intellectual property developed or conceived by them, either individually or jointly, prior to the Effective Date that relate to the business or proposed business of the Company (the "Prior IP").

### 4.2 Absolute Assignment
As a core condition of stock issuance, each Founder hereby irrevocably assigns, transfers, and conveys to the Company and its successors and assigns, all right, title, and interest worldwide in and to all Prior IP, and any and all ideas, designs, software, code, databases, documentation, and processes created during their Continuous Service with the Company. This assignment includes all patent, copyright, trademark, trade secret, and other proprietary rights associated therewith.

### 4.3 Execution of Documents
Each Founder agrees to execute, verify, and deliver all such papers, documents, patent applications, copyright registrations, and other instruments as may be reasonably requested by the Company to vest, perfect, or maintain the Company’s sole and exclusive ownership of the assigned intellectual property.

---

## SECTION 5: CONFIDENTIALITY AND RESTRICTIVE COVENANTS

### 5.1 Proprietary Information
Each Founder acknowledges that they will have access to highly confidential and proprietary information of the Company, including technical architectures, agent configurations, trade secrets, financial models, customer lists, and business strategies (the "Confidential Information"). Each Founder agrees to hold all Confidential Information in the strictest confidence and not to disclose, publish, or use such information for any purpose other than for the exclusive benefit of the Company.

### 5.2 Non-Compete and Non-Solicitation
During their Continuous Service and for a period of twenty-four (24) months following the termination of their service for any reason, each Founder agrees they shall not, directly or indirectly:

1.  Engage, invest in, consult for, or perform services for any business entity that directly competes with the Company's agentic AI, local edge computing, or workflow automation software suites within the United States;
2.  Solicit, recruit, or attempt to hire any employee, independent contractor, or consultant of the Company to leave their employment or engagement with the Company; or
3.  Solicit, divert, or attempt to take away any client, customer, or business relationship of the Company.

---

## SECTION 6: DISPUTE RESOLUTION AND GOVERNING LAW

### 6.1 Governing Law
This Agreement, and all claims, disputes, or causes of action (whether in contract, tort, or statute) arising out of or relating to this Agreement, shall be governed by, and enforced in accordance with, the laws of the State of ${fields.state || 'New Mexico'}, without regard to its conflict of laws principles.

### 6.2 Mandatory Arbitration
Any controversy, claim, or dispute arising out of, or relating to, this Agreement, including its formation, validity, breach, or termination, shall be settled by binding arbitration in accordance with the Commercial Arbitration Rules of the American Arbitration Association ("AAA"):

1.  **Seat of Arbitration**: The seat and physical venue of arbitration shall be **Tijeras, ${fields.state || 'New Mexico'}**.
2.  **Number of Arbitrators**: The arbitration shall be conducted before a single neutral arbitrator appointed in accordance with AAA rules.
3.  **Language**: The arbitration shall be conducted in the English language.
4.  **Enforceability**: The award rendered by the arbitrator shall be final, binding, and non-appealable, and judgment upon the award may be entered in any court having jurisdiction thereof.
5.  **Attorneys' Fees**: The prevailing Party in any such arbitration shall be entitled to recover its reasonable attorneys' fees, expert fees, and arbitration costs from the non-prevailing Party.

---

## SECTION 7: MISCELLANEOUS PROVISIONS

### 7.1 Entire Agreement
This Agreement, together with any stock purchase agreements or escrow instructions executed in connection herewith, constitutes the entire agreement among the Parties regarding the subject matter hereof and supersedes all prior or contemporaneous agreements, understandings, discussions, or representations, whether oral or written.

### 7.2 Counterparts and Electronic Signatures
This Agreement may be executed in any number of counterparts, each of which shall be deemed an original, but all of which together shall constitute one and the same instrument. Facsimile, PDF, and electronic signatures (including DocuSign) shall be accepted as original and binding signatures.

### 7.3 Severability
If any provision of this Agreement is held to be invalid, illegal, or unenforceable in any respect by a court or arbitrator of competent jurisdiction, such invalidity, illegality, or unenforceability shall not affect any other provision of this Agreement, which shall remain in full force and effect.

---

### IN WITNESS WHEREOF, the Parties have executed this Founder Equity and Vesting Agreement as of the Effective Date.

#### COMPANY:
**${fields.companyName || 'RJ Business Solutions, Inc.'}**

By: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  
Name: ${fields.founder1Name || 'Rick Jefferson'}  
Title: Founder & CEO  
Date: ${fields.effectiveDate || 'June 25, 2026'}

#### FOUNDERS:

\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  
**${fields.founder1Name || 'Rick Jefferson'}**, Individually  
Date: ${fields.effectiveDate || 'June 25, 2026'}

\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  
**${fields.founder2Name || 'Anita Menon'}**, Individually  
Date: ${fields.effectiveDate || 'June 25, 2026'}

\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  
**${fields.founder3Name || 'Vikram Iyer'}**, Individually  
Date: ${fields.effectiveDate || 'June 25, 2026'}
`;
    }
  },
  'board-resolution': {
    id: 'board-resolution',
    name: 'Initial Board Resolution',
    description: 'Formally authorize corporate banking, share issuances, and early stage corporate compliance.',
    fields: [
      {
            "name": "companyName",
            "label": "Company Name",
            "placeholder": "e.g. RJ Business Solutions, Inc.",
            "defaultVal": "RJ Business Solutions, Inc."
      },
      {
            "name": "effectiveDate",
            "label": "Effective Date",
            "placeholder": "e.g. June 25, 2026",
            "defaultVal": "June 25, 2026"
      },
      {
            "name": "founder1Name",
            "label": "President Name",
            "placeholder": "e.g. Rick Jefferson",
            "defaultVal": "Rick Jefferson"
      },
      {
            "name": "resolutionSubject",
            "label": "Resolution Subject",
            "placeholder": "e.g. Banking & Stock Issuances",
            "defaultVal": "Opening Corporate Bank Account and Approving Founder Share Issuances"
      },
      {
            "name": "state",
            "label": "State",
            "placeholder": "e.g. New Mexico",
            "defaultVal": "New Mexico"
      }
],
    fn: (fields: Record<string, string>) => {
      return `# ACTION BY UNANIMOUS WRITTEN CONSENT OF THE BOARD OF DIRECTORS
OF
${fields.companyName || 'RJ Business Solutions, Inc.'}

Effective Date: ${fields.effectiveDate || 'June 25, 2026'}

The undersigned, being all of the members of the Board of Directors of ${fields.companyName || 'RJ Business Solutions, Inc.'}, a corporation organized under the laws of the State of ${fields.state || 'New Mexico'} (the "Company"), hereby take the following actions and adopt the following resolutions by unanimous written consent pursuant to the laws of the State of ${fields.state || 'New Mexico'} and the Bylaws of the Company:

---

## 1. APPOINTMENT OF CORPORATE OFFICERS
**RESOLVED**, that the following individuals are hereby appointed to the offices set forth opposite their names, to serve at the pleasure of the Board of Directors:

*   **President & Chief Executive Officer**: ${fields.founder1Name || 'Rick Jefferson'}
*   **Secretary & Treasurer**: ${fields.founder2Name || ''}

---

## 2. APPROVAL OF RESOLUTION SUBJECT:
### ${fields.resolutionSubject || 'Opening Corporate Bank Account and Approving Founder Share Issuances'}

**RESOLVED**, that the President & Chief Executive Officer, ${fields.founder1Name || 'Rick Jefferson'}, is hereby authorized, empowered, and directed, in the name and on behalf of the Company, to execute and deliver any and all documents, agreements, certificates, or applications required to open, establish, and maintain corporate checking, savings, investment, or other transaction accounts at any financial institution of their choosing, and to designate authorized signers for such accounts.

**RESOLVED FURTHER**, that the Company is authorized to issue shares of its Common Stock to the initial founders in accordance with the Capitalization Table and Vesting Matrix, and the officers of the Company are authorized to execute and deliver appropriate Common Stock share certificates representing such shares.

---

## 3. COMPLIANCE AND GENERAL COMPLIANCE INSTRUCTIONS
**RESOLVED FURTHER**, that the officers of the Company are authorized and directed to take all such further actions and to execute and deliver all such further agreements, applications, or certificates as may be necessary or desirable to carry out the intent and accomplish the purposes of the foregoing resolutions.

### SIGNATURE OF DIRECTORS:

____________________________
**${fields.founder1Name || 'Rick Jefferson'}**, Director

____________________________
**${fields.founder2Name || ''}**, Director

____________________________
**${fields.founder3Name || ''}**, Director`;
    }
  },
  'shareholders-agreement': {
    id: 'shareholders-agreement',
    name: 'Shareholders Agreement',
    description: 'Establish voting rights, share transfer restrictions, pre-emptive rights, and board governance.',
    fields: [
      {
            "name": "companyName",
            "label": "Company Name",
            "placeholder": "e.g. RJ Business Solutions, Inc.",
            "defaultVal": "RJ Business Solutions, Inc."
      },
      {
            "name": "effectiveDate",
            "label": "Effective Date",
            "placeholder": "e.g. June 25, 2026",
            "defaultVal": "June 25, 2026"
      },
      {
            "name": "founder1Name",
            "label": "Founder 1 Name",
            "placeholder": "e.g. Rick Jefferson",
            "defaultVal": "Rick Jefferson"
      },
      {
            "name": "founder2Name",
            "label": "Founder 2 Name",
            "placeholder": "e.g. Anita Menon",
            "defaultVal": "Anita Menon"
      },
      {
            "name": "founder3Name",
            "label": "Founder 3 Name",
            "placeholder": "e.g. Vikram Iyer",
            "defaultVal": "Vikram Iyer"
      },
      {
            "name": "state",
            "label": "State of Incorporation",
            "placeholder": "e.g. New Mexico",
            "defaultVal": "New Mexico"
      }
],
    fn: (fields: Record<string, string>) => {
      return `# SHAREHOLDERS' AGREEMENT

This Shareholders' Agreement (the "Agreement") is entered into as of ${fields.effectiveDate || 'June 25, 2026'}, by and among:

1.  **${fields.companyName || 'RJ Business Solutions, Inc.'}**, a ${fields.state || 'New Mexico'} corporation, with its principal office at ${fields.founder1Address || ''} (the "Company");
2.  **${fields.founder1Name || 'Rick Jefferson'}**, residing at ${fields.founder1Address || ''} ("Jefferson");
3.  **${fields.founder2Name || 'Anita Menon'}**, residing at ${fields.founder2Address || ''} ("Menon");
4.  **${fields.founder3Name || 'Vikram Iyer'}**, residing at ${fields.founder3Address || ''} ("Iyer"); and
5.  Any other shareholder who becomes a party to this Agreement by executing a Joinder Agreement (each a "Shareholder" and collectively the "Shareholders").

### RECITALS

**WHEREAS**, the Company has an authorized capital stock of 10,000,000 shares of Common Stock, of which 8,500,000 shares are issued and outstanding as of the date hereof, held as follows:
*   ${fields.founder1Name || 'Rick Jefferson'}: 6,000,000 shares (70.59% of outstanding shares)
*   ${fields.founder2Name || 'Anita Menon'}: 1,500,000 shares (17.65% of outstanding shares)
*   ${fields.founder3Name || 'Vikram Iyer'}: 1,000,000 shares (11.76% of outstanding shares)

**WHEREAS**, the Shareholders and the Company desire to promote the interests of the Company and of the Shareholders by establishing certain restrictions and agreements with respect to the governance of the Company, the transfer of the capital stock of the Company, and other related matters.

**NOW, THEREFORE**, in consideration of the mutual covenants and agreements contained herein, the parties agree as follows:

---

## SECTION 1: CORPORATE GOVERNANCE AND BOARD REPRESENTATION

### 1.1 Board of Directors Composition
The Shareholders agree to vote all shares of stock owned by them, or over which they have voting control, so as to fix and maintain the number of directors of the Company at three (3) members, and to elect the following individuals to the Board of Directors of the Company (the "Board"):
1.  One (1) director designated by ${fields.founder1Name || 'Rick Jefferson'}, who shall initially be **${fields.founder1Name || 'Rick Jefferson'}** (and who shall serve as Chairman of the Board);
2.  One (1) director designated by ${fields.founder2Name || 'Anita Menon'}, who shall initially be **${fields.founder2Name || 'Anita Menon'}**; and
3.  One (1) director designated by ${fields.founder3Name || 'Vikram Iyer'}, who shall initially be **${fields.founder3Name || 'Vikram Iyer'}**.

### 1.2 Board Meetings and Quorum
The Board shall meet at least quarterly. A quorum for any meeting of the Board shall require the presence (in person, by telephone, or via videoconference) of at least two (2) directors, provided that the director designated by ${fields.founder1Name || 'Rick Jefferson'} is present.

### 1.3 Key Decisions Requiring Supermajority Shareholder Approval
The Company shall not, and shall ensure that its subsidiaries do not, take any of the following actions without the prior written consent or affirmative vote of Shareholders holding at least seventy-five percent (75%) of the outstanding shares of Common Stock:
1.  Any amendment, alteration, or repeal of the Articles of Incorporation or Bylaws of the Company;
2.  The creation, authorization, or issuance of any new class of stock, or any security convertible into stock, having preferences senior to or on parity with the Common Stock;
3.  Any merger, consolidation, asset sale, or joint venture transaction that constitutes a Change of Control (as defined in the Founder Agreement);
4.  The voluntary dissolution, winding up, or liquidation of the Company, or filing for bankruptcy protection;
5.  An increase or decrease in the authorized number of directors of the Company; or
6.  Any change in the principal business of the Company.

---

## SECTION 2: SHARE TRANSFER RESTRICTIONS AND BUYBACK PROTOCOLS

### 2.1 General Prohibition on Transfer
Except as permitted under Section 2.2 (Permitted Transfers) or Section 3 (Right of First Refusal), no Shareholder shall sell, assign, pledge, charge, hypothecate, or otherwise transfer or encumber any interest in their Shares without the prior written consent of the Board of Directors. Any attempted transfer in violation of this Agreement shall be null and void ab initio.

### 2.2 Permitted Transfers
A Shareholder may transfer Shares without complying with Section 3 to:
1.  A parent, spouse, child, or sibling of the Shareholder, or a trust established solely for the benefit of the Shareholder or their immediate family members for estate planning purposes; or
2.  An affiliate of the Shareholder (in the case of a corporate Shareholder), provided that such affiliate executes a Joinder Agreement in the form attached hereto as Exhibit A.

---

## SECTION 3: RIGHT OF FIRST REFUSAL (ROFR)

### 3.1 Notice of Proposed Transfer
If a Shareholder (the "Transferring Shareholder") receives a bona fide written offer from a third party to purchase any of their Shares (the "Offered Shares"), the Transferring Shareholder shall deliver a written notice (the "Transfer Notice") to the Company and to each of the other Shareholders (the "Non-Transferring Shareholders"). The Transfer Notice shall state the name of the prospective purchaser, the number of Offered Shares, the price per share, and all other material terms of the proposed transfer.

### 3.2 Company’s First Option
For a period of thirty (30) days following receipt of the Transfer Notice, the Company shall have the first option, but not the obligation, to purchase all or any portion of the Offered Shares on the terms and conditions specified in the Transfer Notice.

### 3.3 Shareholders’ Second Option
If the Company does not exercise its option to purchase all of the Offered Shares within the thirty (30) day period, the Company shall immediately notify the Non-Transferring Shareholders. The Non-Transferring Shareholders shall have a secondary option for a period of fifteen (15) days to purchase their pro-rata share of the remaining Offered Shares. Pro-rata shares shall be calculated based on the ratio of the number of Shares owned by each Non-Transferring Shareholder to the total number of Shares owned by all Non-Transferring Shareholders.

### 3.4 Allocation of Unsubscribed Shares
If any Non-Transferring Shareholder declines to purchase their full pro-rata allocation of the Offered Shares, the remaining Non-Transferring Shareholders who have fully subscribed shall have the right to purchase the unsubscribed Offered Shares on a pro-rata basis.

### 3.5 Transfer to Third Party
If the Company and the Non-Transferring Shareholders do not collectively elect to purchase all of the Offered Shares within forty-five (45) days of the date of the Transfer Notice, the Transferring Shareholder may transfer all of the Offered Shares to the third party named in the Transfer Notice, provided that:
1.  The transfer is completed within sixty (60) days thereafter;
2.  The transfer is executed on terms no more favorable to the third party than those set forth in the Transfer Notice; and
3.  The third party executes a Joinder Agreement, agreeing to be bound by all terms and conditions of this Agreement.

---

## SECTION 4: TAG-ALONG (CO-SALE) AND DRAG-ALONG RIGHTS

### 4.1 Tag-Along Rights
If a Shareholder holding a majority of the outstanding Shares proposes to sell any Shares to a third party in a transaction that is not a Permitted Transfer under Section 2.2, each other Shareholder shall have the right to participate in such sale on a pro-rata basis. The majority Shareholder shall ensure that the third-party purchaser agrees to acquire from the other Shareholders the number of Shares they elect to sell under this Section, at the same price and on the same terms and conditions as the majority Shareholder's sale.

### 4.2 Drag-Along Rights
If Shareholders holding at least seventy-five percent (75%) of the outstanding Shares and the Board of Directors approve a Change of Control transaction (an "Approved Sale") to a bona fide third party:
1.  **Mandatory Participation**: All other Shareholders shall vote in favor of, consent to, and raise no objections against the Approved Sale;
2.  **Sale of Shares**: If the Approved Sale is structured as a sale of stock, all Shareholders shall sell their Shares on the same terms, conditions, and price per share as approved by the 75% majority; and
3.  **Execution of Documents**: All Shareholders shall execute all such stock powers, merger agreements, and transfer documents as are reasonably required to consummate the Approved Sale.

---

## SECTION 5: DISPUTE RESOLUTION AND GOVERNING LAW

### 5.1 Governing Law
This Agreement, including all amendments, addenda, and joinders hereto, shall be governed by and construed in accordance with the laws of the State of ${fields.state || 'New Mexico'}, without regard to its conflict of laws principles.

### 5.2 Binding Arbitration
Any dispute, controversy, or claim arising out of, or relating to, this Agreement, including its execution, validity, breach, or termination, shall be submitted to and resolved exclusively by binding arbitration administered by the American Arbitration Association ("AAA") in accordance with its Commercial Arbitration Rules:
1.  **Venue**: The physical seat and venue of the arbitration shall be **Tijeras, ${fields.state || 'New Mexico'}**.
2.  **Language**: The arbitration shall be conducted in English.
3.  **Arbitrator**: The tribunal shall consist of one (1) neutral arbitrator with at least ten (10) years of experience in corporate law.
4.  **Award**: The arbitrator's award shall be final, binding, and may be entered as a judgment in any court of competent jurisdiction.
5.  **Attorneys' Fees**: The non-prevailing party shall reimburse the prevailing party for its reasonable attorneys' fees, expert fees, and arbitration costs.

---

## SECTION 6: MISCELLANEOUS PROVISIONS

### 6.1 Termination
This Agreement shall terminate upon:
1.  The written agreement of all Shareholders holding 100% of the outstanding Shares;
2.  The consummation of an initial public offering (IPO) of the Company's Common Stock on a recognized stock exchange; or
3.  The voluntary or involuntary dissolution, liquidation, or winding up of the Company.

### 6.2 Legends on Certificates
Each certificate representing Shares in the Company shall bear a legend substantially in the following form:

> "THE SHARES REPRESENTED BY THIS CERTIFICATE ARE SUBJECT TO THE TERMS AND CONDITIONS OF A SHAREHOLDERS' AGREEMENT DATED JUNE 25, 2026, WHICH CONTAINS RESTRICTIONS ON THE TRANSFER, PLEDGE, AND VOTING OF THESE SHARES. A COPY OF THE AGREEMENT IS ON FILE WITH THE SECRETARY OF THE CORPORATION."

---

### IN WITNESS WHEREOF, the Parties have executed this Shareholders' Agreement as of the date first written above.

#### COMPANY:
**${fields.companyName || 'RJ Business Solutions, Inc.'}**

By: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  
Name: ${fields.founder1Name || 'Rick Jefferson'}  
Title: Founder & CEO  
Date: ${fields.effectiveDate || 'June 25, 2026'}

#### SHAREHOLDERS:

\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  
**${fields.founder1Name || 'Rick Jefferson'}**, Shareholder  
Date: ${fields.effectiveDate || 'June 25, 2026'}

\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  
**${fields.founder2Name || 'Anita Menon'}**, Shareholder  
Date: ${fields.effectiveDate || 'June 25, 2026'}

\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  
**${fields.founder3Name || 'Vikram Iyer'}**, Shareholder  
Date: ${fields.effectiveDate || 'June 25, 2026'}
`;
    }
  },
  'cap-table': {
    id: 'cap-table',
    name: 'Capitalization Table & Vesting Matrix',
    description: 'Official record of equity ownership, capitalization structure, and founder vesting schedules.',
    fields: [
      {
            "name": "companyName",
            "label": "Company Name",
            "placeholder": "e.g. RJ Business Solutions, Inc.",
            "defaultVal": "RJ Business Solutions, Inc."
      },
      {
            "name": "effectiveDate",
            "label": "Effective Date",
            "placeholder": "e.g. June 25, 2026",
            "defaultVal": "June 25, 2026"
      },
      {
            "name": "founder1Name",
            "label": "Founder 1 Name",
            "placeholder": "e.g. Rick Jefferson",
            "defaultVal": "Rick Jefferson"
      },
      {
            "name": "founder2Name",
            "label": "Founder 2 Name",
            "placeholder": "e.g. Anita Menon",
            "defaultVal": "Anita Menon"
      },
      {
            "name": "founder3Name",
            "label": "Founder 3 Name",
            "placeholder": "e.g. Vikram Iyer",
            "defaultVal": "Vikram Iyer"
      }
],
    fn: (fields: Record<string, string>) => {
      return `# CAPITALIZATION TABLE AND VESTING MATRIX

This Capitalization Table and Vesting Matrix (the "Cap Table") represents the official equity ownership structure of **${fields.companyName || 'RJ Business Solutions, Inc.'}**, as of ${fields.effectiveDate || 'June 25, 2026'}. All share numbers, par values, allocations, and vesting schedules are legally binding and correspond to the Articles of Incorporation and the Founder Equity and Vesting Agreement executed on even date herewith.

---

## SECTION 1: SHARE CAPITAL SUMMARY

*   **Authorized Common Stock**: 10,000,000 shares
*   **Par Value per Share**: $0.0001 USD
*   **Total Issued and Outstanding Common Stock**: 8,500,000 shares
*   **Unissued Common Stock Reserved (ESOP)**: 1,000,000 shares
*   **Unallocated General Reserve**: 500,000 shares

---

## SECTION 2: EQUITY DISTRIBUTION LEDGER

The table below outlines the share holdings, par value capitalization, and ownership percentages of the Company’s founders and reserved pools:

| Shareholder / Reserve | Share Class | Number of Shares | Ownership % (Issued) | Ownership % (Fully Diluted) | Price per Share | Total Capital Paid | Date of Issue | Stock Certificate # |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- | :---: |
| **${fields.founder1Name || 'Rick Jefferson'}** | Common Stock | 6,000,000 | 70.588% | 60.0% | $0.0001 | $600.00 | ${fields.effectiveDate || 'June 25, 2026'} | CS-001 |
| **${fields.founder2Name || 'Anita Menon'}** | Common Stock | 1,500,000 | 17.647% | 15.0% | $0.0001 | $150.00 | ${fields.effectiveDate || 'June 25, 2026'} | CS-002 |
| **${fields.founder3Name || 'Vikram Iyer'}** | Common Stock | 1,000,000 | 11.765% | 10.0% | $0.0001 | $100.00 | ${fields.effectiveDate || 'June 25, 2026'} | CS-003 |
| **Employee Option Pool (ESOP)** | Option Pool | 1,000,000 | N/A | 10.0% | N/A | N/A | Reserved | N/A |
| **General Treasury Reserve** | Common Stock | 500,000 | N/A | 5.0% | N/A | N/A | Unissued | N/A |
| **TOTALS** | | **10,000,000** | **100.00%** | **100.00%** | | **$850.00** | | |

---

## SECTION 3: FOUNDER VESTING MATRIX

All Founder shares are subject to the 48-month vesting schedule with a 12-month cliff (as set forth in Section 2 of the Founder Agreement). The vesting details for each Founder are as follows:

### 3.1 ${fields.founder1Name || 'Rick Jefferson'}
*   **Total Shares**: 6,000,000 shares
*   **Vesting Start Date**: ${fields.effectiveDate || 'June 25, 2026'}
*   **Vesting Cliff Date (25%)**: June 25, 2027 (1,500,000 shares vest)
*   **Monthly Vesting Quantity**: 125,000 shares per month (starting July 25, 2027)
*   **Vesting End Date (100% Vested)**: June 25, 2030

### 3.2 ${fields.founder2Name || 'Anita Menon'}
*   **Total Shares**: 1,500,000 shares
*   **Vesting Start Date**: ${fields.effectiveDate || 'June 25, 2026'}
*   **Vesting Cliff Date (25%)**: June 25, 2027 (375,000 shares vest)
*   **Monthly Vesting Quantity**: 31,250 shares per month (starting July 25, 2027)
*   **Vesting End Date (100% Vested)**: June 25, 2030

### 3.3 ${fields.founder3Name || 'Vikram Iyer'}
*   **Total Shares**: 1,000,000 shares
*   **Vesting Start Date**: ${fields.effectiveDate || 'June 25, 2026'}
*   **Vesting Cliff Date (25%)**: June 25, 2027 (250,000 shares vest)
*   **Monthly Vesting Quantity**: 20,833.33 shares per month (starting July 25, 2027, with final month adjusted to resolve fractional shares)
*   **Vesting End Date (100% Vested)**: June 25, 2030

---

## SECTION 4: SHARE CAPITALIZATION HISTORY AND NOTES

### 4.1 Initial Issuance
On the incorporation date of ${fields.effectiveDate || 'June 25, 2026'}, the initial Board of Directors authorized the issuance of 8,500,000 shares of Common Stock to the founders. The consideration for these shares was paid in cash and through the absolute assignment of all proprietary AI architectures, local edge server code, and brand systems to the Company.

### 4.2 Dilution Protection
All shares issued under this Cap Table are subject to the Shareholders' Agreement dated ${fields.effectiveDate || 'June 25, 2026'}. No stock may be issued that alters the pro-rata voting power or ownership of the Shareholders without complying with the Pre-emptive and Co-Sale rights set forth in the Shareholders' Agreement.

---

### CERTIFICATION OF ACCURANCY

I, **${fields.founder1Name || 'Rick Jefferson'}**, President and Chief Executive Officer of **${fields.companyName || 'RJ Business Solutions, Inc.'}**, hereby certify that this Capitalization Table and Vesting Matrix is a true, complete, and accurate record of the stock ownership of the Corporation as of ${fields.effectiveDate || 'June 25, 2026'}.

\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  
**${fields.founder1Name || 'Rick Jefferson'}**, CEO  
Date: ${fields.effectiveDate || 'June 25, 2026'}
`;
    }
  },
  'esop-agreement': {
    id: 'esop-agreement',
    name: 'Employee Stock Option Plan (ESOP) Agreement',
    description: 'Grant equity incentive options to key early-stage hires with custom cliff and vesting terms.',
    fields: [
      {
            "name": "companyName",
            "label": "Company Name",
            "placeholder": "e.g. RJ Business Solutions, Inc.",
            "defaultVal": "RJ Business Solutions, Inc."
      },
      {
            "name": "effectiveDate",
            "label": "Effective Date",
            "placeholder": "e.g. June 25, 2026",
            "defaultVal": "June 25, 2026"
      },
      {
            "name": "employeeName",
            "label": "Employee Name",
            "placeholder": "e.g. Anita Menon",
            "defaultVal": "Anita Menon"
      },
      {
            "name": "shareCount",
            "label": "Option Share Count",
            "placeholder": "e.g. 100,000",
            "defaultVal": "1,000,000"
      },
      {
            "name": "state",
            "label": "State",
            "placeholder": "e.g. New Mexico",
            "defaultVal": "New Mexico"
      }
],
    fn: (fields: Record<string, string>) => {
      return `# EMPLOYEE STOCK OPTION PLAN (ESOP)

## RJ BUSINESS SOLUTIONS, INC. 2026 EQUITY INCENTIVE PLAN

---

### SECTION 1: PURPOSE, DEFINITIONS, AND ADMINISTRATION

#### 1.1 Purpose
The purpose of the ${fields.companyName || 'RJ Business Solutions, Inc.'} 2026 Equity Incentive Plan (the "Plan") is to attract, retain, and motivate high-caliber employees, officers, directors, consultants, and key advisors of **${fields.companyName || 'RJ Business Solutions, Inc.'}** (the "Company") by providing them with opportunities to acquire a proprietary equity interest in the Company. This alignment of interests encourages long-term dedication, exceptional performance, and value creation for the Company’s shareholders.

#### 1.2 Administration
The Plan shall be administered by the Board of Directors of the Company (the "Board") or a designated Compensation Committee of the Board (the "Administrator"). The Administrator shall have full power and authority to:
1.  Select the eligible individuals to whom Options shall be granted;
2.  Determine the number of Shares to be covered by each Option;
3.  Determine the Option exercise price, vesting schedules, milestones, and expiration dates;
4.  Interpret the provisions of the Plan and any Option Agreement; and
5.  Prescribe, amend, and rescind rules and regulations relating to the Plan.

All decisions, determinations, and interpretations of the Administrator shall be final, binding, and conclusive on all participants.

---

### SECTION 2: SHARE POOL AND ELIGIBILITY

#### 2.1 Shares Reserved under the Plan
The total number of shares of the Company's Common Stock, par value $0.0001 per share (the "Shares"), reserved and authorized for issuance under this Plan is:  
**1,000,000 shares** (representing 10.0% of the Company's authorized capital stock on a fully-diluted basis).

If an Option expires, is canceled, forfeited, or terminated for any reason without being exercised in full, the unpurchased Shares subject to such Option shall return to the share pool and become available for future grants under the Plan.

#### 2.2 Eligibility
Options may be granted to any full-time employee, officer, director, independent contractor, consultant, or key advisor of the Company or its affiliates, as determined by the Administrator.

---

### SECTION 3: TERMS AND CONDITIONS OF OPTIONS

Each Option granted under the Plan shall be evidenced by a written **Stock Option Agreement** between the Company and the participant, which shall incorporate the following terms and conditions:

#### 3.1 Type of Options
The Administrator may grant either:
1.  **Incentive Stock Options (ISOs)**: Intended to qualify under Section 422 of the Internal Revenue Code of 1986, as amended (the "Code"). ISOs may be granted only to employees of the Company.
2.  **Non-Qualified Stock Options (NSOs)**: Not intended to qualify under Section 422 of the Code. NSOs may be granted to employees, directors, consultants, or advisors.

#### 3.2 Exercise Price (Strike Price)
The exercise price per share for an Option shall be determined by the Administrator at the time of grant, subject to the following rules:
1.  The exercise price shall not be less than **one hundred percent (100%)** of the Fair Market Value (the "FMV") of a Share on the date of grant.
2.  In the case of an ISO granted to an employee who owns stock possessing more than ten percent (10%) of the total combined voting power of all classes of stock of the Company, the exercise price shall not be less than **one hundred and ten percent (110%)** of the FMV on the date of grant.
3.  The initial Fair Market Value as of ${fields.effectiveDate || 'June 25, 2026'}, is established by the Board of Directors at **$0.10 per share**.

#### 3.3 Vesting and Exercise Period
Each Option shall vest and become exercisable in accordance with the vesting schedule determined by the Administrator and set forth in the individual Stock Option Agreement. The standard vesting schedule for employees under this Plan is:
1.  **One-Year Cliff**: Twenty-five percent (25%) of the Shares subject to the Option shall vest on the first anniversary of the vesting commencement date.
2.  **Monthly Vesting**: The remaining seventy-five percent (75%) of the Shares shall vest in thirty-six (36) equal monthly installments (2.0833% per month) thereafter, subject to the participant’s Continuous Service to the Company.

#### 3.4 Expiration of Options
No Option shall be exercisable after the expiration of **ten (10) years** from the date of grant. In the case of an ISO granted to a 10% shareholder, the option term shall not exceed **five (5) years** from the date of grant.

---

### SECTION 4: POST-TERMINATION OF SERVICE EXERCISE RULES

In the event a participant's Continuous Service is terminated, their Options may be exercised only to the extent they are vested as of the date of termination, in accordance with the following rules:

#### 4.1 Termination Other Than for Cause, Death, or Disability
If a participant’s service is terminated for any reason other than for Cause (as defined in the Co-Founder Exit Addendum), death, or disability, the participant may exercise their vested Options within **ninety (90) days** following the date of termination. Any unvested portion of the Option shall be canceled immediately upon termination.

#### 4.2 Death or Disability
If a participant’s service is terminated due to their death or permanent disability, the participant (or their personal representative/estate) may exercise their vested Options within **twelve (12) months** following the date of termination.

#### 4.3 Termination for Cause
If a participant’s service is terminated by the Company for **Cause**, all Options held by the participant (whether vested or unvested) shall immediately expire, forfeit, and be canceled as of the date of termination, and the participant shall have no further rights to acquire any Shares under such Options.

---

### SECTION 5: TRANSFERABILITY, ADJUSTMENTS, AND TAXES

#### 5.1 Non-Transferability of Options
Options granted under this Plan are non-transferable and may not be assigned, pledged, or encumbered in any manner, other than by will or the laws of descent and distribution. During the participant's lifetime, an Option may be exercised only by the participant.

#### 5.2 Capital Adjustments
In the event of any stock split, reverse stock split, stock dividend, recapitalization, combination, or reclassification of the Company’s capital stock, the Administrator shall make appropriate and proportionate adjustments to:
1.  The maximum number of Shares reserved under the Plan;
2.  The number of Shares subject to outstanding Options; and
3.  The exercise price per share of outstanding Options.

#### 5.3 Tax Withholding
The Company shall have the right to deduct or withhold from any payment or share transfer under the Plan, or require a participant to remit to the Company, an amount sufficient to satisfy all federal, state, and local income and employment tax withholding requirements arising in connection with the grant, vesting, or exercise of an Option.

---

### SECTION 6: AMENDMENT, TERMINATION, AND GOVERNING LAW

#### 6.1 Amendment and Termination of the Plan
The Board may amend, alter, suspend, or terminate the Plan at any time. However, no amendment or termination may impair the rights of any participant under an outstanding Option without the participant’s prior written consent. Shareholder approval shall be obtained for any amendment to the extent required by applicable laws or tax regulations.

#### 6.2 Governing Law and Dispute Resolution
This Plan, and all Stock Option Agreements executed hereunder, shall be governed by, and construed in accordance with, the laws of the State of ${fields.state || 'New Mexico'}, without regard to its conflict of laws principles. Any dispute arising out of or in connection with this Plan shall be settled exclusively by binding arbitration in **Tijeras, ${fields.state || 'New Mexico'}**, administered by the American Arbitration Association in accordance with its Commercial Arbitration Rules.

---

## EXECUTION AND ADOPTION OF THE PLAN

This Employee Stock Option Plan is hereby adopted, approved, and established by the Board of Directors of **${fields.companyName || 'RJ Business Solutions, Inc.'}** on this **25th day of June, 2026**.

\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  
**${fields.founder1Name || ''}**, CEO & Director  
${fields.companyName || 'RJ Business Solutions, Inc.'}

\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  
**${fields.founder2Name || ''}**, CTO & Director  
${fields.companyName || 'RJ Business Solutions, Inc.'}

\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  
**${fields.founder3Name || ''}**, COO & Director  
${fields.companyName || 'RJ Business Solutions, Inc.'}
`;
    }
  },
  'exit-addendum': {
    id: 'exit-addendum',
    name: 'Founder Exit Addendum',
    description: 'Define Good Leaver/Bad Leaver classifications, transition handovers, and stock buyback protocols.',
    fields: [
      {
            "name": "companyName",
            "label": "Company Name",
            "placeholder": "e.g. RJ Business Solutions, Inc.",
            "defaultVal": "RJ Business Solutions, Inc."
      },
      {
            "name": "effectiveDate",
            "label": "Effective Date",
            "placeholder": "e.g. June 25, 2026",
            "defaultVal": "June 25, 2026"
      },
      {
            "name": "founder1Name",
            "label": "Founder 1 Name",
            "placeholder": "e.g. Rick Jefferson",
            "defaultVal": "Rick Jefferson"
      },
      {
            "name": "founder2Name",
            "label": "Founder 2 Name",
            "placeholder": "e.g. Anita Menon",
            "defaultVal": "Anita Menon"
      },
      {
            "name": "state",
            "label": "State of Incorporation",
            "placeholder": "e.g. New Mexico",
            "defaultVal": "New Mexico"
      }
],
    fn: (fields: Record<string, string>) => {
      return `# ADDENDUM TO FOUNDER AGREEMENT: CO-FOUNDER EXIT CLOUSE & BUYBACK PROTOCOLS

This Addendum to the Founder Equity and Vesting Agreement (the "Addendum") is entered into as of ${fields.effectiveDate || 'June 25, 2026'} (the "Effective Date"), by and among **${fields.companyName || 'RJ Business Solutions, Inc.'}** (the "Company") and its Founders, **${fields.founder1Name || 'Rick Jefferson'}**, **${fields.founder2Name || 'Anita Menon'}**, and **${fields.founder3Name || ''}**.

### RECITALS

**WHEREAS**, the Parties entered into a Founder Equity and Vesting Agreement on even date herewith (the "Founder Agreement");

**WHEREAS**, the Founders recognize that a Founder may depart the Company, either voluntarily or involuntarily, during the early growth phase of the business;

**WHEREAS**, the Founders desire to establish clear, fair, and legally binding protocols governing the departure of a Founder (an "Exit Event"), including the classification of such departing Founder and the Company's buyback rights with respect to both vested and unvested shares, to protect the continuity, value, and IP integrity of the Company.

**NOW, THEREFORE**, in consideration of the mutual covenants contained herein, the Parties agree as follows:

---

## SECTION 1: CLASSIFICATION OF DEPARTING FOUNDERS

Upon the termination of a Founder's Continuous Service with the Company, the departing Founder shall be classified by the Board of Directors (excluding the departing Founder, if applicable) as either a "Good Leaver" or a "Bad Leaver" in accordance with the criteria set forth below.

### 1.1 Good Leaver Criteria
A departing Founder shall be classified as a "Good Leaver" if their Continuous Service is terminated due to:
1.  **Death or Permanent Disability**: The Founder’s death or physical/mental incapacity preventing them from performing their core duties for a consecutive period of ninety (90) days.
2.  **Termination Without Cause**: The termination of the Founder’s employment or service by the Company without "Cause" (as defined in Section 1.3).
3.  **Resignation for Good Reason**: The Founder’s voluntary resignation following a material reduction in their responsibilities, duties, or compensation, or a material breach of the Founder Agreement or this Addendum by the Company.
4.  **Mutual Agreement**: A voluntary departure approved in writing by a majority vote of the remaining members of the Board of Directors, expressing that the departure is in the best interest of the Company and should be classified as a Good Leaver event.

### 1.2 Bad Leaver Criteria
A departing Founder shall be classified as a "Bad Leaver" if their Continuous Service is terminated due to:
1.  **Termination for Cause**: The termination of the Founder's service by the Company for "Cause" (as defined in Section 1.3).
2.  **Voluntary Resignation Without Consent**: The Founder’s voluntary resignation or abandonment of their role without the prior written consent of the Board, or prior to the second (2nd) anniversary of the Effective Date.
3.  **Material Breach**: The Founder's material breach of any provision of this Addendum, the Founder Agreement, the Proprietary Information and Inventions Agreement (PIIA), or the Company’s Bylaws, which breach is not cured within fifteen (15) business days of written notice.
4.  **Failure of Duty**: Continual and willful neglect of reasonable duties assigned by the Board, or a refusal to perform duties, which failure is not cured within fifteen (15) business days of written notice.

### 1.3 Definition of "Cause"
For purposes of this Addendum and the Founder Agreement, "Cause" shall mean:
1.  The commission of any act of fraud, embezzlement, or material dishonesty against the Company;
2.  A conviction of, or plea of guilty or nolo contendere to, any felony or crime involving moral turpitude;
3.  Intentional misconduct or gross negligence that causes material financial or reputational harm to the Company; or
4.  A material violation of federal or state securities laws, or any local, state, or federal law regulating corporate fiduciary duties.

---

## SECTION 2: SHARE TREATMENT AND BUYBACK RIGHTS

The classification of a departing Founder directly determines the Company’s rights and terms for repurchasing the departing Founder’s Shares.

### 2.1 Treatment of Shares for a Good Leaver
If a Founder is classified as a "Good Leaver":
1.  **Vested Shares**: The Good Leaver shall be entitled to retain one hundred percent (100%) of their vested Shares. However, the Company (and then the remaining Founders, on a pro-rata basis) shall have a Right of First Refusal (ROFR) to purchase any of these vested Shares if the departing Founder proposes to transfer them to a third party.
2.  **Unvested Shares**: The Company shall have the right to repurchase all of the Good Leaver's unvested Shares at the original purchase price paid ($0.0001 per share) within ninety (90) days of the date of termination.

### 2.2 Treatment of Shares for a Bad Leaver
If a Founder is classified as a "Bad Leaver":
1.  **Unvested Shares**: The Company shall have the right to repurchase all of the Bad Leaver’s unvested Shares at the original purchase price paid ($0.0001 per share) within ninety (90) days of the date of termination.
2.  **Vested Shares Penalty**: To protect the Company from malicious or premature abandonment of the project, the Company shall also have the option, in its sole and absolute discretion, to repurchase all or any portion of the Bad Leaver’s **vested** Shares. The repurchase price for such vested Shares shall be equal to the **nominal book value** of the Shares ($0.0001 per share), rather than Fair Market Value, and shall be paid within one hundred and eighty (180) days of the date of termination.

---

## SECTION 3: NOTICE PERIODS, HANDOVER, AND TRANSITION

### 3.1 Notice of Resignation
In the event of a voluntary resignation, a Founder must provide the Company and the remaining Board members with at least ninety (90) days' prior written notice of their intent to resign.

### 3.2 Handover Period
During the ninety (90) day notice period (or any transition period designated by the Board not to exceed ninety days), the departing Founder agrees to:
1.  Execute all assignments, filings, or transfers necessary to ensure that the Company holds clear, unencumbered title to any intellectual property created by the Founder;
2.  Exhaustively document all code, credentials, administrative accounts, architecture designs, database schemas, and API keys developed or maintained by the Founder; and
3.  Devote their full business time and best efforts to training the remaining Founders, employees, or contractors of the Company to assume their responsibilities.

### 3.3 Holdback of Purchase Price
To ensure a clean, complete, and cooperative transition, the Company shall have the right to hold back twenty-five percent (25%) of any share repurchase payment due to a departing Founder until the Board certifies that a complete and satisfactory handover has been executed by the departing Founder.

---

## SECTION 4: MISCELLANEOUS AND LEGAL PROVISIONS

### 4.1 Survival of Restrictive Covenants
The departing Founder’s obligations under Section 5 (Confidentiality, Non-Compete, and Non-Solicitation) of the Founder Agreement shall survive any Exit Event and shall remain in full force and effect for twenty-four (22) months following the date of termination.

### 4.2 Governing Law and Dispute Resolution
This Addendum shall be governed by and construed in accordance with the laws of the State of ${fields.state || 'New Mexico'}. Any dispute, claim, or controversy arising out of or relating to this Addendum, including the Board's classification of a Founder as a Good or Bad Leaver, shall be resolved exclusively by binding arbitration in **Tijeras, ${fields.state || 'New Mexico'}**, administered by the American Arbitration Association in accordance with its Commercial Arbitration Rules.

---

### IN WITNESS WHEREOF, the Parties have executed this Addendum to the Founder Agreement as of the date first written above.

#### COMPANY:
**${fields.companyName || 'RJ Business Solutions, Inc.'}**

By: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  
Name: ${fields.founder1Name || 'Rick Jefferson'}  
Title: Founder & CEO  
Date: ${fields.effectiveDate || 'June 25, 2026'}

#### FOUNDERS:

\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  
**${fields.founder1Name || 'Rick Jefferson'}**, Individually  
Date: ${fields.effectiveDate || 'June 25, 2026'}

\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  
**${fields.founder2Name || 'Anita Menon'}**, Individually  
Date: ${fields.effectiveDate || 'June 25, 2026'}

\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  
**${fields.founder3Name || ''}**, Individually  
Date: ${fields.effectiveDate || 'June 25, 2026'}
`;
    }
  },
  'nda': {
    id: 'nda',
    name: 'Mutual Non-Disclosure Agreement (NDA)',
    description: 'Protect proprietary technology and business data during strategic discussions and integrations.',
    fields: [
      {
            "name": "companyName",
            "label": "Company Name",
            "placeholder": "e.g. RJ Business Solutions, Inc.",
            "defaultVal": "RJ Business Solutions, Inc."
      },
      {
            "name": "effectiveDate",
            "label": "Effective Date",
            "placeholder": "e.g. June 25, 2026",
            "defaultVal": "June 25, 2026"
      },
      {
            "name": "counterpartyName",
            "label": "Counterparty Company",
            "placeholder": "e.g. Apex Systems Integration, LLC",
            "defaultVal": "Apex Systems Integration, LLC"
      },
      {
            "name": "counterpartyAddress",
            "label": "Counterparty Address",
            "placeholder": "e.g. 100 Gold Ave SW, Albuquerque, NM 87102",
            "defaultVal": "100 Gold Ave SW, Albuquerque, New Mexico 87102"
      },
      {
            "name": "purpose",
            "label": "NDA Purpose",
            "placeholder": "e.g. AI frameworks discussions",
            "defaultVal": "advanced agentic AI coding frameworks, local edge orchestration gateways, and customized operational software suites"
      },
      {
            "name": "state",
            "label": "Governing State",
            "placeholder": "e.g. New Mexico",
            "defaultVal": "New Mexico"
      }
],
    fn: (fields: Record<string, string>) => {
      return `# MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement (the "Agreement") is entered into as of ${fields.effectiveDate || 'June 25, 2026'} (the "Effective Date"), by and between:

1.  **${fields.companyName || 'RJ Business Solutions, Inc.'}**, a corporation organized under the laws of the State of ${fields.state || 'New Mexico'}, with its principal place of business at ${fields.founder1Address || ''} ("${fields.companyName || 'RJ Business Solutions, Inc.'}"); and
2.  **Apex Systems Integration, LLC**, a limited liability company organized under the laws of the State of ${fields.state || 'New Mexico'}, with its principal place of business at 100 Gold Ave SW, Albuquerque, ${fields.state || 'New Mexico'} 87102 ("Apex").

${fields.companyName || 'RJ Business Solutions, Inc.'} and Apex are individually referred to as a "Party" and collectively as the "Parties."

### RECITALS

**WHEREAS**, the Parties wish to engage in discussions regarding a potential business relationship, joint venture, technical integration, or transaction of mutual interest involving advanced agentic AI coding frameworks, local edge orchestration gateways, and customized operational software suites (the "Purpose"); and

**WHEREAS**, in connection with the Purpose, each Party may disclose to the other Party certain proprietary, technical, financial, or business information that is confidential and highly sensitive.

**NOW, THEREFORE**, in consideration of the mutual covenants, terms, and conditions set forth herein, the Parties agree as follows:

---

## SECTION 1: DEFINITION OF CONFIDENTIAL INFORMATION

### 1.1 Scope of Confidential Information
"Confidential Information" means any and all information disclosed by or on behalf of one Party (the "Disclosing Party") to the other Party (the "Receiving Party") in connection with the Purpose, whether prior to, on, or after the Effective Date, which is:
1.  Marked or designated as "confidential," "proprietary," or with a similar legend;
2.  Disclosed orally, visually, or in any other intangible form, and identified as confidential at the time of disclosure; or
3.  By its nature or the circumstances surrounding its disclosure, reasonably understood to be confidential or proprietary, regardless of whether it is marked or designated as such.

### 1.2 Core Examples
Confidential Information includes, without limitation:
1.  **Technical Data**: Software code, algorithms, database schemas, API configurations, AI model architectures, weights, system handbooks, and developer manuals.
2.  **Business Data**: Customer lists, pricing strategies, marketing plans, financial projections, business models, and administrative passwords.
3.  **Intellectual Property**: Inventions, trade secrets, trademarks, patents, designs, and patent applications.

---

## SECTION 2: EXCLUSIONS FROM CONFIDENTIAL INFORMATION

Confidential Information does not include any information that the Receiving Party can demonstrate, by written records:
1.  Is or becomes publicly known through no breach of this Agreement by the Receiving Party;
2.  Was already in the Receiving Party’s lawful possession prior to disclosure by the Disclosing Party, without any obligation of confidentiality;
3.  Is lawfully obtained by the Receiving Party from a third party who had the legal right to disclose such information without restriction; or
4.  Is independently developed by the Receiving Party’s employees or agents who had no access to or reliance upon the Disclosing Party's Confidential Information.

---

## SECTION 3: OBLIGATIONS OF THE RECEIVING PARTY

The Receiving Party agrees to protect and safeguard all Confidential Information of the Disclosing Party in accordance with the following terms:

### 3.1 Standard of Care
The Receiving Party shall use at least the same degree of care to protect the Disclosing Party's Confidential Information as it uses to protect its own highly sensitive confidential information, but in no event less than a reasonable standard of care.

### 3.2 Restricted Use
The Receiving Party shall use the Disclosing Party’s Confidential Information **solely** for the Purpose defined in this Agreement and for no other purpose whatsoever. The Receiving Party shall not use the Confidential Information to reverse engineer, decompile, or disassemble any software, code, or systems provided by the Disclosing Party.

### 3.3 Restricted Access
The Receiving Party shall restrict access to the Disclosing Party’s Confidential Information to those of its directors, officers, employees, legal counsel, or financial advisors (collectively, "Representatives") who:
1.  Have a strict "need-to-know" such information to assist in evaluating or executing the Purpose;
2.  Are informed of the confidential nature of the Confidential Information; and
3.  Are bound by written confidentiality agreements or professional ethical obligations no less restrictive than the terms of this Agreement.

The Receiving Party shall be liable for any breach of this Agreement by its Representatives.

---

## SECTION 4: COMPELLED LEGAL DISCLOSURE

If the Receiving Party or any of its Representatives is required by applicable law, regulation, subpoena, or court order to disclose any Confidential Information, the Receiving Party shall:
1.  Provide the Disclosing Party with prompt written notice of such requirement (to the extent legally permissible) so that the Disclosing Party may seek a protective order or other appropriate remedy;
2.  Cooperate with the Disclosing Party, at the Disclosing Party's expense, in seeking such protection; and
3.  Disclose only that portion of the Confidential Information that is legally required to be disclosed, and use best efforts to ensure that confidential treatment is accorded to the disclosed information.

---

## SECTION 5: TERM AND TERMINATION

### 5.1 Term of Agreement
This Agreement shall commence on the Effective Date and shall continue in full force and effect for a period of **two (2) years** from the Effective Date, unless terminated earlier by either Party upon thirty (30) days' written notice.

### 5.2 Survival of Obligations
The confidentiality obligations set forth herein shall survive the expiration or termination of this Agreement as follows:
1.  **Trade Secrets**: For any Confidential Information that constitutes a trade secret under applicable law, the obligations of confidentiality and restricted use shall survive perpetually or for so long as such information remains a trade secret.
2.  **General Confidential Information**: For all other Confidential Information, the obligations shall survive for a period of **five (5) years** following the date of disclosure.

### 5.3 Return or Destruction of Materials
Within fifteen (15) days of the written request of the Disclosing Party, or upon the termination of this Agreement, the Receiving Party shall, at the Disclosing Party’s option:
1.  Return all physical copies, documents, and media containing Confidential Information; or
2.  Securely destroy all such copies and media, and certify such destruction in writing to the Disclosing Party.

---

## SECTION 6: DISPUTE RESOLUTION AND GOVERNING LAW

### 6.1 Governing Law
This Agreement, and all claims, disputes, or controversies arising out of or relating to this Agreement, shall be governed by, and construed in accordance with, the laws of the State of ${fields.state || 'New Mexico'}, without regard to its conflict of laws principles.

### 6.2 Binding Arbitration
Any dispute, controversy, or claim arising out of, or relating to, this Agreement, including its formation, validity, breach, or termination, shall be settled exclusively by binding arbitration administered by the American Arbitration Association ("AAA") in accordance with its Commercial Arbitration Rules:
1.  **Venue**: The physical seat and venue of the arbitration shall be **Tijeras, ${fields.state || 'New Mexico'}**.
2.  **Tribunal**: The arbitration shall be conducted before a single neutral arbitrator appointed in accordance with AAA rules.
3.  **Award**: The arbitrator's award shall be final, binding, and enforceable in any court of competent jurisdiction.
4.  **Injunctions**: Notwithstanding the foregoing, either Party shall have the right to seek preliminary injunctive relief or a temporary restraining order in any court of competent jurisdiction located in Bernalillo County or the State of ${fields.state || 'New Mexico'} to prevent irreparable harm or a continuous breach of this Agreement, pending the appointment of the arbitrator.

---

## SECTION 7: MISCELLANEOUS PROVISIONS

### 7.1 No License or Ownership
Nothing in this Agreement shall be construed as granting, conveying, or transferring to the Receiving Party any license, title, copyright, patent, trademark, or other intellectual property right in or to the Disclosing Party’s Confidential Information.

### 7.2 Entire Agreement
This Agreement constitutes the entire agreement between the Parties regarding the subject matter hereof and supersedes all prior or contemporaneous agreements, understandings, discussions, or representations, whether oral or written.

### 7.3 Severability
If any provision of this Agreement is held to be invalid, illegal, or unenforceable, the validity, legality, and enforceability of the remaining provisions shall not in any way be affected or impaired thereby.

---

### IN WITNESS WHEREOF, the Parties have executed this Mutual Non-Disclosure Agreement as of the Effective Date.

#### DISCLOSING / RECEIVING PARTY:
**${fields.companyName || 'RJ Business Solutions, Inc.'}**

By: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  
Name: ${fields.founder1Name || ''}  
Title: Founder & CEO  
Date: ${fields.effectiveDate || 'June 25, 2026'}

#### DISCLOSING / RECEIVING PARTY:
**Apex Systems Integration, LLC**

By: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  
Name: David Vance  
Title: Managing Director  
Date: ${fields.effectiveDate || 'June 25, 2026'}
`;
    }
  },
  'ip-assignment': {
    id: 'ip-assignment',
    name: 'Intellectual Property Assignment (PIIA)',
    description: 'Ensure all pre-incorporation and post-incorporation inventions are fully assigned to the corporation.',
    fields: [
      {
            "name": "companyName",
            "label": "Company Name",
            "placeholder": "e.g. RJ Business Solutions, Inc.",
            "defaultVal": "RJ Business Solutions, Inc."
      },
      {
            "name": "effectiveDate",
            "label": "Effective Date",
            "placeholder": "e.g. June 25, 2026",
            "defaultVal": "June 25, 2026"
      },
      {
            "name": "founder1Name",
            "label": "Assignor Name",
            "placeholder": "e.g. Rick Jefferson",
            "defaultVal": "Rick Jefferson"
      },
      {
            "name": "state",
            "label": "Governing State",
            "placeholder": "e.g. New Mexico",
            "defaultVal": "New Mexico"
      }
],
    fn: (fields: Record<string, string>) => {
      return `# PROPRIETARY INFORMATION AND INVENTIONS AGREEMENT (PIIA)

This Proprietary Information and Inventions Agreement (the "Agreement") is entered into as of ${fields.effectiveDate || 'June 25, 2026'}, by and between:

1.  **${fields.companyName || 'RJ Business Solutions, Inc.'}**, a ${fields.state || 'New Mexico'} corporation, with its principal place of business at ${fields.founder1Address || ''} (the "Company"); and
2.  **Marcus Sterling**, residing at 8904 Montgomery Blvd NE, Albuquerque, ${fields.state || 'New Mexico'} 87111 (the "Employee").

The Company and the Employee are collectively referred to as the "Parties" and individually as a "Party."

### RECITALS

**WHEREAS**, the Company is engaged in the development, deployment, and licensing of advanced agentic AI coding suites, local edge orchestration gateways, and customized business automation software solutions;

**WHEREAS**, in the course of the Employee’s employment with the Company, the Employee will have access to, receive, and contribute to highly confidential information, trade secrets, proprietary technical architectures, and developer code; and

**WHEREAS**, a core condition of the Employee’s employment and compensation is the Employee’s agreement to protect the Company's proprietary information and to assign all discoveries, inventions, code, designs, and developments to the Company.

**NOW, THEREFORE**, in consideration of the Employee’s employment or continued employment with the Company, the compensation paid to the Employee, and other good and valuable consideration, the Parties agree as follows:

---

## SECTION 1: CONFIDENTIALITY OBLIGATIONS

### 1.1 Maintenance of Confidentiality
The Employee agrees to hold in the strictest confidence, and not to use (except for the exclusive benefit of the Company during their employment) or disclose to any person, firm, corporation, or entity without the prior written authorization of the Board of Directors of the Company, any Proprietary Information of the Company.

### 1.2 Definition of "Proprietary Information"
"Proprietary Information" means any and all technical, business, financial, or other information of the Company that is not generally known to the public, including, but not limited to:
1.  **Technical Assets**: Software code (source and object code), algorithms, data models, AI weights, system handbooks, database structures, passwords, development tools, and API credentials.
2.  **Business Assets**: Marketing plans, customer lists, pricing metrics, cost structures, investor pitch decks, financial models, and strategic growth plans.
3.  **Third-Party Data**: Confidential information received by the Company from its clients, partners, vendors, or prospective investors under an obligation of confidentiality.

### 1.3 Exclusion
Proprietary Information shall not include any information that is or becomes publicly known through no wrongful act or omission of the Employee.

---

## SECTION 2: ASSIGNMENT OF INVENTIONS AND DEVELOPMENTS

### 2.1 Ownership of Inventions
The Employee agrees that all right, title, and interest in and to any and all software, code, algorithms, concepts, systems, designs, databases, trade secrets, patents, copyrights, and other intellectual property created, conceived, developed, or reduced to practice by the Employee, either individually or jointly with others, during the term of their employment with the Company, which:
1.  Relate directly or indirectly to the business, research, or proposed products of the Company;
2.  Result from or are suggested by any work performed by the Employee for or on behalf of the Company; or
3.  Are developed using the Company’s equipment, facilities, networks, or proprietary resources;

shall be the sole and exclusive property of the Company (collectively referred to as "Inventions").

### 2.2 Work Made for Hire
The Employee acknowledges and agrees that all copyrightable works created by the Employee within the scope of their employment are "works made for hire" under the United States Copyright Act (17 U.S.C. § 101 et seq.) and that the Company is the author and owner of such copyrights from the moment of creation. To the extent any such work is deemed not to be a work made for hire, the Employee hereby irrevocably assigns, transfers, and conveys all right, title, and interest in such copyrights to the Company.

### 2.3 Prior Inventions Exclusion
The Employee has listed on **Exhibit A** (attached hereto) a complete list of all inventions, software, and designs made or conceived by the Employee prior to their employment with the Company (collectively, "Prior Inventions") which are owned by the Employee and which are excluded from this Agreement. If no such list is attached, or if the list is left blank, the Employee represents and warrants that there are **no Prior Inventions**.

### 2.4 License for Incorporated Prior Inventions
If, in the course of their employment, the Employee incorporates any Prior Invention into a Company product, process, or system, the Employee hereby grants the Company a perpetual, irrevocable, worldwide, royalty-free, fully paid-up, non-exclusive, sublicensable, and transferable license to use, reproduce, modify, distribute, and perform such Prior Invention as part of the Company's business.

---

## SECTION 3: ASSISTANCE AND POWER OF ATTORNEY

### 3.1 Maintenance of Records
The Employee agrees to keep complete, accurate, and written records of all Inventions made or conceived during their employment, which records shall be the sole property of the Company and shall be surrendered to the Company upon request or upon termination of employment.

### 3.2 Execution of Patent and Copyright Documents
The Employee agrees to assist the Company, at the Company’s expense, in every reasonable way to secure, perfect, register, and maintain the Company's intellectual property rights in the Inventions, including executing all patent applications, copyright registrations, and assignment forms, during and after their employment.

### 3.3 Power of Attorney
If the Company is unable, after reasonable effort, to secure the Employee’s signature on any document necessary to apply for or prosecute any patent, copyright, or trademark application associated with an Invention (due to the Employee’s physical or mental incapacity, or unavailability), the Employee hereby **irrevocably appoints the Company and its duly authorized officers as the Employee’s attorney-in-fact** to act for and on the Employee’s behalf to execute, verify, and file such applications with the same legal force and effect as if executed by the Employee.

---

## SECTION 4: RETURN OF COMPANY PROPERTY

Upon the termination of their employment for any reason, or upon the request of the Company at any time, the Employee shall immediately return to the Company all physical and digital property, documents, notebooks, records, equipment, laptop computers, mobile devices, flash drives, and software keys containing or relating to any Proprietary Information or Inventions of the Company, and shall not retain any copies or summaries thereof.

---

## SECTION 5: GOVERNING LAW AND ARBITRATION

### 5.1 Governing Law
This Agreement, and all claims or causes of action arising out of or relating to it, shall be governed by and construed in accordance with the laws of the State of ${fields.state || 'New Mexico'}, without regard to conflict of laws principles.

### 5.2 Binding Arbitration
Any dispute, controversy, or claim arising out of or relating to this Agreement, including its execution, breach, or enforceability, shall be settled exclusively by binding arbitration administered by the American Arbitration Association ("AAA") under its Commercial Arbitration Rules:
1.  **Venue**: The physical seat and venue of the arbitration shall be **Tijeras, ${fields.state || 'New Mexico'}**.
2.  **Tribunal**: One (1) neutral arbitrator.
3.  **Prevailing Party Fees**: The prevailing Party shall be entitled to recover its reasonable attorneys' fees, expert fees, and arbitration costs.

---

## SECTION 6: MISCELLANEOUS PROVISIONS

### 6.1 Entire Agreement
This Agreement constitutes the entire agreement between the Parties regarding proprietary information and inventions, and supersedes all prior agreements or discussions. It may not be amended except in a writing signed by both Parties.

### 6.2 Severability
If any provision of this Agreement is held to be invalid or unenforceable, such provision shall be modified to the minimum extent necessary to make it valid and enforceable, and the remaining provisions shall remain in full force and effect.

---

### IN WITNESS WHEREOF, the Parties have executed this Proprietary Information and Inventions Agreement as of the date first written above.

#### COMPANY:
**${fields.companyName || 'RJ Business Solutions, Inc.'}**

By: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  
Name: ${fields.founder1Name || 'Rick Jefferson'}  
Title: Founder & CEO  
Date: ${fields.effectiveDate || 'June 25, 2026'}

#### EMPLOYEE:

\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  
**Marcus Sterling**, Senior AI Engineer  
Date: ${fields.effectiveDate || 'June 25, 2026'}

---

## EXHIBIT A: PRIOR INVENTIONS LIST

The following is a complete and exclusive list of all Prior Inventions owned or controlled by the Employee that are excluded from the scope of this Agreement:

*   **Prior Invention 1**: **NONE**
*   **Prior Invention 2**: **NONE**

\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  
Acknowledged by: **Marcus Sterling**  
Date: ${fields.effectiveDate || 'June 25, 2026'}
`;
    }
  },
  'trademark-registration': {
    id: 'trademark-registration',
    name: 'Trademark Registration Application Template',
    description: 'Prepare corporate brand names and logo marks for federal and state trademark protection.',
    fields: [
      {
            "name": "companyName",
            "label": "Company Name",
            "placeholder": "e.g. RJ Business Solutions, Inc.",
            "defaultVal": "RJ Business Solutions, Inc."
      },
      {
            "name": "effectiveDate",
            "label": "Effective Date",
            "placeholder": "e.g. June 25, 2026",
            "defaultVal": "June 25, 2026"
      },
      {
            "name": "trademarkName",
            "label": "Trademark Name",
            "placeholder": "e.g. NeuronEdge Labs",
            "defaultVal": "NeuronEdge Labs"
      },
      {
            "name": "state",
            "label": "State",
            "placeholder": "e.g. New Mexico",
            "defaultVal": "New Mexico"
      }
],
    fn: (fields: Record<string, string>) => {
      return `# UNITED STATES PATENT AND TRADEMARK OFFICE (USPTO)
# TRADEMARK REGISTRATION APPLICATION PACKAGE

---

## SECTION 1: TRADEMARK APPLICATION FORM

### APPLICANT INFORMATION
*   **Legal Entity Name**: ${fields.companyName || 'RJ Business Solutions, Inc.'}
*   **State of Incorporation**: ${fields.state || 'New Mexico'}, United States of America
*   **Principal Place of Business**: ${fields.founder1Address || ''}
*   **Contact Email**: support@rjbusinesssolutions.org
*   **Contact Phone**: +1 (414) 430-4277

---

### THE MARK
*   **Literal Element**: **NEURONEDGE LABS**
*   **Mark Type**: Trademark / Service Mark
*   **Drawing Type**: Standard Character Mark (The applicant claims the literal elements "NEURONEDGE LABS" in standard characters without claim to any particular font style, size, or color).
*   **Alternative Design Element (Stylized Logo)**: A stylized representation of interconnected neural nodes forming a continuous geometric block, colored in primary blue (#0A66FF) and deep navy (#003B8F) on an off-white background, with the literal text "NEURONEDGE LABS" positioned to the right or below the graphic element.

---

### CLASSIFICATION OF GOODS AND SERVICES

The applicant requests registration of the mark in the following International Classes:

#### International Class 009 (Computer Software and Hardware)
*   **Description of Goods**: Downloadable computer software for advanced agentic artificial intelligence (AI) model orchestration; downloadable local edge orchestration gateway binaries; downloadable developer utility software for code completion, optimization, and sovereign system routing; software containers containing pre-trained deep learning and machine learning models for local desktop, edge server, and cloud flare environments.

#### International Class 042 (Software as a Service - SaaS & Technology Services)
*   **Description of Services**: Software as a Service (SaaS) featuring platforms for local and cloud-based AI agent execution; custom software development and systems integration services; cloud computing consulting; computer programming; hosting of software applications for edge servers and serverless environments; technical advisory services in the fields of artificial intelligence, machine learning, and cybersecurity.

---

### BASIS FOR FILING AND USE IN COMMERCE

*   **Filing Basis (Section 1(a))**: Use in Commerce (The applicant is using the mark in commerce on or in connection with the identified goods and services).
*   **Date of First Use Anywhere**: **May 21, 2026**
*   **Date of First Use in Commerce**: **${fields.effectiveDate || 'June 25, 2026'}**
*   **Specimen of Use**: Attached as Exhibit A (showing the literal element "NEURONEDGE LABS" clearly displayed on the software installer gateway, the user interface dashboard of the local edge worker, and the official landing website at \`https://rickjeffersonsolutions.com\`).

---

### DECLARATION AND SIGNATURE

The undersigned, being hereby warned that willful false statements and the like are punishable by fine or imprisonment, or both, under 18 U.S.C. § 1001, and that such willful false statements may jeopardize the validity of the application or any registration resulting therefrom, declares that:
1.  He is authorized to execute this application on behalf of the applicant corporation;
2.  He believes the applicant to be the owner of the trademark/service mark sought to be registered;
3.  To the best of his knowledge and belief, no other person, firm, corporation, or association has the right to use the mark in commerce, either in the identical form thereof or in such near resemblance thereto as to be likely, when used on or in connection with the goods/services of such other person, to cause confusion, or to cause mistake, or to deceive; and
4.  All statements made of his own knowledge are true, and all statements made on information and belief are believed to be true.

\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  
**${fields.founder1Name || ''}**, President & CEO  
${fields.companyName || 'RJ Business Solutions, Inc.'}  
Date: ${fields.effectiveDate || 'June 25, 2026'}

---

## SECTION 2: EXHIBIT A - SPECIMEN OF COMMERCE USE

### 2.1 Description of Specimen 1: Web Interface Header
*   **Context**: Screen capture of the live cloud SaaS login and registration portal.
*   **Visual Proof**: The literal element **NEURONEDGE LABS™** is prominently displayed in the top-left navigation bar of the user interface header, positioned next to the logo. The footer contains: "© 2026 ${fields.companyName || 'RJ Business Solutions, Inc.'} All rights reserved. 1342 NM 333, Tijeras, NM 87059."

### 2.2 Description of Specimen 2: Developer Console Terminal Output
*   **Context**: Execution logs of the command line interface (CLI) for the local gateway server.
*   **Terminal Output Text**:
    \`\`\`text
    ====================================================================
    NEURONEDGE LABS — SOVEREIGN LOCAL EDGE GATEWAY v4.0.0
    A Product of ${fields.companyName || 'RJ Business Solutions, Inc.'}
    Running on: http://127.0.0.1:8787
    ====================================================================
    [00:01:05] Initializing local orchestrator (nemesis-ultra)... Success.
    [00:01:06] Loading 225 developer skills... 100% Loaded.
    \`\`\`

---

## SECTION 3: MAINTENANCE AND RENEWAL GUIDELINES

Once registration is granted by the USPTO, the applicant must file the following maintenance documents to keep the registration active:
1.  **Section 8 Declaration of Continued Use**: Must be filed between the 5th and 6th years after the registration date.
2.  **Section 8 & 9 Renewal Application**: Must be filed every 10 years from the registration date (specifically, the first renewal must be filed between the 9th and 10th years following registration).
`;
    }
  },
  'employment-agreement': {
    id: 'employment-agreement',
    name: 'Executive Employment Agreement',
    description: 'Define compensation, duties, benefits, and protective covenants for senior corporate executives.',
    fields: [
      {
            "name": "companyName",
            "label": "Company Name",
            "placeholder": "e.g. RJ Business Solutions, Inc.",
            "defaultVal": "RJ Business Solutions, Inc."
      },
      {
            "name": "effectiveDate",
            "label": "Effective Date",
            "placeholder": "e.g. June 25, 2026",
            "defaultVal": "June 25, 2026"
      },
      {
            "name": "employeeName",
            "label": "Employee Name",
            "placeholder": "e.g. Rick Jefferson",
            "defaultVal": "Rick Jefferson"
      },
      {
            "name": "jobTitle",
            "label": "Executive Job Title",
            "placeholder": "e.g. Chief Executive Officer",
            "defaultVal": "Founder & Chief Executive Officer"
      },
      {
            "name": "salary",
            "label": "Annual Salary",
            "placeholder": "e.g. $180,000",
            "defaultVal": "$180,000"
      },
      {
            "name": "state",
            "label": "Governing State",
            "placeholder": "e.g. New Mexico",
            "defaultVal": "New Mexico"
      }
],
    fn: (fields: Record<string, string>) => {
      return `# EXECUTIVE & TECHNICAL EMPLOYMENT AGREEMENT

This Executive & Technical Employment Agreement (the "Agreement") is entered into as of ${fields.effectiveDate || 'June 25, 2026'}, by and between:

1.  **${fields.companyName || 'RJ Business Solutions, Inc.'}**, a ${fields.state || 'New Mexico'} corporation, with its principal place of business at ${fields.founder1Address || ''} (the "Company"); and
2.  **Marcus Sterling**, residing at 8904 Montgomery Blvd NE, Albuquerque, ${fields.state || 'New Mexico'} 87111 (the "Employee").

The Company and the Employee are collectively referred to as the "Parties" and individually as a "Party."

### RECITALS

**WHEREAS**, the Company is engaged in the business of designing, building, and deploying advanced agentic AI coding frameworks, local edge orchestration gateways, and custom operational software suites under the brand ${fields.companyName || 'RJ Business Solutions, Inc.'}; and

**WHEREAS**, the Company desires to employ the Employee as its **Senior AI Engineer**, and the Employee desires to accept such employment with the Company, on the terms and conditions set forth herein.

**NOW, THEREFORE**, in consideration of the mutual covenants and agreements contained herein, and other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the Parties agree as follows:

---

## SECTION 1: DUTIES AND RESPONSIBILITIES

### 1.1 Position and Title
The Employee shall serve in the position of **Senior AI Engineer**. The Employee shall report directly to the Chief Technology Officer ("CTO"), ${fields.founder2Name || ''}, or such other executive as designated by the Chief Executive Officer ("CEO"), ${fields.founder1Name || ''}.

### 1.2 Core Duties
The Employee shall perform all duties customary to the position of a Senior AI Engineer, including, but not limited to:
1.  Architecting, optimizing, and deploying LLM orchestration routing gateways (including the Company's proprietary "TRINITY" router and Conductor DAG workflows).
2.  Maintaining and extending the NVIDIA local models database and visual studio tools.
3.  Writing clean, secure, and highly documented code across the Company's frontend and backend systems.
4.  Participating in daily code reviews, technical architecture planning, and developer-level quality control.
5.  Assisting in customer technical integration and edge serverless deployments.

### 1.3 Best Efforts and Devotion of Time
The Employee agrees to devote their full professional time, attention, energy, and skills exclusively to the business of the Company. The Employee shall not engage in any other business activity, consulting, or employment that conflicts with their obligations to the Company or competes with the Company's business, whether or not for compensation, without the express prior written consent of the Board of Directors.

---

## SECTION 2: TERM AND AT-WILL EMPLOYMENT

### 2.1 At-Will Employment Status
The Employee’s employment with the Company shall be **"at-will"** under ${fields.state || 'New Mexico'} law. This means that either the Company or the Employee may terminate the employment relationship at any time, for any reason, or for no reason at all, with or without cause, and with or without prior notice, subject only to the notice provisions set forth in Section 5 of this Agreement.

---

## SECTION 3: COMPENSATION AND BENEFITS

### 3.1 Base Salary
For all services rendered by the Employee, the Company shall pay the Employee a base salary at the annualized rate of **$165,000.00 USD** (one hundred sixty-five thousand dollars and zero cents), less applicable federal, state, and local tax withholdings. The base salary shall be paid in equal semi-monthly installments in accordance with the Company’s standard payroll practices.

### 3.2 Performance Bonus
The Employee shall be eligible to participate in the Company’s Executive Performance Bonus Plan. The target annual bonus shall be **15%** of the base salary (amounting to **$24,750.00 USD**), payable upon the Company meeting specific strategic milestones and the Employee achieving performance targets established annually by the Board of Directors.

### 3.3 Equity Options
Subject to the approval of the Board of Directors and the terms of the Company's Employee Stock Option Plan (ESOP), the Employee shall be granted options to purchase **150,000 shares** of the Company’s Common Stock at a strike price of **$0.15 per share** (the fair market value as of the date of grant). The options shall vest over a **forty-eight (48) month period**, with a twenty-five percent (25%) cliff vesting on the twelve (12) month anniversary of the employee's start date, and the remaining seventy-five percent (75%) vesting in equal monthly installments over the following thirty-six (36) months, contingent on the Employee’s continued service.

### 3.4 Employee Benefits
The Employee shall be eligible to participate in all standard employee benefit plans maintained by the Company for its full-time technical staff, including:
1.  **Health Insurance**: Comprehensive medical, dental, and vision insurance, with the Company contributing eighty percent (80%) of the premium costs.
2.  **Paid Time Off (PTO)**: Twenty (20) business days of accrued PTO per calendar year, to be used in accordance with the Company’s PTO policy.
3.  **Holidays**: Ten (10) standard federal holidays per year as observed by the Company.
4.  **401(k) Plan**: Participation in the Company's retirement savings plan, with a Company matching contribution of up to four percent (4%) of the Employee’s base salary after six (6) months of continuous service.

---

## SECTION 4: RESTRICTIVE COVENANTS

In consideration of their employment and the sensitive nature of the Proprietary Information and Inventions they will access, the Employee agrees to the following covenants:

### 4.1 Non-Competition
During the term of their employment with the Company, and for a period of **twelve (12) months** following the termination of their employment for any reason, the Employee shall not, directly or indirectly, engage in, perform services for, consult for, advise, own, manage, or operate any business, firm, or entity that directly competes with the Company's business of agentic AI coding frameworks, local edge LLM gateways, or custom serverless developer studio products within the United States of America.

### 4.2 Non-Solicitation of Employees
During the term of their employment with the Company, and for a period of **twenty-four (24) months** following the termination of their employment for any reason, the Employee shall not, directly or indirectly, solicit, recruit, induce, or attempt to induce any employee, consultant, or independent contractor of the Company to leave their employment or engagement with the Company.

### 4.3 Non-Solicitation of Clients
During the term of their employment with the Company, and for a period of **twenty-four (24) months** following the termination of their employment for any reason, the Employee shall not, directly or indirectly, solicit, contact, interfere with, or attempt to divert the business of any client, customer, partner, or active prospect of the Company with whom the Employee had contact or about whom the Employee obtained Confidential Information during their employment.

---

## SECTION 5: TERMINATION PROCEDURES AND SEVERANCE

### 5.1 Termination by the Company for Cause
The Company may terminate the Employee’s employment immediately for "Cause" upon written notice to the Employee. "Cause" shall mean:
1.  The Employee's material breach of this Agreement, the Proprietary Information and Inventions Agreement (PIIA), or any other written Company policy.
2.  The Employee's conviction of, or plea of guilty or nolo contendere to, any felony or a misdemeanor involving moral turpitude, fraud, or dishonesty.
3.  The Employee's willful misconduct or gross negligence in the performance of their duties.
4.  The Employee's chronic substance abuse or drug addiction that materially interferes with their work performance.
5.  The Employee's commission of theft, embezzlement, or misappropriation of Company property.

In the event of a termination for Cause, the Employee shall be entitled only to their accrued and unpaid base salary through the date of termination, and all unvested equity options shall be immediately canceled.

### 5.2 Termination by the Company Without Cause
The Company may terminate the Employee’s employment without Cause upon thirty (30) days' written notice. In the event of a termination without Cause, contingent on the Employee executing a general release of claims in favor of the Company, the Employee shall be entitled to:
1.  **Severance Pay**: Continued payment of their base salary for a period of **three (3) months** following the date of termination.
2.  **COBRA Premium Support**: Continued payment of the Company's share of health insurance premiums for up to three (3) months or until the Employee obtains comparable health coverage from another employer.
3.  **Vested Options Exercise**: Accelerated vesting of any options scheduled to vest within thirty (30) days of termination, and a ninety (90) day window to exercise all vested options.

### 5.3 Resignation by the Employee
The Employee may resign from their employment at any time upon thirty (30) days' written notice to the Company. The Company may, in its sole discretion, waive the notice period and accelerate the effective date of the resignation, in which case the Company shall pay the Employee’s base salary through the waiver period.

---

## SECTION 6: INTEGRATION OF INTELLECTUAL PROPERTY COVENANTS

The Employee’s execution of the Company’s standard **Proprietary Information and Inventions Agreement (PIIA)**, dated ${fields.effectiveDate || 'June 25, 2026'}, is a condition precedent to this Agreement. The terms of the PIIA are incorporated herein by reference. Any breach of the PIIA by the Employee shall constitute a material breach of this Agreement and grounds for immediate termination for Cause.

---

## SECTION 7: GOVERNING LAW AND DISPUTE RESOLUTION

### 7.1 Governing Law
This Agreement, and all claims, disputes, or controversies arising out of or relating to it, shall be governed by, and construed in accordance with, the laws of the State of ${fields.state || 'New Mexico'}, without regard to its conflict of laws principles.

### 7.2 Binding Arbitration
Any dispute, controversy, or claim arising out of, or relating to, this Agreement, including its formation, validity, breach, termination, or enforceability, shall be settled exclusively by binding arbitration administered by the American Arbitration Association ("AAA") in accordance with its Commercial Arbitration Rules:
1.  **Venue**: The physical seat and venue of the arbitration shall be **Tijeras, ${fields.state || 'New Mexico'}**.
2.  **Tribunal**: The arbitration shall be conducted before a single neutral arbitrator appointed in accordance with AAA rules.
3.  **Attorneys' Fees**: The prevailing Party in any such arbitration shall be entitled to recover its reasonable attorneys' fees, expert witness fees, and administrative arbitration costs from the non-prevailing Party.
4.  **Enforcement**: The arbitrator's award shall be final and binding, and judgment upon the award rendered by the arbitrator may be entered in any court having jurisdiction thereof.

---

## SECTION 8: GENERAL PROVISIONS

### 8.1 Entire Agreement
This Agreement, together with the PIIA and the ESOP Plan Rules, constitutes the entire agreement between the Parties regarding the terms of employment and supersedes all prior or contemporaneous agreements, understandings, discussions, or representations, whether oral or written.

### 8.2 Amendments and Waivers
No amendment, modification, or waiver of any provision of this Agreement shall be valid unless it is in writing and signed by both the Employee and an authorized executive officer of the Company.

### 8.3 Severability
If any provision of this Agreement is held to be invalid, illegal, or unenforceable by an arbitrator or a court of competent jurisdiction, such provision shall be severed, and the remaining provisions of the Agreement shall continue in full force and effect.

### 8.4 Counterparts
This Agreement may be executed in counterparts, each of which shall be deemed an original, but all of which together shall constitute one and the same instrument. Electronic or digital signatures shall have the same legal force and effect as physical ink signatures.

---

### IN WITNESS WHEREOF, the Parties have executed this Executive & Technical Employment Agreement as of the date first written above.

#### COMPANY:
**${fields.companyName || 'RJ Business Solutions, Inc.'}**

By: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  
Name: ${fields.founder1Name || ''}  
Title: Founder & CEO  
Date: ${fields.effectiveDate || 'June 25, 2026'}

#### EMPLOYEE:

By: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  
Name: **Marcus Sterling**  
Title: Senior AI Engineer  
Date: ${fields.effectiveDate || 'June 25, 2026'}
`;
    }
  },
  'job-offer': {
    id: 'job-offer',
    name: 'Key Employee Offer Letter',
    description: 'Professional job offer letter outlining compensation, equity options, role details, and start dates.',
    fields: [
      {
            "name": "companyName",
            "label": "Company Name",
            "placeholder": "e.g. RJ Business Solutions, Inc.",
            "defaultVal": "RJ Business Solutions, Inc."
      },
      {
            "name": "effectiveDate",
            "label": "Effective Date",
            "placeholder": "e.g. June 25, 2026",
            "defaultVal": "June 25, 2026"
      },
      {
            "name": "candidateName",
            "label": "Candidate Name",
            "placeholder": "e.g. Vikram Iyer",
            "defaultVal": "Vikram Iyer"
      },
      {
            "name": "jobTitle",
            "label": "Job Title",
            "placeholder": "e.g. Lead AI Engineer",
            "defaultVal": "Lead AI Engineer"
      },
      {
            "name": "salary",
            "label": "Annual Salary Offered",
            "placeholder": "e.g. $150,000",
            "defaultVal": "$150,000"
      },
      {
            "name": "startDate",
            "label": "Start Date",
            "placeholder": "e.g. July 1, 2026",
            "defaultVal": "July 1, 2026"
      }
],
    fn: (fields: Record<string, string>) => {
      return `# OFFICIAL JOB OFFER LETTER

**Date**: ${fields.effectiveDate || 'June 25, 2026'}

**To**:  
Marcus Sterling  
8904 Montgomery Blvd NE  
Albuquerque, ${fields.state || ''} 87111  

---

**Dear Marcus,**

On behalf of **${fields.companyName || 'RJ Business Solutions, Inc.'}** (the "Company"), I am absolutely thrilled to offer you the full-time, exempt position of **Senior AI Engineer**. We were deeply impressed by your exceptional background in AI model integration, serverless edge orchestration, and software engineering. We believe your unique skills will play a pivotal role in accelerating the commercialization of our sovereign agentic platform and leading our next phase of technical growth.

Below are the terms and details of our offer:

### 1. Position and Reporting Structure
*   **Title**: Senior AI Engineer
*   **Reporting Relationship**: You will report directly to our Chief Technology Officer (CTO), **${fields.founder2Name || ''}**.
*   **Primary Work Location**: Our corporate headquarters located at **${fields.founder1Address || ''}**. We support a hybrid schedule, allowing up to two (2) days of remote work per week, subject to business needs and alignment with the engineering team.

### 2. Start Date
Your first day of employment with the Company will be **July 6, 2026**.

### 3. Base Salary and Compensation
*   **Base Salary**: You will receive an annualized base salary of **$165,000.00 USD** (one hundred sixty-five thousand dollars and zero cents), less applicable federal, state, and local withholdings. Your salary will be paid in equal semi-monthly installments on the 15th and last business day of each month, in accordance with the Company’s standard payroll calendar.
*   **Signing Bonus**: To assist with your transition and welcome you to the team, you will receive a one-time signing bonus of **$10,000.00 USD**, payable on your first regular pay cycle. This bonus is subject to pro-rated repayment if you voluntarily resign within your first twelve (12) months of employment.
*   **Performance Bonus**: You will be eligible to participate in the Company's Executive Performance Bonus Plan. Your target annual bonus is **15% of your base salary** (amounting to **$24,750.00 USD**), based on the achievement of specific corporate milestones and individual technical KPIs established jointly by you and the CTO.

### 4. Equity Options
Subject to the formal approval of our Board of Directors and the rules of the Company's Employee Stock Option Plan (ESOP), you will be granted stock options to purchase **150,000 shares of Common Stock** of ${fields.companyName || 'RJ Business Solutions, Inc.'}, at an exercise strike price of **$0.15 per share** (the fair market value as of the date of grant). 

Your options will vest under a standard **forty-eight (48) month vesting schedule**:
*   **25% (37,500 shares)** will vest on the twelve (12) month anniversary of your start date (the "one-year cliff").
*   The remaining **75% (112,500 shares)** will vest in equal monthly installments over the subsequent thirty-six (36) months, contingent upon your continued employment with the Company.

### 5. Employee Benefits
As a full-time employee, you will be eligible to participate in the Company's comprehensive benefits program starting on your first day of employment. This includes:
*   **Medical, Dental, and Vision Care**: Comprehensive health coverage, with the Company covering eighty percent (80%) of premium costs for you and fifty percent (50%) for eligible dependents.
*   **Paid Time Off (PTO)**: You will accrue **twenty (20) business days** of paid vacation per year, in addition to ten (10) standard federal holidays observed by the Company.
*   **401(k) Retirement Plan**: A retirement savings plan with a Company-matching contribution of up to **4% of your base salary**, starting after six (6) months of continuous service.
*   **Equipment Allowance**: You will be provided with a premium developer hardware package, including a 16-inch MacBook Pro (M3 Max, 64GB RAM), a 32-inch 4K monitor, and a $1,500.00 home-office stipend.

### 6. At-Will Employment and Restrictive Covenants
Please note that your employment with the Company is **at-will**. This means that either you or the Company can terminate your employment at any time, for any reason or no reason, with or without Cause or advance notice. 

This offer is contingent upon:
1.  Your successful completion of standard background checks.
2.  Your verification of legal eligibility to work in the United States.
3.  Your execution and delivery of the Company's standard **Proprietary Information and Inventions Agreement (PIIA)** and **Executive & Technical Employment Agreement** (both dated ${fields.effectiveDate || 'June 25, 2026'}), which contain standard non-competition, non-solicitation, and intellectual property assignment covenants.

---

### Acceptance of Offer

Marcus, we are incredibly excited about the prospect of you joining ${fields.companyName || 'RJ Business Solutions, Inc.'} We are building the future of sovereign enterprise AI, and we know that your leadership and technical talent will be instrumental to our success.

To accept this offer, please sign and date this letter below and return it to me via secure digital signature or email at **support@rjbusinesssolutions.org** no later than **5:00 PM MST on June 30, 2026**.

If you have any questions or require any clarification regarding these terms, please do not hesitate to reach out to me directly at **+1 (414) 430-4277**.

Welcome to the team!

Sincerely,

**${fields.founder1Name || ''}**  
Founder & CEO  
${fields.companyName || 'RJ Business Solutions, Inc.'}  
1342 NM 333, Tijeras, NM 87059  

---

### EMPLOYEE ACCEPTANCE AND ACKNOWLEDGEMENT

I have read, understood, and accept the terms of this offer of employment with ${fields.companyName || 'RJ Business Solutions, Inc.'} as outlined above. I acknowledge that my employment is at-will and that no verbal agreements or promises have been made to me other than those explicitly detailed in this letter or my formal Employment Agreement.

**Marcus Sterling**  

Signature: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  
Date: ${fields.effectiveDate || 'June 25, 2026'}  

**Anticipated Start Date**: July 6, 2026
`;
    }
  },
  'hr-policies': {
    id: 'hr-policies',
    name: 'HR Policies & Employee Handbook',
    description: 'Establish workplace standards, code of conduct, employment classifications, and benefits.',
    fields: [
      {
            "name": "companyName",
            "label": "Company Name",
            "placeholder": "e.g. RJ Business Solutions, Inc.",
            "defaultVal": "RJ Business Solutions, Inc."
      },
      {
            "name": "effectiveDate",
            "label": "Effective Date",
            "placeholder": "e.g. June 25, 2026",
            "defaultVal": "June 25, 2026"
      },
      {
            "name": "state",
            "label": "Governing State",
            "placeholder": "e.g. New Mexico",
            "defaultVal": "New Mexico"
      }
],
    fn: (fields: Record<string, string>) => {
      return `# HR POLICIES & CODE OF CONDUCT HANDBOOK

**Company**: ${fields.companyName || 'RJ Business Solutions, Inc.'}  
**Effective Date**: ${fields.effectiveDate || 'June 25, 2026'}  
**Approved By**: ${fields.founder1Name || ''}, Founder & CEO  
**Location**: ${fields.founder1Address || ''}  
**Support Email**: support@rjbusinesssolutions.org  

---

## 🧭 WELCOME AND INTRODUCTION

Welcome to **${fields.companyName || 'RJ Business Solutions, Inc.'}**! We are a leading-edge technology firm dedicated to engineering sovereign AI frameworks, edge gateway orchestrations, and high-performance automated systems. Our mission is to empower operators to execute with speed, autonomy, and zero chaos.

This Handbook is designed to introduce you to our corporate policies, expectations, benefits, and the professional standards that govern our daily operations. It applies to all employees, executives, consultants, and contractors.

As a high-growth tech startup, our operational velocity relies on trust, clarity, and discipline. Please read this Handbook thoroughly. Your continued employment constitutes your agreement to abide by these policies.

---

## SECTION 1: EQUAL EMPLOYMENT OPPORTUNITY (EEO) POLICY

### 1.1 Commitment to Diversity
${fields.companyName || 'RJ Business Solutions, Inc.'} is an Equal Opportunity Employer. We are committed to providing a work environment free of discrimination, bias, and harassment, and to attracting, retaining, and promoting a highly talented and diverse workforce.

### 1.2 Non-Discrimination Mandate
We prohibit discrimination and harassment of any kind based on:
*   Race, color, national origin, ancestry, or citizenship.
*   Religion, creed, or belief.
*   Sex, gender identity, gender expression, or sexual orientation.
*   Age, genetic information, or marital status.
*   Physical or mental disability, medical condition, or military/veteran status.
*   Any other characteristic protected by federal, state (including the ${fields.state || 'New Mexico'} Human Rights Act), or local laws.

This policy applies to all terms and conditions of employment, including recruiting, hiring, placement, promotion, termination, layoff, recall, transfer, leaves of absence, compensation, and training.

---

## SECTION 2: CODE OF CONDUCT & PROFESSIONALISM

### 2.1 Standard of Excellence
All personnel are expected to conduct themselves with the highest level of professionalism, integrity, and ethical responsibility. We operate under the "Karpathy Discipline"—which means our code, our communication, and our operations must be minimal, clean, logical, and focused on verifiable business results.

### 2.2 Prohibited Behaviors
The following behaviors are strictly prohibited and constitute grounds for immediate disciplinary action, up to and including termination of employment:
1.  Dishonesty, misrepresentation of facts, or falsification of Company records.
2.  Theft, unauthorized use, or destruction of Company property or proprietary systems.
3.  Insubordination or refusal to follow reasonable, lawful directives from senior management.
4.  Possession, distribution, or use of controlled substances or alcohol while working, except for reasonable consumption of alcohol at pre-approved Company social events.
5.  Disclosing Company or client Confidential Information to unauthorized third parties.
6.  Engaging in behavior that represents a conflict of interest with the Company’s commercial products.

---

## SECTION 3: REMOTE WORK AND HYBRID WORKPLACE GUIDELINES

### 3.1 The Hybrid Model
${fields.companyName || 'RJ Business Solutions, Inc.'} supports a highly productive hybrid work environment. Unless designated as a 100% remote role in an employment agreement, full-time employees are expected to work from our physical headquarters at **1342 NM 333, Tijeras, NM 87059** at least **three (3) days per week** (typically Tuesday, Wednesday, and Thursday), with Monday and Friday as optional remote workdays.

### 3.2 Remote Work Requirements
When working remotely, employees must ensure:
1.  **Connectivity**: A high-speed, stable internet connection capable of supporting video conferencing and large-scale code pushes.
2.  **Availability**: Active presence on Slack, email, and Google Meet during core business hours (**9:00 AM to 5:00 PM Mountain Time**).
3.  **Security**: Work must be conducted on Company-issued laptops using the Company’s virtual private network (VPN) or secure edge gateway. No public, unsecured Wi-Fi networks may be used without VPN encryption.

---

## SECTION 4: TIME OFF, VACATION, AND LEAVES

### 4.1 Paid Time Off (PTO)
Full-time technical and executive employees accrue **twenty (20) business days** of PTO per calendar year, which accumulates pro-rata on a semi-monthly basis. PTO covers vacation, personal days, and short-term illness.
*   **Approval**: All PTO must be requested via our HR portal and approved by your direct supervisor at least two (2) weeks in advance, except in emergency cases.
*   **Rollover**: A maximum of five (5) accrued, unused PTO days may be carried over into the next calendar year. Any additional accrued PTO above this threshold will cap and stop accruing until the balance is reduced.

### 4.2 Paid Holidays
The Company observes ten (10) standard holidays per year:
1.  New Year's Day
2.  Martin Luther King Jr. Day
3.  Memorial Day
4.  Juneteenth
5.  Independence Day (July 4th)
6.  Labor Day
7.  Veterans Day
8.  Thanksgiving Day
9.  Day after Thanksgiving
10. Christmas Day

### 4.3 Family and Medical Leave (FMLA)
The Company provides family and medical leave in accordance with federal and ${fields.state || 'New Mexico'} state laws, providing up to twelve (12) weeks of unpaid, job-protected leave for qualifying family and medical reasons.

---

## SECTION 5: ANTI-HARASSMENT & ANTI-DISCRIMINATION POLICY

### 5.1 Zero-Tolerance Mandate
${fields.companyName || 'RJ Business Solutions, Inc.'} maintains a strict zero-tolerance policy for harassment, discrimination, or retaliation of any kind. 

### 5.2 Sexual Harassment Defined
Sexual harassment includes unwelcome sexual advances, requests for sexual favors, or visual, verbal, or physical conduct of a sexual nature that:
1.  Makes submission to such conduct an implicit or explicit term or condition of employment;
2.  Uses submission to or rejection of such conduct as the basis for employment decisions; or
3.  Creates an intimidating, hostile, or offensive working environment.

### 5.3 Reporting Procedure
If you experience or witness harassment or discrimination:
1.  **Report Immediately**: Contact your direct supervisor, the Chief Operating Officer (COO) **${fields.founder3Name || ''}**, or submit a formal ticket to **support@rjbusinesssolutions.org**.
2.  **Investigation**: All reports will be investigated promptly, thoroughly, and impartially.
3.  **No Retaliation**: We strictly prohibit retaliation against anyone who reports harassment in good faith or participates in an investigation.

---

## SECTION 6: DATA PRIVACY, CYBERSECURITY, & ACCEPTABLE USE

### 6.1 System Security
Our technical assets are our lifeblood. All employees must adhere to our strict cybersecurity rules:
1.  **Multi-Factor Authentication (MFA)**: Mandatory on all corporate accounts, Slack, GitHub, Cloudflare, and local gateways.
2.  **Device Lock**: Devices must automatically lock after five (5) minutes of inactivity and must be password-protected with a minimum 16-character alphanumeric password.
3.  **Software Security**: Only approved software may be installed on Company-issued laptops. Downloading torrents, visiting high-risk websites, or installing unverified npm packages is strictly forbidden.

### 6.2 Acceptable Use
Company networks, hardware, and accounts are provided solely for Company business. There is no expectation of personal privacy when using Company-issued hardware, networks, or digital platforms. The Company reserves the right to monitor, log, and audit all data traffic and communications on its systems to protect proprietary assets.

---

## SECTION 7: INTELLECTUAL PROPERTY & INVENTION REPORTING

### 7.1 Automatic Company Assignment
Every piece of code, algorithm, AI workflow, system document, design, trademark, or business workflow created or conceived during your employment is the sole and exclusive property of ${fields.companyName || 'RJ Business Solutions, Inc.'}

### 7.2 Prompt Disclosure
Employees are contractually obligated to promptly disclose all Inventions, discoveries, and code repositories to the CTO, **${fields.founder2Name || ''}**, and the legal operations team. All developers must maintain thorough, committed documentation within the Company’s private GitHub repositories.

---

## SECTION 8: PERFORMANCE MANAGEMENT & REVIEWS

### 8.1 Continuous Feedback
We do not believe in bureaucratic, low-value yearly reviews. We operate on a model of continuous evaluation:
*   **Weekly 1-on-1s**: Tactical alignment with your direct supervisor.
*   **Bi-Annual Reviews**: Comprehensive, 360-degree reviews occurring in June and December to evaluate technical competence, commercial output, and adherence to team culture.
*   **Performance Improvement Plans (PIP)**: If an employee's output falls below standards, a formal, highly specific 30-day PIP will be established to outline verifiable metrics for correction. Failure to meet these metrics within the 30-day window will result in immediate termination of employment.

---

## SECTION 9: TRAVEL, EXPENSE REIMBURSEMENT, & BUDGET

### 9.1 Pre-Approval Process
All business travel, client dinners, hardware upgrades, and software subscriptions must receive written pre-approval from the COO, **${fields.founder3Name || ''}**, or the CEO, **${fields.founder1Name || ''}**.

### 9.2 Expense Reporting
Authorized business expenses will be reimbursed upon submission of an itemized expense report with corresponding receipts via our financial portal.
*   **Filing Deadline**: Expenses must be submitted within thirty (30) days of the date the expense was incurred.
*   **Exclusions**: Personal entertainment, alcohol (outside of approved client dinners), and traffic/parking violations are non-reimbursable.

---

## SECTION 10: SAFETY, HEALTH, & EMERGENCY PREPAREDNESS

### 10.1 Safe Working Environment
The Company is committed to providing a safe, clean, and hazard-free workspace at our Tijeras headquarters in compliance with Federal OSHA guidelines and ${fields.state || 'New Mexico'} state health regulations.

### 10.2 Incident Reporting
Any workplace injury, accident, or hazard—no matter how minor—must be reported immediately to the COO, **${fields.founder3Name || ''}**. 

### 10.3 Emergency Procedures
In the event of an emergency (e.g., fire, severe weather, medical crisis), employees must follow standard exit procedures as posted throughout the office and gather at our designated assembly area in the central parking lot.

---

### ACKNOWLEDGEMENT OF RECEIPT AND AGREEMENT

I acknowledge that I have received, read, and understand the **${fields.companyName || 'RJ Business Solutions, Inc.'} HR Policies & Code of Conduct Handbook**. I agree to comply with all policies, rules, and expectations outlined herein. 

I understand that this Handbook is a guide and does not create an express or implied contract of employment for a definite duration, and that my employment remains strictly at-will.

**Employee Name**: Marcus Sterling  
**Title**: Senior AI Engineer  

Signature: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  
Date: ${fields.effectiveDate || 'June 25, 2026'}
`;
    }
  },
  'terms-of-service': {
    id: 'terms-of-service',
    name: 'SaaS Terms of Service',
    description: 'Define terms of use, licensing, user accounts, fee schedules, and platform liabilities.',
    fields: [
      {
            "name": "companyName",
            "label": "Company Name",
            "placeholder": "e.g. RJ Business Solutions, Inc.",
            "defaultVal": "RJ Business Solutions, Inc."
      },
      {
            "name": "effectiveDate",
            "label": "Effective Date",
            "placeholder": "e.g. June 25, 2026",
            "defaultVal": "June 25, 2026"
      },
      {
            "name": "state",
            "label": "Governing State",
            "placeholder": "e.g. New Mexico",
            "defaultVal": "New Mexico"
      },
      {
            "name": "websiteUrl",
            "label": "Website URL",
            "placeholder": "e.g. https://rjbusinesssolutions.org",
            "defaultVal": "https://rickjeffersonsolutions.com"
      }
],
    fn: (fields: Record<string, string>) => {
      return `# SAAS TERMS OF SERVICE

**Last Updated**: ${fields.effectiveDate || 'June 25, 2026'}  
**Effective Date**: ${fields.effectiveDate || 'June 25, 2026'}  

Welcome to the **Sovereign Multi-Agent AI Suite**!

These SaaS Terms of Service (the "Terms" or "Agreement") constitute a legally binding agreement between **${fields.companyName || 'RJ Business Solutions, Inc.'}**, a ${fields.state || 'New Mexico'} corporation, with its principal place of business at ${fields.founder1Address || ''} ("Company," "we," "us," or "our") and the corporate entity, business operator, or individual user who registers for, accesses, or uses our edge-orchestrated visual canvas studio, Hono edge gateway API, serverless AI compilers, and database playground systems (collectively, the "Services") ("Customer," "you," or "your").

By checking the "I Accept" box, executing an order form, or otherwise accessing or using any part of the Services, you represent that:
1.  You have read, understood, and agree to be bound by these Terms; and
2.  If you are acting on behalf of an organization or business, you have the legal authority to bind that organization to these Terms.

If you do not agree to these Terms, you are strictly prohibited from accessing or using the Services.

---

## SECTION 1: DEFINITIONS AND PLATFORM SCOPE

### 1.1 "Platform"
Refers to the proprietary software systems hosted and made available by the Company under the brand ${fields.companyName || 'RJ Business Solutions, Inc.'}, including:
1.  **\`higgs\` Visual Studio**: The Next.js-based visual code-generating studio containing the interactive drag-and-drop Creative Canvas.
2.  **\`rj-nemesis\` Edge Gateway**: The Hono-based LLM API Edge Gateway managing model routing, orchestration pipelines, and local database environments.

### 1.2 "Customer Data"
Means any code, text, assets, images, databases, API keys, or other content uploaded, submitted, or processed by you through the Services.

### 1.3 "Usage Metrics"
Means quantitative data concerning Customer’s utilization of the Services, such as edge API tokens consumed, serverless gateway execution seconds, page compilations, and active developer seats.

---

## SECTION 2: SUBSCRIPTIONS, BANS, AND ACCOUNTS

### 2.1 License Grant
Subject to your strict compliance with these Terms and timely payment of all applicable fees, Company grants you a non-exclusive, non-transferable, non-sublicensable, revocable, and limited-term license to access and use the Services solely for your internal business operations during the subscription term.

### 2.2 Account Security
To use the Services, you must register for an account. You are solely responsible for:
1.  Maintaining the confidentiality of your administrative credentials, API tokens, and access passwords.
2.  Restricting access to your account to authorized employees only.
3.  All activities that occur under your account, regardless of whether authorized by you.

You agree to notify us immediately at **support@rjbusinesssolutions.org** of any unauthorized use or security breach of your account.

### 2.3 Prohibited Conduct and Suspension (Bans)
We reserve the right to immediately suspend or permanently ban your access to the Services, without prior notice or liability, if we determine in our sole discretion that you have engaged in any of the following prohibited behaviors:
1.  Attempting to reverse engineer, decompile, or disassemble our proprietary edge gate compilers or TRINITY router schemas.
2.  Using the Services to generate or distribute malicious code, spam, or unlawful, harassing, or defamatory materials.
3.  Exceeding established API rate limits, launching DDoS attacks, or attempting to compromise the security and isolation of our Cloudflare tenant sandboxes.
4.  Failing to pay subscription or metered usage fees within five (5) business days of the invoice due date.

---

## SECTION 3: SUBSCRIPTION TIERS AND PAYMENT TERMS

By registering for our Services, you agree to pay all fees associated with your chosen subscription plan:

### 3.1 Subscription Plans
1.  **Single-Operator Tier**: **$150.00 USD per month**. Includes one (1) developer seat, unlimited Visual Canvas designs, and up to five million (5,000,000) Edge Gateway API tokens per month.
2.  **Growth Enterprise Tier**: **$850.00 USD per month**. Includes five (5) developer seats, custom D1 database configurations, priority NVIDIA model orchestration, and a flat-rate allowance of twenty-five million (25,000,000) Edge Gateway API tokens per month.
3.  **Metered Edge Overage Fees**: Usage of the \`rj-nemesis\` Gateway exceeding your subscription allowance will be billed dynamically at a rate of **$0.0015 USD per 1,000 tokens**, calculated in real-time and invoiced monthly.

### 3.2 Billing and Automatic Renewal
All recurring subscription fees are billed in advance on a monthly or annual basis and are completely non-refundable. Subscription terms automatically renew for consecutive monthly periods unless cancelled by either Party at least five (5) days prior to the renewal date. All metered edge consumption overages are billed in arrears.

### 3.3 Taxes
All fees are exclusive of federal, state, and local taxes, including sales, use, excise, and digital services taxes. Customer is solely responsible for paying all taxes associated with their purchase of our Services under ${fields.state || 'New Mexico'} and Federal law.

---

## SECTION 4: INTELLECTUAL PROPERTY AND CUSTOMER DATA

### 4.1 Company Ownership
The Company and its licensors retain all right, title, and interest in and to the Services, including all visual layouts, edge compiler binaries, proprietary models, system documentation, and TRINITY routing algorithms. No ownership rights are transferred to you under these Terms.

### 4.2 Customer Ownership of Output
Notwithstanding Section 4.1, the Company claims **zero ownership** over any code, webpage designs, database structures, or digital assets successfully compiled and exported by you using our Creative Canvas studio. All such compiled outputs are your sole property.

### 4.3 License to Customer Data
You hereby grant the Company a limited, worldwide, royalty-free, and non-exclusive license to host, transmit, and process your Customer Data solely for the purpose of delivering, supporting, and improving the Services.

---

## SECTION 5: WARRANTIES, DISCLAIMERS, AND SERVICE LIMITS

### 5.1 Service Level and Maintenance
We strive to maintain a high level of availability for our visual studio and edge gateway. However, because our Services operate over public edge and cloud infrastructures, we do not warrant that our Services will be completely uninterrupted, error-free, or secure from sophisticated cyber threats. Planned system maintenance will occur outside of peak hours (MST) with at least twenty-four (24) hours' notice.

### 5.2 DISCLAIMER OF ALL WARRANTIES
EXCEPT AS EXPLICITLY PROVIDED HEREIN, THE SERVICES ARE PROVIDED **"AS IS"** AND **"AS AVAILABLE."** THE COMPANY DISCLAIMS ALL WARRANTIES, EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.

---

## SECTION 6: LIMITATION OF LIABILITY

### 6.1 Exclusion of Indirect Damages
TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL EITHER PARTY BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, REVENUE, DATA, OR BUSINESS OPPORTUNITY, ARISING OUT OF OR IN CONNECTION WITH THIS AGREEMENT, REGARDLESS OF THE FORM OF ACTION.

### 6.2 Monetary Cap on Liability
THE COMPANY'S CUMULATIVE LIABILITY FOR ALL CLAIMS OF ANY KIND ARISING OUT OF OR IN CONNECTION WITH THIS AGREEMENT SHALL BE STRICTLY LIMITED TO THE TOTAL AMOUNT OF SUBSCRIPTION AND METERED FEES PAID BY CUSTOMER TO THE COMPANY IN THE **THREE (3) MONTH PERIOD** IMMEDIATELY PRECEDING THE INCIDENT GIVING RISE TO LIABILITY.

---

## SECTION 7: TERM AND TERMINATION

### 7.1 Subscription Cancellation
You can cancel your subscription at any time through your account billing panel. Cancellation stops future renewals but does not entitle you to any refunds for the current billing cycle.

### 7.2 Termination for Cause
Either Party may terminate this Agreement immediately upon written notice if:
1.  The other Party materially breaches these Terms and fails to cure such breach within ten (10) business days of receiving written notice of the breach.
2.  The other Party becomes insolvent, enters bankruptcy, or initiates dissolution proceedings.

### 7.3 Data Retention Post-Termination
Upon termination or expiration of this Agreement, Customer’s access to the Services will be immediately revoked. We will retain Customer Data for a maximum of thirty (30) days, during which you may request a manual export of your canvas designs. After thirty (30) days, all Customer Data will be permanently deleted from our primary servers and edge databases.

---

## SECTION 8: DISPUTE RESOLUTION AND GOVERNING LAW

### 8.1 Governing Law
These Terms, and all claims, disputes, or controversies arising out of or relating to them, shall be governed by, and construed in accordance with, the laws of the State of ${fields.state || 'New Mexico'}, United States of America, without regard to its conflict of laws principles.

### 8.2 Binding Arbitration
Any dispute, controversy, or claim arising out of, or relating to, this Agreement, including its formation, validity, breach, or termination, shall be settled exclusively by binding arbitration administered by the American Arbitration Association ("AAA") in accordance with its Commercial Arbitration Rules:
1.  **Venue**: The physical seat and venue of the arbitration shall be **Tijeras, ${fields.state || 'New Mexico'}**.
2.  **Tribunal**: The arbitration shall be conducted before a single neutral arbitrator appointed in accordance with AAA rules.
3.  **Language**: The language of the arbitration shall be English.
4.  **Injunctions**: Notwithstanding the foregoing, either Party shall have the right to seek preliminary injunctive relief or a temporary restraining order in any court of competent jurisdiction located in Bernalillo County, ${fields.state || 'New Mexico'}, to prevent irreparable harm or a continuous breach of this Agreement, pending the appointment of the arbitrator.

---

## SECTION 9: MISCELLANEOUS PROVISIONS

### 9.1 Entire Agreement
This Agreement constitutes the entire agreement between you and ${fields.companyName || 'RJ Business Solutions, Inc.'} regarding your use of the Services, and supersedes all prior or contemporaneous agreements, understandings, discussions, or representations, whether oral or written.

### 9.2 Severability
If any provision of this Agreement is held to be invalid, illegal, or unenforceable by an arbitrator or a court of competent jurisdiction, the remaining provisions of the Agreement shall continue in full force and effect.

### 9.3 Contact Information
For any legal inquiries, billing disputes, or termination notices, please contact us at:
*   **Email**: support@rjbusinesssolutions.org
*   **Secondary Email**: rjbizsolution23@gmail.com
*   **Phone**: +1 (414) 430-4277
*   **Mailing Address**: ${fields.companyName || 'RJ Business Solutions, Inc.'}, 1342 NM 333, Tijeras, NM 87059.
`;
    }
  },
  'privacy-policy': {
    id: 'privacy-policy',
    name: 'Privacy & Data Protection Policy',
    description: 'GDPR/CCPA compliant policy disclosing user data flows, collection methods, and consumer rights.',
    fields: [
      {
            "name": "companyName",
            "label": "Company Name",
            "placeholder": "e.g. RJ Business Solutions, Inc.",
            "defaultVal": "RJ Business Solutions, Inc."
      },
      {
            "name": "effectiveDate",
            "label": "Effective Date",
            "placeholder": "e.g. June 25, 2026",
            "defaultVal": "June 25, 2026"
      },
      {
            "name": "state",
            "label": "Governing State",
            "placeholder": "e.g. New Mexico",
            "defaultVal": "New Mexico"
      },
      {
            "name": "websiteUrl",
            "label": "Website URL",
            "placeholder": "e.g. https://rjbusinesssolutions.org",
            "defaultVal": "https://rickjeffersonsolutions.com"
      },
      {
            "name": "contactEmail",
            "label": "Contact Support Email",
            "placeholder": "e.g. support@rjbusinesssolutions.org",
            "defaultVal": "support@rjbusinesssolutions.org"
      }
],
    fn: (fields: Record<string, string>) => {
      return `# GLOBAL PRIVACY POLICY

**Last Updated**: ${fields.effectiveDate || 'June 25, 2026'}  
**Effective Date**: ${fields.effectiveDate || 'June 25, 2026'}  

${fields.companyName || 'RJ Business Solutions, Inc.'}, a ${fields.state || 'New Mexico'} corporation, with its principal place of business at ${fields.founder1Address || ''} ("Company," "we," "us," or "our") respects your privacy and is committed to protecting your personal data. 

This Global Privacy Policy (the "Privacy Policy") explains how we collect, use, store, disclose, and protect your information when you visit our website at [https://rickjeffersonsolutions.com](https://rickjeffersonsolutions.com) (including our secondary site [https://rjbusinesssolutions.org](https://rjbusinesssolutions.org)), register for, access, or use our edge-orchestrated visual canvas studio, Hono edge gateway API, serverless AI compilers, and database playground systems (collectively, the "Services").

This Policy applies globally to all platform users, corporate clients, contractors, and website visitors. By accessing or using our Services, you consent to the collection and processing of your information in accordance with this Privacy Policy.

---

## SECTION 1: INFORMATION WE COLLECT

We collect information that you directly provide to us, information collected automatically, and information from trusted third parties.

### 1.1 Information You Provide Directly
*   **Account Registration Data**: Name, company name, email address (including corporate email domains), physical business address, phone number (+1 (414) 430-4277 or customer-provided numbers), and security credentials (MFA setup details, hashed passwords).
*   **Payment and Billing Data**: Billing address, credit card numbers, tax IDs, and transaction histories, processed securely through our payment provider, **Stripe**.
*   **Developer and Integration Data**: Custom software code, webpage layouts, D1/KV database configurations, private GitHub API keys, and custom LLM gateway credentials submitted through the visual canvas playground.
*   **Customer Support Communications**: Messages, emails, or call notes sent to **support@rjbusinesssolutions.org** or **rjbizsolution23@gmail.com**.

### 1.2 Information Collected Automatically
When you interact with our Services, we automatically collect certain technical indicators from your device:
*   **Log and Network Data**: IP address, device type, browser type, operating system, network ports, server gateway execution logs, and request latency.
*   **Usage Metrics**: Detailed logs of API tokens consumed, edge gateway response speeds, selected NVIDIA models (such as \`nemesis-ultra\` or others), and visual canvas actions (drags, drops, compilations).
*   **Cookies and Tracking Technologies**: We use secure cookies, local storage objects, and session indicators to track account state, maintain logged-in status, and improve visual dashboard responsiveness.

---

## SECTION 2: DATA FLOWS AND HOW WE USE YOUR INFORMATION

We process your data strictly under legal bases, including contract execution, legitimate interest, and explicit consent. The flow of data is governed by our internal architecture:

\`\`\`
[User / Developer] ---> [higgs Next.js UI / Cloudflare Edge]
                             | (Auth, Storage, Routing)
                             +---> [Supabase / DB Storage]
                             +---> [Stripe / Billing]
                             +---> [rj-nemesis Gateway API] ---> [NVIDIA Model Nodes]
                             +---> [Resend / Transactional Email]
\`\`\`

### 2.1 Purposes of Processing
1.  **To Provide the Services**: Authenticating users, storing project files, compiling visual layouts, and executing LLM gateway routing.
2.  **Billing and Payments**: Processing subscription plans, billing metered token overages, and verifying tax compliance via Stripe.
3.  **Communication**: Sending transactional emails, system alerts, downtime notices, and security advisories via Resend.
4.  **Security and Abuse Prevention**: Monitoring log data to prevent hacking, unauthorized server compiling, rate-limiting violations, or malicious activity.
5.  **Service Optimization**: Tracking aggregated Usage Metrics to improve the performance and routing logic of our TRINITY router.

---

## SECTION 3: THIRD-PARTY DATA SHARING AND TRANSFERS

We do not sell, rent, or trade your personal data. We share your information only with trusted service providers who are contractually bound to protect your data under strict confidentiality obligations:

| Service Provider | Location | Purpose | Data Shared |
|---|---|---|---|
| **Supabase, Inc.** | United States | Database hosting, user profiles, and session management | Email, hashed passwords, user settings |
| **Stripe, Inc.** | United States | Subscription billing, credit card processing, and tax verification | Credit card details, billing address, purchase history |
| **Cloudflare, Inc.** | United States | Edge CDN hosting, D1 database storage, Hono routing, and firewall | IP address, connection logs, Usage Metrics |
| **Resend, Inc.** | United States | Transactional and marketing email delivery | Name, email address, message logs |

---

## SECTION 4: GLOBAL PRIVACY COMPLIANCE AND USER RIGHTS

We comply with major international and domestic data protection frameworks, including the European Union's General Data Protection Regulation (GDPR), the California Consumer Privacy Act/California Privacy Rights Act (CCPA/CPRA), and the ${fields.state || 'New Mexico'} Consumer Information Privacy policies.

### 4.1 GDPR / CCPA/CPRA Rights
Regardless of your location, you have the following rights concerning your personal data:
1.  **Right of Access**: You can request a copy of all personal data we hold about you.
2.  **Right to Rectification**: You can request that we correct inaccurate or incomplete personal data.
3.  **Right to Erasure (Deletion)**: You can request that we permanently delete your account and all associated personal data from our systems (subject to Stripe’s legally required tax record retention).
4.  **Right to Restriction of Processing**: You can object to or request that we limit the processing of your personal data.
5.  **Right to Portability**: You can request a structured, JSON-formatted export of your customer data and webpage layouts.
6.  **Right to Opt-Out of Sale or Sharing**: We do not sell your data, but you have the right to opt-out of any prospective third-party data tracking or behavioral marketing.

To exercise any of these rights, please email us a formal request at **support@rjbusinesssolutions.org**. We will respond to your request within thirty (30) days.

---

## SECTION 5: SECURITY AND DATA RETENTION

### 5.1 Security Measures
We employ robust technical and organizational security measures to prevent data breaches, including:
1.  Mandatory SSL/TLS encryption for all data transit.
2.  AES-256 database encryption for static data.
3.  Strict multi-factor authentication (MFA) requirements for all administrative, database, and system accounts.
4.  Isolated sandboxing of customer workspace directories to prevent tenant cross-contamination.

### 5.2 Data Retention
We retain your personal data only for as long as your account is active or as needed to provide you with the Services.
*   **Transactional Data**: Stripe billing and purchase records are retained for a minimum of seven (7) years to comply with IRS and ${fields.state || 'New Mexico'} tax laws.
*   **Inactive Accounts**: Accounts that are inactive for more than twenty-four (24) consecutive months will be flagged for automatic deletion, and all associated visual canvas data and log files will be purged.

---

## SECTION 6: COOKIES AND BEHAVIORAL TRACKING

We use functional and analytical cookies to maintain session states and analyze platform usage:
*   **Functional Cookies**: Essential for the security, login persistence, and responsive state of our Visual Studio.
*   **Analytical Cookies**: Help us track edge execution latency and API load metrics using Cloudflare Web Analytics.
*   **Opt-Out**: You can configure your browser to block or alert you about cookies, but doing so will cause several features of the visual studio and gateway to stop functioning.

---

## SECTION 7: GOVERNING LAW AND ARBITRATION

This Privacy Policy shall be governed by, and construed in accordance with, the laws of the State of ${fields.state || 'New Mexico'}, United States of America, without regard to its conflict of laws principles. Any legal dispute, claim, or controversy concerning your data privacy or the Company’s data practices shall be settled exclusively by binding arbitration in **Tijeras, ${fields.state || 'New Mexico'}**, administered by the American Arbitration Association ("AAA") under its Commercial Arbitration Rules.

---

## SECTION 8: CONTACT AND DATA CONTROLLER

For any questions, complaints, or compliance inquiries regarding this Privacy Policy or our data management practices, please contact our designated Data Protection Officer:

*   **Attn**: ${fields.founder1Name || ''}, Data Controller  
*   **Company**: ${fields.companyName || 'RJ Business Solutions, Inc.'}  
*   **Address**: 1342 NM 333, Tijeras, NM 87059  
*   **Email**: support@rjbusinesssolutions.org  
*   **Secondary Email**: rjbizsolution23@gmail.com  
*   **Phone**: +1 (414) 430-4277  
`;
    }
  },
  'consultant-agreement': {
    id: 'consultant-agreement',
    name: 'Independent Consultant Agreement',
    description: 'Standard independent contractor agreement defining scope of services, rates, and IP assignments.',
    fields: [
      {
            "name": "companyName",
            "label": "Company Name",
            "placeholder": "e.g. RJ Business Solutions, Inc.",
            "defaultVal": "RJ Business Solutions, Inc."
      },
      {
            "name": "effectiveDate",
            "label": "Effective Date",
            "placeholder": "e.g. June 25, 2026",
            "defaultVal": "June 25, 2026"
      },
      {
            "name": "consultantName",
            "label": "Consultant Name",
            "placeholder": "e.g. Alex Rivers",
            "defaultVal": "Alex Rivers"
      },
      {
            "name": "consultantServices",
            "label": "Services Scope",
            "placeholder": "e.g. AI Core Model Optimization",
            "defaultVal": "AI Core Model Optimization and Testing"
      },
      {
            "name": "consultantRate",
            "label": "Consultant Rate",
            "placeholder": "e.g. $125 per hour",
            "defaultVal": "$125 per hour"
      },
      {
            "name": "state",
            "label": "Governing State",
            "placeholder": "e.g. New Mexico",
            "defaultVal": "New Mexico"
      }
],
    fn: (fields: Record<string, string>) => {
      return `# INDEPENDENT CONSULTANT AGREEMENT

This Independent Consultant Agreement (the "Agreement") is entered into as of ${fields.effectiveDate || 'June 25, 2026'} (the "Effective Date"), by and between:

1.  **${fields.companyName || 'RJ Business Solutions, Inc.'}**, a corporation organized under the laws of the State of ${fields.state || 'New Mexico'} (the "Company"); and
2.  **${fields.consultantName || 'Alex Rivers'}**, an independent contractor residing in the State of ${fields.state || 'New Mexico'} (the "Consultant").

---

## SECTION 1: SCOPE OF SERVICES
Consultant agrees to perform the following professional consulting and technical services for the Company (the "Services"):

*   **Core Services**: ${fields.consultantServices || 'AI Core Model Optimization and Testing'}
*   **Handovers**: Provide regular progress reports, written source code, testing configurations, and deployment logs as requested by the Board.

---

## SECTION 2: COMPENSATION AND RATES
The Company shall pay Consultant for the performance of Services in accordance with the following terms:

*   **Rate**: ${fields.consultantRate || '$125 per hour'}
*   **Invoicing**: Consultant shall invoice the Company bi-weekly, detailing hours worked and specific items completed. Payment terms are Net-15.

---

## SECTION 3: INTELLECTUAL PROPERTY AND WORK PRODUCT
Consultant agrees that all inventions, software code, algorithms, documentation, brand systems, and work product developed or conceived in the performance of Services under this Agreement (the "Work Product") shall be the sole and exclusive property of the Company. Consultant hereby assigns all right, title, and interest in the Work Product perpetually and worldwide to the Company.

---

## SECTION 4: GOVERNING LAW AND RESOLUTION
This Agreement shall be governed by, and construed in accordance with, the laws of the State of ${fields.state || 'New Mexico'}. Any dispute arising under this Agreement shall be resolved exclusively through binding arbitration in accordance with the Commercial Rules of the American Arbitration Association, with the physical venue of arbitration in Tijeras, ${fields.state || 'New Mexico'}.

### IN WITNESS WHEREOF, the Parties have executed this Independent Consultant Agreement as of the Effective Date.

#### COMPANY:
**${fields.companyName || 'RJ Business Solutions, Inc.'}**

By: ____________________________
Name: ${fields.founder1Name || ''}
Title: CEO

#### CONSULTANT:
By: ____________________________
Name: ${fields.consultantName || 'Alex Rivers'}
Consultant`;
    }
  },
  'share-certificate': {
    id: 'share-certificate',
    name: 'Common Stock Share Certificate',
    description: 'Official corporate share certificate certifying stock ownership, par value, and transfer terms.',
    fields: [
      {
            "name": "companyName",
            "label": "Company Name",
            "placeholder": "e.g. RJ Business Solutions, Inc.",
            "defaultVal": "RJ Business Solutions, Inc."
      },
      {
            "name": "effectiveDate",
            "label": "Certificate Date",
            "placeholder": "e.g. June 25, 2026",
            "defaultVal": "June 25, 2026"
      },
      {
            "name": "shareholderName",
            "label": "Shareholder Name",
            "placeholder": "e.g. Rick Jefferson",
            "defaultVal": "Rick Jefferson"
      },
      {
            "name": "shareCount",
            "label": "Share Count",
            "placeholder": "e.g. 6,000,000",
            "defaultVal": "6,000,000"
      },
      {
            "name": "certificateNumber",
            "label": "Certificate Number",
            "placeholder": "e.g. CS-001",
            "defaultVal": "CS-001"
      }
],
    fn: (fields: Record<string, string>) => {
      return `================================================================================
                         COMMON STOCK SHARE CERTIFICATE
================================================================================

Certificate Number: ${fields.certificateNumber || 'CS-001'}                             Number of Shares: ${fields.shareCount || '6,000,000'}

                                ${fields.companyName || 'RJ Business Solutions, Inc.'}
                Organized under the laws of the State of ${fields.state || ''}

This certifies that:

                               ${fields.shareholderName || 'Rick Jefferson'}

is the registered holder of ${fields.shareCount || '6,000,000'} shares of Common Stock of ${fields.companyName || 'RJ Business Solutions, Inc.'}, transferable only on the books of the Corporation by the holder hereof in person or by a duly authorized attorney upon surrender of this Certificate properly endorsed.

These shares are subject to certain transfer restrictions, buyback options, and vesting schedules set forth in the Founder Equity and Vesting Agreement and the Shareholders' Agreement of the Company, copies of which are on file at the principal executive offices of the Corporation.

IN WITNESS WHEREOF, the Corporation has caused this Certificate to be signed by its duly authorized officers and its Corporate Seal to be hereunto affixed.

Dated: ${fields.effectiveDate || 'June 25, 2026'}

____________________________                    ____________________________
${fields.founder2Name || ''}, Secretary                          ${fields.shareholderName || 'Rick Jefferson'}, Shareholder

================================================================================`;
    }
  },
  'indemnity-agreement': {
    id: 'indemnity-agreement',
    name: 'Director & Officer Indemnification Agreement',
    description: 'Legally indemnify corporate board members and officers against individual liability or lawsuits.',
    fields: [
      {
            "name": "companyName",
            "label": "Company Name",
            "placeholder": "e.g. RJ Business Solutions, Inc.",
            "defaultVal": "RJ Business Solutions, Inc."
      },
      {
            "name": "effectiveDate",
            "label": "Effective Date",
            "placeholder": "e.g. June 25, 2026",
            "defaultVal": "June 25, 2026"
      },
      {
            "name": "indemniteeName",
            "label": "Indemnitee Name",
            "placeholder": "e.g. Anita Menon",
            "defaultVal": "Anita Menon"
      },
      {
            "name": "state",
            "label": "Governing State",
            "placeholder": "e.g. New Mexico",
            "defaultVal": "New Mexico"
      }
],
    fn: (fields: Record<string, string>) => {
      return `# DIRECTOR AND OFFICER INDEMNIFICATION AGREEMENT

This Indemnification Agreement (the "Agreement") is entered into as of ${fields.effectiveDate || 'June 25, 2026'} (the "Effective Date"), by and between **${fields.companyName || 'RJ Business Solutions, Inc.'}**, a corporation organized under the laws of the State of ${fields.state || 'New Mexico'} (the "Company"), and **${fields.indemniteeName || 'Anita Menon'}**, a Director and/or Officer of the Company (the "Indemnitee").

---

## RECITALS
**WHEREAS**, the Company desires to attract and retain highly qualified individuals to serve as Directors and Officers; and

**WHEREAS**, Indemnitee is willing to serve, or continue to serve, in such capacity provided that they are indemnified against liabilities, costs, and expenses incurred in connection with their service to the fullest extent permitted by the laws of the State of ${fields.state || 'New Mexico'}.

**NOW, THEREFORE**, the Parties agree as follows:

---

## SECTION 1: CORE INDEMNIFICATION OBLIGATIONS
The Company shall indemnify and hold harmless Indemnitee, to the fullest extent permitted by law, if Indemnitee was, is, or is threatened to be made a party to or witness in any threatened, pending, or completed action, suit, or proceeding by reason of the fact that Indemnitee is or was a Director, Officer, employee, or agent of the Company, against all expenses, judgments, fines, penalties, and amounts paid in settlement actually and reasonably incurred by Indemnitee in connection with such action.

---

## SECTION 2: ADVANCEMENT OF EXPENSES
The Company shall advance all reasonable expenses, including attorneys' fees, court costs, and expert fees, incurred by Indemnitee in defending or testifying in any proceeding within ten (15) days of receipt of a written request and invoice, subject to an undertaking by Indemnitee to repay such advances if it is ultimately determined that Indemnitee is not entitled to indemnification.

---

## SECTION 3: SEAT OF GOVERNING LAW
This Agreement shall be governed by, and construed in accordance with, the laws of the State of ${fields.state || 'New Mexico'}. Any dispute arising out of this Agreement shall be settled by binding arbitration before a single arbitrator under AAA Commercial Arbitration Rules, sitting in Tijeras, ${fields.state || 'New Mexico'}.

### IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.

#### COMPANY:
**${fields.companyName || 'RJ Business Solutions, Inc.'}**

By: ____________________________
Name: ${fields.founder1Name || ''}
Title: CEO

#### INDEMNITEE:
By: ____________________________
Name: ${fields.indemniteeName || 'Anita Menon'}
Indemnitee`;
    }
  },
  'incorporation-cert': {
    id: 'incorporation-cert',
    name: 'Certificate of Incorporation',
    description: 'Official corporate filing document establishing authorized share capital, directors, and registered agents.',
    fields: [
      {
            "name": "companyName",
            "label": "Company Name",
            "placeholder": "e.g. RJ Business Solutions, Inc.",
            "defaultVal": "RJ Business Solutions, Inc."
      },
      {
            "name": "effectiveDate",
            "label": "Filing Date",
            "placeholder": "e.g. June 25, 2026",
            "defaultVal": "June 25, 2026"
      },
      {
            "name": "incorporatorName",
            "label": "Incorporator Name",
            "placeholder": "e.g. Rick Jefferson",
            "defaultVal": "Rick Jefferson"
      },
      {
            "name": "state",
            "label": "Filing State",
            "placeholder": "e.g. New Mexico",
            "defaultVal": "New Mexico"
      }
],
    fn: (fields: Record<string, string>) => {
      return `# STATE OF NEW MEXICO
# OFFICE OF THE SECRETARY OF STATE

## ARTICLES OF INCORPORATION OF RJ BUSINESS SOLUTIONS, INC.

The undersigned incorporator, a natural person of the age of eighteen (18) years or older, acting for the purpose of forming a business corporation under the ${fields.state || 'New Mexico'} Business Corporation Act (Chapter 53, Article 11 ${fields.state || 'New Mexico'} Statutes Annotated 1978, as amended), hereby adopts the following Articles of Incorporation:

---

### ARTICLE I: NAME
The name of the corporation is:  
**${fields.companyName || 'RJ Business Solutions, Inc.'}** (hereinafter referred to as the "Corporation").

---

### ARTICLE II: PERIOD OF DURATION
The period of duration of the Corporation is perpetual.

---

### ARTICLE III: PURPOSE AND POWERS
The purpose for which the Corporation is organized is to engage in any and all lawful business activities for which corporations may be incorporated under the ${fields.state || 'New Mexico'} Business Corporation Act, including, but not limited to:
1.  Designing, developing, licensing, and distributing advanced agentic artificial intelligence (AI) software suites, local edge orchestration gateways, and automated developer tools.
2.  Providing full-stack software development, custom systems integration, database engineering, cloud computing deployment, and cybersecurity advisory services.
3.  Acquiring, holding, protecting, licensing, and disposing of patent, trademark, copyright, and trade secret intellectual property assets.
4.  Exercising all such powers as are necessary, convenient, or incidental to the conduct of the business and the promotion of the purposes of the Corporation.

---

### ARTICLE IV: AUTHORIZED CAPITAL STOCK
The total number of shares of capital stock which the Corporation shall have authority to issue is:  
**10,000,000 shares of Common Stock**, having a par value of **$0.0001 per share**.

#### Section 4.1 Voting Rights
Each share of Common Stock shall entitle the holder thereof to one (1) vote on all matters submitted to a vote of the shareholders of the Corporation. Cumulative voting for the election of directors is hereby expressly prohibited.

#### Section 4.2 Dividends
The holders of Common Stock shall be entitled to receive dividends as, when, and if declared by the Board of Directors out of assets legally available therefor.

#### Section 4.3 Liquidation
In the event of any dissolution, liquidation, or winding up of the Corporation, whether voluntary or involuntary, the holders of Common Stock shall be entitled to share ratably in the remaining assets of the Corporation available for distribution after payment of all liabilities.

---

### ARTICLE V: REGISTERED OFFICE AND REGISTERED AGENT
The physical address of the initial registered office of the Corporation in the State of ${fields.state || 'New Mexico'} is:  
**${fields.founder1Address || ''}**

The name of the initial registered agent of the Corporation at such address is:  
**${fields.founder1Name || ''}**

---

### ARTICLE VI: INITIAL BOARD OF DIRECTORS
The business and affairs of the Corporation shall be managed by a Board of Directors. The initial Board of Directors shall consist of three (3) directors, who shall serve until the first annual meeting of shareholders or until their successors are elected and qualified. The names and addresses of the persons who are to serve as the initial directors are:

1.  **${fields.founder1Name || ''}**  
    Address: ${fields.founder1Address || ''}
2.  **${fields.founder2Name || ''}**  
    Address: ${fields.founder2Address || ''}
3.  **${fields.founder3Name || ''}**  
    Address: ${fields.founder3Address || ''}

The number of directors may be increased or decreased from time to time in accordance with the Bylaws of the Corporation, but shall not be fewer than one (1) nor more than nine (9) directors.

---

### ARTICLE VII: LIMITATION OF DIRECTORS' LIABILITY
To the fullest extent permitted by the ${fields.state || 'New Mexico'} Business Corporation Act, a director of the Corporation shall not be personally liable to the Corporation or its shareholders for monetary damages for breach of fiduciary duty as a director, except for liability:
1.  For any breach of the director’s duty of loyalty to the Corporation or its shareholders;
2.  For acts or omissions not in good faith or which involve intentional misconduct or a knowing violation of law;
3.  For any transaction from which the director derived an improper personal benefit; or
4.  For illegal distributions under Section 53-11-44 NMSA 1978.

---

### ARTICLE VIII: BYLAWS
The Board of Directors of the Corporation shall have the power to adopt, amend, alter, or repeal the Bylaws of the Corporation. The Bylaws may contain any provisions for the regulation and management of the affairs of the Corporation not inconsistent with ${fields.state || 'New Mexico'} law or these Articles of Incorporation.

---

### ARTICLE IX: INCORPORATOR
The name and address of the incorporator of the Corporation is:  
**${fields.founder1Name || ''}**  
Address: ${fields.founder1Address || ''}

---

## EXECUTION AND SIGNATURE

**IN WITNESS WHEREOF**, the undersigned incorporator has executed these Articles of Incorporation on this **25th day of June, 2026**.

\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  
**${fields.founder1Name || ''}**, Incorporator  
Date: ${fields.effectiveDate || 'June 25, 2026'}

---

## STATEMENT OF ACCEPTANCE OF APPOINTMENT BY REGISTERED AGENT

I, **${fields.founder1Name || ''}**, hereby accept the appointment as Registered Agent for **${fields.companyName || 'RJ Business Solutions, Inc.'}**, in the State of ${fields.state || 'New Mexico'}. I acknowledge and agree that it is my responsibility as registered agent to receive service of process, notices, or demands on behalf of the Corporation and to forward the same to the Corporation in accordance with ${fields.state || 'New Mexico'} law.

\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  
**${fields.founder1Name || ''}**, Registered Agent  
Date: ${fields.effectiveDate || 'June 25, 2026'}
`;
    }
  },
};
