/**
 * Global Cloudflare Pages middleware.
 *
 * Set PLANPLAN_PASSWORD_SHA256 in the Pages project's environment variables
 * to the lowercase SHA-256 hex digest of the password (UTF-8, no newline).
 * Requests fail closed until the secret is configured.
 */
function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return bytesToHex(new Uint8Array(digest));
}

function unauthorized() {
  return new Response("Password required. Sign in to access Planplan.\n", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Planplan", charset="UTF-8"',
      "Cache-Control": "no-store, private",
      "Pragma": "no-cache",
      "Vary": "Authorization",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export async function onRequest(context) {
  const expectedHash = context.env.PLANPLAN_PASSWORD_SHA256;

  // Fail closed: never publish the app by accident if the secret is missing.
  if (!expectedHash || !/^[a-f0-9]{64}$/i.test(expectedHash)) {
    return new Response("Planplan access is not configured.\n", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const authorization = context.request.headers.get("Authorization") || "";
  const match = authorization.match(/^Basic\s+([A-Za-z0-9+/]+=*)$/i);
  if (!match) return unauthorized();

  let credentials;
  try {
    const binary = atob(match[1]);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    credentials = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return unauthorized();
  }

  const separator = credentials.indexOf(":");
  if (separator < 0) return unauthorized();

  const password = credentials.slice(separator + 1);
  const suppliedHash = await sha256Hex(password);
  if (!constantTimeEqual(suppliedHash, expectedHash.toLowerCase())) {
    return unauthorized();
  }

  const response = await context.next();
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("Vary", "Authorization");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
