// functions/api/_middleware.js
// Cloudflare Pages middleware to parse cookies, attach current session user,
// and append security headers to all /api/ responses.

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

export async function onRequest(context) {
  const { request, env } = context;
  
  // 1. Parse cookies
  const cookies = parseCookies(request.headers.get("Cookie") || "");
  context.data.cookies = cookies;
  context.data.user = null;
  
  // 2. Attach user from session
  const sid = cookies["adam_sid"];
  if (sid && env.DB) {
    const nowIso = new Date().toISOString();
    try {
      const row = await env.DB.prepare(`
        SELECT s.id AS session_id, s.expires_at, u.*
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.id = ? AND s.expires_at > ?
      `).bind(sid, nowIso).first();
      
      if (row) {
        context.data.user = {
          id: row.id,
          username: row.username,
          global_name: row.global_name,
          avatar_url: row.avatar_url,
          is_admin: row.is_admin === 1,
        };
      }
    } catch (err) {
      console.error("Middleware DB check error:", err);
    }
  }
  
  // 3. Process request
  let response;
  try {
    response = await context.next();
  } catch (err) {
    console.error("Internal request error:", err);
    response = new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  
  // 4. Inject global security headers (ensure mutable Response)
  response = new Response(response.body, response);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  
  return response;
}
