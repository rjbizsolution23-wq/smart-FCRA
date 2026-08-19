/* Smart FCRA production platform guide — logged-in tour + help agent. */
(function () {
  'use strict';

  let api = null;
  let toast = () => {};
  let getState = () => ({});
  let navigate = () => {};
  let startImpersonating = () => {};
  let stopImpersonating = () => {};

  let tour = [];
  let step = 0;
  let progress = { tour_step: 0, tour_completed: 0, tour_dismissed: 0 };
  let mission = '';
  let aiFreeOverride = false;
  let booted = false;

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function el(html) {
    const d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstElementChild;
  }

  function isDedicatedPortalPage(page) {
    const p = String(page || '');
    return p.startsWith('client-') && p !== 'client-detail';
  }

  function isSharedPortalPage(page) {
    const p = String(page || '');
    return p === 'tradelines' || p === 'ai-studio' || p === 'platform-guide';
  }

  async function saveProgress(patch) {
    if (patch.tourStep != null) progress.tour_step = patch.tourStep;
    if (patch.tourCompleted != null) progress.tour_completed = patch.tourCompleted ? 1 : 0;
    if (patch.tourDismissed != null) progress.tour_dismissed = patch.tourDismissed ? 1 : 0;
    try {
      await api('/platform-guide/progress', {
        method: 'PATCH',
        body: JSON.stringify({
          tourStep: progress.tour_step,
          tourCompleted: !!progress.tour_completed,
          tourDismissed: !!progress.tour_dismissed,
        }),
      });
    } catch (_) {}
  }

  async function runActions(actions) {
    if (!Array.isArray(actions)) return;
    for (const a of actions) {
      if (!a || !a.type) continue;
      if (a.type === 'navigate') {
        if (isDedicatedPortalPage(a.page)) {
          const st = getState();
          if (!st.impersonateClientId && st.user?.role !== 'client') {
            const cid = a.data?.clientId || st.pageData?.clientId;
            if (cid) startImpersonating(cid, a.data?.clientName || 'Client preview');
          }
        } else if (!isSharedPortalPage(a.page) && getState().impersonateClientId) {
          stopImpersonating();
        }
        navigate(a.page, a.data || undefined);
      } else if (a.type === 'impersonate') {
        startImpersonating(a.clientId, a.name || 'Client preview');
      } else if (a.type === 'exitImpersonate') {
        stopImpersonating();
        navigate(getState().user?.role === 'client' ? 'client-cockpit' : 'admin-overview');
      } else if (a.type === 'tour') {
        goTour(Number(a.step) || 0);
      }
    }
  }

  function mountUi() {
    if (document.getElementById('sf-guide-root')) return;
    const root = el(`<div id="sf-guide-root" aria-live="polite">
      <style>
        #sf-guide-root { font-family: Inter, system-ui, sans-serif; }
        #sf-guide-tour, #sf-guide-agent {
          position: fixed; z-index: 85; background: #0b1220; color: #e2e8f0;
          border: 1px solid rgba(37,99,235,.45); border-radius: 16px;
          box-shadow: 0 18px 40px rgba(15,23,42,.45);
        }
        #sf-guide-tour { left: 1rem; bottom: 1.25rem; width: min(400px, calc(100vw - 2rem)); padding: 1rem 1.05rem 0.9rem; }
        #sf-guide-tour.sf-hidden, #sf-guide-agent.sf-hidden, #sf-guide-welcome.sf-hidden { display: none; }
        #sf-guide-tour h3 { font-family: "Space Grotesk", sans-serif; font-size: 1.05rem; margin: 0 0 .4rem; color: #fff; }
        #sf-guide-tour p { margin: 0 0 .65rem; font-size: .85rem; line-height: 1.45; color: #cbd5e1; }
        .sf-guide-kicker { font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: #7dd3fc; font-weight: 700; margin-bottom: .35rem; }
        .sf-guide-why { color: #93c5fd !important; }
        .sf-guide-nav { display: flex; flex-wrap: wrap; gap: .4rem; }
        .sf-guide-nav button, #sf-guide-agent button, #sf-guide-fab {
          border: 0; border-radius: 8px; padding: .45rem .7rem; font-size: 12px; font-weight: 600; cursor: pointer;
          background: linear-gradient(135deg,#2563eb,#0ea5e9); color: #fff;
        }
        .sf-guide-nav button:disabled { opacity: .4; cursor: not-allowed; }
        .sf-guide-ghost { background: #1e293b; color: #e2e8f0; }
        #sf-guide-agent { right: 1rem; bottom: 4.5rem; width: min(380px, calc(100vw - 2rem)); display: flex; flex-direction: column; max-height: min(70vh, 520px); }
        #sf-guide-agent header { padding: .75rem .9rem; border-bottom: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center; }
        #sf-guide-agent header strong { font-family: "Space Grotesk", sans-serif; font-size: .9rem; }
        #sf-guide-log { flex: 1; overflow: auto; padding: .7rem .85rem; display: grid; gap: .45rem; }
        .sf-guide-msg { font-size: .8rem; line-height: 1.4; padding: .5rem .6rem; border-radius: 10px; }
        .sf-guide-msg.user { background: #1e3a8a; color: #fff; justify-self: end; max-width: 90%; }
        .sf-guide-msg.agent { background: #111827; border: 1px solid #1e293b; }
        #sf-guide-composer { display: flex; gap: .35rem; padding: .65rem; border-top: 1px solid #1e293b; }
        #sf-guide-input { flex: 1; background: #0f172a; border: 1px solid #334155; color: #fff; border-radius: 8px; padding: .5rem .6rem; font-size: .8rem; }
        #sf-guide-fab {
          position: fixed; right: 1rem; bottom: 1.15rem; z-index: 86;
          width: 52px; height: 52px; border-radius: 16px; font-size: 18px;
        }
        #sf-guide-welcome {
          position: fixed; inset: 0; z-index: 90; background: rgba(2,6,23,.72); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; padding: 1rem;
        }
        #sf-guide-welcome .sf-guide-card {
          max-width: 520px; width: 100%; background: #0b1220; border: 1px solid rgba(56,189,248,.35);
          border-radius: 20px; padding: 1.35rem 1.4rem; color: #e2e8f0;
        }
        #sf-guide-welcome h2 { font-family: "Space Grotesk", sans-serif; color: #fff; margin: 0 0 .5rem; font-size: 1.25rem; }
        #sf-guide-welcome p { font-size: .85rem; line-height: 1.55; color: #cbd5e1; margin: 0 0 .75rem; }
      </style>
      <div id="sf-guide-welcome" class="sf-hidden">
        <div class="sf-guide-card">
          <div class="sf-guide-kicker">Smart FCRA · Help & Guide</div>
          <h2>Welcome — we built this for operators like you</h2>
          <p id="sf-guide-welcome-body"></p>
          <div class="sf-guide-nav">
            <button type="button" id="sf-guide-start">Start guided tour</button>
            <button type="button" id="sf-guide-skip" class="sf-guide-ghost">Skip for now</button>
            <button type="button" id="sf-guide-hub" class="sf-guide-ghost">Open Help & Guide</button>
          </div>
        </div>
      </div>
      <aside id="sf-guide-tour" class="sf-hidden"></aside>
      <aside id="sf-guide-agent" class="sf-hidden">
        <header>
          <strong>Platform guide</strong>
          <button type="button" class="sf-guide-ghost" id="sf-guide-agent-close">Close</button>
        </header>
        <div id="sf-guide-log"></div>
        <form id="sf-guide-composer">
          <input id="sf-guide-input" autocomplete="off" placeholder="Ask where to click or how something works…" />
          <button type="submit">Ask</button>
        </form>
      </aside>
      <button type="button" id="sf-guide-fab" title="Help & Guide — ask anything">?</button>
    </div>`);
    document.body.appendChild(root);

    document.getElementById('sf-guide-fab').onclick = () => {
      const pane = document.getElementById('sf-guide-agent');
      pane.classList.toggle('sf-hidden');
      if (!pane.classList.contains('sf-hidden') && !document.querySelector('#sf-guide-log .sf-guide-msg')) {
        addMsg('agent', 'Ask me where to click in Smart FCRA — violations, letters, Compliance OS, campaigns, integrations, client portal, and more. Open Help & Guide anytime from the sidebar.');
      }
    };
    document.getElementById('sf-guide-agent-close').onclick = () => {
      document.getElementById('sf-guide-agent').classList.add('sf-hidden');
    };
    document.getElementById('sf-guide-composer').onsubmit = (e) => {
      e.preventDefault();
      sendAsk(document.getElementById('sf-guide-input').value);
    };
    document.getElementById('sf-guide-start').onclick = () => {
      document.getElementById('sf-guide-welcome').classList.add('sf-hidden');
      goTour(0);
    };
    document.getElementById('sf-guide-skip').onclick = async () => {
      document.getElementById('sf-guide-welcome').classList.add('sf-hidden');
      await saveProgress({ tourDismissed: true });
      toast('You can restart the tour anytime from Help & Guide', 'info');
    };
    document.getElementById('sf-guide-hub').onclick = () => {
      document.getElementById('sf-guide-welcome').classList.add('sf-hidden');
      navigate('platform-guide');
    };
  }

  function renderTourCard() {
    const card = document.getElementById('sf-guide-tour');
    if (!card || !tour.length) return;
    const s = tour[step] || tour[0];
    card.innerHTML = `
      <div class="sf-guide-kicker">Platform guide ${step + 1} / ${tour.length}</div>
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.body)}</p>
      ${s.whyBuy ? `<p class="sf-guide-why"><strong>Why it matters:</strong> ${esc(s.whyBuy)}</p>` : ''}
      <div class="sf-guide-nav">
        <button type="button" data-tour="prev" ${step === 0 ? 'disabled' : ''}>Back</button>
        <button type="button" data-tour="next">${step >= tour.length - 1 ? 'Finish' : 'Next'}</button>
        <button type="button" data-tour="hub" class="sf-guide-ghost">Help hub</button>
        <button type="button" data-tour="hide" class="sf-guide-ghost">Hide</button>
      </div>`;
    card.querySelector('[data-tour="prev"]').onclick = () => goTour(step - 1);
    card.querySelector('[data-tour="next"]').onclick = async () => {
      if (step >= tour.length - 1) {
        card.classList.add('sf-hidden');
        await saveProgress({ tourStep: step, tourCompleted: true });
        toast('Tour complete — reopen anytime from Help & Guide', 'success');
        return;
      }
      goTour(step + 1);
    };
    card.querySelector('[data-tour="hub"]').onclick = () => navigate('platform-guide');
    card.querySelector('[data-tour="hide"]').onclick = () => card.classList.add('sf-hidden');
  }

  function goTour(i) {
    step = Math.max(0, Math.min(tour.length - 1, i));
    const s = tour[step];
    const card = document.getElementById('sf-guide-tour');
    if (card) card.classList.remove('sf-hidden');
    renderTourCard();
    const st = getState();
    const actions = [];
    if (s.impersonate && st.user?.role !== 'client') {
      actions.push({ type: 'impersonate', clientId: s.data?.clientId, name: s.data?.clientName || 'Client preview' });
    } else if (st.impersonateClientId && !isDedicatedPortalPage(s.page) && !isSharedPortalPage(s.page)) {
      actions.push({ type: 'exitImpersonate' });
    }
    if (s.page && s.page !== 'platform-guide') actions.push({ type: 'navigate', page: s.page, data: s.data });
    else if (s.page === 'platform-guide') navigate('platform-guide');
    runActions(actions);
    saveProgress({ tourStep: step });
  }

  function addMsg(role, text) {
    const log = document.getElementById('sf-guide-log');
    if (!log) return;
    const row = el(`<div class="sf-guide-msg ${role}"><div>${esc(text)}</div></div>`);
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  }

  async function sendAsk(text) {
    const msg = String(text || '').trim();
    if (!msg) return;
    addMsg('user', msg);
    const input = document.getElementById('sf-guide-input');
    if (input) input.value = '';
    addMsg('agent', '…');
    const pending = document.querySelector('#sf-guide-log .sf-guide-msg.agent:last-child div');
    try {
      const d = await api('/platform-guide/ask', { method: 'POST', body: JSON.stringify({ message: msg }) });
      const reply = d.reply || 'Open Help & Guide for the full tour and feedback form.';
      if (pending) {
        pending.textContent = reply + (d.freeOverride ? ' (Free platform AI active for your org.)' : '');
      }
    } catch (e) {
      if (pending) pending.textContent = e.message || 'Guide temporarily unavailable — use Help & Guide page.';
    }
  }

  function showWelcomeIfNeeded() {
    if (progress.tour_completed || progress.tour_dismissed) return;
    const welcome = document.getElementById('sf-guide-welcome');
    const body = document.getElementById('sf-guide-welcome-body');
    if (!welcome || !body) return;
    body.textContent = mission || 'Smart FCRA gives credit operators compliant tools, workflows, and client education — so your team can get the job done without mastering every statute on day one. We love your feedback and read every submission.';
    welcome.classList.remove('sf-hidden');
  }

  window.SmartFcraGuide = {
    mount(helpers) {
      api = helpers.api;
      toast = helpers.toast || toast;
      getState = helpers.getState;
      navigate = helpers.navigate;
      startImpersonating = helpers.startImpersonating || startImpersonating;
      stopImpersonating = helpers.stopImpersonating || stopImpersonating;
    },
    async boot() {
      if (booted || getState().demoSession) return;
      booted = true;
      mountUi();
      try {
        const [tourRes, progRes] = await Promise.all([
          api('/platform-guide/tour'),
          api('/platform-guide/progress'),
        ]);
        tour = tourRes.steps || [];
        mission = tourRes.mission || progRes.mission || '';
        progress = progRes.progress || progress;
        aiFreeOverride = !!progRes.aiFreeOverride;
      } catch (_) {
        tour = [];
      }
      if (!tour.length) return;
      if (!progress.tour_completed && !progress.tour_dismissed) {
        if (progress.tour_step > 0) goTour(progress.tour_step);
        else showWelcomeIfNeeded();
      }
    },
    startTour(fromStep) {
      mountUi();
      goTour(fromStep || 0);
    },
    resumeTour() {
      goTour(progress.tour_step || 0);
    },
    openAsk() {
      mountUi();
      const pane = document.getElementById('sf-guide-agent');
      if (pane) pane.classList.remove('sf-hidden');
    },
    getProgress() {
      return { ...progress, aiFreeOverride, mission, stepCount: tour.length };
    },
    ask: sendAsk,
  };
})();
