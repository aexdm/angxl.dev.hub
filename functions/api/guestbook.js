function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { "Content-Type": "application/json" }
  });
}

async function hashIp(ip) {
  const enc = new TextEncoder().encode("gb-salt-v1:" + (ip || "unknown"));
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; } return h; }
function guestAvatar(seed) {
  const idx = Math.abs(hashStr(seed)) % 6;
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const limit = Math.min(parseInt(new URL(request.url).searchParams.get("limit"), 10) || 200, 500);
  if (!env.DB) return json({ error: "DB binding not found" }, 500);
  try {
    const { results } = await env.DB.prepare(`
      SELECT id, user_id, username, avatar_url, message, is_guest, created_at
      FROM guestbook ORDER BY id DESC LIMIT ?
    `).bind(limit).all();
    return json({ entries: results || [], me: context.data.user || null });
  } catch (err) {
    console.error("guestbook GET error:", err);
    return json({ error: "Internal server error" }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env, data } = context;
  const d1 = env.DB;
  if (!d1) return json({ error: "DB binding not found" }, 500);

  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

  let message = (body?.message ?? "").toString()
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/[ \t]{3,}/g, "  ").replace(/\n{3,}/g, "\n\n").trim();
  if (message.length < 1) return json({ error: "message cannot be empty" }, 400);
  if (message.length > 280) return json({ error: "message too long (max 280)" }, 400);

  const user = data.user;
  const nowIso = new Date().toISOString();
  const ip = request.headers.get("CF-Connecting-IP") || "";
  const ipHash = await hashIp(ip);
  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  try {
    if (user) {
      const row = await d1.prepare(
        "SELECT COUNT(*) AS c FROM guestbook WHERE user_id = ? AND created_at > ?"
      ).bind(user.id, since).first();
      if ((row?.c || 0) >= 5) return json({ error: "you have posted a lot recently \u2014 take a breather" }, 429);

      const info = await d1.prepare(`
        INSERT INTO guestbook (user_id, username, avatar_url, message, is_guest, ip_hash, created_at)
        VALUES (?, ?, ?, ?, 0, ?, ?)
      `).bind(user.id, user.global_name || user.username, user.avatar_url, message, ipHash, nowIso).run();
      const entry = await d1.prepare(
        "SELECT id, user_id, username, avatar_url, message, is_guest, created_at FROM guestbook WHERE id = ?"
      ).bind(info.meta.last_row_id).first();
      return json({ entry }, 201);
    } else {
      let name = (body?.name ?? "").toString().replace(/[\u0000-\u001F]/g, "").replace(/\s+/g, " ").trim();
      if (name.length < 1) return json({ error: "name required" }, 400);
      if (name.length > 32) name = name.slice(0, 32);

      const row = await d1.prepare(
        "SELECT COUNT(*) AS c FROM guestbook WHERE ip_hash = ? AND is_guest = 1 AND created_at > ?"
      ).bind(ipHash, since).first();
      if ((row?.c || 0) >= 3) return json({ error: "slow down \u2014 too many posts from here" }, 429);

      const avatar = guestAvatar(name + ipHash);
      const info = await d1.prepare(`
        INSERT INTO guestbook (user_id, username, avatar_url, message, is_guest, ip_hash, created_at)
        VALUES (NULL, ?, ?, ?, 1, ?, ?)
      `).bind(name, avatar, message, ipHash, nowIso).run();
      const entry = await d1.prepare(
        "SELECT id, user_id, username, avatar_url, message, is_guest, created_at FROM guestbook WHERE id = ?"
      ).bind(info.meta.last_row_id).first();
      return json({ entry }, 201);
    }
  } catch (err) {
    console.error("guestbook POST error:", err);
    return json({ error: "Internal server error" }, 500);
  }
}
