(() => {
  'use strict';

  const root = document.documentElement;
  const page = document.body.dataset.page;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* Storage is optional. */ } }
  };
  const params = new URLSearchParams(location.search);
  const preferredLanguage = params.get('lang') || storage.get('siteLang');
  let language = ['en', 'fr'].includes(preferredLanguage) ? preferredLanguage : (location.hostname.endsWith('adamchettouh.fr') ? 'fr' : 'en');
  let theme = storage.get('portfolioTheme') === 'light' ? 'light' : 'dark';
  const tr = (en, fr) => language === 'fr' ? fr : en;
  const email = 'adamchettouh63@gmail.com';
  const discordId = '853310319002517524';
  const apiBase = window.GB_API_BASE || '';
  // The existing OAuth callback may return to the domain root, not perso.html.
  if (page !== 'personal' && params.has('auth')) {
    const destination = new URL('perso.html', location.href);
    destination.searchParams.set('lang', language);
    destination.searchParams.set('auth', params.get('auth') === 'ok' ? 'ok' : 'error');
    destination.hash = 'guestbook';
    location.replace(destination);
    return;
  }
  if (page === 'home' && ['about', 'now', 'uses', 'friends', 'guestbook', 'work', 'projects'].includes(location.hash.slice(1))) {
    location.replace(`perso.html?lang=${language}${location.hash === "#work" ? "#projects" : location.hash}`);
    return;
  }
  let activeProject = null;
  let galleryIndex = 0;
  let presence = null;
  let commitData = null;
  let commitsLoading = false;
  let guestData = null;
  let guestLoading = false;
  let guestAvailable = false;
  let posting = false;
  let toastTimer;

  const projects = {
    hotu: {
      title: ['Heart of the Unreturned', 'Heart of the Unreturned'],
      type: ['Game / team project', 'Jeu / projet en équipe'],
      description: ['A Roblox parkour fan game inspired by Abyss World. Built with a small team, with momentum-based movement and different zones to explore. My contribution has mainly been finding and fixing bugs.', 'Un jeu de parkour Roblox inspiré d’Abyss World. Créé en petite équipe, avec un système d’élan et plusieurs zones à explorer. Ma contribution porte surtout sur la recherche et la correction de bugs.'],
      details: [['Momentum and checkpoint systems', 'Systèmes d’élan et de checkpoints'], ['Multiple environments and terrain themes', 'Plusieurs environnements et types de terrain'], ['Still in development', 'Toujours en développement']],
      images: ['images/hotu1.png', 'images/hotu2.png', 'images/hotu3.png', 'images/hotu4.png'],
      imageLabel: ['Game screenshot', 'Capture du jeu'],
      stack: 'Lua · Roblox',
      href: 'https://www.roblox.com/games/132429881613824/ABYSS-WORLD-HOTU',
      link: ['Play on Roblox ↗', 'Jouer sur Roblox ↗']
    },
    client: {
      title: ['Client Portfolio', 'Client Portfolio'],
      type: ['Web / client work', 'Web / projet client'],
      description: ['A complete portfolio for a creative client who wanted to manage their own content. I built the site and a custom PHP CMS, including an admin panel, a project gallery, and image and video management. Identifying details are redacted in the screenshots.', 'Un portfolio complet pour un client créatif qui souhaitait gérer son contenu en autonomie. J’ai créé le site et un CMS PHP sur mesure : administration, galerie de projets, gestion des images et des vidéos. Les informations personnelles sont masquées sur les captures.'],
      details: [['Authenticated admin panel with session management', 'Administration authentifiée avec gestion des sessions'], ['Editable projects, content, and theme', 'Projets, contenu et thème modifiables'], ['Cloudinary integration for images and video', 'Intégration Cloudinary pour les images et vidéos']],
      images: ['images/showcase-1.png', 'images/showcase-2.png', 'images/showcase-3.png'],
      imageLabel: ['Redacted client portfolio screenshot', 'Capture anonymisée du portfolio client'],
      stack: 'PHP · JavaScript · Cloudinary',
      href: 'https://github.com/aexdm/client-portfolio',
      link: ['View on GitHub ↗', 'Voir sur GitHub ↗']
    },
    site: {
      title: ['This corner of the internet', 'Mon coin d’internet'],
      type: ['Web / personal project', 'Web / projet personnel'],
      description: ['The site you’re on. A place to collect my work and experiment with design and code. It uses plain HTML, CSS, and JavaScript, with Cloudflare Pages Functions for the guestbook and Discord authentication. This screenshot shows an earlier design.', 'Le site que vous visitez. Un endroit pour regrouper mes projets et expérimenter avec le design et le code. Il utilise HTML, CSS et JavaScript, avec Cloudflare Pages Functions pour le livre d’or et l’authentification Discord. La capture montre une ancienne version.'],
      details: [['Persistent guestbook with guest posting and optional Discord sign-in', 'Livre d’or persistant, avec connexion Discord facultative'], ['Server-side admin moderation and rate limiting', 'Modération et limitation des requêtes côté serveur'], ['Live Discord presence, GitHub activity, and keyboard navigation', 'Présence Discord, activité GitHub et navigation au clavier']],
      images: ['images/showcase-perso1.png'],
      imageLabel: ['Earlier website design', 'Ancienne version du site'],
      stack: 'HTML · CSS · JavaScript · Cloudflare D1',
      href: 'https://github.com/aexdm/angxl.dev.hub',
      link: ['View on GitHub ↗', 'Voir sur GitHub ↗']
    },
    seraph: {
      title: ['Seraph', 'Seraph'],
      type: ['Windows / personal tool', 'Windows / outil personnel'],
      description: ['A desktop profile switcher for moving between work, focus, and downtime. Each profile can open its own apps and URLs, and can be triggered with a hotkey or a voice command. This is a private project.', 'Un outil pour passer entre des profils de travail, de concentration et de détente. Chaque profil peut ouvrir ses applications et ses liens, avec un raccourci clavier ou une commande vocale. C’est un projet privé.'],
      details: [['Work, chill, focus, and sleep profiles', 'Profils travail, détente, concentration et sommeil'], ['Configurable apps, URLs, and keyboard shortcuts', 'Applications, liens et raccourcis configurables'], ['French and English voice commands', 'Commandes vocales en français et en anglais']],
      images: ['images/panic-1.png'],
      imageLabel: ['Seraph cover artwork', 'Illustration de couverture de Seraph'],
      stack: 'Python · Flask · Windows',
      href: null,
      link: ['Private project', 'Projet privé']
    },
    bot: {
      title: ['Utility Bot', 'Utility Bot'],
      type: ['Python / automation', 'Python / automatisation'],
      description: ['A small Python bot for scheduled maintenance, channel housekeeping, and moderation helpers. Config-driven workflows take care of repetitive tasks.', 'Un petit bot Python pour la maintenance planifiée, le nettoyage de canaux et l’aide à la modération. Des tâches configurables prennent en charge les actions répétitives.'],
      details: [['Scheduled maintenance tasks', 'Tâches de maintenance planifiées'], ['API integrations and configurable workflows', 'Intégrations API et tâches configurables']],
      images: [],
      imageLabel: ['', ''],
      stack: 'Python · APIs',
      href: 'https://github.com/aexdm/nigbot',
      link: ['View on GitHub ↗', 'Voir sur GitHub ↗']
    }
  };
  const translated = (pair) => pair[language === 'fr' ? 1 : 0];

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function setTheme(value) {
    theme = value === 'light' ? 'light' : 'dark';
    root.dataset.theme = theme;
    storage.set('portfolioTheme', theme);
    $('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#161518' : '#f5f5f4');
    $$('[data-theme-toggle]').forEach(button => {
      button.textContent = theme === 'dark' ? tr('Light theme', 'Thème clair') : tr('Dark theme', 'Thème sombre');
      button.hidden = false;
    });
  }

  function setLanguage(value) {
    if (!['en', 'fr'].includes(value)) return;
    language = value;
    root.lang = language;
    window.currentLang = language;
    storage.set('siteLang', language);
    // Persist the explicit choice in this URL, even when storage is disabled.
    const currentUrl = new URL(location.href);
    if (currentUrl.searchParams.has('lang')) {
      currentUrl.searchParams.set('lang', language);
      history.replaceState(history.state, '', currentUrl);
    }
    $$('[data-en][data-fr]').forEach(node => { node.textContent = node.dataset[language]; });
    $$('[data-alt-en][data-alt-fr]').forEach(node => { node.alt = node.getAttribute(`data-alt-${language}`); });
    const navigationLabels = { '.primary-nav': ['Main navigation', 'Navigation principale'], '.personal-nav': ['Personal pages', 'Pages personnelles'], '.filters': ['Filter projects', 'Filtrer les projets'] };
    Object.entries(navigationLabels).forEach(([selector, labels]) => $(selector)?.setAttribute('aria-label', translated(labels)));
    const filterStatus = $('#filter-status');
    if (filterStatus?.textContent) updateFilterCount();
    $$('[data-lang]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.lang === language)));
    $$('a[href]').forEach(link => {
      const raw = link.getAttribute('href');
      if (!raw || raw.startsWith('#')) return;
      const url = new URL(raw, location.href);
      if (url.origin === location.origin && /\/(index|perso|pro)\.html$/.test(url.pathname)) {
        url.searchParams.set('lang', language);
        link.setAttribute('href', url.pathname + url.search + url.hash);
      }
    });
    const titles = {
      home: ['Adam — choose your space', 'Adam — choisis ton espace'],
      personal: ['A little more about Adam — aidenhub.dev', 'Un peu plus sur Adam — aidenhub.dev'],
      profile: ['Adam — developer profile', 'Adam — profil développeur']
    };
    document.title = translated(titles[page] || titles.home);
    setTheme(theme);
    renderPresence();
    if (commitData) renderCommits();
    if (guestData) { renderGuestAuth(); renderGuestEntries(); }
    if (activeProject) renderProject();
    if ($('#command-dialog')?.open) renderCommands();
    if ($('#shortcut-dialog')?.open) renderShortcuts();
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: language } }));
  }
  window.setLang = setLanguage;

  function toast(message) {
    let box = $('#site-toast');
    if (!box) {
      box = element('div', 'toast');
      box.id = 'site-toast';
      box.setAttribute('role', 'status');
      document.body.append(box);
    }
    box.textContent = message;
    box.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { box.hidden = true; }, 3200);
  }
  window.toast = toast;

  function makeDialog(id, label) {
    const dialog = element('dialog', 'dialog');
    dialog.id = id;
    dialog.setAttribute('aria-label', label);
    const header = element('div', 'dialog-header');
    header.append(element('p', 'dialog-caption'));
    const close = element('button', 'close-button', 'Close ×');
    close.type = 'button';
    close.dataset.en = 'Close ×';
    close.dataset.fr = 'Fermer ×';
    close.addEventListener('click', () => dialog.close());
    header.append(close);
    dialog.append(header, element('div', 'dialog-body'));
    document.body.append(dialog);
    return dialog;
  }

  function openDialog(dialog) {
    $$('dialog[open]').forEach(other => { if (other !== dialog) other.close(); });
    dialog.querySelector('.close-button').textContent = tr('Close ×', 'Fermer ×');
    if (!dialog.open) dialog.showModal();
  }

  function renderProject() {
    const data = projects[activeProject];
    const dialog = $('#project-dialog');
    if (!data || !dialog) return;
    dialog.querySelector('.dialog-caption').textContent = translated(data.type);
    dialog.querySelector('.close-button').textContent = tr('Close ×', 'Fermer ×');
    const body = dialog.querySelector('.dialog-body');
    body.replaceChildren();
    if (data.images.length) {
      const img = element('img', 'dialog-image');
      img.src = data.images[galleryIndex];
      img.alt = `${translated(data.imageLabel)} ${galleryIndex + 1} / ${data.images.length}`;
      img.addEventListener('error', () => {
        img.hidden = true;
        const error = element('p', 'empty-state', tr('This image could not be loaded.', 'Cette image n’a pas pu être chargée.'));
        body.prepend(error);
      }, { once: true });
      body.append(img);
      if (data.images.length > 1) {
        const gallery = element('div', 'gallery-nav');
        const previous = element('button', '', tr('← Previous', '← Précédente'));
        const next = element('button', '', tr('Next →', 'Suivante →'));
        previous.type = next.type = 'button';
        const count = element('output', '', `${galleryIndex + 1} / ${data.images.length}`);
        count.setAttribute('aria-live', 'polite');
        const change = delta => {
          galleryIndex = (galleryIndex + delta + data.images.length) % data.images.length;
          img.hidden = false;
          body.querySelector('.empty-state')?.remove();
          img.src = data.images[galleryIndex];
          img.alt = `${translated(data.imageLabel)} ${galleryIndex + 1} / ${data.images.length}`;
          count.textContent = `${galleryIndex + 1} / ${data.images.length}`;
        };
        previous.addEventListener('click', () => change(-1));
        next.addEventListener('click', () => change(1));
        gallery.append(previous, count, next);
        body.append(gallery);
      }
    }
    const heading = element('h2', '', translated(data.title));
    heading.id = 'project-dialog-title';
    dialog.setAttribute('aria-labelledby', heading.id);
    body.append(heading, element('p', '', translated(data.description)));
    const list = element('ul', 'project-detail-list');
    data.details.forEach(detail => list.append(element('li', '', translated(detail))));
    body.append(list);
    const bottom = element('div', 'dialog-bottom');
    bottom.append(element('span', '', data.stack));
    if (data.href) {
      const link = element('a', 'button', translated(data.link));
      link.href = data.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      bottom.append(link);
    } else bottom.append(element('p', '', translated(data.link)));
    body.append(bottom);
  }

  function openProject(id) {
    if (!projects[id] || typeof HTMLDialogElement === 'undefined') return false;
    let dialog = $('#project-dialog');
    if (!dialog) {
      dialog = makeDialog('project-dialog', tr('Project details', 'Détails du projet'));
      dialog.addEventListener('close', () => { activeProject = null; });
    }
    activeProject = id;
    galleryIndex = 0;
    renderProject();
    openDialog(dialog);
    return true;
  }

  function navigatePersonal(section) {
    if (page === 'personal') {
      if (location.hash === `#${section}`) showPersonalSection(true);
      else location.hash = section;
    } else location.href = `perso.html?lang=${language}#${section}`;
  }

  function showPersonalSection(focus = false) {
    if (page !== 'personal') return;
    const names = ['home', 'about', 'projects', 'now', 'uses', 'friends', 'guestbook'];
    const hash = location.hash.slice(1);
    const section = names.includes(hash) ? hash : 'home';
    $$('.personal-panel').forEach(panel => { panel.hidden = panel.id !== section; });
    $$('.personal-nav a').forEach(link => {
      if (link.hash === `#${section}`) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    const active = document.getElementById(section);
    if (focus) active.focus({ preventScroll: true });
    if (section === 'now' && !commitData) loadCommits();
    if (section === 'guestbook') loadGuestbook();
    $$('.primary-nav a').forEach(link => {
      const current = section === 'guestbook' ? link.hash === '#guestbook' : link.pathname.endsWith('/perso.html') && !link.hash;
      if (current) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  async function fetchJson(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      let data;
      try { data = await response.json(); } catch { throw new Error('Invalid server response'); }
      if (!response.ok) {
        const error = new Error(data?.error || 'Request failed');
        error.status = response.status;
        throw error;
      }
      return data;
    } finally { clearTimeout(timeout); }
  }

  function renderPresence() {
    const states = { online: ['Online on Discord', 'En ligne sur Discord'], idle: ['Away on Discord', 'Absent sur Discord'], dnd: ['Do not disturb', 'Ne pas déranger'], offline: ['Offline on Discord', 'Hors ligne sur Discord'] };
    const label = presence && states[presence.discord_status] ? translated(states[presence.discord_status]) : tr('Discord status unavailable', 'Statut Discord indisponible');
    $$('[data-presence]').forEach(node => { node.textContent = label; });
    const avatar = $('#profile-avatar');
    if (avatar && presence?.discord_user?.avatar) {
      const user = presence.discord_user;
      // Use the known account ID and only an actual Discord avatar hash.
      if (/^[a-zA-Z0-9_]+$/.test(user.avatar)) {
        const src = `https://cdn.discordapp.com/avatars/${discordId}/${user.avatar}.png?size=128`;
        if (avatar.querySelector('img')?.src !== src) {
          const img = element('img');
          img.alt = '';
          img.src = src;
          img.addEventListener('error', () => { avatar.textContent = 'a.'; }, { once: true });
          avatar.replaceChildren(img);
        }
      }
    }
    const music = $('#now-playing');
    if (!music) return;
    music.hidden = !presence?.spotify;
    music.replaceChildren();
    if (presence?.spotify) {
      const song = presence.spotify;
      const content = element('div');
      const label = element('a', '', song.song || tr('Listening to Spotify', 'Écoute Spotify'));
      if (/^[a-zA-Z0-9]+$/.test(song.track_id || '')) {
        label.href = `https://open.spotify.com/track/${song.track_id}`;
        label.target = '_blank';
        label.rel = 'noopener noreferrer';
      }
      content.append(label, element('p', '', song.artist || ''));
      music.append(content);
    }
  }

  async function loadPresence() {
    if (page !== 'personal' || document.hidden) return;
    try {
      const response = await fetchJson(`https://api.lanyard.rest/v1/users/${discordId}`);
      presence = response.success ? response.data : null;
    } catch { presence = null; }
    renderPresence();
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(language, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  }

  function renderCommits() {
    const target = $('#commits');
    if (!target || !commitData) return;
    const list = element('ul', 'commit-list');
    commitData.forEach(commit => {
      const item = element('li');
      const message = String(commit.commit?.message || '').split('\n')[0];
      const anchor = element('a', '', message);
      // Avoid trusting URLs from external API responses.
      if (/^[a-f0-9]{40}$/i.test(commit.sha || '')) anchor.href = `https://github.com/aexdm/angxl.dev.hub/commit/${commit.sha}`;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      const date = commit.commit?.author?.date;
      const time = element('time', '', formatDate(date));
      if (date) time.dateTime = date;
      item.append(anchor, time);
      list.append(item);
    });
    target.replaceChildren(commitData.length ? list : element('p', 'empty-state', tr('No recent commits.', 'Pas de commits récents.')));
  }

  function showLoadError(target, message, retry) {
    const box = element('div', 'empty-state');
    const text = element('p', '', translated(message));
    text.dataset.en = message[0];
    text.dataset.fr = message[1];
    box.append(text);
    const button = element('button', 'retry-button', tr('Try again', 'Réessayer'));
    button.dataset.en = 'Try again';
    button.dataset.fr = 'Réessayer';
    button.type = 'button';
    button.addEventListener('click', retry);
    box.append(button);
    target.replaceChildren(box);
  }

  function updateFilterCount() {
    const count = $$('.project[data-category]').filter(project => !project.hidden).length;
    $('#filter-status').textContent = tr(`${count} project${count === 1 ? '' : 's'} shown`, `${count} projet${count === 1 ? '' : 's'} affiché${count === 1 ? '' : 's'}`);
  }

  async function loadCommits() {
    if (commitsLoading || !$('#commits')) return;
    commitsLoading = true;
    try {
      const data = await fetchJson('https://api.github.com/repos/aexdm/angxl.dev.hub/commits?per_page=4');
      if (!Array.isArray(data)) throw new Error('Invalid commits');
      commitData = data;
      renderCommits();
    } catch {
      showLoadError($('#commits'), ['GitHub activity is unavailable right now.', 'L’activité GitHub est indisponible pour le moment.'], loadCommits);
    } finally { commitsLoading = false; }
  }

  function enableGuestForm(enabled) {
    guestAvailable = enabled;
    $$('#guest-form input, #guest-form textarea, #guest-submit').forEach(control => { control.disabled = !enabled || posting; });
  }

  function renderGuestAuth() {
    const target = $('#guest-auth');
    if (!target || !guestData) return;
    const me = guestData.me;
    $('#guest-name-field').hidden = !!me;
    $('#guest-name').required = !me;
    if (me) {
      const name = element('span', '', `${tr('Signed in as', 'Connecté en tant que')} ${me.global_name || me.username || ''}`);
      const logout = element('button', '', tr('Sign out', 'Déconnexion'));
      logout.type = 'button';
      logout.addEventListener('click', async () => {
        logout.disabled = true;
        try {
          await fetchJson(`${apiBase}/api/auth/logout`, { method: 'POST', credentials: 'include' });
          guestData.me = null;
          renderGuestAuth();
          renderGuestEntries();
          document.dispatchEvent(new CustomEvent('portfolio:signout'));
        } catch { logout.disabled = false; toast(tr('Could not sign out. Try again.', 'Déconnexion impossible. Réessayez.')); }
      });
      target.replaceChildren(name, logout);
    } else {
      const link = element('a', '', tr('Sign in', 'Connexion'));
      link.id = 'discord-login';
      link.href = `${apiBase}/api/auth/discord/login`;
      target.replaceChildren(element('span', '', tr('Or use your Discord account', 'Ou utilisez votre compte Discord')), link);
    }
  }

  function renderGuestEntries() {
    const target = $('#guest-entries');
    if (!target || !guestData) return;
    const entries = Array.isArray(guestData.entries) ? guestData.entries : [];
    if (!entries.length) {
      target.replaceChildren(element('p', 'empty-state', tr('No messages yet. Yours could be the first.', 'Pas encore de messages. Le vôtre pourrait être le premier.')));
      return;
    }
    const fragment = document.createDocumentFragment();
    entries.forEach(entry => {
      const article = element('article', 'guest-entry');
      const header = element('header');
      const name = element('h3', '', entry.username || tr('Visitor', 'Visiteur'));
      const time = element('time', '', formatDate(entry.created_at));
      if (entry.created_at) time.dateTime = entry.created_at;
      header.append(name, time);
      article.append(header, element('p', '', entry.message || ''));
      if (guestData.me?.is_admin && Number.isInteger(entry.id)) {
        const button = element('button', 'guest-delete', tr('Delete message', 'Supprimer le message'));
        button.type = 'button';
        button.addEventListener('click', async () => {
          if (!window.confirm(tr('Delete this guestbook message?', 'Supprimer ce message du livre d’or ?'))) return;
          button.disabled = true;
          try {
            await fetchJson(`${apiBase}/api/guestbook/${entry.id}`, { method: 'DELETE', credentials: 'include' });
            guestData.entries = guestData.entries.filter(item => item.id !== entry.id);
            renderGuestEntries();
          } catch { button.disabled = false; toast(tr('Could not delete the message.', 'Impossible de supprimer ce message.')); }
        });
        article.append(button);
      }
      fragment.append(article);
    });
    target.replaceChildren(fragment);
  }

  async function loadGuestbook() {
    if (guestLoading || posting || !$('#guest-form')) return;
    guestLoading = true;
    try {
      const data = await fetchJson(`${apiBase}/api/guestbook?limit=50`, { credentials: 'include' });
      if (!Array.isArray(data.entries)) throw new Error('Invalid guestbook response');
      guestData = data;
      enableGuestForm(true);
      renderGuestAuth();
      renderGuestEntries();
      if ($('#guest-message-status').dataset.error === 'true') setFormMessage('');
    } catch {
      enableGuestForm(false);
      showLoadError($('#guest-entries'), ['The guestbook can’t be reached right now. Your draft stays here.', 'Le livre d’or est indisponible pour le moment. Votre brouillon reste ici.'], loadGuestbook);
    } finally { guestLoading = false; }
  }

  function setFormMessage(message, error = false) {
    const status = $('#guest-message-status');
    const pair = Array.isArray(message) ? message : [message, message];
    status.dataset.en = pair[0];
    status.dataset.fr = pair[1];
    status.textContent = translated(pair);
    status.dataset.error = String(error);
  }

  async function submitGuestbook(event) {
    event.preventDefault();
    if (posting || !guestAvailable) return;
    const message = $('#guest-message').value.trim();
    const name = $('#guest-name').value.trim();
    if (!message || message.length > 280) {
      setFormMessage(['Write a message between 1 and 280 characters.', 'Écrivez un message entre 1 et 280 caractères.'], true);
      $('#guest-message').focus();
      return;
    }
    if (!guestData?.me && (!name || name.length > 32)) {
      setFormMessage(['Add your name (32 characters maximum).', 'Ajoutez votre nom (32 caractères maximum).'], true);
      $('#guest-name').focus();
      return;
    }
    posting = true;
    enableGuestForm(true);
    setFormMessage(['Posting your message…', 'Envoi de votre message…']);
    try {
      const payload = { message };
      if (!guestData?.me) payload.name = name;
      const response = await fetchJson(`${apiBase}/api/guestbook`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      $('#guest-message').value = '';
      $('#message-count').textContent = '0';
      if (response.entry) {
        guestData.entries = [response.entry, ...guestData.entries];
        renderGuestEntries();
      }
      setFormMessage(['Your message is here. Thanks for stopping by!', 'Votre message est publié. Merci de votre passage !']);
      posting = false;
      await loadGuestbook();
    } catch (error) {
      if (error.status === 401) {
        guestData.me = null;
        renderGuestAuth();
        document.dispatchEvent(new CustomEvent('portfolio:signout'));
        setFormMessage(['Your session expired. Sign in again or add your name.', 'Votre session a expiré. Reconnectez-vous ou ajoutez votre nom.'], true);
      } else if (error.status === 429) setFormMessage(['A few too many messages. Please wait before trying again.', 'Un peu trop de messages. Patientez avant de réessayer.'], true);
      else setFormMessage(['Your message wasn’t posted. Please try again; your draft is still here.', 'Votre message n’a pas été publié. Réessayez : votre brouillon est toujours là.'], true);
    } finally { posting = false; enableGuestForm(guestAvailable); }
  }

  function commandItems() {
    return [
      { label: tr('Selected work', 'Les projets'), key: 'W', run: () => { location.href = `perso.html?lang=${language}#projects`; } },
      { label: tr('About me', 'À propos'), key: 'A', run: () => navigatePersonal('about') },
      { label: tr('What I’m doing now', 'En ce moment'), key: 'N', run: () => navigatePersonal('now') },
      { label: tr('My setup', 'Mon matériel'), key: 'U', run: () => navigatePersonal('uses') },
      { label: tr('Friends', 'Amis'), key: 'F', run: () => navigatePersonal('friends') },
      { label: tr('Guestbook', 'Livre d’or'), key: 'G', run: () => navigatePersonal('guestbook') },
      { label: tr('Professional profile', 'Profil professionnel'), key: '', run: () => { location.href = `pro.html?lang=${language}`; } },
      { label: tr('Copy email address', 'Copier l’adresse e-mail'), key: '', run: async () => { try { await navigator.clipboard.writeText(email); toast(tr('Email copied.', 'Adresse e-mail copiée.')); } catch { toast(email); } } },
      { label: theme === 'dark' ? tr('Use light theme', 'Activer le thème clair') : tr('Use dark theme', 'Activer le thème sombre'), key: '', run: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
      { label: tr('Keyboard shortcuts', 'Raccourcis clavier'), key: '?', run: openShortcuts },
      ...Object.entries(projects).map(([id, data]) => ({ label: translated(data.title), key: '', run: () => openProject(id) })),
      { label: tr('Play a little sound', 'Jouer un petit son'), key: '', run: () => { const sound = new Audio(`sounds/amogus${Math.floor(Math.random() * 3) + 1}.mp3`); sound.volume = .25; sound.play().catch(() => toast(tr('Sound is unavailable.', 'Son indisponible.'))); } }
    ];
  }

  function renderCommands() {
    const list = $('#command-results');
    if (!list) return;
    const query = $('#command-input').value.trim().toLocaleLowerCase(language);
    list.replaceChildren();
    const matches = commandItems().filter(item => item.label.toLocaleLowerCase(language).includes(query));
    matches.forEach(item => {
      const li = element('li');
      const button = element('button', '', item.label);
      button.type = 'button';
      if (item.key) button.append(element('kbd', '', item.key));
      button.addEventListener('click', () => { $('#command-dialog').close(); item.run(); });
      li.append(button);
      list.append(li);
    });
    if (!matches.length) list.append(element('li', 'empty-state', tr('No matches.', 'Aucun résultat.')));
    $('#command-dialog .dialog-caption').textContent = tr('Go to', 'Aller à');
    $('#command-input-label').textContent = tr('Find a page or action', 'Rechercher une page ou une action');
  }

  function openCommands() {
    if (typeof HTMLDialogElement === 'undefined') return;
    let dialog = $('#command-dialog');
    if (!dialog) {
      dialog = makeDialog('command-dialog', tr('Navigation and actions', 'Navigation et actions'));
      dialog.classList.add('command-dialog');
      const body = dialog.querySelector('.dialog-body');
      const label = element('label', '', tr('Find a page or action', 'Rechercher une page ou une action'));
      label.htmlFor = 'command-input';
      label.id = 'command-input-label';
      const input = element('input', 'command-input');
      input.id = 'command-input';
      input.type = 'search';
      input.autocomplete = 'off';
      input.addEventListener('input', renderCommands);
      const list = element('ul', 'command-results');
      list.id = 'command-results';
      body.append(label, input, list);
      dialog.addEventListener('keydown', event => {
        const buttons = [...list.querySelectorAll('button')];
        const index = buttons.indexOf(document.activeElement);
        if (event.key === 'ArrowDown' && buttons.length) { event.preventDefault(); buttons[(index + 1) % buttons.length].focus(); }
        if (event.key === 'ArrowUp' && buttons.length) { event.preventDefault(); if (index <= 0) input.focus(); else buttons[index - 1].focus(); }
        if (event.key === 'Enter' && document.activeElement === input) { event.preventDefault(); buttons[0]?.click(); }
      });
    }
    $('#command-input').value = '';
    renderCommands();
    openDialog(dialog);
    $('#command-input').focus();
  }

  function renderShortcuts() {
    const dialog = $('#shortcut-dialog');
    dialog.querySelector('.dialog-caption').textContent = tr('Keyboard shortcuts', 'Raccourcis clavier');
    const list = element('dl', 'shortcut-list');
    [[tr('Go to a page or action', 'Aller à une page ou une action'), 'Ctrl / ⌘ K'], [tr('Work', 'Projets'), 'W'], [tr('About', 'À propos'), 'A'], [tr('Now', 'En ce moment'), 'N'], [tr('Setup', 'Matériel'), 'U'], [tr('Guestbook', 'Livre d’or'), 'G'], [tr('Close a dialog', 'Fermer une fenêtre'), 'Esc']].forEach(([name, key]) => {
      const row = element('div');
      const dd = element('dd');
      dd.append(element('kbd', '', key));
      row.append(element('dt', '', name), dd);
      list.append(row);
    });
    dialog.querySelector('.dialog-body').replaceChildren(list);
  }

  function openShortcuts() {
    const dialog = $('#shortcut-dialog') || makeDialog('shortcut-dialog', tr('Keyboard shortcuts', 'Raccourcis clavier'));
    dialog.classList.add('command-dialog');
    renderShortcuts();
    openDialog(dialog);
  }

  root.classList.add('js');
  setLanguage(language);
  $$('[data-lang]').forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.lang)));
  $$('[data-theme-toggle]').forEach(button => button.addEventListener('click', () => setTheme(theme === 'dark' ? 'light' : 'dark')));
  $$('[data-command-open]').forEach(button => { button.hidden = false; button.addEventListener('click', openCommands); });
  $$('[data-print]').forEach(button => { button.hidden = false; button.addEventListener('click', () => window.print()); });
  document.addEventListener('click', event => {
    const link = event.target.closest('[data-project]');
    if (link && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      if (openProject(link.dataset.project)) event.preventDefault();
    }
  });
  if ($('.filters')) {
    $('.filters').hidden = false;
    $$('[data-filter]').forEach(button => button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      $$('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      $$('.project[data-category]').forEach(project => {
        project.hidden = filter !== 'all' && project.dataset.category !== filter;
      });
      updateFilterCount();
    }));
  }
  if (page === 'personal') {
    showPersonalSection();
    window.addEventListener('hashchange', () => showPersonalSection(true));
    loadPresence();
    setInterval(() => {
      if (document.hidden) return;
      loadPresence();
      if (!$('#guestbook').hidden) loadGuestbook();
    }, 30000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) loadPresence(); });
    $('#guest-form').addEventListener('submit', submitGuestbook);
    $('#guest-message').addEventListener('input', event => { $('#message-count').textContent = event.target.value.length; });
    $('#guest-message').addEventListener('keydown', event => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); $('#guest-form').requestSubmit(); }
    });
    const auth = params.get('auth');
    if (auth) {
      navigatePersonal('guestbook');
      toast(auth === 'ok' ? tr('Signed in with Discord.', 'Connecté avec Discord.') : tr('Discord sign-in did not complete.', 'La connexion Discord n’a pas abouti.'));
      const url = new URL(location.href);
      url.searchParams.delete('auth');
      history.replaceState(null, '', url);
    }
  }
  document.addEventListener('keydown', event => {
    const editable = event.target.closest('input, textarea, select, [contenteditable="true"]');
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      if (editable && event.target.id !== 'command-input') return;
      event.preventDefault();
      if ($('#command-dialog')?.open) $('#command-dialog').close(); else openCommands();
      return;
    }
    if (editable || event.ctrlKey || event.metaKey || event.altKey || $('dialog[open]')) return;
    const actions = { a: () => navigatePersonal('about'), n: () => navigatePersonal('now'), u: () => navigatePersonal('uses'), f: () => navigatePersonal('friends'), g: () => navigatePersonal('guestbook'), w: () => { location.href = `perso.html?lang=${language}#projects`; }, h: () => { location.href = `index.html?lang=${language}`; }, '?': openShortcuts };
    if (actions[event.key.toLowerCase()]) { event.preventDefault(); actions[event.key.toLowerCase()](); }
  });
})();
