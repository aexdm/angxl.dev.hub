async function hashIp(ip) {
  const enc = new TextEncoder().encode("visitor-salt-v1:" + (ip || "unknown"));
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.DB) {
    return new Response(JSON.stringify({ count: 0 }), {
      status: 200, headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const ip = request.headers.get("CF-Connecting-IP") || "";
    const h = await hashIp(ip);

    const existing = await env.DB.prepare("SELECT 1 FROM visitor_ips WHERE ip_hash = ?").bind(h).first();
    if (!existing) {
      await env.DB.prepare(
        "INSERT INTO visitor_ips (ip_hash, created_at) VALUES (?, ?)"
      ).bind(h, new Date().toISOString()).run();
      await env.DB.prepare("UPDATE visitor_count SET count = count + 1 WHERE id = 1").run();
    }

    const row = await env.DB.prepare("SELECT count FROM visitor_count WHERE id = 1").first();
    return new Response(JSON.stringify({ count: row.count }), {
      status: 200, headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("visitor error:", err);
    return new Response(JSON.stringify({ count: 0 }), {
      status: 200, headers: { "Content-Type": "application/json" }
    });
  }
}
