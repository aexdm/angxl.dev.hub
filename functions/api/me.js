// functions/api/me.js
// Returns the currently logged-in user profile, or null.

export async function onRequestGet(context) {
  const user = context.data.user || null;
  return new Response(JSON.stringify({ user }), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    }
  });
}
