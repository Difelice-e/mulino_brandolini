/*!
 * cookie-banner — vanilla JS port
 * Same DOM contract (data-cookie-banner="...") as the React version,
 * so styles.example.css works without changes.
 *
 * Usage:
 *   <script src="cookie-banner.vanilla.js" defer></script>
 *   <script>
 *     window.addEventListener('DOMContentLoaded', function() {
 *       CookieBanner.init({
 *         policyUrl: '/cookie-policy.html',
 *         googleConsentMode: false,
 *         cookieAttributes: { domain: '.example.com' },
 *         version: '1',
 *       });
 *     });
 *   </script>
 *
 * Public API:
 *   CookieBanner.init(options) → instance with { acceptAll, rejectAll, savePreferences, openPreferences, closePreferences, get consent }
 *   window.__cookieConsent      → current state object
 *   window.__openCookiePreferences() → re-open the preferences modal (use for footer link)
 *   window event 'cookieconsentchange' (detail = state) → fired on every change
 *
 * If googleConsentMode=true, you also need this snippet in <head>
 * BEFORE any Google tag (GA/GTM/Ads):
 *
 *   <script>
 *     window.dataLayer = window.dataLayer || [];
 *     function gtag(){dataLayer.push(arguments);}
 *     gtag('consent', 'default', {
 *       ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
 *       analytics_storage: 'denied', functionality_storage: 'denied',
 *       personalization_storage: 'denied', security_storage: 'granted',
 *       wait_for_update: 500
 *     });
 *   </script>
 */
(function (window, document) {
  'use strict';

  var DEFAULT_CATEGORIES = [
    {
      key: 'necessary',
      title: 'Necessari',
      description:
        'Cookie tecnici indispensabili al funzionamento del sito (sessione, sicurezza, navigazione). Non richiedono consenso.',
    },
    {
      key: 'preferences',
      title: 'Preferenze',
      description:
        'Memorizzano scelte come lingua, tema o layout per personalizzare la tua esperienza.',
    },
    {
      key: 'analytics',
      title: 'Statistiche',
      description:
        "Raccolgono dati aggregati sull'utilizzo del sito per misurare e migliorare le performance.",
    },
    {
      key: 'marketing',
      title: 'Marketing',
      description:
        "Mostrano annunci pertinenti su questo sito e su piattaforme terze, e ne misurano l'efficacia.",
    },
  ];

  var DEFAULTS = {
    cookieName: 'cookie_consent',
    version: '1',
    cookieAttributes: {},
    googleConsentMode: false,
    categories: DEFAULT_CATEGORIES,
    policyUrl: null,
    bannerTitle: 'Rispettiamo la tua privacy',
    bannerText:
      'Usiamo cookie tecnici e, con il tuo consenso, cookie di preferenze, statistiche e marketing per migliorare il sito. Puoi accettare, rifiutare o personalizzare la scelta.',
    policyLinkLabel: 'Cookie policy',
    acceptLabel: 'Accetta tutto',
    rejectLabel: 'Rifiuta tutto',
    customizeLabel: 'Personalizza',
    saveLabel: 'Salva preferenze',
    preferencesTitle: 'Preferenze cookie',
    closeLabel: 'Chiudi',
    alwaysOnLabel: 'Sempre attivi',
    onLabel: 'Attivo',
    offLabel: 'Disattivo',
  };

  var ALL_OFF = { necessary: true, preferences: false, analytics: false, marketing: false };
  var ALL_ON = { necessary: true, preferences: true, analytics: true, marketing: true };

  function readCookie(name) {
    if (typeof document === 'undefined') return null;
    var parts = document.cookie ? document.cookie.split('; ') : [];
    for (var i = 0; i < parts.length; i++) {
      var eq = parts[i].indexOf('=');
      if (eq === -1) continue;
      if (parts[i].slice(0, eq) === name) {
        try {
          return decodeURIComponent(parts[i].slice(eq + 1));
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  }

  function writeCookie(name, value, attrs) {
    attrs = attrs || {};
    var days = typeof attrs.days === 'number' ? attrs.days : 180;
    var expires = new Date(Date.now() + days * 86400 * 1000).toUTCString();
    var path = attrs.path || '/';
    var sameSite = attrs.sameSite || 'Lax';
    var secure =
      typeof attrs.secure === 'boolean'
        ? attrs.secure
        : typeof location !== 'undefined' && location.protocol === 'https:';
    var c =
      name +
      '=' +
      encodeURIComponent(value) +
      '; expires=' +
      expires +
      '; path=' +
      path +
      '; SameSite=' +
      sameSite;
    if (attrs.domain) c += '; domain=' + attrs.domain;
    if (secure) c += '; Secure';
    document.cookie = c;
  }

  function pushGtagConsent(state) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('consent', 'update', {
      ad_storage: state.marketing ? 'granted' : 'denied',
      ad_user_data: state.marketing ? 'granted' : 'denied',
      ad_personalization: state.marketing ? 'granted' : 'denied',
      analytics_storage: state.analytics ? 'granted' : 'denied',
      functionality_storage: state.preferences ? 'granted' : 'denied',
      personalization_storage: state.preferences ? 'granted' : 'denied',
      security_storage: 'granted',
    });
  }

  function dispatchChange(state) {
    window.__cookieConsent = state;
    try {
      window.dispatchEvent(new CustomEvent('cookieconsentchange', { detail: state }));
    } catch (e) {
      // IE fallback
      var ev = document.createEvent('CustomEvent');
      ev.initCustomEvent('cookieconsentchange', false, false, state);
      window.dispatchEvent(ev);
    }
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function bannerHtml(opts) {
    var policy = opts.policyUrl
      ? ' <a href="' +
        escapeHtml(opts.policyUrl) +
        '" data-cookie-banner="link" target="_blank" rel="noopener noreferrer">' +
        escapeHtml(opts.policyLinkLabel) +
        '</a>'
      : '';
    return (
      '<div role="dialog" aria-live="polite" aria-label="' +
      escapeHtml(opts.bannerTitle) +
      '" data-cookie-banner="banner">' +
      '<div data-cookie-banner="content">' +
      '<h2 data-cookie-banner="heading">' +
      escapeHtml(opts.bannerTitle) +
      '</h2>' +
      '<p data-cookie-banner="text">' +
      escapeHtml(opts.bannerText) +
      policy +
      '</p>' +
      '</div>' +
      '<div data-cookie-banner="actions">' +
      '<button type="button" data-cookie-banner="action" data-action="reject">' +
      escapeHtml(opts.rejectLabel) +
      '</button>' +
      '<button type="button" data-cookie-banner="action" data-action="customize">' +
      escapeHtml(opts.customizeLabel) +
      '</button>' +
      '<button type="button" data-cookie-banner="action" data-action="accept">' +
      escapeHtml(opts.acceptLabel) +
      '</button>' +
      '</div>' +
      '</div>'
    );
  }

  function modalHtml(opts, draft) {
    var rows = '';
    for (var i = 0; i < opts.categories.length; i++) {
      var cat = opts.categories[i];
      var locked = cat.key === 'necessary';
      var checked = locked || !!draft[cat.key];
      var label = locked ? opts.alwaysOnLabel : checked ? opts.onLabel : opts.offLabel;
      rows +=
        '<div data-cookie-banner="category">' +
        '<div data-cookie-banner="category-header">' +
        '<span data-cookie-banner="category-title">' +
        escapeHtml(cat.title) +
        '</span>' +
        '<label data-cookie-banner="toggle">' +
        '<input type="checkbox" data-cookie-banner="toggle-input" data-key="' +
        escapeHtml(cat.key) +
        '"' +
        (checked ? ' checked' : '') +
        (locked ? ' disabled' : '') +
        '>' +
        '<span data-cookie-banner="toggle-label">' +
        escapeHtml(label) +
        '</span>' +
        '</label>' +
        '</div>' +
        '<p data-cookie-banner="category-desc">' +
        escapeHtml(cat.description) +
        '</p>' +
        '</div>';
    }
    var policyFooter = opts.policyUrl
      ? '<div data-cookie-banner="modal-footer"><a href="' +
        escapeHtml(opts.policyUrl) +
        '" data-cookie-banner="link" target="_blank" rel="noopener noreferrer">' +
        escapeHtml(opts.policyLinkLabel) +
        '</a></div>'
      : '';
    return (
      '<div role="dialog" aria-modal="true" aria-label="' +
      escapeHtml(opts.preferencesTitle) +
      '" data-cookie-banner="modal">' +
      '<div data-cookie-banner="modal-content">' +
      '<header data-cookie-banner="modal-header">' +
      '<h2 data-cookie-banner="modal-title">' +
      escapeHtml(opts.preferencesTitle) +
      '</h2>' +
      '<button type="button" data-cookie-banner="modal-close" aria-label="' +
      escapeHtml(opts.closeLabel) +
      '">' +
      escapeHtml(opts.closeLabel) +
      '</button>' +
      '</header>' +
      '<div data-cookie-banner="categories">' +
      rows +
      '</div>' +
      '<div data-cookie-banner="modal-actions">' +
      '<button type="button" data-cookie-banner="action" data-action="reject">' +
      escapeHtml(opts.rejectLabel) +
      '</button>' +
      '<button type="button" data-cookie-banner="action" data-action="save">' +
      escapeHtml(opts.saveLabel) +
      '</button>' +
      '<button type="button" data-cookie-banner="action" data-action="accept">' +
      escapeHtml(opts.acceptLabel) +
      '</button>' +
      '</div>' +
      policyFooter +
      '</div>' +
      '</div>'
    );
  }

  function init(userOptions) {
    var opts = {};
    var k;
    for (k in DEFAULTS) if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) opts[k] = DEFAULTS[k];
    if (userOptions) {
      for (k in userOptions)
        if (Object.prototype.hasOwnProperty.call(userOptions, k)) opts[k] = userOptions[k];
    }

    var consent = null;
    var showBanner = false;
    var showPreferences = false;
    var draft = { necessary: true, preferences: false, analytics: false, marketing: false };

    var root = document.createElement('div');
    root.setAttribute('data-cookie-banner', 'root');
    document.body.appendChild(root);

    // Read stored consent
    var raw = readCookie(opts.cookieName);
    if (!raw) {
      showBanner = true;
    } else {
      try {
        var rec = JSON.parse(raw);
        if (!rec || rec.v !== opts.version || !rec.c || typeof rec.c.necessary !== 'boolean') {
          showBanner = true;
        } else {
          consent = {
            necessary: true,
            preferences: !!rec.c.preferences,
            analytics: !!rec.c.analytics,
            marketing: !!rec.c.marketing,
          };
          dispatchChange(consent);
          if (opts.googleConsentMode) pushGtagConsent(consent);
        }
      } catch (e) {
        showBanner = true;
      }
    }

    function persist(state) {
      var record = { v: opts.version, t: Date.now(), c: state };
      writeCookie(opts.cookieName, JSON.stringify(record), opts.cookieAttributes);
      consent = state;
      showBanner = false;
      showPreferences = false;
      dispatchChange(consent);
      if (opts.googleConsentMode) pushGtagConsent(consent);
      render();
    }

    function acceptAll() {
      persist({ necessary: true, preferences: true, analytics: true, marketing: true });
    }
    function rejectAll() {
      persist({ necessary: true, preferences: false, analytics: false, marketing: false });
    }
    function savePreferences(sel) {
      var s = { necessary: true, preferences: false, analytics: false, marketing: false };
      if (sel) {
        if (sel.preferences) s.preferences = true;
        if (sel.analytics) s.analytics = true;
        if (sel.marketing) s.marketing = true;
      }
      persist(s);
    }
    function openPreferences() {
      showPreferences = true;
      draft = consent
        ? {
            necessary: true,
            preferences: !!consent.preferences,
            analytics: !!consent.analytics,
            marketing: !!consent.marketing,
          }
        : { necessary: true, preferences: false, analytics: false, marketing: false };
      render();
    }
    function closePreferences() {
      showPreferences = false;
      render();
    }

    function render() {
      var html = '';
      if (showBanner && !showPreferences) html += bannerHtml(opts);
      if (showPreferences) html += modalHtml(opts, draft);
      root.innerHTML = html;
      bindEvents();
    }

    function bindEvents() {
      var actions = root.querySelectorAll('[data-cookie-banner="action"]');
      for (var i = 0; i < actions.length; i++) {
        actions[i].addEventListener('click', onActionClick);
      }
      var closeBtn = root.querySelector('[data-cookie-banner="modal-close"]');
      if (closeBtn) closeBtn.addEventListener('click', closePreferences);
      var modal = root.querySelector('[data-cookie-banner="modal"]');
      if (modal) {
        modal.addEventListener('click', function (e) {
          if (e.target === modal) closePreferences();
        });
      }
      var inputs = root.querySelectorAll('[data-cookie-banner="toggle-input"]');
      for (var j = 0; j < inputs.length; j++) {
        inputs[j].addEventListener('change', onToggleChange);
      }
    }

    function onActionClick(e) {
      var action = e.currentTarget.getAttribute('data-action');
      if (action === 'accept') acceptAll();
      else if (action === 'reject') rejectAll();
      else if (action === 'customize') openPreferences();
      else if (action === 'save') savePreferences(draft);
    }

    function onToggleChange(e) {
      var key = e.currentTarget.getAttribute('data-key');
      if (!key || key === 'necessary') return;
      draft[key] = e.currentTarget.checked;
      // Update only the visible label, no full re-render (preserves scroll/focus)
      var label = e.currentTarget.parentNode.querySelector('[data-cookie-banner="toggle-label"]');
      if (label) label.textContent = draft[key] ? opts.onLabel : opts.offLabel;
    }

    function onKeydown(e) {
      if (e.key === 'Escape' && showPreferences) closePreferences();
    }

    document.addEventListener('keydown', onKeydown);

    window.__openCookiePreferences = openPreferences;

    render();

    return {
      acceptAll: acceptAll,
      rejectAll: rejectAll,
      savePreferences: savePreferences,
      openPreferences: openPreferences,
      closePreferences: closePreferences,
      get consent() {
        return consent;
      },
    };
  }

  /** Standalone helper for guarding tag injection in plain JS. */
  function readConsent(cookieName) {
    var raw = readCookie(cookieName || 'cookie_consent');
    if (!raw) return null;
    try {
      var rec = JSON.parse(raw);
      if (!rec || !rec.c) return null;
      return {
        necessary: true,
        preferences: !!rec.c.preferences,
        analytics: !!rec.c.analytics,
        marketing: !!rec.c.marketing,
      };
    } catch (e) {
      return null;
    }
  }

  window.CookieBanner = { init: init, readConsent: readConsent };
})(window, document);
