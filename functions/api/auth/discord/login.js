// functions/api/auth/discord/login.js
// Initiates the Discord OAuth2 authorization code flow.

function generateRandomHex(len = 16) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const DISCORD_CLIENT_ID = env.DISCORD_CLIENT_ID;
  const DISCORD_REDIRECT_URI = env.DISCORD_REDIRECT_URI;
  
  if (!DISCORD_CLIENT_ID || !DISCORD_REDIRECT_URI) {
    return new Response(JSON.stringify({ error: "Discord OAuth env vars are not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  
  const state = generateRandomHex(16);
  const urlObj = new URL(request.url);
  const isSecure = urlObj.protocol === "https:" || !urlObj.hostname.includes("localhost") && !urlObj.hostname.includes("127.0.0.1");
  
  const stateCookie = `adam_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${isSecure ? "; Secure" : ""}`;
  
  const authUrl = new URL("https://discord.com/api/v10/oauth2/authorize");
  authUrl.searchParams.set("client_id", DISCORD_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", DISCORD_REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "identify");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "consent");
  
  return new Response(null, {
    status: 302,
    headers: {
      "Location": authUrl.toString(),
      "Set-Cookie": stateCookie
    }
  });
}
