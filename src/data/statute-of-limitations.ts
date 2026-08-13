/**
 * 50-STATE STATUTE OF LIMITATIONS DATABASE
 * For Credit Card Debt, Written Contracts, and Judgments
 * 
 * Owner: Rick Jefferson | RJ Business Solutions
 * Source: Smart FCRA Knowledge Base (RJ Business Solutions)
 * Last Updated: July 16, 2026
 */

export interface StatuteLimitations {
  openAccount: number;       // Credit cards
  writtenContract: number;   // Auto loans, personal loans, mortgages
  promissoryNote: number;    // Promissory notes
  judgment: number;          // Court judgments
  governingStatute: string;
}

export const STATE_SOL_DATABASE: { [state: string]: StatuteLimitations } = {
  'AL': {
    openAccount: 3,
    writtenContract: 6,
    promissoryNote: 6,
    judgment: 20,
    governingStatute: 'Ala. Code § 6-2-34'
  },
  'AK': {
    openAccount: 3,
    writtenContract: 3,
    promissoryNote: 6,
    judgment: 10,
    governingStatute: 'Alaska Stat. § 09.10.053'
  },
  'AZ': {
    openAccount: 3,
    writtenContract: 6,
    promissoryNote: 6,
    judgment: 5,
    governingStatute: 'Ariz. Rev. Stat. § 12-543'
  },
  'AR': {
    openAccount: 3,
    writtenContract: 5,
    promissoryNote: 5,
    judgment: 10,
    governingStatute: 'Ark. Code § 16-56-105'
  },
  'CA': {
    openAccount: 4,
    writtenContract: 4,
    promissoryNote: 4,
    judgment: 10,
    governingStatute: 'Cal. Civ. Proc. Code § 337'
  },
  'CO': {
    openAccount: 6,
    writtenContract: 6,
    promissoryNote: 6,
    judgment: 20,
    governingStatute: 'Colo. Rev. Stat. § 13-80-103.5'
  },
  'CT': {
    openAccount: 6,
    writtenContract: 6,
    promissoryNote: 6,
    judgment: 20,
    governingStatute: 'Conn. Gen. Stat. § 52-576'
  },
  'DE': {
    openAccount: 3,
    writtenContract: 3,
    promissoryNote: 6,
    judgment: 10,
    governingStatute: 'Del. Code tit. 10, § 8106'
  },
  'DC': {
    openAccount: 3,
    writtenContract: 3,
    promissoryNote: 3,
    judgment: 12,
    governingStatute: 'D.C. Code § 12-301'
  },
  'FL': {
    openAccount: 4,
    writtenContract: 5,
    promissoryNote: 5,
    judgment: 20,
    governingStatute: 'Fla. Stat. § 95.11'
  },
  'GA': {
    openAccount: 4,
    writtenContract: 6,
    promissoryNote: 6,
    judgment: 7,
    governingStatute: 'Ga. Code § 9-3-24'
  },
  'HI': {
    openAccount: 6,
    writtenContract: 6,
    promissoryNote: 6,
    judgment: 10,
    governingStatute: 'Haw. Rev. Stat. § 657-1'
  },
  'ID': {
    openAccount: 4,
    writtenContract: 5,
    promissoryNote: 5,
    judgment: 6,
    governingStatute: 'Idaho Code § 5-217'
  },
  'IL': {
    openAccount: 5,
    writtenContract: 10,
    promissoryNote: 10,
    judgment: 27,
    governingStatute: '735 ILCS 5/13-205'
  },
  'IN': {
    openAccount: 6,
    writtenContract: 6,
    promissoryNote: 10,
    judgment: 20,
    governingStatute: 'Ind. Code § 34-11-2-7'
  },
  'IA': {
    openAccount: 5,
    writtenContract: 10,
    promissoryNote: 10,
    judgment: 20,
    governingStatute: 'Iowa Code § 614.1'
  },
  'KS': {
    openAccount: 3,
    writtenContract: 5,
    promissoryNote: 5,
    judgment: 5,
    governingStatute: 'Kan. Stat. § 60-512'
  },
  'KY': {
    openAccount: 5,
    writtenContract: 15,
    promissoryNote: 15,
    judgment: 15,
    governingStatute: 'Ky. Rev. Stat. § 413.090'
  },
  'LA': {
    openAccount: 3,
    writtenContract: 10,
    promissoryNote: 10,
    judgment: 10,
    governingStatute: 'La. Civ. Code Art. 3492'
  },
  'ME': {
    openAccount: 6,
    writtenContract: 6,
    promissoryNote: 6,
    judgment: 20,
    governingStatute: 'Me. Rev. Stat. tit. 14, § 752'
  },
  'MD': {
    openAccount: 3,
    writtenContract: 3,
    promissoryNote: 6,
    judgment: 12,
    governingStatute: 'Md. Code Cts. & Jud. Proc. § 5-101'
  },
  'MA': {
    openAccount: 6,
    writtenContract: 6,
    promissoryNote: 6,
    judgment: 20,
    governingStatute: 'Mass. Gen. Laws ch. 260, § 2'
  },
  'MI': {
    openAccount: 6,
    writtenContract: 6,
    promissoryNote: 6,
    judgment: 10,
    governingStatute: 'Mich. Comp. Laws § 600.5807'
  },
  'MN': {
    openAccount: 6,
    writtenContract: 6,
    promissoryNote: 6,
    judgment: 10,
    governingStatute: 'Minn. Stat. § 541.05'
  },
  'MS': {
    openAccount: 3,
    writtenContract: 3,
    promissoryNote: 6,
    judgment: 7,
    governingStatute: 'Miss. Code § 15-1-29'
  },
  'MO': {
    openAccount: 5,
    writtenContract: 10,
    promissoryNote: 10,
    judgment: 10,
    governingStatute: 'Mo. Rev. Stat. § 516.110'
  },
  'MT': {
    openAccount: 5,
    writtenContract: 8,
    promissoryNote: 8,
    judgment: 10,
    governingStatute: 'Mont. Code § 27-2-202'
  },
  'NE': {
    openAccount: 4,
    writtenContract: 5,
    promissoryNote: 6,
    judgment: 5,
    governingStatute: 'Neb. Rev. Stat. § 25-205'
  },
  'NV': {
    openAccount: 4,
    writtenContract: 6,
    promissoryNote: 6,
    judgment: 6,
    governingStatute: 'Nev. Rev. Stat. § 11.190'
  },
  'NH': {
    openAccount: 3,
    writtenContract: 3,
    promissoryNote: 6,
    judgment: 20,
    governingStatute: 'N.H. Rev. Stat. § 508:4'
  },
  'NJ': {
    openAccount: 6,
    writtenContract: 6,
    promissoryNote: 6,
    judgment: 20,
    governingStatute: 'N.J. Stat. § 2A:14-1'
  },
  'NM': {
    openAccount: 4,
    writtenContract: 6,
    promissoryNote: 6,
    judgment: 14,
    governingStatute: 'N.M. Stat. § 37-1-3'
  },
  'NY': {
    openAccount: 6,
    writtenContract: 6,
    promissoryNote: 6,
    judgment: 20,
    governingStatute: 'N.Y. C.P.L.R. § 213'
  },
  'NC': {
    openAccount: 3,
    writtenContract: 3,
    promissoryNote: 5,
    judgment: 10,
    governingStatute: 'N.C. Gen. Stat. § 1-52'
  },
  'ND': {
    openAccount: 6,
    writtenContract: 6,
    promissoryNote: 6,
    judgment: 10,
    governingStatute: 'N.D. Cent. Code § 28-01-16'
  },
  'OH': {
    openAccount: 6,
    writtenContract: 15,
    promissoryNote: 15,
    judgment: 21,
    governingStatute: 'Ohio Rev. Code § 2305.06'
  },
  'OK': {
    openAccount: 3,
    writtenContract: 5,
    promissoryNote: 5,
    judgment: 5,
    governingStatute: 'Okla. Stat. tit. 12, § 95'
  },
  'OR': {
    openAccount: 6,
    writtenContract: 6,
    promissoryNote: 6,
    judgment: 10,
    governingStatute: 'Or. Rev. Stat. § 12.080'
  },
  'PA': {
    openAccount: 4,
    writtenContract: 4,
    promissoryNote: 4,
    judgment: 20,
    governingStatute: '42 Pa. Cons. Stat. § 5525'
  },
  'RI': {
    openAccount: 10,
    writtenContract: 10,
    promissoryNote: 10,
    judgment: 20,
    governingStatute: 'R.I. Gen. Laws § 9-1-13'
  },
  'SC': {
    openAccount: 3,
    writtenContract: 3,
    promissoryNote: 6,
    judgment: 10,
    governingStatute: 'S.C. Code § 15-3-530'
  },
  'SD': {
    openAccount: 6,
    writtenContract: 6,
    promissoryNote: 6,
    judgment: 20,
    governingStatute: 'S.D. Codified Laws § 15-2-13'
  },
  'TN': {
    openAccount: 6,
    writtenContract: 6,
    promissoryNote: 6,
    judgment: 10,
    governingStatute: 'Tenn. Code § 28-3-109'
  },
  'TX': {
    openAccount: 4,
    writtenContract: 4,
    promissoryNote: 4,
    judgment: 10,
    governingStatute: 'Tex. Civ. Prac. & Rem. Code § 16.004'
  },
  'UT': {
    openAccount: 4,
    writtenContract: 6,
    promissoryNote: 6,
    judgment: 8,
    governingStatute: 'Utah Code § 78B-2-307'
  },
  'VT': {
    openAccount: 6,
    writtenContract: 6,
    promissoryNote: 6,
    judgment: 8,
    governingStatute: 'Vt. Stat. tit. 12, § 506'
  },
  'VA': {
    openAccount: 3,
    writtenContract: 5,
    promissoryNote: 6,
    judgment: 20,
    governingStatute: 'Va. Code § 8.01-246'
  },
  'WA': {
    openAccount: 3,
    writtenContract: 6,
    promissoryNote: 6,
    judgment: 10,
    governingStatute: 'Wash. Rev. Code § 4.16.080'
  },
  'WV': {
    openAccount: 5,
    writtenContract: 10,
    promissoryNote: 6,
    judgment: 10,
    governingStatute: 'W. Va. Code § 55-2-6'
  },
  'WI': {
    openAccount: 6,
    writtenContract: 6,
    promissoryNote: 10,
    judgment: 20,
    governingStatute: 'Wis. Stat. § 893.43'
  },
  'WY': {
    openAccount: 8,
    writtenContract: 10,
    promissoryNote: 10,
    judgment: 5,
    governingStatute: 'Wyo. Stat. § 1-3-105'
  }
};

/**
 * Get statute of limitations for a specific state and debt type
 */
export function getSOL(
  state: string,
  debtType: 'openAccount' | 'writtenContract' | 'promissoryNote' | 'judgment'
): number {
  const stateLimits = STATE_SOL_DATABASE[state.toUpperCase()];
  if (!stateLimits) {
    return 6; // Conservative default
  }
  return stateLimits[debtType];
}

/**
 * Check if a debt is time-barred based on DOFD
 */
export function isTimeBarred(
  dofd: string,
  state: string,
  debtType: 'openAccount' | 'writtenContract'
): boolean {
  try {
    const dofdDate = new Date(dofd);
    if (isNaN(dofdDate.getTime())) {
      return false; // Cannot determine without valid DOFD
    }
    
    const solYears = getSOL(state, debtType);
    const expirationDate = new Date(dofdDate);
    expirationDate.setFullYear(expirationDate.getFullYear() + solYears);
    
    return new Date() > expirationDate;
  } catch (error) {
    return false;
  }
}

/**
 * Get expiration date for a debt
 */
export function getSOLExpirationDate(
  dofd: string,
  state: string,
  debtType: 'openAccount' | 'writtenContract'
): Date | null {
  try {
    const dofdDate = new Date(dofd);
    if (isNaN(dofdDate.getTime())) {
      return null;
    }
    
    const solYears = getSOL(state, debtType);
    const expirationDate = new Date(dofdDate);
    expirationDate.setFullYear(expirationDate.getFullYear() + solYears);
    
    return expirationDate;
  } catch (error) {
    return null;
  }
}

/**
 * Get human-readable SOL status message
 */
export function getSOLStatusMessage(
  dofd: string,
  state: string,
  debtType: 'openAccount' | 'writtenContract'
): string {
  const expirationDate = getSOLExpirationDate(dofd, state, debtType);
  if (!expirationDate) {
    return 'Unable to determine statute of limitations (invalid DOFD)';
  }
  
  const solYears = getSOL(state, debtType);
  const isExpired = isTimeBarred(dofd, state, debtType);
  const govStatute = STATE_SOL_DATABASE[state.toUpperCase()]?.governingStatute || 'state law';
  
  if (isExpired) {
    const yearsOverdue = Math.floor((Date.now() - expirationDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return `⚠️ TIME-BARRED: This debt expired on ${expirationDate.toLocaleDateString()} (${yearsOverdue} years past SOL). Under ${govStatute}, ${state} statute of limitations for ${debtType === 'openAccount' ? 'credit card debt' : 'written contracts'} is ${solYears} years. This debt is LEGALLY UNCOLLECTABLE.`;
  } else {
    const daysRemaining = Math.floor((expirationDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    return `✓ WITHIN SOL: This debt will expire on ${expirationDate.toLocaleDateString()} (${daysRemaining} days remaining). ${state} SOL: ${solYears} years under ${govStatute}.`;
  }
}
