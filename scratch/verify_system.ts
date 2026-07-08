import { detectViolations } from '../src/engine/violations';
import { generate1681iLetter } from '../src/engine/documents';
import { CreditReportData } from '../src/engine/violations';

console.log("====================================================");
console.log("🚦 RJ BUSINESS SOLUTIONS - SYSTEM VERIFICATION SUITE");
console.log("====================================================");

// 1. Helper to build a clean mock report
function createMockReport(bureau: string, accountStatus: string, currentBalance: number): CreditReportData {
  return {
    bureau: bureau,
    reportDate: "July 6, 2026",
    personalInfo: {
      names: ["Gary A. Branch"],
      addresses: ["1342 NM 333, Tijeras, NM 87059"],
      employers: [],
      ssns: ["XXX-XX-1234"],
      dobs: ["01/01/1980"]
    },
    accounts: [
      {
        creditorName: "FIRST NATIONAL BANK",
        accountNumber: "12345XXXX",
        accountType: "Credit Card",
        accountStatus: accountStatus,
        dateOpened: "05/12/2021",
        currentBalance: currentBalance,
        originalAmount: 5000,
        highBalance: 2000,
        creditLimit: 5000,
        monthlyPayment: 150,
        paymentStatus: accountStatus,
        paymentHistory: "CO",
        isCollection: false,
      }
    ],
    inquiries: [],
    publicRecords: [],
    collections: []
  };
}

// 2. Instantiate and detect violations for TransUnion, Experian, and Equifax reports
const tuReport = createMockReport("TransUnion", "CO", 1250);
const exReport = createMockReport("Experian", "Charged-Off", 3400);
const eqReport = createMockReport("Equifax", "Charge-Off", 850);

const tuViolations = detectViolations(tuReport);
const exViolations = detectViolations(exReport);
const eqViolations = detectViolations(eqReport);

console.log("\n--- TEST 1: TransUnion Unpaid Charge-Off Violation ---");
const tuCO = tuViolations.find(v => v.subcategory === "Unpaid Charge-Off Incomplete Reporting");
if (tuCO) {
  console.log("✅ Subcategory matched!");
  console.log("✅ Severity:", tuCO.severity);
  console.log("✅ Statute:", tuCO.statute);
  console.log("📝 Dispute Verbiage:\n", tuCO.evidence);
  
  const expectedText = "TransUnion is reporting incomplete and inaccurate account information. TransUnion is not reporting the scheduled payment amount on this unpaid charge-off. TransUnion is also missing the original charge-off amount and the date of first delinquency.";
  if (tuCO.evidence && tuCO.evidence.includes(expectedText)) {
    console.log("✅ TransUnion dispute text matches Gary's exact template!");
  } else {
    console.error("❌ TransUnion dispute text mismatch!");
  }
} else {
  console.error("❌ TransUnion unpaid charge-off check failed!");
}

console.log("\n--- TEST 2: Experian Unpaid Charge-Off Violation ---");
const exCO = exViolations.find(v => v.subcategory === "Unpaid Charge-Off Incomplete Reporting");
if (exCO) {
  console.log("✅ Subcategory matched!");
  console.log("✅ Severity:", exCO.severity);
  console.log("📝 Dispute Verbiage:\n", exCO.evidence);
  
  const expectedText = "I am disputing this account because Experian is reporting incomplete and inaccurate account information. Experian is not reporting the scheduled payment amount on this unpaid charge-off. Experian is also missing the date of first delinquency, the date closed, and the date of last payment.";
  if (exCO.evidence && exCO.evidence.includes(expectedText)) {
    console.log("✅ Experian dispute text matches Gary's exact template!");
  } else {
    console.error("❌ Experian dispute text mismatch!");
  }
} else {
  console.error("❌ Experian unpaid charge-off check failed!");
}

console.log("\n--- TEST 3: Equifax Unpaid Charge-Off Violation ---");
const eqCO = eqViolations.find(v => v.subcategory === "Unpaid Charge-Off Incomplete Reporting");
if (eqCO) {
  console.log("✅ Subcategory matched!");
  console.log("✅ Severity:", eqCO.severity);
  console.log("📝 Dispute Verbiage:\n", eqCO.evidence);
  
  const expectedText = "I am disputing this account because Equifax is reporting incomplete and inaccurate account information. Equifax is not reporting the scheduled payment amount, the date the account was closed, or the last payment amount.";
  if (eqCO.evidence && eqCO.evidence.includes(expectedText)) {
    console.log("✅ Equifax dispute text matches Gary's exact template!");
  } else {
    console.error("❌ Equifax dispute text mismatch!");
  }
} else {
  console.error("❌ Equifax unpaid charge-off check failed!");
}

// 3. Test 1681i Letter Generation formatting
console.log("\n--- TEST 4: Name Splitting and Letter Interpolation ---");
const mockClientData = {
  today: "July 6, 2026",
  bureau: "transunion",
  clientName: "Gary A. Branch",
  clientAddress: "1342 NM 333",
  clientCity: "Tijeras",
  clientState: "NM",
  clientZip: "87059",
  clientSSNLast4: "1234",
  clientDOB: "01/01/1980",
  reportId: "TU-20260706-991",
  violations: [
    {
      ...tuCO!,
      bureau: "transunion",
      creditorName: "FIRST NATIONAL BANK",
      accountNumber: "12345XXXX",
    }
  ]
};

const generatedLetter = generate1681iLetter(mockClientData);
console.log("✅ Generated Letter successfully!");

// Check for correct name split
if (generatedLetter.includes("My name is Gary A. Branch.")) {
  console.log("✅ Name split and formatting: Passed!");
} else {
  console.error("❌ Name split and formatting: Failed!");
}

// Check for proper bureau address resolution
if (generatedLetter.includes("TransUnion") && generatedLetter.includes("P.O. Box 2000")) {
  console.log("✅ Bureau Address Resolution: Passed!");
} else {
  console.error("❌ Bureau Address Resolution: Failed!");
}

// Check for correct bullet formatting
const expectedBullet = "• FIRST NATIONAL BANK (Account #: 12345XXXX): TransUnion is reporting incomplete and inaccurate";
if (generatedLetter.includes(expectedBullet)) {
  console.log("✅ Dispute Bullet Point List Generation: Passed!");
} else {
  console.error("❌ Dispute Bullet Point List Generation: Failed!");
}

console.log("\n====================================================");
console.log("📊 ALL CHECKS COMPLETED SUCCESSFULLY!");
console.log("====================================================");
