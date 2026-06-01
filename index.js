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
    action: { label: "View GitHub", href: "https://github.com/aexdm/nigbot" },
    roadmap: [],
  },
  "seraph": {
    lang: "// python · windows · desktop",
    intro: "A Windows panic button / profile switcher with voice control.",
    description: "Windows panic button that swaps between work/chill/focus/sleep profiles at a hotkey — closes apps, opens URLs, launches programs, voice-controlled.",
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
  action: { label: "View GitHub", href: "https://github.com/aexdm/client-portfolio" },
 roadmap: [
  { cat: "Auth", title: "Admin Panel", desc: "Secure PHP login system with session management.", items: ["bcrypt password hashing", "Brute-force lockout after 5 attempts", "Session regeneration + expiry"], status: "done" },
  { cat: "CMS", title: "Content System", desc: "Dynamic JSON-based content with atomic saves.", items: ["Single content.json source of truth", "AJAX-powered live editing", "CSRF protection on all mutations"], status: "done" },
  { cat: "Media", title: "Cloudinary", desc: "Cloud media upload with auto-optimisation.", items: ["Image + video upload via signed API", "Auto quality transforms", "100MB upload limit with MIME validation"], status: "done" },
],
},
};

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
  "cats", "the vibe",
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
  nujabes: {
    "--bg": "#0f0d1a", "--bg2": "#1a1628", "--card": "#221e32", "--card-hover": "#2a2540",
    "--border": "rgba(212,168,83,0.1)", "--border2": "rgba(212,168,83,0.2)",
    "--text": "#f0e8d8", "--muted": "rgba(200,185,160,0.45)",
    "--amber": "#d4a853", "--amber-dim": "rgba(212,168,83,0.12)", "--amber-dim2": "rgba(212,168,83,0.22)",
    "--green": "#5dba7e", "--green-dim": "rgba(93,186,126,0.12)",
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



const ADAM_BIRTHDATE = "2008-09-22"; 
const ADAM_EMAIL     = "hello@example.dev";
const ADAM_GITHUB    = "https://github.com/aexdm";
const ADAM_DISCORD_INVITE = ""; 

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
  ['',       '[    0.1322] generating constellation map  <span class="ok">22 stars</span>', 100],
  ['',       '[    0.1547] loading themes .............. <span class="ok">10 themes</span>',  85],
  ['',       '[    0.1718] mounting cursor pack ........ <span class="ok">★ stars</span>',  85],
  ['',       '[    0.1922] checking sleep status ....... <span class="warn">DEFICIT</span> <span class="dim">(estimated -3h)</span>', 110],
  ['',       '[    0.2107] linking discord presence .... <span class="accent">connected</span>', 100],
  ['',       '[    0.2244] spawning easter eggs ........ <span class="ok">3 sounds</span>',         85],
  ['',       '[    0.2398] enabling command palette .... <span class="ok">⌘ K</span>',               85],
  ['',       '[    0.2541] mounting keyboard shortcuts . <span class="ok">OK</span> <span class="dim">(press ?)</span>', 100],
  ['',       '[    0.2703] indexing projects ........... <span class="ok">2 found</span>',          85],
  ['',       '[    0.2848] indexing friends ............ <span class="warn">empty</span>',          100],
  ['',       '[    0.3019] hydrating ui state .......... <span class="ok">OK</span>',                85],
  ['',       '[    0.3166] running self-tests .......... <span class="ok">112/112 passed</span>',    125],
  ['dim',    '[    0.3322] all systems nominal',                                                     175],
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
  await sleep(350);
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
  return Math.floor((Date.now() - new Date(ADAM_BIRTHDATE).getTime()) / 86400000);
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
    ['shipped',  '<span class="accent">3</span> projects · <span class="dim">4 cooking</span>'],
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
    live.textContent = fmtDuration(Date.now() - new Date(ADAM_BIRTHDATE).getTime());
  };
  tick();
  setInterval(tick, 1000);

  const ctr = $('ctrUptime');
  if (ctr) ctr.textContent = uptimeDays().toLocaleString();
}

const PALETTE_ITEMS = [
  { id: 'tab-home',     label: 'Home',                  sub: 'go to home',         icon: 'terminal',    tag: 'tab',   action: () => switchTab('home') },
  { id: 'tab-about',    label: 'About',                 sub: 'go to about',        icon: 'user-circle', tag: 'tab',   action: () => switchTab('about') },
  { id: 'tab-projects', label: 'Projects',              sub: 'go to projects',     icon: 'layers',      tag: 'tab',   action: () => switchTab('projects') },
  { id: 'tab-friends',  label: 'Friends',               sub: 'go to friends',      icon: 'users-round', tag: 'tab',   action: () => switchTab('friends') },
  { id: 'open-hotu',    label: 'Open HOTU',             sub: 'roblox parkour fan game', icon: 'gamepad-2', tag: 'project', action: () => { switchTab('projects'); setTimeout(() => openProjectModal('AW : Heart Of The Unreturned'), 320); } },
  { id: 'open-utility', label: 'Open utility bot',      sub: 'automation bot',      icon: 'bot',         tag: 'project', action: () => { switchTab('projects'); setTimeout(() => openProjectModal('utility bot'), 320); } },
  { id: 'github',       label: 'GitHub',                sub: ADAM_GITHUB,            icon: 'github',     tag: 'link',  action: () => window.open(ADAM_GITHUB, '_blank') },
  { id: 'copy-email',   label: 'Copy email',            sub: ADAM_EMAIL,             icon: 'mail',       tag: 'copy',  action: () => copyText(ADAM_EMAIL, 'email copied') },
  { id: 'theme-pfp',     label: 'Theme: pfp (auto)',    sub: 'derive from avatar',   icon: 'paintbrush', tag: 'theme', action: () => setThemeAndPersist('pfp') },
  { id: 'theme-midnight',label: 'Theme: midnight',      sub: 'deep blue',            icon: 'moon',       tag: 'theme', action: () => setThemeAndPersist('midnight') },
  { id: 'theme-orange',  label: 'Theme: orange',        sub: 'warm amber',           icon: 'sun',        tag: 'theme', action: () => setThemeAndPersist('orange') },
  { id: 'theme-rose',    label: 'Theme: rose',          sub: 'soft pink',            icon: 'flower',     tag: 'theme', action: () => setThemeAndPersist('rose') },
  { id: 'theme-nujabes', label: 'Theme: nujabes',       sub: 'luv (sic) vibes',       icon: 'music',      tag: 'theme', action: () => setThemeAndPersist('nujabes') },
  { id: 'theme-red',     label: 'Theme: red',           sub: '',                     icon: 'circle',     tag: 'theme', action: () => setThemeAndPersist('red') },
  { id: 'theme-blue',    label: 'Theme: blue',          sub: '',                     icon: 'circle',     tag: 'theme', action: () => setThemeAndPersist('blue') },
  { id: 'theme-green',   label: 'Theme: green',         sub: '',                     icon: 'circle',     tag: 'theme', action: () => setThemeAndPersist('green') },
  { id: 'theme-purple',  label: 'Theme: purple',        sub: '',                     icon: 'circle',     tag: 'theme', action: () => setThemeAndPersist('purple') },
  { id: 'theme-pink',    label: 'Theme: pink',          sub: '',                     icon: 'circle',     tag: 'theme', action: () => setThemeAndPersist('pink') },
  { id: 'theme-cyan',    label: 'Theme: cyan',          sub: '',                     icon: 'circle',     tag: 'theme', action: () => setThemeAndPersist('cyan') },
  { id: 'shortcuts',     label: 'Show keyboard shortcuts', sub: 'press ? anytime',   icon: 'keyboard',   tag: 'help',  action: () => toggleShortcuts(true) },
  { id: 'settings',      label: 'Open settings',        sub: '',                    icon: 'settings-2', tag: 'app',   action: () => openSettings() },
  { id: 'easter',        label: 'amogus',               sub: 'play random sound',    icon: 'volume-2',   tag: 'fun',   action: () => $('easterEgg')?.click() },
];

let paletteOpen = false, paletteIdx = 0, paletteFiltered = [];
function openPalette() {
  paletteOpen = true;
  paletteIdx = 0;
  $('palette').classList.add('open');
  $('palette').setAttribute('aria-hidden', 'false');
  const inp = $('paletteInput');
  inp.value = '';
  inp.focus();
  renderPalette('');
}
function closePalette() {
  paletteOpen = false;
  $('palette').classList.remove('open');
  $('palette').setAttribute('aria-hidden', 'true');
}
function fuzzyScore(q, s) {
  q = q.toLowerCase(); s = s.toLowerCase();
  if (!q) return 1;
  if (s.includes(q)) return 100 - (s.indexOf(q));

  let qi = 0;
  for (let i = 0; i < s.length && qi < q.length; i++) if (s[i] === q[qi]) qi++;
  return qi === q.length ? 10 : 0;
}
function renderPalette(q) {
  const results = $('paletteResults');
  results.innerHTML = '';
  paletteFiltered = PALETTE_ITEMS
    .map(it => ({ it, score: Math.max(fuzzyScore(q, it.label), fuzzyScore(q, it.sub || ''), fuzzyScore(q, it.tag || '')) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.it);

  if (!paletteFiltered.length) {
    results.innerHTML = `<div class="palette-empty">no commands match "${q}"</div>`;
    return;
  }
  paletteFiltered.forEach((it, i) => {
    const row = document.createElement('div');
    row.className = 'palette-item' + (i === paletteIdx ? ' active' : '');
    row.innerHTML = `
      <i data-lucide="${it.icon}"></i>
      <div><span>${it.label}</span>${it.sub ? `<span class="pi-sub">${it.sub}</span>` : ''}</div>
      <span class="pi-tag">${it.tag || ''}</span>`;
    row.addEventListener('click', () => { closePalette(); it.action(); });
    row.addEventListener('mouseenter', () => { paletteIdx = i; updatePaletteActive(); });
    results.appendChild(row);
  });
  if (window.lucide) lucide.createIcons();
}
function updatePaletteActive() {
  const items = document.querySelectorAll('.palette-item');
  items.forEach((el, i) => el.classList.toggle('active', i === paletteIdx));
  const active = items[paletteIdx];
  if (active) active.scrollIntoView({ block: 'nearest' });
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

const TAB_BY_KEY = { '1': 'home', '2': 'projects', '3': 'about', '4': 'friends' };
const VIM_TAB    = { 'h': 'home', 'a': 'about', 'p': 'projects', 'f': 'friends' };
const THEME_CYCLE = ['pfp','midnight','orange','red','blue','green','purple','pink','cyan','rose','nujabes'];

let vimPending = false, vimTimer = null;
window.addEventListener('keydown', (e) => {
  const t = e.target;
  const inField = (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);

  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    paletteOpen ? closePalette() : openPalette();
    return;
  }

  if (paletteOpen) {
    if (e.key === 'Escape')      { e.preventDefault(); closePalette(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); if (paletteIdx < paletteFiltered.length - 1) { paletteIdx++; updatePaletteActive(); } }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); if (paletteIdx > 0) { paletteIdx--; updatePaletteActive(); } }
    else if (e.key === 'Enter')     { e.preventDefault(); const it = paletteFiltered[paletteIdx]; if (it) { closePalette(); it.action(); } }
    return;
  }

  if (inField) return;

  if (e.key === 'Escape') {
    closeSettings(); closeProjectModal(); toggleShortcuts(false);
    return;
  }
  if (e.key === '?') { e.preventDefault(); toggleShortcuts(); return; }
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
$('paletteInput')?.addEventListener('input', (e) => {
  paletteIdx = 0;
  renderPalette(e.target.value);
});
$('palette')?.addEventListener('click', (e) => {
  if (e.target.id === 'palette') closePalette();
});

(function cursorTrail() {
  const c = $('trailCanvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  function resize() { c.width = innerWidth; c.height = innerHeight; }
  resize(); addEventListener('resize', resize);

  const particles = [];
  let lastSpawn = 0;
  addEventListener('mousemove', (e) => {
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
    });
    if (particles.length > 90) particles.splice(0, particles.length - 90);
  });

  function accent(alpha) {
    const v = (getComputedStyle(document.documentElement).getPropertyValue('--amber') || '#e8a030').trim();
    if (v.startsWith('#')) {
      const n = v.length === 4
        ? v.slice(1).split('').map(c => parseInt(c+c,16))
        : [parseInt(v.slice(1,3),16), parseInt(v.slice(3,5),16), parseInt(v.slice(5,7),16)];
      return `rgba(${n[0]},${n[1]},${n[2]},${alpha})`;
    }
    if (v.startsWith('rgb')) {
      const m = v.match(/\d+/g);
      return `rgba(${m[0]},${m[1]},${m[2]},${alpha})`;
    }
    return `rgba(232,160,48,${alpha})`;
  }
  function tinyStar(x, y, r, a) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const ang = -Math.PI/2 + i * (Math.PI * 2 / 5);
      const ang2 = ang + Math.PI / 5;
      ctx.lineTo(x + Math.cos(ang) * r,  y + Math.sin(ang) * r);
      ctx.lineTo(x + Math.cos(ang2) * r * 0.45, y + Math.sin(ang2) * r * 0.45);
    }
    ctx.closePath();
    ctx.fillStyle = accent(a);
    ctx.fill();
  }

  function loop() {
    ctx.clearRect(0, 0, c.width, c.height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      tinyStar(p.x, p.y, p.size * p.life, 0.55 * p.life);
    }
    requestAnimationFrame(loop);
  }
  loop();
})();

// ── Image zoom ──────────────────────────────────────────────
document.getElementById('pModalImgMain').addEventListener('click', () => {
  const src = document.getElementById('pModalImgMain').src;
  document.getElementById('imgZoomTarget').src = src;
  document.getElementById('imgZoomOverlay').classList.add('open');
});

// ── Konami code ──────────────────────────────────────────────
(function(){
  const code = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let i = 0;
  window.addEventListener('keydown', e => {
    if (e.key === code[i]) { i++; if (i === code.length) { i = 0; $('easterEgg')?.click(); toast('🎮 cheat code activated'); } }
    else i = 0;
  });
})();

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

async function renderGitLog() {
  const body = $('gitLogBody');
  if (!body) return;
  try {
    const res = await fetch('https://api.github.com/repos/aexdm/client-portfolio/commits?per_page=6');
    const commits = await res.json();
    if (!Array.isArray(commits)) throw new Error();
    body.innerHTML = commits.map(c => {
      const msg   = c.commit.message.split('\n')[0];
      const scope = msg.includes(':') ? msg.split(':')[0] : 'update';
      const text  = msg.includes(':') ? msg.split(':').slice(1).join(':').trim() : msg;
      const iso   = c.commit.author.date;
      const hash  = c.sha.slice(0, 7);
      return `<div class="git-row">
        <a href="${c.html_url}" target="_blank" rel="noopener" class="git-hash" style="text-decoration:none;">${hash}</a>
        <span class="git-msg"><span class="scope">[${scope}]</span>${text}</span>
        <span class="git-time" data-iso="${iso}">${relativeTime(iso)}</span>
      </div>`;
    }).join('');
  } catch {
    body.innerHTML = '<div class="git-row"><span class="git-msg" style="color:var(--muted);">could not load commits</span></div>';
  }
}
function refreshGitTimes() {
  document.querySelectorAll('.git-time[data-iso]').forEach(el => {
    el.textContent = relativeTime(el.dataset.iso);
  });
}

const NOW_ISO = new Date().toISOString();

const REPO = "aexdm/angxl.dev.hub";

function updateNowStamp() {
  const el = document.getElementById('nowUpdated');
  if (el) el.textContent = relativeTime(NOW_ISO);
}

async function fetchNowPlaying() {
  const card = document.getElementById('npCard');
  const art = document.getElementById('npArt');
  const track = document.getElementById('npTrack');
  const artist = document.getElementById('npArtist');
  try {
    const res = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`);
    const data = await res.json();
    if (data?.data?.spotify) {
      const s = data.data.spotify;
      track.textContent = s.song;
      artist.textContent = s.artist;
      art.src = s.album_art_url;
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
    const d = data?.data?.discord_status || 'offline';
    const el = document.getElementById('nsDiscord');
    if (el) {
      const s = STATUS_STYLES[d] || STATUS_STYLES.offline;
      el.innerHTML = `<span class="live" style="color:${s.dot}">●</span> ${s.text}`;
    }
  } catch {}
}

async function renderNowGitLog() {
  const body = document.getElementById('nowGitLog');
  if (!body) return;
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/commits?per_page=5`);
    const commits = await res.json();
    if (!Array.isArray(commits)) throw new Error();
    body.innerHTML = commits.map(c => {
      const msg = c.commit.message.split('\n')[0];
      const hash = c.sha.slice(0, 7);
      return `<div class="now-git-row">
        <a href="${c.html_url}" target="_blank" rel="noopener" class="now-git-hash">${hash}</a>
        <span class="now-git-msg">${msg}</span>
        <span class="now-git-time">${relativeTime(c.commit.author.date)}</span>
      </div>`;
    }).join('');
  } catch {
    body.innerHTML = '<div class="now-loading">failed to load commits</div>';
  }
}

function populateSiteStats() {
  const files = document.querySelectorAll('link[rel="stylesheet"], script[src], img[src], source[src]');
  const cssSize = document.querySelector('link[rel="stylesheet"][href*="index.css"]') ? '43kb' : '—';
  const jsSize = document.querySelector('script[src*="index.js"]') ? '44kb' : '—';
  const count = document.querySelectorAll('.proj').length;
  const fEl = document.getElementById('nsFiles'); if (fEl) fEl.textContent = files.length + ' assets';
  const cEl = document.getElementById('nsCss'); if (cEl) cEl.textContent = cssSize;
  const jEl = document.getElementById('nsJs'); if (jEl) jEl.textContent = jsSize;
  const pEl = document.getElementById('nsProjCount'); if (pEl) pEl.textContent = count;
}

window.addEventListener('load', async () => {

  await runBoot();
  runHomeTerminal();
  await renderGitLog();
  setInterval(refreshGitTimes, 30000);
  bindTilt();
  bindProjectFilters();
  if (window.lucide) lucide.createIcons();
});

let _nowInit = false;
function initNowTab() {
  if (_nowInit) return;
  _nowInit = true;
  try { updateNowStamp(); } catch {}
  try { fetchNowPlaying(); } catch {}
  setInterval(() => { try { fetchNowPlaying(); } catch {} }, 15000);
  try { renderNowGitLog(); } catch {}
  try { populateSiteStats(); } catch {}
}

const _origSwitchTab = window.switchTab;
window.switchTab = function (id) {
  _origSwitchTab(id);
  if (id === 'now') setTimeout(initNowTab, 100);
  if (id === 'projects') setTimeout(() => { bindTilt(); bindProjectFilters(); }, 50);
};

// ── Precise age counter (live ticker) ──────────────────────
(function () {
  const BIRTH = new Date(ADAM_BIRTHDATE).getTime();
  const el = document.getElementById('ctrAge');
  if (!el) return;
  function tick() {
    const diff = Date.now() - BIRTH;
    const years  = diff / (365.25 * 24 * 3600 * 1000);
    el.textContent = years.toFixed(9);
  }
  tick();
  setInterval(tick, 100);
})();

// ── Visitor counter (countapi.xyz) ─────────────────────────
(async function () {
  const el = document.getElementById('ctrVisitors');
  if (!el) return;
  try {
    const getRes = await fetch('https://api.countapi.xyz/get/adam.dev/visits');
    const getData = await getRes.json();
    if (!getData || !getData.value || getData.value < 104) {
      await fetch('https://api.countapi.xyz/set/adam.dev/visits?value=104');
    }
    const hitRes = await fetch('https://api.countapi.xyz/hit/adam.dev/visits');
    const hitData = await hitRes.json();
    if (hitData && hitData.value) {
      el.textContent = hitData.value.toLocaleString();
    }
  } catch {
    el.textContent = '—';
  }
})();

// ── BSOD easter egg ─────────────────────────────────────────
function triggerBsod() {
  const overlay = document.getElementById('bsodOverlay');
  if (!overlay) return;
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  let pct = 0;
  const pctEl = document.getElementById('bsodPct');
  const iv = setInterval(() => {
    pct += Math.floor(Math.random() * 4) + 1;
    if (pct >= 100) { pct = 100; clearInterval(iv); }
    if (pctEl) pctEl.textContent = pct + '% complete';
  }, 80);
}
function closeBsod() {
  const overlay = document.getElementById('bsodOverlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
}

// ── Matrix rain easter egg ──────────────────────────────────
let matrixActive = false;
let matrixCanvas, matrixCtx, matrixRaf;

function triggerMatrix() {
  if (matrixActive) { closeMatrix(); return; }
  matrixActive = true;
  matrixCanvas = document.createElement('canvas');
  matrixCanvas.style.cssText = 'position:fixed;inset:0;z-index:99997;pointer-events:none;';
  matrixCanvas.width  = window.innerWidth;
  matrixCanvas.height = window.innerHeight;
  document.body.appendChild(matrixCanvas);
  matrixCtx = matrixCanvas.getContext('2d');

  const cols = Math.floor(matrixCanvas.width / 16);
  const drops = Array(cols).fill(1);
  const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノABCDEFGHIJ0123456789';

  function draw() {
    matrixCtx.fillStyle = 'rgba(0,0,0,0.04)';
    matrixCtx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
    const amber = getComputedStyle(document.documentElement).getPropertyValue('--amber').trim() || '#d4b8ff';
    matrixCtx.fillStyle = amber;
    matrixCtx.font = '14px "DM Mono", monospace';
    for (let i = 0; i < drops.length; i++) {
      const ch = chars[Math.floor(Math.random() * chars.length)];
      matrixCtx.fillText(ch, i * 16, drops[i] * 16);
      if (drops[i] * 16 > matrixCanvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
    matrixRaf = requestAnimationFrame(draw);
  }
  draw();
  toast('🟢 matrix mode — press M again to exit');
  setTimeout(closeMatrix, 8000);
}
function closeMatrix() {
  matrixActive = false;
  if (matrixRaf) cancelAnimationFrame(matrixRaf);
  if (matrixCanvas) { matrixCanvas.remove(); matrixCanvas = null; }
}

// ── Extra keyboard shortcuts for easter eggs ────────────────
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'b' && !e.metaKey && !e.ctrlKey) triggerBsod();
  if (e.key === 'm' && !e.metaKey && !e.ctrlKey) triggerMatrix();
});

// ── Guestbook (localStorage-backed) ────────────────────────
const GB_KEY = 'adam_guestbook_v1';

function gbLoad() {
  try { return JSON.parse(localStorage.getItem(GB_KEY)) || []; }
  catch { return []; }
}
function gbSave(entries) {
  localStorage.setItem(GB_KEY, JSON.stringify(entries));
}
function gbRenderEntries() {
  const container = document.getElementById('gbEntries');
  if (!container) return;
  const entries = gbLoad();
  if (!entries.length) {
    container.innerHTML = '<div class="gb-empty">no entries yet — be the first ✦</div>';
    return;
  }
  container.innerHTML = entries.slice().reverse().map(e => `
    <div class="gb-entry">
      <div class="gb-entry-head">
        <span class="gb-entry-name">${escHtml(e.name)}</span>
        <span class="gb-entry-time">${relativeTime(e.ts)}</span>
      </div>
      <div class="gb-entry-msg">${escHtml(e.msg)}</div>
    </div>
  `).join('');
}
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function submitGuestbook() {
  const nameEl = document.getElementById('gbName');
  const msgEl  = document.getElementById('gbMsg');
  const name   = (nameEl?.value || '').trim();
  const msg    = (msgEl?.value  || '').trim();
  if (!name) { toast('add your name first'); nameEl?.focus(); return; }
  if (!msg)  { toast('message can\'t be empty'); msgEl?.focus(); return; }
  const entries = gbLoad();
  entries.push({ name, msg, ts: new Date().toISOString() });
  gbSave(entries);
  nameEl.value = '';
  msgEl.value  = '';
  document.getElementById('gbMsgLen').textContent = '0';
  gbRenderEntries();
  toast('entry posted ✦');
}

document.getElementById('gbMsg')?.addEventListener('input', (e) => {
  document.getElementById('gbMsgLen').textContent = e.target.value.length;
});

const _origSwitchTab2 = window.switchTab;
window.switchTab = function(id) {
  _origSwitchTab2(id);
  if (id === 'guestbook') setTimeout(gbRenderEntries, 50);
};

PALETTE_ITEMS.push(
  { id: 'tab-uses',      label: 'Uses',        sub: 'go to uses / my setup', icon: 'cpu',       tag: 'tab',     action: () => switchTab('uses') },
  { id: 'tab-guestbook', label: 'Guestbook',   sub: 'leave a message',       icon: 'book-open', tag: 'tab',     action: () => switchTab('guestbook') },
  { id: 'bsod',          label: 'BSOD',        sub: 'press B anytime',       icon: 'monitor-x', tag: 'fun',     action: () => triggerBsod() },
  { id: 'matrix',        label: 'Matrix rain', sub: 'press M anytime',       icon: 'terminal',  tag: 'fun',     action: () => triggerMatrix() }
);