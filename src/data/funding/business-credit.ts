/**
 * Comprehensive Business Credit & Net-30/60/10 Vendor Database
 * 
 * Includes Tier 1, Tier 2, Tier 3 Business Vendors, Furniture Stores, 
 * Store Credit, and Revolving Corporate Lines with Soft Qualifiers.
 */

export type BusinessTier = "TIER_1_STARTER" | "TIER_2_BUILDER" | "TIER_3_EXPANSION" | "TIER_4_REVOLVING";

export type ReportingBureau = "Dun & Bradstreet (Paydex)" | "Experian Business" | "Equifax Business" | "CreditSafe" | "SBFE";

export interface BusinessVendor {
  id: string;
  name: string;
  category: "OFFICE_SUPPLIES" | "INDUSTRIAL_MAINTENANCE" | "FURNITURE_DESIGN" | "BUILDING_MATERIALS" | "CORPORATE_FINANCE" | "RETAIL_WHOLESALE";
  tier: BusinessTier;
  terms: "Net 30" | "Net 60" | "Net 10" | "Revolving Credit Line" | "Revolving Card";
  reportingBureaus: ReportingBureau[];
  requiresPg: boolean; // Personal Guarantee required?
  minTimeInBusinessMonths: number;
  minMonthlyRevenueReq?: number;
  softPullPrequal: boolean;
  minInitialPurchaseForReporting: string;
  keyBenefits: string[];
  underwritingSweetSpot: string;
  applicationUrl: string;
}

export const MASTER_BUSINESS_VENDORS: BusinessVendor[] = [
  // ============================================================
  // TIER 1 — STARTER NET-30 VENDORS (NO PG, NO CREDIT CHECK)
  // ============================================================
  {
    id: "uline-net30",
    name: "Uline Shipping & Industrial",
    category: "INDUSTRIAL_MAINTENANCE",
    tier: "TIER_1_STARTER",
    terms: "Net 30",
    reportingBureaus: ["Dun & Bradstreet (Paydex)", "Experian Business"],
    requiresPg: false,
    minTimeInBusinessMonths: 0,
    softPullPrequal: true,
    minInitialPurchaseForReporting: "$75 minimum invoice",
    keyBenefits: [
      "No Personal Guarantee required",
      "Reports monthly to D&B and Experian Business",
      "Instant invoice credit upon checkout select 'Net 30'"
    ],
    underwritingSweetSpot: "Active LLC/Corp registered with Secretary of State and EIN.",
    applicationUrl: "https://www.uline.com"
  },
  {
    id: "quill-net30",
    name: "Quill Office Products",
    category: "OFFICE_SUPPLIES",
    tier: "TIER_1_STARTER",
    terms: "Net 30",
    reportingBureaus: ["Dun & Bradstreet (Paydex)", "Experian Business"],
    requiresPg: false,
    minTimeInBusinessMonths: 0,
    softPullPrequal: true,
    minInitialPurchaseForReporting: "$100/mo over 90 days or instant approval",
    keyBenefits: [
      "No PG or personal credit pull",
      "Essential office, cleaning, and breakroom supplies",
      "High Paydex score driver"
    ],
    underwritingSweetSpot: "LLC in good standing with physical or virtual business address.",
    applicationUrl: "https://www.quill.com"
  },
  {
    id: "grainger-net30",
    name: "Grainger Industrial Supply",
    category: "INDUSTRIAL_MAINTENANCE",
    tier: "TIER_1_STARTER",
    terms: "Net 30",
    reportingBureaus: ["Dun & Bradstreet (Paydex)", "Experian Business", "CreditSafe"],
    requiresPg: false,
    minTimeInBusinessMonths: 0,
    softPullPrequal: true,
    minInitialPurchaseForReporting: "$150 invoice",
    keyBenefits: [
      "No PG required for standard Net 30",
      "Over 1.5 million industrial and commercial items",
      "Direct reporting to Paydex and Experian Business"
    ],
    underwritingSweetSpot: "Business phone listing in 411 directory and registered D-U-N-S number.",
    applicationUrl: "https://www.grainger.com"
  },
  {
    id: "summa-office-supplies",
    name: "Summa Office Supplies",
    category: "OFFICE_SUPPLIES",
    tier: "TIER_1_STARTER",
    terms: "Net 30",
    reportingBureaus: ["Experian Business", "Equifax Business"],
    requiresPg: false,
    minTimeInBusinessMonths: 0,
    softPullPrequal: true,
    minInitialPurchaseForReporting: "$75 purchase",
    keyBenefits: [
      "Fast online approval with 0 business credit history",
      "Reports to Experian & Equifax Business",
      "$2,000 initial trade credit limit"
    ],
    underwritingSweetSpot: "Newly formed LLCs needing immediate trade line velocity.",
    applicationUrl: "https://www.summaofficesupplies.com"
  },
  {
    id: "crown-office-supplies",
    name: "Crown Office Supplies",
    category: "OFFICE_SUPPLIES",
    tier: "TIER_1_STARTER",
    terms: "Net 30",
    reportingBureaus: ["Dun & Bradstreet (Paydex)", "Experian Business", "CreditSafe"],
    requiresPg: false,
    minTimeInBusinessMonths: 0,
    softPullPrequal: true,
    minInitialPurchaseForReporting: "$75 minimum purchase",
    keyBenefits: [
      "Instant $2,000 to $5,000 initial trade limit",
      "Reports to 3 major business credit bureaus",
      "No PG required"
    ],
    underwritingSweetSpot: "Active EIN, business email domain, and Secretary of State filing.",
    applicationUrl: "https://www.crownofficesupplies.com"
  },
  {
    id: "office-garner",
    name: "Office Garner",
    category: "OFFICE_SUPPLIES",
    tier: "TIER_1_STARTER",
    terms: "Net 30",
    reportingBureaus: ["Experian Business", "CreditSafe", "Equifax Business"],
    requiresPg: false,
    minTimeInBusinessMonths: 0,
    softPullPrequal: true,
    minInitialPurchaseForReporting: "$45 purchase",
    keyBenefits: [
      "$1,000 to $2,500 trade limit",
      "Reports monthly on the 1st",
      "Digital products, office items, and electronics"
    ],
    underwritingSweetSpot: "Verified business address and EIN.",
    applicationUrl: "https://www.officegarner.com"
  },
  {
    id: "nav-prime",
    name: "Nav Prime Business Credit Manager",
    category: "CORPORATE_FINANCE",
    tier: "TIER_1_STARTER",
    terms: "Net 30",
    reportingBureaus: ["Dun & Bradstreet (Paydex)", "Experian Business", "Equifax Business"],
    requiresPg: false,
    minTimeInBusinessMonths: 0,
    softPullPrequal: true,
    minInitialPurchaseForReporting: "$49.99/mo subscription",
    keyBenefits: [
      "Reports subscription payment as a primary trade line to D&B, Experian, & Equifax",
      "Includes full 3-bureau business score monitoring",
      "Instant trade line reporting"
    ],
    underwritingSweetSpot: "Essential base trade line for all business credit builds.",
    applicationUrl: "https://www.nav.com"
  },

  // ============================================================
  // TIER 2 — STORE CREDIT & FURNITURE (WAYFAIR, HD SUPPLY, LOWE'S)
  // ============================================================
  {
    id: "wayfair-professional",
    name: "Wayfair Professional",
    category: "FURNITURE_DESIGN",
    tier: "TIER_2_BUILDER",
    terms: "Net 60",
    reportingBureaus: ["Dun & Bradstreet (Paydex)", "Experian Business"],
    requiresPg: false,
    minTimeInBusinessMonths: 3,
    softPullPrequal: true,
    minInitialPurchaseForReporting: "$250 invoice",
    keyBenefits: [
      "Commercial furniture, staging, and office layout credit",
      "Net 30 / Net 60 terms for verified business accounts",
      "Pro pricing discounts up to 15%"
    ],
    underwritingSweetSpot: "3+ months in business with 2+ Tier 1 reporting trade lines.",
    applicationUrl: "https://www.wayfair.com/v/business/home"
  },
  {
    id: "hd-supply-solutions",
    name: "HD Supply Pro Solutions",
    category: "INDUSTRIAL_MAINTENANCE",
    tier: "TIER_2_BUILDER",
    terms: "Net 30",
    reportingBureaus: ["Dun & Bradstreet (Paydex)", "Experian Business"],
    requiresPg: false,
    minTimeInBusinessMonths: 3,
    softPullPrequal: true,
    minInitialPurchaseForReporting: "$100 invoice",
    keyBenefits: [
      "Property management, maintenance, and commercial hardware line",
      "No PG required for established business accounts",
      "Reports high credit limit to Paydex"
    ],
    underwritingSweetSpot: "3 Tier 1 trade lines reporting on D&B with 80+ Paydex score.",
    applicationUrl: "https://hdsupplysolutions.com"
  },
  {
    id: "lowes-pro-net30",
    name: "Lowe's Pro Accounts Receivables",
    category: "BUILDING_MATERIALS",
    tier: "TIER_2_BUILDER",
    terms: "Net 30",
    reportingBureaus: ["Dun & Bradstreet (Paydex)", "Experian Business"],
    requiresPg: false,
    minTimeInBusinessMonths: 6,
    softPullPrequal: true,
    minInitialPurchaseForReporting: "$100 purchase",
    keyBenefits: [
      "$5,000 to $25,000 commercial credit limit",
      "5% discount on all eligible Lowe's purchases",
      "No PG required if business has 3+ trade references"
    ],
    underwritingSweetSpot: "6+ months in business, D-U-N-S number, and 80+ Paydex.",
    applicationUrl: "https://www.lowes.com/l/pro/credit"
  },
  {
    id: "home-depot-pro-xtra",
    name: "Home Depot Pro Xtra Commercial Account",
    category: "BUILDING_MATERIALS",
    tier: "TIER_2_BUILDER",
    terms: "Net 60",
    reportingBureaus: ["Dun & Bradstreet (Paydex)", "Experian Business", "Equifax Business"],
    requiresPg: false,
    minTimeInBusinessMonths: 6,
    softPullPrequal: true,
    minInitialPurchaseForReporting: "$100 purchase",
    keyBenefits: [
      "Issued by Citibank Commercial (No PG option available)",
      "Pro fuel savings, volume pricing, and bulk delivery",
      "Reports high limit to all 3 business credit bureaus"
    ],
    underwritingSweetSpot: "Established business profile with 4+ trade lines.",
    applicationUrl: "https://www.homedepot.com/c/Pro_Xtra"
  },
  {
    id: "amazon-business-pay-by-invoice",
    name: "Amazon Business Pay by Invoice",
    category: "RETAIL_WHOLESALE",
    tier: "TIER_2_BUILDER",
    terms: "Net 30",
    reportingBureaus: ["Dun & Bradstreet (Paydex)", "Experian Business"],
    requiresPg: false,
    minTimeInBusinessMonths: 3,
    softPullPrequal: true,
    minInitialPurchaseForReporting: "$100 invoice",
    keyBenefits: [
      "Unlimited product inventory via Amazon Business",
      "0% interest Net 30/60 invoice payment terms",
      "No PG required for verified corporate accounts"
    ],
    underwritingSweetSpot: "Amazon Business account with $1,000+ monthly purchase history.",
    applicationUrl: "https://smart.amazon.com/business"
  },

  // ============================================================
  // TIER 3 — REVOLVING CORPORATE LINES & CARDS (DIVVY, SAM'S PRO, SPARK)
  // ============================================================
  {
    id: "divvy-bill-corporate",
    name: "BILL Divvy Corporate Expense Card",
    category: "CORPORATE_FINANCE",
    tier: "TIER_3_EXPANSION",
    terms: "Revolving Card",
    reportingBureaus: ["Dun & Bradstreet (Paydex)", "Experian Business"],
    requiresPg: false,
    minTimeInBusinessMonths: 3,
    minMonthlyRevenueReq: 5000,
    softPullPrequal: true,
    minInitialPurchaseForReporting: "Active card use",
    keyBenefits: [
      "$5,000 to $100,000 flexible credit line based on business cash flow",
      "Soft pull qualification — no impact to personal credit scores",
      "Automatic expense management and virtual card creation"
    ],
    underwritingSweetSpot: "Business bank account with $5,000+ monthly revenue or $10,000+ balance.",
    applicationUrl: "https://getdivvy.com"
  },
  {
    id: "sams-club-business-credit",
    name: "Sam's Club Business Credit",
    category: "RETAIL_WHOLESALE",
    tier: "TIER_3_EXPANSION",
    terms: "Revolving Credit Line",
    reportingBureaus: ["Dun & Bradstreet (Paydex)", "Experian Business"],
    requiresPg: false,
    minTimeInBusinessMonths: 12,
    softPullPrequal: true,
    minInitialPurchaseForReporting: "$100 purchase",
    keyBenefits: [
      "Commercial line issued by Synchrony Bank",
      "No PG required for corporations/LLCs with $1M+ revenue or established credit profile",
      "Accepted at all Sam's Club & Walmart locations nationwide"
    ],
    underwritingSweetSpot: "12+ months in business, 5+ trade lines reporting.",
    applicationUrl: "https://www.samsclub.com/content/credit"
  }
];

export default MASTER_BUSINESS_VENDORS;
