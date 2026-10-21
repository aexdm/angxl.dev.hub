(function () {
  var STORAGE_KEY = 'siteLang:personal';

  function getDefaultLang() {
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
    document.querySelectorAll('[data-en][data-fr]').forEach(function(el) { el.textContent = el.getAttribute('data-' + lang); });
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
    var url = new URL(location.href); url.searchParams.set('lang', lang); history.replaceState(null, '', url);
    document.querySelectorAll('a[href]').forEach(function(link) { var raw = link.getAttribute('href'); if (!raw || raw.startsWith('#')) return; var target = new URL(raw, location.href); if (target.origin === location.origin && target.pathname.endsWith('/perso.html')) { target.searchParams.set('lang', lang); link.href = target.pathname + target.search + target.hash; } });
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: lang } }));
  };

  function init() {
    var lang = getStored() || getDefaultLang();
    window.setLang(lang);
  }

  window.langHref = function (base) {
    var l = (function () { try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; } })() || getDefaultLang();
    var target = new URL(base, location.href);
    if (target.pathname.endsWith('/pro.html')) return target.pathname + target.search + target.hash;
    target.searchParams.set('lang', l);
    return target.pathname + target.search + target.hash;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
