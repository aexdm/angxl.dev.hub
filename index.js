const DISCORD_USER_ID = "853310319002517524";

function switchTab(id) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".mobile-nav-btn").forEach(b => b.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  const btn = document.getElementById("nav-" + id);
  if (btn) btn.classList.add("active");
  const mBtn = document.getElementById("mnav-" + id);
  if (mBtn) mBtn.classList.add("active");
  lucide.createIcons();
}

const STATUS_STYLES = {
  online:  { bg: "rgba(93,186,126,0.12)",  border: "rgba(93,186,126,0.25)",  dot: "#5dba7e", text: "online"  },
  idle:    { bg: "rgba(250,166,26,0.12)",  border: "rgba(250,166,26,0.25)",  dot: "#faa61a", text: "idle"    },
  dnd:     { bg: "rgba(224,92,92,0.12)",   border: "rgba(224,92,92,0.25)",   dot: "#e05c5c", text: "dnd"     },
  offline: { bg: "rgba(128,128,128,0.1)", border: "rgba(128,128,128,0.2)", dot: "#777",    text: "offline" },
};

let ws;
function connectLanyard() {
  if (!DISCORD_USER_ID) return;
  ws = new WebSocket("wss://api.lanyard.rest/socket");
  ws.onopen    = () => ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_USER_ID } }));
  ws.onmessage = e => {
    const msg = JSON.parse(e.data);
    if (msg.op === 1) setInterval(() => ws.readyState === 1 && ws.send(JSON.stringify({ op: 3 })), msg.d.heartbeat_interval);
    if (msg.op === 0) updatePresence(msg.d);
  };
  ws.onclose = () => setTimeout(connectLanyard, 3000);
}

let allActivities = [];
let currentActivityIndex = 0;
let trailEnabled = localStorage.getItem('trail') !== 'false';
let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function resolveImg(raw, appId) {
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  if (raw.startsWith("mp:external/")) return "https://media.discordapp.net/external/" + raw.slice("mp:external/".length);
  if (raw.startsWith("spotify:")) return "https://i.scdn.co/image/" + raw.slice("spotify:".length);
  return `https://cdn.discordapp.com/app-assets/${appId}/${raw}.png`;
}

function buildIconCandidates(act) {
  const id = act.application_id;
  return [
    act.assets?.large_image && resolveImg(act.assets.large_image, id),
    id && `https://cdn.discordapp.com/app-assets/${id}/icon.png`,
    id && `https://cdn.discordapp.com/app-icons/${id}/icon.png`,
    act.assets?.small_image && resolveImg(act.assets.small_image, id),
  ].filter(Boolean);
}

function displayActivity(index) {
  if (!allActivities.length) return;
  currentActivityIndex = Math.max(0, Math.min(index, allActivities.length - 1));
  const act = allActivities[currentActivityIndex];

  const content = document.querySelector(".activity-content");
  content.style.animation = "none";
  setTimeout(() => { content.style.animation = "fadeInActivity 0.3s ease"; }, 10);

  document.getElementById("activityName").textContent  = act.name    || "";
  document.getElementById("activityState").textContent = act.details || act.state || "";

  const icon = document.getElementById("activityIcon");
  const candidates = buildIconCandidates(act);
  const tryNext = (i) => {
    if (i >= candidates.length) { icon.style.visibility = "hidden"; return; }
    icon.style.visibility = "visible";
    icon.onerror = () => tryNext(i + 1);
    icon.src = candidates[i];
  };
  candidates.length ? tryNext(0) : (icon.style.visibility = "hidden");

  document.getElementById("activityPrev").classList.toggle("disabled", currentActivityIndex === 0);
  document.getElementById("activityNext").classList.toggle("disabled", currentActivityIndex === allActivities.length - 1);
  document.getElementById("activityCounter").textContent = `${currentActivityIndex + 1}/${allActivities.length}`;

  lucide.createIcons();
}

function navigateActivity(dir) {
  const next = currentActivityIndex + dir;
  if (next >= 0 && next < allActivities.length) displayActivity(next);
}

function applyDominantColorFromAvatar(imgSrc) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const size = 64;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha < 128) continue; 
      r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
    }
    if (!count) return;
    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);
    const darken = (v, f) => Math.max(0, Math.min(255, Math.round(v * f)));
    const bgR = darken(r, 0.15), bgG = darken(g, 0.15), bgB = darken(b, 0.15);
    const bg2R = darken(r, 0.22), bg2G = darken(g, 0.22), bg2B = darken(b, 0.22);
    const cardR = darken(r, 0.28), cardG = darken(g, 0.28), cardB = darken(b, 0.28);
    const amberR = Math.min(255, r + 40), amberG = Math.min(255, g + 40), amberB = Math.min(255, b + 40);
    const root = document.documentElement;
    root.style.setProperty("--bg",   `rgb(${bgR},${bgG},${bgB})`);
    root.style.setProperty("--bg2",  `rgb(${bg2R},${bg2G},${bg2B})`);
    root.style.setProperty("--card", `rgb(${cardR},${cardG},${cardB})`);
    root.style.setProperty("--card-hover", `rgb(${darken(r,0.35)},${darken(g,0.35)},${darken(b,0.35)})`);
    root.style.setProperty("--border",  `rgba(${r},${g},${b},0.15)`);
    root.style.setProperty("--border2", `rgba(${r},${g},${b},0.28)`);
    root.style.setProperty("--amber",     `rgb(${amberR},${amberG},${amberB})`);
    root.style.setProperty("--amber-dim",  `rgba(${r},${g},${b},0.13)`);
    root.style.setProperty("--amber-dim2", `rgba(${r},${g},${b},0.24)`);
    root.style.setProperty("--banner-tint", `rgba(${r},${g},${b},0.85)`);
  };
  img.src = imgSrc;
}

function updatePresence(d) {
  const u = d.discord_user;
  const avatarEl = document.getElementById("avatarBig");
  const mobileAvatarEl = document.getElementById("mobileAvatar");
  const avatarHash = u.avatar;
  const avatarExt = avatarHash && avatarHash.startsWith("a_") ? "gif" : "png";
  const avatarSrc = avatarHash
    ? `https://cdn.discordapp.com/avatars/${u.id}/${avatarHash}.${avatarExt}?size=256`
    : `https://cdn.discordapp.com/embed/avatars/${(BigInt(u.id) >> 22n) % 6n}.png`;
  if (avatarEl && avatarEl.src !== avatarSrc) {
  avatarEl.src = avatarSrc;
  if ((localStorage.getItem("theme") || "pfp") === "pfp") {
    applyDominantColorFromAvatar(avatarSrc);
  }
}
  if (mobileAvatarEl && mobileAvatarEl.src !== avatarSrc) mobileAvatarEl.src = avatarSrc;
  document.getElementById("username").textContent = u.global_name || u.username;

  const decorEl = document.getElementById("avatarDecoration");
  if (decorEl) {
    const decoData = u.avatar_decoration_data;
    if (decoData && decoData.asset) {
      decorEl.src = `https://cdn.discordapp.com/avatar-decoration-presets/${decoData.asset}.png`;
      decorEl.style.display = "";
    } else {
      decorEl.style.display = "none";
    }
  }

  const guildTagEl  = document.getElementById("guildTag");
  const guildIconEl = document.getElementById("guildIcon");
  const wrapEl      = document.getElementById("guildTagWrap");
  const guild = u.primary_guild;

  if (guild && guild.tag) {
    if (guildTagEl) { guildTagEl.textContent = guild.tag; guildTagEl.style.display = ""; }
    if (wrapEl) wrapEl.style.display = "";
    if (guildIconEl) {
      const iconHash = guild.badge;
      const guildId  = guild.identity_guild_id;
      if (iconHash && guildId) {
        guildIconEl.src = `https://cdn.discordapp.com/clan-badges/${guildId}/${iconHash}.png?size=32`;
        guildIconEl.style.display = "";
        guildIconEl.onerror = () => { guildIconEl.style.display = "none"; };
      } else {
        guildIconEl.style.display = "none";
      }
    }
  } else {
    if (guildTagEl) guildTagEl.style.display = "none";
    if (guildIconEl) guildIconEl.style.display = "none";
    if (wrapEl) wrapEl.style.display = "none";
  }

  const s = STATUS_STYLES[d.discord_status] || STATUS_STYLES.offline;
  const pill = document.getElementById("statusPill");
  pill.style.background   = s.bg;
  pill.style.borderColor  = s.border;
  pill.style.color        = s.dot;
  document.getElementById("statusDot").style.background = s.dot;
  document.getElementById("statusText").textContent     = s.text;

  let activities = d.activities?.filter(a => a.type === 0 || a.type === 2) || [];

  if (d.spotify && !activities.find(a => a.type === 2 && a.name === "Spotify")) {
    const sp = d.spotify;
    activities = [{
      name: "Spotify", details: sp.song, state: sp.artist,
      type: 2, assets: { large_image: sp.album_art_url },
    }, ...activities];
  }

  const card = document.getElementById("activityCard");
  if (activities.length) {
    allActivities = activities;
    currentActivityIndex = 0;
    card.classList.remove("hidden");
    displayActivity(0);
  } else {
    card.classList.add("hidden");
    allActivities = [];
  }
}

connectLanyard();

if (!DISCORD_USER_ID) {
  const avatar = "https://cdn.discordapp.com/embed/avatars/0.png";
  document.getElementById("avatarBig").src = avatar;
  document.getElementById("mobileAvatar").src = avatar;
  document.getElementById("username").textContent = "Adam";
  document.getElementById("statusText").textContent = "available";
}

function openSettings()  { document.getElementById("settingsModal").classList.add("open"); }
function closeSettings() { document.getElementById("settingsModal").classList.remove("open"); }
document.getElementById("settingsModal").addEventListener("click", e => {
  if (e.target.id === "settingsModal") closeSettings();
});

const CLIENT_STUDIO_GITHUB = "https://github.com/aidenhub/evren";

const projectData = {
  "client studio": {
    lang: "// php · html · css · js",
    intro: "A full portfolio site built for an anonymous creative client.",
    description: "Built a complete portfolio site with a custom CMS from scratch. Includes an authenticated admin panel, project gallery with media support (images + video), theme customization, and Cloudinary integration for asset hosting. The client wanted full control over their content without touching code.",
    images: [
      "images/client-studio-redacted-1.png",
      "images/client-studio-redacted-2.png",
      "images/client-studio-redacted-3.png",
    ],
    action: { label: "View GitHub", href: CLIENT_STUDIO_GITHUB },
    roadmap: [
      { cat: "CMS",      title: "Admin Panel",    desc: "Full backend with login, sessions, brute-force protection.", items: ["Secure PHP auth with bcrypt", "Lockout system + activity log"], status: "done" },
      { cat: "Frontend", title: "Portfolio UI",   desc: "Public-facing portfolio with projects, skills, music.",      items: ["Tab navigation", "Project modal with gallery"], status: "done" },
      { cat: "Media",    title: "Cloudinary",     desc: "Cloud media upload and optimization.",                        items: ["Image + video upload via API", "Auto-quality transforms"], status: "done" },
    ],
  },
  "AW : Heart Of The Unreturned": {
    lang: "// lua",
    intro: "A Roblox fan game based on Abyss World. Built with a team.",
    description: "Heart Of The Unreturned is a Parkour Roblox fan game inspired by Abyss World. Currently in active development — I mostly did bug fixes",
    images: [
      "images/hotu1.png",
      "images/hotu2.png",
      "images/hotu3.png",
      "images/hotu4.png",
    ],
    action: { label: "Play on Roblox", href: "https://www.roblox.com/games/132429881613824/ABYSS-WORLD-HOTU" },
    roadmap: [
      { cat: "Movement",   title: "Core Gameplay", desc: "Everything related to player control and movement.",       items: ["Press and hold jumping system", "Momentum system and checkpoint system"], status: "done" },
      { cat: "Environment", title: "Zones",  desc: "Different layers of the map.",         items: ["Multiple terrain themes", "Lighting setup and map variation"],                          status: "done" },
      { cat: "Art",         title: "Enemy Roster",  desc: "Sculpt and rig all enemy types.",     items: ["Multiple enemy variants with rigs", "Texturing and polish work"],                       status: "wip"  },
      { cat: "GUI",         title: "Upgrade Menu",  desc: "Card-based tower upgrade system.",    items: ["Card-based upgrade UI", "Tier 1–4 management"],                                         status: "wip"  },
    ],
  },
  "utility bot": {
    lang: "// python · automation",
    intro: "A small automation bot built around scheduled maintenance tasks.",
    description: "A lightweight Python bot for scheduled channel housekeeping, moderation helpers, and config-driven automation. Reworked here as a neutral case study with safer copy and no public repository link.",
    images: [
      "https://placehold.co/930x480/111111/d4b8ff?text=Utility+Bot",
    ],
    action: { label: "View on GitHub", href: "https://github.com/aexdm/nigbot" },
    roadmap: [],
  },
  "seraph": {
    lang: "// python · windows · desktop",
    intro: "A Windows panic button / profile switcher with voice control.",
    description: "Windows panic button / profile switcher with voice control. Replaces app contexts with a hotkey — switch between work/chill/focus/sleep profiles.",
    images: [
      "images/panic-1.png",
    ],
    action: { label: "Private project", href: "#" },
    roadmap: [
      { cat: "Profiles",  title: "Profile Engine",  desc: "Multi-profile system for context switching.", items: ["Work/Chill/Focus/Sleep presets", "Per-profile URL lists, apps, hotkeys", "Session save/restore per profile"], status: "done" },
      { cat: "Panic",     title: "Panic Button",     desc: "Emergency killswitch that closes everything.", items: ["Closes all non-system processes", "Opens YouTube as a safe distraction", "Protected system processes list"], status: "done" },
      { cat: "Voice",     title: "Voice Assistant",  desc: "Speech recognition for hands-free triggering.",  items: ["French + English language support", "Trigger phrases per profile", "Continuous listening mode"], status: "done" },
      { cat: "UI",        title: "Desktop UI",       desc: "Webview dashboard built with Flask.",            items: ["Profile management panel", "Activity log + live status", "System tray with quick actions"], status: "done" },
    ],
  },
  "showcase": {
  lang: "// php · css · js",
  intro: "An anonymous portfolio website for one of my client to showcase their work and passion.",
  description: "Built a complete portfolio site with a custom CMS from scratch in PHP. Includes a secure authenticated admin panel with brute-force lockout, atomic JSON content saving, project gallery with image and video support, Cloudinary integration for cloud media hosting, and full theme customisation — all without touching a line of code on the client side.",
  images: [
    "images/showcase-1.png",
    "images/showcase-2.png",
    "images/showcase-3.png",
  ],
  action: { label: "View GitHub", href: "https://github.com/aexdm/showcase" },
 roadmap: [
  { cat: "Auth", title: "Admin Panel", desc: "Secure PHP login system with session management.", items: ["bcrypt password hashing", "Brute-force lockout after 5 attempts", "Session regeneration + expiry"], status: "done" },
  { cat: "CMS", title: "Content System", desc: "Dynamic JSON-based content with atomic saves.", items: ["Single content.json source of truth", "AJAX-powered live editing", "CSRF protection on all mutations"], status: "done" },
  { cat: "Media", title: "Cloudinary", desc: "Cloud media upload with auto-optimisation.", items: ["Image + video upload via signed API", "Auto quality transforms", "100MB upload limit with MIME validation"], status: "done" },
],
},
"adam.dev": {
  lang: "// html · css · js",
  intro: "The main project — everything else orbits this site.",
  description: "my personal portfolio and the thing i keep coming back to. discord presence, dynamic theming, project gallery with zoom, interactive terminal, command palette, cursor trails, starfield, boot sequence, full keyboard nav. built from scratch, no frameworks.",
  images: [],
  action: { label: "View on GitHub", href: "https://github.com/aexdm" },
  roadmap: [
    { cat: "UI", title: "Core Layout", desc: "Shell layout with sidebar + mobile nav.", items: ["CSS grid shell", "Animated tab transitions", "Responsive breakpoints"], status: "done" },
    { cat: "Presence", title: "Discord Integration", desc: "Live Discord status via Lanyard.", items: ["WebSocket connection", "Activity carousel", "Avatar + banner sync"], status: "done" },
    { cat: "Projects", title: "Project Showcase", desc: "Card grid + modal with gallery.", items: ["Project cards with filters", "Image gallery with thumbnails", "Roadmap tab system", "Zoom overlay with pan"], status: "done" },
    { cat: "UX", title: "Terminal & Palette", desc: "Interactive terminal + command palette.", items: ["Live terminal with commands", "Ctrl+K command palette", "Keyboard shortcuts"], status: "done" },
    { cat: "Theme", title: "Theme System", desc: "10 themes with dynamic colors.", items: ["CSS custom properties", "Theme persistence", "Color extraction from avatar"], status: "done" },
  ],
},
};

const skillsData = [
  { icon: "🌙", name: "Lua",           level: "advanced"     },
  { icon: "🐍", name: "Python",        level: "advanced"     },
  { icon: "🌐", name: "JavaScript",    level: "intermediate" },
  { icon: "🎨", name: "HTML & CSS",    level: "intermediate" },
  { icon: "🐘", name: "PHP",           level: "intermediate" },
  { icon: "🎮", name: "Roblox Studio", level: "advanced"     },
  { icon: "🔧", name: "Git & GitHub",  level: "intermediate" },
  { icon: "⚗️",  name: "Flask",         level: "intermediate" },
];
function renderSkills() {
  const grid = document.getElementById("skillsGrid");
  if (!grid) return;
  if (skillsData.length) {
    grid.innerHTML = skillsData.map(s => `
      <div class="skill-item">
        <span class="skill-item-icon">${s.icon}</span>
        <div class="skill-item-name">${s.name}</div>
        <div class="skill-item-level">${s.level}</div>
      </div>
    `).join("");
  } else {
    grid.innerHTML = `
      <div style="grid-column:1/-1;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:32px;text-align:center;">
        <div style="font-family:var(--mono);font-size:11px;color:var(--muted);margin-bottom:6px;">// skills</div>
        <div style="font-family:var(--serif);font-style:italic;font-size:18px;font-weight:300;color:var(--amber);">coming soon</div>
        <div style="font-family:var(--mono);font-size:10.5px;color:var(--muted);margin-top:8px;">i'm curating my stack — check back later</div>
      </div>`;
  }
}

function openProjectModal(projectName) {
  const data = projectData[projectName] || {};
  const placeholder = "https://tr.rbxcdn.com/180DAY-d6495b95d4dd31b15c745e4c72610278/930/480/Image/Png/noFilter";
  const images = data.images?.length ? data.images : [placeholder, placeholder, placeholder, placeholder];

  document.getElementById("pModalLang").textContent        = data.lang        || "// project";
  document.getElementById("pModalTitle").textContent       = projectName;
  document.getElementById("pModalIntro").textContent       = data.intro        || "";
  document.getElementById("pModalDescription").textContent = data.description  || "";

  const mainImg = document.getElementById("pModalImgMain");
  document.getElementById("pModalAction").style.display = data.action?.href && data.action.href !== "#" ? "" : "none";
  mainImg.src = images[0];
  document.querySelectorAll(".pmodal-thumb").forEach((thumb, i) => {
    thumb.src           = images[i] || images[0];
    thumb.style.display = images[i] ? "block" : "none";
    thumb.classList.toggle("active", i === 0);
    thumb.onclick = () => {
      mainImg.style.opacity = "0";
      setTimeout(() => { mainImg.src = images[i]; mainImg.style.opacity = "1"; }, 150);
      document.querySelectorAll(".pmodal-thumb").forEach(x => x.classList.remove("active"));
      thumb.classList.add("active");
    };
  });

  document.getElementById("pModalActionLabel").textContent = data.action?.label || "View Project";
  document.getElementById("pModalAction").href             = data.action?.href  || "#";

  const tabBtns        = document.getElementById("pModalTabBtns");
  const roadmapContent = document.getElementById("pModalRoadmapContent");
  tabBtns.innerHTML        = "";
  roadmapContent.innerHTML = "";

  const roadmap = data.roadmap || [];
  if (!roadmap.length) {
    roadmapContent.innerHTML = `<p style="font-family:var(--mono);font-size:11.5px;color:var(--muted);">// no roadmap yet</p>`;
  } else {
    roadmap.forEach((item, i) => {
      const btn = document.createElement("button");
      btn.className = "pmodal-tab-btn" + (i === 0 ? " active" : "");
      btn.textContent = item.cat;
      btn.onclick = () => {
        tabBtns.querySelectorAll(".pmodal-tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        roadmapContent.querySelectorAll(".pmodal-roadmap-panel").forEach(p => p.classList.remove("active"));
        document.getElementById(`pRoadmapPanel-${i}`).classList.add("active");
      };
      tabBtns.appendChild(btn);

      const statusClass = item.status === "done" ? "pmodal-status-done" : "pmodal-status-wip";
      const statusText  = item.status === "done" ? "done" : "in progress";
      const panel = document.createElement("div");
      panel.className = "pmodal-roadmap-panel" + (i === 0 ? " active" : "");
      panel.id = `pRoadmapPanel-${i}`;
      panel.innerHTML = `
        <div class="pmodal-roadmap-card">
          <div class="pmodal-roadmap-card-title">${item.title}</div>
          <div class="pmodal-roadmap-card-desc">${item.desc}</div>
          <ul>${item.items.map(li => `<li>${li}</li>`).join("")}</ul>
          <span class="${statusClass}">${statusText}</span>
        </div>`;
      roadmapContent.appendChild(panel);
    });
  }

  document.getElementById("projectModal").classList.add("open");
  lucide.createIcons();
}

function closeProjectModal() { document.getElementById("projectModal").classList.remove("open"); }
document.getElementById("projectModal").addEventListener("click", e => {
  if (e.target.id === "projectModal") closeProjectModal();
});

// Zoom overlay
(function() {
  const zoomOverlay = document.getElementById("zoomOverlay");
  const zoomImg = document.getElementById("zoomImg");
  const zoomSlider = document.getElementById("zoomSlider");
  const zoomValue = document.getElementById("zoomValue");
  const zoomContainer = document.getElementById("zoomContainer");
  let zoomLevel = 1, isDragging = false, startX, startY, panX = 0, panY = 0;

  document.getElementById("pModalImgMain").addEventListener("click", function() {
    zoomImg.src = this.src;
    zoomLevel = 1; panX = 0; panY = 0;
    zoomSlider.value = 1;
    zoomValue.textContent = "1x";
    zoomImg.style.transform = "scale(1) translate(0, 0)";
    zoomOverlay.classList.add("open");
    lucide.createIcons();
  });

  document.getElementById("zoomClose").onclick = () => zoomOverlay.classList.remove("open");
  zoomOverlay.addEventListener("click", e => { if (e.target === zoomOverlay) zoomOverlay.classList.remove("open"); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && zoomOverlay.classList.contains("open")) zoomOverlay.classList.remove("open"); });

  zoomSlider.addEventListener("input", () => {
    zoomLevel = parseFloat(zoomSlider.value);
    zoomValue.textContent = zoomLevel.toFixed(1) + "x";
    zoomImg.style.transform = `scale(${zoomLevel}) translate(${panX}px, ${panY}px)`;
  });

  zoomContainer.addEventListener("wheel", e => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    zoomLevel = Math.max(1, Math.min(5, zoomLevel + delta));
    zoomSlider.value = zoomLevel;
    zoomValue.textContent = zoomLevel.toFixed(1) + "x";
    zoomImg.style.transform = `scale(${zoomLevel}) translate(${panX}px, ${panY}px)`;
  }, { passive: false });

  zoomContainer.addEventListener("mousedown", e => {
    if (zoomLevel <= 1) return;
    isDragging = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    zoomContainer.classList.add("dragging");
  });

  document.addEventListener("mousemove", e => {
    if (!isDragging) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    zoomImg.style.transform = `scale(${zoomLevel}) translate(${panX}px, ${panY}px)`;
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
    zoomContainer.classList.remove("dragging");
  });
})();

document.querySelectorAll(".project-row, .project-card").forEach(row => {
  row.addEventListener("click", e => {
    e.preventDefault();
    const name = row.dataset.project || row.querySelector(".project-name, .project-card-name")?.textContent?.trim() || "";
    openProjectModal(name);
  });
});

const cycleWords = [
  "MY BED I LOVE IT", "money", "roblox", "art", "my friends", "code",
  "my phone", "drawing", "fashion", "chaos", "summer",
  "Tyler The Creator", "anime", "memes", "food", "sleep",
  "cats", "the vibe", "adam.dev",
];
let wordIndex = 0;
setInterval(() => {
  const el = document.getElementById("aboutWord");
  if (!el) return;
  el.style.opacity   = "0";
  el.style.transform = "translateY(-5px)";
  setTimeout(() => {
    el.textContent     = cycleWords[wordIndex];
    el.style.opacity   = "1";
    el.style.transform = "translateY(0)";
    wordIndex = (wordIndex + 1) % cycleWords.length;
  }, 220);
}, 1800);

const themes = {
  midnight: {
    "--bg": "#070a14", "--bg2": "#0d1120", "--card": "#111827", "--card-hover": "#1a2540",
    "--border": "rgba(99,130,255,0.1)", "--border2": "rgba(99,130,255,0.2)",
    "--text": "#e8ecff", "--muted": "rgba(180,190,255,0.45)",
    "--amber": "#6384ff", "--amber-dim": "rgba(99,130,255,0.12)", "--amber-dim2": "rgba(99,130,255,0.22)",
    "--green": "#4dd8ad", "--green-dim": "rgba(77,216,173,0.12)",
  },
  orange: {
    "--bg": "#0c0c0b", "--bg2": "#111110", "--card": "#161614", "--card-hover": "#1c1c19",
    "--border": "rgba(255,245,210,0.08)", "--border2": "rgba(255,245,210,0.15)",
    "--text": "#f5f0e8", "--muted": "rgba(245,240,232,0.4)",
    "--amber": "#e8a030", "--amber-dim": "rgba(232,160,48,0.1)", "--amber-dim2": "rgba(232,160,48,0.18)",
    "--green": "#5dba7e", "--green-dim": "rgba(93,186,126,0.12)",
  },
  red:      { "--amber": "#ff4d4d" },
  blue:     { "--amber": "#4da6ff" },
  green:    { "--amber": "#5dba7e" },
  purple:   { "--amber": "#d946ef" },
  pink:     { "--amber": "#ec4899" },
  cyan:     { "--amber": "#06b6d4" },
  rose: {
    "--bg": "#120a0d", "--bg2": "#1e1015", "--card": "#2a1520", "--card-hover": "#361a28",
    "--border": "rgba(251,113,133,0.1)", "--border2": "rgba(251,113,133,0.2)",
    "--text": "#ffe8ed", "--muted": "rgba(255,180,195,0.45)",
    "--amber": "#fb7185", "--amber-dim": "rgba(251,113,133,0.12)", "--amber-dim2": "rgba(251,113,133,0.22)",
    "--green": "#f472b6", "--green-dim": "rgba(244,114,182,0.12)",
  },
};

function setTheme(name) {
  const root     = document.documentElement;
  const base     = themes.midnight;
  const selected = themes[name] || base;

  if (name === "pfp") {
    const avatarEl = document.getElementById("avatarBig");
    if (avatarEl && avatarEl.src && !avatarEl.src.endsWith("/")) {
      applyDominantColorFromAvatar(avatarEl.src);
    }
  } else {
    for (const key in base) root.style.setProperty(key, base[key]);
    for (const key in selected) root.style.setProperty(key, selected[key]);
  }

  localStorage.setItem("theme", name);
}

function updateThemeButtons() {
  const saved = localStorage.getItem("theme") || "default";
  document.querySelectorAll(".theme-grid button").forEach(btn => {
    btn.classList.remove("active-theme");
  });
  const active = document.querySelector(`.theme-grid button[onclick*="setTheme('${saved}')"]`);
  if (active) active.classList.add("active-theme");
}

const eggSounds = ["amogus1", "amogus2", "amogus3"];
document.getElementById("easterEgg").addEventListener("click", () => {
  const id    = eggSounds[Math.floor(Math.random() * eggSounds.length)];
  const audio = document.getElementById(id);
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {}); 
});

window.addEventListener("load", () => {
  const saved = localStorage.getItem("theme") || "pfp";
  setTheme(saved);
  setTimeout(updateThemeButtons, 100);
});



const AIDEN_BIRTHDATE = "2008-09-22"; 
const AIDEN_EMAIL          = "adam@adam.dev";
const AIDEN_GITHUB         = "https://github.com/aexdm";
const AIDEN_DISCORD_INVITE = "https://discord.com/users/853310319002517524"; 

const $  = (id) => document.getElementById(id);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function fmtDuration(ms) {
  const s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${days.toLocaleString()}d ${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(ss).padStart(2,'0')}s`;
}
function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return "just now";
  if (m < 60)  return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h} hr ago`;
  const d = Math.floor(h / 24);
  if (d < 30)  return `${d} day${d>1?'s':''} ago`;
  const mo = Math.floor(d / 30);
  return `${mo} mo ago`;
}

const BOOT_LINES = [
  ['dim',    '[    0.000000] booting adam.dev kernel v3.17 ...',                240],
  ['',       '[    0.0123] checking memory ........... <span class="ok">OK</span> 16gb',                170],
  ['',       '[    0.0211] verifying display ........... <span class="ok">2560×1440 @ 144hz</span>', 170],
  ['',       '[    0.0341] mounting /home/adam ....... <span class="ok">OK</span>',                 85],
  ['',       '[    0.0428] mounting /dev/projects ...... <span class="ok">OK</span>',                85],
  ['',       '[    0.0512] loading caffeine module .... <span class="ok">OK</span> <span class="dim">(cold coffee detected)</span>', 100],
  ['',       '[    0.0644] initializing keyboard ....... <span class="ok">OK</span> <span class="dim">(mechanical, loud)</span>',     90],
  ['',       '[    0.0833] resolving dns api.lanyard.rest <span class="ok">OK</span>',  90],
  ['',       '[    0.0961] negotiating tls ............. <span class="ok">tls 1.3</span>', 85],
  ['',       '[    0.1129] starting twinkle subsystem .. <span class="ok">OK</span>',     85],
  ['',       '[    0.1322] generating constellation map  <span class="ok">60 stars</span>', 100],
  ['',       '[    0.1547] loading themes .............. <span class="ok">9 themes</span>',  85],
  ['',       '[    0.1718] mounting cursor pack ........ <span class="ok">★ stars</span>',  85],
  ['',       '[    0.1922] checking sleep status ....... <span class="warn">DEFICIT</span> <span class="dim">(estimated -3h)</span>', 110],
  ['',       '[    0.2107] linking discord presence .... <span class="accent">connected</span>', 100],
  ['',       '[    0.2244] spawning easter eggs ........ <span class="ok">3 sounds</span>',         85],
  ['',       '[    0.2541] mounting keyboard shortcuts . <span class="ok">OK</span> <span class="dim">(press ?)</span>', 100],
  ['',       '[    0.2703] indexing projects ........... <span class="ok">6 found</span>',          85],
  ['',       '[    0.2848] indexing friends ............ <span class="warn">empty</span>',          100],
  ['',       '[    0.2919] indexing skills ............ <span class="ok">12 found</span>',          85],
  ['',       '[    0.3019] hydrating ui state .......... <span class="ok">OK</span>',                85],
  ['',       '[    0.3166] running self-tests .......... <span class="ok">112/112 passed</span>',    125],
  ['dim',    '[    0.3322] all systems nominal',                                                     175],
  ['',       '[    0.3488] preloading assets ......... <span class="accent">queued</span>',                 85],
  ['',       ''],
  ['accent', '$ ./welcome --user=adam',                                                             225],
];
async function runBoot() {
  if (sessionStorage.getItem('booted') === '1') {
    $('bootOverlay')?.remove();
    return;
  }
  const stream = $('bootStream');
  const fill   = $('bootProgressFill');
  const pct    = $('bootProgressPct');
  const overlay = $('bootOverlay');
  let skipped = false;
  const skip = () => {
    if (skipped) return;
    skipped = true;
    overlay.classList.add('gone');
    setTimeout(() => overlay.remove(), 300);
    sessionStorage.setItem('booted', '1');
  };
  document.addEventListener('keydown', skip, { once: true });
  overlay.addEventListener('click', skip, { once: true });

  for (let i = 0; i < BOOT_LINES.length; i++) {
    if (skipped) return;
    const [klass, line, pace = 170] = BOOT_LINES[i];
    const div = document.createElement('div');
    if (klass) div.className = klass;
    div.innerHTML = line || '&nbsp;';
    stream.appendChild(div);

    const p = Math.round(((i + 1) / BOOT_LINES.length) * 100);
    if (fill) fill.style.width = p + '%';
    if (pct)  pct.textContent  = p + '%';
    await sleep(pace);
  }
  if (skipped) return;

  // preload images + video before dismissing
  const prog = $('bootProgress');
  if (prog) prog.classList.add('visible');

  const images = document.querySelectorAll('img[src]');
  const video  = document.querySelector('video.profile-banner-video source');
  const total  = images.length + (video ? 1 : 0);
  let loaded   = 0;

  const tick = () => {
    loaded++;
    const p = total ? Math.round((loaded / total) * 100) : 100;
    if (fill) fill.style.width = p + '%';
    if (pct)  pct.textContent  = p + '%';
  };

  const loadImg = src => new Promise(r => {
    const img = new Image();
    img.onload = img.onerror = r;
    img.src = src;
  });

  const jobs = [];
  for (const img of images) {
    const src = img.getAttribute('src');
    if (src) jobs.push(loadImg(src).then(tick));
  }
  if (video) {
    jobs.push(new Promise(r => {
      const v = video.parentElement;
      v.addEventListener('canplaythrough', () => { tick(); r(); }, { once: true });
      v.addEventListener('error',           () => { tick(); r(); }, { once: true });
      v.load();
      setTimeout(() => { if (loaded < total) tick(); r(); }, 3000);
    }));
  }

  if (jobs.length) {
    await Promise.race([
      Promise.all(jobs),
      sleep(8000),
    ]);
  }

  await sleep(200);
  skip();
}

async function typeInto(el, text, speed = 35) {
  el.textContent = '';
  for (const ch of text) {
    el.textContent += ch;
    await sleep(speed + Math.random() * 30);
  }
}
function uptimeDays() {
  return Math.floor((Date.now() - new Date(AIDEN_BIRTHDATE).getTime()) / 86400000);
}
async function runHomeTerminal() {
  const cmd = $('termCmd');
  const cur = $('termCursor');
  const out = $('termOut');
  if (!cmd || !out) return;

  await sleep(400);
  await typeInto(cmd, './welcome.sh');
  await sleep(280);
  cur.style.display = 'none';

  const rows = [
    ['user',     '<span class="accent">adam</span> <span class="dim">(he/him)</span>'],
    ['role',     '17 y/o dev · roblox + js + python'],
    ['location', 'the chair, somewhere'],
    ['uptime',   `<span class="live" id="liveUptime">—</span>`],
    ['shipped',  '<span class="accent">6</span> projects · <span class="dim">always cooking</span>'],
    ['now',      'building <span class="accent">HOTU</span> · sleeping less than i should'],
    ['status',   '<span class="live">● online</span>'],
  ];
  for (const [k, v] of rows) {
    const div = document.createElement('div');
    div.className = 'row';
    div.innerHTML = `<span class="arrow">→</span><span class="key">${k}</span><span class="val">${v}</span>`;
    out.appendChild(div);
    await sleep(140);
  }

  const live = $('liveUptime');
  const tick = () => {
    if (!live) return;
    live.textContent = fmtDuration(Date.now() - new Date(AIDEN_BIRTHDATE).getTime());
  };
  tick();
  setInterval(tick, 1000);

  const ctr = $('ctrUptime');
  if (ctr) ctr.textContent = uptimeDays().toLocaleString();

  // Interactive terminal setup
  const termBody = document.getElementById("termBody");
  if (!termBody) return;
  let termBuffer = "", termHistory = [], termHistIdx = -1;

  const TERM_COMMANDS = {
    help() { return `available commands:
  <span class="term-line-muted">help</span>       show this message
  <span class="term-line-muted">whoami</span>     about me
  <span class="term-line-muted">projects</span>   list my projects
  <span class="term-line-muted">skills</span>     what I work with
  <span class="term-line-muted">social</span>     my links
  <span class="term-line-muted">music</span>      what I listen to
  <span class="term-line-muted">clear</span>      clear terminal
  <span class="term-line-muted">theme</span>      cycle theme
  <span class="term-line-muted">date</span>       current date/time
  <span class="term-line-muted">uptime</span>     days since start
  <span class="term-line-muted">echo</span>       echo something back
  <span class="term-line-muted">neofetch</span>   show system info`;
    },
    whoami() { return "adam · 17 · dev/designer · lua/python/js"; },
    projects() { return Object.keys(projectData).map(p => `  <span class="accent">→</span> ${p}`).join("\n"); },
    skills() { return skillsData.map(s => `  <span class="accent">→</span> ${s.name} <span class="dim">(${s.level})</span>`).join("\n"); },
    social() { return `  <span class="accent">discord</span>  @aexdm\n  <span class="accent">github</span>   github.com/aexdm`; },
    music() { return "Tyler, The Creator · Frank Ocean · Kali Uchis · Steve Lacy · SZA"; },
    clear() { return "__CLEAR__"; },
    theme() { setThemeAndPersist(THEME_CYCLE[(THEME_CYCLE.indexOf(localStorage.getItem('theme')||'pfp')+1)%THEME_CYCLE.length]); return "theme cycled"; },
    date() { return new Date().toLocaleString(); },
    uptime() { return `${uptimeDays()} days since aidenhub.dev was born`; },
    echo(_, ...args) { return args.join(" "); },
    neofetch() { return `adam@portfolio
  <span class="term-line-muted">os</span>         windows 11
  <span class="term-line-muted">host</span>       adam.dev
  <span class="term-line-muted">kernel</span>     creative chaos
  <span class="term-line-muted">shell</span>      zsh (custom)
  <span class="term-line-muted">editor</span>     vscode
  <span class="term-line-muted">uptime</span>     ${uptimeDays()} days
  <span class="term-line-muted">theme</span>      ${localStorage.getItem('theme') || 'pfp'}
  <span class="term-line-muted">projects</span>   ${Object.keys(projectData).length}`;
    },
  };

  termBody.addEventListener("focus", () => { termBody.classList.add("focused"); });
  termBody.addEventListener("blur", () => { termBody.classList.remove("focused"); });

  termBody.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      const input = termBuffer.trim();
      termBuffer = "";

      const cmdEl = document.getElementById("termCmd");
      if (cmdEl) cmdEl.textContent = "";

      if (input) {
        termHistory.push(input);
        termHistIdx = termHistory.length;

        const [cmd, ...args] = input.toLowerCase().split(/\s+/);
        const outDiv = document.createElement("div");
        outDiv.className = "row";
        outDiv.innerHTML = `<span class="arrow">→</span><span class="key" style="color:var(--amber)">$</span><span class="val">${input}</span>`;
        out.appendChild(outDiv);

        const fn = TERM_COMMANDS[cmd];
        if (fn) {
          const result = fn(input, ...args);
          if (result === "__CLEAR__") {
            out.innerHTML = "";
          } else {
            const resDiv = document.createElement("div");
            resDiv.className = "row";
            resDiv.innerHTML = `<span class="arrow" style="opacity:0">→</span><span class="key" style="opacity:0">_</span><span class="val">${result}</span>`;
            out.appendChild(resDiv);
          }
        } else {
          const errDiv = document.createElement("div");
          errDiv.innerHTML = `<span class="arrow" style="opacity:0">→</span><span class="key" style="opacity:0">_</span><span class="val term-line-error">${input}: command not found. try 'help'</span>`;
          out.appendChild(errDiv);
        }
      }

      out.scrollTop = out.scrollHeight;
      return;
    }

    if (e.key === "Backspace") {
      termBuffer = termBuffer.slice(0, -1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (termHistory.length) {
        termHistIdx = Math.max(0, termHistIdx - 1);
        termBuffer = termHistory[termHistIdx] || "";
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (termHistIdx < termHistory.length - 1) {
        termHistIdx++;
        termBuffer = termHistory[termHistIdx] || "";
      } else {
        termHistIdx = termHistory.length;
        termBuffer = "";
      }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      termBuffer += e.key;
    }

    const cmdEl = document.getElementById("termCmd");
    if (cmdEl) cmdEl.textContent = termBuffer;
  });
}

function copyText(t, msg) {
  navigator.clipboard?.writeText(t).then(() => toast(msg)).catch(() => toast('clipboard blocked'));
}
function setThemeAndPersist(name) { setTheme(name); updateThemeButtons(); toast(`theme: ${name}`); }

function toast(msg) {
  let t = document.getElementById('__toast');
  if (!t) {
    t = document.createElement('div');
    t.id = '__toast';
    Object.assign(t.style, {
      position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
      background: 'var(--card)', color: 'var(--text)',
      border: '1px solid var(--border2)', padding: '8px 14px',
      borderRadius: '8px', fontFamily: 'var(--mono)', fontSize: '12px',
      zIndex: 99999, opacity: 0, transition: 'opacity .2s ease',
      boxShadow: '0 12px 30px -10px rgba(0,0,0,0.5)',
    });
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = 1;
  clearTimeout(t.__timer);
  t.__timer = setTimeout(() => { t.style.opacity = 0; }, 1600);
}

function toggleShortcuts(force) {
  const el = $('shortcuts');
  const open = force ?? !el.classList.contains('open');
  el.classList.toggle('open', open);
  el.setAttribute('aria-hidden', open ? 'false' : 'true');
}

const TAB_BY_KEY = { '1': 'home', '2': 'projects', '3': 'about', '4': 'friends', '5': 'skills', '6': 'music', '7': 'contact' };
const VIM_TAB    = { 'h': 'home', 'a': 'about', 'p': 'projects', 'f': 'friends', 's': 'skills', 'm': 'music', 'c': 'contact' };
const THEME_CYCLE = ['pfp','midnight','orange','red','blue','green','purple','pink','cyan','rose'];

let vimPending = false, vimTimer = null;
window.addEventListener('keydown', (e) => {
  const t = e.target;
  const inField = (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  if (inField) return;

  if (e.key === 'Escape') {
    closeSettings(); closeProjectModal(); toggleShortcuts(false);
    document.getElementById("cmdPalette")?.classList.remove("open");
    return;
  }
  if (e.key === '?' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); toggleShortcuts(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault(); toggleCmdPalette(); return;
  }
  if (e.key === 't') {
    const cur = localStorage.getItem('theme') || 'pfp';
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(cur) + 1) % THEME_CYCLE.length];
    setThemeAndPersist(next);
    return;
  }
  if (TAB_BY_KEY[e.key]) { switchTab(TAB_BY_KEY[e.key]); return; }

  if (e.key === 'g' && !vimPending) {
    vimPending = true;
    vimTimer = setTimeout(() => { vimPending = false; }, 700);
    return;
  }
  if (vimPending && VIM_TAB[e.key.toLowerCase()]) {
    clearTimeout(vimTimer); vimPending = false;
    switchTab(VIM_TAB[e.key.toLowerCase()]);
  }
});

// Command palette
const PALETTE_ITEMS = [
  ...['home','about','projects','friends','skills','music','contact'].map(id => ({ label: `Go to ${id}`, cat: 'tab', icon: 'arrow-right', action: () => { switchTab(id); toggleCmdPalette(); } })),
  { label: 'Toggle theme', cat: 'action', icon: 'palette', action: () => { setThemeAndPersist(THEME_CYCLE[(THEME_CYCLE.indexOf(localStorage.getItem('theme')||'pfp')+1)%THEME_CYCLE.length]); toggleCmdPalette(); } },
  { label: 'Toggle shortcuts', cat: 'action', icon: 'keyboard', action: () => { toggleShortcuts(); toggleCmdPalette(); } },
  { label: 'Open settings', cat: 'action', icon: 'settings-2', action: () => { openSettings(); toggleCmdPalette(); } },
  { label: `View source`, cat: 'link', icon: 'github', action: () => { window.open('https://github.com/aexdm','_blank'); toggleCmdPalette(); } },
];
function toggleCmdPalette() {
  const el = document.getElementById("cmdPalette");
  el.classList.toggle("open");
  if (el.classList.contains("open")) {
    document.getElementById("cmdPaletteInput").value = "";
    document.getElementById("cmdPaletteResults").innerHTML = "";
    setTimeout(() => document.getElementById("cmdPaletteInput").focus(), 100);
  }
}
document.getElementById("cmdPaletteInput")?.addEventListener("input", function() {
  const q = this.value.toLowerCase();
  const results = document.getElementById("cmdPaletteResults");
  if (!q) { results.innerHTML = ""; return; }
  results.innerHTML = PALETTE_ITEMS
    .filter(i => i.label.toLowerCase().includes(q) || i.cat.includes(q))
    .map((i, idx) => `<div class="cmd-palette-item${idx===0?' active':''}" data-idx="${idx}">
      <span class="cmd-palette-item-icon"><i data-lucide="${i.icon}" style="width:14px;height:14px;"></i></span>
      <span>${i.label}</span>
      <span class="cmd-palette-item-cat">${i.cat}</span>
    </div>`).join("");
  lucide.createIcons();
  results.querySelectorAll(".cmd-palette-item").forEach(el => {
    el.addEventListener("click", () => {
      const idx = parseInt(el.dataset.idx);
      const filtered = PALETTE_ITEMS.filter(i => (q ? i.label.toLowerCase().includes(q) || i.cat.includes(q) : true));
      if (filtered[idx]) filtered[idx].action();
    });
  });
});
document.getElementById("cmdPaletteInput")?.addEventListener("keydown", e => {
  const results = document.getElementById("cmdPaletteResults");
  const items = results.querySelectorAll(".cmd-palette-item");
  const active = results.querySelector(".cmd-palette-item.active");
  if (e.key === "Enter" && active) { active.click(); return; }
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    const dir = e.key === "ArrowDown" ? 1 : -1;
    let next = active ? Array.from(items).indexOf(active) + dir : 0;
    if (next < 0) next = items.length - 1;
    if (next >= items.length) next = 0;
    items.forEach(i => i.classList.remove("active"));
    if (items[next]) items[next].classList.add("active");
  }
});

// GitHub activity feed
async function fetchGitHubActivity() {
  try {
    const r = await fetch("https://api.github.com/users/aexdm/events/public?per_page=5");
    if (!r.ok) return;
    const events = await r.json();
    const body = document.getElementById("gitLogBody");
    if (!body) return;
    const typeLabels = { PushEvent: "pushed", CreateEvent: "created", IssuesEvent: "opened issue", WatchEvent: "starred", ForkEvent: "forked", IssueCommentEvent: "commented", PullRequestEvent: "opened PR" };
    body.innerHTML = events.slice(0, 5).map(e => {
      const repo = (e.repo?.name || "").split("/").pop();
      const type = typeLabels[e.type] || e.type.replace("Event","").toLowerCase();
      const msg = e.type === "PushEvent" ? (e.payload?.commits?.[0]?.message || "commits") : repo;
      const ago = relativeTime(e.created_at);
      return `<div class="git-row"><span class="git-hash" style="color:var(--amber)">${type}</span><span class="git-msg"><span class="scope">[${repo}]</span>${msg}</span><span class="git-time">${ago}</span></div>`;
    }).join("");
  } catch (_) {}
}

(function cursorTrail() {
  const c = $('trailCanvas');
  if (!c) return;
  if (reducedMotion) { c.style.display = 'none'; return; }
  const ctx = c.getContext('2d');
  function resize() { c.width = innerWidth; c.height = innerHeight; }
  resize(); addEventListener('resize', resize);

  const particles = [];
  let lastSpawn = 0;
  addEventListener('mousemove', (e) => {
    if (!trailEnabled) return;
    const now = performance.now();
    if (now - lastSpawn < 22) return; 
    lastSpawn = now;
    particles.push({
      x: e.clientX, y: e.clientY,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4 + 0.2,
      size: 2 + Math.random() * 2.5,
      life: 1,
      decay: 0.025 + Math.random() * 0.02,
      hue: Math.random() * 0.2 - 0.1,
    });
    if (particles.length > 150) particles.splice(0, particles.length - 150);
  });

  function accent(alpha, hueShift) {
    const v = (getComputedStyle(document.documentElement).getPropertyValue('--amber') || '#e8a030').trim();
    let r, g, b;
    if (v.startsWith('#')) {
      const n = v.length === 4 ? v.slice(1).split('').map(c => parseInt(c+c,16)) : [parseInt(v.slice(1,3),16), parseInt(v.slice(3,5),16), parseInt(v.slice(5,7),16)];
      r = n[0]; g = n[1]; b = n[2];
    } else if (v.startsWith('rgb')) {
      const m = v.match(/\d+/g);
      r = +m[0]; g = +m[1]; b = +m[2];
    } else { return `rgba(232,160,48,${alpha})`; }
    if (hueShift) {
      r = Math.min(255, Math.max(0, r + hueShift * 60));
      g = Math.min(255, Math.max(0, g + hueShift * 40));
      b = Math.min(255, Math.max(0, b + hueShift * 80));
    }
    return `rgba(${r|0},${g|0},${b|0},${alpha})`;
  }

  function tinyStar(x, y, r, a, hs) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const ang = -Math.PI/2 + i * (Math.PI * 2 / 5);
      const ang2 = ang + Math.PI / 5;
      ctx.lineTo(x + Math.cos(ang) * r,  y + Math.sin(ang) * r);
      ctx.lineTo(x + Math.cos(ang2) * r * 0.45, y + Math.sin(ang2) * r * 0.45);
    }
    ctx.closePath();
    ctx.fillStyle = accent(a, hs);
    ctx.fill();
  }

  const CONNECT_DIST = 70;
  function loop() {
    ctx.clearRect(0, 0, c.width, c.height);

    if (trailEnabled) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        tinyStar(p.x, p.y, p.size * p.life, 0.55 * p.life, p.hue);
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < CONNECT_DIST) {
            const t = (1 - d / CONNECT_DIST) * Math.min(a.life, b.life);
            ctx.strokeStyle = accent(0.08 * t);
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
    } else {
      ctx.clearRect(0, 0, c.width, c.height);
      particles.length = 0;
    }
    requestAnimationFrame(loop);
  }
  loop();
})();

function initStarCanvas() {
  const canvas = document.getElementById('starCanvas');
  if (!canvas) return;
  if (reducedMotion) { canvas.style.display = 'none'; return; }
  const ctx = canvas.getContext('2d');

  function accent(alpha) {
    const root = getComputedStyle(document.documentElement);
    const v = (root.getPropertyValue('--amber') || '#d4b8ff').trim();
    if (v.startsWith('#')) {
      const n = v.length === 4 ? v.slice(1).split('').map(c => parseInt(c+c,16)) : [parseInt(v.slice(1,3),16), parseInt(v.slice(3,5),16), parseInt(v.slice(5,7),16)];
      return `rgba(${n[0]},${n[1]},${n[2]},${alpha})`;
    }
    if (v.startsWith('rgb')) { const m = v.match(/\d+/g); return `rgba(${m[0]},${m[1]},${m[2]},${alpha})`; }
    return `rgba(212,184,255,${alpha})`;
  }

  function resize() { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; }
  resize();
  window.addEventListener('resize', resize);

  const STAR_COUNT = 60;
  const stars = [];
  const newStar = () => ({
    x: Math.random() * canvas.width, y: Math.random() * canvas.height,
    size: 2 + Math.random() * 7, speed: 0.15 + Math.random() * 0.6,
    opacity: 0.2 + Math.random() * 0.4,
    twinkleSpeed: 0.006 + Math.random() * 0.025, twinkleOff: Math.random() * Math.PI * 2,
    rot: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.02,
  });
  for (let i = 0; i < STAR_COUNT; i++) stars.push(newStar());

  const mouse = { x: -9999, y: -9999, active: false };
  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.active = true;
  });
  canvas.addEventListener('mouseleave', () => { mouse.active = false; });

  const LINK_DIST = 150, CURSOR_DIST = 220;
  let frame = 0;
  let shootingStars = [];

  setInterval(() => {
    if (shootingStars.length >= 2) return;
    shootingStars.push({
      x: Math.random() * canvas.width * 1.2, y: Math.random() * canvas.height * 0.3,
      dx: -(2 + Math.random() * 3), dy: 1.5 + Math.random() * 2,
      life: 1, trail: [],
    });
  }, 4000 + Math.random() * 3000);

  function drawStar(x, y, size, opacity, rot) {
    const spikes = 5, outerR = size, innerR = size * 0.42;
    let r = -Math.PI / 2 + rot;
    const step = Math.PI / spikes;
    ctx.beginPath();
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(x + Math.cos(r) * outerR, y + Math.sin(r) * outerR); r += step;
      ctx.lineTo(x + Math.cos(r) * innerR, y + Math.sin(r) * innerR); r += step;
    }
    ctx.closePath();
    ctx.fillStyle = `rgba(240,220,255,${opacity})`;
    ctx.shadowColor = `rgba(212,184,255,${opacity * 0.6})`;
    ctx.shadowBlur = size * 3;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function tick() {
    const tab = document.getElementById('about');
    if (!tab || !tab.classList.contains('active')) { requestAnimationFrame(tick); return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frame++;

    for (let i = 0; i < stars.length; i++) {
      for (let j = i + 1; j < stars.length; j++) {
        const a = stars[i], b = stars[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < LINK_DIST) {
          const t = 1 - d / LINK_DIST;
          ctx.strokeStyle = accent(0.06 * t);
          ctx.lineWidth = 0.6;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }

    if (mouse.active) {
      for (const s of stars) {
        const d = Math.hypot(s.x - mouse.x, s.y - mouse.y);
        if (d < CURSOR_DIST) {
          const t = 1 - d / CURSOR_DIST;
          ctx.strokeStyle = accent(0.2 * t);
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(mouse.x, mouse.y); ctx.lineTo(s.x, s.y); ctx.stroke();
        }
      }
    }

    for (const s of stars) {
      s.y -= s.speed;
      s.rot += s.rotSpeed;
      if (s.y < -s.size * 2) { Object.assign(s, newStar()); s.y = canvas.height + s.size * 2; }
      const twinkle = 0.7 + 0.3 * Math.sin(frame * s.twinkleSpeed + s.twinkleOff);
      drawStar(s.x, s.y, s.size, s.opacity * twinkle, s.rot);
    }

    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const ss = shootingStars[i];
      ss.trail.push({ x: ss.x, y: ss.y });
      if (ss.trail.length > 15) ss.trail.shift();
      ss.x += ss.dx; ss.y += ss.dy;
      ss.life -= 0.006;
      if (ss.life <= 0 || ss.x < -50 || ss.y > canvas.height + 50) { shootingStars.splice(i, 1); continue; }
      for (let t = 0; t < ss.trail.length; t++) {
        const a = (t / ss.trail.length) * ss.life;
        ctx.beginPath();
        ctx.arc(ss.trail[t].x, ss.trail[t].y, 1.2 * (t / ss.trail.length), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(240,220,255,${a * 0.6})`;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(ss.x, ss.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${ss.life * 0.9})`;
      ctx.fill();
    }

    requestAnimationFrame(tick);
  }
  tick();
}

function bindTilt() {
  document.querySelectorAll('.project-card, .proj').forEach(card => {
    if (card.__tilt) return;
    card.__tilt = true;
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top)  / r.height;
      const rx = (py - 0.5) * -6;
      const ry = (px - 0.5) *  8;
      card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}

function bindProjectFilters() {
  const row = document.getElementById('projFilters');
  if (!row || row.__bound) return;
  row.__bound = true;

  const all = document.querySelectorAll('.proj');
  const counts = { all: all.length, live: 0, wip: 0 };
  all.forEach(c => { counts[c.dataset.status] = (counts[c.dataset.status] || 0) + 1; });
  row.querySelectorAll('.proj-filter-count').forEach(el => {
    el.textContent = counts[el.dataset.count] ?? 0;
  });

  row.addEventListener('click', (e) => {
    const btn = e.target.closest('.proj-filter');
    if (!btn) return;
    row.querySelectorAll('.proj-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const f = btn.dataset.filter;
    document.querySelectorAll('.proj').forEach(card => {
      const show = (f === 'all') || (card.dataset.status === f);
      card.classList.toggle('is-hidden', !show);
    });
  });

  document.querySelectorAll('.proj').forEach(card => {
    card.addEventListener('click', () => {
      const name = card.dataset.project;
      if (name && typeof openProjectModal === 'function') openProjectModal(name);
    });
  });
}

(function initSwipe() {
  let sx = 0, sy = 0;
  const tabOrder = ['home', 'about', 'projects', 'friends'];
  document.addEventListener('touchstart', e => {
    sx = e.changedTouches[0].screenX;
    sy = e.changedTouches[0].screenY;
  }, { passive: true });
  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].screenX - sx;
    const dy = e.changedTouches[0].screenY - sy;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 2) return;
    const cur = document.querySelector('.tab.active');
    const idx = tabOrder.indexOf(cur?.id);
    if (idx < 0) return;
    const next = dx < 0 ? idx + 1 : idx - 1;
    if (next >= 0 && next < tabOrder.length) switchTab(tabOrder[next]);
  }, { passive: true });
})();

function initSettingsUI() {
  const trail = document.getElementById('toggleTrail');
  const anim = document.getElementById('toggleAnim');
  if (trail) {
    trail.checked = localStorage.getItem('trail') !== 'false';
    trail.addEventListener('change', () => {
      trailEnabled = trail.checked;
      localStorage.setItem('trail', trail.checked);
    });
  }
  if (anim) {
    anim.checked = localStorage.getItem('anim') !== 'false';
    anim.addEventListener('change', () => {
      localStorage.setItem('anim', anim.checked);
    });
  }
}

const COMMITS = [
  { hash: 'a3f2c19', scope: 'home',       msg: 'replace headline with terminal welcome',   minutesAgo:    18 },
  { hash: 'c81b074', scope: 'canvas',     msg: 'wire up constellation lines + cursor pull', minutesAgo:    62 },
  { hash: '1b5a8e0', scope: 'a11y',       msg: 'add keyboard shortcuts + ? help overlay',   minutesAgo:   420 },
  { hash: '9d04733', scope: 'projects',   msg: 'parallax tilt on project cards',           minutesAgo:  1280 },
  { hash: 'fd2670a', scope: 'theme',      msg: 'preserve dominant-color from pfp on load', minutesAgo:  3120 },
  { hash: 'b3e8f11', scope: 'cursors',    msg: 'organize cursor files into cursors/',       minutesAgo:     5 },
  { hash: 'e7a2c04', scope: 'trail',      msg: 'add particle connections + 150 cap',        minutesAgo:     4 },
  { hash: 'd4f1b09', scope: 'canvas',     msg: 'bump stars to 60 + shooting stars',         minutesAgo:     3 },
  { hash: 'c9b3d70', scope: 'settings',   msg: 'add trail + animation toggles',             minutesAgo:     2 },
  { hash: 'a1e8c3f', scope: 'mobile',     msg: 'add swipe gesture for tab switching',       minutesAgo:     1 },
  { hash: 'f4d6e82', scope: 'branding',   msg: 'rename to Adam across the site',             minutesAgo:     0 },
  { hash: 'e9b7d43', scope: 'boot',       msg: 'preload images + video before dismiss',     minutesAgo:     0 },
];
function renderGitLog() {
  const body = $('gitLogBody');
  if (!body) return;
  body.innerHTML = COMMITS.map(c => {
    const iso = new Date(Date.now() - c.minutesAgo * 60000).toISOString();
    return `<div class="git-row">
      <span class="git-hash">${c.hash}</span>
      <span class="git-msg"><span class="scope">[${c.scope}]</span>${c.msg}</span>
      <span class="git-time" data-iso="${iso}">${relativeTime(iso)}</span>
    </div>`;
  }).join('');
}
function refreshGitTimes() {
  document.querySelectorAll('.git-time[data-iso]').forEach(el => {
    el.textContent = relativeTime(el.dataset.iso);
  });
}

window.addEventListener('load', async () => {

  await runBoot();
  renderSkills();
  const ctr = document.getElementById("ctrProjects");
  if (ctr) ctr.textContent = Object.keys(projectData).length + "+";
  runHomeTerminal();
  renderGitLog();
  fetchGitHubActivity();
  setInterval(refreshGitTimes, 30000);
  bindTilt();
  bindProjectFilters();
  initSettingsUI();
  if (window.lucide) lucide.createIcons();
});

const _origSwitchTab = window.switchTab;
window.switchTab = function (id) {
  _origSwitchTab(id);
  if (id === 'projects') setTimeout(() => { bindTilt(); bindProjectFilters(); }, 50);
};
