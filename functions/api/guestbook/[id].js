export async function onRequestDelete(context) {
  const { env, params, data } = context;
  const idStr = params.id;
  const id = parseInt(idStr, 10);
  
  if (!Number.isInteger(id)) {
    return new Response(JSON.stringify({ error: "bad id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  
  const user = data.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  
  if (!user.is_admin) {
    return new Response(JSON.stringify({ error: "admin only" }), {
      status: 403,
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
    const entry = await d1.prepare('SELECT id FROM guestbook WHERE id = ?').bind(id).first();
    if (!entry) {
      return new Response(JSON.stringify({ error: "not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    await d1.prepare('DELETE FROM guestbook WHERE id = ?').bind(id).run();
    
    return new Response(JSON.stringify({ ok: true, id }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("Delete guestbook error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
