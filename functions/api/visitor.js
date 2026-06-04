export async function onRequestGet(context) {
  const { env } = context;
  if (!env.DB) {
    return new Response(JSON.stringify({ count: 0 }), {
      status: 200, headers: { "Content-Type": "application/json" }
    });
  }
  try {
    await env.DB.prepare("UPDATE visitor_count SET count = count + 1 WHERE id = 1").run();
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
