/* RJ brand forms — mount Cloudflare Turnstile and attach token to lead POSTs. */
(function () {
  const SLOT_ID = 'cf-turnstile';

  function ensureSlot() {
    let el = document.getElementById(SLOT_ID);
    if (el) return el;
    const ph = document.querySelector('.turnstile-placeholder');
    if (ph) {
      el = document.createElement('div');
      el.id = SLOT_ID;
      el.className = 'cf-turnstile';
      ph.replaceWith(el);
      return el;
    }
    return null;
  }

  let widgetId = null;
  let siteKey = null;

  window.rjGetTurnstileToken = function () {
    if (!siteKey) return '';
    try {
      if (window.turnstile && widgetId !== null) return window.turnstile.getResponse(widgetId) || '';
    } catch (e) {}
    const input = document.querySelector('input[name="cf-turnstile-response"]');
    return input ? input.value : '';
  };

  async function boot() {
    const slot = ensureSlot();
    if (!slot) return;
    let cfg = { enabled: false, siteKey: null };
    try {
      cfg = await fetch('/api/public/turnstile').then((r) => r.json());
    } catch (e) {}
    if (!cfg.enabled || !cfg.siteKey) {
      slot.innerHTML = '<div class="turnstile-placeholder"><b>Bot check</b> · Turnstile site key not configured on this deployment — submit still works for staff testing.</div>';
      return;
    }
    siteKey = cfg.siteKey;
    slot.innerHTML = '';
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = function () {
      try {
        widgetId = window.turnstile.render(slot, {
          sitekey: siteKey,
          theme: 'light',
          appearance: 'always',
        });
      } catch (e) {}
    };
    document.head.appendChild(s);
  }

  const origFetch = window.fetch;
  window.fetch = function (url, opts) {
    const href = typeof url === 'string' ? url : (url && url.url) || '';
    if (href.indexOf('/api/public/lead/') !== -1 && opts && typeof opts.body === 'string') {
      try {
        const body = JSON.parse(opts.body);
        body.cfTurnstileToken = window.rjGetTurnstileToken();
        opts = Object.assign({}, opts, { body: JSON.stringify(body) });
      } catch (e) {}
    }
    return origFetch.call(this, url, opts);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
