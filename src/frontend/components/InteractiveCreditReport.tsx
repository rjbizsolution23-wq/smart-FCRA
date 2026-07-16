/**
 * FCRA SUPREME VIOLATION DETECTOR
 * Interactive Credit Report Viewer - Visual Account Display
 */

import React, { useState, useMemo } from 'react';
import { 
  CreditCard, 
  TrendingDown, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Calendar,
  DollarSign,
  Building,
  Eye,
  EyeOff,
  Filter,
  ChevronDown,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';

interface CreditAccount {
  accountId: string;
  accountName: string;
  accountNumber: string;
  accountType: 'CREDIT_CARD' | 'MORTGAGE' | 'AUTO_LOAN' | 'STUDENT_LOAN' | 'COLLECTION' | 'OTHER';
  creditorName: string;
  currentBalance: number;
  creditLimit?: number;
  highBalance?: number;
  monthlyPayment?: number;
  accountStatus: string; // '11', '13', '61', '97', etc.
  dateOpened: string;
  dateOfFirstDelinquency?: string;
  dateLastActive?: string;
  paymentHistory: PaymentHistoryMonth[];
  bureau: 'EXPERIAN' | 'EQUIFAX' | 'TRANSUNION';
  violations: string[]; // violation IDs
  remarks?: string;
}

interface PaymentHistoryMonth {
  month: string; // 'YYYY-MM'
  status: 'CURRENT' | 'LATE_30' | 'LATE_60' | 'LATE_90' | 'LATE_120' | 'CHARGE_OFF' | 'UNKNOWN';
  code: string; // '0', '1', '2', '3', '4', '5', 'G', etc.
}

interface InteractiveCreditReportProps {
  accounts: CreditAccount[];
  violations: any[];
  selectedViolationId?: string;
  onAccountClick?: (accountId: string) => void;
  onViolationClick?: (violationId: string) => void;
  language: 'en' | 'es';
}

export const InteractiveCreditReport: React.FC<InteractiveCreditReportProps> = ({
  accounts,
  violations,
  selectedViolationId,
  onAccountClick,
  onViolationClick,
  language
}) => {
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterBureau, setFilterBureau] = useState<string>('ALL');
  const [showViolationsOnly, setShowViolationsOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE' | 'TIMELINE'>('CARDS');

  const toggleAccount = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
    onAccountClick?.(accountId);
  };

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      if (filterStatus !== 'ALL' && !acc.accountStatus.includes(filterStatus)) return false;
      if (filterType !== 'ALL' && acc.accountType !== filterType) return false;
      if (filterBureau !== 'ALL' && acc.bureau !== filterBureau) return false;
      if (showViolationsOnly && acc.violations.length === 0) return false;
      if (selectedViolationId && !acc.violations.includes(selectedViolationId)) return false;
      return true;
    });
  }, [accounts, filterStatus, filterType, filterBureau, showViolationsOnly, selectedViolationId]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: accounts.length,
      withViolations: accounts.filter(a => a.violations.length > 0).length,
      collections: accounts.filter(a => a.accountType === 'COLLECTION').length,
      derogatory: accounts.filter(a => ['97', '93', '64', '84'].includes(a.accountStatus)).length,
      totalDebt: accounts.reduce((sum, a) => sum + a.currentBalance, 0),
      totalCredit: accounts.reduce((sum, a) => sum + (a.creditLimit || 0), 0)
    };
  }, [accounts]);

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'CREDIT_CARD': return CreditCard;
      case 'MORTGAGE': return Building;
      case 'AUTO_LOAN': return TrendingUp;
      case 'COLLECTION': return AlertCircle;
      default: return CreditCard;
    }
  };

  const getAccountTypeColor = (type: string): string => {
    switch (type) {
      case 'CREDIT_CARD': return 'blue';
      case 'MORTGAGE': return 'green';
      case 'AUTO_LOAN': return 'purple';
      case 'STUDENT_LOAN': return 'cyan';
      case 'COLLECTION': return 'red';
      default: return 'slate';
    }
  };

  const getStatusColor = (status: string): string => {
    if (status === '11' || status === '13') return 'text-green-400 bg-green-900/20';
    if (['61', '62', '63'].includes(status)) return 'text-yellow-400 bg-yellow-900/20';
    if (['71', '78', '80', '93', '94', '97'].includes(status)) return 'text-red-400 bg-red-900/20';
    return 'text-slate-400 bg-slate-900/20';
  };

  const getStatusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
      '11': 'Current',
      '13': 'Paid/Closed',
      '61': '30 Days Late',
      '62': '60 Days Late',
      '63': '90+ Days Late',
      '64': '120+ Days Late',
      '71': 'Maker Bankruptcy',
      '78': 'Charge-off',
      '80': 'Foreclosure',
      '93': 'Repossession',
      '97': 'Charge-off',
      'DA': 'Delete Account',
      'DF': 'Delete Fraud'
    };
    return statusMap[status] || status;
  };

  const getPaymentColor = (status: string): string => {
    switch (status) {
      case 'CURRENT': return 'bg-green-500';
      case 'LATE_30': return 'bg-yellow-500';
      case 'LATE_60': return 'bg-orange-500';
      case 'LATE_90': return 'bg-red-500';
      case 'LATE_120': return 'bg-red-700';
      case 'CHARGE_OFF': return 'bg-red-900';
      default: return 'bg-slate-600';
    }
  };

  const t = (key: string): string => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        title: 'Interactive Credit Report',
        subtitle: 'Click accounts to expand details',
        stats: 'Statistics',
        totalAccounts: 'Total Accounts',
        accountsWithViolations: 'With Violations',
        collections: 'Collections',
        derogatory: 'Derogatory',
        totalDebt: 'Total Debt',
        totalCredit: 'Total Credit',
        filters: 'Filters',
        filterByStatus: 'Status',
        filterByType: 'Type',
        filterByBureau: 'Bureau',
        showViolationsOnly: 'Show Only Accounts with Violations',
        viewMode: 'View Mode',
        cards: 'Cards',
        table: 'Table',
        timeline: 'Timeline',
        accountDetails: 'Account Details',
        paymentHistory: 'Payment History (Last 24 Months)',
        violations: 'Violations',
        noViolations: 'No violations detected',
        accountInfo: 'Account Information',
        creditor: 'Creditor',
        accountNumber: 'Account Number',
        balance: 'Balance',
        creditLimit: 'Credit Limit',
        monthlyPayment: 'Monthly Payment',
        dateOpened: 'Date Opened',
        dateFirstDelinquency: 'Date of First Delinquency',
        status: 'Status',
        bureau: 'Bureau',
        remarks: 'Remarks',
        utilization: 'Utilization',
      },
      es: {
        title: 'Informe de Crédito Interactivo',
        subtitle: 'Haga clic en las cuentas para expandir detalles',
        stats: 'Estadísticas',
        totalAccounts: 'Cuentas Totales',
        accountsWithViolations: 'Con Violaciones',
        collections: 'Cobranzas',
        derogatory: 'Derogatorio',
        totalDebt: 'Deuda Total',
        totalCredit: 'Crédito Total',
        filters: 'Filtros',
        filterByStatus: 'Estado',
        filterByType: 'Tipo',
        filterByBureau: 'Agencia',
        showViolationsOnly: 'Mostrar Solo Cuentas con Violaciones',
        viewMode: 'Modo de Vista',
        cards: 'Tarjetas',
        table: 'Tabla',
        timeline: 'Línea de Tiempo',
        accountDetails: 'Detalles de la Cuenta',
        paymentHistory: 'Historial de Pagos (Últimos 24 Meses)',
        violations: 'Violaciones',
        noViolations: 'No se detectaron violaciones',
        accountInfo: 'Información de la Cuenta',
        creditor: 'Acreedor',
        accountNumber: 'Número de Cuenta',
        balance: 'Saldo',
        creditLimit: 'Límite de Crédito',
        monthlyPayment: 'Pago Mensual',
        dateOpened: 'Fecha de Apertura',
        dateFirstDelinquency: 'Fecha de Primera Morosidad',
        status: 'Estado',
        bureau: 'Agencia',
        remarks: 'Observaciones',
        utilization: 'Utilización',
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <p className="text-xs text-slate-400 mb-1">{t('totalAccounts')}</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-red-900/20 rounded-lg p-4 border border-red-500/30">
          <p className="text-xs text-red-300 mb-1">{t('accountsWithViolations')}</p>
          <p className="text-2xl font-bold text-red-400">{stats.withViolations}</p>
        </div>
        <div className="bg-orange-900/20 rounded-lg p-4 border border-orange-500/30">
          <p className="text-xs text-orange-300 mb-1">{t('collections')}</p>
          <p className="text-2xl font-bold text-orange-400">{stats.collections}</p>
        </div>
        <div className="bg-red-900/20 rounded-lg p-4 border border-red-500/30">
          <p className="text-xs text-red-300 mb-1">{t('derogatory')}</p>
          <p className="text-2xl font-bold text-red-400">{stats.derogatory}</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <p className="text-xs text-slate-400 mb-1">{t('totalDebt')}</p>
          <p className="text-lg font-bold text-white">${(stats.totalDebt / 1000).toFixed(1)}k</p>
        </div>
        <div className="bg-green-900/20 rounded-lg p-4 border border-green-500/30">
          <p className="text-xs text-green-300 mb-1">{t('totalCredit')}</p>
          <p className="text-lg font-bold text-green-400">${(stats.totalCredit / 1000).toFixed(1)}k</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">{t('filters')}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">{t('filterByStatus')}</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">All</option>
              <option value="11">Current (11)</option>
              <option value="13">Paid/Closed (13)</option>
              <option value="61">30 Days Late (61)</option>
              <option value="97">Charge-off (97)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">{t('filterByType')}</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">All</option>
              <option value="CREDIT_CARD">Credit Card</option>
              <option value="MORTGAGE">Mortgage</option>
              <option value="AUTO_LOAN">Auto Loan</option>
              <option value="STUDENT_LOAN">Student Loan</option>
              <option value="COLLECTION">Collection</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">{t('filterByBureau')}</label>
            <select
              value={filterBureau}
              onChange={(e) => setFilterBureau(e.target.value)}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">All Bureaus</option>
              <option value="EXPERIAN">Experian</option>
              <option value="EQUIFAX">Equifax</option>
              <option value="TRANSUNION">TransUnion</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showViolationsOnly}
                onChange={(e) => setShowViolationsOnly(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 checked:bg-blue-600"
              />
              <span className="text-sm text-slate-300">{t('showViolationsOnly')}</span>
            </label>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('CARDS')}
          className={`px-4 py-2 rounded-lg transition-all ${
            viewMode === 'CARDS' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          {t('cards')}
        </button>
        <button
          onClick={() => setViewMode('TIMELINE')}
          className={`px-4 py-2 rounded-lg transition-all ${
            viewMode === 'TIMELINE' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          {t('timeline')}
        </button>
      </div>

      {/* Account Cards */}
      {viewMode === 'CARDS' && (
        <div className="space-y-3">
          {filteredAccounts.map((account) => {
            const Icon = getAccountTypeIcon(account.accountType);
            const typeColor = getAccountTypeColor(account.accountType);
            const isExpanded = expandedAccounts.has(account.accountId);
            const hasViolations = account.violations.length > 0;
            const utilization = account.creditLimit ? (account.currentBalance / account.creditLimit) * 100 : 0;

            return (
              <div
                key={account.accountId}
                className={`rounded-xl border-2 transition-all ${
                  hasViolations
                    ? 'border-red-500/50 bg-red-900/10'
                    : 'border-slate-700 bg-slate-800/30'
                } ${selectedViolationId && account.violations.includes(selectedViolationId) ? 'ring-2 ring-yellow-500' : ''}`}
              >
                {/* Card Header */}
                <button
                  onClick={() => toggleAccount(account.accountId)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-3 rounded-lg bg-${typeColor}-900/30 border border-${typeColor}-500/30`}>
                      <Icon className={`h-6 w-6 text-${typeColor}-400`} />
                    </div>
                    
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">{account.accountName}</h3>
                        {hasViolations && (
                          <span className="px-2 py-1 bg-red-600 text-white text-xs rounded-full flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {account.violations.length}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400">{account.creditorName}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-xs px-2 py-1 rounded ${getStatusColor(account.accountStatus)}`}>
                          {getStatusLabel(account.accountStatus)}
                        </span>
                        <span className="text-xs text-slate-500">•</span>
                        <span className="text-xs text-slate-400">{account.bureau}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-slate-400">{t('balance')}</p>
                      <p className="text-xl font-bold text-white">${account.currentBalance.toLocaleString()}</p>
                      {account.creditLimit && (
                        <p className="text-xs text-slate-500">
                          {t('creditLimit')}: ${account.creditLimit.toLocaleString()}
                        </p>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-6 w-6 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-6 w-6 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-6 pb-6 space-y-6 border-t border-slate-700 pt-6">
                    {/* Account Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">{t('accountNumber')}</p>
                        <p className="text-sm text-white font-mono">{account.accountNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">{t('dateOpened')}</p>
                        <p className="text-sm text-white">{account.dateOpened}</p>
                      </div>
                      {account.dateOfFirstDelinquency && (
                        <div>
                          <p className="text-xs text-red-400 mb-1">{t('dateFirstDelinquency')}</p>
                          <p className="text-sm text-red-300 font-semibold">{account.dateOfFirstDelinquency}</p>
                        </div>
                      )}
                      {account.monthlyPayment && (
                        <div>
                          <p className="text-xs text-slate-400 mb-1">{t('monthlyPayment')}</p>
                          <p className="text-sm text-white">${account.monthlyPayment}</p>
                        </div>
                      )}
                      {account.creditLimit && (
                        <div>
                          <p className="text-xs text-slate-400 mb-1">{t('utilization')}</p>
                          <p className={`text-sm font-semibold ${utilization > 30 ? 'text-red-400' : 'text-green-400'}`}>
                            {utilization.toFixed(0)}%
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Payment History */}
                    {account.paymentHistory && account.paymentHistory.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-3">{t('paymentHistory')}</h4>
                        <div className="flex gap-1 overflow-x-auto pb-2">
                          {account.paymentHistory.map((month, idx) => (
                            <div
                              key={idx}
                              className="flex-shrink-0 group relative"
                              title={`${month.month}: ${month.status}`}
                            >
                              <div className={`w-3 h-12 rounded ${getPaymentColor(month.status)}`} />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                {month.month}<br />{month.status}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-4 mt-2 text-xs">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded bg-green-500" />
                            <span className="text-slate-400">Current</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded bg-yellow-500" />
                            <span className="text-slate-400">30 Days</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded bg-orange-500" />
                            <span className="text-slate-400">60 Days</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded bg-red-500" />
                            <span className="text-slate-400">90+ Days</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Violations */}
                    {hasViolations ? (
                      <div>
                        <h4 className="text-sm font-semibold text-red-300 mb-3 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          {t('violations')} ({account.violations.length})
                        </h4>
                        <div className="space-y-2">
                          {account.violations.map((violationId) => {
                            const violation = violations.find(v => v.id === violationId || violations.indexOf(v).toString() === violationId);
                            if (!violation) return null;
                            
                            return (
                              <button
                                key={violationId}
                                onClick={() => onViolationClick?.(violationId)}
                                className="w-full text-left p-3 bg-red-900/20 border border-red-500/30 rounded-lg hover:bg-red-900/30 transition-colors"
                              >
                                <p className="text-sm font-medium text-red-300">{violation.violationType}</p>
                                <p className="text-xs text-red-400 mt-1">{violation.statute}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-green-400 text-sm">
                        <CheckCircle className="h-4 w-4" />
                        <span>{t('noViolations')}</span>
                      </div>
                    )}

                    {/* Remarks */}
                    {account.remarks && (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-300 mb-2">{t('remarks')}</h4>
                        <p className="text-sm text-slate-400 bg-slate-900/50 p-3 rounded-lg">
                          {account.remarks}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filteredAccounts.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              No accounts match the current filters
            </div>
          )}
        </div>
      )}

      {/* Timeline View */}
      {viewMode === 'TIMELINE' && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <p className="text-slate-400 text-center py-12">
            Timeline view coming soon - Will show account activity on chronological axis
          </p>
        </div>
      )}
    </div>
  );
};

export default InteractiveCreditReport;
