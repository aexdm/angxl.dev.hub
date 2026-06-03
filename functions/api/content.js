function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { "Content-Type": "application/json" }
  });
}

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.DB) return json({ overrides: {} });
  try {
    const { results } = await env.DB.prepare("SELECT key, value FROM content").all();
    const overrides = {};
    for (const row of results || []) overrides[row.key] = row.value;
    return json({ overrides });
  } catch (err) {
    console.error("content GET error:", err);
    return json({ overrides: {} });
  }
}

export async function onRequestPost(context) {
  const { request, env, data } = context;
  const user = data.user;
  if (!user) return json({ error: "authentication required" }, 401);
  if (!user.is_admin) return json({ error: "admin only" }, 403);
  if (!env.DB) return json({ error: "DB binding not found" }, 500);

  let body;
  try { body = await request.json(); } catch { return json({ error: "invalid JSON" }, 400); }

  const key = (body?.key ?? "").toString().trim();
  let value = (body?.value ?? "").toString();
  if (!key || key.length > 512) return json({ error: "bad key" }, 400);
  if (value.length > 5000) return json({ error: "value too long (max 5000)" }, 400);
  value = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

  const nowIso = new Date().toISOString();
  try {
    await env.DB.prepare(`
      INSERT INTO content (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).bind(key, value, nowIso).run();
    return json({ ok: true, key });
  } catch (err) {
    console.error("content POST error:", err);
    return json({ error: "internal error" }, 500);
  }
}

export async function onRequestDelete(context) {
  const { request, env, data } = context;
  const user = data.user;
  if (!user || !user.is_admin) return json({ error: "admin only" }, 403);
  if (!env.DB) return json({ error: "DB binding not found" }, 500);
  const key = new URL(request.url).searchParams.get("key");
  if (!key) return json({ error: "key required" }, 400);
  try {
    await env.DB.prepare("DELETE FROM content WHERE key = ?").bind(key).run();
    return json({ ok: true, key });
  } catch (err) {
    return json({ error: "internal error" }, 500);
  }
}
