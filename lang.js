(function () {
  var STORAGE_KEY = 'siteLang';

  function getDefaultLang() {
    try {
      var h = (window.location.hostname || '').toLowerCase();
      if (h.indexOf('adamchettouh.fr') !== -1) return 'fr';   // new domain -> French
      if (h.indexOf('angxl.pages.dev') !== -1) return 'en';   // perso -> English
    } catch (e) {}
    var d = document.documentElement.getAttribute('data-default-lang');
    return (d === 'fr' || d === 'en') ? d : 'en';
  }

  function getStored() {
    try {
      var u = new URLSearchParams(window.location.search).get('lang');
      if (u === 'fr' || u === 'en') return u;
      var s = localStorage.getItem(STORAGE_KEY);
      if (s === 'fr' || s === 'en') return s;
    } catch (e) {}
    return null;
  }

  function applyTranslations(lang) {
    var dict = window.I18N || {};
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var entry = dict[key];
      if (entry && entry[lang] != null) el.textContent = entry[lang];
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-html');
      var entry = dict[key];
      if (entry && entry[lang] != null) el.innerHTML = entry[lang];
    });
    document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      el.getAttribute('data-i18n-attr').split('|').forEach(function (pair) {
        var p = pair.split(':');
        if (p.length !== 2) return;
        var entry = dict[p[1]];
        if (entry && entry[lang] != null) el.setAttribute(p[0], entry[lang]);
      });
    });
  }

  function syncFlagButtons(lang) {
    document.querySelectorAll('.lang-flag').forEach(function (b) {
      var on = b.getAttribute('data-lang') === lang;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  window.setLang = function (lang) {
    if (lang !== 'fr' && lang !== 'en') return;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    document.documentElement.setAttribute('lang', lang);
    applyTranslations(lang);
    syncFlagButtons(lang);
    window.currentLang = lang;
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: lang } }));
  };

  function init() {
    var lang = getStored() || getDefaultLang();
    window.setLang(lang);
  }

  window.langHref = function (base) {
    var l = (function () { try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; } })() || getDefaultLang();
    return base + (base.indexOf('?') >= 0 ? '&' : '?') + 'lang=' + l;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
