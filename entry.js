(() => {
  'use strict';
  const host = location.hostname.toLowerCase();
  const professional = host === 'adamchettouh.fr' || host === 'www.adamchettouh.fr';
  const destination = new URL(professional ? 'pro.html' : 'perso.html', location.href);
  const query = new URLSearchParams(location.search);
  const language = query.get('lang');
  if (language === 'en' || language === 'fr') destination.searchParams.set('lang', language);
  // Preserve old links, without making the removed sections reachable.
  const hash = location.hash.slice(1);
  const personalTabs = ['home', 'about', 'projects', 'now', 'uses'];
  if (professional) {
    if (hash === 'work' || hash === 'projects') destination.hash = 'projets';
    else if (['profil', 'competences', 'projets', 'contact'].includes(hash)) destination.hash = hash;
  } else if (hash === 'work') destination.hash = 'projects';
  else if (personalTabs.includes(hash)) destination.hash = hash;
  location.replace(destination.pathname + destination.search + destination.hash);
})();
