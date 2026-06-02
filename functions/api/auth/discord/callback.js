// functions/api/auth/discord/callback.js
// Handles the Discord OAuth2 authorization redirect.

function generateRandomHex(len = 16) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function avatarUrl(user) {
  if (user.avatar) {
    const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=128`;
  }
  const idx = (BigInt(user.id) >> 22n) % 6n;
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  
  const cookies = parseCookies(request.headers.get("Cookie") || "");
  const stateCookie = cookies["adam_oauth_state"];
  
  const siteUrl = env.SITE_URL || url.origin;
  const backUrl = `${siteUrl}?auth=error`;
  
  const isSecure = url.protocol === "https:" || !url.hostname.includes("localhost") && !url.hostname.includes("127.0.0.1");
  const clearStateCookieHeader = `adam_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isSecure ? "; Secure" : ""}`;
  
  if (!code || !state || state !== stateCookie) {
    return new Response(null, {
      status: 302,
      headers: {
        "Location": backUrl,
        "Set-Cookie": clearStateCookieHeader
      }
    });
  }
  
  try {
    const DISCORD_CLIENT_ID = env.DISCORD_CLIENT_ID;
    const DISCORD_CLIENT_SECRET = env.DISCORD_CLIENT_SECRET;
    const DISCORD_REDIRECT_URI = env.DISCORD_REDIRECT_URI;
    const ADMIN_DISCORD_ID = env.ADMIN_DISCORD_ID;
    
    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET || !DISCORD_REDIRECT_URI) {
      throw new Error("Missing Discord configuration");
    }
    
    // 1. exchange the code for an access token
    const tokenRes = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
    });
    
    if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status}`);
    const tokenData = await tokenRes.json();
    
    // 2. fetch the Discord profile
    const userRes = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    
    if (!userRes.ok) throw new Error(`Profile fetch failed: ${userRes.status}`);
    const dUser = await userRes.json();
    
    // 3. persist user in D1
    const d1 = env.DB;
    if (!d1) throw new Error("D1 binding DB is not found");
    
    const nowIso = new Date().toISOString();
    const isAdmin = ADMIN_DISCORD_ID && dUser.id === ADMIN_DISCORD_ID ? 1 : 0;
    const computedAvatarUrl = avatarUrl(dUser);
    
    await d1.prepare(`
      INSERT INTO users (id, username, global_name, avatar_url, is_admin, created_at, last_login)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        username    = excluded.username,
        global_name = excluded.global_name,
        avatar_url  = excluded.avatar_url,
        is_admin    = excluded.is_admin,
        last_login  = excluded.last_login
    `).bind(
      dUser.id,
      dUser.username,
      dUser.global_name || null,
      computedAvatarUrl,
      isAdmin,
      nowIso,
      nowIso
    ).run();
    
    // 4. create an opaque session
    const sid = generateRandomHex(32);
    const ttlMs = 1000 * 60 * 60 * 24 * 30; // 30 days
    const expiresIso = new Date(Date.now() + ttlMs).toISOString();
    
    await d1.prepare(`
      INSERT INTO sessions (id, user_id, created_at, expires_at)
      VALUES (?, ?, ?, ?)
    `).bind(sid, dUser.id, nowIso, expiresIso).run();
    
    // Set the session cookie (30 days)
    const sessionCookieHeader = `adam_sid=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${isSecure ? "; Secure" : ""}`;
    
    const successRedirectUrl = `${siteUrl}?auth=ok#guestbook`;
    
    const response = new Response(null, {
      status: 302,
      headers: {
        "Location": successRedirectUrl,
      }
    });
    response.headers.append("Set-Cookie", clearStateCookieHeader);
    response.headers.append("Set-Cookie", sessionCookieHeader);
    return response;
    
  } catch (err) {
    console.error("[oauth callback]", err);
    return new Response(null, {
      status: 302,
      headers: {
        "Location": backUrl,
        "Set-Cookie": clearStateCookieHeader
      }
    });
  }
}
