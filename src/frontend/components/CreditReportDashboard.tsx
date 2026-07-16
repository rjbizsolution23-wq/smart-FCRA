/**
 * FCRA SUPREME VIOLATION DETECTOR
 * Credit Report Dashboard - Main Integration Hub
 * 
 * Features:
 * - Unified dashboard with all views
 * - Tab navigation (Overview, Comparison, Timeline, Violations, Documents)
 * - Real-time violation detection
 * - Data export and sharing
 * - Multi-language support
 * - Mobile responsive
 */

import React, { useState, useMemo } from 'react';
import {
  FileText,
  ArrowLeftRight,
  Clock,
  AlertTriangle,
  Download,
  Share2,
  Settings,
  HelpCircle,
  BarChart3,
  TrendingUp,
  Shield,
  Eye,
  Filter,
  Search,
  RefreshCw,
  ChevronRight,
  Home,
  Menu,
  X
} from 'lucide-react';

import { InteractiveCreditReport } from './InteractiveCreditReport';
import { BureauComparison } from './BureauComparison';
import { TimelineView } from './TimelineView';
import { ViolationList } from './ViolationList';
import { DamagesSummary } from './DamagesSummary';
import { DocumentGenerator } from './DocumentGenerator';
import { LitigationScore } from './LitigationScore';

interface CreditReportData {
  accounts: any[];
  violations: any[];
  damages: any;
  litigationScore: any;
  personalInfo: any;
  inquiries: any[];
  publicRecords: any[];
  timelineEvents: any[];
}

interface CreditReportDashboardProps {
  reportData: CreditReportData;
  language: 'en' | 'es';
  onLanguageChange: (lang: 'en' | 'es') => void;
  onGenerateDocument?: (docType: string) => void;
  onExportData?: (format: 'JSON' | 'CSV' | 'PDF') => void;
}

export const CreditReportDashboard: React.FC<CreditReportDashboardProps> = ({
  reportData,
  language,
  onLanguageChange,
  onGenerateDocument,
  onExportData
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'COMPARISON' | 'TIMELINE' | 'VIOLATIONS' | 'DOCUMENTS'>('OVERVIEW');
  const [selectedViolationId, setSelectedViolationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickFilters, setQuickFilters] = useState({
    showViolationsOnly: false,
    bureau: 'ALL',
    accountType: 'ALL'
  });

  // Calculate summary statistics
  const stats = useMemo(() => {
    const totalViolations = reportData.violations.length;
    const criticalViolations = reportData.violations.filter((v: any) => v.severity === 'CRITICAL' || v.severity === 'HIGH').length;
    const totalAccounts = reportData.accounts.length;
    const accountsWithViolations = new Set(reportData.violations.map((v: any) => v.accountId)).size;
    const totalDamages = reportData.damages?.total || 0;
    const litigationScore = reportData.litigationScore?.score || 0;

    return {
      totalViolations,
      criticalViolations,
      totalAccounts,
      accountsWithViolations,
      totalDamages,
      litigationScore
    };
  }, [reportData]);

  const handleViolationClick = (violationId: string) => {
    setSelectedViolationId(violationId);
    // Optionally scroll to violation or show detail modal
  };

  const handleAccountClick = (accountId: string) => {
    // Find violations for this account
    const accountViolations = reportData.violations.filter((v: any) => v.accountId === accountId);
    if (accountViolations.length > 0) {
      setSelectedViolationId(accountViolations[0].id);
    }
  };

  const t = (key: string): string => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        dashboard: 'FCRA Violation Detector',
        subtitle: 'Credit Report Analysis Dashboard',
        overview: 'Overview',
        comparison: 'Bureau Comparison',
        timeline: 'Timeline',
        violations: 'Violations',
        documents: 'Documents',
        quickStats: 'Quick Statistics',
        totalViolations: 'Total Violations',
        criticalViolations: 'Critical Violations',
        totalAccounts: 'Total Accounts',
        accountsWithViolations: 'Accounts with Violations',
        potentialDamages: 'Potential Damages',
        litigationScore: 'Litigation Score',
        quickFilters: 'Quick Filters',
        showViolationsOnly: 'Show Violations Only',
        allBureaus: 'All Bureaus',
        experian: 'Experian',
        equifax: 'Equifax',
        transunion: 'TransUnion',
        allAccountTypes: 'All Account Types',
        creditCard: 'Credit Card',
        mortgage: 'Mortgage',
        autoLoan: 'Auto Loan',
        studentLoan: 'Student Loan',
        collection: 'Collection',
        export: 'Export Data',
        share: 'Share Report',
        settings: 'Settings',
        help: 'Help',
        language: 'Language',
        english: 'English',
        spanish: 'Español',
        menu: 'Menu',
        close: 'Close'
      },
      es: {
        dashboard: 'Detector de Violaciones FCRA',
        subtitle: 'Panel de Análisis de Informe de Crédito',
        overview: 'Resumen',
        comparison: 'Comparación de Agencias',
        timeline: 'Línea de Tiempo',
        violations: 'Violaciones',
        documents: 'Documentos',
        quickStats: 'Estadísticas Rápidas',
        totalViolations: 'Violaciones Totales',
        criticalViolations: 'Violaciones Críticas',
        totalAccounts: 'Cuentas Totales',
        accountsWithViolations: 'Cuentas con Violaciones',
        potentialDamages: 'Daños Potenciales',
        litigationScore: 'Puntuación de Litigio',
        quickFilters: 'Filtros Rápidos',
        showViolationsOnly: 'Mostrar Solo Violaciones',
        allBureaus: 'Todas las Agencias',
        experian: 'Experian',
        equifax: 'Equifax',
        transunion: 'TransUnion',
        allAccountTypes: 'Todos los Tipos de Cuenta',
        creditCard: 'Tarjeta de Crédito',
        mortgage: 'Hipoteca',
        autoLoan: 'Préstamo de Auto',
        studentLoan: 'Préstamo Estudiantil',
        collection: 'Cobranza',
        export: 'Exportar Datos',
        share: 'Compartir Informe',
        settings: 'Configuración',
        help: 'Ayuda',
        language: 'Idioma',
        english: 'English',
        spanish: 'Español',
        menu: 'Menú',
        close: 'Cerrar'
      }
    };
    return translations[language][key] || key;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Top Navigation Bar */}
      <nav className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-800 text-white"
              >
                {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <Shield className="h-8 w-8 text-blue-500" />
              <div>
                <h1 className="text-xl font-bold text-white">{t('dashboard')}</h1>
                <p className="text-xs text-slate-400 hidden sm:block">{t('subtitle')}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Language Toggle */}
              <button
                onClick={() => onLanguageChange(language === 'en' ? 'es' : 'en')}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm transition-all"
              >
                {language === 'en' ? '🇪🇸 ES' : '🇺🇸 EN'}
              </button>

              {/* Export */}
              <button
                onClick={() => onExportData?.('PDF')}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all"
              >
                <Download className="h-4 w-4" />
                <span className="hidden lg:inline">{t('export')}</span>
              </button>

              {/* Help */}
              <button className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all">
                <HelpCircle className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-64 bg-slate-900/80 backdrop-blur-sm border-r border-slate-700
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="h-full overflow-y-auto py-6 px-4 space-y-6">
            {/* Navigation Tabs */}
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Navigation
              </h3>
              {[
                { id: 'OVERVIEW', icon: Home, label: t('overview') },
                { id: 'COMPARISON', icon: ArrowLeftRight, label: t('comparison') },
                { id: 'TIMELINE', icon: Clock, label: t('timeline') },
                { id: 'VIOLATIONS', icon: AlertTriangle, label: t('violations') },
                { id: 'DOCUMENTS', icon: FileText, label: t('documents') }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  <span className="font-medium">{tab.label}</span>
                  {activeTab === tab.id && <ChevronRight className="h-4 w-4 ml-auto" />}
                </button>
              ))}
            </div>

            {/* Quick Stats */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                {t('quickStats')}
              </h3>
              <div className="bg-red-900/20 rounded-lg p-3 border border-red-500/30">
                <p className="text-xs text-red-300 mb-1">{t('totalViolations')}</p>
                <p className="text-2xl font-bold text-red-400">{stats.totalViolations}</p>
              </div>
              <div className="bg-orange-900/20 rounded-lg p-3 border border-orange-500/30">
                <p className="text-xs text-orange-300 mb-1">{t('criticalViolations')}</p>
                <p className="text-2xl font-bold text-orange-400">{stats.criticalViolations}</p>
              </div>
              <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-500/30">
                <p className="text-xs text-blue-300 mb-1">{t('potentialDamages')}</p>
                <p className="text-lg font-bold text-blue-400">${(stats.totalDamages / 1000).toFixed(1)}k</p>
              </div>
              <div className="bg-green-900/20 rounded-lg p-3 border border-green-500/30">
                <p className="text-xs text-green-300 mb-1">{t('litigationScore')}</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-green-400">{stats.litigationScore}</p>
                  <span className="text-xs text-green-300">/100</span>
                </div>
              </div>
            </div>

            {/* Quick Filters */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                {t('quickFilters')}
              </h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={quickFilters.showViolationsOnly}
                  onChange={(e) => setQuickFilters({ ...quickFilters, showViolationsOnly: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-slate-300">{t('showViolationsOnly')}</span>
              </label>

              <select
                value={quickFilters.bureau}
                onChange={(e) => setQuickFilters({ ...quickFilters, bureau: e.target.value })}
                className="w-full bg-slate-800 text-white px-3 py-2 rounded-lg border border-slate-600 text-sm"
              >
                <option value="ALL">{t('allBureaus')}</option>
                <option value="EXPERIAN">{t('experian')}</option>
                <option value="EQUIFAX">{t('equifax')}</option>
                <option value="TRANSUNION">{t('transunion')}</option>
              </select>

              <select
                value={quickFilters.accountType}
                onChange={(e) => setQuickFilters({ ...quickFilters, accountType: e.target.value })}
                className="w-full bg-slate-800 text-white px-3 py-2 rounded-lg border border-slate-600 text-sm"
              >
                <option value="ALL">{t('allAccountTypes')}</option>
                <option value="CREDIT_CARD">{t('creditCard')}</option>
                <option value="MORTGAGE">{t('mortgage')}</option>
                <option value="AUTO_LOAN">{t('autoLoan')}</option>
                <option value="STUDENT_LOAN">{t('studentLoan')}</option>
                <option value="COLLECTION">{t('collection')}</option>
              </select>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Overview Tab */}
            {activeTab === 'OVERVIEW' && (
              <div className="space-y-8">
                {/* Litigation Score & Damages Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <LitigationScore
                    score={reportData.litigationScore}
                    language={language}
                  />
                  <DamagesSummary
                    damages={reportData.damages}
                    language={language}
                  />
                </div>

                {/* Interactive Credit Report */}
                <InteractiveCreditReport
                  accounts={reportData.accounts}
                  violations={reportData.violations}
                  selectedViolationId={selectedViolationId || undefined}
                  onAccountClick={handleAccountClick}
                  onViolationClick={handleViolationClick}
                  language={language}
                />
              </div>
            )}

            {/* Bureau Comparison Tab */}
            {activeTab === 'COMPARISON' && (
              <BureauComparison
                accounts={reportData.accounts}
                language={language}
                onDiscrepancyClick={(disc) => {
                  // Handle discrepancy click
                  console.log('Discrepancy clicked:', disc);
                }}
              />
            )}

            {/* Timeline Tab */}
            {activeTab === 'TIMELINE' && (
              <TimelineView
                events={reportData.timelineEvents}
                language={language}
                onEventClick={(event) => {
                  // Handle event click
                  console.log('Event clicked:', event);
                }}
              />
            )}

            {/* Violations Tab */}
            {activeTab === 'VIOLATIONS' && (
              <ViolationList
                violations={reportData.violations}
                language={language}
                onViolationClick={handleViolationClick}
              />
            )}

            {/* Documents Tab */}
            {activeTab === 'DOCUMENTS' && (
              <DocumentGenerator
                violations={reportData.violations}
                damages={reportData.damages}
                personalInfo={reportData.personalInfo}
                language={language}
                onGenerate={onGenerateDocument}
              />
            )}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default CreditReportDashboard;
