/**
 * FCRA SUPREME VIOLATION DETECTOR
 * Violation List Component - Displays all detected violations
 */

import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, DollarSign, Scale, FileText } from 'lucide-react';
import { Violation } from '../../types/violations';

interface ViolationListProps {
  violations: Violation[];
  language: 'en' | 'es';
}

export const ViolationList: React.FC<ViolationListProps> = ({ violations, language }) => {
  const [expandedViolations, setExpandedViolations] = useState<Set<number>>(new Set());
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedViolations);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedViolations(newExpanded);
  };

  // Filter violations
  const filteredViolations = violations.filter(v => {
    if (filterSeverity !== 'ALL' && v.severity !== filterSeverity) return false;
    if (filterCategory !== 'ALL' && !v.violationType.includes(filterCategory)) return false;
    return true;
  });

  // Get unique categories
  const categories = Array.from(new Set(violations.map(v => {
    if (v.statute.includes('1681c')) return 'OBSOLETE';
    if (v.statute.includes('1681e')) return 'ACCURACY';
    if (v.statute.includes('1681i')) return 'DISPUTE';
    if (v.statute.includes('1681s-2')) return 'FURNISHER';
    if (v.statute.includes('1692')) return 'FDCPA';
    if (v.statute.includes('1691')) return 'ECOA';
    if (v.statute.includes('Cal. Civ. Code')) return 'CA_STATE';
    if (v.statute.includes('Fla. Stat.')) return 'FL_STATE';
    if (v.statute.includes('Tex. Finance Code')) return 'TX_STATE';
    return 'OTHER';
  })));

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'CRITICAL': return 'border-red-500 bg-red-900/20';
      case 'HIGH': return 'border-orange-500 bg-orange-900/20';
      case 'MEDIUM': return 'border-yellow-500 bg-yellow-900/20';
      case 'LOW': return 'border-blue-500 bg-blue-900/20';
      default: return 'border-slate-500 bg-slate-900/20';
    }
  };

  const getSeverityBadgeColor = (severity: string): string => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-600 text-white';
      case 'HIGH': return 'bg-orange-600 text-white';
      case 'MEDIUM': return 'bg-yellow-600 text-white';
      case 'LOW': return 'bg-blue-600 text-white';
      default: return 'bg-slate-600 text-white';
    }
  };

  const t = (key: string): string => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        filterSeverity: 'Filter by Severity',
        filterCategory: 'Filter by Category',
        all: 'All',
        critical: 'Critical',
        high: 'High',
        medium: 'Medium',
        low: 'Low',
        violationType: 'Violation Type',
        statute: 'Legal Citation',
        legalStandard: 'Legal Standard',
        evidence: 'Evidence',
        caseLaw: 'Supporting Case Law',
        damages: 'Estimated Damages',
        damageBreakdown: 'Damage Breakdown',
        statutory: 'Statutory',
        actual: 'Actual',
        punitive: 'Punitive',
        attorneyFees: 'Attorney Fees',
        totalMin: 'Total (Min)',
        totalMax: 'Total (Max)',
        disputeLetter: 'Dispute Letter Template',
        noViolations: 'No violations match the current filters',
        showing: 'Showing',
        of: 'of',
        violations: 'violations',
      },
      es: {
        filterSeverity: 'Filtrar por Gravedad',
        filterCategory: 'Filtrar por Categoría',
        all: 'Todas',
        critical: 'Crítica',
        high: 'Alta',
        medium: 'Media',
        low: 'Baja',
        violationType: 'Tipo de Violación',
        statute: 'Citación Legal',
        legalStandard: 'Estándar Legal',
        evidence: 'Evidencia',
        caseLaw: 'Jurisprudencia de Apoyo',
        damages: 'Daños Estimados',
        damageBreakdown: 'Desglose de Daños',
        statutory: 'Estatutarios',
        actual: 'Reales',
        punitive: 'Punitivos',
        attorneyFees: 'Honorarios de Abogado',
        totalMin: 'Total (Mín)',
        totalMax: 'Total (Máx)',
        disputeLetter: 'Plantilla de Carta de Disputa',
        noViolations: 'No hay violaciones que coincidan con los filtros actuales',
        showing: 'Mostrando',
        of: 'de',
        violations: 'violaciones',
      }
    };
    return translations[language][key] || key;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="block text-slate-300 text-sm mb-2">{t('filterSeverity')}</label>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">{t('all')}</option>
            <option value="CRITICAL">{t('critical')}</option>
            <option value="HIGH">{t('high')}</option>
            <option value="MEDIUM">{t('medium')}</option>
            <option value="LOW">{t('low')}</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-300 text-sm mb-2">{t('filterCategory')}</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">{t('all')}</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 flex items-end">
          <p className="text-slate-400 text-sm">
            {t('showing')} <span className="font-bold text-white">{filteredViolations.length}</span> {t('of')} <span className="font-bold text-white">{violations.length}</span> {t('violations')}
          </p>
        </div>
      </div>

      {/* Violation Cards */}
      {filteredViolations.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          {t('noViolations')}
        </div>
      ) : (
        filteredViolations.map((violation, index) => (
          <div
            key={index}
            className={`border rounded-xl overflow-hidden transition-all ${getSeverityColor(violation.severity)}`}
          >
            {/* Header */}
            <button
              onClick={() => toggleExpand(index)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className={`p-2 rounded-lg ${getSeverityBadgeColor(violation.severity)}`}>
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-white">{violation.violationType}</h3>
                  <p className="text-sm text-slate-300 mt-1">{violation.statute}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-slate-400">{t('damages')}</p>
                  <p className="text-lg font-bold text-green-400">
                    ${violation.totalDamagesMin?.toLocaleString() || '0'} - ${violation.totalDamagesMax?.toLocaleString() || '0'}
                  </p>
                </div>
                {expandedViolations.has(index) ? (
                  <ChevronDown className="h-6 w-6 text-slate-400" />
                ) : (
                  <ChevronRight className="h-6 w-6 text-slate-400" />
                )}
              </div>
            </button>

            {/* Expanded Details */}
            {expandedViolations.has(index) && (
              <div className="px-6 pb-6 space-y-6 bg-slate-900/30">
                {/* Legal Standard */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                    <Scale className="h-4 w-4" />
                    {t('legalStandard')}
                  </h4>
                  <p className="text-slate-200 bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    {violation.legalStandard}
                  </p>
                </div>

                {/* Evidence */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t('evidence')}
                  </h4>
                  <p className="text-slate-200 bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    {violation.evidence}
                  </p>
                </div>

                {/* Case Law */}
                {violation.caseLaw && violation.caseLaw.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">{t('caseLaw')}</h4>
                    <ul className="space-y-2">
                      {violation.caseLaw.map((caseRef, caseIndex) => (
                        <li
                          key={caseIndex}
                          className="text-sm text-slate-300 bg-slate-800/50 p-3 rounded-lg border border-slate-700"
                        >
                          {caseRef}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Damage Breakdown */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    {t('damageBreakdown')}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {violation.statutoryDamagesMin !== undefined && violation.statutoryDamagesMax !== undefined && (
                      <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                        <p className="text-xs text-slate-400 mb-1">{t('statutory')}</p>
                        <p className="text-lg font-semibold text-blue-400">
                          ${violation.statutoryDamagesMin.toLocaleString()} - ${violation.statutoryDamagesMax.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {violation.actualDamages !== undefined && (
                      <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                        <p className="text-xs text-slate-400 mb-1">{t('actual')}</p>
                        <p className="text-lg font-semibold text-green-400">
                          ${violation.actualDamages.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {violation.punitiveDamages !== undefined && (
                      <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                        <p className="text-xs text-slate-400 mb-1">{t('punitive')}</p>
                        <p className="text-lg font-semibold text-red-400">
                          ${violation.punitiveDamages.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {violation.attorneyFees !== undefined && (
                      <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                        <p className="text-xs text-slate-400 mb-1">{t('attorneyFees')}</p>
                        <p className="text-lg font-semibold text-purple-400">
                          ${violation.attorneyFees.toLocaleString()}
                        </p>
                      </div>
                    )}
                    <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 p-4 rounded-lg border border-green-500/30">
                      <p className="text-xs text-green-300 mb-1">{t('totalMin')}</p>
                      <p className="text-lg font-bold text-green-400">
                        ${violation.totalDamagesMin?.toLocaleString() || '0'}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 p-4 rounded-lg border border-green-500/30">
                      <p className="text-xs text-green-300 mb-1">{t('totalMax')}</p>
                      <p className="text-lg font-bold text-green-400">
                        ${violation.totalDamagesMax?.toLocaleString() || '0'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dispute Letter Preview */}
                {violation.disputeLetterTemplates && Object.keys(violation.disputeLetterTemplates).length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-3">{t('disputeLetter')}</h4>
                    <div className="space-y-2">
                      {Object.entries(violation.disputeLetterTemplates).map(([bureau, template]) => (
                        <details key={bureau} className="bg-slate-800/50 rounded-lg border border-slate-700">
                          <summary className="px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors text-slate-200 font-medium">
                            {bureau} Template
                          </summary>
                          <div className="px-4 pb-4">
                            <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono bg-slate-900/50 p-3 rounded overflow-x-auto">
                              {template}
                            </pre>
                          </div>
                        </details>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default ViolationList;
