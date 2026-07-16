/**
 * FCRA SUPREME VIOLATION DETECTOR
 * Timeline View Component - Chronological Event Visualization
 * 
 * Features:
 * - Chronological timeline of all credit events
 * - Event filtering (accounts, inquiries, disputes, violations)
 * - Visual event markers with color coding
 * - Zoom controls (month, quarter, year views)
 * - Event clustering for dense periods
 * - Export timeline report
 */

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Circle,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Eye,
  Search,
  Download,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Filter,
  FileText,
  CreditCard,
  XCircle,
  DollarSign,
  Clock,
  Flag
} from 'lucide-react';

interface TimelineEvent {
  id: string;
  date: string; // ISO date
  type: 'ACCOUNT_OPENED' | 'ACCOUNT_CLOSED' | 'DELINQUENCY' | 'CHARGE_OFF' | 'INQUIRY' | 'DISPUTE' | 'VIOLATION' | 'PAYMENT' | 'STATUS_CHANGE';
  severity: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'CRITICAL';
  title: string;
  description: string;
  accountName?: string;
  bureau?: 'EXPERIAN' | 'EQUIFAX' | 'TRANSUNION' | 'ALL';
  amount?: number;
  metadata?: Record<string, any>;
}

interface TimelineViewProps {
  events: TimelineEvent[];
  language: 'en' | 'es';
  onEventClick?: (event: TimelineEvent) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  events,
  language,
  onEventClick
}) => {
  const [zoomLevel, setZoomLevel] = useState<'MONTH' | 'QUARTER' | 'YEAR'>('QUARTER');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(['ALL']));
  const [selectedSeverity, setSelectedSeverity] = useState<Set<string>>(new Set(['ALL']));
  const [searchTerm, setSearchTerm] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);

  // Event type filters
  const eventTypes = ['ALL', 'ACCOUNT_OPENED', 'ACCOUNT_CLOSED', 'DELINQUENCY', 'CHARGE_OFF', 'INQUIRY', 'DISPUTE', 'VIOLATION'];
  const severityLevels = ['ALL', 'POSITIVE', 'NEUTRAL', 'NEGATIVE', 'CRITICAL'];

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      if (!selectedTypes.has('ALL') && !selectedTypes.has(event.type)) return false;
      if (!selectedSeverity.has('ALL') && !selectedSeverity.has(event.severity)) return false;
      if (searchTerm && !event.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !event.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [events, selectedTypes, selectedSeverity, searchTerm]);

  // Sort events chronologically
  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredEvents]);

  // Group events by time period
  const groupedEvents = useMemo(() => {
    const groups = new Map<string, TimelineEvent[]>();
    
    sortedEvents.forEach(event => {
      const date = new Date(event.date);
      let key: string;
      
      if (zoomLevel === 'MONTH') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (zoomLevel === 'QUARTER') {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        key = `${date.getFullYear()}-Q${quarter}`;
      } else {
        key = `${date.getFullYear()}`;
      }
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(event);
    });
    
    return Array.from(groups.entries()).map(([period, evts]) => ({
      period,
      events: evts,
      count: evts.length,
      positive: evts.filter(e => e.severity === 'POSITIVE').length,
      negative: evts.filter(e => e.severity === 'NEGATIVE' || e.severity === 'CRITICAL').length
    })).sort((a, b) => b.period.localeCompare(a.period));
  }, [sortedEvents, zoomLevel]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: filteredEvents.length,
      positive: filteredEvents.filter(e => e.severity === 'POSITIVE').length,
      negative: filteredEvents.filter(e => e.severity === 'NEGATIVE' || e.severity === 'CRITICAL').length,
      violations: filteredEvents.filter(e => e.type === 'VIOLATION').length,
      disputes: filteredEvents.filter(e => e.type === 'DISPUTE').length,
      delinquencies: filteredEvents.filter(e => e.type === 'DELINQUENCY' || e.type === 'CHARGE_OFF').length
    };
  }, [filteredEvents]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'ACCOUNT_OPENED': return TrendingUp;
      case 'ACCOUNT_CLOSED': return XCircle;
      case 'DELINQUENCY': return AlertTriangle;
      case 'CHARGE_OFF': return TrendingDown;
      case 'INQUIRY': return Eye;
      case 'DISPUTE': return FileText;
      case 'VIOLATION': return Flag;
      case 'PAYMENT': return DollarSign;
      case 'STATUS_CHANGE': return Circle;
      default: return Circle;
    }
  };

  const getEventColor = (severity: string): string => {
    switch (severity) {
      case 'POSITIVE': return 'green';
      case 'NEUTRAL': return 'blue';
      case 'NEGATIVE': return 'orange';
      case 'CRITICAL': return 'red';
      default: return 'slate';
    }
  };

  const toggleType = (type: string) => {
    const newTypes = new Set(selectedTypes);
    if (type === 'ALL') {
      newTypes.clear();
      newTypes.add('ALL');
    } else {
      newTypes.delete('ALL');
      if (newTypes.has(type)) {
        newTypes.delete(type);
      } else {
        newTypes.add(type);
      }
      if (newTypes.size === 0) {
        newTypes.add('ALL');
      }
    }
    setSelectedTypes(newTypes);
  };

  const toggleSeverity = (sev: string) => {
    const newSev = new Set(selectedSeverity);
    if (sev === 'ALL') {
      newSev.clear();
      newSev.add('ALL');
    } else {
      newSev.delete('ALL');
      if (newSev.has(sev)) {
        newSev.delete(sev);
      } else {
        newSev.add(sev);
      }
      if (newSev.size === 0) {
        newSev.add('ALL');
      }
    }
    setSelectedSeverity(newSev);
  };

  const exportTimeline = () => {
    const csv = [
      ['Date', 'Type', 'Severity', 'Title', 'Description', 'Account', 'Bureau', 'Amount'],
      ...sortedEvents.map(e => [
        e.date,
        e.type,
        e.severity,
        e.title,
        e.description,
        e.accountName || '',
        e.bureau || '',
        e.amount || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credit-timeline-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const t = (key: string): string => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        title: 'Credit Timeline',
        subtitle: 'Chronological view of all credit events',
        stats: 'Timeline Statistics',
        totalEvents: 'Total Events',
        positiveEvents: 'Positive',
        negativeEvents: 'Negative',
        violations: 'Violations',
        disputes: 'Disputes',
        delinquencies: 'Delinquencies',
        filters: 'Filters',
        eventTypes: 'Event Types',
        severity: 'Severity',
        search: 'Search events...',
        zoomLevel: 'Zoom Level',
        month: 'Month',
        quarter: 'Quarter',
        year: 'Year',
        export: 'Export Timeline',
        all: 'All',
        positive: 'Positive',
        neutral: 'Neutral',
        negative: 'Negative',
        critical: 'Critical',
        accountOpened: 'Account Opened',
        accountClosed: 'Account Closed',
        delinquency: 'Delinquency',
        chargeOff: 'Charge-off',
        inquiry: 'Inquiry',
        dispute: 'Dispute',
        violation: 'Violation',
        payment: 'Payment',
        statusChange: 'Status Change',
        events: 'events',
        noEvents: 'No events match the current filters',
        clickForDetails: 'Click for details'
      },
      es: {
        title: 'Línea de Tiempo de Crédito',
        subtitle: 'Vista cronológica de todos los eventos de crédito',
        stats: 'Estadísticas de Línea de Tiempo',
        totalEvents: 'Eventos Totales',
        positiveEvents: 'Positivos',
        negativeEvents: 'Negativos',
        violations: 'Violaciones',
        disputes: 'Disputas',
        delinquencies: 'Morosidades',
        filters: 'Filtros',
        eventTypes: 'Tipos de Eventos',
        severity: 'Severidad',
        search: 'Buscar eventos...',
        zoomLevel: 'Nivel de Zoom',
        month: 'Mes',
        quarter: 'Trimestre',
        year: 'Año',
        export: 'Exportar Línea de Tiempo',
        all: 'Todos',
        positive: 'Positivo',
        neutral: 'Neutral',
        negative: 'Negativo',
        critical: 'Crítico',
        accountOpened: 'Cuenta Abierta',
        accountClosed: 'Cuenta Cerrada',
        delinquency: 'Morosidad',
        chargeOff: 'Castigo',
        inquiry: 'Consulta',
        dispute: 'Disputa',
        violation: 'Violación',
        payment: 'Pago',
        statusChange: 'Cambio de Estado',
        events: 'eventos',
        noEvents: 'No hay eventos que coincidan con los filtros actuales',
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

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <p className="text-xs text-slate-400 mb-1">{t('totalEvents')}</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-green-900/20 rounded-lg p-4 border border-green-500/30">
          <p className="text-xs text-green-300 mb-1">{t('positiveEvents')}</p>
          <p className="text-2xl font-bold text-green-400">{stats.positive}</p>
        </div>
        <div className="bg-red-900/20 rounded-lg p-4 border border-red-500/30">
          <p className="text-xs text-red-300 mb-1">{t('negativeEvents')}</p>
          <p className="text-2xl font-bold text-red-400">{stats.negative}</p>
        </div>
        <div className="bg-orange-900/20 rounded-lg p-4 border border-orange-500/30">
          <p className="text-xs text-orange-300 mb-1">{t('violations')}</p>
          <p className="text-2xl font-bold text-orange-400">{stats.violations}</p>
        </div>
        <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-500/30">
          <p className="text-xs text-blue-300 mb-1">{t('disputes')}</p>
          <p className="text-2xl font-bold text-blue-400">{stats.disputes}</p>
        </div>
        <div className="bg-yellow-900/20 rounded-lg p-4 border border-yellow-500/30">
          <p className="text-xs text-yellow-300 mb-1">{t('delinquencies')}</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.delinquencies}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-4">
        {/* Search & Export */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
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

          {/* Zoom Controls */}
          <div className="flex gap-2">
            <button
              onClick={() => setZoomLevel('MONTH')}
              className={`px-4 py-2 rounded-lg transition-all ${
                zoomLevel === 'MONTH' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {t('month')}
            </button>
            <button
              onClick={() => setZoomLevel('QUARTER')}
              className={`px-4 py-2 rounded-lg transition-all ${
                zoomLevel === 'QUARTER' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {t('quarter')}
            </button>
            <button
              onClick={() => setZoomLevel('YEAR')}
              className={`px-4 py-2 rounded-lg transition-all ${
                zoomLevel === 'YEAR' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {t('year')}
            </button>
          </div>

          <button
            onClick={exportTimeline}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {t('export')}
          </button>
        </div>

        {/* Event Type Filters */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-2">{t('eventTypes')}</h3>
          <div className="flex flex-wrap gap-2">
            {eventTypes.map(type => (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`px-3 py-1 rounded-lg text-xs transition-all ${
                  selectedTypes.has(type)
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {t(type.toLowerCase().replace('_', ''))}
              </button>
            ))}
          </div>
        </div>

        {/* Severity Filters */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-2">{t('severity')}</h3>
          <div className="flex flex-wrap gap-2">
            {severityLevels.map(sev => (
              <button
                key={sev}
                onClick={() => toggleSeverity(sev)}
                className={`px-3 py-1 rounded-lg text-xs transition-all ${
                  selectedSeverity.has(sev)
                    ? sev === 'POSITIVE' ? 'bg-green-600 text-white' :
                      sev === 'NEGATIVE' ? 'bg-orange-600 text-white' :
                      sev === 'CRITICAL' ? 'bg-red-600 text-white' :
                      'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {t(sev.toLowerCase())}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {groupedEvents.length === 0 ? (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-12 text-center">
            <Calendar className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">{t('noEvents')}</p>
          </div>
        ) : (
          groupedEvents.map((group, groupIdx) => (
            <div key={group.period} className="relative">
              {/* Period Header */}
              <div className="flex items-center gap-4 mb-4 sticky top-0 z-10 bg-slate-900/95 py-2">
                <div className="bg-blue-600 rounded-lg px-4 py-2 min-w-[120px] text-center">
                  <p className="text-white font-bold text-lg">{group.period}</p>
                  <p className="text-blue-200 text-xs">{group.count} {t('events')}</p>
                </div>
                <div className="flex-1 h-px bg-slate-700" />
                <div className="flex gap-2">
                  <span className="text-xs text-green-400">+{group.positive}</span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs text-red-400">-{group.negative}</span>
                </div>
              </div>

              {/* Events in Period */}
              <div className="space-y-3 pl-8 border-l-2 border-slate-700 relative">
                {group.events.map((event, eventIdx) => {
                  const Icon = getEventIcon(event.type);
                  const color = getEventColor(event.severity);
                  
                  return (
                    <button
                      key={event.id}
                      onClick={() => {
                        setSelectedEvent(event);
                        onEventClick?.(event);
                      }}
                      className={`w-full text-left relative bg-${color}-900/10 border border-${color}-500/30 rounded-lg p-4 hover:bg-${color}-900/20 transition-all group`}
                    >
                      {/* Timeline Dot */}
                      <div className={`absolute -left-[41px] top-6 w-6 h-6 rounded-full bg-${color}-600 border-4 border-slate-900 flex items-center justify-center`}>
                        <Icon className={`h-3 w-3 text-white`} />
                      </div>

                      {/* Event Content */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`text-base font-semibold text-${color}-300`}>
                              {event.title}
                            </h3>
                            {event.bureau && event.bureau !== 'ALL' && (
                              <span className={`text-xs px-2 py-0.5 rounded bg-${color}-900/30 text-${color}-400`}>
                                {event.bureau}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-400 mb-2">{event.description}</p>
                          {event.accountName && (
                            <p className="text-xs text-slate-500">
                              <CreditCard className="inline h-3 w-3 mr-1" />
                              {event.accountName}
                            </p>
                          )}
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-slate-500 mb-1">
                            <Clock className="inline h-3 w-3 mr-1" />
                            {formatDate(event.date)}
                          </p>
                          {event.amount != null && (
                            <p className={`text-sm font-semibold text-${color}-400`}>
                              ${event.amount.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Event Detail Modal (if selected) */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div 
            className="bg-slate-800 rounded-xl border-2 border-blue-500/50 max-w-2xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">{selectedEvent.title}</h2>
                <p className="text-sm text-slate-400">{formatDate(selectedEvent.date)}</p>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-300 mb-2">{selectedEvent.description}</p>
              </div>

              {selectedEvent.accountName && (
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Account</p>
                  <p className="text-sm text-white">{selectedEvent.accountName}</p>
                </div>
              )}

              {selectedEvent.bureau && (
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Bureau</p>
                  <p className="text-sm text-white">{selectedEvent.bureau}</p>
                </div>
              )}

              {selectedEvent.amount != null && (
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Amount</p>
                  <p className="text-lg font-bold text-white">${selectedEvent.amount.toLocaleString()}</p>
                </div>
              )}

              {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-2">Additional Details</p>
                  <pre className="text-xs text-slate-300 overflow-auto">
                    {JSON.stringify(selectedEvent.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelineView;
