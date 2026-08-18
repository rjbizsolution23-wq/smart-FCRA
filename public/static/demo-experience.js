/* Smart FCRA interactive demo overlay — tour + text/voice agent. */
(function () {
  'use strict';
  const DEMO_CLIENT = { id: 'cli_demo_001', name: 'Salisha McDowell' };

  let api = null;
  let toast = () => {};
  let getState = () => ({});
  let navigate = () => {};
  let startImpersonating = () => {};
  let stopImpersonating = () => {};
  let helpersClear = null;
  let tour = [];
  let step = 0;
  let speaking = false;
  let recognition = null;

  function el(html) {
    const d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstElementChild;
  }

  function speak(text) {
    try {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text || '').slice(0, 900));
      u.rate = 1.02;
      speaking = true;
      u.onend = () => { speaking = false; };
      window.speechSynthesis.speak(u);
    } catch (_) {}
  }

  function stopSpeak() {
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (_) {}
    speaking = false;
  }

  async function runActions(actions) {
    if (!Array.isArray(actions)) return;
    for (const a of actions) {
      if (!a || !a.type) continue;
      if (a.type === 'navigate') {
        if (['client-cockpit', 'client-report', 'client-rights', 'client-tutor', 'client-cancel', 'client-credit', 'client-case', 'client-actions'].includes(a.page)) {
          if (!getState().impersonateClientId) startImpersonating(DEMO_CLIENT.id, DEMO_CLIENT.name);
        } else if (getState().impersonateClientId && !String(a.page).startsWith('client-')) {
          stopImpersonating();
        }
        navigate(a.page, a.data || undefined);
      } else if (a.type === 'impersonate') {
        startImpersonating(a.clientId || DEMO_CLIENT.id, a.name || DEMO_CLIENT.name);
      } else if (a.type === 'exitImpersonate') {
        stopImpersonating();
        navigate('admin-overview');
      } else if (a.type === 'tour') {
        goTour(Number(a.step) || 0);
      } else if (a.type === 'prepare') {
        try {
          await api('/demo/prepare', { method: 'POST', body: JSON.stringify({ loadCase: true }) });
          toast('Sandbox case ready', 'success');
          navigate('client-detail', { clientId: DEMO_CLIENT.id });
        } catch (e) {
          toast(e.message || 'Could not prepare demo case', 'error');
        }
      } else if (a.type === 'convertToSignup') {
        await convertToSignup();
      } else if (a.type === 'openLiveMfsn') {
        openLiveMfsn();
      }
    }
  }

  function renderTourCard() {
    const card = document.getElementById('sf-demo-tour');
    if (!card || !tour.length) return;
    const s = tour[step] || tour[0];
    card.innerHTML = `
      <div class="sf-kicker">Guided tour ${step + 1} / ${tour.length}</div>
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.body)}</p>
      <p class="sf-why"><strong>Why firms buy this:</strong> ${esc(s.whyBuy)}</p>
      <div class="sf-tour-nav">
        <button type="button" data-tour="prev" ${step === 0 ? 'disabled' : ''}>Back</button>
        <button type="button" data-tour="next">${step >= tour.length - 1 ? 'Finish' : 'Next'}</button>
        <button type="button" data-tour="hide">Hide</button>
      </div>`;
    card.querySelector('[data-tour="prev"]').onclick = () => goTour(step - 1);
    card.querySelector('[data-tour="next"]').onclick = () => {
      if (step >= tour.length - 1) { card.classList.add('sf-hidden'); return; }
      goTour(step + 1);
    };
    card.querySelector('[data-tour="hide"]').onclick = () => card.classList.add('sf-hidden');
  }

  function goTour(i) {
    step = Math.max(0, Math.min(tour.length - 1, i));
    const s = tour[step];
    const card = document.getElementById('sf-demo-tour');
    if (card) card.classList.remove('sf-hidden');
    renderTourCard();
    const actions = [];
    if (s.impersonate) actions.push({ type: 'impersonate', clientId: DEMO_CLIENT.id, name: DEMO_CLIENT.name });
    else if (getState().impersonateClientId && !String(s.page).startsWith('client-')) actions.push({ type: 'exitImpersonate' });
    actions.push({ type: 'navigate', page: s.page, data: s.data });
    runActions(actions);
    api('/demo/session', { method: 'PATCH', body: JSON.stringify({ tourStep: step }) }).catch(() => {});
  }

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function addMsg(role, text) {
    const log = document.getElementById('sf-demo-log');
    if (!log) return;
    const row = el(`<div class="sf-msg ${role}"><div>${esc(text)}</div></div>`);
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  }

  async function sendChat(text) {
    const msg = String(text || '').trim();
    if (!msg) return;
    addMsg('user', msg);
    const input = document.getElementById('sf-demo-input');
    if (input) input.value = '';
    addMsg('agent', '…');
    const pending = document.querySelector('#sf-demo-log .sf-msg.agent:last-child div');
    try {
      const d = await api('/demo/agent/chat', { method: 'POST', body: JSON.stringify({ message: msg, page: getState().currentPage }) });
      const reply = d.reply || 'I can walk the tour or open any screen.';
      if (pending) pending.textContent = reply;
      await runActions(d.actions || []);
      speak(reply);
    } catch (e) {
      if (pending) pending.textContent = e.message || 'Agent unavailable — use the tour buttons.';
    }
  }

  async function convertToSignup() {
    try {
      const d = await api('/demo/convert', { method: 'POST', body: '{}' });
      window.location.href = d.registerUrl || '/login?mode=register&from=demo';
    } catch (_) {
      window.location.href = '/login?mode=register&from=demo';
    }
  }

  function openLiveMfsn() {
    const html = `<div class="bg-gray-900 border border-gray-700 rounded-2xl p-5 max-w-md w-full text-left">
      <h3 class="text-white font-display text-lg mb-1">One live MyFreeScoreNow report</h3>
      <p class="text-xs text-gray-400 mb-3">One person, one pull, this demo account only. Partner credentials stay on the server. You supply the member email and MAPIK# token.</p>
      <label class="block text-xs text-gray-400 mb-1">Member email</label>
      <input id="sf-mfsn-email" type="email" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mb-2" />
      <label class="block text-xs text-gray-400 mb-1">Member token (MAPIK#)</label>
      <input id="sf-mfsn-token" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mb-3" />
      <div class="flex gap-2">
        <button data-modal-close class="flex-1 bg-gray-800 text-gray-200 rounded-lg py-2 text-sm">Cancel</button>
        <button id="sf-mfsn-go" class="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold">Pull once</button>
      </div>
    </div>`;
    window._openModal(html, 'sf-mfsn-modal');
    document.getElementById('sf-mfsn-go').onclick = async () => {
      const memberEmail = document.getElementById('sf-mfsn-email').value;
      const memberToken = document.getElementById('sf-mfsn-token').value;
      try {
        const d = await api('/demo/mfsn-live', { method: 'POST', body: JSON.stringify({ memberEmail, memberToken }) });
        toast('Live report imported — opening the client file', 'success');
        document.getElementById('sf-mfsn-modal')?.remove();
        if (typeof helpersClear === 'function') helpersClear();
        navigate('client-detail', { clientId: d.clientId });
        addMsg('agent', d.message || 'Live file is on the client record. Open Violations to see findings generated from that report.');
      } catch (e) {
        toast(e.message || 'Live pull blocked', 'error');
      }
    };
  }

  function mountUi(session) {
    if (document.getElementById('sf-demo-root')) return;
    const root = el(`<div id="sf-demo-root" aria-live="polite">
      <style>
        #sf-demo-root { font-family: Inter, system-ui, sans-serif; }
        #sf-demo-tour, #sf-demo-agent {
          position: fixed; z-index: 80; background: #0b1220; color: #e2e8f0;
          border: 1px solid rgba(37,99,235,.45); border-radius: 16px;
          box-shadow: 0 18px 40px rgba(15,23,42,.45);
        }
        #sf-demo-tour { left: 1rem; bottom: 1.25rem; width: min(380px, calc(100vw - 2rem)); padding: 1rem 1.05rem 0.9rem; }
        #sf-demo-tour.sf-hidden, #sf-demo-agent.sf-hidden { display: none; }
        #sf-demo-tour h3 { font-family: "Space Grotesk", sans-serif; font-size: 1.05rem; margin: 0 0 .4rem; color: #fff; }
        #sf-demo-tour p { margin: 0 0 .65rem; font-size: .85rem; line-height: 1.45; color: #cbd5e1; }
        .sf-kicker { font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: #7dd3fc; font-weight: 700; margin-bottom: .35rem; }
        .sf-why { color: #93c5fd !important; }
        .sf-tour-nav { display: flex; gap: .4rem; }
        .sf-tour-nav button, #sf-demo-agent button, #sf-fab {
          border: 0; border-radius: 8px; padding: .45rem .7rem; font-size: 12px; font-weight: 600; cursor: pointer;
          background: linear-gradient(135deg,#2563eb,#0ea5e9); color: #fff;
        }
        .sf-tour-nav button:disabled { opacity: .4; cursor: not-allowed; }
        .sf-tour-nav [data-tour="hide"], .sf-ghost { background: #1e293b; color: #e2e8f0; }
        #sf-demo-agent { right: 1rem; bottom: 4.5rem; width: min(360px, calc(100vw - 2rem)); display: flex; flex-direction: column; max-height: min(70vh, 520px); }
        #sf-demo-agent header { padding: .75rem .9rem; border-bottom: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center; }
        #sf-demo-agent header strong { font-family: "Space Grotesk", sans-serif; font-size: .9rem; }
        #sf-demo-log { flex: 1; overflow: auto; padding: .7rem .85rem; display: grid; gap: .45rem; }
        .sf-msg { font-size: .8rem; line-height: 1.4; padding: .5rem .6rem; border-radius: 10px; }
        .sf-msg.user { background: #1e3a8a; color: #fff; justify-self: end; max-width: 90%; }
        .sf-msg.agent { background: #111827; border: 1px solid #1e293b; }
        #sf-demo-composer { display: flex; gap: .35rem; padding: .65rem; border-top: 1px solid #1e293b; }
        #sf-demo-input { flex: 1; background: #0f172a; border: 1px solid #334155; color: #fff; border-radius: 8px; padding: .5rem .6rem; font-size: .8rem; }
        #sf-fab {
          position: fixed; right: 1rem; bottom: 1.15rem; z-index: 81;
          width: 52px; height: 52px; border-radius: 16px; font-size: 18px;
        }
        #sf-demo-banner {
          position: sticky; top: 0; z-index: 70;
          background: #1e3a8a; color: #fff; font-size: 12px; padding: .55rem 1rem;
          display: flex; justify-content: space-between; gap: 1rem; align-items: center;
        }
      </style>
      <div id="sf-demo-banner">
        <span>Interactive demo for <strong>${esc(session.businessName || 'your firm')}</strong> · tour + agent · one live MFSN report max</span>
        <span>
          <button type="button" class="sf-ghost" id="sf-show-tour">Tour</button>
          <button type="button" class="sf-ghost" id="sf-live">Live report</button>
          <button type="button" id="sf-convert">Start your organization</button>
        </span>
      </div>
      <aside id="sf-demo-tour"></aside>
      <aside id="sf-demo-agent" class="sf-hidden">
        <header>
          <strong>Demo agent</strong>
          <button type="button" class="sf-ghost" id="sf-agent-close">Close</button>
        </header>
        <div id="sf-demo-log"></div>
        <form id="sf-demo-composer">
          <input id="sf-demo-input" autocomplete="off" placeholder="Ask why this screen matters, or say “show letters”…" />
          <button type="button" id="sf-mic" title="Voice" class="sf-ghost">Mic</button>
          <button type="submit">Send</button>
        </form>
      </aside>
      <button type="button" id="sf-fab" title="Ask the demo agent">?</button>
    </div>`);
    document.body.appendChild(root);

    document.getElementById('sf-show-tour').onclick = () => {
      document.getElementById('sf-demo-tour').classList.remove('sf-hidden');
      renderTourCard();
    };
    document.getElementById('sf-live').onclick = () => openLiveMfsn();
    document.getElementById('sf-convert').onclick = () => convertToSignup();
    document.getElementById('sf-fab').onclick = () => {
      const pane = document.getElementById('sf-demo-agent');
      pane.classList.toggle('sf-hidden');
      if (!pane.classList.contains('sf-hidden') && !document.querySelector('#sf-demo-log .sf-msg')) {
        addMsg('agent', 'Ask me anything about Smart FCRA. I can open violations, generated letters, the client portal, tutors, CROA cancel, or help you pull one live MyFreeScoreNow report. I will not disclose engine internals or promise lawsuit outcomes.');
      }
    };
    document.getElementById('sf-agent-close').onclick = () => document.getElementById('sf-demo-agent').classList.add('sf-hidden');
    document.getElementById('sf-demo-composer').onsubmit = (e) => { e.preventDefault(); sendChat(document.getElementById('sf-demo-input').value); };
    document.getElementById('sf-mic').onclick = () => toggleMic();
    renderTourCard();
  }

  function toggleMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast('Voice input needs Chrome/Edge speech recognition', 'info'); return; }
    if (recognition) { try { recognition.stop(); } catch (_) {} recognition = null; stopSpeak(); return; }
    recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.onresult = (ev) => {
      const said = ev.results[0][0].transcript;
      sendChat(said);
    };
    recognition.onend = () => { recognition = null; };
    recognition.start();
    toast('Listening…', 'info');
  }

  window.SmartFcraDemo = {
    mount(helpers) {
      api = helpers.api;
      toast = helpers.toast || toast;
      getState = helpers.getState;
      navigate = helpers.navigate;
      startImpersonating = helpers.startImpersonating;
      stopImpersonating = helpers.stopImpersonating;
      helpersClear = helpers.clearImpersonate || null;
    },
    async boot(session) {
      mountUi(session || {});
      try {
        await api('/demo/prepare', { method: 'POST', body: JSON.stringify({ loadCase: true }) });
      } catch (_) {}
      try {
        const d = await api('/demo/tour');
        tour = d.steps || [];
      } catch { tour = []; }
      if (tour.length) goTour(session?.tourStep || 0);
    },
  };
})();
