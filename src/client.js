import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CREDENTIALS_DIR = path.join(__dirname, '..', 'credentials');

const tokenCache = new Map();

// Supercell API tokens are bound to a whitelisted public IP at generation
// time. If your home IP changes (dynamic IP from your ISP), calls start
// failing with 403 until you regenerate the key for your new IP at the
// relevant developer portal.
async function loadToken(game, portalUrl) {
  if (tokenCache.has(game)) return tokenCache.get(game);
  const filePath = path.join(CREDENTIALS_DIR, `${game}.json`);
  const raw = await readFile(filePath, 'utf-8').catch(() => {
    throw new Error(`Missing ${filePath}. Create it with {"token": "..."} from ${portalUrl} (key must be whitelisted for your current public IP).`);
  });
  const { token } = JSON.parse(raw);
  tokenCache.set(game, token);
  return token;
}

export function makeClient(game, baseUrl, portalUrl) {
  return async function get(pathname, query) {
    const token = await loadToken(game, portalUrl);
    const url = new URL(`${baseUrl}${pathname}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
      }
    }
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
    if (res.status === 403) {
      throw new Error(`403 from ${game} API — likely your public IP isn't whitelisted for this key anymore. Regenerate it at ${portalUrl}.`);
    }
    if (!res.ok) {
      throw new Error(`${game} API error ${res.status} for ${pathname}: ${await res.text()}`);
    }
    return res.json();
  };
}

// Player/clan tags use a leading '#' which must be percent-encoded in the URL path.
export function encodeTag(tag) {
  const withHash = tag.startsWith('#') ? tag : `#${tag}`;
  return encodeURIComponent(withHash);
}
