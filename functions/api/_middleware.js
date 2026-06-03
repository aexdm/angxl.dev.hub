export async function onRequest(context) {
  const { request, env } = context;
  
  const cookies = parseCookies(request.headers.get("Cookie") || "");
  context.data.cookies = cookies;
  context.data.user = null;
  
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
  
  response = new Response(response.body, response);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  
  return response;
}
