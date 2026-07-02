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
    currentPage: 'dashboard',
    pageData: null,
    loading: false,
  };

  function setState(u) {
    Object.assign(state, u);
    if (u.token !== undefined) { u.token ? localStorage.setItem('fcra_token', u.token) : localStorage.removeItem('fcra_token'); }
    if (u.user !== undefined) { u.user ? localStorage.setItem('fcra_user', JSON.stringify(u.user)) : localStorage.removeItem('fcra_user'); }
    if (u.org !== undefined) { u.org ? localStorage.setItem('fcra_org', JSON.stringify(u.org)) : localStorage.removeItem('fcra_org'); }
  }

  async function api(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
    const res = await fetch(`/api${path}`, { ...opts, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
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
  function money(n) { return '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
  function shortDate(d) { if (!d) return '—'; try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return d; } }
  function sevColor(s) { return { critical: 'red-500', high: 'orange-500', medium: 'yellow-500', low: 'green-500' }[s] || 'gray-400'; }
  function sevBg(s) { return { critical: 'bg-red-900/30 border-red-500', high: 'bg-orange-900/30 border-orange-500', medium: 'bg-yellow-900/30 border-yellow-500', low: 'bg-green-900/30 border-green-500' }[s] || 'bg-gray-800 border-gray-600'; }
  function navigate(page, data) { state.currentPage = page; state.pageData = data; render(); }

  function render() {
    const app = document.getElementById('app');
    if (!state.token) { app.innerHTML = renderAuth(); bindAuth(); }
    else { app.innerHTML = renderShell(); loadPage(state.currentPage); }
  }

  // ═══════════════════════════════════════════════════════════════
  // AUTH
  // ═══════════════════════════════════════════════════════════════
  function renderAuth() {
    return `<div class="min-h-screen flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 mb-4"><i class="fas fa-shield-alt text-2xl text-blue-400"></i></div>
          <h1 class="text-2xl font-bold text-white">FCRA Supreme Detector</h1>
          <p class="text-gray-400 mt-1 text-sm">Multi-tenant credit report violation analysis SaaS</p>
        </div>
        <div class="glass rounded-2xl p-6">
          <div class="flex border-b border-gray-700 mb-5">
            <button id="tab-login" class="flex-1 pb-3 text-sm font-semibold text-blue-400 border-b-2 border-blue-400" onclick="window._switchTab('login')">Sign In</button>
            <button id="tab-register" class="flex-1 pb-3 text-sm font-semibold text-gray-500 border-b-2 border-transparent" onclick="window._switchTab('register')">Create Account</button>
          </div>
          <div id="auth-login"><form id="login-form" class="space-y-4">
            <div><label class="block text-xs font-medium text-gray-400 mb-1.5">Email</label><input type="email" name="email" required class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="you@company.com"></div>
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
              <div class="relative">
                <input type="password" id="login-password" name="password" required class="w-full bg-gray-800/80 border border-gray-700 rounded-lg pl-3.5 pr-10 py-2.5 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="••••••••">
                <button type="button" class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-white" onclick="const input = document.getElementById('login-password'); const icon = this.querySelector('i'); if (input.type === 'password') { input.type = 'text'; icon.className = 'fas fa-eye-slash'; } else { input.type = 'password'; icon.className = 'fas fa-eye'; }">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </div>
            <div class="p-3 bg-amber-900/20 border border-amber-600/30 rounded-lg mt-2">
              <p class="text-[10px] text-amber-300 leading-relaxed">
                <strong>⚠️ FCRA NOTICE:</strong> We prepare dispute documents only. NOT legal advice. See <a href="/compliance/disclaimers" class="underline hover:text-amber-200">disclaimers</a>.
              </p>
            </div>
            <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition text-sm">Sign In</button>
          </form></div>
          <div id="auth-register" class="hidden"><form id="register-form" class="space-y-4">
            <div><label class="block text-xs font-medium text-gray-400 mb-1.5">Organization Name</label><input type="text" name="orgName" required class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Your Firm Name"></div>
            <div><label class="block text-xs font-medium text-gray-400 mb-1.5">Full Name</label><input type="text" name="name" required class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="John Doe"></div>
            <div><label class="block text-xs font-medium text-gray-400 mb-1.5">Email</label><input type="email" name="email" required class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="you@company.com"></div>
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
              <div class="relative">
                <input type="password" id="register-password" name="password" required minlength="6" class="w-full bg-gray-800/80 border border-gray-700 rounded-lg pl-3.5 pr-10 py-2.5 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Minimum 6 characters">
                <button type="button" class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-white" onclick="const input = document.getElementById('register-password'); const icon = this.querySelector('i'); if (input.type === 'password') { input.type = 'text'; icon.className = 'fas fa-eye-slash'; } else { input.type = 'password'; icon.className = 'fas fa-eye'; }">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </div>
            <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition text-sm">Create Account</button>
          </form></div>
          <div class="mt-4 p-3 bg-amber-900/20 border border-amber-600/30 rounded-lg">
            <p class="text-[10px] text-amber-300 leading-relaxed">
              <strong>⚠️ NOTICE:</strong> This service prepares dispute documents. We are NOT a law firm and do NOT provide legal advice.
              FCRA rights are governed by 15 U.S.C. § 1681 et seq. For legal advice, consult an attorney.
              <a href="/compliance/disclaimers" class="underline hover:text-amber-200">View Full Disclaimers →</a>
            </p>
          </div>
        </div>
        <p class="text-center text-gray-600 text-xs mt-4">FCRA Supreme Detection Engine v3.0 | RJ Business Solutions</p>
      </div></div>`;
  }

  window._switchTab = function(tab) {
    const ll = $('#auth-login'), rr = $('#auth-register'), tl = $('#tab-login'), tr = $('#tab-register');
    if (tab === 'login') { ll.classList.remove('hidden'); rr.classList.add('hidden'); tl.className = 'flex-1 pb-3 text-sm font-semibold text-blue-400 border-b-2 border-blue-400'; tr.className = 'flex-1 pb-3 text-sm font-semibold text-gray-500 border-b-2 border-transparent'; }
    else { ll.classList.add('hidden'); rr.classList.remove('hidden'); tr.className = 'flex-1 pb-3 text-sm font-semibold text-blue-400 border-b-2 border-blue-400'; tl.className = 'flex-1 pb-3 text-sm font-semibold text-gray-500 border-b-2 border-transparent'; }
  };

  function bindAuth() {
    const lf = $('#login-form'), rf = $('#register-form');
    if (lf) lf.onsubmit = async (e) => { e.preventDefault(); const fd = new FormData(e.target); try { const d = await api('/auth/login', { method:'POST', body:JSON.stringify({email:fd.get('email'),password:fd.get('password')})}); setState({token:d.token,user:d.user,org:d.org}); toast('Welcome back!','success'); render(); } catch(err) { toast(err.message,'error'); } };
    if (rf) rf.onsubmit = async (e) => { e.preventDefault(); const fd = new FormData(e.target); try { const d = await api('/auth/register', { method:'POST', body:JSON.stringify({orgName:fd.get('orgName'),name:fd.get('name'),email:fd.get('email'),password:fd.get('password')})}); setState({token:d.token,user:d.user,org:d.org}); toast('Account created!','success'); render(); } catch(err) { toast(err.message,'error'); } };
  }

  // ═══════════════════════════════════════════════════════════════
  // SHELL
  // ═══════════════════════════════════════════════════════════════
  function renderShell() {
    const navItems = [
      { id:'dashboard', icon:'fa-chart-line', label:'Dashboard' },
      { id:'clients', icon:'fa-users', label:'Clients' },
      { id:'reports', icon:'fa-file-alt', label:'Reports' },
      { id:'report-history', icon:'fa-history', label:'Report History' },
      { id:'violations', icon:'fa-exclamation-triangle', label:'Violations' },
      { id:'documents', icon:'fa-file-contract', label:'Documents' },
      { id:'founder-os', icon:'fa-briefcase', label:'Founder OS' },
      { id:'team', icon:'fa-user-friends', label:'Team' },
      { id:'billing', icon:'fa-credit-card', label:'Billing' },
      { id:'legal', icon:'fa-gavel', label:'Legal' },
    ];
    // Branding URLs - replace with actual image URLs
    const RJ_LOGO = 'https://storage.googleapis.com/msgsndr/qQnxRHDtyx0uydPd5sRl/media/67eb83c5e519ed689430646b.jpeg';
    const MFSN_BANNER = '/static/logos/mfsn-banner.png';
    const FCRA_LOGO = '/static/logos/Professional_logo_design_for_FCRA_DETECTOR_mode-1776629301082.png';
    return `<div class="flex h-screen overflow-hidden flex-col">
      <!-- Top Branding Header -->
      ${MFSN_BANNER ? `<div class="h-16 bg-gray-900 border-b border-gray-800 flex items-center px-4 shrink-0"><img src="${MFSN_BANNER}" alt="MyFreeScoreNow" class="h-14 object-contain"></div>` : ''}
            <div class="flex flex-1 overflow-hidden">
      <aside class="w-56 bg-gray-900/80 border-r border-gray-800 flex flex-col shrink-0">
        <div class="p-4 border-b border-gray-800"><div class="flex items-center gap-2.5">
          ${FCRA_LOGO ? `<img src="${FCRA_LOGO}" alt="FCRA" class="w-12 h-12 rounded-lg object-contain">` : `<div class="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center"><i class="fas fa-shield-alt text-blue-400 text-xs"></i></div>`}
          <div class="min-w-0"><div class="text-xs font-bold text-white truncate">FCRA Detector</div><div class="text-[10px] text-gray-500 truncate">${state.org?.name||'Org'}</div></div>
        </div></div>
        <nav class="flex-1 p-3 space-y-1 overflow-y-auto">${navItems.map(n=>`<button onclick="window._nav('${n.id}')" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${state.currentPage===n.id?'bg-blue-600/20 text-blue-400':'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}"><i class="fas ${n.icon} w-5 text-center text-xs"></i><span>${n.label}</span></button>`).join('')}</nav>
        <div class="p-3 border-t border-gray-800">
          <div class="flex items-center gap-2.5 px-2 mb-3"><div class="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">${(state.user?.name||'U')[0].toUpperCase()}</div><div class="min-w-0"><div class="text-xs font-medium text-gray-300 truncate">${state.user?.name||'User'}</div><div class="text-[10px] text-gray-500 truncate">${state.user?.role||'member'}</div></div></div>
          <button onclick="window._logout()" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:bg-red-900/20 hover:text-red-400 transition"><i class="fas fa-sign-out-alt"></i>Sign Out</button>
        </div>
      </aside>
      <main class="flex-1 overflow-y-auto"><div class="p-6" id="page-content"><div class="flex items-center justify-center h-40"><i class="fas fa-spinner fa-spin text-blue-400 text-xl"></i></div></div></main>
      </div>
    </div>`;
  }

  window._nav = (p, data) => navigate(p, data);
  window._logout = async () => { try { await api('/auth/logout',{method:'POST'}); } catch {} setState({token:null,user:null,org:null}); toast('Signed out','info'); render(); };

  async function loadPage(page) {
    const el = $('#page-content');
    if (!el) return;
    el.innerHTML = '<div class="flex items-center justify-center h-40"><i class="fas fa-spinner fa-spin text-blue-400 text-xl"></i></div>';
    try {
      switch(page) {
        case 'dashboard': await pgDashboard(el); break;
        case 'clients': await pgClients(el); break;
        case 'client-detail': await pgClientDetail(el, state.pageData); break;
        case 'reports': await pgReports(el); break;
        case 'report-history': await pgReportHistory(el); break;
        case 'report-detail': await pgReportDetail(el, state.pageData); break;
        case 'violations': await pgViolations(el); break;
        case 'documents': await pgDocuments(el); break;
        case 'founder-os': await pgFounderOS(el); break;
        case 'team': await pgTeam(el); break;
        case 'billing': await pgBilling(el); break;
        case 'legal': await pgLegal(el); break;
        case 'upload-report': await pgUploadReport(el, state.pageData); break;
        case 'generate-doc': await pgGenerateDoc(el, state.pageData); break;
        case 'full-analysis': await pgFullAnalysis(el, state.pageData); break;
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
          <button onclick="window._nav('upload-report', { clientId: 'autopilot', autopilot: true, from: 'dashboard' })" class="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-lg flex items-center gap-1.5"><i class="fas fa-magic"></i>Smart Autopilot Ingest</button>
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
  async function pgClients(el) {
    const d = await api('/clients');
    el.innerHTML = `<div class="fade-in">
      <div class="flex items-center justify-between mb-6"><div><h1 class="text-xl font-bold text-white">Clients</h1><p class="text-sm text-gray-400">${d.clients.length} total</p></div>
        <div class="flex gap-2">
          <button onclick="window._nav('upload-report', { clientId: 'autopilot', autopilot: true, from: 'clients' })" class="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-lg flex items-center gap-1.5"><i class="fas fa-magic"></i>Smart Autopilot Ingest</button>
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
      <div class="flex items-start justify-between mb-6">
        <div class="flex items-center gap-4"><div class="w-14 h-14 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-xl">${(c.first_name||'?')[0]}${(c.last_name||'?')[0]}</div>
          <div><h1 class="text-xl font-bold text-white">${c.first_name} ${c.last_name}</h1><div class="text-sm text-gray-400">${c.email||''} ${c.phone?'&bull; '+c.phone:''}</div>${c.address_line1?`<div class="text-xs text-gray-500">${c.address_line1}${c.city?', '+c.city:''} ${c.state||''} ${c.zip||''}</div>`:''}</div>
        </div>
        <div class="flex gap-2">
          <button onclick="window._nav('upload-report',{clientId:'${c.id}',clientName:'${c.first_name} ${c.last_name}'})" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"><i class="fas fa-upload mr-1.5"></i>Upload Report</button>
          <button onclick="window._nav('generate-doc',{clientId:'${c.id}',clientName:'${c.first_name} ${c.last_name}'})" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"><i class="fas fa-file-contract mr-1.5"></i>Generate Docs</button>
        </div>
      </div>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        ${statCard('fa-file-alt','Reports',res.reports.length,'blue')}
        ${statCard('fa-exclamation-triangle','Violations',res.violations.length,'red')}
        ${statCard('fa-dollar-sign','Min Recovery',money(totalMin),'green')}
        ${statCard('fa-file-contract','Documents',res.documents.length,'purple')}
      </div>
      <div class="flex border-b border-gray-800 mb-4">${['reports','violations','documents','activity'].map((t,i)=>`<button class="client-tab pb-2.5 px-4 text-sm font-medium ${i===0?'text-blue-400 border-b-2 border-blue-400':'text-gray-500 border-b-2 border-transparent hover:text-gray-300'}" data-tab="${t}">${t[0].toUpperCase()+t.slice(1)} (${t==='activity'?res.activity.length:res[t].length})</button>`).join('')}</div>
      <div id="client-tab-content">${renderViolationsList(res.violations)}</div>
    </div>`;
    // Show violations first since that's the money view
    document.querySelectorAll('.client-tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.client-tab').forEach(t => { t.className = 'client-tab pb-2.5 px-4 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:text-gray-300'; });
        tab.className = 'client-tab pb-2.5 px-4 text-sm font-medium text-blue-400 border-b-2 border-blue-400';
        const ct = $('#client-tab-content');
        switch(tab.dataset.tab) {
          case 'reports': ct.innerHTML = renderReportsList(res.reports); break;
          case 'violations': ct.innerHTML = renderViolationsList(res.violations); break;
          case 'documents': ct.innerHTML = renderDocsList(res.documents); break;
          case 'activity': ct.innerHTML = renderActivityList(res.activity); break;
        }
      };
    });
  }

  function renderReportsList(reports) {
    if (!reports.length) return '<div class="text-center py-8 text-gray-500"><i class="fas fa-file-alt text-3xl mb-3"></i><p>No reports yet</p></div>';
    return `<div class="space-y-2">${reports.map(r=>`<div onclick="window._nav('report-detail',{reportId:'${r.id}'})" class="glass rounded-lg p-4 card-hover cursor-pointer"><div class="flex items-center justify-between"><div><div class="text-sm font-medium text-white"><i class="fas fa-file-alt mr-2 text-blue-400"></i>${r.bureau||'Unknown'}</div><div class="text-xs text-gray-400">${r.file_name} &bull; ${shortDate(r.created_at)}</div></div><div class="text-right"><div class="text-xs text-gray-400">${r.total_accounts||0} accounts</div><span class="px-2 py-0.5 rounded text-[10px] font-medium ${r.status==='analyzed'?'bg-green-900/30 text-green-400':'bg-yellow-900/30 text-yellow-400'}">${r.status}</span></div></div></div>`).join('')}</div>`;
  }

  function renderViolationsList(violations) {
    if (!violations.length) return '<div class="text-center py-8 text-gray-500"><i class="fas fa-check-circle text-3xl mb-3"></i><p>No violations</p></div>';
    return `<div class="space-y-2">${violations.map(v=>`<details class="group"><summary class="cursor-pointer list-none"><div class="glass rounded-lg p-4 border-l-4 border-${sevColor(v.severity)} card-hover"><div class="flex items-start justify-between"><div class="flex-1 min-w-0"><div class="flex items-center gap-2 mb-1"><span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-${sevColor(v.severity)}/20 text-${sevColor(v.severity)}">${v.severity}</span><span class="text-xs text-gray-400">${v.category} &bull; ${v.statute}</span><i class="fas fa-chevron-down text-[10px] text-gray-500 group-open:rotate-180 transition-transform"></i></div><div class="text-sm font-medium text-white">${v.subcategory}</div>${v.account_name||v.accountName?`<div class="text-xs text-gray-500">Account: ${v.account_name||v.accountName}</div>`:''}</div><div class="text-right shrink-0 ml-4"><div class="text-xs text-green-400 font-medium">${money(v.total_damages_min||v.totalDamagesMin)} &ndash; ${money(v.total_damages_max||v.totalDamagesMax)}</div></div></div></div></summary>
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
            <p class="text-xs text-gray-500 font-medium">Accepts multiple files simultaneously. Drop your multi-bureau reports together!</p>
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
            const pageText = textContent.items.map(item => item.str).join(' ');
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

          // Sequential API call to prevent SQLite D1 concurrent locks
          const response = await api(endpoint, {
            method: 'POST',
            body: JSON.stringify({
              clientId: data.clientId,
              bureau: 'Unknown', // Backend auto-detects from first 1500 chars
              rawText: compiledText,
              fileName: file.name
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
            for (const reportId of reportIds) {
              const result = await api('/documents/generate-bulk', { method:'POST', body:JSON.stringify({
                clientId: data.clientId, reportId,
                docTypes: ['bureau-dispute','furnisher-dispute','debt-validation','609-disclosure','method-of-verification','cease-desist','intent-to-sue','cfpb-complaint','state-ag-complaint','goodwill-letter'],
                bureau: 'Equifax',
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
  async function pgReportDetail(el, data) {
    el.innerHTML = `<div class="flex items-center justify-center py-20"><div class="text-center"><i class="fas fa-spinner fa-spin text-3xl text-blue-400 mb-3"></i><div class="text-sm text-gray-400">Loading report...</div></div></div>`;
    try {
      const res = await api(`/reports/${data.reportId}`);
      const r = res.report;
      const ls = res.litigationScore;
      el.innerHTML = `<div class="fade-in">
        <button onclick="window._nav('reports')" class="text-gray-400 hover:text-white text-sm mb-4 inline-flex items-center gap-1.5 transition"><i class="fas fa-arrow-left text-xs"></i>Back</button>
        <div class="flex items-start justify-between mb-6"><div><h1 class="text-xl font-bold text-white">${r.bureau} Report</h1><div class="text-sm text-gray-400">${r.file_name} &bull; ${shortDate(r.created_at)}</div></div>
          <div class="flex gap-2">
            <button onclick="window._exportPDF('${r.id}')" class="bg-blue-600/20 border border-blue-500/30 text-blue-300 px-3 py-2 rounded-lg text-xs font-medium transition"><i class="fas fa-file-pdf mr-1"></i>Download PDF</button>
            <button onclick="window._exportViolations('','${r.id}')" class="bg-green-600/20 border border-green-500/30 text-green-300 px-3 py-2 rounded-lg text-xs font-medium transition"><i class="fas fa-download mr-1"></i>Export</button>
            <span class="px-3 py-1 rounded-lg text-xs font-medium ${r.status==='analyzed'?'bg-green-900/30 text-green-400':'bg-yellow-900/30 text-yellow-400'}">${r.status}</span>
          </div>
        </div>
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <div class="glass rounded-lg p-3 text-center"><div class="text-lg font-bold text-white">${r.total_accounts||0}</div><div class="text-xs text-gray-400">Accounts</div></div>
          <div class="glass rounded-lg p-3 text-center"><div class="text-lg font-bold text-white">${r.total_collections||0}</div><div class="text-xs text-gray-400">Collections</div></div>
          <div class="glass rounded-lg p-3 text-center"><div class="text-lg font-bold text-white">${r.total_inquiries||0}</div><div class="text-xs text-gray-400">Inquiries</div></div>
          <div class="glass rounded-lg p-3 text-center"><div class="text-lg font-bold text-red-400">${(res.violations||[]).length}</div><div class="text-xs text-gray-400">Violations</div></div>
          <div class="glass rounded-lg p-3 text-center"><div class="text-lg font-bold text-${ls.score>=60?'green':ls.score>=40?'yellow':'gray'}-400">${ls.score}/100</div><div class="text-xs text-gray-400">Score (${ls.grade})</div></div>
        </div>
        ${(res.violations||[]).length?`<div class="glass rounded-xl p-5 mb-6"><h3 class="text-sm font-bold text-white mb-2">${ls.recommendation}</h3><div class="text-xs text-gray-400">Total: ${money(ls.totalDamagesMin)} &ndash; ${money(ls.totalDamagesMax)}</div></div>${renderViolationsList(res.violations)}`:'<div class="glass rounded-xl p-8 text-center text-gray-500">No violations in this report</div>'}
      </div>`;
    } catch(err) {
      el.innerHTML = `<div class="fade-in"><button onclick="window._nav('reports')" class="text-gray-400 hover:text-white text-sm mb-4 inline-flex items-center gap-1.5 transition"><i class="fas fa-arrow-left text-xs"></i>Back</button><div class="glass rounded-xl p-8 border border-red-500/30 text-center"><i class="fas fa-exclamation-triangle text-3xl text-red-400 mb-3"></i><h3 class="text-lg font-bold text-white mb-1">Failed to load report</h3><p class="text-sm text-gray-400">${err.message}</p></div></div>`;
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

    el.innerHTML = `<div class="fade-in max-w-3xl">
      <button onclick="window._nav('client-detail',{clientId:'${data.clientId}'})" class="text-gray-400 hover:text-white text-sm mb-4 inline-flex items-center gap-1.5 transition"><i class="fas fa-arrow-left text-xs"></i>Back to ${data.clientName}</button>
      <h1 class="text-xl font-bold text-white mb-1">Generate Legal Document</h1>
      <p class="text-sm text-gray-400 mb-6">10 court-ready templates for ${data.clientName}</p>

      <div class="bg-blue-900/30 border border-blue-600/40 rounded-xl p-4 mb-6">
        <h3 class="text-sm font-semibold text-blue-300 mb-2"><i class="fas fa-gavel mr-2"></i>Legal Disclaimer</h3>
        <p class="text-xs text-blue-200/80 leading-relaxed">
          <strong>NOT LEGAL ADVICE:</strong> Documents generated here are prepared by a document preparation service, NOT an attorney.
          Under FCRA § 1681 et seq., you have rights to dispute inaccurate information. This service does not guarantee dispute outcomes.
          For legal advice about your specific situation, consult a qualified attorney. See our
          <a href="/compliance/disclaimers" target="_blank" class="underline hover:text-blue-100">full disclaimers</a>.
        </p>
      </div>

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
        <div class="flex gap-3">
          <button type="submit" id="gen-btn" class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition"><i class="fas fa-magic mr-2"></i>Generate</button>
          <button type="button" onclick="window._bulkGenerate('${data.clientId}','${data.reportId||''}')" class="bg-blue-600/20 border border-blue-500/30 text-blue-300 px-4 py-2.5 rounded-lg text-sm font-medium transition"><i class="fas fa-layer-group mr-1"></i>Generate All 10</button>
        </div>
      </form>
      <div id="gen-result" class="hidden mt-6"></div>
    </div>`;

    // Show description on type change
    const docTypeMap = {};
    typesRes.types.forEach(t => docTypeMap[t.id] = t);
    const sel = $('select[name="docType"]');
    const desc = $('#doc-desc');
    sel.onchange = () => { const t = docTypeMap[sel.value]; if (t) desc.textContent = t.description; };
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
          ${state.user?.role==='admin'?`<button onclick="$('#invite-form').classList.toggle('hidden')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"><i class="fas fa-user-plus mr-1.5"></i>Add Member</button>`:''}
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

  // ═══════════════════════════════════════════════════════════════
  // LEGAL PAGES
  // ═══════════════════════════════════════════════════════════════
  async function pgLegal(el) {
    el.innerHTML = `<div class="fade-in">
      <div class="flex items-center justify-between mb-8">
        <div><h1 class="text-xl font-bold text-white">Legal & Compliance</h1><p class="text-sm text-gray-400">Terms of service, privacy policy, and disclaimers</p></div>
      </div>
      <div class="space-y-6">
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
      { id: 'starter', name: 'Starter', price: 49, color: 'gray', badge: '', features: ['10 Clients/mo', '25 Report analyses/mo', 'Basic severity tags', 'Standard violation detection', 'PDF reports'], priceId: null },
      { id: 'professional', name: 'Professional', price: 199, color: 'blue', badge: 'MOST POPULAR', features: ['100 Clients/mo', 'Unlimited report analyses', 'Litigation scoring', '15 FCRA letters (all templates)', '15-category violation engine', 'Case law database', 'SOL calculator', 'Priority email support'], priceId: 'price_PRO_199' },
      { id: 'enterprise', name: 'Enterprise', price: 399, color: 'purple', badge: 'TEAM', features: ['Unlimited Clients', 'Unlimited everything', '38 legal document templates', 'Full case law database (300+ cases)', 'Expert consultation add-on', 'White-label reports', 'API access', 'Dedicated account manager'], priceId: 'price_ENT_399' },
      { id: 'unlimited', name: 'Unlimited', price: 799, color: 'amber', badge: 'ENTERPRISE', features: ['Everything in Enterprise', 'Unlimited MFSN credit reports', 'Full FCRA knowledge base', 'Custom integrations', 'SLA guarantee', 'On-site training available', 'Quarterly business review', 'Multi-org management'], priceId: 'price_UNL_799' }
    ];

    el.innerHTML = `<div class="fade-in">
      <div class="flex items-center justify-between mb-8"><div><h1 class="text-xl font-bold text-white">Billing & Subscription</h1><p class="text-sm text-gray-400">Manage your organization\'s plan</p></div>
        <div class="px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-full text-[10px] font-bold text-blue-400 uppercase tracking-wider">Current: ${state.org?.plan || 'Free'}</div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
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
            ${p.id === 'starter' ?
              `<button disabled class="w-full py-2 rounded-lg text-sm font-semibold bg-gray-700 text-gray-500 cursor-not-allowed">Free Tier</button>` :
              `<button onclick="window._checkout('${p.id}')" class="w-full py-2 rounded-lg text-sm font-semibold ${state.org?.plan === p.id ? 'bg-gray-700 text-white' : 'bg-' + p.color + '-600 hover:bg-' + p.color + '-700 text-white'} transition">${state.org?.plan === p.id ? 'Current Plan' : 'Upgrade'}</button>`
            }
          </div>
        `).join('')}
      </div>
    </div>`;
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
  // REPORT HISTORY
  // ═══════════════════════════════════════════════════════════════
  async function pgReportHistory(el) {
    el.innerHTML = `<div class="flex items-center justify-center py-20"><div class="text-center"><i class="fas fa-spinner fa-spin text-3xl text-blue-400 mb-3"></i><div class="text-sm text-gray-400">Loading report history...</div></div></div>`;
    try {
      const d = await api('/reports');
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
        ${d.total > d.limit ? `<div class="mt-6 flex justify-center"><div class="text-xs text-gray-500">Showing ${d.limit} of ${d.total} reports — paginated view coming soon</div></div>` : ''}
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
        const cleanUrl = `/api/documents/${currentDocId}/pdf?token=${encodeURIComponent(state.token)}`;
        window.open(cleanUrl, '_blank');
      };

    } catch (err) {
      el.innerHTML = `<div class="fade-in"><div class="glass rounded-xl p-8 border border-red-500/30 text-center"><i class="fas fa-exclamation-triangle text-3xl text-red-400 mb-3"></i><h3 class="text-lg font-bold text-white mb-1">Failed to initialize Founder OS Suite</h3><p class="text-sm text-gray-400">${err.message}</p></div></div>`;
    }
  }

  render();
})();
