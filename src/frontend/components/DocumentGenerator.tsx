/**
 * FCRA SUPREME VIOLATION DETECTOR
 * Document Generator Component
 */

import React, { useState } from 'react';
import { FileText, Download, Send, Scale, AlertCircle } from 'lucide-react';
import { Violation } from '../../types/violations';

interface DocumentGeneratorProps {
  violations: Violation[];
  language: 'en' | 'es';
}

export const DocumentGenerator: React.FC<DocumentGeneratorProps> = ({ violations, language }) => {
  const [selectedDocType, setSelectedDocType] = useState<string>('');
  const [generatedDoc, setGeneratedDoc] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const documentTypes = [
    { id: 'dispute_609', name: language === 'en' ? 'Section 609 Verification Request' : 'Solicitud de Verificación Sección 609', icon: FileText },
    { id: 'dispute_611', name: language === 'en' ? 'Section 611 Investigation Demand' : 'Demanda de Investigación Sección 611', icon: FileText },
    { id: 'dispute_623', name: language === 'en' ? 'Direct Furnisher Dispute (§623)' : 'Disputa Directa al Proveedor (§623)', icon: FileText },
    { id: 'fdcpa_validation', name: language === 'en' ? 'FDCPA Debt Validation Letter' : 'Carta de Validación de Deuda FDCPA', icon: FileText },
    { id: 'federal_complaint', name: language === 'en' ? 'Federal Court Complaint' : 'Demanda Tribunal Federal', icon: Scale },
    { id: 'cfpb_complaint', name: language === 'en' ? 'CFPB Complaint' : 'Queja CFPB', icon: AlertCircle },
    { id: 'ftc_complaint', name: language === 'en' ? 'FTC Complaint' : 'Queja FTC', icon: AlertCircle },
    { id: 'state_ag_complaint', name: language === 'en' ? 'State Attorney General Complaint' : 'Queja al Fiscal General Estatal', icon: AlertCircle },
  ];

  const t = (key: string): string => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        title: 'Document Generator',
        subtitle: '38+ Professional Templates',
        selectDocument: 'Select Document Type',
        generate: 'Generate Document',
        generating: 'Generating...',
        download: 'Download Document',
        sendEmail: 'Send via Email',
        preview: 'Document Preview',
        noDocument: 'No document generated yet. Select a document type above.',
        disputeLetters: 'Dispute Letters',
        legalDocuments: 'Legal Documents',
        regulatory: 'Regulatory Complaints',
      },
      es: {
        title: 'Generador de Documentos',
        subtitle: '38+ Plantillas Profesionales',
        selectDocument: 'Seleccionar Tipo de Documento',
        generate: 'Generar Documento',
        generating: 'Generando...',
        download: 'Descargar Documento',
        sendEmail: 'Enviar por Correo',
        preview: 'Vista Previa del Documento',
        noDocument: 'Ningún documento generado aún. Seleccione un tipo de documento arriba.',
        disputeLetters: 'Cartas de Disputa',
        legalDocuments: 'Documentos Legales',
        regulatory: 'Quejas Regulatorias',
      }
    };
    return translations[language][key] || key;
  };

  const handleGenerate = async () => {
    if (!selectedDocType) return;

    setIsGenerating(true);
    
    try {
      // Call API to generate document
      const response = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: selectedDocType,
          violations: violations.map(v => v.id || violations.indexOf(v)),
          language
        })
      });

      if (!response.ok) throw new Error('Generation failed');

      const result = await response.json();
      setGeneratedDoc(result.documentContent);
    } catch (error) {
      console.error('Document generation error:', error);
      alert('Failed to generate document. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedDoc) return;

    const blob = new Blob([generatedDoc], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDocType}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Group document types
  const disputeLetterTypes = documentTypes.filter(d => d.id.startsWith('dispute') || d.id.includes('validation'));
  const legalDocTypes = documentTypes.filter(d => d.id.includes('complaint') && d.id.includes('federal'));
  const regulatoryTypes = documentTypes.filter(d => d.id.includes('cfpb') || d.id.includes('ftc') || d.id.includes('state_ag'));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">{t('title')}</h2>
        <p className="text-slate-400">{t('subtitle')}</p>
      </div>

      {/* Document Type Selection */}
      <div className="space-y-6">
        {/* Dispute Letters */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">{t('disputeLetters')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {disputeLetterTypes.map(docType => (
              <button
                key={docType.id}
                onClick={() => setSelectedDocType(docType.id)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedDocType === docType.id
                    ? 'border-blue-500 bg-blue-900/30'
                    : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <docType.icon className={`h-6 w-6 ${selectedDocType === docType.id ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span className={`font-medium ${selectedDocType === docType.id ? 'text-white' : 'text-slate-300'}`}>
                    {docType.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Legal Documents */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">{t('legalDocuments')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {legalDocTypes.map(docType => (
              <button
                key={docType.id}
                onClick={() => setSelectedDocType(docType.id)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedDocType === docType.id
                    ? 'border-green-500 bg-green-900/30'
                    : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <docType.icon className={`h-6 w-6 ${selectedDocType === docType.id ? 'text-green-400' : 'text-slate-400'}`} />
                  <span className={`font-medium ${selectedDocType === docType.id ? 'text-white' : 'text-slate-300'}`}>
                    {docType.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Regulatory Complaints */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">{t('regulatory')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {regulatoryTypes.map(docType => (
              <button
                key={docType.id}
                onClick={() => setSelectedDocType(docType.id)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedDocType === docType.id
                    ? 'border-purple-500 bg-purple-900/30'
                    : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <docType.icon className={`h-6 w-6 ${selectedDocType === docType.id ? 'text-purple-400' : 'text-slate-400'}`} />
                  <span className={`font-medium ${selectedDocType === docType.id ? 'text-white' : 'text-slate-300'}`}>
                    {docType.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Generate Button */}
      {selectedDocType && !generatedDoc && (
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-semibold"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              <span>{t('generating')}</span>
            </>
          ) : (
            <>
              <FileText className="h-5 w-5" />
              <span>{t('generate')}</span>
            </>
          )}
        </button>
      )}

      {/* Document Preview */}
      {generatedDoc && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <div className="bg-slate-900/50 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-400" />
              {t('preview')}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {t('download')}
              </button>
              <button
                onClick={() => {/* TODO: Implement email sending */}}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {t('sendEmail')}
              </button>
            </div>
          </div>
          
          <div className="p-6 max-h-[600px] overflow-y-auto">
            <pre className="text-sm text-slate-200 whitespace-pre-wrap font-mono leading-relaxed">
              {generatedDoc}
            </pre>
          </div>
        </div>
      )}

      {/* New Document Button */}
      {generatedDoc && (
        <button
          onClick={() => {
            setGeneratedDoc(null);
            setSelectedDocType('');
          }}
          className="w-full md:w-auto px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all"
        >
          {language === 'en' ? 'Generate Another Document' : 'Generar Otro Documento'}
        </button>
      )}
    </div>
  );
};

export default DocumentGenerator;
