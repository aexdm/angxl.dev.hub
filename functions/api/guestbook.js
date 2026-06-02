// functions/api/guestbook.js
// Handles listing and posting to the guestbook with D1.

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const limit = Math.min(parseInt(limitParam, 10) || 200, 500);
  
  const d1 = env.DB;
  if (!d1) {
    return new Response(JSON.stringify({ error: "DB binding not found" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  
  try {
    const { results } = await d1.prepare(`
      SELECT id, user_id, username, avatar_url, message, created_at
      FROM guestbook
      ORDER BY id DESC
      LIMIT ?
    `).bind(limit).all();
    
    return new Response(JSON.stringify({
      entries: results || [],
      me: context.data.user || null
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("Fetch guestbook error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function onRequestPost(context) {
  const { request, env, data } = context;
  
  // Enforce authentication
  const user = data.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  
  const d1 = env.DB;
  if (!d1) {
    return new Response(JSON.stringify({ error: "DB binding not found" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  
  try {
    // Parse JSON body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    let message = (body?.message ?? '').toString();
    // normalise: strip control chars, collapse excessive whitespace, trim
    message = message.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
                     .replace(/[ \t]{3,}/g, '  ')
                     .replace(/\n{3,}/g, '\n\n')
                     .trim();
                     
    if (message.length < 1) {
      return new Response(JSON.stringify({ error: "message cannot be empty" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    if (message.length > 280) {
      return new Response(JSON.stringify({ error: "message too long (max 280)" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Per-user soft rate limit: max 5 posts / 5 min
    const windowMs = 5 * 60 * 1000;
    const since = new Date(Date.now() - windowMs).toISOString();
    const rateLimitRow = await d1.prepare(
      'SELECT COUNT(*) AS c FROM guestbook WHERE user_id = ? AND created_at > ?'
    ).bind(user.id, since).first();
    
    const count = rateLimitRow ? rateLimitRow.c : 0;
    if (count >= 5) {
      return new Response(JSON.stringify({ error: "you have posted a lot recently — take a breather" }), {
        status: 429,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    const nowIso = new Date().toISOString();
    const posterUsername = user.global_name || user.username;
    
    // Insert into guestbook
    const info = await d1.prepare(`
      INSERT INTO guestbook (user_id, username, avatar_url, message, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(user.id, posterUsername, user.avatar_url, message, nowIso).run();
    
    // Find the inserted row
    const lastRowId = info.meta.last_row_id;
    const entry = await d1.prepare('SELECT * FROM guestbook WHERE id = ?').bind(lastRowId).first();
    
    return new Response(JSON.stringify({ entry }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("Post guestbook error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
