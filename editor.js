// editor.js — admin-only inline page editor backed by D1 (/api/content).
// Visitors automatically see your saved edits. Only the admin sees the edit UI.
(function () {
  'use strict';
  var API = window.GB_API_BASE || '';
  var isAdmin = false;
  var editing = false;
  var overrides = {};

  // ---------- build a stable key for an element ----------
  function elKey(el) {
    if (el.dataset && el.dataset.editKey) return 'k:' + el.dataset.editKey;
    var parts = [];
    var node = el;
    while (node && node.nodeType === 1 && node.tagName !== 'BODY') {
      var i = 1, sib = node;
      while ((sib = sib.previousElementSibling)) {
        if (sib.tagName === node.tagName) i++;
      }
      parts.unshift(node.tagName.toLowerCase() + ':nth-of-type(' + i + ')');
      node = node.parentElement;
    }
    return 'p:' + parts.join('>');
  }

  function findByKey(key) {
    if (key.indexOf('k:') === 0) {
      try { return document.querySelector('[data-edit-key="' + CSS.escape(key.slice(2)) + '"]'); }
      catch (e) { return null; }
    }
    if (key.indexOf('p:') === 0) {
      var sel = 'body > ' + key.slice(2).split('>').join(' > ');
      try { return document.querySelector(sel); } catch (e) { return null; }
    }
    return null;
  }

  // ---------- apply saved edits on load (for everyone) ----------
  function applyOverrides() {
    return fetch(API + '/api/content', { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var o = (data && data.overrides) || {};
        Object.keys(o).forEach(function (key) {
          overrides[key] = o[key];
          var el = findByKey(key);
          if (el) el.textContent = o[key];
        });
      })
      .catch(function () {});
  }

  // ---------- am I the admin? ----------
  function checkAdmin() {
    return fetch(API + '/api/me', { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) { isAdmin = !!(data && data.user && data.user.is_admin); })
      .catch(function () { isAdmin = false; });
  }

  var EDITABLE = { H1:1,H2:1,H3:1,H4:1,H5:1,H6:1,P:1,SPAN:1,A:1,LI:1,BUTTON:1,STRONG:1,EM:1,SMALL:1,BLOCKQUOTE:1,FIGCAPTION:1,LABEL:1,TD:1,TH:1,DIV:1 };
  function isLeafText(el) {
    if (!EDITABLE[el.tagName]) return false;
    if (el.children.length > 0) return false;       // only plain-text leaves
    return (el.textContent || '').trim().length > 0;
  }

  function toast(msg) {
    if (typeof window.toast === 'function') { window.toast(msg); return; }
    var t = document.getElementById('__ed_toast');
    if (!t) {
      t = document.createElement('div');
      t.id = '__ed_toast';
      t.style.cssText = 'position:fixed;bottom:74px;right:20px;background:#111;color:#fff;padding:9px 15px;border-radius:10px;font:600 13px sans-serif;z-index:99999;opacity:0;transition:opacity .2s;box-shadow:0 6px 24px rgba(0,0,0,.4)';
      document.body.appendChild(t);
    }
    t.textContent = msg; t.style.opacity = '1';
    clearTimeout(t._h); t._h = setTimeout(function () { t.style.opacity = '0'; }, 1600);
  }

  function saveEl(el) {
    var key = elKey(el);
    var value = el.textContent;
    overrides[key] = value;
    fetch(API + '/api/content', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: key, value: value })
    }).then(function (r) { return r.json(); })
      .then(function (d) { toast(d && d.ok ? 'saved \u2726' : ((d && d.error) || 'save failed')); })
      .catch(function () { toast('save failed'); });
  }

  function setEditing(on) {
    editing = on;
    document.body.classList.toggle('__ed_on', on);
    var btn = document.getElementById('__ed_btn');
    if (btn) btn.textContent = on ? '\u2713 Done' : '\u270e Edit page';
    if (!on) {
      var live = document.querySelectorAll('[data-ed-target="1"]');
      for (var i = 0; i < live.length; i++) {
        live[i].removeAttribute('contenteditable');
        live[i].removeAttribute('data-ed-target');
      }
    }
  }

  function onClick(e) {
    if (!editing || !isAdmin) return;
    var target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.id === '__ed_btn') return;
    if (!isLeafText(target)) return;
    e.preventDefault();
    e.stopPropagation();
    if (target.getAttribute('contenteditable') === 'true') return;

    target.setAttribute('contenteditable', 'true');
    target.setAttribute('data-ed-target', '1');
    target.focus();
    var range = document.createRange();
    range.selectNodeContents(target);
    var sel = window.getSelection();
    sel.removeAllRanges(); sel.addRange(range);

    function finish(save) {
      target.removeAttribute('contenteditable');
      target.removeAttribute('data-ed-target');
      target.removeEventListener('blur', onBlur);
      target.removeEventListener('keydown', onKey);
      if (save) saveEl(target);
    }
    function onBlur() { finish(true); }
    function onKey(ev) {
      ev.stopPropagation(); // stop site easter-egg shortcuts while typing
      if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); target.blur(); }
      else if (ev.key === 'Escape') { ev.preventDefault(); finish(false); }
    }
    target.addEventListener('blur', onBlur);
    target.addEventListener('keydown', onKey);
  }

  function injectUI() {
    var btn = document.createElement('button');
    btn.id = '__ed_btn';
    btn.type = 'button';
    btn.textContent = '\u270e Edit page';
    btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99998;background:#5865F2;color:#fff;border:none;padding:10px 16px;border-radius:999px;font:600 14px sans-serif;cursor:pointer;box-shadow:0 6px 24px rgba(88,101,242,.5)';
    btn.addEventListener('click', function () { setEditing(!editing); });
    document.body.appendChild(btn);

    var style = document.createElement('style');
    style.textContent =
      'body.__ed_on [contenteditable="true"]{outline:2px solid #5865F2;border-radius:4px;background:rgba(88,101,242,.10)}' +
      'body.__ed_on h1:hover,body.__ed_on h2:hover,body.__ed_on h3:hover,body.__ed_on h4:hover,' +
      'body.__ed_on h5:hover,body.__ed_on h6:hover,body.__ed_on p:hover,body.__ed_on span:hover,' +
      'body.__ed_on li:hover,body.__ed_on a:hover,body.__ed_on blockquote:hover,body.__ed_on small:hover' +
      '{outline:1px dashed rgba(88,101,242,.6);cursor:text}';
    document.head.appendChild(style);
  }

  function init() {
    applyOverrides().then(checkAdmin).then(function () {
      if (isAdmin) {
        injectUI();
        document.addEventListener('click', onClick, true);
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
