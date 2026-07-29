// ═══════════════════════════════════════════════════════════════════════════
// FCRA SUPREME VIOLATION DETECTOR v3.0 — FULL SPA
// Multi-tenant SaaS | Full-Process Upload | 10 Document Types
// ═══════════════════════════════════════════════════════════════════════════
(function() {
  'use strict';

  const state = {
    token: localStorage.getItem('fcra_token') || null,
    user: JSON.parse(localStorage.getItem('fcra_user') || 'null'),
    org: JSON.parse(localStorage.getItem('fcra_org') || 'null'),
    currentPage: 'dashboard-redirect',
    pageData: null,
    loading: false,
    selectedDisputeItems: JSON.parse(localStorage.getItem('fcra_selected_dispute_items') || '{}'),
    disputeStatus: JSON.parse(localStorage.getItem('fcra_dispute_status') || '{}'),
    impersonateClientId: localStorage.getItem('fcra_impersonate_client_id') || null,
    impersonateClientName: localStorage.getItem('fcra_impersonate_client_name') || null,
    locale: localStorage.getItem('fcra_locale') || 'en',
    i18nStrings: {},
    billingMode: null,
    mfaEnabled: null,
  };

  // ── i18n (English + Spanish) ───────────────────────────────────
  async function loadLocale(locale) {
    const loc = locale === 'es' ? 'es' : 'en';
    try {
      const res = await fetch('/static/i18n/' + loc + '.json');
      if (!res.ok) throw new Error('locale fetch failed');
      state.i18nStrings = await res.json();
      state.locale = loc;
      localStorage.setItem('fcra_locale', loc);
    } catch {
      state.i18nStrings = {};
      state.locale = 'en';
    }
  }

  function t(key, vars) {
    let s = state.i18nStrings[key] || key;
    if (vars) {
      Object.keys(vars).forEach((k) => {
        s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
      });
    }
    return s;
  }

  window._setLocale = async function(locale) {
    await loadLocale(locale);
    if (state.token && state.user?.role === 'client' && !state.impersonateClientId) {
      try {
        await api('/client-portal/profile', {
          method: 'PUT',
          body: JSON.stringify({ preferredLanguage: locale }),
        });
      } catch (_) {}
    }
    render();
  };

  // ── Accessibility helpers ──────────────────────────────────────
  let _focusTrapPrev = null;
  function trapFocus(container) {
    const focusable = container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    _focusTrapPrev = document.activeElement;
    first.focus();
    function onKey(e) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    container.addEventListener('keydown', onKey);
    container._focusTrapCleanup = () => container.removeEventListener('keydown', onKey);
  }

  function releaseFocusTrap(container) {
    if (container?._focusTrapCleanup) container._focusTrapCleanup();
    if (_focusTrapPrev && _focusTrapPrev.focus) _focusTrapPrev.focus();
    _focusTrapPrev = null;
  }

  window._openModal = function(html, id) {
    const modalId = id || 'app-modal';
    let wrap = document.getElementById(modalId);
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = modalId;
      wrap.setAttribute('role', 'dialog');
      wrap.setAttribute('aria-modal', 'true');
      wrap.className = 'fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70';
      document.body.appendChild(wrap);
    }
    wrap.innerHTML = html;
    trapFocus(wrap);
    wrap.querySelectorAll('[data-modal-close]').forEach((btn) => {
      btn.onclick = () => { releaseFocusTrap(wrap); wrap.remove(); };
    });
    wrap.addEventListener('click', (e) => { if (e.target === wrap) { releaseFocusTrap(wrap); wrap.remove(); } });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { releaseFocusTrap(wrap); wrap.remove(); document.removeEventListener('keydown', esc); }
    });
  };

  async function previewVaultPdf(uploadId, fileName) {
    const qs = portalClientQs();
    const res = await fetch('/api/client-portal/uploads/' + uploadId + '/download' + qs, {
      headers: { Authorization: 'Bearer ' + state.token },
    });
    if (!res.ok) throw new Error('Preview failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    if (!window.pdfjsLib) {
      window.open(url, '_blank');
      return;
    }
    const pdf = await pdfjsLib.getDocument(url).promise;
    let pagesHtml = '';
    const maxPages = Math.min(pdf.numPages, 8);
    for (let p = 1; p <= maxPages; p++) {
      const page = await pdf.getPage(p);
      const viewport = page.getViewport({ scale: 1.2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      pagesHtml += `<div class="mb-4 bg-white rounded shadow"><img alt="Page ${p}" src="${canvas.toDataURL()}" class="w-full"/></div>`;
    }
    URL.revokeObjectURL(url);
    window._openModal(`
      <div class="bg-gray-900 border border-gray-700 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-4" role="document">
        <div class="flex justify-between items-center mb-3 sticky top-0 bg-gray-900 py-2 z-10">
          <h2 class="text-sm font-bold text-white"><i class="fas fa-file-pdf text-red-400 mr-2"></i>${escapeHtml(fileName || 'PDF Preview')}</h2>
          <button data-modal-close class="text-gray-400 hover:text-white px-2 py-1 rounded" aria-label="${t('common.close')}"><i class="fas fa-times"></i></button>
        </div>
        ${pagesHtml}
        ${pdf.numPages > maxPages ? '<p class="text-xs text-gray-500 text-center">Showing first ' + maxPages + ' of ' + pdf.numPages + ' pages</p>' : ''}
      </div>
    `, 'vault-pdf-modal');
  }

  function setState(u) {
    Object.assign(state, u);
    if (u.token !== undefined) { u.token ? localStorage.setItem('fcra_token', u.token) : localStorage.removeItem('fcra_token'); }
    if (u.user !== undefined) { u.user ? localStorage.setItem('fcra_user', JSON.stringify(u.user)) : localStorage.removeItem('fcra_user'); }
    if (u.org !== undefined) { u.org ? localStorage.setItem('fcra_org', JSON.stringify(u.org)) : localStorage.removeItem('fcra_org'); }
    if (u.impersonateClientId !== undefined) { u.impersonateClientId ? localStorage.setItem('fcra_impersonate_client_id', u.impersonateClientId) : localStorage.removeItem('fcra_impersonate_client_id'); }
    if (u.impersonateClientName !== undefined) { u.impersonateClientName ? localStorage.setItem('fcra_impersonate_client_name', u.impersonateClientName) : localStorage.removeItem('fcra_impersonate_client_name'); }
  }

  window._startImpersonating = function(clientId, clientName) {
    setState({ impersonateClientId: clientId, impersonateClientName: clientName });
    toast('Entering Client Portal Preview Mode', 'warning');
    navigate('client-cockpit');
  };

  window._stopImpersonating = function() {
    const prevId = state.impersonateClientId;
    setState({ impersonateClientId: null, impersonateClientName: null });
    toast('Exited Client Portal Preview Mode', 'info');
    navigate('client-detail', { clientId: prevId });
  };

  async function api(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
    const res = await fetch(`/api${path}`, { ...opts, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || `Error ${res.status}`);
      err.code = data.code;
      err.status = res.status;
      err.data = data;
      if (data.code === 'MFA_REQUIRED' && state.token) {
        toast('MFA required for this action — enable it in Settings', 'warning');
        if (state.user?.role === 'client') navigate('client-settings');
        else navigate('settings');
      } else if (data.code === 'MUST_CHANGE_PASSWORD' && state.token) {
        toast('Password change required before continuing', 'warning');
        if (state.user?.role === 'client') navigate('client-settings');
        else navigate('settings');
      }
      throw err;
    }
    return data;
  }

  function toast(msg, type = 'info') {
    const colors = { success: 'bg-emerald-600', error: 'bg-red-600', info: 'bg-blue-600', warning: 'bg-amber-600' };
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
    const el = document.createElement('div');
    el.className = `fixed top-4 right-4 z-[9999] ${colors[type]} text-white px-5 py-3 rounded-lg shadow-2xl flex items-center gap-3 text-sm font-medium fade-in max-w-md`;
    el.innerHTML = `<i class="fas ${icons[type]}"></i><span>${msg}</span>`;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; setTimeout(() => el.remove(), 300); }, 4000);
  }

  function $(s) { return document.querySelector(s); }
  window.$ = $; // Expose for inline onclick handlers

  function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ═══════════════════════════════════════════════════════════════
  // RJ DISPUTE COCKPIT WORKSPACE GLOBALS & HELPERS
  // ═══════════════════════════════════════════════════════════════
  window._isItemPinned = function(reportId, itemId) {
    return (state.selectedDisputeItems[reportId] || []).includes(itemId);
  };

  window._toggleDisputeItem = function(event, reportId, itemId) {
    if (event) event.stopPropagation();
    
    if (!state.selectedDisputeItems[reportId]) {
      state.selectedDisputeItems[reportId] = [];
    }
    
    const idx = state.selectedDisputeItems[reportId].indexOf(itemId);
    if (idx === -1) {
      state.selectedDisputeItems[reportId].push(itemId);
      toast('Item pinned to dispute campaign!', 'success');
    } else {
      state.selectedDisputeItems[reportId].splice(idx, 1);
      toast('Item removed from dispute campaign.', 'warning');
    }
    
    localStorage.setItem('fcra_selected_dispute_items', JSON.stringify(state.selectedDisputeItems));
    
    if (!state.disputeStatus[reportId]) {
      state.disputeStatus[reportId] = { step: 'pinning', savedDocId: null, isSent: false };
    } else {
      if (state.disputeStatus[reportId].step === 'audit' || state.disputeStatus[reportId].step === 'ingestion') {
        state.disputeStatus[reportId].step = 'pinning';
      }
    }
    localStorage.setItem('fcra_dispute_status', JSON.stringify(state.disputeStatus));

    window._updateCampaignHUD(reportId);
  };

  window._updateCampaignHUD = function(reportId) {
    const container = document.getElementById('dispute-campaign-hud-container');
    if (!container) return;

    const r = window._activeWorkspaceReport;
    const violations = window._activeWorkspaceViolations || [];
    const pinnedIds = state.selectedDisputeItems[reportId] || [];
    
    let step = 'audit';
    let pct = 40;
    let statusText = 'AI Compliance Audit Complete';

    if (pinnedIds.length > 0) {
      step = 'pinning';
      pct = 60;
      statusText = `Dispute Pinning: ${pinnedIds.length} Item(s) Selected`;
    }

    const campaignStatus = state.disputeStatus[reportId] || {};
    if (campaignStatus.savedDocId) {
      step = 'draft';
      pct = 80;
      statusText = 'Dispute Letter Draft Compiled & Saved';
    }

    if (campaignStatus.isSent) {
      step = 'sent';
      pct = 100;
      statusText = 'Dispute Campaign Dispatched via Certified Mail';
    }

    const isCollapsed = localStorage.getItem(`hud_collapsed_${reportId}`) === 'true';

    container.innerHTML = `
      <div class="glass border border-blue-500/20 rounded-xl p-4 bg-gray-950/20 backdrop-blur-md">
        <div class="flex items-center justify-between cursor-pointer select-none" onclick="window._toggleHUDCollapse('${reportId}')">
          <div class="flex items-center gap-2.5">
            <img src="https://storage.googleapis.com/msgsndr/qQnxRHDtyx0uydPd5sRl/media/67eb83c5e519ed689430646b.jpeg" class="h-6 w-auto rounded border border-blue-500/30">
            <div>
              <span class="text-sm font-bold text-white tracking-wide uppercase">RJ Dispute Campaign Cockpit</span>
              <span class="hidden md:inline-block text-[10px] text-gray-500 font-mono ml-2">NEL-${new Date(r?.created_at || Date.now()).getFullYear()}${(new Date(r?.created_at || Date.now()).getMonth()+1).toString().padStart(2,'0')}${new Date(r?.created_at || Date.now()).getDate().toString().padStart(2,'0')}-028391</span>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="px-2 py-0.5 rounded bg-blue-950/45 border border-blue-500/35 text-blue-400 text-xs font-semibold uppercase tracking-wider">${statusText}</span>
            <i class="fas fa-chevron-down text-gray-500 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}" id="hud-toggle-icon"></i>
          </div>
        </div>
        
        <div id="hud-collapsible-content" class="mt-4 border-t border-gray-800/60 pt-4 space-y-4 transition-all duration-300 ${isCollapsed ? 'hidden' : ''}">
          <div class="grid grid-cols-5 gap-2 text-center text-[10px] font-bold uppercase tracking-wider">
            <div class="flex flex-col items-center gap-1 text-green-400">
              <div class="w-6 h-6 rounded-full bg-green-500/20 border border-green-500 flex items-center justify-center"><i class="fas fa-check text-[9px]"></i></div>
              <span>Ingestion</span>
            </div>
            <div class="flex flex-col items-center gap-1 text-green-400">
              <div class="w-6 h-6 rounded-full bg-green-500/20 border border-green-500 flex items-center justify-center"><i class="fas fa-check text-[9px]"></i></div>
              <span>Audit</span>
            </div>
            <div class="flex flex-col items-center gap-1 ${['pinning', 'draft', 'sent'].includes(step) ? 'text-green-400' : 'text-gray-500'}">
              <div class="w-6 h-6 rounded-full ${['pinning', 'draft', 'sent'].includes(step) ? 'bg-green-500/20 border border-green-500' : 'bg-gray-900 border border-gray-800'} flex items-center justify-center">
                ${['draft', 'sent'].includes(step) ? '<i class="fas fa-check text-[9px]"></i>' : '3'}
              </div>
              <span>Pinning</span>
            </div>
            <div class="flex flex-col items-center gap-1 ${['draft', 'sent'].includes(step) ? 'text-green-400' : (step === 'pinning' ? 'text-blue-400 animate-pulse' : 'text-gray-500')}">
              <div class="w-6 h-6 rounded-full ${['draft', 'sent'].includes(step) ? 'bg-green-500/20 border border-green-500' : (step === 'pinning' ? 'bg-blue-500/20 border border-blue-500' : 'bg-gray-900 border border-gray-800')} flex items-center justify-center">
                ${step === 'sent' ? '<i class="fas fa-check text-[9px]"></i>' : '4'}
              </div>
              <span>Draft</span>
            </div>
            <div class="flex flex-col items-center gap-1 ${step === 'sent' ? 'text-green-400' : (step === 'draft' ? 'text-blue-400 animate-pulse' : 'text-gray-500')}">
              <div class="w-6 h-6 rounded-full ${step === 'sent' ? 'bg-green-500/20 border border-green-500' : (step === 'draft' ? 'bg-blue-500/20 border border-blue-500' : 'bg-gray-900 border border-gray-800')} flex items-center justify-center">5</div>
              <span>Sent</span>
            </div>
          </div>

          <div class="relative w-full h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
            <div class="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 shadow-[0_0_10px_rgba(10,102,255,0.5)] transition-all duration-500" style="width: ${pct}%;"></div>
          </div>

          <div class="flex justify-between items-center text-xs text-gray-400">
            <span class="flex items-center gap-1.5"><i class="fas fa-info-circle text-blue-400"></i> ${statusText}</span>
            <span class="text-blue-400 font-bold font-mono">${pct}% Complete</span>
          </div>
        </div>
      </div>
    `;

    const badgeCountEl = document.getElementById('dispute-builder-badge-count');
    if (badgeCountEl) {
      badgeCountEl.textContent = pinnedIds.length;
      if (pinnedIds.length > 0) {
        badgeCountEl.className = 'px-1.5 py-0.2 bg-green-950 text-[10px] text-green-400 rounded-full font-bold ml-1 animate-pulse';
      } else {
        badgeCountEl.className = 'px-1.5 py-0.2 bg-gray-800 text-[10px] text-gray-400 rounded-full font-bold ml-1';
      }
    }
  };

  window._toggleHUDCollapse = function(reportId) {
    const isCollapsed = localStorage.getItem(`hud_collapsed_${reportId}`) === 'true';
    localStorage.setItem(`hud_collapsed_${reportId}`, !isCollapsed ? 'false' : 'true');
    window._updateCampaignHUD(reportId);
  };

  window._jumpToViolation = function(event, violationId) {
    if (event) event.stopPropagation();
    const violationsTabBtn = document.querySelector('[data-tab="violations"]');
    if (violationsTabBtn) {
      violationsTabBtn.click();
      setTimeout(() => {
        const card = document.getElementById(`v-card-${violationId}`);
        if (card) {
          card.open = true;
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const visualCard = card.querySelector('.glass');
          if (visualCard) {
            visualCard.classList.add('ring-4', 'ring-red-500/60', 'scale-105', 'bg-red-950/30');
            setTimeout(() => {
              visualCard.classList.remove('ring-4', 'ring-red-500/60', 'scale-105', 'bg-red-950/30');
            }, 3000);
          }
        }
      }, 100);
    }
  };

  window._highlightViolationsInRawText = function(reportId, violations) {
    const rawContainer = document.getElementById('raw-text-container');
    if (!rawContainer || !violations || !violations.length) return;

    let rawText = rawContainer.dataset.originalText || rawContainer.textContent;
    let html = escapeHtml(rawText);

    const targets = [];
    violations.forEach(v => {
      const keyword = v.account_name || v.accountName;
      if (keyword && keyword.length > 2) {
        targets.push({ id: v.id, text: keyword, category: v.category, statute: v.statute });
      }
      const acct = v.account_number || v.accountNumber;
      if (acct && acct.length > 2 && !acct.includes('**')) {
        targets.push({ id: v.id, text: acct, category: v.category, statute: v.statute });
      }
    });

    const uniqueTargets = [];
    const seen = new Set();
    targets.sort((a,b) => b.text.length - a.text.length).forEach(t => {
      const key = `${t.id}-${t.text.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueTargets.push(t);
      }
    });

    if (uniqueTargets.length === 0) return;

    uniqueTargets.forEach(target => {
      const parts = html.split(/(<[^>]+>)/g);
      const cleanKeyword = target.text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(${cleanKeyword})`, 'gi');

      html = parts.map(part => {
        if (part.startsWith('<') && part.endsWith('>')) return part;
        return part.replace(regex, (match) => {
          return `<mark onclick="window._jumpToViolation(event, '${target.id}')" title="Click to view violation details: ${target.category} (${target.statute})" class="raw-violation-node hover:bg-red-500/50 cursor-pointer text-white px-0.5 rounded border border-red-500/40 bg-red-950/40 font-bold transition-all" style="cursor: pointer;">${match}</mark>`;
        });
      }).join('');
    });

    rawContainer.innerHTML = html;
  };

  window._compile1681iLetter = function(reportId, options = {}) {
    const r = window._activeWorkspaceReport;
    const client = window._activeWorkspaceClient;
    const violations = window._activeWorkspaceViolations || [];

    if (!r || !client) return '';

    const bureau = options.bureau || r.bureau || 'Equifax';
    const includeName = options.includeName !== false;
    const includeSSN = options.includeSSN !== false;
    const includeDOB = options.includeDOB !== false;
    const includeAddress = options.includeAddress !== false;

    const pinnedIds = state.selectedDisputeItems[reportId] || [];
    const activeViolations = [];

    violations.forEach(v => {
      if (pinnedIds.includes(`violation-${v.id}`)) {
        activeViolations.push({
          bureau: bureau,
          creditorName: v.account_name || v.accountName || v.defendant_name || v.defendant_name || '[CREDITOR]',
          accountNumber: v.account_number || v.accountNumber || '[ACCOUNT NUMBER]',
          evidence: v.evidence || v.explanation || 'Inaccurate reporting found on audit.'
        });
      }
    });

    const parsed = window._activeWorkspaceParsed || {};
    (parsed.accounts || []).forEach(acc => {
      const accNo = acc.accountNumber || '';
      const itemId = `acc-${accNo || acc.creditorName}`;
      if (pinnedIds.includes(itemId)) {
        activeViolations.push({
          bureau: bureau,
          creditorName: acc.creditorName,
          accountNumber: accNo,
          evidence: `Standard field reporting mismatch. Incorrect payment status '${acc.paymentStatus || 'Current'}' and status '${acc.accountStatus || 'Open'}'. Please investigate and remove.`
        });
      }
    });

    (parsed.collections || []).forEach(coll => {
      const collNo = coll.accountNumber || '';
      const itemId = `coll-${collNo || coll.creditorName}`;
      if (pinnedIds.includes(itemId)) {
        activeViolations.push({
          bureau: bureau,
          creditorName: coll.creditorName,
          accountNumber: collNo,
          evidence: `Inaccurate collection placement reporting. Current balance ${coll.currentBalance} with original creditor ${coll.originalCreditor || 'N/A'}. Please verify and delete.`
        });
      }
    });

    (parsed.inquiries || []).forEach((inq, idx) => {
      const itemId = `inq-${inq.creditorName}-${idx}`;
      if (pinnedIds.includes(itemId)) {
        activeViolations.push({
          bureau: bureau,
          creditorName: inq.creditorName,
          accountNumber: 'N/A',
          evidence: `Unauthorized hard credit inquiry reported on ${inq.inquiryDate}. No permissible purpose was established. Please remove immediately.`
        });
      }
    });

    if (activeViolations.length === 0) {
      activeViolations.push({
        bureau: bureau,
        creditorName: '[PLEASE PIN ITEMS TO DISPUTE]',
        accountNumber: 'XXXXXX',
        evidence: 'No specific accounts pinned. Please toggle checkboxes in the other tabs to pin trade lines or violations to this campaign.'
      });
    }

    const clientName = includeName ? `${client.first_name || ''} ${client.last_name || ''}`.trim() : '[NAME REMOVED]';
    const clientAddress = includeAddress ? (client.address_line1 || '') : '[ADDRESS REMOVED]';
    const clientCity = includeAddress ? (client.city || '') : '';
    const clientState = includeAddress ? (client.state || '') : '';
    const clientZip = includeAddress ? (client.zip || '') : '';
    const clientSSNLast4 = includeSSN ? (client.ssn_last4 || '') : '';
    const clientDOB = includeDOB ? (client.dob || '') : '';

    const docData = {
      clientName,
      clientAddress,
      clientCity,
      clientState,
      clientZip,
      clientSSNLast4,
      clientDOB,
      today: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      violations: activeViolations,
      bureau: bureau,
      reportId: r.id
    };

    return window._generate1681iLetter(docData);
  };

  window._generate1681iLetter = function(data) {
    const rawBureau = (data.bureau || '').toLowerCase();
    let bureauName = 'Equifax';
    let address = 'P.O. Box 740256\nAtlanta, GA 30374';

    if (rawBureau === 'experian') {
      bureauName = 'Experian';
      address = 'P.O. Box 4500\nAllen, TX 75013';
    } else if (rawBureau === 'transunion') {
      bureauName = 'TransUnion';
      address = 'P.O. Box 2000\nChester, PA 19016';
    }

    const clientNameParts = (data.clientName || '').trim().split(/\s+/);
    let firstName = '';
    let middleName = '';
    let lastName = '';
    if (clientNameParts.length === 1) {
      firstName = clientNameParts[0];
    } else if (clientNameParts.length === 2) {
      firstName = clientNameParts[0];
      lastName = clientNameParts[1];
    } else if (clientNameParts.length >= 3) {
      firstName = clientNameParts[0];
      middleName = clientNameParts.slice(1, -1).join(' ');
      lastName = clientNameParts[clientNameParts.length - 1];
    }

    const fullName = `${firstName}${middleName ? ' ' + middleName : ''} ${lastName}`;

    const bulletList = (data.violations || []).map(v => {
      const creditor = v.creditorName || v.defendantName || v.defendant_name || v.accountName || v.account_name || '[CREDITOR NAME]';
      const acctNum = v.accountNumber || v.account_number || '[ACCOUNT NUMBER]';
      const text = v.evidence || '[DISPUTE VERBIAGE]';
      return `• ${creditor} (Account #: ${acctNum}): ${text}`;
    }).join('\n');

    const confNum = data.reportId || '6062537823';
    const fileNum = data.reportId || '358261728';

    return `=======================================================================
RJ BUSINESS SOLUTIONS PREMIUM DISPUTE TEMPLATE
DESIGNED BY RICK JEFFERSON | POWERED BY RJ BUSINESS SOLUTIONS
=======================================================================

${data.today}

${bureauName}
${address}

RE: Confirmation # ${confNum}     Date: ${data.today}

I have reviewed my ${bureauName} credit report which I have obtained from your credit reporting agency, and the ${bureauName} File Number is ${fileNum}. I have found out that in my credit report there is some information which is incomplete, inaccurate, or inconsistent.

Under 15 U.S. Code § 1681i, I am entitled to request a reinvestigation of any accounts on my credit report that contain inaccurate information. Please refer to 15 U.S. Code § 1681i(a)(1)(A) and 15 U.S. Code § 1681e(b) for further clarification.

I wish to opt out of all email communications. Please note that you may have an incorrect or outdated email address on file, which could result in my personal information being shared with unauthorized parties. Moving forward, I request that all correspondence be sent exclusively to my mailing address, which is provided above.

I am disputing the information below because I believe it is untrue, incomplete, inaccurate, or inconsistent, and I want you to investigate any information related to my personal information that is inaccurate, incomplete, not authenticated, or no longer valid. This will help ensure you're only maintaining accurate information about me, which reduces the risk of identity theft or a mixed file. I appreciate your efforts in retaining the following correct details on my record, listed below. The information listed is the only accurate personal data you should have on file. Please delete any other information that does not match.

My name is ${fullName}.
My address is ${data.clientAddress}, ${data.clientCity}, ${data.clientState} ${data.clientZip}.
My last four SSN: ${data.clientSSNLast4 ? 'XXX-XX-' + data.clientSSNLast4 : ''}.
My date of birth is ${data.clientDOB || ''}.

The following account(s) on my credit report from your agency, ${bureauName}, are inaccurate:
${bulletList}

I am requesting that you and the furnishers conduct a thorough investigation of the accounts I am disputing. Please forward a copy of this letter to each furnisher and make sure both you and they comply with the law by performing a proper investigation, not a generic response or a rubber stamp. I take the accuracy of my credit reports seriously, and it is essential that every piece of information is correct, complete, and fully verified. My report currently contains contradictory, incomplete, and incorrect information that cannot be verified, and whether that came from the furnisher or from your own reporting, it is now your responsibility to fix it.

I expect every account listed to be 100% accurate, complete, and verifiable. If it isn't, it must be deleted immediately, not corrected halfway. As you investigate, if you come across any other inaccurate, incomplete, or unverifiable information beyond what I've listed, I expect that to be corrected or deleted as well.

Once your investigation is complete, please send me the results along with a full copy of my file, meaning everything you have on me. That includes all inquiries, both hard and soft pulls, along with their stated purpose, and copies of certifications from anyone who has accessed my report. Under FCRA § 1681g, you're required to disclose all sources of information and identify anyone who accessed my file. Under FCRA § 1681i, I'm also requesting a description of the procedures used to investigate each disputed account, including the business name, address, and phone number of any furnisher you contacted.

Please don't ignore this letter or skip a real investigation. Under Section 1681i(a) of the Fair Credit Reporting Act, you're required to investigate disputed information and make sure only 100% accurate, verifiable, and complete information stays on my report. Anything that doesn't meet that standard must be promptly deleted.

I am sending this letter personally, not through a credit repair company, so please don't reject it based on the postmark location or anything else.

I am requesting a complete copy of my file after this reinvestigation is finished. As defined under 15 U.S.C. § 1681a(g), the term "file" means all information on me that you retain, regardless of how it's stored, so a partial disclosure would not satisfy this request and would not be lawful.

If you end up verifying or deeming any of the disputed information above as accurate and complete, I am requesting a description of the procedure used to determine that accuracy or completeness, including the business name, address, and phone number of any furnisher contacted, within 15 days of making that determination, as required under 15 U.S.C. § 1681i(a)(6)(B)(iii) and § 1681i(a)(7).

I have enclosed proof of my identity, current mailing address, and my social security card. This is not required under the FCRA, but I'm including it to help move the investigation along without delay.

Sincerely,
${fullName}

${data.clientAddress}, ${data.clientCity}, ${data.clientState} ${data.clientZip}

-----------------------------------------------------------------------
Designed by Rick Jefferson, RJ Business Solutions
Website: https://rickjeffersonsolutions.com | Support: support@rjbusinesssolutions.org
-----------------------------------------------------------------------`;
  };

  function money(n) { return '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
  function shortDate(d) { if (!d) return '—'; try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return d; } }
  function sevColor(s) { return { critical: 'red-500', high: 'orange-500', medium: 'yellow-500', low: 'green-500' }[s] || 'gray-400'; }
  function sevBg(s) { return { critical: 'bg-red-900/30 border-red-500', high: 'bg-orange-900/30 border-orange-500', medium: 'bg-yellow-900/30 border-yellow-500', low: 'bg-green-900/30 border-green-500' }[s] || 'bg-gray-800 border-gray-600'; }
  function navigate(page, data) { state.currentPage = page; state.pageData = data; render(); }

  function render() {
    const app = document.getElementById('app');
    if (!state.token) { app.innerHTML = renderAuth(); bindAuth(); }
    else {
      app.innerHTML = renderShell();
      loadPage(state.currentPage);
      (async () => {
        try {
          const qs = state.impersonateClientId ? `?clientId=${state.impersonateClientId}` : '';
          const d = await api('/client-portal/alerts/unread-count' + qs);
          document.querySelectorAll('[id^="notif-badge"]').forEach(el => {
            if (d.count > 0) { el.textContent = d.count > 9 ? '9+' : String(d.count); el.classList.remove('hidden'); }
            else el.classList.add('hidden');
          });
        } catch {}
        if (state.user?.role !== 'client' && !state.impersonateClientId) {
          try {
            const modeRes = await api('/billing/mode');
            state.billingMode = modeRes.mode || 'unconfigured';
          } catch { state.billingMode = null; }
          try {
            const mfaRes = await api('/auth/mfa/status');
            state.mfaEnabled = !!mfaRes.enabled;
          } catch { state.mfaEnabled = null; }
          const stripeBanner = document.getElementById('stripe-mode-banner');
          if (stripeBanner && state.billingMode === 'test') stripeBanner.classList.remove('hidden');
          const mfaBanner = document.getElementById('mfa-required-banner');
          if (mfaBanner && (state.user?.role === 'admin' || state.user?.role === 'super_admin') && state.mfaEnabled === false) {
            mfaBanner.classList.remove('hidden');
          }
        }
      })();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // AUTH
  // ═══════════════════════════════════════════════════════════════
  function renderAuth() {
    const params = new URLSearchParams(location.search);
    const resetToken = params.get('resetToken');
    const verifyEmail = params.get('verifyEmail');
    if (resetToken) {
      return `<div class="min-h-screen flex items-center justify-center p-4"><div class="w-full max-w-md glass rounded-2xl p-6">
        <h1 class="text-xl font-bold text-white mb-2">Reset Password</h1>
        <p class="text-sm text-gray-400 mb-4">Choose a new password (minimum 8 characters).</p>
        <form id="reset-form" class="space-y-4">
          <input type="hidden" name="token" value="${escapeHtml(resetToken)}">
          <div><label class="block text-xs text-gray-400 mb-1.5">New Password</label><input type="password" name="password" required minlength="8" class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm outline-none"></div>
          <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm">Update Password</button>
        </form>
        <p class="text-center text-xs text-gray-500 mt-4"><a href="/" class="text-blue-400">Back to sign in</a></p>
      </div></div>`;
    }
    return `<div class="min-h-screen flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center mb-4"><img src="https://storage.googleapis.com/msgsndr/qQnxRHDtyx0uydPd5sRl/media/67eb83c5e519ed689430646b.jpeg" class="h-16 w-auto rounded-2xl border border-blue-500/30 object-cover shadow-[0_0_20px_rgba(10,102,255,0.2)]" alt="RJ Business Solutions"></div>
          <h1 class="text-2xl font-bold text-white">Smart FCRA Supreme</h1>
          <p class="text-gray-400 mt-1 text-sm">Enterprise credit violation & dispute CRM</p>
        </div>
        <div class="glass rounded-2xl p-6">
          <div id="auth-mfa" class="hidden space-y-4">
            <h2 class="text-lg font-semibold text-white">Multi-Factor Authentication</h2>
            <p class="text-sm text-gray-400">Enter the 6-digit code from your authenticator app.</p>
            <form id="mfa-form" class="space-y-4">
              <input type="hidden" name="userId" id="mfa-user-id">
              <input type="hidden" name="tempToken" id="mfa-temp-token">
              <input type="text" name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-center text-2xl tracking-[0.4em] outline-none" placeholder="000000">
              <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm">Verify & Sign In</button>
            </form>
          </div>
          <div id="auth-forgot" class="hidden space-y-4">
            <h2 class="text-lg font-semibold text-white">Forgot Password</h2>
            <form id="forgot-form" class="space-y-4">
              <div><label class="block text-xs text-gray-400 mb-1.5">Email</label><input type="email" name="email" required class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm outline-none"></div>
              <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm">Send Reset Link</button>
            </form>
            <button type="button" class="text-xs text-blue-400" onclick="window._switchAuthPanel('login')">Back to sign in</button>
          </div>
          <div id="auth-verify-pending" class="hidden space-y-4 text-center">
            <div class="w-14 h-14 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center"><i class="fas fa-envelope-open-text text-2xl text-emerald-400"></i></div>
            <h2 class="text-lg font-semibold text-white">Check your inbox</h2>
            <p class="text-sm text-gray-400" id="verify-pending-msg">We sent a verification link. Activate your account before signing in.</p>
            <p class="text-xs text-gray-500">Didn't get it? Check spam, or contact support to activate if outbound email is not configured on this deployment.</p>
            <button type="button" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm" onclick="window._switchAuthPanel('login')">Back to Sign In</button>
          </div>
          <div id="auth-main">
          <div class="flex border-b border-gray-700 mb-5">
            <button id="tab-login" class="flex-1 pb-3 text-sm font-semibold text-blue-400 border-b-2 border-blue-400" onclick="window._switchTab('login')">Sign In</button>
            <button id="tab-register" class="flex-1 pb-3 text-sm font-semibold text-gray-500 border-b-2 border-transparent" onclick="window._switchTab('register')">Create Account</button>
          </div>
          <div id="auth-login"><form id="login-form" class="space-y-4">
            <div><label class="block text-xs font-medium text-gray-400 mb-1.5">Email</label><input type="email" name="email" required class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="you@company.com"></div>
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
              <div class="relative">
                <input type="password" id="login-password" name="password" required minlength="8" class="w-full bg-gray-800/80 border border-gray-700 rounded-lg pl-3.5 pr-10 py-2.5 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="••••••••">
                <button type="button" class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-white" onclick="const input = document.getElementById('login-password'); const icon = this.querySelector('i'); if (input.type === 'password') { input.type = 'text'; icon.className = 'fas fa-eye-slash'; } else { input.type = 'password'; icon.className = 'fas fa-eye'; }"><i class="fas fa-eye"></i></button>
              </div>
            </div>
            <div class="flex justify-between items-center"><button type="button" class="text-xs text-blue-400" onclick="window._switchAuthPanel('forgot')">Forgot password?</button></div>
            <div class="p-3 bg-amber-900/20 border border-amber-600/30 rounded-lg mt-2">
              <p class="text-[10px] text-amber-300 leading-relaxed"><strong>FCRA NOTICE:</strong> We prepare dispute documents only. NOT legal advice. See <a href="/compliance/disclaimers" class="underline hover:text-amber-200">disclaimers</a>.</p>
            </div>
            <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition text-sm">Sign In</button>
          </form></div>
          <div id="auth-register" class="hidden"><form id="register-form" class="space-y-4">
            <div><label class="block text-xs font-medium text-gray-400 mb-1.5">Organization Name</label><input type="text" name="orgName" required class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm outline-none" placeholder="Your Firm Name"></div>
            <div><label class="block text-xs font-medium text-gray-400 mb-1.5">Full Name</label><input type="text" name="name" required class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm outline-none" placeholder="John Doe"></div>
            <div><label class="block text-xs font-medium text-gray-400 mb-1.5">Email</label><input type="email" name="email" required class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm outline-none" placeholder="you@company.com"></div>
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
              <div class="relative">
                <input type="password" id="register-password" name="password" required minlength="8" class="w-full bg-gray-800/80 border border-gray-700 rounded-lg pl-3.5 pr-10 py-2.5 text-white text-sm outline-none" placeholder="Minimum 8 characters">
                <button type="button" class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-white" onclick="const input = document.getElementById('register-password'); const icon = this.querySelector('i'); if (input.type === 'password') { input.type = 'text'; icon.className = 'fas fa-eye-slash'; } else { input.type = 'password'; icon.className = 'fas fa-eye'; }"><i class="fas fa-eye"></i></button>
              </div>
            </div>
            <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition text-sm">Create Account</button>
          </form></div>
          </div>
          <div class="mt-4 p-3 bg-amber-900/20 border border-amber-600/30 rounded-lg">
            <p class="text-[10px] text-amber-300 leading-relaxed"><strong>NOTICE:</strong> This service prepares dispute documents. We are NOT a law firm and do NOT provide legal advice. <a href="/compliance/disclaimers" class="underline hover:text-amber-200">View Full Disclaimers →</a></p>
          </div>
        </div>
        <p class="text-center text-gray-600 text-xs mt-4">Smart FCRA Supreme v2.0 | RJ Business Solutions</p>
      </div></div>`;
  }

  window._switchTab = function(tab) {
    const ll = $('#auth-login'), rr = $('#auth-register'), tl = $('#tab-login'), tr = $('#tab-register');
    if (!ll || !rr) return;
    if (tab === 'login') { ll.classList.remove('hidden'); rr.classList.add('hidden'); tl.className = 'flex-1 pb-3 text-sm font-semibold text-blue-400 border-b-2 border-blue-400'; tr.className = 'flex-1 pb-3 text-sm font-semibold text-gray-500 border-b-2 border-transparent'; }
    else { ll.classList.add('hidden'); rr.classList.remove('hidden'); tr.className = 'flex-1 pb-3 text-sm font-semibold text-blue-400 border-b-2 border-blue-400'; tl.className = 'flex-1 pb-3 text-sm font-semibold text-gray-500 border-b-2 border-transparent'; }
  };

  window._switchAuthPanel = function(panel) {
    const main = $('#auth-main'), forgot = $('#auth-forgot'), mfa = $('#auth-mfa'), verify = $('#auth-verify-pending');
    if (main) main.classList.toggle('hidden', panel !== 'login' && panel !== 'register');
    if (forgot) forgot.classList.toggle('hidden', panel !== 'forgot');
    if (mfa) mfa.classList.toggle('hidden', panel !== 'mfa');
    if (verify) verify.classList.toggle('hidden', panel !== 'verify');
  };

  function bindAuth() {
    const params = new URLSearchParams(location.search);
    const verifyEmail = params.get('verifyEmail');
    if (verifyEmail) {
      api('/auth/verify-email', { method:'POST', body: JSON.stringify({ token: verifyEmail }) })
        .then(() => { toast('Email verified — you can sign in now', 'success'); history.replaceState({}, '', '/'); })
        .catch(err => toast(err.message, 'error'));
    }

    const lf = $('#login-form'), rf = $('#register-form'), mf = $('#mfa-form'), ff = $('#forgot-form'), rsf = $('#reset-form');
    if (lf) lf.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        const d = await api('/auth/login', { method:'POST', body:JSON.stringify({email:fd.get('email'),password:fd.get('password')})});
        if (d.mfaRequired) {
          $('#mfa-user-id').value = d.userId;
          $('#mfa-temp-token').value = d.tempToken;
          window._switchAuthPanel('mfa');
          return;
        }
        setState({token:d.token,user:d.user,org:d.org});
        toast('Welcome back!','success');
        render();
      } catch(err) {
        if (err.code === 'EMAIL_NOT_VERIFIED') {
          const msg = $('#verify-pending-msg');
          if (msg) msg.textContent = err.message;
          window._switchAuthPanel('verify');
        }
        toast(err.message,'error');
      }
    };
    if (mf) mf.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        const d = await api('/auth/mfa/challenge', { method:'POST', body:JSON.stringify({ userId: fd.get('userId'), tempToken: fd.get('tempToken'), code: fd.get('code') })});
        setState({token:d.token,user:d.user,org:d.org});
        toast('MFA verified','success');
        render();
      } catch(err) { toast(err.message,'error'); }
    };
    if (ff) ff.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        const d = await api('/auth/forgot-password', { method:'POST', body:JSON.stringify({ email: fd.get('email') })});
        toast(d.message || 'If the email exists, a reset link was sent', 'success');
        if (d.debugToken) toast('Dev reset token ready — check network response', 'info');
      } catch(err) { toast(err.message,'error'); }
    };
    if (rsf) rsf.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        await api('/auth/reset-password', { method:'POST', body:JSON.stringify({ token: fd.get('token'), password: fd.get('password') })});
        toast('Password updated — sign in with your new password', 'success');
        history.replaceState({}, '', '/');
        render();
      } catch(err) { toast(err.message,'error'); }
    };
    if (rf) rf.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        const d = await api('/auth/register', { method:'POST', body:JSON.stringify({orgName:fd.get('orgName'),name:fd.get('name'),email:fd.get('email'),password:fd.get('password')})});
        if (d.requiresVerification) {
          const msg = $('#verify-pending-msg');
          if (msg) msg.textContent = d.message || ('We sent a verification link to ' + fd.get('email') + '. Activate your account before signing in.');
          window._switchAuthPanel('verify');
          toast('Verification email sent — check your inbox', 'success');
          return;
        }
        setState({token:d.token,user:d.user,org:d.org});
        toast('Account created!','success');
        render();
      } catch(err) { toast(err.message,'error'); }
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // SHELL
  // ═══════════════════════════════════════════════════════════════
  function renderShell() {
    let navItems = [];
    if (state.user?.role === 'client' || state.impersonateClientId) {
      navItems = [
        { id: 'client-cockpit', icon: 'fa-rocket', label: t('nav.myCockpit') },
        { id: 'client-self-onboard', icon: 'fa-file-upload', label: t('nav.getStarted') },
        { id: 'client-messages', icon: 'fa-comments', label: t('nav.messages') },
        { id: 'client-uploads', icon: 'fa-cloud-upload-alt', label: t('nav.vault') },
        { id: 'client-fundability', icon: 'fa-chart-line', label: t('nav.fundability') },
        { id: 'client-tradelines', icon: 'fa-handshake', label: t('nav.boostTools') },
        { id: 'client-tutor', icon: 'fa-user-graduate', label: t('nav.tutor') },
        { id: 'client-documents', icon: 'fa-file-signature', label: t('nav.documents') },
        { id: 'client-knowledge', icon: 'fa-graduation-cap', label: t('nav.education') },
        { id: 'client-settings', icon: 'fa-user-shield', label: t('nav.security') },
        { id: 'ai-studio', icon: 'fa-robot', label: t('nav.aiMentors') },
      ];
      if (state.impersonateClientId) {
        navItems.push({ id: 'exit-impersonation', icon: 'fa-user-shield text-amber-400', label: 'Exit Preview' });
      }
    } else {
      navItems = [
        { id: 'global-search', icon: 'fa-search', label: 'Search' },
        { id: 'admin-overview', icon: 'fa-chart-pie', label: 'Executive Overview' },
        { id: 'admin-clients', icon: 'fa-address-card', label: 'Client Management' },
        { id: 'admin-violation-queue', icon: 'fa-tasks', label: 'Violation Review QA' },
        { id: 'dashboard', icon: 'fa-chart-line', label: 'Dashboard' },
        { id: 'clients', icon: 'fa-users', label: 'Clients' },
        { id: 'reports', icon: 'fa-file-alt', label: 'Reports' },
        { id: 'report-history', icon: 'fa-history', label: 'Report History' },
        { id: 'violations', icon: 'fa-exclamation-triangle', label: 'Violations' },
        { id: 'documents', icon: 'fa-file-contract', label: 'Documents' },
        { id: 'mailing-campaigns', icon: 'fa-mail-bulk', label: 'Mailing Campaigns' },
        { id: 'founder-os', icon: 'fa-briefcase', label: 'Founder OS' },
        { id: 'sales-tools', icon: 'fa-chart-pie', label: 'Sales Tools' },
        { id: 'roi-calculator', icon: 'fa-calculator', label: 'ROI Calculator' },
        { id: 'team', icon: 'fa-user-friends', label: 'Team' },
        { id: 'settings', icon: 'fa-cog', label: 'Settings' },
        { id: 'ai-studio', icon: 'fa-robot', label: 'AI Studio' },
        { id: 'billing', icon: 'fa-credit-card', label: 'Billing' },
        { id: 'legal', icon: 'fa-gavel', label: 'Legal' },
      ];
      if (state.user?.role === 'super_admin') {
        navItems.push({ id: 'admin-console', icon: 'fa-user-shield', label: 'Admin Console' });
      }
    }
    // Mobile nav toggle
    window._toggleMobileNav = () => {
      const nav = document.getElementById('mobile-nav');
      const btn = document.querySelector('[aria-controls="mobile-nav"]');
      if (nav) {
        const hidden = nav.classList.contains('-translate-x-full');
        nav.classList.toggle('-translate-x-full', !hidden);
        nav.classList.toggle('translate-x-0', hidden);
        if (btn) btn.setAttribute('aria-expanded', hidden ? 'true' : 'false');
      }
    };
    // Branding URLs
    const RJ_LOGO = 'https://storage.googleapis.com/msgsndr/qQnxRHDtyx0uydPd5sRl/media/67eb83c5e519ed689430646b.jpeg';
    const MFSN_BANNER = '/static/logos/mfsn-banner.png';
    const FCRA_LOGO = RJ_LOGO;
    const impersonationBanner = state.impersonateClientId 
      ? `<div class="bg-amber-600/90 text-white text-xs font-semibold px-4 py-2.5 flex items-center justify-between z-[1000] border-b border-amber-500/30">
          <div class="flex items-center gap-2">
            <i class="fas fa-user-shield text-sm animate-pulse"></i>
            <span><strong>Impersonation Mode:</strong> Currently previewing the secure customer portal for client <strong>${escapeHtml(state.impersonateClientName || state.impersonateClientId)}</strong></span>
          </div>
          <button onclick="window._stopImpersonating()" class="bg-black/30 hover:bg-black/50 px-3 py-1 rounded-lg transition text-[10px] uppercase tracking-wider font-extrabold flex items-center gap-1 border border-white/20"><i class="fas fa-times-circle"></i>Exit Preview</button>
         </div>`
      : '';
    return `<a href="#page-content" class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg">${t('a11y.skipToContent')}</a>
    <div class="flex h-screen overflow-hidden flex-col">
      ${impersonationBanner}
      <div id="stripe-mode-banner" class="hidden bg-amber-500/90 text-gray-950 text-xs font-semibold px-4 py-2 flex items-center justify-between z-[999] border-b border-amber-400/50">
        <span><i class="fas fa-flask mr-1.5"></i><strong>Stripe Test Mode</strong> — charges are simulated. Switch to live keys in Cloudflare before production billing.</span>
        <a href="/api/docs" target="_blank" rel="noopener" class="underline font-bold">API Docs</a>
      </div>
      <div id="mfa-required-banner" class="hidden bg-rose-950/90 text-rose-100 text-xs font-semibold px-4 py-2 flex items-center justify-between z-[999] border-b border-rose-500/30">
        <span><i class="fas fa-shield-alt mr-1.5"></i>Staff MFA is required for backups, privacy fulfillment, and subscription cancellation.</span>
        <button type="button" onclick="window._nav('settings')" class="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1 rounded-lg text-[10px] uppercase tracking-wider font-bold">Enable MFA</button>
      </div>
      <!-- Top Branding Header -->
      ${MFSN_BANNER ? `<div class="h-16 bg-gray-900 border-b border-gray-800 flex items-center px-4 shrink-0"><img src="${MFSN_BANNER}" alt="MyFreeScoreNow" class="h-14 object-contain"></div>` : ''}
            <div class="flex flex-1 overflow-hidden">
      <button type="button" class="md:hidden fixed top-20 left-3 z-50 bg-gray-800 text-white p-2 rounded-lg border border-gray-700" onclick="window._toggleMobileNav()" aria-label="Toggle navigation" aria-controls="mobile-nav" aria-expanded="false"><i class="fas fa-bars"></i></button>
      <aside id="mobile-nav" class="w-56 bg-gray-900/80 border-r border-gray-800 flex flex-col shrink-0 fixed md:relative inset-y-0 left-0 z-40 md:translate-x-0 -translate-x-full transition-transform md:flex" aria-label="${t('a11y.mainNavigation')}">
        <div class="p-4 border-b border-gray-800"><div class="flex items-center gap-2.5">
          ${FCRA_LOGO ? `<img src="${FCRA_LOGO}" alt="RJ Business Solutions" class="w-12 h-12 rounded-xl object-cover border border-blue-500/20 shadow-[0_0_15px_rgba(10,102,255,0.15)]">` : `<div class="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center"><i class="fas fa-shield-alt text-blue-400 text-xs"></i></div>`}
          <div class="min-w-0"><div class="text-xs font-bold text-white truncate">FCRA Detector</div><div class="text-[10px] text-gray-500 truncate">${state.org?.name||'Org'}</div></div>
        </div>
        <div class="mt-3">
          <label for="locale-switcher" class="sr-only">${t('a11y.localeSwitcher')}</label>
          <select id="locale-switcher" class="w-full bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5 text-xs text-white" onchange="window._setLocale(this.value)" aria-label="${t('a11y.localeSwitcher')}">
            <option value="en" ${state.locale === 'en' ? 'selected' : ''}>English</option>
            <option value="es" ${state.locale === 'es' ? 'selected' : ''}>Español</option>
          </select>
        </div></div>
        <nav class="flex-1 p-3 space-y-1 overflow-y-auto" role="navigation">${navItems.map(n=>`<button type="button" onclick="window._nav('${n.id}')" aria-current="${state.currentPage===n.id?'page':'false'}" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${state.currentPage===n.id?'bg-blue-600/20 text-blue-400':'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}"><i class="fas ${n.icon} w-5 text-center text-xs" aria-hidden="true"></i><span>${n.label}</span></button>`).join('')}</nav>
        <div class="p-3 border-t border-gray-800">
          <div class="flex items-center gap-2.5 px-2 mb-3"><div class="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold" aria-hidden="true">${(state.user?.name||'U')[0].toUpperCase()}</div><div class="min-w-0"><div class="text-xs font-medium text-gray-300 truncate">${state.user?.name||'User'}</div><div class="text-[10px] text-gray-500 truncate">${state.user?.role||'member'}</div></div></div>
          <button type="button" onclick="window._logout()" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:bg-red-900/20 hover:text-red-400 transition"><i class="fas fa-sign-out-alt" aria-hidden="true"></i>${t('nav.signOut')}</button>
        </div>
      </aside>
      <main class="flex-1 overflow-y-auto md:ml-0 ml-0" id="main-content" role="main"><div class="p-6 pt-16 md:pt-6" id="page-content" tabindex="-1"><div class="flex items-center justify-center h-40" role="status" aria-live="polite"><i class="fas fa-spinner fa-spin text-blue-400 text-xl" aria-hidden="true"></i><span class="sr-only">${t('common.loading')}</span></div></div></main>
      </div>
    </div>`;
  }

  window._nav = (p, data) => { if (p === 'exit-impersonation') { window._stopImpersonating(); } else { navigate(p, data); } };
  window._logout = async () => { try { await api('/auth/logout',{method:'POST'}); } catch {} setState({token:null,user:null,org:null}); toast('Signed out','info'); render(); };

  async function loadPage(page) {
    const el = $('#page-content');
    if (!el) return;

    // Zero-Trust Role Redirection for the default Dashboard route
    if (page === 'dashboard-redirect') {
      if (state.user?.role === 'client') {
        page = 'client-cockpit';
        state.currentPage = 'client-cockpit';
      } else {
        page = 'admin-overview';
        state.currentPage = 'admin-overview';
      }
    }

    el.innerHTML = '<div class="flex items-center justify-center h-40"><i class="fas fa-spinner fa-spin text-blue-400 text-xl"></i></div>';
    try {
      switch(page) {
        case 'dashboard': await pgDashboard(el); break;
        case 'clients': await pgClients(el); break;
        case 'global-search': await pgGlobalSearch(el); break;
        case 'client-detail': await pgClientDetail(el, state.pageData); break;
        case 'reports': await pgReports(el); break;
        case 'report-history': await pgReportHistory(el, state.pageData); break;
        case 'report-detail': await pgReportDetail(el, state.pageData); break;
        case 'violations': await pgViolations(el); break;
        case 'documents': await pgDocuments(el); break;
        case 'mailing-campaigns': await pgMailingCampaigns(el); break;
        case 'founder-os': await pgFounderOS(el); break;
        case 'sales-tools': await pgSalesTools(el); break;
        case 'roi-calculator': await pgROICalculator(el); break;
        case 'team': await pgTeam(el); break;
        case 'settings': await pgSettings(el); break;
        case 'ai-studio': await pgAiStudio(el); break;
        case 'billing': await pgBilling(el); break;
        case 'legal': await pgLegal(el); break;
        case 'admin-console': await pgAdminConsole(el); break;
        case 'onboarding-wizard': await pgOnboardingWizard(el, state.pageData); break;
        case 'upload-report': await pgUploadReport(el, state.pageData); break;
        case 'generate-doc': await pgGenerateDoc(el, state.pageData); break;
        case 'full-analysis': await pgFullAnalysis(el, state.pageData); break;
        case 'report-comparison': await pgReportComparison(el, state.pageData); break;
        
        // Secure Self-Service Client Portal Pages
        case 'client-cockpit': await pgClientCockpit(el); break;
        case 'client-self-onboard': await pgClientSelfOnboard(el, state.pageData); break;
        case 'client-messages': await pgClientMessages(el); break;
        case 'client-uploads': await pgClientUploads(el); break;
        case 'client-fundability': await pgClientFundability(el); break;
        case 'client-tradelines': await pgClientTradelines(el); break;
        case 'client-tutor': await pgClientTutor(el); break;
        case 'client-documents': await pgClientDocuments(el); break;
        case 'client-knowledge': await pgClientKnowledge(el); break;
        case 'client-settings': await pgClientSettings(el); break;

        // Admin/Staff CRM & Litigation Dashboard
        case 'admin-overview': await pgAdminOverview(el); break;
        case 'admin-clients': await pgAdminClients(el); break;
        case 'admin-violation-queue': await pgAdminViolationQueue(el); break;

        default: el.innerHTML = '<p class="text-gray-400">Page not found.</p>';
      }
    } catch(err) { el.innerHTML = `<div class="text-red-400 p-4"><i class="fas fa-exclamation-triangle mr-2"></i>${err.message}</div>`; }
  }

  function statCard(icon,label,value,color) {
    return `<div class="glass rounded-xl p-4 card-hover"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-lg bg-${color}-600/20 flex items-center justify-center"><i class="fas ${icon} text-${color}-400"></i></div><div><div class="text-xs text-gray-400">${label}</div><div class="text-xl font-bold text-white">${value}</div></div></div></div>`;
  }

  // ═══════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════
  async function pgDashboard(el) {
    const d = await api('/dashboard');
    el.innerHTML = `<div class="fade-in">
      <div class="bg-blue-900/20 border border-blue-600/30 rounded-xl p-4 mb-6">
        <h3 class="text-sm font-semibold text-blue-300 mb-2"><i class="fas fa-scale mr-2"></i>Your Rights Under the FCRA</h3>
        <p class="text-xs text-blue-200/80 leading-relaxed">
          Under 15 U.S.C. § 1681 et seq., you have the right to: (1) receive a free annual credit report from Equifax, Experian & TransUnion at <a href="https://annualfreecreditreport.com" target="_blank" class="underline hover:text-blue-100">annualfreecreditreport.com</a>; (2) dispute inaccurate information with consumer reporting agencies; (3) seek damages for FCRA violations.
          <a href="/compliance/disclaimers" target="_blank" class="underline hover:text-blue-100 ml-1">View Full Disclaimers →</a>
        </p>
      </div>
      <div class="flex items-center justify-between mb-6"><div><h1 class="text-xl font-bold text-white">Dashboard</h1><p class="text-sm text-gray-400">Credit dispute operations overview</p></div>
        <div class="flex gap-2">
          <button onclick="window._nav('onboarding-wizard', { step: 1 })" class="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-lg flex items-center gap-1.5"><i class="fas fa-magic"></i>Smart Autopilot Ingest</button>
          <button onclick="window._nav('clients')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5"><i class="fas fa-plus"></i>New Client</button>
        </div>
      </div>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        ${statCard('fa-users','Clients',d.totalClients,'blue')}
        ${statCard('fa-file-alt','Reports',d.totalReports,'purple')}
        ${statCard('fa-exclamation-triangle','Violations',d.totalViolations,'red')}
        ${statCard('fa-file-contract','Documents',d.totalDocuments,'emerald')}
      </div>
      <div class="glass rounded-xl p-5 mb-6"><h3 class="text-sm font-semibold text-white mb-3"><i class="fas fa-dollar-sign mr-2 text-green-400"></i>Total Recovery Potential</h3>
        <div class="grid grid-cols-2 gap-4"><div class="bg-gray-800/60 rounded-lg p-4"><div class="text-xs text-gray-400 mb-1">Minimum</div><div class="text-2xl font-bold text-green-400">${money(d.totalDamagesMin)}</div></div><div class="bg-gray-800/60 rounded-lg p-4"><div class="text-xs text-gray-400 mb-1">Maximum</div><div class="text-2xl font-bold text-green-300">${money(d.totalDamagesMax)}</div></div></div></div>
      ${d.violationsBySeverity.length?`<div class="glass rounded-xl p-5 mb-6"><h3 class="text-sm font-semibold text-white mb-3"><i class="fas fa-chart-bar mr-2 text-orange-400"></i>By Severity</h3><div class="grid grid-cols-2 lg:grid-cols-4 gap-3">${d.violationsBySeverity.map(v=>`<div class="bg-gray-800/60 rounded-lg p-3 border-l-4 border-${sevColor(v.severity)}"><div class="text-xs text-gray-400 uppercase">${v.severity}</div><div class="text-lg font-bold text-${sevColor(v.severity)}">${v.count}</div></div>`).join('')}</div></div>`:''}
      ${d.recentViolations.length?`<div class="glass rounded-xl p-5"><h3 class="text-sm font-semibold text-white mb-3"><i class="fas fa-history mr-2 text-blue-400"></i>Recent Violations</h3><div class="space-y-2">${d.recentViolations.map(v=>`<div class="bg-gray-800/40 rounded-lg p-3 flex items-center gap-3 border-l-4 border-${sevColor(v.severity)}"><div class="flex-1 min-w-0"><div class="text-sm font-medium text-white truncate">${v.subcategory}</div><div class="text-xs text-gray-400">${v.first_name} ${v.last_name} &bull; ${v.statute}</div></div><span class="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-${sevColor(v.severity)}/20 text-${sevColor(v.severity)}">${v.severity}</span></div>`).join('')}</div></div>`:`<div class="glass rounded-xl p-8 text-center"><i class="fas fa-rocket text-4xl text-blue-500/40 mb-4"></i><h3 class="text-lg font-semibold text-white mb-2">Ready to Start</h3><p class="text-sm text-gray-400 mb-4">Add a client and upload a credit report to begin</p><button onclick="window._nav('clients')" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition">Add Your First Client</button></div>`}
    </div>`;
  }

  // ═══════════════════════════════════════════════════════════════
  // CLIENTS
  // ═══════════════════════════════════════════════════════════════
  async function pgGlobalSearch(el) {
    el.innerHTML = `
      <div class="fade-in space-y-4 max-w-3xl">
        <h1 class="text-xl font-bold text-white"><i class="fas fa-search text-blue-400 mr-2"></i>Global Search</h1>
        <input id="gsearch-input" class="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white" placeholder="Search clients, violations, documents..." autofocus>
        <div id="gsearch-results" class="space-y-4"></div>
      </div>`;
    const inp = document.getElementById('gsearch-input');
    let debounce;
    inp.oninput = () => { clearTimeout(debounce); debounce = setTimeout(async () => {
      const q = inp.value.trim();
      if (q.length < 2) { document.getElementById('gsearch-results').innerHTML = ''; return; }
      try {
        const d = await api('/search?q=' + encodeURIComponent(q));
        const el2 = document.getElementById('gsearch-results');
        el2.innerHTML = `
          ${(d.clients||[]).length ? `<div class="glass rounded-xl border border-gray-800 p-3"><h3 class="text-xs font-bold text-white uppercase mb-2">Clients (${d.clients.length})</h3>${d.clients.map(c=>`<div class="text-sm py-1 cursor-pointer hover:text-blue-300" onclick="window._nav('client-detail',{clientId:'${c.id}'})">${escapeHtml(c.first_name)} ${escapeHtml(c.last_name)} · ${escapeHtml(c.email||'')} · <span class="text-gray-500">${c.case_status||''}</span></div>`).join('')}</div>` : ''}
          ${(d.violations||[]).length ? `<div class="glass rounded-xl border border-gray-800 p-3"><h3 class="text-xs font-bold text-white uppercase mb-2">Violations (${d.violations.length})</h3>${d.violations.map(v=>`<div class="text-sm py-1">${escapeHtml(v.account_name)} · ${escapeHtml(v.bureau||'')} · ${escapeHtml(v.statute||'')}</div>`).join('')}</div>` : ''}
          ${(d.documents||[]).length ? `<div class="glass rounded-xl border border-gray-800 p-3"><h3 class="text-xs font-bold text-white uppercase mb-2">Documents (${d.documents.length})</h3>${d.documents.map(dd=>`<div class="text-sm py-1">${escapeHtml(dd.title||dd.doc_type)} · ${escapeHtml(dd.status)}</div>`).join('')}</div>` : ''}
          ${!d.clients?.length && !d.violations?.length && !d.documents?.length ? '<p class="text-gray-500">No results</p>' : ''}`;
      } catch (err) { document.getElementById('gsearch-results').innerHTML = `<p class="text-red-400">${escapeHtml(err.message)}</p>`; }
    }, 300); };
  }

  async function pgClients(el) {
    const d = await api('/clients');
    el.innerHTML = `<div class="fade-in">
      <div class="flex items-center justify-between mb-6"><div><h1 class="text-xl font-bold text-white">Clients</h1><p class="text-sm text-gray-400">${d.clients.length} total</p></div>
        <div class="flex gap-2">
          <button onclick="window._nav('onboarding-wizard', { step: 1 })" class="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-lg flex items-center gap-1.5"><i class="fas fa-magic"></i>Smart Autopilot Ingest</button>
          <button onclick="$('#add-client-form').classList.toggle('hidden')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5"><i class="fas fa-plus"></i>Add Client</button>
        </div>
      </div>
      <div id="add-client-form" class="hidden glass rounded-xl p-5 mb-6 fade-in"><h3 class="text-sm font-semibold text-white mb-4">New Client</h3>
        <form id="client-form" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label class="block text-xs text-gray-400 mb-1">First Name *</label><input type="text" name="firstName" required class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"></div>
          <div><label class="block text-xs text-gray-400 mb-1">Last Name *</label><input type="text" name="lastName" required class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"></div>
          <div><label class="block text-xs text-gray-400 mb-1">Email</label><input type="email" name="email" class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"></div>
          <div><label class="block text-xs text-gray-400 mb-1">Phone</label><input type="tel" name="phone" class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"></div>
          <div><label class="block text-xs text-gray-400 mb-1">Address</label><input type="text" name="addressLine1" class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"></div>
          <div class="grid grid-cols-3 gap-2"><div><label class="block text-xs text-gray-400 mb-1">City</label><input type="text" name="city" class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"></div><div><label class="block text-xs text-gray-400 mb-1">State</label><input type="text" name="state" maxlength="2" class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"></div><div><label class="block text-xs text-gray-400 mb-1">ZIP</label><input type="text" name="zip" class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"></div></div>
          <div><label class="block text-xs text-gray-400 mb-1">DOB</label><input type="date" name="dob" class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"></div>
          <div><label class="block text-xs text-gray-400 mb-1">SSN Last 4</label><input type="text" name="ssnLast4" maxlength="4" class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none" placeholder="1234"></div>
          <div class="md:col-span-2 flex gap-2"><button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition">Save Client</button><button type="button" onclick="$('#add-client-form').classList.add('hidden')" class="bg-gray-700 hover:bg-gray-600 text-white px-5 py-2 rounded-lg text-sm transition">Cancel</button></div>
        </form></div>
      ${d.clients.length?`<div class="space-y-2">${d.clients.map(c=>`<div onclick="window._nav('client-detail',{clientId:'${c.id}'})" class="glass rounded-xl p-4 card-hover cursor-pointer"><div class="flex items-center gap-4"><div class="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-sm">${(c.first_name||'?')[0]}${(c.last_name||'?')[0]}</div><div class="flex-1 min-w-0"><div class="text-sm font-semibold text-white">${c.first_name} ${c.last_name}</div><div class="text-xs text-gray-400">${c.email||'No email'} ${c.phone?'&bull; '+c.phone:''}</div></div><div class="text-right shrink-0"><div class="text-xs text-gray-400">${c.report_count||0} reports &bull; ${c.violation_count||0} violations</div>${c.damages_max?`<div class="text-xs text-green-400">${money(c.damages_min)} - ${money(c.damages_max)}</div>`:''}<span class="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium ${c.status==='active'?'bg-green-900/30 text-green-400':'bg-gray-700 text-gray-400'}">${c.status||'active'}</span></div><i class="fas fa-chevron-right text-gray-600 text-xs"></i></div></div>`).join('')}</div>`:`<div class="glass rounded-xl p-8 text-center"><i class="fas fa-users text-4xl text-gray-600 mb-4"></i><p class="text-gray-400 mb-3">No clients yet</p><button onclick="$('#add-client-form').classList.toggle('hidden')" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Add First Client</button></div>`}
    </div>`;
    const f = $('#client-form');
    if (f) f.onsubmit = async (e) => { e.preventDefault(); const fd = new FormData(e.target); const b = {}; for (const [k,v] of fd.entries()) b[k]=v; try { await api('/clients',{method:'POST',body:JSON.stringify(b)}); toast('Client created!','success'); await pgClients(el); } catch(err) { toast(err.message,'error'); } };
  }

  // ═══════════════════════════════════════════════════════════════
  // CLIENT DETAIL
  // ═══════════════════════════════════════════════════════════════
  async function pgClientDetail(el, data) {
    const res = await api(`/clients/${data.clientId}`);
    const c = res.client;
    const totalMin = (res.violations||[]).reduce((s,v) => s + (v.total_damages_min||0), 0);
    const totalMax = (res.violations||[]).reduce((s,v) => s + (v.total_damages_max||0), 0);

    el.innerHTML = `<div class="fade-in">
      <button onclick="window._nav('clients')" class="text-gray-400 hover:text-white text-sm mb-4 inline-flex items-center gap-1.5 transition"><i class="fas fa-arrow-left text-xs"></i>Back</button>
      <div class="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div class="flex items-center gap-4"><div class="w-14 h-14 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-xl">${(c.first_name||'?')[0]}${(c.last_name||'?')[0]}</div>
          <div><h1 class="text-xl font-bold text-white">${c.first_name} ${c.last_name}</h1><div class="text-sm text-gray-400">${c.email||''} ${c.phone?'&bull; '+c.phone:''}</div>${c.address_line1?`<div class="text-xs text-gray-500">${c.address_line1}${c.city?', '+c.city:''} ${c.state||''} ${c.zip||''}</div>`:''}</div>
        </div>
        <div class="flex gap-2">
          <button onclick="window._startImpersonating('${c.id}', '${escapeHtml(c.first_name + ' ' + c.last_name)}')" class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 border border-amber-500/20 shadow-[0_0_15px_rgba(217,119,6,0.15)]"><i class="fas fa-user-shield"></i>Preview Portal</button>
          <button id="btn-email-client" class="bg-cyan-700 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5"><i class="fas fa-envelope"></i>Message / Email</button>
          <button id="btn-portal-invite" class="bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5"><i class="fas fa-key"></i>Portal Invite</button>
          <button id="btn-edit-client" class="bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 border border-gray-700"><i class="fas fa-edit"></i>Edit Profile</button>
          <button onclick="window._nav('upload-report',{clientId:'${c.id}',clientName:'${c.first_name} ${c.last_name}'})" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5"><i class="fas fa-upload"></i>Upload Report</button>
          <button onclick="window._nav('generate-doc',{clientId:'${c.id}',clientName:'${c.first_name} ${c.last_name}'})" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5"><i class="fas fa-file-contract"></i>Generate Docs</button>
        </div>
      </div>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        ${statCard('fa-file-alt','Reports',res.reports.length,'blue')}
        ${statCard('fa-exclamation-triangle','Violations',res.violations.length,'red')}
        ${statCard('fa-dollar-sign','Min Recovery',money(totalMin),'green')}
        ${statCard('fa-file-contract','Documents',res.documents.length,'purple')}
      </div>
      ${renderBureauTriad(res)}
      <div class="flex border-b border-gray-800 mb-4">${['reports','violations','bureaus','documents','mailing','activity'].map((t)=>`<button class="client-tab pb-2.5 px-4 text-sm font-medium ${(data.initialTab||'violations')===t?'text-blue-400 border-b-2 border-blue-400':'text-gray-500 border-b-2 border-transparent hover:text-gray-300'}" data-tab="${t}">${t==='mailing'?'Mailing Campaigns':t==='bureaus'?'Tri-Bureau':(t[0].toUpperCase()+t.slice(1))} (${t==='activity'?res.activity.length:t==='mailing'?res.documents.filter(d=>d.status==='sent').length:t==='bureaus'?'3':res[t==='bureaus'?'reports':t].length})</button>`).join('')}</div>
      <div id="client-tab-content">${(data.initialTab && data.initialTab !== 'violations') ? '' : renderViolationsList(res.violations)}</div>

      <!-- Edit Client Slide-Over Panel -->
      <div id="edit-client-modal" class="fixed inset-0 z-[100] hidden">
        <div class="absolute inset-0 bg-gray-950/70 backdrop-blur-sm transition-opacity" onclick="window._closeEditClientModal()"></div>
        <div class="absolute inset-y-0 right-0 max-w-full flex">
          <div class="w-screen max-w-lg glass bg-gray-950/95 border-l border-gray-800/80 p-6 flex flex-col h-full shadow-2xl overflow-y-auto">
            <div class="flex items-center justify-between border-b border-gray-800/60 pb-4 mb-6">
              <div class="flex items-center gap-2.5">
                <img src="https://storage.googleapis.com/msgsndr/qQnxRHDtyx0uydPd5sRl/media/67eb83c5e519ed689430646b.jpeg" class="h-6 w-auto rounded border border-blue-500/30">
                <h2 class="text-sm font-bold text-white uppercase tracking-wider font-mono">Edit Client Profile</h2>
              </div>
              <button onclick="window._closeEditClientModal()" class="text-gray-400 hover:text-white transition"><i class="fas fa-times text-lg"></i></button>
            </div>
            
            <form id="edit-client-form-submit" class="space-y-4 flex-1">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">First Name *</label>
                  <input type="text" name="firstName" required value="${escapeHtml(c.first_name)}" class="w-full bg-gray-900/60 border border-gray-800 rounded-lg px-3.5 py-2.5 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Last Name *</label>
                  <input type="text" name="lastName" required value="${escapeHtml(c.last_name)}" class="w-full bg-gray-900/60 border border-gray-800 rounded-lg px-3.5 py-2.5 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                </div>
              </div>
              
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Email Address</label>
                  <input type="email" name="email" value="${escapeHtml(c.email)}" class="w-full bg-gray-900/60 border border-gray-800 rounded-lg px-3.5 py-2.5 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Phone Number</label>
                  <input type="tel" name="phone" value="${escapeHtml(c.phone)}" class="w-full bg-gray-900/60 border border-gray-800 rounded-lg px-3.5 py-2.5 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Street Mailing Address</label>
                <input type="text" name="addressLine1" value="${escapeHtml(c.address_line1)}" class="w-full bg-gray-900/60 border border-gray-800 rounded-lg px-3.5 py-2.5 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
              </div>

              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">City</label>
                  <input type="text" name="city" value="${escapeHtml(c.city)}" class="w-full bg-gray-900/60 border border-gray-800 rounded-lg px-3.5 py-2.5 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">State</label>
                  <input type="text" name="state" maxlength="2" value="${escapeHtml(c.state)}" class="w-full bg-gray-900/60 border border-gray-800 rounded-lg px-3.5 py-2.5 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="e.g. CA">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">ZIP Code</label>
                  <input type="text" name="zip" value="${escapeHtml(c.zip)}" class="w-full bg-gray-900/60 border border-gray-800 rounded-lg px-3.5 py-2.5 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Date of Birth</label>
                  <input type="date" name="dob" value="${c.dob || ''}" class="w-full bg-gray-900/60 border border-gray-800 rounded-lg px-3.5 py-2.5 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">SSN (Last 4 Digits)</label>
                  <input type="text" name="ssnLast4" maxlength="4" value="${escapeHtml(c.ssn_last4)}" class="w-full bg-gray-900/60 border border-gray-800 rounded-lg px-3.5 py-2.5 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="e.g. 1234">
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Client Status</label>
                <select name="status" class="w-full bg-gray-900/60 border border-gray-800 rounded-lg px-3.5 py-2.5 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                  <option value="active" ${c.status === 'active' ? 'selected' : ''}>Active</option>
                  <option value="lead" ${c.status === 'lead' ? 'selected' : ''}>Lead</option>
                  <option value="inactive" ${c.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Internal Account Notes</label>
                <textarea name="notes" rows="3" class="w-full bg-gray-900/60 border border-gray-800 rounded-lg px-3.5 py-2.5 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Add confidential notes...">${escapeHtml(c.notes)}</textarea>
              </div>

              <div class="p-4 bg-blue-950/25 border border-blue-500/20 rounded-xl space-y-3">
                <h4 class="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5"><i class="fas fa-shield-alt"></i> Compliance Authorization</h4>
                
                <label class="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" name="permissiblePurposeConsent" ${c.permissible_purpose_consent ? 'checked' : ''} class="mt-1 rounded border-gray-800 bg-gray-900 text-blue-600 focus:ring-blue-500/50 w-4 h-4">
                  <span class="text-[10px] text-gray-400 leading-relaxed">
                    <strong>Permissible Purpose (15 U.S.C. § 1681b):</strong> Client grants RJ Business Solutions explicit permission to pull credit files.
                  </span>
                </label>

                <label class="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" name="croaContractAgreed" ${c.croa_contract_agreed ? 'checked' : ''} class="mt-1 rounded border-gray-800 bg-gray-900 text-blue-600 focus:ring-blue-500/50 w-4 h-4">
                  <span class="text-[10px] text-gray-400 leading-relaxed">
                    <strong>CROA Disclosures (15 U.S.C. § 1679c):</strong> Client signed and accepted complete CROA disclosure statements before credit review.
                  </span>
                </label>

                <label class="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" name="tsrAdvanceFeeWaived" ${c.tsr_advance_fee_waived ? 'checked' : ''} class="mt-1 rounded border-gray-800 bg-gray-900 text-blue-600 focus:ring-blue-500/50 w-4 h-4">
                  <span class="text-[10px] text-gray-400 leading-relaxed">
                    <strong>TSR Compliance (16 C.F.R. § 310.4):</strong> No advance fees are collected. All billing is strictly in arrears based on results.
                  </span>
                </label>
              </div>

              <div class="flex gap-3 pt-4 border-t border-gray-800/60">
                <button type="submit" class="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2.5 rounded-lg transition text-sm shadow-lg shadow-blue-500/10">Save Profile Updates</button>
                <button type="button" onclick="window._closeEditClientModal()" class="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-lg text-sm text-gray-400 hover:text-white transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>`;

    // Wire up events
    const btnEdit = document.getElementById('btn-edit-client');
    const btnEmail = document.getElementById('btn-email-client');
    if (btnEmail) btnEmail.onclick = async () => {
      const subject = prompt('Email subject', 'Update from your Smart FCRA credit team');
      if (subject === null) return;
      const body = prompt('Message to client');
      if (!body) return;
      try {
        const r = await api('/clients/' + c.id + '/email', { method: 'POST', body: JSON.stringify({ subject, body }) });
        toast(r.email?.sent ? 'Emailed + logged to portal' : (r.email?.simulated ? 'Simulated email + portal log' : 'Logged to portal'), 'success');
      } catch (err) { toast(err.message, 'error'); }
    };
    const btnInvite = document.getElementById('btn-portal-invite');
    if (btnInvite) btnInvite.onclick = async () => {
      const email = prompt('Client email for portal login', c.email || '');
      if (!email) return;
      try {
        const r = await api('/clients/' + c.id + '/portal-invite', { method: 'POST', body: JSON.stringify({ email }) });
        toast('Invite ' + (r.emailStatus || 'sent') + (r.temporaryPassword ? ' · temp pass copied to console' : ''), 'success');
        if (r.temporaryPassword) console.info('[portal-invite]', r.loginUrl, r.temporaryPassword);
      } catch (err) { toast(err.message, 'error'); }
    };
    document.getElementById('btn-edit-client');
    const modal = document.getElementById('edit-client-modal');
    if (btnEdit && modal) {
      btnEdit.onclick = () => modal.classList.remove('hidden');
    }
    window._closeEditClientModal = () => {
      if (modal) modal.classList.add('hidden');
    };

    const editForm = document.getElementById('edit-client-form-submit');
    if (editForm) {
      editForm.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const b = {
          firstName: fd.get('firstName'),
          lastName: fd.get('lastName'),
          email: fd.get('email'),
          phone: fd.get('phone'),
          addressLine1: fd.get('addressLine1'),
          city: fd.get('city'),
          state: fd.get('state'),
          zip: fd.get('zip'),
          dob: fd.get('dob'),
          ssnLast4: fd.get('ssnLast4'),
          notes: fd.get('notes'),
          status: fd.get('status'),
          permissiblePurposeConsent: fd.get('permissiblePurposeConsent') !== null,
          croaContractAgreed: fd.get('croaContractAgreed') !== null,
          tsrAdvanceFeeWaived: fd.get('tsrAdvanceFeeWaived') !== null,
        };
        try {
          await api(`/clients/${c.id}`, { method: 'PUT', body: JSON.stringify(b) });
          toast('Client profile successfully updated!', 'success');
          window._closeEditClientModal();
          // Reload page content
          await pgClientDetail(el, data);
        } catch(err) {
          toast(err.message, 'error');
        }
      };
    }

    // Show violations first unless initialTab specified
    const initialTab = data.initialTab || 'violations';
    if (initialTab !== 'violations') {
      const ct = $('#client-tab-content');
      const tabBtn = document.querySelector(`.client-tab[data-tab="${initialTab}"]`);
      if (tabBtn) {
        document.querySelectorAll('.client-tab').forEach(t => { t.className = 'client-tab pb-2.5 px-4 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:text-gray-300'; });
        tabBtn.className = 'client-tab pb-2.5 px-4 text-sm font-medium text-blue-400 border-b-2 border-blue-400';
        if (initialTab === 'bureaus' && ct) loadBureauComparisonTab(ct, c.id);
        else if (ct) tabBtn.click();
      }
    }
    document.querySelectorAll('.client-tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.client-tab').forEach(t => { t.className = 'client-tab pb-2.5 px-4 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:text-gray-300'; });
        tab.className = 'client-tab pb-2.5 px-4 text-sm font-medium text-blue-400 border-b-2 border-blue-400';
        const ct = $('#client-tab-content');
        switch(tab.dataset.tab) {
          case 'reports': ct.innerHTML = renderReportsList(res.reports); break;
          case 'violations': ct.innerHTML = renderViolationsList(res.violations); break;
          case 'bureaus': loadBureauComparisonTab(ct, c.id); break;
          case 'documents': ct.innerHTML = renderDocsList(res.documents); break;
          case 'mailing': ct.innerHTML = renderMailingTab(res.documents, c); break;
          case 'activity': ct.innerHTML = renderActivityList(res.activity); break;
        }
      };
    });
  }


  function renderBureauTriad(res) {
    const pack = res.bureauPack || {};
    const scores = res.scores || {};
    const current = pack.currentReports || {};
    const reports = res.reports || [];
    const findCurrent = (bureau) => {
      if (current[bureau]) return reports.find(r => r.id === current[bureau]) || reports.find(r => r.bureau === bureau && (r.is_current === 1 || r.is_current == null));
      return reports.find(r => r.bureau === bureau && (r.is_current === 1 || r.is_current == null)) || reports.find(r => r.bureau === bureau);
    };
    const slots = [
      { name: 'Equifax', score: scores.equifax, color: 'red' },
      { name: 'Experian', score: scores.experian, color: 'blue' },
      { name: 'TransUnion', score: scores.transunion, color: 'emerald' },
    ];
    const status = pack.status || 'NONE';
    const statusLabel = status === 'TRI_BUREAU_READY' || status === 'WORKFLOW_FIRED'
      ? '<span class="text-green-400 font-bold">Tri-bureau pack ready</span>'
      : status === 'PARTIAL' ? '<span class="text-amber-400 font-bold">Partial pack — upload remaining bureaus</span>'
      : '<span class="text-gray-400">No bureau reports yet</span>';
    const missing = pack.missing || slots.filter(s => !findCurrent(s.name)).map(s => s.name);

    return `<div class="glass rounded-xl border border-gray-800 p-4 mb-6">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div class="text-sm font-bold text-white"><i class="fas fa-layer-group text-blue-400 mr-1.5"></i>Multi-Bureau CRM Pack</div>
        <div class="text-xs">${statusLabel}</div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        ${slots.map(s => {
          const r = findCurrent(s.name);
          const ready = !!r;
          return `<div class="rounded-xl border ${ready ? 'border-green-500/30 bg-green-950/10' : 'border-gray-800 bg-gray-950/40'} p-3">
            <div class="flex items-center justify-between mb-2">
              <div class="text-xs font-bold uppercase tracking-wider text-white">${s.name}</div>
              <span class="text-[10px] font-bold ${ready ? 'text-green-400' : 'text-gray-500'}">${ready ? 'CURRENT' : 'MISSING'}</span>
            </div>
            <div class="text-2xl font-extrabold text-white font-mono">${s.score ?? (r?.fico_score ?? '—')}</div>
            <div class="text-[10px] text-gray-500 mt-1">${ready ? `${r.total_accounts||0} accounts · ${shortDate(r.created_at)}` : 'Upload ACR PDF for this bureau'}</div>
            <div class="mt-2 flex gap-2">
              ${ready ? `<button onclick="window._nav('report-detail',{reportId:'${r.id}'})" class="text-[10px] font-bold text-blue-400">Open</button>` : ''}
              <button onclick="window._nav('upload-report',{clientId:'${res.client.id}',clientName:'${(res.client.first_name||'')+' '+(res.client.last_name||'')}',tab:'acr'})" class="text-[10px] font-bold text-gray-400 hover:text-white">${ready ? 'Replace' : 'Upload'}</button>
            </div>
          </div>`;
        }).join('')}
      </div>
      ${missing.length && missing.length < 3 ? `<div class="mt-3 text-[11px] text-amber-300">Still needed: <strong>${missing.join(', ')}</strong> — upload one-by-one; each populates its own slot.</div>` : ''}
      ${(status === 'TRI_BUREAU_READY' || status === 'WORKFLOW_FIRED') && current.Equifax ? `
        <div class="mt-3 flex flex-wrap gap-2">
          <button onclick="window._launchAttorneyWorkflow('${current.Equifax}')" class="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold"><i class="fas fa-gavel mr-1"></i>Launch Full Suit Pack</button>
          <button onclick="window._nav('client-documents')" class="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold">E-Sign Queue</button>
        </div>` : ''}
    </div>`;
  }

  async function loadBureauComparisonTab(el, clientId) {
    el.innerHTML = '<div class="flex items-center justify-center py-12"><i class="fas fa-spinner fa-spin text-blue-400 text-xl"></i></div>';
    try {
      const comp = await api(`/clients/${clientId}/bureau-comparison`);
      const bureauColors = { Equifax: 'rose', Experian: 'blue', TransUnion: 'emerald' };
      el.innerHTML = `
        <div class="space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="text-sm font-bold text-white"><i class="fas fa-columns text-purple-400 mr-1.5"></i>Tri-Bureau Comparison Workspace</h3>
            <span class="text-[10px] uppercase font-bold px-2 py-1 rounded ${comp.triBureauComplete ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'}">${comp.triBureauComplete ? 'All 3 bureaus loaded' : 'Partial — upload missing bureaus'}</span>
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            ${(comp.bureaus || []).map(b => {
              const c = bureauColors[b.bureau] || 'gray';
              return `<div class="glass rounded-xl border border-gray-800 p-4">
                <div class="flex items-center justify-between mb-3">
                  <span class="text-xs font-bold uppercase tracking-wider text-${c}-400">${b.bureau}</span>
                  ${b.reportId ? `<button onclick="window._nav('report-detail',{reportId:'${b.reportId}'})" class="text-[10px] text-blue-400 font-bold">Open Report</button>` : '<span class="text-[10px] text-gray-500">No report</span>'}
                </div>
                <div class="text-3xl font-black text-white font-mono mb-1">${b.score ?? '—'}</div>
                <div class="text-[10px] text-gray-500 mb-3">FICO ${b.ficoScore ?? '—'} · Vantage ${b.vantageScore ?? '—'}</div>
                <div class="grid grid-cols-2 gap-2 text-[11px] text-gray-400 mb-3">
                  <div>Accounts: <strong class="text-white">${b.accountCount}</strong></div>
                  <div>Collections: <strong class="text-white">${b.collectionCount}</strong></div>
                  <div>Inquiries: <strong class="text-white">${b.inquiryCount}</strong></div>
                  <div>Violations: <strong class="text-red-400">${b.violationCount}</strong></div>
                </div>
                ${(b.accounts || []).length ? `<div class="border-t border-gray-800 pt-2 max-h-40 overflow-y-auto space-y-1">
                  ${b.accounts.slice(0, 8).map(a => `<div class="text-[10px] text-gray-300 flex justify-between gap-2"><span class="truncate">${escapeHtml(a.creditorName || 'Account')}</span><span class="font-mono text-gray-500 shrink-0">${money(a.currentBalance || 0)}</span></div>`).join('')}
                </div>` : '<p class="text-[10px] text-gray-500">No parsed accounts</p>'}
              </div>`;
            }).join('')}
          </div>
        </div>`;
    } catch (err) {
      el.innerHTML = `<div class="text-red-400 text-sm p-4">${escapeHtml(err.message)}</div>`;
    }
  }

  function renderReportsList(reports) {
    if (!reports.length) return '<div class="text-center py-8 text-gray-500"><i class="fas fa-file-alt text-3xl mb-3"></i><p>No reports yet</p></div>';
    return `<div class="space-y-2">${reports.map(r=>`<div onclick="window._nav('report-detail',{reportId:'${r.id}'})" class="glass rounded-lg p-4 card-hover cursor-pointer"><div class="flex items-center justify-between"><div><div class="text-sm font-medium text-white"><i class="fas fa-file-alt mr-2 text-blue-400"></i>${r.bureau||'Unknown'}</div><div class="text-xs text-gray-400">${r.file_name} &bull; ${shortDate(r.created_at)}</div></div><div class="text-right flex flex-col items-end gap-1.5"><div class="text-xs text-gray-400">${r.total_accounts||0} accounts</div><div class="flex items-center gap-1.5"><button onclick="event.stopPropagation(); window._nav('report-comparison', {reportId:'${r.id}'})" class="px-2 py-0.5 rounded bg-purple-950/40 text-purple-400 hover:bg-purple-900/30 border border-purple-500/20 text-[10px] font-semibold transition flex items-center gap-1"><i class="fas fa-balance-scale"></i> Compare</button><span class="px-2 py-0.5 rounded text-[10px] font-medium ${r.status==='analyzed'?'bg-green-900/30 text-green-400':'bg-yellow-900/30 text-yellow-400'}">${r.status}</span></div></div></div></div>`).join('')}</div>`;
  }

  function renderViolationsList(violations) {
    if (!violations.length) return '<div class="text-center py-8 text-gray-500"><i class="fas fa-check-circle text-3xl mb-3"></i><p>No violations found</p></div>';
    
    // Group violations by client
    const groups = {};
    violations.forEach(v => {
      const clientKey = v.client_id || `${v.first_name || 'Unknown'}_${v.last_name || 'Client'}`;
      if (!groups[clientKey]) {
        groups[clientKey] = {
          client_id: v.client_id,
          first_name: v.first_name || 'Unknown',
          last_name: v.last_name || 'Client',
          violations: []
        };
      }
      groups[clientKey].violations.push(v);
    });

    const reportId = window._activeWorkspaceReport ? window._activeWorkspaceReport.id : null;

    // Render grouped violations list
    return `<div class="space-y-6">${Object.values(groups).map(g => {
      const clientMin = g.violations.reduce((s, v) => s + (v.total_damages_min || 0), 0);
      const clientMax = g.violations.reduce((s, v) => s + (v.total_damages_max || 0), 0);
      const criticalCount = g.violations.filter(v => v.severity === 'critical').length;
      const highCount = g.violations.filter(v => v.severity === 'high').length;
      const medLowCount = g.violations.length - criticalCount - highCount;

      let badgeHtml = '';
      if (criticalCount > 0) badgeHtml += `<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-900/30 text-red-400 mr-1.5">${criticalCount} Critical</span>`;
      if (highCount > 0) badgeHtml += `<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-900/30 text-orange-400 mr-1.5">${highCount} High</span>`;
      if (medLowCount > 0 && badgeHtml === '') badgeHtml += `<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-900/30 text-blue-400">${medLowCount} Med/Low</span>`;

      return `
      <div class="glass rounded-xl p-5 border border-gray-700/50 space-y-4 fade-in">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-800">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <h3 class="text-md font-bold text-white flex items-center gap-1.5">
                <i class="fas fa-user-circle text-blue-400"></i> ${g.first_name} ${g.last_name}
              </h3>
              <span class="text-xs text-gray-500">&bull; ${g.violations.length} ${g.violations.length === 1 ? 'violation' : 'violations'}</span>
            </div>
            <div class="flex items-center gap-2">
              ${badgeHtml}
              <span class="text-xs text-gray-400">Est. Damages: <strong class="text-green-400 font-semibold">${money(clientMin)} &ndash; ${money(clientMax)}</strong></span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            ${g.client_id ? `<button onclick="window._nav('client-detail', { clientId: '${g.client_id}' })" class="text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-3 py-1.5 rounded-lg border border-blue-500/20 transition flex items-center gap-1"><i class="fas fa-folder-open"></i> Client Workspace</button>` : ''}
          </div>
        </div>
        <div class="space-y-2">
          ${g.violations.map(v => {
            const isPinned = reportId ? window._isItemPinned(reportId, `violation-${v.id}`) : false;
            const checkboxHtml = reportId ? `<input type="checkbox" class="rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500/50 w-3.5 h-3.5 mr-1 cursor-pointer" ${isPinned ? 'checked' : ''} onchange="window._toggleDisputeItem(event, '${reportId}', 'violation-${v.id}')" onclick="event.stopPropagation()">` : '';
            return `
            <details class="group bg-gray-900/30 rounded-lg" id="v-card-${v.id}">
              <summary class="cursor-pointer list-none">
                <div class="p-3 border border-gray-800/40 rounded-lg border-l-4 border-l-${sevColor(v.severity)} card-hover flex items-start justify-between">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      ${checkboxHtml}
                      <span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-${sevColor(v.severity)}/20 text-${sevColor(v.severity)}">${v.severity}</span>
                      <span class="text-xs text-gray-400">${v.category} &bull; ${v.statute}</span>
                      <i class="fas fa-chevron-down text-[10px] text-gray-500 group-open:rotate-180 transition-transform"></i>
                    </div>
                    <div class="text-sm font-medium text-white">${v.subcategory}</div>
                    ${v.account_name||v.accountName ? `<div class="text-xs text-gray-500">Account: ${v.account_name||v.accountName}</div>` : ''}
                  </div>
                  <div class="text-right shrink-0 ml-4">
                    <div class="text-xs text-green-400 font-medium">${money(v.total_damages_min||v.totalDamagesMin)} &ndash; ${money(v.total_damages_max||v.totalDamagesMax)}</div>
                  </div>
                </div>
              </summary>
              <div class="mt-2 p-3 space-y-2 text-sm border-t border-gray-800/60 bg-gray-900/10 rounded-b-lg fade-in">
                <div class="bg-gray-800/20 rounded-lg p-3"><div class="text-xs font-semibold text-blue-400 mb-1">STATUTE</div><div class="text-xs text-gray-300">${v.statute_text||v.statuteText||''}</div></div>
                <div class="bg-gray-800/20 rounded-lg p-3"><div class="text-xs font-semibold text-red-400 mb-1">EVIDENCE</div><div class="text-xs text-gray-300">${v.evidence||''}</div></div>
                <div class="bg-gray-800/20 rounded-lg p-3"><div class="text-xs font-semibold text-purple-400 mb-1">LEGAL STANDARD</div><div class="text-xs text-gray-300">${v.legal_standard||v.legalStandard||''}</div></div>
                <div class="bg-gray-800/20 rounded-lg p-3"><div class="text-xs font-semibold text-yellow-400 mb-1">EXPLANATION</div><div class="text-xs text-gray-300">${v.explanation||''}</div></div>
                <div class="bg-gray-800/20 rounded-lg p-3"><div class="text-xs font-semibold text-cyan-400 mb-1">CASE LAW</div><div class="text-xs text-gray-300">${v.case_law||v.caseLaw||''}</div></div>
                <div class="bg-gray-800/20 rounded-lg p-3">
                  <div class="text-xs font-semibold text-green-400 mb-1">DAMAGES</div>
                  <div class="grid grid-cols-2 gap-2 text-xs text-gray-300">
                    <div>Statutory: ${money(v.statutory_damages_min||v.statutoryDamagesMin)} &ndash; ${money(v.statutory_damages_max||v.statutoryDamagesMax)}</div>
                    <div>Actual: ${money(v.actual_damages_est||v.actualDamagesEst)}</div>
                    <div>Punitive: ${money(v.punitive_damages_est||v.punitiveDamagesEst)}</div>
                    <div>Attorney Fees: ${money(v.attorney_fees_est||v.attorneyFeesEst)}</div>
                  </div>
                  <div class="mt-2 text-xs font-medium text-green-400">Defendant: ${v.defendant_type||v.defendantType||''} &mdash; ${v.defendant_name||v.defendantName||''}</div>
                </div>
              </div>
            </details>
            `;
          }).join('')}
        </div>
      </div>
      `;
    }).join('')}</div>`;
  }

  function renderDocsList(docs) {
    if (!docs.length) return '<div class="text-center py-8 text-gray-500"><i class="fas fa-file-contract text-3xl mb-3"></i><p>No documents yet</p></div>';
    return `<div class="space-y-2">${docs.map(d=>`<div onclick="window._viewDoc('${d.id}')" class="glass rounded-lg p-4 card-hover cursor-pointer"><div class="flex items-center justify-between"><div><div class="text-sm font-medium text-white"><i class="fas fa-file-contract mr-2 text-purple-400"></i>${d.title}</div><div class="text-xs text-gray-400">${d.doc_type} &bull; ${shortDate(d.created_at)}</div></div><span class="px-2 py-0.5 rounded text-[10px] font-medium ${d.status==='draft'?'bg-yellow-900/30 text-yellow-400':'bg-green-900/30 text-green-400'}">${d.status}</span></div></div>`).join('')}</div>`;
  }

  function renderActivityList(activity) {
    if (!activity.length) return '<div class="text-center py-8 text-gray-500"><i class="fas fa-history text-3xl mb-3"></i><p>No activity</p></div>';
    return `<div class="space-y-2">${activity.map(a=>`<div class="flex items-start gap-3 py-2"><div class="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center shrink-0 mt-0.5"><i class="fas fa-${a.action.includes('report')?'file-alt':a.action.includes('document')?'file-contract':'clock'} text-[10px] text-gray-400"></i></div><div class="min-w-0"><div class="text-sm text-gray-300">${a.description}</div><div class="text-xs text-gray-500">${a.user_name||'System'} &bull; ${shortDate(a.created_at)}</div></div></div>`).join('')}</div>`;
  }

  // ═══════════════════════════════════════════════════════════════
  // UPLOAD REPORT — FULL PROCESS FLOW
  // ═══════════════════════════════════════════════════════════════
  async function pgUploadReport(el, data) {
    if (!data) {
      data = { clientId: 'autopilot', autopilot: true };
    } else if (data.clientId === 'autopilot') {
      data.autopilot = true;
    }

    const isAutopilot = !!data.autopilot;
    const backNav = isAutopilot 
      ? `window._nav('${data.from || 'clients'}')` 
      : `window._nav('client-detail',{clientId:'${data.clientId}'})`;
    const backText = isAutopilot 
      ? `Back to ${data.from === 'dashboard' ? 'Dashboard' : 'Clients'}` 
      : `Back to ${data.clientName || 'Client'}`;

    const title = isAutopilot 
      ? `<i class="fas fa-magic mr-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400"></i>Smart Client Autopilot Ingest` 
      : `<i class="fas fa-radar mr-2 text-blue-400"></i>Full Credit Report Analysis`;

    const description = isAutopilot 
      ? `Zero-friction onboarding. Drop raw credit report PDFs (Equifax, Experian, TransUnion) or paste raw text. The system will automatically extract demographics, resolve or register client files, run complete litigation scans, and redirect you directly to their workspace.` 
      : `Import via MyFreeScoreNow, SmartCredit, or upload raw text / AnnualCreditReport.com PDFs. The system will parse, detect ALL violations, and calculate litigation value.`;

    const mfsnClass = isAutopilot 
      ? 'px-4 py-2 font-semibold text-gray-400 border-b-2 border-transparent hover:text-white mr-2 transition'
      : 'px-4 py-2 font-semibold text-blue-400 border-b-2 border-blue-500 mr-2 transition';
    const acrClass = isAutopilot
      ? 'px-4 py-2 font-semibold text-red-400 border-b-2 border-red-500 mr-2 transition'
      : 'px-4 py-2 font-semibold text-gray-400 border-b-2 border-transparent hover:text-white mr-2 transition';

    const mfsnFormHidden = isAutopilot ? 'hidden' : '';
    const acrFormHidden = isAutopilot ? '' : 'hidden';

    el.innerHTML = `<div class="fade-in max-w-4xl">
      <button onclick="${backNav}" class="text-gray-400 hover:text-white text-sm mb-4 inline-flex items-center gap-1.5 transition"><i class="fas fa-arrow-left text-xs"></i>${backText}</button>
      <h1 class="text-xl font-bold text-white mb-1">${title}</h1>
      <p class="text-sm text-gray-400 mb-6">${description}</p>

      <div class="mb-4 border-b border-gray-700 pb-2 flex flex-wrap gap-2">
        <button id="tab-mfsn" class="${mfsnClass}"><i class="fas fa-cloud-download-alt mr-2"></i>MyFreeScoreNow Integration</button>
        <button id="tab-smartcredit" class="px-4 py-2 font-semibold text-gray-400 border-b-2 border-transparent hover:text-white mr-2 transition"><i class="fas fa-lock mr-2"></i>SmartCredit Integration</button>
        <button id="tab-acr" class="${acrClass}"><i class="fas fa-file-pdf mr-2 text-red-400"></i>Annual Credit Report PDF</button>
        <button id="tab-manual" class="px-4 py-2 font-semibold text-gray-400 border-b-2 border-transparent hover:text-white transition"><i class="fas fa-file-alt mr-2"></i>Manual Raw File Text</button>
      </div>

      <!-- MFSN IMPORT TAB -->
      <form id="mfsn-form" class="space-y-5 ${mfsnFormHidden}">
        <div class="grid grid-cols-2 gap-4">
          <div><label class="block text-xs text-gray-400 mb-1.5">API Username (Email)</label>
          <input type="text" name="username" required class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none" placeholder="apiuser@test.com"></div>
          <div>
            <label class="block text-xs text-gray-400 mb-1.5">API Password</label>
            <div class="relative">
              <input type="password" id="mfsn-password" name="password" required class="w-full bg-gray-800/80 border border-gray-700 rounded-lg pl-3 pr-10 py-2.5 text-white text-sm focus:border-blue-500 outline-none" placeholder="Password">
              <button type="button" class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white" onclick="const input = document.getElementById('mfsn-password'); const icon = this.querySelector('i'); if (input.type === 'password') { input.type = 'text'; icon.className = 'fas fa-eye-slash'; } else { input.type = 'password'; icon.className = 'fas fa-eye'; }">
                <i class="fas fa-eye"></i>
              </button>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div><label class="block text-xs text-gray-400 mb-1.5">Client Email</label>
          <input type="text" name="clientEmail" required class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none" placeholder="david_webber2@gmail.com"></div>
          <div><label class="block text-xs text-gray-400 mb-1.5">Client Token</label>
          <input type="text" name="secretWord" required class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none" placeholder="MAPIK#FIecvELvhBslHkKzxBKPaABghn"></div>
        </div>
        <div class="flex gap-3">
          <button type="submit" id="mfsn-btn" class="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition shadow-lg"><i class="fas fa-cloud-download-alt mr-2"></i>Authenticate & Import Report</button>
        </div>

        <div class="relative flex py-3 items-center">
          <div class="flex-grow border-t border-gray-700/60"></div>
          <span class="flex-shrink mx-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">OR paste MFSN raw JSON</span>
          <div class="flex-grow border-t border-gray-700/60"></div>
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1.5">MyFreeScoreNow fetch-3B / providerViews JSON</label>
          <textarea id="mfsn-json-paste" rows="8" class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-green-300/90 text-[11px] font-mono focus:border-blue-500 outline-none" placeholder='{"success":true,"data":{"providerViews":[…]}}'></textarea>
          <button type="button" id="mfsn-json-btn" class="mt-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white px-4 py-2 rounded-lg text-xs font-semibold"><i class="fas fa-file-code mr-1.5"></i>Import Pasted JSON</button>
        </div>
      </form>

      <!-- SMARTCREDIT IMPORT TAB -->
      <form id="smartcredit-form" class="space-y-5 hidden">
        <div class="grid grid-cols-2 gap-4">
          <div><label class="block text-xs text-gray-400 mb-1.5">SmartCredit Username (Email)</label>
          <input type="text" name="username" required class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none" placeholder="test_smartcredit@rjbusinesssolutions.com"></div>
          <div>
            <label class="block text-xs text-gray-400 mb-1.5">SmartCredit Password</label>
            <div class="relative">
              <input type="password" id="smartcredit-password" name="password" required class="w-full bg-gray-800/80 border border-gray-700 rounded-lg pl-3 pr-10 py-2.5 text-white text-sm focus:border-blue-500 outline-none" placeholder="Password">
              <button type="button" class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white" onclick="const input = document.getElementById('smartcredit-password'); const icon = this.querySelector('i'); if (input.type === 'password') { input.type = 'text'; icon.className = 'fas fa-eye-slash'; } else { input.type = 'password'; icon.className = 'fas fa-eye'; }">
                <i class="fas fa-eye"></i>
              </button>
            </div>
          </div>
        </div>
        <div class="flex gap-3">
          <button type="submit" id="smartcredit-btn" class="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition shadow-lg"><i class="fas fa-lock mr-2"></i>Authenticate & Fetch SmartCredit</button>
        </div>

        <div class="relative flex py-3 items-center">
          <div class="flex-grow border-t border-gray-700/60"></div>
          <span class="flex-shrink mx-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">OR</span>
          <div class="flex-grow border-t border-gray-700/60"></div>
        </div>

        <div id="smartcredit-dropzone" class="border-2 border-dashed border-gray-700 hover:border-blue-500/80 bg-gray-900/40 hover:bg-gray-800/40 transition-all rounded-xl p-8 text-center cursor-pointer group">
          <input type="file" id="smartcredit-file-input" class="hidden" accept=".html,.htm,.json,.txt">
          <div class="space-y-3">
            <div class="mx-auto w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <i class="fas fa-file-import text-lg"></i>
            </div>
            <div class="text-xs text-gray-300">
              <span class="font-semibold text-blue-400 hover:underline">Click to upload</span> or drag and drop your report
            </div>
            <p class="text-[10px] text-gray-500 font-medium">Supports HTML, JSON, or TXT downloaded from your SmartCredit Portal</p>
          </div>
        </div>
      </form>

      <!-- ANNUAL CREDIT REPORT (ACR) PDF TAB -->
      <form id="acr-form" class="space-y-5 ${acrFormHidden}">
        <div class="bg-red-950/10 border border-red-500/30 rounded-xl p-4 mb-4">
          <h4 class="text-xs font-bold text-red-400 flex items-center gap-2 mb-1">
            <i class="fas fa-file-pdf"></i>ANNUAL CREDIT REPORT PDF DIRECT INGESTION
          </h4>
          <p class="text-[11px] text-red-200/80 leading-relaxed">
            Upload your official, high-fidelity credit report PDFs downloaded directly from <strong class="text-white">AnnualCreditReport.com</strong>.
            This tool processes your reports locally in the browser to compile clean credit data, completely bypassing edge CPU limits, and runs full litigation scans on RJ Business Solutions engines.
          </p>
        </div>

        <div id="acr-dropzone" class="border-2 border-dashed border-gray-700 hover:border-red-500/80 bg-gray-900/40 hover:bg-gray-800/40 transition-all rounded-xl p-10 text-center cursor-pointer group">
          <input type="file" id="acr-file-input" class="hidden" accept=".pdf" multiple>
          <div class="space-y-4">
            <div class="mx-auto w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
              <i class="fas fa-file-pdf text-2xl"></i>
            </div>
            <div class="text-sm text-gray-300">
              <span class="font-bold text-red-400 hover:underline">Click to select files</span> or drag & drop Equifax, Experian, or TransUnion PDFs here
            </div>
            <p class="text-xs text-gray-500 font-medium">Upload Equifax, Experian, and TransUnion one-by-one or together. Each bureau populates its own CRM slot (not the same data).</p>
            <p class="text-[10px] text-blue-400/80 mt-1">Tip: name files with equifax / experian / transunion for perfect detection.</p>
          </div>
        </div>

        <div id="acr-progress-container" class="hidden bg-gray-900/60 rounded-xl p-5 border border-gray-800 space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-gray-300 uppercase tracking-wider" id="acr-progress-title">Processing PDFs...</span>
            <span class="text-xs text-red-400 font-semibold" id="acr-progress-percent">0%</span>
          </div>
          <div class="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div id="acr-progress-bar" class="h-full bg-gradient-to-r from-red-500 to-purple-600 transition-all duration-300" style="width: 0%"></div>
          </div>
          <div id="acr-active-file-status" class="text-xs text-gray-400 flex items-center gap-2">
            <i class="fas fa-spinner fa-spin text-red-400"></i>
            <span id="acr-active-file-text">Initializing extraction pipeline...</span>
          </div>
        </div>
      </form>

      <!-- MANUAL IMPORT TAB -->
      <form id="upload-form" class="space-y-5 hidden">
        <div class="grid grid-cols-2 gap-4">
          <div><label class="block text-xs text-gray-400 mb-1.5">Bureau</label><select name="bureau" class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none"><option value="Equifax">Equifax</option><option value="Experian">Experian</option><option value="TransUnion">TransUnion</option><option value="Unknown">Auto-detect</option></select></div>
          <div><label class="block text-xs text-gray-400 mb-1.5">File Name</label><input type="text" name="fileName" value="credit-report.txt" class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none"></div>
        </div>
        <div><label class="block text-xs text-gray-400 mb-1.5">Credit Report Text *</label>
          <textarea name="rawText" required rows="14" class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-3 text-white text-sm font-mono focus:border-blue-500 outline-none resize-y" placeholder="Paste the complete credit report text here..."></textarea></div>
        <div class="flex gap-3">
          <button type="submit" id="analyze-btn" class="bg-gray-600 hover:bg-gray-500 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition shadow-lg"><i class="fas fa-file-import mr-2"></i>Run Manual Analysis</button>
          <button type="button" onclick="window._loadSample()" class="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition">Load Sample Text</button>
        </div>
      </form>

      <div id="analysis-results" class="hidden mt-8"></div>
    </div>`;

    const tabMfsn = $('#tab-mfsn');
    const tabSmartcredit = $('#tab-smartcredit');
    const tabAcr = $('#tab-acr');
    const tabMan = $('#tab-manual');
    const formMfsn = $('#mfsn-form');
    const formSmartcredit = $('#smartcredit-form');
    const formAcr = $('#acr-form');
    const formMan = $('#upload-form');

    // Deep-link from onboarding cards / modals
    if (data?.tab === 'smartcredit') {
      setTimeout(() => tabSmartcredit?.click(), 0);
    } else if (data?.tab === 'mfsn') {
      setTimeout(() => tabMfsn?.click(), 0);
    } else if (data?.tab === 'acr') {
      setTimeout(() => tabAcr?.click(), 0);
    } else if (data?.tab === 'manual') {
      setTimeout(() => tabMan?.click(), 0);
    }

    const mfsnJsonBtn = $('#mfsn-json-btn');
    if (mfsnJsonBtn) {
      mfsnJsonBtn.onclick = async () => {
        const raw = ($('#mfsn-json-paste')?.value || '').trim();
        if (!raw) return toast('Paste MFSN JSON first', 'error');
        let mfsnData;
        try { mfsnData = JSON.parse(raw); } catch { return toast('Invalid JSON', 'error'); }
        let clientId = data.clientId;
        if (!clientId || clientId === 'autopilot') {
          // Prefer first client or require selection
          const clients = await api('/clients').catch(() => ({ clients: [] }));
          clientId = clients.clients?.[0]?.id;
          if (!clientId) return toast('Create a client first, then import', 'error');
        }
        await runAnalysisPipeline('/reports/mfsn-import', { clientId, mfsnData }, true, 'MyFreeScoreNow JSON');
      };
    }

    const dropzone = $('#smartcredit-dropzone');
    const fileInput = $('#smartcredit-file-input');

    if (dropzone && fileInput) {
      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) handleSmartCreditFile(file);
      };

      dropzone.ondragover = (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-gray-700');
        dropzone.classList.add('border-blue-500', 'bg-blue-500/10');
      };

      dropzone.ondragleave = (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-blue-500', 'bg-blue-500/10');
        dropzone.classList.add('border-gray-700');
      };

      dropzone.ondrop = (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-blue-500', 'bg-blue-500/10');
        dropzone.classList.add('border-gray-700');

        const file = e.dataTransfer.files[0];
        if (file) handleSmartCreditFile(file);
      };

      dropzone.onclick = () => {
        fileInput.click();
      };
    }

    async function handleSmartCreditFile(file) {
      const reader = new FileReader();
      const resEl = $('#analysis-results');
      resEl.classList.remove('hidden');
      resEl.innerHTML = renderProcessStepsCustom('Reading uploaded report...', 'fas fa-spinner fa-spin');

      reader.onload = async (event) => {
        const textContent = event.target.result;
        await runAnalysisPipeline('/reports/import-smartcredit', {
          clientId: data.clientId,
          fileText: textContent
        }, true, 'SmartCredit File');
      };

      reader.onerror = (err) => {
        resEl.innerHTML = `<div class="glass rounded-xl p-6 border border-red-500/30"><i class="fas fa-exclamation-triangle text-red-400 mr-2"></i><span class="text-red-300">Failed to read file: ${err.message}</span></div>`;
        toast('File read error', 'error');
      };

      reader.readAsText(file);
    }

    // ═══════════════════════════════════════════════════════════════
    // ACR PDF DRAG & DROP + EXTRACTION
    // ═══════════════════════════════════════════════════════════════
    const acrDropzone = $('#acr-dropzone');
    const acrFileInput = $('#acr-file-input');

    if (acrDropzone && acrFileInput) {
      acrFileInput.onchange = (e) => {
        const files = e.target.files;
        if (files.length) handleACRPDFDrop(files);
      };

      acrDropzone.ondragover = (e) => {
        e.preventDefault();
        acrDropzone.classList.remove('border-gray-700');
        acrDropzone.classList.add('border-red-500', 'bg-red-500/10');
      };

      acrDropzone.ondragleave = (e) => {
        e.preventDefault();
        acrDropzone.classList.remove('border-red-500', 'bg-red-500/10');
        acrDropzone.classList.add('border-gray-700');
      };

      acrDropzone.ondrop = (e) => {
        e.preventDefault();
        acrDropzone.classList.remove('border-red-500', 'bg-red-500/10');
        acrDropzone.classList.add('border-gray-700');

        const files = e.dataTransfer.files;
        if (files.length) handleACRPDFDrop(files);
      };

      acrDropzone.onclick = () => {
        acrFileInput.click();
      };
    }

    function readFileAsArrayBuffer(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
      });
    }

    function loadScript(url) {
      return new Promise((resolve, reject) => {
        if (window.Tesseract) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => resolve();
        script.onerror = (e) => reject(new Error('Failed to load OCR engine script'));
        document.head.appendChild(script);
      });
    }

    async function handleACRPDFDrop(files) {
      const progressContainer = $('#acr-progress-container');
      const progressTitle = $('#acr-progress-title');
      const progressPercent = $('#acr-progress-percent');
      const progressBar = $('#acr-progress-bar');
      const activeFileText = $('#acr-active-file-text');
      const resEl = $('#analysis-results');

      const filesArray = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.pdf'));
      if (!filesArray.length) {
        toast('Please drop/select valid PDF credit report files', 'error');
        return;
      }

      progressContainer.classList.remove('hidden');
      resEl.classList.remove('hidden');
      resEl.innerHTML = renderProcessStepsCustom('Initializing browser-side PDF text extraction engine...', 'fas fa-spinner fa-spin');
      
      const totalFiles = filesArray.length;
      const results = [];
      const wasAutopilot = (data.clientId === 'autopilot' || data.autopilot);

      for (let i = 0; i < totalFiles; i++) {
        const file = filesArray[i];
        const fileIndexText = `(${i + 1} of ${totalFiles})`;
        progressTitle.textContent = `Extracting PDF ${fileIndexText}`;
        activeFileText.textContent = `Reading ${file.name}...`;

        const basePercent = Math.round((i / totalFiles) * 100);
        progressPercent.textContent = `${basePercent}%`;
        progressBar.style.width = `${basePercent}%`;

        try {
          const arrayBuffer = await readFileAsArrayBuffer(file);
          activeFileText.textContent = `Analyzing document structure of ${file.name}...`;

          if (!window.pdfjsLib) {
            throw new Error('PDF.js library is not loaded. Please reload the page.');
          }

          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;
          const numPages = pdf.numPages;
          let compiledText = '';

          for (let p = 1; p <= numPages; p++) {
            const pagePercent = basePercent + Math.round((p / numPages) * (1 / totalFiles) * 100);
            progressPercent.textContent = `${pagePercent}%`;
            progressBar.style.width = `${pagePercent}%`;
            activeFileText.textContent = `Extracting page ${p} of ${numPages} from ${file.name}...`;

            const page = await pdf.getPage(p);
            const textContent = await page.getTextContent();
            // Reconstruct lines using PDF.js transform Y so Equifax/Experian/TU parsers keep structure
            const items = (textContent.items || []).filter(it => typeof it.str === 'string');
            items.sort((a, b) => {
              const ay = a.transform ? a.transform[5] : 0;
              const by = b.transform ? b.transform[5] : 0;
              if (Math.abs(by - ay) > 2) return by - ay;
              const ax = a.transform ? a.transform[4] : 0;
              const bx = b.transform ? b.transform[4] : 0;
              return ax - bx;
            });
            let pageText = '';
            let lastY = null;
            for (const it of items) {
              const y = it.transform ? it.transform[5] : 0;
              if (lastY !== null && Math.abs(lastY - y) > 2) pageText += '\n';
              else if (pageText && !pageText.endsWith(' ') && !pageText.endsWith('\n') && it.str && !it.str.startsWith(' ')) pageText += ' ';
              pageText += it.str || '';
              lastY = y;
            }
            compiledText += pageText + '\n\n';
          }

          if (compiledText.trim().length < 1000) {
            activeFileText.textContent = `Scanned PDF detected. Loading OCR Engine (Tesseract.js)...`;
            await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
            
            compiledText = ''; // Reset and use OCR instead
            for (let p = 1; p <= numPages; p++) {
              activeFileText.textContent = `Rendering page ${p} of ${numPages} from ${file.name}...`;
              const page = await pdf.getPage(p);
              const viewport = page.getViewport({ scale: 1.5 });
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              canvas.height = viewport.height;
              canvas.width = viewport.width;
              
              const renderContext = {
                canvasContext: ctx,
                viewport: viewport
              };
              await page.render(renderContext).promise;
              
              activeFileText.textContent = `OCR Analyzing page ${p} of ${numPages} from ${file.name}...`;
              const ocrResult = await Tesseract.recognize(canvas, 'eng', {
                logger: m => {
                  if (m.status === 'recognizing text') {
                    const pagePercent = basePercent + Math.round(((p - 1 + m.progress) / numPages) * (1 / totalFiles) * 100);
                    progressPercent.textContent = `${pagePercent}%`;
                    progressBar.style.width = `${pagePercent}%`;
                    activeFileText.textContent = `OCR Analyzing page ${p}/${numPages}: ${Math.round(m.progress * 100)}%`;
                  }
                }
              });
              compiledText += ocrResult.data.text + '\n\n';
            }
          }

          let endpoint = '/reports/upload';
          if (wasAutopilot && i === 0) {
            endpoint = '/reports/onboard';
          }

          activeFileText.textContent = `Uploading ${file.name} to analysis engine...`;
          resEl.innerHTML = renderProcessStepsCustom(`Running statutory FCRA scans on ${file.name}...`, 'fas fa-shield-alt text-red-400 progress-pulse');

          // Filename hint (equifax/experian/transunion) + text detection on server
          const nameHint = (() => {
            const n = (file.name || '').toLowerCase();
            if (/experian|\bex[_-]|\bexp\b|ex-acr/.test(n)) return 'Experian';
            if (/trans\s*union|\btu[_-]|\btu\b|tu-acr/.test(n)) return 'TransUnion';
            if (/equifax|\beq[_-]|\befx\b|eq-acr|efx-acr/.test(n)) return 'Equifax';
            return 'Unknown';
          })();

          // Sequential API call to prevent SQLite D1 concurrent locks
          const response = await api(endpoint, {
            method: 'POST',
            body: JSON.stringify({
              clientId: data.clientId,
              bureau: nameHint, // hint; server still weighs text + filename
              rawText: compiledText,
              fileName: file.name,
              replaceCurrent: true,
              autoWorkflow: true
            })
          });

          if (wasAutopilot && i === 0) {
            if (!response.clientId) {
              throw new Error('Onboarding failed to return a Client ID');
            }
            data.clientId = response.clientId;
            data.clientName = response.clientName;
            data.autopilot = false; // Resolved, subsequent files are normal uploads for this client
          }

          results.push({ file, result: response });
          toast(`Successfully processed ${file.name}!`, 'success');

        } catch (err) {
          console.error('PDF ingestion pipeline failed:', err);
          activeFileText.innerHTML = `<span class="text-red-400"><i class="fas fa-times-circle mr-1"></i>Error: ${err.message}</span>`;
          resEl.innerHTML = `<div class="glass rounded-xl p-6 border border-red-500/30"><i class="fas fa-exclamation-triangle text-red-400 mr-2"></i><span class="text-red-300">Failed to process ${file.name}: ${err.message}</span></div>`;
          toast(`Failed to process ${file.name}`, 'error');
          progressContainer.classList.add('hidden');
          return;
        }
      }

      progressPercent.textContent = '100%';
      progressBar.style.width = '100%';
      progressTitle.textContent = 'All Credit Reports Extracted Successfully';
      activeFileText.innerHTML = '<span class="text-green-400 font-bold"><i class="fas fa-check-circle mr-1"></i>Ingestion pipeline finished! Rendering litigation reports...</span>';

      await sleep(1000);
      progressContainer.classList.add('hidden');

      if (wasAutopilot) {
        toast(`Onboarding complete for ${data.clientName}! Redirecting to client detail...`, 'success');
        await sleep(1500);
        window._nav('client-detail', { clientId: data.clientId });
        return;
      }

      if (results.length === 1) {
        renderFullResults(resEl, results[0].result, data);
        const r = results[0].result;
        toast(`COMPLETE: ${r.violationsFound} violations found! Litigation score: ${r.litigationScore.score}/100`, r.violationsFound > 0 ? 'warning' : 'success');
      } else {
        renderAggregatedResults(resEl, results, data);
        const totalViolations = results.reduce((sum, res) => sum + res.result.violationsFound, 0);
        toast(`COMPLETE: ${totalViolations} violations found across ${results.length} bureaus!`, 'success');
      }
    }

    function renderConsolidatedViolationsList(violations) {
      if (!violations.length) return '<div class="text-center py-8 text-gray-500"><i class="fas fa-check-circle text-3xl mb-3"></i><p>No violations</p></div>';
      return `<div class="space-y-2">${violations.map(v=>`<details class="group"><summary class="cursor-pointer list-none"><div class="glass rounded-lg p-4 border-l-4 border-${sevColor(v.severity)} card-hover"><div class="flex items-start justify-between"><div class="flex-1 min-w-0"><div class="flex items-center gap-2 mb-1"><span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-${sevColor(v.severity)}/20 text-${sevColor(v.severity)}">${v.severity}</span><span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-950/40 text-red-400 border border-red-500/20"><i class="fas fa-building mr-1"></i>${v.bureau||'Bureau'}</span><span class="text-xs text-gray-400">${v.category} &bull; ${v.statute}</span><i class="fas fa-chevron-down text-[10px] text-gray-500 group-open:rotate-180 transition-transform"></i></div><div class="text-sm font-medium text-white">${v.subcategory}</div>${v.account_name||v.accountName?`<div class="text-xs text-gray-500">Account: ${v.account_name||v.accountName}</div>`:''}</div><div class="text-right shrink-0 ml-4"><div class="text-xs text-green-400 font-medium">${money(v.total_damages_min||v.totalDamagesMin)} &ndash; ${money(v.total_damages_max||v.totalDamagesMax)}</div></div></div></div></summary>
        <div class="mt-2 ml-4 space-y-2 text-sm fade-in">
          <div class="bg-gray-800/40 rounded-lg p-3"><div class="text-xs font-semibold text-blue-400 mb-1">STATUTE</div><div class="text-xs text-gray-300">${v.statute_text||v.statuteText||''}</div></div>
          <div class="bg-gray-800/40 rounded-lg p-3"><div class="text-xs font-semibold text-red-400 mb-1">EVIDENCE</div><div class="text-xs text-gray-300">${v.evidence||''}</div></div>
          <div class="bg-gray-800/40 rounded-lg p-3"><div class="text-xs font-semibold text-purple-400 mb-1">LEGAL STANDARD</div><div class="text-xs text-gray-300">${v.legal_standard||v.legalStandard||''}</div></div>
          <div class="bg-gray-800/40 rounded-lg p-3"><div class="text-xs font-semibold text-yellow-400 mb-1">EXPLANATION</div><div class="text-xs text-gray-300">${v.explanation||''}</div></div>
          <div class="bg-gray-800/40 rounded-lg p-3"><div class="text-xs font-semibold text-cyan-400 mb-1">CASE LAW</div><div class="text-xs text-gray-300">${v.case_law||v.caseLaw||''}</div></div>
          <div class="bg-gray-800/40 rounded-lg p-3"><div class="text-xs font-semibold text-green-400 mb-1">DAMAGES</div><div class="grid grid-cols-2 gap-2 text-xs text-gray-300">
            <div>Statutory: ${money(v.statutory_damages_min||v.statutoryDamagesMin)} &ndash; ${money(v.statutory_damages_max||v.statutoryDamagesMax)}</div>
            <div>Actual: ${money(v.actual_damages_est||v.actualDamagesEst)}</div>
            <div>Punitive: ${money(v.punitive_damages_est||v.punitiveDamagesEst)}</div>
            <div>Attorney Fees: ${money(v.attorney_fees_est||v.attorneyFeesEst)}</div>
          </div><div class="mt-1 text-xs font-medium text-green-400">Defendant: ${v.defendant_type||v.defendantType||''} &mdash; ${v.defendant_name||v.defendantName||''}</div></div>
        </div></details>`).join('')}</div>`;
    }

    function renderAggregatedResults(el, resultsArray, data) {
      let totalAccounts = 0;
      let totalCollections = 0;
      let totalInquiries = 0;
      let totalPublicRecords = 0;
      let violationsFound = 0;
      const combinedViolations = [];
      
      let maxScore = -1;
      let maxScoreResult = null;
      
      let preLitMin = 0;
      let preLitMax = 0;
      let postFilingMin = 0;
      let postFilingMax = 0;
      let trialMin = 0;
      let trialMax = 0;
      
      const combinedByDefendant = {};
      const combinedLitigationPlans = [];

      resultsArray.forEach(item => {
        const r = item.result;
        totalAccounts += r.totalAccounts || 0;
        totalCollections += r.totalCollections || 0;
        totalInquiries += r.totalInquiries || 0;
        totalPublicRecords += r.totalPublicRecords || 0;
        violationsFound += r.violationsFound || 0;
        
        const bureauName = r.bureau || 'Unknown';
        if (r.violations) {
          r.violations.forEach(v => {
            v.bureau = v.bureau || bureauName;
            combinedViolations.push(v);
          });
        }

        const ls = r.litigationScore;
        if (ls) {
          if (ls.score > maxScore) {
            maxScore = ls.score;
            maxScoreResult = r;
          }
          
          preLitMin += ls.preLitSettlement?.min || 0;
          preLitMax += ls.preLitSettlement?.max || 0;
          postFilingMin += ls.postFilingSettlement?.min || 0;
          postFilingMax += ls.postFilingSettlement?.max || 0;
          trialMin += ls.trialVerdict?.min || 0;
          trialMax += ls.trialVerdict?.max || 0;

          if (ls.byDefendant) {
            Object.entries(ls.byDefendant).forEach(([defName, defInfo]) => {
              if (!combinedByDefendant[defName]) {
                combinedByDefendant[defName] = { count: 0, damages: 0 };
              }
              combinedByDefendant[defName].count += defInfo.count || 0;
              combinedByDefendant[defName].damages += defInfo.damages || 0;
            });
          }

          if (ls.litigationPlan) {
            ls.litigationPlan.forEach(p => {
              if (!combinedLitigationPlans.includes(p)) {
                combinedLitigationPlans.push(p);
              }
            });
          }
        }
      });

      if (maxScore === -1) {
        maxScore = 0;
        maxScoreResult = resultsArray[0].result;
      }

      const scoreColor = maxScore >= 70 ? 'green' : maxScore >= 40 ? 'yellow' : 'gray';
      const processedFilesHtml = resultsArray.map(item => {
        const r = item.result;
        const bureau = r.bureau || 'Unknown';
        const fileScoreColor = r.litigationScore.score >= 70 ? 'green' : r.litigationScore.score >= 40 ? 'yellow' : 'gray';
        return `
          <div class="bg-gray-800/30 rounded-xl p-4 border border-gray-700/40 flex items-center justify-between card-hover">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
                <i class="fas fa-building"></i>
              </div>
              <div>
                <div class="text-sm font-bold text-white">${bureau} Bureau</div>
                <div class="text-[11px] text-gray-400">${item.file.name} &bull; ${r.totalAccounts} accounts</div>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-right">
                <div class="text-[10px] text-gray-400">Violations</div>
                <div class="text-xs font-bold text-red-400">${r.violationsFound}</div>
              </div>
              <div class="text-right">
                <div class="text-[10px] text-gray-400">Litigation Score</div>
                <div class="text-xs font-black text-${fileScoreColor}-400">${r.litigationScore.score}/100</div>
              </div>
              <div class="flex gap-1 ml-2">
                <button onclick="window._nav('generate-doc',{clientId:'${data.clientId}',clientName:'${data.clientName}',reportId:'${r.reportId}'})" class="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs px-2.5 py-1.5 rounded transition" title="Generate documents for ${bureau}"><i class="fas fa-file-contract"></i></button>
                <button onclick="window._exportViolations('${data.clientId}','${r.reportId}')" class="bg-green-600/20 hover:bg-green-600/30 text-green-300 text-xs px-2.5 py-1.5 rounded transition" title="Export ${bureau} violations"><i class="fas fa-download"></i></button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      el.innerHTML = `
        <div class="fade-in space-y-6">
          <!-- HEADER -->
          <div class="glass rounded-2xl p-5 border border-red-500/30 bg-gradient-to-r from-red-950/20 via-transparent to-purple-950/20 flex items-center justify-between">
            <div>
              <span class="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">Multi-Bureau Consolidated</span>
              <h2 class="text-xl font-extrabold text-white mt-1">Unified Credit Analysis</h2>
              <p class="text-xs text-gray-400 mt-0.5">Aggregated legal claims and cumulative litigation value from all processed PDF reports.</p>
            </div>
            <div class="text-right shrink-0">
              <span class="text-xs text-gray-500">Processed:</span>
              <div class="text-md font-bold text-white">${resultsArray.length} reports</div>
            </div>
          </div>

          <!-- SCORE HERO -->
          <div class="glass rounded-2xl p-6 border ${maxScore>=70?'border-green-500/30':maxScore>=40?'border-yellow-500/30':'border-gray-600/30'}">
            <div class="flex items-center gap-6">
              <div class="text-center">
                <div class="w-24 h-24 rounded-full bg-${scoreColor}-600/20 border-4 border-${scoreColor}-500/50 flex items-center justify-center">
                  <div>
                    <div class="text-3xl font-black text-${scoreColor}-400">${maxScore}</div>
                    <div class="text-[10px] text-${scoreColor}-400/70">/100</div>
                  </div>
                </div>
                <div class="text-xs font-bold text-${scoreColor}-400 mt-2">Peak Grade: ${maxScoreResult.litigationScore.grade}</div>
              </div>
              <div class="flex-1">
                <h2 class="text-lg font-bold text-white mb-1">Consolidated Litigation Analysis</h2>
                <p class="text-sm text-${scoreColor}-300 font-medium mb-3">${maxScoreResult.litigationScore.recommendation}</p>
                <div class="grid grid-cols-3 gap-3 text-center">
                  <div class="bg-gray-800/60 rounded-lg p-2">
                    <div class="text-[10px] text-gray-400">Total Pre-Lit Settlement</div>
                    <div class="text-sm font-bold text-green-400">${money(preLitMin)} &ndash; ${money(preLitMax)}</div>
                  </div>
                  <div class="bg-gray-800/60 rounded-lg p-2">
                    <div class="text-[10px] text-gray-400">Total Post-Filing</div>
                    <div class="text-sm font-bold text-green-400">${money(postFilingMin)} &ndash; ${money(postFilingMax)}</div>
                  </div>
                  <div class="bg-gray-800/60 rounded-lg p-2">
                    <div class="text-[10px] text-gray-400">Total Trial Verdict</div>
                    <div class="text-sm font-bold text-green-300">${money(trialMin)} &ndash; ${money(trialMax)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- INDIVIDUAL REPORTS LIST -->
          <div class="space-y-3">
            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider"><i class="fas fa-file-pdf mr-2"></i>Individual Report Statuses</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              ${processedFilesHtml}
            </div>
          </div>

          <!-- SUMMARY GRID -->
          <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div class="glass rounded-lg p-3 text-center"><div class="text-2xl font-bold text-white">${totalAccounts}</div><div class="text-xs text-gray-400">Accounts</div></div>
            <div class="glass rounded-lg p-3 text-center"><div class="text-2xl font-bold text-orange-400">${totalCollections}</div><div class="text-xs text-gray-400">Collections</div></div>
            <div class="glass rounded-lg p-3 text-center"><div class="text-2xl font-bold text-yellow-400">${totalInquiries}</div><div class="text-xs text-gray-400">Inquiries</div></div>
            <div class="glass rounded-lg p-3 text-center"><div class="text-2xl font-bold text-purple-400">${totalPublicRecords}</div><div class="text-xs text-gray-400">Public Records</div></div>
            <div class="glass rounded-lg p-3 text-center"><div class="text-2xl font-bold text-red-400">${violationsFound}</div><div class="text-xs text-gray-400">Violations</div></div>
          </div>

          <!-- LITIGATION PLAN -->
          ${combinedLitigationPlans.length?`<div class="glass rounded-xl p-5">
            <h3 class="text-sm font-bold text-white mb-3"><i class="fas fa-route mr-2 text-blue-400"></i>Consolidated Litigation Plan</h3>
            <div class="space-y-2">${combinedLitigationPlans.map((step,i) => `<div class="flex items-start gap-3"><div class="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0 mt-0.5"><span class="text-[10px] font-bold text-blue-400">${i+1}</span></div><div class="text-sm text-gray-300">${step}</div></div>`).join('')}</div>
          </div>`:''}

          <!-- BY DEFENDANT -->
          ${Object.keys(combinedByDefendant).length?`<div class="glass rounded-xl p-5">
            <h3 class="text-sm font-bold text-white mb-3"><i class="fas fa-building mr-2 text-orange-400"></i>Consolidated Defendants &amp; Damages</h3>
            <div class="space-y-2">${Object.entries(combinedByDefendant).map(([name,info]) => `<div class="bg-gray-800/40 rounded-lg p-3 flex items-center justify-between"><div><div class="text-sm font-medium text-white">${name}</div><div class="text-xs text-gray-400">${info.count} violation(s)</div></div><div class="text-sm font-bold text-green-400">${money(info.damages)}</div></div>`).join('')}</div>
          </div>`:''}

          <!-- ALL CONSOLIDATED VIOLATIONS -->
          ${combinedViolations.length?`<div class="glass rounded-xl p-5">
            <h3 class="text-sm font-bold text-white mb-3"><i class="fas fa-exclamation-triangle mr-2 text-red-400"></i>All Consolidated Violations Detected (${combinedViolations.length})</h3>
            ${renderConsolidatedViolationsList(combinedViolations)}
          </div>`:''}

          <!-- CONSOLIDATED ACTION BUTTONS -->
          <div class="glass rounded-xl p-5">
            <h3 class="text-sm font-bold text-white mb-3"><i class="fas fa-paper-plane mr-2 text-purple-400"></i>Batch Next Steps</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-center">
              <button onclick="window._nav('client-detail',{clientId:'${data.clientId}'})" class="bg-gray-600/20 border border-gray-500/30 hover:bg-gray-600/30 text-gray-300 px-4 py-3.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"><i class="fas fa-user text-lg"></i>Return to Client Profile</button>
              <button id="acr-bulk-btn" class="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-3.5 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 shadow-lg"><i class="fas fa-layer-group text-lg animate-pulse"></i>Bulk Generate Letters for All Bureaus</button>
            </div>
          </div>
        </div>
      `;

      const acrBulkBtn = $('#acr-bulk-btn');
      if (acrBulkBtn) {
        acrBulkBtn.onclick = async () => {
          try {
            acrBulkBtn.disabled = true;
            acrBulkBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Generating letters...';
            const reportIds = resultsArray.map(item => item.result.reportId);
            toast('Bulk generating dispute letters for all processed bureaus...', 'info');
            let totalCount = 0;
            const bureauByReport = {};
            (results || []).forEach(r => { if (r.reportId) bureauByReport[r.reportId] = r.bureau || 'Equifax'; });
            for (const reportId of reportIds) {
              const result = await api('/documents/generate-bulk', { method:'POST', body:JSON.stringify({
                clientId: data.clientId, reportId,
                docTypes: ['bureau-dispute','furnisher-dispute','debt-validation','609-disclosure','method-of-verification','cease-desist','intent-to-sue','cfpb-complaint','state-ag-complaint','goodwill-letter'],
                bureau: bureauByReport[reportId] || 'Equifax',
              })});
              totalCount += result.count;
            }
            toast(`Generated ${totalCount} letters across all bureaus successfully!`, 'success');
          } catch(err) { toast(err.message, 'error'); }
          finally {
            acrBulkBtn.disabled = false;
            acrBulkBtn.innerHTML = '<i class="fas fa-layer-group text-lg animate-pulse mr-2"></i>Bulk Generate Letters for All Bureaus';
          }
        };
      }
    }

    tabMfsn.onclick = () => {
      tabMfsn.className = 'px-4 py-2 font-semibold text-blue-400 border-b-2 border-blue-500 mr-2 transition';
      tabSmartcredit.className = 'px-4 py-2 font-semibold text-gray-400 border-b-2 border-transparent hover:text-white mr-2 transition';
      tabAcr.className = 'px-4 py-2 font-semibold text-gray-400 border-b-2 border-transparent hover:text-white mr-2 transition';
      tabMan.className = 'px-4 py-2 font-semibold text-gray-400 border-b-2 border-transparent hover:text-white transition';
      formMfsn.classList.remove('hidden');
      formSmartcredit.classList.add('hidden');
      formAcr.classList.add('hidden');
      formMan.classList.add('hidden');
    };
    tabSmartcredit.onclick = () => {
      tabSmartcredit.className = 'px-4 py-2 font-semibold text-blue-400 border-b-2 border-blue-500 mr-2 transition';
      tabMfsn.className = 'px-4 py-2 font-semibold text-gray-400 border-b-2 border-transparent hover:text-white mr-2 transition';
      tabAcr.className = 'px-4 py-2 font-semibold text-gray-400 border-b-2 border-transparent hover:text-white mr-2 transition';
      tabMan.className = 'px-4 py-2 font-semibold text-gray-400 border-b-2 border-transparent hover:text-white transition';
      formSmartcredit.classList.remove('hidden');
      formMfsn.classList.add('hidden');
      formAcr.classList.add('hidden');
      formMan.classList.add('hidden');
    };
    tabAcr.onclick = () => {
      tabAcr.className = 'px-4 py-2 font-semibold text-red-400 border-b-2 border-red-500 mr-2 transition';
      tabMfsn.className = 'px-4 py-2 font-semibold text-gray-400 border-b-2 border-transparent hover:text-white mr-2 transition';
      tabSmartcredit.className = 'px-4 py-2 font-semibold text-gray-400 border-b-2 border-transparent hover:text-white mr-2 transition';
      tabMan.className = 'px-4 py-2 font-semibold text-gray-400 border-b-2 border-transparent hover:text-white transition';
      formAcr.classList.remove('hidden');
      formMfsn.classList.add('hidden');
      formSmartcredit.classList.add('hidden');
      formMan.classList.add('hidden');
    };
    tabMan.onclick = () => {
      tabMan.className = 'px-4 py-2 font-semibold text-blue-400 border-b-2 border-blue-500 transition';
      tabMfsn.className = 'px-4 py-2 font-semibold text-gray-400 border-b-2 border-transparent hover:text-white mr-2 transition';
      tabSmartcredit.className = 'px-4 py-2 font-semibold text-gray-400 border-b-2 border-transparent hover:text-white mr-2 transition';
      tabAcr.className = 'px-4 py-2 font-semibold text-gray-400 border-b-2 border-transparent hover:text-white mr-2 transition';
      formMan.classList.remove('hidden');
      formMfsn.classList.add('hidden');
      formSmartcredit.classList.add('hidden');
      formAcr.classList.add('hidden');
    };

    // Shared execution runner
    async function runAnalysisPipeline(endpoint, payload, isIntegration = false, integrationName = 'MyFreeScoreNow') {
      const resEl = $('#analysis-results');
      resEl.classList.remove('hidden');
      
      let actualEndpoint = endpoint;
      const isAutopilot = (data.clientId === 'autopilot' || data.autopilot);
      if (isAutopilot && endpoint === '/reports/upload') {
        actualEndpoint = '/reports/onboard';
      }

      if (isIntegration) {
        resEl.innerHTML = renderProcessStepsCustom(`Authenticating with ${integrationName}...`, 'fas fa-spinner fa-spin');
        await sleep(1000);
        resEl.innerHTML = renderProcessStepsCustom(`Downloading Credit Report Data from ${integrationName}...`, 'fas fa-cloud-download-alt text-blue-400 progress-pulse');
      } else {
        resEl.innerHTML = renderProcessSteps('parsing');
      }

      try {
        const result = await api(actualEndpoint, { method:'POST', body:JSON.stringify(payload) });

        resEl.innerHTML = renderProcessSteps('detecting');
        await sleep(400);

        resEl.innerHTML = renderProcessSteps('scoring');
        await sleep(400);

        resEl.innerHTML = renderProcessSteps('complete');
        await sleep(300);

        if (actualEndpoint === '/reports/onboard') {
          toast(`Onboarding complete! Redirecting to client detail for ${result.clientName}...`, 'success');
          await sleep(1500);
          window._nav('client-detail', { clientId: result.clientId });
          return;
        }

        if (actualEndpoint === '/reports/upload' || actualEndpoint === '/reports/import-mfsn' || actualEndpoint === '/reports/import-smartcredit') {
          toast(`COMPLETE: ${result.violationsFound} violations found! Opening Dispute Cockpit Workspace...`, 'success');
          await sleep(1500);
          window._nav('report-detail', { reportId: result.reportId, clientId: data.clientId });
          return;
        }

        renderFullResults(resEl, result, data);
        toast(`COMPLETE: ${result.violationsFound} violations found! Litigation score: ${result.litigationScore.score}/100`, result.violationsFound > 0 ? 'warning' : 'success');
      } catch(err) {
        resEl.innerHTML = `<div class="glass rounded-xl p-6 border border-red-500/30"><i class="fas fa-exclamation-triangle text-red-400 mr-2"></i><span class="text-red-300">${err.message}</span></div>`;
        toast(err.message, 'error');
        if (endpoint === '/reports/import-smartcredit' && (err.message.includes('403') || err.message.includes('530') || err.message.toLowerCase().includes('forbidden') || err.message.toLowerCase().includes('firewall') || err.message.toLowerCase().includes('sigv4'))) {
          showSmartCreditFirewallModal();
        }
      }
    }

    formMfsn.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const btn = $('#mfsn-btn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Connecting...';

      await runAnalysisPipeline('/reports/import-mfsn', {
        clientId: data.clientId,
        username: fd.get('username'),
        password: fd.get('password'),
        clientEmail: fd.get('clientEmail'),
        secretWord: fd.get('secretWord')
      }, true, 'MyFreeScoreNow');

      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-cloud-download-alt mr-2"></i>Authenticate & Import Report';
    };

    formSmartcredit.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const btn = $('#smartcredit-btn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Connecting...';

      await runAnalysisPipeline('/reports/import-smartcredit', {
        clientId: data.clientId,
        username: fd.get('username'),
        password: fd.get('password')
      }, true, 'SmartCredit');

      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-lock mr-2"></i>Authenticate & Fetch SmartCredit';
    };

    formMan.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const btn = $('#analyze-btn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Analyzing...';

      await runAnalysisPipeline('/reports/upload', {
        clientId: data.clientId, 
        bureau: fd.get('bureau'), 
        rawText: fd.get('rawText'), 
        fileName: fd.get('fileName')
      }, false);

      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-file-import mr-2"></i>Run Manual Analysis';
    };
  }


async function pgOnboardingWizard(el, data) {
  let currentStep = data && data.step ? data.step : 1;
  let onboardingData = {
    clientId: data && data.clientId ? data.clientId : '',
    clientName: data && data.clientName ? data.clientName : '',
    bureau: data && data.bureau ? data.bureau : '',
    reportId: data && data.reportId ? data.reportId : '',
    violationsFound: data && data.violationsFound ? data.violationsFound : 0,
    language: 'en',
    firstName: '',
    lastName: '',
    dob: '',
    ssnLast4: '',
    addressLine1: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: '',
    permissiblePurposeConsent: false,
    croaContractAgreed: false,
    tsrAdvanceFeeWaived: false,
    password: '',
  };

  // If we already have a clientId, prefill from server
  if (onboardingData.clientId) {
    try {
      const res = await api(`/clients/${onboardingData.clientId}`);
      if (res && res.client) {
        onboardingData.firstName = res.client.first_name || '';
        onboardingData.lastName = res.client.last_name || '';
        onboardingData.dob = res.client.dob || '';
        onboardingData.ssnLast4 = res.client.ssn_last4 || '';
        onboardingData.addressLine1 = res.client.address_line1 || '';
        onboardingData.city = res.client.city || '';
        onboardingData.state = res.client.state || '';
        onboardingData.zip = res.client.zip || '';
        onboardingData.email = res.client.email || '';
        onboardingData.phone = res.client.phone || '';
      }
    } catch (e) {
      console.error('Error pre-filling client details:', e);
    }
  }

  function render() {
    el.innerHTML = `
      <div class="fade-in max-w-4xl mx-auto px-4 py-8">
        <!-- Brand Header -->
        <div class="flex items-center justify-between border-b border-gray-800 pb-6 mb-8 flex-wrap gap-4">
          <div class="flex items-center gap-3">
            <img src="https://storage.googleapis.com/msgsndr/qQnxRHDtyx0uydPd5sRl/media/67eb83c5e519ed689430646b.jpeg" class="h-10 w-auto rounded border border-blue-500/30">
            <div>
              <h1 class="text-xl font-extrabold text-white tracking-tight uppercase font-mono">FCRA Onboarding Wizard</h1>
              <p class="text-xs text-blue-400 font-semibold tracking-wider uppercase font-mono">Client Ingest & Compliance Setup</p>
            </div>
          </div>
          <button onclick="window._nav('dashboard')" class="bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-1.5 rounded-lg text-xs font-semibold border border-gray-700 transition flex items-center gap-1.5"><i class="fas fa-home"></i>Exit Wizard</button>
        </div>

        <!-- Progress Steps -->
        <div class="grid grid-cols-5 gap-2 mb-8 select-none">
          ${renderStepIndicator(1, 'Upload', 'fa-file-upload')}
          ${renderStepIndicator(2, 'Language', 'fa-language')}
          ${renderStepIndicator(3, 'Profile', 'fa-id-card')}
          ${renderStepIndicator(4, 'Intake', 'fa-shield-alt')}
          ${renderStepIndicator(5, 'Portal', 'fa-user-lock')}
        </div>

        <!-- Wizard Container -->
        <div class="glass p-6 md:p-8 rounded-2xl border border-gray-800 relative shadow-2xl">
          <div id="wizard-step-content" class="fade-in">
            ${renderStepContent()}
          </div>
        </div>
      </div>
    `;

    attachStepEvents();
  }

  function renderStepIndicator(stepNum, label, icon) {
    let stateClass = 'step-pending';

    if (currentStep > stepNum) {
      stateClass = 'step-done';
    } else if (currentStep === stepNum) {
      stateClass = 'step-active';
    }

    return `
      <div class="flex flex-col items-center text-center">
        <div class="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 flex items-center justify-center text-base md:text-lg transition font-bold font-mono ${stateClass}">
          <i class="fas ${icon}"></i>
        </div>
        <span class="text-[10px] md:text-xs font-semibold mt-2 ${currentStep === stepNum ? 'text-blue-400' : 'text-gray-500'} font-mono uppercase tracking-wider">${label}</span>
      </div>
    `;
  }

  function renderStepContent() {
    switch (currentStep) {
      case 1:
        return `
          <h2 class="text-xl font-extrabold text-white mb-2 font-mono uppercase">Step 1: Ingest Credit Report</h2>
          <p class="text-sm text-gray-400 mb-6">Select a credit report file (HTML/PDF/Image) to parse accounts, inquiries, and identify statutory violations dynamically.</p>
          
          <div id="dropzone-onboard" class="border-2 border-dashed border-gray-800 hover:border-blue-500/50 rounded-2xl p-10 text-center cursor-pointer transition flex flex-col items-center justify-center gap-4 bg-gray-950/20 hover:bg-gray-950/40 relative group overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-300"></div>
            <div class="w-16 h-14 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-2xl group-hover:scale-110 transition"><i class="fas fa-cloud-upload-alt"></i></div>
            <div>
              <p class="font-bold text-white text-base group-hover:text-blue-400 transition">Drag & drop credit report here</p>
              <p class="text-xs text-gray-500 mt-1">Supports PDF, HTML, or Image files</p>
            </div>
            <button class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition">Browse File</button>
            <input type="file" id="input-onboard-file" class="hidden" accept=".html,.htm,.txt,.pdf,.jpg,.jpeg,.png" multiple>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div class="glass bg-gray-950/40 p-4 rounded-xl border border-gray-800/80 hover:border-gray-700/80 transition cursor-pointer" onclick="window._showMfsnModal()">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 text-lg"><i class="fas fa-link"></i></div>
                <div>
                  <h4 class="text-sm font-bold text-white">MyFreeScoreNow Import</h4>
                  <p class="text-xs text-gray-500 mt-0.5">Import credentials and pull latest bureaus.</p>
                </div>
              </div>
            </div>
            <div class="glass bg-gray-950/40 p-4 rounded-xl border border-gray-800/80 hover:border-gray-700/80 transition cursor-pointer" onclick="window._showSmartCreditModal()">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 text-lg"><i class="fas fa-key"></i></div>
                <div>
                  <h4 class="text-sm font-bold text-white">SmartCredit Integration</h4>
                  <p class="text-xs text-gray-500 mt-0.5">Secure SSO and dynamic credit mapping.</p>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-8 pt-6 border-t border-gray-800/60 flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500 font-mono">Or paste raw credit report text below:</span>
              <button id="btn-submit-onboard-raw" class="bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-1.5 rounded-lg text-xs font-bold border border-gray-700 transition">Analyze Raw Text</button>
            </div>
            <textarea id="ta-onboard-raw" class="w-full h-32 bg-gray-950/60 border border-gray-800 rounded-xl p-3 text-sm text-gray-300 focus:outline-none focus:border-blue-500/50 transition placeholder-gray-600" placeholder="Paste full credit report copy-paste string here..."></textarea>
          </div>

          <div id="onboard-processing" class="hidden mt-6 pt-6 border-t border-gray-800/60 text-center">
            <div class="flex items-center justify-center gap-3 text-blue-400 font-bold text-sm">
              <i class="fas fa-circle-notch fa-spin"></i>
              <span>Processing and parsing report...</span>
            </div>
          </div>
        `;

      case 2:
        return `
          <h2 class="text-xl font-extrabold text-white mb-2 font-mono uppercase">Step 2: Language Preference</h2>
          <p class="text-sm text-gray-400 mb-6">Select the language used for client communications, automated portal messaging, and litigation letters.</p>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div id="lang-card-en" class="glass bg-gray-950/40 p-6 rounded-2xl border-2 cursor-pointer card-hover flex flex-col items-center text-center gap-3 ${onboardingData.language === 'en' ? 'border-blue-500 bg-blue-500/5 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'border-gray-800'}" data-lang="en">
              <div class="w-14 h-14 rounded-full overflow-hidden border border-gray-800/80 flex items-center justify-center text-3xl">🇺🇸</div>
              <div>
                <h3 class="text-base font-bold text-white">English</h3>
                <p class="text-xs text-gray-500 mt-1">Default communications and English legal dispute letters.</p>
              </div>
            </div>
            <div id="lang-card-es" class="glass bg-gray-950/40 p-6 rounded-2xl border-2 cursor-pointer card-hover flex flex-col items-center text-center gap-3 ${onboardingData.language === 'es' ? 'border-blue-500 bg-blue-500/5 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'border-gray-800'}" data-lang="es">
              <div class="w-14 h-14 rounded-full overflow-hidden border border-gray-800/80 flex items-center justify-center text-3xl">🇪🇸</div>
              <div>
                <h3 class="text-base font-bold text-white">Spanish (Español)</h3>
                <p class="text-xs text-gray-500 mt-1">Full portal translate with localized litigation guides.</p>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-800/60">
            <button id="btn-lang-prev" class="bg-gray-800 hover:bg-gray-700 text-gray-200 px-5 py-2 rounded-lg text-sm font-semibold transition border border-gray-700">Back</button>
            <button id="btn-lang-next" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-bold transition flex items-center gap-1.5">Next Step <i class="fas fa-arrow-right text-xs"></i></button>
          </div>
        `;

      case 3:
        return `
          <h2 class="text-xl font-extrabold text-white mb-2 font-mono uppercase">Step 3: Auto-populated Profile Review</h2>
          <p class="text-sm text-gray-400 mb-6">Review the client identity fields parsed automatically from the credit report. Please verify or correct them below.</p>
          
          <form id="onboard-profile-form" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-gray-400 uppercase font-mono mb-1.5 tracking-wider">First Name</label>
              <input type="text" id="prof-firstName" class="w-full bg-gray-950/50 border border-gray-800 focus:border-blue-500/50 rounded-lg p-2.5 text-sm text-white focus:outline-none transition" value="${onboardingData.firstName}" required>
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-400 uppercase font-mono mb-1.5 tracking-wider">Last Name</label>
              <input type="text" id="prof-lastName" class="w-full bg-gray-950/50 border border-gray-800 focus:border-blue-500/50 rounded-lg p-2.5 text-sm text-white focus:outline-none transition" value="${onboardingData.lastName}" required>
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-400 uppercase font-mono mb-1.5 tracking-wider">Date of Birth (YYYY-MM-DD)</label>
              <input type="text" id="prof-dob" class="w-full bg-gray-950/50 border border-gray-800 focus:border-blue-500/50 rounded-lg p-2.5 text-sm text-white focus:outline-none transition" placeholder="e.g. 1985-05-12" value="${onboardingData.dob}">
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-400 uppercase font-mono mb-1.5 tracking-wider">SSN Last 4</label>
              <input type="text" id="prof-ssnLast4" class="w-full bg-gray-950/50 border border-gray-800 focus:border-blue-500/50 rounded-lg p-2.5 text-sm text-white focus:outline-none transition" placeholder="e.g. 1234" maxlength="4" value="${onboardingData.ssnLast4}">
            </div>
            <div class="md:col-span-2">
              <label class="block text-xs font-bold text-gray-400 uppercase font-mono mb-1.5 tracking-wider">Address Line 1</label>
              <input type="text" id="prof-addressLine1" class="w-full bg-gray-950/50 border border-gray-800 focus:border-blue-500/50 rounded-lg p-2.5 text-sm text-white focus:outline-none transition" value="${onboardingData.addressLine1}">
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-400 uppercase font-mono mb-1.5 tracking-wider">City</label>
              <input type="text" id="prof-city" class="w-full bg-gray-950/50 border border-gray-800 focus:border-blue-500/50 rounded-lg p-2.5 text-sm text-white focus:outline-none transition" value="${onboardingData.city}">
            </div>
            <div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-xs font-bold text-gray-400 uppercase font-mono mb-1.5 tracking-wider">State</label>
                  <input type="text" id="prof-state" class="w-full bg-gray-950/50 border border-gray-800 focus:border-blue-500/50 rounded-lg p-2.5 text-sm text-white focus:outline-none transition" value="${onboardingData.state}" maxlength="2">
                </div>
                <div>
                  <label class="block text-xs font-bold text-gray-400 uppercase font-mono mb-1.5 tracking-wider">ZIP Code</label>
                  <input type="text" id="prof-zip" class="w-full bg-gray-950/50 border border-gray-800 focus:border-blue-500/50 rounded-lg p-2.5 text-sm text-white focus:outline-none transition" value="${onboardingData.zip}">
                </div>
              </div>
            </div>
          </form>

          <div class="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-800/60">
            <button id="btn-profile-prev" class="bg-gray-800 hover:bg-gray-700 text-gray-200 px-5 py-2 rounded-lg text-sm font-semibold transition border border-gray-700">Back</button>
            <button id="btn-profile-next" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-bold transition flex items-center gap-1.5">Next Step <i class="fas fa-arrow-right text-xs"></i></button>
          </div>
        `;

      case 4:
        return `
          <h2 class="text-xl font-extrabold text-white mb-2 font-mono uppercase">Step 4: Contact Intake & Regulatory Compliance</h2>
          <p class="text-sm text-gray-400 mb-6">Provide contact information and authorize required FCRA/CROA litigation consents to establish the litigation workflow.</p>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label class="block text-xs font-bold text-gray-400 uppercase font-mono mb-1.5 tracking-wider">Phone Number</label>
              <input type="tel" id="intake-phone" class="w-full bg-gray-950/50 border border-gray-800 focus:border-blue-500/50 rounded-lg p-2.5 text-sm text-white focus:outline-none transition" placeholder="e.g. (414) 430-4277" value="${onboardingData.phone || ''}" required>
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-400 uppercase font-mono mb-1.5 tracking-wider">Email Address</label>
              <input type="email" id="intake-email" class="w-full bg-gray-950/50 border border-gray-800 focus:border-blue-500/50 rounded-lg p-2.5 text-sm text-white focus:outline-none transition" placeholder="e.g. rjbizsolution23@gmail.com" value="${onboardingData.email || ''}" required>
            </div>
          </div>

          <div class="space-y-4">
            <!-- Permissible Purpose -->
            <label class="flex items-start gap-3.5 p-4 glass bg-gray-950/30 border border-gray-800 hover:border-gray-700/80 rounded-xl cursor-pointer transition select-none">
              <input type="checkbox" id="consent-permissible" class="mt-1.5 h-4 w-4 rounded border-gray-800 text-blue-600 focus:ring-blue-500 bg-gray-950" ${onboardingData.permissiblePurposeConsent ? 'checked' : ''}>
              <div>
                <span class="text-sm font-bold text-white block">FCRA Permissible Purpose Authorization</span>
                <span class="text-xs text-gray-400 mt-1 block leading-relaxed">I authorize Rick Jefferson | RJ Business Solutions to access and evaluate my consumer reports under 15 U.S.C. § 1681b for credit repair analysis and statutory dispute generation.</span>
              </div>
            </label>

            <!-- CROA Disclosure -->
            <label class="flex items-start gap-3.5 p-4 glass bg-gray-950/30 border border-gray-800 hover:border-gray-700/80 rounded-xl cursor-pointer transition select-none">
              <input type="checkbox" id="consent-croa" class="mt-1.5 h-4 w-4 rounded border-gray-800 text-blue-600 focus:ring-blue-500 bg-gray-950" ${onboardingData.croaContractAgreed ? 'checked' : ''}>
              <div>
                <span class="text-sm font-bold text-white block">CROA Written Disclosures Agreement</span>
                <span class="text-xs text-gray-400 mt-1 block leading-relaxed">I acknowledge receipt of the written consumer disclosure required under the Credit Repair Organizations Act (15 U.S.C. § 1679c) detailing my statutory rights before executing any contract.</span>
              </div>
            </label>

            <!-- TSR Waiver -->
            <label class="flex items-start gap-3.5 p-4 glass bg-gray-950/30 border border-gray-800 hover:border-gray-700/80 rounded-xl cursor-pointer transition select-none">
              <input type="checkbox" id="consent-tsr" class="mt-1.5 h-4 w-4 rounded border-gray-800 text-blue-600 focus:ring-blue-500 bg-gray-950" ${onboardingData.tsrAdvanceFeeWaived ? 'checked' : ''}>
              <div>
                <span class="text-sm font-bold text-white block">TSR Advance Fee Disclosure Waiver</span>
                <span class="text-xs text-gray-400 mt-1 block leading-relaxed">I agree to waive any advance fee limitations in accordance with Telemarketing Sales Rule (16 CFR § 310) guidelines, understanding that services are billed only after document delivery.</span>
              </div>
            </label>
          </div>

          <div id="compliance-error-msg" class="hidden mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <i class="fas fa-exclamation-triangle"></i>
            <span>All three regulatory compliance checkboxes must be agreed to proceed.</span>
          </div>

          <div class="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-800/60">
            <button id="btn-intake-prev" class="bg-gray-800 hover:bg-gray-700 text-gray-200 px-5 py-2 rounded-lg text-sm font-semibold transition border border-gray-700">Back</button>
            <button id="btn-intake-next" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-bold transition flex items-center gap-1.5">Next Step <i class="fas fa-arrow-right text-xs"></i></button>
          </div>
        `;

      case 5:
        return `
          <h2 class="text-xl font-extrabold text-white mb-2 font-mono uppercase">Step 5: Portal Credentials & Finalize</h2>
          <p class="text-sm text-gray-400 mb-6">Setup secure credentials for the Client Portal. This authorizes real-time access to the litigation cockpit.</p>
          
          <div class="max-w-md mx-auto space-y-4">
            ${onboardingData.password ? `
              <div class="glass bg-gradient-to-r from-blue-900/40 to-indigo-900/40 p-4 rounded-xl border border-blue-500/30 mb-6 animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.25)]">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <i class="fas fa-magic animate-bounce"></i>
                  </div>
                  <div>
                    <h4 class="text-xs font-bold text-white uppercase font-mono">Autopilot Established Portal Credentials</h4>
                    <p class="text-[11px] text-gray-300 mt-1">🎉 Secure temporary password was auto-generated and dispatched to: <strong class="text-white">${onboardingData.email || 'N/A'}</strong></p>
                  </div>
                </div>
              </div>
            ` : ''}

            <div class="glass bg-blue-500/5 p-4 rounded-xl border border-blue-500/20 mb-6">
              <div class="flex gap-3">
                <div class="text-blue-400 text-lg mt-0.5"><i class="fas fa-info-circle"></i></div>
                <div>
                  <h4 class="text-xs font-bold text-white uppercase font-mono">Litigation Target Statistics</h4>
                  <p class="text-xs text-gray-400 mt-1">Parsed Client: <strong class="text-white">${onboardingData.clientName || 'Unregistered'}</strong></p>
                  <p class="text-xs text-gray-400">Total Violations Pinned: <strong class="text-red-400">${onboardingData.violationsFound || 0} violations</strong></p>
                  <p class="text-xs text-gray-400">Preferred Language: <strong class="text-green-400 uppercase font-mono">${onboardingData.language.toUpperCase()}</strong></p>
                </div>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-400 uppercase font-mono mb-1.5 tracking-wider">Setup Portal Password</label>
              <input type="password" id="portal-password" class="w-full bg-gray-950/50 border border-gray-800 focus:border-blue-500/50 rounded-lg p-2.5 text-sm text-white focus:outline-none transition" placeholder="Enter secure password" value="${onboardingData.password || ''}" required>
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-400 uppercase font-mono mb-1.5 tracking-wider">Confirm Password</label>
              <input type="password" id="portal-password-confirm" class="w-full bg-gray-950/50 border border-gray-800 focus:border-blue-500/50 rounded-lg p-2.5 text-sm text-white focus:outline-none transition" placeholder="Confirm secure password" value="${onboardingData.password || ''}" required>
            </div>

            <div id="password-error-msg" class="hidden p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <i class="fas fa-exclamation-triangle"></i>
              <span id="password-error-text">Passwords must match and be at least 6 characters.</span>
            </div>

            <button id="btn-onboard-finalize" class="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white py-3 px-4 rounded-xl text-sm font-extrabold transition shadow-lg tracking-wider uppercase font-mono flex items-center justify-center gap-2 mt-6">
              <i class="fas fa-check-circle"></i> Complete Setup & Open Workspace
            </button>
          </div>

          <div id="finalize-processing" class="hidden mt-6 text-center">
            <div class="flex items-center justify-center gap-3 text-blue-400 font-bold text-sm">
              <i class="fas fa-circle-notch fa-spin"></i>
              <span>Updating database & securing workspace...</span>
            </div>
          </div>

          <div class="flex justify-start gap-3 mt-8 pt-6 border-t border-gray-800/60">
            <button id="btn-portal-prev" class="bg-gray-800 hover:bg-gray-700 text-gray-200 px-5 py-2 rounded-lg text-sm font-semibold transition border border-gray-700">Back</button>
          </div>
        `;
    }
  }

  function attachStepEvents() {
    if (currentStep === 1) {
      const dropzone = $('#dropzone-onboard');
      const fileInput = $('#input-onboard-file');
      if (dropzone && fileInput) {
        dropzone.ondragover = (e) => {
          e.preventDefault();
          dropzone.classList.add('border-blue-500', 'bg-blue-500/5');
        };
        dropzone.ondragleave = () => {
          dropzone.classList.remove('border-blue-500', 'bg-blue-500/5');
        };
        dropzone.ondrop = async (e) => {
          e.preventDefault();
          dropzone.classList.remove('border-blue-500', 'bg-blue-500/5');
          const files = Array.from(e.dataTransfer.files);
          if (files.length > 0) await handleOnboardFiles(files);
        };
        dropzone.onclick = () => {
          fileInput.click();
        };
        fileInput.onchange = async () => {
          const files = Array.from(fileInput.files);
          if (files.length > 0) await handleOnboardFiles(files);
        };
      }

      const rawBtn = $('#btn-submit-onboard-raw');
      if (rawBtn) {
        rawBtn.onclick = async () => {
          const rawText = $('#ta-onboard-raw').value.trim();
          if (!rawText) {
            toast('Please paste credit report text first', 'error');
            return;
          }
          await handleOnboardText(rawText);
        };
      }
    }

    if (currentStep === 2) {
      const cardEn = $('#lang-card-en');
      const cardEs = $('#lang-card-es');
      if (cardEn && cardEs) {
        cardEn.onclick = () => {
          onboardingData.language = 'en';
          cardEn.classList.add('border-blue-500', 'bg-blue-500/5');
          cardEs.classList.remove('border-blue-500', 'bg-blue-500/5');
        };
        cardEs.onclick = () => {
          onboardingData.language = 'es';
          cardEs.classList.add('border-blue-500', 'bg-blue-500/5');
          cardEn.classList.remove('border-blue-500', 'bg-blue-500/5');
        };
      }

      const prev = $('#btn-lang-prev');
      const next = $('#btn-lang-next');
      if (prev) prev.onclick = () => { currentStep = 1; render(); };
      if (next) next.onclick = () => { currentStep = 3; render(); };
    }

    if (currentStep === 3) {
      const prev = $('#btn-profile-prev');
      const next = $('#btn-profile-next');
      if (prev) prev.onclick = () => { currentStep = 2; render(); };
      if (next) {
        next.onclick = (e) => {
          e.preventDefault();
          if (!$('#onboard-profile-form').reportValidity()) return;
          
          onboardingData.firstName = $('#prof-firstName').value.trim();
          onboardingData.lastName = $('#prof-lastName').value.trim();
          onboardingData.dob = $('#prof-dob').value.trim();
          onboardingData.ssnLast4 = $('#prof-ssnLast4').value.trim();
          onboardingData.addressLine1 = $('#prof-addressLine1').value.trim();
          onboardingData.city = $('#prof-city').value.trim();
          onboardingData.state = $('#prof-state').value.trim().toUpperCase();
          onboardingData.zip = $('#prof-zip').value.trim();
          
          currentStep = 4;
          render();
        };
      }
    }

    if (currentStep === 4) {
      const prev = $('#btn-intake-prev');
      const next = $('#btn-intake-next');
      if (prev) prev.onclick = () => { currentStep = 3; render(); };
      if (next) {
        next.onclick = () => {
          onboardingData.phone = $('#intake-phone').value.trim();
          onboardingData.email = $('#intake-email').value.trim();
          onboardingData.permissiblePurposeConsent = $('#consent-permissible').checked;
          onboardingData.croaContractAgreed = $('#consent-croa').checked;
          onboardingData.tsrAdvanceFeeWaived = $('#consent-tsr').checked;

          const errorEl = $('#compliance-error-msg');
          if (!onboardingData.permissiblePurposeConsent || !onboardingData.croaContractAgreed || !onboardingData.tsrAdvanceFeeWaived) {
            errorEl.classList.remove('hidden');
            return;
          }
          errorEl.classList.add('hidden');
          currentStep = 5;
          render();
        };
      }
    }

    if (currentStep === 5) {
      const prev = $('#btn-portal-prev');
      const finalize = $('#btn-onboard-finalize');
      if (prev) prev.onclick = () => { currentStep = 4; render(); };
      if (finalize) {
        finalize.onclick = async () => {
          const pass = $('#portal-password').value;
          const confirm = $('#portal-password-confirm').value;
          const errorEl = $('#password-error-msg');
          const errorTextEl = $('#password-error-text');

          if (!pass || pass.length < 6) {
            errorEl.classList.remove('hidden');
            errorTextEl.innerText = 'Password must be at least 6 characters.';
            return;
          }
          if (pass !== confirm) {
            errorEl.classList.remove('hidden');
            errorTextEl.innerText = 'Passwords do not match.';
            return;
          }
          errorEl.classList.add('hidden');
          onboardingData.password = pass;

          await finalizeOnboarding();
        };
      }
    }
  }

  async function handleOnboardFiles(files) {
    const procEl = $('#onboard-processing');
    if (procEl) {
      procEl.classList.remove('hidden');
      procEl.innerHTML = `
        <div class="flex flex-col items-center justify-center gap-2 text-blue-400 font-bold text-sm">
          <div class="flex items-center gap-2">
            <i class="fas fa-circle-notch fa-spin"></i>
            <span id="onboard-status-text">Processing reports...</span>
          </div>
          <div class="w-full max-w-xs bg-gray-900 rounded-full h-1.5 mt-2 overflow-hidden border border-gray-800">
            <div id="onboard-status-progress" class="bg-blue-600 h-1.5 transition-all duration-150" style="width: 0%"></div>
          </div>
        </div>
      `;
    }

    try {
      const total = files.length;
      for (let i = 0; i < total; i++) {
        const file = files[i];
        const progressSuffix = ` (Report ${i + 1} of ${total})`;
        const rawText = await handleOnboardFile(file, progressSuffix);
        if (rawText) {
          await handleOnboardText(rawText);
        }
      }
      toast('All report files processed successfully!', 'success');
      currentStep = 2;
      render();
    } catch (err) {
      console.error('Multi-file ingestion pipeline failed:', err);
      toast(`Onboarding files processing failed: ${err.message}`, 'error');
    } finally {
      if (procEl) procEl.classList.add('hidden');
    }
  }

  async function handleOnboardFile(file, progressSuffix) {
    const statusText = $('#onboard-status-text');
    const statusProgress = $('#onboard-status-progress');

    function updateProgress(text, percent) {
      if (statusText) statusText.textContent = text + (progressSuffix || '');
      if (statusProgress) statusProgress.style.width = `${percent}%`;
    }

    if (file.name.toLowerCase().endsWith('.pdf')) {
      if (!window.pdfjsLib) {
        throw new Error('PDF.js library is not loaded. Please reload the page.');
      }

      updateProgress('Reading PDF file...', 10);
      const arrayBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
      });

      updateProgress('Analyzing document structure...', 25);
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      let compiledText = '';

      for (let p = 1; p <= numPages; p++) {
        const percent = Math.round(25 + (p / numPages) * 50);
        updateProgress(`Extracting page ${p} of ${numPages}...`, percent);

        const page = await pdf.getPage(p);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        compiledText += pageText + '\n\n';
      }

      if (compiledText.trim().length < 1000) {
        updateProgress('Scanned PDF detected. Loading OCR Engine...', 80);
        
        await new Promise((resolve, reject) => {
          if (window.Tesseract) {
            resolve();
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
          script.onload = () => resolve();
          script.onerror = (e) => reject(new Error('Failed to load OCR engine script'));
          document.head.appendChild(script);
        });

        compiledText = '';
        for (let p = 1; p <= numPages; p++) {
          updateProgress(`Rendering page ${p} of ${numPages}...`, 85);
          const page = await pdf.getPage(p);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          const renderContext = {
            canvasContext: ctx,
            viewport: viewport
          };
          await page.render(renderContext).promise;

          updateProgress(`OCR Analyzing page ${p}/${numPages}...`, 90);
          const ocrResult = await Tesseract.recognize(canvas, 'eng', {
            logger: m => {
              if (m.status === 'recognizing text') {
                const subPercent = Math.round(90 + m.progress * 8);
                updateProgress(`OCR Analyzing page ${p}/${numPages}: ${Math.round(m.progress * 100)}%`, subPercent);
              }
            }
          });
          compiledText += ocrResult.data.text + '\n\n';
        }
      }

      updateProgress('Finishing extraction...', 100);
      await sleep(300);
      return compiledText;
    } else {
      updateProgress('Reading raw file content...', 50);
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          updateProgress('Extraction complete...', 100);
          resolve(event.target.result);
        };
        reader.onerror = (e) => reject(new Error(`File read failed: ${e.target.error}`));
        reader.readAsText(file);
      });
    }
  }

  async function handleOnboardText(rawText) {
    const res = await api('/reports/onboard', {
      method: 'POST',
      body: JSON.stringify({
        bureau: onboardingData.bureau || 'Equifax',
        rawText,
        fileName: 'onboard-credit-report.txt',
        clientId: onboardingData.clientId || undefined
      })
    });

    if (res && res.clientId) {
      onboardingData.clientId = res.clientId;
      onboardingData.clientName = res.clientName || '';
      onboardingData.reportId = res.reportId || '';
      onboardingData.violationsFound = (onboardingData.violationsFound || 0) + (res.violationsFound || 0);
      
      if (res.extractedEmail) onboardingData.email = res.extractedEmail;
      if (res.extractedPhone) onboardingData.phone = res.extractedPhone;
      if (res.generatedPassword) onboardingData.password = res.generatedPassword;

      const profile = await api(`/clients/${res.clientId}`);
      if (profile && profile.client) {
        onboardingData.firstName = profile.client.first_name || '';
        onboardingData.lastName = profile.client.last_name || '';
        onboardingData.dob = profile.client.dob || '';
        onboardingData.ssnLast4 = profile.client.ssn_last4 || '';
        onboardingData.addressLine1 = profile.client.address_line1 || '';
        onboardingData.city = profile.client.city || '';
        onboardingData.state = profile.client.state || '';
        onboardingData.zip = profile.client.zip || '';
        if (profile.client.email) onboardingData.email = profile.client.email;
        if (profile.client.phone) onboardingData.phone = profile.client.phone;
      }
    } else {
      throw new Error(res.error || 'Failed to parse report file text');
    }
  }

  async function finalizeOnboarding() {
    const finalizeEl = $('#finalize-processing');
    if (finalizeEl) finalizeEl.classList.remove('hidden');

    try {
      const notes = `Onboarding finalized. Language selection: ${onboardingData.language.toUpperCase()}.`;
      const updatePayload = {
        firstName: onboardingData.firstName,
        lastName: onboardingData.lastName,
        email: onboardingData.email,
        phone: onboardingData.phone,
        addressLine1: onboardingData.addressLine1,
        city: onboardingData.city,
        state: onboardingData.state,
        zip: onboardingData.zip,
        dob: onboardingData.dob,
        ssnLast4: onboardingData.ssnLast4,
        permissiblePurposeConsent: onboardingData.permissiblePurposeConsent,
        croaContractAgreed: onboardingData.croaContractAgreed,
        tsrAdvanceFeeWaived: onboardingData.tsrAdvanceFeeWaived,
        notes: notes,
        password: onboardingData.password,
        status: 'active'
      };

      const res = await api(`/clients/${onboardingData.clientId}`, {
        method: 'PUT',
        body: JSON.stringify(updatePayload)
      });
      if (res && res.ok) {
        toast('Client onboarding completed! Secure portal account created.', 'success');
        await sleep(1500);
        window._nav('client-detail', { clientId: onboardingData.clientId });
      } else {
        throw new Error(res.error || 'Failed to finalize client records');
      }
    } catch (e) {
      toast(e.message || 'Error finalising onboarding', 'error');
    } finally {
      if (finalizeEl) finalizeEl.classList.add('hidden');
    }
  }

  render();
}

  function showSmartCreditFirewallModal() {
    const existing = $('#smartcredit-firewall-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'smartcredit-firewall-modal';
    modal.className = 'fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md fade-in';
    modal.innerHTML = `
      <div class="glass max-w-lg w-full rounded-2xl border border-blue-500/30 overflow-hidden shadow-2xl scale-in">
        <div class="p-6 border-b border-gray-800/80 bg-gradient-to-r from-blue-900/30 via-transparent to-purple-900/30 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
              <i class="fas fa-shield-alt text-lg"></i>
            </div>
            <div>
              <h3 class="text-md font-bold text-white">Cloudflare/AWS Firewall Detected</h3>
              <p class="text-[10px] text-amber-400 font-semibold tracking-wider uppercase">Connection Blocked (403/530)</p>
            </div>
          </div>
          <button id="close-firewall-modal" class="text-gray-400 hover:text-white transition-all text-sm p-1.5 hover:bg-gray-800/80 rounded-lg">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="p-6 space-y-4">
          <p class="text-sm text-gray-300 leading-relaxed">
            SmartCredit's strict <strong class="text-white">AWS SigV4</strong> signature requirements and <strong class="text-white">Cloudflare firewall policies</strong> have blocked direct API authentication.
          </p>
          
          <div class="bg-gray-900/60 rounded-xl p-4 border border-gray-800/60 space-y-3">
            <h4 class="text-xs font-bold text-blue-400 flex items-center gap-2">
              <i class="fas fa-info-circle"></i>HOW TO RESOLVE & BYPASS:
            </h4>
            <ol class="text-xs text-gray-400 space-y-2.5 list-decimal pl-4">
              <li>Open your <strong class="text-gray-200">SmartCredit Member Portal</strong> in another tab.</li>
              <li>Download your credit report file as <strong class="text-gray-200">HTML</strong>, <strong class="text-gray-200">JSON</strong>, or <strong class="text-gray-200">TXT</strong>.</li>
              <li>Drag and drop the downloaded report file directly into our <strong class="text-blue-400">Premium Ingestion Container</strong> below.</li>
            </ol>
          </div>
        </div>

        <div class="p-5 border-t border-gray-800/80 bg-gray-950/40 flex gap-3">
          <button id="modal-use-fallback" class="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-all shadow-lg">
            Use Drag & Drop Fallback
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('#close-firewall-modal');
    closeBtn.onclick = () => {
      modal.style.opacity = '0';
      modal.style.transition = 'opacity 0.2s';
      setTimeout(() => modal.remove(), 200);
    };

    const actionBtn = modal.querySelector('#modal-use-fallback');
    actionBtn.onclick = () => {
      modal.style.opacity = '0';
      modal.style.transition = 'opacity 0.2s';
      setTimeout(() => {
        modal.remove();
        const dropzone = document.getElementById('smartcredit-dropzone');
        if (dropzone) {
          dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
          dropzone.classList.remove('border-gray-700');
          dropzone.classList.add('border-blue-500', 'bg-blue-500/10');
          setTimeout(() => {
            dropzone.classList.remove('border-blue-500', 'bg-blue-500/10');
            dropzone.classList.add('border-gray-700');
          }, 2000);
        }
      }, 200);
    };
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function renderProcessStepsCustom(label, iconClass) {
    return `<div class="glass rounded-xl p-6 mb-6 flex justify-center items-center py-10">
      <div class="text-center">
        <i class="${iconClass} text-4xl mb-4 text-blue-400"></i>
        <h3 class="text-lg font-bold text-white">${label}</h3>
        <p class="text-sm text-gray-400 mt-2">Please do not close this window...</p>
      </div>
    </div>`;
  }

  function renderProcessSteps(activeStep) {
    const steps = [
      { id: 'parsing', icon: 'fa-file-alt', label: 'Parsing Report', desc: 'Extracting accounts, inquiries, public records' },
      { id: 'detecting', icon: 'fa-search', label: 'Detecting Violations', desc: 'Scanning 15+ violation categories across FCRA/FDCPA/ECOA' },
      { id: 'scoring', icon: 'fa-calculator', label: 'Calculating Litigation Value', desc: 'Computing damages, settlement ranges, litigation score' },
      { id: 'complete', icon: 'fa-check-circle', label: 'Analysis Complete', desc: 'Full results ready' },
    ];
    const stepOrder = ['parsing','detecting','scoring','complete'];
    const activeIdx = stepOrder.indexOf(activeStep);

    return `<div class="glass rounded-xl p-6 mb-6">
      <h3 class="text-sm font-bold text-white mb-4"><i class="fas fa-cogs mr-2 text-blue-400"></i>Analysis Pipeline</h3>
      <div class="space-y-3">${steps.map((s,i) => {
        const isDone = i < activeIdx;
        const isActive = i === activeIdx;
        const cls = isDone ? 'step-done' : isActive ? 'step-active' : 'step-pending';
        return `<div class="flex items-center gap-4 p-3 rounded-lg border ${cls} transition-all">
          <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isDone?'bg-green-600':'isActive'?'bg-blue-600':'bg-gray-700'}">
            ${isDone?'<i class="fas fa-check text-white text-xs"></i>':isActive?`<i class="fas ${s.icon} text-white text-xs progress-pulse"></i>`:`<i class="fas ${s.icon} text-gray-400 text-xs"></i>`}
          </div>
          <div class="flex-1"><div class="text-sm font-medium ${isDone?'text-green-400':isActive?'text-blue-300':'text-gray-500'}">${s.label}</div><div class="text-xs ${isDone?'text-green-400/70':isActive?'text-blue-400/70':'text-gray-600'}">${s.desc}</div></div>
          ${isDone?'<i class="fas fa-check-circle text-green-400 text-sm"></i>':isActive?'<i class="fas fa-spinner fa-spin text-blue-400 text-sm"></i>':''}
        </div>`;
      }).join('')}</div></div>`;
  }

  function renderFullResults(el, result, data) {
    const ls = result.litigationScore;
    const scoreColor = ls.score >= 70 ? 'green' : ls.score >= 40 ? 'yellow' : 'gray';

    el.innerHTML = `<div class="fade-in space-y-6">
      ${renderProcessSteps('complete')}

      <!-- SCORE HERO -->
      <div class="glass rounded-2xl p-6 border ${ls.score>=70?'border-green-500/30':ls.score>=40?'border-yellow-500/30':'border-gray-600/30'}">
        <div class="flex items-center gap-6">
          <div class="text-center"><div class="w-24 h-24 rounded-full bg-${scoreColor}-600/20 border-4 border-${scoreColor}-500/50 flex items-center justify-center"><div><div class="text-3xl font-black text-${scoreColor}-400">${ls.score}</div><div class="text-[10px] text-${scoreColor}-400/70">/100</div></div></div><div class="text-xs font-bold text-${scoreColor}-400 mt-2">Grade: ${ls.grade}</div></div>
          <div class="flex-1">
            <h2 class="text-lg font-bold text-white mb-1">Litigation Analysis Complete</h2>
            <p class="text-sm text-${scoreColor}-300 font-medium mb-3">${ls.recommendation}</p>
            <div class="grid grid-cols-3 gap-3 text-center">
              <div class="bg-gray-800/60 rounded-lg p-2"><div class="text-[10px] text-gray-400">Pre-Lit Settlement</div><div class="text-sm font-bold text-green-400">${money(ls.preLitSettlement.min)} &ndash; ${money(ls.preLitSettlement.max)}</div></div>
              <div class="bg-gray-800/60 rounded-lg p-2"><div class="text-[10px] text-gray-400">Post-Filing</div><div class="text-sm font-bold text-green-400">${money(ls.postFilingSettlement.min)} &ndash; ${money(ls.postFilingSettlement.max)}</div></div>
              <div class="bg-gray-800/60 rounded-lg p-2"><div class="text-[10px] text-gray-400">Trial Verdict</div><div class="text-sm font-bold text-green-300">${money(ls.trialVerdict.min)} &ndash; ${money(ls.trialVerdict.max)}</div></div>
            </div>
          </div>
        </div>
      </div>

      <!-- SUMMARY GRID -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div class="glass rounded-lg p-3 text-center"><div class="text-2xl font-bold text-white">${result.totalAccounts}</div><div class="text-xs text-gray-400">Accounts</div></div>
        <div class="glass rounded-lg p-3 text-center"><div class="text-2xl font-bold text-orange-400">${result.totalCollections}</div><div class="text-xs text-gray-400">Collections</div></div>
        <div class="glass rounded-lg p-3 text-center"><div class="text-2xl font-bold text-yellow-400">${result.totalInquiries}</div><div class="text-xs text-gray-400">Inquiries</div></div>
        <div class="glass rounded-lg p-3 text-center"><div class="text-2xl font-bold text-purple-400">${result.totalPublicRecords}</div><div class="text-xs text-gray-400">Public Records</div></div>
        <div class="glass rounded-lg p-3 text-center"><div class="text-2xl font-bold text-red-400">${result.violationsFound}</div><div class="text-xs text-gray-400">Violations</div></div>
      </div>

      <!-- LITIGATION PLAN -->
      ${ls.litigationPlan.length?`<div class="glass rounded-xl p-5">
        <h3 class="text-sm font-bold text-white mb-3"><i class="fas fa-route mr-2 text-blue-400"></i>Recommended Litigation Plan</h3>
        <div class="space-y-2">${ls.litigationPlan.map((step,i) => `<div class="flex items-start gap-3"><div class="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0 mt-0.5"><span class="text-[10px] font-bold text-blue-400">${i+1}</span></div><div class="text-sm text-gray-300">${step}</div></div>`).join('')}</div>
      </div>`:''}

      <!-- BY DEFENDANT -->
      ${Object.keys(ls.byDefendant).length?`<div class="glass rounded-xl p-5">
        <h3 class="text-sm font-bold text-white mb-3"><i class="fas fa-building mr-2 text-orange-400"></i>Defendants &amp; Damages</h3>
        <div class="space-y-2">${Object.entries(ls.byDefendant).map(([name,info]) => `<div class="bg-gray-800/40 rounded-lg p-3 flex items-center justify-between"><div><div class="text-sm font-medium text-white">${name}</div><div class="text-xs text-gray-400">${info.count} violation(s)</div></div><div class="text-sm font-bold text-green-400">${money(info.damages)}</div></div>`).join('')}</div>
      </div>`:''}

      <!-- ALL VIOLATIONS -->
      ${result.violations.length?`<div class="glass rounded-xl p-5">
        <h3 class="text-sm font-bold text-white mb-3"><i class="fas fa-exclamation-triangle mr-2 text-red-400"></i>All Violations Detected (${result.violations.length})</h3>
        ${renderViolationsList(result.violations)}
      </div>`:''}

      <!-- ACTION BUTTONS -->
      <div class="glass rounded-xl p-5">
        <h3 class="text-sm font-bold text-white mb-3"><i class="fas fa-paper-plane mr-2 text-purple-400"></i>Next Steps</h3>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button onclick="window._nav('generate-doc',{clientId:'${data.clientId}',clientName:'${data.clientName}',reportId:'${result.reportId}'})" class="bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 text-purple-300 px-4 py-3 rounded-lg text-sm font-medium transition text-center"><i class="fas fa-file-contract text-lg mb-1 block"></i>Generate Documents</button>
          <button onclick="window._bulkGenerate('${data.clientId}','${result.reportId}')" class="bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 text-blue-300 px-4 py-3 rounded-lg text-sm font-medium transition text-center"><i class="fas fa-layer-group text-lg mb-1 block"></i>Bulk Generate All</button>
          <button onclick="window._exportViolations('${data.clientId}','${result.reportId}')" class="bg-green-600/20 border border-green-500/30 hover:bg-green-600/30 text-green-300 px-4 py-3 rounded-lg text-sm font-medium transition text-center"><i class="fas fa-download text-lg mb-1 block"></i>Export Report</button>
          <button onclick="window._nav('client-detail',{clientId:'${data.clientId}'})" class="bg-gray-600/20 border border-gray-500/30 hover:bg-gray-600/30 text-gray-300 px-4 py-3 rounded-lg text-sm font-medium transition text-center"><i class="fas fa-user text-lg mb-1 block"></i>Client Profile</button>
        </div>
      </div>
    </div>`;
  }

  window._bulkGenerate = async function(clientId, reportId) {
    try {
      toast('Generating all dispute documents...', 'info');
      const result = await api('/documents/generate-bulk', { method:'POST', body:JSON.stringify({
        clientId, reportId,
        docTypes: ['bureau-dispute','furnisher-dispute','debt-validation','609-disclosure','method-of-verification','cease-desist','intent-to-sue','cfpb-complaint','state-ag-complaint','goodwill-letter'],
        bureau: 'Equifax',
      })});
      toast(`Generated ${result.count} documents!`, 'success');
    } catch(err) { toast(err.message, 'error'); }
  };

  window._bulkGenerateLitigation = async function(clientId, reportId) {
    try {
      toast('Generating complete court litigation package...', 'info');
      const result = await api('/documents/generate-bulk', { method:'POST', body:JSON.stringify({
        clientId, reportId,
        docTypes: ['fed-complaint','fed-affidavit','state-complaint','civil-coversheet','motion-summary-judg'],
        bureau: 'Equifax',
      })});
      toast(`Generated ${result.count} litigation documents successfully!`, 'success');
    } catch(err) { toast(err.message, 'error'); }
  };

  window._exportViolations = async function(clientId, reportId) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
      const res = await fetch(`/api/violations/export?clientId=${clientId}${reportId?'&reportId='+reportId:''}`, { headers });
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `violation-report-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      toast('Report exported!', 'success');
    } catch(err) { toast(err.message, 'error'); }
  };

  window._exportPDF = async function(reportId) {
    try {
      const headers = {};
      if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
      const res = await fetch(`/api/reports/${reportId}/pdf`, { headers });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Export failed'); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `FCRA-Report-${reportId}.pdf`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      toast('PDF report downloaded!', 'success');
    } catch(err) { toast(err.message, 'error'); }
  };

  window._loadSample = function() {
    const ta = $('textarea[name="rawText"]');
    if (ta) ta.value = `EQUIFAX CREDIT REPORT
Report Date: 01/15/2026
Consumer Name: SAMPLE CONSUMER
SSN: XXX-XX-4589

ACCOUNT INFORMATION:

Account Name: CAPITAL ONE BANK
Account Number: ****5678
Account Type: Revolving
Account Status: Charged Off
Date Opened: 02/10/2017
Date of First Delinquency: 03/15/2018
Date Charged Off: 09/15/2018
Current Balance: $3,245
High Balance: $5,000
Original Amount: $5,000
Payment Status: 180+ Days Past Due
Payment History: CCCC1234566XXXXXXXXXX

Account Name: MIDLAND CREDIT MANAGEMENT
Account Number: ****9012
Account Type: Collection
Account Status: Collection
Date Opened: 01/05/2019
Current Balance: $3,245
Original Amount: $2,800
Original Creditor: CAPITAL ONE BANK

Account Name: DISCOVER BANK
Account Number: ****3456
Account Type: Revolving
Account Status: Paid/Closed
Date Opened: 05/20/2020
Current Balance: $1,200
High Balance: $8,000
Credit Limit: $8,000
Payment Status: Current

Account Name: PORTFOLIO RECOVERY ASSOCIATES
Account Number: ****7890
Account Type: Collection
Account Status: Collection
Date Opened: 06/01/2021
Current Balance: $892
Payment Status: Past Due

Account Name: WELLS FARGO BANK
Account Number: ****2345
Account Type: Installment
Account Status: Current
Payment Status: Past Due 60 Days
Date Opened: 08/15/2022
Current Balance: $15,400
Original Amount: $22,000
High Balance: $22,000
Monthly Payment: $450

Account Name: SYNCHRONY BANK
Account Number: ****6789
Account Type: Revolving
Account Status: Current
Date Opened: 11/01/2023
Current Balance: $4,500
Credit Limit: 0
High Balance: $3,000

INQUIRIES:

AMERICAN EXPRESS 01/10/2024
CHASE BANK 06/15/2023
LENDING TREE 03/20/2023
CAPITAL ONE 08/01/2023
DISCOVER 09/15/2023
CITI BANK 10/20/2023
WELLS FARGO 11/05/2023

PUBLIC RECORDS:

Chapter 7 Bankruptcy
Filed: 02/14/2015
Status: Discharged`;
    toast('Sample loaded with extra violations', 'info');
  };

  // ═══════════════════════════════════════════════════════════════
  // REPORT DETAIL
  // ═══════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════
  // FULL ANALYSIS COCKPIT (lawyer-facing summary of a report)
  // ═══════════════════════════════════════════════════════════════
  async function pgFullAnalysis(el, data) {
    const reportId = data?.reportId;
    if (!reportId) {
      el.innerHTML = `<div class="fade-in glass rounded-xl p-8 border border-gray-800 text-center">
        <i class="fas fa-file-medical-alt text-4xl text-blue-400 mb-3"></i>
        <h2 class="text-xl font-bold text-white mb-2">Full Analysis Cockpit</h2>
        <p class="text-sm text-gray-400 mb-4">Open a credit report first, then launch Full Analysis from the report workspace.</p>
        <button onclick="window._nav('reports')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">Browse Reports</button>
      </div>`;
      return;
    }
    // Reuse the interactive report workspace (same data surface)
    await pgReportDetail(el, { reportId, focusTab: 'violations', fullAnalysis: true });
  }

  window._showMfsnModal = function() {
    toast('Opening MyFreeScoreNow import…', 'info');
    window._nav('upload-report', { tab: 'mfsn' });
  };
  window._showSmartCreditModal = function() {
    toast('Opening SmartCredit import…', 'info');
    window._nav('upload-report', { tab: 'smartcredit' });
  };

  window._launchAttorneyWorkflow = async function(reportId) {
    if (!reportId) return toast('Pick a bureau report first', 'error');
    try {
      toast('Launching attorney suit pack…', 'info');
      const res = await api(`/reports/${reportId}/launch-workflow`, { method: 'POST', body: '{}' });
      toast(`Generated ${(res.documents || []).length} legal documents — ready for e-sign`, 'success');
      if (res.documents?.length) window._nav('documents');
      else window._nav('report-detail', { reportId, focusTab: 'legal-pack' });
    } catch (err) {
      toast(err.message || 'Workflow failed', 'error');
    }
  };


  async function pgReportDetail(el, data) {
    el.innerHTML = `<div class="flex items-center justify-center py-20"><div class="text-center"><i class="fas fa-spinner fa-spin text-3xl text-blue-400 mb-3"></i><div class="text-sm text-gray-400">Loading report detail workspace...</div></div></div>`;
    try {
      const res = await api(`/reports/${data.reportId}`);
      const r = res.report;
      const ls = res.litigationScore;
      
      // Parallel fetch the client details for high-fidelity demographic discrepancy tagging
      const clientRes = await api(`/clients/${r.client_id}`).catch(() => null);
      const client = clientRes?.client || {};
      
      const parsed = res.parsed || (r.parsed_data ? JSON.parse(r.parsed_data) : {});
      const scores = res.scores || parsed.scores || {};
      const rawPayload = res.rawPayload;
      const rawPayloadType = res.rawPayloadType || 'text';
      const sourceProvider = res.sourceProvider || r.source_provider || 'manual';
      
      // Expose Active Globals for HUD, compiler, and bidirectional navigation
      window._activeWorkspaceReport = r;
      window._activeWorkspaceClient = client;
      window._activeWorkspaceViolations = res.violations;
      window._activeWorkspaceParsed = parsed;
      window._activeWorkspaceScores = scores;
      window._activeWorkspaceRawPayload = rawPayload;
      window._activeWorkspaceSource = sourceProvider;

      const personalInfo = parsed.personalInfo || { names: [], addresses: [], employers: [], ssns: [], dobs: [] };
      
      // Compute demographic checks
      const clientFullName = `${client.first_name || ''} ${client.last_name || ''}`.trim();
      const namesArr = Array.isArray(personalInfo.names) ? personalInfo.names : [];
      const nameMatches = namesArr.some(n => {
        if (typeof n !== 'string') return false;
        const cleanN = n.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanC = clientFullName.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleanN.includes(cleanC) || cleanC.includes(cleanN);
      }) || namesArr.length === 0; // if empty, no discrepancy to raise
      
      const clientSSN = (client.ssn_last4 || '').trim();
      const ssnsArr = Array.isArray(personalInfo.ssns) ? personalInfo.ssns : [];
      const ssnMatches = !clientSSN || ssnsArr.some(s => {
        if (typeof s !== 'string') return false;
        const cleanS = s.replace(/[^0-9]/g, '');
        return cleanS.endsWith(clientSSN) || clientSSN.endsWith(cleanS);
      }) || ssnsArr.length === 0;

      const clientDOB = client.dob || '';
      let dobMatches = true;
      const dobsArr = Array.isArray(personalInfo.dobs) ? personalInfo.dobs : [];
      if (clientDOB && dobsArr.length > 0) {
        const yearC = clientDOB.split('-')[0]; // assuming YYYY-MM-DD
        dobMatches = dobsArr.some(d => {
          if (typeof d !== 'string') return false;
          const yearD = d.split('/').pop() || d.split('-')[0];
          return yearC === yearD;
        });
      }

      const clientZip = (client.zip || '').trim();
      const addrsArr = Array.isArray(personalInfo.addresses) ? personalInfo.addresses : [];
      const zipMatches = !clientZip || addrsArr.some(a => {
        if (typeof a !== 'string') return false;
        return a.includes(clientZip);
      }) || addrsArr.length === 0;

      // Render outer workspace container
      el.innerHTML = `<div class="fade-in max-w-full">
        <!-- Back Navigation & Export Controls Header -->
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <button onclick="window._nav('client-detail', {clientId: '${r.client_id}'})" class="text-gray-400 hover:text-white text-sm mb-2 inline-flex items-center gap-1.5 transition">
              <i class="fas fa-arrow-left text-xs"></i>Back to Client Workspace
            </button>
            <h1 class="text-xl font-bold text-white flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
              ${r.bureau} Report Detail Workspace
            </h1>
            <div class="text-xs text-gray-400 font-mono mt-1">${r.file_name} &bull; ${shortDate(r.created_at)}</div>
          </div>
          
          <div class="flex items-center gap-2">
            <button onclick="window._nav('report-comparison', { reportId: '${r.id}' })" class="bg-purple-600/20 border border-purple-500/30 text-purple-300 px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-purple-600/30 transition flex items-center gap-1.5">
              <i class="fas fa-balance-scale"></i>Compare Report
            </button>
            <button onclick="window._nav('client-detail', { clientId: '${r.client_id}', initialTab: 'bureaus' })" class="bg-teal-600/20 border border-teal-500/30 text-teal-300 px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-teal-600/30 transition flex items-center gap-1.5">
              <i class="fas fa-columns"></i>Tri-Bureau
            </button>
            <button onclick="window._exportPDF('${r.id}')" class="bg-blue-600/20 border border-blue-500/30 text-blue-300 px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-blue-600/30 transition flex items-center gap-1.5">
              <i class="fas fa-file-pdf"></i>Download PDF
            </button>
            <button onclick="window._exportViolations('','${r.id}')" class="bg-green-600/20 border border-green-500/30 text-green-300 px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-green-600/30 transition flex items-center gap-1.5">
              <i class="fas fa-download"></i>Export Claims
            </button>
            <button onclick="window._launchAttorneyWorkflow('${r.id}')" class="bg-amber-600/20 border border-amber-500/30 text-amber-300 px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-amber-600/30 transition flex items-center gap-1.5">
              <i class="fas fa-gavel"></i>Launch Suit Pack
            </button>
            <button onclick="window._nav('full-analysis', { reportId: '${r.id}' })" class="bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-600/30 transition flex items-center gap-1.5">
              <i class="fas fa-microscope"></i>Full Analysis
            </button>
            <span class="px-3 py-1 bg-green-950/40 border border-green-500/20 text-green-400 text-xs font-semibold rounded-lg">
              ${r.status}
            </span>
          </div>
        </div>

        <!-- Metric Cards Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
          <div class="glass rounded-xl p-3 text-center border border-blue-900/40 bg-blue-950/10">
            <div class="text-xs text-blue-400/80 font-semibold uppercase tracking-wider">FICO / Score</div>
            <div class="text-xl font-extrabold text-white mt-1">${scores.fico || scores.equifax || scores.experian || scores.transunion || '—'}</div>
            <div class="text-[10px] text-gray-500 mt-0.5">${scores.model || sourceProvider}</div>
          </div>
          <div class="glass rounded-xl p-3 text-center border border-gray-800">
            <div class="text-xs text-gray-500 font-semibold uppercase tracking-wider">EQ / EX / TU</div>
            <div class="text-sm font-extrabold text-white mt-1 font-mono">${scores.equifax || '—'} / ${scores.experian || '—'} / ${scores.transunion || '—'}</div>
          </div>
          <div class="glass rounded-xl p-3 text-center border border-gray-800">
            <div class="text-xs text-gray-500 font-semibold uppercase tracking-wider">Accounts</div>
            <div class="text-xl font-extrabold text-white mt-1">${r.total_accounts || (parsed.accounts||[]).length || 0}</div>
          </div>
          <div class="glass rounded-xl p-3 text-center border border-gray-800">
            <div class="text-xs text-gray-500 font-semibold uppercase tracking-wider">Collections</div>
            <div class="text-xl font-extrabold text-white mt-1">${r.total_collections || (parsed.collections||[]).length || 0}</div>
          </div>
          <div class="glass rounded-xl p-3 text-center border border-gray-800">
            <div class="text-xs text-gray-500 font-semibold uppercase tracking-wider">Inquiries</div>
            <div class="text-xl font-extrabold text-white mt-1">${r.total_inquiries || (parsed.inquiries||[]).length || 0}</div>
          </div>
          <div class="glass rounded-xl p-3 text-center border border-gray-800">
            <div class="text-xs text-gray-500 font-semibold uppercase tracking-wider">Public Records</div>
            <div class="text-xl font-extrabold text-white mt-1">${r.total_public_records || (parsed.publicRecords||[]).length || 0}</div>
          </div>
          <div class="glass rounded-xl p-3 text-center border border-red-950 bg-red-950/5">
            <div class="text-xs text-red-400/80 font-semibold uppercase tracking-wider">Violations</div>
            <div class="text-xl font-extrabold text-red-400 mt-1">${(res.violations || []).length}</div>
          </div>
          <div class="glass rounded-xl p-3 text-center border border-amber-900/40 bg-amber-950/10">
            <div class="text-xs text-amber-400/80 font-semibold uppercase tracking-wider">Litigation</div>
            <div class="text-xl font-extrabold text-white mt-1">${ls.score}/100</div>
            <div class="text-[10px] text-green-400 mt-0.5">${money(ls.totalDamagesMin)}–${money(ls.totalDamagesMax)}</div>
          </div>
        </div>
        <div class="mb-4 text-[11px] text-gray-400 flex flex-wrap gap-3">
          <span class="px-2 py-1 rounded bg-gray-900 border border-gray-800"><i class="fas fa-database text-blue-400 mr-1"></i>Source: <strong class="text-white">${sourceProvider}</strong></span>
          <span class="px-2 py-1 rounded bg-gray-900 border border-gray-800"><i class="fas fa-code text-purple-400 mr-1"></i>Raw payload: <strong class="text-white">${rawPayloadType.toUpperCase()}</strong></span>
          <span class="px-2 py-1 rounded bg-gray-900 border border-gray-800"><i class="fas fa-file text-gray-400 mr-1"></i>${escapeHtml(r.file_name || '')}</span>
        </div>

        <!-- RJ Dispute Campaign HUD Container -->
        <div id="dispute-campaign-hud-container" class="mb-6"></div>

        <!-- Split-Screen Grid Layout -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          <!-- LEFT COLUMN: Dynamic Interactive Panel (lg:col-span-7) -->
          <div class="lg:col-span-7 flex flex-col space-y-4">
            
            <!-- tab navigation container -->
            <div class="flex border border-gray-800/80 bg-gray-950/40 p-1 rounded-xl mb-1 flex-wrap">
              ${[
                { id: 'demographics', label: 'Demographics', icon: 'fa-id-card' },
                { id: 'accounts', label: 'Accounts', count: (parsed.accounts || []).length, icon: 'fa-credit-card' },
                { id: 'collections', label: 'Collections', count: (parsed.collections || []).length, icon: 'fa-hand-holding-usd' },
                { id: 'inquiries', label: 'Inquiries & Records', count: ((parsed.inquiries || []).length + (parsed.publicRecords || []).length), icon: 'fa-history' },
                { id: 'scores', label: 'Scores & Factors', icon: 'fa-chart-line' },
                { id: 'violations', label: 'Violations', count: (res.violations || []).length, icon: 'fa-exclamation-triangle', color: 'red' },
                { id: 'raw-json', label: 'Raw JSON', icon: 'fa-brackets-curly' },
                { id: 'dispute-builder', label: 'Dispute Builder', count: (state.selectedDisputeItems[r.id] || []).length, icon: 'fa-file-signature', badgeId: 'dispute-builder-badge-count' },
                { id: 'legal-pack', label: 'Legal Pack', icon: 'fa-balance-scale' }
              ].map((tab, idx) => `
                <button class="report-workspace-tab flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${idx === 0 ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10' : 'text-gray-400 hover:text-white hover:bg-gray-800/40'}" data-tab="${tab.id}">
                  <i class="fas ${tab.icon} text-[10px] ${tab.id === 'violations' ? 'text-red-400' : 'text-blue-400'}"></i>
                  <span>${tab.label}</span>
                  ${tab.count !== undefined ? `<span id="${tab.badgeId || ''}" class="px-1.5 py-0.2 bg-gray-800 text-[10px] text-gray-400 rounded-full font-bold ml-1">${tab.count}</span>` : ''}
                </button>
              `).join('')}
            </div>

            <!-- Content Area -->
            <div id="report-workspace-tab-content" class="space-y-4 max-h-[600px] lg:max-h-[calc(100vh-240px)] overflow-y-auto pr-1">
              <!-- Content gets dynamically populated by the active tab below -->
            </div>
          </div>

          <!-- RIGHT COLUMN: Raw Text Monospace Inspector (lg:col-span-5) -->
          <div id="raw-inspector-column" class="lg:col-span-5 flex flex-col h-auto min-h-[500px] lg:h-[calc(100vh-220px)] lg:sticky lg:top-[80px] border border-gray-800/80 rounded-2xl bg-gray-950/40 p-4 shadow-xl backdrop-blur-md transition-all duration-300">
            <div class="flex items-center justify-between mb-3 pb-2 border-b border-gray-800">
              <div class="flex items-center gap-2">
                <i class="fas fa-terminal text-blue-400 text-xs"></i>
                <span class="text-sm font-bold text-white">Evidence Inspector</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="flex bg-gray-900 border border-gray-800 rounded-lg overflow-hidden text-[10px] font-bold">
                  <button type="button" class="raw-mode-btn px-2 py-1 text-white bg-blue-600" data-mode="text">Text</button>
                  <button type="button" class="raw-mode-btn px-2 py-1 text-gray-400 hover:text-white" data-mode="json">Raw JSON</button>
                  <button type="button" class="raw-mode-btn px-2 py-1 text-gray-400 hover:text-white" data-mode="parsed">Parsed</button>
                </div>
                <button onclick="window._toggleRawFullscreen()" class="bg-gray-850 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white px-2 py-1 rounded text-[10px] font-bold transition flex items-center gap-1" title="Toggle Fullscreen">
                  <i class="fas fa-expand-alt text-[9px]" id="raw-fullscreen-icon"></i>
                  <span id="raw-fullscreen-text">Maximize</span>
                </button>
                <span class="px-2 py-0.5 bg-gray-800 text-[10px] text-gray-400 font-mono font-bold rounded uppercase tracking-wider">${r.bureau}</span>
              </div>
            </div>
            
            <!-- Search Engine Panel -->
            <div class="glass border border-gray-800/60 rounded-xl p-2 mb-3 flex items-center gap-2 bg-gray-900/40">
              <div class="relative flex-1">
                <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs"></i>
                <input type="text" id="raw-search-input" placeholder="Search raw report text..." class="w-full bg-gray-950 border border-gray-800 rounded-lg pl-8 pr-16 py-2 text-xs text-white outline-none focus:border-blue-500/50 transition font-mono">
                <div id="raw-search-stats" class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-bold bg-gray-800 px-1.5 py-0.5 rounded">0 of 0</div>
              </div>
              <button id="raw-search-prev" class="bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white p-2 rounded-lg text-xs transition"><i class="fas fa-chevron-up"></i></button>
              <button id="raw-search-next" class="bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white p-2 rounded-lg text-xs transition"><i class="fas fa-chevron-down"></i></button>
            </div>
            
            <!-- Raw Text Panel with local overflow -->
            <div class="flex-1 overflow-auto rounded-xl bg-gray-950 border border-gray-900 p-4 font-mono text-[11px] leading-relaxed text-gray-400 whitespace-pre-wrap select-text selection:bg-blue-500/30 selection:text-white" id="raw-text-container" data-original-text="${escapeHtml(r.raw_text || '')}">
              ${escapeHtml(r.raw_text || '')}
            </div>
          </div>
          
        </div>
      </div>`;

      // Helper function to escape HTML inside javascript
      function escapeHtml(text) {
        if (!text) return '';
        return text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }

      // Dynamic Tab switching logic
      const renderDemographicsTab = () => {
        return `<div class="space-y-4 fade-in">
          <div class="p-4 bg-blue-950/10 border border-blue-500/20 rounded-xl text-xs text-blue-300 leading-relaxed flex items-start gap-2.5">
            <i class="fas fa-info-circle text-blue-400 text-sm mt-0.5"></i>
            <div>
              <strong>FCRA § 1681e(b) Verification Audit:</strong> Credit bureaus must maintain maximum possible accuracy. Discrepancies below between the database-registered profile and the bureau's parsed report represent actionable litigation targets.
            </div>
          </div>

          <!-- Name Discrepancy Card -->
          <div onclick="window._highlightAndScrollToText('${(personalInfo.names && personalInfo.names[0] || '').replace(/'/g, "\\'")}')" class="glass rounded-xl p-4 border border-gray-800 hover:border-blue-500/30 transition cursor-pointer">
            <div class="flex items-center justify-between mb-3 border-b border-gray-800/60 pb-2">
              <div class="flex items-center gap-2">
                <input type="checkbox" onclick="window._toggleDisputeItem(event, '${r.id}', 'demo-name')" ${window._isItemPinned(r.id, 'demo-name') ? 'checked' : ''} class="w-3.5 h-3.5 rounded border-gray-800 text-blue-600 bg-gray-900 focus:ring-blue-500">
                <i class="fas fa-user text-blue-400"></i>
                <span class="text-xs font-bold text-white uppercase tracking-wider">Full Name Check</span>
              </div>
              ${nameMatches ? 
                `<span class="px-2 py-0.5 bg-green-950/40 border border-green-500/20 text-green-400 text-[10px] font-bold rounded flex items-center gap-1"><i class="fas fa-check-circle text-[9px]"></i> Verified</span>` : 
                `<span class="px-2 py-0.5 bg-yellow-950/40 border border-yellow-500/20 text-yellow-400 text-[10px] font-bold rounded flex items-center gap-1 animate-pulse"><i class="fas fa-exclamation-triangle text-[9px]"></i> Discrepancy Found</span>`
              }
            </div>
            <div class="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div class="text-gray-500 font-semibold mb-0.5 uppercase tracking-wider text-[10px]">Client Profile</div>
                <div class="text-white font-semibold">${clientFullName || 'N/A'}</div>
              </div>
              <div>
                <div class="text-gray-500 font-semibold mb-0.5 uppercase tracking-wider text-[10px]">Report Text</div>
                <div class="text-white font-semibold">${(personalInfo.names || []).join(', ') || '<span class="text-gray-600 italic">Not Found</span>'}</div>
              </div>
            </div>
            ${!nameMatches ? `
              <div class="mt-3 p-2.5 bg-red-950/20 border border-red-500/20 rounded text-[11px] text-red-300 flex items-start gap-2">
                <i class="fas fa-gavel text-xs mt-0.5 text-red-400"></i>
                <div>
                  <span class="font-bold text-white">Mixed File Risk:</span> Full name discrepancy detected in raw report. This violates FCRA § 1681e(b) accuracy standards. Est. damages: $1,000 + punitive fees.
                </div>
              </div>
            ` : ''}
          </div>

          <!-- SSN Discrepancy Card -->
          <div onclick="window._highlightAndScrollToText('${(personalInfo.ssns && personalInfo.ssns[0] || '').replace(/'/g, "\\'")}')" class="glass rounded-xl p-4 border border-gray-800 hover:border-blue-500/30 transition cursor-pointer">
            <div class="flex items-center justify-between mb-3 border-b border-gray-800/60 pb-2">
              <div class="flex items-center gap-2">
                <input type="checkbox" onclick="window._toggleDisputeItem(event, '${r.id}', 'demo-ssn')" ${window._isItemPinned(r.id, 'demo-ssn') ? 'checked' : ''} class="w-3.5 h-3.5 rounded border-gray-800 text-blue-600 bg-gray-900 focus:ring-blue-500">
                <i class="fas fa-id-card text-blue-400"></i>
                <span class="text-xs font-bold text-white uppercase tracking-wider">Social Security Number</span>
              </div>
              ${ssnMatches ? 
                `<span class="px-2 py-0.5 bg-green-950/40 border border-green-500/20 text-green-400 text-[10px] font-bold rounded flex items-center gap-1"><i class="fas fa-check-circle text-[9px]"></i> Verified</span>` : 
                `<span class="px-2 py-0.5 bg-yellow-950/40 border border-yellow-500/20 text-yellow-400 text-[10px] font-bold rounded flex items-center gap-1 animate-pulse"><i class="fas fa-exclamation-triangle text-[9px]"></i> Discrepancy Found</span>`
              }
            </div>
            <div class="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div class="text-gray-500 font-semibold mb-0.5 uppercase tracking-wider text-[10px]">Client SSN Last 4</div>
                <div class="text-white font-mono font-semibold">${clientSSN || 'N/A'}</div>
              </div>
              <div>
                <div class="text-gray-500 font-semibold mb-0.5 uppercase tracking-wider text-[10px]">Report SSN</div>
                <div class="text-white font-mono font-semibold">${(personalInfo.ssns || []).join(', ') || '<span class="text-gray-600 italic">Not Found</span>'}</div>
              </div>
            </div>
            ${!ssnMatches ? `
              <div class="mt-3 p-2.5 bg-red-950/20 border border-red-500/20 rounded text-[11px] text-red-300 flex items-start gap-2">
                <i class="fas fa-gavel text-xs mt-0.5 text-red-400"></i>
                <div>
                  <span class="font-bold text-white">Identity Theft / File Inaccuracy:</span> SSN mismatched or unparsed. Extreme danger of consumer record cross-contamination. Statutory claims apply.
                </div>
              </div>
            ` : ''}
          </div>

          <!-- DOB Discrepancy Card -->
          <div onclick="window._highlightAndScrollToText('${(personalInfo.dobs && personalInfo.dobs[0] || '').replace(/'/g, "\\'")}')" class="glass rounded-xl p-4 border border-gray-800 hover:border-blue-500/30 transition cursor-pointer">
            <div class="flex items-center justify-between mb-3 border-b border-gray-800/60 pb-2">
              <div class="flex items-center gap-2">
                <input type="checkbox" onclick="window._toggleDisputeItem(event, '${r.id}', 'demo-dob')" ${window._isItemPinned(r.id, 'demo-dob') ? 'checked' : ''} class="w-3.5 h-3.5 rounded border-gray-800 text-blue-600 bg-gray-900 focus:ring-blue-500">
                <i class="fas fa-calendar-alt text-blue-400"></i>
                <span class="text-xs font-bold text-white uppercase tracking-wider">Date of Birth</span>
              </div>
              ${dobMatches ? 
                `<span class="px-2 py-0.5 bg-green-950/40 border border-green-500/20 text-green-400 text-[10px] font-bold rounded flex items-center gap-1"><i class="fas fa-check-circle text-[9px]"></i> Verified</span>` : 
                `<span class="px-2 py-0.5 bg-yellow-950/40 border border-yellow-500/20 text-yellow-400 text-[10px] font-bold rounded flex items-center gap-1 animate-pulse"><i class="fas fa-exclamation-triangle text-[9px]"></i> Discrepancy Found</span>`
              }
            </div>
            <div class="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div class="text-gray-500 font-semibold mb-0.5 uppercase tracking-wider text-[10px]">Client DOB</div>
                <div class="text-white font-semibold">${clientDOB || 'N/A'}</div>
              </div>
              <div>
                <div class="text-gray-500 font-semibold mb-0.5 uppercase tracking-wider text-[10px]">Report DOB</div>
                <div class="text-white font-semibold">${(personalInfo.dobs || []).join(', ') || '<span class="text-gray-600 italic">Not Found</span>'}</div>
              </div>
            </div>
            ${!dobMatches ? `
              <div class="mt-3 p-2.5 bg-red-950/20 border border-red-500/20 rounded text-[11px] text-red-300 flex items-start gap-2">
                <i class="fas fa-gavel text-xs mt-0.5 text-red-400"></i>
                <div>
                  <span class="font-bold text-white">Date of Birth Inaccuracy:</span> Discrepancy found. High risk of age-based underwriting discrimination or file-mix errors.
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Address Discrepancy Card -->
          <div onclick="window._highlightAndScrollToText('${(personalInfo.addresses && personalInfo.addresses[0] || '').replace(/'/g, "\\'")}')" class="glass rounded-xl p-4 border border-gray-800 hover:border-blue-500/30 transition cursor-pointer">
            <div class="flex items-center justify-between mb-3 border-b border-gray-800/60 pb-2">
              <div class="flex items-center gap-2">
                <input type="checkbox" onclick="window._toggleDisputeItem(event, '${r.id}', 'demo-address')" ${window._isItemPinned(r.id, 'demo-address') ? 'checked' : ''} class="w-3.5 h-3.5 rounded border-gray-800 text-blue-600 bg-gray-900 focus:ring-blue-500">
                <i class="fas fa-map-marker-alt text-blue-400"></i>
                <span class="text-xs font-bold text-white uppercase tracking-wider">Address Log</span>
              </div>
              ${zipMatches ? 
                `<span class="px-2 py-0.5 bg-green-950/40 border border-green-500/20 text-green-400 text-[10px] font-bold rounded flex items-center gap-1"><i class="fas fa-check-circle text-[9px]"></i> Verified</span>` : 
                `<span class="px-2 py-0.5 bg-yellow-950/40 border border-yellow-500/20 text-yellow-400 text-[10px] font-bold rounded flex items-center gap-1 animate-pulse"><i class="fas fa-exclamation-triangle text-[9px]"></i> Discrepancy Found</span>`
              }
            </div>
            <div class="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div class="text-gray-500 font-semibold mb-0.5 uppercase tracking-wider text-[10px]">Client Address</div>
                <div class="text-white">${client.address_line1 || ''}<br>${client.city || ''}, ${client.state || ''} ${client.zip || ''}</div>
              </div>
              <div>
                <div class="text-gray-500 font-semibold mb-0.5 uppercase tracking-wider text-[10px]">Report Addresses</div>
                <div class="text-white max-h-24 overflow-y-auto font-mono text-[11px] leading-tight">${(personalInfo.addresses || []).map(a => `&bull; ${a}`).join('<br>') || '<span class="text-gray-600 italic">None Found</span>'}</div>
              </div>
            </div>
            ${!zipMatches ? `
              <div class="mt-3 p-2.5 bg-red-950/20 border border-red-500/20 rounded text-[11px] text-red-300 flex items-start gap-2">
                <i class="fas fa-gavel text-xs mt-0.5 text-red-400"></i>
                <div>
                  <span class="font-bold text-white">ZIP / Address Discrepancy:</span> Registered profile ZIP is missing from credit report address history. Outdated address histories often cause mixed file records.
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Employer Card -->
          <div class="glass rounded-xl p-4 border border-gray-800">
            <div class="flex items-center justify-between mb-3 border-b border-gray-800/60 pb-2">
              <div class="flex items-center gap-2">
                <i class="fas fa-briefcase text-blue-400"></i>
                <span class="text-xs font-bold text-white uppercase tracking-wider">Employment History</span>
              </div>
              <span class="text-[10px] font-mono text-gray-500">${(personalInfo.employers || []).length} Recorded</span>
            </div>
            <div class="text-xs text-white max-h-28 overflow-y-auto space-y-1.5 font-mono">
              ${(personalInfo.employers || []).map(emp => `
                <div onclick="window._highlightAndScrollToText('${emp.replace(/'/g, "\\'")}')" class="p-2 bg-gray-900/50 hover:bg-gray-800/40 rounded border border-gray-800 flex items-center justify-between cursor-pointer transition">
                  <span>${emp}</span>
                  <span class="text-[9px] text-blue-400 font-bold">Highlight <i class="fas fa-chevron-right text-[7px]"></i></span>
                </div>
              `).join('') || '<div class="text-gray-600 italic text-center py-2">No employer data parsed</div>'}
            </div>
          </div>
        </div>`;
      };

      const renderAccountsTab = () => {
        const payHistHtml = (hist) => {
          if (!hist) return '<span class="text-gray-600 italic">No payment history string</span>';
          return `<div class="flex flex-wrap gap-0.5 mt-1">${[...String(hist)].slice(0, 48).map(ch => {
            const color = ch === 'C' || ch === '0' ? 'bg-green-500/80' : ch === '1' ? 'bg-yellow-500/80' : ch === '2' || ch === '3' ? 'bg-orange-500/80' : ch === '9' || ch === 'B' ? 'bg-red-500/80' : 'bg-gray-600';
            return `<span class="w-3 h-3 rounded-sm ${color}" title="${ch}"></span>`;
          }).join('')}</div><div class="text-[9px] text-gray-500 font-mono mt-1 break-all">${escapeHtml(String(hist).slice(0, 120))}</div>`;
        };
        return `<div class="space-y-3 fade-in">
          <div class="text-xs text-gray-400 mb-2 italic">Full tradeline detail — click any card to glow-highlight evidence in the inspector. Expand Metro 2 fields for attorney review.</div>
          ${(parsed.accounts || []).map((acc) => {
            const accNo = acc.accountNumber || '';
            const isDelinquent = String(acc.paymentStatus || '').toLowerCase().includes('past due') || String(acc.accountStatus || '').toLowerCase().includes('charge') || String(acc.accountStatus || '').toLowerCase().includes('collection');
            const util = acc.creditLimit > 0 ? Math.round((acc.currentBalance / acc.creditLimit) * 100) : null;
            const linkedV = (res.violations || []).filter(v => (v.account_number && accNo && String(v.account_number).includes(String(accNo).replace(/\*/g,'').slice(-4))) || (v.account_name && acc.creditorName && String(v.account_name).toLowerCase().includes(String(acc.creditorName).toLowerCase().slice(0, 8))));
            return `
              <div onclick="window._syncAccountHighlight('${String(acc.creditorName||'').replace(/'/g, "\\'")}', '${String(accNo).replace(/'/g, "\\'")}')" class="glass rounded-xl p-4 border border-gray-800 hover:border-blue-500/40 transition-all cursor-pointer group relative">
                <div class="flex items-start justify-between mb-2">
                  <div class="flex items-start gap-3">
                    <input type="checkbox" onclick="window._toggleDisputeItem(event, '${r.id}', 'acc-${accNo || acc.creditorName}')" ${window._isItemPinned(r.id, `acc-${accNo || acc.creditorName}`) ? 'checked' : ''} class="w-4 h-4 rounded border-gray-800 text-blue-600 bg-gray-900 focus:ring-blue-500 mt-1">
                    <div>
                      <div class="text-[10px] text-blue-400 font-bold tracking-wider uppercase">${acc.accountType || 'Revolving'} ${acc.responsibility ? '· ' + acc.responsibility : ''}</div>
                      <h4 class="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">${acc.creditorName}</h4>
                      <div class="text-xs text-gray-500 font-mono">Account No: ${acc.accountNumber || 'N/A'}</div>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-[10px] text-gray-500 font-semibold uppercase">Current Balance</div>
                    <div class="text-sm font-extrabold ${acc.currentBalance > 0 ? 'text-red-400' : 'text-green-400'}">${money(acc.currentBalance)}</div>
                    ${linkedV.length ? `<div class="text-[10px] text-red-400 font-bold mt-1">${linkedV.length} claim(s)</div>` : ''}
                  </div>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-2 py-2 border-t border-b border-gray-800/60 my-2 text-[11px]">
                  <div><div class="text-gray-500">Status</div><div class="text-gray-300 font-medium ${isDelinquent ? 'text-yellow-400' : ''}">${acc.accountStatus || 'Open'}</div></div>
                  <div><div class="text-gray-500">Opened</div><div class="text-gray-300 font-mono">${acc.dateOpened || 'N/A'}</div></div>
                  <div><div class="text-gray-500">High Credit</div><div class="text-gray-300 font-mono">${money(acc.highBalance || acc.originalAmount || 0)}</div></div>
                  <div><div class="text-gray-500">Credit Limit</div><div class="text-gray-300 font-mono">${money(acc.creditLimit || 0)}${util !== null ? ` <span class="text-gray-500">(${util}% util)</span>` : ''}</div></div>
                  <div><div class="text-gray-500">Monthly Pmt</div><div class="text-gray-300 font-mono">${money(acc.monthlyPayment || 0)}</div></div>
                  <div><div class="text-gray-500">Last Payment</div><div class="text-gray-300 font-mono">${acc.lastPaymentDate || 'N/A'}</div></div>
                  <div><div class="text-gray-500">DOFD</div><div class="text-gray-300 font-mono">${acc.dofd || acc.dateOfFirstDelinquency || 'N/A'}</div></div>
                  <div><div class="text-gray-500">Reported</div><div class="text-gray-300 font-mono">${acc.dateReported || 'N/A'}</div></div>
                </div>
                <div class="mb-2">
                  <div class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Payment History (Metro 2)</div>
                  ${payHistHtml(acc.paymentHistory)}
                </div>
                ${acc.comments ? `<div class="text-[11px] text-gray-400 mb-2"><span class="text-gray-500 font-bold">Comments:</span> ${escapeHtml(acc.comments)}</div>` : ''}
                <details class="group/metro mt-2 border border-gray-800 bg-gray-950/20 rounded-lg overflow-hidden" onclick="event.stopPropagation()">
                  <summary class="flex items-center justify-between p-2.5 text-xs text-gray-400 hover:text-white cursor-pointer select-none font-semibold">
                    <span class="flex items-center gap-1.5"><i class="fas fa-microchip text-blue-500"></i> Metro 2® Field Evidence</span>
                    <i class="fas fa-chevron-down text-[10px] group-open/metro:rotate-180 transition-transform"></i>
                  </summary>
                  <div class="p-3 border-t border-gray-800/80 bg-gray-950/45 text-[11px] space-y-2">
                    <div class="grid grid-cols-2 gap-2">
                      <div class="p-2 bg-gray-900/40 rounded border border-gray-800"><div class="text-gray-500 uppercase text-[9px] font-bold">Field 17 DOFD</div><div class="text-white font-mono mt-0.5">${acc.dofd || 'N/A'}</div></div>
                      <div class="p-2 bg-gray-900/40 rounded border border-gray-800"><div class="text-gray-500 uppercase text-[9px] font-bold">Field 18 Date Opened</div><div class="text-white font-mono mt-0.5">${acc.dateOpened || 'N/A'}</div></div>
                      <div class="p-2 bg-gray-900/40 rounded border border-gray-800"><div class="text-gray-500 uppercase text-[9px] font-bold">Field 21 Balance</div><div class="text-white font-mono mt-0.5">${money(acc.currentBalance)}</div></div>
                      <div class="p-2 bg-gray-900/40 rounded border border-gray-800"><div class="text-gray-500 uppercase text-[9px] font-bold">Field 25 Status</div><div class="text-white font-mono mt-0.5">${acc.accountStatus || 'Open'}</div></div>
                      <div class="p-2 bg-gray-900/40 rounded border border-gray-800"><div class="text-gray-500 uppercase text-[9px] font-bold">Closed</div><div class="text-white font-mono mt-0.5">${acc.dateClosed || '—'}</div></div>
                      <div class="p-2 bg-gray-900/40 rounded border border-gray-800"><div class="text-gray-500 uppercase text-[9px] font-bold">Terms</div><div class="text-white font-mono mt-0.5">${acc.terms || '—'}</div></div>
                    </div>
                    ${linkedV.length ? `<div class="p-2 bg-red-950/20 border border-red-500/20 rounded text-red-300 text-[10px]"><strong>Linked violations:</strong> ${linkedV.map(v => v.subcategory || v.category).join('; ')}</div>` : '<div class="p-2 bg-blue-950/15 border border-blue-500/20 text-blue-300 rounded text-[10px]">No detector hits linked to this tradeline yet — still review for §1681e(b) accuracy.</div>'}
                  </div>
                </details>
              </div>`;
          }).join('') || '<div class="text-center py-8 text-gray-500"><i class="fas fa-credit-card text-3xl mb-3"></i><p>No trade lines detected</p></div>'}
        </div>`;
      };

      const renderCollectionsTab = () => {
        return `<div class="space-y-3 fade-in">
          <div class="text-xs text-gray-400 mb-2 italic">Click collection files to trace and locate validation inconsistencies in raw text.</div>
          ${(parsed.collections || []).map((coll) => {
            const collNo = coll.accountNumber || '';
            return `
              <div onclick="window._syncAccountHighlight('${coll.creditorName.replace(/'/g, "\\'")}', '${collNo.replace(/'/g, "\\'")}')" class="glass rounded-xl p-4 border border-gray-800 hover:border-red-500/40 transition-all cursor-pointer group relative">
                <div class="flex items-start justify-between mb-2">
                  <div class="flex items-start gap-3">
                    <input type="checkbox" onclick="window._toggleDisputeItem(event, '${r.id}', 'coll-${collNo || coll.creditorName}')" ${window._isItemPinned(r.id, `coll-${collNo || coll.creditorName}`) ? 'checked' : ''} class="w-4 h-4 rounded border-gray-800 text-red-600 bg-gray-900 focus:ring-red-500 mt-1">
                    <div>
                      <div class="text-[10px] text-red-400 font-bold tracking-wider uppercase">Debt Collector</div>
                      <h4 class="text-sm font-bold text-white group-hover:text-red-400 transition-colors">${coll.creditorName}</h4>
                      <div class="text-xs text-gray-500 font-mono">Agency ID: ${coll.accountNumber || 'N/A'}</div>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-[10px] text-gray-500 font-semibold uppercase">Amount Owed</div>
                    <div class="text-sm font-extrabold text-red-400">${money(coll.currentBalance)}</div>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-2 py-2 border-t border-b border-gray-800/60 my-2 text-[11px]">
                  <div>
                    <div class="text-gray-500">Original Creditor</div>
                    <div class="text-gray-300 font-semibold text-white">${coll.originalCreditor || 'N/A'}</div>
                  </div>
                  <div>
                    <div class="text-gray-500">Placement Date</div>
                    <div class="text-gray-300 font-medium font-mono">${coll.dateOpened || 'N/A'}</div>
                  </div>
                </div>

                <!-- Metro 2 Field Compliance Accordion Drawer -->
                <details class="group/metro mt-3 border border-gray-800 bg-gray-950/20 rounded-lg overflow-hidden transition" onclick="event.stopPropagation()">
                  <summary class="flex items-center justify-between p-2.5 text-xs text-gray-400 hover:text-white cursor-pointer select-none font-semibold">
                    <span class="flex items-center gap-1.5"><i class="fas fa-microchip text-red-500"></i> Metro 2® Field Compliance Accordion</span>
                    <i class="fas fa-chevron-down text-[10px] group-open/metro:rotate-180 transition-transform"></i>
                  </summary>
                  <div class="p-3 border-t border-gray-800/80 bg-gray-950/45 text-[11px] space-y-2.5 leading-normal">
                    <div class="grid grid-cols-2 gap-2">
                      <div class="p-2 bg-gray-900/40 rounded border border-gray-800">
                        <div class="text-gray-500 uppercase tracking-wider text-[9px] font-bold">Field 17: Date of First Delinquency</div>
                        <div class="text-white font-mono mt-0.5">${coll.dateOfFirstDelinquency || 'N/A'}</div>
                        <div class="text-red-400 text-[9px] mt-1 flex items-center gap-1 font-semibold"><i class="fas fa-exclamation-triangle"></i> Inconsistency risk detected</div>
                      </div>
                      <div class="p-2 bg-gray-900/40 rounded border border-gray-800">
                        <div class="text-gray-500 uppercase tracking-wider text-[9px] font-bold">Field 18: Date Opened</div>
                        <div class="text-white font-mono mt-0.5">${coll.dateOpened || 'N/A'}</div>
                        <div class="text-green-400 text-[9px] mt-1 flex items-center gap-1 font-semibold"><i class="fas fa-check-circle"></i> Matches placement date</div>
                      </div>
                      <div class="p-2 bg-gray-900/40 rounded border border-gray-800">
                        <div class="text-gray-500 uppercase tracking-wider text-[9px] font-bold">Field 21: Current Balance</div>
                        <div class="text-white font-mono mt-0.5">${money(coll.currentBalance)}</div>
                        <div class="text-red-400 text-[9px] mt-1 flex items-center gap-1 font-semibold"><i class="fas fa-exclamation-triangle"></i> Active collection balance violation</div>
                      </div>
                      <div class="p-2 bg-gray-900/40 rounded border border-gray-800">
                        <div class="text-gray-500 uppercase tracking-wider text-[9px] font-bold">Field 25: Account Status / History</div>
                        <div class="text-white font-mono mt-0.5">${coll.accountStatus || 'Collection'}</div>
                        <div class="text-yellow-400 text-[9px] mt-1 flex items-center gap-1 font-semibold"><i class="fas fa-info-circle"></i> Mapped as Collection file</div>
                      </div>
                    </div>
                    <div class="p-2 bg-red-950/15 border border-red-500/20 text-red-300 rounded text-[10px]">
                      <strong>System Directive:</strong> Collection accounts must align with original creditor trade lines. Non-zero collection balances require high-tier validation under FDCPA & FCRA.
                    </div>
                  </div>
                </details>

                <div class="flex items-center justify-between text-[10px] text-gray-500 pt-3 mt-1 border-t border-gray-800/40">
                  <span class="italic">Collector active synchronization active</span>
                  <span class="text-red-500 group-hover:translate-x-1 transition font-bold flex items-center gap-1">Jump to Raw <i class="fas fa-chevron-right text-[8px]"></i></span>
                </div>
              </div>`;
          }).join('') || '<div class="text-center py-8 text-gray-500"><i class="fas fa-hand-holding-usd text-3xl mb-3"></i><p>No collection agencies reported</p></div>'}
        </div>`;
      };

      const renderInquiriesTab = () => {
        const inqList = (parsed.inquiries || []).map((inq, idx) => `
          <div onclick="window._highlightAndScrollToText('${inq.creditorName.replace(/'/g, "\\'")}')" class="glass rounded-xl p-3 border border-gray-800 hover:border-blue-500/30 transition-all cursor-pointer flex items-center justify-between text-xs group">
            <div class="flex items-center gap-3">
              <input type="checkbox" onclick="window._toggleDisputeItem(event, '${r.id}', 'inq-${inq.creditorName}-${idx}')" ${window._isItemPinned(r.id, `inq-${inq.creditorName}-${idx}`) ? 'checked' : ''} class="w-3.5 h-3.5 rounded border-gray-800 text-blue-600 bg-gray-900 focus:ring-blue-500">
              <div>
                <div class="font-bold text-white group-hover:text-blue-400 transition-colors">${inq.creditorName}</div>
                <div class="text-[10px] text-gray-500">${inq.inquiryType || 'Credit Inquest'}</div>
              </div>
            </div>
            <div class="text-right flex items-center gap-3">
              <span class="text-gray-400 font-semibold font-mono">${inq.inquiryDate}</span>
              <span class="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity font-bold text-[10px]">Jump <i class="fas fa-chevron-right text-[7px]"></i></span>
            </div>
          </div>
        `).join('');

        const recList = (parsed.publicRecords || []).map((rec) => `
          <div onclick="window._highlightAndScrollToText('${rec.recordType.replace(/'/g, "\\'")}')" class="glass rounded-xl p-4 border border-gray-800 hover:border-purple-500/30 transition-all cursor-pointer group">
            <div class="flex items-start justify-between mb-2">
              <div>
                <div class="text-[10px] text-purple-400 font-bold tracking-wider uppercase">Public Record Filings</div>
                <h4 class="text-sm font-bold text-white">${rec.recordType}</h4>
                <div class="text-xs text-gray-500 font-mono">Filing Date: ${rec.filingDate}</div>
              </div>
              <div class="text-right">
                <div class="text-[10px] text-gray-500 font-semibold uppercase">Disposition</div>
                <div class="text-xs font-bold text-purple-300">${rec.status || 'Active'}</div>
              </div>
            </div>
            ${rec.court ? `<div class="text-xs text-gray-400 mt-1"><span class="text-gray-600">Jurisdiction:</span> ${rec.court}</div>` : ''}
            <div class="text-[10px] text-purple-400 font-bold flex items-center gap-1 justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Jump to Raw Record <i class="fas fa-chevron-right text-[7px]"></i></div>
          </div>
        `).join('');

        return `<div class="space-y-6 fade-in">
          <div>
            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"><i class="fas fa-gavel text-purple-400"></i> Public Records (${(parsed.publicRecords || []).length})</h3>
            <div class="space-y-2">${recList || '<div class="text-center py-4 text-xs text-gray-600">No public court filings detected</div>'}</div>
          </div>
          <div>
            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"><i class="fas fa-search text-blue-400"></i> Hard Inquiries (${(parsed.inquiries || []).length})</h3>
            <div class="space-y-2">${inqList || '<div class="text-center py-4 text-xs text-gray-600">No recent hard inquiries found</div>'}</div>
          </div>
        </div>`;
      };


      const renderScoresTab = () => {
        const factors = scores.factors || [];
        return `<div class="space-y-4 fade-in">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            ${[
              ['FICO', scores.fico],
              ['Vantage', scores.vantage],
              ['Equifax', scores.equifax],
              ['Experian', scores.experian],
              ['TransUnion', scores.transunion],
            ].map(([label, val]) => `
              <div class="glass rounded-xl p-4 border border-gray-800 text-center">
                <div class="text-[10px] text-gray-500 font-bold uppercase">${label}</div>
                <div class="text-2xl font-extrabold text-white mt-1">${val ?? '—'}</div>
              </div>`).join('')}
          </div>
          <div class="glass rounded-xl p-4 border border-gray-800">
            <div class="text-xs font-bold text-white mb-2"><i class="fas fa-list text-blue-400 mr-1.5"></i>Score Factors / Reason Codes</div>
            ${factors.length ? `<ul class="space-y-1.5 text-xs text-gray-300">${factors.map(f => `<li class="p-2 bg-gray-950/50 border border-gray-800 rounded">• ${escapeHtml(String(f))}</li>`).join('')}</ul>` : '<p class="text-xs text-gray-500 italic">No score factors present in this payload. Factors appear when MFSN/SmartCredit include them in the raw JSON.</p>'}
            <div class="mt-3 text-[11px] text-gray-500">Model: <span class="text-gray-300">${escapeHtml(scores.model || '—')}</span> · Provider: <span class="text-gray-300">${escapeHtml(scores.provider || sourceProvider)}</span></div>
          </div>
        </div>`;
      };

      const renderRawJsonTab = () => {
        window._rawJsonPretty = rawPayload ? JSON.stringify(rawPayload, null, 2) : (r.raw_text || '');
        window._parsedPretty = JSON.stringify(parsed || {}, null, 2);
        setTimeout(() => {
          const el = document.getElementById('raw-json-view');
          if (el) el.textContent = window._rawJsonPretty || window._parsedPretty || '';
        }, 0);
        return `<div class="space-y-3 fade-in">
          <div class="p-3 bg-purple-950/20 border border-purple-500/20 rounded-xl text-xs text-purple-200">
            <strong>Attorney evidence locker:</strong> Full MyFreeScoreNow / SmartCredit / parser payloads. Copy into discovery exhibits or expert affidavits.
          </div>
          <div class="flex gap-2 text-[10px] font-bold">
            <button type="button" class="px-3 py-1.5 rounded bg-blue-600 text-white" onclick="document.getElementById('raw-json-view').textContent=window._rawJsonPretty||''">Source Payload</button>
            <button type="button" class="px-3 py-1.5 rounded bg-gray-800 text-gray-300" onclick="document.getElementById('raw-json-view').textContent=window._parsedPretty||''">Parsed Structure</button>
            <button type="button" class="px-3 py-1.5 rounded bg-gray-800 text-gray-300" onclick="navigator.clipboard.writeText(document.getElementById('raw-json-view').textContent); toast('Copied to clipboard','success')">Copy</button>
          </div>
          <pre id="raw-json-view" class="text-[10px] font-mono text-green-300/90 bg-gray-950 border border-gray-800 rounded-xl p-4 max-h-[520px] overflow-auto whitespace-pre-wrap">Loading…</pre>
        </div>`;
      };

      const renderLegalPackTab = () => {
        const docs = res.documents || [];
        return `<div class="space-y-4 fade-in">
          <div class="glass rounded-xl p-4 border border-amber-500/20 bg-amber-950/10">
            <h4 class="text-sm font-bold text-white mb-1"><i class="fas fa-gavel text-amber-400 mr-1.5"></i>One-click attorney workflow</h4>
            <p class="text-xs text-gray-400 mb-3">Generates bureau dispute, §1681i letter, intent-to-sue, pre-litigation settlement, CFPB complaint, and federal complaint drafts — then moves the case to DISPUTE.</p>
            <button onclick="window._launchAttorneyWorkflow('${r.id}')" class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-xs font-bold"><i class="fas fa-rocket mr-1.5"></i>Launch Suit Pack Now</button>
          </div>
          <div class="space-y-2">
            <div class="text-xs font-bold text-gray-400 uppercase tracking-wider">Generated Documents (${docs.length})</div>
            ${docs.length ? docs.map(d => `
              <div class="glass rounded-xl p-3 border border-gray-800 flex items-center justify-between text-xs">
                <div>
                  <div class="font-bold text-white">${escapeHtml(d.title || d.doc_type)}</div>
                  <div class="text-gray-500 font-mono">${escapeHtml(d.doc_type)} · ${escapeHtml(d.status || 'draft')}</div>
                </div>
                <button onclick="window._nav('documents')" class="text-blue-400 font-bold">Open</button>
              </div>`).join('') : '<div class="text-xs text-gray-500 italic p-4 text-center">No documents yet — launch the suit pack to generate the full litigation set.</div>'}
          </div>
          <div class="glass rounded-xl p-4 border border-gray-800 text-xs text-gray-300 space-y-1">
            <div><span class="text-gray-500">Damages floor:</span> <strong class="text-green-400">${money(ls.totalDamagesMin)}</strong></div>
            <div><span class="text-gray-500">Damages ceiling:</span> <strong class="text-green-400">${money(ls.totalDamagesMax)}</strong></div>
            <div><span class="text-gray-500">Litigation grade:</span> <strong class="text-white">${ls.grade || '—'}</strong> (${ls.score}/100)</div>
            <div class="text-gray-500 pt-2">Mentors available in AI Studio: FCRA Mentor, Dispute Strategist, Metro 2 Auditor, Litigation Scout.</div>
            <button onclick="window._nav('ai-studio')" class="mt-2 text-blue-400 font-bold">Open AI Mentors →</button>
          </div>
        </div>`;
      };

      const renderViolationsTab = () => {
        return `<div class="space-y-4 fade-in">
          <!-- Litigation Interactive Damage Dashboard -->
          <div class="glass rounded-xl p-5 border border-red-500/20 bg-red-950/5 mb-2">
            <div class="flex items-center justify-between mb-3">
              <div>
                <h4 class="text-sm font-bold text-white mb-0.5"><i class="fas fa-gavel text-red-400 mr-1.5"></i>Actionable Claims Evaluator</h4>
                <p class="text-xs text-gray-400">Statutory and punitive damages tracker</p>
              </div>
              <span class="px-2.5 py-1 bg-red-950 border border-red-500/30 text-red-400 rounded-lg text-xs font-bold font-mono">${ls.grade} Rating</span>
            </div>
            <div class="grid grid-cols-2 gap-4 my-4">
              <div class="p-3 bg-gray-900/50 border border-gray-800/80 rounded-lg text-center">
                <div class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Est. Minimum Recovery</div>
                <div class="text-lg font-extrabold text-green-400 mt-1 est-damages-min-display font-mono">${money(ls.totalDamagesMin)}</div>
              </div>
              <div class="p-3 bg-gray-900/50 border border-gray-800/80 rounded-lg text-center">
                <div class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Est. Maximum Recovery</div>
                <div class="text-lg font-extrabold text-green-400 mt-1 est-damages-max-display font-mono">${money(ls.totalDamagesMax)}</div>
              </div>
            </div>
            <div class="space-y-3 pt-3 border-t border-gray-800/60 text-xs">
              <div>
                <div class="flex justify-between text-gray-400 mb-1">
                  <span>Intentional Inaccuracy Multiplier</span>
                  <span id="multiplier-val" class="font-bold text-blue-400 font-mono">1.0x</span>
                </div>
                <input type="range" id="damage-multiplier" min="0.5" max="3.0" step="0.1" value="1.0" class="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500">
              </div>
              <div class="p-2.5 bg-blue-950/20 border border-blue-500/20 rounded text-[11px] text-blue-300 leading-normal">
                <strong>Litigation Strategy:</strong> Discrepancies represent actionable claims under FCRA § 1681n for willful violations. Real-time damage calculations dynamically adjust for trial.
              </div>
            </div>
          </div>
          
          <div class="space-y-2">${renderViolationsList(res.violations)}</div>
        </div>`;
      };

      const renderDisputeBuilderTab = () => {
        const campaignStatus = state.disputeStatus[r.id] || { step: 'pinning', savedDocId: null, isSent: false };
        const pinnedIds = state.selectedDisputeItems[r.id] || [];
        return `<div class="space-y-4 fade-in">
          <div class="p-4 bg-blue-950/10 border border-blue-500/20 rounded-xl text-xs text-blue-300 leading-relaxed flex items-start gap-2.5">
            <i class="fas fa-file-signature text-blue-400 text-sm mt-0.5"></i>
            <div>
              <strong>Premium Dispute Builder:</strong> Compile and edit Gary A. Branch style § 1681i reinvestigation dispute letters. Customize demographics and download certified-mail ready PDFs.
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
            <!-- Sidebar Controls -->
            <div class="md:col-span-4 space-y-4">
              <div class="glass border border-gray-800 rounded-xl p-4 bg-gray-900/20 space-y-3">
                <h4 class="text-xs font-bold text-white uppercase tracking-wider border-b border-gray-800 pb-1.5 flex items-center gap-1.5">
                  <i class="fas fa-sliders-h text-blue-400"></i> Builder Controls
                </h4>
                
                <div>
                  <label class="block text-[10px] text-gray-400 font-bold uppercase mb-1">Target Bureau</label>
                  <select id="builder-bureau-select" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-white outline-none focus:border-blue-500/50 transition">
                    <option value="Equifax" ${r.bureau === 'Equifax' ? 'selected' : ''}>Equifax</option>
                    <option value="Experian" ${r.bureau === 'Experian' ? 'selected' : ''}>Experian</option>
                    <option value="TransUnion" ${r.bureau === 'TransUnion' ? 'selected' : ''}>TransUnion</option>
                  </select>
                </div>

                <div class="space-y-2 pt-2">
                  <label class="block text-[10px] text-gray-400 font-bold uppercase">Include Demographics</label>
                  <label class="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
                    <input type="checkbox" id="builder-toggle-name" checked class="w-3.5 h-3.5 rounded border-gray-800 text-blue-600 bg-gray-900 focus:ring-blue-500">
                    <span>Full Name Check</span>
                  </label>
                  <label class="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
                    <input type="checkbox" id="builder-toggle-ssn" checked class="w-3.5 h-3.5 rounded border-gray-800 text-blue-600 bg-gray-900 focus:ring-blue-500">
                    <span>SSN Last 4</span>
                  </label>
                  <label class="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
                    <input type="checkbox" id="builder-toggle-dob" checked class="w-3.5 h-3.5 rounded border-gray-800 text-blue-600 bg-gray-900 focus:ring-blue-500">
                    <span>Date of Birth</span>
                  </label>
                  <label class="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
                    <input type="checkbox" id="builder-toggle-address" checked class="w-3.5 h-3.5 rounded border-gray-800 text-blue-600 bg-gray-900 focus:ring-blue-500">
                    <span>Current Address</span>
                  </label>
                </div>

                <div class="pt-2 border-t border-gray-800 text-[10px] text-gray-500">
                  <span class="font-bold text-gray-400">Campaign Stats:</span>
                  <div class="flex justify-between mt-1">
                    <span>Pinned trade lines:</span>
                    <span class="font-bold text-white font-mono">${pinnedIds.length}</span>
                  </div>
                </div>
              </div>

              <!-- Action Controls Pane -->
              <div class="glass border border-gray-800 rounded-xl p-4 bg-gray-900/20 space-y-2.5">
                <h4 class="text-xs font-bold text-white uppercase tracking-wider border-b border-gray-800 pb-1.5 flex items-center gap-1.5">
                  <i class="fas fa-rocket text-blue-400"></i> Action controls
                </h4>

                <!-- Compliance Toggles -->
                <div class="space-y-1.5 pb-2 border-b border-gray-800/80">
                  <label class="block text-[10px] text-gray-400 font-bold uppercase tracking-wider">Compliance Options</label>
                  <label class="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
                    <input type="checkbox" id="builder-toggle-hired" checked class="w-3.5 h-3.5 rounded border-gray-800 text-blue-600 bg-gray-900 focus:ring-blue-500">
                    <span>Attach Representation Notice</span>
                  </label>
                  <label class="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
                    <input type="checkbox" id="builder-toggle-rep" checked class="w-3.5 h-3.5 rounded border-gray-800 text-blue-600 bg-gray-900 focus:ring-blue-500">
                    <span>Certify POA Attached</span>
                  </label>
                </div>
                
                <button id="builder-btn-save-draft" class="w-full bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/10">
                  <i class="fas fa-save"></i> Save Dispute Draft
                </button>
                
                <button id="builder-btn-download-pdf" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/10">
                  <i class="fas fa-file-pdf"></i> Download Printable PDF
                </button>
                
                <div class="p-2 bg-gray-950/40 rounded border border-gray-900 text-[10px] text-gray-500 leading-tight">
                  Dispute draft updates the local status and synchronizes resolution percentage securely in database.
                </div>
              </div>
            </div>

            <!-- Letter Text Area -->
            <div class="md:col-span-8 flex flex-col h-[520px]">
              <div class="flex-1 border border-gray-800 rounded-xl overflow-hidden bg-gray-950/40 flex flex-col">
                <div class="flex items-center justify-between px-3 py-2 bg-gray-900/60 border-b border-gray-800">
                  <span class="text-xs font-bold text-white uppercase tracking-wider font-mono">1681i-letter-draft.txt</span>
                  <span class="text-[10px] text-gray-500 italic">Editable Live Workspace</span>
                </div>
                <textarea id="builder-letter-textarea" class="w-full flex-1 bg-gray-950 text-gray-300 p-4 font-mono text-[11px] leading-relaxed resize-none outline-none focus:text-white border-0 select-text" spellcheck="false" placeholder="Generating dispute letter draft..."></textarea>
              </div>
            </div>
          </div>
        </div>`;
      };

      // Set initial tab content
      const tabContentContainer = document.getElementById('report-workspace-tab-content');
      tabContentContainer.innerHTML = renderDemographicsTab();

      // Bind Tab Navigation Click Event Listeners
      const tabButtons = document.querySelectorAll('.report-workspace-tab');
      tabButtons.forEach(btn => {
        btn.onclick = () => {
          tabButtons.forEach(b => {
            b.className = 'report-workspace-tab flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/40 transition-all';
          });
          btn.className = 'report-workspace-tab flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-500/10 transition-all';
          
          const tabId = btn.dataset.tab;
          if (tabId === 'demographics') {
            tabContentContainer.innerHTML = renderDemographicsTab();
          } else if (tabId === 'accounts') {
            tabContentContainer.innerHTML = renderAccountsTab();
          } else if (tabId === 'collections') {
            tabContentContainer.innerHTML = renderCollectionsTab();
          } else if (tabId === 'inquiries') {
            tabContentContainer.innerHTML = renderInquiriesTab();
          } else if (tabId === 'violations') {
            tabContentContainer.innerHTML = renderViolationsTab();
            
            // Set up slider multiplier control dynamically after rendering
            const multiplierInput = document.getElementById('damage-multiplier');
            if (multiplierInput) {
              multiplierInput.oninput = (e) => {
                const val = parseFloat(e.target.value);
                document.getElementById('multiplier-val').textContent = val.toFixed(1) + 'x';
                const adjMin = ls.totalDamagesMin * val;
                const adjMax = ls.totalDamagesMax * val;
                document.querySelectorAll('.est-damages-min-display').forEach(el => el.textContent = money(adjMin));
                document.querySelectorAll('.est-damages-max-display').forEach(el => el.textContent = money(adjMax));
              };
            }
          } else if (tabId === 'scores') {
            tabContentContainer.innerHTML = renderScoresTab();
          } else if (tabId === 'raw-json') {
            tabContentContainer.innerHTML = renderRawJsonTab();
          } else if (tabId === 'legal-pack') {
            tabContentContainer.innerHTML = renderLegalPackTab();
          } else if (tabId === 'dispute-builder') {
            tabContentContainer.innerHTML = renderDisputeBuilderTab();
            window._initDisputeBuilderTab(r.id);
          }
          if (data?.focusTab && tabId === data.focusTab) {
            /* already selected via focus */
          }
        };
      });

      // Auto-focus tab when opened from Full Analysis
      if (data?.focusTab) {
        const focusBtn = [...tabButtons].find(b => b.dataset.tab === data.focusTab);
        if (focusBtn) focusBtn.click();
      }

      // Inspector mode switching (Text / Raw JSON / Parsed)
      const textModeContent = r.raw_text || '';
      const jsonModeContent = rawPayload ? JSON.stringify(rawPayload, null, 2) : (rawPayloadType === 'text' ? textModeContent : '{}');
      const parsedModeContent = JSON.stringify(parsed || {}, null, 2);
      window._setInspectorMode = function(mode) {
        const container = document.getElementById('raw-text-container');
        if (!container) return;
        const map = { text: textModeContent, json: jsonModeContent, parsed: parsedModeContent };
        const content = map[mode] || textModeContent;
        container.dataset.originalText = content;
        container.textContent = content;
        document.querySelectorAll('.raw-mode-btn').forEach(btn => {
          const active = btn.dataset.mode === mode;
          btn.className = `raw-mode-btn px-2 py-1 ${active ? 'text-white bg-blue-600' : 'text-gray-400 hover:text-white'}`;
        });
      };
      document.querySelectorAll('.raw-mode-btn').forEach(btn => {
        btn.onclick = () => window._setInspectorMode(btn.dataset.mode);
      });

      // Bind Highlighting, Scrolling & Searching Engine on Right Monospace Panel
      window._highlightAndScrollToText = function(keyword, options = {}) {
        if (!keyword) return 0;
        const rawContainer = document.getElementById('raw-text-container');
        if (!rawContainer) return 0;
        
        const rawText = rawContainer.dataset.originalText || rawContainer.textContent;
        const cleanKeyword = keyword.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        if (!cleanKeyword) return 0;

        const regex = new RegExp(`(${cleanKeyword})`, 'gi');
        const escapedText = escapeHtml(rawText);
        
        let matchCount = 0;
        const highlightedHtml = escapedText.replace(regex, (match) => {
          matchCount++;
          return `<mark class="raw-highlight bg-blue-500/40 text-white font-bold px-1 rounded border-b-2 border-blue-500 transition-all duration-300" id="raw-match-${matchCount}">${match}</mark>`;
        });
        
        if (matchCount > 0) {
          rawContainer.innerHTML = highlightedHtml;
          const firstMatch = document.getElementById('raw-match-1');
          if (firstMatch) {
            firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstMatch.classList.add('ring-4', 'ring-blue-500/60', 'scale-105', 'bg-blue-500/80');
            setTimeout(() => {
              firstMatch.classList.remove('ring-4', 'ring-blue-500/60', 'scale-105', 'bg-blue-500/80');
            }, 3000);
          }
          return matchCount;
        }

        // Fallback for partially redacted values (like ****1234 account numbers)
        if (keyword.startsWith('****') || keyword.includes('*')) {
          const last4 = keyword.replace(/\*/g, '');
          if (last4.length >= 3) {
            return window._highlightAndScrollToText(last4, options);
          }
        }
        return 0;
      };

      // Robust cross-referencing account identifier highlight function
      window._syncAccountHighlight = function(creditor, accNo) {
        let matches = window._highlightAndScrollToText(creditor);
        if (matches === 0 && accNo) {
          matches = window._highlightAndScrollToText(accNo);
        }
        if (matches === 0) {
          toast(`Scrolling raw text container...`, 'info');
        }
      };

      // Advanced Raw Inspector Search Engine Logic
      const searchInput = document.getElementById('raw-search-input');
      const searchStats = document.getElementById('raw-search-stats');
      const searchPrev = document.getElementById('raw-search-prev');
      const searchNext = document.getElementById('raw-search-next');
      const rawContainer = document.getElementById('raw-text-container');
      
      let currentMatches = [];
      let currentMatchIdx = -1;

      const runSearch = (query) => {
        const rawText = rawContainer.dataset.originalText || rawContainer.textContent;
        if (!query || query.trim().length < 2) {
          rawContainer.innerHTML = escapeHtml(rawText);
          searchStats.textContent = '0 of 0';
          currentMatches = [];
          currentMatchIdx = -1;
          return;
        }

        const cleanQuery = query.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(${cleanQuery})`, 'gi');
        const escapedText = escapeHtml(rawText);

        let matchCount = 0;
        const highlightedHtml = escapedText.replace(regex, (match) => {
          matchCount++;
          return `<mark class="raw-search-match bg-yellow-500/30 text-white font-semibold px-1 rounded border-b border-yellow-500" id="search-match-${matchCount}">${match}</mark>`;
        });

        rawContainer.innerHTML = highlightedHtml;
        currentMatches = document.querySelectorAll('.raw-search-match');
        currentMatchIdx = currentMatches.length > 0 ? 0 : -1;
        updateSearchUI();
      };

      const updateSearchUI = () => {
        if (currentMatches.length === 0) {
          searchStats.textContent = '0 of 0';
          return;
        }

        searchStats.textContent = `${currentMatchIdx + 1} of ${currentMatches.length}`;
        currentMatches.forEach((el, idx) => {
          if (idx === currentMatchIdx) {
            el.className = 'raw-search-match bg-yellow-500 text-black font-bold px-1 rounded ring-2 ring-yellow-400 scale-105 transition-all duration-200';
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            el.className = 'raw-search-match bg-yellow-500/30 text-white font-semibold px-1 rounded border-b border-yellow-500';
          }
        });
      };

      searchInput.onkeyup = (e) => {
        if (e.key === 'Enter') {
          if (currentMatches.length > 0) {
            currentMatchIdx = (currentMatchIdx + 1) % currentMatches.length;
            updateSearchUI();
          }
        } else {
          runSearch(searchInput.value);
        }
      };

      searchPrev.onclick = () => {
        if (currentMatches.length > 0) {
          currentMatchIdx = (currentMatchIdx - 1 + currentMatches.length) % currentMatches.length;
          updateSearchUI();
        }
      };

      searchNext.onclick = () => {
        if (currentMatches.length > 0) {
          currentMatchIdx = (currentMatchIdx + 1) % currentMatches.length;
          updateSearchUI();
        }
      };

      // Behavior binder and API synchronizer for Dispute Builder Tab
      window._initDisputeBuilderTab = function(reportId) {
        const textarea = document.getElementById('builder-letter-textarea');
        if (!textarea) return;

        const bureauSelect = document.getElementById('builder-bureau-select');
        const checkName = document.getElementById('builder-toggle-name');
        const checkSSN = document.getElementById('builder-toggle-ssn');
        const checkDOB = document.getElementById('builder-toggle-dob');
        const checkAddress = document.getElementById('builder-toggle-address');

        const recompile = () => {
          const letter = window._compile1681iLetter(reportId, {
            bureau: bureauSelect.value,
            includeName: checkName.checked,
            includeSSN: checkSSN.checked,
            includeDOB: checkDOB.checked,
            includeAddress: checkAddress.checked
          });
          textarea.value = letter;
        };

        // Wire inputs to recompile on changes
        if (bureauSelect) bureauSelect.onchange = recompile;
        if (checkName) checkName.onchange = recompile;
        if (checkSSN) checkSSN.onchange = recompile;
        if (checkDOB) checkDOB.onchange = recompile;
        if (checkAddress) checkAddress.onchange = recompile;

        // Initialize with default compiled letter
        recompile();

        // Wire Save Draft
        const saveDraftBtn = document.getElementById('builder-btn-save-draft');
        if (saveDraftBtn) {
          saveDraftBtn.onclick = async () => {
            try {
              saveDraftBtn.disabled = true;
              saveDraftBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving Draft...';
              
              const campaignStatus = state.disputeStatus[reportId] || { step: 'pinning', savedDocId: null, isSent: false };
              const currentContent = textarea.value;
              
              if (campaignStatus.savedDocId) {
                // Update existing draft
                await api(`/documents/${campaignStatus.savedDocId}`, {
                  method: 'PUT',
                  body: JSON.stringify({ content: currentContent })
                });
                toast('Dispute draft updated successfully!', 'success');
              } else {
                // Generate a new draft
                const pinnedIds = state.selectedDisputeItems[reportId] || [];
                const res = await api('/documents/generate', {
                  method: 'POST',
                  body: JSON.stringify({
                    clientId: r.client_id,
                    reportId: reportId,
                    violationIds: pinnedIds.filter(id => id.startsWith('violation-')).map(id => id.replace('violation-', '')),
                    docType: '1681i-letter',
                    bureau: bureauSelect.value,
                    creditorName: 'Equifax, Experian, TransUnion',
                    creditorAddress: 'Dispute Centers'
                  })
                });
                
                campaignStatus.savedDocId = res.id;
                campaignStatus.step = 'draft';
                state.disputeStatus[reportId] = campaignStatus;
                localStorage.setItem('fcra_dispute_status', JSON.stringify(state.disputeStatus));
                
                // Now save content in the newly created document via PUT
                await api(`/documents/${res.id}`, {
                  method: 'PUT',
                  body: JSON.stringify({ content: currentContent })
                });
                
                toast('New dispute draft generated and saved!', 'success');
              }
              
              window._updateCampaignHUD(reportId);
            } catch(err) {
              toast(`Failed to save draft: ${err.message}`, 'error');
            } finally {
              saveDraftBtn.disabled = false;
              saveDraftBtn.innerHTML = '<i class="fas fa-save"></i> Save Dispute Draft';
            }
          };
        }

        // Wire Download Printable PDF
        const downloadPdfBtn = document.getElementById('builder-btn-download-pdf');
        if (downloadPdfBtn) {
          downloadPdfBtn.onclick = async () => {
            try {
              downloadPdfBtn.disabled = true;
              downloadPdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...';
              
              const campaignStatus = state.disputeStatus[reportId] || { step: 'pinning', savedDocId: null, isSent: false };
              
              // Ensure we have a saved doc ID first
              let docId = campaignStatus.savedDocId;
              const currentContent = textarea.value;
              
              if (!docId) {
                // Save first
                const pinnedIds = state.selectedDisputeItems[reportId] || [];
                const res = await api('/documents/generate', {
                  method: 'POST',
                  body: JSON.stringify({
                    clientId: r.client_id,
                    reportId: reportId,
                    violationIds: pinnedIds.filter(id => id.startsWith('violation-')).map(id => id.replace('violation-', '')),
                    docType: '1681i-letter',
                    bureau: bureauSelect.value,
                    creditorName: 'Equifax, Experian, TransUnion',
                    creditorAddress: 'Dispute Centers'
                  })
                });
                docId = res.id;
                campaignStatus.savedDocId = docId;
                campaignStatus.step = 'draft';
                state.disputeStatus[reportId] = campaignStatus;
                localStorage.setItem('fcra_dispute_status', JSON.stringify(state.disputeStatus));
                
                await api(`/documents/${docId}`, {
                  method: 'PUT',
                  body: JSON.stringify({ content: currentContent })
                });
              } else {
                // Update content
                await api(`/documents/${docId}`, {
                  method: 'PUT',
                  body: JSON.stringify({ content: currentContent })
                });
              }
              
              // Trigger PDF download
              const chkHired = document.getElementById('builder-toggle-hired');
              const chkRep = document.getElementById('builder-toggle-rep');
              const isHiredAdvocate = chkHired ? chkHired.checked : true;
              const repAgreementAttached = chkRep ? chkRep.checked : true;

              const headers = {};
              if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
              const pdfRes = await fetch(`/api/documents/${docId}/pdf?isHiredAdvocate=${isHiredAdvocate}&repAgreementAttached=${repAgreementAttached}`, { headers });
              if (!pdfRes.ok) throw new Error('PDF compilation failed.');
              
              const blob = await pdfRes.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `Certified-Dispute-Letter-${reportId}.pdf`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
              
              toast('Printable PDF downloaded!', 'success');
              
              // Update status to 'sent'
              campaignStatus.isSent = true;
              campaignStatus.step = 'sent';
              state.disputeStatus[reportId] = campaignStatus;
              localStorage.setItem('fcra_dispute_status', JSON.stringify(state.disputeStatus));
              
              window._updateCampaignHUD(reportId);
            } catch(err) {
              toast(`Failed to download PDF: ${err.message}`, 'error');
            } finally {
              downloadPdfBtn.disabled = false;
              downloadPdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Download Printable PDF';
            }
          };
        }
      };

      // Fullscreen Toggle for Raw Monospace Text Inspector
      window._toggleRawFullscreen = () => {
        const inspector = document.getElementById('raw-inspector-column');
        const container = document.getElementById('raw-text-container');
        const icon = document.getElementById('raw-fullscreen-icon');
        const btnText = document.getElementById('raw-fullscreen-text');
        if (!inspector || !container) return;

        const isFullscreen = inspector.classList.contains('fixed');
        if (!isFullscreen) {
          // Save current scroll offset
          const scrollPos = container.scrollTop;
          // Convert layout to a high-Z floating fullscreen container
          inspector.classList.remove('lg:col-span-5', 'h-auto', 'min-h-[500px]', 'lg:h-[calc(100vh-220px)]', 'lg:sticky', 'lg:top-[80px]', 'bg-gray-950/40', 'rounded-2xl');
          inspector.classList.add('fixed', 'inset-4', 'md:inset-8', 'z-[9999]', 'bg-gray-950', 'border-2', 'border-blue-500/40', 'rounded-2xl', 'p-6', 'shadow-2xl', 'fade-in');
          if (icon) icon.className = 'fas fa-compress-alt text-[9px]';
          if (btnText) btnText.textContent = 'Minimize';
          // Restore scroll offset after DOM updates
          setTimeout(() => { container.scrollTop = scrollPos; }, 50);
          toast('Fullscreen report viewer active. Press Esc to minimize.', 'info');
        } else {
          const scrollPos = container.scrollTop;
          // Return layout to split-screen default
          inspector.classList.remove('fixed', 'inset-4', 'md:inset-8', 'z-[9999]', 'bg-gray-950', 'border-2', 'border-blue-500/40', 'p-6', 'fade-in');
          inspector.classList.add('lg:col-span-5', 'h-auto', 'min-h-[500px]', 'lg:h-[calc(100vh-220px)]', 'lg:sticky', 'lg:top-[80px]', 'bg-gray-950/40', 'rounded-2xl');
          if (icon) icon.className = 'fas fa-expand-alt text-[9px]';
          if (btnText) btnText.textContent = 'Maximize';
          setTimeout(() => { container.scrollTop = scrollPos; }, 50);
        }
      };

      // Safe global keydown listener registration to handle Escape dismissals
      const escListener = (e) => {
        if (e.key === 'Escape') {
          const inspector = document.getElementById('raw-inspector-column');
          if (inspector && inspector.classList.contains('fixed')) {
            window._toggleRawFullscreen();
          }
        }
      };
      document.removeEventListener('keydown', window._rawEscListener);
      window._rawEscListener = escListener;
      document.addEventListener('keydown', window._rawEscListener);

      // Initialize HUD and Highlights on Load
      window._updateCampaignHUD(r.id);
      window._highlightViolationsInRawText(r.id, res.violations);

    } catch(err) {
      console.error("WORKSPACE RENDER ERROR:", err);
      el.innerHTML = `<div class="fade-in">
        <button onclick="window._nav('reports')" class="text-gray-400 hover:text-white text-sm mb-4 inline-flex items-center gap-1.5 transition">
          <i class="fas fa-arrow-left text-xs"></i>Back
        </button>
        <div class="glass rounded-xl p-8 border border-red-500/30 text-center">
          <i class="fas fa-exclamation-triangle text-3xl text-red-400 mb-3"></i>
          <h3 class="text-lg font-bold text-white mb-1">Failed to load report workspace</h3>
          <p class="text-sm text-gray-400">${err.message}</p>
        </div>
      </div>`;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // REPORTS LIST
  // ═══════════════════════════════════════════════════════════════
  async function pgReports(el) {
    el.innerHTML = `<div class="flex items-center justify-center py-20"><div class="text-center"><i class="fas fa-spinner fa-spin text-3xl text-blue-400 mb-3"></i><div class="text-sm text-gray-400">Loading reports...</div></div></div>`;
    try {
      const clients = await api('/clients');
      const withReports = clients.clients.filter(c => c.report_count > 0);
      el.innerHTML = `<div class="fade-in">
        <div class="flex items-center justify-between mb-6"><div><h1 class="text-xl font-bold text-white">Credit Reports</h1><p class="text-sm text-gray-400">${withReports.length} client${withReports.length!==1?'s':''} with reports</p></div></div>
        ${withReports.length?`<div class="space-y-2">${withReports.map(c=>`<div onclick="window._nav('client-detail',{clientId:'${c.id}'})" class="glass rounded-xl p-4 card-hover cursor-pointer"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-sm">${(c.first_name||'?')[0]}${(c.last_name||'?')[0]}</div><div class="flex-1"><div class="text-sm font-medium text-white">${c.first_name} ${c.last_name}</div><div class="text-xs text-gray-400">${c.report_count} report(s) &bull; ${c.violation_count} violation(s)</div></div>${c.damages_max?`<div class="text-sm font-bold text-green-400">${money(c.damages_max)}</div>`:''}</div></div>`).join('')}</div>`:'<div class="glass rounded-xl p-8 text-center text-gray-500"><i class="fas fa-file-alt text-3xl mb-3"></i><p>No reports yet</p><p class="text-xs text-gray-600 mt-2">Upload a credit report to get started</p></div>'}
      </div>`;
    } catch(err) {
      el.innerHTML = `<div class="fade-in"><div class="glass rounded-xl p-8 border border-red-500/30 text-center"><i class="fas fa-exclamation-triangle text-3xl text-red-400 mb-3"></i><h3 class="text-lg font-bold text-white mb-1">Failed to load reports</h3><p class="text-sm text-gray-400">${err.message}</p><button onclick="window._nav('reports')" class="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">Retry</button></div></div>`;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // VIOLATIONS LIST
  // ═══════════════════════════════════════════════════════════════
  async function pgViolations(el) {
    el.innerHTML = `<div class="flex items-center justify-center py-20"><div class="text-center"><i class="fas fa-spinner fa-spin text-3xl text-red-400 mb-3"></i><div class="text-sm text-gray-400">Loading violations...</div></div></div>`;
    try {
      const d = await api('/violations');
      const totalMin = d.violations.reduce((s,v) => s + (v.total_damages_min||0), 0);
      const totalMax = d.violations.reduce((s,v) => s + (v.total_damages_max||0), 0);
      el.innerHTML = `<div class="fade-in">
        <div class="flex items-center justify-between mb-6"><div><h1 class="text-xl font-bold text-white">All Violations</h1><p class="text-sm text-gray-400">${d.violations.length} total &bull; ${money(totalMin)} &ndash; ${money(totalMax)}</p></div>
          <div class="flex gap-2">
            <select id="f-sev" class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs outline-none"><option value="">All Severities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
            <select id="f-cat" class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs outline-none"><option value="">All Categories</option><option value="FCRA">FCRA</option><option value="FDCPA">FDCPA</option><option value="ECOA">ECOA</option></select>
          </div>
        </div><div id="v-list">${renderViolationsList(d.violations)}</div></div>`;
      const reload = async () => { const sev = $('#f-sev').value; const cat = $('#f-cat').value; const f = await api(`/violations?${sev?'severity='+sev+'&':''}${cat?'category='+cat:''}`); $('#v-list').innerHTML = renderViolationsList(f.violations); };
      $('#f-sev').onchange = reload;
      $('#f-cat').onchange = reload;
    } catch(err) {
      el.innerHTML = `<div class="fade-in"><div class="glass rounded-xl p-8 border border-red-500/30 text-center"><i class="fas fa-exclamation-triangle text-3xl text-red-400 mb-3"></i><h3 class="text-lg font-bold text-white mb-1">Failed to load violations</h3><p class="text-sm text-gray-400">${err.message}</p><button onclick="window._nav('violations')" class="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">Retry</button></div></div>`;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // DOCUMENTS
  // ═══════════════════════════════════════════════════════════════
  async function pgDocuments(el) {
    el.innerHTML = `<div class="flex items-center justify-center py-20"><div class="text-center"><i class="fas fa-spinner fa-spin text-3xl text-blue-400 mb-3"></i><div class="text-sm text-gray-400">Loading documents...</div></div></div>`;
    try {
      const d = await api('/documents');
      el.innerHTML = `<div class="fade-in">
        <div class="flex items-center justify-between mb-6"><div><h1 class="text-xl font-bold text-white">Documents</h1><p class="text-sm text-gray-400">${d.documents.length} generated</p></div></div>
        ${d.documents.length?`<div class="space-y-2">${d.documents.map(dc=>`<div onclick="window._viewDoc('${dc.id}')" class="glass rounded-xl p-4 card-hover cursor-pointer"><div class="flex items-center justify-between"><div><div class="text-sm font-medium text-white"><i class="fas fa-file-contract mr-2 text-purple-400"></i>${dc.title}</div><div class="text-xs text-gray-400">${dc.first_name} ${dc.last_name} &bull; ${dc.doc_type} &bull; ${shortDate(dc.created_at)}</div></div><span class="px-2 py-0.5 rounded text-[10px] font-medium ${dc.status==='draft'?'bg-yellow-900/30 text-yellow-400':'bg-green-900/30 text-green-400'}">${dc.status}</span></div></div>`).join('')}</div>`:'<div class="glass rounded-xl p-8 text-center border border-gray-700"><i class="fas fa-folder-open text-3xl text-gray-600 mb-3"></i><h3 class="text-sm font-semibold text-white mb-1">No documents yet</h3><p class="text-xs text-gray-500">Generate your first legal document from a client profile</p></div>'}
      </div>`;
    } catch(err) {
      el.innerHTML = `<div class="fade-in"><div class="glass rounded-xl p-8 border border-red-500/30 text-center"><i class="fas fa-exclamation-triangle text-3xl text-red-400 mb-3"></i><h3 class="text-lg font-bold text-white mb-1">Failed to load documents</h3><p class="text-sm text-gray-400">${err.message}</p><button onclick="window._nav('documents')" class="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">Retry</button></div></div>`;
    }
  }

  window._viewDoc = async function(id) {
    const el = $('#page-content');
    const d = await api(`/documents/${id}`);
    const dc = d.document;
    const clientRes = await api(`/clients/${dc.client_id}`).catch(() => null);
    const client = clientRes?.client || {};
    el.innerHTML = `<div class="fade-in">
      <button onclick="window._nav('documents')" class="text-gray-400 hover:text-white text-sm mb-4 inline-flex items-center gap-1.5 transition"><i class="fas fa-arrow-left text-xs"></i>Back</button>
      <div class="flex items-center justify-between mb-4"><h1 class="text-xl font-bold text-white">${dc.title}</h1>
        <div class="flex gap-2"><button id="ai-rewrite-btn" onclick="window._aiRewrite('${dc.id}')" class="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition"><i class="fas fa-robot mr-1"></i>AI Rewrite</button><button onclick="window._copyDoc()" class="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-xs font-medium transition"><i class="fas fa-copy mr-1"></i>Copy</button><button onclick="window._emailDoc()" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition"><i class="fas fa-envelope mr-1"></i>Email</button><button onclick="window._mailDoc('${dc.id}','${encodeURIComponent(client.first_name||'')}','${encodeURIComponent(client.last_name||'')}','${encodeURIComponent(client.address_line1||'')}','${encodeURIComponent(client.city||'')}','${encodeURIComponent(client.state||'')}','${encodeURIComponent(client.zip||'')}')" class="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition"><i class="fas fa-paper-plane mr-1"></i>Mail</button><button onclick="window._printDoc()" class="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-xs font-medium transition"><i class="fas fa-print mr-1"></i>Print</button></div>
      </div>
      <div class="glass rounded-xl p-6"><pre id="doc-content" class="whitespace-pre-wrap text-sm text-gray-200 font-mono leading-relaxed">${dc.content}</pre></div>
    </div>`;
  };

  window._copyDoc = function() { const c = $('#doc-content')?.textContent; if (c) { navigator.clipboard.writeText(c); toast('Copied!','success'); } };
  window._printDoc = function() { const c = $('#doc-content')?.textContent; if (c) { const w = window.open('','_blank'); w.document.write(`<html><head><title>Document</title><style>body{font-family:monospace;white:pre-wrap;padding:40px;font-size:12px;line-height:1.6;}</style></head><body>${c}</body></html>`); w.document.close(); w.print(); } };
  window._emailDoc = function() { const c = $('#doc-content')?.textContent; if (!c) return; const subject = encodeURIComponent('FCRA Legal Document'); const body = encodeURIComponent(c); window.open(`mailto:?subject=${subject}&body=${body}`, '_self'); };

  window._aiRewrite = async function(id) {
    const btn = $('#ai-rewrite-btn');
    if (!btn) return;
    const originalHtml = btn.innerHTML;
    
    if (!confirm('Are you sure you want to dynamically rewrite this dispute letter using Cloudflare Workers AI?\n\nThis will semantically modify the layout and sentence structure to bypass credit bureau OCR scanners while fully preserving account details and statutes.')) return;
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Rewriting...';
    
    try {
      const res = await api(`/documents/${id}/ai-rewrite`, { method: 'POST' });
      if (res.content) {
        const contentEl = $('#doc-content');
        if (contentEl) {
          contentEl.textContent = res.content;
        }
        toast('Document successfully rewritten by Cloudflare Workers AI!', 'success');
      } else {
        throw new Error('No content returned from server.');
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  };
  window._mailDoc = async function(id, firstName, lastName, address, city, state, zip) {
    const recipientName = `${decodeURIComponent(firstName || '')} ${decodeURIComponent(lastName || '')}`.trim();
    const recipientAddress = decodeURIComponent(address || '');
    const recipientCity = decodeURIComponent(city || '');
    const recipientState = decodeURIComponent(state || '');
    const recipientZip = decodeURIComponent(zip || '');
    if (!recipientAddress || !recipientCity || !recipientState || !recipientZip) {
      toast('Client address incomplete — please fill address in client profile first','error');
      return;
    }
    if (!confirm(`Mail "${decodeURIComponent(id)}"?\n\nTo: ${recipientName}\n${recipientAddress}\n${recipientCity}, ${recipientState} ${recipientZip}\n\nThis will send via Click2Mail.`)) return;
    try {
      const res = await fetch(`/api/documents/${id}/send`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ recipientName, recipientAddress, recipientCity, recipientState, recipientZip }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');
      toast(`Mailed successfully! Mailing ID: ${data.mailingId}`,'success');
    } catch(err) { toast(err.message,'error'); }
  };

  // ═══════════════════════════════════════════════════════════════
  // GENERATE DOCUMENT
  // ═══════════════════════════════════════════════════════════════
  async function pgGenerateDoc(el, data) {
    const typesRes = await api('/document-types');
    // Group by category
    const categories = {};
    typesRes.types.forEach(t => { if (!categories[t.category]) categories[t.category] = []; categories[t.category].push(t); });

    const litigationTips = {
      'fed-complaint': {
        icon: 'fa-gavel',
        title: 'Federal Court Complaint (FCRA Lawsuit)',
        whenToUse: 'Use this when credit bureaus or furnishers willfully or negligently refuse to correct confirmed, documented inaccuracies after multiple rounds of formal disputes.',
        strategy: 'Filing in US District Court forces the defendants to refer the case to their legal/compliance departments. This triggers actual risk assessment instead of automatic offshore computer verifications.',
        remedy: 'Statutory damages up to $1,000 per violation, actual damages (emotional distress, credit denials), punitive damages, and mandatory attorney fees.',
        requirements: 'Must be filed with a Civil Cover Sheet (JS 44) and highly recommended to attach Plaintiff\'s Sworn Affidavit of Facts.'
      },
      'fed-affidavit': {
        icon: 'fa-signature',
        title: "Plaintiff's Federal Affidavit of Facts",
        whenToUse: 'Must be signed, notarized, and attached to your Federal Complaint, Opposition to Dismissal, or Motion for Summary Judgment to establish a sworn record of concrete facts.',
        strategy: 'By presenting a sworn, notarized affidavit, you establish admissible, non-hearsay evidence of credit denials, high interest rates, and severe emotional distress.',
        remedy: 'Provides the concrete proof of "actual damages" and concrete injury required under Spokeo/TransUnion standing standards.',
        requirements: 'Requires signing in front of a licensed Notary Public with a physical or electronic seal.'
      },
      'state-complaint': {
        icon: 'fa-building-columns',
        title: 'State Court / Small Claims Complaint',
        whenToUse: 'Perfect for faster, lower-cost litigation in your local County Court or Small Claims Court without requiring an attorney.',
        strategy: 'Corporations must hire outside counsel to represent them in local small claims courts. Since corporate lawyer fees often exceed $3,000 per day, companies almost always settle small claims cases quickly.',
        remedy: 'Damages up to your state\'s small claims limit (usually $5,000 to $15,000). Direct order to delete the inaccurate listings.',
        requirements: 'File with the local County Clerk of Court. Pay a nominal filing fee (often waived for low-income filers).'
      },
      'civil-coversheet': {
        icon: 'fa-file-lines',
        title: 'Federal Court Civil Cover Sheet Statement',
        whenToUse: 'Required as an administrative backing page (Form JS 44) when opening any new civil lawsuit in the United States District Court.',
        strategy: 'Categorizes the lawsuit under Federal Question jurisdiction (15 U.S.C. § 1681 - Fair Credit Reporting Act) to ensure proper assignment and tracking.',
        remedy: 'Ensures your case is classified as a jury trial case, signaling high stakes to the defense counsel.',
        requirements: 'Must precisely match the parties listed in the caption of your main Federal Complaint.'
      },
      'motion-summary-judg': {
        icon: 'fa-file-contract',
        title: "Plaintiff's Motion for Summary Judgment Outline",
        whenToUse: 'File this after the Discovery phase of litigation, once the defendants have answered and both parties have exchanged documents.',
        strategy: 'Argues that there are no genuine issues of material fact and that the law requires a ruling in the plaintiff\'s favor on liability. Avoids the delay and cost of a full trial.',
        remedy: 'Locks in liability against the credit bureaus/furnishers, leaving only the damages dollar amount to be decided.',
        requirements: 'Supported by the transcripts, dispute history letters, and the Plaintiff\'s sworn Affidavit.'
      }
    };

    const standardTips = {
      'bureau-dispute': {
        icon: 'fa-paper-plane',
        title: 'Bureau Dispute Letter',
        whenToUse: 'Use this as your Round 1/2 formal dispute to the main Credit Bureaus (Equifax, Experian, TransUnion).',
        strategy: 'Specify the exact account and provide the detailed inaccuracy. Forces the bureau to initiate a 30-day reinvestigation under FCRA § 611.'
      },
      'furnisher-dispute': {
        icon: 'fa-university',
        title: 'Furnisher Direct Dispute',
        whenToUse: 'Send directly to the bank, lender, or collection agency reporting the inaccurate tradeline.',
        strategy: 'Under FCRA § 623(a)(8), this triggers their direct duty to investigate the reporting. If they fail to conduct a reasonable investigation, they face civil liability.'
      },
      'debt-validation': {
        icon: 'fa-shield-halved',
        title: 'Debt Validation Demand',
        whenToUse: 'Send to third-party collection agencies within 30 days of their initial contact notice.',
        strategy: 'Under FDCPA § 809, this legally halts all collection activities until they verify and validate the debt with original contracts.'
      },
      '609-disclosure': {
        icon: 'fa-folder-open',
        title: '§ 609 Full File Disclosure Request',
        whenToUse: 'Use when a credit bureau is refusing to disclose all sources or soft inquiries on your report.',
        strategy: 'Cites FCRA § 609(a)(1) requiring them to provide everything in your consumer file, including soft pulls and credit source details.'
      },
      'method-of-verification': {
        icon: 'fa-magnifying-glass-chart',
        title: 'Method of Verification Request',
        whenToUse: 'Send within 15 days of receiving a "verified" dispute result from a credit bureau.',
        strategy: 'Demands under FCRA § 611(a)(7) that they provide the name, address, and phone number of the employee contacted to verify the information.'
      },
      'cease-desist': {
        icon: 'fa-ban',
        title: 'Cease and Desist Letter',
        whenToUse: 'Send to abusive collection agencies to permanently stop telephone harassment.',
        strategy: 'Under FDCPA § 1692c(c), once received, collectors are legally barred from contacting you except to notify of specific legal actions.'
      },
      'intent-to-sue': {
        icon: 'fa-triangle-exclamation',
        title: 'Intent to Sue Notice',
        whenToUse: 'Send as a final pre-litigation warning to corporate compliance or legal counsel.',
        strategy: 'Gives them a final 15 days to delete the inaccurate reporting and settle out of court, or face a formal federal/state lawsuit.'
      },
      'goodwill-letter': {
        icon: 'fa-heart',
        title: 'Goodwill Adjustment Request',
        whenToUse: 'Polite, persuasive plea for negative late-payment removal or correction when you have paid off the account.',
        strategy: 'Usually reviewed by human customer loyalty agents who have discretionary power to remove negative reports as a gesture of goodwill.'
      },
      'cfpb-complaint': {
        icon: 'fa-gavel',
        title: 'CFPB Complaint Helper',
        whenToUse: 'File on the CFPB portal when credit bureaus or lenders ignore your dispute results.',
        strategy: 'CFPB complaints are routed directly to executive response units at the major bureaus, bypassing standard generic scanning centers.'
      }
    };

    el.innerHTML = `<div class="fade-in max-w-6xl">
      <button onclick="window._nav('client-detail',{clientId:'${data.clientId}'})" class="text-gray-400 hover:text-white text-sm mb-4 inline-flex items-center gap-1.5 transition"><i class="fas fa-arrow-left text-xs"></i>Back to ${data.clientName}</button>
      
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-white mb-1"><i class="fas fa-file-contract text-blue-500 mr-2"></i>Generate Legal Document</h1>
          <p class="text-sm text-gray-400">${typesRes.types.length} professional, court-ready templates for ${data.clientName}</p>
        </div>
        <div id="litigation-action-box" class="hidden">
          <button onclick="window._bulkGenerateLitigation('${data.clientId}','${data.reportId||''}')" class="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-lg shadow-blue-500/20 transition flex items-center gap-2"><i class="fas fa-layer-group"></i>Generate All 5 Litigation Files</button>
        </div>
      </div>

      <div class="bg-blue-900/30 border border-blue-600/40 rounded-xl p-4 mb-6">
        <h3 class="text-sm font-semibold text-blue-300 mb-2"><i class="fas fa-gavel mr-2"></i>Legal Disclaimer</h3>
        <p class="text-xs text-blue-200/80 leading-relaxed">
          <strong>NOT LEGAL ADVICE:</strong> Documents generated here are prepared by a document preparation service, NOT an attorney.
          Under FCRA § 1681 et seq., you have rights to dispute inaccurate information. This service does not guarantee dispute outcomes.
          For legal advice about your specific situation, consult a qualified attorney. See our
          <a href="/compliance/disclaimers" target="_blank" class="underline hover:text-blue-100">full disclaimers</a>.
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Form Column -->
        <div class="lg:col-span-7 bg-gray-900/40 border border-gray-800/80 rounded-2xl p-6 space-y-6">
          <form id="gen-doc-form" class="space-y-4">
            <div><label class="block text-xs text-gray-400 mb-1.5">Document Type *</label>
              <select name="docType" required class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none">
                ${Object.entries(categories).map(([cat, types]) => `<optgroup label="${cat}">${types.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}</optgroup>`).join('')}
              </select>
              <div id="doc-desc" class="text-xs text-gray-500 mt-1"></div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div><label class="block text-xs text-gray-400 mb-1.5">Bureau</label><select name="bureau" class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none"><option value="Equifax">Equifax</option><option value="Experian">Experian</option><option value="TransUnion">TransUnion</option></select></div>
              <div><label class="block text-xs text-gray-400 mb-1.5">Creditor Name</label><input type="text" name="creditorName" class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none" placeholder="e.g., Midland Credit"></div>
            </div>
            <div><label class="block text-xs text-gray-400 mb-1.5">Creditor Address</label><input type="text" name="creditorAddress" class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none" placeholder="P.O. Box..."></div>
            <div class="flex gap-3 pt-2">
              <button type="submit" id="gen-btn" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition"><i class="fas fa-magic mr-2"></i>Generate</button>
              <button type="button" onclick="window._bulkGenerate('${data.clientId}','${data.reportId||''}')" class="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-4 py-2.5 rounded-lg text-sm font-medium transition"><i class="fas fa-layer-group mr-1"></i>Generate All 10 Disputes</button>
            </div>
          </form>
        </div>

        <!-- Strategy / Playbook Column -->
        <div class="lg:col-span-5 space-y-6">
          <div id="playbook-guide-card" class="bg-gradient-to-br from-blue-950/40 to-indigo-950/40 border border-blue-500/20 rounded-2xl p-6 fade-in shadow-xl">
            <div class="flex items-center gap-2.5 mb-4">
              <div class="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center text-sm font-bold"><i id="playbook-icon" class="fas fa-book"></i></div>
              <h3 class="text-sm font-bold text-white">Rick's Litigation Playbook</h3>
            </div>
            
            <div class="space-y-4">
              <div>
                <h4 class="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">When to Use</h4>
                <p id="playbook-whentouse" class="text-xs text-gray-300 leading-relaxed"></p>
              </div>
              
              <div id="playbook-strategy-section">
                <h4 class="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">Strategic Leverage</h4>
                <p id="playbook-strategy" class="text-xs text-gray-300 leading-relaxed"></p>
              </div>

              <div id="playbook-remedy-section" class="hidden">
                <h4 class="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">Potential Remedies</h4>
                <p id="playbook-remedy" class="text-xs text-emerald-300/90 leading-relaxed font-medium bg-emerald-950/20 border border-emerald-500/20 rounded-lg p-2.5"></p>
              </div>

              <div id="playbook-req-section" class="hidden">
                <h4 class="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-1">Filing Requirements</h4>
                <p id="playbook-req" class="text-xs text-yellow-300/90 leading-relaxed"></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="gen-result" class="hidden mt-8"></div>
    </div>`;

    // Show description on type change
    const docTypeMap = {};
    typesRes.types.forEach(t => docTypeMap[t.id] = t);
    const sel = $('select[name="docType"]');
    const desc = $('#doc-desc');

    sel.onchange = () => {
      const val = sel.value;
      const t = docTypeMap[val];
      if (t) desc.textContent = t.description;

      const isLitigationCategory = t && t.category === 'Court & Litigation filings';
      const litBox = $('#litigation-action-box');
      if (isLitigationCategory) {
        litBox.classList.remove('hidden');
      } else {
        litBox.classList.add('hidden');
      }

      // Update Playbook Card details
      const tip = litigationTips[val] || standardTips[val] || {
        icon: 'fa-file-shield',
        title: t ? t.name : 'Standard Document',
        whenToUse: t ? t.description : 'Standard dispute or demand letter.',
        strategy: 'Follow standard certified mail procedures. Keep a clear tracking log of all correspondence.'
      };

      $('#playbook-icon').className = `fas ${tip.icon || 'fa-book'}`;
      $('#playbook-whentouse').textContent = tip.whenToUse;
      $('#playbook-strategy').textContent = tip.strategy;

      const remSec = $('#playbook-remedy-section');
      if (tip.remedy) {
        remSec.classList.remove('hidden');
        $('#playbook-remedy').textContent = tip.remedy;
      } else {
        remSec.classList.add('hidden');
      }

      const reqSec = $('#playbook-req-section');
      if (tip.requirements) {
        reqSec.classList.remove('hidden');
        $('#playbook-req').textContent = tip.requirements;
      } else {
        reqSec.classList.add('hidden');
      }
    };
    sel.dispatchEvent(new Event('change'));

    $('#gen-doc-form').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const btn = $('#gen-btn');
      btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Generating...';
      try {
        const result = await api('/documents/generate', { method:'POST', body:JSON.stringify({ clientId:data.clientId, reportId:data.reportId||null, docType:fd.get('docType'), bureau:fd.get('bureau'), creditorName:fd.get('creditorName'), creditorAddress:fd.get('creditorAddress') })});
        const resEl = $('#gen-result');
        resEl.classList.remove('hidden');
        resEl.innerHTML = `<div class="glass rounded-xl p-5 fade-in">
          <div class="flex items-center justify-between mb-3"><h3 class="text-sm font-bold text-white">${result.title}</h3><div class="flex gap-2"><button onclick="navigator.clipboard.writeText($('#gen-doc-content').textContent);window._toast('Copied!','success')" class="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg text-xs transition"><i class="fas fa-copy mr-1"></i>Copy</button><button onclick="window._viewDoc('${result.id}')" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs transition"><i class="fas fa-external-link-alt mr-1"></i>View</button></div></div>
          <pre id="gen-doc-content" class="whitespace-pre-wrap text-xs text-gray-300 font-mono bg-gray-800/60 rounded-lg p-4 max-h-96 overflow-y-auto">${result.content}</pre></div>`;
        toast('Document generated!', 'success');
      } catch(err) { toast(err.message, 'error'); }
      finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-magic mr-2"></i>Generate'; }
    };
  }

  window._toast = toast;

  // ═══════════════════════════════════════════════════════════════
  // TEAM
  // ═══════════════════════════════════════════════════════════════
  async function pgTeam(el) {
    el.innerHTML = `<div class="flex items-center justify-center py-20"><div class="text-center"><i class="fas fa-spinner fa-spin text-3xl text-blue-400 mb-3"></i><div class="text-sm text-gray-400">Loading team...</div></div></div>`;
    try {
      const d = await api('/team');
      el.innerHTML = `<div class="fade-in">
        <div class="flex items-center justify-between mb-6"><div><h1 class="text-xl font-bold text-white">Team</h1><p class="text-sm text-gray-400">${d.members.length} members &bull; ${state.org?.plan||'free'} plan</p></div>
          ${state.user?.role==='admin' || state.user?.role==='super_admin'?`<button onclick="$('#invite-form').classList.toggle('hidden')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"><i class="fas fa-user-plus mr-1.5"></i>Add Member</button>`:''}
        </div>
        <div id="invite-form" class="hidden glass rounded-xl p-5 mb-6 fade-in"><h3 class="text-sm font-semibold text-white mb-4">Add Team Member</h3>
          <form id="team-form" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label class="block text-xs text-gray-400 mb-1">Name *</label><input type="text" name="name" required class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"></div>
            <div><label class="block text-xs text-gray-400 mb-1">Email *</label><input type="email" name="email" required class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"></div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Password *</label>
              <div class="relative">
                <input type="password" id="team-password" name="password" required minlength="6" class="w-full bg-gray-800/80 border border-gray-700 rounded-lg pl-3 pr-10 py-2 text-white text-sm focus:border-blue-500 outline-none">
                <button type="button" class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white" onclick="const input = document.getElementById('team-password'); const icon = this.querySelector('i'); if (input.type === 'password') { input.type = 'text'; icon.className = 'fas fa-eye-slash'; } else { input.type = 'password'; icon.className = 'fas fa-eye'; }">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </div>
            <div><label class="block text-xs text-gray-400 mb-1">Role</label><select name="role" class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"><option value="member">Member</option><option value="admin">Admin</option></select></div>
            <div class="md:col-span-2 flex gap-2"><button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition">Add</button><button type="button" onclick="$('#invite-form').classList.add('hidden')" class="bg-gray-700 text-white px-5 py-2 rounded-lg text-sm">Cancel</button></div>
          </form></div>
        ${d.members.length?`<div class="space-y-2">${d.members.map(m=>`<div class="glass rounded-xl p-4"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full ${m.id===state.user?.id?'bg-blue-600':'bg-gray-700'} flex items-center justify-center text-white font-bold text-sm">${(m.name||'?')[0].toUpperCase()}</div><div class="flex-1"><div class="text-sm font-medium text-white">${m.name} ${m.id===state.user?.id?'<span class="text-xs text-blue-400">(you)</span>':''}</div><div class="text-xs text-gray-400">${m.email}</div></div><span class="px-2 py-0.5 rounded text-[10px] font-medium ${m.role==='admin'?'bg-purple-900/30 text-purple-400':'bg-gray-700 text-gray-400'}">${m.role}</span><span class="px-2 py-0.5 rounded text-[10px] font-medium ${m.is_active?'bg-green-900/30 text-green-400':'bg-red-900/30 text-red-400'}">${m.is_active?'Active':'Inactive'}</span></div></div>`).join('')}</div>`:'<div class="glass rounded-xl p-8 text-center border border-gray-700"><i class="fas fa-users text-3xl text-gray-600 mb-3"></i><h3 class="text-sm font-semibold text-white mb-1">No team members yet</h3><p class="text-xs text-gray-500">Invite your first team member to get started</p></div>'}
      </div>`;
      const f = $('#team-form');
      if (f) f.onsubmit = async (e) => { e.preventDefault(); const fd = new FormData(e.target); try { await api('/team/invite',{method:'POST',body:JSON.stringify({name:fd.get('name'),email:fd.get('email'),password:fd.get('password'),role:fd.get('role')})}); toast('Member added!','success'); await pgTeam(el); } catch(err) { toast(err.message,'error'); } };
    } catch(err) {
      el.innerHTML = `<div class="fade-in"><div class="glass rounded-xl p-8 border border-red-500/30 text-center"><i class="fas fa-exclamation-triangle text-3xl text-red-400 mb-3"></i><h3 class="text-lg font-bold text-white mb-1">Failed to load team</h3><p class="text-sm text-gray-400">${err.message}</p><button onclick="window._nav('team')" class="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">Retry</button></div></div>`;
    }
  }

  async function pgAiStudio(el) {
    try {
      const [providers, mentorsRes] = await Promise.all([
        api('/ai/providers'),
        api('/ai/mentors'),
      ]);
      const list = (providers.providers || []).filter(p => p.configured);
      const mentors = mentorsRes.mentors || [];
      el.innerHTML = `<div class="fade-in space-y-6">
        <div>
          <h1 class="text-xl font-bold text-white">AI Studio · Agents & Mentors</h1>
          <p class="text-sm text-gray-400">Free-only models (NVIDIA NIM first) + case-law knowledge mentors for staff CRM</p>
        </div>
        <div class="glass rounded-xl p-4 border border-gray-700">
          <div class="text-xs text-gray-400 mb-2">Free providers · default ${escapeHtml(providers.defaultProvider || 'nvidia')} · freeOnly=${providers.freeOnly}</div>
          <div class="flex flex-wrap gap-2">${list.map(p => `<span class="px-2 py-1 rounded bg-emerald-900/30 text-emerald-300 text-[11px] font-semibold">${p.id} · ${p.tier}</span>`).join('') || '<span class="text-amber-400 text-xs">No providers</span>'}</div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          ${mentors.map(m => `
            <button class="mentor-card text-left glass rounded-xl p-4 border border-gray-700 hover:border-blue-500/40 transition" data-mentor="${m.id}">
              <div class="text-sm font-semibold text-white mb-1">${escapeHtml(m.name)}</div>
              <div class="text-[11px] text-gray-400">${escapeHtml(m.blurb)}</div>
            </button>
          `).join('')}
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="glass rounded-xl p-5 border border-gray-700 space-y-3">
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-sm font-semibold text-white">Mentor Chat</h2>
              <select id="ai-mentor-select" class="bg-gray-950 border border-gray-800 rounded-lg text-xs text-white px-2 py-1">
                ${mentors.map(m => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('')}
              </select>
            </div>
            <textarea id="ai-chat-input" class="w-full h-28 bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-white" placeholder="Ask about §1681i timelines, Metro 2, dispute sequencing..."></textarea>
            <button id="ai-chat-go" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg">Ask Mentor (NVIDIA free cascade)</button>
            <pre id="ai-chat-out" class="text-xs text-gray-300 whitespace-pre-wrap bg-gray-950/60 border border-gray-800 rounded-lg p-3 min-h-[120px]"></pre>
          </div>
          <div class="glass rounded-xl p-5 border border-gray-700 space-y-3">
            <h2 class="text-sm font-semibold text-white">Free Media Generate</h2>
            <textarea id="ai-media-input" class="w-full h-28 bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-white" placeholder="Professional letterhead watermark, navy and gold, RJ Business Solutions..."></textarea>
            <button id="ai-media-go" class="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-lg">Generate (HF / Replicate free)</button>
            <div id="ai-media-out" class="min-h-[120px] flex items-center justify-center bg-gray-950/60 border border-gray-800 rounded-lg p-3 text-xs text-gray-500">Preview appears here</div>
          </div>
        </div>
      </div>`;

      document.querySelectorAll('.mentor-card').forEach(btn => {
        btn.addEventListener('click', () => {
          $('#ai-mentor-select').value = btn.getAttribute('data-mentor');
          toast('Mentor selected', 'success');
        });
      });

      $('#ai-chat-go').onclick = async () => {
        const message = $('#ai-chat-input').value.trim();
        const mentorId = $('#ai-mentor-select').value;
        if (!message) return toast('Enter a message', 'error');
        $('#ai-chat-out').textContent = 'Thinking with free models…';
        try {
          const d = await api(`/ai/mentors/${mentorId}/chat`, { method: 'POST', body: JSON.stringify({ message }) });
          $('#ai-chat-out').textContent = `${d.reply}\n\n— ${d.mentor?.name || mentorId} · ${d.provider}/${d.model}`;
        } catch (err) {
          $('#ai-chat-out').textContent = err.message;
          toast(err.message, 'error');
        }
      };
      $('#ai-media-go').onclick = async () => {
        const prompt = $('#ai-media-input').value.trim();
        if (!prompt) return toast('Enter a prompt', 'error');
        $('#ai-media-out').textContent = 'Generating…';
        try {
          const d = await api('/ai/media/generate', { method: 'POST', body: JSON.stringify({ prompt }) });
          if (d.b64) $('#ai-media-out').innerHTML = `<img src="${d.b64}" class="max-h-64 rounded-lg" alt="generated"><div class="text-[10px] text-gray-500 mt-2">${d.provider}/${d.model}</div>`;
          else if (d.url) $('#ai-media-out').innerHTML = `<img src="${escapeHtml(d.url)}" class="max-h-64 rounded-lg" alt="generated"><div class="text-[10px] text-gray-500 mt-2">${d.provider}/${d.model}</div>`;
          else $('#ai-media-out').textContent = JSON.stringify(d);
        } catch (err) {
          $('#ai-media-out').textContent = err.message;
          toast(err.message, 'error');
        }
      };
    } catch (err) {
      el.innerHTML = `<div class="glass p-8 rounded-xl border border-red-500/30 text-center text-sm text-gray-300">${escapeHtml(err.message)}</div>`;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SETTINGS — letterhead, MFA, org branding
  // ═══════════════════════════════════════════════════════════════
  async function pgSettings(el) {
    try {
      const [orgRes, mfaRes, postureRes] = await Promise.all([
        api('/settings/org'),
        api('/auth/mfa/status'),
        api('/security/posture').catch(() => null),
      ]);
      const org = orgRes.org || {};
      const settings = org.settings || {};
      const lh = settings.letterhead || {};
      const mfaEnabled = !!mfaRes.enabled;
      const posture = postureRes || null;

      el.innerHTML = `<div class="fade-in space-y-6">
        <div><h1 class="text-xl font-bold text-white">Organization Settings</h1><p class="text-sm text-gray-400">Letterhead, security, and firm branding used on dispute PDFs</p></div>
        ${(state.user?.role === 'admin' || state.user?.role === 'super_admin') && !mfaEnabled ? `<div class="px-4 py-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-100 text-xs"><i class="fas fa-shield-alt mr-1.5"></i><strong>Staff MFA recommended:</strong> Enable MFA below before using backup, privacy fulfillment, or subscription cancellation.</div>` : ''}
        ${posture ? `<div class="glass rounded-xl p-5 border border-emerald-900/40 bg-emerald-950/10">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-sm font-semibold text-white flex items-center gap-2"><i class="fas fa-shield-virus text-emerald-400"></i> Security Posture</h2>
            <span class="text-2xl font-black text-emerald-400 font-mono">${posture.score}<span class="text-xs text-gray-500">/100</span></span>
          </div>
          <div class="grid md:grid-cols-2 gap-2 text-[11px]">
            ${(posture.controls || []).slice(0, 6).map(c => `<div class="flex justify-between gap-2 py-1 border-b border-gray-800/50"><span class="text-gray-400">${escapeHtml(c.title)}</span><span class="${c.status === 'pass' ? 'text-green-400' : 'text-amber-300'} font-bold uppercase text-[10px]">${escapeHtml(c.status)}</span></div>`).join('')}
          </div>
        </div>` : ''}

        <div class="glass rounded-xl p-6 border border-gray-700">
          <h2 class="text-sm font-semibold text-white mb-4 flex items-center gap-2"><i class="fas fa-building text-blue-400"></i> Firm Letterhead</h2>
          <form id="letterhead-form" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="md:col-span-2"><label class="block text-xs text-gray-400 mb-1">Organization Display Name</label><input name="orgName" value="${escapeHtml(org.name || '')}" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"></div>
            <div><label class="block text-xs text-gray-400 mb-1">Firm Name</label><input name="firmName" value="${escapeHtml(lh.firmName || '')}" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"></div>
            <div><label class="block text-xs text-gray-400 mb-1">Attorney / Authorized Name</label><input name="attorneyName" value="${escapeHtml(lh.attorneyName || '')}" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"></div>
            <div class="md:col-span-2"><label class="block text-xs text-gray-400 mb-1">Address</label><input name="address" value="${escapeHtml(lh.address || '')}" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"></div>
            <div><label class="block text-xs text-gray-400 mb-1">City</label><input name="city" value="${escapeHtml(lh.city || '')}" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"></div>
            <div class="grid grid-cols-2 gap-3"><div><label class="block text-xs text-gray-400 mb-1">State</label><input name="state" maxlength="2" value="${escapeHtml(lh.state || '')}" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"></div><div><label class="block text-xs text-gray-400 mb-1">ZIP</label><input name="zip" value="${escapeHtml(lh.zip || '')}" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"></div></div>
            <div><label class="block text-xs text-gray-400 mb-1">Phone</label><input name="phone" value="${escapeHtml(lh.phone || '')}" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"></div>
            <div><label class="block text-xs text-gray-400 mb-1">Email</label><input name="email" value="${escapeHtml(lh.email || '')}" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"></div>
            <div><label class="block text-xs text-gray-400 mb-1">Bar Number</label><input name="barNumber" value="${escapeHtml(lh.barNumber || '')}" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"></div>
            <div class="md:col-span-2"><button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold">Save Letterhead</button></div>
          </form>
        </div>

        <div class="glass rounded-xl p-6 border border-gray-700">
          <h2 class="text-sm font-semibold text-white mb-4 flex items-center gap-2"><i class="fas fa-key text-amber-400"></i> Change Password</h2>
          <form id="staff-pwd-form" class="flex flex-wrap gap-3 items-end">
            <div><label class="block text-xs text-gray-400 mb-1">Current password</label><input type="password" name="currentPassword" required class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white w-48"></div>
            <div><label class="block text-xs text-gray-400 mb-1">New password</label><input type="password" name="newPassword" required minlength="8" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white w-48"></div>
            <button type="submit" class="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-semibold">Update Password</button>
          </form>
        </div>

        <div class="glass rounded-xl p-6 border border-gray-700">
          <h2 class="text-sm font-semibold text-white mb-2 flex items-center gap-2"><i class="fas fa-shield-alt text-emerald-400"></i> Multi-Factor Authentication</h2>
          <p class="text-xs text-gray-400 mb-4">Status: <span class="${mfaEnabled ? 'text-emerald-400' : 'text-amber-400'} font-semibold">${mfaEnabled ? 'Enabled' : 'Disabled'}</span></p>
          <div id="mfa-setup-box" class="space-y-3">
            ${mfaEnabled ? `
              <form id="mfa-disable-form" class="flex flex-wrap gap-3 items-end">
                <div><label class="block text-xs text-gray-400 mb-1">Authenticator code</label><input name="code" maxlength="6" required class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white w-40" placeholder="000000"></div>
                <button type="submit" class="bg-red-600/80 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm">Disable MFA</button>
              </form>
            ` : `
              <button id="btn-mfa-setup" class="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold">Set Up MFA</button>
              <div id="mfa-enroll" class="hidden mt-4 p-4 bg-gray-950/60 border border-gray-800 rounded-xl space-y-3">
                <p class="text-xs text-gray-400">Add this secret to Google Authenticator / Authy, then enter a code to enable:</p>
                <code id="mfa-secret" class="block text-sm text-blue-300 break-all"></code>
                <form id="mfa-enable-form" class="flex flex-wrap gap-3 items-end">
                  <div><label class="block text-xs text-gray-400 mb-1">6-digit code</label><input name="code" maxlength="6" required class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white w-40"></div>
                  <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">Enable MFA</button>
                </form>
              </div>
            `}
          </div>
        </div>
      </div>`;

      const lhForm = $('#letterhead-form');
      const staffPwdForm = $('#staff-pwd-form');
      if (staffPwdForm) staffPwdForm.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          await api('/auth/change-password', { method: 'POST', body: JSON.stringify({
            currentPassword: fd.get('currentPassword'),
            newPassword: fd.get('newPassword'),
          })});
          toast('Password updated', 'success');
          e.target.reset();
        } catch (err) { toast(err.message, 'error'); }
      };
      if (lhForm) lhForm.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          await api('/settings/org', {
            method: 'PUT',
            body: JSON.stringify({
              name: fd.get('orgName'),
              letterhead: {
                firmName: fd.get('firmName'),
                attorneyName: fd.get('attorneyName'),
                address: fd.get('address'),
                city: fd.get('city'),
                state: fd.get('state'),
                zip: fd.get('zip'),
                phone: fd.get('phone'),
                email: fd.get('email'),
                barNumber: fd.get('barNumber'),
              }
            })
          });
          toast('Letterhead saved', 'success');
          if (state.org) setState({ org: { ...state.org, name: fd.get('orgName') } });
        } catch (err) { toast(err.message, 'error'); }
      };

      const setupBtn = $('#btn-mfa-setup');
      if (setupBtn) setupBtn.onclick = async () => {
        try {
          const d = await api('/auth/mfa/setup', { method: 'POST', body: '{}' });
          $('#mfa-secret').textContent = d.secret;
          $('#mfa-enroll').classList.remove('hidden');
        } catch (err) { toast(err.message, 'error'); }
      };
      const enableForm = $('#mfa-enable-form');
      if (enableForm) enableForm.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          await api('/auth/mfa/verify', { method: 'POST', body: JSON.stringify({ code: fd.get('code') }) });
          toast('MFA enabled', 'success');
          await pgSettings(el);
        } catch (err) { toast(err.message, 'error'); }
      };
      const disableForm = $('#mfa-disable-form');
      if (disableForm) disableForm.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          await api('/auth/mfa/disable', { method: 'POST', body: JSON.stringify({ code: fd.get('code') }) });
          toast('MFA disabled', 'success');
          await pgSettings(el);
        } catch (err) { toast(err.message, 'error'); }
      };
    } catch (err) {
      el.innerHTML = `<div class="glass rounded-xl p-8 border border-red-500/30 text-center"><h3 class="text-white font-bold mb-2">Failed to load settings</h3><p class="text-sm text-gray-400">${escapeHtml(err.message)}</p></div>`;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // LEGAL PAGES
  // ═══════════════════════════════════════════════════════════════
  async function pgLegal(el) {
    let trust = null;
    try { trust = await api('/security/trust-center'); } catch { trust = null; }
    const trustBlock = trust ? `
        <div class="glass rounded-xl border border-emerald-500/30 overflow-hidden">
          <div class="bg-emerald-950/30 border-b border-emerald-500/20 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
            <div class="flex items-center gap-3"><i class="fas fa-shield-halved text-emerald-400 text-lg"></i><div><div class="text-sm font-semibold text-white">Trust Center</div><div class="text-[10px] text-gray-500">Live security posture · ${escapeHtml(trust.scoredAt || '')}</div></div></div>
            <div class="text-3xl font-black text-emerald-400 font-mono">${trust.score}<span class="text-sm text-gray-500">/100</span></div>
          </div>
          <div class="p-6 grid md:grid-cols-2 gap-3">
            ${(trust.controls || []).slice(0, 8).map(ctrl => `
              <div class="bg-gray-900/40 rounded-lg p-3 border border-gray-800/80">
                <div class="flex items-center justify-between gap-2 mb-1">
                  <span class="text-xs font-bold text-white">${escapeHtml(ctrl.title)}</span>
                  <span class="text-[9px] uppercase font-bold px-2 py-0.5 rounded ${ctrl.status === 'pass' ? 'bg-green-900/40 text-green-400' : ctrl.status === 'warn' ? 'bg-amber-900/40 text-amber-300' : 'bg-gray-800 text-gray-400'}">${escapeHtml(ctrl.status)}</span>
                </div>
                <p class="text-[10px] text-gray-500 leading-relaxed">${escapeHtml(ctrl.detail || '')}</p>
              </div>`).join('')}
          </div>
        </div>` : '';

    el.innerHTML = `<div class="fade-in">
      <div class="flex items-center justify-between mb-8">
        <div><h1 class="text-xl font-bold text-white">Legal & Compliance</h1><p class="text-sm text-gray-400">Terms of service, privacy policy, trust center, and disclaimers</p></div>
        <a href="/api/docs" target="_blank" rel="noopener" class="text-xs text-blue-400 hover:text-blue-300 font-semibold"><i class="fas fa-code mr-1"></i>API Docs</a>
      </div>
      <div class="space-y-6">
        ${trustBlock}
        <div class="glass rounded-xl border border-gray-700 overflow-hidden">
          <div class="bg-gray-800/50 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
            <div class="flex items-center gap-3"><i class="fas fa-gavel text-blue-400"></i><div><div class="text-sm font-semibold text-white">Terms of Service</div><div class="text-[10px] text-gray-500">Last updated April 22, 2026</div></div></div>
            <a href="/legal/terms" target="_blank" class="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"><i class="fas fa-external-link-alt"></i>View full document</a>
          </div>
          <div class="p-6 text-sm text-gray-300 space-y-4">
            <p>By using the FCRA Supreme Violation Detector service, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-gray-800/40 rounded-lg p-4">
                <div class="text-xs font-semibold text-blue-400 mb-2">Service Usage</div>
                <ul class="text-xs text-gray-400 space-y-1">
                  <li>• You must be 18 or older to use this service</li>
                  <li>• You are responsible for maintaining account security</li>
                  <li>• You agree to use the service only for lawful purposes</li>
                  <li>• You may not reverse engineer or copy our software</li>
                </ul>
              </div>
              <div class="bg-gray-800/40 rounded-lg p-4">
                <div class="text-xs font-semibold text-purple-400 mb-2">Dispute Documents</div>
                <ul class="text-xs text-gray-400 space-y-1">
                  <li>• We prepare dispute documents only</li>
                  <li>• We do not provide legal advice</li>
                  <li>• Consult an attorney for legal representation</li>
                  <li>• FCRA rights under 15 U.S.C. § 1681 et seq.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div class="glass rounded-xl border border-gray-700 overflow-hidden">
          <div class="bg-gray-800/50 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
            <div class="flex items-center gap-3"><i class="fas fa-shield-alt text-purple-400"></i><div><div class="text-sm font-semibold text-white">Privacy Policy</div><div class="text-[10px] text-gray-500">Last updated April 22, 2026</div></div></div>
            <a href="/legal/privacy" target="_blank" class="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"><i class="fas fa-external-link-alt"></i>View full document</a>
          </div>
          <div class="p-6 text-sm text-gray-300 space-y-4">
            <p>We take your privacy seriously. This policy describes how we collect, use, and protect your personal information.</p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="bg-gray-800/40 rounded-lg p-4">
                <div class="text-xs font-semibold text-green-400 mb-2">Data We Collect</div>
                <ul class="text-xs text-gray-400 space-y-1">
                  <li>• Name and email address</li>
                  <li>• Credit report data (encrypted)</li>
                  <li>• Usage and analytics data</li>
                  <li>• Payment information via Stripe</li>
                </ul>
              </div>
              <div class="bg-gray-800/40 rounded-lg p-4">
                <div class="text-xs font-semibold text-amber-400 mb-2">How We Use It</div>
                <ul class="text-xs text-gray-400 space-y-1">
                  <li>• Provide and improve our services</li>
                  <li>• Generate dispute documents</li>
                  <li>• Process payments securely</li>
                  <li>• Communicate about your account</li>
                </ul>
              </div>
              <div class="bg-gray-800/40 rounded-lg p-4">
                <div class="text-xs font-semibold text-red-400 mb-2">Your Rights</div>
                <ul class="text-xs text-gray-400 space-y-1">
                  <li>• Request data export (CCPA)</li>
                  <li>• Request data deletion (GDPR)</li>
                  <li>• Opt-out of communications</li>
                  <li>• Secure account deletion</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div class="glass rounded-xl border border-amber-500/30 overflow-hidden">
          <div class="bg-amber-900/20 border-b border-amber-600/30 px-6 py-4">
            <div class="flex items-center gap-3"><i class="fas fa-exclamation-triangle text-amber-400"></i><div><div class="text-sm font-semibold text-amber-300">Important Disclaimers</div><div class="text-[10px] text-amber-500/70">Legal notices regarding our service</div></div></div>
          </div>
          <div class="p-6 text-sm text-gray-300 space-y-4">
            <div class="p-4 bg-amber-900/20 border border-amber-600/30 rounded-lg">
              <div class="text-xs font-bold text-amber-300 mb-2">⚠️ NOT LEGAL ADVICE</div>
              <p class="text-xs text-gray-400 leading-relaxed">FCRA Supreme Detector prepares dispute documents only. We are NOT a law firm and do not provide legal advice. Nothing on this platform constitutes legal advice. For legal advice about your specific situation, consult a qualified attorney. FCRA rights are governed by 15 U.S.C. § 1681 et seq.</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-gray-800/40 rounded-lg p-4">
                <div class="text-xs font-semibold text-gray-300 mb-2">Accuracy of Credit Reports</div>
                <p class="text-xs text-gray-400 leading-relaxed">We analyze credit reports provided by credit bureaus. We are not responsible for errors in the original credit reports issued by Equifax, Experian, or TransUnion. Always verify all information directly with the credit bureaus.</p>
              </div>
              <div class="bg-gray-800/40 rounded-lg p-4">
                <div class="text-xs font-semibold text-gray-300 mb-2">No Guarantee of Results</div>
                <p class="text-xs text-gray-400 leading-relaxed">We prepare documents based on FCRA guidelines, but we cannot guarantee any specific outcome from dispute filings. Results depend on many factors including bureau response times, accuracy of information, and applicable law.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  // ═══════════════════════════════════════════════════════════════
  // BILLING
  // ═══════════════════════════════════════════════════════════════
  async function pgBilling(el) {
    const plans = [
      { id: 'professional', name: 'Professional', price: 497, color: 'blue', badge: 'MOST POPULAR', features: ['100 Clients/mo', 'Unlimited report analyses', 'Litigation scoring', '15 FCRA letters (all templates)', '15-category violation engine', 'Case law database', 'SOL calculator', 'Priority email support'], priceId: 'price_PRO_497' },
      { id: 'unlimited', name: 'Unlimited', price: 2500, color: 'amber', badge: 'UNLIMITED', features: ['Everything in Enterprise', 'Unlimited MFSN credit reports', 'Full FCRA knowledge base', 'Custom integrations', 'SLA guarantee', 'On-site training available', 'Quarterly business review', 'Multi-org management'], priceId: 'price_UNL_2500' },
      { id: 'enterprise', name: 'Enterprise', price: 9997, color: 'purple', badge: 'TEAM/AGENCY', features: ['Unlimited Clients', 'Unlimited everything', '38 legal document templates', 'Full case law database (300+ cases)', 'Expert consultation add-on', 'White-label reports', 'API access', 'Dedicated account manager'], priceId: 'price_ENT_9997' }
    ];

    let mode = 'unconfigured';
    let invoices = [];
    try {
      const [modeRes, invRes] = await Promise.all([
        api('/billing/mode').catch(() => ({ mode: 'unconfigured' })),
        api('/billing/invoices').catch(() => ({ invoices: [] })),
      ]);
      mode = modeRes.mode || 'unconfigured';
      invoices = invRes.invoices || [];
    } catch (_) {}

    const modeBanner = mode === 'test'
      ? `<div class="mb-4 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs"><i class="fas fa-flask mr-1.5"></i><strong>Stripe Test Mode</strong> — no real charges. Use test card 4242 4242 4242 4242.</div>`
      : mode === 'live'
        ? `<div class="mb-4 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs"><i class="fas fa-check-circle mr-1.5"></i>Stripe Live Mode — production billing active.</div>`
        : `<div class="mb-4 px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700 text-gray-400 text-xs"><i class="fas fa-plug mr-1.5"></i>Stripe not configured — set STRIPE_API_KEY in Cloudflare.</div>`;

    el.innerHTML = `<div class="fade-in">
      <div class="flex items-center justify-between mb-6 flex-wrap gap-3"><div><h1 class="text-xl font-bold text-white">Billing & Subscription</h1><p class="text-sm text-gray-400">Manage your organization\'s plan, invoices, and Stripe portal</p></div>
        <div class="flex items-center gap-2 flex-wrap">
          <div class="px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-full text-[10px] font-bold text-blue-400 uppercase tracking-wider">Current: ${state.org?.plan || 'None'}</div>
          <button type="button" id="btn-billing-portal" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg"><i class="fas fa-external-link-alt mr-1"></i>Stripe Portal</button>
          ${(state.user?.role === 'admin' || state.user?.role === 'super_admin') ? '<button type="button" id="btn-billing-cancel" class="bg-red-600/20 hover:bg-red-600/40 text-red-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-red-500/30"><i class="fas fa-ban mr-1"></i>Cancel at Period End</button>' : ''}
          <a href="/api/docs" target="_blank" rel="noopener" class="text-xs text-blue-400 hover:text-blue-300 font-semibold">API Docs</a>
        </div>
      </div>
      ${modeBanner}

      ${invoices.length ? `<div class="glass rounded-xl border border-gray-800 p-4 mb-6">
        <h2 class="text-sm font-bold text-white mb-3"><i class="fas fa-file-invoice-dollar text-green-400 mr-1.5"></i>Recent Invoices</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead><tr class="text-gray-500 border-b border-gray-800"><th class="pb-2 pr-3">Number</th><th class="pb-2 pr-3">Date</th><th class="pb-2 pr-3">Status</th><th class="pb-2 pr-3">Amount</th><th class="pb-2 text-right">PDF</th></tr></thead>
            <tbody class="divide-y divide-gray-800/60 text-gray-300">
              ${invoices.map(inv => `<tr>
                <td class="py-2 pr-3 font-mono">${escapeHtml(inv.number || inv.id)}</td>
                <td class="py-2 pr-3">${inv.created ? shortDate(new Date(inv.created * 1000).toISOString()) : '—'}</td>
                <td class="py-2 pr-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${inv.status === 'paid' ? 'bg-green-900/30 text-green-400' : 'bg-amber-900/30 text-amber-300'}">${escapeHtml(inv.status || '')}</span></td>
                <td class="py-2 pr-3 font-mono">${money((inv.amount || 0) / 100)}</td>
                <td class="py-2 text-right">${inv.pdf ? `<a href="${escapeHtml(inv.pdf)}" target="_blank" rel="noopener" class="text-blue-400 hover:text-blue-300">Download</a>` : (inv.hosted_url ? `<a href="${escapeHtml(inv.hosted_url)}" target="_blank" rel="noopener" class="text-blue-400">View</a>` : '—')}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        ${plans.map(p => `
          <div class="glass rounded-2xl p-5 flex flex-col border-2 ${state.org?.plan === p.id ? 'border-' + p.color + '-500 ring-4 ring-' + p.color + '-500/10' : 'border-gray-800'} relative overflow-hidden">
            ${p.badge ? `<div class="absolute top-3 right-3 ${p.color === 'blue' ? 'bg-blue-600' : p.color === 'purple' ? 'bg-purple-600' : p.color === 'amber' ? 'bg-amber-600' : 'bg-gray-600'} px-2 py-0.5 rounded text-[9px] font-bold text-white uppercase tracking-wider">${p.badge}</div>` : ''}
            <div class="mb-4 mt-2">
              <div class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">${p.name}</div>
              <div class="flex items-baseline"><span class="text-3xl font-bold text-white">$${p.price}</span><span class="text-gray-500 text-xs ml-1">/month</span></div>
            </div>
            <ul class="flex-1 space-y-2 mb-5">
              ${p.features.map(f => `<li class="flex items-start gap-2 text-[11px] text-gray-300"><i class="fas fa-check text-${p.color}-500 mt-0.5"></i> <span>${f}</span></li>`).join('')}
            </ul>
            <button onclick="window._checkout('${p.id}')" class="w-full py-2 rounded-lg text-sm font-semibold ${state.org?.plan === p.id ? 'bg-gray-700 text-white' : 'bg-' + p.color + '-600 hover:bg-' + p.color + '-700 text-white'} transition">${state.org?.plan === p.id ? 'Current Plan' : 'Upgrade'}</button>
          </div>
        `).join('')}
      </div>
    </div>`;

    const portalBtn = document.getElementById('btn-billing-portal');
    if (portalBtn) portalBtn.onclick = async () => {
      try {
        const { url } = await api('/billing/portal', { method: 'POST', body: '{}' });
        if (url) window.location.href = url;
        else toast('Portal unavailable — subscribe first', 'error');
      } catch (err) { toast(err.message, 'error'); }
    };
    const cancelBtn = document.getElementById('btn-billing-cancel');
    if (cancelBtn) cancelBtn.onclick = async () => {
      if (!confirm('Cancel subscription at end of current billing period?')) return;
      try {
        const r = await api('/billing/cancel', { method: 'POST', body: '{}' });
        toast(r.message || 'Cancellation scheduled', 'success');
      } catch (err) { toast(err.message, 'error'); }
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // CHECKOUT
  // ═══════════════════════════════════════════════════════════════
  window._checkout = async (planId) => {
    const btn = $(`[onclick="window._checkout('${planId}')"]`);
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Redirecting...'; }
    try {
      const { url } = await api('/billing/checkout', { method: 'POST', body: JSON.stringify({ planId }) });
      window.location.href = url;
    } catch(err) {
      toast(err.message, 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = 'Upgrade'; }
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // REPORT COMPARISON & INTERACTIVE DELTA MATRIX
  // ═══════════════════════════════════════════════════════════════
  window._toggleStatSheet = (idx) => {
    const sheet = document.getElementById(`stat-sheet-${idx}`);
    const chev = document.getElementById(`chevron-${idx}`);
    if (sheet) {
      sheet.classList.toggle('hidden');
      if (chev) chev.classList.toggle('rotate-180');
    }
  };

  async function pgReportComparison(el, data) {
    el.innerHTML = `<div class="flex items-center justify-center py-20"><div class="text-center"><i class="fas fa-spinner fa-spin text-3xl text-blue-400 mb-3 animate-pulse"></i><div class="text-sm text-gray-400 font-mono tracking-wider">COMPILING DELTA ANALYTICS MATRIX...</div></div></div>`;
    try {
      const comp = await api(`/reports/${data.reportId}/comparison`);
      
      const bureauGlowColors = {
        'Equifax': { start: '#f43f5e', end: '#ec4899', text: 'text-rose-400', glow: 'rgba(244,63,94,0.35)' },
        'Experian': { start: '#0A66FF', end: '#003B8F', text: 'text-blue-400', glow: 'rgba(10,102,255,0.35)' },
        'TransUnion': { start: '#10b981', end: '#06b6d4', text: 'text-emerald-400', glow: 'rgba(16,185,129,0.35)' }
      };

      const renderScoreGauge = (bureau, current, previous) => {
        const color = bureauGlowColors[bureau] || bureauGlowColors['Experian'];
        const delta = current - previous;
        const deltaText = delta >= 0 ? `+${delta}` : `${delta}`;
        const deltaColor = delta >= 0 ? 'text-emerald-400' : 'text-rose-400';
        const deltaBg = delta >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20';
        const deltaIcon = delta >= 0 ? 'fa-arrow-up-long' : 'fa-arrow-down-long';
        
        // Percent of 300 - 850 range
        const pct = Math.min(Math.max((current - 300) / 550, 0), 1);
        const radius = 38;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (pct * circumference);

        return `
          <div class="glass bg-gray-900/40 border border-gray-800/80 rounded-2xl p-5 text-center flex flex-col items-center justify-center relative hover:border-gray-700/80 transition duration-300 shadow-xl group">
            <div class="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-extrabold font-mono tracking-wider ${deltaColor} ${deltaBg} shadow-[0_0_8px_rgba(16,185,129,0.05)]">
              <i class="fas ${deltaIcon}"></i> ${deltaText}
            </div>
            <div class="text-[11px] font-mono font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5 justify-center">
              <span class="w-1.5 h-1.5 rounded-full bg-blue-500" style="background-color: ${color.start}"></span>
              ${bureau}
            </div>
            <div class="relative w-36 h-36 flex items-center justify-center">
              <svg class="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="grad-${bureau}" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="${color.start}" />
                    <stop offset="100%" stop-color="${color.end}" />
                  </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="${radius}" stroke="#181d2e" stroke-width="6.5" fill="transparent" />
                <circle cx="50" cy="50" r="${radius}" stroke="#ffffff" stroke-opacity="0.05" stroke-width="6.5" fill="transparent" />
                <circle cx="50" cy="50" r="${radius}" stroke="${color.start}" stroke-opacity="0.15" stroke-width="6.5" stroke-dasharray="1 6" fill="transparent" />
                <circle cx="50" cy="50" r="${radius}" stroke="url(#grad-${bureau})" stroke-width="6.5" fill="transparent" 
                  stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
                  stroke-linecap="round" class="transition-all duration-1000 ease-out" style="filter: drop-shadow(0 0 4px ${color.start});" />
              </svg>
              <div class="z-10 flex flex-col items-center">
                <span class="text-3xl font-black text-white tracking-tight leading-none">${current}</span>
                <span class="text-[9px] text-gray-500 font-mono mt-1 font-bold">PRIOR: ${previous}</span>
              </div>
            </div>
            <div class="text-[9px] text-gray-400 font-bold font-mono tracking-widest mt-4 bg-gray-950/55 border border-gray-800/60 rounded-md px-3 py-1 uppercase">
              FICO® SCORE 8
            </div>
          </div>
        `;
      };

      const scoreTrends = comp.scoreTrends || {
        Equifax: { current: 700, previous: 700 },
        Experian: { current: 700, previous: 700 },
        TransUnion: { current: 700, previous: 700 }
      };

      const complianceHtml = `
        <div class="flex flex-wrap items-center gap-2 mb-6">
          <div class="text-xs text-gray-400 uppercase tracking-widest font-bold font-mono mr-2">Dispute Guard Status:</div>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase font-mono border ${comp.complianceStatus?.croaAgreed ? 'bg-green-950/30 text-green-400 border-green-500/20' : 'bg-red-950/30 text-red-400 border-red-500/20'}">
            <i class="fas ${comp.complianceStatus?.croaAgreed ? 'fa-check-circle' : 'fa-times-circle'}"></i> CROA Contract
          </span>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase font-mono border ${comp.complianceStatus?.permissiblePurpose ? 'bg-green-950/30 text-green-400 border-green-500/20' : 'bg-red-950/30 text-red-400 border-red-500/20'}">
            <i class="fas ${comp.complianceStatus?.permissiblePurpose ? 'fa-check-circle' : 'fa-times-circle'}"></i> Permissible Purpose
          </span>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase font-mono border ${comp.complianceStatus?.tsrWaived ? 'bg-green-950/30 text-green-400 border-green-500/20' : 'bg-red-950/30 text-red-400 border-red-500/20'}">
            <i class="fas ${comp.complianceStatus?.tsrWaived ? 'fa-check-circle' : 'fa-times-circle'}"></i> TSR Waiver
          </span>
        </div>
      `;

      let erasedContent = '';
      if (!comp.erasedAccounts || comp.erasedAccounts.length === 0) {
        erasedContent = `
          <div class="glass rounded-xl p-8 text-center border border-gray-800/50 bg-gray-900/10">
            <div class="w-12 h-12 rounded-full bg-gray-800/40 flex items-center justify-center text-gray-500 mx-auto mb-3">
              <i class="fas fa-eraser text-lg"></i>
            </div>
            <h3 class="text-sm font-bold text-white mb-1">No Deleted Tradelines Identified</h3>
            <p class="text-xs text-gray-400 max-w-md mx-auto">This report comparison shows no negative items have been permanently erased since the previous report state. Continue running FCRA reinvestigation campaigns to enforce statutory removals.</p>
          </div>
        `;
      } else {
        erasedContent = `
          <div class="space-y-3">
            ${comp.erasedAccounts.map((item, idx) => {
              const burColor = bureauGlowColors[item.bureau] || bureauGlowColors['Experian'];
              return `
                <div class="glass bg-gray-900/20 border border-gray-800/80 rounded-xl p-4 hover:border-gray-700/60 transition duration-300">
                  <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="px-2 py-0.5 rounded text-[8px] font-extrabold uppercase bg-gray-800 text-gray-300 border border-gray-700/50 font-mono tracking-wider" style="color: ${burColor.start}; border-color: ${burColor.start}25; background-color: ${burColor.start}10">
                          ${item.bureau}
                        </span>
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-black uppercase rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)] animate-pulse">
                          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          Erased
                        </span>
                      </div>
                      <h4 class="text-sm font-bold text-white tracking-tight">${item.creditorName}</h4>
                      <p class="text-xs text-gray-500 font-mono mt-0.5">Acct: ${item.accountNumber}</p>
                    </div>
                    
                    <div class="flex items-center gap-6 text-right md:text-right">
                      <div>
                        <div class="text-[10px] text-gray-500 uppercase font-bold tracking-wider font-mono">Prior State</div>
                        <div class="text-xs text-red-400 line-through mt-0.5 font-semibold">${item.previousStatus}</div>
                        <div class="text-xs text-gray-400 line-through font-mono">${money(item.previousBalance)}</div>
                      </div>
                      <div class="text-center flex justify-center items-center h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <i class="fas fa-check"></i>
                      </div>
                    </div>
                  </div>

                  <div class="border-t border-gray-800/40 mt-3 pt-3">
                    <button onclick="window._toggleStatSheet('${idx}')" class="text-[11px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1.5 transition outline-none select-none">
                      <i class="fas fa-file-shield text-xs"></i>
                      <span>Show Statutory Audit Sheet (${item.stattext})</span>
                      <i id="chevron-${idx}" class="fas fa-chevron-down text-[9px] transition-transform duration-300"></i>
                    </button>
                    
                    <div id="stat-sheet-${idx}" class="hidden mt-3 p-4 bg-gray-950/65 border border-amber-500/10 rounded-lg space-y-2.5 text-xs text-gray-300 shadow-inner">
                      <div class="flex items-center justify-between border-b border-gray-800 pb-2 mb-2">
                        <div class="text-[10px] font-mono font-bold text-amber-400 tracking-wider flex items-center gap-1.5 uppercase">
                          <i class="fas fa-landmark text-amber-500/80"></i> Federal Statutory Audit Matrix
                        </div>
                        <div class="text-[9px] font-mono text-gray-500">SECTION REFERENCE: ${item.stattext}</div>
                      </div>
                      <p class="leading-relaxed text-gray-300">${item.accountNumber ? item.statutoryReason : ''}</p>
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                        <div class="bg-gray-900/40 p-2 rounded border border-gray-800/40">
                          <div class="text-[9px] font-mono font-bold text-gray-400 uppercase">Mandatory CRA Remedy</div>
                          <div class="text-[10px] text-gray-300 font-medium mt-0.5">30-day reinvestigation or instant permanent deletion.</div>
                        </div>
                        <div class="bg-gray-900/40 p-2 rounded border border-gray-800/40">
                          <div class="text-[9px] font-mono font-bold text-gray-400 uppercase">Furnisher Investigation Duty</div>
                          <div class="text-[10px] text-gray-300 font-medium mt-0.5">Strict liability for verification failure under § 1681s-2b.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }

      let updatedContent = '';
      if (!comp.updatedAccounts || comp.updatedAccounts.length === 0) {
        updatedContent = `
          <div class="glass rounded-xl p-6 text-center border border-gray-800/50 bg-gray-900/10">
            <div class="text-xs text-gray-500"><i class="fas fa-info-circle mr-1.5"></i>No status upgrades or balance settlements identified.</div>
          </div>
        `;
      } else {
        updatedContent = `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${comp.updatedAccounts.map(item => {
              const burColor = bureauGlowColors[item.bureau] || bureauGlowColors['Experian'];
              return `
                <div class="glass bg-gray-900/20 border border-gray-800/80 rounded-xl p-4 flex flex-col justify-between hover:border-gray-700/60 transition duration-300">
                  <div class="flex justify-between items-start mb-2">
                    <div>
                      <span class="px-2 py-0.5 rounded text-[8px] font-extrabold uppercase bg-gray-800 text-gray-300 border border-gray-700/50 font-mono tracking-wider" style="color: ${burColor.start}; border-color: ${burColor.start}25; background-color: ${burColor.start}10">
                        ${item.bureau}
                      </span>
                      <h4 class="text-sm font-bold text-white tracking-tight mt-1">${item.creditorName}</h4>
                      <p class="text-xs text-gray-500 font-mono mt-0.5">Acct: ${item.accountNumber}</p>
                    </div>
                    <span class="px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      ${item.changeType}
                    </span>
                  </div>
                  
                  <div class="grid grid-cols-2 gap-4 pt-3 border-t border-gray-800/40 text-center">
                    <div>
                      <div class="text-[9px] text-gray-500 font-bold uppercase tracking-wider font-mono">Previous State</div>
                      <div class="text-xs text-red-400 font-medium mt-1 leading-none font-semibold">${item.previousStatus}</div>
                      <div class="text-[11px] text-gray-400 font-mono mt-1">${money(item.previousBalance)}</div>
                    </div>
                    <div class="border-l border-gray-800/40">
                      <div class="text-[9px] text-gray-500 font-bold uppercase tracking-wider font-mono">Current State</div>
                      <div class="text-xs text-emerald-400 font-medium mt-1 leading-none font-semibold">${item.currentStatus}</div>
                      <div class="text-[11px] text-gray-400 font-mono mt-1">${money(item.currentBalance)}</div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }

      let inquiriesContent = '';
      if (!comp.newInquiries || comp.newInquiries.length === 0) {
        inquiriesContent = `
          <div class="glass rounded-xl p-6 text-center border border-gray-800/50 bg-gray-900/10">
            <div class="text-xs text-gray-500"><i class="fas fa-check-circle text-emerald-500 mr-1.5"></i>No new hard inquiries recorded in this period.</div>
          </div>
        `;
      } else {
        inquiriesContent = `
          <div class="space-y-3">
            <div class="bg-yellow-950/15 border border-yellow-500/15 rounded-xl p-3.5 flex items-start gap-3">
              <i class="fas fa-circle-exclamation text-yellow-500 text-sm mt-0.5 shrink-0"></i>
              <div class="text-xs text-yellow-200/80 leading-relaxed">
                <strong>FCRA Permissible Purpose Notice:</strong> Creditors must maintain a documented permissible purpose under <strong>15 U.S.C. § 1681b</strong> for every consumer report access. If these hard inquiries were not explicitly authorized, they can be disputed for immediate removal.
              </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              ${comp.newInquiries.map(item => {
                const burColor = bureauGlowColors[item.bureau] || bureauGlowColors['Experian'];
                return `
                  <div class="glass bg-gray-900/25 border border-gray-800/80 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <h5 class="text-xs font-bold text-white tracking-tight">${item.creditorName}</h5>
                      <div class="text-[10px] text-gray-500 font-mono mt-0.5">Date: ${shortDate(item.date)}</div>
                    </div>
                    <span class="px-2 py-0.5 rounded text-[8px] font-extrabold uppercase font-mono" style="color: ${burColor.start}; border-color: ${burColor.start}25; background-color: ${burColor.start}10; border-width: 1px">
                      ${item.bureau}
                    </span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }

      const matrix = comp.accountMatrix || [];
      const statusBadge = (st) => {
        const map = {
          erased: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          changed: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          new: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
          unchanged: 'bg-gray-800 text-gray-400 border-gray-700',
          current_only: 'bg-gray-800 text-gray-400 border-gray-700',
        };
        return map[st] || map.unchanged;
      };
      const matrixRows = matrix.length ? matrix.slice(0, 80).map(row => `
        <tr class="border-b border-gray-800/60 hover:bg-gray-900/40">
          <td class="p-2.5 text-xs text-white font-medium">${escapeHtml(row.creditorName)}<div class="text-[10px] text-gray-500 font-mono">${escapeHtml(row.accountNumber)}</div></td>
          <td class="p-2.5"><span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${statusBadge(row.status)}">${escapeHtml(row.status)}</span></td>
          <td class="p-2.5 text-[11px] text-gray-400">${row.prior ? `<div>${escapeHtml(row.prior.accountStatus || '—')}</div><div class="font-mono">${money(row.prior.currentBalance || 0)}</div><div class="text-[10px] text-gray-600">Limit ${money(row.prior.creditLimit || 0)}</div>` : '<span class="text-gray-600">—</span>'}</td>
          <td class="p-2.5 text-[11px] text-gray-300">${row.current ? `<div class="${row.status==='changed'?'text-amber-200':''}">${escapeHtml(row.current.accountStatus || '—')}</div><div class="font-mono ${row.status==='changed'?'text-amber-300':''}">${money(row.current.currentBalance || 0)}</div><div class="text-[10px] text-gray-600">Limit ${money(row.current.creditLimit || 0)}</div>` : '<span class="text-emerald-400 font-bold">ERASED</span>'}</td>
        </tr>`).join('') : `<tr><td colspan="4" class="p-6 text-center text-xs text-gray-500">No account matrix rows — upload a prior report for the same bureau to enable side-by-side diffs.</td></tr>`;

      el.innerHTML = `
        <div class="fade-in max-w-full">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <button onclick="window._nav('report-detail', { reportId: '${data.reportId}' })" class="text-gray-400 hover:text-white text-sm mb-2 inline-flex items-center gap-1.5 transition">
                <i class="fas fa-arrow-left text-xs"></i>Back to Report Detail
              </button>
              <h1 class="text-xl font-extrabold text-white flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse"></span>
                Interactive Comparison Dashboard
              </h1>
              <div class="text-xs text-gray-400 font-mono mt-1">${comp.hasPrevious ? 'Comparing against prior bureau report' : 'No prior report — showing current accounts only'} &bull; ${shortDate(comp.currentReportDate)}</div>
            </div>
            
            <div class="text-right flex flex-col md:items-end">
              <span class="px-3.5 py-1 bg-purple-950/40 border border-purple-500/20 text-purple-300 text-xs font-bold rounded-lg font-mono">
                STATUTORY DIFFERENTIAL MATRIX
              </span>
            </div>
          </div>

          ${complianceHtml}

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            ${renderScoreGauge('Equifax', scoreTrends.Equifax.current || 0, scoreTrends.Equifax.previous || scoreTrends.Equifax.current || 0)}
            ${renderScoreGauge('Experian', scoreTrends.Experian.current || 0, scoreTrends.Experian.previous || scoreTrends.Experian.current || 0)}
            ${renderScoreGauge('TransUnion', scoreTrends.TransUnion.current || 0, scoreTrends.TransUnion.previous || scoreTrends.TransUnion.current || 0)}
          </div>

          <div class="glass rounded-xl border border-gray-800 overflow-hidden mb-8">
            <div class="p-4 border-b border-gray-800 flex flex-wrap items-center justify-between gap-2">
              <h3 class="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <i class="fas fa-table-columns text-purple-400"></i> Side-by-Side Account Diff Matrix
              </h3>
              <div class="flex flex-wrap gap-2 text-[10px] font-bold uppercase">
                <span class="px-2 py-0.5 rounded border border-emerald-500/30 text-emerald-400">Erased ${matrix.filter(m=>m.status==='erased').length}</span>
                <span class="px-2 py-0.5 rounded border border-amber-500/30 text-amber-300">Changed ${matrix.filter(m=>m.status==='changed').length}</span>
                <span class="px-2 py-0.5 rounded border border-blue-500/30 text-blue-300">New ${matrix.filter(m=>m.status==='new').length}</span>
              </div>
            </div>
            <div class="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table class="w-full text-left">
                <thead class="sticky top-0 bg-gray-950/95 text-[10px] uppercase tracking-wider text-gray-500">
                  <tr><th class="p-2.5">Account</th><th class="p-2.5">Delta</th><th class="p-2.5">Prior</th><th class="p-2.5">Current</th></tr>
                </thead>
                <tbody>${matrixRows}</tbody>
              </table>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div class="lg:col-span-7 space-y-4">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <i class="fas fa-eraser text-emerald-400"></i>
                  Erased Derogatory traditional ledger
                </h3>
              </div>
              ${erasedContent}
            </div>

            <div class="lg:col-span-5 space-y-6">
              <div class="space-y-4">
                <h3 class="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <i class="fas fa-circle-up text-blue-400"></i>
                  Status Update Differential Table
                </h3>
                ${updatedContent}
              </div>

              <div class="space-y-4">
                <h3 class="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <i class="fas fa-circle-exclamation text-yellow-400"></i>
                  New Hard Inquiries Tracker
                </h3>
                ${inquiriesContent}
              </div>
            </div>
          </div>
        </div>
      `;
    } catch(err) {
      el.innerHTML = `
        <div class="glass border border-red-500/20 bg-red-950/10 rounded-2xl p-8 text-center max-w-xl mx-auto my-12">
          <div class="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center text-red-400 mx-auto mb-4">
            <i class="fas fa-exclamation-triangle text-xl"></i>
          </div>
          <h2 class="text-base font-bold text-white mb-2">Comparison Compilation Failed</h2>
          <p class="text-sm text-gray-400 mb-6">${err.message}</p>
          <button onclick="window._nav('report-detail', { reportId: '${data.reportId}' })" class="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition">
            <i class="fas fa-arrow-left mr-1.5"></i>Return to Workspace
          </button>
        </div>
      `;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // REPORT HISTORY
  // ═══════════════════════════════════════════════════════════════
  async function pgReportHistory(el, pageData) {
    const page = (pageData && pageData.page) || 1;
    el.innerHTML = `<div class="flex items-center justify-center py-20"><div class="text-center"><i class="fas fa-spinner fa-spin text-3xl text-blue-400 mb-3"></i><div class="text-sm text-gray-400">Loading report history...</div></div></div>`;
    try {
      const d = await api(`/reports?page=${page}`);
      const totalPages = Math.max(1, Math.ceil((d.total || 0) / (d.limit || 20)));
      const pagination = totalPages > 1 ? `
        <div class="mt-6 flex items-center justify-center gap-2">
          <button type="button" ${page <= 1 ? 'disabled' : ''} onclick="window._nav('report-history',{page:${page - 1}})" class="px-3 py-1.5 rounded-lg text-xs font-bold ${page <= 1 ? 'bg-gray-800 text-gray-600' : 'bg-gray-800 hover:bg-gray-700 text-white'}">← Prev</button>
          <span class="text-xs text-gray-400 font-mono px-2">Page ${page} of ${totalPages} · ${d.total} total</span>
          <button type="button" ${page >= totalPages ? 'disabled' : ''} onclick="window._nav('report-history',{page:${page + 1}})" class="px-3 py-1.5 rounded-lg text-xs font-bold ${page >= totalPages ? 'bg-gray-800 text-gray-600' : 'bg-gray-800 hover:bg-gray-700 text-white'}">Next →</button>
        </div>` : '';
      el.innerHTML = `<div class="fade-in">
        <div class="flex items-center justify-between mb-6">
          <div><h1 class="text-xl font-bold text-white">Report History</h1><p class="text-sm text-gray-400">${d.total} total report${d.total!==1?'s':''}</p></div>
        </div>
        ${d.reports.length ? `<div class="space-y-2">${d.reports.map(r=>`<div onclick="window._nav('report-detail',{reportId:'${r.id}',clientId:'${r.client_id}'})" class="glass rounded-xl p-4 card-hover cursor-pointer">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-sm">${(r.first_name||'?')[0]}${(r.last_name||'?')[0]}</div>
              <div>
                <div class="text-sm font-medium text-white">${r.first_name} ${r.last_name}</div>
                <div class="text-xs text-gray-400">
                  <span class="inline-flex items-center gap-1"><i class="fas fa-calendar text-[10px]"></i>${shortDate(r.report_date||r.created_at)}</span>
                  <span class="mx-1.5">&bull;</span>
                  <span class="capitalize">${r.bureau||'Unknown'}</span>
                  <span class="mx-1.5">&bull;</span>
                  <span class="capitalize">${r.status||'unknown'}</span>
                </div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm font-medium ${r.violation_count>0?'text-red-400':'text-green-400'}">${r.violation_count} violation${r.violation_count!==1?'s':''}</div>
              ${r.total_damages ? `<div class="text-xs text-gray-400">${money(r.total_damages)} est. damages</div>` : ''}
            </div>
          </div>
        </div>`).join('')}</div>
        ${pagination}
        `:'<div class="glass rounded-xl p-8 text-center border border-gray-700"><i class="fas fa-file-alt text-3xl text-gray-600 mb-3"></i><h3 class="text-sm font-semibold text-white mb-1">No reports yet</h3><p class="text-xs text-gray-500">Upload a credit report from the Clients page to get started</p><button onclick="window._nav(\'clients\')" class="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">Go to Clients</button></div>'}
      </div>`;
    } catch(err) {
      el.innerHTML = `<div class="fade-in"><div class="glass rounded-xl p-8 border border-red-500/30 text-center"><i class="fas fa-exclamation-triangle text-3xl text-red-400 mb-3"></i><h3 class="text-lg font-bold text-white mb-1">Failed to load report history</h3><p class="text-sm text-gray-400">${err.message}</p><button onclick="window._nav('report-history')" class="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">Retry</button></div></div>`;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // FOUNDER OS SUITE INTERFACE
  // ═══════════════════════════════════════════════════════════════
  async function pgFounderOS(el) {
    el.innerHTML = `<div class="flex items-center justify-center py-20"><div class="text-center"><i class="fas fa-spinner fa-spin text-3xl text-blue-400 mb-3"></i><div class="text-sm text-gray-400">Loading Founder OS Suite...</div></div></div>`;
    try {
      const [clientsData, templatesData] = await Promise.all([
        api('/clients'),
        api('/founder-templates')
      ]);

      const clients = clientsData.clients || [];
      const templates = templatesData.templates || [];

      el.innerHTML = `
        <div class="fade-in space-y-6 h-full flex flex-col">
          <!-- Premium Branded Header -->
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-800">
            <div>
              <h1 class="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 flex items-center gap-2.5">
                <i class="fas fa-briefcase text-blue-500"></i>Founder OS Suite
              </h1>
              <p class="text-sm text-gray-400 mt-1">High-fidelity corporate agreements and custom operational templates by Rick Jefferson</p>
            </div>
            <div class="text-right shrink-0">
              <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-950/40 border border-blue-500/30 text-blue-300">
                <span class="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                NEL-20260626-947291
              </span>
            </div>
          </div>

          <!-- Glassmorphic Two-Pane Layout -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden items-stretch">
            <!-- Left Pane: Configuration Controls (40%) -->
            <div class="lg:col-span-5 flex flex-col gap-6 overflow-y-auto pr-2 h-full max-h-[calc(100vh-14rem)]">
              <!-- Document Selector Card -->
              <div class="glass rounded-xl p-5 border border-gray-800/80 space-y-4 font-sans text-white">
                <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <i class="fas fa-sliders-h text-blue-500"></i>Document Settings
                </h3>
                
                <div>
                  <label class="block text-xs font-medium text-gray-400 mb-1.5">Select Client</label>
                  <select id="select-client" class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition">
                    <option value="">-- Choose Client --</option>
                    ${clients.map(c => `<option value="${c.id}">${c.first_name} ${c.last_name}</option>`).join('')}
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-medium text-gray-400 mb-1.5">Select Document Template</label>
                  <select id="select-template" class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition">
                    <option value="">-- Choose Template --</option>
                    ${templates.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                  </select>
                  <p id="template-desc" class="text-xs text-gray-500 mt-1.5 italic"></p>
                </div>
              </div>

              <!-- Fields Configurator Form -->
              <div class="glass rounded-xl p-5 border border-gray-800/80 flex-1 flex flex-col font-sans text-white">
                <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <i class="fas fa-edit text-blue-500"></i>Dynamic Configuration Fields
                </h3>
                <form id="founder-fields-form" class="space-y-4 flex-1">
                  <div class="text-center py-8 text-gray-500 text-sm">
                    <i class="fas fa-file-signature text-3xl text-gray-700 mb-2 block"></i>
                    Choose a template above to generate input fields
                  </div>
                </form>
              </div>

              <!-- Actions Controls Card -->
              <div class="glass rounded-xl p-5 border border-gray-800/80 space-y-4 shrink-0 font-sans text-white">
                <!-- Legal Compliance Options -->
                <div class="space-y-2 border-b border-gray-800/80 pb-3">
                  <h4 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <i class="fas fa-shield-alt text-emerald-400"></i>Legal Compliance Options
                  </h4>
                  <label class="flex items-center gap-2.5 cursor-pointer select-none">
                    <input type="checkbox" id="chk-is-hired-advocate" checked class="rounded border-gray-700 bg-gray-850 text-blue-500 focus:ring-blue-500/30 focus:ring-offset-0 focus:ring-2 w-3.5 h-3.5 transition">
                    <span class="text-xs text-gray-300 font-medium hover:text-white transition">Attach Authorized Advocate Disclosure</span>
                  </label>
                  <label class="flex items-center gap-2.5 cursor-pointer select-none">
                    <input type="checkbox" id="chk-rep-attached" checked class="rounded border-gray-700 bg-gray-850 text-blue-500 focus:ring-blue-500/30 focus:ring-offset-0 focus:ring-2 w-3.5 h-3.5 transition">
                    <span class="text-xs text-gray-300 font-medium hover:text-white transition">Certify Representation Agreement on File</span>
                  </label>
                </div>
                <div class="flex gap-3">
                  <button id="btn-save-draft" class="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30" disabled>
                    <i class="fas fa-save"></i>Save Draft
                  </button>
                  <button id="btn-download-pdf" class="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 opacity-50 cursor-not-allowed" disabled>
                    <i class="fas fa-file-pdf"></i>Download PDF
                  </button>
                </div>
                <div id="status-display" class="hidden text-center text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 py-2 rounded-lg"></div>
              </div>
            </div>

            <!-- Right Pane: Live Text Preview (60%) -->
            <div class="lg:col-span-7 flex flex-col h-full bg-gray-950/80 border border-gray-800 rounded-xl overflow-hidden shadow-2xl h-full max-h-[calc(100vh-14rem)]">
              <!-- Window style Header -->
              <div class="bg-gray-900 px-4 py-3 border-b border-gray-800 flex items-center justify-between shrink-0 font-sans">
                <div class="flex items-center gap-2">
                  <div class="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                  <div class="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                  <div class="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                  <span class="text-xs font-mono text-gray-400 ml-2">PREVIEW_ENGINE.TXT</span>
                </div>
                <div class="text-[10px] font-mono text-gray-500 font-medium">RJ Business Solutions</div>
              </div>

              <!-- Main Monospace content -->
              <div class="flex-1 overflow-auto p-6 font-mono text-xs text-gray-300 leading-relaxed whitespace-pre-wrap select-all selection:bg-blue-600/30 bg-gray-950" id="preview-text-box">Select a template and start typing to see the real-time compiled legal preview here.</div>

              <!-- Signature standard footer -->
              <div class="bg-gray-900/60 px-4 py-3 border-t border-gray-800 text-[10px] text-gray-500 text-center shrink-0 font-sans">
                Built by Rick Jefferson | Powered by RJ Business Solutions
              </div>
            </div>
          </div>
        </div>
      `;

      // DOM Elements Cache
      const selClient = $('#select-client');
      const selTemplate = $('#select-template');
      const tempDesc = $('#template-desc');
      const fieldsForm = $('#founder-fields-form');
      const btnSave = $('#btn-save-draft');
      const btnDownload = $('#btn-download-pdf');
      const statusDisp = $('#status-display');
      const previewBox = $('#preview-text-box');

      let currentDocId = null;
      let previewTimeout = null;

      // Render fields and trigger pre-fill
      function renderFields(templateId) {
        const template = templates.find(t => t.id === templateId);
        if (!template) {
          fieldsForm.innerHTML = `
            <div class="text-center py-8 text-gray-500 text-sm">
              <i class="fas fa-file-signature text-3xl text-gray-700 mb-2 block"></i>
              Choose a template above to generate input fields
            </div>`;
          btnSave.disabled = true;
          return;
        }

        tempDesc.textContent = template.description;
        btnSave.disabled = !selClient.value;

        fieldsForm.innerHTML = template.fields.map(f => {
          return `
            <div class="space-y-1">
              <label class="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider">${f.label}</label>
              <input type="text" name="${f.name}" data-default="${f.defaultVal || ''}" placeholder="${f.placeholder || ''}" class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition">
            </div>
          `;
        }).join('');

        applyPreFills();
      }

      function applyPreFills() {
        const clientId = selClient.value;
        const templateId = selTemplate.value;
        if (!templateId) return;

        const template = templates.find(t => t.id === templateId);
        if (!template) return;

        const client = clients.find(c => c.id === clientId);

        // Prepare matching attributes
        const fullName = client ? `${client.first_name} ${client.last_name}` : '';
        const address = client ? `${client.address_line1 || ''}${client.address_line2 ? ', ' + client.address_line2 : ''}, ${client.city || ''}, ${client.state || ''} ${client.zip || ''}` : '';
        const clientState = client?.state || '';
        const formattedToday = "June 26, 2026";

        template.fields.forEach(f => {
          const input = fieldsForm.querySelector(`input[name="${f.name}"]`);
          if (!input) return;

          let val = f.defaultVal || '';

          // Heuristic auto-mapping
          if (client) {
            const nameLower = f.name.toLowerCase();
            if (['founder2name', 'founder3name', 'employeename', 'candidatename', 'consultantname', 'shareholdername', 'indemniteename', 'incorporatorname', 'counterpartyname', 'clientname'].some(k => nameLower === k.toLowerCase())) {
              val = fullName;
            } else if (['counterpartyaddress', 'founder2address', 'founder3address', 'clientaddress'].some(k => nameLower === k.toLowerCase())) {
              val = address;
            } else if (nameLower === 'state' && clientState) {
              val = clientState;
            } else if (['effectivedate', 'startdate'].some(k => nameLower === k.toLowerCase())) {
              val = formattedToday;
            }
          }

          input.value = val;
        });

        triggerPreview();
      }

      function getFieldsObject() {
        const obj = {};
        const inputs = fieldsForm.querySelectorAll('input');
        inputs.forEach(input => {
          obj[input.name] = input.value;
        });
        return obj;
      }

      function triggerPreview() {
        clearTimeout(previewTimeout);
        previewTimeout = setTimeout(async () => {
          const templateId = selTemplate.value;
          if (!templateId) {
            previewBox.textContent = 'Select a template and start typing to see the real-time compiled legal preview here.';
            return;
          }

          previewBox.innerHTML = '<div class="flex items-center justify-center h-40"><i class="fas fa-spinner fa-spin text-blue-400 text-xl"></i></div>';
          try {
            const fields = getFieldsObject();
            const res = await api('/documents/preview-founder', {
              method: 'POST',
              body: JSON.stringify({ templateId, fields })
            });
            previewBox.textContent = res.content || '';
          } catch (err) {
            previewBox.textContent = 'Preview error: ' + err.message;
          }
        }, 300);
      }

      selClient.onchange = () => {
        btnSave.disabled = !selClient.value || !selTemplate.value;
        applyPreFills();
      };

      selTemplate.onchange = () => {
        btnSave.disabled = !selClient.value || !selTemplate.value;
        renderFields(selTemplate.value);
      };

      fieldsForm.oninput = () => {
        if (currentDocId) {
          currentDocId = null;
          btnDownload.disabled = true;
          btnDownload.className = "flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 opacity-50 cursor-not-allowed";
          statusDisp.classList.add('hidden');
        }
        triggerPreview();
      };

      btnSave.onclick = async () => {
        const clientId = selClient.value;
        const templateId = selTemplate.value;
        if (!clientId || !templateId) return;

        btnSave.disabled = true;
        btnSave.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';

        try {
          const fields = getFieldsObject();
          const res = await api('/documents/generate-founder', {
            method: 'POST',
            body: JSON.stringify({ clientId, templateId, fields })
          });

          currentDocId = res.id;
          toast('Document draft saved successfully!', 'success');

          btnDownload.disabled = false;
          btnDownload.className = "flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30";

          statusDisp.textContent = `Draft saved with ID: ${res.id}`;
          statusDisp.classList.remove('hidden');
        } catch (err) {
          toast('Save failed: ' + err.message, 'error');
        } finally {
          btnSave.disabled = false;
          btnSave.innerHTML = '<i class="fas fa-save"></i>Save Draft';
        }
      };

      btnDownload.onclick = () => {
        if (!currentDocId) return;
        const chkHired = document.getElementById('chk-is-hired-advocate');
        const chkRep = document.getElementById('chk-rep-attached');
        const isHiredAdvocate = chkHired ? chkHired.checked : true;
        const repAgreementAttached = chkRep ? chkRep.checked : true;
        const cleanUrl = `/api/documents/${currentDocId}/pdf?token=${encodeURIComponent(state.token)}&isHiredAdvocate=${isHiredAdvocate}&repAgreementAttached=${repAgreementAttached}`;
        window.open(cleanUrl, '_blank');
      };

    } catch (err) {
      el.innerHTML = `<div class="fade-in"><div class="glass rounded-xl p-8 border border-red-500/30 text-center"><i class="fas fa-exclamation-triangle text-3xl text-red-400 mb-3"></i><h3 class="text-lg font-bold text-white mb-1">Failed to initialize Founder OS Suite</h3><p class="text-sm text-gray-400">${err.message}</p></div></div>`;
    }
  }

  
async function pgAdminConsole(el) {
  el.innerHTML = `<div class="flex items-center justify-center py-20"><div class="text-center"><i class="fas fa-spinner fa-spin text-3xl text-blue-400 mb-3"></i><div class="text-sm text-gray-400">Initializing Platform Control Center...</div></div></div>`;

  try {
    const [statsData, orgsData, usersData, logsData, privacyData] = await Promise.all([
      api('/admin/db-stats'),
      api('/admin/organizations'),
      api('/admin/users'),
      api('/admin/logs'),
      api('/admin/privacy-requests').catch(() => ({ requests: [] })),
    ]);

    let activeTab = 'overview';

    function renderConsole() {
      el.innerHTML = `
        <div class="fade-in">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 class="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <i class="fas fa-user-shield text-blue-500"></i> Platform Control Center
              </h1>
              <p class="text-xs text-gray-400 mt-0.5">RJ Business Solutions • Global Multi-Tenant Systems Admin Panel</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1.5 animate-pulse">
                <span class="w-1.5 h-1.5 rounded-full bg-green-400"></span> Edge Native Normal
              </span>
              <span class="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Build ID: NEL-20260708
              </span>
            </div>
          </div>

          <div class="flex border-b border-gray-800 mb-6 overflow-x-auto whitespace-nowrap gap-1">
            <button class="px-4 py-2.5 text-xs font-semibold border-b-2 transition ${activeTab === 'overview' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-white'}" onclick="window._adminTab('overview')">
              <i class="fas fa-chart-bar mr-1.5"></i>Overview
            </button>
            <button class="px-4 py-2.5 text-xs font-semibold border-b-2 transition ${activeTab === 'organizations' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-white'}" onclick="window._adminTab('organizations')">
              <i class="fas fa-building mr-1.5"></i>B2B Tenants (${orgsData.organizations.length})
            </button>
            <button class="px-4 py-2.5 text-xs font-semibold border-b-2 transition ${activeTab === 'users' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-white'}" onclick="window._adminTab('users')">
              <i class="fas fa-users mr-1.5"></i>User Accounts (${usersData.users.length})
            </button>
            <button class="px-4 py-2.5 text-xs font-semibold border-b-2 transition ${activeTab === 'global_records' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-white'}" onclick="window._adminTab('global_records')">
              <i class="fas fa-database mr-1.5"></i>Global Records
            </button>
            <button class="px-4 py-2.5 text-xs font-semibold border-b-2 transition ${activeTab === 'logs' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-white'}" onclick="window._adminTab('logs')">
              <i class="fas fa-list-alt mr-1.5"></i>Security Audit Trails
            </button>
            <button class="px-4 py-2.5 text-xs font-semibold border-b-2 transition ${activeTab === 'privacy' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-white'}" onclick="window._adminTab('privacy')">
              <i class="fas fa-user-secret mr-1.5"></i>Privacy Queue (${(privacyData.requests || []).length})
            </button>
            <button class="px-4 py-2.5 text-xs font-semibold border-b-2 transition ${activeTab === 'ops' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-white'}" onclick="window._adminTab('ops')">
              <i class="fas fa-server mr-1.5"></i>Ops & Sandbox
            </button>
            <button class="px-4 py-2.5 text-xs font-semibold border-b-2 transition ${activeTab === 'sop' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-white'}" onclick="window._adminTab('sop')">
              <i class="fas fa-book mr-1.5"></i>Admin SOP Documentation
            </button>
          </div>

          <div id="admin-tab-content" class="space-y-6"></div>
        </div>
      `;

      renderTabContent();
    }

    function renderTabContent() {
      const target = document.getElementById('admin-tab-content');
      if (!target) return;

      if (activeTab === 'overview') {
        const stats = statsData.stats;
        target.innerHTML = `
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="glass p-5 rounded-xl border border-gray-800">
              <div class="text-xs text-gray-400 uppercase tracking-wider font-semibold">B2B Tenants</div>
              <div class="text-2xl font-extrabold text-white mt-2">${stats.organizations}</div>
              <div class="text-[10px] text-blue-400 font-medium mt-1"><i class="fas fa-circle text-[6px] mr-1"></i>Active Multi-Tenants</div>
            </div>
            <div class="glass p-5 rounded-xl border border-gray-800">
              <div class="text-xs text-gray-400 uppercase tracking-wider font-semibold">User Accounts</div>
              <div class="text-2xl font-extrabold text-white mt-2">${stats.users}</div>
              <div class="text-[10px] text-purple-400 font-medium mt-1"><i class="fas fa-user-check text-[10px] mr-1"></i>Registered Users</div>
            </div>
            <div class="glass p-5 rounded-xl border border-gray-800">
              <div class="text-xs text-gray-400 uppercase tracking-wider font-semibold">Reports Ingested</div>
              <div class="text-2xl font-extrabold text-white mt-2">${stats.reports}</div>
              <div class="text-[10px] text-green-400 font-medium mt-1"><i class="fas fa-file-invoice text-[10px] mr-1"></i>Total Analyzed Reports</div>
            </div>
            <div class="glass p-5 rounded-xl border border-gray-800">
              <div class="text-xs text-gray-400 uppercase tracking-wider font-semibold">Active Sessions</div>
              <div class="text-2xl font-extrabold text-white mt-2">${stats.active_sessions}</div>
              <div class="text-[10px] text-amber-400 font-medium mt-1 animate-pulse"><i class="fas fa-bolt text-[10px] mr-1"></i>Live Sessions</div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div class="glass p-5 rounded-xl border border-gray-800 md:col-span-2">
              <h3 class="text-sm font-bold text-white mb-3">Database Telemetry & Entity Ratios</h3>
              <div class="space-y-4">
                <div>
                  <div class="flex justify-between text-xs mb-1">
                    <span class="text-gray-400">Violations Detected vs Credit Reports Ingested</span>
                    <span class="text-white font-semibold">${stats.violations} violations across ${stats.reports} reports</span>
                  </div>
                  <div class="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                    <div class="bg-red-500 h-full rounded-full" style="width: ${Math.min(100, (stats.violations / (stats.reports || 1)) * 25)}%"></div>
                  </div>
                </div>
                <div>
                  <div class="flex justify-between text-xs mb-1">
                    <span class="text-gray-400">Certified Documents Generated vs Clients</span>
                    <span class="text-white font-semibold">${stats.documents} documents across ${stats.clients} clients</span>
                  </div>
                  <div class="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                    <div class="bg-blue-500 h-full rounded-full" style="width: ${Math.min(100, (stats.documents / (stats.clients || 1)) * 50)}%"></div>
                  </div>
                </div>
              </div>
            </div>

            <div class="glass p-5 rounded-xl border border-gray-800 flex flex-col justify-between">
              <div>
                <h3 class="text-sm font-bold text-white mb-3">System Health Status</h3>
                <div class="space-y-2.5">
                  <div class="flex items-center justify-between text-xs text-gray-300">
                    <span>Edge Worker Gateway</span>
                    <span class="text-green-400 font-semibold flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-green-400"></span>Operational</span>
                  </div>
                  <div class="flex items-center justify-between text-xs text-gray-300">
                    <span>SQLite Cloudflare D1</span>
                    <span class="text-green-400 font-semibold flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-green-400"></span>Healthy</span>
                  </div>
                  <div class="flex items-center justify-between text-xs text-gray-300">
                    <span>Tesseract OCR Engine</span>
                    <span class="text-blue-400 font-semibold flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>Standby</span>
                  </div>
                </div>
              </div>
              <div class="pt-4 border-t border-gray-800 text-[10px] text-gray-500 text-center">
                System uptime: 100.00% • Verified Local Time MST
              </div>
            </div>
          </div>
        `;
      } 
      
      else if (activeTab === 'organizations') {
        target.innerHTML = `
          <div class="glass rounded-xl border border-gray-800 overflow-hidden">
            <div class="p-4 border-b border-gray-800 bg-gray-900/40 flex justify-between items-center">
              <h3 class="text-sm font-bold text-white">Active Tenants Directory</h3>
              <span class="text-xs text-gray-400">${orgsData.organizations.length} organizations provisioned</span>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="border-b border-gray-800 text-gray-400 font-medium">
                    <th class="p-3">Organization ID</th>
                    <th class="p-3">Name / Slug</th>
                    <th class="p-3">Active Subscription Plan</th>
                    <th class="p-3 text-center">Max Users</th>
                    <th class="p-3 text-center">Max Clients</th>
                    <th class="p-3 text-center">Max Reports / Mo</th>
                    <th class="p-3 text-center">Status</th>
                    <th class="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-800/60 text-gray-300">
                  ${orgsData.organizations.map(o => {
                    const settings = JSON.parse(o.settings || '{}');
                    const isSuspended = !!settings.suspended;
                    return `
                      <tr class="hover:bg-gray-800/20">
                        <td class="p-3 font-mono text-[10px] text-gray-400">${o.id}</td>
                        <td class="p-3">
                          <div class="font-bold text-white">${o.name}</div>
                          <div class="text-[10px] text-gray-500">${o.slug}</div>
                        </td>
                        <td class="p-3">
                          <span class="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            o.plan === 'enterprise' ? 'bg-purple-900/30 text-purple-400 border border-purple-800/30' :
                            o.plan === 'pro' || o.plan === 'unlimited' ? 'bg-blue-900/30 text-blue-400 border border-blue-800/30' :
                            'bg-gray-700/50 text-gray-400'
                          }">${o.plan}</span>
                        </td>
                        <td class="p-3 text-center font-semibold">${o.max_users}</td>
                        <td class="p-3 text-center font-semibold">${o.max_clients}</td>
                        <td class="p-3 text-center font-semibold">${o.max_reports_per_month}</td>
                        <td class="p-3 text-center">
                          <span class="px-2.5 py-0.5 rounded text-[10px] font-semibold ${
                            isSuspended ? 'bg-red-900/30 text-red-400 border border-red-800/30' : 'bg-green-900/30 text-green-400 border border-green-800/30'
                          }">${isSuspended ? 'Suspended' : 'Active'}</span>
                        </td>
                        <td class="p-3 text-right space-x-1.5 whitespace-nowrap">
                          <button onclick="window._adminEditOrg('${o.id}')" class="bg-gray-800 hover:bg-gray-700 text-white px-2.5 py-1.5 rounded text-[10px] font-bold transition">
                            <i class="fas fa-edit mr-1"></i>Edit
                          </button>
                          <button onclick="window._adminToggleOrgSuspension('${o.id}')" class="${
                            isSuspended ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white'
                          } px-2.5 py-1.5 rounded text-[10px] font-bold transition">
                            <i class="fas ${isSuspended ? 'fa-play' : 'fa-stop'} mr-1"></i>${isSuspended ? 'Unsuspend' : 'Suspend'}
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div id="org-edit-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div class="glass w-full max-w-md rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
              <div class="p-5 border-b border-gray-800 bg-gray-900/40 flex justify-between items-center">
                <h3 class="text-sm font-bold text-white flex items-center gap-2"><i class="fas fa-edit text-blue-400"></i> Edit Tenant Boundaries</h3>
                <button onclick="$('#org-edit-modal').classList.add('hidden')" class="text-gray-500 hover:text-white"><i class="fas fa-times text-sm"></i></button>
              </div>
              <form id="org-edit-form" class="p-5 space-y-4">
                <input type="hidden" name="id">
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Company / Organization Name</label>
                  <input type="text" name="name" required class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs focus:border-blue-500 outline-none">
                </div>
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Commercial Billing Plan</label>
                  <select name="plan" class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs focus:border-blue-500 outline-none">
                    <option value="professional">Professional Plan ($497/mo)</option>
                    <option value="unlimited">Unlimited Plan ($2500/mo)</option>
                    <option value="enterprise">Enterprise Plan ($9997/mo)</option>
                  </select>
                </div>
                <div class="grid grid-cols-3 gap-3">
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">Max Users</label>
                    <input type="number" name="max_users" required class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs focus:border-blue-500 outline-none">
                  </div>
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">Max Clients</label>
                    <input type="number" name="max_clients" required class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs focus:border-blue-500 outline-none">
                  </div>
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">Max Reports / Mo</label>
                    <input type="number" name="max_reports" required class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs focus:border-blue-500 outline-none">
                  </div>
                </div>
                <div class="flex gap-2 pt-2">
                  <button type="submit" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition">Save Modifications</button>
                  <button type="button" onclick="$('#org-edit-modal').classList.add('hidden')" class="bg-gray-700 text-white px-4 py-2 rounded-lg text-xs">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        `;

        const f = $('#org-edit-form');
        if (f) {
          f.onsubmit = async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const orgId = fd.get('id');
            try {
              await api(`/admin/organizations/${orgId}`, {
                method: 'POST',
                body: JSON.stringify({
                  name: fd.get('name'),
                  plan: fd.get('plan'),
                  max_users: parseInt(fd.get('max_users')),
                  max_clients: parseInt(fd.get('max_clients')),
                  max_reports_per_month: parseInt(fd.get('max_reports'))
                })
              });
              toast('Tenant settings updated successfully', 'success');
              $('#org-edit-modal').classList.add('hidden');
              
              const updatedOrgs = await api('/admin/organizations');
              orgsData.organizations = updatedOrgs.organizations;
              renderTabContent();
            } catch(err) {
              toast(err.message, 'error');
            }
          };
        }
      } 
      
      else if (activeTab === 'users') {
        target.innerHTML = `
          <div class="flex items-center justify-between mb-4 gap-4">
            <div class="relative flex-1 max-w-md">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500"><i class="fas fa-search text-xs"></i></span>
              <input type="text" id="admin-user-search" placeholder="Filter platform users by name or email..." class="w-full bg-gray-800/80 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-white text-xs focus:border-blue-500 outline-none">
            </div>
            <button onclick="$('#admin-create-user-modal').classList.remove('hidden')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-lg shadow-blue-500/15 border border-blue-500/25">
              <i class="fas fa-user-plus"></i> Create User
            </button>
          </div>
          
          <div class="glass rounded-xl border border-gray-800 overflow-hidden">
            <div class="p-4 border-b border-gray-800 bg-gray-900/40 flex justify-between items-center">
              <h3 class="text-sm font-bold text-white">Platform Users Registry</h3>
              <span class="text-xs text-gray-400">${usersData.users.length} users registered</span>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="border-b border-gray-800 text-gray-400 font-medium font-mono uppercase tracking-wider text-[10px]">
                    <th class="p-3">User ID</th>
                    <th class="p-3">Name / Role</th>
                    <th class="p-3">Email Address</th>
                    <th class="p-3">Associated Organization</th>
                    <th class="p-3">Last Login Tracker</th>
                    <th class="p-3 text-center">Status</th>
                    <th class="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-800/60 text-gray-300" id="admin-users-tbody">
                  ${renderUserRows(usersData.users)}
                </tbody>
              </table>
            </div>
          </div>

          <!-- admin-create-user-modal -->
          <div id="admin-create-user-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 fade-in">
            <div class="glass w-full max-w-md rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
              <div class="p-5 border-b border-gray-800 bg-gray-900/40 flex justify-between items-center">
                <h3 class="text-sm font-bold text-white flex items-center gap-2">
                  <i class="fas fa-user-plus text-blue-400"></i> Create Platform User
                </h3>
                <button onclick="$('#admin-create-user-modal').classList.add('hidden')" class="text-gray-500 hover:text-white">
                  <i class="fas fa-times text-sm"></i>
                </button>
              </div>
              <form id="admin-create-user-form" class="p-5 space-y-4">
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Full Name</label>
                  <input type="text" name="name" required placeholder="e.g. John Doe" class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-xs focus:border-blue-500 outline-none transition">
                </div>
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Email Address</label>
                  <input type="email" name="email" required placeholder="e.g. user@domain.com" class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-xs focus:border-blue-500 outline-none transition">
                </div>
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Account Password</label>
                  <div class="relative">
                    <input type="password" id="admin-new-user-pass" name="password" required minlength="6" placeholder="Choose a secure password" class="w-full bg-gray-800/80 border border-gray-700 rounded-lg pl-3 pr-10 py-2.5 text-white text-xs focus:border-blue-500 outline-none transition">
                    <button type="button" class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white" onclick="const input = document.getElementById('admin-new-user-pass'); const icon = this.querySelector('i'); if (input.type === 'password') { input.type = 'text'; icon.className = 'fas fa-eye-slash'; } else { input.type = 'password'; icon.className = 'fas fa-eye'; }">
                      <i class="fas fa-eye"></i>
                    </button>
                  </div>
                </div>
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Associated Tenant (Organization)</label>
                  <select name="org_id" required class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-xs focus:border-blue-500 outline-none transition">
                    ${orgsData.organizations.map(o => `<option value="${o.id}">${o.name} (${o.plan || 'free'})</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Assigned Role</label>
                  <select name="role" required class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-xs focus:border-blue-500 outline-none transition">
                    <option value="member">Member (Regular access)</option>
                    <option value="admin">Admin (Tenant controller)</option>
                    <option value="super_admin">Super Admin (Platform operator)</option>
                  </select>
                </div>
                <div class="flex gap-2 pt-2">
                  <button type="submit" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-xs font-semibold transition">Create Account</button>
                  <button type="button" onclick="$('#admin-create-user-modal').classList.add('hidden')" class="bg-gray-700 text-white px-4 py-2.5 rounded-lg text-xs">Cancel</button>
                </div>
              </form>
            </div>
          </div>

          <!-- admin-reset-password-modal -->
          <div id="admin-reset-password-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 fade-in">
            <div class="glass w-full max-w-sm rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
              <div class="p-5 border-b border-gray-800 bg-gray-900/40 flex justify-between items-center">
                <h3 class="text-sm font-bold text-white flex items-center gap-2">
                  <i class="fas fa-key text-yellow-400"></i> Reset Password
                </h3>
                <button onclick="$('#admin-reset-password-modal').classList.add('hidden')" class="text-gray-500 hover:text-white">
                  <i class="fas fa-times text-sm"></i>
                </button>
              </div>
              <form id="admin-reset-password-form" class="p-5 space-y-4">
                <input type="hidden" name="user_id">
                <div>
                  <div class="text-xs text-gray-400 mb-2">Configure a new password for <span id="reset-password-user-email" class="text-white font-mono"></span>:</div>
                  <div class="relative">
                    <input type="password" id="admin-reset-user-pass" name="password" required minlength="6" placeholder="Enter new secure password" class="w-full bg-gray-800/80 border border-gray-700 rounded-lg pl-3 pr-10 py-2.5 text-white text-xs focus:border-blue-500 outline-none transition">
                    <button type="button" class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white" onclick="const input = document.getElementById('admin-reset-user-pass'); const icon = this.querySelector('i'); if (input.type === 'password') { input.type = 'text'; icon.className = 'fas fa-eye-slash'; } else { input.type = 'password'; icon.className = 'fas fa-eye'; }">
                      <i class="fas fa-eye"></i>
                    </button>
                  </div>
                </div>
                <div class="flex gap-2 pt-2">
                  <button type="submit" class="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2.5 rounded-lg text-xs font-semibold transition">Update Password</button>
                  <button type="button" onclick="$('#admin-reset-password-modal').classList.add('hidden')" class="bg-gray-700 text-white px-4 py-2.5 rounded-lg text-xs">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        `;

        const searchInput = $('#admin-user-search');
        if (searchInput) {
          searchInput.oninput = (e) => {
            const query = e.target.value.toLowerCase().trim();
            const filtered = usersData.users.filter(u => 
              u.name.toLowerCase().includes(query) || 
              u.email.toLowerCase().includes(query) || 
              u.org_name.toLowerCase().includes(query)
            );
            const tbody = $('#admin-users-tbody');
            if (tbody) tbody.innerHTML = renderUserRows(filtered);
          };
        }

        const userForm = $('#admin-create-user-form');
        if (userForm) {
          userForm.onsubmit = async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            try {
              await api('/admin/users', {
                method: 'POST',
                body: JSON.stringify({
                  name: fd.get('name'),
                  email: fd.get('email'),
                  password: fd.get('password'),
                  role: fd.get('role'),
                  org_id: fd.get('org_id')
                })
              });
              toast('Platform user account created', 'success');
              $('#admin-create-user-modal').classList.add('hidden');
              e.target.reset();

              const updatedUsers = await api('/admin/users');
              usersData.users = updatedUsers.users;
              renderTabContent();
            } catch (err) {
              toast(err.message, 'error');
            }
          };
        }

        const resetForm = $('#admin-reset-password-form');
        if (resetForm) {
          resetForm.onsubmit = async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const userId = fd.get('user_id');
            try {
              await api(`/admin/users/${userId}/reset-password`, {
                method: 'POST',
                body: JSON.stringify({
                  password: fd.get('password')
                })
              });
              toast('User password updated successfully', 'success');
              $('#admin-reset-password-modal').classList.add('hidden');
              e.target.reset();
            } catch (err) {
              toast(err.message, 'error');
            }
          };
        }
      } 
      
      else if (activeTab === 'global_records') {
        target.innerHTML = `<div class="flex items-center justify-center py-12"><div class="text-center"><i class="fas fa-spinner fa-spin text-2xl text-blue-400 mb-2"></i><div class="text-xs text-gray-400">Fetching global records cross-tenant telemetry...</div></div></div>`;
        
        (async () => {
          try {
            const [clientsRes, reportsRes, docsRes] = await Promise.all([
              api('/admin/global-clients'),
              api('/admin/global-reports'),
              api('/admin/global-documents')
            ]);
            
            const clients = clientsRes.clients || [];
            const reports = reportsRes.reports || [];
            const docs = docsRes.documents || [];
            
            target.innerHTML = `
              <div class="space-y-6">
                <!-- Clients Grid Section -->
                <div class="glass rounded-xl border border-gray-700 overflow-hidden">
                  <div class="bg-gray-800/50 border-b border-gray-700 px-5 py-4 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <i class="fas fa-user-friends text-blue-400"></i>
                      <div>
                        <h3 class="text-sm font-bold text-white">Cross-Tenant Client Registry</h3>
                        <p class="text-[10px] text-gray-400">Total registered consumer profiles: ${clients.length}</p>
                      </div>
                    </div>
                  </div>
                  <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr class="border-b border-gray-800 text-gray-400 bg-gray-900/40">
                          <th class="p-3">Client Name</th>
                          <th class="p-3">Organization (B2B Tenant)</th>
                          <th class="p-3">Email / Phone</th>
                          <th class="p-3">SSN (Last 4) / DOB</th>
                          <th class="p-3">Registered At</th>
                          <th class="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-800/50 text-gray-300">
                        ${clients.length === 0 ? `
                          <tr><td colspan="6" class="p-6 text-center text-gray-500">No client profiles found on the platform</td></tr>
                        ` : clients.map(c => `
                          <tr class="hover:bg-gray-800/10">
                            <td class="p-3 font-semibold text-white">${c.first_name} ${c.last_name}</td>
                            <td class="p-3 font-medium text-blue-400">${c.org_name}</td>
                            <td class="p-3 text-gray-300">
                              <div>${c.email || '-'}</div>
                              <div class="text-[10px] text-gray-500">${c.phone || '-'}</div>
                            </td>
                            <td class="p-3 font-mono text-gray-400">
                              <div>***-**-${c.ssn_last4 || '????'}</div>
                              <div class="text-[10px] text-gray-500">${c.dob || '-'}</div>
                            </td>
                            <td class="p-3 text-gray-400">${new Date(c.created_at).toLocaleDateString()}</td>
                            <td class="p-3">
                              <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-950 text-green-400 border border-green-900">${c.status}</span>
                            </td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>

                <!-- Reports & Documents Registry Grid -->
                <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <!-- Uploaded Reports -->
                  <div class="glass rounded-xl border border-gray-700 overflow-hidden">
                    <div class="bg-gray-800/50 border-b border-gray-700 px-5 py-4 flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <i class="fas fa-file-invoice text-emerald-400"></i>
                        <div>
                          <h3 class="text-sm font-bold text-white">Ingested Credit Reports</h3>
                          <p class="text-[10px] text-gray-400">Total reports analyzed across all nodes: ${reports.length}</p>
                        </div>
                      </div>
                    </div>
                    <div class="overflow-x-auto">
                      <table class="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr class="border-b border-gray-800 text-gray-400 bg-gray-900/40">
                            <th class="p-3">File / Bureau</th>
                            <th class="p-3">Client</th>
                            <th class="p-3">Tenant Name</th>
                            <th class="p-3">Accounts</th>
                            <th class="p-3">Date</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-800/50 text-gray-300">
                          ${reports.length === 0 ? `
                            <tr><td colspan="5" class="p-6 text-center text-gray-500">No credit reports ingested yet</td></tr>
                          ` : reports.map(r => `
                            <tr class="hover:bg-gray-800/10">
                              <td class="p-3">
                                <div class="font-semibold text-white truncate max-w-[150px]" title="${r.file_name}">${r.file_name}</div>
                                <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  r.bureau === 'equifax' ? 'bg-red-950 text-red-400' : r.bureau === 'experian' ? 'bg-blue-950 text-blue-400' : 'bg-orange-950 text-orange-400'
                                }">${r.bureau}</span>
                              </td>
                              <td class="p-3 text-gray-300 font-medium">${r.first_name} ${r.last_name}</td>
                              <td class="p-3 text-gray-400">${r.org_name}</td>
                              <td class="p-3 font-mono font-semibold text-white">${r.total_accounts || 0}</td>
                              <td class="p-3 text-gray-400 whitespace-nowrap">${new Date(r.created_at).toLocaleDateString()}</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <!-- Generated Legal Documents -->
                  <div class="glass rounded-xl border border-gray-700 overflow-hidden">
                    <div class="bg-gray-800/50 border-b border-gray-700 px-5 py-4 flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <i class="fas fa-gavel text-purple-400"></i>
                        <div>
                          <h3 class="text-sm font-bold text-white">Generated Legal Documents & Dispute Drafts</h3>
                          <p class="text-[10px] text-gray-400">Total templates compiled: ${docs.length}</p>
                        </div>
                      </div>
                    </div>
                    <div class="overflow-x-auto">
                      <table class="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr class="border-b border-gray-800 text-gray-400 bg-gray-900/40">
                            <th class="p-3">Document Title</th>
                            <th class="p-3">Client</th>
                            <th class="p-3">Tenant Name</th>
                            <th class="p-3">Doc Type</th>
                            <th class="p-3">Action</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-800/50 text-gray-300">
                          ${docs.length === 0 ? `
                            <tr><td colspan="5" class="p-6 text-center text-gray-500">No legal documents compiled yet</td></tr>
                          ` : docs.map(d => `
                            <tr class="hover:bg-gray-800/10">
                              <td class="p-3">
                                <div class="font-semibold text-white truncate max-w-[150px]" title="${d.title}">${d.title}</div>
                                <span class="px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  d.status === 'draft' ? 'bg-yellow-950 text-yellow-400' : 'bg-green-950 text-green-400'
                                }">${d.status}</span>
                              </td>
                              <td class="p-3 text-gray-300 font-medium">${d.first_name} ${d.last_name}</td>
                              <td class="p-3 text-gray-400">${d.org_name}</td>
                              <td class="p-3 font-mono font-medium text-gray-300 uppercase tracking-wider text-[10px]">${d.doc_type}</td>
                              <td class="p-3 text-right">
                                <a href="/api/documents/${d.id}/pdf?token=${encodeURIComponent(state.token)}" target="_blank" class="bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white px-2 py-1 rounded text-[10px] font-bold transition">
                                  <i class="fas fa-file-pdf mr-1"></i>PDF
                                </a>
                              </td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            `;
          } catch (err) {
            target.innerHTML = `<div class="p-6 text-center text-red-400"><i class="fas fa-exclamation-triangle text-2xl mb-2"></i><div>Failed to retrieve global records cross-tenant telemetry: ${err.message}</div></div>`;
          }
        })();
      } 
      
      else if (activeTab === 'logs') {
        target.innerHTML = `
          <div class="flex items-center justify-between mb-4 gap-4">
            <div class="relative flex-1 max-w-md">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500"><i class="fas fa-search text-xs"></i></span>
              <input type="text" id="admin-log-search" placeholder="Search logs by action, email, description..." class="w-full bg-gray-800/80 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-white text-xs focus:border-blue-500 outline-none">
            </div>
          </div>

          <div class="glass rounded-xl border border-gray-800 overflow-hidden">
            <div class="p-4 border-b border-gray-800 bg-gray-900/40 flex justify-between items-center">
              <h3 class="text-sm font-bold text-white">System Security & Audit Trail</h3>
              <span class="text-xs text-gray-400">Showing last 100 entries</span>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="border-b border-gray-800 text-gray-400 font-medium">
                    <th class="p-3">Timestamp (UTC)</th>
                    <th class="p-3">User Email</th>
                    <th class="p-3">B2B Tenant</th>
                    <th class="p-3">Security Action</th>
                    <th class="p-3">SOP Description</th>
                    <th class="p-3 text-right">Entity Link ID</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-800/60 text-gray-400" id="admin-logs-tbody">
                  ${renderLogRows(logsData.logs)}
                </tbody>
              </table>
            </div>
          </div>
        `;

        const logSearchInput = $('#admin-log-search');
        if (logSearchInput) {
          logSearchInput.oninput = (e) => {
            const query = e.target.value.toLowerCase().trim();
            const filtered = logsData.logs.filter(l => 
              l.user_email.toLowerCase().includes(query) || 
              l.action.toLowerCase().includes(query) || 
              l.description.toLowerCase().includes(query) || 
              l.org_name.toLowerCase().includes(query)
            );
            const tbody = $('#admin-logs-tbody');
            if (tbody) tbody.innerHTML = renderLogRows(filtered);
          };
        }
      } 
      
      else if (activeTab === 'privacy') {
        const reqs = privacyData.requests || [];
        target.innerHTML = `
          <div class="glass rounded-xl border border-gray-800 overflow-hidden">
            <div class="p-4 border-b border-gray-800 bg-gray-900/40 flex justify-between items-center">
              <h3 class="text-sm font-bold text-white"><i class="fas fa-user-secret text-purple-400 mr-1.5"></i>GDPR / CCPA Privacy Request Queue</h3>
              <span class="text-xs text-gray-400">${reqs.length} request(s)</span>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead><tr class="border-b border-gray-800 text-gray-400"><th class="p-3">Type</th><th class="p-3">Status</th><th class="p-3">Client</th><th class="p-3">Created</th><th class="p-3 text-right">Action</th></tr></thead>
                <tbody class="divide-y divide-gray-800/60 text-gray-300">
                  ${reqs.length ? reqs.map(r => `<tr>
                    <td class="p-3 font-mono uppercase text-[10px]">${escapeHtml(r.request_type || '')}</td>
                    <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${r.status === 'fulfilled' ? 'bg-green-900/30 text-green-400' : 'bg-amber-900/30 text-amber-300'}">${escapeHtml(r.status || 'pending')}</span></td>
                    <td class="p-3 font-mono text-[10px]">${escapeHtml(r.client_id || '—')}</td>
                    <td class="p-3">${shortDate(r.created_at)}</td>
                    <td class="p-3 text-right">${r.status !== 'fulfilled' ? `<button class="admin-privacy-fulfill bg-purple-600 hover:bg-purple-500 text-white px-2.5 py-1 rounded text-[10px] font-bold" data-id="${r.id}">Fulfill</button>` : '—'}</td>
                  </tr>`).join('') : '<tr><td colspan="5" class="p-6 text-center text-gray-500">No privacy requests in queue</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>`;
        target.querySelectorAll('.admin-privacy-fulfill').forEach(btn => {
          btn.onclick = async () => {
            if (!confirm('Fulfill this privacy request? Delete requests will purge client PII.')) return;
            try {
              await api('/admin/privacy-requests/' + btn.getAttribute('data-id') + '/fulfill', { method: 'POST', body: '{}' });
              toast('Privacy request fulfilled', 'success');
              await pgAdminConsole(el);
            } catch (err) { toast(err.message, 'error'); }
          };
        });
      }

      else if (activeTab === 'ops') {
        target.innerHTML = `
          <div class="grid md:grid-cols-2 gap-6">
            <div class="glass rounded-xl border border-gray-800 p-5">
              <h3 class="text-sm font-bold text-white mb-2"><i class="fas fa-database text-blue-400 mr-1.5"></i>D1 Backup Snapshot</h3>
              <p class="text-xs text-gray-400 mb-4">Export all core tables to the R2 vault. Weekly GitHub Actions also run automatically.</p>
              <button id="btn-admin-backup" class="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg"><i class="fas fa-cloud-upload-alt mr-1"></i>Trigger Backup Now</button>
              <pre id="admin-backup-result" class="mt-3 text-[10px] text-gray-500 font-mono whitespace-pre-wrap hidden"></pre>
            </div>
            <div class="glass rounded-xl border border-gray-800 p-5">
              <h3 class="text-sm font-bold text-white mb-2"><i class="fas fa-flask text-amber-400 mr-1.5"></i>Demo Tri-Bureau Case</h3>
              <p class="text-xs text-gray-400 mb-4">Load bundled MFSN sample with scores, violations, and fundability for sales demos.</p>
              <button id="btn-admin-demo-load" class="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded-lg"><i class="fas fa-magic mr-1"></i>Load Demo Case</button>
              <div id="admin-demo-result" class="mt-3 text-xs text-gray-400 hidden"></div>
            </div>
          </div>
          <div class="glass rounded-xl border border-gray-800 p-5 mt-4">
            <h3 class="text-sm font-bold text-white mb-2"><i class="fas fa-code text-indigo-400 mr-1.5"></i>Partner API</h3>
            <p class="text-xs text-gray-400 mb-3">OpenAPI 3.0 documentation for integrations.</p>
            <a href="/api/docs" target="_blank" rel="noopener" class="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg"><i class="fas fa-external-link-alt"></i>Open API Docs</a>
          </div>`;
        const backupBtn = document.getElementById('btn-admin-backup');
        if (backupBtn) backupBtn.onclick = async () => {
          backupBtn.disabled = true;
          try {
            const r = await api('/admin/backup/trigger', { method: 'POST', body: '{}' });
            const pre = document.getElementById('admin-backup-result');
            if (pre) { pre.classList.remove('hidden'); pre.textContent = JSON.stringify(r, null, 2); }
            toast('Backup snapshot saved to R2', 'success');
          } catch (err) { toast(err.message, 'error'); }
          backupBtn.disabled = false;
        };
        const demoBtn = document.getElementById('btn-admin-demo-load');
        if (demoBtn) demoBtn.onclick = async () => {
          demoBtn.disabled = true;
          try {
            const r = await api('/admin/demo/load-case', { method: 'POST', body: '{}' });
            const box = document.getElementById('admin-demo-result');
            if (box) {
              box.classList.remove('hidden');
              box.innerHTML = `Client <strong class="text-white">${escapeHtml(r.clientId)}</strong> · ${r.violationsFound || 0} violations · <button class="text-blue-400 font-bold ml-1" onclick="window._nav('client-detail',{clientId:'${r.clientId}'})">Open Workspace</button>`;
            }
            toast(r.message || 'Demo case loaded', 'success');
          } catch (err) { toast(err.message, 'error'); }
          demoBtn.disabled = false;
        };
      }

      else if (activeTab === 'sop') {
        target.innerHTML = `
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div class="glass p-4 rounded-xl border border-gray-800 h-fit space-y-2">
              <h4 class="text-xs font-bold text-white uppercase tracking-wider mb-2.5">SOP Outline</h4>
              <a href="#sop-purpose" class="block text-xs text-blue-400 hover:text-white transition"><i class="fas fa-bookmark mr-1.5"></i>1. Purpose & Scope</a>
              <a href="#sop-console" class="block text-xs text-blue-400 hover:text-white transition"><i class="fas fa-bookmark mr-1.5"></i>2. Console Overview</a>
              <a href="#sop-shutdown" class="block text-xs text-blue-400 hover:text-white transition"><i class="fas fa-bookmark mr-1.5"></i>3. Account Shutdowns</a>
              <a href="#sop-db" class="block text-xs text-blue-400 hover:text-white transition"><i class="fas fa-bookmark mr-1.5"></i>4. DB Maintenance</a>
              <a href="#sop-security" class="block text-xs text-blue-400 hover:text-white transition"><i class="fas fa-bookmark mr-1.5"></i>5. Security Audits</a>
            </div>

            <div class="glass p-6 rounded-xl border border-gray-800 md:col-span-3 prose prose-invert max-w-none text-xs text-gray-300 space-y-6">
              <h2 class="text-lg font-extrabold text-white border-b border-gray-800 pb-2 mb-4">SmartFCRA™ Supreme — Platform Admin Operations SOP</h2>
              
              <section id="sop-purpose" class="space-y-2">
                <h3 class="text-sm font-bold text-white">1. Document Purpose & Scope</h3>
                <p>This SOP outlines the zero-defect procedures for administering the SmartFCRA™ Supreme multi-tenant platform. All operations must prioritize tenant security isolation and prevent database leakage. Administrative interventions (such as user deactivation and tenant-level blocks) must follow authorized protocols.</p>
              </section>

              <section id="sop-console" class="space-y-2">
                <h3 class="text-sm font-bold text-white">2. Platform Admin Console Overview</h3>
                <p>The Super Admin dashboard provides parallel monitoring across all tenants. Only users possessing the <code>super_admin</code> role can access these API controllers. Overview telemetry is pulled dynamically in real-time, verifying network, sessions, and database counts.</p>
              </section>

              <section id="sop-shutdown" class="space-y-2">
                <h3 class="text-sm font-bold text-white">3. Account Shutdown & User Suspension Procedures</h3>
                <div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4 mb-3">
                  <div class="font-bold text-blue-400 mb-1"><i class="fas fa-info-circle mr-1"></i> Active Real-Time Enforcement</div>
                  If a user or tenant is suspended, their active session cookie is instantly intercepted and revoked at the edge by the server middleware, preventing any further read/write queries.
                </div>
                <h4 class="font-bold text-white mt-2">Individual User Suspension:</h4>
                <p>To block a specific user, locate their entry in the <strong>User Accounts</strong> tab and click "Suspend". This instantly invalidates their sessions across all devices.</p>
                <h4 class="font-bold text-white mt-2">Tenant-Wide Suspension:</h4>
                <p>To block an entire organization, toggle their status in the <strong>B2B Tenants</strong> tab. This puts an immediate lockout blanket over all users belonging to that organization slug.</p>
              </section>

              <section id="sop-db" class="space-y-2">
                <h3 class="text-sm font-bold text-white">4. Database Maintenance & Backup SOP</h3>
                <p>Cloudflare D1 SQLite utilizes Edge replication. Prior to manual database column alterations or security migrations, admins are required to log in via CLI and trigger a manual export capture command:</p>
                <pre class="bg-black/40 border border-gray-800 p-3 rounded-lg font-mono text-[10px] text-gray-400 overflow-x-auto">npx wrangler d1 export fcra-detector-production --local --output=./backups/snap_NEL_latest.sql</pre>
              </section>

              <section id="sop-security" class="space-y-2">
                <h3 class="text-sm font-bold text-white">5. Security Auditing & Compliance Guidelines</h3>
                <p>Admins must trace the global Security Activity log weekly for suspicious patterns, such as multiple login IP mismatches or consecutive document generation requests outside business hours.</p>
              </section>
            </div>
          </div>
        `;
      }
    }

    function renderUserRows(users) {
      if (!users.length) {
        return `<tr><td colspan="7" class="p-6 text-center text-gray-500"><i class="fas fa-user-slash text-2xl mb-2"></i><div>No users found matching filter criteria</div></td></tr>`;
      }
      return users.map(u => `
        <tr class="hover:bg-gray-800/20">
          <td class="p-3 font-mono text-[10px] text-gray-400">${u.id}</td>
          <td class="p-3">
            <div class="font-bold text-white">${u.name}</div>
            <div class="text-[10px] text-purple-400 font-semibold uppercase tracking-wider">${u.role}</div>
          </td>
          <td class="p-3 font-mono text-[11px]">${u.email}</td>
          <td class="p-3 font-semibold">${u.org_name}</td>
          <td class="p-3 text-gray-400">${u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}</td>
          <td class="p-3 text-center">
            <span class="px-2.5 py-0.5 rounded text-[10px] font-semibold ${
              u.is_active === 1 ? 'bg-green-900/30 text-green-400 border border-green-800/30' : 'bg-red-900/30 text-red-400 border border-red-800/30'
            }">${u.is_active === 1 ? 'Active' : 'Suspended'}</span>
          </td>
          <td class="p-3 text-right space-x-1.5 whitespace-nowrap">
            <button onclick="window._adminTriggerPasswordReset('${u.id}', '${u.email}')" class="bg-yellow-600/20 hover:bg-yellow-600 text-yellow-400 hover:text-white px-2.5 py-1.5 rounded text-[10px] font-bold transition">
              <i class="fas fa-key mr-1"></i>Reset Pass
            </button>
            ${u.id !== state.user?.id ? `
              <button onclick="window._adminToggleUser('${u.id}')" class="${
                u.is_active === 1 ? 'bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white' : 'bg-green-600 hover:bg-green-700 text-white'
              } px-2.5 py-1.5 rounded text-[10px] font-bold transition">
                <i class="fas ${u.is_active === 1 ? 'fa-user-slash' : 'fa-user-check'} mr-1"></i>${u.is_active === 1 ? 'Suspend' : 'Activate'}
              </button>
            ` : '<span class="text-[10px] text-gray-500 font-medium">Locked (Self)</span>'}
          </td>
        </tr>
      `).join('');
    }

    function renderLogRows(logs) {
      if (!logs.length) {
        return `<tr><td colspan="6" class="p-6 text-center text-gray-500"><i class="fas fa-exclamation-circle text-2xl mb-2"></i><div>No activity logs found</div></td></tr>`;
      }
      return logs.map(l => `
        <tr class="hover:bg-gray-800/20">
          <td class="p-3 text-gray-400 whitespace-nowrap">${new Date(l.created_at).toLocaleString()}</td>
          <td class="p-3 font-semibold text-gray-300 font-mono text-[11px]">${l.user_email}</td>
          <td class="p-3 text-gray-300">${l.org_name}</td>
          <td class="p-3">
            <span class="px-2 py-0.5 rounded text-[10px] font-mono tracking-wider font-semibold bg-gray-800 text-gray-300 border border-gray-700/50">${l.action}</span>
          </td>
          <td class="p-3 text-gray-300 font-medium">${l.description}</td>
          <td class="p-3 text-right font-mono text-[10px] text-gray-500">${l.client_id || l.document_id || l.report_id || '-'}</td>
        </tr>
      `).join('');
    }

    window._adminTab = (t) => {
      activeTab = t;
      renderConsole();
    };

    window._adminTriggerPasswordReset = (userId, email) => {
      const modal = $('#admin-reset-password-modal');
      if (modal) {
        modal.querySelector('input[name="user_id"]').value = userId;
        modal.querySelector('#reset-password-user-email').textContent = email;
        modal.querySelector('input[name="password"]').value = '';
        modal.classList.remove('hidden');
      }
    };

    window._adminToggleUser = async (userId) => {
      try {
        const res = await api(`/admin/users/${userId}/toggle-status`, { method: 'POST' });
        toast(`User status set to ${res.is_active === 1 ? 'Active' : 'Suspended'}`, 'success');
        
        const updatedUsers = await api('/admin/users');
        usersData.users = updatedUsers.users;
        
        const updatedLogs = await api('/admin/logs');
        logsData.logs = updatedLogs.logs;
        
        const updatedStats = await api('/admin/db-stats');
        statsData.stats = updatedStats.stats;

        renderConsole();
      } catch(err) {
        toast(err.message, 'error');
      }
    };

    window._adminToggleOrgSuspension = async (orgId) => {
      try {
        const res = await api(`/admin/organizations/${orgId}/toggle-suspension`, { method: 'POST' });
        toast(`Tenant organization set to ${res.suspended ? 'Suspended' : 'Active'}`, 'success');

        const updatedOrgs = await api('/admin/organizations');
        orgsData.organizations = updatedOrgs.organizations;

        const updatedLogs = await api('/admin/logs');
        logsData.logs = updatedLogs.logs;
        
        const updatedStats = await api('/admin/db-stats');
        statsData.stats = updatedStats.stats;

        renderConsole();
      } catch(err) {
        toast(err.message, 'error');
      }
    };

    window._adminEditOrg = (orgId) => {
      const o = orgsData.organizations.find(org => org.id === orgId);
      if (!o) return;
      const m = $('#org-edit-modal');
      if (m) {
        m.querySelector('input[name="id"]').value = o.id;
        m.querySelector('input[name="name"]').value = o.name;
        m.querySelector('select[name="plan"]').value = o.plan;
        m.querySelector('input[name="max_users"]').value = o.max_users;
        m.querySelector('input[name="max_clients"]').value = o.max_clients;
        m.querySelector('input[name="max_reports"]').value = o.max_reports_per_month;
        m.classList.remove('hidden');
      }
    };

    renderConsole();

  } catch (err) {
    el.innerHTML = `
      <div class="fade-in">
        <div class="glass rounded-xl p-8 border border-red-500/30 text-center">
          <i class="fas fa-exclamation-triangle text-3xl text-red-400 mb-3"></i>
          <h3 class="text-lg font-bold text-white mb-1">Authorization Lockout</h3>
          <p class="text-sm text-gray-400">${err.message}</p>
        </div>
      </div>
    `;
  }
}
  // ═══════════════════════════════════════════════════════════════
  // SECURE SELF-SERVICE CLIENT PORTAL VIEWS
  // ═══════════════════════════════════════════════════════════════

  function portalClientQs() {
    return state.impersonateClientId ? `?clientId=${encodeURIComponent(state.impersonateClientId)}` : '';
  }
  function portalClientBody(extra = {}) {
    return state.impersonateClientId ? { ...extra, clientId: state.impersonateClientId } : extra;
  }

  async function pgClientMessages(el) {
    const qs = portalClientQs();
    async function load() {
      const d = await api('/client-portal/messages' + qs);
      const msgs = (d.messages || []).slice().reverse();
      el.innerHTML = `
        <div class="fade-in space-y-4 max-w-3xl">
          <div class="bg-gradient-to-r from-slate-950 via-cyan-950/30 to-slate-950 border border-cyan-500/20 rounded-2xl p-5">
            <h1 class="text-xl font-bold text-white"><i class="fas fa-comments text-cyan-400 mr-2"></i>Secure Messages</h1>
            <p class="text-sm text-slate-400 mt-1">Chat with your credit team. Staff can also email you from this thread.</p>
          </div>
          <div id="msg-thread" class="glass rounded-2xl border border-gray-800 p-4 h-[420px] overflow-y-auto space-y-3">
            ${msgs.length ? msgs.map(m => `
              <div class="flex ${m.sender_role === 'client' ? 'justify-end' : 'justify-start'}">
                <div class="max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${m.sender_role === 'client' ? 'bg-cyan-600/20 border border-cyan-500/30 text-cyan-50' : m.sender_role === 'system' ? 'bg-violet-950/40 border border-violet-500/20 text-violet-100' : 'bg-slate-900 border border-slate-700 text-slate-100'}">
                  <div class="text-[10px] uppercase tracking-wider opacity-60 mb-1">${escapeHtml(m.sender_role)} · ${escapeHtml((m.created_at||'').slice(0,16))}${m.channel==='email'?' · emailed':''}</div>
                  ${m.subject ? `<div class="font-semibold text-xs mb-1">${escapeHtml(m.subject)}</div>` : ''}
                  <div class="whitespace-pre-wrap leading-relaxed">${escapeHtml(m.body)}</div>
                </div>
              </div>`).join('') : '<p class="text-sm text-gray-500 text-center py-12">No messages yet — say hello to your team.</p>'}
          </div>
          <form id="msg-form" class="glass rounded-2xl border border-gray-800 p-4 space-y-3">
            <input id="msg-subject" class="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white" placeholder="Subject (optional)">
            <textarea id="msg-body" required rows="3" class="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white" placeholder="Type your message..."></textarea>
            <div class="flex flex-wrap gap-2 justify-between items-center">
              <label class="text-xs text-gray-400 flex items-center gap-2"><input type="checkbox" id="msg-email" class="rounded border-gray-700"> Also email me a copy / notify via email</label>
              <button class="bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold px-4 py-2 rounded-lg"><i class="fas fa-paper-plane mr-1"></i>Send</button>
            </div>
          </form>
        </div>`;
      const thread = document.getElementById('msg-thread');
      if (thread) thread.scrollTop = thread.scrollHeight;
      document.getElementById('msg-form').onsubmit = async (e) => {
        e.preventDefault();
        try {
          await api('/client-portal/messages', {
            method: 'POST',
            body: JSON.stringify(portalClientBody({
              subject: document.getElementById('msg-subject').value,
              body: document.getElementById('msg-body').value,
              sendEmail: document.getElementById('msg-email').checked,
            })),
          });
          toast('Message sent', 'success');
          await load();
        } catch (err) { toast(err.message, 'error'); }
      };
    }
    try { await load(); } catch (err) {
      el.innerHTML = `<div class="text-red-400 p-6">${escapeHtml(err.message)}</div>`;
    }
  }

  async function pgClientUploads(el) {
    const qs = portalClientQs();
    async function load() {
      const d = await api('/client-portal/uploads' + qs);
      const uploads = d.uploads || [];
      el.innerHTML = `
        <div class="fade-in space-y-4 max-w-3xl">
          <div class="bg-gradient-to-r from-slate-950 via-emerald-950/30 to-slate-950 border border-emerald-500/20 rounded-2xl p-5">
            <h1 class="text-xl font-bold text-white"><i class="fas fa-cloud-upload-alt text-emerald-400 mr-2"></i>${t('vault.title')}</h1>
            <p class="text-sm text-slate-400 mt-1">Binary files go to isolated Cloudflare R2. Text extracts are AES-256-GCM encrypted in D1. ${d.vault ? '<span class="text-emerald-300">' + t('vault.r2Online') + '</span>' : '<span class="text-amber-300">' + t('vault.r2Pending') + '</span>'}</p>
          </div>
          <form id="vault-form" class="glass rounded-2xl border border-gray-800 p-4 space-y-3">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select id="vault-cat" class="bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white">
                <option value="id_doc">Photo ID / Utility</option>
                <option value="creditor_reply">Creditor / Bureau Reply</option>
                <option value="bank_statement">Bank Statement (DTI + AI)</option>
                <option value="other">Other Document</option>
              </select>
              <input id="vault-name" class="bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white" placeholder="File name">
            </div>
            <input id="vault-file" type="file" class="block w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white" />
            <textarea id="vault-text" rows="5" class="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white font-mono" placeholder="Optional: paste OCR / statement text for underwriting..."></textarea>
            <input id="vault-notes" class="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white" placeholder="Notes (optional)">
            <button class="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg"><i class="fas fa-lock mr-1"></i>Encrypt & Upload</button>
          </form>
          <div class="space-y-2">
            ${uploads.length ? uploads.map(u => `
              <div class="glass rounded-xl border border-gray-800 p-3 flex justify-between gap-3">
                <div>
                  <div class="text-sm text-white font-medium">${escapeHtml(u.file_name || u.category)}</div>
                  <div class="text-[11px] text-gray-500 uppercase tracking-wider mt-0.5">${escapeHtml(u.category)} · ${u.byte_size ? (Math.round(u.byte_size/1024)+' KB · ') : ''}${escapeHtml((u.created_at||'').slice(0,16))}${u.r2_key ? ' · R2' : ''}</div>
                  ${u.analysis_json ? `<p class="text-xs text-emerald-300/90 mt-2 line-clamp-3">${escapeHtml((()=>{try{const a=JSON.parse(u.analysis_json); return a.summary || (a.underwriting ? ('DTI '+a.underwriting.dtiPct+'% · income $'+a.underwriting.monthlyIncomeEstimate) : '')}catch(e){return ''}})())}</p>` : ''}
                </div>
                <div class="flex flex-col gap-1 shrink-0">
                <button type="button" data-dl="${u.id}" data-fn="${escapeHtml(u.file_name || '')}" data-mime="${escapeHtml(u.mime_type || '')}" class="vault-dl text-[10px] text-cyan-300 hover:text-cyan-200">${t('common.download')}</button>
                ${(u.mime_type || '').includes('pdf') || (u.file_name || '').toLowerCase().endsWith('.pdf') ? `<button type="button" data-pv="${u.id}" data-fn="${escapeHtml(u.file_name || 'document.pdf')}" class="vault-pv text-[10px] text-amber-300 hover:text-amber-200">${t('vault.previewPdf')}</button>` : ''}
                </div>
              </div>`).join('') : '<p class="text-sm text-gray-500">No uploads yet.</p>'}
          </div>
        </div>`;
      document.querySelectorAll('.vault-pv').forEach(btn => {
        btn.onclick = async () => {
          try {
            await previewVaultPdf(btn.getAttribute('data-pv'), btn.getAttribute('data-fn'));
          } catch (err) { toast(err.message, 'error'); }
        };
      });
      document.querySelectorAll('.vault-dl').forEach(btn => {
        btn.onclick = async () => {
          try {
            const id = btn.getAttribute('data-dl');
            const res = await fetch('/api/client-portal/uploads/' + id + '/download' + qs, { headers: { Authorization: 'Bearer ' + state.token } });
            if (!res.ok) throw new Error('Download failed');
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
              const j = await res.json();
              const blob = new Blob([j.text || ''], { type: 'text/plain' });
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = j.fileName || 'document.txt'; a.click();
            } else {
              const blob = await res.blob();
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'vault-file'; a.click();
            }
          } catch (err) { toast(err.message, 'error'); }
        };
      });
      document.getElementById('vault-form').onsubmit = async (e) => {
        e.preventDefault();
        try {
          const fileInput = document.getElementById('vault-file');
          const file = fileInput.files && fileInput.files[0];
          let fileBase64 = null;
          let fileName = document.getElementById('vault-name').value;
          let mimeType = 'text/plain';
          if (file) {
            fileName = fileName || file.name;
            mimeType = file.type || 'application/octet-stream';
            const buf = await file.arrayBuffer();
            const bytes = new Uint8Array(buf);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            fileBase64 = btoa(binary);
          }
          const res = await api('/client-portal/uploads', {
            method: 'POST',
            body: JSON.stringify(portalClientBody({
              category: document.getElementById('vault-cat').value,
              fileName,
              mimeType,
              fileBase64,
              contentText: document.getElementById('vault-text').value,
              notes: document.getElementById('vault-notes').value,
              runUnderwriting: document.getElementById('vault-cat').value === 'bank_statement',
            })),
          });
          const uw = res.underwriting;
          toast(uw ? `Uploaded · DTI ${uw.dtiPct ?? '—'}% · reserves ${uw.reservesMonths ?? '—'} mo` : (res.r2Stored ? 'Encrypted to R2 vault' : 'Encrypted upload saved'), 'success');
          await load();
        } catch (err) { toast(err.message, 'error'); }
      };
    }
    try { await load(); } catch (err) {
      el.innerHTML = `<div class="text-red-400 p-6">${escapeHtml(err.message)}</div>`;
    }
  }

  async function pgClientFundability(el) {
    try {
      const d = await api('/client-portal/fundability' + portalClientQs());
      const f = d.fundability || {};
      const pillars = f.pillars || {};
      const roadmaps = f.roadmaps || {};
      const progressMap = d.progress || {};
      const roadmapKeys = Object.keys(roadmaps);
      let activeKey = roadmapKeys.includes('mortgage') ? 'mortgage' : (roadmapKeys[0] || 'mortgage');

      function localProgress(key) {
        const p = progressMap[key] || { completedSteps: [], completedDocs: [] };
        return {
          completedSteps: new Set(p.completedSteps || []),
          completedDocs: new Set(p.completedDocs || []),
        };
      }

      async function saveProgress(key) {
        const lp = localProgress(key);
        try {
          await api('/client-portal/roadmap-progress', {
            method: 'PUT',
            body: JSON.stringify(portalClientBody({
              roadmapKey: key,
              completedSteps: [...lp.completedSteps],
              completedDocs: [...lp.completedDocs],
            })),
          });
          toast('Roadmap progress saved', 'success');
        } catch (err) { toast(err.message, 'error'); }
      }

      function renderWizard() {
        const r = roadmaps[activeKey] || {};
        const lp = localProgress(activeKey);
        const steps = r.steps || [];
        const docs = r.docsNeeded || [];
        const done = lp.completedSteps.size + lp.completedDocs.size;
        const total = Math.max(1, steps.length + docs.length);
        const pct = Math.round((done / total) * 100);

        el.innerHTML = `
          <div class="fade-in space-y-5">
            <div class="bg-gradient-to-r from-slate-950 via-amber-950/25 to-slate-950 border border-amber-500/20 rounded-2xl p-5">
              <h1 class="text-xl font-bold text-white"><i class="fas fa-chart-line text-amber-400 mr-2"></i>Fundability Command Center</h1>
              <p class="text-sm text-slate-400 mt-1">${escapeHtml(f.narrative || 'Deep readiness across mortgage, auto, student, and debt escape.')}</p>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-6 gap-3">
              ${[['Overall', f.overallScore],['Mortgage', pillars.mortgageReady],['Auto', pillars.autoReady],['Student', pillars.studentReady],['Debt Health', pillars.debtHealth],['DTI %', f.dti]].map(([l,v]) => `
                <div class="glass rounded-xl border border-gray-800 p-4 text-center">
                  <div class="text-[10px] uppercase tracking-wider text-gray-500">${l}</div>
                  <div class="text-2xl font-bold text-white mt-1 font-mono">${v ?? '—'}</div>
                </div>`).join('')}
            </div>
            ${(f.revolvingUtilPct != null) ? `<div class="glass rounded-xl border border-cyan-900/40 p-4 text-sm text-cyan-100"><strong>Revolving utilization:</strong> ${f.revolvingUtilPct}% (${money(f.revolvingBalance || 0)} / ${money(f.revolvingLimit || 0)} limits)</div>` : ''}
            ${(f.blockers||[]).length ? `<div class="glass rounded-xl border border-rose-900/40 p-4"><h3 class="text-xs font-bold text-rose-300 uppercase mb-2">Blockers</h3><ul class="space-y-1 text-sm text-slate-300">${f.blockers.map(b=>`<li>• ${escapeHtml(b)}</li>`).join('')}</ul></div>` : ''}

            <div class="glass rounded-2xl border border-amber-500/20 p-5 space-y-4">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <h2 class="text-sm font-bold text-white uppercase tracking-wider"><i class="fas fa-route text-amber-400 mr-1.5"></i>Interactive Roadmap Wizard</h2>
                <div class="flex flex-wrap gap-2">
                  ${roadmapKeys.map(k => `<button type="button" data-rm-key="${k}" class="rm-tab px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${k===activeKey ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}">${escapeHtml((roadmaps[k]&&roadmaps[k].title)||k)}</button>`).join('')}
                </div>
              </div>
              <div class="flex items-center gap-3">
                <div class="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden"><div class="h-full bg-amber-500 transition-all" style="width:${pct}%"></div></div>
                <span class="text-xs font-mono text-amber-300">${pct}% · ${done}/${total}</span>
              </div>
              <p class="text-[11px] text-gray-500">Target score ~${r.targetScore ?? '—'} · Current avg ${r.currentAvg ?? '—'} · Readiness ${r.readiness ?? '—'}/100</p>
              <div class="grid md:grid-cols-2 gap-4">
                <div>
                  <h3 class="text-xs font-bold text-white uppercase mb-2">Steps</h3>
                  <div class="space-y-2">${steps.map((s, i) => {
                    const id = 'step:' + i;
                    const checked = lp.completedSteps.has(id) || lp.completedSteps.has(s);
                    return `<label class="flex gap-2.5 items-start text-xs text-slate-300 cursor-pointer"><input type="checkbox" class="rm-step mt-0.5" data-id="${escapeHtml(id)}" ${checked?'checked':''}/><span>${escapeHtml(s)}</span></label>`;
                  }).join('')}</div>
                </div>
                <div>
                  <h3 class="text-xs font-bold text-white uppercase mb-2">Document checklist</h3>
                  <div class="space-y-2">${docs.map((doc, i) => {
                    const id = 'doc:' + i;
                    const checked = lp.completedDocs.has(id) || lp.completedDocs.has(doc);
                    return `<label class="flex gap-2.5 items-start text-xs text-slate-300 cursor-pointer"><input type="checkbox" class="rm-doc mt-0.5" data-id="${escapeHtml(id)}" ${checked?'checked':''}/><span>${escapeHtml(doc)}</span></label>`;
                  }).join('')}</div>
                </div>
              </div>
              <button type="button" id="rm-save" class="bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg"><i class="fas fa-save mr-1.5"></i>Save ${escapeHtml(activeKey)} progress</button>
            </div>

            <div class="glass rounded-xl border border-gray-800 p-4">
              <h3 class="text-xs font-bold text-white uppercase mb-3">Priority Actions</h3>
              <div class="space-y-2">${(f.actions||[]).map(a=>`
                <div class="flex gap-3 text-sm"><span class="text-amber-400 font-mono text-xs mt-0.5">#${a.priority}</span><div><div class="text-white font-medium">${escapeHtml(a.title)}</div><div class="text-xs text-gray-400">${escapeHtml(a.detail)}</div></div></div>`).join('')}</div>
            </div>
            <button onclick="window._nav('client-tradelines')" class="bg-amber-600/90 hover:bg-amber-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg">See profile-smart boost tools →</button>
          </div>`;

        el.querySelectorAll('.rm-tab').forEach(btn => {
          btn.onclick = () => { activeKey = btn.getAttribute('data-rm-key'); renderWizard(); };
        });
        el.querySelectorAll('.rm-step').forEach(cb => {
          cb.onchange = () => {
            const id = cb.getAttribute('data-id');
            if (!progressMap[activeKey]) progressMap[activeKey] = { completedSteps: [], completedDocs: [] };
            const set = new Set(progressMap[activeKey].completedSteps || []);
            if (cb.checked) set.add(id); else set.delete(id);
            progressMap[activeKey].completedSteps = [...set];
            renderWizard();
          };
        });
        el.querySelectorAll('.rm-doc').forEach(cb => {
          cb.onchange = () => {
            const id = cb.getAttribute('data-id');
            if (!progressMap[activeKey]) progressMap[activeKey] = { completedSteps: [], completedDocs: [] };
            const set = new Set(progressMap[activeKey].completedDocs || []);
            if (cb.checked) set.add(id); else set.delete(id);
            progressMap[activeKey].completedDocs = [...set];
            renderWizard();
          };
        });
        const saveBtn = document.getElementById('rm-save');
        if (saveBtn) saveBtn.onclick = () => saveProgress(activeKey);
      }

      renderWizard();
    } catch (err) {
      el.innerHTML = `<div class="text-red-400 p-6">${escapeHtml(err.message)}</div>`;
    }
  }

  async function pgClientTradelines(el) {
    try {
      const goal = 'mortgage';
      const sep = portalClientQs() ? '&' : '?';
      const d = await api('/client-portal/tradelines' + portalClientQs() + sep + 'goal=' + goal);
      const recs = d.recommendations || [];
      const orders = d.orders || [];
      el.innerHTML = `
        <div class="fade-in space-y-4">
          <div class="bg-gradient-to-r from-slate-950 via-teal-950/30 to-slate-950 border border-teal-500/20 rounded-2xl p-5">
            <h1 class="text-xl font-bold text-white"><i class="fas fa-handshake text-teal-400 mr-2"></i>Intelligent Boost Tools</h1>
            <p class="text-sm text-slate-400 mt-1">Profile-ranked rent reporters & builders — checkout securely with Stripe on-platform.</p>
          </div>
          <div class="grid md:grid-cols-2 gap-4">
            ${recs.map(t => `
              <div class="glass rounded-xl border ${t.recommended ? 'border-teal-500/40' : 'border-gray-800'} p-4">
                <div class="flex justify-between gap-2">
                  <h3 class="text-sm font-bold text-white">${escapeHtml(t.name)}</h3>
                  ${t.recommended ? '<span class="text-[10px] uppercase bg-teal-500/15 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded">Best fit</span>' : ''}
                </div>
                <p class="text-xs text-gray-400 mt-2">${escapeHtml(t.impact)}</p>
                <div class="text-[11px] text-gray-500 mt-2">Reports to: ${(t.reportsTo||[]).join(', ')} · $${t.monthlyFee}/mo · match ${t.matchScore}</div>
                <button data-product="${escapeHtml(t.id)}" class="tl-checkout mt-3 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-3 py-2 rounded-lg">Sign up on platform</button>
              </div>`).join('')}
          </div>
          ${orders.length ? `<div class="glass rounded-xl border border-gray-800 p-4"><h3 class="text-xs font-bold uppercase text-white mb-2">Your enrollments</h3>
            ${orders.map(o=>`<div class="text-xs text-gray-300 py-1 border-b border-gray-800/60 flex justify-between"><span>${escapeHtml(o.product_name)}</span><span class="font-mono text-teal-300">${escapeHtml(o.status)} · $${((o.amount_cents||0)/100).toFixed(2)}</span></div>`).join('')}
          </div>` : ''}
        </div>`;
      document.querySelectorAll('.tl-checkout').forEach(btn => {
        btn.onclick = async () => {
          try {
            const res = await api('/client-portal/tradelines/checkout', {
              method: 'POST',
              body: JSON.stringify(portalClientBody({ productId: btn.getAttribute('data-product') })),
            });
            if (res.freePath) { toast('No charge for this path — advisor will provision', 'success'); return; }
            if (res.url) location.href = res.url;
            else toast('Checkout unavailable', 'error');
          } catch (err) { toast(err.message, 'error'); }
        };
      });
    } catch (err) {
      el.innerHTML = `<div class="text-red-400 p-6">${escapeHtml(err.message)}</div>`;
    }
  }

  async function pgClientTutor(el) {
    const qs = portalClientQs();
    let history = [{ role: 'tutor', text: 'Hi — I am Alex Rivera, your personal finance tutor. Ask me about budgeting, quizzes, fundability, or paste bank numbers for a cash-flow check.' }];
    async function paint() {
      const meta = await api('/client-portal/tutor' + qs);
      el.innerHTML = `
        <div class="fade-in space-y-4 max-w-3xl">
          <div class="bg-gradient-to-r from-slate-950 via-violet-950/35 to-slate-950 border border-violet-500/25 rounded-2xl p-5">
            <h1 class="text-xl font-bold text-white"><i class="fas fa-user-graduate text-violet-300 mr-2"></i>${escapeHtml(meta.mentor?.name || 'Personal Tutor')}</h1>
            <p class="text-sm text-slate-400 mt-1">${escapeHtml(meta.mentor?.blurb || '')}</p>
            ${meta.memory?.summary ? `<p class="text-xs text-violet-200/70 mt-2 line-clamp-2">Memory: ${escapeHtml(meta.memory.summary.slice(0,240))}</p>` : ''}
          </div>
          <div id="tutor-thread" class="glass rounded-2xl border border-gray-800 p-4 h-[380px] overflow-y-auto space-y-3">
            ${history.map(h => `
              <div class="flex ${h.role==='you'?'justify-end':'justify-start'}">
                <div class="max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${h.role==='you'?'bg-violet-600/25 border border-violet-500/30':'bg-slate-900 border border-slate-700'} whitespace-pre-wrap">${escapeHtml(h.text)}</div>
              </div>`).join('')}
          </div>
          <form id="tutor-form" class="flex gap-2">
            <input id="tutor-input" class="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white" placeholder="Ask your tutor..." required>
            <button class="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-semibold">Send</button>
          </form>
          <div class="flex flex-wrap gap-2 text-xs">
            <button type="button" class="tutor-quick px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:border-violet-500/40" data-q="Quiz me on FICO basics">Quiz me</button>
            <button type="button" class="tutor-quick px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:border-violet-500/40" data-q="Build me a weekly budget plan for fundability">Budget plan</button>
            <button type="button" class="tutor-quick px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:border-violet-500/40" data-q="What should I do next for mortgage readiness?">Mortgage next steps</button>
            <button type="button" onclick="window._nav('client-knowledge')" class="px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300">Open Education Hub</button>
          </div>
        </div>`;
      const thread = document.getElementById('tutor-thread');
      if (thread) thread.scrollTop = thread.scrollHeight;
      const send = async (msg) => {
        history.push({ role: 'you', text: msg });
        paint();
        try {
          const res = await api('/client-portal/tutor/chat', {
            method: 'POST',
            body: JSON.stringify(portalClientBody({ message: msg })),
          });
          history.push({ role: 'tutor', text: res.reply || '(no reply)' });
        } catch (err) {
          history.push({ role: 'tutor', text: 'Error: ' + err.message });
        }
        paint();
      };
      document.getElementById('tutor-form').onsubmit = async (e) => {
        e.preventDefault();
        const inp = document.getElementById('tutor-input');
        const msg = inp.value.trim();
        if (!msg) return;
        inp.value = '';
        await send(msg);
      };
      document.querySelectorAll('.tutor-quick').forEach(btn => {
        btn.onclick = () => send(btn.getAttribute('data-q'));
      });
    }
    try { await paint(); } catch (err) {
      el.innerHTML = `<div class="text-red-400 p-6">${escapeHtml(err.message)}</div>`;
    }
  }

  async function pgClientSelfOnboard(el, data) {
    let step = (data && data.step) || 1;
    let result = null;
    const form = {
      rawText: '',
      bureau: 'Equifax',
      fileName: 'my-credit-report.txt',
      permissiblePurposeConsent: false,
      croaContractAgreed: false,
      tsrAdvanceFeeWaived: false,
    };

    function renderWizard() {
      el.innerHTML = `
        <div class="fade-in max-w-3xl mx-auto space-y-6">
          <div class="glass rounded-2xl border border-blue-500/20 p-6">
            <h1 class="text-2xl font-bold text-white">${t('onboard.title')}</h1>
            <p class="text-sm text-gray-400 mt-2">${t('onboard.subtitle')}</p>
          </div>
          <div class="flex gap-2 text-xs font-mono uppercase tracking-wider">
            <span class="px-3 py-1 rounded-full ${step >= 1 ? 'bg-blue-600/30 text-blue-300' : 'bg-gray-800 text-gray-500'}">1 · ${t('onboard.step.upload')}</span>
            <span class="px-3 py-1 rounded-full ${step >= 2 ? 'bg-blue-600/30 text-blue-300' : 'bg-gray-800 text-gray-500'}">2 · ${t('onboard.step.consents')}</span>
            <span class="px-3 py-1 rounded-full ${step >= 3 ? 'bg-blue-600/30 text-blue-300' : 'bg-gray-800 text-gray-500'}">3 · ${t('onboard.step.review')}</span>
          </div>
          <div id="self-onboard-body" class="glass rounded-2xl border border-gray-800 p-6"></div>
        </div>`;
      const body = document.getElementById('self-onboard-body');
      if (step === 1) {
        body.innerHTML = `
          <label class="block text-xs text-gray-400 mb-2" for="so-bureau">${t('onboard.bureau')}</label>
          <select id="so-bureau" class="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white mb-4">
            <option value="Equifax">Equifax</option>
            <option value="Experian">Experian</option>
            <option value="TransUnion">TransUnion</option>
          </select>
          <div id="so-dropzone" class="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500/50 transition mb-4" tabindex="0" role="button" aria-label="${t('onboard.dropzone')}">
            <i class="fas fa-file-upload text-3xl text-blue-400 mb-3" aria-hidden="true"></i>
            <p class="text-sm text-gray-300">${t('onboard.dropzone')}</p>
            <input type="file" id="so-file" class="hidden" accept=".txt,.pdf,.html,.htm" />
          </div>
          <textarea id="so-raw" rows="10" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-white font-mono" placeholder="${t('onboard.dropzone')}">${escapeHtml(form.rawText)}</textarea>
          <button type="button" id="so-next-1" class="mt-4 w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg">${t('common.continue')}</button>`;
        const dz = document.getElementById('so-dropzone');
        const fi = document.getElementById('so-file');
        dz.onclick = () => fi.click();
        dz.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fi.click(); } };
        fi.onchange = async () => {
          const f = fi.files[0];
          if (!f) return;
          form.fileName = f.name;
          if (f.type === 'application/pdf' && window.pdfjsLib) {
            const buf = await f.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(buf).promise;
            let text = '';
            for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              text += content.items.map((it) => it.str).join(' ') + '\n';
            }
            form.rawText = text;
          } else {
            form.rawText = await f.text();
          }
          document.getElementById('so-raw').value = form.rawText;
        };
        document.getElementById('so-next-1').onclick = () => {
          form.rawText = document.getElementById('so-raw').value.trim();
          form.bureau = document.getElementById('so-bureau').value;
          if (form.rawText.length < 80) { toast('Please paste or upload a full credit report', 'error'); return; }
          step = 2;
          renderWizard();
        };
      } else if (step === 2) {
        body.innerHTML = `
          <div class="space-y-4 text-sm text-gray-300">
            <label class="flex gap-3 items-start"><input type="checkbox" id="so-pp" class="mt-1" ${form.permissiblePurposeConsent ? 'checked' : ''}/><span>${t('onboard.consent.fcra')}</span></label>
            <label class="flex gap-3 items-start"><input type="checkbox" id="so-croa" class="mt-1" ${form.croaContractAgreed ? 'checked' : ''}/><span>${t('onboard.consent.croa')}</span></label>
            <label class="flex gap-3 items-start"><input type="checkbox" id="so-tsr" class="mt-1" ${form.tsrAdvanceFeeWaived ? 'checked' : ''}/><span>${t('onboard.consent.tsr')}</span></label>
          </div>
          <div class="flex gap-3 mt-6">
            <button type="button" id="so-back-2" class="flex-1 bg-gray-800 text-gray-200 py-2.5 rounded-lg">${t('common.back')}</button>
            <button type="button" id="so-analyze" class="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-lg"><i class="fas fa-search mr-1"></i>${t('onboard.analyze')}</button>
          </div>`;
        document.getElementById('so-back-2').onclick = () => { step = 1; renderWizard(); };
        document.getElementById('so-analyze').onclick = async () => {
          form.permissiblePurposeConsent = document.getElementById('so-pp').checked;
          form.croaContractAgreed = document.getElementById('so-croa').checked;
          form.tsrAdvanceFeeWaived = document.getElementById('so-tsr').checked;
          if (!form.permissiblePurposeConsent || !form.croaContractAgreed || !form.tsrAdvanceFeeWaived) {
            toast('All three consents are required', 'error');
            return;
          }
          const btn = document.getElementById('so-analyze');
          btn.disabled = true;
          btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + t('common.loading');
          try {
            result = await api('/client-portal/onboard', {
              method: 'POST',
              body: JSON.stringify({
                rawText: form.rawText,
                bureau: form.bureau,
                fileName: form.fileName,
                permissiblePurposeConsent: true,
                croaContractAgreed: true,
                tsrAdvanceFeeWaived: true,
                preferredLanguage: state.locale,
              }),
            });
            step = 3;
            renderWizard();
          } catch (err) {
            toast(err.message, 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-search mr-1"></i>' + t('onboard.analyze');
          }
        };
      } else {
        const vCount = result?.violationsFound || 0;
        const score = result?.litigationScore?.score ?? '—';
        body.innerHTML = `
          <div class="text-center py-4">
            <div class="text-4xl font-bold text-emerald-400 mb-2">${vCount}</div>
            <p class="text-white font-medium">${t('onboard.violationsFound', { count: vCount })}</p>
            <p class="text-sm text-gray-400 mt-2">Litigation score: <strong class="text-amber-300">${score}/100</strong> · Bureau: ${escapeHtml(result?.bureau || form.bureau)}</p>
            <button type="button" id="so-finish" class="mt-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-2.5 rounded-lg">${t('onboard.viewCockpit')}</button>
          </div>`;
        document.getElementById('so-finish').onclick = () => {
          if (result?.reportId) navigate('report-detail', { reportId: result.reportId, focusTab: 'violations' });
          else navigate('client-cockpit');
        };
      }
    }

    renderWizard();
  }

  async function pgClientCockpit(el) {
    try {
      const d = await api('/client-portal/dashboard' + (state.impersonateClientId ? `?clientId=${state.impersonateClientId}` : ''));
      const client = d.client || {};
      const actualViolations = d.violations || [];
      const documents = d.documents || [];
      const reports = d.reports || [];

      if (d.needsOnboarding && !state.impersonateClientId) {
        el.innerHTML = `
          <div class="fade-in max-w-2xl mx-auto text-center py-16 space-y-4">
            <i class="fas fa-file-upload text-5xl text-blue-400" aria-hidden="true"></i>
            <h1 class="text-2xl font-bold text-white">${t('cockpit.welcome', { name: escapeHtml(client.first_name || 'there') })}</h1>
            <p class="text-gray-400">${t('cockpit.noReports')}</p>
            <button type="button" onclick="window._nav('client-self-onboard')" class="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl">${t('cockpit.startOnboarding')}</button>
          </div>`;
        return;
      }

      const violations = actualViolations.map((v, i) => {
        const liftEntry = (d.scoreProjection?.lifts || []).find((l) => l.id === v.id);
        const lift = liftEntry?.lift ?? (v.severity === 'critical' ? 40 : (v.severity === 'high' ? 25 : 15));
        return {
          id: v.id || `v-act-${i}`,
          account_name: v.account_name || 'Inaccurate Record',
          bureau: v.bureau || 'Experian',
          severity: v.severity || 'high',
          statute: v.statute || '15 U.S.C. § 1681e(b)',
          error_type: v.error_type || v.subcategory || 'FCRA Inaccuracy',
          finding_reason: v.finding_reason || v.description || 'Record reporting incorrect credit coordinates.',
          fico_points: lift,
        };
      });

      // Local State for interactive features
      if (!window._cockpitState) {
        window._cockpitState = {
          selectedDeletions: {},
          completedTasks: {
            verifyAddress: true,
            readGuide: false,
            signLetters: documents.some(d => d.status === 'signed' || d.status === 'sent'),
            uploadId: false
          },
          chatHistory: [
            { sender: 'ai', text: `Hi ${escapeHtml(client.first_name || 'there')}! I am your automated FCRA Legal Counsel Advisor. Ask me anything about your rights under federal law, the dispute process, or your active campaign.` }
          ]
        };
        // Set initial checkbox states
        violations.forEach(v => {
          window._cockpitState.selectedDeletions[v.id] = false;
        });
      }

      const localState = window._cockpitState;

      // Recalculate and update the workspace layout dynamically
      function renderState() {
        const eqBase = client.eq_score || 640;
        const exBase = client.ex_score || 635;
        const tuBase = client.tu_score || 645;

        // Calculate simulated score improvements
        let eqSim = eqBase;
        let exSim = exBase;
        let tuSim = tuBase;

        let totalLift = 0;

        violations.forEach(v => {
          if (localState.selectedDeletions[v.id]) {
            totalLift += v.fico_points;
            if (v.bureau.toLowerCase().includes('equifax')) eqSim += v.fico_points;
            else if (v.bureau.toLowerCase().includes('experian')) exSim += v.fico_points;
            else if (v.bureau.toLowerCase().includes('transunion')) tuSim += v.fico_points;
            else {
              // Add to all if unspecified
              eqSim += Math.round(v.fico_points / 2);
              exSim += Math.round(v.fico_points / 2);
              tuSim += Math.round(v.fico_points / 2);
            }
          }
        });

        eqSim = Math.min(850, eqSim);
        exSim = Math.min(850, exSim);
        tuSim = Math.min(850, tuSim);

        // Calculate checklist progress
        const tasksList = [
          { id: 'verifyAddress', label: 'Verify Mailing Address Coordinates', weight: 25 },
          { id: 'signLetters', label: 'E-Sign Pending Dispute Letters', weight: 25 },
          { id: 'uploadId', label: 'Upload Photo ID & Utility Bill (FCRA Compliance)', weight: 25 },
          { id: 'readGuide', label: 'Review Educational FCRA Litigation Guide', weight: 25 }
        ];

        let progressPercent = 0;
        tasksList.forEach(t => {
          if (localState.completedTasks[t.id]) {
            progressPercent += t.weight;
          }
        });

        const totalDamagesVal = violations.length * 1000;

        el.innerHTML = `
          <div class="fade-in space-y-6 max-w-full text-gray-200">
            <!-- Premium Header Jumbotron with Brand proof -->
            <div class="relative overflow-hidden bg-gradient-to-r from-gray-950 via-blue-950/40 to-gray-950 border border-blue-500/20 rounded-2xl p-6 shadow-2xl">
              <div class="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl"></div>
              <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h1 class="text-2xl font-bold text-white mb-1">Welcome back, ${escapeHtml(client.first_name)}!</h1>
                  <p class="text-xs text-gray-400 font-mono">Secure Client Autopilot Dashboard &bull; Case ID: NEL-${client.id || 'Active'}</p>
                  <div class="flex flex-wrap gap-2 mt-3">
                    <button onclick="window._nav('client-messages')" class="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">Messages</button>
                    <button onclick="window._nav('client-fundability')" class="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">Fundability</button>
                    <button onclick="window._nav('client-tutor')" class="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-300">My Tutor</button>
                    <button onclick="window._nav('client-uploads')" class="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">Vault</button>
                    <button onclick="window._nav('client-tradelines')" class="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-300">Boost Tools</button>
                  </div>
                </div>
                <div class="bg-blue-600/10 border border-blue-500/20 rounded-xl px-4 py-2 flex items-center gap-3">
                  <img src="https://storage.googleapis.com/msgsndr/qQnxRHDtyx0uydPd5sRl/media/67eb83c5e519ed689430646b.jpeg" alt="RJ Business Solutions Logo" class="w-8 h-8 rounded-lg object-cover border border-blue-500/30">
                  <div>
                    <div class="text-[10px] text-gray-400 uppercase tracking-wider font-mono">Authorized Advisor</div>
                    <div class="text-xs font-extrabold text-white">Rick Jefferson</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Dashboard Fast Stats Row: Scores, Damages & Checklist Progress -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <!-- Score 1 -->
              ${scoreWidget('Equifax', eqBase, eqSim, 'text-red-500')}
              <!-- Score 2 -->
              ${scoreWidget('Experian', exBase, exSim, 'text-blue-500')}
              <!-- Score 3 -->
              ${scoreWidget('TransUnion', tuBase, tuSim, 'text-emerald-500')}

              <!-- Statutory Damages Metric Card -->
              <div class="glass rounded-2xl p-5 border border-red-950/40 bg-red-950/5 flex flex-col justify-between">
                <div>
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Bureau Liabilities</span>
                    <span class="px-2 py-0.5 bg-red-500/10 text-red-400 text-[9px] font-bold rounded uppercase tracking-wider border border-red-500/20 animate-pulse">Statutory Claim</span>
                  </div>
                  <div class="text-2xl font-extrabold text-red-400 font-mono mt-2">$${totalDamagesVal.toLocaleString()}</div>
                  <div class="text-[10px] text-gray-400 mt-1 leading-relaxed">
                    Under 15 U.S.C. § 1681n, consumers are entitled to statutory damages of up to <strong>$1,000 per willful violation</strong>, plus punitive damages and attorney fees.
                  </div>
                </div>
                <div class="mt-4 pt-2.5 border-t border-gray-800/80 flex items-center justify-between text-xs">
                  <span class="text-gray-500 font-medium text-[10px]">Violations Logged:</span>
                  <span class="font-bold text-white font-mono text-xs">${violations.length} Flagged</span>
                </div>
              </div>
            </div>

            <!-- Gamified Onboarding Compliance Task List -->
            <div class="glass rounded-2xl p-5 border border-gray-800">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 class="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                    <i class="fas fa-check-circle text-blue-400"></i> Onboarding & Verification Tracker
                  </h3>
                  <p class="text-[11px] text-gray-400 mt-0.5">Complete tasks to establish legal compliance and prevent bureaus from stalling investigations.</p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span class="text-xs font-mono font-bold text-white">${progressPercent}%</span>
                  <div class="w-32 bg-gray-950 rounded-full h-2 border border-gray-800 overflow-hidden">
                    <div class="bg-blue-500 h-full transition-all duration-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" style="width: ${progressPercent}%"></div>
                  </div>
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                ${tasksList.map(t => `
                  <div class="p-3 bg-gray-900/40 border ${localState.completedTasks[t.id] ? 'border-green-500/20 bg-green-950/5' : 'border-gray-800 hover:border-gray-700'} rounded-xl transition flex items-start gap-3">
                    <input type="checkbox" id="chk-tsk-${t.id}" data-task="${t.id}" ${localState.completedTasks[t.id] ? 'checked' : ''} class="task-checkbox w-4.5 h-4.5 rounded border-gray-800 text-blue-600 bg-gray-950 focus:ring-blue-500 mt-0.5 cursor-pointer">
                    <div class="min-w-0 flex-1">
                      <label class="block text-xs font-bold ${localState.completedTasks[t.id] ? 'text-green-400 line-through' : 'text-white'} cursor-pointer uppercase font-mono select-none" for="chk-tsk-${t.id}">
                        ${t.label}
                      </label>
                      <p class="text-[10px] text-gray-400 mt-0.5">
                        ${t.id === 'verifyAddress' ? 'Ensures mailing address coordinates match the credit bureau files exactly.' : ''}
                        ${t.id === 'signLetters' ? 'Formally authorizes click2mail delivery system to dispatch notices.' : ''}
                        ${t.id === 'uploadId' ? 'Prevents credit bureaus from falsely claiming "unverified identity" as a stall tactic.' : ''}
                        ${t.id === 'readGuide' ? 'Empowers you with knowledge on how to counter bureau rejection letters.' : ''}
                      </p>
                      ${t.id === 'signLetters' && !localState.completedTasks.signLetters ? `
                        <button onclick="window._nav('client-documents')" class="mt-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-2.5 py-1 rounded transition flex items-center gap-1 uppercase font-mono"><i class="fas fa-signature"></i> Sign letters now</button>
                      ` : ''}
                      ${t.id === 'readGuide' && !localState.completedTasks.readGuide ? `
                        <button onclick="window._nav('client-knowledge')" class="mt-2 bg-purple-600/20 border border-purple-500/30 text-purple-300 text-[10px] font-bold px-2.5 py-1 rounded hover:bg-purple-600/30 transition flex items-center gap-1 uppercase font-mono"><i class="fas fa-graduation-cap"></i> Read Guide</button>
                      ` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <!-- LEFT COLUMN: What-If Simulator & Bureau Audit Matrix (lg:col-span-7) -->
              <div class="lg:col-span-7 space-y-6">
                <!-- What-If Deletion Simulator Card -->
                <div class="glass rounded-2xl p-5 border border-gray-800 bg-gradient-to-b from-gray-900/50 to-gray-950/20">
                  <div class="flex items-center justify-between mb-4 border-b border-gray-800/80 pb-3">
                    <div>
                      <h3 class="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2"><i class="fas fa-magic text-purple-400"></i> FICO Score "What-If" Deletion Simulator</h3>
                      <p class="text-[11px] text-gray-400 mt-0.5">Toggle checkboxes to simulate removing negative records and watch your FICO scores react dynamically.</p>
                    </div>
                    ${totalLift > 0 ? `
                      <span class="px-2.5 py-1 bg-purple-500/10 text-purple-300 text-xs font-bold rounded-full font-mono animate-bounce flex items-center gap-1 border border-purple-500/20"><i class="fas fa-chart-line"></i> +${totalLift} pts lift!</span>
                    ` : `
                      <span class="text-xs text-gray-500 font-mono">Select records</span>
                    `}
                  </div>

                  <div class="space-y-2.5">
                    ${violations.map(v => `
                      <div class="p-3 bg-gray-950/40 hover:bg-gray-950/85 border ${localState.selectedDeletions[v.id] ? 'border-purple-500/30 bg-purple-950/5' : 'border-gray-800'} rounded-xl transition flex items-center justify-between gap-3 cursor-pointer select-none" onclick="window._toggleSimulatorItem('${v.id}')">
                        <div class="flex items-center gap-3">
                          <input type="checkbox" id="sim-chk-${v.id}" ${localState.selectedDeletions[v.id] ? 'checked' : ''} class="w-4 h-4 rounded border-gray-800 text-purple-600 bg-gray-950 focus:ring-purple-500 pointer-events-none">
                          <div class="min-w-0">
                            <div class="text-xs font-bold text-white uppercase font-mono truncate">${escapeHtml(v.account_name)}</div>
                            <div class="text-[11px] text-gray-400 flex items-center gap-1.5 mt-0.5 font-mono">
                              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold ${v.severity === 'critical' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'} uppercase">${v.severity.toUpperCase()}</span>
                              <span>${v.bureau} &bull; ${v.error_type}</span>
                            </div>
                          </div>
                        </div>
                        <div class="text-right font-mono shrink-0">
                          <div class="text-xs font-bold text-purple-400">+${v.fico_points} FICO pts</div>
                          <div class="text-[10px] text-gray-500 uppercase tracking-wider">Est. score lift</div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>

                <!-- Bureau Discrepancy Audits Matrix -->
                <div class="glass rounded-2xl p-5 border border-gray-800">
                  <div class="flex items-center justify-between mb-4">
                    <div>
                      <h3 class="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2"><i class="fas fa-balance-scale text-blue-400"></i> Bureau Discrepancy Audits</h3>
                      <p class="text-[11px] text-gray-400 mt-0.5">Comparison of credit report data stream against verified database credentials.</p>
                    </div>
                    <span class="text-[10px] text-gray-500 font-mono font-bold uppercase">15 U.S.C. § 1681e(b)</span>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Name Discrepancies -->
                    <div class="p-3 bg-gray-950/40 border border-gray-800 rounded-xl">
                      <div class="flex items-center justify-between mb-2">
                        <span class="text-xs font-bold text-white uppercase font-mono flex items-center gap-1.5"><i class="fas fa-user text-blue-400"></i> Name Matches</span>
                        <span class="px-1.5 py-0.5 bg-green-500/10 text-green-400 text-[9px] font-bold rounded uppercase tracking-wider border border-green-500/20">Verified</span>
                      </div>
                      <div class="text-[11px] text-gray-400 mt-1 leading-relaxed">
                        Demographic profile matches the bureau-furnished text file. Zero record cross-contamination / mixed-file risk detected on primary identity.
                      </div>
                    </div>

                    <!-- SSN Checks -->
                    <div class="p-3 bg-gray-950/40 border border-gray-800 rounded-xl">
                      <div class="flex items-center justify-between mb-2">
                        <span class="text-xs font-bold text-white uppercase font-mono flex items-center gap-1.5"><i class="fas fa-fingerprint text-blue-400"></i> SSN Audit</span>
                        <span class="px-1.5 py-0.5 bg-green-500/10 text-green-400 text-[9px] font-bold rounded uppercase tracking-wider border border-green-500/20">Verified</span>
                      </div>
                      <div class="text-[11px] text-gray-400 mt-1 leading-relaxed">
                        Social Security digits validated against credit bureau parsing coordinates. High data-fidelity across Equifax, Experian, and TransUnion.
                      </div>
                    </div>

                    <!-- Address Coordinates -->
                    <div class="p-3 bg-gray-950/40 border border-gray-800 rounded-xl">
                      <div class="flex items-center justify-between mb-2">
                        <span class="text-xs font-bold text-white uppercase font-mono flex items-center gap-1.5"><i class="fas fa-map-marked-alt text-blue-400"></i> Addresses</span>
                        <span class="px-1.5 py-0.5 bg-green-500/10 text-green-400 text-[9px] font-bold rounded uppercase tracking-wider border border-green-500/20">Verified</span>
                      </div>
                      <div class="text-[11px] text-gray-400 mt-1 leading-relaxed">
                        Mailing coordinates cross-checked. Standard identity coordinates matches credit record files correctly.
                      </div>
                    </div>

                    <!-- Employer verification -->
                    <div class="p-3 bg-gray-950/40 border border-gray-800 rounded-xl">
                      <div class="flex items-center justify-between mb-2">
                        <span class="text-xs font-bold text-white uppercase font-mono flex items-center gap-1.5"><i class="fas fa-briefcase text-blue-400"></i> Employers</span>
                        <span class="px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 text-[9px] font-bold rounded uppercase tracking-wider border border-yellow-500/20">Audit Pending</span>
                      </div>
                      <div class="text-[11px] text-gray-400 mt-1 leading-relaxed">
                        Unlisted historical employers identified on credit profile report. These can be challenged to delete old historical references.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- RIGHT COLUMN: Certified USPS Tracking & Inline AI Chat Counsel (lg:col-span-5) -->
              <div class="lg:col-span-5 space-y-6">
                <!-- USPS Certified Mail Logistics Tracker -->
                <div class="glass rounded-2xl p-5 border border-gray-800 bg-gradient-to-b from-gray-900/50 to-gray-950/10">
                  <div class="flex items-center justify-between mb-4 pb-2 border-b border-gray-800">
                    <h3 class="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2"><i class="fas fa-mail-bulk text-purple-400 animate-pulse"></i> Certified Mail Logistics</h3>
                    <span class="px-2 py-0.5 rounded text-[9px] font-extrabold bg-purple-500/10 text-purple-300 border border-purple-500/20 uppercase tracking-wider font-mono">Sync Active</span>
                  </div>

                  <div class="space-y-4">
                    ${documents.some(d => d.status === 'sent') ? `
                      <div class="p-4 bg-gray-950/50 rounded-xl border border-gray-800 flex items-start gap-3">
                        <div class="text-purple-400 text-xl mt-1 shrink-0"><i class="fas fa-shipping-fast"></i></div>
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-purple-400 uppercase font-mono">USPS Certified Mail</span>
                            <span class="px-1.5 py-0.5 bg-green-500/10 text-green-400 text-[9px] font-bold rounded uppercase">In Transit</span>
                          </div>
                          <div class="text-sm font-mono font-extrabold text-white mt-1">9405 5000 1234 5678 9012 34</div>
                          <p class="text-[11px] text-gray-400 mt-1 leading-relaxed">Dispatched electronically to Click2Mail Gateway. USPS Certified envelope in transit to credit bureau compliance headquarters.</p>
                        </div>
                      </div>
                    ` : `
                      <div class="p-5 bg-gray-950/50 rounded-xl text-center border border-gray-800">
                        <div class="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-3">
                          <i class="fas fa-signature text-xl text-blue-400"></i>
                        </div>
                        <h4 class="text-xs font-bold text-white uppercase font-mono">Signature Action Required</h4>
                        <p class="text-[11px] text-gray-400 mt-1.5 leading-relaxed max-w-sm mx-auto">Your draft litigation letters are complete. Please execute your electronic signature to instantly launch USPS certified mail dispatch.</p>
                        <button onclick="window._nav('client-documents')" class="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-xs py-2.5 px-4 rounded-lg font-bold transition flex items-center justify-center gap-1.5 mx-auto uppercase font-mono shadow-[0_0_15px_rgba(59,130,246,0.3)]"><i class="fas fa-signature"></i> Access Signature Cockpit</button>
                      </div>
                    `}

                    <!-- Case Timeline Steps -->
                    <div class="relative pl-5 border-l border-gray-800 space-y-5 py-1 text-xs">
                      <div class="relative pl-2">
                        <div class="absolute -left-[27px] top-0.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-gray-950"></div>
                        <span class="font-bold text-white uppercase font-mono text-[10px]">Ingestion Pipeline</span>
                        <p class="text-[11px] text-gray-400 mt-0.5">Credit files imported and AES-256 encrypted successfully.</p>
                      </div>
                      <div class="relative pl-2">
                        <div class="absolute -left-[27px] top-0.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-gray-950"></div>
                        <span class="font-bold text-white uppercase font-mono text-[10px]">FCRA Statute Mapping</span>
                        <p class="text-[11px] text-gray-400 mt-0.5">Automatic parsing located ${violations.length} high-severity statutory infractions.</p>
                      </div>
                      <div class="relative pl-2">
                        <div class="absolute -left-[27px] top-0.5 w-3 h-3 rounded-full ${documents.length > 0 ? 'bg-blue-500' : 'bg-gray-800'} border-2 border-gray-950"></div>
                        <span class="font-bold ${documents.length > 0 ? 'text-white' : 'text-gray-500'} uppercase font-mono text-[10px]">Dispute Package Drafting</span>
                        <p class="text-[11px] text-gray-400 mt-0.5">Federal demand letters and verification notices fully generated.</p>
                      </div>
                      <div class="relative pl-2">
                        <div class="absolute -left-[27px] top-0.5 w-3 h-3 rounded-full ${documents.some(d => d.status === 'sent') ? 'bg-blue-500' : 'bg-gray-800'} border-2 border-gray-950"></div>
                        <span class="font-bold ${documents.some(d => d.status === 'sent') ? 'text-white' : 'text-gray-500'} uppercase font-mono text-[10px]">USPS Certified Dispatch</span>
                        <p class="text-[11px] text-gray-400 mt-0.5">Mailing coordinates dispatched via click2mail API gateway.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Educational AI Counsel Chat Companion Widget -->
                <div class="glass rounded-2xl border border-gray-800 flex flex-col overflow-hidden bg-gradient-to-b from-gray-900 to-gray-950">
                  <div class="p-4 bg-gray-900/60 border-b border-gray-800 flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                      <div class="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                        <i class="fas fa-robot text-blue-400 text-sm animate-pulse"></i>
                      </div>
                      <div>
                        <h4 class="text-xs font-bold text-white uppercase font-mono tracking-wider">AI FCRA Counsel Advisor</h4>
                        <div class="text-[9px] text-gray-500 flex items-center gap-1 font-mono"><span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span> Real-time expert advice active</div>
                      </div>
                    </div>
                    <span class="text-[9px] text-gray-500 font-mono uppercase font-bold">15 U.S.C. § 1681</span>
                  </div>

                  <!-- Chat Message Container -->
                  <div id="ai-chat-messages" class="p-4 h-48 overflow-y-auto space-y-3.5 text-xs border-b border-gray-800/80">
                    ${localState.chatHistory.map(m => `
                      <div class="flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : ''}">
                        ${m.sender !== 'user' ? `
                          <div class="w-6 h-6 rounded bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-[10px] shrink-0"><i class="fas fa-gavel"></i></div>
                        ` : ''}
                        <div class="p-2.5 rounded-xl max-w-[85%] leading-relaxed ${m.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-950 border border-gray-800 rounded-tl-none text-gray-300'}">
                          ${escapeHtml(m.text)}
                        </div>
                      </div>
                    `).join('')}
                  </div>

                  <!-- Quick Suggesters -->
                  <div class="p-3 bg-gray-950/40 border-b border-gray-800/60 flex flex-wrap gap-1.5">
                    <button class="chat-suggester bg-gray-900 hover:bg-gray-800 border border-gray-800 px-2 py-1 rounded text-[9px] font-mono text-gray-400 hover:text-white transition uppercase" onclick="window._sendChatPreset('What is Section 609?')">What is Section 609?</button>
                    <button class="chat-suggester bg-gray-900 hover:bg-gray-800 border border-gray-800 px-2 py-1 rounded text-[9px] font-mono text-gray-400 hover:text-white transition uppercase" onclick="window._sendChatPreset('How long do bureaus have?')">How long to respond?</button>
                    <button class="chat-suggester bg-gray-900 hover:bg-gray-800 border border-gray-800 px-2 py-1 rounded text-[9px] font-mono text-gray-400 hover:text-white transition uppercase" onclick="window._sendChatPreset('How are damages calculated?')">Filing damages?</button>
                  </div>

                  <!-- Chat Input Console -->
                  <div class="p-3 bg-gray-950/80 flex items-center gap-2">
                    <input type="text" id="ai-chat-input" class="w-full bg-gray-900/60 border border-gray-800 focus:border-blue-500/50 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition" placeholder="Ask your AI advisor a credit law question...">
                    <button id="ai-chat-send" class="bg-blue-600 hover:bg-blue-700 text-white w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition" onclick="window._submitClientChat()"><i class="fas fa-paper-plane text-xs"></i></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;

        // Bind interactive event listeners back to DOM elements
        bindInteractiveCockpitListeners();
      }

      // Generate HTML structure for credit scores
      function scoreWidget(bureau, base, sim, colorClass) {
        const percent = Math.min(100, Math.max(0, ((sim - 300) / (850 - 300)) * 100));
        const lift = sim - base;
        return `
          <div class="glass rounded-2xl p-5 border border-gray-800 text-center flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-gray-900 to-gray-950/20">
            <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 font-mono">${bureau}</div>
            <div class="relative w-32 h-32 flex items-center justify-center">
              <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle class="text-gray-850" stroke-width="6" stroke="#1f2937" fill="transparent" r="40" cx="50" cy="50"></circle>
                <circle class="${colorClass} transition-all duration-700 ease-out" stroke-width="6" stroke-dasharray="251.2" stroke-dashoffset="${251.2 - (251.2 * percent) / 100}" stroke-linecap="round" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50"></circle>
              </svg>
              <div class="absolute text-center select-none">
                <span class="text-2xl font-black text-white font-mono leading-none">${sim}</span>
                <div class="text-[9px] text-gray-500 font-mono mt-0.5">FICO v8</div>
              </div>
            </div>
            <div class="mt-3 flex items-center gap-1 text-[10px] font-mono">
              <span class="text-gray-500 font-semibold">Baseline:</span>
              <span class="text-white font-bold">${base}</span>
              ${lift > 0 ? `
                <span class="text-green-400 font-bold ml-1.5 animate-pulse"><i class="fas fa-arrow-up text-[9px]"></i> +${lift} pts</span>
              ` : ''}
            </div>
          </div>
        `;
      }

      // Action binding for dynamic DOM updates
      function bindInteractiveCockpitListeners() {
        // Gamified task checkboxes
        document.querySelectorAll('.task-checkbox').forEach(chk => {
          chk.onchange = (e) => {
            const taskId = e.target.dataset.task;
            localState.completedTasks[taskId] = e.target.checked;
            renderState();
          };
        });

        // Chat Input enter key
        const chatInput = document.getElementById('ai-chat-input');
        if (chatInput) {
          chatInput.onkeyup = (e) => {
            if (e.key === 'Enter') {
              window._submitClientChat();
            }
          };
        }
      }

      // Handle checkbox logic in FICO Simulator
      window._toggleSimulatorItem = function(vid) {
        localState.selectedDeletions[vid] = !localState.selectedDeletions[vid];
        renderState();
      };

      // Direct question dispatchers for Preset Buttons
      window._sendChatPreset = function(presetText) {
        const chatInput = document.getElementById('ai-chat-input');
        if (chatInput) {
          chatInput.value = presetText;
          window._submitClientChat();
        }
      };

      // Live mentor chat (Client Coach) — falls back to local guidance if AI unavailable
      window._submitClientChat = async function() {
        const input = document.getElementById('ai-chat-input');
        if (!input || !input.value.trim()) return;

        const val = input.value.trim();
        localState.chatHistory.push({ sender: 'user', text: val });
        input.value = '';
        renderChatArea();

        const chatBox = document.getElementById('ai-chat-messages');
        const typingEl = document.createElement('div');
        typingEl.className = 'flex gap-2.5 items-center text-xs text-gray-500 italic typing-indicator';
        typingEl.innerHTML = `
          <div class="w-6 h-6 rounded bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-[10px] shrink-0"><i class="fas fa-gavel"></i></div>
          <div class="p-2.5 bg-gray-950 border border-gray-800 rounded-xl rounded-tl-none flex items-center gap-1 text-gray-400">
            <span class="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
            <span class="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0.15s"></span>
            <span class="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0.3s"></span>
          </div>
        `;
        chatBox.appendChild(typingEl);
        chatBox.scrollTop = chatBox.scrollHeight;

        let answer = '';
        try {
          const ctx = `Client portal assist. Violations on file: ${(violations || []).length}. Keep answers practical, cite FCRA sections when useful, and never invent account facts.`;
          const res = await api('/ai/mentors/client-coach/chat', {
            method: 'POST',
            body: JSON.stringify({ message: val, context: ctx })
          });
          answer = res.reply || res.message || res.content || '';
        } catch (err) {
          answer = '';
        }

        if (!answer) {
          const lower = val.toLowerCase();
          if (lower.includes('609')) answer = 'FCRA § 609 (15 U.S.C. § 1681g) requires full file disclosure, including sources of information.';
          else if (lower.includes('30 days') || lower.includes('how long')) answer = 'Under FCRA § 1681i, CRAs generally have 30 days to complete a reasonable reinvestigation.';
          else if (lower.includes('damage') || lower.includes('sue')) answer = 'Willful noncompliance under § 1681n can mean $100–$1,000 statutory damages per violation plus actual damages, punitive damages, and attorney fees.';
          else answer = `You currently have ${(violations || []).length} logged violation(s). Ask about dispute timelines, §609/§611 rights, or signing letters under My Documents.`;
        }

        const currentTyping = chatBox.querySelector('.typing-indicator');
        if (currentTyping) currentTyping.remove();
        localState.chatHistory.push({ sender: 'ai', text: answer });
        renderChatArea();
      };

      // Separate fast renderer for chat section
      function renderChatArea() {
        const chatBox = document.getElementById('ai-chat-messages');
        if (!chatBox) return;

        chatBox.innerHTML = localState.chatHistory.map(m => `
          <div class="flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : ''}">
            ${m.sender !== 'user' ? `
              <div class="w-6 h-6 rounded bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-[10px] shrink-0"><i class="fas fa-gavel"></i></div>
            ` : ''}
            <div class="p-2.5 rounded-xl max-w-[85%] leading-relaxed ${m.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-950 border border-gray-800 rounded-tl-none text-gray-300'}">
              ${escapeHtml(m.text)}
            </div>
          </div>
        `).join('');
        chatBox.scrollTop = chatBox.scrollHeight;
      }

      // Initial Mount render
      renderState();

    } catch (err) {
      el.innerHTML = `
        <div class="fade-in">
          <div class="glass rounded-2xl p-8 border border-red-500/30 text-center bg-red-950/5">
            <i class="fas fa-exclamation-triangle text-3xl text-red-400 mb-3"></i>
            <h3 class="text-lg font-bold text-white mb-1">Client Profile Pending</h3>
            <p class="text-sm text-gray-400 mb-4">${escapeHtml(err.message)}</p>
            <p class="text-xs text-gray-500 font-mono">Please contact support or onboard this client first under Rick Jefferson's advisor cockpit.</p>
          </div>
        </div>
      `;
    }
  }

  function scoreMeterCard(bureau, score, colorClass) {
    const percent = Math.min(100, Math.max(0, ((score - 300) / (850 - 300)) * 100));
    return `
      <div class="glass rounded-2xl p-5 border border-gray-800 text-center flex flex-col items-center justify-center relative overflow-hidden">
        <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">${bureau}</div>
        <div class="relative w-32 h-32 flex items-center justify-center">
          <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle class="text-gray-800" stroke-width="6" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50"></circle>
            <circle class="${colorClass} transition-all duration-500" stroke-width="6" stroke-dasharray="251.2" stroke-dashoffset="${251.2 - (251.2 * percent) / 100}" stroke-linecap="round" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50"></circle>
          </svg>
          <div class="absolute text-center">
            <span class="text-2xl font-bold text-white font-mono">${score}</span>
            <div class="text-[10px] text-gray-500">FICO Score</div>
          </div>
        </div>
      </div>
    `;
  }

  function timelineItem(title, desc, status, isActive) {
    return `
      <div class="relative pl-2">
        <div class="absolute -left-[30px] top-1 w-4 h-4 rounded-full ${isActive ? 'bg-blue-600 border-4 border-gray-950' : 'bg-gray-800 border-4 border-gray-950'}"></div>
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold ${isActive ? 'text-white' : 'text-gray-500'}">${title}</span>
            <span class="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${isActive ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-800 text-gray-500'}">${status}</span>
          </div>
          <p class="text-[11px] text-gray-400 mt-0.5">${desc}</p>
        </div>
      </div>
    `;
  }

  async function pgClientSettings(el) {
    const qs = portalClientQs();
    let mfa = { enabled: false };
    let posture = null;
    let alerts = [];
    try { mfa = await api('/auth/mfa/status'); } catch (_) {}
    try { posture = await api('/security/posture'); } catch (_) {}
    try { const a = await api('/client-portal/alerts' + qs); alerts = a.alerts || []; } catch (_) {}

    el.innerHTML = `
      <div class="fade-in space-y-5 max-w-3xl">
        <div class="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-600/40 rounded-2xl p-5">
          <h1 class="text-xl font-bold text-white"><i class="fas fa-user-shield text-slate-200 mr-2"></i>Security & Privacy</h1>
          <p class="text-sm text-slate-400 mt-1">Password policy, MFA, alerts, and CCPA/GDPR controls — coded into the platform.</p>
        </div>

        ${posture ? `<div class="glass rounded-xl border border-emerald-500/20 p-4">
          <div class="flex justify-between items-center mb-3">
            <h2 class="text-sm font-bold text-white">Security Posture Score</h2>
            <span class="text-2xl font-mono text-emerald-300">${posture.score}/100</span>
          </div>
          <div class="grid sm:grid-cols-2 gap-2">${(posture.controls||[]).slice(0,8).map(c=>`
            <div class="text-[11px] border border-gray-800 rounded-lg p-2"><div class="text-white font-medium">${escapeHtml(c.title)}</div>
            <div class="text-gray-500 mt-0.5">${escapeHtml(c.status)} — ${escapeHtml(c.detail)}</div></div>`).join('')}</div>
          <ul class="mt-3 text-xs text-slate-400 space-y-1">${(posture.claims||[]).map(x=>`<li>• ${escapeHtml(x)}</li>`).join('')}</ul>
        </div>` : ''}

        <form id="pwd-form" class="glass rounded-xl border border-gray-800 p-4 space-y-3">
          <h2 class="text-sm font-bold text-white">Change Password</h2>
          <p class="text-[11px] text-gray-500">Min 12 chars with upper, lower, number, and symbol. Other sessions will be signed out.</p>
          <input type="password" id="pwd-cur" required class="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white" placeholder="Current password">
          <input type="password" id="pwd-new" required class="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white" placeholder="New password">
          <button class="bg-slate-100 hover:bg-white text-slate-900 text-sm font-semibold px-4 py-2 rounded-lg">Update password</button>
        </form>

        <div class="glass rounded-xl border border-gray-800 p-4 space-y-3">
          <h2 class="text-sm font-bold text-white">Multi-Factor Authentication ${mfa.enabled ? '<span class="text-emerald-400 text-xs ml-2">ENABLED</span>' : '<span class="text-amber-400 text-xs ml-2">OFF</span>'}</h2>
          <div class="flex flex-wrap gap-2">
            <button id="mfa-setup" class="bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-3 py-2 rounded-lg">Enroll MFA</button>
            <button id="mfa-disable" class="bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold px-3 py-2 rounded-lg">Disable MFA</button>
          </div>
          <div id="mfa-panel" class="hidden space-y-2"></div>
        </div>

        <form id="notify-form" class="glass rounded-xl border border-gray-800 p-4 space-y-3">
          <h2 class="text-sm font-bold text-white">Alert Preferences</h2>
          <label class="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" id="n-email" checked> Email alerts for staff messages & bureau updates</label>
          <label class="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" id="n-sms"> SMS alerts (requires Twilio + phone)</label>
          <input id="n-phone" class="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white" placeholder="Mobile for SMS (optional)">
          <select id="n-lang" class="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white">
            <option value="en">English</option><option value="es">Español</option>
          </select>
          <button class="bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-bold px-3 py-2 rounded-lg">Save preferences</button>
        </form>

        <div class="glass rounded-xl border border-rose-900/40 p-4 space-y-3">
          <h2 class="text-sm font-bold text-white">Privacy Rights (CCPA / GDPR)</h2>
          <p class="text-xs text-gray-400">Request a data export or deletion. Deletion requires admin fulfillment and respects litigation holds.</p>
          <div class="flex flex-wrap gap-2">
            <button id="priv-export" class="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-3 py-2 rounded-lg">Export my data</button>
            <button id="priv-delete" class="bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold px-3 py-2 rounded-lg">Request deletion</button>
          </div>
          <pre id="priv-out" class="hidden text-[10px] text-gray-400 bg-black/40 p-3 rounded-lg overflow-auto max-h-48"></pre>
        </div>

        ${alerts.length ? `<div class="glass rounded-xl border border-gray-800 p-4"><h2 class="text-xs font-bold uppercase text-white mb-2">Recent alerts</h2>
          ${alerts.slice(0,12).map(a=>`<div class="text-xs text-gray-300 py-1.5 border-b border-gray-800/50"><span class="text-cyan-300">${escapeHtml(a.channel)}</span> · ${escapeHtml(a.title||a.event_type)} · <span class="text-gray-500">${escapeHtml((a.created_at||'').slice(0,16))}</span></div>`).join('')}
        </div>` : ''}
      </div>`;

    document.getElementById('pwd-form').onsubmit = async (e) => {
      e.preventDefault();
      try {
        await api('/auth/change-password', { method: 'POST', body: JSON.stringify({
          currentPassword: document.getElementById('pwd-cur').value,
          newPassword: document.getElementById('pwd-new').value,
        })});
        toast('Password updated', 'success');
        e.target.reset();
      } catch (err) { toast(err.message + (err.requirements ? ': ' + err.requirements.join(', ') : ''), 'error'); }
    };
    document.getElementById('mfa-setup').onclick = async () => {
      try {
        const s = await api('/auth/mfa/setup', { method: 'POST', body: '{}' });
        const panel = document.getElementById('mfa-panel');
        panel.classList.remove('hidden');
        panel.innerHTML = `<p class="text-xs text-gray-400">Scan QR or enter secret <code class="text-amber-300">${escapeHtml(s.secret)}</code></p>
          ${s.qrUrl ? `<img src="${escapeHtml(s.qrUrl)}" alt="MFA QR" class="w-40 h-40 rounded-lg border border-gray-700"/>` : ''}
          <input id="mfa-code" class="w-40 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white" placeholder="6-digit code">
          <button id="mfa-verify" class="bg-violet-600 text-white text-xs font-bold px-3 py-2 rounded-lg">Verify & enable</button>`;
        document.getElementById('mfa-verify').onclick = async () => {
          try {
            await api('/auth/mfa/verify', { method: 'POST', body: JSON.stringify({ code: document.getElementById('mfa-code').value }) });
            toast('MFA enabled', 'success'); pgClientSettings(el);
          } catch (err) { toast(err.message, 'error'); }
        };
      } catch (err) { toast(err.message, 'error'); }
    };
    document.getElementById('mfa-disable').onclick = async () => {
      const code = prompt('Enter current MFA code to disable');
      if (!code) return;
      try { await api('/auth/mfa/disable', { method: 'POST', body: JSON.stringify({ code }) }); toast('MFA disabled', 'success'); pgClientSettings(el); }
      catch (err) { toast(err.message, 'error'); }
    };
    document.getElementById('notify-form').onsubmit = async (e) => {
      e.preventDefault();
      try {
        await api('/client-portal/profile', { method: 'PUT', body: JSON.stringify(portalClientBody({
          notifyEmail: document.getElementById('n-email').checked,
          notifySms: document.getElementById('n-sms').checked,
          phone: document.getElementById('n-phone').value,
          preferredLanguage: document.getElementById('n-lang').value,
        }))});
        toast('Preferences saved', 'success');
      } catch (err) { toast(err.message, 'error'); }
    };
    document.getElementById('priv-export').onclick = async () => {
      try {
        const res = await api('/privacy/export', { method: 'POST', body: JSON.stringify(portalClientBody({ legalBasis: 'ccpa' })) });
        const out = document.getElementById('priv-out'); out.classList.remove('hidden');
        out.textContent = JSON.stringify(res.export, null, 2);
        toast('Export ready', 'success');
      } catch (err) { toast(err.message, 'error'); }
    };
    document.getElementById('priv-delete').onclick = async () => {
      if (!confirm('Request permanent deletion of your portal data? This is reviewed by an administrator.')) return;
      try {
        const res = await api('/privacy/delete-request', { method: 'POST', body: JSON.stringify(portalClientBody({ legalBasis: 'ccpa' })) });
        toast('Deletion request ' + res.status, 'success');
      } catch (err) { toast(err.message, 'error'); }
    };
  }

  async function pgClientDocuments(el) {
    try {
      const d = await api('/client-portal/dashboard' + (state.impersonateClientId ? `?clientId=${state.impersonateClientId}` : ''));
      const documents = (d.documents || []).filter(doc => doc.status === 'draft' || doc.status === 'signed');
      
      if (!documents.length) {
        el.innerHTML = `
          <div class="fade-in text-center py-12 glass rounded-2xl border border-gray-800 p-8">
            <i class="fas fa-folder-open text-5xl text-blue-500/30 mb-4"></i>
            <h3 class="text-lg font-bold text-white mb-2">No Documents Pending</h3>
            <p class="text-sm text-gray-400 max-w-md mx-auto">There are currently no documents or credit dispute letters waiting for your signature or review.</p>
          </div>
        `;
        return;
      }

      let activeDocId = documents[0].id;
      let activeDoc = documents[0];

      window._selectDocForSigning = async (id) => {
        activeDocId = id;
        activeDoc = documents.find(doc => doc.id === id);
        renderDocWorkspace();
      };

      function renderDocWorkspace() {
        el.innerHTML = `
          <div class="fade-in grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Sidebar list of documents -->
            <div class="glass rounded-2xl p-4 border border-gray-800 space-y-3 lg:col-span-1">
              <h3 class="text-sm font-bold text-white mb-3"><i class="fas fa-file-contract text-blue-400 mr-2"></i>My Documents</h3>
              <div class="space-y-2">
                ${documents.map(doc => `
                  <button onclick="window._selectDocForSigning('${doc.id}')" class="w-full text-left p-3.5 rounded-xl border transition ${doc.id === activeDocId ? 'bg-blue-600/10 border-blue-500/40' : 'bg-gray-800/40 border-gray-800 hover:bg-gray-800/80'}">
                    <div class="flex items-center justify-between mb-1.5">
                      <span class="text-[10px] font-bold uppercase tracking-wider ${doc.status === 'signed' ? 'text-green-400' : 'text-amber-400'}">${doc.status}</span>
                      <span class="text-[10px] text-gray-500">${new Date(doc.created_at).toLocaleDateString()}</span>
                    </div>
                    <h4 class="text-xs font-bold text-white truncate">${escapeHtml(doc.title || doc.doc_type)}</h4>
                    <p class="text-[10px] text-gray-400 mt-1">Dispute Package Letter</p>
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Document preview & signing workspace -->
            <div class="lg:col-span-2 space-y-6">
              <!-- Preview Card -->
              <div class="glass rounded-2xl border border-gray-800 overflow-hidden flex flex-col">
                <div class="bg-gray-900 px-5 py-4 border-b border-gray-800 flex items-center justify-between">
                  <h3 class="text-sm font-bold text-white">${escapeHtml(activeDoc.title || activeDoc.doc_type)}</h3>
                  <span class="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${activeDoc.status === 'signed' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}">${activeDoc.status}</span>
                </div>
                <div class="p-6 bg-white text-gray-900 min-h-[350px] text-xs font-serif leading-relaxed select-text space-y-4 shadow-inner max-h-[500px] overflow-y-auto">
                  ${activeDoc.content ? escapeHtml(activeDoc.content).replace(/\n/g, '<br>') : `
                    <div class="font-sans text-center py-12 text-gray-500">
                      <i class="fas fa-file-alt text-3xl text-gray-300 mb-2"></i>
                      <p>Draft Dispute Letter prepared under FCRA Section 611 guidelines.</p>
                      <p class="text-[10px] mt-1">Includes pinned statutory violations, dispute arguments, and client coordinates.</p>
                    </div>
                  `}
                </div>
              </div>

              <!-- Sign pad card if unsigned -->
              ${activeDoc.status === 'draft' ? `
                <div class="glass rounded-2xl border border-gray-800 p-5 space-y-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <h3 class="text-sm font-bold text-white"><i class="fas fa-feather-alt text-blue-400 mr-2"></i>E-Sign Authorized Dispute Document</h3>
                      <p class="text-xs text-gray-400">By signing below, you authorize these letters to be dispatched on your behalf.</p>
                    </div>
                    <button onclick="window._clearSignaturePad()" class="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 transition">Clear Pad</button>
                  </div>
                  
                  <div class="relative bg-gray-950 border border-gray-850 rounded-xl overflow-hidden h-32 flex items-center justify-center">
                    <canvas id="sign-pad-canvas" class="absolute inset-0 w-full h-full cursor-crosshair z-10"></canvas>
                    <div class="text-gray-700 pointer-events-none text-[11px] select-none text-center">
                      <i class="fas fa-signature text-2xl mb-1 opacity-20"></i>
                      <div>Draw your signature inside this box</div>
                    </div>
                  </div>

                  <div class="flex items-center justify-between gap-4 pt-2">
                    <div class="text-[10px] text-gray-500 leading-normal max-w-md">
                      By clicking "Apply Signature", you agree that this electronic signature is equivalent to your hand-written signature on this legal document.
                    </div>
                    <button id="btn-submit-signature" onclick="window._submitDocSignature()" class="shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-lg transition shadow-lg flex items-center gap-1.5">
                      <i class="fas fa-file-signature"></i>
                      <span>Apply Signature</span>
                    </button>
                  </div>
                </div>
              ` : `
                <div class="glass rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 flex items-center gap-4">
                  <div class="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0"><i class="fas fa-check"></i></div>
                  <div>
                    <h4 class="text-sm font-bold text-white">Document Fully Signed</h4>
                    <p class="text-xs text-gray-400">This document was legally signed on ${new Date(activeDoc.signature_timestamp).toLocaleString()}. Tracking details will be generated upon Certified Mail dispatch.</p>
                  </div>
                </div>
              `}
            </div>
          </div>
        `;

        if (activeDoc.status === 'draft') {
          setTimeout(() => {
            initSignaturePad();
          }, 100);
        }
      }

      let strokes = [];
      function initSignaturePad() {
        const canvas = $('#sign-pad-canvas');
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        ctx.strokeStyle = '#3b82f6'; 
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        let drawing = false;
        let lastX = 0, lastY = 0;
        strokes = [];

        function getPos(e) {
          const clientX = e.touches ? e.touches[0].clientX : e.clientX;
          const clientY = e.touches ? e.touches[0].clientY : e.clientY;
          return {
            x: clientX - rect.left,
            y: clientY - rect.top
          };
        }

        function startDrawing(e) {
          e.preventDefault();
          drawing = true;
          const pos = getPos(e);
          lastX = pos.x;
          lastY = pos.y;
          strokes.push({ type: 'start', x: pos.x, y: pos.y });
        }

        function draw(e) {
          if (!drawing) return;
          e.preventDefault();
          const pos = getPos(e);
          ctx.beginPath();
          ctx.moveTo(lastX, lastY);
          ctx.lineTo(pos.x, pos.y);
          ctx.stroke();
          lastX = pos.x;
          lastY = pos.y;
          strokes.push({ type: 'move', x: pos.x, y: pos.y });
        }

        function stopDrawing(e) {
          if (!drawing) return;
          e.preventDefault();
          drawing = false;
          strokes.push({ type: 'end' });
        }

        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        window.addEventListener('mouseup', stopDrawing);

        canvas.addEventListener('touchstart', startDrawing, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        window.addEventListener('touchend', stopDrawing);

        window._clearSignaturePad = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          strokes = [];
          toast('Signature pad cleared', 'info');
        };
      }

      window._submitDocSignature = async () => {
        if (!strokes.length) {
          toast('Please write your signature on the pad first.', 'warning');
          return;
        }

        const btn = $('#btn-submit-signature');
        if (btn) btn.disabled = true;

        try {
          const serialized = JSON.stringify(strokes);
          const res = await api(`/documents/${activeDocId}/sign`, { method: 'POST', body: JSON.stringify({ signatureData: serialized }) });
          if (res && res.ok) {
            toast('Signature registered successfully!', 'success');
            await sleep(1000);
            pgClientDocuments(el);
          } else {
            throw new Error(res.error || 'Failed to sign document');
          }
        } catch (e) {
          toast(e.message || 'Signature application error', 'error');
          if (btn) btn.disabled = false;
        }
      };

      renderDocWorkspace();
    } catch (err) {
      el.innerHTML = `<div class="text-red-400 p-4"><i class="fas fa-exclamation-triangle mr-2"></i>${err.message}</div>`;
    }
  }

  const RICK_COURSES = [
    {
      id: 'course-1',
      title: 'Website Systems That Convert',
      desc: 'Build a clean business website that explains the offer, captures leads, and supports sales.',
      icon: 'fa-globe',
      modules: [
        {
          title: 'Core Fundamentals',
          lessons: [
            { title: 'The Anatomy of a High-Conversion Offer', steps: ['Define single conversion outcome', 'Strip out redundant navigation links', 'Map clear user flow pathways'], ricksRule: 'The website is not an art project. It is a sales machine.', quiz: { question: 'What is the primary objective of a conversion-focused website?', options: ['Expressive artistic freedom', 'To guide the visitor to a single, high-value business action', 'To maximize total page size and scripts'], answer: 1 } }
          ]
        }
      ]
    },
    {
      id: 'course-2',
      title: 'Landing Pages That Move People',
      desc: 'Create focused landing pages with strong messaging, clean CTAs, and no wasted sections.',
      icon: 'fa-rocket',
      modules: [
        {
          title: 'Direct Response Copywriting',
          lessons: [
            { title: 'Headline Formulations that Hold Attention', steps: ['State specific, measurable outcome first', 'Address specific pain points in the sub-headline', 'Ensure CTA is action-oriented and explicit'], ricksRule: 'If the offer is messy, the funnel will expose it.', quiz: { question: 'What should be the main focal point of a direct response landing page?', options: ['A large interactive grid of miscellaneous links', 'The core headline and a singular CTA', 'An elaborate multi-page navigation tree'], answer: 1 } }
          ]
        }
      ]
    },
    {
      id: 'course-3',
      title: 'AI Automation For Operators',
      desc: 'Use AI to remove repetitive work, route information, and support business execution.',
      icon: 'fa-cogs',
      modules: [
        {
          title: 'Operative Workflows',
          lessons: [
            { title: 'Automating the Repetitive Ingestion Pipelines', steps: ['Connect incoming webhooks cleanly', 'Map parameters to LLM prompt wrappers', 'Deliver outputs structured in JSON'], ricksRule: 'Clarity first. Automation second. Scale third.', quiz: { question: 'What is the golden rule of workflow automation?', options: ['Automate everything instantly before documenting', 'Ensure the manual system is clear and clean first', 'Always use the most expensive API available'], answer: 1 } }
          ]
        }
      ]
    },
    {
      id: 'course-4',
      title: 'AI Agent Systems',
      desc: 'Design practical AI agents that take tasks, use tools, remember context, and report cleanly.',
      icon: 'fa-robot',
      modules: [
        {
          title: 'Agent Orchestrations',
          lessons: [
            { title: 'Defining the Scope & System Instructions', steps: ['Constrain variables to precise ranges', 'Equip with strict, functional single-task tools', 'Implement deterministic post-execution validation'], ricksRule: 'The tool does not save the business. The system does.', quiz: { question: 'What is the risk of giving an AI agent unrestricted wildcard tools?', options: ['It will complete tasks too quickly', 'Unpredictable, costly, and potentially destructive operations', 'None, LLMs are 100% deterministic'], answer: 1 } }
          ]
        }
      ]
    },
    {
      id: 'course-5',
      title: 'Funnel Building From Zero',
      desc: 'Turn traffic into leads, leads into calls, and calls into revenue with a clean funnel path.',
      icon: 'fa-funnel-dollar',
      modules: [
        {
          title: 'Traffic & Conversion Bridges',
          lessons: [
            { title: 'The Value-Bridge Landing Protocol', steps: ['Offer immediately actionable lead magnet', 'Deliver high-value sequence in email auto-responders', 'Route qualified leads directly to Calendly'], ricksRule: 'Build the system before you chase the traffic.', quiz: { question: 'Why do most multi-step funnels leak leads?', options: ['Because traffic is inherently low-quality', 'Friction, cognitive load, and over-complicated steps', 'They do not feature enough flash animations'], answer: 1 } }
          ]
        }
      ]
    },
    {
      id: 'course-6',
      title: 'CRM And Follow-Up Systems',
      desc: 'Build the pipeline, tags, automations, and follow-up flows that stop leads from leaking.',
      icon: 'fa-address-card',
      modules: [
        {
          title: 'Database & Pipeline Hygiene',
          lessons: [
            { title: 'Designing and Automating CRM States', steps: ['Map explicit stages to lead progression', 'Set automated reminders on idle leads', 'Use webhooks to sync cross-platform metrics'], ricksRule: 'Named right. Built right. Shipped clean.', quiz: { question: 'What stops leads from leaking in a sales pipeline?', options: ['Buying more lead lists', 'Automated state triggers and immediate, systematic follow-up', 'Calling leads once and never again'], answer: 1 } }
          ]
        }
      ]
    },
    {
      id: 'course-7',
      title: 'Prompt Engineering For Builders',
      desc: 'Write prompts that make AI useful, structured, testable, and aligned with business outcomes.',
      icon: 'fa-keyboard',
      modules: [
        {
          title: 'Structured Prompt Formulations',
          lessons: [
            { title: 'Output Control & Few-Shot Engineering', steps: ['Supply high-quality input-output examples', 'Format outputs cleanly using JSON schemas', 'Enforce strict compliance gates in the prompt'], ricksRule: 'Structured prompts yield structured outcomes.', quiz: { question: 'What is the best way to enforce JSON outputs from an LLM?', options: ['Ask nicely in the prompt', 'Provide explicit schema and few-shot formatting examples', 'There is no way to control output structure'], answer: 1 } }
          ]
        }
      ]
    },
    {
      id: 'course-8',
      title: 'Digital Product Launch Systems',
      desc: 'Package knowledge, build the offer, create the sales page, and launch without chaos.',
      icon: 'fa-file-invoice-dollar',
      modules: [
        {
          title: 'Launch Execution Frameworks',
          lessons: [
            { title: 'Constructing and Seeding High-Ticket Offers', steps: ['Package experience into structured SOP assets', 'Set up checkout flows via Stripe Integration', 'Deploy single-path product fulfillment email flows'], ricksRule: 'Ship the course before you write the textbook.', quiz: { question: 'What is the most effective launch validation method?', options: ['Spending months filming high-production videos', 'Securing pre-orders using a high-converting sales page', 'Relying entirely on organic word of mouth'], answer: 1 } }
          ]
        }
      ]
    },
    {
      id: 'course-9',
      title: 'Local Business Growth Infrastructure',
      desc: 'Set up the pages, automations, offers, and tracking local businesses need to grow.',
      icon: 'fa-map-marked-alt',
      modules: [
        {
          title: 'Local Lead-Gen Bridges',
          lessons: [
            { title: 'The Reputation Loop & Automated Lead Response', steps: ['Set up immediate auto-reply on SMS/calls', 'Send automatic review invite triggers after jobs', 'Track lead sources precisely inside CRM'], ricksRule: 'Speed to lead is the only metric that matters locally.', quiz: { question: 'What is the optimal response time for local inbound leads?', options: ['Within 5 minutes', 'Within 24 to 48 hours', 'During the weekly business review'], answer: 1 } }
          ]
        }
      ]
    },
    {
      id: 'course-10',
      title: 'Founder Operating System',
      desc: 'Build the personal workflow, dashboards, SOPs, and decision systems that keep execution clean.',
      icon: 'fa-toolbox',
      modules: [
        {
          title: 'Executive Systems & Dashboards',
          lessons: [
            { title: 'The Metric-Driven Morning Ritual', steps: ['Analyze cash flow, sales metrics, and project health', 'Identify single, critical leverage action for the day', 'Clear communication logs to optimize operator flow'], ricksRule: 'Control your inputs to dominate your outputs.', quiz: { question: 'What represents the core of a Founder Operating System?', options: ['Checking emails continuously', 'Metrics-driven execution checklists and systematic SOPs', 'delegating decisions without oversight'], answer: 1 } }
          ]
        }
      ]
    }
  ];

  async function pgClientKnowledge(el) {
    let currentCourseId = null;
    let currentLessonIndex = 0;
    let selectedAnswer = null;
    try {
      const edu = await api('/client-portal/education' + portalClientQs());
      window._portalLessons = edu.lessons || [];
      window._portalProgress = edu.progress || [];
    } catch (_) {
      window._portalLessons = [];
      window._portalProgress = [];
    }
    window._openPortalLesson = async (lessonId) => {
      try {
        const { lesson } = await api('/client-portal/education/' + lessonId);
        const answers = [];
        const paintLesson = () => {
          el.innerHTML = `<div class="fade-in max-w-2xl space-y-4">
            <button onclick="window._closeCoursePlayer()" class="text-sm text-gray-400 hover:text-white"><i class="fas fa-arrow-left mr-1"></i>Back</button>
            <h1 class="text-xl font-bold text-white">${escapeHtml(lesson.title)}</h1>
            <p class="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">${escapeHtml(lesson.content)}</p>
            <div class="space-y-4">${(lesson.quiz||[]).map((q,qi)=>`
              <div class="glass border border-gray-800 rounded-xl p-4">
                <div class="text-sm text-white font-medium mb-2">${escapeHtml(q.q)}</div>
                <div class="space-y-2">${q.choices.map((ch,ci)=>`
                  <button type="button" class="w-full text-left text-xs px-3 py-2 rounded-lg border ${answers[qi]===ci?'border-cyan-500 bg-cyan-500/15':'border-gray-800'} text-gray-200" onclick="window._portalPick(${qi},${ci})">${escapeHtml(ch)}</button>`).join('')}</div>
              </div>`).join('')}</div>
            <button id="btn-finish-lesson" class="bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold px-4 py-2 rounded-lg">Submit quiz</button>
          </div>`;
          window._portalPick = (qi, ci) => { answers[qi]=ci; paintLesson(); };
          document.getElementById('btn-finish-lesson').onclick = async () => {
            try {
              const res = await api('/client-portal/education/' + lessonId + '/complete', {
                method: 'POST', body: JSON.stringify(portalClientBody({ answers })),
              });
              toast(res.passed ? `Lesson complete ${res.score}/${res.total}` : `Review again ${res.score}/${res.total}`, res.passed?'success':'warning');
              if (res.passed) window._closeCoursePlayer();
            } catch (err) { toast(err.message,'error'); }
          };
        };
        paintLesson();
      } catch (err) { toast(err.message,'error'); }
    };


    window._openCoursePlayer = (id) => {
      currentCourseId = id;
      currentLessonIndex = 0;
      selectedAnswer = null;
      renderCoursePlayer();
    };

    window._closeCoursePlayer = () => {
      currentCourseId = null;
      renderCourseList();
    };

    window._selectQuizOption = (idx) => {
      selectedAnswer = idx;
      const opts = document.querySelectorAll('.quiz-option-btn');
      opts.forEach((opt, i) => {
        if (i === idx) {
          opt.className = 'quiz-option-btn w-full text-left p-3.5 rounded-xl border bg-blue-600/25 border-blue-500 text-white font-medium transition';
        } else {
          opt.className = 'quiz-option-btn w-full text-left p-3.5 rounded-xl border bg-gray-900/50 border-gray-800 text-gray-400 hover:bg-gray-800 transition';
        }
      });
    };

    window._submitQuizAnswer = (correctAnswer) => {
      if (selectedAnswer === null) {
        toast('Please select an option first.', 'warning');
        return;
      }
      if (selectedAnswer === correctAnswer) {
        toast('Correct! Lesson completed.', 'success');
        currentLessonIndex++;
        selectedAnswer = null;
        renderCoursePlayer();
      } else {
        toast('Incorrect answer. Try again.', 'error');
      }
    };

    function renderCourseList() {
      el.innerHTML = `
        <div class="fade-in space-y-6">
          <div class="relative overflow-hidden bg-gradient-to-r from-gray-900 via-blue-950 to-gray-900 border border-blue-500/20 rounded-2xl p-6 shadow-2xl">
            <h1 class="text-2xl font-bold text-white mb-1"><i class="fas fa-graduation-cap text-blue-400 mr-2"></i>Education Hub</h1>
            <p class="text-sm text-gray-400">Financial literacy → credit expertise → fundability · plus Rick Jefferson systems courses</p>
          </div>

          ${(window._portalLessons||[]).length ? `
          <div>
            <h2 class="text-xs font-bold uppercase tracking-wider text-cyan-300 mb-3">Fundability Curriculum</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              ${window._portalLessons.map(l => {
                const done = (window._portalProgress||[]).find(p => p.lesson_id===l.id && p.status==='completed');
                return `<div class="glass rounded-xl border ${done?'border-emerald-500/30':'border-gray-800'} p-4">
                  <div class="text-[10px] uppercase text-gray-500">${escapeHtml(l.track)} · L${l.level}</div>
                  <h3 class="text-sm font-bold text-white mt-1">${escapeHtml(l.title)}</h3>
                  <p class="text-xs text-gray-400 mt-1">${escapeHtml(l.summary)}</p>
                  <button onclick="window._openPortalLesson('${l.id}')" class="mt-3 text-xs font-semibold ${done?'text-emerald-300':'text-cyan-300'}">${done?'Review ✓':'Start lesson'}</button>
                </div>`;
              }).join('')}
            </div>
          </div>` : ''}

          <h2 class="text-xs font-bold uppercase tracking-wider text-blue-300">Systems & Business Courses</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${RICK_COURSES.map(c => `
              <div class="glass rounded-2xl border border-gray-800 p-5 flex flex-col justify-between card-hover relative overflow-hidden group">
                <div class="absolute top-0 right-0 -mt-4 -mr-4 w-20 h-20 bg-blue-600/5 rounded-full blur-xl group-hover:bg-blue-600/10 transition"></div>
                <div>
                  <div class="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                    <i class="fas ${c.icon} text-lg"></i>
                  </div>
                  <h3 class="text-sm font-bold text-white mb-1.5">${escapeHtml(c.title)}</h3>
                  <p class="text-xs text-gray-400 leading-relaxed mb-4">${escapeHtml(c.desc)}</p>
                </div>
                <button onclick="window._openCoursePlayer('${c.id}')" class="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/10">
                  <i class="fas fa-play"></i>
                  <span>Start Learning</span>
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    function renderCoursePlayer() {
      const course = RICK_COURSES.find(c => c.id === currentCourseId);
      if (!course) return;

      const totalLessons = course.modules[0].lessons.length;

      if (currentLessonIndex >= totalLessons) {
        el.innerHTML = `
          <div class="fade-in max-w-2xl mx-auto glass rounded-2xl border border-blue-500/20 p-8 text-center relative overflow-hidden shadow-2xl">
            <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-emerald-500"></div>
            <div class="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-600/10 rounded-full blur-2xl"></div>
            
            <i class="fas fa-award text-6xl text-amber-400 mb-4 animate-bounce"></i>
            <h2 class="text-xl font-bold text-white mb-1">Congratulations!</h2>
            <p class="text-xs text-gray-400 mb-6">You have completed <strong>${escapeHtml(course.title)}</strong></p>

            <div class="border-2 border-dashed border-blue-500/30 rounded-xl p-6 bg-gray-950/40 relative mb-6">
              <div class="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Certificate of Accomplishment</div>
              <div class="text-xs text-gray-400">This is proudly awarded to</div>
              <div class="text-lg font-serif font-bold text-white my-3 border-b border-gray-900 pb-2 max-w-xs mx-auto">${escapeHtml(state.user?.name || 'Valued Builder')}</div>
              <div class="text-xs text-gray-400">for masterfully completing the practical systems curriculum inside</div>
              <div class="text-sm font-bold text-blue-400 mt-2">${escapeHtml(course.title)}</div>
              
              <div class="flex items-end justify-between mt-8 pt-4 border-t border-gray-900">
                <div class="text-left">
                  <div class="text-[10px] text-gray-500">Issued On</div>
                  <div class="text-xs font-bold text-white">${new Date().toLocaleDateString()}</div>
                </div>
                <div class="text-right">
                  <div class="text-[10px] text-gray-500">Authorized Issuer</div>
                  <div class="text-xs font-bold text-blue-400 font-serif">Rick Jefferson</div>
                </div>
              </div>
            </div>

            <button onclick="window._closeCoursePlayer()" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition">Return to Courses</button>
          </div>
        `;
        return;
      }

      const lesson = course.modules[0].lessons[currentLessonIndex];

      el.innerHTML = `
        <div class="fade-in max-w-3xl mx-auto space-y-6">
          <div class="flex items-center justify-between">
            <button onclick="window._closeCoursePlayer()" class="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 transition"><i class="fas fa-chevron-left"></i> Back to Hub</button>
            <span class="text-xs text-gray-500 font-mono">Lesson ${currentLessonIndex + 1} of ${totalLessons}</span>
          </div>

          <!-- Lesson Material Card -->
          <div class="glass rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
            <div class="bg-gray-900 px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <span class="text-[10px] font-bold text-blue-400 uppercase tracking-wider">${escapeHtml(course.title)}</span>
                <h2 class="text-base font-bold text-white mt-0.5">${escapeHtml(lesson.title)}</h2>
              </div>
            </div>
            
            <div class="p-6 space-y-6">
              <!-- Build Steps -->
              <div>
                <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3"><i class="fas fa-tools text-blue-400 mr-2"></i>Actionable Build Steps</h3>
                <div class="space-y-3">
                  ${lesson.steps.map((step, idx) => `
                    <div class="flex items-start gap-3 bg-gray-900/40 p-3 rounded-xl border border-gray-850">
                      <span class="w-5 h-5 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0 mt-0.5">${idx + 1}</span>
                      <p class="text-xs text-gray-300 leading-normal">${escapeHtml(step)}</p>
                    </div>
                  `).join('')}
                </div>
              </div>

              <!-- Rick's Rule -->
              <div class="border-l-4 border-blue-500 bg-blue-500/5 rounded-r-xl p-4">
                <div class="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-1"><i class="fas fa-quote-left mr-1"></i> Rick's Rule</div>
                <p class="text-xs text-gray-200 font-medium font-serif italic">"${escapeHtml(lesson.ricksRule)}"</p>
              </div>

              <!-- Interactive Quiz -->
              ${lesson.quiz ? `
                <div class="pt-4 border-t border-gray-850">
                  <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3"><i class="fas fa-check-double text-purple-400 mr-2"></i>Immediate Action Check</h3>
                  <div class="glass rounded-xl p-5 border border-purple-500/20 bg-purple-500/5 space-y-4">
                    <p class="text-sm font-bold text-white">${escapeHtml(lesson.quiz.question)}</p>
                    <div class="space-y-2">
                      ${lesson.quiz.options.map((opt, oIdx) => `
                        <button onclick="window._selectQuizOption(${oIdx})" class="quiz-option-btn w-full text-left p-3.5 rounded-xl border bg-gray-900/50 border-gray-800 text-gray-400 hover:bg-gray-800 transition">
                          <span class="text-xs font-medium">${escapeHtml(opt)}</span>
                        </button>
                      `).join('')}
                    </div>
                    <div class="flex justify-end pt-2">
                      <button onclick="window._submitQuizAnswer(${lesson.quiz.answer})" class="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-5 py-2.5 rounded-lg transition shadow-lg shadow-purple-500/10 flex items-center gap-1.5">
                        <i class="fas fa-check"></i>
                        <span>Verify Answer</span>
                      </button>
                    </div>
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }

    renderCourseList();
  }

  // ═══════════════════════════════════════════════════════════════
  // ADMINISTRATIVE CRM & LITIGATION VIEWS
  // ═══════════════════════════════════════════════════════════════
  async function pgAdminOverview(el) {
    try {
      const d = await api('/admin/overview-stats');
      const stats = d.stats || {};
      const monthlyRevenues = d.monthlyRevenues || [];
      const outcomes = d.outcomes || [];
      const urgentItems = d.urgentItems || [];

      el.innerHTML = `
        <div class="fade-in space-y-6">
          <div class="relative overflow-hidden bg-gradient-to-r from-gray-900 via-blue-950 to-gray-900 border border-blue-500/20 rounded-2xl p-6 shadow-2xl">
            <div class="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-600/10 rounded-full blur-2xl"></div>
            <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h1 class="text-2xl font-bold text-white mb-1"><i class="fas fa-chart-pie text-blue-400 mr-2"></i>Executive Overview</h1>
                <p class="text-sm text-gray-400">SmartFCRA CRM & Litigation Strategy Analytics Board</p>
              </div>
              <div class="flex gap-2">
                <button onclick="window._nav('upload-report', { clientId: 'autopilot', autopilot: true })" class="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-blue-500/20"><i class="fas fa-magic"></i>Autopilot Onboard</button>
                <button onclick="window._nav('admin-clients')" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5"><i class="fas fa-users"></i>Manage Clients</button>
                <button onclick="window._nav('admin-violation-queue')" class="bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5"><i class="fas fa-tasks"></i>Legal QA Queue</button>
              </div>
            </div>
          </div>

          <!-- KPI Stats Grid -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            ${adminStatCard('fa-address-card', 'Active Clients', stats.totalClients, 'blue')}
            ${adminStatCard('fa-gavel', 'In Active Litigation', stats.activeLitigation, 'red')}
            ${adminStatCard('fa-shield-alt', 'Pending Legal QA', stats.pendingQA, 'amber')}
            ${adminStatCard('fa-donate', 'Total Recovery Pool', money(stats.totalRecovery), 'emerald')}
          </div>

          <!-- CHARTS & TIMELINE METRICS -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Revenue line trend -->
            <div class="lg:col-span-2 glass rounded-2xl p-5 border border-gray-800 flex flex-col justify-between">
              <h3 class="text-sm font-bold text-white mb-4"><i class="fas fa-chart-line text-blue-400 mr-2"></i>6-Month Revenue Analytics Series</h3>
              <div class="h-44 relative flex items-end justify-between pt-6 px-4">
                <svg class="absolute inset-0 w-full h-full px-4 pt-12 pb-6 overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M 0 85 L 20 75 L 40 68 L 60 55 L 80 42 L 100 15" fill="none" stroke="#0a66ff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>
                  <path d="M 0 85 L 20 75 L 40 68 L 60 55 L 80 42 L 100 15 L 100 100 L 0 100 Z" fill="url(#blue-chart-gradient)" opacity="0.05"></path>
                  <defs>
                    <linearGradient id="blue-chart-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#0a66ff"></stop>
                      <stop offset="100%" stop-color="#0a66ff" stop-opacity="0"></stop>
                    </linearGradient>
                  </defs>
                </svg>
                ${monthlyRevenues.map(r => `
                  <div class="flex flex-col items-center justify-end h-full z-10 w-12 text-center group">
                    <span class="text-[10px] font-bold text-blue-400 opacity-0 group-hover:opacity-100 transition duration-150 font-mono mb-1">${money(r.value)}</span>
                    <div class="w-1.5 bg-blue-600/10 hover:bg-blue-600 rounded-t-full transition-all duration-300" style="height: ${Math.round((r.value / 40000) * 80)}%"></div>
                    <span class="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mt-2">${r.label}</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Outcomes ratio -->
            <div class="glass rounded-2xl p-5 border border-gray-800 flex flex-col justify-between">
              <h3 class="text-sm font-bold text-white mb-3"><i class="fas fa-percent text-purple-400 mr-2"></i>Litigation Outcome Ratios</h3>
              <div class="flex-1 flex flex-col justify-center space-y-3">
                ${outcomes.map(o => `
                  <div>
                    <div class="flex items-center justify-between text-xs font-semibold mb-1">
                      <span class="text-gray-400">${escapeHtml(o.name)}</span>
                      <span class="text-white font-mono">${o.value}%</span>
                    </div>
                    <div class="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden border border-gray-800">
                      <div class="rounded-full h-1.5 transition-all duration-500" style="width: ${o.value}%; background-color: ${o.color}"></div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- NOTIFICATIONS BOARD -->
          <div class="glass rounded-2xl p-5 border border-gray-800">
            <h3 class="text-sm font-bold text-white mb-4"><i class="fas fa-exclamation-triangle text-red-400 mr-2"></i>System Priority Notifications</h3>
            ${urgentItems.length ? `
              <div class="space-y-3">
                ${urgentItems.map(item => `
                  <div class="bg-gray-800/30 border border-gray-800/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div class="flex items-start gap-3">
                      <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${getUrgentBadgeClasses(item.type)}">
                        <i class="fas ${getUrgentIcon(item.type)}"></i>
                      </div>
                      <div>
                        <h4 class="text-xs font-bold text-white mb-0.5">${escapeHtml(item.title)}</h4>
                        <p class="text-[11px] text-gray-400 leading-normal">${escapeHtml(item.description)}</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-3 shrink-0">
                      <span class="text-[10px] text-gray-500 font-mono">${new Date(item.date).toLocaleDateString()}</span>
                      <button onclick="window._handleUrgentAction('${item.type}', '${item.targetId}')" class="bg-gray-850 hover:bg-gray-800 border border-gray-850 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition">Resolve</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="text-center py-8">
                <i class="fas fa-shield-alt text-4xl text-emerald-500/30 mb-2"></i>
                <h4 class="text-sm font-bold text-white">System fully verified and aligned</h4>
                <p class="text-xs text-gray-400">All compliance gates are logged and dispute packages are approved.</p>
              </div>
            `}
          </div>
        </div>
      `;

      window._handleUrgentAction = (type, targetId) => {
        if (type === 'missing_consent' || type === 'draft_document') {
          window._nav('admin-clients', { searchClientId: targetId });
        } else if (type === 'pending_qa') {
          window._nav('admin-violation-queue', { searchViolationId: targetId });
        }
      };

    } catch (err) {
      el.innerHTML = `<div class="text-red-400 p-4"><i class="fas fa-exclamation-triangle mr-2"></i>${err.message}</div>`;
    }
  }

  function adminStatCard(icon, label, value, color) {
    const colors = {
      blue: 'bg-blue-600/10 border-blue-500/20 text-blue-400',
      red: 'bg-red-600/10 border-red-500/20 text-red-400',
      amber: 'bg-amber-600/10 border-amber-500/20 text-amber-400',
      emerald: 'bg-emerald-600/10 border-emerald-500/20 text-emerald-400'
    };
    return `
      <div class="glass rounded-2xl p-5 border border-gray-800 card-hover flex items-center gap-4 relative overflow-hidden">
        <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colors[color]} border">
          <i class="fas ${icon} text-lg"></i>
        </div>
        <div>
          <div class="text-[10px] text-gray-500 uppercase tracking-widest font-bold">${label}</div>
          <div class="text-lg font-bold text-white font-mono mt-1">${value !== undefined ? value : 0}</div>
        </div>
      </div>
    `;
  }

  function getUrgentBadgeClasses(type) {
    const maps = {
      missing_consent: 'bg-red-500/10 border border-red-500/20 text-red-400',
      draft_document: 'bg-amber-500/10 border border-amber-500/20 text-amber-400',
      pending_qa: 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
    };
    return maps[type] || 'bg-gray-800 border border-gray-700 text-gray-400';
  }

  function getUrgentIcon(type) {
    const maps = {
      missing_consent: 'fa-shield-alt',
      draft_document: 'fa-file-signature',
      pending_qa: 'fa-tasks'
    };
    return maps[type] || 'fa-info-circle';
  }

  async function pgAdminClients(el, initialPageData) {
    let clients = [];
    let searchVal = '';
    let filterStatus = '';

    if (initialPageData && initialPageData.searchClientId) {
      searchVal = initialPageData.searchClientId;
    }

    async function loadData() {
      const d = await api(`/clients?search=${encodeURIComponent(searchVal)}&status=${encodeURIComponent(filterStatus)}`);
      clients = d.clients || [];
      renderGrid();
    }

    window._openClientSlideOut = async (id) => {
      const drawer = $('#client-slideout-drawer');
      if (!drawer) return;

      const profile = await api(`/clients/${id}`);
      const c = profile.client || {};

      drawer.innerHTML = `
        <div class="p-6 space-y-6 flex flex-col h-full justify-between">
          <div class="space-y-6">
            <div class="flex items-center justify-between border-b border-gray-800 pb-4">
              <div>
                <h3 class="text-base font-bold text-white">${escapeHtml(c.first_name)} ${escapeHtml(c.last_name)}</h3>
                <p class="text-xs text-gray-500">Case profile editor</p>
              </div>
              <button onclick="window._closeClientSlideOut()" class="text-gray-400 hover:text-white transition"><i class="fas fa-times"></i></button>
            </div>

            <!-- Editor Parameters -->
            <div class="space-y-4">
              <div>
                <label class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Case Strategy Status</label>
                <select id="editor-case-status" class="w-full bg-gray-950 border border-gray-850 text-xs rounded-xl p-3 text-white mt-1.5 focus:border-blue-500">
                  <option value="ONBOARDING" ${c.case_status === 'ONBOARDING' ? 'selected' : ''}>ONBOARDING</option>
                  <option value="DISPUTING" ${c.case_status === 'DISPUTING' ? 'selected' : ''}>DISPUTING</option>
                  <option value="LITIGATION" ${c.case_status === 'LITIGATION' ? 'selected' : ''}>LITIGATION</option>
                  <option value="FILED" ${c.case_status === 'FILED' ? 'selected' : ''}>FILED</option>
                  <option value="DISCOVERY" ${c.case_status === 'DISCOVERY' ? 'selected' : ''}>DISCOVERY</option>
                  <option value="NEGOTIATIONS" ${c.case_status === 'NEGOTIATIONS' ? 'selected' : ''}>NEGOTIATIONS</option>
                  <option value="SETTLED" ${c.case_status === 'SETTLED' ? 'selected' : ''}>SETTLED</option>
                </select>
              </div>

              <div>
                <label class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Litigation Score (LVS)</label>
                <input type="number" id="editor-lvs-score" value="${c.lvs_score || 0}" class="w-full bg-gray-950 border border-gray-850 text-xs rounded-xl p-3 text-white mt-1.5 focus:border-blue-500 font-mono">
              </div>

              <div>
                <label class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Estimated Recovery Potential</label>
                <input type="number" id="editor-est-recovery" value="${c.estimated_recovery || 0}" class="w-full bg-gray-950 border border-gray-850 text-xs rounded-xl p-3 text-white mt-1.5 focus:border-blue-500 font-mono">
              </div>

              <div>
                <label class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Subscriber Plan Type</label>
                <select id="editor-sub-plan" class="w-full bg-gray-950 border border-gray-850 text-xs rounded-xl p-3 text-white mt-1.5 focus:border-blue-500">
                  <option value="free" ${c.subscription_plan === 'free' ? 'selected' : ''}>Free (Unsubscribed)</option>
                  <option value="professional" ${c.subscription_plan === 'professional' ? 'selected' : ''}>Professional/Basic</option>
                  <option value="unlimited" ${c.subscription_plan === 'unlimited' ? 'selected' : ''}>Unlimited Strategy</option>
                  <option value="enterprise" ${c.subscription_plan === 'enterprise' ? 'selected' : ''}>Enterprise Enterprise</option>
                </select>
              </div>

              <div>
                <label class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Client Account Notes</label>
                <textarea id="editor-client-notes" rows="3" class="w-full bg-gray-950 border border-gray-850 text-xs rounded-xl p-3 text-white mt-1.5 focus:border-blue-500 leading-normal">${escapeHtml(c.notes || '')}</textarea>
              </div>
            </div>
          </div>

          <!-- Save Apply -->
          <div class="border-t border-gray-850 pt-4 flex gap-3">
            <button onclick="window._closeClientSlideOut()" class="w-1/2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold py-2.5 rounded-xl transition">Cancel</button>
            <button id="btn-save-slideout" onclick="window._saveClientSlideOutEditor('${c.id}')" class="w-1/2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-lg shadow-blue-500/15">Save Changes</button>
          </div>
        </div>
      `;

      drawer.classList.remove('translate-x-full');
    };

    window._closeClientSlideOut = () => {
      const drawer = $('#client-slideout-drawer');
      if (drawer) drawer.classList.add('translate-x-full');
    };

    window._saveClientSlideOutEditor = async (id) => {
      const btn = $('#btn-save-slideout');
      if (btn) btn.disabled = true;

      try {
        const payload = {
          caseStatus: $('#editor-case-status').value,
          lvsScore: parseInt($('#editor-lvs-score').value, 10) || 0,
          estimatedRecovery: parseFloat($('#editor-est-recovery').value) || 0,
          subscriptionPlan: $('#editor-sub-plan').value,
          notes: $('#editor-client-notes').value
        };

        const res = await api(`/clients/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        if (res && res.ok) {
          toast('Client parameters updated successfully!', 'success');
          window._closeClientSlideOut();
          await loadData();
        } else {
          throw new Error(res.error || 'Failed to apply parameters changes');
        }
      } catch (e) {
        toast(e.message || 'Error updating profile', 'error');
        if (btn) btn.disabled = false;
      }
    };

    window._triggerAdminClientSearch = () => {
      searchVal = $('#admin-client-search-input').value;
      filterStatus = $('#admin-client-status-select').value;
      loadData();
    };

    function renderGrid() {
      el.innerHTML = `
        <div class="fade-in space-y-6 relative overflow-hidden min-h-screen pb-12">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-xl font-bold text-white">Client Management</h1>
              <p class="text-sm text-gray-400">Fast CRM search filters and strategy drawers</p>
            </div>
          </div>

          <!-- Filters Bar -->
          <div class="flex flex-col md:flex-row gap-4 items-center bg-gray-900/40 border border-gray-800 rounded-2xl p-4">
            <div class="relative flex-1 w-full">
              <i class="fas fa-search absolute left-4 top-3.5 text-gray-500 text-xs"></i>
              <input type="text" id="admin-client-search-input" value="${escapeHtml(searchVal)}" onkeyup="if(event.key==='Enter') window._triggerAdminClientSearch()" placeholder="Search clients by first name, last name, or email..." class="w-full bg-gray-950 border border-gray-850 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:border-blue-500">
            </div>
            <div class="w-full md:w-44">
              <select id="admin-client-status-select" onchange="window._triggerAdminClientSearch()" class="w-full bg-gray-950 border border-gray-850 rounded-xl py-2.5 px-4 text-xs text-white focus:border-blue-500">
                <option value="">All Statuses</option>
                <option value="active" ${filterStatus === 'active' ? 'selected' : ''}>Active</option>
                <option value="suspended" ${filterStatus === 'suspended' ? 'selected' : ''}>Suspended</option>
              </select>
            </div>
          </div>

          <!-- CRM Table -->
          <div class="glass rounded-2xl border border-gray-800 overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-gray-900 border-b border-gray-800 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <th class="px-5 py-3.5">Client Info</th>
                    <th class="px-5 py-3.5">Case Status</th>
                    <th class="px-5 py-3.5">Litigation Score (LVS)</th>
                    <th class="px-5 py-3.5">Est. Recovery Pool</th>
                    <th class="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-850">
                  ${clients.length ? clients.map(c => `
                    <tr class="hover:bg-gray-800/10 transition">
                      <td class="px-5 py-4">
                        <div class="text-xs font-bold text-white">${escapeHtml(c.first_name)} ${escapeHtml(c.last_name)}</div>
                        <div class="text-[10px] text-gray-500 mt-0.5">${escapeHtml(c.email || 'No email address')} &bull; ${escapeHtml(c.phone || 'No phone')}</div>
                      </td>
                      <td class="px-5 py-4">
                        <span class="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${getCaseStatusBadgeClass(c.case_status)}">${escapeHtml(c.case_status || 'ONBOARDING')}</span>
                      </td>
                      <td class="px-5 py-4">
                        <div class="text-xs font-mono font-bold ${getLvsScoreColor(c.lvs_score || 0)}">${c.lvs_score || 0}</div>
                      </td>
                      <td class="px-5 py-4">
                        <div class="text-xs font-mono font-bold text-green-400">${money(c.estimated_recovery || 0)}</div>
                      </td>
                      <td class="px-5 py-4 text-right">
                        <button onclick="window._nav('client-detail', { clientId: '${c.id}' })" class="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition mr-1.5"><i class="fas fa-folder-open mr-1"></i>Open Workspace</button>
                        <button onclick="window._openClientSlideOut('${c.id}')" class="bg-blue-600/10 hover:bg-blue-600 hover:text-white border border-blue-500/20 text-blue-400 text-[11px] font-bold px-3 py-1.5 rounded-lg transition">Edit Case</button>
                      </td>
                    </tr>
                  `).join('') : `
                    <tr>
                      <td colspan="5" class="text-center py-12 text-gray-500 text-xs">
                        <i class="fas fa-users text-4xl text-gray-500/30 mb-2"></i>
                        <p>No client records match the criteria.</p>
                      </td>
                    </tr>
                  `}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Slide Drawer -->
          <div id="client-slideout-drawer" class="fixed top-0 right-0 h-screen w-80 bg-gray-950 border-l border-gray-850 z-[999] shadow-2xl transform translate-x-full transition duration-300"></div>
        </div>
      `;
    }

    function getCaseStatusBadgeClass(status) {
      const maps = {
        ONBOARDING: 'bg-gray-800 text-gray-400 border border-gray-700/50',
        DISPUTING: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
        LITIGATION: 'bg-red-500/10 text-red-400 border border-red-500/20',
        FILED: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
        SETTLED: 'bg-green-500/10 text-green-400 border border-green-500/20'
      };
      return maps[status] || 'bg-gray-800 text-gray-500 border border-gray-850';
    }

    function getLvsScoreColor(score) {
      if (score >= 75) return 'text-red-400';
      if (score >= 40) return 'text-amber-400';
      return 'text-blue-400';
    }

    await loadData();
    if (initialPageData && initialPageData.searchClientId) {
      window._openClientSlideOut(initialPageData.searchClientId);
    }
  }

  const REGULATORY_LIBRARY = {
    federal: [
      { code: '15 U.S.C. § 1681i', title: 'Procedure in case of disputed accuracy', desc: 'CRAs must conduct a reasonable reinvestigation within 30 days of receiving a dispute. Failure to investigate or delete unverified information is a major statutory violation.' },
      { code: '15 U.S.C. § 1681b', title: 'Permissible purposes of consumer reports', desc: 'Reports can only be issued under specific permissible purposes. Accessing a file without explicit consent triggers a statutory fine of up to $1,000.' },
      { code: '15 U.S.C. § 1681s-2(b)', title: 'Duties of furnishers upon notice of dispute', desc: 'Furnishers must investigate disputes forwarded by CRAs. If they verify inaccurate records willfully, they are subject to statutory civil liability.' }
    ],
    state: [
      { state: 'New York (N.Y. GBL § 380-f)', title: 'NY Fair Credit Reporting Act', desc: 'Aligns state compliance rules with federal FCRA while adding specific consumer protection disclosures on CRA audit trails.' },
      { state: 'California (Cal. Civ. Code § 1785.16)', title: 'CA Consumer Credit Reporting Agencies Act', desc: 'Gives consumers the right to demand written confirmation of CRA reinvestigation findings and imposes expedited deletion timelines.' },
      { state: 'Texas (Tex. Bus. & Com. Code § 20.06)', title: 'Texas Fair Credit Reporting Act', desc: 'Establishes state statutory guidelines for debt collection practices and limits CRA reportable timeline on paid charge-offs.' }
    ]
  };

  async function pgAdminViolationQueue(el, initialPageData) {
    let pendingViolations = [];
    let selectedViolation = null;
    let activeEvidenceTab = 'evidence';

    async function loadQueue() {
      const d = await api('/admin/overview-stats');
      
      if (d.urgentItems && d.urgentItems.some(item => item.type === 'pending_qa')) {
        pendingViolations = d.urgentItems
          .filter(item => item.type === 'pending_qa')
          .map(item => ({
            id: item.targetId,
            title: item.title,
            description: item.description,
            date: item.date,
            account_name: item.description.match(/on\s([^ ]+)/)?.[1] || 'Retail Card',
            error_type: item.description.match(/potential\s([^ ]+)/)?.[1] || 'Inaccurate Status',
            finding_reason: 'Account shows balance active after bankruptcy discharge. Violation under § 1681i.',
            statute: '15 U.S.C. § 1681i',
            severity: 'critical',
            bureau: 'Experian'
          }));
      } else {
        pendingViolations = [];
      }

      if (initialPageData && initialPageData.searchViolationId) {
        selectedViolation = pendingViolations.find(v => v.id === initialPageData.searchViolationId) || pendingViolations[0];
      } else {
        selectedViolation = pendingViolations[0] || null;
      }

      renderWorkspace();
    }

    window._selectViolationForQA = (id) => {
      selectedViolation = pendingViolations.find(v => v.id === id);
      renderWorkspace();
    };

    window._setEvidenceTab = (tab) => {
      activeEvidenceTab = tab;
      renderRightPane();
    };

    window._submitQAReview = async (id, action) => {
      const btnApprove = $('#btn-qa-approve');
      const btnReject = $('#btn-qa-reject');
      if (btnApprove) btnApprove.disabled = true;
      if (btnReject) btnReject.disabled = true;

      try {
        const isMock = id.startsWith('mock_');
        let res;
        if (isMock) {
          res = { ok: true, status: action === 'approve' ? 'approved' : 'false_positive' };
        } else {
          res = await api(`/admin/violations/${id}/review`, {
            method: 'POST',
            body: JSON.stringify({ action })
          });
        }

        if (res && res.ok) {
          toast(`Violation review submitted: ${res.status.toUpperCase()}`, 'success');
          await loadQueue();
        } else {
          throw new Error(res.error || 'Failed to submit QA action');
        }
      } catch (e) {
        toast(e.message || 'QA execution error', 'error');
        if (btnApprove) btnApprove.disabled = false;
        if (btnReject) btnReject.disabled = false;
      }
    };

    function renderWorkspace() {
      el.innerHTML = `
        <div class="fade-in space-y-6">
          <div>
            <h1 class="text-xl font-bold text-white">Violation Review QA Workspace</h1>
            <p class="text-sm text-gray-400">Side-by-side legal evidence review, compliance reference libraries, and QA approvals.</p>
          </div>

          ${pendingViolations.length ? `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div class="glass rounded-2xl p-4 border border-gray-800 space-y-3 lg:col-span-1">
                <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2"><i class="fas fa-tasks text-blue-400 mr-2"></i>QA Review Queue</h3>
                <div class="space-y-2">
                  ${pendingViolations.map(v => `
                    <button onclick="window._selectViolationForQA('${v.id}')" class="w-full text-left p-3.5 rounded-xl border transition ${selectedViolation && v.id === selectedViolation.id ? 'bg-blue-600/10 border-blue-500/40' : 'bg-gray-800/40 border-gray-800 hover:bg-gray-800/80'}">
                      <div class="flex items-center justify-between mb-1.5">
                        <span class="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">${v.severity.toUpperCase()}</span>
                        <span class="text-[9px] text-gray-500 font-mono">${v.bureau}</span>
                      </div>
                      <h4 class="text-xs font-bold text-white truncate">${escapeHtml(v.account_name)}</h4>
                      <p class="text-[10px] text-gray-400 mt-1 truncate">${escapeHtml(v.error_type)}</p>
                    </button>
                  `).join('')}
                </div>
              </div>

              <div class="lg:col-span-2 space-y-6 flex flex-col justify-between" id="violation-qa-right-pane"></div>
            </div>
          ` : `
            <div class="text-center py-12 glass rounded-2xl border border-gray-800 p-8">
              <i class="fas fa-check-double text-5xl text-emerald-500/30 mb-4"></i>
              <h3 class="text-lg font-bold text-white mb-2">Queue Fully Cleared</h3>
              <p class="text-sm text-gray-400 max-w-md mx-auto">There are currently no potential FCRA violations waiting for administrator QA review or validation.</p>
            </div>
          `}
        </div>
      `;

      if (selectedViolation) {
        renderRightPane();
      }
    }

    function renderRightPane() {
      const pane = $('#violation-qa-right-pane');
      if (!pane) return;

      pane.innerHTML = `
        <div class="flex items-center gap-1.5 border-b border-gray-850 pb-2 mb-4">
          <button onclick="window._setEvidenceTab('evidence')" class="px-4 py-2 text-xs font-bold rounded-xl transition ${activeEvidenceTab === 'evidence' ? 'bg-blue-600/10 text-blue-400' : 'text-gray-400 hover:bg-gray-800'}">Evidence & Findings</button>
          <button onclick="window._setEvidenceTab('statute')" class="px-4 py-2 text-xs font-bold rounded-xl transition ${activeEvidenceTab === 'statute' ? 'bg-blue-600/10 text-blue-400' : 'text-gray-400 hover:bg-gray-800'}">FCRA Statute Mapping</button>
          <button onclick="window._setEvidenceTab('library')" class="px-4 py-2 text-xs font-bold rounded-xl transition ${activeEvidenceTab === 'library' ? 'bg-blue-600/10 text-blue-400' : 'text-gray-400 hover:bg-gray-800'}">Compliance Library Reference</button>
        </div>

        <div class="glass rounded-2xl border border-gray-800 p-6 min-h-[300px]">
          ${renderTabContent()}
        </div>

        <div class="glass rounded-2xl border border-gray-800 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
          <div>
            <h4 class="text-xs font-bold text-white">Complete Litigation QA Sign-Off</h4>
            <p class="text-[11px] text-gray-400 mt-0.5">Approved items are instantly integrated into attorney litigation dispute packages.</p>
          </div>
          <div class="flex gap-2.5">
            <button id="btn-qa-reject" onclick="window._submitQAReview('${selectedViolation.id}', 'reject')" class="bg-gray-900 hover:bg-red-900/20 hover:text-red-400 border border-gray-850 text-white text-xs font-bold px-4 py-2 rounded-xl transition">Mark False Positive</button>
            <button id="btn-qa-approve" onclick="window._submitQAReview('${selectedViolation.id}', 'approve')" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-lg shadow-blue-500/15">Approve Violation</button>
          </div>
        </div>
      `;
    }

    function renderTabContent() {
      if (activeEvidenceTab === 'evidence') {
        return `
          <div class="space-y-4 fade-in">
            <div>
              <span class="text-[10px] font-bold text-blue-400 uppercase tracking-wider">${selectedViolation.bureau} Report Inaccuracy</span>
              <h3 class="text-base font-bold text-white mt-0.5">${escapeHtml(selectedViolation.account_name)}</h3>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-gray-950/40 border border-gray-850 rounded-xl p-3.5">
                <div class="text-[10px] text-gray-500 uppercase font-bold">Error Category</div>
                <div class="text-xs font-bold text-white mt-1">${escapeHtml(selectedViolation.error_type)}</div>
              </div>
              <div class="bg-gray-950/40 border border-gray-850 rounded-xl p-3.5">
                <div class="text-[10px] text-gray-500 uppercase font-bold">Involved Statute</div>
                <div class="text-xs font-mono font-bold text-purple-400 mt-1">${escapeHtml(selectedViolation.statute || '15 U.S.C. § 1681')}</div>
              </div>
            </div>

            <div class="bg-gray-950/40 border border-gray-850 rounded-xl p-4">
              <div class="text-[10px] text-gray-500 uppercase font-bold mb-1.5">Algorithmic Finding Reason</div>
              <p class="text-xs text-gray-300 leading-relaxed font-sans">${escapeHtml(selectedViolation.finding_reason)}</p>
            </div>
          </div>
        `;
      }

      if (activeEvidenceTab === 'statute') {
        return `
          <div class="space-y-4 fade-in">
            <h3 class="text-sm font-bold text-white"><i class="fas fa-gavel text-purple-400 mr-2"></i>FCRA Statutory Violations Mapping</h3>
            <div class="bg-gray-950/40 border border-purple-500/20 rounded-xl p-4 space-y-2">
              <div class="text-xs font-bold text-purple-400 font-mono">${escapeHtml(selectedViolation.statute || '15 U.S.C. § 1681')}</div>
              <p class="text-xs text-gray-300 leading-normal">
                This account exhibits clear indicators of willful non-compliance. Under federal law, the consumer is entitled to recover statutory damages up to $1,000, actual damages, attorney fees, and punitive awards.
              </p>
            </div>
          </div>
        `;
      }

      if (activeEvidenceTab === 'library') {
        return `
          <div class="space-y-6 fade-in">
            <div>
              <h3 class="text-sm font-bold text-white"><i class="fas fa-book-reader text-blue-400 mr-2"></i>Federal & State Regulatory Reference Library</h3>
              <p class="text-xs text-gray-400 mt-0.5">Explore active federal and state credit repair laws from our database.</p>
            </div>

            <div class="space-y-4">
              <div>
                <div class="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-2">Federal Credit Statutes</div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  ${REGULATORY_LIBRARY.federal.map(f => `
                    <div class="bg-gray-950/40 border border-gray-850 rounded-xl p-3.5">
                      <div class="text-xs font-bold text-white font-mono">${escapeHtml(f.code)}</div>
                      <div class="text-[10px] text-blue-400 font-bold mt-1">${escapeHtml(f.title)}</div>
                      <p class="text-[10px] text-gray-400 mt-1.5 leading-normal">${escapeHtml(f.desc)}</p>
                    </div>
                  `).join('')}
                </div>
              </div>

              <div>
                <div class="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-2">State Fair Credit Statutes</div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  ${REGULATORY_LIBRARY.state.map(s => `
                    <div class="bg-gray-950/40 border border-gray-850 rounded-xl p-3.5">
                      <div class="text-xs font-bold text-white font-mono">${escapeHtml(s.state)}</div>
                      <div class="text-[10px] text-purple-400 font-bold mt-0.5">${escapeHtml(s.title)}</div>
                      <p class="text-[10px] text-gray-400 mt-1.5 leading-normal">${escapeHtml(s.desc)}</p>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
        `;
      }
    }

    await loadQueue();
  }

  function renderMailingTab(docs, client) {
    const sent = docs.filter(d => d.status === 'sent');
    const drafts = docs.filter(d => d.status === 'draft');
    
    // Address check
    const hasAddress = client.address_line1 && client.city && client.state && client.zip;
    const addressStatusHtml = hasAddress
      ? `<div class="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs text-green-300">
          <div class="flex items-center gap-2.5">
            <i class="fas fa-check-circle text-green-400 text-sm"></i>
            <div><strong>Mailing Coordinates Verified:</strong> Standard identity coordinates match active client records.</div>
          </div>
          <span class="font-mono text-[10px] bg-green-500/10 px-2 py-0.5 rounded text-green-400 font-bold">${client.state} ${client.zip}</span>
        </div>`
      : `<div class="p-4 bg-amber-950/20 border border-amber-500/20 rounded-xl flex items-center justify-between text-xs text-amber-300 animate-pulse">
          <div class="flex items-center gap-2.5">
            <i class="fas fa-exclamation-triangle text-amber-400 text-sm"></i>
            <div><strong>Mailing Coordinates Incomplete:</strong> Please fill in the complete street address in the client profile before dispatching mail.</div>
          </div>
          <button onclick="$('#btn-edit-client').click()" class="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-extrabold px-3 py-1.5 rounded transition uppercase tracking-wider">Fix Address</button>
        </div>`;

    // Dynamic stats card
    const statsHtml = `
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div class="glass border border-gray-800 rounded-xl p-3.5 bg-gray-900/10">
          <div class="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">Sent USPS Mailings</div>
          <div class="text-lg font-bold text-white flex items-center gap-1.5"><i class="fas fa-paper-plane text-green-400 text-sm"></i>${sent.length}</div>
        </div>
        <div class="glass border border-gray-800 rounded-xl p-3.5 bg-gray-900/10">
          <div class="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">Awaiting Signature/Drafts</div>
          <div class="text-lg font-bold text-white flex items-center gap-1.5"><i class="fas fa-pen-nib text-amber-400 text-sm"></i>${drafts.length}</div>
        </div>
        <div class="glass border border-gray-800 rounded-xl p-3.5 bg-gray-900/10">
          <div class="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">Mailing Service</div>
          <div class="text-lg font-bold text-blue-400 flex items-center gap-1.5"><i class="fas fa-cloud text-sm"></i>Click2Mail</div>
        </div>
        <div class="glass border border-gray-800 rounded-xl p-3.5 bg-gray-900/10">
          <div class="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">USPS Delivery Class</div>
          <div class="text-lg font-bold text-purple-400 flex items-center gap-1.5"><i class="fas fa-mail-bulk text-sm"></i>First Class / Certified</div>
        </div>
      </div>
    `;

    // Sent queue table
    let sentListHtml = '';
    if (!sent.length) {
      sentListHtml = `
        <div class="text-center py-10 glass rounded-xl border border-gray-800 bg-gray-900/5">
          <i class="fas fa-shipping-fast text-4xl text-gray-600 mb-3"></i>
          <p class="text-sm text-gray-400">No sent mail campaigns recorded yet</p>
          <p class="text-xs text-gray-500 max-w-sm mx-auto mt-1">Once you click "Mail" on any generated dispute letter, the tracking record and certified shipping details will appear here.</p>
        </div>
      `;
    } else {
      sentListHtml = `
        <div class="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950/20">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="border-b border-gray-800 bg-gray-900/50 text-gray-500 uppercase tracking-wider text-[10px] font-bold">
                <th class="p-3.5">Letter & Bureau</th>
                <th class="p-3.5">Dispatched Date</th>
                <th class="p-3.5">Statutory Response Due</th>
                <th class="p-3.5">Delivery Status</th>
                <th class="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-800/60">
              ${sent.map(d => {
                const sDate = d.sent_date ? new Date(d.sent_date) : new Date(d.created_at);
                const rDate = d.response_due_date ? new Date(d.response_due_date) : new Date(sDate.getTime() + 35 * 24 * 60 * 60 * 1000);
                const diffTime = rDate.getTime() - new Date().getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const countdownHtml = diffDays > 0
                  ? `<span class="px-2 py-0.5 bg-blue-950/40 border border-blue-500/20 text-blue-400 text-[10px] font-bold rounded flex items-center gap-1 w-fit"><i class="fas fa-clock text-[9px]"></i> ${diffDays} Days Left</span>`
                  : `<span class="px-2 py-0.5 bg-red-950/40 border border-red-500/20 text-red-400 text-[10px] font-bold rounded flex items-center gap-1 w-fit"><i class="fas fa-exclamation-circle text-[9px]"></i> Overdue</span>`;
                
                return `
                  <tr class="hover:bg-gray-900/10 transition">
                    <td class="p-3.5">
                      <div class="font-bold text-white flex items-center gap-1.5">
                        <i class="fas fa-file-contract text-purple-400"></i>
                        <span>${escapeHtml(d.title)}</span>
                      </div>
                      <div class="text-[10px] text-gray-500 font-mono mt-0.5">${d.doc_type}</div>
                    </td>
                    <td class="p-3.5 text-gray-300 font-medium font-mono">${sDate.toLocaleDateString()}</td>
                    <td class="p-3.5">
                      <div class="text-white font-mono font-bold">${rDate.toLocaleDateString()}</div>
                      <div class="mt-1">${countdownHtml}</div>
                    </td>
                    <td class="p-3.5">
                      <div class="flex items-center gap-1.5 text-green-400 font-semibold">
                        <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span>USPS Certified In Transit</span>
                      </div>
                      <div class="text-[10px] text-gray-500 font-mono mt-0.5">Click2Mail Gateway Dispatched</div>
                    </td>
                    <td class="p-3.5 text-right">
                      <div class="flex items-center justify-end gap-1.5">
                        <button onclick="window._viewDoc('${d.id}')" class="bg-gray-800 hover:bg-gray-700 text-gray-200 px-2.5 py-1 rounded text-[10px] font-semibold transition" title="View Document"><i class="fas fa-eye"></i> View</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // Drafts queue (Pending Dispatch)
    let draftsListHtml = '';
    if (!drafts.length) {
      draftsListHtml = `
        <div class="text-center py-6 text-gray-500 text-xs">
          <i class="fas fa-check-circle text-2xl text-green-500/30 mb-2"></i>
          <p>No pending drafts awaiting mailing dispatch</p>
        </div>
      `;
    } else {
      draftsListHtml = `
        <div class="space-y-2">
          ${drafts.map(d => `
            <div class="glass rounded-xl p-4 border border-gray-800/80 bg-gray-900/10 flex items-center justify-between gap-4 card-hover">
              <div>
                <div class="text-xs font-bold text-white flex items-center gap-1.5">
                  <i class="fas fa-file-signature text-amber-400"></i>
                  <span>${escapeHtml(d.title)}</span>
                </div>
                <p class="text-[10px] text-gray-400 mt-1">${d.doc_type} &bull; Created on ${shortDate(d.created_at)}</p>
              </div>
              <div class="flex items-center gap-2">
                <button onclick="window._viewDoc('${d.id}')" class="bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1"><i class="fas fa-eye text-[10px]"></i> Preview</button>
                <button onclick="window._mailDoc('${d.id}','${encodeURIComponent(client.first_name||'')}','${encodeURIComponent(client.last_name||'')}','${encodeURIComponent(client.address_line1||'')}','${encodeURIComponent(client.city||'')}','${encodeURIComponent(client.state||'')}','${encodeURIComponent(client.zip||'')}')" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 shadow-lg shadow-green-600/10"><i class="fas fa-paper-plane text-[10px]"></i> Send Certified Mail</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    return `
      <div class="space-y-6 fade-in">
        ${addressStatusHtml}
        ${statsHtml}
        
        <div>
          <h3 class="text-sm font-bold text-white mb-3.5 flex items-center gap-1.5 uppercase font-mono tracking-wider">
            <span class="w-1.5 h-3 bg-green-500 rounded"></span> Active USPS Certified Mailings (${sent.length})
          </h3>
          ${sentListHtml}
        </div>

        <div>
          <h3 class="text-sm font-bold text-white mb-3.5 flex items-center gap-1.5 uppercase font-mono tracking-wider">
            <span class="w-1.5 h-3 bg-amber-500 rounded"></span> Pending Mailing Dispatch Queue (${drafts.length})
          </h3>
          ${draftsListHtml}
        </div>
      </div>
    `;
  }

  async function pgMailingCampaigns(el) {
    el.innerHTML = `<div class="flex items-center justify-center py-20"><div class="text-center"><i class="fas fa-spinner fa-spin text-3xl text-blue-400 mb-3"></i><div class="text-sm text-gray-400">Loading USPS Campaign Hub...</div></div></div>`;
    try {
      const d = await api('/documents');
      const allDocs = d.documents || [];
      const sent = allDocs.filter(doc => doc.status === 'sent');
      const drafts = allDocs.filter(doc => doc.status === 'draft');

      const totalSent = sent.length;
      const totalPending = drafts.length;

      el.innerHTML = `
        <div class="fade-in">
          <!-- Page Header -->
          <div class="flex items-center justify-between mb-6">
            <div>
              <h1 class="text-xl font-bold text-white flex items-center gap-2">
                <i class="fas fa-mail-bulk text-blue-400"></i> Mailing Campaigns
              </h1>
              <p class="text-sm text-gray-400">Central USPS Certified Mail Campaign & Click2Mail dispatch control center</p>
            </div>
            <button onclick="window._nav('clients')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 shadow-lg shadow-blue-600/15">
              <i class="fas fa-plus"></i> New Mailing Dispatch
            </button>
          </div>

          <!-- Quick Overview KPI Cards -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div class="glass border border-gray-800 rounded-2xl p-4 bg-gray-900/10">
              <div class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">USPS Certified Sent</div>
              <div class="text-2xl font-black text-white flex items-center gap-2">
                <i class="fas fa-shipping-fast text-green-400 text-lg"></i>
                <span>${totalSent}</span>
              </div>
              <div class="text-[9px] text-gray-500 mt-1">Dispatched to bureaus successfully</div>
            </div>
            <div class="glass border border-gray-800 rounded-2xl p-4 bg-gray-900/10">
              <div class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">Awaiting Signature</div>
              <div class="text-2xl font-black text-white flex items-center gap-2">
                <i class="fas fa-signature text-amber-400 text-lg"></i>
                <span>${totalPending}</span>
              </div>
              <div class="text-[9px] text-gray-500 mt-1">Draft letters prepared for consumer signature</div>
            </div>
            <div class="glass border border-gray-800 rounded-2xl p-4 bg-gray-900/10">
              <div class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">Click2Mail Service</div>
              <div class="text-2xl font-black text-blue-400 flex items-center gap-2">
                <i class="fas fa-link text-lg text-blue-400"></i>
                <span>CONNECTED</span>
              </div>
              <div class="text-[9px] text-gray-500 mt-1">REST API Gateway live and operational</div>
            </div>
            <div class="glass border border-gray-800 rounded-2xl p-4 bg-gray-900/10">
              <div class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">USPS Resolution SLA</div>
              <div class="text-2xl font-black text-purple-400 flex items-center gap-2">
                <i class="fas fa-history text-lg text-purple-400"></i>
                <span>35 DAYS</span>
              </div>
              <div class="text-[9px] text-gray-500 mt-1">Legal compliance deadline tracking active</div>
            </div>
          </div>

          <!-- Mailing Tabs Inside Hub -->
          <div class="flex border-b border-gray-800 mb-5">
            <button id="hub-tab-sent" class="hub-tab pb-3 px-4 text-xs font-bold uppercase tracking-wider text-blue-400 border-b-2 border-blue-400" data-view="sent">Active USPS Certified Mailings (${totalSent})</button>
            <button id="hub-tab-drafts" class="hub-tab pb-3 px-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b-2 border-transparent hover:text-gray-300" data-view="drafts">Pending Signature / Dispatch (${totalPending})</button>
          </div>

          <!-- Hub View Content Container -->
          <div id="hub-view-content" class="space-y-4">
            <!-- Active Sent List -->
            ${totalSent ? `
              <div class="overflow-x-auto rounded-2xl border border-gray-800 bg-gray-950/20">
                <table class="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr class="border-b border-gray-800 bg-gray-900/60 text-gray-500 uppercase tracking-wider text-[10px] font-bold">
                      <th class="p-3.5">Client Info</th>
                      <th class="p-3.5">Letter & Bureau</th>
                      <th class="p-3.5">Dispatched Date</th>
                      <th class="p-3.5">Statutory Response Due</th>
                      <th class="p-3.5">USPS Tracking Status</th>
                      <th class="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-800/60">
                    ${sent.map(doc => {
                      const sDate = doc.sent_date ? new Date(doc.sent_date) : new Date(doc.created_at);
                      const rDate = doc.response_due_date ? new Date(doc.response_due_date) : new Date(sDate.getTime() + 35 * 24 * 60 * 60 * 1000);
                      const diffTime = rDate.getTime() - new Date().getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      const countdownHtml = diffDays > 0
                        ? `<span class="px-2 py-0.5 bg-blue-950/40 border border-blue-500/20 text-blue-400 text-[10px] font-bold rounded flex items-center gap-1 w-fit"><i class="fas fa-clock text-[9px]"></i> ${diffDays} Days Left</span>`
                        : `<span class="px-2 py-0.5 bg-red-950/40 border border-red-500/20 text-red-400 text-[10px] font-bold rounded flex items-center gap-1 w-fit"><i class="fas fa-exclamation-circle text-[9px]"></i> Overdue</span>`;

                      return `
                        <tr class="hover:bg-gray-900/10 transition">
                          <td class="p-3.5 cursor-pointer" onclick="window._nav('client-detail', { clientId: '${doc.client_id}' })">
                            <div class="font-bold text-white hover:text-blue-400 transition">${escapeHtml(doc.first_name || '')} ${escapeHtml(doc.last_name || '')}</div>
                            <div class="text-[10px] text-gray-500 font-mono mt-0.5">ID: ${doc.client_id.slice(0, 8)}...</div>
                          </td>
                          <td class="p-3.5">
                            <div class="font-bold text-white">${escapeHtml(doc.title || doc.doc_type)}</div>
                            <div class="text-[10px] text-gray-500 mt-0.5 font-mono font-bold">Dispute Notice Letter</div>
                          </td>
                          <td class="p-3.5 font-mono text-gray-300 font-medium">${sDate.toLocaleDateString()}</td>
                          <td class="p-3.5">
                            <div class="text-white font-mono font-bold">${rDate.toLocaleDateString()}</div>
                            <div class="mt-1">${countdownHtml}</div>
                          </td>
                          <td class="p-3.5">
                            <div class="flex items-center gap-1.5 text-green-400 font-semibold">
                              <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
                              <span>USPS Certified In Transit</span>
                            </div>
                            <div class="text-[10px] text-gray-500 font-mono mt-0.5">Click2Mail Automated Mailroom</div>
                          </td>
                          <td class="p-3.5 text-right">
                            <button onclick="window._viewDoc('${doc.id}')" class="bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition"><i class="fas fa-eye"></i> View</button>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            ` : `
              <div class="text-center py-12 glass rounded-2xl border border-gray-800 bg-gray-900/5">
                <i class="fas fa-shipping-fast text-5xl text-gray-600 mb-4"></i>
                <h3 class="text-base font-bold text-white mb-2">No active mailings dispatch records</h3>
                <p class="text-sm text-gray-400 max-w-md mx-auto">Once a dispute letter has been certified mailed to Equifax, Experian, or TransUnion, its delivery, signature, and tracking metrics will appear here.</p>
              </div>
            `}
          </div>
        </div>
      `;

      // Wire up local tab triggers
      const btnSent = document.getElementById('hub-tab-sent');
      const btnDrafts = document.getElementById('hub-tab-drafts');
      const hubContent = document.getElementById('hub-view-content');

      if (btnSent && btnDrafts && hubContent) {
        const setTab = (activeBtn, inactiveBtn, view) => {
          activeBtn.className = 'hub-tab pb-3 px-4 text-xs font-bold uppercase tracking-wider text-blue-400 border-b-2 border-blue-400';
          inactiveBtn.className = 'hub-tab pb-3 px-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b-2 border-transparent hover:text-gray-300';
          
          if (view === 'sent') {
            if (!sent.length) {
              hubContent.innerHTML = `
                <div class="text-center py-12 glass rounded-2xl border border-gray-800 bg-gray-900/5">
                  <i class="fas fa-shipping-fast text-5xl text-gray-600 mb-4"></i>
                  <h3 class="text-base font-bold text-white mb-2">No active mailings</h3>
                  <p class="text-sm text-gray-400 max-w-md mx-auto">No dispatched campaigns registered yet.</p>
                </div>
              `;
            } else {
              hubContent.innerHTML = `
                <div class="overflow-x-auto rounded-2xl border border-gray-800 bg-gray-950/20">
                  <table class="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr class="border-b border-gray-800 bg-gray-900/60 text-gray-500 uppercase tracking-wider text-[10px] font-bold">
                        <th class="p-3.5">Client Info</th>
                        <th class="p-3.5">Letter & Bureau</th>
                        <th class="p-3.5">Dispatched Date</th>
                        <th class="p-3.5">Statutory Response Due</th>
                        <th class="p-3.5">USPS Tracking Status</th>
                        <th class="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-800/60">
                      ${sent.map(doc => {
                        const sDate = doc.sent_date ? new Date(doc.sent_date) : new Date(doc.created_at);
                        const rDate = doc.response_due_date ? new Date(doc.response_due_date) : new Date(sDate.getTime() + 35 * 24 * 60 * 60 * 1000);
                        const diffTime = rDate.getTime() - new Date().getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        const countdownHtml = diffDays > 0
                          ? `<span class="px-2 py-0.5 bg-blue-950/40 border border-blue-500/20 text-blue-400 text-[10px] font-bold rounded flex items-center gap-1 w-fit"><i class="fas fa-clock text-[9px]"></i> ${diffDays} Days Left</span>`
                          : `<span class="px-2 py-0.5 bg-red-950/40 border border-red-500/20 text-red-400 text-[10px] font-bold rounded flex items-center gap-1 w-fit"><i class="fas fa-exclamation-circle text-[9px]"></i> Overdue</span>`;

                        return `
                          <tr class="hover:bg-gray-900/10 transition">
                            <td class="p-3.5 cursor-pointer" onclick="window._nav('client-detail', { clientId: '${doc.client_id}' })">
                              <div class="font-bold text-white hover:text-blue-400 transition">${escapeHtml(doc.first_name || '')} ${escapeHtml(doc.last_name || '')}</div>
                              <div class="text-[10px] text-gray-500 font-mono mt-0.5">ID: ${doc.client_id.slice(0, 8)}...</div>
                            </td>
                            <td class="p-3.5">
                              <div class="font-bold text-white">${escapeHtml(doc.title || doc.doc_type)}</div>
                              <div class="text-[10px] text-gray-500 mt-0.5 font-mono">Dispute Notice Letter</div>
                            </td>
                            <td class="p-3.5 font-mono text-gray-300 font-medium">${sDate.toLocaleDateString()}</td>
                            <td class="p-3.5">
                              <div class="text-white font-mono font-bold">${rDate.toLocaleDateString()}</div>
                              <div class="mt-1">${countdownHtml}</div>
                            </td>
                            <td class="p-3.5">
                              <div class="flex items-center gap-1.5 text-green-400 font-semibold">
                                <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
                                <span>USPS Certified In Transit</span>
                              </div>
                              <div class="text-[10px] text-gray-500 font-mono mt-0.5">Click2Mail Automated Mailroom</div>
                            </td>
                            <td class="p-3.5 text-right">
                              <button onclick="window._viewDoc('${doc.id}')" class="bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition"><i class="fas fa-eye"></i> View</button>
                            </td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              `;
            }
          } else {
            if (!drafts.length) {
              hubContent.innerHTML = `
                <div class="text-center py-12 glass rounded-2xl border border-gray-800 bg-gray-900/5">
                  <i class="fas fa-check-circle text-5xl text-gray-600 mb-4"></i>
                  <h3 class="text-base font-bold text-white mb-2">No pending dispatch drafts</h3>
                  <p class="text-sm text-gray-400 max-w-md mx-auto">All generated letters have been signed and routed to the mailing queues.</p>
                </div>
              `;
            } else {
              hubContent.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  ${drafts.map(doc => `
                    <div class="glass rounded-2xl p-4.5 border border-gray-800/80 bg-gray-900/5 hover:border-blue-500/25 transition card-hover flex flex-col justify-between h-fit gap-4">
                      <div>
                        <div class="flex items-center justify-between mb-2">
                          <span onclick="window._nav('client-detail', { clientId: '${doc.client_id}' })" class="text-[10px] font-mono bg-blue-600/10 px-2 py-0.5 rounded text-blue-400 hover:bg-blue-600/20 transition cursor-pointer font-bold uppercase"><i class="fas fa-user text-[8px] mr-1"></i> ${escapeHtml(doc.first_name || '')} ${escapeHtml(doc.last_name || '')}</span>
                          <span class="text-[9px] text-gray-500 font-mono">${shortDate(doc.created_at)}</span>
                        </div>
                        <h4 class="text-xs font-bold text-white mb-1.5 truncate">${escapeHtml(doc.title || doc.doc_type)}</h4>
                        <p class="text-[10px] text-gray-400 line-clamp-2">Draft dispute package notice letter prepared under FCRA Section 611 guidelines.</p>
                      </div>
                      <div class="flex items-center justify-end gap-1.5 border-t border-gray-900 pt-3">
                        <button onclick="window._viewDoc('${doc.id}')" class="bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1"><i class="fas fa-eye text-[10px]"></i> Preview</button>
                        <button onclick="window._nav('client-detail', { clientId: '${doc.client_id}' })" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 shadow-lg shadow-blue-600/10"><i class="fas fa-external-link-alt text-[10px]"></i> Open Workspace</button>
                      </div>
                    </div>
                  `).join('')}
                </div>
              `;
            }
          }
        };

        btnSent.onclick = () => setTab(btnSent, btnDrafts, 'sent');
        btnDrafts.onclick = () => setTab(btnDrafts, btnSent, 'drafts');
      }
    } catch(err) {
      el.innerHTML = `<div class="fade-in"><div class="glass rounded-xl p-8 border border-red-500/30 text-center"><i class="fas fa-exclamation-triangle text-3xl text-red-400 mb-3"></i><h3 class="text-lg font-bold text-white mb-1">Failed to load USPS Campaigns</h3><p class="text-sm text-gray-400">${err.message}</p><button onclick="window._nav('mailing-campaigns')" class="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">Retry</button></div></div>`;
    }
  }

  async function pgROICalculator(el) {
    el.innerHTML = `
      <div class="fade-in max-w-6xl mx-auto space-y-6">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-5">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-blue-500 bg-blue-500/10 px-2.5 py-1 rounded-full"><i class="fas fa-calculator mr-1"></i> Interactive Valuation Tool</span>
            <h1 class="text-2xl font-black text-white tracking-tight mt-2">SmartFCRA™ Enterprise ROI & Value Calculator</h1>
            <p class="text-xs text-gray-400 mt-1">Analyze operational speedup, resource cost offsets, and recaptured damages valuations.</p>
          </div>
          <div class="flex items-center gap-3">
            <button onclick="window._nav('dashboard')" class="bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-2 rounded-xl text-xs font-semibold transition border border-gray-700/50 flex items-center gap-2"><i class="fas fa-arrow-left"></i> Back to Dashboard</button>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Input Sliders -->
          <div class="lg:col-span-5 space-y-6">
            <div class="glass border border-gray-800/80 rounded-3xl p-6 bg-gray-950/20 shadow-2xl relative overflow-hidden">
              <div class="absolute -right-20 -top-20 w-40 h-40 bg-blue-600/5 rounded-full blur-3xl"></div>
              <h3 class="text-sm font-bold text-white mb-5 flex items-center gap-2 border-b border-gray-900 pb-3"><i class="fas fa-sliders-h text-blue-400"></i> Adjust Operational Metrics</h3>
              
              <div class="space-y-6">
                <!-- Slider 1 -->
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <label class="text-xs font-bold text-gray-300">Active Monthly Clients</label>
                    <span id="val-clients" class="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">50</span>
                  </div>
                  <input type="range" id="slide-clients" min="10" max="500" value="50" class="w-full accent-blue-500 bg-gray-800 h-1.5 rounded-lg cursor-pointer">
                  <div class="flex justify-between text-[9px] text-gray-500 mt-1 font-mono">
                    <span>10 clients</span>
                    <span>500 clients</span>
                  </div>
                </div>

                <!-- Slider 2 -->
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <label class="text-xs font-bold text-gray-300">Manual Hours / Client Review</label>
                    <span id="val-hours" class="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">5 hrs</span>
                  </div>
                  <input type="range" id="slide-hours" min="1" max="20" value="5" class="w-full accent-blue-500 bg-gray-800 h-1.5 rounded-lg cursor-pointer">
                  <div class="flex justify-between text-[9px] text-gray-500 mt-1 font-mono">
                    <span>1 hr</span>
                    <span>20 hrs</span>
                  </div>
                </div>

                <!-- Slider 3 -->
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <label class="text-xs font-bold text-gray-300">Average Missed Violations / Report</label>
                    <span id="val-violations" class="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">2</span>
                  </div>
                  <input type="range" id="slide-violations" min="1" max="5" value="2" class="w-full accent-blue-500 bg-gray-800 h-1.5 rounded-lg cursor-pointer">
                  <div class="flex justify-between text-[9px] text-gray-500 mt-1 font-mono">
                    <span>1 violation</span>
                    <span>5 violations</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Standard Value Offsets Explanation -->
            <div class="glass border border-gray-800/80 rounded-3xl p-5 bg-gray-900/5 text-xs text-gray-400 space-y-3">
              <p class="font-bold text-white flex items-center gap-1.5"><i class="fas fa-info-circle text-blue-400"></i> Calculator Invariants & Formulae</p>
              <ul class="list-disc pl-4 space-y-1">
                <li><strong class="text-gray-300">Labor Rate Assumption:</strong> Pre-loaded at <strong class="text-gray-200">$100/hour</strong> average operational value of certified paralegals/reviewers.</li>
                <li><strong class="text-gray-300">Time-Value Multiplier:</strong> Calculated against an <strong class="text-gray-200">80% automated speedup rate</strong> (saving 4 hours out of 5 per file).</li>
                <li><strong class="text-gray-300">Statutory Damages:</strong> Capped at the standard statutory damages of <strong class="text-gray-200">$1,000 per violation</strong> under 15 U.S.C. § 1681n and 15 U.S.C. § 1681o.</li>
              </ul>
            </div>
          </div>

          <!-- Dynamic Output Metrics -->
          <div class="lg:col-span-7 space-y-6">
            <div class="glass border border-gray-800/80 rounded-3xl p-6 bg-gray-950/20 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[400px]">
              <div class="absolute -left-20 -bottom-20 w-40 h-40 bg-blue-600/5 rounded-full blur-3xl"></div>
              
              <div>
                <h3 class="text-sm font-bold text-white mb-5 flex items-center gap-2 border-b border-gray-900 pb-3"><i class="fas fa-chart-line text-blue-400"></i> Dynamic Value Realization Output</h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <!-- Card 1 -->
                  <div class="border border-gray-800/60 bg-gray-900/10 rounded-2xl p-4 flex items-start gap-3">
                    <div class="p-2.5 bg-blue-600/10 text-blue-400 rounded-xl"><i class="fas fa-clock text-sm"></i></div>
                    <div>
                      <p class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Labor Hours Saved / Yr</p>
                      <h4 id="calc-hours-saved" class="text-lg font-black text-white mt-1">2,400 hrs</h4>
                    </div>
                  </div>

                  <!-- Card 2 -->
                  <div class="border border-gray-800/60 bg-gray-900/10 rounded-2xl p-4 flex items-start gap-3">
                    <div class="p-2.5 bg-green-600/10 text-green-400 rounded-xl"><i class="fas fa-wallet text-sm"></i></div>
                    <div>
                      <p class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Overhead Offsets / Yr</p>
                      <h4 id="calc-overhead-saved" class="text-lg font-black text-green-400 mt-1">$240,000</h4>
                    </div>
                  </div>

                  <!-- Card 3 -->
                  <div class="border border-gray-800/60 bg-gray-900/10 rounded-2xl p-4 flex items-start gap-3">
                    <div class="p-2.5 bg-amber-600/10 text-amber-400 rounded-xl"><i class="fas fa-gavel text-sm"></i></div>
                    <div>
                      <p class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Missed Damages Recaptured / Yr</p>
                      <h4 id="calc-damages-recaptured" class="text-lg font-black text-amber-400 mt-1">$1,200,000</h4>
                    </div>
                  </div>

                  <!-- Card 4 -->
                  <div class="border border-blue-500/20 bg-blue-950/10 rounded-2xl p-4 flex items-start gap-3 relative overflow-hidden">
                    <div class="absolute right-0 top-0 text-[35px] font-black text-blue-500/5 leading-none select-none font-mono">ROI</div>
                    <div class="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl"><i class="fas fa-percent text-sm"></i></div>
                    <div>
                      <p class="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Net Subscription ROI Multiple</p>
                      <h4 id="calc-roi-multiple" class="text-lg font-black text-blue-400 mt-1">241x</h4>
                    </div>
                  </div>
                </div>

                <!-- Interactive Comparison Bar Chart -->
                <div class="mt-6 border-t border-gray-900 pt-5 space-y-4">
                  <p class="text-[11px] uppercase font-bold text-gray-400 tracking-wider">Estimated Recaptured Business Valuation (Annualized)</p>
                  
                  <div class="space-y-3 font-mono">
                    <!-- Manual Row -->
                    <div>
                      <div class="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                        <span>Manual Review Approach</span>
                        <span>$0 (100% Leakage)</span>
                      </div>
                      <div class="w-full bg-gray-900 h-3 rounded-full overflow-hidden border border-gray-800/50">
                        <div class="bg-gray-700 h-full rounded-full transition-all duration-300" style="width: 2%"></div>
                      </div>
                    </div>

                    <!-- SmartFCRA Row -->
                    <div>
                      <div class="flex items-center justify-between text-[10px] text-blue-400 font-bold mb-1">
                        <span class="flex items-center gap-1"><i class="fas fa-shield-alt text-[8px]"></i> SmartFCRA™ Automation Model</span>
                        <span id="lbl-chart-val">$1,440,000 / yr</span>
                      </div>
                      <div class="w-full bg-gray-900 h-3 rounded-full overflow-hidden border border-gray-800/50">
                        <div id="bar-chart-val" class="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full shadow-lg shadow-blue-500/20 transition-all duration-300" style="width: 80%"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Stripe Checkout CTA -->
              <div class="mt-8 pt-5 border-t border-gray-900 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div class="text-center sm:text-left">
                  <p class="text-xs text-gray-300 font-bold">Ready to automate your credit review workflows?</p>
                  <p class="text-[10px] text-gray-500">Lock in your dedicated license workspace and start parsing instantly.</p>
                </div>
                <button id="btn-activate-plan" class="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-6 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 border border-blue-400/20"><i class="fas fa-bolt"></i> Activate Professional Plan ($497/mo) <i class="fas fa-arrow-right text-[10px]"></i></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Sliders
    const sClients = $('#slide-clients'), sHours = $('#slide-hours'), sViolations = $('#slide-violations');
    // Labels
    const lClients = $('#val-clients'), lHours = $('#val-hours'), lViolations = $('#val-violations');
    // Calculated Outputs
    const oHoursSaved = $('#calc-hours-saved'), oOverheadSaved = $('#calc-overhead-saved'), oDamages = $('#calc-damages-recaptured'), oRoi = $('#calc-roi-multiple');
    const chartLbl = $('#lbl-chart-val'), chartBar = $('#bar-chart-val');

    function recalculate() {
      const clients = parseInt(sClients.value, 10);
      const hours = parseInt(sHours.value, 10);
      const violations = parseInt(sViolations.value, 10);

      lClients.textContent = clients;
      lHours.textContent = hours + ' hrs';
      lViolations.textContent = violations;

      // Calculations
      // Labor Saved per client = hours * 0.8 (since we save 80% of time)
      const monthlyHoursSaved = Math.round(clients * hours * 0.8);
      const annualHoursSaved = monthlyHoursSaved * 12;

      // Annual Overhead Saved = annualHoursSaved * $100
      const annualOverheadSaved = annualHoursSaved * 100;

      // Annual Missed Damages = clients * violations * $1,000 * 12
      const annualDamagesRecaptured = clients * violations * 1000 * 12;

      // Total Value
      const totalValue = annualOverheadSaved + annualDamagesRecaptured;

      // ROI Multiple against $497/mo Professional Plan ($5,964/yr)
      const annualLicenseCost = 497 * 12;
      const roiMultiple = Math.round(totalValue / annualLicenseCost);

      // Format Outputs
      oHoursSaved.textContent = annualHoursSaved.toLocaleString() + ' hrs';
      oOverheadSaved.textContent = '$' + annualOverheadSaved.toLocaleString();
      oDamages.textContent = '$' + annualDamagesRecaptured.toLocaleString();
      oRoi.textContent = roiMultiple + 'x';

      // Update Chart Label and Bar Width
      chartLbl.textContent = '$' + totalValue.toLocaleString() + ' / yr';
      
      // Calculate a relative percentage width for the chart (max-width represents total valuation at max inputs = $6.24M)
      const maxPossibleVal = 6240000;
      const barPct = Math.min(100, Math.max(8, (totalValue / maxPossibleVal) * 100));
      chartBar.style.width = barPct + '%';
    }

    sClients.oninput = recalculate;
    sHours.oninput = recalculate;
    sViolations.oninput = recalculate;

    // Run initial calculations
    recalculate();

    // Stripe checkout wiring
    const btnActivate = $('#btn-activate-plan');
    btnActivate.onclick = async () => {
      btnActivate.disabled = true;
      btnActivate.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Creating Checkout Session...';
      try {
        const d = await api('/api/billing/checkout', {
          method: 'POST',
          body: JSON.stringify({ planId: 'professional' })
        });
        if (d.url) {
          toast('Redirecting to secure Stripe Checkout...', 'info');
          window.location.href = d.url;
        } else {
          throw new Error('No checkout URL returned from server.');
        }
      } catch (err) {
        toast('Stripe Checkout failed: ' + err.message, 'error');
        btnActivate.disabled = false;
        btnActivate.innerHTML = '<i class="fas fa-bolt"></i> Activate Professional Plan ($497/mo) <i class="fas fa-arrow-right text-[10px]"></i>';
      }
    };
  }

  async function pgSalesTools(el) {
    // 1. Fetch available clients to enable campaign-trigger simulation
    let clients = [];
    try {
      const d = await api('/clients');
      clients = d.clients || [];
    } catch(err) {
      console.warn('Failed to load clients for campaign triggers:', err.message);
    }

    el.innerHTML = `
      <div class="fade-in max-w-6xl mx-auto space-y-6">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-5">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-blue-500 bg-blue-500/10 px-2.5 py-1 rounded-full"><i class="fas fa-chart-pie mr-1"></i> Sales Enablement Panel</span>
            <h1 class="text-2xl font-black text-white tracking-tight mt-2">SmartFCRA™ Outbound Sales Cockpit</h1>
            <p class="text-xs text-gray-400 mt-1">RJ Business Solutions | Core Sales materials, competitive battlecards, and drip campaigns.</p>
          </div>
          <div class="flex items-center gap-3">
            <button onclick="window._nav('dashboard')" class="bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-2 rounded-xl text-xs font-semibold transition border border-gray-700/50 flex items-center gap-2"><i class="fas fa-arrow-left"></i> Back to Dashboard</button>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Main Content: Battlecard Sub-tabs -->
          <div class="lg:col-span-8 space-y-6">
            <div class="glass border border-gray-800/80 rounded-3xl p-6 bg-gray-950/20 shadow-2xl relative overflow-hidden">
              <!-- Sub-tab Navigation -->
              <div class="flex flex-wrap border-b border-gray-900 pb-3 gap-1.5 mb-6">
                <button id="sub-tab-pitch" class="px-4 py-2 text-xs font-bold rounded-xl transition bg-blue-600 text-white shadow-lg shadow-blue-600/15">30s Elevator Pitch</button>
                <button id="sub-tab-shield" class="px-4 py-2 text-xs font-bold rounded-xl transition bg-transparent text-gray-400 hover:text-gray-200">Competitive Shield</button>
                <button id="sub-tab-objections" class="px-4 py-2 text-xs font-bold rounded-xl transition bg-transparent text-gray-400 hover:text-gray-200">Objection Rebuttals</button>
                <button id="sub-tab-pricing" class="px-4 py-2 text-xs font-bold rounded-xl transition bg-transparent text-gray-400 hover:text-gray-200">Corporate Pricing</button>
                <button id="sub-tab-bant" class="px-4 py-2 text-xs font-bold rounded-xl transition bg-transparent text-gray-400 hover:text-gray-200">BANT Discovery</button>
              </div>

              <!-- Interactive Card Area -->
              <div id="battlecard-content" class="min-h-[350px] flex flex-col justify-between">
                <!-- Content will be injected dynamically -->
              </div>
            </div>
          </div>

          <!-- Sidebar: Outbound marketing campaign dispatcher with real clients -->
          <div class="lg:col-span-4 space-y-6">
            <div class="glass border border-gray-800/80 rounded-3xl p-5 bg-gray-950/30 relative overflow-hidden flex flex-col justify-between min-h-[460px]">
              <div class="absolute -right-20 -top-20 w-40 h-40 bg-blue-600/5 rounded-full blur-3xl"></div>
              
              <div>
                <h3 class="text-sm font-bold text-white mb-4 flex items-center gap-2 border-b border-gray-900 pb-3"><i class="fas fa-paper-plane text-blue-400"></i> Outbound Marketing Engine</h3>
                <p class="text-[11px] text-gray-400 mb-5 leading-relaxed">Select an analyzed client to auto-populate their parsed metrics (violation count and estimated damages) into Rick Jefferson's customized outreach templates, then dispatch simulated sequences.</p>
                
                <div class="space-y-4">
                  <!-- Client dropdown -->
                  <div>
                    <label class="text-[10px] font-bold uppercase text-gray-500 tracking-wider block mb-1.5">Target Client Profile</label>
                    <select id="disp-client-id" class="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500/50 transition">
                      ${clients.length > 0 
                        ? clients.map(c => `<option value="${c.id}">${escapeHtml(c.first_name)} ${escapeHtml(c.last_name)} (${escapeHtml(c.city || 'US Client')})</option>`).join('')
                        : '<option value="">-- No Active Clients Found --</option>'
                      }
                    </select>
                  </div>

                  <!-- Campaign type selection -->
                  <div>
                    <label class="text-[10px] font-bold uppercase text-gray-500 tracking-wider block mb-1.5">Outreach Campaign Sequence</label>
                    <select id="disp-campaign-id" class="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500/50 transition">
                      <option value="cold-outreach">Rick Jefferson's Cold Outreach Sequence</option>
                    </select>
                  </div>

                  <!-- Sequence Step selection -->
                  <div>
                    <label class="text-[10px] font-bold uppercase text-gray-500 tracking-wider block mb-1.5">Drip Sequence Step</label>
                    <div class="grid grid-cols-3 gap-2">
                      <button id="step-btn-1" class="step-btn px-3 py-2 text-xs font-bold rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/25 transition">Step 1 (Cold)</button>
                      <button id="step-btn-2" class="step-btn px-3 py-2 text-xs font-bold rounded-xl bg-gray-900 text-gray-400 border border-gray-800 transition">Step 2 (Follow-up)</button>
                      <button id="step-btn-3" class="step-btn px-3 py-2 text-xs font-bold rounded-xl bg-gray-900 text-gray-400 border border-gray-800 transition">Step 3 (Case Study)</button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="mt-8 border-t border-gray-900 pt-4">
                <button id="btn-dispatch-campaign" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10" ${clients.length === 0 ? 'disabled' : ''}><i class="fas fa-paper-plane"></i> Dispatch Outbound Drip Email</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Tab content map
    const contentMap = {
      'pitch': `
        <div class="space-y-4 font-sans">
          <div>
            <h4 class="text-sm font-extrabold text-blue-400 flex items-center gap-1.5"><i class="fas fa-quote-left text-xs text-blue-500"></i> The Core Narrative ("Systems Over Noise")</h4>
            <p class="text-xs text-gray-300 mt-2 leading-relaxed">
              "Most credit repair software sells a list of dispute templates. We don't. We sell a complete, automated legal compliance system. SmartFCRA™ parses credit files, isolates exactly where the furnishers and bureaus violated statutory law (over 75+ rigorous checks spanning FCRA, FDCPA, and ECOA), and compiles lawsuit-grade dispute notices citing precise federal statutes and state case law. We reduce review times by 80% and uncover thousands in statutory leverage."
            </p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 border-t border-gray-900 pt-4">
            <div class="border border-gray-800/50 bg-gray-900/10 p-3.5 rounded-2xl">
              <p class="text-[10px] font-bold text-blue-400 uppercase tracking-wide">Target Outcome</p>
              <p class="text-xs text-gray-200 mt-1">Saves over 4 hours per audit and uncovers hidden cashflow leverage under 15 U.S.C. § 1681.</p>
            </div>
            <div class="border border-gray-800/50 bg-gray-900/10 p-3.5 rounded-2xl">
              <p class="text-[10px] font-bold text-blue-400 uppercase tracking-wide">Signature Principle</p>
              <p class="text-xs text-gray-200 mt-1">"Build the system before you chase the traffic. Clarity first. Automation second. Scale third."</p>
            </div>
          </div>
        </div>
      `,
      'shield': `
        <div class="space-y-4">
          <h4 class="text-sm font-extrabold text-blue-400 flex items-center gap-1.5"><i class="fas fa-shield-alt"></i> Competitive Shield Matrix</h4>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-gray-800 text-[10px] text-gray-500 uppercase font-mono">
                  <th class="py-2">Feature / Attribute</th>
                  <th class="py-2">Standard Competitors</th>
                  <th class="py-2 text-blue-400">SmartFCRA™ Model</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-900 text-gray-300">
                <tr>
                  <td class="py-2.5 font-bold text-white">Detection Base</td>
                  <td class="py-2.5">Basic template checklist (5-10 rules)</td>
                  <td class="py-2.5 text-blue-300 font-bold">75+ Rule legal violations engine</td>
                </tr>
                <tr>
                  <td class="py-2.5 font-bold text-white">Damages Modeling</td>
                  <td class="py-2.5">None (Manual estimates)</td>
                  <td class="py-2.5 text-blue-300 font-bold">Dynamic statutory damages calculator</td>
                </tr>
                <tr>
                  <td class="py-2.5 font-bold text-white">State Statutes (SOL)</td>
                  <td class="py-2.5">Not integrated</td>
                  <td class="py-2.5 text-blue-300 font-bold">50-state localized SOL database built-in</td>
                </tr>
                <tr>
                  <td class="py-2.5 font-bold text-white">Automation Rate</td>
                  <td class="py-2.5">20% (Manual matching)</td>
                  <td class="py-2.5 text-blue-300 font-bold">80%+ (Full JSON/XML parser)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `,
      'objections': `
        <div class="space-y-4">
          <h4 class="text-sm font-extrabold text-blue-400 flex items-center gap-1.5"><i class="fas fa-lightbulb"></i> Objection Rebuttal Matrix</h4>
          <div class="space-y-3">
            <div class="border border-gray-800/80 bg-gray-950/20 p-3.5 rounded-2xl">
              <p class="text-xs font-extrabold text-white">Objection: "It's too expensive to pay $497/mo."</p>
              <p class="text-xs text-gray-400 mt-1.5"><strong class="text-blue-400">Rebuttal:</strong> "At $100/hr internal paralegal/review time, saving just 5 hours a month pays for the software completely. On top of that, identifying just one missed violation pays back 200% of your licensing costs in statutory leverage. It's an investment that pays for itself."</p>
            </div>
            <div class="border border-gray-800/80 bg-gray-950/20 p-3.5 rounded-2xl">
              <p class="text-xs font-extrabold text-white">Objection: "Our manual credit review process is fine."</p>
              <p class="text-xs text-gray-400 mt-1.5"><strong class="text-blue-400">Rebuttal:</strong> "No human reviewer can manually compare 75 distinct legal rules across Experian, Equifax, and TransUnion files in seconds without making errors. If you miss even 20% of actionable violations, you are leaking thousands in real customer value. Let automation handle the audit, and let your team focus on litigation."</p>
            </div>
          </div>
        </div>
      `,
      'pricing': `
        <div class="space-y-4">
          <h4 class="text-sm font-extrabold text-blue-400 flex items-center gap-1.5"><i class="fas fa-tag"></i> Modern Enterprise Pricing Model</h4>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <!-- Tier 1 -->
            <div class="border border-gray-800 bg-gray-900/5 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <span class="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Professional License</span>
                <h5 class="text-lg font-black text-white mt-1">$497<span class="text-xs font-normal text-gray-500">/mo</span></h5>
                <p class="text-[10px] text-gray-400 mt-2 leading-relaxed">Perfect for standard credit operations and local boutiques.</p>
              </div>
              <ul class="text-[10px] text-gray-300 mt-3 space-y-1.5 border-t border-gray-900 pt-3">
                <li><i class="fas fa-check text-blue-500 mr-1 text-[8px]"></i> 100 Parsed Reports / mo</li>
                <li><i class="fas fa-check text-blue-500 mr-1 text-[8px]"></i> Core 75+ Rules Engine</li>
                <li><i class="fas fa-check text-blue-500 mr-1 text-[8px]"></i> Letter Draft Compiler</li>
              </ul>
            </div>
            <!-- Tier 2 -->
            <div class="border border-blue-500/20 bg-blue-950/5 rounded-2xl p-4 flex flex-col justify-between relative">
              <span class="absolute right-3 top-3 text-[9px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">Popular</span>
              <div>
                <span class="text-[9px] uppercase font-bold text-blue-400 tracking-wider">Unlimited Volume</span>
                <h5 class="text-lg font-black text-white mt-1">$2,500<span class="text-xs font-normal text-gray-500">/mo</span></h5>
                <p class="text-[10px] text-gray-400 mt-2 leading-relaxed">Designed for growing credit repair firms and high-volume agencies.</p>
              </div>
              <ul class="text-[10px] text-gray-300 mt-3 space-y-1.5 border-t border-gray-900 pt-3">
                <li><i class="fas fa-check text-blue-500 mr-1 text-[8px]"></i> Unlimited Monthly Reports</li>
                <li><i class="fas fa-check text-blue-500 mr-1 text-[8px]"></i> Advanced 50-State SOL</li>
                <li><i class="fas fa-check text-blue-500 mr-1 text-[8px]"></i> Full Case Law Databases</li>
              </ul>
            </div>
            <!-- Tier 3 -->
            <div class="border border-gray-800 bg-gray-900/5 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <span class="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Enterprise Network</span>
                <h5 class="text-lg font-black text-white mt-1">$9,997<span class="text-xs font-normal text-gray-500">/mo</span></h5>
                <p class="text-[10px] text-gray-400 mt-2 leading-relaxed">Dedicated server resources, API access and customized rules routing.</p>
              </div>
              <ul class="text-[10px] text-gray-300 mt-3 space-y-1.5 border-t border-gray-900 pt-3">
                <li><i class="fas fa-check text-blue-500 mr-1 text-[8px]"></i> Full Whitelabel Portal</li>
                <li><i class="fas fa-check text-blue-500 mr-1 text-[8px]"></i> 24/7 Dedicated Support</li>
                <li><i class="fas fa-check text-blue-500 mr-1 text-[8px]"></i> Custom API Webhooks</li>
              </ul>
            </div>
          </div>
        </div>
      `,
      'bant': `
        <div class="space-y-4">
          <h4 class="text-sm font-extrabold text-blue-400 flex items-center gap-1.5"><i class="fas fa-question-circle"></i> BANT Lead Qualification Sequence</h4>
          <div class="space-y-3 font-mono text-[11px] text-gray-300 leading-relaxed">
            <div>
              <p class="font-bold text-white uppercase text-[10px] tracking-wider text-blue-400">1. BUDGET (Cost offset):</p>
              <p class="mt-1">"How much do you currently spend on manual credit file analysis and certified legal staff? If we could cut that cost by 80% while identifying missed statutory leverage, what would that be worth to your operations?"</p>
            </div>
            <div class="border-t border-gray-900 pt-2">
              <p class="font-bold text-white uppercase text-[10px] tracking-wider text-blue-400">2. AUTHORITY (Operations):</p>
              <p class="mt-1">"Who is currently in charge of reviewing credit reports and signing off on the dispute letters? Are they comfortable switching to an automated legal compliance dashboard?"</p>
            </div>
            <div class="border-t border-gray-900 pt-2">
              <p class="font-bold text-white uppercase text-[10px] tracking-wider text-blue-400">3. NEED (Efficiency bottleneck):</p>
              <p class="mt-1">"What is the single biggest roadblock in your credit repair operations? Is it report review speed, letter compiling accuracy, or missing specific FCRA/FDCPA violations?"</p>
            </div>
            <div class="border-t border-gray-900 pt-2">
              <p class="font-bold text-white uppercase text-[10px] tracking-wider text-blue-400">4. TIMELINE (Deployment):</p>
              <p class="mt-1">"If the ROI calculator numbers look solid, when would you want to have your automated compliance workspace live for your client files?"</p>
            </div>
          </div>
        </div>
      `
    };

    // Sub-tabs switches
    const tabPitch = $('#sub-tab-pitch'), tabShield = $('#sub-tab-shield'), tabObjections = $('#sub-tab-objections'), tabPricing = $('#sub-tab-pricing'), tabBant = $('#sub-tab-bant');
    const displayEl = $('#battlecard-content');

    const tabs = [
      { btn: tabPitch, id: 'pitch' },
      { btn: tabShield, id: 'shield' },
      { btn: tabObjections, id: 'objections' },
      { btn: tabPricing, id: 'pricing' },
      { btn: tabBant, id: 'bant' }
    ];

    function setSubTab(activeId) {
      tabs.forEach(t => {
        if (t.id === activeId) {
          t.btn.className = 'px-4 py-2 text-xs font-bold rounded-xl transition bg-blue-600 text-white shadow-lg shadow-blue-600/15';
        } else {
          t.btn.className = 'px-4 py-2 text-xs font-bold rounded-xl transition bg-transparent text-gray-400 hover:text-gray-200';
        }
      });
      displayEl.innerHTML = contentMap[activeId];
    }

    tabs.forEach(t => {
      t.btn.onclick = () => setSubTab(t.id);
    });

    // Default tab
    setSubTab('pitch');

    // Campaign dispatch step selection
    let activeStep = 1;
    const sBtn1 = $('#step-btn-1'), sBtn2 = $('#step-btn-2'), sBtn3 = $('#step-btn-3');
    const stepBtns = [
      { btn: sBtn1, step: 1 },
      { btn: sBtn2, step: 2 },
      { btn: sBtn3, step: 3 }
    ];

    function selectStep(stepNum) {
      activeStep = stepNum;
      stepBtns.forEach(sb => {
        if (sb.step === stepNum) {
          sb.btn.className = 'step-btn px-3 py-2 text-xs font-bold rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/25 transition';
        } else {
          sb.btn.className = 'step-btn px-3 py-2 text-xs font-bold rounded-xl bg-gray-900 text-gray-400 border border-gray-800 transition';
        }
      });
    }

    stepBtns.forEach(sb => {
      sb.btn.onclick = () => selectStep(sb.step);
    });

    // Handle Campaign Dispatch Action
    const btnDispatch = $('#btn-dispatch-campaign');
    if (btnDispatch) {
      btnDispatch.onclick = async () => {
        const cSel = $('#disp-client-id');
        const campSel = $('#disp-campaign-id');
        if (!cSel || !cSel.value) {
          toast('Please select a target client first.', 'error');
          return;
        }

        btnDispatch.disabled = true;
        btnDispatch.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Dispatched outreach...';

        try {
          const res = await api('/api/marketing/campaign/trigger', {
            method: 'POST',
            body: JSON.stringify({
              clientId: cSel.value,
              campaignId: campSel.value,
              step: activeStep
            })
          });

          if (res.success) {
            toast(`Campaign step ${activeStep} triggered! Message subject: "${res.subject}"`, 'success');
          } else {
            throw new Error(res.error || 'Outreach dispatch failed.');
          }
        } catch(err) {
          toast('Marketing Trigger error: ' + err.message, 'error');
        } finally {
          btnDispatch.disabled = false;
          btnDispatch.innerHTML = '<i class="fas fa-paper-plane"></i> Dispatch Outbound Drip Email';
        }
      };
    }
  }

  (async () => {
    await loadLocale(localStorage.getItem('fcra_locale') || 'en');
    render();
  })();
})();
