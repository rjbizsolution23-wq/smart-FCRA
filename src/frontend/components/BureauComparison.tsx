/**
 * FCRA SUPREME VIOLATION DETECTOR
 * Bureau Comparison Component - Side-by-Side Bureau Analysis
 * 
 * Features:
 * - Side-by-side comparison of Experian, Equifax, TransUnion
 * - Visual diff highlighting (matching/mismatched data)
 * - Sync scroll for parallel viewing
 * - Discrepancy detection and alerts
 * - Export comparison report
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowLeftRight,
  Download,
  Search,
  Filter,
  Eye,
  TrendingDown,
  DollarSign,
  Calendar,
  FileText,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface BureauAccount {
  accountId: string;
  accountName: string;
  accountNumber: string;
  creditorName: string;
  currentBalance: number;
  creditLimit?: number;
  accountStatus: string;
  dateOpened: string;
  dateOfFirstDelinquency?: string;
  paymentHistory: Array<{ month: string; status: string }>;
  remarks?: string;
  bureau: 'EXPERIAN' | 'EQUIFAX' | 'TRANSUNION';
}

interface ComparisonResult {
  accountName: string;
  field: string;
  experian: string | number | null;
  equifax: string | number | null;
  transunion: string | number | null;
  isMatch: boolean;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  violationType?: string;
}

interface BureauComparisonProps {
  accounts: BureauAccount[];
  language: 'en' | 'es';
  onDiscrepancyClick?: (discrepancy: ComparisonResult) => void;
}

export const BureauComparison: React.FC<BureauComparisonProps> = ({
  accounts,
  language,
  onDiscrepancyClick
}) => {
  const [viewMode, setViewMode] = useState<'SIDE_BY_SIDE' | 'DISCREPANCY_ONLY'>('SIDE_BY_SIDE');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['accounts']));
  const [syncScroll, setSyncScroll] = useState(true);

  const scrollRefs = {
    experian: useRef<HTMLDivElement>(null),
    equifax: useRef<HTMLDivElement>(null),
    transunion: useRef<HTMLDivElement>(null)
  };

  // Synchronized scrolling
  const handleScroll = (bureau: 'experian' | 'equifax' | 'transunion') => {
    if (!syncScroll) return;
    
    const source = scrollRefs[bureau].current;
    if (!source) return;

    Object.entries(scrollRefs).forEach(([key, ref]) => {
      if (key !== bureau && ref.current) {
        ref.current.scrollTop = source.scrollTop;
      }
    });
  };

  // Group accounts by account name/number
  const accountGroups = useMemo(() => {
    const groups = new Map<string, BureauAccount[]>();
    
    accounts.forEach(account => {
      const key = `${account.creditorName}:${account.accountNumber}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(account);
    });

    return Array.from(groups.entries()).map(([key, accts]) => ({
      key,
      accounts: accts,
      creditorName: accts[0].creditorName,
      accountNumber: accts[0].accountNumber
    }));
  }, [accounts]);

  // Filter groups by search term
  const filteredGroups = useMemo(() => {
    if (!searchTerm) return accountGroups;
    const term = searchTerm.toLowerCase();
    return accountGroups.filter(group =>
      group.creditorName.toLowerCase().includes(term) ||
      group.accountNumber.toLowerCase().includes(term)
    );
  }, [accountGroups, searchTerm]);

  // Detect discrepancies
  const discrepancies = useMemo(() => {
    const results: ComparisonResult[] = [];

    accountGroups.forEach(group => {
      const exp = group.accounts.find(a => a.bureau === 'EXPERIAN');
      const eq = group.accounts.find(a => a.bureau === 'EQUIFAX');
      const tu = group.accounts.find(a => a.bureau === 'TRANSUNION');

      const compareField = (
        field: string,
        expVal: any,
        eqVal: any,
        tuVal: any,
        severity: 'HIGH' | 'MEDIUM' | 'LOW',
        violationType?: string
      ) => {
        const vals = [expVal, eqVal, tuVal].filter(v => v != null);
        const unique = new Set(vals);
        
        if (unique.size > 1) {
          results.push({
            accountName: group.creditorName,
            field,
            experian: expVal ?? null,
            equifax: eqVal ?? null,
            transunion: tuVal ?? null,
            isMatch: false,
            severity,
            violationType
          });
        }
      };

      // Compare critical fields
      compareField('Balance', exp?.currentBalance, eq?.currentBalance, tu?.currentBalance, 'HIGH', 'FCRA_607_INACCURATE_BALANCE');
      compareField('Status', exp?.accountStatus, eq?.accountStatus, tu?.accountStatus, 'HIGH', 'FCRA_607_INACCURATE_STATUS');
      compareField('Credit Limit', exp?.creditLimit, eq?.creditLimit, tu?.creditLimit, 'MEDIUM');
      compareField('Date Opened', exp?.dateOpened, eq?.dateOpened, tu?.dateOpened, 'MEDIUM', 'FCRA_607_INACCURATE_DATE');
      compareField('DOFD', exp?.dateOfFirstDelinquency, eq?.dateOfFirstDelinquency, tu?.dateOfFirstDelinquency, 'HIGH', 'FCRA_605_OBSOLETE');

      // Check for missing accounts (reporting to some bureaus but not others)
      const bureausReporting = [exp, eq, tu].filter(Boolean).length;
      if (bureausReporting < 3 && bureausReporting > 0) {
        results.push({
          accountName: group.creditorName,
          field: 'Reporting Bureaus',
          experian: exp ? 'Reported' : 'Not Reported',
          equifax: eq ? 'Reported' : 'Not Reported',
          transunion: tu ? 'Reported' : 'Not Reported',
          isMatch: false,
          severity: 'MEDIUM',
          violationType: 'FCRA_623_INCOMPLETE_REPORTING'
        });
      }
    });

    return results;
  }, [accountGroups]);

  // Statistics
  const stats = useMemo(() => {
    const totalAccounts = accountGroups.length;
    const experianCount = accounts.filter(a => a.bureau === 'EXPERIAN').length;
    const equifaxCount = accounts.filter(a => a.bureau === 'EQUIFAX').length;
    const transunionCount = accounts.filter(a => a.bureau === 'TRANSUNION').length;
    
    return {
      totalAccounts,
      experianCount,
      equifaxCount,
      transunionCount,
      totalDiscrepancies: discrepancies.length,
      highSeverity: discrepancies.filter(d => d.severity === 'HIGH').length,
      mediumSeverity: discrepancies.filter(d => d.severity === 'MEDIUM').length,
      lowSeverity: discrepancies.filter(d => d.severity === 'LOW').length,
    };
  }, [accountGroups, accounts, discrepancies]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getBureauAccount = (group: typeof accountGroups[0], bureau: 'EXPERIAN' | 'EQUIFAX' | 'TRANSUNION') => {
    return group.accounts.find(a => a.bureau === bureau);
  };

  const getFieldMatch = (field: string, accountName: string): 'MATCH' | 'MISMATCH' | 'MISSING' => {
    const disc = discrepancies.find(d => d.accountName === accountName && d.field === field);
    if (!disc) return 'MATCH';
    return 'MISMATCH';
  };

  const exportComparison = () => {
    const csv = [
      ['Account', 'Field', 'Experian', 'Equifax', 'TransUnion', 'Status', 'Severity', 'Violation'],
      ...discrepancies.map(d => [
        d.accountName,
        d.field,
        d.experian ?? 'N/A',
        d.equifax ?? 'N/A',
        d.transunion ?? 'N/A',
        d.isMatch ? 'Match' : 'Mismatch',
        d.severity,
        d.violationType ?? ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bureau-comparison-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const t = (key: string): string => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        title: 'Bureau Comparison',
        subtitle: 'Side-by-side analysis across all three credit bureaus',
        stats: 'Comparison Statistics',
        totalAccounts: 'Total Accounts',
        discrepancies: 'Discrepancies Found',
        highSeverity: 'High Severity',
        mediumSeverity: 'Medium Severity',
        search: 'Search accounts...',
        viewMode: 'View Mode',
        sideBySide: 'Side-by-Side',
        discrepancyOnly: 'Discrepancies Only',
        syncScroll: 'Sync Scroll',
        exportComparison: 'Export Comparison',
        experian: 'Experian',
        equifax: 'Equifax',
        transunion: 'TransUnion',
        balance: 'Balance',
        status: 'Status',
        creditLimit: 'Credit Limit',
        dateOpened: 'Date Opened',
        dofd: 'Date of First Delinquency',
        paymentHistory: 'Payment History',
        match: 'Match',
        mismatch: 'Mismatch',
        notReported: 'Not Reported',
        reported: 'Reported',
        accounts: 'Accounts Comparison',
        personalInfo: 'Personal Information',
        inquiries: 'Inquiries',
        noDiscrepancies: 'No discrepancies found',
        clickForDetails: 'Click to view details'
      },
      es: {
        title: 'Comparación de Agencias',
        subtitle: 'Análisis lado a lado de las tres agencias de crédito',
        stats: 'Estadísticas de Comparación',
        totalAccounts: 'Cuentas Totales',
        discrepancies: 'Discrepancias Encontradas',
        highSeverity: 'Alta Severidad',
        mediumSeverity: 'Severidad Media',
        search: 'Buscar cuentas...',
        viewMode: 'Modo de Vista',
        sideBySide: 'Lado a Lado',
        discrepancyOnly: 'Solo Discrepancias',
        syncScroll: 'Sincronizar Desplazamiento',
        exportComparison: 'Exportar Comparación',
        experian: 'Experian',
        equifax: 'Equifax',
        transunion: 'TransUnion',
        balance: 'Saldo',
        status: 'Estado',
        creditLimit: 'Límite de Crédito',
        dateOpened: 'Fecha de Apertura',
        dofd: 'Fecha de Primera Morosidad',
        paymentHistory: 'Historial de Pagos',
        match: 'Coincide',
        mismatch: 'No Coincide',
        notReported: 'No Reportado',
        reported: 'Reportado',
        accounts: 'Comparación de Cuentas',
        personalInfo: 'Información Personal',
        inquiries: 'Consultas',
        noDiscrepancies: 'No se encontraron discrepancias',
        clickForDetails: 'Haga clic para ver detalles'
      }
    };
    return translations[language][key] || key;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">{t('title')}</h2>
        <p className="text-slate-400">{t('subtitle')}</p>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <p className="text-xs text-slate-400 mb-1">{t('totalAccounts')}</p>
          <p className="text-2xl font-bold text-white">{stats.totalAccounts}</p>
        </div>
        <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-500/30">
          <p className="text-xs text-blue-300 mb-1">{t('experian')}</p>
          <p className="text-2xl font-bold text-blue-400">{stats.experianCount}</p>
        </div>
        <div className="bg-red-900/20 rounded-lg p-4 border border-red-500/30">
          <p className="text-xs text-red-300 mb-1">{t('equifax')}</p>
          <p className="text-2xl font-bold text-red-400">{stats.equifaxCount}</p>
        </div>
        <div className="bg-green-900/20 rounded-lg p-4 border border-green-500/30">
          <p className="text-xs text-green-300 mb-1">{t('transunion')}</p>
          <p className="text-2xl font-bold text-green-400">{stats.transunionCount}</p>
        </div>
        <div className="bg-orange-900/20 rounded-lg p-4 border border-orange-500/30">
          <p className="text-xs text-orange-300 mb-1">{t('discrepancies')}</p>
          <p className="text-2xl font-bold text-orange-400">{stats.totalDiscrepancies}</p>
        </div>
        <div className="bg-red-900/20 rounded-lg p-4 border border-red-500/30">
          <p className="text-xs text-red-300 mb-1">{t('highSeverity')}</p>
          <p className="text-2xl font-bold text-red-400">{stats.highSeverity}</p>
        </div>
        <div className="bg-yellow-900/20 rounded-lg p-4 border border-yellow-500/30">
          <p className="text-xs text-yellow-300 mb-1">{t('mediumSeverity')}</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.mediumSeverity}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Search */}
          <div className="flex-1 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('search')}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* View Mode */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('SIDE_BY_SIDE')}
              className={`px-4 py-2 rounded-lg transition-all ${
                viewMode === 'SIDE_BY_SIDE' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {t('sideBySide')}
            </button>
            <button
              onClick={() => setViewMode('DISCREPANCY_ONLY')}
              className={`px-4 py-2 rounded-lg transition-all ${
                viewMode === 'DISCREPANCY_ONLY' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {t('discrepancyOnly')}
            </button>
          </div>

          {/* Sync Scroll Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={syncScroll}
              onChange={(e) => setSyncScroll(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-slate-300">{t('syncScroll')}</span>
          </label>

          {/* Export */}
          <button
            onClick={exportComparison}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {t('exportComparison')}
          </button>
        </div>
      </div>

      {/* Side-by-Side Comparison */}
      {viewMode === 'SIDE_BY_SIDE' && (
        <div className="grid grid-cols-3 gap-4">
          {/* Experian Column */}
          <div className="space-y-3">
            <div className="bg-blue-900/20 rounded-lg p-4 border-2 border-blue-500/50 sticky top-0 z-10">
              <h3 className="text-lg font-bold text-blue-400 text-center">{t('experian')}</h3>
            </div>
            <div
              ref={scrollRefs.experian}
              onScroll={() => handleScroll('experian')}
              className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar"
            >
              {filteredGroups.map(group => {
                const account = getBureauAccount(group, 'EXPERIAN');
                if (!account) {
                  return (
                    <div key={group.key} className="bg-slate-800/30 rounded-lg p-4 border border-slate-700 opacity-50">
                      <p className="text-sm text-slate-500 text-center">{t('notReported')}</p>
                      <p className="text-xs text-slate-600 text-center mt-1">{group.creditorName}</p>
                    </div>
                  );
                }
                return (
                  <div key={group.key} className="bg-blue-900/10 rounded-lg p-4 border border-blue-500/30">
                    <h4 className="font-semibold text-white text-sm mb-2">{account.accountName}</h4>
                    <div className="space-y-2 text-xs">
                      <div className={getFieldMatch('Balance', group.creditorName) === 'MISMATCH' ? 'bg-red-900/30 p-2 rounded' : ''}>
                        <span className="text-slate-400">{t('balance')}: </span>
                        <span className="text-white font-mono">${account.currentBalance.toLocaleString()}</span>
                      </div>
                      <div className={getFieldMatch('Status', group.creditorName) === 'MISMATCH' ? 'bg-red-900/30 p-2 rounded' : ''}>
                        <span className="text-slate-400">{t('status')}: </span>
                        <span className="text-white">{account.accountStatus}</span>
                      </div>
                      {account.creditLimit && (
                        <div className={getFieldMatch('Credit Limit', group.creditorName) === 'MISMATCH' ? 'bg-red-900/30 p-2 rounded' : ''}>
                          <span className="text-slate-400">{t('creditLimit')}: </span>
                          <span className="text-white font-mono">${account.creditLimit.toLocaleString()}</span>
                        </div>
                      )}
                      <div className={getFieldMatch('Date Opened', group.creditorName) === 'MISMATCH' ? 'bg-red-900/30 p-2 rounded' : ''}>
                        <span className="text-slate-400">{t('dateOpened')}: </span>
                        <span className="text-white">{account.dateOpened}</span>
                      </div>
                      {account.dateOfFirstDelinquency && (
                        <div className={getFieldMatch('DOFD', group.creditorName) === 'MISMATCH' ? 'bg-red-900/30 p-2 rounded' : ''}>
                          <span className="text-red-400">{t('dofd')}: </span>
                          <span className="text-red-300">{account.dateOfFirstDelinquency}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Equifax Column */}
          <div className="space-y-3">
            <div className="bg-red-900/20 rounded-lg p-4 border-2 border-red-500/50 sticky top-0 z-10">
              <h3 className="text-lg font-bold text-red-400 text-center">{t('equifax')}</h3>
            </div>
            <div
              ref={scrollRefs.equifax}
              onScroll={() => handleScroll('equifax')}
              className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar"
            >
              {filteredGroups.map(group => {
                const account = getBureauAccount(group, 'EQUIFAX');
                if (!account) {
                  return (
                    <div key={group.key} className="bg-slate-800/30 rounded-lg p-4 border border-slate-700 opacity-50">
                      <p className="text-sm text-slate-500 text-center">{t('notReported')}</p>
                      <p className="text-xs text-slate-600 text-center mt-1">{group.creditorName}</p>
                    </div>
                  );
                }
                return (
                  <div key={group.key} className="bg-red-900/10 rounded-lg p-4 border border-red-500/30">
                    <h4 className="font-semibold text-white text-sm mb-2">{account.accountName}</h4>
                    <div className="space-y-2 text-xs">
                      <div className={getFieldMatch('Balance', group.creditorName) === 'MISMATCH' ? 'bg-red-900/30 p-2 rounded' : ''}>
                        <span className="text-slate-400">{t('balance')}: </span>
                        <span className="text-white font-mono">${account.currentBalance.toLocaleString()}</span>
                      </div>
                      <div className={getFieldMatch('Status', group.creditorName) === 'MISMATCH' ? 'bg-red-900/30 p-2 rounded' : ''}>
                        <span className="text-slate-400">{t('status')}: </span>
                        <span className="text-white">{account.accountStatus}</span>
                      </div>
                      {account.creditLimit && (
                        <div className={getFieldMatch('Credit Limit', group.creditorName) === 'MISMATCH' ? 'bg-red-900/30 p-2 rounded' : ''}>
                          <span className="text-slate-400">{t('creditLimit')}: </span>
                          <span className="text-white font-mono">${account.creditLimit.toLocaleString()}</span>
                        </div>
                      )}
                      <div className={getFieldMatch('Date Opened', group.creditorName) === 'MISMATCH' ? 'bg-red-900/30 p-2 rounded' : ''}>
                        <span className="text-slate-400">{t('dateOpened')}: </span>
                        <span className="text-white">{account.dateOpened}</span>
                      </div>
                      {account.dateOfFirstDelinquency && (
                        <div className={getFieldMatch('DOFD', group.creditorName) === 'MISMATCH' ? 'bg-red-900/30 p-2 rounded' : ''}>
                          <span className="text-red-400">{t('dofd')}: </span>
                          <span className="text-red-300">{account.dateOfFirstDelinquency}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TransUnion Column */}
          <div className="space-y-3">
            <div className="bg-green-900/20 rounded-lg p-4 border-2 border-green-500/50 sticky top-0 z-10">
              <h3 className="text-lg font-bold text-green-400 text-center">{t('transunion')}</h3>
            </div>
            <div
              ref={scrollRefs.transunion}
              onScroll={() => handleScroll('transunion')}
              className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar"
            >
              {filteredGroups.map(group => {
                const account = getBureauAccount(group, 'TRANSUNION');
                if (!account) {
                  return (
                    <div key={group.key} className="bg-slate-800/30 rounded-lg p-4 border border-slate-700 opacity-50">
                      <p className="text-sm text-slate-500 text-center">{t('notReported')}</p>
                      <p className="text-xs text-slate-600 text-center mt-1">{group.creditorName}</p>
                    </div>
                  );
                }
                return (
                  <div key={group.key} className="bg-green-900/10 rounded-lg p-4 border border-green-500/30">
                    <h4 className="font-semibold text-white text-sm mb-2">{account.accountName}</h4>
                    <div className="space-y-2 text-xs">
                      <div className={getFieldMatch('Balance', group.creditorName) === 'MISMATCH' ? 'bg-red-900/30 p-2 rounded' : ''}>
                        <span className="text-slate-400">{t('balance')}: </span>
                        <span className="text-white font-mono">${account.currentBalance.toLocaleString()}</span>
                      </div>
                      <div className={getFieldMatch('Status', group.creditorName) === 'MISMATCH' ? 'bg-red-900/30 p-2 rounded' : ''}>
                        <span className="text-slate-400">{t('status')}: </span>
                        <span className="text-white">{account.accountStatus}</span>
                      </div>
                      {account.creditLimit && (
                        <div className={getFieldMatch('Credit Limit', group.creditorName) === 'MISMATCH' ? 'bg-red-900/30 p-2 rounded' : ''}>
                          <span className="text-slate-400">{t('creditLimit')}: </span>
                          <span className="text-white font-mono">${account.creditLimit.toLocaleString()}</span>
                        </div>
                      )}
                      <div className={getFieldMatch('Date Opened', group.creditorName) === 'MISMATCH' ? 'bg-red-900/30 p-2 rounded' : ''}>
                        <span className="text-slate-400">{t('dateOpened')}: </span>
                        <span className="text-white">{account.dateOpened}</span>
                      </div>
                      {account.dateOfFirstDelinquency && (
                        <div className={getFieldMatch('DOFD', group.creditorName) === 'MISMATCH' ? 'bg-red-900/30 p-2 rounded' : ''}>
                          <span className="text-red-400">{t('dofd')}: </span>
                          <span className="text-red-300">{account.dateOfFirstDelinquency}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Discrepancy-Only View */}
      {viewMode === 'DISCREPANCY_ONLY' && (
        <div className="space-y-3">
          {discrepancies.length === 0 ? (
            <div className="bg-green-900/20 rounded-xl border border-green-500/30 p-12 text-center">
              <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-green-300 mb-2">{t('noDiscrepancies')}</h3>
              <p className="text-green-400">All bureau data matches perfectly!</p>
            </div>
          ) : (
            discrepancies.map((disc, idx) => (
              <button
                key={idx}
                onClick={() => onDiscrepancyClick?.(disc)}
                className="w-full bg-slate-800/50 rounded-xl border-2 border-orange-500/50 p-6 hover:bg-slate-800/80 transition-all text-left"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">{disc.accountName}</h3>
                    <p className="text-sm text-slate-400">{disc.field}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      disc.severity === 'HIGH' ? 'bg-red-600 text-white' :
                      disc.severity === 'MEDIUM' ? 'bg-orange-600 text-white' :
                      'bg-yellow-600 text-white'
                    }`}>
                      {disc.severity}
                    </span>
                    {disc.violationType && (
                      <AlertTriangle className="h-5 w-5 text-orange-400" />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-500/30">
                    <p className="text-xs text-blue-300 mb-1">{t('experian')}</p>
                    <p className="text-sm text-white font-semibold">{disc.experian ?? t('notReported')}</p>
                  </div>
                  <div className="bg-red-900/20 rounded-lg p-3 border border-red-500/30">
                    <p className="text-xs text-red-300 mb-1">{t('equifax')}</p>
                    <p className="text-sm text-white font-semibold">{disc.equifax ?? t('notReported')}</p>
                  </div>
                  <div className="bg-green-900/20 rounded-lg p-3 border border-green-500/30">
                    <p className="text-xs text-green-300 mb-1">{t('transunion')}</p>
                    <p className="text-sm text-white font-semibold">{disc.transunion ?? t('notReported')}</p>
                  </div>
                </div>

                {disc.violationType && (
                  <div className="mt-4 bg-red-900/20 rounded-lg p-3 border border-red-500/30">
                    <p className="text-xs text-red-400 font-mono">{disc.violationType}</p>
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(71, 85, 105, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(71, 85, 105, 0.8);
        }
      `}</style>
    </div>
  );
};

export default BureauComparison;
