/**
 * FCRA SUPREME VIOLATION DETECTOR
 * Litigation Value Score Component
 */

import React from 'react';
import { Scale, TrendingUp, Users, CheckCircle, XCircle } from 'lucide-react';

interface LitigationScoreProps {
  score: number;
  classAction: {
    commonalityScore: number;
    typicalityScore: number;
    adequacyScore: number;
    numerosityScore: number;
    totalScore: number;
    viability: 'HIGH' | 'MODERATE' | 'LOW';
  };
  recommendation: {
    action: 'PURSUE_LITIGATION' | 'STRONG_CASE' | 'SETTLE' | 'DISPUTE_FIRST';
    reasoning: string;
    nextSteps: string[];
  };
  language: 'en' | 'es';
}

export const LitigationScore: React.FC<LitigationScoreProps> = ({
  score,
  classAction,
  recommendation,
  language
}) => {
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'from-green-500 to-emerald-500';
    if (score >= 60) return 'from-blue-500 to-cyan-500';
    if (score >= 40) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return language === 'en' ? 'EXCELLENT' : 'EXCELENTE';
    if (score >= 60) return language === 'en' ? 'STRONG' : 'FUERTE';
    if (score >= 40) return language === 'en' ? 'MODERATE' : 'MODERADO';
    return language === 'en' ? 'WEAK' : 'DÉBIL';
  };

  const getViabilityColor = (viability: string): string => {
    if (viability === 'HIGH') return 'bg-green-600';
    if (viability === 'MODERATE') return 'bg-yellow-600';
    return 'bg-red-600';
  };

  const getActionColor = (action: string): string => {
    if (action === 'PURSUE_LITIGATION') return 'border-green-500 bg-green-900/20';
    if (action === 'STRONG_CASE') return 'border-blue-500 bg-blue-900/20';
    if (action === 'SETTLE') return 'border-yellow-500 bg-yellow-900/20';
    return 'border-orange-500 bg-orange-900/20';
  };

  const t = (key: string): string => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        litigationValue: 'Litigation Value Score',
        outOf100: 'out of 100',
        classActionViability: 'Class Action Viability Assessment (Rule 23)',
        commonality: 'Commonality',
        typicality: 'Typicality',
        adequacy: 'Adequacy',
        numerosity: 'Numerosity',
        totalScore: 'Total Score',
        viability: 'Viability',
        high: 'HIGH',
        moderate: 'MODERATE',
        low: 'LOW',
        recommendation: 'Strategic Recommendation',
        pursueLitigation: 'PURSUE LITIGATION',
        strongCase: 'STRONG CASE - Consider Litigation',
        settle: 'SETTLE - Negotiate Settlement',
        disputeFirst: 'DISPUTE FIRST - Administrative Remedies',
        reasoning: 'Analysis',
        nextSteps: 'Recommended Next Steps',
        scoringFactors: 'Scoring Factors',
        numViolations: 'Number of Violations (25%)',
        severity: 'Violation Severity (25%)',
        willfulness: 'Willfulness Evidence (20%)',
        documentation: 'Documentation Strength (15%)',
        defendantResources: 'Defendant Resources (15%)',
      },
      es: {
        litigationValue: 'Puntuación de Valor de Litigio',
        outOf100: 'de 100',
        classActionViability: 'Evaluación de Viabilidad de Acción Colectiva (Regla 23)',
        commonality: 'Comunalidad',
        typicality: 'Tipicidad',
        adequacy: 'Adecuación',
        numerosity: 'Numerosidad',
        totalScore: 'Puntuación Total',
        viability: 'Viabilidad',
        high: 'ALTA',
        moderate: 'MODERADA',
        low: 'BAJA',
        recommendation: 'Recomendación Estratégica',
        pursueLitigation: 'SEGUIR LITIGIO',
        strongCase: 'CASO FUERTE - Considerar Litigio',
        settle: 'NEGOCIAR - Acuerdo Extrajudicial',
        disputeFirst: 'DISPUTAR PRIMERO - Remedios Administrativos',
        reasoning: 'Análisis',
        nextSteps: 'Próximos Pasos Recomendados',
        scoringFactors: 'Factores de Puntuación',
        numViolations: 'Número de Violaciones (25%)',
        severity: 'Gravedad de Violación (25%)',
        willfulness: 'Evidencia de Intencionalidad (20%)',
        documentation: 'Fortaleza de Documentación (15%)',
        defendantResources: 'Recursos del Demandado (15%)',
      }
    };
    return translations[language][key] || key;
  };

  return (
    <div className="space-y-6">
      {/* Litigation Value Score */}
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-slate-700 p-8">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Scale className="h-6 w-6 text-blue-400" />
          {t('litigationValue')}
        </h2>

        <div className="flex flex-col items-center mb-8">
          <div className="relative w-64 h-64 mb-4">
            {/* Circular Progress */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="128"
                cy="128"
                r="110"
                stroke="currentColor"
                strokeWidth="16"
                fill="none"
                className="text-slate-700"
              />
              <circle
                cx="128"
                cy="128"
                r="110"
                stroke="url(#gradient)"
                strokeWidth="16"
                fill="none"
                strokeDasharray={`${(score / 100) * 691.15} 691.15`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" className={`text-${getScoreColor(score).split('-')[1]}-500`} stopColor="currentColor" />
                  <stop offset="100%" className={`text-${getScoreColor(score).split('-')[3]}-500`} stopColor="currentColor" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Score Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
                {score}
              </span>
              <span className="text-slate-400 text-sm mt-1">{t('outOf100')}</span>
              <span className={`mt-2 px-4 py-1 rounded-full text-sm font-semibold bg-gradient-to-r ${getScoreColor(score)} text-white`}>
                {getScoreLabel(score)}
              </span>
            </div>
          </div>

          {/* Scoring Factors */}
          <div className="w-full max-w-md space-y-2">
            <h4 className="text-sm font-semibold text-slate-400 mb-3">{t('scoringFactors')}</h4>
            <div className="text-xs text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>{t('numViolations')}</span>
                <span className="text-slate-300">✓</span>
              </div>
              <div className="flex justify-between">
                <span>{t('severity')}</span>
                <span className="text-slate-300">✓</span>
              </div>
              <div className="flex justify-between">
                <span>{t('willfulness')}</span>
                <span className="text-slate-300">✓</span>
              </div>
              <div className="flex justify-between">
                <span>{t('documentation')}</span>
                <span className="text-slate-300">✓</span>
              </div>
              <div className="flex justify-between">
                <span>{t('defendantResources')}</span>
                <span className="text-slate-300">✓</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Class Action Viability */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-purple-400" />
          {t('classActionViability')}
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-2">{t('commonality')}</p>
            <p className="text-3xl font-bold text-white">{classAction.commonalityScore}</p>
            <p className="text-xs text-slate-500">/10</p>
          </div>
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-2">{t('typicality')}</p>
            <p className="text-3xl font-bold text-white">{classAction.typicalityScore}</p>
            <p className="text-xs text-slate-500">/10</p>
          </div>
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-2">{t('adequacy')}</p>
            <p className="text-3xl font-bold text-white">{classAction.adequacyScore}</p>
            <p className="text-xs text-slate-500">/10</p>
          </div>
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-2">{t('numerosity')}</p>
            <p className="text-3xl font-bold text-white">{classAction.numerosityScore}</p>
            <p className="text-xs text-slate-500">/10</p>
          </div>
          <div className="text-center border-l border-slate-600 pl-4">
            <p className="text-slate-400 text-sm mb-2">{t('totalScore')}</p>
            <p className="text-4xl font-bold text-purple-400">{classAction.totalScore}</p>
            <p className="text-xs text-slate-500">/40</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          <span className="text-slate-400">{t('viability')}:</span>
          <span className={`px-4 py-2 rounded-lg text-white font-semibold ${getViabilityColor(classAction.viability)}`}>
            {t(classAction.viability.toLowerCase())}
          </span>
        </div>
      </div>

      {/* Strategic Recommendation */}
      <div className={`rounded-xl border-2 p-6 ${getActionColor(recommendation.action)}`}>
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {t('recommendation')}
        </h3>

        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white/10 backdrop-blur-sm">
            {recommendation.action === 'PURSUE_LITIGATION' && <CheckCircle className="h-6 w-6 text-green-400" />}
            {recommendation.action === 'STRONG_CASE' && <CheckCircle className="h-6 w-6 text-blue-400" />}
            {recommendation.action === 'SETTLE' && <Scale className="h-6 w-6 text-yellow-400" />}
            {recommendation.action === 'DISPUTE_FIRST' && <XCircle className="h-6 w-6 text-orange-400" />}
            <span className="text-2xl font-bold text-white">
              {t(recommendation.action.toLowerCase().replace(/_/g, ''))}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-white mb-2">{t('reasoning')}</h4>
            <p className="text-slate-200 leading-relaxed bg-black/20 p-4 rounded-lg">
              {recommendation.reasoning}
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-3">{t('nextSteps')}</h4>
            <ol className="space-y-2">
              {recommendation.nextSteps.map((step, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center font-semibold">
                    {index + 1}
                  </span>
                  <span className="text-slate-200 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LitigationScore;
