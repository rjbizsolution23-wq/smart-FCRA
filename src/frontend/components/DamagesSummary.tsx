/**
 * FCRA SUPREME VIOLATION DETECTOR
 * Damages Summary Component
 */

import React from 'react';
import { DollarSign, TrendingUp, AlertCircle } from 'lucide-react';

interface DamagesSummaryProps {
  summary: {
    conservative: number;
    midRange: number;
    maximum: number;
    perViolationAverage: number;
    breakdown: {
      statutory: number;
      actual: number;
      punitive: number;
      attorneyFees: number;
    };
  };
  language: 'en' | 'es';
}

export const DamagesSummary: React.FC<DamagesSummaryProps> = ({ summary, language }) => {
  const t = (key: string): string => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        title: 'Comprehensive Damages Analysis',
        conservative: 'Conservative Estimate',
        midRange: 'Mid-Range Estimate',
        maximum: 'Maximum Recovery',
        perViolation: 'Per Violation Average',
        breakdown: 'Damages Breakdown',
        statutory: 'Statutory Damages',
        actual: 'Actual Damages',
        punitive: 'Punitive Damages',
        attorneyFees: 'Attorney Fees & Costs',
        total: 'Total Estimated',
        note: 'Important Note',
        noteText: 'These damage estimates are based on federal and state statutory provisions, case law precedents, and the specific violations detected in your credit report. Actual damages awarded may vary based on jurisdiction, court discretion, and specific case circumstances. Conservative estimates represent highly likely recovery in settlement or judgment, while maximum represents the theoretical upper limit under applicable statutes.',
        fcraNote: 'FCRA Statutory Damages',
        fcraText: 'Under 15 U.S.C. § 1681n, willful violations entitle you to statutory damages between $100-$1,000 per violation, plus actual damages, punitive damages, and attorney fees.',
        stateNote: 'State Law Enhanced Damages',
        stateText: 'California, Florida, Texas, New York, and Illinois provide enhanced statutory damages with no caps on total recovery.',
      },
      es: {
        title: 'Análisis Completo de Daños',
        conservative: 'Estimación Conservadora',
        midRange: 'Estimación de Rango Medio',
        maximum: 'Recuperación Máxima',
        perViolation: 'Promedio por Violación',
        breakdown: 'Desglose de Daños',
        statutory: 'Daños Estatutarios',
        actual: 'Daños Reales',
        punitive: 'Daños Punitivos',
        attorneyFees: 'Honorarios y Costos de Abogado',
        total: 'Total Estimado',
        note: 'Nota Importante',
        noteText: 'Estas estimaciones de daños se basan en disposiciones estatutarias federales y estatales, precedentes de jurisprudencia y las violaciones específicas detectadas en su informe de crédito. Los daños reales otorgados pueden variar según la jurisdicción, la discreción del tribunal y las circunstancias específicas del caso. Las estimaciones conservadoras representan una recuperación altamente probable en acuerdo o sentencia, mientras que el máximo representa el límite superior teórico bajo los estatutos aplicables.',
        fcraNote: 'Daños Estatutarios FCRA',
        fcraText: 'Bajo 15 U.S.C. § 1681n, las violaciones intencionales le dan derecho a daños estatutarios entre $100-$1,000 por violación, más daños reales, daños punitivos y honorarios de abogado.',
        stateNote: 'Daños Mejorados de Ley Estatal',
        stateText: 'California, Florida, Texas, Nueva York e Illinois proporcionan daños estatutarios mejorados sin límites en la recuperación total.',
      }
    };
    return translations[language][key] || key;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">{t('title')}</h2>

      {/* Primary Estimates Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/30 p-6 rounded-xl border border-blue-500/30">
          <p className="text-blue-300 text-sm mb-2">{t('conservative')}</p>
          <p className="text-3xl font-bold text-blue-400">${summary.conservative.toLocaleString()}</p>
          <p className="text-xs text-blue-300/60 mt-2">Highly Likely Recovery</p>
        </div>

        <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/30 p-6 rounded-xl border border-purple-500/30">
          <p className="text-purple-300 text-sm mb-2">{t('midRange')}</p>
          <p className="text-3xl font-bold text-purple-400">${summary.midRange.toLocaleString()}</p>
          <p className="text-xs text-purple-300/60 mt-2">Expected Range</p>
        </div>

        <div className="bg-gradient-to-br from-green-900/30 to-emerald-800/30 p-6 rounded-xl border border-green-500/30">
          <p className="text-green-300 text-sm mb-2">{t('maximum')}</p>
          <p className="text-3xl font-bold text-green-400">${summary.maximum.toLocaleString()}</p>
          <p className="text-xs text-green-300/60 mt-2">Theoretical Maximum</p>
        </div>

        <div className="bg-gradient-to-br from-orange-900/30 to-orange-800/30 p-6 rounded-xl border border-orange-500/30">
          <p className="text-orange-300 text-sm mb-2">{t('perViolation')}</p>
          <p className="text-3xl font-bold text-orange-400">${summary.perViolationAverage.toLocaleString()}</p>
          <p className="text-xs text-orange-300/60 mt-2">Average Per Item</p>
        </div>
      </div>

      {/* Breakdown Chart */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-400" />
          {t('breakdown')}
        </h3>
        
        <div className="space-y-4">
          {/* Statutory Damages */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-300">{t('statutory')}</span>
              <span className="text-white font-semibold">${summary.breakdown.statutory.toLocaleString()}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${(summary.breakdown.statutory / summary.maximum) * 100}%` }}
              />
            </div>
          </div>

          {/* Actual Damages */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-300">{t('actual')}</span>
              <span className="text-white font-semibold">${summary.breakdown.actual.toLocaleString()}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${(summary.breakdown.actual / summary.maximum) * 100}%` }}
              />
            </div>
          </div>

          {/* Punitive Damages */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-300">{t('punitive')}</span>
              <span className="text-white font-semibold">${summary.breakdown.punitive.toLocaleString()}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${(summary.breakdown.punitive / summary.maximum) * 100}%` }}
              />
            </div>
          </div>

          {/* Attorney Fees */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-300">{t('attorneyFees')}</span>
              <span className="text-white font-semibold">${summary.breakdown.attorneyFees.toLocaleString()}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${(summary.breakdown.attorneyFees / summary.maximum) * 100}%` }}
              />
            </div>
          </div>

          {/* Total */}
          <div className="pt-4 border-t border-slate-600">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-white">{t('total')}</span>
              <span className="text-2xl font-bold text-green-400">${summary.maximum.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Legal Notes */}
      <div className="space-y-4">
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-300 mb-2">{t('fcraNote')}</h4>
              <p className="text-slate-300 text-sm leading-relaxed">{t('fcraText')}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-6 w-6 text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-purple-300 mb-2">{t('stateNote')}</h4>
              <p className="text-slate-300 text-sm leading-relaxed">{t('stateText')}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-600 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-slate-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-slate-300 mb-2">{t('note')}</h4>
              <p className="text-slate-400 text-sm leading-relaxed">{t('noteText')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DamagesSummary;
