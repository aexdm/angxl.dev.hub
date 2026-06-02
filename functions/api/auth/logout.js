// functions/api/auth/logout.js
// Logs the user out by deleting their session and clearing their session cookie.

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const cookies = parseCookies(request.headers.get("Cookie") || "");
  const sid = cookies["adam_sid"];
  
  if (sid && env.DB) {
    try {
      await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sid).run();
    } catch (err) {
      console.error("Logout delete session error:", err);
    }
  }
  
  const url = new URL(request.url);
  const isSecure = url.protocol === "https:" || !url.hostname.includes("localhost") && !url.hostname.includes("127.0.0.1");
  const clearSessionCookieHeader = `adam_sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isSecure ? "; Secure" : ""}`;
  
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": clearSessionCookieHeader
    }
  });
}
