/**
 * FCRA SUPREME VIOLATION DETECTOR
 * Main React Component - Violation Detection Interface
 */

import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertTriangle, DollarSign, Scale, Download, Send } from 'lucide-react';
import { Violation, ViolationAnalysisResult } from '../../types/violations';
import { ViolationList } from './ViolationList';
import { DamagesSummary } from './DamagesSummary';
import { LitigationScore } from './LitigationScore';
import { DocumentGenerator } from './DocumentGenerator';

export const ViolationDetector: React.FC = () => {
  const [language, setLanguage] = useState<'en' | 'es'>('en');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ViolationAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'violations' | 'damages' | 'litigation' | 'documents'>('violations');

  // Translations
  const t = (key: string): string => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        title: 'FCRA SUPREME VIOLATION DETECTOR',
        subtitle: 'Elite FCRA Compliance & Consumer Protection Specialist',
        upload: 'Upload Credit Report',
        uploading: 'Processing...',
        analyze: 'Analyze Report',
        analyzing: 'Detecting Violations...',
        selectLanguage: 'Select Language',
        english: 'English',
        spanish: 'Español',
        tabViolations: 'Violations',
        tabDamages: 'Damages',
        tabLitigation: 'Litigation Value',
        tabDocuments: 'Documents',
        uploadInstructions: 'Upload your credit report (PDF, TXT, or image) to begin comprehensive violation analysis',
        supportedFormats: 'Supported formats: PDF, TXT, PNG, JPG',
        totalViolations: 'Total Violations',
        estimatedDamages: 'Estimated Damages',
        litigationValue: 'Litigation Value',
        classActionViability: 'Class Action Viability',
      },
      es: {
        title: 'DETECTOR SUPREMO DE VIOLACIONES FCRA',
        subtitle: 'Especialista Élite en Cumplimiento FCRA y Protección al Consumidor',
        upload: 'Cargar Informe de Crédito',
        uploading: 'Procesando...',
        analyze: 'Analizar Informe',
        analyzing: 'Detectando Violaciones...',
        selectLanguage: 'Seleccionar Idioma',
        english: 'English',
        spanish: 'Español',
        tabViolations: 'Violaciones',
        tabDamages: 'Daños',
        tabLitigation: 'Valor de Litigio',
        tabDocuments: 'Documentos',
        uploadInstructions: 'Cargue su informe de crédito (PDF, TXT o imagen) para comenzar el análisis completo de violaciones',
        supportedFormats: 'Formatos admitidos: PDF, TXT, PNG, JPG',
        totalViolations: 'Violaciones Totales',
        estimatedDamages: 'Daños Estimados',
        litigationValue: 'Valor de Litigio',
        classActionViability: 'Viabilidad de Acción Colectiva',
      }
    };
    return translations[language][key] || key;
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'text/plain', 'image/png', 'image/jpeg'];
      if (!allowedTypes.includes(file.type)) {
        setError('Invalid file type. Please upload PDF, TXT, PNG, or JPG.');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File too large. Maximum size is 10MB.');
        return;
      }

      setUploadedFile(file);
      setError(null);
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!uploadedFile) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('report', uploadedFile);
      formData.append('language', language);

      // Call API endpoint
      const response = await fetch('/api/violations/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const result: ViolationAnalysisResult = await response.json();
      setAnalysisResult(result);
      setActiveTab('violations');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [uploadedFile, language]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-blue-500/30 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                {t('title')}
              </h1>
              <p className="text-slate-300 mt-1">{t('subtitle')}</p>
            </div>
            
            {/* Language Selector */}
            <div className="flex items-center gap-2">
              <label className="text-slate-300 text-sm">{t('selectLanguage')}:</label>
              <button
                onClick={() => setLanguage('en')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  language === 'en'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {t('english')}
              </button>
              <button
                onClick={() => setLanguage('es')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  language === 'es'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {t('spanish')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Upload Section */}
        {!analysisResult && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-blue-500/30 shadow-2xl p-8">
            <div className="text-center">
              <Upload className="mx-auto h-16 w-16 text-blue-400 mb-4" />
              <h2 className="text-2xl font-semibold text-white mb-2">{t('upload')}</h2>
              <p className="text-slate-300 mb-6">{t('uploadInstructions')}</p>

              <label className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg cursor-pointer hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl">
                <FileText className="h-5 w-5" />
                <span>{uploadedFile ? uploadedFile.name : t('upload')}</span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  accept=".pdf,.txt,.png,.jpg,.jpeg"
                  className="hidden"
                />
              </label>

              <p className="text-slate-400 text-sm mt-4">{t('supportedFormats')}</p>

              {uploadedFile && (
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="mt-6 px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      <span>{t('analyzing')}</span>
                    </>
                  ) : (
                    <>
                      <Scale className="h-5 w-5" />
                      <span>{t('analyze')}</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Analysis Results */}
        {analysisResult && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-red-500/30 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">{t('totalViolations')}</p>
                    <p className="text-3xl font-bold text-red-400">{analysisResult.violations.length}</p>
                  </div>
                  <AlertTriangle className="h-10 w-10 text-red-400" />
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-green-500/30 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">{t('estimatedDamages')}</p>
                    <p className="text-2xl font-bold text-green-400">
                      ${analysisResult.damagesSummary.conservative.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500">
                      Max: ${analysisResult.damagesSummary.maximum.toLocaleString()}
                    </p>
                  </div>
                  <DollarSign className="h-10 w-10 text-green-400" />
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-blue-500/30 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">{t('litigationValue')}</p>
                    <p className="text-3xl font-bold text-blue-400">{analysisResult.litigationValueScore}</p>
                    <p className="text-xs text-slate-500">/100</p>
                  </div>
                  <Scale className="h-10 w-10 text-blue-400" />
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-purple-500/30 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">{t('classActionViability')}</p>
                    <p className="text-3xl font-bold text-purple-400">{analysisResult.classActionViability.totalScore}</p>
                    <p className="text-xs text-slate-500">/40</p>
                  </div>
                  <FileText className="h-10 w-10 text-purple-400" />
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-blue-500/30 shadow-2xl">
              <div className="border-b border-slate-700">
                <div className="flex gap-2 p-2">
                  {(['violations', 'damages', 'litigation', 'documents'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-6 py-3 rounded-lg transition-all ${
                        activeTab === tab
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {t(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'violations' && (
                  <ViolationList violations={analysisResult.violations} language={language} />
                )}
                {activeTab === 'damages' && (
                  <DamagesSummary summary={analysisResult.damagesSummary} language={language} />
                )}
                {activeTab === 'litigation' && (
                  <LitigationScore
                    score={analysisResult.litigationValueScore}
                    classAction={analysisResult.classActionViability}
                    recommendation={analysisResult.strategicRecommendation}
                    language={language}
                  />
                )}
                {activeTab === 'documents' && (
                  <DocumentGenerator violations={analysisResult.violations} language={language} />
                )}
              </div>
            </div>

            {/* New Analysis Button */}
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setAnalysisResult(null);
                  setUploadedFile(null);
                  setError(null);
                }}
                className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all"
              >
                {language === 'en' ? 'Analyze New Report' : 'Analizar Nuevo Informe'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ViolationDetector;
